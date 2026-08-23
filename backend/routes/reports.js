const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, requireAdmin, requireSupervisor } = require('../middleware/auth');
const { notifyAdmins } = require('../utils/activity');

// ── Allowed report reasons ────────────────────────────────────
const VALID_REASONS = [
  'stolen_content',
  'wrong_curriculum',
  'wrong_subject',
  'not_educational',
  'spam',
  'inappropriate',
  'low_quality',
  'wrong_language',
  'misleading_title',
  'other',
];

// POST /api/reports — submit a report
router.post('/', requireAuth, (req, res) => {
  const { summary_id, reason, description } = req.body;
  if (!summary_id || !reason) return res.status(400).json({ error: 'summary_id and reason required' });
  if (!VALID_REASONS.includes(reason)) return res.status(400).json({ error: 'Invalid reason' });

  const summary = db.prepare('SELECT * FROM summaries WHERE id=?').get(summary_id);
  if (!summary) return res.status(404).json({ error: 'Summary not found' });

  // Don't allow reporting own content
  if (summary.author_id === req.user.id) return res.status(400).json({ error: 'You cannot report your own summary' });

  // Rate-limit: one report per user per summary
  const existing = db.prepare('SELECT id FROM reports WHERE reporter_id=? AND summary_id=?').get(req.user.id, summary_id);
  if (existing) return res.status(409).json({ error: 'You have already reported this summary' });

  const id = 'rpt_' + uuidv4().replace(/-/g,'').slice(0,12);
  db.prepare(`INSERT INTO reports (id,reporter_id,summary_id,reason,description) VALUES (?,?,?,?,?)`)
    .run(id, req.user.id, summary_id, reason, (description||'').trim().slice(0, 1000));

  notifyAdmins(`🚩 New report on "${summary.title}" — Reason: ${reason.replace(/_/g,' ')}`, { summaryId: summary_id });

  res.status(201).json({ success: true });
});

// GET /api/reports/admin — all reports (admin + supervisor: they review content, they should see what's been reported on it)
router.get('/admin', requireSupervisor, (req, res) => {
  const { status } = req.query;
  const where = status ? 'WHERE r.status=?' : '';
  const params = status ? [status] : [];
  const rows = db.prepare(`
    SELECT r.*,
      u.name  AS reporter_name,
      u.username AS reporter_username,
      s.title AS summary_title,
      s.author_id AS author_id,
      au.name AS author_name,
      au.username AS author_username,
      au.email AS author_email
    FROM reports r
    LEFT JOIN users u  ON u.id  = r.reporter_id
    LEFT JOIN summaries s ON s.id = r.summary_id
    LEFT JOIN users au ON au.id = s.author_id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT 200
  `).all(...params);
  res.json(rows);
});

// PATCH /api/reports/:id/resolve — admin or supervisor resolves a report
router.patch('/:id/resolve', requireSupervisor, (req, res) => {
  const { status, admin_note } = req.body; // status: resolved | dismissed
  if (!['resolved','dismissed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const report = db.prepare('SELECT * FROM reports WHERE id=?').get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  db.prepare('UPDATE reports SET status=?,admin_note=?,resolved_at=? WHERE id=?')
    .run(status, admin_note||'', Math.floor(Date.now()/1000), req.params.id);
  res.json({ success: true });
});

module.exports = router;
