// ═══════════════════════════════════════════════════════
//  MOL5SAT — BAD-WORD FILTER (server-side)
//  Mirrors the client-side filter in frontend-web/app.js so profanity
//  checks can't be bypassed by calling the API directly instead of going
//  through the UI. Keep the two word lists in sync if either changes.
// ═══════════════════════════════════════════════════════

const BAD_STEMS = [
  // English racial/ethnic slurs
  'nigger','nigga','nigg','niga','n1gger','n1gga',
  'chink','gook','spic','spick','wetback','kike','hymie',
  'cracker','redneck','coon','porch monkey','jigaboo','sambo',
  'towelhead','sandnigger','raghead','camel jockey',
  'zipperhead','slant','slope','beaner','greaser',
  // Gender/sexuality slurs
  'faggot','fag','dyke','tranny','shemale','homo','queer',
  // Religious slurs
  'infidel','kuffar','kafir','crusader',
  // Misogynistic
  'whore','slut','cunt','bitch','skank','hoe',
  // General profanity/threats (severe)
  'fuck','shit','asshole','motherfucker','bastard',
  'dick','cock','pussy','ass','piss','bullshit',
  'kill yourself','kys','go die','rape','rapist',
  // Arabic slurs/profanity
  'كس','طيز','زبر','شرموطة','عرص','خول','منيوك',
  'كسمك','أمك','نيك','متناك','شرموط','عاهرة',
  'يلعن','ابن الشرموطة','يبن','تبن',
];

const BAD_RE = new RegExp(
  BAD_STEMS.map(w =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
     .replace(/\s+/g, '\\s*')
  ).join('|'),
  'iu'
);

function normLeet(str) {
  return str
    .replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e')
    .replace(/4/g,'a').replace(/5/g,'s').replace(/7/g,'t')
    .replace(/8/g,'b').replace(/@/g,'a').replace(/\$/g,'s')
    .replace(/\+/g,'t').replace(/!/g,'i').replace(/\|/g,'i')
    .replace(/[*•·]+/g,'');
}

/**
 * checkText(str) -> { clean: bool, word: string|null }
 */
function checkText(str) {
  if (!str || typeof str !== 'string') return { clean: true, word: null };
  const norm = normLeet(str.toLowerCase());
  const m = norm.match(BAD_RE);
  return m ? { clean: false, word: m[0] } : { clean: true, word: null };
}

module.exports = { checkText, BAD_STEMS };
