// ═══════════════════════════════════════════════════════════════
//  MOL5SAT — EMAIL UTILITY
//  Uses nodemailer if SMTP env vars are set, otherwise logs to console.
//  Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env
// ═══════════════════════════════════════════════════════════════
const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_HOST) return null; // No SMTP configured
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
  return _transporter;
}

const FROM = process.env.SMTP_FROM || 'Mol5sat <hassanfathallah555@gmail.com>';
const SITE = process.env.SITE_URL || 'https://mol5sat.org';

// ── Template Helpers ──────────────────────────────────────────
function wrapEmail(title, body) {
  return `<!DOCTYPE html><html lang="ar" dir="ltr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;padding:0;background:#0a0700;font-family:'Helvetica Neue',Arial,sans-serif;color:#f5e8c0}
  .wrap{max-width:580px;margin:0 auto;padding:32px 20px}
  .logo{text-align:center;margin-bottom:32px}
  .logo-text{font-size:28px;font-weight:900;background:linear-gradient(130deg,#FFB800,#E85D04);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1px}
  .logo-sub{font-size:11px;color:#9a8055;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
  .card{background:#191200;border:1px solid rgba(255,184,0,.12);border-radius:18px;padding:32px;margin-bottom:20px}
  .card h1{font-size:22px;font-weight:800;margin:0 0 12px;color:#FFB800}
  .card p{font-size:14px;line-height:1.8;color:#c8aa80;margin:0 0 16px}
  .card p b{color:#f5e8c0}
  .card .reason-box{background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.2);border-radius:10px;padding:14px 18px;margin:18px 0;font-size:13px;color:#FF6B6B;font-weight:700;line-height:1.6}
  .card .duration-box{background:rgba(255,184,0,.08);border:1px solid rgba(255,184,0,.18);border-radius:10px;padding:14px 18px;margin:18px 0;font-size:13px;color:#FFB800;font-weight:700}
  .footer{text-align:center;font-size:11px;color:#5a4a28;margin-top:20px;line-height:1.8}
  .footer a{color:#9a8055}
</style>
</head>
<body><div class="wrap">
  <div class="logo">
    <div class="logo-text">Mol5sat · ملخصات</div>
    <div class="logo-sub">Educational Summaries Platform</div>
  </div>
  <div class="card">${body}</div>
  <div class="footer">
    This is an automated message from <a href="${SITE}">${SITE}</a><br>
    © ${new Date().getFullYear()} Mol5sat — All rights reserved
  </div>
</div></body></html>`;
}

// ── Send Functions ────────────────────────────────────────────

/**
 * Sends a ban notification email to the banned user.
 * Falls back to console.log if SMTP not configured.
 */
async function sendBanEmail({ to, name, reason, duration, banType }) {
  const durationText = banType === 'permanent'
    ? 'permanently'
    : duration === 1 ? '1 day' : `${duration} days`;

  const subject = `Your Mol5sat account has been ${banType === 'permanent' ? 'permanently banned' : 'suspended'}`;

  const body = `
    <h1>🚫 Account ${banType === 'permanent' ? 'Banned' : 'Suspended'}</h1>
    <p>Hi <b>${name}</b>,</p>
    <p>Your Mol5sat account has been <b>${banType === 'permanent' ? 'permanently banned' : `suspended for ${durationText}`}</b> due to a violation of our platform rules.</p>
    <div class="reason-box">📋 Reason:<br><br>${reason || 'Violation of platform community guidelines.'}</div>
    ${banType !== 'permanent' ? `<div class="duration-box">⏱ Duration: ${durationText}</div>` : ''}
    <p>If you believe this is a mistake, you may contact our support team by replying to this email.</p>
    <p style="color:#5a4a28;font-size:12px">While suspended, you cannot log in to your account. Any active sessions have been terminated.</p>`;

  const html = wrapEmail(subject, body);

  const transporter = getTransporter();
  if (!transporter) {
    // No SMTP — log for admin visibility
    console.log(`\n[EMAIL — BAN] To: ${to}\nSubject: ${subject}\nName: ${name}\nReason: ${reason}\nDuration: ${durationText}\n`);
    return { sent: false, reason: 'No SMTP configured. Set SMTP_HOST in .env to enable email sending.' };
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    return { sent: false, reason: err.message };
  }
}

/**
 * Generic email sender (for future use: welcome, report outcome, etc.)
 */
async function sendEmail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    return { sent: false };
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendBanEmail, sendEmail, wrapEmail };
