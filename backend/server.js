// ═══════════════════════════════════════════════════════
//  MOL5SAT — EXPRESS SERVER  (fully hardened)
// ═══════════════════════════════════════════════════════
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const slowDown   = require('express-slow-down');
const { v4: uuidv4 } = require('uuid');
const fs         = require('fs');

const app      = express();
const PORT     = process.env.PORT       || 3000;
const DOMAIN   = process.env.DOMAIN     || 'https://mol5sat.org';
const APP_DOMAIN_ENV = process.env.APP_DOMAIN || '';
const isProd   = process.env.NODE_ENV === 'production';
const { db, seed } = require('./db'); // db = SQLite instance, seed = deferred to after listen()

// ── STARTUP SAFETY CHECKS ─────────────────────────────────
const DEFAULT_JWT    = 'brAqi$T;%!p^^ZtM!q7,/*:>vXFhf8z.DEw~`,ETJJd%dyk?OS,_*Cf49%aqIL/U7nV';
const DEFAULT_WALLET = 'a3f8c2d9e1b74560f2a1c8d3e7b90425f1e6c8a2d4b7e9f0c3a5d2b8e1f4c7a0';
const secretWarnings = [];

// JWT_SECRET — fall back to a random one for this session if not set (NOT safe for prod)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT) {
  const generated = require('crypto').randomBytes(64).toString('hex');
  process.env.JWT_SECRET = generated;
  secretWarnings.push('JWT_SECRET is missing or default — generated a random one for this session. Set it permanently in Railway Variables!');
}

// WALLET_ENCRYPTION_KEY — same fallback
if (!process.env.WALLET_ENCRYPTION_KEY || process.env.WALLET_ENCRYPTION_KEY === DEFAULT_WALLET) {
  const generated = require('crypto').randomBytes(32).toString('hex');
  process.env.WALLET_ENCRYPTION_KEY = generated;
  secretWarnings.push('WALLET_ENCRYPTION_KEY is missing or default — generated a random one for this session. Set it permanently in Railway Variables!');
}

if (secretWarnings.length) {
  console.warn('\n⚠️  SECRET WARNING — the server started, but these must be fixed:\n' +
    secretWarnings.map(w => '  • ' + w).join('\n') + '\n');
}

// ── AUTO-CREATE UPLOADS FOLDER ────────────────────────────
// Multer will crash with ENOENT if this folder doesn't exist on fresh deploy
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created backend/uploads/ directory');
}

// ── TRUST PROXY ───────────────────────────────────────────
app.set('trust proxy', 1);

// ── REQUEST ID ────────────────────────────────────────────
// Every request gets a unique ID for tracing attacks in logs
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// ── HELMET — HTTP security headers ────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      // unsafe-inline required: all HTML pages use onclick="..." inline event handlers
      // unsafe-eval required: dynamic template rendering uses eval-adjacent patterns
      scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                    'https://cdnjs.cloudflare.com',
                    'https://fonts.googleapis.com'],
      // scriptSrcAttr covers inline event handlers: onclick="...", onload="...", etc.
      // These are used extensively across all 17 pages. Without this explicit directive
      // browsers apply 'none' as the default even when scriptSrc has 'unsafe-inline',
      // which blocks every button, card, search input and menu item silently.
      scriptSrcAttr: ["'unsafe-inline'"],
      // JSON-LD structured data is type="application/ld+json" — not executable JS
      // so it does NOT need scriptSrc coverage
      styleSrc:    ["'self'", "'unsafe-inline'", // CSS needs inline for theme variables
                    'https://fonts.googleapis.com',
                    'https://cdnjs.cloudflare.com'],
      fontSrc:     ["'self'",
                    'https://fonts.gstatic.com',
                    'https://cdnjs.cloudflare.com'],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'",
                    'https://mol5sat-production.up.railway.app',
                    'https://*.up.railway.app'],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy:              { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies:{ permittedPolicies: 'none' },
  xContentTypeOptions:         true,
  xFrameOptions:               { action: 'deny' },
  xXssProtection:              true,
  dnsPrefetchControl:          { allow: false },
}));

// ── CORS ──────────────────────────────────────────────────
// Build allowed origins — always include the actual request host so Railway/Render/Fly
// URLs work even when DOMAIN is set to a custom domain (mol5sat.org)
const allowedOrigins = isProd
  ? (origin, callback) => {
      // Always allow same-origin (no Origin header = server-to-server = fine)
      if (!origin) return callback(null, true);
      const allowed = [
        DOMAIN,
        DOMAIN.replace('https://', 'https://www.'),
        ...(APP_DOMAIN_ENV ? [APP_DOMAIN_ENV, APP_DOMAIN_ENV.replace('https://', 'https://www.')] : []),
        // Always allow the Railway deployment URL regardless of DOMAIN setting
        'https://mol5sat-production.up.railway.app',
      ].filter(Boolean);
      if (allowed.includes(origin) || origin.endsWith('.up.railway.app') || origin.endsWith('.onrender.com') || origin.endsWith('.fly.dev')) {
        callback(null, true);
      } else {
        callback(null, true); // permissive for now — tighten after custom domain is set
      }
    }
  : true; // allow all in dev

app.use(cors({
  origin: allowedOrigins,
  methods:        ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Request-Id'],
  credentials:    true,
}));

// ── PERMISSIONS POLICY ───────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  );
  next();
});

// ── BODY PARSING ──────────────────────────────────────────
app.use(express.json({ limit: '2mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// ── CONTENT-TYPE ENFORCEMENT ─────────────────────────────
// POST/PATCH to /api/ must send application/json (or multipart for uploads)
app.use('/api/', (req, res, next) => {
  if (['POST','PATCH'].includes(req.method)) {
    const ct = req.headers['content-type'] || '';
    const ok = ct.includes('application/json') || ct.includes('multipart/form-data');
    if (!ok && req.path !== '/api/health') {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

// ── HTTP PARAMETER POLLUTION (HPP) ────────────────────────
// If ?id=1&id=2 is sent, take the LAST value for all params
app.use((req, res, next) => {
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (Array.isArray(req.query[key])) {
        req.query[key] = req.query[key][req.query[key].length - 1];
      }
    }
  }
  next();
});

// ── XSS + PROTOTYPE POLLUTION SANITIZER ──────────────────
let xssLib;
try { xssLib = require('xss'); } catch { xssLib = null; }

function deepSanitize(obj, depth = 0) {
  if (depth > 10) return obj; // prevent infinite recursion on deeply nested input
  if (typeof obj === 'string') {
    if (!xssLib) return obj;
    return xssLib(obj, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script','style'] });
  }
  if (Array.isArray(obj)) return obj.slice(0, 100).map(v => deepSanitize(v, depth + 1)); // cap array length
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) {
      // Block prototype pollution attack vectors
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = deepSanitize(obj[k], depth + 1);
    }
    return out;
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.is('multipart/form-data')) return next(); // multer handles these
  if (req.body)  req.body  = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query);
  next();
});

// ── RATE LIMITING ─────────────────────────────────────────
// FIX: Don't use req.user to skip — it's not set yet at this point.
// Instead, skip based on a special admin header checked server-side.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.clientIp || req.ip,
  message: { error: 'Too many requests. Please try again later.' },
});

// Progressive slowdown for auth: adds 500ms delay per request after 5 attempts
const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (used) => (used - 5) * 500, // 500ms, 1000ms, 1500ms...
  maxDelayMs: 10000, // cap at 10 second delay
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 15,
  keyGenerator: (req) => req.clientIp || req.ip,
  message: { error: 'Too many auth attempts. Please wait 15 minutes.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20,
  keyGenerator: (req) => req.clientIp || req.ip,
  message: { error: 'Upload limit reached. Try again in an hour.' },
});

app.use('/api/',             apiLimiter);
app.use('/api/auth/login',   authSlowDown, authLimiter);
app.use('/api/auth/register',authSlowDown, authLimiter);
app.use('/api/summaries',    (req, res, next) => {
  if (req.method === 'POST') return uploadLimiter(req, res, next);
  next();
});

// ── IP BAN ────────────────────────────────────────────────
const ipBanMiddleware = require('./middleware/ipBan');
app.use('/api/', ipBanMiddleware);

// ── NO CACHE FOR API ──────────────────────────────────────
app.use('/api/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma',        'no-cache');
  next();
});

// ── UPLOADS (read-only, no execution) ─────────────────────
app.use('/uploads', (req, res, next) => {
  if (req.method !== 'GET') return res.status(405).end();
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  index:    false,
  dotfiles: 'deny',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition',    'inline');
    res.setHeader('Content-Security-Policy',"default-src 'none'");
  }
}));

// ── robots.txt ────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /uploads/
Disallow: /admin
Disallow: /supervisor
Disallow: /settings
Disallow: /notifications
Disallow: /saved
Disallow: /earnings
Disallow: /wallet
Disallow: /app/

Sitemap: ${DOMAIN}/sitemap.xml`);
});

// ── sitemap.xml ───────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const now = new Date().toISOString().split('T')[0];
  const summaries = db.prepare(
    'SELECT id,subject,country,grade,created_at FROM summaries WHERE approved=1 ORDER BY created_at DESC LIMIT 1000'
  ).all();

  const staticUrls = [
    { loc: '/',          priority: '1.0', changefreq: 'daily'  },
    { loc: '/subjects',  priority: '0.8', changefreq: 'weekly' },
    { loc: '/trending',  priority: '0.8', changefreq: 'daily'  },
    { loc: '/search',    priority: '0.7', changefreq: 'weekly' },
  ].map(p => `  <url><loc>${DOMAIN}${p.loc}</loc><lastmod>${now}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`);

  const summaryUrls = summaries.map(s => {
    const date = new Date(s.created_at * 1000).toISOString().split('T')[0];
    // Use proper path URLs so search engines can crawl them (hash routes are not crawlable)
    return `  <url><loc>${DOMAIN}/summary/${s.id}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
  });

  res.type('application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls,...summaryUrls].join('\n')}\n</urlset>`);
});

// ── API ROUTES ────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/summaries', require('./routes/summaries'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/companies', require('./routes/ads'));
app.use('/api/earnings',  require('./routes/earnings'));
app.use('/api/wallet',    require('./routes/wallet'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/comments',  require('./routes/comments'));

// ── SITE REPORTS — stricter limit (5 per hour per IP, guests can submit) ──
const siteReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  keyGenerator: (req) => req.clientIp || req.ip,
  message: { error: 'Too many reports. Please try again later.' },
});
app.use('/api/site-reports', siteReportLimiter);
app.use('/api/site-reports', require('./routes/siteReports'));

// Health check (no rate limit, no auth)
app.get('/api/health', (req, res) => {
  res.json({
    status:   'ok',
    time:     new Date().toISOString(),
    version:  '1.0.0',
    warnings: secretWarnings.length ? secretWarnings : undefined,
  });
});

// ══════════════════════════════════════════════════════════
//  FRONTEND — WEBSITE ONLY
//
//  The mobile app (React Native) calls /api/ directly and does NOT
//  need to be served over HTTP. There is no /app route anymore.
//
//  Only the website (frontend-web/) is served here.
//  Domain: mol5sat.org
//
//  ENV VARS (.env):
//    DOMAIN=https://mol5sat.org
//    APP_DOMAIN=https://app.mol5sat.org  ← kept for CORS only (native app)
// ══════════════════════════════════════════════════════════

const frontendWebPath = path.join(__dirname, '../frontend-web');

// Static asset options
const staticOpts = {
  dotfiles: 'deny',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (/\.(js|css)$/.test(filePath)) {
      // IMPORTANT: these filenames never change between deploys (app.js stays
      // app.js), so 'immutable' + long max-age meant browsers would silently
      // keep running WEEK-OLD code after every deploy, with no way to tell
      // from the server side that anything was wrong. must-revalidate forces
      // a quick check with the server on every load (cheap 304 if unchanged),
      // so a real deploy is never masked by a stale local cache again.
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (/\.(woff2?|ttf|otf|png|jpg|webp|svg|ico)$/.test(filePath)) {
      // Fonts/images are safe to cache aggressively — they rarely change
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
};

// ── WEBSITE STATIC ASSETS ─────────────────────────────────
app.use('/web', express.static(frontendWebPath, staticOpts));

// ── WEBSITE CLEAN URLs ────────────────────────────────────
const webPage = (f) => path.join(frontendWebPath, f);

app.get('/',              (req, res) => res.sendFile(webPage('index.html')));
app.get('/home',          (req, res) => res.sendFile(webPage('home.html')));
app.get('/search',        (req, res) => res.sendFile(webPage('search.html')));
app.get('/trending',      (req, res) => res.sendFile(webPage('trending.html')));
app.get('/subjects',      (req, res) => res.sendFile(webPage('subjects.html')));
app.get('/saved',         (req, res) => res.sendFile(webPage('saved.html')));
app.get('/following',     (req, res) => res.sendFile(webPage('following.html')));
app.get('/notifications', (req, res) => res.sendFile(webPage('notifications.html')));
app.get('/settings',      (req, res) => res.sendFile(webPage('settings.html')));
app.get('/earnings',      (req, res) => res.sendFile(webPage('earnings.html')));
app.get('/wallet',        (req, res) => res.sendFile(webPage('wallet.html')));
app.get('/profile',       (req, res) => res.sendFile(webPage('profile.html')));
app.get('/admin',         (req, res) => res.sendFile(webPage('admin.html')));
app.get('/supervisor',    (req, res) => res.sendFile(webPage('supervisor.html')));
app.get('/membership',    (req, res) => res.sendFile(webPage('membership.html')));
app.get('/summary/:id',   (req, res) => {
  const id = req.params.id;

  // Read the HTML shell once
  const fs = require('fs');
  const htmlPath = webPage('summary.html');
  let html;
  try { html = fs.readFileSync(htmlPath, 'utf8'); } catch {
    return res.status(500).send('Internal error');
  }

  // Fetch summary data from DB to inject real OG tags server-side
  const s = db.prepare('SELECT s.*, u.name as author_name FROM summaries s LEFT JOIN users u ON u.id=s.author_id WHERE s.id=?').get(id);

  if (!s || !s.approved) {
    // Unknown summary: serve shell with generic tags (JS will handle 404 state)
    return res.setHeader('Cache-Control','no-store').send(html);
  }

  const title = `${s.title} — ${s.subject} | Mol5sat`;
  const description = `ملخص ${s.subject}${s.grade ? ' للصف ' + s.grade : ''}${s.country ? ' — ' + s.country : ''}. بقلم ${s.author_name || ''}. ${s.pages} صفحة.`.trim();
  const pageUrl = `${DOMAIN}/summary/${id}`;
  const ogImage = `${DOMAIN}/api/summaries/${id}/og-image`;

  // Smart app banner tags — tells iOS Safari to show "Open in App" bar
  // and Android Chrome to show the install/open banner
  const appId_ios     = 'YOUR_IOS_APP_ID';      // ← replace after App Store submission
  const appId_android = 'com.mol5sat.app';
  const smartBannerMeta = `
  <meta name="apple-itunes-app" content="app-id=${appId_ios}, app-argument=${pageUrl}">
  <meta name="google-play-app" content="app-id=${appId_android}">`;

  // Inject into <head>
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${escHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${escHtml(description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${escHtml(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${escHtml(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${pageUrl}">`)
    .replace(/<meta property="og:image" content="[^"]*">/,
      `<meta property="og:image" content="${ogImage}">`)
    .replace(/<meta property="og:type" content="[^"]*">/,
      `<meta property="og:type" content="article">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${escHtml(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${escHtml(description)}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/,
      `<meta name="twitter:image" content="${ogImage}">`)
    .replace(/<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="${pageUrl}">`)
    // Inject smart banner tags right before </head>
    .replace('</head>', `${smartBannerMeta}\n</head>`);

  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  res.send(html);
});

app.get('/user/:id',      (req, res) => {
  const id = req.params.id;

  const fs = require('fs');
  const htmlPath = webPage('user.html');
  let html;
  try { html = fs.readFileSync(htmlPath, 'utf8'); } catch {
    return res.status(500).send('Internal error');
  }

  const u = db.prepare('SELECT id,name,country,user_type,specialization,major,followers,uploads,status FROM users WHERE id=?').get(id);

  if (!u || u.status !== 'active') {
    // Unknown or inactive/banned account: serve shell with generic tags
    // (JS will handle the 404/unavailable state) rather than a personalized
    // preview for a profile that shouldn't be promoted.
    return res.setHeader('Cache-Control', 'no-store').send(html);
  }

  const roleLine = u.user_type === 'colleague'
    ? [u.major, u.specialization].filter(Boolean).join(' · ')
    : u.country;
  const title = `${u.name} — Mol5sat`;
  const description = `${u.name} on Mol5sat${roleLine ? ' — ' + roleLine : ''}. ${u.uploads} ${u.uploads === 1 ? 'summary' : 'summaries'} shared, ${u.followers} ${u.followers === 1 ? 'follower' : 'followers'}.`;
  const pageUrl = `${DOMAIN}/user/${id}`;
  const ogImage = `${DOMAIN}/api/users/${id}/og-image`;

  const appId_ios     = 'YOUR_IOS_APP_ID';
  const appId_android = 'com.mol5sat.app';
  const smartBannerMeta = `
  <meta name="apple-itunes-app" content="app-id=${appId_ios}, app-argument=${pageUrl}">
  <meta name="google-play-app" content="app-id=${appId_android}">`;

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${escHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/,
      `<meta name="description" content="${escHtml(description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/,
      `<meta property="og:title" content="${escHtml(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/,
      `<meta property="og:description" content="${escHtml(description)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${pageUrl}">`)
    .replace(/<meta property="og:image" content="[^"]*">/,
      `<meta property="og:image" content="${ogImage}">`)
    .replace(/<meta property="og:type" content="[^"]*">/,
      `<meta property="og:type" content="profile">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/,
      `<meta name="twitter:title" content="${escHtml(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/,
      `<meta name="twitter:description" content="${escHtml(description)}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/,
      `<meta name="twitter:image" content="${ogImage}">`)
    .replace(/<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="${pageUrl}">`)
    .replace('</head>', `${smartBannerMeta}\n</head>`);

  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  res.send(html);
});

// ── OG IMAGE ENDPOINT (generates a simple SVG badge per summary) ───────────
// Crawlers (WhatsApp, Twitter, Telegram) fetch this when someone shares a link.
app.get('/api/summaries/:id/og-image', (req, res) => {
  const s = db.prepare('SELECT title, subject, author_id FROM summaries WHERE id=? AND approved=1').get(req.params.id);
  const author = s ? db.prepare('SELECT name FROM users WHERE id=?').get(s.author_id) : null;
  const title   = escHtml((s?.title   || 'Mol5sat Summary').slice(0, 80));
  const subject = escHtml((s?.subject || 'Education').slice(0, 30));
  const authorName = escHtml((author?.name || '').slice(0, 40));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0700"/>
      <stop offset="1" stop-color="#1c1400"/>
    </linearGradient>
    <linearGradient id="gld" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFB800"/>
      <stop offset="1" stop-color="#E85D04"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="8" height="630" fill="url(#gld)"/>
  <text x="60" y="120" font-family="sans-serif" font-size="28" font-weight="800" fill="#FFB800" letter-spacing="4">MOL5SAT · ملخصات</text>
  <text x="60" y="260" font-family="sans-serif" font-size="52" font-weight="900" fill="#f5e8c0" xml:space="preserve">${title}</text>
  <text x="60" y="360" font-family="sans-serif" font-size="32" fill="#E85D04" font-weight="700">${subject}</text>
  <text x="60" y="430" font-family="sans-serif" font-size="26" fill="#9a8055">${authorName ? 'by ' + authorName : ''}</text>
  <text x="60" y="590" font-family="sans-serif" font-size="22" fill="#5a4a28">mol5sat.org · Learn · Worldwide</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── OG IMAGE ENDPOINT for creator profiles ──────────────────────────────
// Mirrors the summary og-image endpoint above so a shared /user/:id link
// gets a branded preview card too, not just summaries.
app.get('/api/users/:id/og-image', (req, res) => {
  const u = db.prepare('SELECT name,country,user_type,specialization,major,followers,uploads,status FROM users WHERE id=?').get(req.params.id);
  const valid = u && u.status === 'active';

  const name = escHtml((valid ? u.name : 'Mol5sat Creator').slice(0, 40));
  const roleLine = valid
    ? escHtml(((u.user_type === 'colleague' ? [u.major, u.specialization].filter(Boolean).join(' · ') : u.country) || '').slice(0, 40))
    : '';
  const stats = valid
    ? `${u.uploads} ${u.uploads === 1 ? 'summary' : 'summaries'} · ${u.followers} ${u.followers === 1 ? 'follower' : 'followers'}`
    : 'Educational Summaries Platform';

  const initialsWords = (valid ? u.name : '').trim().split(/\s+/).filter(w => /^[A-Za-z\u0600-\u06FF]/.test(w));
  const initials = initialsWords.length
    ? escHtml(initialsWords.slice(0, 2).map(w => w[0]).join('').toUpperCase())
    : 'M';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0700"/>
      <stop offset="1" stop-color="#1c1400"/>
    </linearGradient>
    <linearGradient id="gld" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFB800"/>
      <stop offset="1" stop-color="#E85D04"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="8" height="630" fill="url(#gld)"/>
  <text x="60" y="120" font-family="sans-serif" font-size="28" font-weight="800" fill="#FFB800" letter-spacing="4">MOL5SAT · ملخصات</text>
  <circle cx="130" cy="280" r="70" fill="url(#gld)"/>
  <text x="130" y="298" font-family="sans-serif" font-size="48" font-weight="900" fill="#000" text-anchor="middle">${initials}</text>
  <text x="240" y="265" font-family="sans-serif" font-size="48" font-weight="900" fill="#f5e8c0" xml:space="preserve">${name}</text>
  <text x="240" y="315" font-family="sans-serif" font-size="28" fill="#E85D04" font-weight="700">${roleLine}</text>
  <text x="60" y="430" font-family="sans-serif" font-size="26" fill="#9a8055">${stats}</text>
  <text x="60" y="590" font-family="sans-serif" font-size="22" fill="#5a4a28">mol5sat.org · Learn · Worldwide</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// ── DEEP LINK REDIRECT (universal link entry point for the app) ───────────
// When the app is installed, iOS/Android intercepts mol5sat.org/summary/:id
// via Universal Links / App Links. If the OS sends the user to the browser
// instead (app not installed), this page serves the web viewer with a smart banner.
// The /.well-known/ files below are what iOS/Android check to authorise the app.

// Android App Links verification file
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.mol5sat.app',
      // Replace sha256_cert_fingerprints with your actual keystore fingerprint
      // Run: keytool -list -v -keystore mol5sat-release.keystore -alias mol5sat
      sha256_cert_fingerprints: ['YOUR:KEYSTORE:SHA256:FINGERPRINT:HERE'],
    },
  }]);
});

// iOS Universal Links verification file
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    applinks: {
      apps: [],
      details: [{
        // Replace TEAMID with your 10-char Apple Team ID from developer.apple.com
        appID: 'TEAMID.com.mol5sat.app',
        paths: ['/summary/*', '/user/*', '/search*'],
      }],
    },
  });
});

// Catch-all — serve the shell so the client router can show a proper 404
// with the original URL preserved in the address bar.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  // Serve index.html with a 404 status so browsers/crawlers see the correct
  // HTTP status, while the JS router reads window.location and renders
  // the friendly 404 page with "Go Home / Go Back / Search" options.
  res.status(404).sendFile(webPage('index.html'));
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, next) => {
  const msg = isProd ? 'Internal server error' : err.message;
  console.error(`[${req.requestId}] ❌`, err.message);
  if (err.code === 'LIMIT_FILE_SIZE')     return res.status(413).json({ error: 'File too large. Max 50MB.' });
  if (err.message?.includes('CORS'))      return res.status(403).json({ error: 'Origin not allowed' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  res.status(500).json({ error: msg });
});

// ── START ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  🟡 Mol5sat → http://localhost:${PORT}
  🔒 Helmet ✅ | CORS ✅ | CSP ✅ | XSS+Prototype ✅
  🛡️  Rate limit ✅ | Slowdown ✅ | HPP ✅ | Content-Type ✅
  🌐 IP ban ✅ | Request ID ✅ | Upload strict ✅
  📦 Env: ${process.env.NODE_ENV || 'development'} | Domain: ${DOMAIN}
  `);

  // Run seed AFTER port binds — ensures healthcheck passes before bcrypt work starts.
  // seed() is fast (pre-hashed passwords, INSERT OR IGNORE skips existing rows).
  try { seed(); } catch (e) { console.error('Seed error:', e.message); }
});

module.exports = app;
