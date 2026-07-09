// ═══════════════════════════════════════════════════════════════
//  MOL5SAT — API CONNECTOR v2
//  Loaded BEFORE app.js. Provides the real `api()` function that
//  replaces the mock stub (_mockApiImpl) in app.js.
//  Toggleable: set BACKEND_MODE=false to fall back to mock data.
// ═══════════════════════════════════════════════════════════════

// ── CONFIG ────────────────────────────────────────────────────
window.BACKEND_MODE = true; // ← flip to false for offline/mock mode

const _API_BASE = (() => {
  const { hostname, protocol, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3000/api`;
  }
  return '/api'; // same-origin in production (Nginx proxies /api → Express)
})();

// ── TOKEN STORE ───────────────────────────────────────────────
const _TK = 'mol5sat_token';
function getToken()    { try { return localStorage.getItem(_TK); } catch { return null; } }
function setToken(t)   { try { t ? localStorage.setItem(_TK, t) : localStorage.removeItem(_TK); } catch {} }
function clearToken()  { setToken(null); }

// ── CORE fetch() WRAPPER ─────────────────────────────────────
// All frontend code calls: await api('GET', '/summaries/feed')
// This replaces the mock stub. Falls back to _mockApiImpl on network failure.
async function api(method, endpoint, body, isFormData) {
  if (!window.BACKEND_MODE) return _mockApiImpl(method, endpoint, body, isFormData);

  const token = getToken();
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token)      headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body && method !== 'GET') {
    opts.body = isFormData ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${_API_BASE}${endpoint}`, opts);
  } catch {
    // Network failure — fall through to mock so demo stays alive
    console.warn('[api] Network error, using mock for:', method, endpoint);
    return _mockApiImpl(method, endpoint, body, isFormData);
  }

  // Token expired → clear it and redirect to landing
  if (res.status === 401) {
    clearToken();
    if (typeof STATE !== 'undefined') {
      STATE.loggedIn = false;
      STATE.currentUser = null;
      if (typeof navigate === 'function') navigate('landing');
    }
    throw new Error('Session expired — please sign in again.');
  }

  if (res.status === 204) return {};

  let data;
  try { data = await res.json(); } catch { throw new Error(`Non-JSON response (${res.status})`); }
  if (!res.ok) throw new Error(data?.error || data?.message || `Error ${res.status}`);
  return data;
}

// ── NORMALISE: backend snake_case → frontend camelCase ────────
function _nu(u) {
  if (!u) return null;
  return {
    id:               u.id,
    name:             u.name,
    username:         u.username || '',
    email:            u.email,
    role:             u.role,
    userType:         u.user_type  || u.userType  || 'student',
    country:          u.country    || '',
    school:           u.school     || '',
    grade:            u.grade      || '',
    specialization:   u.specialization || '',
    major:            u.major      || '',
    followers:        u.followers  || 0,
    following:        Array.isArray(u.following) ? u.following : [],
    interests:        Array.isArray(u.interests) ? u.interests
                      : (u.interests ? JSON.parse(u.interests) : []),
    hasMembership:    !!(u.has_membership  || u.hasMembership),
    membershipPrice:  u.membership_price   || u.membershipPrice  || 0,
    membershipPerks:  u.membership_perks   || u.membershipPerks  || '',
    status:           u.status    || 'active',
    uploads:          u.uploads   || 0,
    // joined: backend sends either a date string ('2024-01-01') or a unix timestamp integer
    joined: (() => {
      const j = u.joined || u.created_at;
      if (!j) return '';
      // If it's already a date string (YYYY-MM-DD or similar), use it directly
      if (typeof j === 'string' && j.includes('-')) return j.slice(0, 10);
      // If it's a unix timestamp (number), convert it
      if (typeof j === 'number' || /^\d+$/.test(j)) return new Date(Number(j) * 1000).toISOString().slice(0, 10);
      return String(j).slice(0, 10);
    })(),
    notifications:    Array.isArray(u.notifications) ? u.notifications : [],
    profilePhoto:     u.profile_photo || u.profilePhoto || '',
  };
}

function _ns(s) {
  if (!s) return null;
  return {
    id:                 s.id,
    title:              s.title,
    subject:            s.subject,
    grade:              s.grade      || '',
    country:            s.country    || '',
    school:             s.school     || '',
    lang:               s.lang       || 'ar',
    author:             s.author     || s.author_name || '',
    authorId:           s.author_id  || s.authorId   || '',
    views:              s.views      || 0,
    likes:              s.likes      || 0,
    pages:              s.pages      || 1,
    isPaid:             !!(s.is_paid      ?? s.isPaid),
    isPromoted:         !!(s.is_promoted  ?? s.isPromoted),
    isSponsored:        !!(s.is_sponsored ?? s.isSponsored),
    membershipRequired: !!(s.membership_required ?? s.membershipRequired),
    adEvery:            s.ad_every   ?? s.adEvery ?? 0,
    tags:               Array.isArray(s.tags) ? s.tags
                        : (s.tags ? JSON.parse(s.tags) : []),
    approved:           !!(s.approved),
    audience:           s.audience   || 'students',
    companyAds:         Array.isArray(s.companyAds) ? s.companyAds : [],
    content:            s.content    || '',
    filePath:           s.file_path  || s.filePath  || '',
    createdAt:          s.created_at
      ? new Date(s.created_at * 1000).toISOString().slice(0, 10)
      : (s.createdAt || ''),
  };
}

// ── SESSION RESTORE ───────────────────────────────────────────
// Called once on page load. Restores logged-in state from saved JWT.
async function _realInitAuth() {
  const token = getToken();
  if (!token) return null;

  if (!window.BACKEND_MODE) {
    // Mock mode: restore from the STATE that was in memory before reload
    // (pages reload = mock session lost by design in offline mode)
    return null;
  }

  // Silently refresh token if close to expiry (< 7 days left)
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const pl = JSON.parse(atob(parts[1]));
      const expiresIn = (pl.exp * 1000) - Date.now();
      if (expiresIn < 7 * 86400 * 1000 && expiresIn > 0) {
        fetch(`${_API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.token) setToken(d.token); })
          .catch(() => {});
      }
    }
  } catch {}

  try {
    const me = await api('GET', '/auth/me');
    const user = _nu(me);
    // Fetch follow list
    try {
      const fl = await api('GET', `/users/${user.id}/following`);
      user.following = Array.isArray(fl) ? fl.map(f => f.id || f) : [];
    } catch {}
    // Fetch active memberships
    try {
      const ms = await api('GET', '/users/me/memberships');
      user.memberships = Array.isArray(ms) ? ms : [];
    } catch {}
    // Fetch notifications
    try {
      const notifs = await api('GET', '/users/me/notifications');
      user.notifications = Array.isArray(notifs) ? notifs.map(_nn) : [];
    } catch {}
    return user;
  } catch {
    clearToken();
    return null;
  }
}

// ── NOTIFICATION NORMALISE ────────────────────────────────────
function _nn(n) {
  return {
    id:          n.id,
    text:        n.text || n.message || '',
    summary_id:  n.summary_id || n.summaryId || '',
    summaryId:   n.summary_id || n.summaryId || '',
    actor_id:    n.actor_id || n.actorId || '',
    read:        !!n.read,
    created_at:  n.created_at,
    time:        n.created_at ? _rel(n.created_at) : (n.time || ''),
  };
}
function _rel(ts) {
  if (!ts) return '';
  const d = Math.floor((Date.now() / 1000) - ts);
  if (d < 60)    return 'just now';
  if (d < 3600)  return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  return Math.floor(d / 86400) + 'd ago';
}

// ── AUTH ACTIONS ──────────────────────────────────────────────
async function apiSignIn(email, password) {
  const d = await api('POST', '/auth/login', { email, password });
  setToken(d.token);
  return _nu(d.user);
}

async function apiSignUp(payload) {
  const d = await api('POST', '/auth/register', payload);
  setToken(d.token);
  return _nu(d.user);
}

function apiSignOut() {
  clearToken();
}

// ── WIRED doSignIn / doSignUp / initAuth ───────────────────────
// These override the functions defined in app.js.
// They must be defined AFTER app.js loads — see index.html script order.
// We use a DOMContentLoaded trick to let app.js define them first, then we override.
document.addEventListener('DOMContentLoaded', () => {
  // Override initAuth — app.js's version is mock-only (checks a different,
  // unused localStorage key and always returns false for real accounts),
  // and would otherwise silently win here since it loads after this file,
  // making every reload look like a fresh guest visit even with a valid
  // session token already sitting in storage.
  window.initAuth = _realInitAuth;

  // Override doSignIn
  window.doSignIn = async function () {
    const email    = (document.getElementById('si-email')?.value || '').trim().toLowerCase();
    const password = document.getElementById('si-pass')?.value || '';
    if (!email || !password) { toast('Email and password required', 'error', 'fa-exclamation'); return; }
    try {
      const user = await apiSignIn(email, password);
      STATE.currentUser = user; STATE.loggedIn = true;
      document.getElementById('siOverlay')?.remove();
      updateNavForUser();
      navigate('home');
      toast(`Welcome back, ${user.name}! 👋`, 'success', 'fa-hand-wave');
    } catch (err) {
      toast(err.message || 'Sign in failed', 'error', 'fa-times-circle');
    }
  };

  // Override doSignUp
  window.doSignUp = async function (payload) {
    let name, email, password, username, country, userType, school, grade, specialization, major, interests, profile_photo;

    if (payload) {
      // Called with a ready-made payload (ui.js's submitSignUp already
      // validated the form and correctly determined user_type by checking
      // which radio card is actually selected) — use it as-is.
      ({ name, email, password, username, country, user_type: userType,
         school, grade, specialization, major, interests, profile_photo } = payload);
    } else {
      // Fallback: read directly from the DOM. Determine user_type the same
      // robust way submitSignUp does — check which radio card actually has
      // the selected class — never from a module-level variable that
      // nothing in the live code path keeps in sync.
      name     = (document.getElementById('su-name')?.value  || '').trim();
      email    = (document.getElementById('su-email')?.value || '').trim();
      password = document.getElementById('su-pass')?.value   || '';
      country  = document.getElementById('su-country')?.value || 'Egypt';
      userType = document.getElementById('su-rc-colleague')?.classList.contains('sel-a') ? 'colleague' : 'student';
      username = (document.getElementById('su-username')?.value || '').trim().toLowerCase()
        || (name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 25) + '_' + Math.floor(Math.random() * 1000));
      school         = userType === 'student'   ? (document.getElementById('su-school')?.value || '') : '';
      grade          = userType === 'student'   ? (document.getElementById('su-grade')?.value  || '') : '';
      specialization = userType === 'colleague' ? (document.getElementById('su-spec')?.value   || '') : '';
      major          = userType === 'colleague' ? (document.getElementById('su-major')?.value  || '') : '';
      interests = [...document.querySelectorAll('#suOverlay .chip.sel')].map(el => el.dataset.subj).filter(Boolean);
      profile_photo = window._suPhotoDataUrl || '';
    }

    if (!name || !email || !password) { toast('Please fill in all required fields', 'error', 'fa-exclamation'); return; }

    const finalPayload = {
      name, username, email, password, country,
      user_type: userType || 'student',
      school: school || '', grade: grade || '',
      specialization: specialization || '', major: major || '',
      interests: interests || [],
      profile_photo: profile_photo || '',
    };
    try {
      const user = await apiSignUp(finalPayload);
      STATE.currentUser = user; STATE.loggedIn = true;
      document.getElementById('suOverlay')?.remove();
      updateNavForUser();
      navigate('home');
      toast(`Welcome to Mol5sat, ${user.name}! 🎉`, 'success', 'fa-party-horn');
    } catch (err) {
      toast(err.message || 'Could not create account', 'error', 'fa-times-circle');
    }
  };

  // signOut is handled by router.js which does the correct window.location.href='/'
  // redirect, clears localStorage, and logs the activity. Do not override it here.
});

// Session restore is handled exclusively by router.js's DOMContentLoaded
// handler which calls initAuth() then render(). No duplicate load handler needed.

console.log(
  `%c[Mol5sat] API connector — ${window.BACKEND_MODE ? '🟢 REAL backend' : '🟡 MOCK mode'}  ${_API_BASE}`,
  'color:#FFB800;font-weight:bold;font-size:12px'
);
