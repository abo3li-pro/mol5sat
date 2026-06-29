// ═══════════════════════════════════════════════════════
//  MOL5SAT — SITE ISSUE REPORTS ROUTE
//  POST /api/site-reports         — submit a site issue
//  GET  /api/site-reports/admin   — admin: list all
//  PATCH /api/site-reports/:id/resolve — admin: resolve
// ═══════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');
const { notifyAdmins } = require('../utils/activity');

const VALID_SITE_REASONS = [
  'bug',
  'security',
  'performance',
  'ui_broken',
  'login',
  'payment',
  'content',
  'notification',
  'other',
];

// ── POST /api/site-reports ───────────────────────────────
// Auth is optional — guests can also report issues
router.post('/', optionalAuth, (req, res) => {
  const { reason, description, page, user_agent } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'reason is required' });
  if (!VALID_SITE_REASONS.includes(reason)) return res.status(400).json({ error: 'Invalid reason' });

  // "other" requires a description
  if (reason === 'other' && (!description || !description.trim())) {
    return res.status(400).json({ error: 'Description is required when reason is "other"' });
  }

  const id = 'sr_' + uuidv4().replace(/-/g, '').slice(0, 12);
  const userId = req.user?.id || null;

  db.prepare(`
    INSERT INTO site_reports (id, reporter_id, reason, description, page, user_agent, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'open', unixepoch())
  `).run(id, userId, reason, (description || '').trim().slice(0, 2000), (page || '').slice(0, 200), (user_agent || '').slice(0, 500));

  // Notify all active admins
  notifyAdmins(`⚠️ Site issue reported — Reason: ${reason.replace(/_/g, ' ')}${description ? ': ' + description.slice(0, 80) : ''}`);

  res.status(201).json({ success: true, id });
});

// ── GET /api/site-reports/admin ──────────────────────────
router.get('/admin', requireAdmin, (req, res) => {
  const { status } = req.query;
  const where = status ? 'WHERE sr.status=?' : '';
  const params = status ? [status] : [];
  const rows = db.prepare(`
    SELECT sr.*,
      u.name AS reporter_name,
      u.username AS reporter_username
    FROM site_reports sr
    LEFT JOIN users u ON u.id = sr.reporter_id
    ${where}
    ORDER BY sr.created_at DESC
    LIMIT 300
  `).all(...params);
  res.json(rows);
});

// ── PATCH /api/site-reports/:id/resolve ─────────────────
router.patch('/:id/resolve', requireAdmin, (req, res) => {
  const { status, admin_note } = req.body;
  if (!['resolved', 'dismissed', 'in_progress'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const report = db.prepare('SELECT * FROM site_reports WHERE id=?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  db.prepare('UPDATE site_reports SET status=?, admin_note=?, resolved_at=unixepoch() WHERE id=?')
    .run(status, admin_note || '', req.params.id);
  res.json({ success: true });
});

module.exports = router;
