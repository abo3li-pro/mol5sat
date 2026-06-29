// ═══════════════════════════════════════════════════════
//  MOL5SAT — SHARED EARNINGS CALCULATION
//  Single source of truth for "how much does a creator earn
//  from a summary" — used by both routes/earnings.js (the
//  creator-facing dashboard) and routes/wallet.js (the actual
//  withdrawable balance). These used to be two independent
//  copies of the same formula that had drifted apart: earnings.js
//  used a follower-count-based tiered share, wallet.js used a
//  flat rate, so a creator's "available to withdraw" balance
//  could genuinely differ from what their Earnings page showed
//  them for the exact same summaries.
// ═══════════════════════════════════════════════════════
'use strict';

const { db } = require('../db');

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row ? parseFloat(row.value) : fallback;
}

/**
 * Returns the tiered creator share % based on follower count.
 * Tiers are configurable in platform settings.
 */
function getTieredCreatorShare(followers) {
  const t3Followers = getSetting('tier3_followers', 10000);
  const t2Followers = getSetting('tier2_followers', 1000);
  const t3Share     = getSetting('tier3_share_percent', 80);
  const t2Share     = getSetting('tier2_share_percent', 70);
  const t1Share     = getSetting('tier1_share_percent', 60);

  if (followers >= t3Followers) return { share: t3Share, tier: 3, label: `Tier 3 (${followers}+ followers)` };
  if (followers >= t2Followers) return { share: t2Share, tier: 2, label: `Tier 2 (${followers}+ followers)` };
  return { share: t1Share, tier: 1, label: `Tier 1 (${followers}+ followers)` };
}

/**
 * Calculates earnings for a single summary.
 * Returns: { eligible, reason, egp, pending_egp, views, likes, avg_cpm, creator_share_percent, tier, tier_label }
 */
function calcEarnings(summary) {
  const minViews  = getSetting('min_views_to_monetize', 2000);
  const minLikes  = getSetting('min_likes_to_monetize', 500);
  const baseCpm   = getSetting('base_cpm_egp', 4);

  if (!summary.is_paid) return { eligible: false, reason: 'Free summary — no ads', egp: 0, pending_egp: 0 };

  const meetsThreshold = summary.views >= minViews || summary.likes >= minLikes;

  // Get author follower count for tiered share
  const author = db.prepare('SELECT followers FROM users WHERE id=?').get(summary.author_id);
  const followers = author?.followers || 0;
  const tierInfo = getTieredCreatorShare(followers);
  const creatorPc = tierInfo.share;

  // Get average CPM of attached companies
  const companies = db.prepare(`SELECT c.cpm FROM companies c
    JOIN summary_companies sc ON c.id=sc.company_id
    WHERE sc.summary_id=?`).all(summary.id);

  const avgCpm = companies.length
    ? companies.reduce((s,c) => s + (c.cpm || baseCpm), 0) / companies.length
    : baseCpm;

  // Earnings = (views / 1000) × avg_cpm_egp × creator_share
  const gross = (summary.views / 1000) * avgCpm;
  const creatorEgp = parseFloat((gross * (creatorPc / 100)).toFixed(2));

  return {
    eligible: meetsThreshold,
    reason: meetsThreshold ? 'Earning' : `Need ${minViews} views or ${minLikes} likes (currently ${summary.views}v / ${summary.likes}l)`,
    egp: meetsThreshold ? creatorEgp : 0,
    pending_egp: meetsThreshold ? 0 : creatorEgp,
    views: summary.views,
    likes: summary.likes,
    avg_cpm: avgCpm,
    creator_share_percent: creatorPc,
    tier: tierInfo.tier,
    tier_label: tierInfo.label,
  };
}

/**
 * Calculates a creator's total available-to-withdraw and pending balance
 * across all their paid, approved summaries — used by the wallet routes.
 * Uses the exact same per-summary calcEarnings() as the Earnings dashboard,
 * so the two pages can never disagree on the numbers again.
 */
function getEarningsBalance(userId) {
  const summaries = db.prepare('SELECT * FROM summaries WHERE author_id=? AND approved=1 AND is_paid=1').all(userId);
  let available = 0, pending = 0;

  summaries.forEach(s => {
    const e = calcEarnings(s);
    available += e.egp;
    pending   += e.pending_egp;
  });

  // Subtract already-paid withdrawals
  const paid = db.prepare(`SELECT COALESCE(SUM(amount_egp),0) as t FROM withdrawal_requests WHERE user_id=? AND status IN ('approved','paid')`).get(userId);
  available = Math.max(0, parseFloat((available - paid.t).toFixed(2)));

  return { available, pending: parseFloat(pending.toFixed(2)) };
}

module.exports = { getSetting, getTieredCreatorShare, calcEarnings, getEarningsBalance };
