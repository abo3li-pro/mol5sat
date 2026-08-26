const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { log } = require('../utils/activity');
const { enrichSummary } = require('./summaries');

function safeUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  try { rest.interests = JSON.parse(rest.interests || '[]'); } catch { rest.interests = []; }
  rest.has_membership = !!rest.has_membership;
  return rest;
}

// ══════════════════════════════════════════════
// /me/* ROUTES — must be BEFORE /:id
// ══════════════════════════════════════════════

// GET /api/users/me/notifications
router.get('/me/notifications', requireAuth, (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json(notifs);
});

// PATCH /api/users/me/notifications/read — mark ALL read
router.patch('/me/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ success: true });
});

// PATCH /api/users/me/notifications/:nid/read — mark ONE read
router.patch('/me/notifications/:nid/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.nid, req.user.id);
  res.json({ success: true });
});

// DELETE /api/users/me/notifications/:nid — delete ONE notification
router.delete('/me/notifications/:nid', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(req.params.nid, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Notification not found' });
  res.json({ success: true });
});

// DELETE /api/users/me/notifications — clear ALL notifications
router.delete('/me/notifications', requireAuth, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE user_id=?').run(req.user.id);
  res.json({ success: true });
});

// GET /api/users/me/memberships — list of creator IDs the current user has an active membership with
router.get('/me/memberships', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT creator_id FROM memberships WHERE subscriber_id=? AND active=1').all(req.user.id);
  res.json(rows.map(r => r.creator_id));
});

// ══════════════════════════════════════════════
// DYNAMIC /:id ROUTES — after /me
// ══════════════════════════════════════════════

// GET /api/users/:id
router.get('/:id', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const safe = safeUser(user);
  safe.summaries = db.prepare('SELECT * FROM summaries WHERE author_id=? AND approved=1 AND deleted_at IS NULL ORDER BY created_at DESC').all(req.params.id);
  safe.summaries = safe.summaries.map(s => enrichSummary(s, req.user?.id)).filter(s => s && !s._enrichError);
  if (req.user) {
    safe.isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, req.params.id);
    safe.hasMembership = !!db.prepare('SELECT 1 FROM memberships WHERE subscriber_id=? AND creator_id=? AND active=1').get(req.user.id, req.params.id);
  }
  res.json(safe);
});

// GET /api/users/:id/following
router.get('/:id/following', requireAuth, (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
  const following = db.prepare(`SELECT u.id,u.name,u.country,u.followers,u.has_membership,u.membership_price FROM users u JOIN follows f ON u.id=f.following_id WHERE f.follower_id=? ORDER BY f.created_at DESC`).all(req.params.id);
  res.json(following);
});

// GET /api/users/:id/followers
router.get('/:id/followers', (req, res) => {
  const followers = db.prepare(`SELECT u.id,u.name,u.country,u.followers FROM users u JOIN follows f ON u.id=f.follower_id WHERE f.following_id=? ORDER BY f.created_at DESC`).all(req.params.id);
  res.json(followers);
});

// POST /api/users/:id/follow
router.post('/:id/follow', requireAuth, (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
  const target = db.prepare('SELECT id,name FROM users WHERE id=?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, targetId);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.user.id, targetId);
    db.prepare('UPDATE users SET followers=MAX(0,followers-1) WHERE id=?').run(targetId);
    log({ userId: req.user.id, userName: req.user.name, action: 'unfollow', entityType: 'user',
      entityId: targetId, details: `Unfollowed ${target.name}`, ip: req.ip||'' });
    return res.json({ following: false, followers: db.prepare('SELECT followers FROM users WHERE id=?').get(targetId)?.followers });
  }
  db.prepare('INSERT OR IGNORE INTO follows (follower_id,following_id) VALUES (?,?)').run(req.user.id, targetId);
  db.prepare('UPDATE users SET followers=followers+1 WHERE id=?').run(targetId);
  db.prepare('INSERT INTO notifications (id,user_id,text,actor_id) VALUES (?,?,?,?)').run('n_'+uuidv4().replace(/-/g,'').slice(0,10), targetId, `${req.user.name} started following you!`, req.user.id);
  log({ userId: req.user.id, userName: req.user.name, action: 'follow', entityType: 'user',
    entityId: targetId, details: `Followed ${target.name}`, ip: req.ip||'' });
  res.json({ following: true, followers: db.prepare('SELECT followers FROM users WHERE id=?').get(targetId)?.followers });
});

// POST /api/users/:id/membership
router.post('/:id/membership', requireAuth, (req, res) => {
  const creatorId = req.params.id;
  const creator = db.prepare('SELECT id,name,has_membership,membership_price FROM users WHERE id=?').get(creatorId);
  if (!creator) return res.status(404).json({ error: 'Creator not found' });
  if (!creator.has_membership) return res.status(400).json({ error: 'This creator does not offer memberships' });
  const existing = db.prepare('SELECT * FROM memberships WHERE subscriber_id=? AND creator_id=?').get(req.user.id, creatorId);
  if (existing) {
    const newActive = existing.active ? 0 : 1;
    db.prepare('UPDATE memberships SET active=? WHERE subscriber_id=? AND creator_id=?').run(newActive, req.user.id, creatorId);
    if (newActive) db.prepare('INSERT INTO notifications (id,user_id,text,actor_id) VALUES (?,?,?,?)').run('n_'+uuidv4().replace(/-/g,'').slice(0,10), creatorId, `👑 ${req.user.name} rejoined your membership!`, req.user.id);
    return res.json({ subscribed: !!newActive });
  }
  db.prepare('INSERT INTO memberships (subscriber_id,creator_id,active) VALUES (?,?,1)').run(req.user.id, creatorId);
  db.prepare('INSERT INTO notifications (id,user_id,text,actor_id) VALUES (?,?,?,?)').run('n_'+uuidv4().replace(/-/g,'').slice(0,10), creatorId, `👑 ${req.user.name} joined your membership!`, req.user.id);
  res.json({ subscribed: true });
});

module.exports = router;
