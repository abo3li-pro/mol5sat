const { db } = require('../db');

function ipBanMiddleware(req, res, next) {
  // Get real IP (works behind proxies/nginx)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket.remoteAddress
    || '0.0.0.0';

  req.clientIp = ip;

  // Skip check for admin routes so admin can still manage bans
  // Note: on a subrouter, req.path is relative (e.g. "/ip-bans"), but
  // req.originalUrl always contains the full path
  if (req.originalUrl.startsWith('/api/admin') && req.headers.authorization) {
    return next();
  }

  const now = Math.floor(Date.now() / 1000);
  const ban = db.prepare(`
    SELECT * FROM ip_bans 
    WHERE ip = ? AND (permanent = 1 OR expires_at > ?)
    ORDER BY banned_at DESC LIMIT 1
  `).get(ip, now);

  if (ban) {
    const msg = ban.permanent
      ? 'Your access has been permanently banned.'
      : `Your access is banned until ${new Date(ban.expires_at * 1000).toLocaleString()}.`;
    return res.status(403).json({
      error: 'banned',
      message: msg,
      reason: ban.reason || 'Violation of platform rules',
      expires_at: ban.expires_at,
      permanent: !!ban.permanent
    });
  }

  next();
}

module.exports = ipBanMiddleware;
