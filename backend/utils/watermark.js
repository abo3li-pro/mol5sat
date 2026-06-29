// ═══════════════════════════════════════════════════════════════════
//  MOL5SAT — INVISIBLE UNICODE WATERMARK + TEXT SIMILARITY ENGINE
//  Uses Zero-Width Characters (ZWC) steganography in Arabic/English text
// ═══════════════════════════════════════════════════════════════════

// ── Zero-Width Characters ─────────────────────────────────────────
const ZWS  = '\u200B'; // Zero-Width Space      → bit 0
const ZWNJ = '\u200C'; // Zero-Width Non-Joiner → bit 1
const ZWJ  = '\u200D'; // Zero-Width Joiner     → character separator
const WM_START = '\uFEFF\u200B\u200D'; // BOM + ZWS + ZWJ  = watermark start
const WM_END   = '\u200D\u200B\uFEFF'; // ZWJ + ZWS + BOM  = watermark end

// Username length bound — must match the decoder's own validation regex
// below exactly. This also happens to match this platform's actual
// registration limit (USERNAME_RE in routes/auth.js allows 3-20 chars),
// but is defined independently here so the encoder and decoder can never
// silently drift apart from each other even if that changes.
const WM_MAX_USERNAME_LEN = 20;

/**
 * Encodes a username as invisible zero-width characters.
 * Each ASCII char → 8 bits → ZWS(0)/ZWNJ(1) with ZWJ separators.
 */
function encodeWatermark(username) {
  if (!username || typeof username !== 'string') return '';
  // Only encode safe ASCII usernames (alphanumeric + underscore)
  const safe = username.slice(0, WM_MAX_USERNAME_LEN).replace(/[^a-zA-Z0-9_]/g, '');
  if (!safe) return '';

  const encoded = safe.split('').map(ch => {
    const code = ch.charCodeAt(0);
    return Array.from({ length: 8 }, (_, i) => ((code >> (7 - i)) & 1) ? ZWNJ : ZWS).join('');
  }).join(ZWJ);

  return WM_START + encoded + WM_END;
}

/**
 * Extracts and decodes the watermark username from text content.
 * Returns the username string or null if no valid watermark found.
 */
function decodeWatermark(text) {
  if (!text || typeof text !== 'string') return null;

  const startIdx = text.indexOf(WM_START);
  if (startIdx === -1) return null;

  const endIdx = text.indexOf(WM_END, startIdx + WM_START.length);
  if (endIdx === -1) return null;

  const payload = text.slice(startIdx + WM_START.length, endIdx);
  if (!payload) return null;

  const charGroups = payload.split(ZWJ);
  let result = '';

  for (const group of charGroups) {
    if (!group) continue;
    const bits = group.split('').map(c => c === ZWNJ ? 1 : 0);
    if (bits.length !== 8) continue;
    const code = bits.reduce((acc, b) => (acc << 1) | b, 0);
    if (code < 32 || code > 126) continue; // ASCII printable only
    result += String.fromCharCode(code);
  }

  // Validate: username must be alphanumeric+underscore, 3 chars to the shared max
  const wmUsernameRe = new RegExp(`^[a-zA-Z0-9_]{3,${WM_MAX_USERNAME_LEN}}$`);
  if (!result || !wmUsernameRe.test(result)) return null;
  return result;
}

/**
 * Checks if content already has a watermark embedded.
 */
function hasWatermark(text) {
  return text && text.includes(WM_START) && text.includes(WM_END);
}

/**
 * Embeds watermark into content text at a strategic position
 * (after first paragraph break or near the middle of the content).
 */
function embedWatermark(content, username) {
  if (!content || !username) return content;
  if (hasWatermark(content)) return content; // Don't double-watermark

  const wm = encodeWatermark(username);
  if (!wm) return content;

  // Embed watermark after closing tag of first block element, or in middle
  const insertAfter = ['</h2>', '</h1>', '</p>', '</div>'];
  for (const tag of insertAfter) {
    const idx = content.indexOf(tag);
    if (idx !== -1) {
      return content.slice(0, idx + tag.length) + wm + content.slice(idx + tag.length);
    }
  }

  // Fallback: embed at position 1/3 of content
  const pos = Math.floor(content.length / 3);
  return content.slice(0, pos) + wm + content.slice(pos);
}

// ── TEXT SIMILARITY ENGINE ────────────────────────────────────────

/**
 * Strips HTML tags and normalizes whitespace.
 */
function normalizeText(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')  // Remove scripts
    .replace(/<style[\s\S]*?<\/style>/gi, '')    // Remove styles
    .replace(/<[^>]+>/g, ' ')                    // Remove HTML tags
    .replace(/\s+/g, ' ')                        // Collapse whitespace
    .trim()
    .toLowerCase();
}

/**
 * Generates word n-grams as a Set.
 * Splits on whitespace and punctuation (both Latin and Arabic) — this must
 * NOT include the Arabic Unicode range itself as a delimiter, or every
 * Arabic letter gets treated as a word boundary and the function returns
 * nothing for any Arabic text at all.
 */
function getWordNgrams(text, n) {
  const words = text.split(/[\s.,;:!?،؛؟"'""'']+/).filter(w => w.length > 1);
  const ngrams = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Generates character n-grams as a Set (good for Arabic text).
 */
function getCharNgrams(text, n) {
  const cleaned = text.replace(/\s+/g, '');
  const ngrams = new Set();
  for (let i = 0; i <= cleaned.length - n; i++) {
    ngrams.add(cleaned.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Jaccard similarity between two sets.
 */
function jaccard(setA, setB) {
  if (!setA.size && !setB.size) return 1;
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  return intersection / (setA.size + setB.size - intersection);
}

/**
 * Computes similarity score between two content strings.
 * Returns a value 0.0 – 1.0 where 1.0 = identical.
 *
 * Algorithm:
 *   - Exact match → 1.0
 *   - Word bigram Jaccard
 *   - Word trigram Jaccard
 *   - Character 5-gram Jaccard (language-agnostic, great for Arabic)
 *   - Weighted average tuned for academic summaries
 */
function computeSimilarity(content1, content2) {
  const t1 = normalizeText(content1);
  const t2 = normalizeText(content2);

  if (!t1 && !t2) return 1.0;
  if (!t1 || !t2) return 0.0;
  if (t1 === t2)  return 1.0;

  // Length ratio check — very different lengths → likely not plagiarism
  const lenRatio = Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length);
  if (lenRatio < 0.25) return lenRatio * 0.2; // Penalise extreme length mismatch

  // Word-level n-grams
  const wBi1  = getWordNgrams(t1, 2), wBi2  = getWordNgrams(t2, 2);
  const wTri1 = getWordNgrams(t1, 3), wTri2 = getWordNgrams(t2, 3);

  // Character-level n-grams (handles Arabic morphology)
  const cFive1 = getCharNgrams(t1, 5), cFive2 = getCharNgrams(t2, 5);

  const jBi   = jaccard(wBi1, wBi2);
  const jTri  = jaccard(wTri1, wTri2);
  const jChar = jaccard(cFive1, cFive2);

  // Adaptive weighting based on content length
  const avgLen = (t1.length + t2.length) / 2;
  let score;
  if (avgLen < 200) {
    // Short content: rely more on char ngrams
    score = jBi * 0.4 + jChar * 0.6;
  } else if (avgLen < 1000) {
    // Medium: balanced
    score = jBi * 0.35 + jTri * 0.30 + jChar * 0.35;
  } else {
    // Long content: trigrams + char ngrams most reliable
    score = jBi * 0.25 + jTri * 0.40 + jChar * 0.35;
  }

  // Boost score if length ratio is very close (high chance it's same doc)
  if (lenRatio > 0.90) score = score * 0.85 + lenRatio * 0.15;

  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Classifies a similarity score.
 * Returns: 'identical' | 'similar' | 'clean'
 */
function classifySimilarity(score) {
  if (score >= 0.90) return 'identical';
  if (score >= 0.55) return 'similar';
  return 'clean';
}

module.exports = {
  encodeWatermark,
  decodeWatermark,
  hasWatermark,
  embedWatermark,
  computeSimilarity,
  classifySimilarity,
  normalizeText,
};
