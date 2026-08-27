const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { requireAuth, optionalAuth, requireAdmin, requireSupervisor } = require('../middleware/auth');
const { embedWatermark, decodeWatermark, hasWatermark, computeSimilarity, classifySimilarity } = require('../utils/watermark');

const { log, notifyAdmins } = require('../utils/activity');
const { sendDeclineEmail } = require('../utils/email');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    // Force safe extension from MIME type, ignore original filename completely
    const mimeToExt = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/msword': '.doc',
      'image/jpeg': '.jpg',
      'image/png':  '.png',
    };
    const ext = mimeToExt[file.mimetype] || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
]);

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    // Validate by MIME type (not extension — extension can be faked)
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Use PDF, DOCX, or images.`));
    }
  }
});

function enrichSummary(s, userId) {
  if (!s) return null;
  try {
    try { s.tags = JSON.parse(s.tags || '[]'); } catch { s.tags = []; }
    s.is_paid = !!s.is_paid; s.is_promoted = !!s.is_promoted; s.is_sponsored = !!s.is_sponsored;
    s.approved = !!s.approved; s.membership_required = !!s.membership_required;
    s.watermarked = !!s.watermarked;
    // Sanitize string fields — null values crash template literals in cardHTML
    s.lang    = s.lang    || 'ar';
    s.title   = s.title   || '';
    s.subject = s.subject || '';
    s.grade   = s.grade   || '';
    s.country = s.country || '';
    s.school  = s.school  || '';
    s.companyAds = db.prepare('SELECT c.* FROM companies c JOIN summary_companies sc ON c.id=sc.company_id WHERE sc.summary_id=?').all(s.id);
    const author = db.prepare('SELECT id,name,username,country,user_type,grade,followers,has_membership,membership_price,membership_perks FROM users WHERE id=?').get(s.author_id);
    s.author = author?.name || s.author_name || '';
    s.author_username = author?.username || '';
    s.authorData = author || null;
    // Per-user flags — previously only computed on the single-item route,
    // so cards rendered from list endpoints (feed/search/saves/likes) had
    // no way to know the current user had already saved/liked them.
    if (userId) {
      s.userLiked = !!db.prepare('SELECT 1 FROM likes WHERE user_id=? AND summary_id=?').get(userId, s.id);
      s.userSaved = !!db.prepare('SELECT 1 FROM saves WHERE user_id=? AND summary_id=?').get(userId, s.id);
    } else {
      s.userLiked = false;
      s.userSaved = false;
    }
    return s;
  } catch (err) {
    console.error('[enrichSummary] failed on summary id=' + (s?.id || '?') + ':', err.message);
    return { id: s?.id || null, title: s?.title || '', subject: s?.subject || '', _enrichError: err.message };
  }
}

// ══════════════════════════════════════════════
// SPECIFIC ROUTES — must all be BEFORE /:id
// ══════════════════════════════════════════════

// GET /api/summaries/feed
router.get('/feed', optionalAuth, (req, res) => {
  try {
    const u = req.user;

    // Guest: return popular student summaries (science feed)
    if (!u) {
      const orderMap = { date:'s.created_at DESC', 'date-asc':'s.created_at ASC', likes:'s.likes DESC', views:'s.views DESC', 'pages-desc':'s.pages DESC', 'pages-asc':'s.pages ASC', recommended:'s.is_promoted DESC, s.likes DESC, s.views DESC' };
      const order = orderMap[req.query.sort] || orderMap.recommended;
      const rows = db.prepare(`SELECT s.* FROM summaries s WHERE s.approved=1 AND s.audience='students' AND s.deleted_at IS NULL ORDER BY ${order} LIMIT 60`).all();
      return res.json(rows.map(s => enrichSummary(s, null)).filter(s => s && !s._enrichError));
    }

    const orderMap = { date:'s.created_at DESC', 'date-asc':'s.created_at ASC', likes:'s.likes DESC', views:'s.views DESC', 'pages-desc':'s.pages DESC', 'pages-asc':'s.pages ASC', recommended:'s.is_promoted DESC, s.likes DESC' };
    const order = orderMap[req.query.sort] || orderMap.recommended;

    // mode=curriculum (Curriculum tab) → keep the exact country+grade match.
    // Anything else (Science tab, or no mode given) needs the full breadth
    // of approved student content — grade/country is a *ranking* signal
    // there, not a hard filter — otherwise the Science feed silently
    // degrades into "curriculum feed with extra steps" for every logged-in
    // user, and features like grade-proximity ordering or the advanced
    // "higher grades" filter have almost nothing to actually sort/filter.
    if (req.query.mode === 'curriculum') {
      const primary = db.prepare(`SELECT s.* FROM summaries s WHERE s.approved=1 AND s.audience='students' AND s.deleted_at IS NULL AND s.country=? AND s.grade=? ORDER BY ${order}`).all(u.country, u.grade);
      const promoted = db.prepare(`SELECT s.* FROM summaries s WHERE s.approved=1 AND s.audience!='colleagues' AND s.deleted_at IS NULL AND s.is_promoted=1 AND s.country!=? ORDER BY ${order} LIMIT 10`).all(u.country);
      const seen = new Set(primary.map(s => s.id));
      return res.json([...primary, ...promoted.filter(s => !seen.has(s.id))].map(s => enrichSummary(s, u.id)).filter(s => s && !s._enrichError));
    }

    const rows = db.prepare(`SELECT s.* FROM summaries s WHERE s.approved=1 AND s.audience='students' AND s.deleted_at IS NULL ORDER BY ${order} LIMIT 300`).all();
    res.json(rows.map(s => enrichSummary(s, u.id)).filter(s => s && !s._enrichError));
  } catch (err) {
    console.error('[GET /summaries/feed] error:', err.message, err.stack);
    res.status(500).json({ error: 'Feed failed. Please try again.' });
  }
});

// GET /api/summaries/pending
router.get('/pending', requireSupervisor, (req, res) => {
  const rows = db.prepare(`SELECT s.*, u.name as author_name FROM summaries s LEFT JOIN users u ON u.id=s.author_id WHERE s.approved=0 AND s.deleted_at IS NULL ORDER BY s.created_at ASC`).all();
  rows.forEach(s => { s.author = s.author_name; });
  res.json(rows.map(s => enrichSummary(s, req.user?.id)));
});

// GET /api/summaries/deleted — recently-removed summaries, restorable by
// whoever removed them. Must be registered here (before the generic
// GET /:id below) or a request for "/deleted" would be swallowed by that
// route trying to look up a summary literally named "deleted".
router.get('/deleted', requireSupervisor, (req, res) => {
  const rows = db.prepare(`SELECT s.*, u.name as author_name, d.name as deleted_by_name
    FROM summaries s
    LEFT JOIN users u ON u.id = s.author_id
    LEFT JOIN users d ON d.id = s.deleted_by
    WHERE s.deleted_at IS NOT NULL
    ORDER BY s.deleted_at DESC LIMIT 100`).all();
  rows.forEach(s => { s.author = s.author_name; });
  res.json(rows.map(s => enrichSummary(s, req.user?.id)));
});

// GET /api/summaries/user/saves
router.get('/user/saves', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT s.* FROM summaries s JOIN saves sv ON sv.summary_id=s.id WHERE sv.user_id=? AND s.approved=1 AND s.deleted_at IS NULL ORDER BY sv.created_at DESC`).all(req.user.id);
  res.json(rows.map(s => enrichSummary(s, req.user.id)));
});

// GET /api/summaries/user/likes
router.get('/user/likes', requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT s.* FROM summaries s JOIN likes l ON l.summary_id=s.id WHERE l.user_id=? AND s.approved=1 AND s.deleted_at IS NULL ORDER BY l.created_at DESC`).all(req.user.id);
  res.json(rows.map(s => enrichSummary(s, req.user.id)));
});

// GET /api/summaries/
router.get('/', optionalAuth, (req, res) => {
  try {
    const { subject, country, grade, lang, audience, sort, q, mode } = req.query;
    let where = ['s.approved=1', 's.deleted_at IS NULL']; let params = [];
    if (subject) { where.push('s.subject=?'); params.push(subject); }
    if (country) { where.push('s.country=?'); params.push(country); }
    if (grade) { where.push('s.grade=?'); params.push(grade); }
    if (lang) { where.push('s.lang=?'); params.push(lang); }
    if (audience) {
      where.push('s.audience=?'); params.push(audience);
    } else if (!req.user) {
      // Guests should not see colleagues/university content
      where.push("s.audience != 'colleagues'");
    }
    // mode=curriculum: restrict search to the user's own country+grade,
    // mirroring /feed?mode=curriculum, so a Curriculum-tab search actually
    // stays within the user's curriculum instead of searching everything.
    if (mode === 'curriculum' && req.user) {
      where.push('s.country=?'); params.push(req.user.country);
      if (req.user.grade) { where.push('s.grade=?'); params.push(req.user.grade); }
      where.push("s.audience != 'colleagues'");
    }
    if (q) { where.push('(s.title LIKE ? OR s.subject LIKE ? OR s.tags LIKE ? OR s.content LIKE ?)'); const lk=`%${q}%`; params.push(lk,lk,lk,lk); }
    const orderMap = { date:'s.created_at DESC', 'date-asc':'s.created_at ASC', likes:'s.likes DESC', views:'s.views DESC', 'pages-desc':'s.pages DESC', 'pages-asc':'s.pages ASC', recommended:'s.is_promoted DESC, s.likes DESC, s.views DESC' };
    const order = orderMap[sort] || orderMap.recommended;
    const rows = db.prepare(`SELECT s.* FROM summaries s WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 200`).all(...params);
    const enriched = rows.map(s => enrichSummary(s, req.user?.id)).filter(s => s && !s._enrichError);
    res.json(enriched);
  } catch (err) {
    console.error('[GET /summaries] search error:', err.message, err.stack);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// POST /api/summaries/
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  const { title, subject, grade, country, school, lang, audience, content, is_paid, ad_every, ad_duration_seconds, tags, membership_required, companies, translated_from } = req.body;
  if (!title || !subject) return res.status(400).json({ error: 'Title and subject required' });

  const id = 's_' + uuidv4().replace(/-/g,'').slice(0,12);
  let tagsArr = []; try { tagsArr = typeof tags==='string' ? JSON.parse(tags||'[]') : (tags||[]); } catch {}
  let companiesArr = []; try { companiesArr = typeof companies==='string' ? JSON.parse(companies||'[]') : (companies||[]); } catch {}

  // ── Watermark incoming content ──────────────────────────
  const author = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  const authorUsername = author?.username || req.user.id;
  let rawContent = content || '';
  let watermarked = 0;

  if (rawContent && rawContent.trim().length > 50) {
    if (!hasWatermark(rawContent)) {
      rawContent = embedWatermark(rawContent, authorUsername);
      watermarked = 1;
    } else {
      // Content already has a watermark — decode it and check ownership
      const foundUsername = decodeWatermark(rawContent);
      if (foundUsername && foundUsername.toLowerCase() !== authorUsername.toLowerCase()) {
        // Watermark belongs to a different user — run full plagiarism check
        const wmUser = db.prepare('SELECT * FROM users WHERE LOWER(username)=?').get(foundUsername.toLowerCase());
        if (wmUser) {
          // Find all their approved summaries that match
          const theirSummaries = db.prepare('SELECT * FROM summaries WHERE author_id=? AND approved=1 AND deleted_at IS NULL').all(wmUser.id);
          let bestScore = 0, bestMatch = null;
          for (const s of theirSummaries) {
            const score = computeSimilarity(rawContent, s.content);
            if (score > bestScore) { bestScore = score; bestMatch = s; }
          }
          const verdict = bestScore >= 0.90 ? 'thief' : bestScore >= 0.55 ? 'semi' : 'pending';
          if (bestMatch && verdict !== 'pending') {
            const caseId = 'plg_' + uuidv4().replace(/-/g,'').slice(0,12);
            db.prepare(`INSERT OR IGNORE INTO plagiarism_cases (id,suspect_id,original_id,incoming_id,similarity,verdict,watermark_hit,watermark_username)
              VALUES (?,?,?,?,?,?,?,?)`)
              .run(caseId, req.user.id, bestMatch.id, id, bestScore, verdict, 1, foundUsername);
            // Notify all admins
            notifyAdmins(`🚨 Watermark plagiarism detected! @${authorUsername} uploaded content watermarked by @${foundUsername}. Similarity: ${(bestScore*100).toFixed(0)}%`, { summaryId: id });
          }
          // Re-watermark with correct owner
          rawContent = embedWatermark(rawContent.replace(/\uFEFF[\s\S]*?\uFEFF/g,''), authorUsername);
          watermarked = 1;
        }
      }
    }
  }

  // ── Text-similarity check against all approved summaries ─
  if (rawContent && rawContent.trim().length > 100) {
    // Only check approved summaries with content (not just file-only)
    const approved = db.prepare('SELECT * FROM summaries WHERE approved=1 AND deleted_at IS NULL AND content!=? AND length(content)>100').all('');
    let topScore = 0, topMatch = null;
    for (const s of approved) {
      const score = computeSimilarity(rawContent, s.content);
      if (score > topScore) { topScore = score; topMatch = s; }
    }
    const classification = classifySimilarity(topScore);
    if (classification !== 'clean' && topMatch) {
      // Avoid duplicate case (don't create if watermark already flagged this)
      const existingCase = db.prepare('SELECT id FROM plagiarism_cases WHERE incoming_id=?').get(id);
      if (!existingCase) {
        const caseId = 'plg_' + uuidv4().replace(/-/g,'').slice(0,12);
        const verdict = classification === 'identical' ? 'thief' : 'semi';
        db.prepare(`INSERT OR IGNORE INTO plagiarism_cases (id,suspect_id,original_id,incoming_id,similarity,verdict,watermark_hit,watermark_username)
          VALUES (?,?,?,?,?,?,?,?)`)
          .run(caseId, req.user.id, topMatch.id, id, topScore, verdict, 0, '');
        notifyAdmins(`⚠️ Similarity alert: @${authorUsername}'s upload matches "${topMatch.title}" at ${(topScore*100).toFixed(0)}% — flagged as ${verdict}.`, { summaryId: id });
      }
    }
  }

  db.prepare(`INSERT INTO summaries (id,title,subject,grade,country,school,lang,author_id,content,file_path,is_paid,ad_every,ad_duration_seconds,tags,audience,membership_required,watermarked,translated_from) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, title, subject, grade||'', country||req.user.country, school||req.user.school||'',
    lang||'ar', req.user.id, rawContent, req.file?req.file.filename:'',
    is_paid?1:0, ad_every?parseInt(ad_every):0, ad_duration_seconds?parseInt(ad_duration_seconds):10,
    JSON.stringify(tagsArr), audience||'students', membership_required?1:0, watermarked,
    translated_from||''
  );
  companiesArr.slice(0,3).forEach(cid => db.prepare('INSERT OR IGNORE INTO summary_companies (summary_id,company_id) VALUES (?,?)').run(id,cid));
  db.prepare('UPDATE users SET uploads=uploads+1 WHERE id=?').run(req.user.id);
  const followers = db.prepare('SELECT follower_id FROM follows WHERE following_id=?').all(req.user.id);
  followers.forEach(f => db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run('n_'+uuidv4().replace(/-/g,'').slice(0,10), f.follower_id, `${req.user.name} uploaded: ${title}`, id));
  log({ userId: req.user.id, userName: req.user.name, action: 'upload_summary', entityType: 'summary',
    entityId: id, details: `Uploaded "${title}" (${subject}, ${grade}, ${country})`, ip: req.ip||'' });
  res.status(201).json(enrichSummary(db.prepare('SELECT * FROM summaries WHERE id=?').get(id)));
});

// ══════════════════════════════════════════════
// DYNAMIC :id ROUTES — must be LAST
// ══════════════════════════════════════════════

// GET /api/summaries/:id
router.get('/:id', optionalAuth, (req, res) => {
  const s = db.prepare('SELECT * FROM summaries WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Summary not found' });
  const isModerator = req.user?.role === 'admin' || req.user?.role === 'supervisor';
  if (s.deleted_at && !isModerator) return res.status(404).json({ error: 'Summary not found' });
  if (!s.approved && req.user?.role !== 'admin' && req.user?.id !== s.author_id) return res.status(403).json({ error: 'Not approved yet' });
  const enriched = enrichSummary(s);
  if (s.membership_required && req.user) {
    const hasMember = db.prepare('SELECT 1 FROM memberships WHERE subscriber_id=? AND creator_id=? AND active=1').get(req.user.id, s.author_id);
    enriched.userHasMembership = !!(hasMember || req.user.id===s.author_id || req.user.role==='admin');
  } else { enriched.userHasMembership = !s.membership_required; }
  // Count a view once per viewer per 12-hour window — never count the
  // author viewing their own summary. Views feed directly into the
  // monetization threshold and ad revenue, so an uncapped counter was
  // trivially gameable (refresh your own page, a bot loop, etc.).
  const viewerKey = req.user ? `u_${req.user.id}` : `ip_${req.ip || 'unknown'}`;
  const isAuthor = req.user && req.user.id === s.author_id;
  if (!isAuthor) {
    const VIEW_WINDOW_SECONDS = 12 * 60 * 60; // 12 hours
    const recent = db.prepare('SELECT viewed_at FROM view_log WHERE summary_id=? AND viewer_key=?').get(req.params.id, viewerKey);
    const now = Math.floor(Date.now() / 1000);
    if (!recent || (now - recent.viewed_at) > VIEW_WINDOW_SECONDS) {
      db.prepare('UPDATE summaries SET views=views+1 WHERE id=?').run(req.params.id);
      db.prepare('INSERT INTO view_log (summary_id, viewer_key, viewed_at) VALUES (?,?,?) ON CONFLICT(summary_id, viewer_key) DO UPDATE SET viewed_at=excluded.viewed_at')
        .run(req.params.id, viewerKey, now);
      enriched.views = (enriched.views || 0) + 1; // reflect the increment in this response too
    }
  }
  if (req.user) {
    enriched.userLiked = !!db.prepare('SELECT 1 FROM likes WHERE user_id=? AND summary_id=?').get(req.user.id, req.params.id);
    enriched.userSaved = !!db.prepare('SELECT 1 FROM saves WHERE user_id=? AND summary_id=?').get(req.user.id, req.params.id);
  }
  res.json(enriched);
});

// PATCH /api/summaries/:id/approve
router.patch('/:id/approve', requireSupervisor, (req, res) => {
  const s = db.prepare('SELECT * FROM summaries WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });

  // ── Ensure watermark is embedded before going live ────────────
  let finalContent = s.content;
  const author = db.prepare('SELECT * FROM users WHERE id=?').get(s.author_id);
  const authorUsername = author?.username || s.author_id;
  if (finalContent && finalContent.trim().length > 50 && !hasWatermark(finalContent)) {
    finalContent = embedWatermark(finalContent, authorUsername);
    db.prepare('UPDATE summaries SET content=?, watermarked=1 WHERE id=?').run(finalContent, s.id);
  }

  db.prepare('UPDATE summaries SET approved=1 WHERE id=?').run(req.params.id);

  // ── Cross-post if this is a translation ──────────────────────
  if (s.translated_from && s.translated_from.trim()) {
    const orig = db.prepare('SELECT * FROM summaries WHERE id=?').get(s.translated_from.trim());
    if (orig) {
      // Notify original author that a translation was published
      db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
        'n_'+uuidv4().replace(/-/g,'').slice(0,10), orig.author_id,
        `🌐 "${s.title}" is a translation of your summary "${orig.title}" and is now live!`, s.id
      );
    }
  }

  // Notify approval
  db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
    'n_'+uuidv4().replace(/-/g,'').slice(0,10),
    s.author_id, `✅ "${s.title}" approved and is now live!`, s.id
  );

  // If it's a paid summary and creator has no wallet yet, remind them
  if (s.is_paid) {
    const hasWalletRow = db.prepare('SELECT 1 FROM payout_methods WHERE user_id=? LIMIT 1').get(s.author_id);
    if (!hasWalletRow) {
      db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
        'n_'+uuidv4().replace(/-/g,'').slice(0,10),
        s.author_id,
        `💰 Your monetized summary is live! Add your payout method in Wallet → so you can receive ad revenue when you hit the threshold.`,
        s.id
      );
    }
  }
  log({ userId: req.user.id, userName: req.user.name, action: 'approve_summary', entityType: 'summary',
    entityId: s.id, details: `Approved "${s.title}" by ${author?.name || s.author_id}`, ip: req.ip || '' });
  res.json({ success: true });
});

// PATCH /api/summaries/:id/decline — REQUIRES a reason, emailed to the author
router.patch('/:id/decline', requireSupervisor, (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'A decline reason is required.' });
  const s = db.prepare('SELECT * FROM summaries WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  const declineReason = reason.trim();
  const author = db.prepare('SELECT * FROM users WHERE id=?').get(s.author_id);

  db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
    'n_'+uuidv4().replace(/-/g,'').slice(0,10), s.author_id,
    `❌ "${s.title}" was not approved. Reason: ${declineReason}`, s.id
  );
  db.prepare('DELETE FROM summaries WHERE id=?').run(req.params.id);

  log({ userId: req.user.id, userName: req.user.name, action: 'decline_summary', entityType: 'summary',
    entityId: req.params.id, details: `Declined "${s.title}" by ${author?.name || s.author_id}: ${declineReason}`, ip: req.ip || '' });

  res.json({ success: true });

  // Fire-and-forget, same reasoning as the ban route — don't make the
  // decline wait on SMTP.
  if (author?.email) {
    sendDeclineEmail({
      to: author.email, name: author.name, reason: declineReason, title: s.title,
    }).then(r => {
      if (!r.sent) console.warn(`[decline email] not sent to ${author.email}: ${r.reason || 'unknown'}`);
    }).catch(err => console.error('[decline email] failed:', err.message));
  }
});

// DELETE /api/summaries/:id — soft delete (recoverable). Content stops
// appearing anywhere immediately, but nothing is actually destroyed until
// an admin/supervisor deliberately purges it, so a mistaken removal is
// never a dead end.
router.delete('/:id', requireAuth, (req, res) => {
  const s = db.prepare('SELECT * FROM summaries WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && req.user.role !== 'supervisor' && req.user.id !== s.author_id) return res.status(403).json({ error: 'Not authorized' });
  db.prepare('UPDATE summaries SET deleted_at=?, deleted_by=? WHERE id=?').run(Math.floor(Date.now()/1000), req.user.id, req.params.id);
  db.prepare('UPDATE users SET uploads=MAX(0,uploads-1) WHERE id=?').run(s.author_id);
  log({ userId: req.user.id, userName: req.user.name, action: 'remove_summary', entityType: 'summary',
    entityId: req.params.id, details: `Removed "${s.title}"`, ip: req.ip||'' });
  res.json({ success: true });
});

// PATCH /api/summaries/:id/restore — undo a removal. Admin/supervisor only:
// same reasoning as approve/decline — this is a moderation action, not
// something the original author can trigger themselves.
router.patch('/:id/restore', requireSupervisor, (req, res) => {
  const s = db.prepare('SELECT * FROM summaries WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  if (!s.deleted_at) return res.status(400).json({ error: 'This summary was not removed.' });
  db.prepare('UPDATE summaries SET deleted_at=NULL, deleted_by=? WHERE id=?').run('', req.params.id);
  db.prepare('UPDATE users SET uploads=uploads+1 WHERE id=?').run(s.author_id);
  log({ userId: req.user.id, userName: req.user.name, action: 'restore_summary', entityType: 'summary',
    entityId: req.params.id, details: `Restored "${s.title}"`, ip: req.ip||'' });
  res.json({ success: true });
});

// POST /api/summaries/:id/like
router.post('/:id/like', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM likes WHERE user_id=? AND summary_id=?').get(req.user.id, req.params.id);
  if (existing) { db.prepare('DELETE FROM likes WHERE user_id=? AND summary_id=?').run(req.user.id, req.params.id); db.prepare('UPDATE summaries SET likes=MAX(0,likes-1) WHERE id=?').run(req.params.id); return res.json({ liked: false }); }
  db.prepare('INSERT OR IGNORE INTO likes (user_id,summary_id) VALUES (?,?)').run(req.user.id, req.params.id);
  db.prepare('UPDATE summaries SET likes=likes+1 WHERE id=?').run(req.params.id);

  // Check if this like crossed the monetization threshold — notify creator to add wallet
  const updated = db.prepare('SELECT s.*, u.id as uid FROM summaries s JOIN users u ON u.id=s.author_id WHERE s.id=?').get(req.params.id);
  if (updated) {
    const minLikes = parseInt(db.prepare("SELECT value FROM settings WHERE key='min_likes_to_monetize'").get()?.value || 500);
    const minViews = parseInt(db.prepare("SELECT value FROM settings WHERE key='min_views_to_monetize'").get()?.value || 2000);
    const justCrossed = updated.is_paid &&
      ((updated.likes === minLikes) || (updated.views >= minViews && updated.likes === minLikes));
    if (justCrossed) {
      const hasWallet = db.prepare('SELECT 1 FROM payout_methods WHERE user_id=? LIMIT 1').get(updated.uid);
      if (!hasWallet) {
        db.prepare('INSERT INTO notifications (id,user_id,text,summary_id) VALUES (?,?,?,?)').run(
          'n_'+require('uuid').v4().replace(/-/g,'').slice(0,10),
          updated.uid,
          `🎉 Your summary "${updated.title}" has reached the monetization threshold! Add your payout method in Wallet to start receiving ad revenue.`,
          updated.id
        );
      }
    }
  }

  res.json({ liked: true });
  log({ userId: req.user.id, userName: req.user.name, action: 'like_summary', entityType: 'summary',
    entityId: req.params.id, ip: req.ip||'' });
});

// POST /api/summaries/:id/save
router.post('/:id/save', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM saves WHERE user_id=? AND summary_id=?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM saves WHERE user_id=? AND summary_id=?').run(req.user.id, req.params.id);
    log({ userId: req.user.id, userName: req.user.name, action: 'unsave_summary', entityType: 'summary',
      entityId: req.params.id, ip: req.ip||'' });
    return res.json({ saved: false });
  }
  db.prepare('INSERT OR IGNORE INTO saves (user_id,summary_id) VALUES (?,?)').run(req.user.id, req.params.id);
  log({ userId: req.user.id, userName: req.user.name, action: 'save_summary', entityType: 'summary',
    entityId: req.params.id, ip: req.ip||'' });
  res.json({ saved: true });
});

module.exports = router;
module.exports.enrichSummary = enrichSummary;
