const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAdmin, requireSupervisor, revokeAllUserTokens } = require('../middleware/auth');
const { sendBanEmail } = require('../utils/email');
const { log } = require('../utils/activity');

// ══════════════════════════════════════════════════════════════
// SUPERVISOR-ACCESSIBLE ROUTES
// Registered BEFORE the blanket `router.use(requireAdmin)` further
// down — Express stops at the first route that matches and responds,
// so these three run independently of that gate. They are the ONLY
// admin.js endpoints a supervisor may call; everything else in this
// file stays admin-only. There is no separate "supervisor version"
// of the ban logic — admins and supervisors run the exact same code.
// ══════════════════════════════════════════════════════════════

// GET /api/admin/users — a supervisor needs this to find who to ban
router.get('/users', requireSupervisor, (req, res) => {
  const { q, status } = req.query;
  let where = "role != 'admin'";
  let params = [];
  if (q) {
    where += ' AND (name LIKE ? OR email LIKE ? OR username LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status) { where += ' AND status=?'; params.push(status); }
  const users = db.prepare(`SELECT id,name,username,email,role,user_type,country,status,followers,uploads,joined,created_at,ban_reason,ban_expires_at,ban_type,profile_photo FROM users WHERE ${where} ORDER BY created_at DESC`).all(...params);
  res.json(users);
});

// GET /api/admin/my-activity — a supervisor's OWN moderation history only.
// Deliberately narrow (self-scoped, 3 action types only) so it can never
// become a back door into the full platform-wide activity log below.
router.get('/my-activity', requireSupervisor, (req, res) => {
  const rows = db.prepare(`SELECT * FROM activity_log WHERE user_id=? AND action IN ('approve_summary','decline_summary','ban_user','unban_user') ORDER BY created_at DESC LIMIT 20`).all(req.user.id);
  res.json(rows);
});

// PATCH /api/admin/users/:id/ban — ban with duration (days) + REQUIRED reason + email notification
router.patch('/users/:id/ban', requireSupervisor, async (req, res) => {
  const { reason, message, ban_type, ban_days, ip_ban, ip_address, permanent_ip } = req.body;
  // The frontend's ban modal sends a short `reason` code (e.g. "spam") AND a
  // full human-written `message` — the message is what should actually be
  // stored/emailed when present, since "Reason: spam" is a poor email to send.
  const banReason = ((message && message.trim()) || (reason && reason.trim()) || '');
  if (!banReason) return res.status(400).json({ error: 'A ban reason is required.' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ error: 'Cannot ban admin' });
  if (user.role === 'supervisor' && req.user.role !== 'admin') return res.status(403).json({ error: 'Only an admin can ban a supervisor' });

  const isPermanent = ban_type === 'permanent';
  const days = Math.max(1, Math.min(3650, parseInt(ban_days) || 7));
  const banExpiresAt = isPermanent ? 0 : Math.floor(Date.now() / 1000) + (days * 86400);

  db.prepare('UPDATE users SET status=?, ban_reason=?, ban_expires_at=?, ban_type=? WHERE id=?')
    .run('banned', banReason, banExpiresAt, ban_type || 'temporary', req.params.id);

  revokeAllUserTokens(req.params.id);

  // Email notification — sent to email since user cannot access the site
  const emailResult = await sendBanEmail({
    to: user.email, name: user.name, reason: banReason,
    duration: days, banType: ban_type || 'temporary',
  }).catch(() => ({ sent: false }));

  if (ip_ban && ip_address) {
    const isPerm = permanent_ip ? 1 : 0;
    const expiresAt = isPerm ? 0 : Math.floor(Date.now() / 1000) + (days * 86400);
    db.prepare('DELETE FROM ip_bans WHERE ip=?').run(ip_address);
    db.prepare('INSERT INTO ip_bans (id,ip,reason,banned_by,expires_at,permanent) VALUES (?,?,?,?,?,?)')
      .run('ipb_' + uuidv4().replace(/-/g,'').slice(0,10), ip_address, banReason, req.user.id, expiresAt, isPerm);
  }

  res.json({
    success: true,
    message: `${user.name} ${isPermanent ? 'permanently banned' : `suspended for ${days} day(s)`}`,
    email_sent: emailResult.sent,
    email_note: emailResult.sent ? null : 'SMTP not configured — set SMTP_HOST in .env to send ban emails automatically.',
  });
  log({ userId: req.user.id, userName: req.user.name, action: 'ban_user', entityType: 'user',
    entityId: req.params.id, details: `Banned ${user.name}: ${banReason} (${ban_type||'temporary'}, ${days}d)`, ip: req.ip||'' });
});

// PATCH /api/admin/users/:id/unban — supervisor-accessible (see block comment
// above: same handler, no forked "supervisor version")
router.patch('/users/:id/unban', requireSupervisor, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET status=?, ban_reason=?, ban_expires_at=?, ban_type=? WHERE id=?').run('active', '', 0, '', req.params.id);
  // Must clear the revocation row from the original ban — otherwise requireAuth's
  // "was this user ever banned after their account was created" check stays true
  // forever, permanently locking them out even though status now shows 'active'.
  db.prepare('DELETE FROM revoked_tokens WHERE jti=?').run(`user_ban_${req.params.id}`);
  log({ userId: req.user.id, userName: req.user.name, action: 'unban_user', entityType: 'user',
    entityId: req.params.id, details: `Unbanned ${user.name}`, ip: req.ip||'' });
  res.json({ success: true });
});

// Everything below this point is admin-only.
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  expirePromotions(); // clean up expired promotions each time the dashboard loads
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE role != ?').get('admin').c;
  const totalSummaries = db.prepare('SELECT COUNT(*) as c FROM summaries').get().c;
  const approved = db.prepare('SELECT COUNT(*) as c FROM summaries WHERE approved=1').get().c;
  const pending = db.prepare('SELECT COUNT(*) as c FROM summaries WHERE approved=0').get().c;
  const banned = db.prepare('SELECT COUNT(*) as c FROM users WHERE status=?').get('banned').c;
  const totalViews = db.prepare('SELECT SUM(views) as v FROM summaries').get().v || 0;
  const totalLikes = db.prepare('SELECT SUM(likes) as l FROM summaries').get().l || 0;
  const activeBans = db.prepare(`SELECT COUNT(*) as c FROM ip_bans WHERE permanent=1 OR expires_at > ?`).get(Math.floor(Date.now()/1000)).c;
  const plagiarismPending = db.prepare("SELECT COUNT(*) as c FROM plagiarism_cases WHERE verdict='pending'").get().c;
  const plagiarismThieves = db.prepare("SELECT COUNT(*) as c FROM plagiarism_cases WHERE verdict='thief'").get().c;
  const plagiarismSemi    = db.prepare("SELECT COUNT(*) as c FROM plagiarism_cases WHERE verdict='semi'").get().c;
  const reportsPending    = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status='pending'").get().c;

  res.json({ totalUsers, totalSummaries, approved, pending, banned, totalViews, totalLikes, activeBans, plagiarismPending, plagiarismThieves, plagiarismSemi, reportsPending });
});

// GET /api/admin/activity — full activity log
router.get('/activity', (req, res) => {
  const { limit = 200, offset = 0, user_id, action } = req.query;
  let where = [];
  let params = [];
  if (user_id) { where.push('user_id=?'); params.push(user_id); }
  if (action)  { where.push('action=?');  params.push(action); }
  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`SELECT * FROM activity_log ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, parseInt(limit) || 200, parseInt(offset) || 0);
  const total = db.prepare(`SELECT COUNT(*) as c FROM activity_log ${clause}`).get(...params).c;
  res.json({ rows, total });
});

// ── IP BAN MANAGEMENT ─────────────────────────────────────

// GET /api/admin/ip-bans — list all IP bans
router.get('/ip-bans', (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const bans = db.prepare(`SELECT ib.*, u.name as banned_by_name 
    FROM ip_bans ib LEFT JOIN users u ON u.id = ib.banned_by 
    ORDER BY ib.banned_at DESC`).all();
  // Mark expired
  bans.forEach(b => { b.expired = !b.permanent && b.expires_at < now; });
  res.json(bans);
});

// POST /api/admin/ip-bans — create IP ban directly
router.post('/ip-bans', (req, res) => {
  const { ip, reason, ban_duration_hours, permanent } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP address required' });

  const isPermanent = permanent ? 1 : 0;
  const hours = parseInt(ban_duration_hours) || 24;
  const expiresAt = isPermanent ? 0 : Math.floor(Date.now() / 1000) + (hours * 3600);

  // Remove existing ban for this IP
  db.prepare('DELETE FROM ip_bans WHERE ip=?').run(ip);

  const id = 'ipb_' + uuidv4().replace(/-/g,'').slice(0,10);
  db.prepare('INSERT INTO ip_bans (id,ip,reason,banned_by,expires_at,permanent) VALUES (?,?,?,?,?,?)')
    .run(id, ip.trim(), reason || 'Manual ban', req.user.id, expiresAt, isPermanent);

  res.status(201).json({ success: true, id, ip, expires_at: expiresAt, permanent: isPermanent });
});

// DELETE /api/admin/ip-bans/:id — remove IP ban
router.delete('/ip-bans/:id', (req, res) => {
  db.prepare('DELETE FROM ip_bans WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// PATCH /api/admin/ip-bans/:id/extend — extend IP ban duration
router.patch('/ip-bans/:id/extend', (req, res) => {
  const { additional_hours } = req.body;
  const ban = db.prepare('SELECT * FROM ip_bans WHERE id=?').get(req.params.id);
  if (!ban) return res.status(404).json({ error: 'Ban not found' });
  if (ban.permanent) return res.status(400).json({ error: 'Cannot extend a permanent ban' });

  const now = Math.floor(Date.now() / 1000);
  const base = Math.max(ban.expires_at, now);
  const newExpiry = base + ((parseInt(additional_hours) || 24) * 3600);
  db.prepare('UPDATE ip_bans SET expires_at=? WHERE id=?').run(newExpiry, req.params.id);
  res.json({ success: true, expires_at: newExpiry });
});

// GET /api/admin/summaries — all summaries (for content management)
router.get('/summaries', (req, res) => {
  const { q, approved } = req.query;
  let where = [];
  let params = [];

  if (approved !== undefined) { where.push('s.approved=?'); params.push(parseInt(approved)); }
  if (q) { where.push('(s.title LIKE ? OR s.subject LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

  const clause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`SELECT s.*, u.name as author_name FROM summaries s 
    LEFT JOIN users u ON u.id = s.author_id ${clause} ORDER BY s.created_at DESC LIMIT 200`).all(...params);

  rows.forEach(s => {
    try { s.tags = JSON.parse(s.tags); } catch { s.tags = []; }
  });
  res.json(rows);
});

// GET /api/admin/platform-settings — read from DB
router.get('/platform-settings', (req, res) => {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  res.json(out);
});

// PATCH /api/admin/platform-settings — save to DB
router.patch('/platform-settings', (req, res) => {
  const upsert = db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=unixepoch()');
  const allowed = ['min_likes_to_monetize','min_views_to_monetize','platform_share_percent','advertiser_share_percent','base_cpm_egp','tier1_followers','tier1_share_percent','tier2_followers','tier2_share_percent','tier3_followers','tier3_share_percent'];
  allowed.forEach(k => { if (req.body[k] !== undefined) upsert.run(k, String(req.body[k])); });
  res.json({ success: true });
});

// ── PROMOTION REQUESTS ─────────────────────────────────────

// GET /api/admin/promotions — all promotion requests
router.get('/promotions', (req, res) => {
  const reqs = db.prepare(`SELECT pr.*, s.title as summary_title, u.name as author_name
    FROM promotion_requests pr
    JOIN summaries s ON s.id=pr.summary_id
    JOIN users u ON u.id=pr.author_id
    ORDER BY pr.created_at DESC`).all();
  res.json(reqs);
});

// PATCH /api/admin/promotions/:id/approve
router.patch('/promotions/:id/approve', (req, res) => {
  const pr = db.prepare('SELECT * FROM promotion_requests WHERE id=?').get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Not found' });
  const now = Math.floor(Date.now()/1000);
  const expiresAt = now + (pr.duration_days * 86400);
  db.prepare('UPDATE promotion_requests SET status=?,approved_at=?,expires_at=? WHERE id=?').run('approved', now, expiresAt, req.params.id);
  db.prepare('UPDATE summaries SET is_promoted=1 WHERE id=?').run(pr.summary_id);
  // Notify creator
  db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
    'n_'+uuidv4().replace(/-/g,'').slice(0,10), pr.author_id,
    `🚀 Your promotion request for "${db.prepare('SELECT title FROM summaries WHERE id=?').get(pr.summary_id)?.title}" was approved! It will run for ${pr.duration_days} days.`,
    pr.summary_id
  );
  res.json({ success: true, expires_at: expiresAt });
});

// PATCH /api/admin/promotions/:id/reject
router.patch('/promotions/:id/reject', (req, res) => {
  const pr = db.prepare('SELECT * FROM promotion_requests WHERE id=?').get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE promotion_requests SET status=? WHERE id=?').run('rejected', req.params.id);
  db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
    'n_'+uuidv4().replace(/-/g,'').slice(0,10), pr.author_id,
    `❌ Your promotion request was not approved. Reason: ${req.body.reason || 'Does not meet promotion criteria'}.`,
    pr.summary_id
  );
  res.json({ success: true });
});

// Cron-like: expire promotions on each admin stats check
function expirePromotions() {
  const now = Math.floor(Date.now()/1000);
  const expired = db.prepare(`SELECT pr.summary_id FROM promotion_requests pr WHERE pr.status='approved' AND pr.expires_at > 0 AND pr.expires_at < ?`).all(now);
  if (expired.length) {
    db.prepare(`UPDATE promotion_requests SET status='expired' WHERE status='approved' AND expires_at > 0 AND expires_at < ?`).run(now);
    expired.forEach(e => db.prepare('UPDATE summaries SET is_promoted=0 WHERE id=?').run(e.summary_id));
  }
}

// ── PLAGIARISM / ANTI-THEFT ──────────────────────────────────────

// GET /api/admin/plagiarism — all cases grouped by verdict
router.get('/plagiarism', (req, res) => {
  const { verdict } = req.query;
  let where = verdict ? 'WHERE pc.verdict=?' : '';
  const params = verdict ? [verdict] : [];
  const cases = db.prepare(`
    SELECT pc.*,
      su.name  AS suspect_name,
      su.username AS suspect_username,
      su.email AS suspect_email,
      su.status AS suspect_status,
      su.followers AS suspect_followers,
      orig.title AS original_title,
      orig.author_id AS original_author_id,
      ou.name AS original_author_name,
      ou.username AS original_author_username
    FROM plagiarism_cases pc
    LEFT JOIN users su   ON su.id = pc.suspect_id
    LEFT JOIN summaries orig ON orig.id = pc.original_id
    LEFT JOIN users ou   ON ou.id = orig.author_id
    ${where}
    ORDER BY pc.created_at DESC
  `).all(...params);
  res.json(cases);
});

// GET /api/admin/plagiarism/stats
router.get('/plagiarism/stats', (req, res) => {
  const total   = db.prepare("SELECT COUNT(*) AS c FROM plagiarism_cases").get().c;
  const pending = db.prepare("SELECT COUNT(*) AS c FROM plagiarism_cases WHERE verdict='pending'").get().c;
  const thieves = db.prepare("SELECT COUNT(*) AS c FROM plagiarism_cases WHERE verdict='thief'").get().c;
  const semi    = db.prepare("SELECT COUNT(*) AS c FROM plagiarism_cases WHERE verdict='semi'").get().c;
  const cleared = db.prepare("SELECT COUNT(*) AS c FROM plagiarism_cases WHERE verdict='cleared'").get().c;
  res.json({ total, pending, thieves, semi, cleared });
});

// PATCH /api/admin/plagiarism/:id/resolve — admin takes action on a case
// body: { verdict: 'thief'|'semi'|'cleared', ban_action: '...',  admin_note: '...' }
router.patch('/plagiarism/:id/resolve', (req, res) => {
  const { verdict, ban_action, admin_note } = req.body;
  const cas = db.prepare('SELECT * FROM plagiarism_cases WHERE id=?').get(req.params.id);
  if (!cas) return res.status(404).json({ error: 'Case not found' });

  db.prepare('UPDATE plagiarism_cases SET verdict=?, ban_action=?, admin_note=?, resolved_at=? WHERE id=?')
    .run(verdict||cas.verdict, ban_action||'', admin_note||'', Math.floor(Date.now()/1000), req.params.id);

  if (verdict === 'thief' && ban_action && ban_action !== 'warn') {
    if (ban_action === 'delete_summary') {
      if (cas.incoming_id) db.prepare('DELETE FROM summaries WHERE id=?').run(cas.incoming_id);
      db.prepare('INSERT INTO notifications (id,user_id,text) VALUES (?,?,?)').run(
        'n_'+uuidv4().replace(/-/g,'').slice(0,10), cas.suspect_id,
        `⚠️ Your summary was removed: it was found to be identical to an existing summary on the platform.`
      );
    } else if (ban_action === 'ban_7d') {
      db.prepare('UPDATE users SET status=? WHERE id=?').run('banned', cas.suspect_id);
      revokeAllUserTokens(cas.suspect_id);
      db.prepare('INSERT INTO notifications (id,user_id,text) VALUES (?,?,?)').run(
        'n_'+uuidv4().replace(/-/g,'').slice(0,10), cas.suspect_id,
        `🚫 Your account has been suspended for 7 days due to plagiarism. Reason: ${admin_note || 'Content theft detected.'}`
      );
    } else if (ban_action === 'ban_permanent') {
      db.prepare('UPDATE users SET status=? WHERE id=?').run('banned', cas.suspect_id);
      revokeAllUserTokens(cas.suspect_id);
      db.prepare('DELETE FROM summaries WHERE author_id=?').run(cas.suspect_id);
      db.prepare('INSERT INTO notifications (id,user_id,text) VALUES (?,?,?)').run(
        'n_'+uuidv4().replace(/-/g,'').slice(0,10), cas.suspect_id,
        `🚫 Your account has been permanently banned for repeated plagiarism.`
      );
    } else if (ban_action === 'delete_and_ban_7d') {
      if (cas.incoming_id) db.prepare('DELETE FROM summaries WHERE id=?').run(cas.incoming_id);
      db.prepare('UPDATE users SET status=? WHERE id=?').run('banned', cas.suspect_id);
      revokeAllUserTokens(cas.suspect_id);
      db.prepare('INSERT INTO notifications (id,user_id,text) VALUES (?,?,?)').run(
        'n_'+uuidv4().replace(/-/g,'').slice(0,10), cas.suspect_id,
        `🚫 Your summary was removed and your account suspended for 7 days: plagiarism detected.`
      );
    }
  } else if (verdict === 'cleared') {
    db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
      'n_'+uuidv4().replace(/-/g,'').slice(0,10), cas.suspect_id,
      `✅ Plagiarism review completed: your content was reviewed and cleared. No action taken.`,
      cas.incoming_id || ''
    );
  } else if (verdict === 'semi' && ban_action === 'warn') {
    db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
      'n_'+uuidv4().replace(/-/g,'').slice(0,10), cas.suspect_id,
      `⚠️ Warning: Your summary was found to be similar to existing content. Please ensure your work is original.`,
      cas.incoming_id || ''
    );
  }

  res.json({ success: true });
});

module.exports = router;

