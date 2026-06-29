const jwt = require('jsonwebtoken');
const { db } = require('../db');

// Clean up expired revoked tokens periodically (lazy cleanup on each request)
let lastCleanup = 0;
function maybeCleanRevoked() {
  const now = Math.floor(Date.now() / 1000);
  if (now - lastCleanup > 3600) { // once per hour
    db.prepare('DELETE FROM revoked_tokens WHERE expires_at < ?').run(now);
    lastCleanup = now;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    maybeCleanRevoked();

    // Check token-level revocation (specific jti)
    if (payload.jti) {
      const revoked = db.prepare('SELECT 1 FROM revoked_tokens WHERE jti=?').get(payload.jti);
      if (revoked) return res.status(401).json({ error: 'Token has been revoked. Please sign in again.' });
    }

    // Check user-level ban revocation (all tokens for this user issued before ban)
    const userBan = db.prepare("SELECT 1 FROM revoked_tokens WHERE jti=? AND revoked_at > (SELECT created_at FROM users WHERE id=?)").get(`user_ban_${payload.id}`, payload.id);
    if (userBan) return res.status(401).json({ error: 'Account suspended. Please contact support.' });

    const user = db.prepare('SELECT * FROM users WHERE id=? AND status!=?').get(payload.id, 'banned');
    if (!user) return res.status(401).json({ error: 'User not found or banned' });

    req.user    = user;
    req.tokenPayload = payload;
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired. Please sign in again.' });
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.jti) {
      const revoked = db.prepare('SELECT 1 FROM revoked_tokens WHERE jti=?').get(payload.jti);
      if (revoked) return next();
    }
    const userBan = db.prepare("SELECT 1 FROM revoked_tokens WHERE jti=?").get(`user_ban_${payload.id}`);
    if (userBan) return next(); // treat banned user as unauthenticated
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(payload.id);
    if (user && user.status !== 'banned') {
      req.user = user;
      req.tokenPayload = payload;
    }
  } catch {}
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

// Call this when banning a user to immediately kill all their live tokens
function revokeAllUserTokens(userId) {
  const now = Math.floor(Date.now() / 1000);
  // We can't enumerate all issued JTIs, so we use a user-level revocation timestamp
  // Any token issued before this timestamp is invalid
  db.prepare(`INSERT INTO revoked_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)`)
    .run(`user_ban_${userId}`, userId, now + 30 * 86400); // 30 days (max token life)
}

function requireSupervisor(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Supervisor or admin access required' });
    }
    next();
  });
}

module.exports = { requireAuth, optionalAuth, requireAdmin, requireSupervisor, revokeAllUserTokens };
