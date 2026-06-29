// ═══════════════════════════════════════════════════════
//  MOL5SAT — WALLET & PAYOUT ROUTES
//  Handles: payout method management, withdrawal requests,
//           promotion payment flow — creators only
// ═══════════════════════════════════════════════════════
'use strict';

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getEarningsBalance } = require('../utils/earnings');

// ── ENCRYPTION ────────────────────────────────────────────
// AES-256-GCM: authenticated encryption — prevents both reading AND tampering
const ENC_KEY_HEX = process.env.WALLET_ENCRYPTION_KEY;

function getEncKey() {
  if (ENC_KEY_HEX && ENC_KEY_HEX.length === 64) {
    return Buffer.from(ENC_KEY_HEX, 'hex');
  }
  // Fallback: derive from JWT_SECRET (never as good as a dedicated key)
  return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'cct?M!1Tjvv,nn&n%E2WJ+YGfPQE`b0oOr_dp36-lDpb+NtMAyE;&6+VqxFGq<d+E-22o').digest();
}

function encrypt(plaintext) {
  const key  = getEncKey();
  const iv   = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc  = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(ciphertext) {
  try {
    const [ivHex, tagHex, encHex] = ciphertext.split(':');
    const key    = getEncKey();
    const iv     = Buffer.from(ivHex,  'hex');
    const tag    = Buffer.from(tagHex, 'hex');
    const enc    = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch { return null; }
}

// ── PAYOUT METHOD DEFINITIONS ─────────────────────────────
// Every type declares: what fields it needs, how to mask them, what currency it uses
const PAYOUT_TYPES = {
  // ── Egyptian Mobile Wallets ──
  vodafone_cash:  { label: 'Vodafone Cash',   currency: 'EGP', country: 'EG', fields: ['phone'],                             maskFn: d => maskPhone(d.phone)   },
  orange_money:   { label: 'Orange Money',     currency: 'EGP', country: 'EG', fields: ['phone'],                             maskFn: d => maskPhone(d.phone)   },
  etisalat_cash:  { label: 'e& (Etisalat) Cash', currency: 'EGP', country: 'EG', fields: ['phone'],                          maskFn: d => maskPhone(d.phone)   },
  we_pay:         { label: 'WE Pay',           currency: 'EGP', country: 'EG', fields: ['phone'],                             maskFn: d => maskPhone(d.phone)   },
  // ── Egyptian Banking ──
  instapay:       { label: 'InstaPay (Egypt)', currency: 'EGP', country: 'EG', fields: ['instapay_id', 'bank_name'],          maskFn: d => maskEmail(d.instapay_id) },
  bank_account_eg:{ label: 'Egyptian Bank Account', currency: 'EGP', country: 'EG', fields: ['account_number','iban','bank_name','account_name'], maskFn: d => maskAccount(d.account_number||d.iban) },
  fawry:          { label: 'Fawry',            currency: 'EGP', country: 'EG', fields: ['phone'],                             maskFn: d => maskPhone(d.phone)   },
  // ── International Transfer ──
  paypal:         { label: 'PayPal',           currency: 'USD', country: 'INT', fields: ['email'],                            maskFn: d => maskEmail(d.email)   },
  wise:           { label: 'Wise (TransferWise)', currency: 'USD', country: 'INT', fields: ['email', 'account_currency'],     maskFn: d => maskEmail(d.email)   },
  payoneer:       { label: 'Payoneer',         currency: 'USD', country: 'INT', fields: ['email'],                            maskFn: d => maskEmail(d.email)   },
  bank_account_int:{ label: 'International Bank (SWIFT/IBAN)', currency: 'USD', country: 'INT', fields: ['iban','swift_bic','bank_name','account_name','bank_country'], maskFn: d => maskAccount(d.iban) },
  western_union:  { label: 'Western Union',    currency: 'USD', country: 'INT', fields: ['full_name', 'country', 'phone'],    maskFn: d => maskName(d.full_name) },
  // ── Crypto ──
  binance:        { label: 'Binance Pay',      currency: 'USDT', country: 'INT', fields: ['binance_id_or_email'],            maskFn: d => maskEmail(d.binance_id_or_email) },
  usdt_trc20:     { label: 'USDT (TRC-20)',    currency: 'USDT', country: 'INT', fields: ['wallet_address'],                  maskFn: d => maskWallet(d.wallet_address) },
  usdt_erc20:     { label: 'USDT (ERC-20)',    currency: 'USDT', country: 'INT', fields: ['wallet_address'],                  maskFn: d => maskWallet(d.wallet_address) },
  bitcoin:        { label: 'Bitcoin (BTC)',     currency: 'BTC',  country: 'INT', fields: ['wallet_address'],                 maskFn: d => maskWallet(d.wallet_address) },
};

// ── MASK HELPERS ──────────────────────────────────────────
function maskPhone(p)   { if (!p) return '***'; p=String(p); return p.slice(0,3)+'****'+p.slice(-2); }
function maskEmail(e)   { if (!e) return '***'; const [u,d]=e.split('@'); return (u||'').slice(0,3)+'***@'+(d||'***'); }
function maskAccount(a) { if (!a) return '***'; a=String(a).replace(/\s/g,''); return '****'+a.slice(-4); }
function maskName(n)    { if (!n) return '***'; const p=n.trim().split(' '); return p[0].charAt(0)+'***'+(p.length>1?' '+p[p.length-1].charAt(0)+'***':''); }
function maskWallet(w)  { if (!w) return '***'; return w.slice(0,6)+'...'+w.slice(-4); }

// ── CREATOR CHECK ─────────────────────────────────────────
// A "creator" is any user who has at least one approved summary OR has submitted any summary
// We don't lock non-creators out of viewing — only out of wallet features
function isEligibleCreator(userId) {
  const hasUpload = db.prepare('SELECT 1 FROM summaries WHERE author_id=? LIMIT 1').get(userId);
  return !!hasUpload;
}

function requireCreator(req, res, next) {
  if (!isEligibleCreator(req.user.id)) {
    return res.status(403).json({
      error: 'creator_only',
      message: 'Wallet features are available once you upload your first summary. Upload a summary to become a creator.'
    });
  }
  next();
}

// ── INPUT VALIDATION ──────────────────────────────────────
function validateFields(type, data) {
  const def = PAYOUT_TYPES[type];
  if (!def) return 'Unsupported payout method type';
  for (const f of def.fields) {
    if (!data[f] || String(data[f]).trim() === '') return `Field "${f}" is required for ${def.label}`;
  }
  // Type-specific validation
  if (data.phone && !/^\+?[\d\s\-]{7,20}$/.test(data.phone)) return 'Invalid phone number format';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return 'Invalid email address';
  if (data.iban  && data.iban.length < 15) return 'IBAN too short';
  if (data.wallet_address && !/^[a-zA-Z0-9]{20,100}$/.test(data.wallet_address)) return 'Invalid wallet address format';
  return null;
}

// getEarningsBalance is now imported from ../utils/earnings — see top of file.
// (Previously defined here using a flat creator_share_percent setting, which
// disagreed with the tiered, follower-based calculation routes/earnings.js
// used for the same summaries. Both routes now share one calculation.)

// ═══════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════

// GET /api/wallet/types — list all supported payout method types (public, for UI)
router.get('/types', (req, res) => {
  const types = Object.entries(PAYOUT_TYPES).map(([id, def]) => ({
    id,
    label:    def.label,
    currency: def.currency,
    country:  def.country,
    fields:   def.fields,
  }));
  res.json(types);
});

// GET /api/wallet/me — my wallet overview (balance + payout methods, masked)
router.get('/me', requireAuth, requireCreator, (req, res) => {
  const methods = db.prepare('SELECT id,type,label,is_primary,verified,masked_value,currency,country,created_at FROM payout_methods WHERE user_id=? ORDER BY is_primary DESC, created_at DESC').all(req.user.id);

  // Attach type label
  methods.forEach(m => { m.type_label = PAYOUT_TYPES[m.type]?.label || m.type; m.is_primary = !!m.is_primary; m.verified = !!m.verified; });

  const balance = getEarningsBalance(req.user.id);

  // Pending withdrawals
  const pendingWithdrawals = db.prepare(`SELECT wr.*, pm.label as method_label, pm.masked_value, pm.type
    FROM withdrawal_requests wr
    JOIN payout_methods pm ON pm.id=wr.payout_method_id
    WHERE wr.user_id=? ORDER BY wr.created_at DESC LIMIT 20`).all(req.user.id);

  res.json({ balance, methods, withdrawals: pendingWithdrawals });
});

// POST /api/wallet/payout-methods — add a payout method
router.post('/payout-methods', requireAuth, requireCreator, (req, res) => {
  const { type, label, data: rawData } = req.body;

  if (!type || !PAYOUT_TYPES[type])  return res.status(400).json({ error: 'Invalid payout method type' });
  if (!label || label.trim() === '')  return res.status(400).json({ error: 'Label is required (e.g. "My Vodafone Cash")' });
  if (!rawData || typeof rawData !== 'object') return res.status(400).json({ error: 'Payment data is required' });

  // Sanitize keys — block prototype pollution
  const data = {};
  for (const k of Object.keys(rawData)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    data[k] = String(rawData[k] || '').trim().slice(0, 500);
  }

  const validErr = validateFields(type, data);
  if (validErr) return res.status(400).json({ error: validErr });

  // Max 5 payout methods per user
  const count = db.prepare('SELECT COUNT(*) as c FROM payout_methods WHERE user_id=?').get(req.user.id);
  if (count.c >= 5) return res.status(400).json({ error: 'Maximum 5 payout methods allowed. Remove one first.' });

  const def      = PAYOUT_TYPES[type];
  const id       = 'pm_' + uuidv4().replace(/-/g,'').slice(0,12);
  const masked   = def.maskFn(data);
  const encrypted = encrypt(JSON.stringify(data));

  // First method is automatically primary
  const isPrimary = count.c === 0 ? 1 : 0;

  db.prepare(`INSERT INTO payout_methods (id,user_id,type,label,is_primary,encrypted_data,masked_value,currency,country)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    id, req.user.id, type, label.trim().slice(0,50), isPrimary,
    encrypted, masked, def.currency, def.country
  );

  res.status(201).json({
    id, type, label: label.trim(), type_label: def.label,
    masked_value: masked, currency: def.currency, country: def.country,
    is_primary: !!isPrimary, verified: false,
    message: 'Payout method added. Admin will verify before first payout.'
  });
});

// PATCH /api/wallet/payout-methods/:id/primary — set as primary
router.patch('/payout-methods/:id/primary', requireAuth, requireCreator, (req, res) => {
  const pm = db.prepare('SELECT * FROM payout_methods WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!pm) return res.status(404).json({ error: 'Payout method not found' });
  db.prepare('UPDATE payout_methods SET is_primary=0 WHERE user_id=?').run(req.user.id);
  db.prepare('UPDATE payout_methods SET is_primary=1 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// DELETE /api/wallet/payout-methods/:id — remove a payout method
router.delete('/payout-methods/:id', requireAuth, requireCreator, (req, res) => {
  const pm = db.prepare('SELECT * FROM payout_methods WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!pm) return res.status(404).json({ error: 'Payout method not found' });

  // Block deletion if there's a pending withdrawal using it
  const pending = db.prepare(`SELECT 1 FROM withdrawal_requests WHERE payout_method_id=? AND status='pending'`).get(req.params.id);
  if (pending) return res.status(400).json({ error: 'Cannot delete — there is a pending withdrawal using this method. Wait for it to be resolved first.' });

  db.prepare('DELETE FROM payout_methods WHERE id=?').run(req.params.id);

  // If this was primary, promote next one
  const next = db.prepare('SELECT id FROM payout_methods WHERE user_id=? ORDER BY created_at ASC LIMIT 1').get(req.user.id);
  if (next) db.prepare('UPDATE payout_methods SET is_primary=1 WHERE id=?').run(next.id);

  res.json({ success: true });
});

// POST /api/wallet/withdraw — request a withdrawal
router.post('/withdraw', requireAuth, requireCreator, (req, res) => {
  const { payout_method_id, amount_egp } = req.body;

  if (!payout_method_id) return res.status(400).json({ error: 'Select a payout method' });

  const amount = parseFloat(amount_egp);
  if (isNaN(amount) || amount < 50) return res.status(400).json({ error: 'Minimum withdrawal is EGP 50' });
  if (amount > 50000) return res.status(400).json({ error: 'Maximum withdrawal is EGP 50,000 per request' });

  const pm = db.prepare('SELECT * FROM payout_methods WHERE id=? AND user_id=?').get(payout_method_id, req.user.id);
  if (!pm) return res.status(404).json({ error: 'Payout method not found' });
  if (!pm.verified) return res.status(400).json({ error: 'Your payout method has not been verified yet. Please wait for admin verification.' });

  // Check available balance
  const { available } = getEarningsBalance(req.user.id);
  if (amount > available) return res.status(400).json({ error: `Insufficient balance. Available: EGP ${available.toFixed(2)}` });

  // One pending withdrawal at a time
  const existing = db.prepare(`SELECT 1 FROM withdrawal_requests WHERE user_id=? AND status='pending'`).get(req.user.id);
  if (existing) return res.status(409).json({ error: 'You already have a pending withdrawal request. Wait for it to be processed first.' });

  const id = 'wr_' + uuidv4().replace(/-/g,'').slice(0,12);
  db.prepare('INSERT INTO withdrawal_requests (id,user_id,payout_method_id,amount_egp) VALUES (?,?,?,?)').run(id, req.user.id, payout_method_id, amount);

  // Notify the creator
  db.prepare('INSERT INTO notifications (id,user_id,text) VALUES (?,?,?)').run(
    'n_'+uuidv4().replace(/-/g,'').slice(0,10), req.user.id,
    `💸 Withdrawal request of EGP ${amount.toFixed(2)} submitted. We'll process it within 3–5 business days.`
  );

  res.status(201).json({ id, amount_egp: amount, status: 'pending', message: `Withdrawal of EGP ${amount.toFixed(2)} submitted. Processing within 3–5 business days.` });
});

// POST /api/wallet/check-promote — check if user can pay for a promotion, returns what they need
router.post('/check-promote', requireAuth, (req, res) => {
  const hasMethod = db.prepare('SELECT 1 FROM payout_methods WHERE user_id=? AND verified=1 LIMIT 1').get(req.user.id);
  const hasUnverified = db.prepare('SELECT 1 FROM payout_methods WHERE user_id=? LIMIT 1').get(req.user.id);
  if (hasMethod) return res.json({ ready: true });
  if (hasUnverified) return res.json({ ready: false, reason: 'pending_verification', message: 'Your payout method is awaiting verification. You can promote once it\'s verified.' });
  return res.json({
    ready: false,
    reason: 'no_method',
    message: 'Add a payment method to your wallet to pay for promotions. The same wallet is also where you receive your ad revenue.'
  });
});

// ═══════════════════════════════════════════════════════
//  ADMIN WALLET ROUTES
// ═══════════════════════════════════════════════════════

// GET /api/wallet/admin/withdrawals — all withdrawal requests
router.get('/admin/withdrawals', requireAdmin, (req, res) => {
  const { status } = req.query;
  let sql = `SELECT wr.*, u.name as user_name, u.email as user_email,
    pm.type as pm_type, pm.label as pm_label, pm.masked_value
    FROM withdrawal_requests wr
    JOIN users u ON u.id=wr.user_id
    JOIN payout_methods pm ON pm.id=wr.payout_method_id`;
  const params = [];
  if (status) { sql += ' WHERE wr.status=?'; params.push(status); }
  sql += ' ORDER BY wr.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// PATCH /api/wallet/admin/withdrawals/:id — approve / reject / mark paid
router.patch('/admin/withdrawals/:id', requireAdmin, (req, res) => {
  const { status, admin_note } = req.body;
  const allowed = ['approved','paid','rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status must be approved, paid, or rejected' });

  const wr = db.prepare('SELECT * FROM withdrawal_requests WHERE id=?').get(req.params.id);
  if (!wr) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE withdrawal_requests SET status=?, admin_note=?, resolved_at=? WHERE id=?')
    .run(status, admin_note||'', Math.floor(Date.now()/1000), req.params.id);

  // Notify user
  const msg = status === 'paid'
    ? `✅ Your withdrawal of EGP ${wr.amount_egp.toFixed(2)} has been paid!`
    : status === 'approved'
    ? `✅ Your withdrawal of EGP ${wr.amount_egp.toFixed(2)} is approved and will be sent soon.`
    : `❌ Your withdrawal of EGP ${wr.amount_egp.toFixed(2)} was rejected. Reason: ${admin_note||'Contact support'}.`;

  db.prepare('INSERT INTO notifications (id,user_id,text) VALUES (?,?,?)').run(
    'n_'+uuidv4().replace(/-/g,'').slice(0,10), wr.user_id, msg
  );
  res.json({ success: true });
});

// GET /api/wallet/admin/payout-methods — all unverified payout methods
router.get('/admin/payout-methods', requireAdmin, (req, res) => {
  const unverified = db.prepare(`SELECT pm.*, u.name as user_name, u.email as user_email
    FROM payout_methods pm JOIN users u ON u.id=pm.user_id
    WHERE pm.verified=0 ORDER BY pm.created_at ASC`).all();
  // Never return encrypted_data to admin either — only show masked values
  unverified.forEach(m => { delete m.encrypted_data; m.type_label = PAYOUT_TYPES[m.type]?.label || m.type; });
  res.json(unverified);
});

// PATCH /api/wallet/admin/payout-methods/:id/verify — verify a payout method
router.patch('/admin/payout-methods/:id/verify', requireAdmin, (req, res) => {
  const pm = db.prepare('SELECT * FROM payout_methods WHERE id=?').get(req.params.id);
  if (!pm) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE payout_methods SET verified=1, updated_at=? WHERE id=?').run(Math.floor(Date.now()/1000), req.params.id);
  db.prepare('INSERT INTO notifications (id,user_id,text) VALUES (?,?,?)').run(
    'n_'+uuidv4().replace(/-/g,'').slice(0,10), pm.user_id,
    `✅ Your payout method "${pm.label}" has been verified! You can now request withdrawals and pay for promotions.`
  );
  res.json({ success: true });
});

// PATCH /api/wallet/admin/payout-methods/:id/reject
router.patch('/admin/payout-methods/:id/reject', requireAdmin, (req, res) => {
  const pm = db.prepare('SELECT * FROM payout_methods WHERE id=?').get(req.params.id);
  if (!pm) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM payout_methods WHERE id=?').run(req.params.id);
  db.prepare('INSERT INTO notifications (id,user_id,text) VALUES (?,?,?)').run(
    'n_'+uuidv4().replace(/-/g,'').slice(0,10), pm.user_id,
    `❌ Your payout method "${pm.label}" could not be verified. Reason: ${req.body.reason||'Invalid details'}. Please re-add with correct information.`
  );
  res.json({ success: true });
});

module.exports = router;
