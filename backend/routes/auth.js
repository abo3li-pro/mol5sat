const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { log }         = require('../utils/activity');

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE     = /^[\p{L}\p{M}\s'-]{2,60}$/u;
const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/; // 3-20 chars, starts with letter

// ── Login attempt tracking (in-memory) ────────────────────
// Prevents brute-force even if rate limiter is bypassed
const loginAttempts = new Map();
const MAX_ATTEMPTS  = 10;
const LOCK_MS       = 15 * 60 * 1000; // 15 minutes

function checkLock(email) {
  const rec = loginAttempts.get(email);
  if (!rec) return null;
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    return `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`;
  }
  return null;
}
function recordFailure(email) {
  const rec = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  rec.count++;
  if (rec.count >= MAX_ATTEMPTS) { rec.lockedUntil = Date.now() + LOCK_MS; rec.count = 0; }
  loginAttempts.set(email, rec);
}
function clearAttempts(email) { loginAttempts.delete(email); }

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, jti: uuidv4() }, // jti = unique token ID for revocation
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

function safeUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  try { rest.interests = JSON.parse(rest.interests || '[]'); } catch { rest.interests = []; }
  rest.has_membership = !!rest.has_membership;
  rest.profile_photo  = rest.profile_photo || '';
  // Attach following list (array of user IDs) so clients don't need a second request
  try {
    const rows = db.prepare('SELECT following_id FROM follows WHERE follower_id=?').all(u.id);
    rest.following = rows.map(r => r.following_id);
  } catch { rest.following = []; }
  // Attach unread notification count
  try {
    rest.unread_notifications = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id=? AND read=0').get(u.id)?.c || 0;
  } catch { rest.unread_notifications = 0; }
  return rest;
}

// GET /api/auth/check-username — validate username availability
router.get('/check-username', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username required' });
  const u = username.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) return res.json({ available: false, reason: 'Username must be 3–20 characters, start with a letter, and contain only letters, numbers or underscores.' });
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username)=?').get(u);
  res.json({ available: !existing });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, username, email, password, country, user_type, school, grade, specialization, major, interests } = req.body;
  if (!name || !username || !email || !password) return res.status(400).json({ error: 'Name, username, email and password required' });
  if (!NAME_RE.test(name.trim()))           return res.status(400).json({ error: 'Name must be 2–60 letters' });
  const uname = username.trim().toLowerCase();
  if (!USERNAME_RE.test(uname))             return res.status(400).json({ error: 'Username must be 3–20 chars, start with a letter, letters/numbers/underscores only.' });
  if (!EMAIL_RE.test(email.trim()))         return res.status(400).json({ error: 'Invalid email address' });
  if (password.length < 6)                 return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 128)               return res.status(400).json({ error: 'Password too long' });

  const existingEmail    = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase().trim());
  const existingUsername = db.prepare('SELECT id FROM users WHERE LOWER(username)=?').get(uname);
  // Generic messages — don't reveal which field conflicts
  if (existingEmail)    return res.status(409).json({ error: 'Could not create account with these details. Try signing in instead.' });
  if (existingUsername) return res.status(409).json({ error: 'That username is taken. Try a different one.' });

  const id   = 'u_' + uuidv4().replace(/-/g,'').slice(0,12);
  const hash = bcrypt.hashSync(password, 12); // 12 rounds
  db.prepare(`INSERT INTO users (id,name,username,email,password,role,user_type,country,school,grade,specialization,major,interests,profile_photo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, name.trim(), uname, email.toLowerCase().trim(), hash,
    'student', user_type||'student', country||'Egypt',
    school||'', grade||'', specialization||'', major||'',
    JSON.stringify(Array.isArray(interests) ? interests.slice(0,10) : []),
    ''
  );
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  log({ userId: id, userName: name.trim(), action: 'register', entityType: 'user', entityId: id,
    details: `New ${user_type||'student'} account from ${country||'Egypt'}`, ip: req.ip || req.clientIp || '' });
  res.status(201).json({ token: makeToken(user), user: safeUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)          return res.status(400).json({ error: 'Email and password required' });
  if (!EMAIL_RE.test(email.trim())) return res.status(400).json({ error: 'Invalid email address' });

  const key    = email.toLowerCase().trim();
  const locked = checkLock(key);
  if (locked) return res.status(429).json({ error: locked });

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(key);

  // Always run bcrypt even when user not found — prevents timing attacks
  // that reveal whether an email is registered
  const dummyHash = '$2a$12$dummyhashpaddingtomakethissafe0000000000000000000000000';
  const valid = bcrypt.compareSync(password, user ? user.password : dummyHash);

  if (!user || !valid) {
    recordFailure(key);
    // Generic message — never confirm whether email exists
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.status === 'banned') return res.status(403).json({ error: 'This account has been banned' });

  clearAttempts(key);
  log({ userId: user.id, userName: user.name, action: 'login', entityType: 'user', entityId: user.id,
    details: `Login from ${req.ip || '?'}`, ip: req.ip || req.clientIp || '' });
  res.json({ token: makeToken(user), user: safeUser(user) });
});

// POST /api/auth/refresh — get a fresh token without re-entering password
// Frontend calls this on load if token expires within 7 days
router.post('/refresh', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user || user.status === 'banned') return res.status(401).json({ error: 'Unauthorized' });
  res.json({ token: makeToken(user), user: safeUser(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)));
});

// PATCH /api/auth/me — update profile
router.patch('/me', requireAuth, (req, res) => {
  const { name, country, user_type, school, grade, specialization, major, interests, profile_photo } = req.body;
  if (name && !NAME_RE.test(name.trim())) return res.status(400).json({ error: 'Invalid name' });
  // profile_photo: accept a URL string or base64 data URL (max 200KB for avatars)
  const photoVal = profile_photo !== undefined
    ? (typeof profile_photo === 'string' ? profile_photo.slice(0, 300000) : null)
    : null;
  db.prepare(`UPDATE users SET
    name=COALESCE(?,name), country=COALESCE(?,country), user_type=COALESCE(?,user_type),
    school=COALESCE(?,school), grade=COALESCE(?,grade),
    specialization=COALESCE(?,specialization), major=COALESCE(?,major),
    interests=COALESCE(?,interests),
    profile_photo=COALESCE(?,profile_photo)
    WHERE id=?`).run(
    name?.trim()||null, country||null, user_type||null,
    school!==undefined?school:null, grade!==undefined?grade:null,
    specialization!==undefined?specialization:null, major!==undefined?major:null,
    interests?JSON.stringify(interests.slice(0,10)):null,
    photoVal,
    req.user.id
  );
  log({ userId: req.user.id, userName: req.user.name, action: 'update_profile', entityType: 'user',
    entityId: req.user.id, details: 'Profile settings saved', ip: req.ip || '' });
  res.json(safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)));
});

// PATCH /api/auth/password — change password
router.patch('/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 6)           return res.status(400).json({ error: 'New password must be at least 6 characters' });
  if (new_password.length > 128)         return res.status(400).json({ error: 'Password too long' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) return res.status(401).json({ error: 'Current password is incorrect' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(new_password, 12), req.user.id);
  log({ userId: req.user.id, userName: req.user.name, action: 'change_password',
    entityType: 'user', entityId: req.user.id, ip: req.ip || '' });
  res.json({ success: true });
});

// PATCH /api/auth/membership
router.patch('/membership', requireAuth, (req, res) => {
  const { has_membership, membership_price, membership_perks } = req.body;
  const price = Math.max(0, Math.min(parseInt(membership_price)||0, 99999));
  db.prepare('UPDATE users SET has_membership=?, membership_price=?, membership_perks=? WHERE id=?').run(
    has_membership ? 1 : 0, price, (membership_perks||'').slice(0,1000), req.user.id
  );
  res.json(safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)));
});

// ── PASSWORD RESET ─────────────────────────────────────────
// POST /api/auth/forgot-password  { email }
// Security: always returns 200 regardless of whether email exists (prevents enumeration)
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const key = email.toLowerCase().trim();
  const user = db.prepare('SELECT id, name, email FROM users WHERE email=?').get(key);

  if (user) {
    // Clean up old unused tokens for this user first
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id=? AND used=0').run(user.id);

    // Generate a cryptographically random token
    const crypto = require('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex chars
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60; // 15 minutes

    db.prepare('INSERT INTO password_reset_tokens (token, user_id, email, expires_at) VALUES (?,?,?,?)')
      .run(rawToken, user.id, user.email, expiresAt);

    // Send email (falls back to console.log if SMTP not configured)
    const { sendEmail, wrapEmail } = require('../utils/email');
    const SITE = process.env.SITE_URL || process.env.DOMAIN || 'https://mol5sat.org';
    const resetUrl = `${SITE}/#reset-password?token=${rawToken}`;
    const html = wrapEmail('Reset your Mol5sat password', `
      <h1>🔑 Reset Your Password</h1>
      <p>Hi <b>${user.name}</b>,</p>
      <p>We received a request to reset the password for your Mol5sat account.</p>
      <p>Click the button below to choose a new password. This link expires in <b>15 minutes</b>.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(130deg,#FFB800,#E85D04);color:#000;font-weight:900;padding:14px 28px;border-radius:99px;text-decoration:none;font-size:15px">
          Reset My Password
        </a>
      </div>
      <p style="color:#5a4a28;font-size:12px">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
      <p style="color:#5a4a28;font-size:12px">Or copy this link: <a href="${resetUrl}" style="color:#9a8055">${resetUrl}</a></p>
    `);
    sendEmail({ to: user.email, subject: 'Reset your Mol5sat password', html });
  }

  // Always return 200 — never reveal whether email exists
  res.json({ message: 'If this email is registered, a reset link has been sent.' });
});

// POST /api/auth/reset-password  { token, new_password }
router.post('/reset-password', (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password)      return res.status(400).json({ error: 'Token and new password required' });
  if (new_password.length < 6)      return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (new_password.length > 128)    return res.status(400).json({ error: 'Password too long' });

  const record = db.prepare(
    'SELECT * FROM password_reset_tokens WHERE token=? AND used=0 AND expires_at > ?'
  ).get(token, Math.floor(Date.now() / 1000));

  if (!record) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
  }

  // Mark token as used FIRST (prevents replay attacks)
  db.prepare('UPDATE password_reset_tokens SET used=1 WHERE token=?').run(token);

  // Update the password
  const hash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, record.user_id);

  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

module.exports = router;
