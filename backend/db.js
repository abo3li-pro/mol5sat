// ═══════════════════════════════════════════════════════
//  MOL5SAT — DATABASE SETUP (SQLite via better-sqlite3)
// ═══════════════════════════════════════════════════════
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const fs = require('fs');

// Resolve the database path safely — never crashes even without a Railway Volume.
function resolveDbPath() {
  // 1. Explicit DB_PATH env var — most reliable, set this in Railway Variables
  if (process.env.DB_PATH) {
    const dir = require('path').dirname(process.env.DB_PATH);
    try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch {}
    return process.env.DB_PATH;
  }
  // 2. Auto-detect Railway Volume: /data exists and is writable
  try {
    if (fs.existsSync('/data') && fs.statSync('/data').isDirectory()) {
      fs.accessSync('/data', fs.constants.W_OK);
      return '/data/mol5sat.db';
    }
  } catch {}
  // 3. Fallback: next to db.js — works everywhere with no config
  return path.join(__dirname, 'mol5sat.db');
}

const DB_PATH = resolveDbPath();
console.log('🗄️  DB path:', DB_PATH);
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── CREATE TABLES ────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    username    TEXT UNIQUE,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT DEFAULT 'student',
    user_type   TEXT DEFAULT 'student',
    country     TEXT DEFAULT 'Egypt',
    school      TEXT DEFAULT '',
    grade       TEXT DEFAULT '',
    specialization TEXT DEFAULT '',
    major       TEXT DEFAULT '',
    status      TEXT DEFAULT 'active',
    followers   INTEGER DEFAULT 0,
    uploads     INTEGER DEFAULT 0,
    has_membership  INTEGER DEFAULT 0,
    membership_price INTEGER DEFAULT 0,
    membership_perks TEXT DEFAULT '',
    interests   TEXT DEFAULT '[]',
    joined      TEXT DEFAULT (date('now')),
    created_at  INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    email      TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used       INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_prt_email ON password_reset_tokens(email);
  CREATE INDEX IF NOT EXISTS idx_prt_user  ON password_reset_tokens(user_id);

  CREATE TABLE IF NOT EXISTS plagiarism_cases (
    id            TEXT PRIMARY KEY,
    suspect_id    TEXT NOT NULL,
    original_id   TEXT NOT NULL,
    incoming_id   TEXT DEFAULT '',
    similarity    REAL NOT NULL,
    verdict       TEXT DEFAULT 'pending',
    watermark_hit INTEGER DEFAULT 0,
    watermark_username TEXT DEFAULT '',
    admin_note    TEXT DEFAULT '',
    ban_action    TEXT DEFAULT '',
    created_at    INTEGER DEFAULT (unixepoch()),
    resolved_at   INTEGER DEFAULT 0,
    FOREIGN KEY (suspect_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (original_id) REFERENCES summaries(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_plagiarism_suspect ON plagiarism_cases(suspect_id);
  CREATE INDEX IF NOT EXISTS idx_plagiarism_verdict ON plagiarism_cases(verdict);

  CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    summary_id  TEXT NOT NULL,
    reason      TEXT NOT NULL,
    description TEXT DEFAULT '',
    status      TEXT DEFAULT 'pending',
    admin_note  TEXT DEFAULT '',
    created_at  INTEGER DEFAULT (unixepoch()),
    resolved_at INTEGER DEFAULT 0,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_reports_status  ON reports(status);
  CREATE INDEX IF NOT EXISTS idx_reports_summary ON reports(summary_id);

  CREATE TABLE IF NOT EXISTS summaries (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    subject     TEXT NOT NULL,
    grade       TEXT DEFAULT '',
    country     TEXT DEFAULT '',
    school      TEXT DEFAULT '',
    lang        TEXT DEFAULT 'ar',
    author_id   TEXT NOT NULL,
    content     TEXT DEFAULT '',
    file_path   TEXT DEFAULT '',
    pages       INTEGER DEFAULT 1,
    views       INTEGER DEFAULT 0,
    likes       INTEGER DEFAULT 0,
    is_paid     INTEGER DEFAULT 0,
    is_promoted INTEGER DEFAULT 0,
    is_sponsored INTEGER DEFAULT 0,
    ad_every    INTEGER DEFAULT 0,
    tags        TEXT DEFAULT '[]',
    approved    INTEGER DEFAULT 0,
    audience    TEXT DEFAULT 'students',
    membership_required INTEGER DEFAULT 0,
    watermarked INTEGER DEFAULT 0,
    translated_from TEXT DEFAULT '',
    created_at  INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS summary_companies (
    summary_id  TEXT NOT NULL,
    company_id  TEXT NOT NULL,
    PRIMARY KEY (summary_id, company_id),
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS companies (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    logo        TEXT DEFAULT '🏢',
    category    TEXT DEFAULT '',
    cpm         REAL DEFAULT 0,
    description TEXT DEFAULT '',
    active      INTEGER DEFAULT 1,
    created_at  INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS memberships (
    subscriber_id TEXT NOT NULL,
    creator_id    TEXT NOT NULL,
    active        INTEGER DEFAULT 1,
    created_at    INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (subscriber_id, creator_id),
    FOREIGN KEY (subscriber_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id     TEXT NOT NULL,
    summary_id  TEXT NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, summary_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS saves (
    user_id     TEXT NOT NULL,
    summary_id  TEXT NOT NULL,
    created_at  INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, summary_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS view_log (
    summary_id  TEXT NOT NULL,
    viewer_key  TEXT NOT NULL,
    viewed_at   INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (summary_id, viewer_key),
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    text        TEXT NOT NULL,
    summary_id  TEXT DEFAULT '',
    actor_id    TEXT DEFAULT '',
    read        INTEGER DEFAULT 0,
    created_at  INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ip_bans (
    id          TEXT PRIMARY KEY,
    ip          TEXT NOT NULL,
    reason      TEXT DEFAULT '',
    banned_by   TEXT NOT NULL,
    banned_at   INTEGER DEFAULT (unixepoch()),
    expires_at  INTEGER DEFAULT 0,
    permanent   INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti         TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    revoked_at  INTEGER DEFAULT (unixepoch()),
    expires_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS payout_methods (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    type          TEXT NOT NULL,       -- bank_account | vodafone_cash | orange_money | etisalat_cash | we_pay | paypal | wise | payoneer | instapay | fawry | binance | usdt | other
    label         TEXT NOT NULL,       -- user-chosen name e.g. "My CIB Account"
    is_primary    INTEGER DEFAULT 0,
    verified      INTEGER DEFAULT 0,
    -- Encrypted payload stored as JSON string (AES-256 encrypted on write)
    encrypted_data TEXT NOT NULL,
    -- Masked display fields (safe to show)
    masked_value  TEXT NOT NULL,       -- e.g. "****3456" or "ahmed****@gmail.com"
    currency      TEXT DEFAULT 'EGP',  -- EGP | USD | EUR | USDT | BTC
    country       TEXT DEFAULT 'EG',
    created_at    INTEGER DEFAULT (unixepoch()),
    updated_at    INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    payout_method_id TEXT NOT NULL,
    amount_egp    REAL NOT NULL,
    status        TEXT DEFAULT 'pending',  -- pending | approved | paid | rejected
    note          TEXT DEFAULT '',
    admin_note    TEXT DEFAULT '',
    created_at    INTEGER DEFAULT (unixepoch()),
    resolved_at   INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payout_method_id) REFERENCES payout_methods(id)
  );

  CREATE INDEX IF NOT EXISTS idx_payout_user    ON payout_methods(user_id);
  CREATE INDEX IF NOT EXISTS idx_withdraw_user  ON withdrawal_requests(user_id);
  CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdrawal_requests(status);

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    summary_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    parent_id   TEXT DEFAULT NULL,
    body        TEXT NOT NULL,
    likes       INTEGER DEFAULT 0,
    is_pinned   INTEGER DEFAULT 0,
    is_deleted  INTEGER DEFAULT 0,
    created_at  INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_comments_summary ON comments(summary_id);
  CREATE INDEX IF NOT EXISTS idx_comments_user    ON comments(user_id);
  CREATE TABLE IF NOT EXISTS comment_likes (
    user_id    TEXT NOT NULL,
    comment_id TEXT NOT NULL,
    PRIMARY KEY (user_id, comment_id),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS site_reports (
    id          TEXT PRIMARY KEY,
    reporter_id TEXT DEFAULT NULL,
    reason      TEXT NOT NULL,
    description TEXT DEFAULT '',
    page        TEXT DEFAULT '',
    user_agent  TEXT DEFAULT '',
    status      TEXT DEFAULT 'open',
    admin_note  TEXT DEFAULT '',
    created_at  INTEGER DEFAULT (unixepoch()),
    resolved_at INTEGER DEFAULT NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE INDEX IF NOT EXISTS idx_site_reports_status ON site_reports(status);
  CREATE TABLE IF NOT EXISTS promotion_requests (
    id          TEXT PRIMARY KEY,
    summary_id  TEXT NOT NULL,
    author_id   TEXT NOT NULL,
    budget_egp  INTEGER DEFAULT 0,
    duration_days INTEGER DEFAULT 7,
    status      TEXT DEFAULT 'pending',
    notes       TEXT DEFAULT '',
    created_at  INTEGER DEFAULT (unixepoch()),
    approved_at INTEGER DEFAULT 0,
    expires_at  INTEGER DEFAULT 0,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id)  REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_summaries_author ON summaries(author_id);
  CREATE INDEX IF NOT EXISTS idx_summaries_approved ON summaries(approved);
  CREATE INDEX IF NOT EXISTS idx_summaries_country ON summaries(country);
  CREATE INDEX IF NOT EXISTS idx_summaries_subject ON summaries(subject);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  CREATE INDEX IF NOT EXISTS idx_ip_bans_ip ON ip_bans(ip);
  CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotion_requests(status);
`);

// Add ad_duration_seconds column if upgrading from older DB (safe to run multiple times)
try { db.exec(`ALTER TABLE summaries ADD COLUMN ad_duration_seconds INTEGER DEFAULT 10`); } catch {}
try { db.exec(`ALTER TABLE summaries ADD COLUMN watermarked INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE summaries ADD COLUMN translated_from TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE summaries ADD COLUMN banner_url TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN username TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN ban_expires_at INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN ban_type TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN profile_photo TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE notifications ADD COLUMN actor_id TEXT DEFAULT ''`); } catch {}

// Site reports table — idempotent migration
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_reports (
      id TEXT PRIMARY KEY, reporter_id TEXT DEFAULT NULL,
      reason TEXT NOT NULL, description TEXT DEFAULT '', page TEXT DEFAULT '',
      user_agent TEXT DEFAULT '', status TEXT DEFAULT 'open',
      admin_note TEXT DEFAULT '', created_at INTEGER DEFAULT (unixepoch()),
      resolved_at INTEGER DEFAULT NULL,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_site_reports_status ON site_reports(status);
  `);
} catch {}

// Comments tables — idempotent migration for existing DBs
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, summary_id TEXT NOT NULL, user_id TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL, body TEXT NOT NULL, likes INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0, is_deleted INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_comments_summary ON comments(summary_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
    CREATE TABLE IF NOT EXISTS comment_likes (
      user_id TEXT NOT NULL, comment_id TEXT NOT NULL,
      PRIMARY KEY (user_id, comment_id),
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);
} catch {}

// Activity log — every meaningful action on the site, forever
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id          TEXT PRIMARY KEY,
      user_id     TEXT,
      user_name   TEXT DEFAULT '',
      action      TEXT NOT NULL,
      entity_type TEXT DEFAULT '',
      entity_id   TEXT DEFAULT '',
      details     TEXT DEFAULT '',
      ip          TEXT DEFAULT '',
      created_at  INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_activity_user   ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
    CREATE INDEX IF NOT EXISTS idx_activity_time   ON activity_log(created_at DESC);
  `);
} catch {}
// Reports table migration
try {
  db.exec(`CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    summary_id  TEXT NOT NULL,
    reason      TEXT NOT NULL,
    description TEXT DEFAULT '',
    status      TEXT DEFAULT 'pending',
    admin_note  TEXT DEFAULT '',
    created_at  INTEGER DEFAULT (unixepoch()),
    resolved_at INTEGER DEFAULT 0,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_reports_status  ON reports(status);
  CREATE INDEX IF NOT EXISTS idx_reports_summary ON reports(summary_id);`);
} catch {}
// Tier settings — insert if not present (won't overwrite admin changes)
try {
  const upsert = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
  [['tier1_followers','0'],['tier1_share_percent','60'],['tier2_followers','1000'],
   ['tier2_share_percent','70'],['tier3_followers','10000'],['tier3_share_percent','80']
  ].forEach(([k,v]) => upsert.run(k,v));
} catch {}
// Create plagiarism_cases table if upgrading from older DB
try {
  db.exec(`CREATE TABLE IF NOT EXISTS plagiarism_cases (
    id            TEXT PRIMARY KEY,
    suspect_id    TEXT NOT NULL,
    original_id   TEXT NOT NULL,
    incoming_id   TEXT DEFAULT '',
    similarity    REAL NOT NULL,
    verdict       TEXT DEFAULT 'pending',
    watermark_hit INTEGER DEFAULT 0,
    watermark_username TEXT DEFAULT '',
    admin_note    TEXT DEFAULT '',
    ban_action    TEXT DEFAULT '',
    created_at    INTEGER DEFAULT (unixepoch()),
    resolved_at   INTEGER DEFAULT 0,
    FOREIGN KEY (suspect_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (original_id) REFERENCES summaries(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_plagiarism_suspect ON plagiarism_cases(suspect_id);
  CREATE INDEX IF NOT EXISTS idx_plagiarism_verdict ON plagiarism_cases(verdict);`);
} catch {}


// ── SEED DATA ────────────────────────────────────────────
// Uses INSERT OR IGNORE — existing rows are never overwritten.
// Runs on every startup. Admin can delete any of this data normally.
// Deleted rows come back on the next server restart.
function seed() {

  console.log('🌱 Seeding database...');

  const { v4: uuidv4 } = require('uuid');
  // Only hash if the user doesn't already exist — bcrypt is intentionally slow
  const hash = (id, p) => {
    const exists = db.prepare('SELECT id FROM users WHERE id=?').get(id);
    return exists ? null : bcrypt.hashSync(p, 10);
  };

  // Seed platform settings
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)');
  [
    ['min_likes_to_monetize',   '500'],
    ['min_views_to_monetize',   '2000'],
    ['platform_share_percent',  '25'],
    ['advertiser_share_percent','5'],
    ['base_cpm_egp',            '4'],
    // Tiered creator share by follower count
    ['tier1_followers',         '0'],
    ['tier1_share_percent',     '60'],
    ['tier2_followers',         '1000'],
    ['tier2_share_percent',     '70'],
    ['tier3_followers',         '10000'],
    ['tier3_share_percent',     '80'],
  ].forEach(([k,v]) => insertSetting.run(k,v));

  // Seed companies
  const companies = [
    { id: 'c1', name: 'Edraak', logo: '🎓', category: 'Education Tech', cpm: 4.2, description: 'Leading Arab e-learning platform' },
    { id: 'c2', name: 'Noon Academy', logo: '📚', category: 'EdTech', cpm: 3.8, description: 'Social learning platform' },
    { id: 'c3', name: 'Alef Education', logo: '🔤', category: 'Education', cpm: 5.1, description: 'Personalised learning' },
    { id: 'c4', name: 'Majid Al Futtaim', logo: '🛍️', category: 'Retail', cpm: 6.3, description: 'Leading retail & leisure' },
    { id: 'c5', name: 'Vodafone Egypt', logo: '📱', category: 'Telecom', cpm: 7.9, description: 'Telecom leader in Egypt' },
    { id: 'c6', name: 'Careem', logo: '🚗', category: 'Transport', cpm: 5.5, description: 'Ride-hailing super-app' },
    { id: 'c7', name: 'Khan Academy', logo: '🌐', category: 'Education', cpm: 3.2, description: 'Free world-class education' },
    { id: 'c8', name: 'Amazon', logo: '📦', category: 'E-Commerce', cpm: 8.1, description: 'Largest e-commerce' },
    { id: 'c9', name: 'Jabra', logo: '🎧', category: 'Electronics', cpm: 6.7, description: 'Professional audio' },
    { id: 'c10', name: 'Orange Egypt', logo: '🟠', category: 'Telecom', cpm: 7.2, description: 'Global telecom' },
    { id: 'c11', name: 'Casio', logo: '⌚', category: 'Electronics', cpm: 4.9, description: 'Iconic calculators & watches' },
    { id: 'c12', name: 'Stabilo', logo: '✏️', category: 'Stationery', cpm: 3.5, description: "Europe's top stationery" },
  ];

  const insertCompany = db.prepare('INSERT OR IGNORE INTO companies (id,name,logo,category,cpm,description) VALUES (?,?,?,?,?,?)');
  companies.forEach(c => insertCompany.run(c.id, c.name, c.logo, c.category, c.cpm, c.description));

  // Seed users — idempotent: only inserts rows that don't exist yet.
  // Passwords are only bcrypt-hashed for new users (intentionally slow).
  const insertUser = db.prepare(`INSERT OR IGNORE INTO users
    (id,name,username,email,password,role,user_type,country,school,grade,
     specialization,major,status,followers,uploads,
     has_membership,membership_price,membership_perks,interests)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  // Pre-hashed passwords — eliminates bcrypt.hashSync() blocking at startup.
  // These are real bcrypt cost-10 hashes. Verified compatible with bcryptjs.compare().
  const PRE_HASHED = {
    'admin123': '$2b$10$0hhjejVZRfVkkdCWYD1Qt./YGt1Doe8edNSRLsYTmiULG/mYaqE.u',
    'pass123':  '$2b$10$xV5wXy/6TxN9/AGuURtMDOIQWf2yuZUrUk4USU.YVnK.gTDDPu26m',
    'super123': '$2b$10$TSXwDLHDKpPEy5CZMabBbO8xoJumoHsSFeA1N6PBExKPnHyAfCUzG',
  };

  const seedUserDefs = [
    {id:'u1',    name:'Admin',          uname:'admin_mol5sat',     email:'admin@mol5sat.org',          pw:'admin123',role:'admin',     ut:'admin',    co:'Egypt',                                  sc:'',                      gr:'',                                              spec:'',                    mj:'',                    st:'active',fo:0,    up:0, hm:0,mp:0,  mk:'',                                                                            ints:'[]'},
    {id:'u_sv1', name:'Supervisor',     uname:'supervisor_mol5sat',email:'supervisor@mol5sat.org',      pw:'super123',role:'supervisor',ut:'admin',    co:'Egypt',                                  sc:'',                      gr:'',                                              spec:'',                    mj:'',                    st:'active',fo:0,    up:0, hm:0,mp:0,  mk:'',                                                                            ints:'[]'},
    {id:'u2',    name:'\u0623\u062d\u0645\u062f \u0627\u0644\u0633\u064a\u062f',  uname:'ahmed_said',        email:'ahmed@example.com',           pw:'pass123', role:'creator',  ut:'student',  co:'Egypt',                                  sc:'\u062d\u0643\u0648\u0645\u064a (Government)',gr:'\u0627\u0644\u0635\u0641 \u0627\u0644\u062b\u0627\u0646\u064a \u0627\u0644\u062b\u0627\u0646\u0648\u064a',spec:'',mj:'',st:'active',fo:4200, up:8, hm:0,mp:0,  mk:'',                                                                            ints:'["Physics","Mathematics"]'},
    {id:'u3',    name:'Sara K.',        uname:'sara_k',            email:'sara@example.com',            pw:'pass123', role:'creator',  ut:'student',  co:'International (IB / No Fixed Country)',  sc:'IB World School',       gr:'DP Year 1',                                     spec:'',                    mj:'',                    st:'active',fo:1800, up:3, hm:0,mp:0,  mk:'',                                                                            ints:'["Mathematics","Computer Science"]'},
    {id:'u4',    name:'\u0645\u0646\u0649 \u0637\u0627\u0647\u0631',   uname:'mona_t',            email:'mona@example.com',            pw:'pass123', role:'creator',  ut:'student',  co:'Egypt',                                  sc:'\u062d\u0643\u0648\u0645\u064a (Government)',gr:'\u0627\u0644\u0635\u0641 \u0627\u0644\u062b\u0627\u0644\u062b \u0627\u0644\u062b\u0627\u0646\u0648\u064a (\u0627\u0644\u062b\u0627\u0646\u0648\u064a\u0629 \u0627\u0644\u0639\u0627\u0645\u0629)',spec:'',mj:'',st:'active',fo:7100, up:12,hm:1,mp:29, mk:'Access to exclusive summaries + priority support + no-ads experience',  ints:'["Chemistry","Biology"]'},
    {id:'u5',    name:'Lim Wei',        uname:'lim_wei',           email:'lim@example.com',             pw:'pass123', role:'student',  ut:'student',  co:'Malaysia',                               sc:'Sekolah Kebangsaan',    gr:'Form 4',                                        spec:'',                    mj:'',                    st:'active',fo:230,  up:1, hm:0,mp:0,  mk:'',                                                                            ints:'["Biology","Chemistry"]'},
    {id:'u6',    name:'\u064a\u0648\u0633\u0641 \u0627\u0644\u063a\u0632\u0627\u0644\u064a',uname:'yousef_g',          email:'yousef@example.com',          pw:'pass123', role:'creator',  ut:'student',  co:'Egypt',                                  sc:'\u062d\u0643\u0648\u0645\u064a (Government)',gr:'\u0627\u0644\u0635\u0641 \u0627\u0644\u062b\u0627\u0644\u062b \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u064a',spec:'',mj:'',st:'active',fo:12000,up:22,hm:1,mp:49, mk:'\u062d\u0635\u0631\u064a: \u0645\u0644\u062e\u0635\u0627\u062a \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631 + \u062c\u0644\u0633\u0627\u062a \u0645\u0631\u0627\u062c\u0639\u0629 \u0634\u0647\u0631\u064a\u0629 + \u0634\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u062a\u0631\u0643',ints:'["Arabic","History"]'},
    {id:'u7',    name:'Dr. Karim N.',   uname:'karim_n',           email:'karim@example.com',           pw:'pass123', role:'creator',  ut:'colleague',co:'Egypt',                                  sc:'',                      gr:'',                                              spec:'Computer Science & IT',mj:'Software Engineering',st:'active',fo:3400, up:6, hm:0,mp:0,  mk:'',                                                                            ints:'["Physics","Mathematics"]'},
    {id:'u8',    name:'\u0646\u0648\u0631 \u0627\u0644\u062f\u064a\u0646',  uname:'nour_d',            email:'nour@example.com',            pw:'pass123', role:'student',  ut:'student',  co:'Egypt',                                  sc:'\u062d\u0643\u0648\u0645\u064a (Government)',gr:'\u0627\u0644\u0635\u0641 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u062b\u0627\u0646\u0648\u064a',spec:'',mj:'',st:'active',fo:890,  up:2, hm:0,mp:0,  mk:'',                                                                            ints:'["Mathematics","Physics"]'},
    {id:'u9',    name:'Alex M.',        uname:'alex_m',            email:'alex@example.com',            pw:'pass123', role:'creator',  ut:'student',  co:'United States',                          sc:'Public School',         gr:'Grade 12 (Senior)',                             spec:'',                    mj:'',                    st:'banned',fo:640,  up:4, hm:0,mp:0,  mk:'',                                                                            ints:'["Chemistry","Biology"]'},
    {id:'u10',   name:'\u0647\u0646\u0627 \u0645\u062d\u0645\u0648\u062f',  uname:'hana_m',            email:'hana@example.com',            pw:'pass123', role:'creator',  ut:'student',  co:'Egypt',                                  sc:'\u0644\u063a\u0627\u062a (Language School)',gr:'\u0627\u0644\u0635\u0641 \u0627\u0644\u062b\u0627\u0646\u064a \u0627\u0644\u062b\u0627\u0646\u0648\u064a',spec:'',mj:'',st:'active',fo:5300, up:9, hm:1,mp:19, mk:'Early access to new summaries + no ads',                                ints:'["Mathematics","Physics"]'},
  ];
  seedUserDefs.forEach(u => {
    if (db.prepare('SELECT id FROM users WHERE id=?').get(u.id)) return; // skip if exists
    const pw = PRE_HASHED[u.pw] || bcrypt.hashSync(u.pw, 10); // pre-hashed = instant; fallback = slow
    insertUser.run(u.id,u.name,u.uname,u.email,pw,u.role,u.ut,u.co,u.sc,u.gr,u.spec,u.mj,u.st,u.fo,u.up,u.hm,u.mp,u.mk,u.ints);
  });

  // Seed follows
  const insertFollow = db.prepare('INSERT OR IGNORE INTO follows (follower_id,following_id) VALUES (?,?)');
  [['u2','u4'],['u2','u6'],['u6','u2'],['u8','u2'],['u8','u4'],['u8','u6'],['u3','u7']].forEach(([a,b]) => {
    insertFollow.run(a,b);
  });

  // Seed summaries — INSERT OR IGNORE so existing rows are never overwritten.
  // Admin can delete these normally just like any other summary.
  // If deleted, they come back the next time the server restarts.
  const insertSummary = db.prepare(`INSERT OR IGNORE INTO summaries
    (id,title,subject,grade,country,school,lang,author_id,content,pages,views,likes,
     is_paid,is_promoted,is_sponsored,ad_every,tags,approved,audience,membership_required)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const summaries = [
    ['m1',  'ملخص الميكانيكا الكلاسيكية — الصف الثاني الثانوي', 'Physics',  'الصف الثاني الثانوي',                          'Egypt',                                     'حكومي (Government)',      'ar', 'u2',  '<h2>الميكانيكا الكلاسيكية</h2><p>تشمل دراسة حركة الأجسام وقوانين نيوتن الثلاثة للحركة.</p><h3>قانون نيوتن الأول</h3><p>يبقى الجسم في حالته من السكون أو الحركة المنتظمة ما لم تؤثر عليه قوة خارجية.</p><h3>قانون نيوتن الثاني</h3><p>القوة = الكتلة × التسارع (F = ma)</p>',                                                                                                                                                                                         24, 14200, 1830, 0,0,0,0, '["physics","mechanics","فيزياء","ميكانيكا"]', 1, 'students',  0],
    ['m2',  'Calculus Made Simple — DP Year 1 IB',              'Mathematics','DP Year 1',                                    'International (IB / No Fixed Country)',      'IB World School',         'en', 'u3',  "<h2>Differential Calculus</h2><p>Calculus is the mathematical study of change.</p><h3>The Derivative</h3><p>f'(x) = lim(h→0) [f(x+h) - f(x)] / h</p><h3>Power Rule</h3><p>d/dx(x^n) = nx^(n-1)</p>",                                                                                                                                                                      18,  8900, 1120, 1,1,0,5, '["calculus","IB","math","تفاضل"]',           1, 'students',  0],
    ['m3',  'الكيمياء العضوية — الصف الثالث الثانوي العام',    'Chemistry', 'الصف الثالث الثانوي (الثانوية العامة)',         'Egypt',                                     'حكومي (Government)',      'ar', 'u4',  '<h2>الكيمياء العضوية</h2><p>الكيمياء العضوية هي فرع الكيمياء الذي يدرس المركبات الكربونية.</p><h3>الهيدروكربونات</h3><p>هي مركبات تتكون من الكربون والهيدروجين فقط.</p>',                                                                                                                                                                                                32, 21000, 3400, 1,0,1,6, '["chemistry","كيمياء","عضوية"]',             1, 'students',  1],
    ['m4',  'Biology Cell Division — IGCSE Form 4',             'Biology',   'Form 4',                                       'Malaysia',                                  'Sekolah Kebangsaan',      'en', 'u5',  '<h2>Cell Division</h2><p>Cell division is the process by which a parent cell divides into two daughter cells.</p><h3>Mitosis</h3><p>Four phases: Prophase, Metaphase, Anaphase, Telophase.</p>',                                                                                                                                                                            14,  6700,  890, 0,0,0,0, '["biology","IGCSE","cells"]',               1, 'students',  0],
    ['m5',  'ملخص النحو والصرف — الصف الثالث الإعدادي',        'Arabic',    'الصف الثالث الإعدادي',                         'Egypt',                                     'حكومي (Government)',      'ar', 'u6',  '<h2>النحو والصرف</h2><p>النحو هو علم يُعرف به أحوال الكلمات العربية من حيث الإعراب والبناء.</p><h3>المبتدأ والخبر</h3><p>المبتدأ اسم مرفوع في أول الجملة الاسمية.</p>',                                                                                                                                                                                                  40, 31000, 5200, 1,1,1,4, '["arabic","نحو","صرف","قواعد"]',            1, 'students',  0],
    ['m6',  'Quantum Mechanics — University Level',             'Physics',   'University',                                   'International (IB / No Fixed Country)',      'Other',                   'en', 'u7',  '<h2>Quantum Mechanics</h2><p>Quantum mechanics describes the behavior of matter and energy at atomic and subatomic scales.</p><h3>Wave-Particle Duality</h3><p>Particles exhibit both wave and particle properties.</p>',                                                                                                                                                  28,  9800, 1540, 1,0,0,7, '["quantum","physics"]',                     1, 'colleagues', 0],
    ['m7',  'ملخص الجبر الكامل — الصف الأول الثانوي',          'Mathematics','الصف الأول الثانوي',                          'Egypt',                                     'حكومي (Government)',      'ar', 'u2',  '<h2>الجبر</h2><p>الجبر هو فرع من فروع الرياضيات يتعامل مع الرموز والقواعد التي تحكم العمليات عليها.</p><h3>المعادلات الخطية</h3><p>المعادلة الخطية معادلة أعلى أس فيها 1.</p>',                                                                                                                                                                                        22, 18500, 2800, 0,0,0,0, '["math","algebra","رياضيات","جبر"]',        1, 'students',  0],
    ['m9',  'ملخص التفاضل والتكامل — الصف الثاني الثانوي',     'Mathematics','الصف الثاني الثانوي',                         'Egypt',                                     'لغات (Language School)',  'ar', 'u10', '<h2>التفاضل والتكامل</h2><p>التفاضل يدرس معدلات التغيير، والتكامل يدرس التراكم.</p><h3>المشتقات الأساسية</h3><p>مشتقة xⁿ = n·xⁿ⁻¹</p>',                                                                                                                                                                                                                              20, 12400, 1970, 1,0,0,6, '["calculus","رياضيات","تفاضل","تكامل"]',   1, 'students',  0],
    ['m11', 'فيزياء الكهرباء والمغناطيسية — الصف الثالث الإعدادي','Physics', 'الصف الثالث الإعدادي',                        'Egypt',                                     'حكومي (Government)',      'ar', 'u2',  '<h2>الكهرباء والمغناطيسية</h2><p>مجالان مترابطان من فيزياء الكلاسيكية.</p><h3>قانون أوم</h3><p>V = I × R حيث V هو الجهد، I هو التيار، R هو المقاومة.</p>',                                                                                                                                                                                                           15,  9300, 1340, 0,0,0,0, '["physics","electricity","فيزياء","كهرباء"]',1,'students',  0],

    // ── Expanded coverage — spans primary through University in Egypt,
    // plus UK/France/IB, so the Science Feed's grade-proximity ordering,
    // interest matching, and the higher-grades/University filter all have
    // a realistic, varied pool to actually show their effect on.
    ['m12', 'ملخص الحروف الهجائية — الصف الأول الابتدائي', 'Arabic', 'الصف الأول الابتدائي', 'Egypt', 'حكومي (Government)', 'ar', 'u8', '<h2>الحروف الهجائية</h2><p>اللغة العربية تتكون من ثمانية وعشرين حرفًا، لكل حرف شكل ونطق مختلف حسب موضعه في الكلمة.</p><h3>أشكال الحرف</h3><p>لكل حرف شكل في أول الكلمة، ووسطها، وآخرها، وحين يكون منفردًا.</p>', 6, 1850, 210, 0, 0, 0, 0, '["arabic","حروف","عربي"]', 1, 'students', 0],
    ['m13', 'ملخص الكسور — الصف الرابع الابتدائي', 'Mathematics', 'الصف الرابع الابتدائي', 'Egypt', 'حكومي (Government)', 'ar', 'u10', '<h2>الكسور</h2><p>الكسر يمثل جزءًا من كل، ويتكون من بسط ومقام.</p><h3>جمع الكسور</h3><p>لجمع كسرين متشابهي المقام، نجمع البسطين ونحتفظ بالمقام كما هو.</p>', 8, 2400, 305, 0, 0, 0, 0, '["math","fractions","رياضيات","كسور"]', 1, 'students', 0],
    ['m14', 'ملخص جسم الإنسان — الصف السادس الابتدائي', 'Biology', 'الصف السادس الابتدائي', 'Egypt', 'حكومي (Government)', 'ar', 'u4', '<h2>أجهزة جسم الإنسان</h2><p>يتكون جسم الإنسان من عدة أجهزة رئيسية تعمل معًا.</p><h3>الجهاز الهضمي</h3><p>يبدأ الهضم من الفم وينتهي بامتصاص الغذاء في الأمعاء الدقيقة.</p>', 10, 3100, 420, 0, 0, 0, 0, '["biology","أحياء","جسم الإنسان"]', 1, 'students', 0],
    ['m15', 'English Grammar Basics — Prep Year 1', 'English', 'الصف الأول الإعدادي', 'Egypt', 'حكومي (Government)', 'en', 'u2', '<h2>Parts of Speech</h2><p>English words are grouped into categories such as nouns, verbs, adjectives, and adverbs.</p><h3>Nouns and Verbs</h3><p>A noun names a person, place, or thing; a verb describes an action or state.</p>', 9, 2650, 300, 0, 0, 0, 0, '["english","grammar"]', 1, 'students', 0],
    ['m16', 'ملخص الهندسة — الصف الثاني الإعدادي', 'Mathematics', 'الصف الثاني الإعدادي', 'Egypt', 'حكومي (Government)', 'ar', 'u10', '<h2>الهندسة المستوية</h2><p>تدرس الهندسة الأشكال والمساحات والزوايا.</p><h3>مساحة المثلث</h3><p>المساحة = نصف حاصل ضرب القاعدة في الارتفاع.</p>', 11, 4100, 560, 0, 0, 0, 0, '["math","geometry","رياضيات","هندسة"]', 1, 'students', 0],
    ['m17', 'ملخص تاريخ مصر القديمة — الصف الثاني الإعدادي', 'History', 'الصف الثاني الإعدادي', 'Egypt', 'حكومي (Government)', 'ar', 'u6', '<h2>مصر الفرعونية</h2><p>قامت حضارة مصر القديمة على ضفاف نهر النيل منذ آلاف السنين.</p><h3>الأسرات الحاكمة</h3><p>حكمت مصر القديمة عدة أسرات متعاقبة شهدت بناء الأهرامات والمعابد.</p>', 13, 3600, 480, 0, 1, 0, 5, '["history","تاريخ","مصر"]', 1, 'students', 0],
    ['m18', 'ملخص جغرافيا مصر — الصف الثالث الإعدادي', 'Geography', 'الصف الثالث الإعدادي', 'Egypt', 'حكومي (Government)', 'ar', 'u8', '<h2>موقع مصر الجغرافي</h2><p>تقع مصر في الركن الشمالي الشرقي من قارة أفريقيا.</p><h3>نهر النيل</h3><p>يعتبر نهر النيل شريان الحياة الرئيسي، ويجري من الجنوب إلى الشمال.</p>', 12, 2900, 340, 0, 0, 0, 0, '["geography","جغرافيا","مصر"]', 1, 'students', 0],
    ['m19', 'ملخص الجدول الدوري — الصف الأول الثانوي', 'Chemistry', 'الصف الأول الثانوي', 'Egypt', 'حكومي (Government)', 'ar', 'u4', '<h2>الجدول الدوري للعناصر</h2><p>يرتب الجدول الدوري العناصر الكيميائية حسب العدد الذري.</p><h3>المجموعات والدورات</h3><p>العناصر في نفس المجموعة تتشابه في خواصها الكيميائية.</p>', 16, 6200, 810, 1, 0, 0, 6, '["chemistry","كيمياء","الجدول الدوري"]', 1, 'students', 0],
    ['m20', 'ملخص الخلية ومكوناتها — الصف الأول الثانوي', 'Biology', 'الصف الأول الثانوي', 'Egypt', 'حكومي (Government)', 'ar', 'u5', '<h2>الخلية</h2><p>الخلية هي وحدة البناء الأساسية لجميع الكائنات الحية.</p><h3>النواة والسيتوبلازم</h3><p>تحتوي النواة على المادة الوراثية، بينما يحيط بها السيتوبلازم الذي يضم العضيات.</p>', 14, 5100, 690, 0, 0, 0, 0, '["biology","أحياء","الخلية"]', 1, 'students', 0],
    ['m21', 'مقدمة في الكيمياء العضوية — الصف الثاني الثانوي', 'Chemistry', 'الصف الثاني الثانوي', 'Egypt', 'حكومي (Government)', 'ar', 'u4', '<h2>الكيمياء العضوية</h2><p>تختص الكيمياء العضوية بدراسة مركبات الكربون.</p><h3>الألكانات</h3><p>الألكانات هي أبسط الهيدروكربونات، وتحتوي فقط على روابط أحادية.</p>', 18, 7300, 950, 1, 0, 1, 6, '["chemistry","كيمياء","عضوية"]', 1, 'students', 0],
    ['m22', 'أساسيات البرمجة — الصف الثاني الثانوي', 'Computer Science', 'الصف الثاني الثانوي', 'Egypt', 'لغات (Language School)', 'ar', 'u7', '<h2>مقدمة في البرمجة</h2><p>البرمجة هي عملية كتابة تعليمات يفهمها الحاسوب لتنفيذ مهمة معينة.</p><h3>المتغيرات</h3><p>المتغير هو مكان لتخزين قيمة يمكن استخدامها وتغييرها أثناء تشغيل البرنامج.</p>', 15, 8900, 1200, 1, 1, 0, 5, '["computer science","برمجة","حاسب"]', 1, 'students', 0],
    ['m23', 'ملخص الفيزياء الحديثة — الصف الثالث الثانوي', 'Physics', 'الصف الثالث الثانوي (الثانوية العامة)', 'Egypt', 'حكومي (Government)', 'ar', 'u2', '<h2>الفيزياء الحديثة</h2><p>تشمل الفيزياء الحديثة ميكانيكا الكم والنسبية.</p><h3>ثنائية الموجة والجسيم</h3><p>يمكن للجسيمات دون الذرية أن تسلك سلوك الموجات والجسيمات معًا.</p>', 20, 9600, 1400, 1, 0, 0, 6, '["physics","فيزياء","حديثة"]', 1, 'students', 0],
    ['m24', 'ملخص علم الوراثة — الصف الثالث الثانوي', 'Biology', 'الصف الثالث الثانوي (الثانوية العامة)', 'Egypt', 'حكومي (Government)', 'ar', 'u4', '<h2>علم الوراثة</h2><p>يدرس علم الوراثة كيفية انتقال الصفات من الآباء إلى الأبناء.</p><h3>الجينات والكروموسومات</h3><p>تحمل الكروموسومات الجينات المسؤولة عن الصفات الوراثية.</p>', 19, 7800, 1050, 1, 0, 0, 6, '["biology","أحياء","وراثة"]', 1, 'students', 0],
    ['m25', 'هياكل البيانات — جامعي', 'Computer Science', 'University', 'Egypt', 'University', 'ar', 'u7', '<h2>هياكل البيانات</h2><p>هياكل البيانات هي طرق لتنظيم وتخزين البيانات لتسهيل الوصول إليها ومعالجتها.</p><h3>القوائم المترابطة</h3><p>القائمة المترابطة تخزن العناصر في عقد متصلة، كل عقدة تشير إلى التالية.</p>', 26, 5400, 780, 1, 1, 0, 7, '["computer science","برمجة","جامعي"]', 1, 'students', 0],
    ['m26', 'مبادئ الاقتصاد — جامعي', 'Economics', 'University', 'Egypt', 'University', 'ar', 'u7', '<h2>مبادئ الاقتصاد</h2><p>يدرس علم الاقتصاد كيفية تخصيص الموارد المحدودة لتلبية الاحتياجات.</p><h3>العرض والطلب</h3><p>يحدد تفاعل العرض والطلب السعر التوازني للسلعة في السوق.</p>', 22, 3900, 520, 1, 0, 0, 6, '["economics","اقتصاد","جامعي"]', 1, 'students', 0],
    ['m27', 'IB Physics HL — DP Year 2', 'Physics', 'DP Year 2', 'International (IB / No Fixed Country)', 'IB World School', 'en', 'u3', '<h2>Electromagnetic Induction</h2><p>A changing magnetic field induces an electromotive force in a nearby conductor.</p><h3>Faraday\'s Law</h3><p>The induced EMF is proportional to the rate of change of magnetic flux.</p>', 21, 4300, 610, 1, 0, 0, 6, '["physics","IB","electromagnetism"]', 1, 'students', 0],
    ['m28', 'GCSE Chemistry — Atomic Structure', 'Chemistry', 'Year 10 (GCSE)', 'United Kingdom', 'State School (Academy)', 'en', 'u5', '<h2>Atomic Structure</h2><p>Atoms are made up of protons, neutrons, and electrons.</p><h3>Isotopes</h3><p>Isotopes are atoms of the same element with different numbers of neutrons.</p>', 12, 3300, 410, 0, 0, 0, 0, '["chemistry","GCSE","atoms"]', 1, 'students', 0],
    ['m29', 'A-Level Biology — Cell Structure', 'Biology', 'Year 12 (A-Level)', 'United Kingdom', 'Grammar School', 'en', 'u5', '<h2>Cell Structure</h2><p>Eukaryotic cells contain a nucleus and membrane-bound organelles.</p><h3>The Cell Membrane</h3><p>The cell membrane controls what enters and leaves the cell via selective permeability.</p>', 17, 4700, 630, 1, 0, 0, 6, '["biology","A-Level","cells"]', 1, 'students', 0],
    ['m30', 'Analyse et Calcul — Terminale', 'Mathematics', 'Terminale', 'France', 'Other', 'fr', 'u2', '<h2>Les Limites</h2><p>La limite d\'une fonction decrit son comportement lorsque la variable approche d\'une valeur donnee.</p><h3>Derivee</h3><p>La derivee mesure le taux de variation instantane d\'une fonction.</p>', 19, 2100, 260, 1, 0, 0, 6, '["math","calculus","terminale"]', 1, 'students', 0],
    ['m31', 'ملخص الإحصاء الوصفي — الصف الثالث الثانوي', 'Statistics', 'الصف الثالث الثانوي (الثانوية العامة)', 'Egypt', 'حكومي (Government)', 'ar', 'u8', '<h2>الإحصاء الوصفي</h2><p>يهتم الإحصاء الوصفي بتلخيص البيانات وتنظيمها.</p><h3>المتوسط الحسابي</h3><p>يُحسب المتوسط الحسابي بجمع القيم وقسمتها على عددها.</p>', 13, 2950, 380, 0, 0, 0, 0, '["statistics","إحصاء","رياضيات"]', 1, 'students', 0],
  ];
  summaries.forEach(s => insertSummary.run(...s));

  // Seed summary_companies
  const insertSC = db.prepare('INSERT OR IGNORE INTO summary_companies (summary_id,company_id) VALUES (?,?)');
  [['m2','c11'],['m3','c12'],['m3','c1'],['m5','c2'],['m6','c9'],['m9','c5']].forEach(([sid,cid]) => insertSC.run(sid,cid));

  console.log('✅ Database seeded successfully');
}

// seed() is called from server.js AFTER app.listen() so the port binds first
module.exports = { db, seed };
