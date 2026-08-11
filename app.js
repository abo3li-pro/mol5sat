// ═══════════════════════════════════════════════════════
//  MOL5SAT — CORE LOGIC  v5  (passwords + reset + rich seed)
// ═══════════════════════════════════════════════════════

// ── APP STATE ─────────────────────────────────────────────
var STATE = window.STATE = {
  currentUser: null, loggedIn: false,
  route: 'landing', routeData: {},
  searchMode: 'curriculum', activeTab: null,
  historyStack: [],
  feedSort: ['recommended'],
  searchSort: ['recommended'],
  searchLang: 'all',
  advancedTarget: null,
  activeFilters: { subjects: [], langs: [] },
};

// ── IN-MEMORY ACTIVITY LOG (frontend-only / demo mode) ────
window._ACTIVITY_LOG = window._ACTIVITY_LOG || [];
function logActivity(action, entityType = '', entityId = '', details = '') {
  const u = STATE.currentUser;
  window._ACTIVITY_LOG.unshift({
    id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    user_id: u?.id || null,
    user_name: u?.name || '(system)',
    action, entity_type: entityType, entity_id: String(entityId),
    details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
    ip: '', created_at: Math.floor(Date.now() / 1000),
  });
  if (window._ACTIVITY_LOG.length > 500) window._ACTIVITY_LOG.length = 500;
  persistState();
}

// ── PERSISTENCE: save/restore all MOCK state via localStorage ──
const _PERSIST_KEY = 'mol5sat_mockstate_v2';
function persistState() {
  try {
    localStorage.setItem(_PERSIST_KEY, JSON.stringify({
      users: MOCK_USERS,
      summaries: MOCK_SUMMARIES,
      ipBans: typeof MOCK_IP_BANS !== 'undefined' ? MOCK_IP_BANS : [],
      activityLog: window._ACTIVITY_LOG,
    }));
  } catch(e) { /* storage full or private mode */ }
}
function restorePersistedState() {
  try {
    const raw = localStorage.getItem(_PERSIST_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.users?.length) {
      MOCK_USERS.length = 0;
      saved.users.forEach(u => MOCK_USERS.push(u));
    }
    if (saved.summaries?.length) {
      MOCK_SUMMARIES.length = 0;
      saved.summaries.forEach(s => MOCK_SUMMARIES.push(s));
    }
    if (saved.ipBans && typeof MOCK_IP_BANS !== 'undefined') {
      MOCK_IP_BANS.length = 0;
      saved.ipBans.forEach(b => MOCK_IP_BANS.push(b));
    }
    if (saved.activityLog?.length) {
      window._ACTIVITY_LOG = saved.activityLog;
    }
  } catch(e) { /* corrupted state — ignore */ }
}

// ── ROUTER ────────────────────────────────────────────────
// navigate(), goBack(), and the popstate listener are defined in
// router.js, which uses real path-based URLs (pushed last, so it wins
// over any earlier window.navigate/goBack assignment). The hash-based
// versions and popstate listener that used to live here were removed —
// they were stacking a second popstate handler alongside router.js's,
// causing every browser back/forward click to render() twice.

function signOut() {
  logActivity('logout', 'user', STATE.currentUser?.id || '', `Signed out: ${STATE.currentUser?.name || ''}`);
  STATE.currentUser = null; STATE.loggedIn = false; STATE.historyStack = [];
  STATE.route = 'landing'; STATE.routeData = {};
  try { localStorage.removeItem('mol5sat_session'); } catch(e){}
  persistState();
  window.history.pushState({}, '', '#landing');
  updateNavForUser();
  render();
  toast('Signed out', 'info', 'fa-right-from-bracket');
}

// navTo is defined in index.html as function navTo(r,d){navigate(r,d)}
// signOut, toggleSearchMode defined here — usable from templates

function toggleSearchMode() {

  const btn = document.getElementById('searchModeBtn');
  if (!btn) return;
  const isCurr = btn.classList.contains('m-curr');
  const newMode = isCurr ? 'science' : 'curriculum';
  if (STATE.route === 'search') {
    // Already viewing search results: do a real navigation so the URL
    // (and thus reload / back-button) reflects the new mode too.
    navigate('search', { q: STATE.routeData?.q || '', mode: newMode });
  } else {
    setSearchMode(newMode);
  }
}

function setSearchMode(mode, skipRender) {
  const btn = document.getElementById('searchModeBtn');
  const lbl = document.getElementById('searchModeLabel');
  const isSci = mode === 'science';
  STATE.activeTab = isSci ? 'science' : 'curriculum';
  STATE.searchMode = isSci ? 'science' : 'curriculum';
  if (btn && lbl) {
    btn.classList.toggle('m-curr', !isSci);
    btn.classList.toggle('m-sci', isSci);
    const icon = btn.querySelector('i');
    if (icon) icon.className = isSci ? 'fas fa-flask' : 'fas fa-book-open';
    lbl.textContent = isSci ? 'Science' : 'Curriculum';
  }
  if (!skipRender && (STATE.route === 'home' || STATE.route === 'search')) render();
}

// ── GRADE INDEX ───────────────────────────────────────────
// Returns numeric index of a grade within a country's grade list.
// 'University' always maps to a high sentinel (999).
// Returns -1 if not found.
function getGradeIndex(country, grade) {
  if (!grade) return -1;
  if (grade === 'University') return 999;
  const cData = (typeof COUNTRIES !== 'undefined') ? COUNTRIES[country] : null;
  if (!cData) return -1;
  const idx = cData.grades.indexOf(grade);
  return idx; // 0-based; 'University' caught above
}

function _isUniversity(grade) {
  return grade === 'University' || (grade || '').toLowerCase().includes('university');
}
function _gradeCount(country) {
  return (COUNTRIES[country]?.grades || []).length;
}

// ── CROSS-COUNTRY GRADE COMPARISON ───────────────────────
// Every country's grades[] ends with the literal string 'University' as its
// last (highest) entry, so a grade's *position* in its own country's list,
// normalized to 0..1, is a reasonable stand-in for "how advanced" it is —
// even when comparing across two different countries' grade systems.
function _gradeFraction(country, grade) {
  if (!grade) return null;
  const total = _gradeCount(country);
  if (total < 2) return null;
  const idx = _isUniversity(grade) ? (total - 1) : getGradeIndex(country, grade);
  if (idx < 0) return null;
  return idx / (total - 1);
}

// Signed step distance of summary `s`'s grade relative to `user`'s grade,
// expressed in units of the user's OWN grade ladder (so "1 step" always
// means "1 grade" from the user's point of view — even when `s` is from a
// different country with a differently-sized grade list).
// +N = N grades higher, -N = N grades lower, 0 = same tier, null = unknown.
function gradeStepsVsUser(user, s) {
  if (!user) return null;
  const uIsUni = user.userType === 'colleague' || user.user_type === 'colleague';
  const uFrac = uIsUni ? 1 : _gradeFraction(user.country, user.grade);
  if (uFrac == null) return null;
  const sFrac = _isUniversity(s.grade) ? 1 : _gradeFraction(s.country, s.grade);
  if (sFrac == null) return null;
  const total = _gradeCount(user.country);
  const scale = total > 2 ? (total - 1) : 11;
  return Math.round((sFrac - uFrac) * scale);
}

// "Neutral" zig-zag rank for grade proximity: same grade = 0, one grade
// higher = 1, one grade lower = 2, two higher = 3, two lower = 4, ...
// Unknown distances sink near the bottom without being excluded outright.
function _zigzagRank(steps) {
  if (steps === null || steps === undefined) return 9999;
  if (steps === 0) return 0;
  return steps > 0 ? steps * 2 - 1 : -steps * 2;
}

// Real timestamp (ms) from either shape: backend rows use unix-seconds
// under `created_at`; a couple of legacy/mock spots used an ISO string
// under `createdAt`. Sorting code should always go through this rather
// than `new Date(x.createdAt)`, which silently yields NaN on real data.
function _ts(s) {
  if (s == null) return 0;
  if (typeof s.created_at === 'number') return s.created_at * 1000;
  if (typeof s.created_at === 'string' && s.created_at) return new Date(s.created_at).getTime() || 0;
  if (s.createdAt) return new Date(s.createdAt).getTime() || 0;
  return 0;
}

// Returns all grades above the user's grade (higher index = older/harder).
// Always includes 'University' at the top.
function getAdvancedGrades(country, userGrade, targetGrade) {
  const cData = (typeof COUNTRIES !== 'undefined') ? COUNTRIES[country] : null;
  if (!cData) return ['University'];
  const userIdx = getGradeIndex(country, userGrade);
  if (targetGrade === 'University') return ['University'];
  const targetIdx = targetGrade ? getGradeIndex(country, targetGrade) : -1;
  return cData.grades.filter((g, i) => {
    if (g === 'University') return false; // handled separately
    if (userIdx < 0) return true; // unknown grade: show all
    if (targetIdx >= 0) return i <= targetIdx && i > userIdx;
    return i > userIdx; // all grades above user's
  });
}

// ═══════════════════════════════════════════════════════════════
//  SMART INTELLIGENCE ENGINE  v2
// ═══════════════════════════════════════════════════════════════

// ── BAD-WORD FILTER ──────────────────────────────────────────────
// Covers: English slurs/hate speech, Arabic slurs, sexual terms,
// threats. Uses stem matching so l33tspeak variants are caught.
const _BAD_STEMS = [
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

// Build a fast regex once at startup
const _BAD_RE = new RegExp(
  _BAD_STEMS.map(w =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars
     .replace(/\s+/g, '\\s*')                 // allow spacing tricks
  ).join('|'),
  'iu' // case-insensitive, unicode
);

// Normalise leet-speak before checking
function _normLeet(str) {
  return str
    .replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e')
    .replace(/4/g,'a').replace(/5/g,'s').replace(/7/g,'t')
    .replace(/8/g,'b').replace(/@/g,'a').replace(/\$/g,'s')
    .replace(/\+/g,'t').replace(/!/g,'i').replace(/\|/g,'i')
    .replace(/[*•·]+/g,'');  // stars/dots used to censor middle
}

/**
 * checkText(str) → { clean: bool, word: string|null }
 * Returns clean=false and the matched fragment if bad word found.
 */
function checkText(str) {
  if (!str || typeof str !== 'string') return { clean: true, word: null };
  const norm = _normLeet(str.toLowerCase());
  const m = norm.match(_BAD_RE);
  return m ? { clean: false, word: m[0] } : { clean: true, word: null };
}

/**
 * guardInput(str, fieldName) → true if clean, shows toast+throws if not.
 * Use before saving any user-generated text.
 */
function guardInput(str, fieldName = 'Content') {
  const { clean } = checkText(str);
  if (!clean) {
    toast(`⛔ ${fieldName} contains prohibited language. Please revise.`, 'error', 'fa-ban');
    return false;
  }
  return true;
}

// ── ENGAGEMENT SCORE HELPER ──────────────────────────────────────
function _engS(s) {
  if (typeof ENGAGEMENT !== 'undefined' && ENGAGEMENT[s.id]) {
    const e = ENGAGEMENT[s.id];
    return e.usefuls * 1.0 + e.likes * 0.8 - e.dislikes * 0.4;
  }
  return s.likes * 0.8;
}

// Recency decay: score × (1 - 0.15 × weeksSincePost), floor 0.5
function _recencyFactor(createdAt) {
  const weeks = (Date.now() - new Date(createdAt).getTime()) / (7 * 86400000);
  return Math.max(0.5, 1 - 0.03 * weeks);  // gentle 3%/week decay
}

// ── SORT FUNCTION (upgraded) ─────────────────────────────────────
function sortItems(items, sortKey, user) {
  const arr = [...items];
  if (sortKey === 'recommended') {
    const langPref = user ? getLangPreference(user.country) : ['en', 'ar', 'fr'];
    const following = user?.following || [];
    const interests  = user?.interests || [];
    arr.sort((a, b) => {
      // 1. Promoted always first
      const pa = a.is_promoted ?? a.isPromoted, pb = b.is_promoted ?? b.isPromoted;
      if (pa && !pb) return -1;
      if (!pa && pb) return 1;
      // 2. Followed creators get a strong boost
      const aAuthor = a.author_id || a.authorId, bAuthor = b.author_id || b.authorId;
      const fa = following.includes(aAuthor) ? 25 : 0;
      const fb = following.includes(bAuthor) ? 25 : 0;
      // 3. Interest match bonus
      const ia = interests.includes(a.subject) ? 12 : 0;
      const ib = interests.includes(b.subject) ? 12 : 0;
      // 4. Language preference
      const al = langPref.indexOf(a.lang); const bl = langPref.indexOf(b.lang);
      const la = al < 0 ? -8 : [10, 4, 0][al] ?? 0;
      const lb = bl < 0 ? -8 : [10, 4, 0][bl] ?? 0;
      // 5. Engagement × recency
      const sa = (_engS(a) + fa + ia + la) * _recencyFactor(_ts(a));
      const sb = (_engS(b) + fb + ib + lb) * _recencyFactor(_ts(b));
      return sb - sa;
    });
  } else if (sortKey === 'date') {
    arr.sort((a, b) => _ts(b) - _ts(a));
  } else if (sortKey === 'date-asc') {
    arr.sort((a, b) => _ts(a) - _ts(b));
  } else if (sortKey === 'oldest') {
    arr.sort((a, b) => _ts(a) - _ts(b));
  } else if (sortKey === 'likes') {
    arr.sort((a, b) => b.likes - a.likes);
  } else if (sortKey === 'views') {
    arr.sort((a, b) => b.views - a.views);
  } else if (sortKey === 'lang-ar') {
    arr.sort((a, b) => (a.lang === 'ar' ? -1 : 1) - (b.lang === 'ar' ? -1 : 1) || _engS(b) - _engS(a));
  } else if (sortKey === 'lang-en') {
    arr.sort((a, b) => (a.lang === 'en' ? -1 : 1) - (b.lang === 'en' ? -1 : 1) || _engS(b) - _engS(a));
  } else if (sortKey === 'lang-fr') {
    arr.sort((a, b) => (a.lang === 'fr' ? -1 : 1) - (b.lang === 'fr' ? -1 : 1) || _engS(b) - _engS(a));
  } else if (sortKey === 'az') {
    arr.sort((a, b) => a.title.localeCompare(b.title, undefined, {sensitivity: 'base'}));
  } else if (sortKey === 'za') {
    arr.sort((a, b) => b.title.localeCompare(a.title, undefined, {sensitivity: 'base'}));
  } else if (sortKey === 'pages-desc') {
    arr.sort((a, b) => (b.pages || 0) - (a.pages || 0));
  } else if (sortKey === 'pages-asc') {
    arr.sort((a, b) => (a.pages || 0) - (b.pages || 0));
  } else if (sortKey === 'curriculum') {
    // Smart: score by how closely it matches the current user's curriculum
    const u = STATE.currentUser;
    const langPref = u ? getLangPreference(u.country) : ['en','ar','fr'];
    const userGradeIdx = u ? getGradeIndex(u.country, u.grade) : -1;
    arr.sort((a, b) => {
      const _currScore = (s) => {
        let sc = 0;
        if (!u) return _engS(s);
        if (s.country === u.country) sc += 20;
        else if (s.country !== 'International (IB / No Fixed Country)') sc -= 10;
        const sIdx = getGradeIndex(u.country, s.grade);
        if (userGradeIdx >= 0 && sIdx >= 0) {
          const dist = Math.abs(userGradeIdx - sIdx);
          sc += dist === 0 ? 30 : dist === 1 ? 14 : dist === 2 ? 5 : 0;
        }
        if (u.school && s.school === u.school) sc += 8;
        const li = langPref.indexOf(s.lang);
        sc += li === 0 ? 10 : li === 1 ? 4 : 0;
        sc += _engS(s) * 0.004;
        return sc;
      };
      return _currScore(b) - _currScore(a);
    });
  } else if (sortKey === 'advanced' || (sortKey || '').startsWith('advanced:')) {
    // "Only show me higher grades, up through college" — filtered to
    // strictly-higher-than-the-user (or an explicit target grade), using
    // the cross-country-safe step distance so foreign-country content is
    // placed correctly instead of silently passing the filter unranked.
    const u2 = STATE.currentUser;
    const target = sortKey.indexOf(':') >= 0 ? sortKey.slice(sortKey.indexOf(':') + 1) : (STATE.advancedTarget || null);
    const interests = u2?.interests || [];
    const stepsOf = (s) => gradeStepsVsUser(u2, s);
    let filtered = arr.filter(s => {
      const steps = stepsOf(s);
      if (steps === null || steps <= 0) return false;
      if (target && target.toLowerCase() !== 'all') {
        if (target.toLowerCase() === 'university') return _isUniversity(s.grade);
        if (s.country === u2?.country) return s.grade === target;
        const targetSteps = u2 ? gradeStepsVsUser(u2, { country: u2.country, grade: target }) : null;
        return targetSteps !== null && steps <= targetSteps;
      }
      return true;
    });
    filtered.sort((a, b) => {
      const pa = (a.is_promoted ?? a.isPromoted) ? 1 : 0;
      const pb = (b.is_promoted ?? b.isPromoted) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ia = interests.includes(a.subject) ? 1 : 0;
      const ib = interests.includes(b.subject) ? 1 : 0;
      if (ia !== ib) return ib - ia;
      const sa = stepsOf(a) ?? 9999, sb = stepsOf(b) ?? 9999;
      if (sa !== sb) return sa - sb; // nearest grade above the user first
      return _engS(b) - _engS(a);
    });
    return filtered;
  }
  return arr;
}

// ── MULTI-SELECT SORT ────────────────────────────────────────────
// STATE.feedSort / STATE.searchSort / STATE.trendingSort are arrays of
// sort keys, applied as an ordered compound comparator (first selected =
// primary key, later ones only break ties). 'recommended', 'curriculum',
// and 'advanced'/'advanced:x' are algorithmic MODES rather than a single
// field to compare on, so selecting one of those always replaces the
// whole array; every other key toggles in/out and compounds with its
// siblings, except within its own "opposite pair" (a field and its
// reverse can't both be primary at once).
function normalizeSortArr(s) {
  if (Array.isArray(s)) return s.length ? s : ['recommended'];
  return s ? [s] : ['recommended'];
}
function _sortOptMeta(key) {
  const base = (key && key.startsWith('advanced:')) ? 'advanced' : key;
  return (window._SORT_OPTS || []).find(o => o.k === base) || null;
}
function _isModeKey(key) {
  const m = _sortOptMeta(key);
  return !m || m.group === 'relevance' || m.group === 'advanced';
}
// Keys that are direct opposites of each other and can't both be active at
// once (distinct from the visual `.group` in _SORT_OPTS, which is only for
// clustering chips in the UI -- e.g. Top Liked and Most Viewed share a
// visual group but are perfectly fine compounding together).
var _SORT_OPPOSITES = window._SORT_OPPOSITES = {
  'date': ['date-asc'], 'date-asc': ['date'],
  'az': ['za'], 'za': ['az'],
  'pages-desc': ['pages-asc'], 'pages-asc': ['pages-desc'],
  'lang-ar': ['lang-en', 'lang-fr'], 'lang-en': ['lang-ar', 'lang-fr'], 'lang-fr': ['lang-ar', 'lang-en'],
};
function toggleSortInto(current, key) {
  if (_isModeKey(key)) return [key];
  let arr = normalizeSortArr(current).filter(k => !_isModeKey(k));
  if (arr.includes(key)) {
    arr = arr.filter(k => k !== key);
  } else {
    const opposites = _SORT_OPPOSITES[key] || [];
    arr = arr.filter(k => !opposites.includes(k));
    arr.push(key);
  }
  return arr.length ? arr : ['recommended'];
}
function _comparatorForKey(key) {
  if (key === 'date')       return (a,b) => _ts(b) - _ts(a);
  if (key === 'date-asc')   return (a,b) => _ts(a) - _ts(b);
  if (key === 'likes')      return (a,b) => (b.likes||0) - (a.likes||0);
  if (key === 'views')      return (a,b) => (b.views||0) - (a.views||0);
  if (key === 'az')         return (a,b) => (a.title||'').localeCompare(b.title||'', undefined, {sensitivity:'base'});
  if (key === 'za')         return (a,b) => (b.title||'').localeCompare(a.title||'', undefined, {sensitivity:'base'});
  if (key === 'lang-ar')    return (a,b) => (a.lang==='ar'?-1:1) - (b.lang==='ar'?-1:1);
  if (key === 'lang-en')    return (a,b) => (a.lang==='en'?-1:1) - (b.lang==='en'?-1:1);
  if (key === 'lang-fr')    return (a,b) => (a.lang==='fr'?-1:1) - (b.lang==='fr'?-1:1);
  if (key === 'pages-desc') return (a,b) => (b.pages||0) - (a.pages||0);
  if (key === 'pages-asc')  return (a,b) => (a.pages||0) - (b.pages||0);
  return null;
}
// Applies an array of sort keys. A single mode key delegates to the
// existing sortItems() algorithm (unchanged behavior); anything else runs
// as a compound multi-key sort, promoted-first, keys in priority order,
// with overall engagement as the final tiebreak.
function applySortKeys(items, sortArr, user) {
  const arr = normalizeSortArr(sortArr);
  if (arr.length === 1 && _isModeKey(arr[0])) return sortItems(items, arr[0], user);
  const out = [...items];
  out.sort((a, b) => {
    const pa = (a.is_promoted ?? a.isPromoted) ? 1 : 0;
    const pb = (b.is_promoted ?? b.isPromoted) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    for (const k of arr) {
      const cmp = _comparatorForKey(k);
      if (cmp) { const r = cmp(a, b); if (r !== 0) return r; }
    }
    return _engS(b) - _engS(a);
  });
  return out;
}

// ── SMART CURRICULUM FEED ────────────────────────────────────────
/**
 * Grade proximity: same grade = 10 pts, adjacent = 5 pts, 2 away = 2 pts.
 * School type match = 4 pts bonus.
 * Preferred language match = 6 pts.
 * Creator follow = 18 pts.
 * Engagement score weighted in.
 * Recency decay applied.
 * Result: personalized, diverse, always relevant.
 */
function getCurriculumFeed(user, sortKey = 'recommended') {
  if (!user || user.role === 'admin') return [];

  const userGradeIdx = getGradeIndex(user.country, user.grade);
  const langPref     = getLangPreference(user.country);
  const following    = user.following || [];

  // Score each approved, non-colleague summary
  const scored = MOCK_SUMMARIES
    .filter(s => s.approved && s.audience !== 'colleagues')
    .map(s => {
      let score = 0;

      // ── Country match (hard filter with relaxation) ────────────
      const sameCountry = s.country === user.country;
      const isIntl      = s.country === 'International (IB / No Fixed Country)';
      if (!sameCountry && !isIntl && !s.isPromoted) return null; // exclude foreign non-promoted

      if (sameCountry) {
        score += 20; // strong country bonus

        // ── Grade proximity ──────────────────────────────────────
        const sGradeIdx = getGradeIndex(user.country, s.grade);
        if (sGradeIdx >= 0 && userGradeIdx >= 0) {
          const dist = Math.abs(sGradeIdx - userGradeIdx);
          if      (dist === 0) score += 30; // exact match
          else if (dist === 1) score += 14; // one grade away
          else if (dist === 2) score +=  5; // two grades away
          else                 score -=  5; // far off
        }

        // ── School type match ────────────────────────────────────
        if (user.school && s.school && user.school === s.school) score += 8;
      }

      // ── Language preference ──────────────────────────────────
      const li = langPref.indexOf(s.lang);
      score += li === 0 ? 12 : li === 1 ? 4 : li === 2 ? 1 : -4;

      // ── Following creator ────────────────────────────────────
      if (following.includes(s.authorId)) score += 18;

      // ── Subject interest ─────────────────────────────────────
      if ((user.interests || []).includes(s.subject)) score += 6;

      // ── Promoted bonus ───────────────────────────────────────
      if (s.isPromoted) score += 10;

      // ── Engagement × recency ─────────────────────────────────
      const engBoost = _engS(s) * _recencyFactor(s.createdAt) * 0.012;
      score += engBoost;

      return { s, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  // If sortKey is not 'recommended', apply standard sort instead
  const items = scored.map(x => x.s);
  if (sortKey !== 'recommended') return sortItems(items, sortKey, user);

  // Diversify: avoid flooding with same subject — max 3 consecutive same subject
  const result = []; const subjectRun = {};
  for (const { s } of scored) {
    subjectRun[s.subject] = (subjectRun[s.subject] || 0);
    if (subjectRun[s.subject] < 3) { result.push(s); subjectRun[s.subject]++; }
  }
  // Append any excluded items at the end
  scored.forEach(({ s }) => { if (!result.includes(s)) result.push(s); });
  return result;
}

// ── SMART SEARCH ─────────────────────────────────────────────────
/**
 * Relevance scoring per field:
 *   title exact phrase = 40 | title word = 20 | subject = 15 | tag = 10 | author = 8
 * Grade proximity bonus in curriculum mode.
 * Fuzzy: allows one-character transposition for terms > 4 chars.
 * Arabic diacritic stripping for better matching.
 */

// Strip Arabic diacritics (harakat) for better matching
function _stripHarakat(str) {
  return str.replace(/[\u064B-\u065F\u0670]/g, '');
}

// Levenshtein distance (fast, capped at 2)
function _levDist(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  if (a === b) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function _fuzzyMatch(haystack, needle) {
  if (!needle || !haystack) return false;
  const h = _stripHarakat(haystack.toLowerCase());
  const n = _stripHarakat(needle.toLowerCase());
  if (h.includes(n)) return true;
  // For terms > 4 chars, allow 1 edit distance
  if (n.length > 4) {
    // Slide a window of needle-length over haystack
    for (let i = 0; i <= h.length - n.length + 2; i++) {
      const window = h.slice(i, i + n.length);
      if (_levDist(window, n) <= 1) return true;
    }
  }
  return false;
}

function _scoreMatch(s, terms, user, mode) {
  let score = 0;
  const title = _stripHarakat(s.title.toLowerCase());
  const subj  = _stripHarakat(s.subject.toLowerCase());
  const tags  = (s.tags || []).map(t => _stripHarakat(t.toLowerCase()));
  const auth  = _stripHarakat((s.author || '').toLowerCase());

  for (const term of terms) {
    const t = _stripHarakat(term.toLowerCase());
    if (!t) continue;

    // Exact phrase in title
    if (title.includes(t))       score += 40;
    // Subject exact
    if (subj === t || subj.includes(t)) score += 15;
    // Tag match
    if (tags.some(tag => tag.includes(t) || t.includes(tag))) score += 10;
    // Author name
    if (auth.includes(t))        score += 8;
    // Fuzzy title (only if not already matched)
    else if (_fuzzyMatch(title, t)) score += 22;
    // Fuzzy subject
    else if (_fuzzyMatch(subj, t))  score += 8;
  }

  if (score === 0) return -1; // no match at all

  // Curriculum-mode: within exact grade results, boost by school type + language
  if (mode === 'curriculum' && user) {
    // School type exact match is the primary tie-breaker
    if (user.school && s.school === user.school) score += 20;
    // Language preference
    const lp = getLangPreference(user.country);
    const li = lp.indexOf(s.lang);
    score += li === 0 ? 10 : li === 1 ? 4 : 0;
    // Promoted gets small boost
    if (s.isPromoted) score += 5;
    // Engagement as final tie-breaker
    score += _engS(s) * 0.003;
  }

  // Engagement boost
  score += _engS(s) * 0.005;

  return score;
}

function searchSummaries(query, mode, sortKey = 'recommended', langFilter = 'all') {
  const u = STATE.currentUser;
  const terms = query && query.trim().length > 0 ? expandQuery(query.trim()) : [];

  const results = MOCK_SUMMARIES
    .filter(s => {
      if (!s.approved) return false;
      if (langFilter !== 'all' && s.lang !== langFilter) return false;
      if (mode === 'curriculum' && u) {
        if (s.audience === 'colleagues') return false;
        // STRICT: must be same country AND same grade AND not colleague-only
        if (s.country !== u.country) return false;
        if (u.grade && s.grade && s.grade !== u.grade) return false;
        // School type match is preferred but not required (shown via score)
      } else if (mode === 'curriculum') {
        // Guest has no curriculum — show nothing and tell them to sign in
        return false;
      }
      return true;
    })
    .map(s => {
      const relevance = terms.length > 0 ? _scoreMatch(s, terms, u, mode) : 100;
      if (relevance < 0) return null;
      return { s, relevance };
    })
    .filter(Boolean);

  // Sort by relevance first when there's a query, else by sortKey
  if (terms.length > 0 && sortKey === 'recommended') {
    results.sort((a, b) => b.relevance - a.relevance);
    return results.map(r => r.s);
  }
  return sortItems(results.map(r => r.s), sortKey, u);
}

function sameCountryNonPromoted(s, u) {
  return s.country === u.country && !s.isPromoted;
}

function titleMatchesQuery(s, terms) {
  // Now delegates to fuzzy match
  const title = s.title.toLowerCase();
  const subj  = s.subject.toLowerCase();
  const tags  = (s.tags || []).map(x => x.toLowerCase());
  return terms.some(term => {
    const t = term.toLowerCase();
    return title.includes(t) || subj.includes(t) ||
      tags.some(tag => tag.includes(t) || t.includes(tag)) ||
      _fuzzyMatch(title, t) || _fuzzyMatch(subj, t);
  });
}

// ── SMART SCIENCE FEED ───────────────────────────────────────────
function getScienceFeed(user, sortKey = 'recommended') {
  if (!user || user.role === 'admin') return { interested: [], recommended: [] };
  const interests = user.interests || [];
  const following = user.following || [];
  const approved  = MOCK_SUMMARIES.filter(s => s.approved && s.audience !== 'colleagues');

  // Score every summary
  const scored = approved.map(s => {
    let score = _engS(s) * _recencyFactor(s.createdAt);
    if (interests.includes(s.subject))       score += 30;
    if (following.includes(s.authorId))      score += 20;
    const lp = getLangPreference(user.country);
    const li = lp.indexOf(s.lang);
    score += li === 0 ? 8 : li === 1 ? 3 : 0;
    return { s, score };
  }).sort((a, b) => b.score - a.score);

  const interestedRaw = scored.filter(x => interests.includes(x.s.subject)).map(x => x.s);
  const recRaw = scored.filter(x => !interests.includes(x.s.subject)).map(x => x.s);

  // Diversify recommended: max 2 same subject in top 12
  const diverseRec = []; const seen = {};
  for (const s of recRaw) {
    seen[s.subject] = (seen[s.subject] || 0);
    if (seen[s.subject] < 2) { diverseRec.push(s); seen[s.subject]++; }
    if (diverseRec.length >= 12) break;
  }

  if (sortKey !== 'recommended') {
    return {
      interested: sortItems(interestedRaw, sortKey, user),
      recommended: sortItems(diverseRec, sortKey, user)
    };
  }
  return { interested: interestedRaw, recommended: diverseRec };
}

// ── SMART SUGGESTIONS ────────────────────────────────────────────
function getSuggestions(query) {
  if (!query || query.length < 1) return [];
  const terms = expandQuery(query);
  const u = STATE.currentUser;
  const seen = new Set(); const sug = [];

  // Score and sort matching summaries
  const scored = MOCK_SUMMARIES
    .filter(s => s.approved)
    .map(s => ({ s, score: _scoreMatch(s, terms, u, STATE.searchMode) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  scored.forEach(({ s }) => {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      sug.push({ text: s.title, sub: s.subject, id: s.id });
    }
  });

  // Subject-level suggestions
  const subSeen = new Set();
  scored.forEach(({ s }) => {
    if (!subSeen.has(s.subject)) {
      subSeen.add(s.subject);
      sug.push({ text: s.subject, sub: 'Browse · ' + s.subject, id: null });
    }
  });

  return sug.slice(0, 8);
}


// ── FOLLOW SYSTEM ─────────────────────────────────────────
function isFollowing(id) { return (STATE.currentUser?.following || []).includes(id); }
function hasMembershipOf(creatorId) { return (STATE.currentUser?.memberships || []).includes(creatorId); }

// In-place save toggle — updates the clicked button without full re-render
async function toggleSaveCard(sid, btn) {
  if (!STATE.loggedIn) { showGuestActionBanner('save'); return; }
  // Optimistic UI: flip immediately based on the clicked button's current
  // state, then reconcile with the server's authoritative response.
  const wasSaved = btn ? btn.classList.contains('btn-amber') : false;
  document.querySelectorAll(`[data-save="${sid}"]`).forEach(b => {
    b.className = `btn ${!wasSaved ? 'btn-amber' : 'btn-surf'} btn-sm card__save-btn`;
    b.innerHTML = `<i class="fas fa-bookmark"></i>${!wasSaved ? ' Unsave' : ' Save'}`;
    b.disabled = true;
  });
  try {
    const result = await api('POST', `/summaries/${sid}/save`);
    const saved = !!result.saved;
    document.querySelectorAll(`[data-save="${sid}"]`).forEach(b => {
      b.className = `btn ${saved ? 'btn-amber' : 'btn-surf'} btn-sm card__save-btn`;
      b.innerHTML = `<i class="fas fa-bookmark"></i>${saved ? ' Unsave' : ' Save'}`;
      b.disabled = false;
    });
    toast(saved ? 'Saved! 🔖' : 'Removed from saved', 'success', 'fa-bookmark');
    logActivity(saved ? 'save_summary' : 'unsave_summary', 'summary', sid);
    if (STATE.route === 'saved') render();
  } catch (e) {
    document.querySelectorAll(`[data-save="${sid}"]`).forEach(b => {
      b.className = `btn ${wasSaved ? 'btn-amber' : 'btn-surf'} btn-sm card__save-btn`;
      b.innerHTML = `<i class="fas fa-bookmark"></i>${wasSaved ? ' Unsave' : ' Save'}`;
      b.disabled = false;
    });
    toast(e.message || 'Could not update saved status', 'error', 'fa-exclamation');
  }
}

async function toggleFollow(targetId) {
  const u = STATE.currentUser; if (!u) { showGuestActionBanner('follow'); return; }
  // Optimistic UI: flip the buttons immediately, then confirm with the server.
  const wasFollowing = isFollowing(targetId);
  document.querySelectorAll(`[data-follow="${targetId}"]`).forEach(btn => {
    btn.className = `btn ${!wasFollowing ? 'btn-surf' : 'btn-amber'} btn-sm`;
    btn.innerHTML = `<i class="fas ${!wasFollowing ? 'fa-check' : 'fa-plus'}"></i> ${!wasFollowing ? 'Following' : 'Follow'}`;
    btn.disabled = true;
  });
  try {
    const result = await api('POST', `/users/${targetId}/follow`);
    if (!u.following) u.following = [];
    const idx = u.following.indexOf(targetId);
    if (result.following && idx < 0) u.following.push(targetId);
    if (!result.following && idx >= 0) u.following.splice(idx, 1);
    toast(result.following ? 'Following! 🎉' : 'Unfollowed', result.following ? 'success' : 'info', result.following ? 'fa-user-plus' : 'fa-user-minus');
    logActivity(result.following ? 'follow' : 'unfollow', 'user', targetId, '');
  } catch (e) {
    toast(e.message || 'Could not update follow status', 'error', 'fa-exclamation');
  }
  document.querySelectorAll(`[data-follow="${targetId}"]`).forEach(btn => {
    const nowFollowing = isFollowing(targetId);
    btn.className = `btn ${nowFollowing ? 'btn-surf' : 'btn-amber'} btn-sm`;
    btn.innerHTML = `<i class="fas ${nowFollowing ? 'fa-check' : 'fa-plus'}"></i> ${nowFollowing ? 'Following' : 'Follow'}`;
    btn.disabled = false;
  });
  updateNotifBadge();
  if (STATE.route === 'following') render();
}

function getUnreadNotifCount() {
  if (!STATE.currentUser) return 0;
  return (STATE.notifications || []).filter(n => !n.read).length;
}
function updateNotifBadge() {
  const c = getUnreadNotifCount();
  const badge = document.getElementById('notifBadge');
  const siB = document.getElementById('siNotifBadge');
  const bnB = document.getElementById('bnNotifBadge');
  [badge, siB, bnB].forEach(el => {
    if (!el) return;
    el.textContent = c || '';
    el.classList.toggle('hidden', !c);
  });
}

// ── MEMBERSHIP ────────────────────────────────────────────
async function joinMembership(creatorId) {
  const u = STATE.currentUser; if (!u) { openSignIn(); return; }
  try {
    const result = await api('POST', `/users/${creatorId}/membership`);
    if (!u.memberships) u.memberships = [];
    const idx = u.memberships.indexOf(creatorId);
    if (result.subscribed && idx < 0) u.memberships.push(creatorId);
    if (!result.subscribed && idx >= 0) u.memberships.splice(idx, 1);
    toast(result.subscribed ? '🎉 Membership activated!' : 'Membership cancelled', result.subscribed ? 'success' : 'info', result.subscribed ? 'fa-crown' : 'fa-times');
  } catch (e) {
    toast(e.message || 'Could not update membership', 'error', 'fa-exclamation');
  }
  render();
}

// ── UTILS ─────────────────────────────────────────────────
function copyShareLink(id) {
  const url = window.location.href.split('#')[0] + '#viewer';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => toast('Link copied! 🔗','info','fa-link')).catch(() => toast('Link: '+url,'info','fa-link'));
  } else {
    toast('Link: '+url,'info','fa-link');
  }
}
function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
function toast(msg, type = 'success', icon = 'fa-circle-check') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div'); el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icon}"></i> ${msg}`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 3200);
}

// ── GUEST ACTION BANNER ────────────────────────────────────
// Shown instead of jumping straight to the sign-in modal whenever a guest
// tries to like/save/follow/comment -- short, explains what they'd get,
// and offers both Sign In and Sign Up right there.
const _GUEST_ACTION_COPY = {
  like:    { icon: 'fa-heart',     title: 'Sign in to like this',
             body: 'Liking helps creators know their work is landing — takes just a few seconds.' },
  save:    { icon: 'fa-bookmark',  title: 'Sign in to save this',
             body: 'Save summaries to build your own reading list and find them again anytime.' },
  follow:  { icon: 'fa-user-plus', title: 'Sign in to follow',
             body: 'Get notified the moment they publish something new.' },
  comment: { icon: 'fa-comments',  title: 'Sign in to join the conversation',
             body: 'Share your thoughts and ask questions — creators often reply.' },
};
function showGuestActionBanner(action, subject) {
  document.querySelectorAll('.guest-action-banner').forEach(b => b.remove());
  const c = _GUEST_ACTION_COPY[action] || _GUEST_ACTION_COPY.like;
  const title = (subject && action === 'follow')
    ? `Sign in to follow ${esc(subject)}`
    : (subject ? `${c.title} ${esc(subject)}` : (action === 'follow' ? 'Sign in to follow this creator' : c.title));
  const el = document.createElement('div');
  el.className = 'guest-action-banner';
  el.innerHTML = `
    <button class="guest-action-banner__close" aria-label="Dismiss" onclick="this.closest('.guest-action-banner').remove()"><i class="fas fa-xmark"></i></button>
    <div class="guest-action-banner__head"><i class="fas ${c.icon}"></i> ${title}</div>
    <div class="guest-action-banner__body">${c.body}</div>
    <div class="guest-action-banner__acts">
      <button class="btn btn-primary btn-sm" onclick="this.closest('.guest-action-banner').remove();openSignIn()"><i class="fas fa-right-to-bracket"></i> Sign In</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.guest-action-banner').remove();openSignUp()"><i class="fas fa-user-plus"></i> Sign Up</button>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 9000);
}

// ── CARD HTML ─────────────────────────────────────────────
function cardHTML(s, tag = '') {
  const icon = SUBJECT_ICONS[s.subject] || '📄';
  const isPromoted = s.is_promoted ?? s.isPromoted;
  const isSponsored = s.is_sponsored ?? s.isSponsored;
  const membershipRequired = s.membership_required ?? s.membershipRequired;
  const authorId = s.author_id || s.authorId || '';
  const au = s.authorData || null;
  const canFollow = STATE.loggedIn && au && STATE.currentUser && au.id !== STATE.currentUser.id;
  const following = canFollow ? isFollowing(au.id) : false;
  const saved = STATE.loggedIn ? !!s.userSaved : false;
  const isNewFromFollowed = canFollow && following && (Date.now() - _ts(s)) < 7 * 24 * 3600 * 1000;
  const memberBadge = membershipRequired
    ? `<span class="badge badge-crown"><i class="fas fa-crown"></i> Member</span>` : '';
  const followBtn = canFollow
    ? `<button class="btn ${following ? 'btn-surf' : 'btn-amber'} btn-sm" data-follow="${au.id}"
         onclick="event.preventDefault();event.stopPropagation();toggleFollow('${au.id}')">
         <i class="fas ${following ? 'fa-check' : 'fa-plus'}"></i> ${following ? 'Following' : 'Follow'}
       </button>` : '';
  const saveBtn = STATE.loggedIn
    ? `<button class="btn ${saved ? 'btn-amber' : 'btn-surf'} btn-sm card__save-btn" data-save="${s.id}"
         onclick="event.preventDefault();event.stopPropagation();toggleSaveCard('${s.id}',this)" title="${saved ? 'Remove from saved' : 'Save'}">
         <i class="fas fa-bookmark"></i>${saved ? ' Unsave' : ' Save'}
       </button>` : '';
  // Banner: use summary's bannerDataUrl (uploaded), bannerColor (seed gradient), or subject-based gradient
  const _BANNER_COLORS = {
    'Physics':     'linear-gradient(135deg,#1a1a4e,#2d2d8f)',
    'Mathematics': 'linear-gradient(135deg,#1a3a1a,#2d7a2d)',
    'Chemistry':   'linear-gradient(135deg,#3a1a1a,#8f2d2d)',
    'Biology':     'linear-gradient(135deg,#1a3a2a,#2d7a4a)',
    'History':     'linear-gradient(135deg,#3a2a1a,#8f5a2d)',
    'Geography':   'linear-gradient(135deg,#1a2a3a,#2d5a7a)',
    'Arabic':      'linear-gradient(135deg,#2a1a3a,#5a2d7a)',
    'English':     'linear-gradient(135deg,#1a2a3a,#2d4a6a)',
    'French':      'linear-gradient(135deg,#3a1a2a,#7a2d4a)',
    'Computer Science': 'linear-gradient(135deg,#0a1a2a,#1a4a6a)',
    'Islamic Studies':  'linear-gradient(135deg,#2a2a0a,#6a6a1a)',
  };
  const bannerStyle = s.bannerDataUrl
    ? `background:url('${s.bannerDataUrl}') center/cover no-repeat`
    : s.bannerColor
    ? `background:${s.bannerColor}`
    : `background:${_BANNER_COLORS[s.subject] || 'linear-gradient(135deg,#1a2030,#2a3550)'}`;
  return `<a href="/summary/${s.id}" class="card ${isSponsored ? 'sponsored' : ''} ${isPromoted ? 'promoted-card' : ''} ${isNewFromFollowed ? 'new-card' : ''}" onclick="navigate('viewer',{id:'${s.id}'});return false;">
    <div class="card__thumb" style="${bannerStyle}">
      <div class="card__thumb-emoji">${icon}</div>
      <div class="card__overlay-badges">
        ${tag === 'Your Curriculum'
            ? `<span class="badge badge-gold" style="background:var(--gold);color:#000"><i class="fas fa-graduation-cap"></i> ${tag}</span>`
            : tag ? `<span class="badge badge-amber"><i class="fas fa-wand-magic-sparkles"></i> ${tag}</span>` : ''}
        ${isPromoted ? `<span class="badge badge-ad"><i class="fas fa-bolt"></i> Promoted</span>` : ''}
        ${memberBadge}
        ${isNewFromFollowed ? `<span class="badge badge-new"><i class="fas fa-bell"></i> New</span>` : ''}
      </div>
      ${isSponsored ? `<div class="card__bottom-badge"><span class="badge badge-surf" style="font-size:9px">Sponsored</span></div>` : ''}
      <div class="card__pages-badge">
        <i class="fas fa-file-lines" style="font-size:9px"></i> ${s.pages}p
      </div>
    </div>
    <div class="card__body">
      <div class="card__title">${s.title}</div>
      <div class="card__meta">
        <span style="color:var(--gold);font-weight:700">${s.subject}</span>
        <span class="card__dot">·</span>
        <span class="card-author-link" onclick="event.preventDefault();event.stopPropagation();navigate('creator',{id:'${authorId}'})">${s.author}</span>
        <span class="card__dot">·</span>
        <span style="font-size:10.5px;color:var(--text3)">${s.grade}</span>
      </div>
      <div class="card__footer">
        <span class="card__stat"><i class="fas fa-eye i-gold"></i> ${fmt(s.views)}</span>
        <span class="card__stat"><i class="fas fa-heart" style="color:var(--coral);font-size:11px"></i> ${fmt(s.likes)}</span>
        <span class="card__stat"><span class="lang-pill">${(s.lang || 'ar').toUpperCase()}</span></span>
        ${saveBtn}
      </div>
      ${followBtn ? `<div class="card__follow-row">${followBtn}${au?.has_membership
        ? `<button class="btn btn-crown btn-sm" onclick="event.preventDefault();event.stopPropagation();navigate('creator',{id:'${au.id}'})"><i class="fas fa-crown"></i> عضوية</button>` : ''}
      </div>` : ''}
    </div>
  </a>`;
}


// ══════════════════════════════════════════════════════════════
//  IMAGE CROP EDITOR
//  Usage: openImageCropper(file, aspectRatio, callback)
//    aspectRatio: 1 = square (profile), 16/9 = banner, null = free
//    callback(dataUrl) called with the cropped image
// ══════════════════════════════════════════════════════════════
function openImageCropper(file, aspectRatio, onSave) {
  document.getElementById('cropOverlay')?.remove();

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => _buildCropModal(img, aspectRatio, onSave);
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function _buildCropModal(img, aspectRatio, onSave) {
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'cropOverlay';
  // Don't close on background click — user is editing

  const CANVAS_W = Math.min(700, window.innerWidth - 32);
  const CANVAS_H = Math.min(460, window.innerHeight - 200);

  ov.innerHTML = `
    <div class="modal" style="max-width:740px;border-radius:var(--radius-lg)">
      <div class="modal-drag"></div>
      <div class="modal-head">
        <div class="modal-title">✂️ Crop Image</div>
        <button class="modal-close" onclick="document.getElementById('cropOverlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" style="padding:16px">
        <p style="font-size:12px;color:var(--text2);margin-bottom:12px">
          <i class="fas fa-hand-pointer" style="color:var(--amber)"></i>
          Drag to move · Scroll or pinch to zoom · The highlighted area will be saved
        </p>
        <canvas id="cropCanvas" width="${CANVAS_W}" height="${CANVAS_H}"
          style="width:100%;border-radius:var(--radius);cursor:grab;touch-action:none;display:block;background:#000"></canvas>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap">
          <label style="font-size:12px;font-weight:700;color:var(--text2)">Zoom:</label>
          <input type="range" id="cropZoom" min="10" max="300" value="100" step="1"
            style="flex:1;accent-color:var(--amber);min-width:80px">
          <span id="cropZoomVal" style="font-size:12px;color:var(--amber);font-weight:700;width:36px">100%</span>
          <button class="btn btn-surf btn-sm" onclick="_cropReset()" title="Reset position & zoom">
            <i class="fas fa-arrows-rotate"></i> Reset
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-surf" onclick="document.getElementById('cropOverlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="_cropSave()">
          <i class="fas fa-check"></i> Apply Crop
        </button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  const canvas = document.getElementById('cropCanvas');
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;

  // Crop box size — locked to aspect ratio, centered, 80% of canvas
  let cropW, cropH;
  if (aspectRatio) {
    if (aspectRatio >= 1) {
      cropW = Math.floor(CW * 0.8);
      cropH = Math.floor(cropW / aspectRatio);
    } else {
      cropH = Math.floor(CH * 0.8);
      cropW = Math.floor(cropH * aspectRatio);
    }
  } else {
    cropW = Math.floor(CW * 0.8);
    cropH = Math.floor(CH * 0.8);
  }
  const cropX = (CW - cropW) / 2;
  const cropY = (CH - cropH) / 2;

  // Image state
  let zoom = 1.0;
  let imgX = CW / 2 - img.width / 2;  // top-left of image in canvas coords
  let imgY = CH / 2 - img.height / 2;

  // Fit image to cover the crop box initially
  const initScale = Math.max(cropW / img.width, cropH / img.height) * 1.05;
  zoom = initScale;
  imgX = CW / 2 - (img.width * zoom) / 2;
  imgY = CH / 2 - (img.height * zoom) / 2;

  window._cropCtx = ctx; window._cropImg = img;
  window._cropState = { zoom, imgX, imgY, CW, CH, cropX, cropY, cropW, cropH };
  window._cropOnSave = onSave;

  const draw = () => {
    const st = window._cropState;
    ctx.clearRect(0, 0, st.CW, st.CH);
    // Draw image
    ctx.drawImage(img, st.imgX, st.imgY, img.width * st.zoom, img.height * st.zoom);
    // Dim outside crop area
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, st.CW, st.cropY);                               // top
    ctx.fillRect(0, st.cropY + st.cropH, st.CW, st.CH - st.cropY - st.cropH); // bottom
    ctx.fillRect(0, st.cropY, st.cropX, st.cropH);                     // left
    ctx.fillRect(st.cropX + st.cropW, st.cropY, st.CW - st.cropX - st.cropW, st.cropH); // right
    // Crop border + corners
    ctx.strokeStyle = 'rgba(255,184,0,0.9)'; ctx.lineWidth = 2;
    ctx.strokeRect(st.cropX, st.cropY, st.cropW, st.cropH);
    // Corner handles
    const cs = 14;
    ctx.strokeStyle = 'var(--gold)'; ctx.lineWidth = 3;
    [[st.cropX,st.cropY],[st.cropX+st.cropW,st.cropY],
     [st.cropX,st.cropY+st.cropH],[st.cropX+st.cropW,st.cropY+st.cropH]].forEach(([cx,cy]) => {
      ctx.beginPath(); ctx.moveTo(cx+(cx<st.CW/2?0:-cs),cy); ctx.lineTo(cx+(cx<st.CW/2?cs:0),cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy+(cy<st.CH/2?0:-cs)); ctx.lineTo(cx,cy+(cy<st.CH/2?cs:0)); ctx.stroke();
    });
    // Grid lines inside crop
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    [1/3,2/3].forEach(f => {
      ctx.beginPath(); ctx.moveTo(st.cropX+st.cropW*f,st.cropY); ctx.lineTo(st.cropX+st.cropW*f,st.cropY+st.cropH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(st.cropX,st.cropY+st.cropH*f); ctx.lineTo(st.cropX+st.cropW,st.cropY+st.cropH*f); ctx.stroke();
    });
  };
  window._cropDraw = draw;
  draw();

  // Zoom slider
  document.getElementById('cropZoom').oninput = (e) => {
    const st = window._cropState;
    const oldZ = st.zoom, newZ = parseInt(e.target.value) / 100;
    const cx = st.CW/2, cy = st.CH/2;
    st.imgX = cx - (cx - st.imgX) * (newZ / oldZ);
    st.imgY = cy - (cy - st.imgY) * (newZ / oldZ);
    st.zoom = newZ;
    document.getElementById('cropZoomVal').textContent = Math.round(newZ*100)+'%';
    draw();
  };

  // Drag
  let dragging = false, lastX = 0, lastY = 0;
  canvas.onmousedown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.style.cursor='grabbing'; };
  window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor='grab'; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const st = window._cropState;
    st.imgX += e.clientX - lastX; st.imgY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY; draw();
  });

  // Scroll to zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const st = window._cropState;
    const factor = e.deltaY < 0 ? 1.07 : 0.93;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (st.CW / rect.width);
    const my = (e.clientY - rect.top) * (st.CH / rect.height);
    const newZ = Math.max(0.1, Math.min(3, st.zoom * factor));
    st.imgX = mx - (mx - st.imgX) * (newZ / st.zoom);
    st.imgY = my - (my - st.imgY) * (newZ / st.zoom);
    st.zoom = newZ;
    const sl = document.getElementById('cropZoom');
    if (sl) { sl.value = Math.round(newZ*100); document.getElementById('cropZoomVal').textContent = Math.round(newZ*100)+'%'; }
    draw();
  }, { passive: false });

  // Touch drag + pinch
  let lastTouches = [];
  canvas.addEventListener('touchstart', e => { e.preventDefault(); lastTouches = [...e.touches]; }, {passive:false});
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const st = window._cropState;
    const rect = canvas.getBoundingClientRect();
    const scaleX = st.CW / rect.width, scaleY = st.CH / rect.height;
    if (e.touches.length === 1 && lastTouches.length >= 1) {
      st.imgX += (e.touches[0].clientX - lastTouches[0].clientX) * scaleX;
      st.imgY += (e.touches[0].clientY - lastTouches[0].clientY) * scaleY;
    } else if (e.touches.length === 2 && lastTouches.length >= 2) {
      const d1 = Math.hypot(lastTouches[0].clientX-lastTouches[1].clientX, lastTouches[0].clientY-lastTouches[1].clientY);
      const d2 = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      if (d1 > 0) {
        const factor = d2 / d1;
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const cx = (mx - rect.left) * scaleX, cy = (my - rect.top) * scaleY;
        const newZ = Math.max(0.1, Math.min(3, st.zoom * factor));
        st.imgX = cx - (cx - st.imgX) * (newZ / st.zoom);
        st.imgY = cy - (cy - st.imgY) * (newZ / st.zoom);
        st.zoom = newZ;
      }
    }
    lastTouches = [...e.touches];
    draw();
  }, {passive:false});
}

function _cropReset() {
  const st = window._cropState; const img = window._cropImg;
  const initScale = Math.max(st.cropW / img.width, st.cropH / img.height) * 1.05;
  st.zoom = initScale;
  st.imgX = st.CW / 2 - (img.width * st.zoom) / 2;
  st.imgY = st.CH / 2 - (img.height * st.zoom) / 2;
  const sl = document.getElementById('cropZoom');
  if (sl) { sl.value = Math.round(initScale*100); document.getElementById('cropZoomVal').textContent = Math.round(initScale*100)+'%'; }
  window._cropDraw?.();
}

function _cropSave() {
  const st = window._cropState; const img = window._cropImg;
  // Render cropped region to an output canvas
  const out = document.createElement('canvas');
  out.width = st.cropW; out.height = st.cropH;
  const octx = out.getContext('2d');
  // srcX/Y: the image pixel that appears at cropX/Y on the canvas
  const srcX = (st.cropX - st.imgX) / st.zoom;
  const srcY = (st.cropY - st.imgY) / st.zoom;
  const srcW = st.cropW / st.zoom;
  const srcH = st.cropH / st.zoom;
  octx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, st.cropW, st.cropH);
  const dataUrl = out.toDataURL('image/jpeg', 0.92);
  document.getElementById('cropOverlay').remove();
  window._cropOnSave?.(dataUrl);
}

// ── Shortcut helpers called from profile/upload/settings ─────
// Profile photo (1:1 square)
function openProfilePhotoCropper(file, callback) {
  openImageCropper(file, 1, callback);
}
// Banner (16:9 wide)
function openBannerCropper(file, callback) {
  openImageCropper(file, 16/9, callback);
}
// Summary banner (3:1 wide strip)
function openSummaryBannerCropper(file, callback) {
  openImageCropper(file, 3/1, callback);
}


// ── Profile photo/banner edit handlers ───────────────────────
function previewPhoto_profile(input) {
  const file = input?.files?.[0]; if (!file) return;
  if (file.size > 8*1024*1024) { toast('Max 8MB','error','fa-exclamation'); return; }
  openImageCropper(file, 1, (dataUrl) => {
    const u = STATE.currentUser; if (!u) return;
    u.photo = dataUrl; u.profile_photo = dataUrl; // keep in sync
    // Update avatar in nav
    const av = document.getElementById('navAvatar');
    if (av) {
      av.innerHTML = `<img src="${dataUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">`;
    }
    // Update avatar on profile page
    const pav = document.getElementById('profileAvatar');
    if (pav) {
      pav.style.background = `url('${dataUrl}') center/cover`;
      pav.style.fontSize = '0';
    }
    toast('Profile photo updated! 📸', 'success', 'fa-camera');
  });
}
function previewBanner_profile(input) {
  const file = input?.files?.[0]; if (!file) return;
  if (file.size > 8*1024*1024) { toast('Max 8MB','error','fa-exclamation'); return; }
  openImageCropper(file, 16/9, (dataUrl) => {
    const u = STATE.currentUser; if (!u) return;
    u.bannerDataUrl = dataUrl;
    const banner = document.getElementById('profileBanner');
    if (banner) banner.style.background = `url('${dataUrl}') center/cover no-repeat`;
    toast('Banner updated! 🖼️', 'success', 'fa-image');
  });
}

// ══════════════════════════════════════════════════════════════
//  PASSWORD UTILITIES
// ══════════════════════════════════════════════════════════════

// In-memory store for reset tokens: { token -> { email, expires } }
const RESET_TOKENS = {};

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Simulate sending a reset email — in real app this calls the backend
function sendResetEmail(email) {
  const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    // Don't reveal whether email exists for security
    return true;
  }
  const token = generateToken();
  RESET_TOKENS[token] = { email: user.email, expires: Date.now() + 15 * 60 * 1000 }; // 15 min
  // In production this is sent via email (backend /auth/forgot-password route handles it).
  // In mock/demo mode the token is shown in the UI only.
  window._lastResetToken = token;
  window._lastResetEmail = user.email;
  return true;
}

function validateResetToken(token) {
  const entry = RESET_TOKENS[token];
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    delete RESET_TOKENS[token];
    return null;
  }
  return entry.email;
}

function doPasswordReset(token, newPassword) {
  const email = validateResetToken(token);
  if (!email) return false;
  const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return false;
  user.password = newPassword;
  delete RESET_TOKENS[token];
  window._lastResetToken = null;
  return true;
}

// ══════════════════════════════════════════════════════════════
//  AUTH MODALS
// ══════════════════════════════════════════════════════════════

function openSignIn() {
  closeAnyModal();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'siOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title">👋 Sign In</div>
      <button class="modal-close" onclick="document.getElementById('siOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="fgrid">
        <div class="field"><label>Email</label>
          <input class="input" id="si-email" type="email" placeholder="your@email.com" autofocus>
        </div>
        <div class="field">
          <label>Password</label>
          <div style="position:relative">
            <input class="input" id="si-pass" type="password" placeholder="••••••••"
              onkeydown="if(event.key==='Enter')submitSignIn()" style="padding-right:44px">
            <button onclick="togglePassVis('si-pass',this)" type="button"
              style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px">
              <i class="fas fa-eye"></i></button>
          </div>
        </div>
      </div>
      <div style="text-align:right;margin-top:6px">
        <span style="font-size:12px;color:var(--amber);cursor:pointer;font-weight:700"
          onclick="document.getElementById('siOverlay').remove();openForgotPassword()">
          Forgot password?
        </span>
      </div>
      <div id="si-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none" role="alert"></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:16px" onclick="submitSignIn()">
        <i class="fas fa-right-to-bracket"></i> Sign In
      </button>
      <div style="text-align:center;margin-top:14px;font-size:12px;color:var(--text2)">
        No account?
        <span style="color:var(--amber);cursor:pointer;font-weight:700"
          onclick="document.getElementById('siOverlay').remove();openSignUp()">
          Sign Up Free →
        </span>
      </div>
      <div class="info-box" style="margin-top:14px">
        <b>Demo accounts (password = name + 123):</b><br>
        ahmed@example.com · mona@example.com · nour@example.com<br>
        yousef@example.com · fatima@example.com · hana@example.com<br>
        admin@mol5sat.org / admin123
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

function togglePassVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    inp.type = 'password';
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

function doSignIn() {
  const email = (document.getElementById('si-email')?.value || '').trim().toLowerCase();
  const pass = (document.getElementById('si-pass')?.value || '');
  const user = MOCK_USERS.find(u => u.email.toLowerCase() === email);
  if (!user) { throw new Error('Email not found. Check the demo list below.'); }
  if (user.status === 'banned') { throw new Error('This account has been banned.'); }
  if (user.password && pass !== user.password) { throw new Error('Incorrect password. Try again.'); }
  STATE.currentUser = user; STATE.loggedIn = true;
  try { localStorage.setItem('mol5sat_session', JSON.stringify({userId: user.id})); } catch(e){}
  logActivity('login', 'user', user.id, `Signed in as ${user.name}`);
  persistState();
}

// ── FORGOT PASSWORD ────────────────────────────────────────
function openForgotPassword() {
  closeAnyModal();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'fpOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title">🔑 Forgot Password</div>
      <button class="modal-close" onclick="document.getElementById('fpOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" id="fpBody">
      ${renderFpStep1()}
    </div>
  </div>`;
  document.body.appendChild(ov);
}

function renderFpStep1() {
  return `<p style="font-size:13px;color:var(--text2);margin-bottom:18px;line-height:1.6">
    Enter the email address associated with your account and we'll send you a reset link.
  </p>
  <div class="fgrid">
    <div class="field"><label>Email Address</label>
      <input class="input gf" id="fp-email" type="email" placeholder="your@email.com" autofocus>
    </div>
  </div>
  <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="doForgotPassword()">
    <i class="fas fa-paper-plane"></i> Send Reset Link
  </button>
  <div style="text-align:center;margin-top:14px;font-size:12px;color:var(--text2)">
    Remember your password?
    <span style="color:var(--amber);cursor:pointer;font-weight:700"
      onclick="document.getElementById('fpOverlay').remove();openSignIn()">Sign In →</span>
  </div>`;
}

function doForgotPassword() {
  const email = (document.getElementById('fp-email')?.value || '').trim();
  if (!email) { toast('Please enter your email', 'error', 'fa-exclamation'); return; }
  sendResetEmail(email);
  // Show confirmation regardless (security best practice)
  const body = document.getElementById('fpBody');
  if (body) {
    const found = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    body.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:16px">📧</div>
        <div style="font-family:var(--fd);font-size:17px;font-weight:800;margin-bottom:8px;color:var(--gold)">
          Check your inbox!
        </div>
        <p style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:20px">
          If <b style="color:var(--text)">${email}</b> is registered, you'll receive a reset link within minutes.
        </p>
        ${found && window._lastResetToken ? `
        <div class="info-box" style="text-align:left;margin-bottom:18px">
          <b>🔧 Demo mode — your reset token:</b><br>
          <span style="font-family:monospace;font-size:11px;word-break:break-all;color:var(--amber)">${window._lastResetToken}</span><br>
          <span style="font-size:11px;color:var(--text3)">Token expires in 15 minutes.</span>
        </div>
        <button class="btn btn-primary btn-block" onclick="openResetPassword('${window._lastResetToken}')">
          <i class="fas fa-key"></i> Use This Token Now
        </button>` : ''}
        <button class="btn btn-surf btn-block" style="margin-top:10px"
          onclick="document.getElementById('fpOverlay').remove();openSignIn()">
          <i class="fas fa-arrow-left"></i> Back to Sign In
        </button>
      </div>`;
  }
}

// ── RESET PASSWORD ─────────────────────────────────────────
function openResetPassword(token) {
  closeAnyModal();
  // Validate token first
  const email = validateResetToken(token);
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'rpOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  if (!email) {
    ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
      <div class="modal-head">
        <div class="modal-title">❌ Invalid Link</div>
        <button class="modal-close" onclick="document.getElementById('rpOverlay').remove()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="text-align:center;padding:30px 20px">
        <div style="font-size:44px;margin-bottom:14px">⏰</div>
        <div style="font-family:var(--fd);font-size:17px;font-weight:800;margin-bottom:8px">Link Expired</div>
        <p style="font-size:13px;color:var(--text2);margin-bottom:20px">
          This reset link has expired or already been used. Please request a new one.
        </p>
        <button class="btn btn-amber btn-block" onclick="document.getElementById('rpOverlay').remove();openForgotPassword()">
          <i class="fas fa-envelope"></i> Request New Link
        </button>
      </div>
    </div>`;
    document.body.appendChild(ov); return;
  }
  ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title">🔑 Reset Password</div>
      <button class="modal-close" onclick="document.getElementById('rpOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text2);margin-bottom:18px">
        Resetting password for <b style="color:var(--text)">${email}</b>
      </p>
      <div class="fgrid">
        <div class="field"><label>New Password</label>
          <div style="position:relative">
            <input class="input gf" id="rp-pass1" type="password" placeholder="Min 8 characters" style="padding-right:44px">
            <button onclick="togglePassVis('rp-pass1',this)" type="button"
              style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px">
              <i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div class="field"><label>Confirm New Password</label>
          <div style="position:relative">
            <input class="input gf" id="rp-pass2" type="password" placeholder="Repeat password" style="padding-right:44px"
              onkeydown="if(event.key==='Enter')doResetPassword('${token}')">
            <button onclick="togglePassVis('rp-pass2',this)" type="button"
              style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px">
              <i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div id="rp-strength" style="font-size:11px;color:var(--text3);margin-top:-6px"></div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px"
        onclick="doResetPassword('${token}')">
        <i class="fas fa-shield-halved"></i> Reset Password
      </button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  // Live password strength indicator
  setTimeout(() => {
    const p1 = document.getElementById('rp-pass1');
    if (p1) p1.addEventListener('input', () => {
      const str = document.getElementById('rp-strength');
      if (!str) return;
      const v = p1.value;
      if (v.length === 0) { str.textContent = ''; return; }
      const score = (v.length >= 8 ? 1 : 0) + (/[A-Z]/.test(v) ? 1 : 0) +
        (/[0-9]/.test(v) ? 1 : 0) + (/[^A-Za-z0-9]/.test(v) ? 1 : 0);
      const labels = ['', 'Weak 🔴', 'Fair 🟡', 'Good 🟢', 'Strong 💪'];
      str.innerHTML = `Strength: <b>${labels[score] || labels[1]}</b>`;
    });
  }, 100);
}

function doResetPassword(token) {
  const p1 = (document.getElementById('rp-pass1')?.value || '');
  const p2 = (document.getElementById('rp-pass2')?.value || '');
  if (p1.length < 8) { toast('Password must be at least 8 characters', 'error', 'fa-lock'); return; }
  if (p1 !== p2) { toast('Passwords do not match', 'error', 'fa-times'); return; }
  const success = doPasswordReset(token, p1);
  if (success) {
    const ov = document.getElementById('rpOverlay');
    if (ov) {
      const body = ov.querySelector('.modal-body');
      if (body) body.innerHTML = `
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <div style="font-family:var(--fd);font-size:18px;font-weight:800;margin-bottom:8px;color:var(--gold)">
            Password Updated!
          </div>
          <p style="font-size:13px;color:var(--text2);margin-bottom:22px;line-height:1.6">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <button class="btn btn-primary btn-block btn-lg"
            onclick="document.getElementById('rpOverlay').remove();openSignIn()">
            <i class="fas fa-right-to-bracket"></i> Sign In Now
          </button>
        </div>`;
    }
    toast('Password reset successfully! 🎉', 'success', 'fa-circle-check');
  } else {
    toast('Reset link expired. Please request a new one.', 'error', 'fa-clock');
    document.getElementById('rpOverlay')?.remove();
    openForgotPassword();
  }
}

// ── SIGN UP ────────────────────────────────────────────────
var _suType = window._suType = 'student';

function openSignUp() {
  closeAnyModal();
  const defaultCountry = 'Egypt';
  const cData = COUNTRIES[defaultCountry] || {};
  const countryOpts = ALL_COUNTRIES.map(c => `<option value="${c}" ${c === defaultCountry ? 'selected' : ''}>${c}</option>`).join('');
  const schoolOpts = (cData.schoolTypes || ['General']).map(t => `<option>${t}</option>`).join('');
  const gradeOpts = (cData.grades || ['General']).map(g => `<option>${g}</option>`).join('');
  const specOpts = getCollegeCategoriesForCountry(defaultCountry).map(c => `<option>${c}</option>`).join('');
  _suType = 'student';
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'suOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--wide"><div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title">✨ Create Account</div>
      <button class="modal-close" onclick="document.getElementById('suOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="fgrid">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px">
          <div class="avatar-upload-wrap" onclick="triggerPhotoUpload('su-photo-inp','su-av-preview','su-av-initials')" title="Add profile photo (optional)">
            <div class="av-initials" id="su-av-initials" style="width:64px;height:64px;font-size:22px">?</div>
            <img class="av-img hidden" id="su-av-preview" style="width:64px;height:64px" src="" alt="Photo">
            <div class="av-overlay"><i class="fas fa-camera"></i></div>
          </div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:3px">PROFILE PHOTO <span style="color:var(--text3)">(optional)</span></div>
            <div style="font-size:11px;color:var(--text3)">JPG or PNG · max 2MB · click to upload</div>
          </div>
          <input type="file" id="su-photo-inp" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="previewPhoto(this,'su-av-preview','su-av-initials')">
        </div>
        <div class="fgrid fgrid2">
          <div class="field"><label>Full Name *</label>
            <input class="input gf" id="su-name" placeholder="Your name" autofocus oninput="updateSignupInitials(this.value)">
          </div>
          <div class="field"><label>Email *</label>
            <input class="input" id="su-email" type="email" placeholder="your@email.com">
          </div>
        </div>
        <div class="field"><label>Password *</label>
          <div style="position:relative">
            <input class="input" id="su-pass" type="password" placeholder="Min 8 characters" style="padding-right:44px">
            <button onclick="togglePassVis('su-pass',this)" type="button"
              style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px">
              <i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div class="field"><label>I am a…</label>
          <div class="radio-cards">
            <div class="radio-card sel" id="su-rc-student" onclick="suSetType('student')">
              <div class="rc-icon">🎒</div><div class="rc-title">Student</div>
              <div class="rc-sub">K-12 / secondary school</div>
            </div>
            <div class="radio-card" id="su-rc-colleague" onclick="suSetType('colleague')">
              <div class="rc-icon">🎓</div><div class="rc-title">Colleague</div>
              <div class="rc-sub">University / higher education</div>
            </div>
          </div>
        </div>
        <div class="field"><label>Country *</label>
          <select class="select" id="su-country" onchange="suCountryChange()">${countryOpts}</select>
        </div>
        <div id="su-student-sec">
          <div class="fgrid fgrid2">
            <div class="field"><label>School Type</label>
              <select class="select" id="su-school">${schoolOpts}</select>
            </div>
            <div class="field"><label>Grade</label>
              <select class="select" id="su-grade">${gradeOpts}</select>
            </div>
          </div>
        </div>
        <div id="su-colleague-sec" style="display:none">
          <div class="fgrid fgrid2">
            <div class="field"><label>Specialization</label>
              <select class="select" id="su-spec">${specOpts}</select>
            </div>
            <div class="field"><label>Major / Program</label>
              <input class="input" id="su-major" placeholder="e.g. Software Engineering">
            </div>
          </div>
        </div>
        <div class="field"><label>Science Interests (optional)</label>
          <div class="chip-grid">
            ${SUBJECTS.map(s => `<div class="chip" onclick="this.classList.toggle('sel')" data-subj="${s}">${s}</div>`).join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:20px" onclick="doSignUp()">
        <i class="fas fa-user-plus"></i> Create Account
      </button>
      <div style="text-align:center;margin-top:14px;font-size:12px;color:var(--text2)">
        Already have an account?
        <span style="color:var(--amber);cursor:pointer;font-weight:700"
          onclick="document.getElementById('suOverlay').remove();openSignIn()">Sign In →</span>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

function suSetType(t) {
  _suType = t;
  document.getElementById('su-rc-student').className = 'radio-card ' + (t === 'student' ? 'sel' : '');
  document.getElementById('su-rc-colleague').className = 'radio-card ' + (t === 'colleague' ? 'sel-a' : '');
  document.getElementById('su-student-sec').style.display = t === 'student' ? '' : 'none';
  document.getElementById('su-colleague-sec').style.display = t === 'colleague' ? '' : 'none';
}
function suCountryChange() {
  const c = document.getElementById('su-country').value; const d = COUNTRIES[c] || {};
  const se = document.getElementById('su-school'); const ge = document.getElementById('su-grade');
  const spe = document.getElementById('su-spec');
  if (se) se.innerHTML = (d.schoolTypes || ['General']).map(t => `<option>${t}</option>`).join('');
  if (ge) ge.innerHTML = (d.grades || ['General']).map(g => `<option>${g}</option>`).join('');
  const cats = getCollegeCategoriesForCountry(c);
  if (spe) spe.innerHTML = cats.map(cat => `<option>${cat}</option>`).join('');
}
// doSignUp can be called directly (old modal) or with a payload from submitSignUp
async function doSignUp(payload) {
  // If called with a payload object (from submitSignUp in ui.js), use that
  const name  = payload?.name  || (document.getElementById('su-name')?.value  || '').trim();
  const email = payload?.email || (document.getElementById('su-email')?.value || '').trim();
  const pass  = payload?.password || (document.getElementById('su-pass')?.value || '');
  const username = payload?.username || '';
  if (!name || !email) throw new Error('Please fill in Name and Email.');
  if (!guardInput(name, 'Display name')) throw new Error('Invalid name');
  if (pass && pass.length < 6) throw new Error('Password must be at least 6 characters.');
  if (MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()))
    throw new Error('Email already registered. Sign in instead.');
  if (username && MOCK_USERS.find(u => u.username === username))
    throw new Error('Username already taken. Try another.');
  const interests = payload?.interests || [...document.querySelectorAll('#suOverlay .chip.sel')].map(el => el.dataset.subj).filter(Boolean);
  const photo = payload?.profile_photo || window._suPhotoDataUrl || null;
  const ut = payload?.user_type || _suType || 'student';
  const newUser = {
    id: 'u_' + Date.now(), name, email, username, password: pass || 'changeme',
    role: 'student', userType: ut, profile_photo: photo || '',
    country: payload?.country || document.getElementById('su-country')?.value || 'Egypt',
    school: ut === 'student' ? (payload?.school || document.getElementById('su-school')?.value || '') : '',
    grade: ut === 'student' ? (payload?.grade  || document.getElementById('su-grade')?.value  || '') : '',
    specialization: ut === 'colleague' ? (payload?.specialization || document.getElementById('su-spec')?.value || '') : '',
    major: ut === 'colleague' ? (payload?.major || document.getElementById('su-major')?.value || '') : '',
    joined: new Date().toISOString().slice(0, 10),
    status: 'active', uploads: 0, followers: 0, following: [], interests,
    notifications: [], hasMembership: false, membershipPrice: 0, membershipPerks: ''
  };
  MOCK_USERS.push(newUser);
  STATE.currentUser = newUser; STATE.loggedIn = true;
  try { localStorage.setItem('mol5sat_session', JSON.stringify({userId: newUser.id})); } catch(e){}
  logActivity('register', 'user', newUser.id, `Registered: ${newUser.name}`);
  persistState();
  updateNavForUser();
}

function closeAnyModal() {
  ['siOverlay', 'suOverlay', 'uploadOverlay', 'fpOverlay', 'rpOverlay'].forEach(id => {
    const el = document.getElementById(id); if (el) el.remove();
  });
}

// ── PROFILE PHOTO UTILS ───────────────────────────────────────
function triggerPhotoUpload(inputId, previewId, initialsId) {
  document.getElementById(inputId)?.click();
}
// previewPhoto — opens the crop editor before committing
function previewPhoto(input, previewId, initialsId, aspectRatio) {
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('Image too large — max 8MB', 'error', 'fa-exclamation'); return; }
  // aspect: 1 for profile photo, null means auto-detect from context
  const ar = aspectRatio != null ? aspectRatio : 1; // default square for profile
  openImageCropper(file, ar, (dataUrl) => {
    window._pendingPhoto = dataUrl;
    const prev = document.getElementById(previewId);
    const init = document.getElementById(initialsId);
    if (prev) { prev.src = dataUrl; prev.classList.remove('hidden'); }
    if (init) init.classList.add('hidden');
    toast('Photo cropped! ✂️ Click Save to apply.', 'success', 'fa-check');
  });
}
// previewBanner — opens crop editor with wide 16:9 ratio for banners
function previewBanner(input, previewId, storeKey) {
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('Image too large — max 8MB', 'error', 'fa-exclamation'); return; }
  openImageCropper(file, 16/9, (dataUrl) => {
    if (storeKey) {
      if (typeof US !== 'undefined') US[storeKey] = dataUrl;
      window['_pending_' + storeKey] = dataUrl;
    }
    const prev = document.getElementById(previewId);
    if (prev) {
      prev.style.background = `url('${dataUrl}') center/cover no-repeat`;
      prev.style.opacity = '1';
    }
    toast('Banner cropped! ✂️ Click Save to apply.', 'success', 'fa-check');
  });
}
// previewSummaryBanner — 3:1 strip for summary cards
function previewSummaryBanner(input, previewId) {
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('Image too large — max 8MB', 'error', 'fa-exclamation'); return; }
  openImageCropper(file, 3/1, (dataUrl) => {
    if (typeof US !== 'undefined') US.bannerDataUrl = dataUrl;
    const prev = document.getElementById(previewId);
    if (prev) {
      prev.style.background = `url('${dataUrl}') center/cover no-repeat`;
      prev.style.opacity = '1';
    }
    toast('Summary banner cropped! ✂️', 'success', 'fa-check');
  });
}
function updateSignupInitials(name) {
  const init = document.getElementById('su-av-initials');
  const prev = document.getElementById('su-av-preview');
  if (!init || (prev && !prev.classList.contains('hidden'))) return;
  const initials = name.trim().split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase() || '?';
  init.textContent = initials;
}

// ── initAuth: restore session from localStorage ──────────────
async function initAuth() {
  // First restore all persisted MOCK data (users, summaries, bans, log)
  restorePersistedState();
  try {
    const saved = localStorage.getItem('mol5sat_session');
    if (saved) {
      const { userId } = JSON.parse(saved);
      const user = MOCK_USERS.find(u => u.id === userId);
      if (user && user.status !== 'banned') {
        STATE.currentUser = user;
        STATE.loggedIn = true;
        return true;
      }
      localStorage.removeItem('mol5sat_session');
    }
  } catch(e) {}
  return false;
}

// ── loadNotifications: refresh unread count in STATE ─────────
async function loadNotifications() {
  const u = STATE.currentUser;
  if (!u) { STATE.notifications = []; STATE.unreadCount = 0; return; }
  try {
    const notifs = await api('GET', '/users/me/notifications');
    STATE.notifications = Array.isArray(notifs) ? notifs.map(_nn) : [];
  } catch (e) {
    if (e && /session expired/i.test(e.message || '')) {
      // api() already cleared the token and redirected to landing — that
      // navigate() call triggered its own render() while we were still
      // awaiting here. Don't keep going: continuing on would build a
      // notifications page with stale data and paint over the redirect
      // that's already in flight. Re-throw so the caller (renderNotifications)
      // stops too, instead of silently finishing as if nothing happened.
      STATE.notifications = []; STATE.unreadCount = 0;
      throw e;
    }
    // Any other failure (network hiccup, server error) — fall back to
    // whatever we already have rather than wiping the list.
    STATE.notifications = STATE.notifications || u.notifications || [];
  }
  STATE.unreadCount = STATE.notifications.filter(n => !n.read).length;
  updateNotifBadge();
}

// ── updateMeta: set document title / og tags per page ────────
function updateMeta(opts = {}) {
  const title = opts.title ? `${opts.title} — Mol5sat` : 'Mol5sat — ملخصات · Learn · Worldwide';
  document.title = title;
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && opts.desc) ogDesc.setAttribute('content', opts.desc);
}

// ── esc: HTML-escape helper used in pages.js ─────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── timeAgo: human-readable relative time ─────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const d = typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  if (diff < 86400*7) return Math.floor(diff/86400) + 'd ago';
  return new Date(d).toLocaleDateString();
}

// ── openNotifPanel: navigate to notifications page ─────────
function openNotifPanel() { navigate('notifications'); }

// ═══════════════════════════════════════════════════════════════
//  API STUB — frontend-only demo, covers every endpoint called
//  by pages.js and ui.js. api.js overrides this with real backend.
// ═══════════════════════════════════════════════════════════════
async function _mockApiImpl(method, endpoint, body, isFormData) {
  await new Promise(r => setTimeout(r, 60)); // tiny delay for realism
  const u = STATE.currentUser;
  const uid = u?.id || 'guest';
  const ep = endpoint.split('?')[0]; // strip query string for matching

  // ── /summaries/feed ─────────────────────────────────────────
  if (ep === '/summaries/feed') {
    const params = new URLSearchParams(endpoint.split('?')[1] || '');
    const sort = params.get('sort') || 'recommended';
    const tab  = STATE.activeTab || (STATE.loggedIn ? 'curriculum' : 'science');
    let items  = MOCK_SUMMARIES.filter(s => s.approved && s.audience !== 'colleagues');

    if (!STATE.loggedIn || !u) {
      // Guest: science feed sorted by most viewed by default
      if (sort === 'recommended') return sortItems(items, 'views', null);
      return sortItems(items, sort, null);
    }

    if (tab === 'curriculum') {
      // Strict: exact same country AND exact same grade
      const curr = items.filter(s => s.country === u.country && s.grade === u.grade);
      // Promoted from anywhere fill gaps
      const promoted = items.filter(s => s.isPromoted && !curr.find(x => x.id === s.id));
      const sortedPromoted = sortItems(promoted, sort, u);
      const sortedCurr     = sortItems(curr, sort, u);
      return [...sortedPromoted, ...sortedCurr];
    }

    // Science feed: all items but scored by proximity to user's curriculum
    // When sort is recommended, apply smart proximity scoring
    if (sort === 'recommended') {
      const userGradeIdx = getGradeIndex(u.country, u.grade);
      const langPref = getLangPreference(u.country);
      const following = u.following || [];
      const interests = u.interests || [];
      const scored = items.map(s => {
        let sc = _engS(s) * _recencyFactor(s.createdAt) * 0.012;
        // Proximity: user's exact curriculum floats to the top
        if (s.country === u.country) {
          sc += 15;
          const sIdx = getGradeIndex(u.country, s.grade);
          if (userGradeIdx >= 0 && sIdx >= 0) {
            const dist = Math.abs(userGradeIdx - sIdx);
            sc += dist === 0 ? 30 : dist === 1 ? 16 : dist === 2 ? 7 : dist === 3 ? 2 : 0;
          }
        }
        if (interests.includes(s.subject)) sc += 18;
        if (following.includes(s.authorId)) sc += 22;
        const li = langPref.indexOf(s.lang);
        sc += li === 0 ? 8 : li === 1 ? 3 : 0;
        if (s.isPromoted) sc += 10;
        return { s, sc };
      }).sort((a, b) => b.sc - a.sc);
      return scored.map(x => x.s);
    }

    // Advanced: filter to grades above user's
    if (sort === 'advanced') {
      const target = STATE.advancedTarget || null;
      const advGrades = getAdvancedGrades(u.country, u.grade, target);
      items = items.filter(s =>
        s.grade === 'University' ||
        advGrades.includes(s.grade) ||
        (target === 'University' && s.grade === 'University')
      );
    }

    return sortItems(items, sort, u);
  }

  // ── /summaries (search) ──────────────────────────────────────
  if (method === 'GET' && ep === '/summaries') {
    const params = new URLSearchParams(endpoint.split('?')[1] || '');
    const q       = params.get('q') || '';
    const sort    = params.get('sort') || 'recommended';
    const mode    = params.get('mode') || STATE.searchMode || 'science';
    const subject = params.get('subject') || '';
    const lang    = params.get('lang') || '';
    let items = MOCK_SUMMARIES.filter(s => s.approved && s.audience !== 'colleagues');

    // Curriculum mode: STRICT — same country + same grade
    if (mode === 'curriculum' && u) {
      items = items.filter(s =>
        s.country === u.country &&
        (!u.grade || !s.grade || s.grade === u.grade)
      );
    }

    // Advanced sort: filter to grades above user's
    if (sort === 'advanced' && u) {
      const target = STATE.advancedTarget || null;
      const advGrades = getAdvancedGrades(u.country, u.grade, target);
      items = items.filter(s => s.grade === 'University' || advGrades.includes(s.grade));
    }

    if (q) {
      const terms = expandQuery(q);
      items = items.filter(s => titleMatchesQuery(s, terms));
    }
    if (subject) items = items.filter(s => s.subject.toLowerCase() === subject.toLowerCase());
    if (lang)    items = items.filter(s => s.lang === lang);

    if (sort === 'curriculum') return sortItems(items, 'curriculum', u);
    return sortItems(items, sort, u);
  }

  // ── /summaries/pending ───────────────────────────────────────
  if (method === 'GET' && ep === '/summaries/pending') {
    return MOCK_SUMMARIES.filter(s => !s.approved).map(s => ({
      ...s, author_name: MOCK_USERS.find(x => x.id === s.authorId)?.name || s.author
    }));
  }

  // ── /summaries/user/saves ────────────────────────────────────
  if (method === 'GET' && ep === '/summaries/user/saves') {
    return [...getUserSaved()].map(id => MOCK_SUMMARIES.find(s => s.id === id)).filter(Boolean);
  }

  // ── /summaries/:id (single) ──────────────────────────────────
  if (method === 'GET' && ep.startsWith('/summaries/')) {
    const id = ep.split('/')[2];
    const s = MOCK_SUMMARIES.find(x => x.id === id);
    if (!s) throw new Error('Summary not found');
    const au = MOCK_USERS.find(x => x.id === s.authorId);
    const isMemberOnly = !!s.membershipRequired;
    const hasMember = isMemberOnly
      ? (u?.id === s.authorId || !!USER_MEMBERSHIPS[`${u?.id}_${s.authorId}`])
      : true;
    return {
      ...s,
      // snake_case aliases (what renderViewer reads)
      author_id:        s.authorId,
      author_username:  au?.username || '',
      is_paid:          !!s.isPaid,
      ad_every:         s.adEvery || 0,
      ad_duration_seconds: s.adDuration || 10,
      membership_required: isMemberOnly,
      // Viewer-specific computed fields
      userHasMembership: hasMember,
      userLiked: false,
      userSaved: typeof isSaved !== 'undefined' ? isSaved(s.id) : false,
      authorData: au ? { ...au, has_membership: !!au.hasMembership,
        membership_price: au.membershipPrice || 0,
        membership_perks: au.membershipPerks || '' } : null,
      // Content
      content: (typeof SUMMARY_CONTENT !== 'undefined' && SUMMARY_CONTENT[s.id])
        ? SUMMARY_CONTENT[s.id].pages[0]
        : `<h2>Chapter 1: Introduction</h2><p>This summary covers <b>${s.subject}</b> — <b>${s.grade || 'all grades'}</b>.</p><h3>Key Concepts</h3><p>All content verified by the Mol5sat supervision team.</p>`,
      companyAds: s.companyAds || [],
      author_name: au?.name || s.author,
      author_photo: au?.photo || au?.profile_photo || null,
    };
  }

  // ── /summaries/:id/like ──────────────────────────────────────
  if (method === 'POST' && ep.includes('/like')) {
    const id = ep.split('/')[2];
    const s = MOCK_SUMMARIES.find(x => x.id === id);
    if (s) { s.likes = (s.likes || 0) + 1; s.views = (s.views || 0) + 1; }
    return { likes: s?.likes || 0, liked: true };
  }

  // ── /summaries/:id/save ──────────────────────────────────────
  if (method === 'POST' && ep.includes('/save')) {
    const id = ep.split('/')[2];
    toggleSave(id);
    return { saved: isSaved(id) };
  }

  // ── /summaries/:id/approve ───────────────────────────────────
  if (method === 'PATCH' && ep.includes('/approve')) {
    const id = ep.split('/')[2];
    const s = MOCK_SUMMARIES.find(x => x.id === id);
    if (s) s.approved = true;
    return { ok: true };
  }

  // ── /summaries/:id/decline ───────────────────────────────────
  if (method === 'PATCH' && ep.includes('/decline')) {
    const id = ep.split('/')[2];
    const idx = MOCK_SUMMARIES.findIndex(x => x.id === id);
    if (idx >= 0) MOCK_SUMMARIES.splice(idx, 1);
    return { ok: true };
  }

  // ── DELETE /summaries/:id ────────────────────────────────────
  if (method === 'DELETE' && ep.startsWith('/summaries/')) {
    const id = ep.split('/')[2];
    const idx = MOCK_SUMMARIES.findIndex(x => x.id === id);
    if (idx >= 0) MOCK_SUMMARIES.splice(idx, 1);
    return { ok: true };
  }

  // ── POST /summaries (upload) ─────────────────────────────────
  if (method === 'POST' && ep === '/summaries') {
    // body is FormData in real flow; in the stub we extract from US state object
    const newId = 's_' + Date.now();
    const grade = (typeof US !== 'undefined' && US.audience === 'students')
      ? (document.getElementById('up-grade')?.value || u?.grade || '')
      : 'University';
    const newSummary = {
      id: newId,
      title: document.getElementById('up-title')?.value?.trim() || 'Untitled',
      subject: document.getElementById('up-subject')?.value || 'Other',
      lang: document.getElementById('up-lang')?.value || 'ar',
      grade, country: u?.country || '',
      school: document.getElementById('up-school')?.value || u?.school || '',
      author: u?.name || '',
      authorId: u?.id || '',
      views: 0, likes: 0, pages: 1,
      isPaid: (typeof US !== 'undefined') ? !!US.isPaid : false,
      isPromoted: false, isSponsored: false,
      companyAds: (typeof US !== 'undefined') ? US.selectedCompanies : [],
      adEvery: 0, approved: false, // starts pending
      audience: (typeof US !== 'undefined') ? US.audience : 'students',
      membershipRequired: (typeof US !== 'undefined') ? !!US.memberRequired : false,
      createdAt: new Date().toISOString(),
      tags: [],
      bannerDataUrl: (typeof US !== 'undefined') ? (US.bannerDataUrl || null) : null,
      bannerColor: null,
    };
    if (typeof MOCK_SUMMARIES !== 'undefined') MOCK_SUMMARIES.push(newSummary);
    // Track upload count on user
    if (u) u.uploads = (u.uploads || 0) + 1;
    logActivity('upload_summary', 'summary', newId, `Uploaded "${newSummary.title}" (${newSummary.subject}, ${newSummary.grade}, ${newSummary.country})`);
    persistState();
    return { id: newId, status: 'pending' };
  }

  // ── /users/:id ───────────────────────────────────────────────
  if (method === 'GET' && ep.startsWith('/users/') && !ep.includes('/following') && !ep.startsWith('/users/me/')) {
    const id = ep.split('/')[2];
    const target = id === 'me' ? u : MOCK_USERS.find(x => x.id === id);
    if (!target) throw new Error('User not found');
    const uploads = MOCK_SUMMARIES.filter(s => s.authorId === target.id && s.approved);
    return {
      ...target,
      // snake_case aliases expected by renderCreator / renderProfile
      user_type:        target.userType || 'student',
      has_membership:   !!target.hasMembership,
      membership_price: target.membershipPrice || 0,
      membership_perks: target.membershipPerks || '',
      // Viewer-computed fields
      isFollowing:      u ? (u.following || []).includes(target.id) : false,
      hasMembership:    u ? !!USER_MEMBERSHIPS[`${u?.id}_${target.id}`] : false,
      uploads_count:    uploads.length,
      total_likes:      uploads.reduce((a, s) => a + (s.likes || 0), 0),
      total_views:      uploads.reduce((a, s) => a + (s.views || 0), 0),
      summaries:        uploads.map(s => ({
        ...s,
        author_id: s.authorId,
        is_paid: !!s.isPaid,
        ad_every: s.adEvery || 0,
        membership_required: !!s.membershipRequired,
      })),
    };
  }

  // ── POST /users/:id/follow ────────────────────────────────────
  if (method === 'POST' && ep.endsWith('/follow')) {
    const targetId = ep.split('/')[2];
    if (!u) throw new Error('Not signed in');
    if (!u.following) u.following = [];
    const idx = u.following.indexOf(targetId);
    const target = MOCK_USERS.find(x => x.id === targetId);
    if (idx >= 0) {
      u.following.splice(idx, 1);
      if (target) target.followers = Math.max(0, (target.followers || 0) - 1);
      return { following: false };
    }
    u.following.push(targetId);
    if (target) target.followers = (target.followers || 0) + 1;
    return { following: true };
  }

  // ── POST /users/:id/membership ────────────────────────────────
  if (method === 'POST' && ep.endsWith('/membership')) {
    const targetId = ep.split('/')[2];
    if (!u) throw new Error('Not signed in');
    const key = `${u.id}_${targetId}`;
    if (USER_MEMBERSHIPS[key]) {
      delete USER_MEMBERSHIPS[key];
      return { subscribed: false };
    }
    USER_MEMBERSHIPS[key] = true;
    return { subscribed: true };
  }

  // ── GET /users/me/memberships ─────────────────────────────────
  if (method === 'GET' && ep === '/users/me/memberships') {
    if (!u) return [];
    return Object.keys(USER_MEMBERSHIPS)
      .filter(key => key.startsWith(`${u.id}_`) && USER_MEMBERSHIPS[key])
      .map(key => key.slice(u.id.length + 1));
  }

  // ── /users/:id/following ─────────────────────────────────────
  if (method === 'GET' && ep.includes('/following')) {
    const following = (u?.following || []).map(id => {
      const f = MOCK_USERS.find(x => x.id === id);
      if (!f) return null;
      return {
        ...f,
        user_type: f.userType || 'student',
        has_membership: !!f.hasMembership,
        membership_price: f.membershipPrice || 0,
        membership_perks: f.membershipPerks || '',
        isFollowing: true, // they are in following list by definition
        summaries: MOCK_SUMMARIES.filter(s => s.authorId === id && s.approved),
      };
    }).filter(Boolean);
    return following;
  }

  // ── PATCH /auth/me (settings save) ──────────────────────────
  if (method === 'PATCH' && ep === '/auth/me') {
    if (u) Object.assign(u, body);
    return { ...u };
  }

  // ── PATCH /auth/membership ───────────────────────────────────
  if (method === 'PATCH' && ep === '/auth/membership') {
    if (u) Object.assign(u, body);
    return { ...u };
  }

  // ── /users/me/notifications ──────────────────────────────────
  if (method === 'GET' && ep === '/users/me/notifications') {
    return (STATE.currentUser?.notifications || []);
  }

  // ── /users/me/notifications/read (mark all) or /:id/read (mark one) ──
  if (method === 'PATCH' && ep.startsWith('/users/me/notifications/') && ep.endsWith('/read')) {
    if (ep === '/users/me/notifications/read') {
      (u?.notifications || []).forEach(n => n.read = true);
    } else {
      const nid = ep.split('/notifications/')[1].replace('/read', '');
      const n = (u?.notifications || []).find(x => x.id === nid);
      if (n) n.read = true;
    }
    updateNotifBadge();
    return { ok: true };
  }

  // ── DELETE /users/me/notifications/:id ──────────────────────
  if (method === 'DELETE' && ep.startsWith('/users/me/notifications/')) {
    const nid = ep.split('/notifications/')[1];
    if (u && u.notifications) u.notifications = u.notifications.filter(n => n.id !== nid);
    return { success: true };
  }

  // ── DELETE /users/me/notifications (clear all) ──────────────
  if (method === 'DELETE' && ep === '/users/me/notifications') {
    if (u) u.notifications = [];
    return { success: true };
  }

  // ── /admin/stats ─────────────────────────────────────────────
  if (method === 'GET' && ep === '/admin/stats') {
    return {
      totalUsers: MOCK_USERS.length,
      totalSummaries: MOCK_SUMMARIES.length,
      approved: MOCK_SUMMARIES.filter(s => s.approved).length,
      pending: MOCK_SUMMARIES.filter(s => !s.approved).length,
      banned: MOCK_USERS.filter(u => u.status === 'banned').length,
      activeBans: 0,
      totalViews: MOCK_SUMMARIES.reduce((a, s) => a + (s.views || 0), 0),
      totalLikes: MOCK_SUMMARIES.reduce((a, s) => a + (s.likes || 0), 0),
      plagiarismThieves: 0,
      plagiarismSemi: 0,
      plagiarismPending: 0,
      reportsPending: 1,
    };
  }

  // ── /admin/platform-settings ─────────────────────────────────
  if (method === 'GET' && ep === '/admin/platform-settings') {
    return { min_likes: 500, min_views: 2000, platform_share: 25, max_ads: 3 };
  }
  if (method === 'PATCH' && ep === '/admin/platform-settings') {
    toast('Platform settings saved!', 'success', 'fa-gear'); return { ok: true };
  }

  // ── /admin/users ─────────────────────────────────────────────
  if (method === 'GET' && ep === '/admin/users') {
    const params = new URLSearchParams(endpoint.split('?')[1] || '');
    const q = (params.get('q') || '').toLowerCase();
    return MOCK_USERS
      .filter(x => !q || x.name.toLowerCase().includes(q) || x.email.toLowerCase().includes(q))
      .map(x => ({ ...x, uploads_count: MOCK_SUMMARIES.filter(s => s.authorId === x.id).length }));
  }

  // ── /admin/users/:id/ban ─────────────────────────────────────
  if (method === 'PATCH' && ep.includes('/ban') && !ep.includes('/ip-bans')) {
    const id = ep.split('/')[3];
    const target = MOCK_USERS.find(x => x.id === id);
    if (target) target.status = 'banned';
    return { ok: true };
  }

  // ── /admin/users/:id/unban ───────────────────────────────────
  if (method === 'PATCH' && ep.includes('/unban')) {
    const id = ep.split('/')[3];
    const target = MOCK_USERS.find(x => x.id === id);
    if (target) target.status = 'active';
    return { ok: true };
  }

  // ── /admin/ip-bans ───────────────────────────────────────────
  if (method === 'GET' && ep === '/admin/ip-bans') {
    const now = Date.now() / 1000;
    return (typeof MOCK_IP_BANS !== 'undefined' ? MOCK_IP_BANS : []).map(b => ({
      ...b, expired: !b.permanent && b.expires_at && b.expires_at < now
    }));
  }
  if (method === 'POST' && ep === '/admin/ip-bans') {
    const { ip, reason, ban_duration_hours, permanent } = body || {};
    const ban = {
      id: 'ipb_' + Date.now(), ip: ip || '?', reason: reason || '',
      permanent: !!permanent, created_at: Date.now() / 1000,
      expires_at: permanent ? null : (Date.now() / 1000 + (ban_duration_hours || 24) * 3600),
      expired: false,
    };
    if (typeof MOCK_IP_BANS !== 'undefined') MOCK_IP_BANS.push(ban);
    return { id: ban.id };
  }
  if (method === 'PATCH' && ep.includes('/ip-bans/') && ep.includes('/extend')) {
    const id = ep.split('/ip-bans/')[1].replace('/extend','');
    const ban = typeof MOCK_IP_BANS !== 'undefined' ? MOCK_IP_BANS.find(b => b.id === id) : null;
    if (ban && body?.additional_hours) ban.expires_at = (ban.expires_at || Date.now()/1000) + body.additional_hours * 3600;
    return { ok: true };
  }
  if (method === 'DELETE' && ep.includes('/ip-bans/')) {
    const id = ep.split('/ip-bans/')[1];
    if (typeof MOCK_IP_BANS !== 'undefined') { const i = MOCK_IP_BANS.findIndex(b => b.id === id); if (i >= 0) MOCK_IP_BANS.splice(i, 1); }
    return { ok: true };
  }

  // ── /admin/plagiarism ────────────────────────────────────────
  if (method === 'GET' && ep === '/admin/plagiarism') { return []; }
  if (method === 'PATCH' && ep.includes('/admin/plagiarism/') && ep.includes('/resolve')) { return { ok: true }; }

  // ── /admin/activity ──────────────────────────────────────
  if (method === 'GET' && ep.startsWith('/admin/activity')) {
    return { rows: (window._ACTIVITY_LOG || []).slice(0, 100), total: (window._ACTIVITY_LOG || []).length };
  }

  // ── /wallet/admin/payout-methods ────────────────────────────
  if (method === 'GET' && ep === '/wallet/admin/payout-methods') { return []; }

  // ── /admin/promotions ────────────────────────────────────────
  if (method === 'GET' && ep === '/admin/promotions') {
    return MOCK_SUMMARIES.filter(s => s.isPromoted).map(s => ({
      id: 'promo_' + s.id, summary_id: s.id, summary_title: s.title,
      author_name: s.author, budget_egp: 200, spent_egp: 87,
      duration_days: 14, status: 'active', created_at: s.createdAt
    }));
  }
  if (method === 'PATCH' && ep.includes('/promotions/') && ep.includes('/approve')) {
    const id = ep.split('/promotions/')[1].replace('/approve','').replace('promo_','');
    const s = MOCK_SUMMARIES.find(x => x.id === id); if (s) s.isPromoted = true;
    return { ok: true };
  }
  if (method === 'PATCH' && ep.includes('/promotions/') && ep.includes('/reject')) {
    const id = ep.split('/promotions/')[1].replace('/reject','').replace('promo_','');
    const s = MOCK_SUMMARIES.find(x => x.id === id); if (s) s.isPromoted = false;
    return { ok: true };
  }

  // ── /reports ─────────────────────────────────────────────────
  if (method === 'POST' && ep === '/reports') { return { id: 'rpt_' + Date.now() }; }
  if (method === 'POST' && ep === '/site-reports') { return { success: true }; }
  if (method === 'GET' && ep.startsWith('/site-reports')) { return []; }
  if (method === 'PATCH' && ep.includes('/site-reports/')) { return { success: true }; }
  if (method === 'GET' && ep.startsWith('/reports')) {
    return [
      { id: 'r1', reason: 'plagiarism', summary_title: 'Demo Summary', reporter_name: 'User A', status: 'pending', created_at: Date.now()/1000 - 86400, description: '' },
    ];
  }
  if (method === 'PATCH' && ep.includes('/reports/')) { return { ok: true }; }

  // ── /earnings/me ─────────────────────────────────────────────
  if (method === 'GET' && ep === '/earnings/me') {
    const myS = MOCK_SUMMARIES.filter(s => s.authorId === uid && s.approved);
    const total = myS.filter(s => s.isPaid).reduce((a, s) => a + s.views * 0.008, 0);
    return {
      total_egp: total.toFixed(2),
      pending_egp: (total * 0.3).toFixed(2),
      paid_egp: (total * 0.7).toFixed(2),
      breakdown: myS.map(s => ({
        id: s.id, title: s.title, views: s.views, likes: s.likes,
        is_paid: s.isPaid,
        eligible: s.isPaid && (s.likes >= 500 || s.views >= 2000),
        egp: s.isPaid ? (s.views * 0.008 * 0.7).toFixed(2) : '0.00',
        pending_egp: s.isPaid ? (s.views * 0.008 * 0.3).toFixed(2) : '0.00',
      }))
    };
  }

  // ── /earnings/promotions/me ──────────────────────────────────
  if (method === 'GET' && ep === '/earnings/promotions/me') {
    return MOCK_SUMMARIES.filter(s => s.authorId === uid && s.isPromoted).map(s => ({
      id: 'promo_' + s.id, summary_id: s.id, summary_title: s.title,
      budget_egp: 200, spent_egp: 87, duration_days: 14,
      extra_views: Math.floor(s.views * 0.3), status: 'active', created_at: s.createdAt
    }));
  }

  // ── /earnings/promotions (POST) ──────────────────────────────
  if (method === 'POST' && ep === '/earnings/promotions') {
    const s = MOCK_SUMMARIES.find(x => x.id === body?.summary_id);
    if (s) s.isPromoted = true;
    toast('Promotion started! 🚀', 'success', 'fa-bolt');
    return { id: 'promo_' + Date.now() };
  }

  // ── DELETE /earnings/promotions/:id ─────────────────────────
  if (method === 'DELETE' && ep.startsWith('/earnings/promotions/')) {
    const sid = ep.split('/').pop().replace('promo_', '');
    const s = MOCK_SUMMARIES.find(x => x.id === sid); if (s) s.isPromoted = false;
    return { ok: true };
  }

  // ── /wallet/check-promote ────────────────────────────────────
  if (method === 'POST' && ep === '/wallet/check-promote') {
    const myS = MOCK_SUMMARIES.filter(s => s.authorId === uid && s.approved && s.isPaid);
    const ready = myS.some(s => s.likes >= 500 || s.views >= 2000);
    return { ready, reason: ready ? null : 'Need at least 500 likes or 2,000 views on a paid summary' };
  }

  // ── /wallet/me ───────────────────────────────────────────────
  if (method === 'GET' && ep === '/wallet/me') {
    const myS = MOCK_SUMMARIES.filter(s => s.authorId === uid && s.approved && s.isPaid);
    const earned = myS.reduce((a, s) => a + s.views * 0.008, 0);
    return {
      available: (earned * 0.7).toFixed(2),
      pending: (earned * 0.3).toFixed(2),
      lifetime_egp: earned.toFixed(2),
      min_withdraw: 50,
      methods: []
    };
  }

  // ── /wallet/types ────────────────────────────────────────────
  if (method === 'GET' && ep === '/wallet/types') {
    return [
      { id: 'instapay', label: 'InstaPay', icon: '📲', fields: ['phone'] },
      { id: 'vodafone', label: 'Vodafone Cash', icon: '📱', fields: ['phone'] },
      { id: 'bank', label: 'Bank Transfer', icon: '🏦', fields: ['bank_name', 'account'] },
    ];
  }

  // ── /wallet/payout-methods (POST) ───────────────────────────
  if (method === 'POST' && ep === '/wallet/payout-methods') {
    return { id: 'pm_' + Date.now(), verified: false };
  }

  // ── /wallet/payout-methods/:id/primary ──────────────────────
  if (method === 'PATCH' && ep.includes('/primary')) { return { ok: true }; }

  // ── DELETE /wallet/payout-methods/:id ───────────────────────
  if (method === 'DELETE' && ep.startsWith('/wallet/payout-methods/')) { return { ok: true }; }

  // ── /wallet/withdraw ─────────────────────────────────────────
  if (method === 'POST' && ep === '/wallet/withdraw') { return { ok: true }; }

  // ── /wallet/admin/withdrawals ────────────────────────────────
  if (method === 'GET' && ep === '/wallet/admin/withdrawals') { return []; }
  if (method === 'PATCH' && ep.includes('/wallet/admin/withdrawals/')) { return { ok: true }; }
  if (method === 'PATCH' && ep.includes('/wallet/admin/payout-methods/')) { return { ok: true }; }

  // ── Username availability check ──────────────────────────────
  if (method === 'GET' && ep.startsWith('/auth/username-available')) {
    const params = new URLSearchParams(endpoint.split('?')[1] || '');
    const username = params.get('username') || '';
    const taken = MOCK_USERS.some(x => x.username === username);
    return { available: !taken };
  }


  // ── /comments/:summaryId (GET list) ─────────────────────────────
  if (method === 'GET' && ep.startsWith('/comments/')) {
    const sid = ep.split('/')[2];
    // Return in-memory comments for this summary
    if (!window._MOCK_COMMENTS) window._MOCK_COMMENTS = {};
    const list = window._MOCK_COMMENTS[sid] || [];
    // Sort: pinned first then by date
    return list.slice().sort((a,b) => (b.is_pinned||0)-(a.is_pinned||0) || b.created_at-a.created_at)
      .map(c => ({
        ...c,
        replies: (window._MOCK_COMMENTS[sid]||[]).filter(r => r.parent_id === c.id),
      }))
      .filter(c => !c.parent_id); // only top-level in main list
  }

  // ── /comments/:summaryId (POST new comment) ───────────────────────
  if (method === 'POST' && ep.startsWith('/comments/') && !ep.includes('/like') && !ep.includes('/pin')) {
    const sid = ep.split('/')[2];
    if (!window._MOCK_COMMENTS) window._MOCK_COMMENTS = {};
    if (!window._MOCK_COMMENTS[sid]) window._MOCK_COMMENTS[sid] = [];
    const newComment = {
      id: 'cmt_' + Date.now(),
      summary_id: sid,
      user_id: u?.id || 'guest',
      parent_id: body?.parent_id || null,
      body: body?.body || '',
      likes: 0,
      is_pinned: 0,
      is_deleted: 0,
      created_at: Math.floor(Date.now() / 1000),
      author_name: u?.name || 'Unknown',
      author_username: u?.username || '',
      author_photo: u?.photo || '',
      user_liked: false,
    };
    window._MOCK_COMMENTS[sid].push(newComment);
    return { ...newComment, replies: [] };
  }

  // ── /comments/:sid/:id/like ───────────────────────────────────────
  if (method === 'POST' && ep.includes('/like') && ep.startsWith('/comments/')) {
    const parts = ep.split('/');
    const cid = parts[3];
    const sid = parts[2];
    if (window._MOCK_COMMENTS) {
      const allComments = Object.values(window._MOCK_COMMENTS).flat();
      const c = allComments.find(x => x.id === cid);
      if (c) {
        c.likes = (c.user_liked ? Math.max(0, c.likes - 1) : c.likes + 1);
        c.user_liked = !c.user_liked;
        return { liked: c.user_liked, likes: c.likes };
      }
    }
    return { liked: true, likes: 1 };
  }

  // ── DELETE /comments/:sid/:id ─────────────────────────────────────
  if (method === 'DELETE' && ep.startsWith('/comments/')) {
    const parts = ep.split('/');
    const cid = parts[3];
    if (window._MOCK_COMMENTS) {
      const allComments = Object.values(window._MOCK_COMMENTS).flat();
      const c = allComments.find(x => x.id === cid);
      if (c) { c.is_deleted = 1; c.body = '[deleted]'; }
    }
    return { ok: true };
  }

  // ── PATCH /comments/:sid/:id/pin ─────────────────────────────────
  if (method === 'PATCH' && ep.includes('/pin') && ep.startsWith('/comments/')) {
    const parts = ep.split('/');
    const cid = parts[3];
    if (window._MOCK_COMMENTS) {
      const allComments = Object.values(window._MOCK_COMMENTS).flat();
      const c = allComments.find(x => x.id === cid);
      if (c) c.is_pinned = c.is_pinned ? 0 : 1;
      return { ok: true, is_pinned: !!(c?.is_pinned) };
    }
    return { ok: true, is_pinned: false };
  }

  // Fallback — log unknown and return empty
  console.warn('[api stub] unhandled:', method, endpoint);
  return {};
}
