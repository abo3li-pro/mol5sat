// ═══════════════════════════════════════════════════════
//  MOL5SAT — WEB ROUTER  (MPA — every page has its own URL)
//  Reads the current path and sets STATE.route + routeData
//  before the first render(), and patches navigate() so
//  every in-app link does a real browser navigation.
// ═══════════════════════════════════════════════════════

(function () {
  // ── URL → route mapping ────────────────────────────────
  // Called once at load; returns { route, data } from window.location
  function routeFromURL() {
    const p = window.location.pathname.replace(/\/$/, '') || '/';
    const sp = new URLSearchParams(window.location.search);

    // /summary/:id
    const sumMatch = p.match(/^\/summary\/(.+)$/);
    if (sumMatch) return { route: 'viewer', data: { id: sumMatch[1] } };

    // /user/:id  (creator profiles)
    const userMatch = p.match(/^\/user\/(.+)$/);
    if (userMatch) return { route: 'creator', data: { id: userMatch[1] } };

    // /search?q=...&mode=...
    if (p === '/search') return { route: 'search', data: { q: sp.get('q') || '', mode: sp.get('mode') || 'curriculum' } };

    // Static named pages
    const MAP = {
      '/':             { route: 'landing', data: {} },
      '/home':         { route: 'home',    data: {} },
      '/trending':     { route: 'trending', data: {} },
      '/subjects':     { route: 'subjects', data: {} },
      '/saved':        { route: 'saved',   data: {} },
      '/following':    { route: 'following', data: {} },
      '/notifications':{ route: 'notifications', data: {} },
      '/settings':     { route: 'settings', data: {} },
      '/earnings':     { route: 'earnings', data: {} },
      '/wallet':       { route: 'wallet',  data: {} },
      '/profile':      { route: 'profile', data: {} },
      '/admin':        { route: 'admin',   data: {} },
      '/supervisor':   { route: 'supervisor', data: {} },
      '/membership':   { route: 'membership', data: {} },
    };
    return MAP[p] || { route: 'not-found', data: { path: p } };
  }

  // ── route → URL mapping ────────────────────────────────
  function urlFromRoute(route, data) {
    if (route === 'viewer')  return '/summary/' + (data?.id || '');
    if (route === 'creator') return '/user/'    + (data?.id || '');
    if (route === 'search') {
      const sp = new URLSearchParams();
      if (data?.q) sp.set('q', data.q);
      if (data?.mode) sp.set('mode', data.mode);
      const qs = sp.toString();
      return '/search' + (qs ? '?' + qs : '');
    }
    if (route === 'landing') return '/';
    const NAMED = {
      home: '/home', trending: '/trending', subjects: '/subjects',
      saved: '/saved', following: '/following', notifications: '/notifications',
      settings: '/settings', earnings: '/earnings', wallet: '/wallet',
      profile: '/profile', admin: '/admin', supervisor: '/supervisor',
      membership: '/membership',
    };
    return NAMED[route] || '/home';
  }

  // ── Patch navigate() to use real URLs ─────────────────
  // The original navigate() (from app.js) uses #hash URLs.
  // We override it here to use real path navigation instead.
  window._origNavigate = window.navigate || function () {};
  window.navigate = function (route, data) {
    data = data || {};
    STATE.historyStack.push({ route: STATE.route, data: STATE.routeData });
    // Stamp the scroll position of the page we're LEAVING onto its own
    // history entry (replaceState doesn't create a new entry, just updates
    // the current one in place) so that if the user later comes back to
    // it via popstate, we can restore exactly where they were.
    window.history.replaceState(
      { ...(window.history.state || {}), scrollY: window.scrollY },
      ''
    );
    STATE.route = route;
    STATE.routeData = data;
    const url = urlFromRoute(route, data);
    window.history.pushState({ route, data, scrollY: 0 }, '', url);
    // Update <link rel="canonical"> dynamically
    const can = document.querySelector('link[rel="canonical"]');
    if (can) can.href = 'https://mol5sat.org' + url;
    render();
    // Genuinely new page → start at the top, same as a fresh page load.
    window.scrollTo(0, 0);
  };

  // ── goBack: use real browser history ──────────────────
  window.goBack = function () {
    if (STATE.historyStack.length > 0) {
      const prev = STATE.historyStack.pop();
      STATE.route = prev.route || (STATE.loggedIn ? 'home' : 'landing');
      STATE.routeData = prev.data || {};
      window.history.back();
    } else {
      window.location.href = STATE.loggedIn ? '/home' : '/';
    }
  };

  // ── Browser back/forward button ────────────────────────
  // Restore the scroll position that was saved for this entry (if any) —
  // this is what going back to a feed you'd scrolled through is supposed
  // to feel like. Falls back to top-of-page for entries that predate this
  // change or never had a saved position.
  window.addEventListener('popstate', (e) => {
    const { route, data } = routeFromURL();
    STATE.route = route;
    STATE.routeData = data;
    render();
    const savedY = e.state && typeof e.state.scrollY === 'number' ? e.state.scrollY : 0;
    // Wait one frame so the new content is in the DOM before scrolling —
    // scrolling to a Y position that doesn't have content yet just no-ops.
    requestAnimationFrame(() => window.scrollTo(0, savedY));
  });

  // ── signOut: clear session, token, and redirect ───────────
  window.signOut = function () {
    if (STATE.currentUser) {
      logActivity('logout', 'user', STATE.currentUser?.id || '', `Signed out: ${STATE.currentUser?.name || ''}`);
    }
    // Clear JWT (real backend mode)
    if (typeof apiSignOut === 'function') apiSignOut();
    STATE.currentUser = null;
    STATE.loggedIn = false;
    STATE.historyStack = [];
    try { localStorage.removeItem('mol5sat_session'); } catch (e) {}
    persistState();
    window.location.href = '/';
  };

  // ── goHome helper ──────────────────────────────────────
  window.goHome = function () {
    if (!STATE.loggedIn) { window.location.href = '/'; return; }
    window.location.href = (STATE.currentUser?.role === 'admin') ? '/admin' : '/home';
  };

  // ── navTo helper (alias) ───────────────────────────────
  window.navTo = function (r, d) { navigate(r, d || {}); };

  // ── INIT: set STATE.route from the current URL, then boot
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c[Mol5sat] frontend build: 1.4.0-comments-guestux-pagination-2026-08-11', 'color:#FFB800;font-weight:bold');
    const { route, data } = routeFromURL();
    STATE.route = route;
    STATE.routeData = data;

    // Restore session — initAuth() returns the user object (real backend) or true (mock)
    const authed = await initAuth();

    // In BACKEND_MODE=true, initAuth() (from api.js) returns the full user object.
    // In BACKEND_MODE=false, the mock initAuth() sets STATE directly and returns boolean.
    // We handle both here so the router works regardless of mode.
    if (authed && typeof authed === 'object' && authed.id) {
      // Real backend mode: initAuth returned the user object — set STATE from it
      STATE.currentUser = authed;
      STATE.loggedIn    = true;
      if (typeof updateNavForUser === 'function') updateNavForUser();
    }
    // Mock mode: STATE.currentUser/loggedIn already set by mock initAuth() above

    // Redirect '/' to the right default page if logged in: admins land on
    // the admin dashboard, everyone else on their feed.
    if (route === 'landing' && authed) {
      const dest = (STATE.currentUser?.role === 'admin') ? '/admin' : '/home';
      window.history.replaceState({}, '', dest);
      STATE.route = dest.slice(1);
    }

    // Redirect auth-required pages to '/' if not logged in
    const requiresAuth = ['saved','following','notifications','settings',
                          'earnings','wallet','profile','admin','supervisor','membership'];
    if (requiresAuth.includes(STATE.route) && !authed) {
      window.history.replaceState({}, '', '/');
      STATE.route = 'landing';
      STATE.routeData = {};
    }

    // Guests cold-loading /home directly (fresh visit, bookmark, shared
    // link — not via the "Browse as Guest" button) get redirected to the
    // landing page so they always see the welcome screen first.
    if (STATE.route === 'home' && !authed && !STATE.guestBrowsing) {
      window.history.replaceState({}, '', '/');
      STATE.route = 'landing';
      STATE.routeData = {};
    }

    updateNavForUser();
    try {
      await loadNotifications();
    } catch (e) {
      // Never let a notifications hiccup block the page from rendering.
      // If the session genuinely expired, api() already redirected via its
      // own navigate() call — render() below will simply reflect that.
      console.warn('[boot] loadNotifications failed, continuing anyway:', e?.message || e);
    }

    // Set <html lang> to Arabic for users whose country uses Arabic,
    // so RTL-aware fonts/styles apply from the very first render.
    if (authed && typeof ARABIC_COUNTRIES !== 'undefined' && ARABIC_COUNTRIES.includes(STATE.currentUser?.country)) {
      document.documentElement.lang = 'ar';
    }

    render();

    // Handle password-reset links, which arrive as a URL fragment
    // (e.g. mol5sat.org/#reset-password?token=abc123) since the email is
    // sent from the backend before it knows the current page's route.
    if (window.location.hash.startsWith('#reset-password')) {
      const qs = window.location.hash.split('?')[1] || '';
      const token = new URLSearchParams(qs).get('token');
      if (token && typeof openResetPassword === 'function') {
        openResetPassword(token);
      }
      // Clean the hash out of the URL without triggering navigation
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  });
})();
