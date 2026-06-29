const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAdmin } = require('../middleware/auth');

// GET /api/companies — list all active companies
router.get('/', (req, res) => {
  const { q } = req.query;
  let sql = 'SELECT * FROM companies WHERE active=1';
  let params = [];
  if (q) { sql += ' AND (name LIKE ? OR category LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY cpm DESC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/companies — admin: add company
router.post('/', requireAdmin, (req, res) => {
  const { id, name, logo, category, cpm, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  db.prepare('INSERT INTO companies (id,name,logo,category,cpm,description) VALUES (?,?,?,?,?,?)')
    .run(id || 'c_' + Date.now(), name, logo || '🏢', category || '', cpm || 0, description || '');
  res.status(201).json({ success: true });
});

// PATCH /api/companies/:id — admin: update company
router.patch('/:id', requireAdmin, (req, res) => {
  const { name, logo, category, cpm, description, active } = req.body;
  db.prepare('UPDATE companies SET name=COALESCE(?,name), logo=COALESCE(?,logo), category=COALESCE(?,category), cpm=COALESCE(?,cpm), description=COALESCE(?,description), active=COALESCE(?,active) WHERE id=?')
    .run(name||null, logo||null, category||null, cpm||null, description||null, active!==undefined?active:null, req.params.id);
  res.json({ success: true });
});

// DELETE /api/companies/:id — admin: deactivate company
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('UPDATE companies SET active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
