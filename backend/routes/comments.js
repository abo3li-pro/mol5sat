// ═══════════════════════════════════════════════════════
//  MOL5SAT — COMMENTS ROUTE
//  GET  /api/comments/:summaryId        — list comments
//  POST /api/comments/:summaryId        — post comment
//  POST /api/comments/:summaryId/:id/like  — like/unlike
//  DELETE /api/comments/:summaryId/:id  — delete own / admin
//  PATCH  /api/comments/:summaryId/:id/pin — admin pin
// ═══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, optionalAuth, requireSupervisor } = require('../middleware/auth');
const { log } = require('../utils/activity');
let _xss; try { _xss = require('xss'); } catch { _xss = null; }
function sanitizeBody(s) { return _xss ? _xss(s, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script','style'] }) : s; }

const MAX_BODY_LEN = 2000;

function enrichComment(c, userId) {
  const user = db.prepare('SELECT id,name,username,profile_photo FROM users WHERE id=?').get(c.user_id);
  const liked = userId
    ? !!db.prepare('SELECT 1 FROM comment_likes WHERE user_id=? AND comment_id=?').get(userId, c.id)
    : false;
  return {
    ...c,
    author_name:   user?.name || 'Deleted User',
    author_username: user?.username || '',
    author_photo:  user?.profile_photo || '',
    user_liked: liked,
    is_deleted: !!c.is_deleted,
    is_pinned:  !!c.is_pinned,
    body: c.is_deleted ? '[This comment was removed]' : c.body,
  };
}

// ── GET /api/comments/:summaryId ─────────────────────────
router.get('/:summaryId', optionalAuth, (req, res) => {
  const { summaryId } = req.params;
  const sort = req.query.sort === 'top' ? 'c.likes DESC, c.created_at DESC' : 'c.is_pinned DESC, c.created_at ASC';

  const rows = db.prepare(`
    SELECT c.* FROM comments c
    WHERE c.summary_id=? AND c.parent_id IS NULL
    ORDER BY ${sort}
    LIMIT 100
  `).all(summaryId);

  const uid = req.user?.id || null;
  const result = rows.map(c => {
    const enriched = enrichComment(c, uid);
    // Attach replies (one level deep)
    const replies = db.prepare(`
      SELECT c.* FROM comments c WHERE c.parent_id=? ORDER BY c.created_at ASC LIMIT 20
    `).all(c.id).map(r => enrichComment(r, uid));
    enriched.replies = replies;
    return enriched;
  });

  res.json(result);
});

// ── POST /api/comments/:summaryId ────────────────────────
router.post('/:summaryId', requireAuth, (req, res) => {
  const { summaryId } = req.params;
  const { body, parent_id } = req.body || {};

  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Comment body is required' });
  }
  const trimmed = sanitizeBody(body.trim()).slice(0, MAX_BODY_LEN);

  // Verify summary exists and is approved
  const summary = db.prepare('SELECT id FROM summaries WHERE id=? AND approved=1').get(summaryId);
  if (!summary) return res.status(404).json({ error: 'Summary not found' });

  // If replying, verify parent exists on this summary
  if (parent_id) {
    const parent = db.prepare('SELECT id FROM comments WHERE id=? AND summary_id=?').get(parent_id, summaryId);
    if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
  }

  // Rate limit: max 10 comments per hour per user on same summary
  const recentCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM comments WHERE user_id=? AND summary_id=? AND created_at > ?'
  ).get(req.user.id, summaryId, Math.floor(Date.now() / 1000) - 3600).cnt;
  if (recentCount >= 10) {
    return res.status(429).json({ error: 'Too many comments. Please wait before posting more.' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO comments (id, summary_id, user_id, parent_id, body) VALUES (?,?,?,?,?)
  `).run(id, summaryId, req.user.id, parent_id || null, trimmed);

  log({ userId: req.user.id, userName: req.user.name, action: 'post_comment', entityType: 'comment',
    entityId: id, details: `Commented on summary ${summaryId}`, ip: req.ip || '' });

  const created = db.prepare('SELECT * FROM comments WHERE id=?').get(id);
  res.status(201).json(enrichComment(created, req.user.id));
});

// ── POST /api/comments/:summaryId/:id/like ───────────────
router.post('/:summaryId/:id/like', requireAuth, (req, res) => {
  const { id } = req.params;
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const existing = db.prepare('SELECT 1 FROM comment_likes WHERE user_id=? AND comment_id=?').get(req.user.id, id);
  if (existing) {
    db.prepare('DELETE FROM comment_likes WHERE user_id=? AND comment_id=?').run(req.user.id, id);
    db.prepare('UPDATE comments SET likes=MAX(0,likes-1) WHERE id=?').run(id);
    return res.json({ liked: false, likes: Math.max(0, comment.likes - 1) });
  } else {
    db.prepare('INSERT OR IGNORE INTO comment_likes (user_id,comment_id) VALUES (?,?)').run(req.user.id, id);
    db.prepare('UPDATE comments SET likes=likes+1 WHERE id=?').run(id);
    return res.json({ liked: true, likes: comment.likes + 1 });
  }
});

// ── DELETE /api/comments/:summaryId/:id ─────────────────
router.delete('/:summaryId/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(id);
  if (!comment) return res.status(404).json({ error: 'Not found' });

  const isOwner = comment.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin' || req.user.role === 'supervisor';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Cannot delete this comment' });

  // Soft delete — preserve the thread structure
  db.prepare('UPDATE comments SET is_deleted=1, body=? WHERE id=?').run('[deleted]', id);
  log({ userId: req.user.id, userName: req.user.name, action: 'delete_comment', entityType: 'comment',
    entityId: id, details: `Deleted comment on summary ${comment.summary_id}`, ip: req.ip || '' });
  res.json({ ok: true });
});

// ── PATCH /api/comments/:summaryId/:id/pin ─────────────
router.patch('/:summaryId/:id/pin', requireSupervisor, (req, res) => {
  const { id } = req.params;
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(id);
  if (!comment) return res.status(404).json({ error: 'Not found' });

  const newPin = comment.is_pinned ? 0 : 1;
  db.prepare('UPDATE comments SET is_pinned=? WHERE id=?').run(newPin, id);
  log({ userId: req.user.id, userName: req.user.name, action: 'pin_comment', entityType: 'comment',
    entityId: id, details: `${newPin ? 'Pinned' : 'Unpinned'} comment on summary ${comment.summary_id}`, ip: req.ip || '' });
  res.json({ ok: true, is_pinned: !!newPin });
});

module.exports = router;
