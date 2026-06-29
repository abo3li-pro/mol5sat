const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getSetting, calcEarnings } = require('../utils/earnings');

// GET /api/earnings/me — full earnings dashboard for logged-in creator
router.get('/me', requireAuth, (req, res) => {
  const summaries = db.prepare('SELECT * FROM summaries WHERE author_id=? AND approved=1').all(req.user.id);

  let totalEgp = 0;
  let pendingEgp = 0;
  const breakdown = [];

  summaries.forEach(s => {
    const e = calcEarnings(s);
    totalEgp   += e.egp;
    pendingEgp += e.pending_egp;
    breakdown.push({
      id: s.id, title: s.title, subject: s.subject, views: s.views, likes: s.likes,
      is_paid: !!s.is_paid,
      ...e
    });
  });

  // Platform settings for display
  const settings = {
    min_views: getSetting('min_views_to_monetize', 2000),
    min_likes: getSetting('min_likes_to_monetize', 500),
    platform_share: getSetting('platform_share_percent', 25),
    tier1_share: getSetting('tier1_share_percent', 60),
    tier2_share: getSetting('tier2_share_percent', 70),
    tier3_share: getSetting('tier3_share_percent', 80),
    tier1_followers: getSetting('tier1_followers', 0),
    tier2_followers: getSetting('tier2_followers', 1000),
    tier3_followers: getSetting('tier3_followers', 10000),
  };

  res.json({
    total_egp: parseFloat(totalEgp.toFixed(2)),
    pending_egp: parseFloat(pendingEgp.toFixed(2)),
    total_summaries: summaries.length,
    paid_summaries: summaries.filter(s => s.is_paid).length,
    breakdown,
    settings,
  });
});

// GET /api/earnings/summary/:id — earnings for one summary
router.get('/summary/:id', requireAuth, (req, res) => {
  const s = db.prepare('SELECT * FROM summaries WHERE id=? AND author_id=?').get(req.params.id, req.user.id);
  if (!s) return res.status(404).json({ error: 'Summary not found or not yours' });
  res.json(calcEarnings(s));
});

// GET /api/earnings/settings — platform-wide earnings settings (public)
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  res.json(out);
});

// ── PROMOTION REQUESTS ─────────────────────────────────────

// GET /api/earnings/promotions/me — creator's own promotion requests
router.get('/promotions/me', requireAuth, (req, res) => {
  const reqs = db.prepare(`SELECT pr.*, s.title as summary_title FROM promotion_requests pr
    JOIN summaries s ON s.id=pr.summary_id
    WHERE pr.author_id=? ORDER BY pr.created_at DESC`).all(req.user.id);
  res.json(reqs);
});

// POST /api/earnings/promotions — submit promotion request
router.post('/promotions', requireAuth, (req, res) => {
  const { summary_id, budget_egp, duration_days, notes } = req.body;
  if (!summary_id || !budget_egp || !duration_days) return res.status(400).json({ error: 'summary_id, budget_egp and duration_days required' });

  const s = db.prepare('SELECT * FROM summaries WHERE id=? AND author_id=? AND approved=1').get(summary_id, req.user.id);
  if (!s) return res.status(404).json({ error: 'Summary not found, not yours, or not approved' });

  // Only one active/pending request per summary
  const existing = db.prepare(`SELECT id FROM promotion_requests WHERE summary_id=? AND status IN ('pending','approved')`).get(summary_id);
  if (existing) return res.status(409).json({ error: 'This summary already has an active or pending promotion request' });

  const { v4: uuidv4 } = require('uuid');
  const id = 'pr_' + uuidv4().replace(/-/g,'').slice(0,12);
  db.prepare('INSERT INTO promotion_requests (id,summary_id,author_id,budget_egp,duration_days,notes) VALUES (?,?,?,?,?,?)')
    .run(id, summary_id, req.user.id, parseInt(budget_egp), parseInt(duration_days), notes||'');

  res.status(201).json({ success: true, id, message: 'Promotion request submitted. Admin will review shortly.' });
});

// DELETE /api/earnings/promotions/:id — cancel a pending request
router.delete('/promotions/:id', requireAuth, (req, res) => {
  const pr = db.prepare('SELECT * FROM promotion_requests WHERE id=? AND author_id=?').get(req.params.id, req.user.id);
  if (!pr) return res.status(404).json({ error: 'Not found' });
  if (pr.status !== 'pending') return res.status(400).json({ error: 'Can only cancel pending requests' });
  db.prepare('UPDATE promotion_requests SET status=? WHERE id=?').run('cancelled', req.params.id);
  res.json({ success: true });
});

module.exports = router;
