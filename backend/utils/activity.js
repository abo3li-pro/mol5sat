// ── ACTIVITY LOGGER ───────────────────────────────────────
// Logs every meaningful user/admin action to activity_log table.
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

/**
 * log({ userId, userName, action, entityType, entityId, details, ip })
 * action examples: 'register', 'login', 'upload_summary', 'ban_user',
 *   'unban_user', 'save_summary', 'follow', 'unfollow', 'like_summary',
 *   'approve_summary', 'decline_summary', 'change_settings', 'change_password',
 *   'admin_login', 'delete_summary', 'report_summary', 'promote_summary'
 */
function log({ userId = null, userName = '', action, entityType = '', entityId = '', details = '', ip = '' }) {
  try {
    db.prepare(`INSERT INTO activity_log (id,user_id,user_name,action,entity_type,entity_id,details,ip)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      'al_' + uuidv4().replace(/-/g, '').slice(0, 12),
      userId || null, userName, action,
      entityType, entityId,
      typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ip || ''
    );
  } catch (e) {
    // Never crash the request if logging fails
    console.warn('[activity] log failed:', e.message);
  }
}

/**
 * Express middleware factory — auto-logs based on method + route pattern.
 * Use as: router.post('/register', activityMiddleware('register', 'user'), handler)
 */
function activityMiddleware(action, entityType = '') {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      // Only log on success (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const u = req.user;
        const entityId = data?.id || req.params?.id || '';
        const userName = u?.name || data?.user?.name || '';
        log({
          userId: u?.id || data?.user?.id || null,
          userName,
          action,
          entityType,
          entityId,
          ip: req.ip || req.clientIp || '',
        });
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { log, activityMiddleware };

/**
 * notifyAdmins(text, opts)
 * Sends a notification to every active admin account, looked up by role
 * rather than a hardcoded user ID — so it keeps working correctly even if
 * the original seed admin account is ever renamed, deleted, or demoted,
 * or if more admins are added later. Wrapped in try/catch per-admin so one
 * bad row never blocks notifying the others, and the whole thing never
 * throws back into the calling route (matches log()'s fail-safe style).
 */
function notifyAdmins(text, { summaryId = '', actorId = '' } = {}) {
  try {
    const admins = db.prepare(`SELECT id FROM users WHERE role='admin' AND status='active'`).all();
    admins.forEach(a => {
      try {
        db.prepare('INSERT INTO notifications (id,user_id,text,summary_id,actor_id) VALUES (?,?,?,?,?)').run(
          'n_' + uuidv4().replace(/-/g, '').slice(0, 10), a.id, text, summaryId, actorId
        );
      } catch (e) {
        console.warn('[notifyAdmins] failed for admin', a.id, ':', e.message);
      }
    });
  } catch (e) {
    console.warn('[notifyAdmins] admin lookup failed:', e.message);
  }
}

module.exports.notifyAdmins = notifyAdmins;
