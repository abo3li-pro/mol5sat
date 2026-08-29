// ═══════════════════════════════════════════════════════
//  MOL5SAT — PAGE RENDERERS
// ═══════════════════════════════════════════════════════

// ── MAIN RENDER ROUTER ────────────────────────────────────
async function render() {
  const root = document.getElementById('appRoot');
  const route = STATE.route;

  setSidebarActive(route);
  document.body.classList.remove('sb-open');

  // Auth-only routes — redirect guests to sign-in prompt
  const AUTH_ONLY = ['profile','saved','following','notifications','earnings','wallet','settings'];
  if (!STATE.loggedIn && AUTH_ONLY.includes(route)) {
    // Show a gentle nudge rather than hard redirect
    root.innerHTML = `<div class="page page--narrow" style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:52px;margin-bottom:16px">🔒</div>
        <div style="font-family:var(--fd);font-size:22px;font-weight:800;margin-bottom:8px">Sign in required</div>
        <div style="color:var(--text2);font-size:14px;margin-bottom:24px;line-height:1.7">You need an account to access this page.<br>It's free and takes 30 seconds.</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-primary btn-lg" onclick="openSignIn()"><i class="fas fa-right-to-bracket"></i> Sign In</button>
          <button class="btn btn-ghost btn-lg" onclick="openSignUp()"><i class="fas fa-user-plus"></i> Sign Up Free</button>
        </div>
      </div>
    </div>`;
    return;
  }

  // Route guards
  if (STATE.loggedIn && route === 'landing') {
    // Logged-in users never see the landing page
    const role = STATE.currentUser?.role;
    const dest = role === 'admin' ? 'admin' : role === 'supervisor' ? 'supervisor' : 'home';
    navigate(dest); return;
  }
  // Admin/supervisor are here to moderate, not browse — matches the sidebar,
  // which hides Home/Search/Trending/Curriculum/Science/Subjects for them.
  // This catches direct URLs and back/forward navigation too.
  const modRole = STATE.currentUser?.role;
  const FEED_ROUTES = ['home', 'search', 'trending', 'subjects'];
  if ((modRole === 'admin' || modRole === 'supervisor') && FEED_ROUTES.includes(route)) {
    navigate(modRole === 'admin' ? 'admin' : 'supervisor'); return;
  }
  // Guests must land on the welcome page first. 'home' is only reachable
  // for a guest after they explicitly tap "Browse as Guest" on landing
  // (which sets STATE.guestBrowsing = true). A guest hitting /home directly
  // — fresh visit, bookmark, shared link — gets sent to the landing page.
  if (!STATE.loggedIn && route === 'home' && !STATE.guestBrowsing) {
    navigate('landing'); return;
  }
  const GUEST_OK_ROUTES = ['landing', 'home', 'search', 'viewer', 'creator', 'trending', 'subjects', 'not-found'];
  if (!STATE.loggedIn && !GUEST_OK_ROUTES.includes(route)) {
    // Unauthenticated users trying to access private routes → landing
    navigate('landing'); return;
  }
  // NOTE: admins are sent to /admin by default on login/boot (see
  // router.js), but are otherwise free to browse Home/Curriculum/Science
  // like any other logged-in user if they navigate there explicitly —
  // there is deliberately no forced redirect here.

  // Show loading skeleton
  root.innerHTML = `<div style="text-align:center;padding:80px 20px"><div class="spinner" style="margin:0 auto"></div></div>`;

  // Reset meta to default on every navigation (viewer will override)
  updateMeta();

  try {
    switch (route) {
      case 'landing': root.innerHTML = renderLanding(); break;
      case 'home': await renderHome(root); break;
      case 'search': await renderSearchPage(root); break;
      case 'viewer': await renderViewer(root, STATE.routeData.id); _startAdTimers(); break;
      case 'profile': await renderProfile(root); break;
      case 'creator': await renderCreator(root, STATE.routeData.id); break;
      case 'admin':      await renderAdmin(root); break;
      case 'supervisor': await renderSupervisor(root); break;
      case 'saved': await renderSaved(root); break;
      case 'following': await renderFollowing(root); break;
      case 'notifications': await renderNotifications(root); break;
      case 'settings': renderSettings(root); break;
      case 'subjects': root.innerHTML = renderSubjects(); break;
      case 'trending': await renderTrending(root); break;
      case 'membership': renderMembershipSetup(root); break;
      case 'earnings': await renderEarnings(root); break;
      case 'wallet':   await renderWallet(root); break;
      case 'not-found': root.innerHTML = renderNotFound(STATE.routeData?.path); break;
      default: root.innerHTML = renderNotFound(STATE.routeData?.path);
    }
  } catch (e) {
    // A render path threw partway through. Without this, root.innerHTML
    // would never get past the loading spinner set above — the page would
    // look like it's loading forever with no actual way to recover.
    // Skip painting over it if something already navigated us elsewhere
    // (e.g. a session-expired redirect) while this render was in flight.
    if (STATE.route === route) {
      console.error('[render] error rendering route', route, e);
      root.innerHTML = `<div class="page page--narrow"><div class="empty">
        <div class="empty-icon">⚠️</div><div class="empty-title">Something went wrong</div>
        <div class="empty-sub">${typeof esc === 'function' ? esc(e.message || '') : (e.message || '')}</div>
        <button class="btn btn-surf" style="margin-top:14px" onclick="navigate('${STATE.loggedIn ? 'home' : 'landing'}')"><i class="fas fa-house"></i> Go Home</button>
      </div></div>`;
    }
  }
}

// ── LANDING ────────────────────────────────────────────────
function renderLanding() {
  return `<div class="landing">
    <div class="landing-logo">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="logo-emblem" style="width:54px;height:54px"></div>
        <div class="logo-text"><span class="logo-name" style="font-size:30px">Mol5sat</span><span class="logo-tag" style="font-size:9px">ملخصات · Learn · Worldwide</span></div>
      </div>
    </div>
    <h1 class="landing-title">The World's Summaries<br>In One Place</h1>
    <p class="landing-sub">YouTube for written educational summaries. Find, read, earn — any country, any curriculum, any subject. In your language, for your grade.</p>
    <div class="landing-acts">
      <button class="btn btn-primary btn-lg" onclick="openSignUp()"><i class="fas fa-user-plus"></i> Join Free</button>
      <button class="btn btn-ghost btn-lg" onclick="openSignIn()"><i class="fas fa-right-to-bracket"></i> Sign In</button>
      <button class="btn btn-surf btn-lg" onclick="STATE.guestBrowsing=true;navigate('home')" style="border:1.5px solid var(--bord2);color:var(--text2)"><i class="fas fa-eye"></i> Browse as Guest</button>
    </div>
    <div class="features-grid">
      <div class="feat"><div class="feat-icon">📚</div><div class="feat-title">Curriculum Feed</div><div class="feat-sub">Summaries matched exactly to your grade, school type, and country.</div></div>
      <div class="feat"><div class="feat-icon">🔬</div><div class="feat-title">Science Feed</div><div class="feat-sub">Subject-based summaries beyond curricula. Pure knowledge for everyone.</div></div>
      <div class="feat"><div class="feat-icon">💰</div><div class="feat-title">Earn from Writing</div><div class="feat-sub">Upload once, earn forever. Choose advertisers, set ad frequency.</div></div>
      <div class="feat"><div class="feat-icon">👑</div><div class="feat-title">Membership System</div><div class="feat-sub">Creators can offer exclusive memberships — like YouTube memberships.</div></div>
      <div class="feat"><div class="feat-icon">🔔</div><div class="feat-title">Follow & Subscribe</div><div class="feat-sub">Follow creators and get notified when they post new summaries.</div></div>
      <div class="feat"><div class="feat-icon">🔒</div><div class="feat-title">Protected Content</div><div class="feat-sub">Watermarked pages, no downloads, unique IDs. Your work stays yours.</div></div>
    </div>
  </div>`;
}

// ── 404 NOT FOUND ───────────────────────────────────────────
function renderNotFound(path) {
  return `<div class="landing" style="min-height:60vh">
    <div style="font-size:64px;margin-bottom:8px">🔍</div>
    <div style="font-family:var(--fd);font-size:48px;font-weight:800;color:var(--gold);margin-bottom:8px">404</div>
    <div style="font-family:var(--fd);font-size:22px;font-weight:800;margin-bottom:12px">Page not found</div>
    <div style="color:var(--text2);font-size:14px;margin-bottom:32px;line-height:1.7;max-width:400px;text-align:center">
      ${path ? `The page <code style="background:var(--surf2);padding:2px 8px;border-radius:6px;font-size:13px">${path}</code> doesn't exist.` : "This page doesn't exist."}
      <br>It may have been moved, deleted, or you may have mistyped the URL.
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
      <button class="btn btn-primary" onclick="${STATE.loggedIn ? "navigate('home')" : "navigate('landing')"}"><i class="fas fa-house"></i> Go Home</button>
      <button class="btn btn-surf" onclick="goBack()"><i class="fas fa-arrow-left"></i> Go Back</button>
      <button class="btn btn-surf" onclick="navigate('search',{q:''})"><i class="fas fa-search"></i> Search Summaries</button>
    </div>
  </div>`;
}

// ── HOME ───────────────────────────────────────────────────
async function renderHome(root) {
  const u = STATE.currentUser;
  const isGuest = !STATE.loggedIn || !u;
  // Respect an explicit tab choice (from anyone, including guests) over
  // the default -- only fall back to a role-appropriate default (Science
  // for guests, so they land on browsable content) when nothing has been
  // chosen yet this session.
  const tab = STATE.activeTab || (isGuest ? 'science' : 'curriculum');
  const sort = normalizeSortArr(STATE.feedSort);

  const tabToggle = `<div class="feed-toggle">
    <div class="ftab ${tab === 'curriculum' ? 'ac' : ''}" onclick="setTab('curriculum')"><i class="fas fa-book-open"></i> Curriculum${isGuest ? ' <i class="fas fa-lock" style="font-size:10px;opacity:.7"></i>' : ''}</div>
    <div class="ftab ${tab === 'science' ? 'as' : ''}" onclick="setTab('science')"><i class="fas fa-flask"></i> Science</div>
  </div>`;

  // ── unified client-side sort (all sort keys, multi-select aware) ──
  const applySort = (arr, forceSort) => applySortKeys(arr, forceSort || sort, u);

  // ── SCIENCE FEED ORDERING ──────────────────────────────────
  // "Neutral": interest-matched subjects float up first; within each of
  // those two buckets, order by grade proximity to the user using a
  // zig-zag — same grade, one grade up, one grade down, two up, two
  // down, ... — with engagement as the final tiebreaker. Promoted always
  // wins the top spot, same as everywhere else on the site.
  const scienceOrder = (arr) => {
    const interests = u?.interests || [];
    const rankOf = (s) => {
      const isPromoted = !!(s.is_promoted ?? s.isPromoted);
      const isInterest = interests.includes(s.subject);
      const zz = u ? _zigzagRank(gradeStepsVsUser(u, s)) : 0;
      return { isPromoted, isInterest, zz };
    };
    return [...arr].sort((a, b) => {
      const ra = rankOf(a), rb = rankOf(b);
      if (ra.isPromoted !== rb.isPromoted) return ra.isPromoted ? -1 : 1;
      if (ra.isInterest !== rb.isInterest) return ra.isInterest ? -1 : 1;
      if (ra.zz !== rb.zz) return ra.zz - rb.zz;
      return _engS(b) - _engS(a);
    });
  };

  try {
    if (isGuest && tab === 'curriculum') {
      // ── CURRICULUM FEED, LOCKED (guest) ──────────────────────
      root.innerHTML = `<div class="page">${tabToggle}
        <div class="member-gate" style="margin-top:8px">
          <div class="member-gate-icon">🔒</div>
          <div class="member-gate-title">Your Curriculum Feed is personal</div>
          <div class="member-gate-sub">Sign in and we'll match summaries exactly to your grade, school type, and country — only what's actually relevant to you, nothing else.</div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="openSignIn()"><i class="fas fa-right-to-bracket"></i> Sign In</button>
            <button class="btn btn-ghost-gold" onclick="openSignUp()"><i class="fas fa-user-plus"></i> Sign Up</button>
          </div>
          <div style="margin-top:16px">
            <span class="sec-more" onclick="setTab('science')"><i class="fas fa-flask"></i> Or browse the Science Feed →</span>
          </div>
        </div>
      </div>`;

    } else if (!isGuest && tab === 'curriculum') {
      // ── CURRICULUM FEED ─────────────────────────────────────
      // Strict: same country + same grade. School type is a tie-breaker only.
      // The client always re-applies the real sort afterward (needed for
      // multi-key compound sorts anyway), and this query has no LIMIT, so
      // the base fetch order here doesn't need to match the final one.
      let raw = await api('GET', `/summaries/feed?sort=recommended&mode=curriculum`) || [];

      // Hard client-side guard: enforce exact country + grade (belt-and-suspenders)
      let filtered = raw.filter(s =>
        s.audience !== 'colleagues' &&
        s.country === u.country &&
        (!u.grade || !s.grade || s.grade === u.grade)
      );

      filtered = applyActiveFilters(filtered);
      filtered = applySort(filtered);

      const isDefaultSort = sort.length === 1 && sort[0] === 'recommended';
      const emptyHTML = `<div class="empty">
        <div class="empty-icon">📚</div>
        <div class="empty-title">No summaries for your curriculum yet</div>
        <div class="empty-sub">You're in <b>${u.grade || '?'}</b> · ${u.country || ''}.
          <br>Be the first to upload, or explore the Science feed!</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px">
          ${!isDefaultSort ? `<button class="btn btn-surf btn-sm" onclick="setFeedSort('recommended')"><i class="fas fa-wand-magic-sparkles"></i> Reset sort</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="setTab('science')"><i class="fas fa-flask"></i> Browse Science Feed</button>
        </div>
      </div>`;

      root.innerHTML = `<div class="page">${tabToggle}
        <div class="sec-head">
          <div class="sec-title">📚 Your Curriculum Feed
            <span class="sec-tag sec-tag-gold">${u.grade || 'All'}</span>
          </div>
          <span class="sec-more" onclick="navTo('search',{q:'',mode:'curriculum'})">See all →</span>
        </div>
        ${sortBarHTML(sort, 'setFeedSort', 'feed')}
        ${filterBarHTML()}
        <div class="card-grid">${filtered.length
          ? filtered.map(s => cardHTML(s, s.is_promoted ? '⚡ Promoted' : '')).join('')
          : emptyHTML
        }</div></div>`;

    } else {
      // ── SCIENCE FEED ─────────────────────────────────────────
      // Curriculum-agnostic by design: the full pool of approved student
      // content, not restricted by country/grade — grade is a *ranking*
      // signal here (see scienceOrder / the 'advanced' sortItems branch),
      // never a hard filter, except when Advanced mode is explicitly on.
      const isAdv = sort.length === 1 && (sort[0] === 'advanced' || sort[0].startsWith('advanced:'));
      const isDefaultSort = sort.length === 1 && sort[0] === 'recommended';

      let allSummaries = await api('GET', `/summaries/feed?sort=recommended&mode=science`) || [];
      allSummaries = applyActiveFilters(allSummaries);

      let scoredAll;
      if (isAdv && u) {
        scoredAll = sortItems(allSummaries, sort[0], u);
      } else if (isDefaultSort || (sort.length === 1 && sort[0] === 'curriculum')) {
        scoredAll = u ? (isDefaultSort ? scienceOrder(allSummaries) : applySort(allSummaries)) : applySort(allSummaries);
      } else {
        scoredAll = applySort(allSummaries);
      }

      // Tag cards that match the user's interests (silent badge, not a section)
      const tagCard = (s) => {
        const isCurr = u && s.country === u.country &&
          (!u.grade || !s.grade || s.grade === u.grade);
        const tag = isCurr ? 'Your Curriculum' : '';
        return cardHTML(s, tag);
      };

      if (isGuest) {
        // Guest: pure engagement sort, no personalization
        const guestCards = [...allSummaries]
          .sort((a,b)=> (b.views||0)+(b.likes||0)*3 - ((a.views||0)+(a.likes||0)*3))
          .slice(0,40).map(s => cardHTML(s)).join('');
        root.innerHTML = `<div class="page">${tabToggle}
          ${sortBarHTML(sort, 'setFeedSort', 'science')}
          ${filterBarHTML()}
          <div class="card-grid">${guestCards ||
            `<div class="empty"><div class="empty-icon">🔬</div>
             <div class="empty-title">No summaries yet</div>
             <div class="empty-sub">Be the first to upload!</div></div>`
          }</div></div>`;
      } else {
        const cards = scoredAll.map(s => tagCard(s)).join('');
        const noGradeForAdvanced = isAdv && u && !u.grade;
        const emptyBlock = noGradeForAdvanced
          ? `<div class="empty"><div class="empty-icon">🎓</div>
             <div class="empty-title">No grade set on this account</div>
             <div class="empty-sub">The Advanced filter compares content to your own grade, so it needs one to work.${u.role === 'admin' ? ' This is expected for admin accounts.' : ' Add your grade in Settings to use it.'}</div>
             <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
               <button class="btn btn-surf btn-sm" onclick="setFeedSort('recommended')"><i class="fas fa-wand-magic-sparkles"></i> Back to Recommended</button>
               ${u.role !== 'admin' ? `<button class="btn btn-ghost btn-sm" onclick="navTo('settings')"><i class="fas fa-gear"></i> Go to Settings</button>` : ''}
             </div></div>`
          : `<div class="empty"><div class="empty-icon">🔬</div>
             <div class="empty-title">No summaries found</div>
             <div class="empty-sub">Try resetting the sort/filters or switching tabs.</div>
             <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
               ${!isDefaultSort ? `<button class="btn btn-surf btn-sm" onclick="setFeedSort('recommended')"><i class="fas fa-wand-magic-sparkles"></i> Reset sort</button>` : ''}
               ${(STATE.activeFilters?.subjects?.length || STATE.activeFilters?.langs?.length) ? `<button class="btn btn-surf btn-sm" onclick="clearActiveFilters()"><i class="fas fa-xmark"></i> Clear filters</button>` : ''}
               <button class="btn btn-ghost btn-sm" onclick="setTab('curriculum')"><i class="fas fa-book-open"></i> Curriculum Feed</button>
             </div></div>`;
        root.innerHTML = `<div class="page">${tabToggle}
          ${sortBarHTML(sort, 'setFeedSort', 'science')}
          ${filterBarHTML()}
          <div class="card-grid">${cards || emptyBlock}</div></div>`;
      }
    }
  } catch (e) {
    const isNoServer = e.message === 'Failed to fetch' || e.message?.includes('NetworkError') || e.message?.includes('fetch');
    const errMsg = isNoServer
      ? `<div class="empty"><div class="empty-icon">🔌</div><div class="empty-title">Backend server not running</div>
         <div class="empty-sub">Start your Node.js server (<b>npm start</b>) and open the site via <b>http://localhost:3000</b>.</div>
         <button class="btn btn-amber" onclick="render()" style="margin-top:14px"><i class="fas fa-rotate-right"></i> Retry</button></div>`
      : `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load feed</div>
         <div class="empty-sub">${esc(e.message)}</div>
         <button class="btn btn-amber" onclick="render()" style="margin-top:14px">Retry</button></div>`;
    root.innerHTML = `<div class="page">${errMsg}</div>`;
  }
}

function setTab(t) {
  if (t === 'curriculum' && !STATE.loggedIn) {
    showGuestActionBanner('curriculum');
    return;
  }
  STATE.feedSort = ['recommended'];
  STATE.advancedTarget = null;
  // setSearchMode sets both STATE.activeTab and STATE.searchMode, and
  // syncs the nav bar's toggle button to match -- previously only the
  // internal state was updated here, so the visible button (and thus
  // what mode a fresh search would run in) could silently disagree with
  // the tab you were actually looking at.
  if (typeof setSearchMode === 'function') setSearchMode(t, true);
  else { STATE.activeTab = t; STATE.searchMode = t; }
  render();
}

// ── SEARCH ─────────────────────────────────────────────────
async function renderSearchPage(root) {
  if (!root) root = document.getElementById('appRoot');
  const q    = STATE.routeData?.q || '';
  const u    = STATE.currentUser;
  const isGuest = !STATE.loggedIn || !u;
  // Guests default to Science search (Curriculum needs a signed-in grade/
  // country to filter by — same convention as the Home page's tab default).
  // An EXPLICIT mode (the mode toggle, or any real search, always sets one
  // via routeData) is still honored even for guests, so choosing Curriculum
  // on purpose shows the sign-in banner below instead of silently switching.
  const mode = STATE.routeData?.mode || (isGuest ? 'science' : STATE.searchMode) || 'curriculum';
  // Keep the mode-toggle button and STATE.searchMode in sync with whichever
  // mode this specific search is actually in -- this is what makes a
  // reloaded /search?q=...&mode=science URL come back showing "Science"
  // instead of silently reverting to the default Curriculum mode.
  if (typeof setSearchMode === 'function') setSearchMode(mode, true);
  const searchInputEl = document.getElementById('searchInput');
  const mobSearchInputEl = document.getElementById('mobSearchInput');
  if (searchInputEl) searchInputEl.value = q;
  if (mobSearchInputEl) mobSearchInputEl.value = q;
  const sort = normalizeSortArr(STATE.searchSort);
  const isDefaultSort = sort.length === 1 && sort[0] === 'recommended';

  try {
    if (isGuest && mode === 'curriculum') {
      // ── CURRICULUM SEARCH, LOCKED (guest) ──────────────────────
      // Mirrors the Home page's Curriculum-tab lock: a guest has no
      // grade/country to match against, so rather than silently
      // returning an unfiltered, unpersonalized list under a
      // "Curriculum" label, show the same sign-in prompt used there.
      root.innerHTML = `<div class="page">
        <div class="member-gate" style="margin-top:8px">
          <div class="member-gate-icon">🔒</div>
          <div class="member-gate-title">Curriculum search is personal</div>
          <div class="member-gate-sub">Sign in and we'll search only summaries that match your exact grade, school type, and country — not everything on the platform.</div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="openSignIn()"><i class="fas fa-right-to-bracket"></i> Sign In</button>
            <button class="btn btn-ghost-gold" onclick="openSignUp()"><i class="fas fa-user-plus"></i> Sign Up</button>
          </div>
          <div style="margin-top:16px">
            <span class="sec-more" onclick="navigate('search',{q:STATE.routeData?.q||'',mode:'science'})"><i class="fas fa-flask"></i> Or search the Science Feed →</span>
          </div>
        </div>
      </div>`;
      return;
    }

    // The client always re-applies the real sort afterward (needed for
    // multi-key compound sorts anyway), so just fetch a sensible base order.
    let params = `sort=recommended`;
    if (q) params += `&q=${encodeURIComponent(q)}`;
    // Pass mode so the backend can apply curriculum strictness
    params += `&mode=${mode}`;
    let results = await api('GET', `/summaries?${params}`) || [];

    results = applyActiveFilters(results);
    results = applySortKeys(results, sort, u);

    // Mode label for header
    const modeLabel = mode === 'curriculum'
      ? `<span style="font-size:11px;padding:3px 9px;border-radius:99px;background:var(--gold-dim);color:var(--gold);font-weight:800;margin-left:8px">📚 Curriculum</span>`
      : `<span style="font-size:11px;padding:3px 9px;border-radius:99px;background:var(--amber-dim);color:var(--amber);font-weight:800;margin-left:8px">🔬 Science</span>`;

    // Defilter suggestions when no results
    const noResultsHTML = () => {
      const canSwitchMode = !isGuest;
      const otherMode = mode === 'curriculum' ? 'science' : 'curriculum';
      const suggestions = [];
      if (q) suggestions.push(`<button class="btn btn-surf btn-sm" onclick="navigate('search',{q:'',mode:'${mode}'})"><i class="fas fa-times"></i> Clear search</button>`);
      if (!isDefaultSort) suggestions.push(`<button class="btn btn-surf btn-sm" onclick="setSearchSort('recommended')"><i class="fas fa-wand-magic-sparkles"></i> Reset sort</button>`);
      if (STATE.activeFilters?.subjects?.length || STATE.activeFilters?.langs?.length) suggestions.push(`<button class="btn btn-surf btn-sm" onclick="clearActiveFilters()"><i class="fas fa-xmark"></i> Clear filters</button>`);
      if (canSwitchMode) suggestions.push(`<button class="btn btn-ghost btn-sm" onclick="navigate('search',{q:STATE.routeData.q||'',mode:'${otherMode}'})"><i class="fas fa-repeat"></i> Try ${otherMode} search</button>`);
      return `<div class="empty">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No results found</div>
        <div class="empty-sub" style="margin-bottom:16px">${
          mode === 'curriculum'
            ? `No summaries match your exact curriculum (${u?.grade || 'your grade'} · ${u?.country || ''}).`
            : `No summaries match "${q}".`
        }<br>Try removing some filters or switching modes.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${suggestions.join('')}</div>
      </div>`;
    };

    root.innerHTML = `<div class="page">
      <div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);padding:20px 22px;margin-bottom:18px;display:flex;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--fd);font-size:20px;font-weight:800;display:flex;align-items:center;flex-wrap:wrap;gap:4px">
            ${q ? `"${esc(q)}"` : 'All Summaries'}${modeLabel}
          </div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">${results.length} result${results.length !== 1 ? 's' : ''}</div>
        </div>
        ${!isGuest ? `<button class="btn btn-surf btn-sm" onclick="navigate('search',{q:STATE.routeData.q||'',mode:'${mode === 'curriculum' ? 'science' : 'curriculum'}'})"><i class="fas fa-repeat"></i> Switch to ${mode === 'curriculum' ? 'Science' : 'Curriculum'}</button>` : ''}
      </div>
      ${sortBarHTML(sort, 'setSearchSort', mode === 'science' ? 'science' : 'feed')}
      ${filterBarHTML()}
      <div class="card-grid">${results.length
        ? results.map(s => cardHTML(s, s.is_promoted ? '⚡ Promoted' : '')).join('')
        : noResultsHTML()
      }</div>
    </div>`;

  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Search error</div><div class="empty-sub">${esc(e.message)}</div></div></div>`;
  }
}

// ── VIEWER ─────────────────────────────────────────────────
let _viewerPage = 1;
let _viewerCurrentId = null; // track which summary is open

async function renderViewer(root, id) {
  // Reset to page 1 whenever a different summary is opened
  if (id !== _viewerCurrentId) {
    _viewerPage = 1;
    _viewerCurrentId = id;
  }
  if (!id) { root.innerHTML = `<div class="viewer"><div class="empty"><div class="empty-icon">❓</div><div class="empty-title">No summary selected</div></div></div>`; return; }

  try {
    const s = await api('GET', `/summaries/${id}`);
    if (!s) throw new Error('Not found');

    // Update page meta for this specific summary
    updateMeta({
      title: s.title,
      description: `${s.subject} — ${s.grade || ''} ${s.country ? '· ' + s.country : ''} | ${s.author || ''}`.trim(),
    });

    // Update page meta with real summary data for SEO
    const base = 'Mol5sat — ملخصات تعليمية عالمية';
    document.title = `${s.title} — ${s.subject} — ${base}`;
    const summaryDesc = `ملخص ${s.subject} للصف ${s.grade || ''} — ${s.country || ''}. بقلم ${s.author || ''}. ${s.pages} صفحة. ${fmt(s.views)} مشاهدة.`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', summaryDesc);
    const og = (prop, val) => { const el = document.querySelector(`meta[property="${prop}"]`); if (el) el.setAttribute('content', val); };
    og('og:title', document.title);
    og('og:description', summaryDesc);
    const tw = (name, val) => { const el = document.querySelector(`meta[name="${name}"]`); if (el) el.setAttribute('content', val); };
    tw('twitter:title', document.title);
    tw('twitter:description', summaryDesc);

    const icon = SUBJECT_ICONS[s.subject] || '📄';
    const u = STATE.currentUser;
    const canFollow = u && s.author_id && u.id !== s.author_id;
    const ads = s.is_paid && s.companyAds && s.companyAds.length > 0 && s.ad_every > 0;
    const _companyId = ads ? s.companyAds[0] : null;
    const company = _companyId
      ? (typeof MOCK_COMPANIES !== 'undefined' ? MOCK_COMPANIES.find(c => c.id === _companyId) : null) || { name: _companyId, logo: '🏢', desc: '', category: 'Sponsor' }
      : null;
    const canRead = !s.membership_required
      || !!s.userHasMembership
      || (STATE.currentUser?.id === s.author_id)
      || (STATE.currentUser?.role === 'admin' || STATE.currentUser?.role === 'supervisor');
    const author = s.authorData;

    // ── Content pagination ───────────────────────────────────────────────
    // Split the real content into pages at natural break points: <hr>,
    // then <h2> groups, then (if neither exists) evenly by length so the
    // page count lines up with what the summary claims (s.pages) instead
    // of collapsing everything onto a single unnavigable page.
    const rawContent = s.content || `<h2>Introduction</h2><p>This summary covers <b>${s.subject}</b>.</p>`;

    function paginateByLength(html, targetChars) {
      // Split into block-level chunks, each keeping its own closing tag,
      // so we only ever break BETWEEN elements, never mid-tag/mid-word.
      const blocks = html.match(/[\s\S]*?<\/(?:p|h1|h2|h3|h4|h5|ul|ol|li|blockquote|table|div|pre)>/gi);
      if (!blocks || blocks.length <= 1) return [html]; // nothing safe to split on
      const pages = [];
      let current = '', currentLen = 0;
      for (const block of blocks) {
        const textLen = block.replace(/<[^>]+>/g, '').length;
        if (currentLen > 0 && currentLen + textLen > targetChars) {
          pages.push(current);
          current = block; currentLen = textLen;
        } else {
          current += block; currentLen += textLen;
        }
      }
      if (current.trim()) pages.push(current);
      return pages.length ? pages : [html];
    }

    function paginateContent(html, targetPageCount) {
      // Try splitting at <hr> first
      const hrParts = html.split(/<hr\s*\/?>/i).filter(p => p.trim());
      if (hrParts.length > 1) return hrParts;
      // Try splitting at every 2nd <h2> tag
      const h2Parts = html.split(/(?=<h2[\s>])/i);
      if (h2Parts.length > 2) {
        // Group into chunks of 2 h2s per page
        const pages = [];
        for (let i = 0; i < h2Parts.length; i += 2) {
          pages.push(h2Parts.slice(i, i + 2).join(''));
        }
        return pages.filter(p => p.trim());
      }
      // No natural breaks — split evenly by length, aiming for roughly
      // `targetPageCount` pages (the page count the summary was uploaded
      // with), with a floor so very short content doesn't get shredded
      // into dozens of near-empty pages.
      const totalTextLen = html.replace(/<[^>]+>/g, '').length;
      const perPage = Math.max(400, Math.ceil(totalTextLen / Math.max(1, targetPageCount || 1)));
      return paginateByLength(html, perPage);
    }

    const contentPages = paginateContent(rawContent, s.pages);

    const adDuration = s.ad_duration_seconds || 10;
    const adHtml = company ? `<div class="ad-break" id="adBlock_${s.id}">
      <div class="ad-break-label">📢 Sponsored</div>
      <div class="ad-break-body">${company.logo || '🏢'} <b>${company.name}</b> — ${company.desc || ''}</div>
      <div class="ad-break-sponsor">${company.category || ''} Partner</div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;justify-content:center">
        <span style="font-size:11px;color:var(--text3)">Ad ends in</span>
        <span id="adTimer_${s.id}" style="font-family:var(--fd);font-size:13px;font-weight:800;color:var(--amber);min-width:24px;text-align:center">${adDuration}s</span>
        <div style="flex:1;max-width:120px;height:3px;background:var(--surf3);border-radius:99px;overflow:hidden">
          <div id="adBar_${s.id}" style="height:100%;background:var(--amber);width:100%;transition:width ${adDuration}s linear;border-radius:99px"></div>
        </div>
      </div>
    </div>
    <div id="adStartBtn_${s.id}" data-dur="${adDuration}" data-timer="adTimer_${s.id}" data-bar="adBar_${s.id}" style="display:none"></div>` : '';

    // Insert ad before every adEvery-th page (e.g. every 5 pages)
    const adEvery = (s.is_paid && s.ad_every > 0) ? s.ad_every : 0;
    const pages = contentPages.map((pageContent, i) => {
      const showAd = adEvery > 0 && i > 0 && i % adEvery === 0;
      return (showAd ? adHtml : '') + pageContent;
    });
    if (pages.length === 0) pages.push(rawContent);

    const pg = Math.min(_viewerPage, pages.length);

    const membershipBlock = author?.has_membership && canFollow ? `
      <div class="membership-card" style="margin-top:16px">
        <h3><i class="fas fa-crown"></i> Join ${author.name}'s Membership</h3>
        <div class="membership-price">EGP ${author.membership_price}<span> / month</span></div>
        <div class="membership-perks">${author.membership_perks || 'Exclusive content and perks.'}</div>
        <button class="btn btn-crown" onclick="joinMembership('${author.id}')"><i class="fas fa-crown"></i> Join Membership</button>
      </div>` : '';

    root.innerHTML = `<div class="viewer">
      <button class="btn btn-surf btn-sm" onclick="goBack()" style="margin-bottom:16px"><i class="fas fa-arrow-left"></i> Back</button>
      <div class="viewer-header">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap">
          <span style="font-size:42px">${icon}</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${s.is_promoted ? '<span class="badge badge-ad"><i class="fas fa-bolt"></i> Promoted</span>' : ''}
            ${s.is_sponsored ? '<span class="badge badge-rec"><i class="fas fa-handshake"></i> Sponsored</span>' : ''}
            ${s.membership_required ? '<span class="badge badge-crown"><i class="fas fa-crown"></i> Members Only</span>' : ''}
            <span class="badge badge-surf">${(s.lang || 'ar').toUpperCase()}</span>
            <span class="badge" style="background:var(--amber-dim);color:var(--amber)">${s.subject}</span>
          </div>
        </div>
        <div class="viewer-title">${s.title}</div>
        <div class="viewer-meta">
          <a href="/user/${s.author_id}" onclick="navigate('creator',{id:'${s.author_id}'});return false;" style="cursor:pointer;color:var(--amber);font-weight:700;text-decoration:none"><i class="fas fa-user"></i> ${s.author || 'Unknown'}${s.author_username ? ` <span style="color:var(--text3);font-weight:400;font-size:11px">@${s.author_username}</span>` : ''}</a>
          <span><i class="fas fa-graduation-cap"></i> ${s.grade || '—'}</span>
          <span><i class="fas fa-globe"></i> ${s.country || '—'}</span>
          <span><i class="fas fa-eye"></i> ${fmt(s.views)}</span>
          <span><i class="fas fa-heart"></i> ${fmt(s.likes)}</span>
          <span><i class="fas fa-file-lines"></i> ${s.pages} pages</span>
        </div>
        <div class="viewer-actions">
          <button class="btn ${s.userLiked ? 'btn-amber' : 'btn-primary'} btn-sm" id="likeBtn" onclick="likeSummary('${s.id}')">
            <i class="fas fa-heart"></i> ${s.userLiked ? 'Liked' : 'Like'}
          </button>
          <button class="btn ${s.userSaved ? 'btn-surf' : 'btn-surf'} btn-sm" id="saveBtn" onclick="saveSummary('${s.id}')">
            <i class="fas fa-bookmark"></i> ${s.userSaved ? 'Saved' : 'Save'}
          </button>
          <button class="btn btn-surf btn-sm" onclick="copyShare('${s.id}')"><i class="fas fa-share-nodes"></i> Share</button>
          ${canFollow ? `<button class="btn btn-amber btn-sm" data-follow="${s.author_id}" onclick="toggleFollow('${s.author_id}')"><i class="fas fa-plus"></i> Follow</button>` : ''}
          ${u && s.author_id !== u?.id ? `<button class="btn btn-surf btn-sm" style="color:var(--coral)" onclick="openReportModal('${s.id}','${s.title.replace(/'/g,"\\'")}')"><i class="fas fa-flag"></i> Report</button>` : ''}
          ${u?.role === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="adminRemoveSummary('${s.id}')"><i class="fas fa-trash"></i> Remove</button>` : ''}
          ${u && s.author_id === u.id ? `<button class="btn btn-surf btn-sm" onclick="openPromoteModal('${s.id}','${s.title.replace(/'/g,"\\'")}')"><i class="fas fa-rocket"></i> Promote</button>` : ''}
        </div>
        ${membershipBlock}
      </div>
      ${canRead ? `
      <div class="viewer-body" id="viewerBody">
        ${pages[pg - 1]}
        <div class="viewer-wm" aria-hidden="true">
          mol5sat.org · ${u?.name || 'Guest'} · ${new Date().toLocaleDateString()} · ID:${s.id?.slice(0,8)}
        </div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:clamp(14px,3vw,22px);font-weight:900;color:rgba(255,184,0,0.045);white-space:nowrap;pointer-events:none;user-select:none;letter-spacing:2px;z-index:0;font-family:var(--fd)" aria-hidden="true">
          MOL5SAT · ${(u?.name || 'GUEST').toUpperCase()} · ${new Date().getFullYear()}
        </div>
      </div>
      <div class="viewer-nav">
        <button class="btn btn-surf btn-sm" onclick="changeViewPage(-1)" ${pg <= 1 ? 'disabled style="opacity:.4"' : ''}><i class="fas fa-chevron-left"></i> Prev</button>
        <div class="page-ind">Page ${pg} of ${pages.length}</div>
        <button class="btn btn-surf btn-sm" onclick="changeViewPage(1)" ${pg >= pages.length ? 'disabled style="opacity:.4"' : ''}>Next <i class="fas fa-chevron-right"></i></button>
      </div>
      <div class="viewer-body" style="margin-top:16px">
        <div class="sec-head" style="margin-bottom:16px">
          <div class="sec-title"><i class="fas fa-comments" style="color:var(--amber)"></i> Comments <span id="commentCount" style="color:var(--text2);font-weight:500;font-size:12px"></span></div>
          <div class="comment-sort-chips">
            <span class="comment-sort-chip active" onclick="loadComments('${s.id}','newest',this)">Newest</span>
            <span class="comment-sort-chip" onclick="loadComments('${s.id}','top',this)">Top</span>
          </div>
        </div>
        <div class="comment-compose">
          <div class="comment-av">${STATE.loggedIn && u ? (u.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?'}</div>
          <div class="comment-input-wrap">
            <textarea class="comment-input" id="commentBox" placeholder="Add a comment…" maxlength="2000" rows="1"
              oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';document.getElementById('commentSubmitRow').style.display=this.value.trim()?'flex':'none'"></textarea>
            <div class="comment-submit-row" id="commentSubmitRow" style="display:none">
              <button class="btn btn-surf btn-sm" onclick="cancelComment()">Cancel</button>
              <button class="btn btn-amber btn-sm" onclick="submitComment('${s.id}')"><i class="fas fa-paper-plane"></i> Post</button>
            </div>
          </div>
        </div>
        <div class="comment-list" id="commentList">
          <div class="spinner" style="margin:24px auto"></div>
        </div>
      </div>` : `
      <div class="viewer-body">
        <div class="member-gate">
          <div class="member-gate-icon">👑</div>
          <div class="member-gate-title">Members Only Content</div>
          <div class="member-gate-sub">This summary is exclusive to <b>${s.author || ''}'s</b> members.<br>Join for EGP ${author?.membership_price || 0}/month to access all exclusive content.</div>
          <button class="btn btn-crown btn-lg" onclick="joinMembership('${s.author_id}')"><i class="fas fa-crown"></i> Join Membership</button>
        </div>
      </div>`}
    </div>`;
    if (canRead) loadComments(id, _commentSort);
  } catch (e) {
    root.innerHTML = `<div class="viewer"><button class="btn btn-surf btn-sm" onclick="goBack()" style="margin-bottom:16px"><i class="fas fa-arrow-left"></i> Back</button><div class="empty"><div class="empty-icon">❓</div><div class="empty-title">Summary not found</div><div class="empty-sub">${esc(e.message)}</div></div></div>`;
  }
}

function changeViewPage(dir) {
  _viewerPage = Math.max(1, (_viewerPage || 1) + dir);
  renderViewer(document.getElementById('appRoot'), STATE.routeData?.id);
}

// Ad timer — runs after viewer renders, no inline scripts needed (CSP-safe)
function _startAdTimers() {
  document.querySelectorAll('[data-dur][data-timer]').forEach(el => {
    let t = parseInt(el.dataset.dur) || 10;
    const timerEl = document.getElementById(el.dataset.timer);
    const barEl   = document.getElementById(el.dataset.bar);
    if (!timerEl) return;
    setTimeout(() => { if (barEl) barEl.style.width = '0%'; }, 50);
    const iv = setInterval(() => {
      t--;
      timerEl.textContent = t + 's';
      if (t <= 0) { clearInterval(iv); timerEl.textContent = '✓'; }
    }, 1000);
  });
}

// ══════════════════════════════════════════════════════
//  COMMENTS SYSTEM
// ══════════════════════════════════════════════════════
let _commentSort = 'newest';
let _replyingTo  = null;

function cancelComment() {
  const box = document.getElementById('commentBox');
  const row = document.getElementById('commentSubmitRow');
  if (box) { box.value = ''; box.style.height = 'auto'; }
  if (row) row.style.display = 'none';
  _replyingTo = null;
}

function commentAvatar(name, photo) {
  if (photo) return `<img src="${photo}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:1px solid var(--bord)" alt="">`;
  const i = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return `<div class="comment-item__av">${i}</div>`;
}

function commentHtml(c, summaryId, depth=0) {
  const u = STATE.currentUser;
  const isOwner = u && u.id === c.user_id;
  const isMod   = u && (u.role === 'admin' || u.role === 'supervisor');
  const canPin  = isMod;
  const timeFmt = (ts) => {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return d.toLocaleDateString();
  };
  const pinBadge = c.is_pinned ? '<span class="badge badge-gold" style="font-size:9px"><i class="fas fa-thumbtack"></i> Pinned</span>' : '';
  const av = commentAvatar(c.author_name, c.author_photo);
  const replies = (c.replies||[]).map(r => commentHtml(r, summaryId, 1)).join('');

  return `<div class="comment-item ${c.is_pinned?'comment-pinned':''}" id="cmt_${c.id}" style="${depth>0?'margin-left:32px;padding-left:12px;border-left:2px solid var(--bord)':''}">
    <div class="comment-item__header">
      ${av}
      <span class="comment-item__name">${esc(c.author_name||'Unknown')}</span>
      ${c.author_username ? `<span style="color:var(--text3);font-size:10.5px">@${esc(c.author_username)}</span>` : ''}
      <span style="color:var(--text3);font-size:11px;margin-left:auto">${timeFmt(c.created_at)}</span>
      ${pinBadge}
    </div>
    <div class="comment-item__body" style="font-size:13.5px;line-height:1.6;color:${c.is_deleted?'var(--text3)':'var(--text)'};font-style:${c.is_deleted?'italic':'normal'};padding-left:38px">
      ${c.is_deleted ? '[This comment was removed]' : esc(c.body)}
    </div>
    ${!c.is_deleted ? `<div style="display:flex;align-items:center;gap:12px;padding-left:38px;margin-top:7px">
      <button class="comment-action-btn ${c.user_liked?'liked':''}" onclick="likeComment('${c.id}','${summaryId}',this)">
        <i class="fas fa-heart"></i> <span class="cmt-likes">${c.likes||0}</span>
      </button>
      ${depth===0 && STATE.loggedIn ? `<button class="comment-action-btn" onclick="startReply('${c.id}','${esc(c.author_name)}','${summaryId}')"><i class="fas fa-reply"></i> Reply</button>` : ''}
      ${isOwner || isMod ? `<button class="comment-action-btn danger" onclick="deleteComment('${c.id}','${summaryId}')"><i class="fas fa-trash"></i></button>` : ''}
      ${canPin ? `<button class="comment-action-btn" onclick="pinComment('${c.id}','${summaryId}',this)"><i class="fas fa-thumbtack"></i> ${c.is_pinned?'Unpin':'Pin'}</button>` : ''}
    </div>` : ''}
    ${replies ? `<div class="comment-replies" style="margin-top:10px">${replies}</div>` : ''}
    <div id="replyBox_${c.id}" style="display:none;margin-top:10px;padding-left:38px"></div>
  </div>`;
}

async function loadComments(summaryId, sort='newest', chipEl=null) {
  if (!summaryId) return;
  _commentSort = sort;
  const list = document.getElementById('commentList');
  const countEl = document.getElementById('commentCount');
  if (!list) return;
  if (chipEl) {
    document.querySelectorAll('.comment-sort-chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');
  }
  try {
    const data = await api('GET', `/comments/${summaryId}?sort=${sort==='newest'?'date':'top'}`);
    if (countEl) countEl.textContent = `(${data.length})`;
    if (!data.length) {
      list.innerHTML = '<div class="empty" style="padding:28px 0"><div class="empty-icon">💬</div><div class="empty-title">No comments yet</div><div class="empty-sub">Be the first to share your thoughts!</div></div>';
      return;
    }
    list.innerHTML = data.map(c => commentHtml(c, summaryId)).join('');
  } catch(e) {
    list.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text2);font-size:13px">Could not load comments</div>`;
  }
}

async function submitComment(summaryId) {
  if (!STATE.loggedIn) { showGuestActionBanner('comment'); return; }
  const box = document.getElementById('commentBox');
  const body = box?.value?.trim();
  if (!body) { toast('Write something first!', 'error', 'fa-exclamation'); return; }
  if (!guardInput(body, 'Comment')) return;
  try {
    const payload = { body };
    if (_replyingTo) payload.parent_id = _replyingTo;
    await api('POST', `/comments/${summaryId}`, payload);
    cancelComment();
    await loadComments(summaryId, _commentSort);
    toast('Comment posted! 💬', 'success', 'fa-comments');
  } catch(e) { toast(e.message, 'error', 'fa-times'); }
}

async function likeComment(commentId, summaryId, btn) {
  if (!STATE.loggedIn) { showGuestActionBanner('like'); return; }
  try {
    const data = await api('POST', `/comments/${summaryId}/${commentId}/like`);
    const likesEl = btn?.querySelector('.cmt-likes');
    if (likesEl) likesEl.textContent = data.likes;
    btn?.classList.toggle('liked', data.liked);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteComment(commentId, summaryId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await api('DELETE', `/comments/${summaryId}/${commentId}`);
    await loadComments(summaryId, _commentSort);
    toast('Comment deleted', 'info', 'fa-trash');
  } catch(e) { toast(e.message, 'error'); }
}

async function pinComment(commentId, summaryId, btn) {
  try {
    const data = await api('PATCH', `/comments/${summaryId}/${commentId}/pin`);
    await loadComments(summaryId, _commentSort);
    toast(data.is_pinned ? 'Comment pinned 📌' : 'Unpinned', 'success', 'fa-thumbtack');
  } catch(e) { toast(e.message, 'error'); }
}

function startReply(parentId, authorName, summaryId) {
  _replyingTo = parentId;
  const replyBox = document.getElementById(`replyBox_${parentId}`);
  if (!replyBox) return;
  document.querySelectorAll('.comment-reply-inline').forEach(el => el.remove());
  const u = STATE.currentUser;
  const av = u ? (u.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?';
  replyBox.style.display = 'block';
  replyBox.innerHTML = `
    <div style="display:flex;gap:10px;align-items:flex-start" class="comment-reply-inline">
      <div class="comment-av" style="width:28px;height:28px;font-size:10px;flex-shrink:0">${av}</div>
      <div style="flex:1">
        <textarea class="comment-input" id="replyBox_input_${parentId}" placeholder="Replying to ${esc(authorName)}…"
          maxlength="2000" rows="2" style="min-height:44px"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
        <div style="display:flex;gap:8px;margin-top:6px;justify-content:flex-end">
          <button class="btn btn-surf btn-sm" onclick="document.getElementById('replyBox_${parentId}').style.display='none';_replyingTo=null">Cancel</button>
          <button class="btn btn-amber btn-sm" onclick="submitReply('${parentId}','${summaryId}')"><i class="fas fa-paper-plane"></i> Reply</button>
        </div>
      </div>
    </div>`;
}

async function submitReply(parentId, summaryId) {
  if (!STATE.loggedIn) { showGuestActionBanner('comment'); return; }
  const box = document.getElementById(`replyBox_input_${parentId}`);
  const body = box?.value?.trim();
  if (!body) { toast('Write something!', 'error'); return; }
  if (!guardInput(body, 'Reply')) return;
  try {
    await api('POST', `/comments/${summaryId}`, { body, parent_id: parentId });
    document.getElementById(`replyBox_${parentId}`).style.display = 'none';
    _replyingTo = null;
    await loadComments(summaryId, _commentSort);
    toast('Reply posted! 💬', 'success', 'fa-comments');
  } catch(e) { toast(e.message, 'error'); }
}

async function likeSummary(id) {
  if (!STATE.loggedIn) { showGuestActionBanner('like'); return; }
  try {
    const data = await api('POST', `/summaries/${id}/like`);
    const btn = document.getElementById('likeBtn');
    if (btn) {
      btn.className = data.liked ? 'btn btn-amber btn-sm' : 'btn btn-primary btn-sm';
      btn.innerHTML = `<i class="fas fa-heart"></i> ${data.liked ? 'Liked' : 'Like'}`;
    }
    toast(data.liked ? 'Liked! ❤️' : 'Unliked', 'success', 'fa-heart');
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}

async function saveSummary(id) {
  if (!STATE.loggedIn) { showGuestActionBanner('save'); return; }
  try {
    const data = await api('POST', `/summaries/${id}/save`);
    const btn = document.getElementById('saveBtn');
    if (btn) btn.innerHTML = `<i class="fas fa-bookmark"></i> ${data.saved ? 'Saved' : 'Save'}`;
    toast(data.saved ? 'Saved! 🔖' : 'Removed from saves', 'success', 'fa-bookmark');
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}

function copyShare(id) {
  // Always share the canonical web URL: mol5sat.org/summary/:id
  // iOS/Android intercept this via Universal Links / App Links and open in the app if installed.
  // If the app is not installed, the browser opens the web page with a smart app banner.
  const url = `${window.location.origin}/summary/${id}`;
  if (navigator.share) {
    // Use native share sheet on mobile (shows WhatsApp, Telegram, etc.)
    navigator.share({
      title: document.title,
      text: 'Check out this summary on Mol5sat 📚',
      url,
    }).catch(() => {}); // user dismissed — fine
  } else {
    navigator.clipboard.writeText(url)
      .then(() => toast('Link copied! 🔗', 'info', 'fa-share-nodes'))
      .catch(() => {
        // Fallback: prompt with the URL
        window.prompt('Copy this link:', url);
      });
  }
}

function copyCreatorShare(id) {
  // Share a creator's profile page — /user/:id — which now has real OG tags
  // and a generated preview image server-side, so it shows correctly when
  // pasted into WhatsApp, Telegram, Twitter, etc.
  const url = `${window.location.origin}/user/${id}`;
  if (navigator.share) {
    navigator.share({
      title: document.title,
      text: 'Check out this creator on Mol5sat 📚',
      url,
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => toast('Link copied! 🔗', 'info', 'fa-share-nodes'))
      .catch(() => { window.prompt('Copy this link:', url); });
  }
}

// ── PROFILE ────────────────────────────────────────────────
async function renderProfile(root) {
  const u = STATE.currentUser;
  const i = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  try {
    const profile = await api('GET', `/users/${u.id}`);
    const myUploads = profile.summaries || [];

    root.innerHTML = `<div class="page page--narrow">
      <div class="profile-header">
        <div class="profile-banner" id="profileBanner"
          style="${u.bannerDataUrl ? `background:url('${u.bannerDataUrl}') center/cover no-repeat` : ''}"
          title="Click to edit banner">
          <label title="Change banner" style="position:absolute;bottom:8px;right:10px;cursor:pointer;background:rgba(0,0,0,.55);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;color:#fff;display:flex;align-items:center;gap:5px;backdrop-filter:blur(4px)">
            <i class="fas fa-image"></i> Edit Banner
            <input type="file" accept="image/*" style="display:none"
              onchange="previewBanner_profile(this)">
          </label>
        </div>
        <div class="profile-content">
          <div class="profile-av" id="profileAvatar"
            style="${u.photo ? `background:url('${u.photo}') center/cover;font-size:0` : ''}"
            title="Click to change photo">
            ${u.photo ? '' : i}
            <label title="Change photo" style="position:absolute;inset:0;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:.2s"
              onmouseenter="this.style.background='rgba(0,0,0,.45)';this.innerHTML='<i class=\'fas fa-camera\' style=\'color:#fff;font-size:18px\'></i>'"
              onmouseleave="this.style.background='rgba(0,0,0,0)';this.innerHTML=''">
              <input type="file" accept="image/*" style="display:none"
                onchange="previewPhoto_profile(this)">
            </label>
          </div>
          <div class="profile-info">
            <h2>${u.name}${u.has_membership ? ` <i class="fas fa-crown" style="color:var(--crown);font-size:16px"></i>` : ''}</h2>
            ${u.username ? `<div class="meta" style="color:var(--amber);font-weight:700;letter-spacing:.3px">@${u.username}</div>` : ''}
            <div class="meta"><i class="fas fa-${(u.userType||u.user_type) === 'colleague' ? 'briefcase' : 'graduation-cap'}"></i> ${(u.userType||u.user_type) === 'colleague' ? u.major || u.specialization : u.grade || '—'}</div>
            <div class="meta"><i class="fas fa-school"></i> ${u.school || u.specialization || '—'}</div>
            <div class="meta"><i class="fas fa-globe"></i> ${u.country}</div>
            <div class="meta"><i class="fas fa-calendar"></i> Joined ${u.joined}</div>
          </div>
          <div style="margin-top:40px;display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-ghost-gold btn-sm" onclick="navTo('settings')"><i class="fas fa-gear"></i> Edit</button>
            <button class="btn btn-amber btn-sm" onclick="openUploadModal()"><i class="fas fa-plus"></i> Upload</button>
            ${u.role !== 'admin' ? `<button class="btn btn-crown btn-sm" onclick="navTo('membership')"><i class="fas fa-crown"></i> Membership</button>` : ''}
            ${u.role !== 'admin' ? `<button class="btn btn-surf btn-sm" onclick="navTo('earnings')"><i class="fas fa-chart-line"></i> Earnings</button>` : ''}
            ${u.role !== 'admin' ? `<button class="btn btn-surf btn-sm" onclick="navTo('wallet')"><i class="fas fa-wallet"></i> Wallet</button>` : ''}
          </div>
        </div>
      </div>
      <div class="stats-bar">
        <div class="stat-box"><div class="stat-val">${myUploads.length}</div><div class="stat-lbl">Summaries</div></div>
        <div class="stat-box"><div class="stat-val a">${fmt(u.followers || 0)}</div><div class="stat-lbl">Followers</div></div>
        <div class="stat-box"><div class="stat-val">${fmt(myUploads.reduce((a,s) => a + (s.likes||0), 0))}</div><div class="stat-lbl">Total Likes</div></div>
      </div>
      ${u.has_membership ? `<div class="membership-card">
        <h3><i class="fas fa-crown"></i> Your Membership Setup</h3>
        <div class="membership-price">EGP ${u.membership_price}<span> / month</span></div>
        <div class="membership-perks">${u.membership_perks || ''}</div>
        <button class="btn btn-crown btn-sm" onclick="navTo('membership')"><i class="fas fa-pen-to-square"></i> Edit Membership</button>
      </div>` : ''}
      <div class="sec-head">
        <div class="sec-title">My Summaries <span class="sec-tag sec-tag-gold">${myUploads.length}</span></div>
        <button class="btn btn-amber btn-sm" onclick="openUploadModal()"><i class="fas fa-plus"></i> New</button>
      </div>
      <div class="card-grid">${myUploads.length
        ? myUploads.map(s => cardHTML(s) + `<div style="padding:6px 14px 10px;border-top:1px solid var(--bord);display:flex;gap:6px">
            <button class="btn btn-surf btn-sm" style="flex:1;font-size:11px" onclick="navigate('viewer',{id:'${s.id}'})"><i class="fas fa-eye"></i> View</button>
            <button class="btn btn-amber btn-sm" style="flex:1;font-size:11px" onclick="openPromoteModal('${s.id}','${s.title.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')"><i class="fas fa-rocket"></i> Promote</button>
          </div>`).join('')
        : `<div class="empty"><div class="empty-icon">📝</div><div class="empty-title">No summaries yet</div><button class="btn btn-amber" style="margin-top:14px" onclick="openUploadModal()"><i class="fas fa-plus"></i> Upload Now</button></div>`
      }</div>
    </div>`;
  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading profile</div></div></div>`;
  }
}

// ── CREATOR ────────────────────────────────────────────────
async function renderCreator(root, id) {
  if (!id) return;
  try {
    const profile = await api('GET', `/users/${id}`);
    const au = profile;
    const initials = au.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const photo = au.profile_photo || au.photo || '';
    const creatorAv = photo
      ? `<img src="${photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--gold)">`
      : `<div class="creator-av">${initials}</div>`;
    const canFollow = STATE.loggedIn && STATE.currentUser && au.id !== STATE.currentUser.id;
    const summaries = applyActiveFilters(au.summaries || []);
    const totalSummaries = (au.summaries || []).length;

    root.innerHTML = `<div class="page page--narrow">
      <button class="btn btn-surf btn-sm" onclick="goBack()" style="margin-bottom:14px"><i class="fas fa-arrow-left"></i> Back</button>
      <div class="creator-header">
        <div class="creator-banner"></div>
        <div class="creator-body">
          ${creatorAv}
          <div class="creator-meta">
            <h2>${au.name}${au.username ? ` <span style="color:var(--text3);font-size:13px;font-weight:400">@${au.username}</span>` : ''}</h2>
            <p><i class="fas fa-globe"></i> ${au.country}</p>
            <p><i class="fas fa-${au.user_type === 'colleague' ? 'briefcase' : 'graduation-cap'}"></i> ${au.user_type === 'colleague' ? (au.major || au.specialization || '') : (au.grade || '—')}</p>
            <p><i class="fas fa-calendar"></i> Joined ${au.joined}</p>
          </div>
          <div style="margin-top:40px;display:flex;gap:8px;flex-wrap:wrap">
            ${canFollow ? `<button class="btn ${au.isFollowing ? 'btn-surf' : 'btn-amber'} btn-sm" data-follow="${au.id}" onclick="toggleFollow('${au.id}')"><i class="fas ${au.isFollowing ? 'fa-check' : 'fa-plus'}"></i> ${au.isFollowing ? 'Following' : 'Follow'}</button>` : ''}
            ${au.has_membership && canFollow ? `<button class="btn ${au.hasMembership ? 'btn-surf' : 'btn-crown'} btn-sm" onclick="joinMembership('${au.id}')"><i class="fas fa-crown"></i> ${au.hasMembership ? 'Joined' : 'Join Membership'}</button>` : ''}
            <button class="btn btn-surf btn-sm" onclick="copyCreatorShare('${au.id}')"><i class="fas fa-share-nodes"></i> Share</button>
          </div>
        </div>
      </div>
      <div class="stats-bar">
        <div class="stat-box"><div class="stat-val">${totalSummaries}</div><div class="stat-lbl">Summaries</div></div>
        <div class="stat-box"><div class="stat-val a">${fmt(au.followers || 0)}</div><div class="stat-lbl">Followers</div></div>
        <div class="stat-box"><div class="stat-val">${fmt((au.summaries || []).reduce((a,s)=>a+(s.likes||0),0))}</div><div class="stat-lbl">Total Likes</div></div>
      </div>
      ${au.has_membership ? `<div class="membership-card">
        <h3><i class="fas fa-crown"></i> ${au.name}'s Membership</h3>
        <div class="membership-price">EGP ${au.membership_price}<span> / month</span></div>
        <div class="membership-perks">${au.membership_perks || ''}</div>
        ${canFollow ? `<button class="btn btn-crown" onclick="joinMembership('${au.id}')"><i class="fas fa-crown"></i> ${au.hasMembership ? 'Cancel Membership' : 'Join for EGP '+au.membership_price+'/mo'}</button>` : ''}
      </div>` : ''}
      <div class="sec-head"><div class="sec-title">📄 Summaries <span class="sec-tag sec-tag-amber">${summaries.length}${summaries.length !== totalSummaries ? ` of ${totalSummaries}` : ''}</span></div></div>
      ${totalSummaries > 0 ? filterBarHTML() : ''}
      <div class="card-grid">${summaries.length ? summaries.map(s => cardHTML(s)).join('') : `<div class="empty"><div class="empty-icon">📝</div><div class="empty-title">${totalSummaries ? 'No summaries match these filters' : 'No summaries yet'}</div>${totalSummaries && (STATE.activeFilters?.subjects?.length || STATE.activeFilters?.langs?.length) ? `<button class="btn btn-surf btn-sm" style="margin-top:12px" onclick="clearActiveFilters()"><i class="fas fa-xmark"></i> Clear filters</button>` : ''}</div>`}</div>
    </div>`;
  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">👤</div><div class="empty-title">Creator not found</div></div></div>`;
  }
}

// ── FOLLOWING ──────────────────────────────────────────────
async function renderFollowing(root) {
  try {
    const following = await api('GET', `/users/${STATE.currentUser.id}/following`);
    const summaries = await api('GET', `/summaries?sort=date`) || [];
    const followingIds = (following || []).map(f => f.id);
    const totalFromFollowed = summaries.filter(s => followingIds.includes(s.author_id));
    const fromFollowed = applyActiveFilters(totalFromFollowed);

    root.innerHTML = `<div class="page">
      <div class="sec-head"><div class="sec-title">👥 Following <span class="sec-tag sec-tag-gold">${(following||[]).length} creators</span></div></div>
      ${(following||[]).length ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:26px">
        ${following.map(f => {
          const ini = f.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
          return `<a href="/user/${f.id}" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius);cursor:pointer;transition:.15s;text-decoration:none;color:inherit" onclick="navigate('creator',{id:'${f.id}'});return false;">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--amber));display:flex;align-items:center;justify-content:center;font-weight:900;color:#000;font-size:13px;font-family:var(--fd)">${ini}</div>
            <div><div style="font-weight:700;font-size:13px">${f.name}</div><div style="font-size:11px;color:var(--text2)">${fmt(f.followers||0)} followers</div></div>
            <button class="btn btn-surf btn-sm" style="margin-left:8px" data-follow="${f.id}" onclick="event.preventDefault();event.stopPropagation();toggleFollow('${f.id}')"><i class="fas fa-check"></i> Following</button>
          </a>`;
        }).join('')}
      </div>` : `<div style="color:var(--text2);font-size:13px;margin-bottom:22px;padding:16px;background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius)">Not following anyone yet.</div>`}
      <div class="sec-head"><div class="sec-title">📄 Latest from Followed <span class="sec-tag sec-tag-amber">${fromFollowed.length}${fromFollowed.length !== totalFromFollowed.length ? ` of ${totalFromFollowed.length}` : ''}</span></div></div>
      ${totalFromFollowed.length ? filterBarHTML() : ''}
      <div class="card-grid">${fromFollowed.length ? fromFollowed.map(s=>cardHTML(s)).join('') : `<div class="empty"><div class="empty-icon">📖</div><div class="empty-title">${totalFromFollowed.length ? 'No summaries match these filters' : 'Nothing yet'}</div>${totalFromFollowed.length && (STATE.activeFilters?.subjects?.length || STATE.activeFilters?.langs?.length) ? `<button class="btn btn-surf btn-sm" style="margin-top:12px" onclick="clearActiveFilters()"><i class="fas fa-xmark"></i> Clear filters</button>` : ''}</div>`}</div>
    </div>`;
  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Error: ${esc(e.message)}</div></div></div>`;
  }
}

// ── SAVED ──────────────────────────────────────────────────
async function renderSaved(root) {
  try {
    const totalSaved = await api('GET', '/summaries/user/saves') || [];
    const saved = applyActiveFilters(totalSaved);
    root.innerHTML = `<div class="page">
      <div class="sec-head"><div class="sec-title">🔖 Saved Summaries <span class="sec-tag sec-tag-gold">${saved.length}${saved.length !== totalSaved.length ? ` of ${totalSaved.length}` : ''}</span></div></div>
      ${totalSaved.length ? filterBarHTML() : ''}
      <div class="card-grid">${saved.length ? saved.map(s=>cardHTML(s)).join('') : totalSaved.length
        ? `<div class="empty"><div class="empty-icon">🔖</div><div class="empty-title">No saved summaries match these filters</div><button class="btn btn-surf btn-sm" style="margin-top:12px" onclick="clearActiveFilters()"><i class="fas fa-xmark"></i> Clear filters</button></div>`
        : `<div class="empty"><div class="empty-icon">🔖</div><div class="empty-title">Nothing saved yet</div><div class="empty-sub">Save summaries while reading to find them here</div></div>`
      }</div>
    </div>`;
  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading saves</div></div></div>`;
  }
}

// ── TRENDING ───────────────────────────────────────────────
async function renderTrending(root) {
  // Trending = most viewed pool. User can re-sort within that pool.
  // Valid re-sorts: likes, date, date-asc, az, za, advanced.
  // "Most Viewed" is NOT an option — that's what trending already is.
  const TREND_SORTS = [
    {k:'likes',    i:'fa-heart',           l:'Top Liked'},
    {k:'date',     i:'fa-calendar-day',    l:'Newest'},
    {k:'date-asc', i:'fa-rotate-left',     l:'Oldest'},
    {k:'az',       i:'fa-arrow-down-a-z',  l:'A → Z'},
    {k:'za',       i:'fa-arrow-up-z-a',    l:'Z → A'},
    ...(STATE.loggedIn ? [{k:'advanced', i:'fa-chart-line', l:'Advanced'}] : []),
  ];

  if (!Array.isArray(STATE.trendingSort)) STATE.trendingSort = []; // [] = default (by views)
  const sort = STATE.trendingSort;
  const u = STATE.currentUser;
  const isAdv = sort.length === 1 && (sort[0] === 'advanced' || sort[0].startsWith('advanced:'));

  // Build sort bar — empty trendingSort = default (most viewed) shown as subtext
  const trendBar = () => {
    const isAdvActive = isAdv;
    const advDropdown = () => {
      if (!isAdvActive || !u) return '';
      const grades = (COUNTRIES[u.country]?.grades || []);
      const userIdx = getGradeIndex(u.country, u.grade);
      const aheadGrades = grades.filter((g, i) => i > userIdx || g === 'University');
      if (!aheadGrades.length) return '';
      const activeKey = sort[0];
      const currentTarget = activeKey.includes(':') ? activeKey.split(':').slice(1).join(':') : 'all';
      const opts = [
        {val:'all',        lbl:'All grades ahead'},
        {val:'university', lbl:'🎓 University only'},
        ...aheadGrades.filter(g => g !== 'University').map(g => ({val:g, lbl:g})),
      ];
      return `<select class="select" style="height:30px;font-size:12px;padding:0 28px 0 10px;border-radius:8px;min-width:170px;margin-left:6px"
        onchange="STATE.trendingSort=['advanced:'+this.value];renderTrending(document.getElementById('appRoot'))">
        ${opts.map(o => `<option value="${o.val}" ${currentTarget===o.val?'selected':''}>${o.lbl}</option>`).join('')}
      </select>`;
    };
    return `<div class="sort-bar" style="flex-wrap:wrap;gap:8px 4px;align-items:center">
      <span class="sort-label">Re-sort:</span>
      <div class="sort-chips" style="flex-wrap:wrap;gap:5px;align-items:center">
        ${TREND_SORTS.map(o => {
          const active = sort.includes(o.k) || (o.k === 'advanced' && isAdvActive);
          return `<span class="sort-chip ${active?'active':''}"
            onclick="STATE.trendingSort=toggleSortInto(STATE.trendingSort,'${o.k}');renderTrending(document.getElementById('appRoot'))"
            title="${o.l}"><i class="fas ${o.i}"></i> ${o.l}</span>`;
        }).join('')}
        ${advDropdown()}
        ${sort.length ? `<span class="sort-chip" onclick="STATE.trendingSort=[];renderTrending(document.getElementById('appRoot'))"
          style="color:var(--text3)"><i class="fas fa-times"></i> Reset</span>` : ''}
      </div>
    </div>`;
  };

  try {
    // Always fetch by views (the trending definition), then re-sort client-side
    let results = await api('GET', '/summaries?sort=views') || [];
    results = applyActiveFilters(results);

    if (sort.length) results = applySortKeys(results, sort, u);
    // empty sort = keep as-is (by views, which is what we fetched)

    const sortNote = sort.length
      ? `<span style="font-size:11px;color:var(--text3);font-weight:500;margin-left:8px">(re-sorted by ${sort.map(k => TREND_SORTS.find(o=>o.k===k||k.startsWith(o.k+':'))?.l||k).join(' → ')})</span>`
      : `<span style="font-size:11px;color:var(--text3);font-weight:500;margin-left:8px">· Most Viewed</span>`;

    root.innerHTML = `<div class="page">
      <div class="sec-head">
        <div class="sec-title">🔥 Trending ${sortNote}</div>
      </div>
      ${trendBar()}
      ${filterBarHTML()}
      <div class="card-grid">${results.length
        ? results.map(s => cardHTML(s)).join('')
        : `<div class="empty"><div class="empty-icon">🔥</div><div class="empty-title">Nothing here</div>
           <div class="empty-sub">Try resetting the sort${(STATE.activeFilters?.subjects?.length || STATE.activeFilters?.langs?.length) ? ' or clearing filters' : ''}.</div>
           <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
             <button class="btn btn-surf btn-sm" onclick="STATE.trendingSort=[];renderTrending(document.getElementById('appRoot'))"><i class="fas fa-times"></i> Reset sort</button>
             ${(STATE.activeFilters?.subjects?.length || STATE.activeFilters?.langs?.length) ? `<button class="btn btn-surf btn-sm" onclick="clearActiveFilters()"><i class="fas fa-xmark"></i> Clear filters</button>` : ''}
           </div>
           </div>`
      }</div>
    </div>`;
  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load trending</div><div class="empty-sub">${esc(e.message)}</div></div></div>`;
  }
}

// ── SUBJECTS ───────────────────────────────────────────────
function renderSubjects() {
  return `<div class="page">
    <div style="font-family:var(--fd);font-size:22px;font-weight:800;margin-bottom:22px">🔬 All Subjects</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px">
      ${SUBJECTS.map(s => `<div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius);padding:20px;cursor:pointer;text-align:center;transition:.18s" onmouseenter="this.style.borderColor='var(--amber)'" onmouseleave="this.style.borderColor='var(--bord)'" onclick="navTo('search',{q:'${s}'})">
        <div style="font-size:34px;margin-bottom:10px">${SUBJECT_ICONS[s]||'📄'}</div>
        <div style="font-family:var(--fd);font-size:14px;font-weight:800">${s}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

// ── NOTIFICATIONS ──────────────────────────────────────────
// Pick an icon for a notification based on its content. Most notifications
// from the backend already start with a meaningful emoji (✅ ❌ ⚠️ 🚨 🚩 🌐
// 💰 🎉 👑 🚫 🚀) — reuse that directly so the icon always matches the
// actual message. Plain-text ones (follow, plain upload) get a sensible
// icon inferred from the text itself.
function notifIcon(text) {
  text = String(text || '');
  const leadingEmoji = text.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?/u);
  if (leadingEmoji) return leadingEmoji[0];
  if (/started following you/i.test(text)) return '👤';
  if (/uploaded/i.test(text)) return '📄';
  return '🔔';
}

// Decide where clicking a notification should go. Summary-related
// notifications (upload, approval, report, plagiarism) carry a summary_id
// and go to the viewer. Follow/membership notifications carry an actor_id
// instead and go to that person's profile. Anything with neither (a
// platform-wide message, a ban notice) just marks read with nowhere to go.
function notifTarget(n) {
  if (n.summary_id) return { route: 'viewer', data: { id: n.summary_id } };
  if (n.actor_id)   return { route: 'creator', data: { id: n.actor_id } };
  return null;
}

async function renderNotifications(root) {
  try {
    await loadNotifications();
  } catch (e) {
    // loadNotifications re-throws specifically when the session expired and
    // api() has already redirected to landing — that redirect's own render()
    // call already replaced root.innerHTML correctly. If we're still here,
    // something else went wrong; show a real error instead of leaving
    // whatever was on screen (the loading spinner) stuck indefinitely.
    if (STATE.route === 'notifications') {
      root.innerHTML = `<div class="page page--narrow"><div class="empty">
        <div class="empty-icon">⚠️</div><div class="empty-title">Couldn't load notifications</div>
        <div class="empty-sub">${esc(e.message || 'Something went wrong.')}</div>
        <button class="btn btn-surf" style="margin-top:14px" onclick="navigate('notifications')"><i class="fas fa-rotate"></i> Try again</button>
      </div></div>`;
    }
    return;
  }
  const notifs = (STATE.notifications || []).filter(n => n && typeof n === 'object' && n.id);

  let listHtml;
  try {
    listHtml = notifs.length ? `<div class="notif-panel">
      ${notifs.map(n => {
        const target = notifTarget(n);
        return `<div class="notif-item ${!n.read ? 'unread' : ''}" ${target ? `onclick="openNotif('${n.id}','${target.route}','${target.data.id}')" style="cursor:pointer"` : `onclick="markOneRead('${n.id}')"`}>
          ${!n.read ? '<div class="notif-dot"></div>' : '<div style="width:8px;flex-shrink:0"></div>'}
          <div style="font-size:18px;flex-shrink:0;line-height:1">${notifIcon(n.text)}</div>
          <div class="notif-text">${esc(n.text)}</div>
          <div class="notif-time">${n.created_at ? timeAgo(n.created_at) : (n.time || '')}</div>
          <button class="notif-delete" title="Delete" onclick="event.stopPropagation();deleteNotif('${n.id}')"><i class="fas fa-times"></i></button>
        </div>`;
      }).join('')}
    </div>` : `<div class="empty"><div class="empty-icon">🔔</div><div class="empty-title">No notifications yet</div><div class="empty-sub">Follow creators to get notified when they upload.</div></div>`;
  } catch (e) {
    // A single malformed notification shouldn't be able to take the whole
    // page down and leave the loading spinner stuck — show the rest of the
    // page normally and explain that something specific didn't render.
    console.warn('[renderNotifications] failed to build notification list:', e);
    listHtml = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Couldn't display your notifications</div><div class="empty-sub">Something about the data didn't look right. Try refreshing — if it keeps happening, let us know.</div></div>`;
  }

  root.innerHTML = `<div class="page page--narrow">
    <div class="sec-head">
      <div class="sec-title">🔔 Notifications <span class="sec-tag sec-tag-amber">${STATE.unreadCount} unread</span></div>
      <div style="display:flex;gap:6px">
        ${notifs.length ? `<button class="btn btn-surf btn-sm" onclick="markAllRead()"><i class="fas fa-check-double"></i> Mark all read</button>` : ''}
        ${notifs.length ? `<button class="btn btn-surf btn-sm" onclick="clearAllNotifs()"><i class="fas fa-trash"></i> Clear all</button>` : ''}
      </div>
    </div>
    ${listHtml}
  </div>`;
}

async function markAllRead() {
  await api('PATCH', '/users/me/notifications/read');
  STATE.notifications.forEach(n => n.read = true);
  STATE.unreadCount = 0;
  updateNotifBadge();
  renderNotifications(document.getElementById('appRoot'));
}

async function markOneRead(notifId) {
  const n = STATE.notifications.find(x => x.id === notifId);
  if (n && !n.read) {
    await api('PATCH', `/users/me/notifications/${notifId}/read`);
    n.read = true;
    STATE.unreadCount = Math.max(0, STATE.unreadCount - 1);
    updateNotifBadge();
    renderNotifications(document.getElementById('appRoot'));
  }
}

async function openNotif(notifId, route, targetId) {
  const n = STATE.notifications.find(x => x.id === notifId);
  if (n && !n.read) {
    await api('PATCH', `/users/me/notifications/${notifId}/read`);
    n.read = true;
    STATE.unreadCount = Math.max(0, STATE.unreadCount - 1);
    updateNotifBadge();
  }
  if (route && targetId) navigate(route, { id: targetId });
}

async function deleteNotif(notifId) {
  try {
    await api('DELETE', `/users/me/notifications/${notifId}`);
    const wasUnread = STATE.notifications.find(n => n.id === notifId)?.read === false;
    STATE.notifications = STATE.notifications.filter(n => n.id !== notifId);
    if (wasUnread) STATE.unreadCount = Math.max(0, STATE.unreadCount - 1);
    updateNotifBadge();
    renderNotifications(document.getElementById('appRoot'));
  } catch (e) {
    toast(e.message || 'Could not delete notification', 'error', 'fa-exclamation');
  }
}

async function clearAllNotifs() {
  if (!window.confirm('Delete all notifications? This cannot be undone.')) return;
  try {
    await api('DELETE', '/users/me/notifications');
    STATE.notifications = [];
    STATE.unreadCount = 0;
    updateNotifBadge();
    renderNotifications(document.getElementById('appRoot'));
    toast('All notifications cleared', 'info', 'fa-trash');
  } catch (e) {
    toast(e.message || 'Could not clear notifications', 'error', 'fa-exclamation');
  }
}

// ── SETTINGS ───────────────────────────────────────────────
function renderSettings(root) {
  const u = STATE.currentUser;
  const isColleague = (u.userType || u.user_type) === 'colleague';
  const cData = COUNTRIES[u.country] || {};

  root.innerHTML = `<div class="page page--narrow">
    <div style="margin-bottom:22px"><div style="font-family:var(--fd);font-size:22px;font-weight:800;margin-bottom:4px">⚙️ Settings</div><div style="color:var(--text2);font-size:13px">Manage your profile and preferences</div></div>
    <div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);padding:22px;margin-bottom:16px">
      <div style="font-family:var(--fd);font-size:15px;font-weight:800;margin-bottom:16px;color:var(--amber)">Profile</div>
      <div class="fgrid">
        <div class="field"><label>Display Name</label><input class="input gf" id="s-name" value="${u.name}"></div>
        <div class="field"><label>Email</label><input class="input" id="s-email" type="email" value="${u.email}" disabled style="opacity:.6"></div>
        <div class="fgrid fgrid2">
          <div class="field"><label>Country</label><select class="select" id="s-country" onchange="sCountryChange()">${ALL_COUNTRIES.map(c=>`<option value="${c}" ${c===u.country?'selected':''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label>I am a…</label><select class="select" id="s-utype" onchange="sTypeChange()">
            <option value="student" ${!isColleague?'selected':''}>Student</option>
            <option value="colleague" ${isColleague?'selected':''}>Colleague / University</option>
          </select></div>
        </div>
        <div id="s-student-sec" ${isColleague?'style="display:none"':''}>
          <div class="fgrid fgrid2">
            <div class="field"><label>School Type</label><select class="select" id="s-school">${(cData.schoolTypes||['General']).map(t=>`<option ${t===u.school?'selected':''}>${t}</option>`).join('')}</select></div>
            <div class="field"><label>Grade</label><select class="select" id="s-grade">${(cData.grades||['General']).map(g=>`<option ${g===u.grade?'selected':''}>${g}</option>`).join('')}</select></div>
          </div>
        </div>
        <div id="s-colleague-sec" ${!isColleague?'style="display:none"':''}>
          <div class="fgrid fgrid2">
            <div class="field"><label>Specialization</label><select class="select" id="s-spec">${getCollegeCategoriesForCountry(u.country).map(c=>`<option ${c===u.specialization?'selected':''}>${c}</option>`).join('')}</select></div>
            <div class="field"><label>Major</label><input class="input" id="s-major" value="${u.major||''}"></div>
          </div>
        </div>
      </div>
    </div>
    <div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);padding:22px;margin-bottom:16px">
      <div style="font-family:var(--fd);font-size:15px;font-weight:800;margin-bottom:12px;color:var(--amber)">Science Interests</div>
      <div class="chip-grid">${SUBJECTS.map(s=>`<div class="chip ${(u.interests||[]).includes(s)?'sel':''}" onclick="toggleInterest(this,'${s}')">${s}</div>`).join('')}</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-primary btn-lg" onclick="saveSettings()"><i class="fas fa-check"></i> Save</button>
      <button class="btn btn-surf" onclick="goBack()">Cancel</button>
    </div>
  </div>`;
}

function sTypeChange() {
  const t = document.getElementById('s-utype').value;
  document.getElementById('s-student-sec').style.display = t === 'student' ? '' : 'none';
  document.getElementById('s-colleague-sec').style.display = t === 'colleague' ? '' : 'none';
}
function sCountryChange() {
  const c = document.getElementById('s-country').value; const d = COUNTRIES[c] || {};
  const se = document.getElementById('s-school'); const ge = document.getElementById('s-grade'); const spe = document.getElementById('s-spec');
  if (se) se.innerHTML = (d.schoolTypes || ['General']).map(t => `<option>${t}</option>`).join('');
  if (ge) ge.innerHTML = (d.grades || ['General']).map(g => `<option>${g}</option>`).join('');
  const cats = getCollegeCategoriesForCountry(c);
  if (spe) spe.innerHTML = cats.map(cat => `<option>${cat}</option>`).join('');
}
function toggleInterest(el, subj) {
  const u = STATE.currentUser; if (!u.interests) u.interests = [];
  const i = u.interests.indexOf(subj);
  if (i >= 0) { u.interests.splice(i, 1); el.classList.remove('sel'); }
  else { u.interests.push(subj); el.classList.add('sel'); }
}
async function saveSettings() {
  const u = STATE.currentUser;
  const ut = document.getElementById('s-utype')?.value || u.userType || u.user_type;
  const payload = {
    name: document.getElementById('s-name')?.value || u.name,
    country: document.getElementById('s-country')?.value || u.country,
    user_type: ut,
    school: ut === 'student' ? document.getElementById('s-school')?.value : '',
    grade: ut === 'student' ? document.getElementById('s-grade')?.value : '',
    specialization: ut === 'colleague' ? document.getElementById('s-spec')?.value : '',
    major: ut === 'colleague' ? document.getElementById('s-major')?.value : '',
    interests: u.interests || []
  };
  try {
    const updated = await api('PATCH', '/auth/me', payload);
    STATE.currentUser = { ...STATE.currentUser, ...updated };
    // Keep MOCK_USERS in sync so the session restore picks up the new values
    const mu = MOCK_USERS.find(x => x.id === u.id);
    if (mu) Object.assign(mu, payload);
    persistState();
    updateNavForUser();
    logActivity('update_profile', 'user', u.id, 'Settings saved');
    toast('Settings saved! ✅', 'success', 'fa-circle-check');
    goBack();
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}

// ── MEMBERSHIP SETUP ───────────────────────────────────────
function renderMembershipSetup(root) {
  const u = STATE.currentUser;
  root.innerHTML = `<div class="page page--narrow">
    <button class="btn btn-surf btn-sm" onclick="goBack()" style="margin-bottom:16px"><i class="fas fa-arrow-left"></i> Back</button>
    <div style="font-family:var(--fd);font-size:22px;font-weight:800;margin-bottom:4px">👑 Membership Setup</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:22px">Let followers support you with a monthly subscription.</div>
    <div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);padding:22px;margin-bottom:18px">
      <div class="fgrid">
        <div class="field"><label>Enable Membership?</label>
          <div class="radio-cards">
            <div class="radio-card ${(u.hasMembership||u.has_membership) ? 'sel' : ''}" onclick="STATE.currentUser.hasMembership=1;STATE.currentUser.has_membership=1;renderMembershipSetup(document.getElementById('appRoot'))"><div class="rc-icon">✅</div><div class="rc-title">Yes, offer membership</div><div class="rc-sub">Members get exclusive perks</div></div>
            <div class="radio-card ${!(u.hasMembership||u.has_membership) ? 'sel-a' : ''}" onclick="STATE.currentUser.hasMembership=0;STATE.currentUser.has_membership=0;renderMembershipSetup(document.getElementById('appRoot'))"><div class="rc-icon">❌</div><div class="rc-title">No membership</div><div class="rc-sub">All content stays public</div></div>
          </div>
        </div>
        ${(u.hasMembership||u.has_membership) ? `
        <div class="field"><label>Monthly Price (EGP)</label><input class="input gf" type="number" min="5" value="${u.membershipPrice||u.membership_price||29}" id="m-price"></div>
        <div class="field"><label>Membership Perks</label><textarea class="textarea" id="m-perks" style="min-height:120px">${u.membershipPerks||u.membership_perks||''}</textarea></div>` : ''}
      </div>
    </div>
    ${(u.hasMembership||u.has_membership) ? `<div style="display:flex;gap:10px">
      <button class="btn btn-primary btn-lg" onclick="saveMembership()"><i class="fas fa-floppy-disk"></i> Save</button>
      <button class="btn btn-surf" onclick="goBack()">Cancel</button>
    </div>` : '<button class="btn btn-surf" onclick="goBack()"><i class="fas fa-arrow-left"></i> Back</button>'}
  </div>`;
}

async function saveMembership() {
  const payload = {
    has_membership: STATE.currentUser.has_membership ? 1 : 0,
    membership_price: parseInt(document.getElementById('m-price')?.value || '29'),
    membership_perks: document.getElementById('m-perks')?.value || ''
  };
  try {
    const updated = await api('PATCH', '/auth/membership', payload);
    // Sync both camelCase (STATE.currentUser) and snake_case
    STATE.currentUser = {
      ...STATE.currentUser, ...updated,
      hasMembership: payload.has_membership ? 1 : 0,
      membershipPrice: payload.membership_price,
      membershipPerks: payload.membership_perks,
    };
    toast('Membership settings saved! 👑', 'success', 'fa-crown');
    navTo('profile');
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}

// ── ADMIN ──────────────────────────────────────────────────
async function renderAdmin(root) {
  if (STATE.currentUser?.role !== 'admin') {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Access Denied</div></div></div>`;
    return;
  }
  try {
    const stats = await api('GET', '/admin/stats');
    const pending = await api('GET', '/summaries/pending');
    const ipBans = await api('GET', '/admin/ip-bans');
    const promotions = await api('GET', '/admin/promotions');
    const unverifiedMethods = await api('GET', '/wallet/admin/payout-methods');
    const pendingWithdrawals = await api('GET', '/wallet/admin/withdrawals?status=pending');
    const plagiarismCases = await api('GET', '/admin/plagiarism').catch(() => []);
    const pendingArr = pending || [];
    const ipBansArr = ipBans || [];
    const pendingPromos = (promotions || []).filter(p => p.status === 'pending');
    const unverifiedArr = unverifiedMethods || [];
    const pendingWdArr = pendingWithdrawals || [];
    const plagArr = plagiarismCases || [];
    const plagThieves = plagArr.filter(c => c.verdict === 'thief');
    const plagSemi    = plagArr.filter(c => c.verdict === 'semi');
    const plagPending = plagArr.filter(c => c.verdict === 'pending');

    root.innerHTML = `<div class="page">
      <div class="admin-hero">
        <div class="admin-hero__icon"><i class="fas fa-shield-halved"></i></div>
        <div><div class="admin-hero__title">Admin Dashboard</div><div class="admin-hero__sub">Review uploads · Manage users · Monitor platform health</div></div>
      </div>
      <div class="admin-stats">
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='users'?'admin-stat--active':''}" onclick="adminDrill('users')"><div class="admin-stat__val" title="${stats.totalUsers}">${stats.totalUsers}</div><div class="admin-stat__lbl">Users</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='summaries'?'admin-stat--active':''}" onclick="adminDrill('summaries')"><div class="admin-stat__val g" title="${stats.totalSummaries}">${stats.totalSummaries}</div><div class="admin-stat__lbl">Summaries</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='approved'?'admin-stat--active':''}" onclick="adminDrill('approved')"><div class="admin-stat__val" title="${stats.approved}">${stats.approved}</div><div class="admin-stat__lbl">Approved</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='pending_review'?'admin-stat--active':''}" onclick="adminDrill('pending_review')"><div class="admin-stat__val r" title="${stats.pending}">${stats.pending}</div><div class="admin-stat__lbl">Pending Review</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='banned'?'admin-stat--active':''}" onclick="adminDrill('banned')"><div class="admin-stat__val r" title="${stats.banned}">${stats.banned}</div><div class="admin-stat__lbl">Banned Users</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='deleted'?'admin-stat--active':''}" onclick="adminDrill('deleted')"><div class="admin-stat__val" style="color:var(--coral)"><i class="fas fa-trash-can" style="font-size:18px"></i></div><div class="admin-stat__lbl">Recently Deleted</div></div>
        <div class="admin-stat"><div class="admin-stat__val g" title="${stats.totalViews}">${fmt(stats.totalViews)}</div><div class="admin-stat__lbl">Total Views</div></div>
        <div class="admin-stat"><div class="admin-stat__val g" title="${stats.totalLikes}">${fmt(stats.totalLikes)}</div><div class="admin-stat__lbl">Total Likes</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='thieves'?'admin-stat--active':''}" style="border-color:rgba(239,68,68,.3)" onclick="adminDrill('thieves')"><div class="admin-stat__val r" title="${stats.plagiarismThieves||0}">${stats.plagiarismThieves||0}</div><div class="admin-stat__lbl">⚠️ Thieves</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='semi'?'admin-stat--active':''}" style="border-color:rgba(245,158,11,.3)" onclick="adminDrill('semi')"><div class="admin-stat__val" style="color:var(--amber)" title="${stats.plagiarismSemi||0}">${stats.plagiarismSemi||0}</div><div class="admin-stat__lbl">🔍 Semi-Cases</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='plg_pending'?'admin-stat--active':''}" style="border-color:rgba(245,158,11,.2)" onclick="adminDrill('plg_pending')"><div class="admin-stat__val" style="color:var(--amber)" title="${stats.plagiarismPending||0}">${stats.plagiarismPending||0}</div><div class="admin-stat__lbl">⏳ Plg Pending</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='reports'?'admin-stat--active':''}" style="border-color:rgba(239,68,68,.25)" onclick="adminDrill('reports')"><div class="admin-stat__val" style="color:var(--coral)" title="${stats.reportsPending||0}">${stats.reportsPending||0}</div><div class="admin-stat__lbl">🚩 Reports</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='site_reports'?'admin-stat--active':''}" style="border-color:rgba(245,158,11,.25)" onclick="adminDrill('site_reports')"><div class="admin-stat__val" style="color:var(--amber);font-size:20px">⚠️</div><div class="admin-stat__lbl">Site Issues</div></div>
        <div class="admin-stat admin-stat--clickable ${STATE._adminDrill==='activity'?'admin-stat--active':''}" onclick="adminDrill('activity')"><div class="admin-stat__val" style="color:var(--amber);font-size:20px">📋</div><div class="admin-stat__lbl">Activity Log</div></div>
      </div>

      <!-- DRILL-DOWN PANEL: rendered inline after stats when a card is clicked -->
      <div id="adminDrillPanel"></div>

      <!-- REPORTS PANEL -->
      <div class="admin-panel" style="border-left:3px solid var(--coral)">
        <div class="admin-panel-head">
          <h3><i class="fas fa-flag" style="color:var(--coral)"></i> User Reports <span class="spill s-banned">${plagArr.length}</span></h3>
          <div style="display:flex;gap:6px">
            <button class="btn btn-surf btn-sm" onclick="aLoadReports('pending')">Pending</button>
            <button class="btn btn-surf btn-sm" onclick="aLoadReports('all')">All</button>
          </div>
        </div>
        <div id="adminReportsList"><div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div></div>
      </div>

      <!-- THIEVES LIST -->
      <div class="admin-panel" style="border-left:3px solid var(--coral)">
        <div class="admin-panel-head"><h3><i class="fas fa-user-slash" style="color:var(--coral)"></i> 🚨 Confirmed Thieves <span class="spill s-banned">${plagThieves.length}</span></h3></div>
        <div id="plagThievesList">${plagThieves.length ? plagThieves.map(c => renderPlagCase(c, 'thief')).join('') : `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">✅ No confirmed thieves</div>`}</div>
      </div>

      <!-- SEMI-THIEVES LIST -->
      <div class="admin-panel" style="border-left:3px solid var(--amber)">
        <div class="admin-panel-head"><h3><i class="fas fa-magnifying-glass" style="color:var(--amber)"></i> 🔍 Suspicious / Similar Content <span class="spill" style="background:rgba(232,93,4,.15);color:var(--amber)">${plagSemi.length + plagPending.length}</span></h3></div>
        <div id="plagSemiList">${(plagSemi.length + plagPending.length) ? [...plagSemi, ...plagPending].map(c => renderPlagCase(c, c.verdict)).join('') : `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">✅ No suspicious cases</div>`}</div>
      </div>

      <!-- Payout Method Verification -->
      <div class="admin-panel">
        <div class="admin-panel-head"><h3><i class="fas fa-wallet" style="color:var(--gold)"></i> Payout Methods — Pending Verification <span class="spill s-pending">${unverifiedArr.length}</span></h3></div>
        ${unverifiedArr.length ? unverifiedArr.map(m => `<div class="admin-row">
          <div class="admin-row__main">
            <div class="admin-row__title">${m.user_name} (${m.user_email})</div>
            <div class="admin-row__sub">${m.type_label} · ${m.masked_value} · ${m.currency} · Label: "${m.label}"</div>
          </div>
          <div class="admin-row__actions">
            <button class="btn btn-success btn-sm" onclick="adminVerifyMethod('${m.id}')"><i class="fas fa-check"></i> Verify</button>
            <button class="btn btn-danger btn-sm" onclick="adminRejectMethod('${m.id}','${m.label}')"><i class="fas fa-times"></i> Reject</button>
          </div>
        </div>`).join('') : `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">✅ No pending verifications</div>`}
      </div>

      <!-- Withdrawal Requests -->
      <div class="admin-panel">
        <div class="admin-panel-head"><h3><i class="fas fa-money-bill-transfer" style="color:var(--amber)"></i> Withdrawal Requests <span class="spill s-pending">${pendingWdArr.length} pending</span></h3>
          <button class="btn btn-surf btn-sm" onclick="adminLoadAllWithdrawals()"><i class="fas fa-list"></i> View All</button>
        </div>
        <div id="adminWithdrawList">${pendingWdArr.length ? pendingWdArr.map(w => adminWithdrawRow(w)).join('') : `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">✅ No pending withdrawals</div>`}</div>
      </div>

      <!-- Promotion Requests -->
      <div class="admin-panel">
        <div class="admin-panel-head"><h3><i class="fas fa-rocket" style="color:var(--amber)"></i> Promotion Requests <span class="spill s-pending">${pendingPromos.length} pending</span></h3></div>
        ${(promotions||[]).length ? (promotions||[]).map(p => `<div class="admin-row">
          <div class="admin-row__main">
            <div class="admin-row__title">${p.summary_title || p.summary_id}</div>
            <div class="admin-row__sub">By ${p.author_name} · Budget: EGP ${p.budget_egp} · ${p.duration_days} days · ${p.notes || '—'}</div>
          </div>
          <span class="spill ${p.status==='pending'?'s-pending':p.status==='approved'?'s-approved':'s-banned'}">${p.status}</span>
          ${p.status==='pending' ? `<div class="admin-row__actions">
            <button class="btn btn-success btn-sm" onclick="approvePromo('${p.id}')"><i class="fas fa-check"></i> Approve</button>
            <button class="btn btn-danger btn-sm" onclick="rejectPromo('${p.id}')"><i class="fas fa-times"></i> Reject</button>
          </div>` : ''}
        </div>`).join('') : `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">No promotion requests</div>`}
      </div>

      <!-- Pending Review -->
      <div class="admin-panel">
        <div class="admin-panel-head"><h3><i class="fas fa-clock" style="color:var(--gold)"></i> Pending Review <span class="spill s-pending">${pendingArr.length}</span></h3></div>
        ${pendingArr.length ? pendingArr.map(s => `<div class="admin-row">
          <div class="admin-row__main"><div class="admin-row__title">${s.title}</div><div class="admin-row__sub">${s.author||'?'} · ${s.subject} · ${s.country} · ${s.grade}</div></div>
          <div class="admin-row__actions">
            <button class="btn btn-success btn-sm" onclick="aApprove('${s.id}')"><i class="fas fa-check"></i> Approve</button>
            <button class="btn btn-danger btn-sm" onclick="openDeclineModal('${s.id}','${(s.title||'').replace(/'/g,"\\'")}')"><i class="fas fa-times"></i> Decline</button>
            <button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${s.id}'})"><i class="fas fa-eye"></i></button>
          </div>
        </div>`).join('') : `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">✅ No pending uploads</div>`}
      </div>

      <!-- User Management -->
      <div class="admin-panel">
        <div class="admin-panel-head"><h3><i class="fas fa-users" style="color:var(--amber)"></i> User Management</h3>
          <input class="admin-search" placeholder="🔍 Search users…" oninput="aLoadUsers(this.value)">
        </div>
        <div id="adminUserList"><div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div></div>
      </div>

      <!-- Ban Management (bans ARE IP bans) -->
      <div class="admin-panel">
        <div class="admin-panel-head">
          <h3><i class="fas fa-ban" style="color:var(--coral)"></i> Active Bans
            <span class="spill s-banned">${ipBansArr.filter(b=>!b.expired).length} active</span>
          </h3>
          <span style="font-size:11px;color:var(--text3)">Bans are created via the Ban button on users above</span>
        </div>
        ${ipBansArr.length ? ipBansArr.map(b => `<div class="admin-row">
          <div class="admin-row__main">
            <div class="admin-row__title">
              <b>${b.user_name || 'Unknown'}</b>
              <span style="font-family:monospace;font-size:11px;color:var(--text3);margin-left:8px">${b.ip}</span>
              ${b.expired
                ? '<span class="spill" style="background:rgba(0,0,0,.06);color:var(--text3);margin-left:6px">Expired</span>'
                : '<span class="spill s-banned" style="margin-left:6px">Active</span>'}
            </div>
            <div class="admin-row__sub">
              <b>Reason:</b> ${b.reason||'—'} &nbsp;·&nbsp;
              ${b.permanent ? '<span style="color:var(--coral)">🔴 Permanent</span>' : `⏳ Expires <b>${b.expires_at ? new Date(b.expires_at*1000).toLocaleDateString() : '?'}</b>`}
              ${b.message ? `<br><span style="color:var(--text2);font-style:italic">"${b.message.slice(0,80)}${b.message.length>80?'…':''}"</span>` : ''}
            </div>
          </div>
          <div class="admin-row__actions">
            ${!b.permanent && !b.expired ? `<button class="btn btn-surf btn-sm" onclick="extendBan('${b.id}')"><i class="fas fa-clock"></i> Extend</button>` : ''}
            <button class="btn btn-success btn-sm" onclick="removeBan('${b.id}')"><i class="fas fa-unlock"></i> Lift</button>
          </div>
        </div>`).join('')
        : `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">
            No active bans. Use the <b>Ban</b> button on a user above to issue one.
           </div>`}
      </div>

      <!-- Platform Settings -->
      <div class="admin-panel">
        <div class="admin-panel-head"><h3><i class="fas fa-gear" style="color:var(--gold)"></i> Platform Settings</h3></div>
        <div style="padding:20px;display:grid;gap:14px" id="platformSettingsForm">
          <div class="spinner" style="margin:0 auto"></div>
        </div>
      </div>
    </div>`;

    // Load real settings from DB async
    api('GET', '/earnings/settings').then(s => {
      const el = document.getElementById('platformSettingsForm');
      if (!el) return;
      el.innerHTML = `
        <div style="font-weight:800;font-size:13px;margin-bottom:4px;color:var(--text2)">📊 Monetisation Thresholds</div>
        <div class="fgrid fgrid2">
          <div class="field"><label>Min Likes to Monetise</label><input class="input" id="ps-likes" value="${s.min_likes_to_monetize||500}" type="number"></div>
          <div class="field"><label>Min Views to Monetise</label><input class="input" id="ps-views" value="${s.min_views_to_monetize||2000}" type="number"></div>
          <div class="field"><label>Base CPM (EGP)</label><input class="input" id="ps-cpm" value="${s.base_cpm_egp||4}" type="number" step="0.1"></div>
        </div>
        <div style="font-weight:800;font-size:13px;margin:10px 0 4px;color:var(--text2)">🏆 Tiered Creator Share % (grows with audience)</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:8px">Creator revenue share increases automatically as their follower count grows.</div>
        <div class="fgrid fgrid2">
          <div class="field"><label>Tier 1 — min followers</label><input class="input" id="ps-t1f" value="${s.tier1_followers||0}" type="number"></div>
          <div class="field"><label>Tier 1 — share %</label><input class="input" id="ps-t1s" value="${s.tier1_share_percent||60}" type="number"></div>
          <div class="field"><label>Tier 2 — min followers</label><input class="input" id="ps-t2f" value="${s.tier2_followers||1000}" type="number"></div>
          <div class="field"><label>Tier 2 — share %</label><input class="input" id="ps-t2s" value="${s.tier2_share_percent||70}" type="number"></div>
          <div class="field"><label>Tier 3 — min followers</label><input class="input" id="ps-t3f" value="${s.tier3_followers||10000}" type="number"></div>
          <div class="field"><label>Tier 3 — share %</label><input class="input" id="ps-t3s" value="${s.tier3_share_percent||80}" type="number"></div>
        </div>
        <button class="btn btn-amber" onclick="savePlatformSettings()"><i class="fas fa-floppy-disk"></i> Save Settings</button>`;
    }).catch(() => {
      const el = document.getElementById('platformSettingsForm');
      if (el) el.innerHTML = `<div style="color:var(--coral);font-size:13px">Could not load settings</div>`;
    });

    // Load users async
    aLoadUsers('');
    aLoadReports('pending');
  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Admin error: ${esc(e.message)}</div></div></div>`;
  }
}

function adminFilterUsers(q) {
  const el = document.getElementById('drillUserRows');
  if (!el || !window._renderUserRows) return;
  const lq = q.toLowerCase();
  const filtered = (window._drillUsers || []).filter(u =>
    !q || u.name?.toLowerCase().includes(lq) ||
    u.email?.toLowerCase().includes(lq) ||
    u.username?.toLowerCase().includes(lq)
  );
  el.innerHTML = window._renderUserRows(filtered);
}

// ── PLAGIARISM CASE RENDERING ─────────────────────────────────────
function renderPlagCase(c, type) {
  const pct = (c.similarity * 100).toFixed(0);
  const isThief = type === 'thief';
  const isSemi = type === 'semi' || type === 'pending';
  const borderColor = isThief ? 'var(--coral)' : 'var(--amber)';
  const wmBadge = c.watermark_hit ? `<span class="spill" style="background:rgba(239,68,68,.15);color:var(--coral);font-size:10px">🔏 Watermark Match</span>` : '';
  const verdictBadge = `<span class="spill ${isThief?'s-banned':''}" style="${isSemi?'background:rgba(245,158,11,.15);color:var(--amber)':''}">${type}</span>`;

  return `<div class="admin-row" style="border-left:3px solid ${borderColor};padding-left:12px">
    <div class="admin-row__main" style="flex:1">
      <div class="admin-row__title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span>@${c.suspect_username||c.suspect_name||'?'}</span>
        ${wmBadge} ${verdictBadge}
        <span class="spill" style="background:rgba(255,255,255,.06);font-size:11px">${pct}% similar</span>
      </div>
      <div class="admin-row__sub">
        <b>Suspect:</b> ${c.suspect_name||'?'} · ${c.suspect_email||'?'} · ${c.suspect_followers||0} followers · Status: ${c.suspect_status||'?'}
      </div>
      <div class="admin-row__sub">
        <b>Matches:</b> "${c.original_title||'?'}" by @${c.original_author_username||c.original_author_name||'?'}
        ${c.watermark_username ? `· Watermark owner: <b>@${c.watermark_username}</b>` : ''}
      </div>
      <div class="admin-row__sub" style="color:var(--text3);font-size:11px">
        Case ID: ${c.id} · ${new Date(c.created_at*1000).toLocaleDateString()}
        ${c.admin_note ? ` · Note: ${c.admin_note}` : ''}
      </div>
    </div>
    <div class="admin-row__actions" style="flex-direction:column;align-items:flex-end;gap:6px">
      <button class="btn btn-surf btn-sm" onclick="navigate('creator',{id:'${c.suspect_id}'})"><i class="fas fa-user"></i> Profile</button>
      ${c.original_id ? `<button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${c.original_id}'})"><i class="fas fa-eye"></i> Original</button>` : ''}
      ${type !== 'cleared' ? `<button class="btn btn-amber btn-sm" onclick="openPlagAction('${c.id}','${type}','${(c.suspect_name||'').replace(/'/g,"\\'")}','${c.suspect_id}')"><i class="fas fa-gavel"></i> Take Action</button>` : `<span style="color:var(--text3);font-size:11px">Cleared</span>`}
    </div>
  </div>`;
}

function openPlagAction(caseId, currentVerdict, suspectName, suspectId) {
  document.getElementById('plagActionOverlay')?.remove();
  const isThief = currentVerdict === 'thief';
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'plagActionOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title">⚖️ Plagiarism Action</div>
      <button class="modal-close" onclick="document.getElementById('plagActionOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="font-weight:700;margin-bottom:12px">Suspect: <span style="color:var(--amber)">${suspectName}</span></div>
      <div class="field"><label>Verdict</label>
        <select class="select" id="plg-verdict">
          <option value="thief" ${isThief?'selected':''}>🚨 Confirmed Thief (identical)</option>
          <option value="semi" ${currentVerdict==='semi'?'selected':''}>⚠️ Similar / Semi</option>
          <option value="cleared">✅ Clear / Not plagiarism</option>
        </select>
      </div>
      <div class="field" id="plg-ban-section">
        <label>Action to Take</label>
        <select class="select" id="plg-ban-action">
          <option value="warn">⚠️ Warn user only (notification)</option>
          <option value="delete_summary">🗑️ Delete the infringing summary</option>
          <option value="ban_7d">🚫 Delete summary + Ban 7 days</option>
          <option value="delete_and_ban_7d">🔨 Delete summary + Suspend 7 days</option>
          <option value="ban_permanent">⛔ Permanent ban + Delete all content</option>
        </select>
      </div>
      <div class="field"><label>Admin Note (optional)</label><textarea class="textarea" id="plg-note" placeholder="Reason for decision…" style="min-height:70px"></textarea></div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-danger btn-lg" style="flex:1" onclick="submitPlagAction('${caseId}','${suspectId}')"><i class="fas fa-gavel"></i> Confirm Action</button>
        <button class="btn btn-surf" onclick="document.getElementById('plagActionOverlay').remove()">Cancel</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
  // Show/hide ban section based on verdict
  const vSel = document.getElementById('plg-verdict');
  const bs = document.getElementById('plg-ban-section');
  vSel.onchange = () => { bs.style.display = vSel.value === 'cleared' ? 'none' : ''; };
}

async function submitPlagAction(caseId, suspectId) {
  const verdict    = document.getElementById('plg-verdict')?.value;
  const ban_action = document.getElementById('plg-ban-action')?.value || 'warn';
  const admin_note = document.getElementById('plg-note')?.value || '';
  try {
    await api('PATCH', `/admin/plagiarism/${caseId}/resolve`, { verdict, ban_action, admin_note });
    document.getElementById('plagActionOverlay')?.remove();
    toast(`Action taken: ${verdict} — ${ban_action}`, verdict==='cleared'?'success':'error', 'fa-gavel');
    renderAdmin(document.getElementById('appRoot'));
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}


// ── REPORTS ──────────────────────────────────────────────────
var REPORT_REASON_LABELS = window.REPORT_REASON_LABELS = {
  stolen_content:    '🔏 Stolen / copied content',
  wrong_curriculum:  '📚 Doesn\'t match the curriculum',
  wrong_subject:     '🔬 Wrong subject category',
  not_educational:   '🚫 Not educational content',
  spam:              '📧 Spam or repetitive',
  inappropriate:     '⚠️ Inappropriate content',
  low_quality:       '📉 Very low quality',
  wrong_language:    '🌐 Listed in wrong language',
  misleading_title:  '📝 Misleading title',
  other:             '❓ Other',
};

async function aLoadReports(filter) {
  const el = document.getElementById('adminReportsList');
  if (!el) return;
  el.innerHTML = `<div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const status = filter === 'all' ? '' : 'pending';
    const reports = await api('GET', `/reports/admin${status ? '?status=' + status : ''}`);
    if (!reports?.length) {
      el.innerHTML = `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">✅ No ${filter === 'all' ? '' : 'pending '}reports</div>`;
      return;
    }
    el.innerHTML = reports.map(r => `<div class="admin-row">
      <div class="admin-row__main">
        <div class="admin-row__title" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span>${r.summary_title || 'Deleted summary'}</span>
          <span class="spill ${r.status==='pending'?'s-pending':r.status==='resolved'?'s-approved':'s-banned'}" style="font-size:10px">${r.status}</span>
          <span class="spill" style="background:rgba(255,107,107,.12);color:var(--coral);font-size:10px">${REPORT_REASON_LABELS[r.reason] || r.reason}</span>
        </div>
        <div class="admin-row__sub">
          By @${r.author_username||r.author_name||'?'} · Reported by @${r.reporter_username||r.reporter_name||'?'} · ${new Date(r.created_at*1000).toLocaleDateString()}
        </div>
        ${r.description ? `<div class="admin-row__sub" style="color:var(--text);font-style:italic;font-size:12px">"${r.description.slice(0,200)}"</div>` : ''}
        ${r.admin_note ? `<div class="admin-row__sub" style="color:var(--text3);font-size:11px">Admin note: ${r.admin_note}</div>` : ''}
      </div>
      <div class="admin-row__actions">
        ${r.summary_id ? `<button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${r.summary_id}'})"><i class="fas fa-eye"></i> View</button>` : ''}
        ${r.author_id ? `<button class="btn btn-surf btn-sm" onclick="navigate('creator',{id:'${r.author_id}'})"><i class="fas fa-user"></i></button>` : ''}
        ${r.status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="resolveReport('${r.id}','resolved')"><i class="fas fa-check"></i> Resolve</button>
          <button class="btn btn-surf btn-sm" onclick="resolveReport('${r.id}','dismissed')"><i class="fas fa-xmark"></i> Dismiss</button>
        ` : ''}
      </div>
    </div>`).join('');
  } catch (e) {
    el.innerHTML = `<div style="padding:18px;color:var(--coral);font-size:13px">Failed to load reports: ${esc(e.message)}</div>`;
  }
}

async function resolveReport(id, status) {
  const note = status === 'dismissed' ? '' : (prompt('Admin note (optional):') || '');
  try {
    await api('PATCH', `/reports/${id}/resolve`, { status, admin_note: note });
    toast(status === 'resolved' ? 'Report resolved ✅' : 'Report dismissed', 'success', 'fa-check');
    if (document.getElementById('svReportsList')) svLoadReports('pending');
    else aLoadReports('pending');
  } catch (e) { toast(e.message, 'error'); }
}

async function aLoadUsers(q) {
  const el = document.getElementById('adminUserList');
  if (!el) return;
  try {
    const users = await api('GET', `/admin/users?q=${encodeURIComponent(q||'')}`) || [];
    el.innerHTML = users.length ? users.map(u => `<div class="admin-row">
      <div class="admin-row__main">
        <div class="admin-row__title">${u.name} ${u.username ? `<span style="color:var(--text3);font-size:11px;font-weight:400">@${u.username}</span>` : ''}</div>
        <div class="admin-row__sub">${u.email} · ${u.role} · ${u.country} · ${u.uploads||0} uploads · ${u.followers||0} followers</div>
      </div>
      <span class="spill ${u.status==='active'?'s-active':'s-banned'}">${u.status}</span>
      <div class="admin-row__actions">
        ${u.status === 'active'
          ? `<button class="btn btn-danger btn-sm" onclick="openBanModal('${u.id}','${u.name}')"><i class="fas fa-ban"></i> Ban</button>`
          : `<button class="btn btn-success btn-sm" onclick="aUnban('${u.id}')"><i class="fas fa-check"></i> Unban</button>`}
        <button class="btn btn-surf btn-sm" onclick="navigate('creator',{id:'${u.id}'})"><i class="fas fa-eye"></i></button>
      </div>
    </div>`).join('') : `<div style="padding:18px;text-align:center;color:var(--text2)">No users found</div>`;
  } catch (e) { if (el) el.innerHTML = `<div style="padding:18px;text-align:center;color:var(--coral)">Error loading users</div>`; }
}

// ── BAN REASONS ────────────────────────────────────────────
var BAN_REASONS = window.BAN_REASONS = [
  { value: 'spam',           label: '📧 Spam / Repetitive uploads',        desc: 'User is flooding the platform with low-effort or repeated content' },
  { value: 'plagiarism',     label: '🔏 Plagiarism / Stolen content',       desc: 'User is uploading summaries copied from other creators' },
  { value: 'harassment',     label: '😡 Harassment / Abusive behaviour',   desc: 'User is targeting or abusing other members or creators' },
  { value: 'inappropriate',  label: '⚠️ Inappropriate content',            desc: 'User posted content that violates community guidelines' },
  { value: 'fraud',          label: '💸 Fraud / Wallet abuse',             desc: 'User is abusing the earnings or wallet system' },
  { value: 'impersonation',  label: '🎭 Impersonation',                    desc: 'User is pretending to be another creator or staff member' },
  { value: 'underage',       label: '🔞 Underage account',                 desc: 'Account appears to belong to a minor violating terms of service' },
  { value: 'fake_account',   label: '👻 Fake / Bot account',               desc: 'Account shows signs of being automated or non-genuine' },
  { value: 'tos_violation',  label: '📋 General Terms of Service violation',desc: 'Account violates platform terms in a way not listed above' },
  { value: 'other',          label: '❓ Other',                            desc: 'Provide a detailed explanation in the message below' },
];

// In-memory IP ban store for demo
var MOCK_IP_BANS = window.MOCK_IP_BANS = window.MOCK_IP_BANS || [];

function openBanModal(userId, userName) {
  document.getElementById('banOverlay')?.remove();
  const user = MOCK_USERS?.find(u => u.id === userId);
  const userIp = user?.last_ip || '(recorded on next login)';

  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'banOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title"><i class="fas fa-ban" style="color:var(--coral)"></i> Ban: ${esc(userName)}</div>
      <button class="modal-close" onclick="document.getElementById('banOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="info-box" style="margin-bottom:14px;font-size:12px">
        <i class="fas fa-network-wired" style="color:var(--amber)"></i>
        <b>This ban is also an IP ban</b> — the user cannot access the site from this device even with a new account.<br>
        <span style="color:var(--text3)">Detected IP: <code>${userIp}</code></span>
      </div>
      <div class="fgrid">
        <div class="field">
          <label>Reason <span style="color:var(--coral)">*</span></label>
          <select class="select" id="ban-reason-select" onchange="document.getElementById('banOverlay').dataset.reason=this.value; banAutoFillMessage(this.value)">
            <option value="">— Select a reason —</option>
            ${BAN_REASONS.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Ban Type</label>
          <div style="display:flex;gap:8px">
            <div id="btype-temp" style="flex:1;padding:10px;text-align:center;cursor:pointer;border-radius:var(--radius-sm);border:2px solid var(--amber);background:var(--amber-dim)" onclick="setBanType('temporary')">
              <div style="font-size:18px">⏳</div><div style="font-size:11px;font-weight:800;margin-top:2px">Temporary</div>
            </div>
            <div id="btype-perm" style="flex:1;padding:10px;text-align:center;cursor:pointer;border-radius:var(--radius-sm);border:2px solid var(--bord)" onclick="setBanType('permanent')">
              <div style="font-size:18px">⛔</div><div style="font-size:11px;font-weight:800;margin-top:2px">Permanent</div>
            </div>
          </div>
        </div>
        <div class="field" id="ban-days-field">
          <label>Duration <span style="font-size:11px;color:var(--text3);font-weight:400">(ban auto-cancels after this)</span></label>
          <select class="select" id="ban-duration-select" onchange="document.getElementById('ban-custom-days-wrap').style.display=this.value==='custom'?'':'none'">
            <option value="1">1 Day</option>
            <option value="3">3 Days</option>
            <option value="7" selected>7 Days (1 Week)</option>
            <option value="14">14 Days (2 Weeks)</option>
            <option value="30">30 Days (1 Month)</option>
            <option value="90">90 Days (3 Months)</option>
            <option value="180">180 Days (6 Months)</option>
            <option value="365">365 Days (1 Year)</option>
            <option value="custom">Custom…</option>
          </select>
          <div id="ban-custom-days-wrap" style="display:none;margin-top:8px">
            <input class="input" type="number" id="ban-custom-days" placeholder="Number of days" min="1" max="3650">
          </div>
        </div>
        <div class="field">
          <label>Message to user <span style="font-weight:400;color:var(--text3);font-size:11px">(emailed to them — explain clearly)</span></label>
          <textarea class="textarea" id="ban-reason-text" placeholder="Select a reason above to auto-fill, or write your own explanation…" style="min-height:90px"></textarea>
        </div>
      </div>
      <div id="ban-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none"></div>
      <div style="display:flex;gap:10px;margin-top:18px">
        <button class="btn btn-danger btn-lg" id="ban-confirm-btn" style="flex:1" onclick="executeBan('${userId}')">
          <i class="fas fa-ban"></i> Confirm Ban &amp; Email User
        </button>
        <button class="btn btn-surf" onclick="document.getElementById('banOverlay').remove()">Cancel</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

function banAutoFillMessage(val) {
  const ta = document.getElementById('ban-reason-text');
  const reason = BAN_REASONS.find(r => r.value === val);
  if (ta && reason && !ta.value.trim()) {
    ta.value = `Your account on Mol5sat has been suspended.\n\nReason: ${reason.label.replace(/^[^ ]+ /, '')}\n${reason.desc}.\n\nIf you believe this is a mistake, please contact us at support@mol5sat.org.`;
  }
}

function setBanType(t) {
  const tempEl = document.getElementById('btype-temp');
  const permEl = document.getElementById('btype-perm');
  if (tempEl) { tempEl.style.borderColor = t==='temporary' ? 'var(--amber)' : 'var(--bord)'; tempEl.style.background = t==='temporary' ? 'var(--amber-dim)' : ''; }
  if (permEl) { permEl.style.borderColor = t==='permanent' ? 'var(--coral)' : 'var(--bord)'; permEl.style.background = t==='permanent' ? 'rgba(255,107,107,.06)' : ''; }
  document.getElementById('ban-days-field').style.display = t==='permanent' ? 'none' : '';
}

async function executeBan(userId) {
  const reason = document.getElementById('banOverlay')?.dataset.reason;
  const message = document.getElementById('ban-reason-text')?.value?.trim();
  const errEl = document.getElementById('ban-err');
  const showErr = msg => { errEl.textContent = msg; errEl.style.display = ''; };

  if (!reason) return showErr('Please select a ban reason from the list above.');
  if (!message) return showErr('Please write a message to the user explaining the ban.');

  const isPermanent = document.getElementById('btype-perm')?.style.borderColor?.includes('coral');
  let days = 7;
  if (!isPermanent) {
    const sel = document.getElementById('ban-duration-select')?.value;
    days = sel === 'custom'
      ? parseInt(document.getElementById('ban-custom-days')?.value) || 7
      : parseInt(sel) || 7;
  }

  // Find the user and get their IP
  const target = MOCK_USERS?.find(u => u.id === userId);
  const ip = target?.last_ip || '127.0.0.' + (Math.floor(Math.random() * 254) + 1);
  const expiresAt = isPermanent ? null : (Date.now() / 1000 + days * 86400);

  // Apply the ban: mark user as banned with expiry info
  if (target) {
    target.status = 'banned';
    target.ban_reason = reason;
    target.ban_message = message;
    target.ban_expires = expiresAt;
    target.banned_ip = ip;
  }

  // Add to in-memory IP ban list
  MOCK_IP_BANS.push({
    id: 'ipb_' + Date.now(),
    ip,
    reason: BAN_REASONS.find(r => r.value === reason)?.label || reason,
    message,
    user_id: userId,
    user_name: target?.name || '?',
    permanent: isPermanent,
    created_at: Date.now() / 1000,
    expires_at: expiresAt,
    expired: false,
  });

  const btn = document.getElementById('ban-confirm-btn');
  const btnOrigHTML = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.style.opacity = '.7'; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Banning…'; }

  try {
    await api('PATCH', `/admin/users/${userId}/ban`, {
      reason, message, ban_type: isPermanent ? 'permanent' : 'temporary',
      ban_days: days, ip_ban: true, ip_address: ip
    });
    document.getElementById('banOverlay')?.remove();
    const expMsg = isPermanent ? 'permanently' : `for ${days} day${days !== 1 ? 's' : ''} (auto-lifts ${new Date(expiresAt * 1000).toLocaleDateString()})`;
    toast(`User banned ${expMsg}. Email sent. 📧`, 'error', 'fa-ban');
    logActivity('ban_user', 'user', userId, `Banned ${target?.name}: ${reason} (${isPermanent ? 'permanent' : days + 'd'})`);
    persistState();
    refreshModerationView();
  } catch (e) {
    showErr(e.message);
    if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = btnOrigHTML; }
  }
}

async function aUnban(userId) {
  try {
    const target = MOCK_USERS?.find(u => u.id === userId);
    if (target) { target.status = 'active'; target.ban_expires = null; target.banned_ip = null; }
    await api('PATCH', `/admin/users/${userId}/unban`);
    logActivity('unban_user', 'user', userId, `Unbanned ${target?.name || ''}`);
    persistState();
    toast('User unbanned ✅', 'success', 'fa-check');
    refreshModerationView();
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}

// ── ADMIN STAT CARD DRILL-DOWN ─────────────────────────────
// Tracks which stat card is expanded
// _adminDrill initialized inside renderAdmin()

async function adminDrill(type) {
  const panel = document.getElementById('adminDrillPanel');
  if (!panel) return;

  // Toggle off if same card clicked again
  if (STATE._adminDrill === type) {
    STATE._adminDrill = null;
    panel.innerHTML = '';
    // Remove active highlight from all cards
    document.querySelectorAll('.admin-stat--active').forEach(el => el.classList.remove('admin-stat--active'));
    return;
  }

  STATE._adminDrill = type;
  // Update active card highlight
  document.querySelectorAll('.admin-stat--active').forEach(el => el.classList.remove('admin-stat--active'));
  document.querySelectorAll('.admin-stat--clickable').forEach(el => {
    if (el.getAttribute('onclick')?.includes(`'${type}'`)) el.classList.add('admin-stat--active');
  });

  panel.innerHTML = `<div class="admin-drill-panel">
    <div class="admin-panel-head" style="background:linear-gradient(135deg,var(--amber-dim),transparent)">
      <h3 id="drillTitle"><i class="fas fa-spinner fa-spin" style="color:var(--amber)"></i> Loading…</h3>
      <button class="btn btn-surf btn-sm" onclick="adminDrill('${type}')"><i class="fas fa-times"></i> Close</button>
    </div>
    <div id="drillContent"><div style="padding:28px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div></div>
  </div>`;

  try {
    let rows = '';
    let title = '';

    if (type === 'users' || type === 'banned') {
      const filter = type === 'banned' ? '?status=banned' : '';
      const users = await api('GET', `/admin/users${filter}`) || [];
      title = type === 'banned'
        ? `<i class="fas fa-ban" style="color:var(--coral)"></i> Banned Users (${users.length})`
        : `<i class="fas fa-users" style="color:var(--amber)"></i> All Users (${users.length})`;

      const renderUserRows = (list) => list.length ? list.map(u => `<div class="admin-row">
        <div class="admin-row__main">
          <div class="admin-row__title">
            ${(u.profile_photo||u.photo) ? `<img src="${u.profile_photo||u.photo}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;margin-right:6px;vertical-align:middle">` : ''}
            ${esc(u.name)} ${u.username ? `<span style="color:var(--amber);font-size:11px;font-weight:600">@${u.username}</span>` : ''}
          </div>
          <div class="admin-row__sub">${esc(u.email)} · ${u.role} · ${u.country||'—'} · ${u.uploads||0} uploads · ${u.followers||0} followers</div>
        </div>
        <span class="spill ${u.status==='active'?'s-active':'s-banned'}">${u.status}</span>
        <div class="admin-row__actions">
          ${u.status==='active'
            ? `<button class="btn btn-danger btn-sm" onclick="openBanModal('${u.id}','${esc(u.name)}')"><i class="fas fa-ban"></i> Ban</button>`
            : `<button class="btn btn-success btn-sm" onclick="aUnban('${u.id}')"><i class="fas fa-check"></i> Unban</button>`}
          <button class="btn btn-surf btn-sm" onclick="navigate('creator',{id:'${u.id}'})"><i class="fas fa-eye"></i></button>
        </div>
      </div>`).join('') : `<div style="padding:20px;text-align:center;color:var(--text2)">No users found</div>`;
      window._renderUserRows = renderUserRows;

      // Store users list for live search
      window._drillUsers = users;
      rows = `<div style="padding:12px 16px;border-bottom:1px solid var(--bord)">
        <input class="admin-search" style="width:100%" placeholder="🔍 Search by name, email or @username…"
          oninput="adminFilterUsers(this.value)">
      </div>
      <div id="drillUserRows">${renderUserRows(users)}</div>`;

    } else if (type === 'summaries' || type === 'approved') {
      const endpoint = type === 'approved' ? '/summaries?approved=1&limit=50' : '/summaries?limit=50';
      const items = await api('GET', endpoint) || [];
      title = `<i class="fas fa-file-lines" style="color:var(--gold)"></i> ${type === 'approved' ? 'Approved' : 'All'} Summaries (${items.length})`;
      rows = items.length ? items.map(s => `<div class="admin-row">
        <div class="admin-row__main">
          <div class="admin-row__title">${s.title}</div>
          <div class="admin-row__sub">${s.author||'?'} · ${s.subject} · ${s.grade} · ${s.country} · ${(s.views||0).toLocaleString()} views</div>
        </div>
        <span class="spill s-approved">Approved</span>
        <div class="admin-row__actions">
          <button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${s.id}'})"><i class="fas fa-eye"></i></button>
          <button class="btn btn-danger btn-sm" onclick="adminRemoveSummary('${s.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('') : `<div style="padding:20px;text-align:center;color:var(--text2)">No summaries</div>`;

    } else if (type === 'deleted') {
      const items = await api('GET', '/summaries/deleted') || [];
      title = `<i class="fas fa-trash-can" style="color:var(--coral)"></i> Recently Deleted (${items.length})`;
      rows = items.length ? items.map(s => deletedSummaryRow(s)).join('') : `<div style="padding:20px;text-align:center;color:var(--text2)">Nothing removed recently</div>`;

    } else if (type === 'pending_review') {
      const items = await api('GET', '/summaries/pending') || [];
      title = `<i class="fas fa-clock" style="color:var(--gold)"></i> Pending Review (${items.length})`;
      rows = items.length ? items.map(s => `<div class="admin-row">
        <div class="admin-row__main">
          <div class="admin-row__title">${s.title}</div>
          <div class="admin-row__sub">${s.author||'?'} · ${s.subject} · ${s.country} · ${s.grade}</div>
        </div>
        <div class="admin-row__actions">
          <button class="btn btn-success btn-sm" onclick="aApprove('${s.id}')"><i class="fas fa-check"></i> Approve</button>
          <button class="btn btn-danger btn-sm" onclick="openDeclineModal('${s.id}','${(s.title||'').replace(/'/g,"\\'")}')"><i class="fas fa-times"></i> Decline</button>
          <button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${s.id}'})"><i class="fas fa-eye"></i></button>
        </div>
      </div>`).join('') : `<div style="padding:20px;text-align:center;color:var(--text2)">✅ No pending uploads</div>`;

    } else if (type === 'ipbans') {
      const bans = MOCK_IP_BANS.filter(b => !b.expired);
      title = `<i class="fas fa-ban" style="color:var(--coral)"></i> Active Bans — ${bans.length}`;
      rows = bans.length ? bans.map(b => `<div class="admin-row">
        <div class="admin-row__main">
          <div class="admin-row__title">
            <b>${b.user_name||'?'}</b>
            <code style="font-family:monospace;font-size:11px;color:var(--text3);margin-left:8px">${b.ip}</code>
          </div>
          <div class="admin-row__sub">
            ${b.reason||'—'} ·
            ${b.permanent?'<span style="color:var(--coral)">🔴 Permanent</span>':`⏳ Expires ${new Date(b.expires_at*1000).toLocaleDateString()}`}
          </div>
        </div>
        <span class="spill s-banned">Active</span>
        <div class="admin-row__actions">
          <button class="btn btn-success btn-sm" onclick="removeBan('${b.id}')"><i class="fas fa-unlock"></i> Lift</button>
        </div>
      </div>`).join('') : `<div style="padding:20px;text-align:center;color:var(--text2)">No active bans.</div>`;

    } else if (type === 'thieves' || type === 'semi' || type === 'plg_pending') {
      const all = await api('GET', '/admin/plagiarism').catch(() => []) || [];
      const verdictMap = { thieves: 'thief', semi: 'semi', plg_pending: 'pending' };
      const filtered = all.filter(c => c.verdict === verdictMap[type]);
      const labelMap = { thieves: '🚨 Confirmed Thieves', semi: '🔍 Suspicious Cases', plg_pending: '⏳ Plagiarism Pending' };
      title = `<i class="fas fa-magnifying-glass" style="color:var(--coral)"></i> ${labelMap[type]} (${filtered.length})`;
      rows = filtered.length ? filtered.map(c => renderPlagCase(c, c.verdict)).join('') : `<div style="padding:20px;text-align:center;color:var(--text2)">No cases</div>`;

    } else if (type === 'activity') {
      const data = await api('GET', '/admin/activity?limit=100') || { rows: [], total: 0 };
      const acts = data.rows || [];
      title = `<i class="fas fa-list-check" style="color:var(--amber)"></i> Activity Log <span style="font-size:12px;color:var(--text2);font-weight:400">(latest ${acts.length} of ${data.total})</span>`;
      const actionIcon = { register:'fa-user-plus', login:'fa-right-to-bracket', upload_summary:'fa-upload',
        like_summary:'fa-heart', save_summary:'fa-bookmark', unsave_summary:'fa-bookmark',
        follow:'fa-user-plus', unfollow:'fa-user-minus', ban_user:'fa-ban', unban_user:'fa-check',
        update_profile:'fa-gear', change_password:'fa-lock', approve_summary:'fa-circle-check',
        decline_summary:'fa-circle-xmark', delete_summary:'fa-trash' };
      rows = acts.length ? acts.map(a => {
        const ico = actionIcon[a.action] || 'fa-circle';
        const time = new Date(a.created_at * 1000).toLocaleString();
        return `<div class="admin-row" style="padding:10px 16px">
          <div class="admin-row__main">
            <div class="admin-row__title" style="font-size:12px">
              <i class="fas ${ico}" style="color:var(--amber);width:14px;margin-right:6px"></i>
              <b>${esc(a.user_name || '(system)')}</b>
              <span style="color:var(--text2);font-weight:400"> — ${esc(a.action.replace(/_/g,' '))}</span>
              ${a.details ? `<span style="color:var(--text3);font-size:11px;margin-left:6px">${esc(a.details)}</span>` : ''}
            </div>
            <div class="admin-row__sub" style="font-size:10.5px">${time}${a.ip ? ` · IP: ${esc(a.ip)}` : ''}</div>
          </div>
        </div>`;
      }).join('') : `<div style="padding:20px;text-align:center;color:var(--text2)">No activity yet</div>`;
      const reports = await api('GET', '/reports?status=pending') || [];
      title = `<i class="fas fa-flag" style="color:var(--coral)"></i> Pending Reports (${reports.length})`;
      rows = reports.length ? reports.map(r => `<div class="admin-row">
        <div class="admin-row__main">
          <div class="admin-row__title">${r.summary_title||r.summary_id}</div>
          <div class="admin-row__sub">By ${r.reporter_name||'?'} · Reason: ${r.reason} · ${new Date(r.created_at*1000).toLocaleDateString()}</div>
        </div>
        <div class="admin-row__actions">
          <button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${r.summary_id}'})"><i class="fas fa-eye"></i> View</button>
          <button class="btn btn-danger btn-sm" onclick="openDeclineModal('${r.summary_id}','${(r.summary_title||'').replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i> Remove</button>
        </div>
      </div>`).join('') : `<div style="padding:20px;text-align:center;color:var(--text2)">✅ No pending reports</div>`;

    } else if (type === 'site_reports') {
      const siteReports = await api('GET', '/site-reports/admin') || [];
      const open = siteReports.filter(r => r.status === 'open');
      title = `<i class="fas fa-triangle-exclamation" style="color:var(--amber)"></i> Site Issue Reports (${open.length} open / ${siteReports.length} total)`;
      const reasonLabels = {
        bug:'🐛 Bug/Malfunction', security:'🔒 Security', performance:'⚡ Performance',
        ui_broken:'🖥️ Broken UI', login:'🔑 Login/Auth', payment:'💳 Payment/Wallet',
        content:'📄 Content Issue', notification:'🔔 Notification', other:'❓ Other'
      };
      const statusColors = { open:'var(--coral)', in_progress:'var(--amber)', resolved:'var(--success)', dismissed:'var(--text3)' };
      rows = `<div style="padding:10px 14px;border-bottom:1px solid var(--bord);display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-surf btn-sm" onclick="loadSiteReports('open')">Open</button>
        <button class="btn btn-surf btn-sm" onclick="loadSiteReports('in_progress')">In Progress</button>
        <button class="btn btn-surf btn-sm" onclick="loadSiteReports('resolved')">Resolved</button>
        <button class="btn btn-surf btn-sm" onclick="loadSiteReports('')">All</button>
      </div>
      <div id="siteReportsList">${siteReports.length ? siteReports.map(r => `<div class="admin-row">
        <div class="admin-row__main">
          <div class="admin-row__title">
            ${reasonLabels[r.reason] || r.reason}
            <span style="font-size:11px;font-weight:400;color:${statusColors[r.status]||'var(--text2)'}"> · ${r.status}</span>
          </div>
          <div class="admin-row__sub">
            ${r.description ? esc(r.description.slice(0,120)) + (r.description.length > 120 ? '…' : '') : '<em>No description</em>'}
            · By ${r.reporter_name ? '@'+r.reporter_username : 'Guest'}
            · Page: ${esc(r.page||'?')}
            · ${new Date((r.created_at||0)*1000).toLocaleDateString()}
          </div>
          ${r.admin_note ? `<div style="font-size:11px;color:var(--amber);margin-top:3px">📝 Note: ${esc(r.admin_note)}</div>` : ''}
        </div>
        <div class="admin-row__actions">
          ${r.status === 'open' ? `<button class="btn btn-surf btn-sm" onclick="resolveSiteReport('${r.id}','in_progress')"><i class="fas fa-clock"></i> In Progress</button>` : ''}
          ${r.status !== 'resolved' ? `<button class="btn btn-success btn-sm" onclick="resolveSiteReport('${r.id}','resolved')"><i class="fas fa-check"></i> Resolve</button>` : ''}
          ${r.status !== 'dismissed' ? `<button class="btn btn-surf btn-sm" onclick="resolveSiteReport('${r.id}','dismissed')"><i class="fas fa-xmark"></i> Dismiss</button>` : ''}
        </div>
      </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--text2)">✅ No site issue reports</div>'}</div>`;
    }

    document.getElementById('drillTitle').innerHTML = title;
    document.getElementById('drillContent').innerHTML = rows;

  } catch (e) {
    document.getElementById('drillTitle').innerHTML = `<i class="fas fa-triangle-exclamation" style="color:var(--coral)"></i> Error`;
    document.getElementById('drillContent').innerHTML = `<div style="padding:20px;color:var(--coral)">${esc(e.message)}</div>`;
  }
}


async function loadSiteReports(status) {
  const el = document.getElementById('siteReportsList');
  if (!el) return;
  el.innerHTML = '<div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const data = await api('GET', `/site-reports/admin${status ? '?status=' + status : ''}`);
    const reasonLabels = {
      bug:'🐛 Bug/Malfunction', security:'🔒 Security', performance:'⚡ Performance',
      ui_broken:'🖥️ Broken UI', login:'🔑 Login/Auth', payment:'💳 Payment/Wallet',
      content:'📄 Content Issue', notification:'🔔 Notification', other:'❓ Other'
    };
    const statusColors = { open:'var(--coral)', in_progress:'var(--amber)', resolved:'var(--success)', dismissed:'var(--text3)' };
    el.innerHTML = data?.length ? data.map(r => `<div class="admin-row">
      <div class="admin-row__main">
        <div class="admin-row__title">
          ${reasonLabels[r.reason] || r.reason}
          <span style="font-size:11px;font-weight:400;color:${statusColors[r.status]||'var(--text2)'}"> · ${r.status}</span>
        </div>
        <div class="admin-row__sub">
          ${r.description ? esc(r.description.slice(0,120)) + (r.description.length > 120 ? '…' : '') : '<em>No description</em>'}
          · By ${r.reporter_name ? '@'+r.reporter_username : 'Guest'}
          · Page: ${esc(r.page||'?')}
          · ${new Date((r.created_at||0)*1000).toLocaleDateString()}
        </div>
        ${r.admin_note ? `<div style="font-size:11px;color:var(--amber);margin-top:3px">📝 Note: ${esc(r.admin_note)}</div>` : ''}
      </div>
      <div class="admin-row__actions">
        ${r.status === 'open' ? `<button class="btn btn-surf btn-sm" onclick="resolveSiteReport('${r.id}','in_progress')"><i class="fas fa-clock"></i> In Progress</button>` : ''}
        ${r.status !== 'resolved' ? `<button class="btn btn-success btn-sm" onclick="resolveSiteReport('${r.id}','resolved')"><i class="fas fa-check"></i> Resolve</button>` : ''}
        ${r.status !== 'dismissed' ? `<button class="btn btn-surf btn-sm" onclick="resolveSiteReport('${r.id}','dismissed')"><i class="fas fa-xmark"></i> Dismiss</button>` : ''}
      </div>
    </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--text2)">✅ No reports for this filter</div>';
  } catch (e) {
    el.innerHTML = `<div style="padding:20px;color:var(--coral)">Failed to load: ${esc(e.message)}</div>`;
  }
}

async function resolveSiteReport(id, status) {
  const note = status === 'dismissed' ? '' : (prompt('Add a note (optional):') ?? '');
  try {
    await api('PATCH', `/site-reports/${id}/resolve`, { status, admin_note: note });
    toast(status === 'resolved' ? 'Report resolved ✅' : status === 'in_progress' ? 'Marked in progress' : 'Dismissed', 'success', 'fa-check');
    loadSiteReports('open');
  } catch (e) { toast(e.message, 'error'); }
}

// Re-renders whichever moderation dashboard is currently open. Admin and
// Supervisor share this so a refresh after approve/decline/ban always lands
// back on the right page instead of one of them hardcoding renderAdmin.
async function refreshModerationView() {
  const root = document.getElementById('appRoot');
  if (STATE.route === 'supervisor') { await renderSupervisor(root); return; }
  const reopenDrill = STATE._adminDrill;
  await renderAdmin(root);
  if (reopenDrill) {
    // A fresh renderAdmin() rebuilds #adminDrillPanel empty even though
    // STATE._adminDrill still says a card was open (so it shows highlighted
    // but with nothing underneath) -- reset first so adminDrill's own
    // "same card clicked twice = close it" check doesn't just close it again.
    STATE._adminDrill = null;
    adminDrill(reopenDrill);
  }
}

async function aApprove(id) {
  try {
    await api('PATCH', `/summaries/${id}/approve`);
    toast('Approved! ✅', 'success', 'fa-circle-check');
    logActivity('approve_summary', 'summary', id, '');
    refreshModerationView();
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}

// ── Decline modal — a reason is required and gets emailed to the author.
// Used for both the pending-review queue and the reported-content "Remove"
// action, since both are "we're taking your content down, here's why".
function openDeclineModal(id, title) {
  document.getElementById('declineOverlay')?.remove();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'declineOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title"><i class="fas fa-times" style="color:var(--coral)"></i> Decline &amp; Notify Author</div>
      <button class="modal-close" onclick="document.getElementById('declineOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="info-box" style="margin-bottom:14px;font-size:12px">
        This removes <b>"${esc(title || '')}"</b>. The author is emailed your reason so they know what to fix.
      </div>
      <div class="field">
        <label>Reason <span style="color:var(--coral)">*</span></label>
        <textarea class="textarea" id="decline-reason-text" placeholder="e.g. Doesn't match the selected grade's curriculum — please align with the official syllabus and resubmit." style="min-height:100px"></textarea>
      </div>
      <div id="decline-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none"></div>
      <div style="display:flex;gap:10px;margin-top:18px">
        <button class="btn btn-danger btn-lg" id="decline-confirm-btn" style="flex:1" onclick="executeDecline('${id}')">
          <i class="fas fa-paper-plane"></i> Decline &amp; Email Author
        </button>
        <button class="btn btn-surf" onclick="document.getElementById('declineOverlay').remove()">Cancel</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

async function executeDecline(id) {
  const reason = document.getElementById('decline-reason-text')?.value?.trim();
  const errEl = document.getElementById('decline-err');
  if (!reason) { errEl.textContent = 'Please explain why, so the author knows what to fix.'; errEl.style.display = ''; return; }
  const btn = document.getElementById('decline-confirm-btn');
  const btnOrigHTML = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.style.opacity = '.7'; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Declining…'; }
  try {
    await api('PATCH', `/summaries/${id}/decline`, { reason });
    document.getElementById('declineOverlay')?.remove();
    toast('Declined. Email sent to author. 📧', 'error', 'fa-times');
    logActivity('decline_summary', 'summary', id, reason);
    refreshModerationView();
  } catch (e) {
    errEl.textContent = e.message; errEl.style.display = '';
    if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = btnOrigHTML; }
  }
}

async function adminRemoveSummary(id) {
  if (!confirm('Remove this summary? You can restore it later from Recently Deleted.')) return;
  try {
    await api('DELETE', `/summaries/${id}`);
    toast('Removed — restorable from Recently Deleted 🗑️', 'error', 'fa-trash');
    logActivity('remove_summary', 'summary', id, '');
    if (STATE.route === 'viewer') { goBack(); return; }
    refreshModerationView();
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}

// Undo a removal — shared by admin's stat-card drill-down and supervisor's
// persistent Recently Deleted panel.
async function restoreSummary(id) {
  try {
    await api('PATCH', `/summaries/${id}/restore`);
    toast('Restored ✅', 'success', 'fa-clock-rotate-left');
    logActivity('restore_summary', 'summary', id, '');
    if (document.getElementById('svDeletedList')) svLoadDeleted();
    else if (STATE._adminDrill === 'deleted') adminDrill('deleted');
    else refreshModerationView();
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}
function deletedSummaryRow(s) {
  const when = s.deleted_at ? new Date(s.deleted_at * 1000).toLocaleString() : '';
  return `<div class="admin-row">
    <div class="admin-row__main">
      <div class="admin-row__title">${esc(s.title || '')}</div>
      <div class="admin-row__sub">${esc(s.author||s.author_name||'?')} · ${esc(s.subject||'')} · Removed ${when}${s.deleted_by_name ? ' by ' + esc(s.deleted_by_name) : ''}</div>
    </div>
    <div class="admin-row__actions">
      <button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${s.id}'})"><i class="fas fa-eye"></i></button>
      <button class="btn btn-success btn-sm" onclick="restoreSummary('${s.id}')"><i class="fas fa-clock-rotate-left"></i> Restore</button>
    </div>
  </div>`;
}


async function extendBan(banId) {
  const hours = prompt('Extend by how many hours?', '24');
  if (!hours) return;
  try {
    await api('PATCH', `/admin/ip-bans/${banId}/extend`, { additional_hours: parseInt(hours) });
    toast('Ban extended', 'success', 'fa-clock');
    renderAdmin(document.getElementById('appRoot'));
  } catch (e) { toast(e.message, 'error'); }
}

async function removeBan(banId) {
  try {
    await api('DELETE', `/admin/ip-bans/${banId}`);
    toast('IP ban removed', 'info', 'fa-check');
    renderAdmin(document.getElementById('appRoot'));
  } catch (e) { toast(e.message, 'error'); }
}

async function savePlatformSettings() {
  const settings = {
    min_likes_to_monetize: document.getElementById('ps-likes')?.value,
    min_views_to_monetize: document.getElementById('ps-views')?.value,
    base_cpm_egp:           document.getElementById('ps-cpm')?.value,
    tier1_followers:        document.getElementById('ps-t1f')?.value,
    tier1_share_percent:    document.getElementById('ps-t1s')?.value,
    tier2_followers:        document.getElementById('ps-t2f')?.value,
    tier2_share_percent:    document.getElementById('ps-t2s')?.value,
    tier3_followers:        document.getElementById('ps-t3f')?.value,
    tier3_share_percent:    document.getElementById('ps-t3s')?.value,
  };
  // Remove undefined values
  Object.keys(settings).forEach(k => settings[k] === undefined && delete settings[k]);
  try {
    await api('PATCH', '/admin/platform-settings', settings);
    toast('Platform settings saved! ✅', 'success', 'fa-gear');
  } catch (e) { toast(e.message, 'error'); }
}

async function approvePromo(id) {
  try {
    await api('PATCH', `/admin/promotions/${id}/approve`);
    toast('Promotion approved! 🚀', 'success', 'fa-rocket');
    renderAdmin(document.getElementById('appRoot'));
  } catch (e) { toast(e.message, 'error'); }
}

async function rejectPromo(id) {
  const reason = prompt('Reason for rejection (optional):') || '';
  try {
    await api('PATCH', `/admin/promotions/${id}/reject`, { reason });
    toast('Promotion rejected', 'info', 'fa-times');
    renderAdmin(document.getElementById('appRoot'));
  } catch (e) { toast(e.message, 'error'); }
}

// ── PROMOTE MODAL — checks wallet first ───────────────────
async function openPromoteModal(summaryId, summaryTitle) {
  if (!STATE.loggedIn) { openSignIn(); return; }

  // Check if user has a verified payment method
  let checkResult;
  try { checkResult = await api('POST', '/wallet/check-promote'); } catch { checkResult = { ready: false, reason: 'error' }; }

  if (!checkResult.ready) {
    // No verified wallet — redirect to wallet setup first
    const reason = checkResult.reason;
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'promoGateOverlay';
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
      <div class="modal-head"><div class="modal-title">💳 Payment Method Required</div>
        <button class="modal-close" onclick="document.getElementById('promoGateOverlay').remove()"><i class="fas fa-times"></i></button></div>
      <div class="modal-body">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:48px;margin-bottom:12px">${reason === 'pending_verification' ? '⏳' : '💳'}</div>
          <div style="font-family:var(--fd);font-size:16px;font-weight:800;margin-bottom:8px;color:var(--amber)">
            ${reason === 'pending_verification' ? 'Awaiting Verification' : 'Add a Payment Method'}
          </div>
          <div style="font-size:13px;color:var(--text2);line-height:1.7">${checkResult.message}</div>
        </div>
        ${reason !== 'pending_verification' ? `<button class="btn btn-amber btn-block" onclick="document.getElementById('promoGateOverlay').remove();navTo('wallet')">
          <i class="fas fa-wallet"></i> Set Up Wallet Now
        </button>` : `<button class="btn btn-surf btn-block" onclick="document.getElementById('promoGateOverlay').remove()">OK, I'll wait</button>`}
      </div>
    </div>`;
    document.body.appendChild(ov); return;
  }

  // Has verified wallet — show promotion form
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'promoOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head"><div class="modal-title">🚀 Promote Summary</div><button class="modal-close" onclick="document.getElementById('promoOverlay').remove()"><i class="fas fa-times"></i></button></div>
    <div class="modal-body">
      <div style="font-size:13px;font-weight:700;margin-bottom:16px;color:var(--text2)">${summaryTitle}</div>
      <div class="info-box" style="margin-bottom:16px">Your summary will appear <b>at the top of feeds</b> for the duration you choose. Admin reviews your request — you'll be notified. Payment is deducted from your wallet balance or billed to your payment method.</div>
      <div class="fgrid">
        <div class="field"><label>Budget (EGP)</label>
          <select class="select" id="promo-budget">
            <option value="50">EGP 50 — Basic</option>
            <option value="100" selected>EGP 100 — Standard</option>
            <option value="200">EGP 200 — Premium</option>
            <option value="500">EGP 500 — Top Boost</option>
          </select>
        </div>
        <div class="field"><label>Duration</label>
          <select class="select" id="promo-duration">
            <option value="3">3 Days</option>
            <option value="7" selected>7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>
        <div class="field"><label>Notes (optional)</label><input class="input" id="promo-notes" placeholder="Any specific target audience…"></div>
      </div>
      <div id="promo-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none" role="alert"></div>
      <button class="btn btn-amber btn-block btn-lg" style="margin-top:18px" onclick="submitPromo('${summaryId}')"><i class="fas fa-rocket"></i> Submit Request</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

async function submitPromo(summaryId) {
  const budget_egp   = document.getElementById('promo-budget')?.value;
  const duration_days = document.getElementById('promo-duration')?.value;
  const notes        = document.getElementById('promo-notes')?.value || '';
  const errEl        = document.getElementById('promo-err');
  try {
    await api('POST', '/earnings/promotions', { summary_id: summaryId, budget_egp, duration_days, notes });
    document.getElementById('promoOverlay')?.remove();
    toast('Promotion request submitted! 🚀 Admin will review shortly.', 'success', 'fa-rocket');
  } catch (e) { errEl.textContent = e.message; errEl.style.display = ''; }
}

// ── EARNINGS PAGE ──────────────────────────────────────────
async function renderEarnings(root) {
  try {
    const data = await api('GET', '/earnings/me');
    const promos = await api('GET', '/earnings/promotions/me');

    const fmt2 = n => parseFloat(n||0).toFixed(2);
    const eligible = (data.breakdown||[]).filter(s => s.eligible);
    const notYet   = (data.breakdown||[]).filter(s => s.is_paid && !s.eligible);
    const free     = (data.breakdown||[]).filter(s => !s.is_paid);

    root.innerHTML = `<div class="page page--narrow">
      <div style="font-family:var(--fd);font-size:22px;font-weight:800;margin-bottom:4px">💰 Earnings Dashboard</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:22px">Track your revenue from ads on your summaries</div>

      <!-- Summary cards -->
      <div class="stats-bar" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-box">
          <div class="stat-val" style="color:var(--gold)">EGP ${fmt2(data.total_egp)}</div>
          <div class="stat-lbl">Total Earned</div>
        </div>
        <div class="stat-box">
          <div class="stat-val" style="color:var(--text3)">EGP ${fmt2(data.pending_egp)}</div>
          <div class="stat-lbl">Pending (threshold)</div>
        </div>
        <div class="stat-box">
          <div class="stat-val a">${data.paid_summaries || 0}</div>
          <div class="stat-lbl">Monetised Summaries</div>
        </div>
      </div>

      <!-- How earnings work -->
      <div class="info-box" style="margin-bottom:20px;font-size:12.5px;line-height:1.9">
        <b>How it works:</b><br>
        Your creator share grows with your audience — <b>Tier 1 (0+ followers): ${data.settings?.tier1_share||60}%</b> · <b>Tier 2 (${(data.settings?.tier2_followers||1000).toLocaleString()}+ followers): ${data.settings?.tier2_share||70}%</b> · <b>Tier 3 (${(data.settings?.tier3_followers||10000).toLocaleString()}+ followers): ${data.settings?.tier3_share||80}%</b><br>
        Threshold to start earning: <b>${data.settings?.min_views || 2000} views</b> OR <b>${data.settings?.min_likes || 500} likes</b> per summary.<br>
        Revenue = (Views ÷ 1000) × Advertiser CPM × Your tier share %
      </div>

      <!-- Earning summaries -->
      ${eligible.length ? `<div class="sec-head"><div class="sec-title">✅ Earning <span class="sec-tag sec-tag-gold">${eligible.length}</span></div></div>
      <div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:22px">
        ${eligible.map(s => `<div class="admin-row" style="gap:12px">
          <div class="admin-row__main">
            <div class="admin-row__title">${s.title}</div>
            <div class="admin-row__sub">${s.subject} · ${fmt(s.views)} views · ${fmt(s.likes)} likes · CPM ${s.avg_cpm?.toFixed(1)} EGP
              ${s.tier_label ? `· <span class="spill" style="background:rgba(245,158,11,.15);color:var(--amber);font-size:10px">🏆 ${s.tier_label} — ${s.creator_share_percent}%</span>` : ''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:var(--fd);font-weight:800;color:var(--gold);font-size:16px">EGP ${fmt2(s.egp)}</div>
            <div style="font-size:10px;color:var(--text3)">earned</div>
          </div>
        </div>`).join('')}
      </div>` : ''}

      <!-- Pending threshold -->
      ${notYet.length ? `<div class="sec-head"><div class="sec-title">⏳ Not Yet Earning <span class="sec-tag sec-tag-amber">${notYet.length}</span></div></div>
      <div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:22px">
        ${notYet.map(s => `<div class="admin-row" style="gap:12px">
          <div class="admin-row__main">
            <div class="admin-row__title">${s.title}</div>
            <div class="admin-row__sub" style="color:var(--amber)">${s.reason}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:var(--fd);font-weight:800;color:var(--text3);font-size:14px">EGP ${fmt2(s.pending_egp)}</div>
            <div style="font-size:10px;color:var(--text3)">when eligible</div>
          </div>
        </div>`).join('')}
      </div>` : ''}

      <!-- Free summaries -->
      ${free.length ? `<div class="sec-head"><div class="sec-title">🆓 Free Summaries <span class="sec-tag" style="background:var(--surf3);color:var(--text2)">${free.length}</span></div><span class="sec-more" onclick="toast('Go to your summary → Edit → switch to With Ads','info','fa-circle-info')">Enable ads →</span></div>` : ''}

      <!-- Promotion history -->
      <div class="sec-head" style="margin-top:10px"><div class="sec-title">🚀 My Promotions <span class="sec-tag sec-tag-amber">${(promos||[]).length}</span></div></div>
      ${(promos||[]).length ? `<div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:22px">
        ${promos.map(p => `<div class="admin-row">
          <div class="admin-row__main">
            <div class="admin-row__title">${p.summary_title || p.summary_id}</div>
            <div class="admin-row__sub">Budget: EGP ${p.budget_egp} · ${p.duration_days} days${p.expires_at ? ` · Expires: ${new Date(p.expires_at*1000).toLocaleDateString()}` : ''}</div>
          </div>
          <span class="spill ${p.status==='pending'?'s-pending':p.status==='approved'?'s-approved':'s-banned'}">${p.status}</span>
          ${p.status==='pending'?`<button class="btn btn-danger btn-sm" onclick="cancelPromo('${p.id}')"><i class="fas fa-times"></i></button>`:''}
        </div>`).join('')}
      </div>` : `<div style="padding:20px;text-align:center;color:var(--text2);font-size:13px;background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius);margin-bottom:22px">No promotions yet. Go to a summary and click <b>🚀 Promote</b>.</div>`}

      <div style="display:flex;gap:10px">
        <button class="btn btn-amber" onclick="navTo('profile')"><i class="fas fa-arrow-left"></i> Back to Profile</button>
        <button class="btn btn-surf" onclick="navTo('membership')"><i class="fas fa-crown"></i> Manage Membership</button>
      </div>
    </div>`;
  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load earnings</div><div class="empty-sub">${esc(e.message)}</div></div></div>`;
  }
}

async function cancelPromo(id) {
  try {
    await api('DELETE', `/earnings/promotions/${id}`);
    toast('Promotion request cancelled', 'info', 'fa-times');
    renderEarnings(document.getElementById('appRoot'));
  } catch (e) { toast(e.message, 'error'); }
}

// ══════════════════════════════════════════════════════════
//  WALLET PAGE
// ══════════════════════════════════════════════════════════

var METHOD_ICONS = window.METHOD_ICONS = {
  vodafone_cash:'📱', orange_money:'🟠', etisalat_cash:'📡', we_pay:'📶',
  instapay:'🏦', bank_account_eg:'🏦', fawry:'🔵',
  paypal:'🅿️', wise:'💙', payoneer:'💚', bank_account_int:'🌐', western_union:'🟡',
  binance:'🟡', usdt_trc20:'💵', usdt_erc20:'💵', bitcoin:'₿',
};

async function renderWallet(root) {
  // Non-creator — show prompt to upload first
  const summaries = STATE.currentUser ? await api('GET', `/summaries?sort=date`).catch(()=>[]) : [];
  const mySummaries = (summaries||[]).filter(s => s.author_id === STATE.currentUser?.id);

  if (mySummaries.length === 0) {
    root.innerHTML = `<div class="page page--narrow">
      <div style="font-family:var(--fd);font-size:22px;font-weight:800;margin-bottom:4px">💳 Wallet</div>
      <div class="member-gate" style="margin-top:24px">
        <div class="member-gate-icon">📝</div>
        <div class="member-gate-title">Upload a Summary First</div>
        <div class="member-gate-sub">The wallet is available to creators. Upload your first summary to unlock it — once it's approved you can add your payout method and start earning.</div>
        <button class="btn btn-amber btn-lg" onclick="openUploadModal()"><i class="fas fa-plus"></i> Upload a Summary</button>
      </div>
    </div>`; return;
  }

  try {
    const [walletData, types] = await Promise.all([
      api('GET', '/wallet/me'),
      api('GET', '/wallet/types'),
    ]);

    const { balance, methods, withdrawals } = walletData;
    const fmt2 = n => parseFloat(n||0).toFixed(2);

    // Group types by region
    const egyptTypes = (types||[]).filter(t => t.country === 'EG');
    const intTypes   = (types||[]).filter(t => t.country === 'INT');

    root.innerHTML = `<div class="page page--narrow">
      <div style="font-family:var(--fd);font-size:22px;font-weight:800;margin-bottom:4px">💳 Wallet</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:22px">Manage your payout methods and withdraw your ad revenue</div>

      <!-- Balance -->
      <div style="background:linear-gradient(135deg,var(--surf2),var(--surf3));border:1px solid var(--bord2);border-radius:var(--radius-lg);padding:24px;margin-bottom:22px">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:800;margin-bottom:8px">Available Balance</div>
        <div style="font-family:var(--fd);font-size:36px;font-weight:800;color:var(--gold)">EGP ${fmt2(balance?.available)}</div>
        ${(balance?.pending||0)>0 ? `<div style="font-size:12px;color:var(--text3);margin-top:4px">+ EGP ${fmt2(balance?.pending)} pending (below threshold)</div>` : ''}
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="openWithdrawModal(${fmt2(balance?.available)})" ${!balance?.available || balance.available < 50 ? 'disabled style="opacity:.5"' : ''}><i class="fas fa-arrow-down"></i> Withdraw</button>
          <button class="btn btn-surf btn-sm" onclick="navTo('earnings')"><i class="fas fa-chart-line"></i> Earnings Details</button>
        </div>
        ${(!balance?.available || balance.available < 50) ? `<div style="font-size:11px;color:var(--text3);margin-top:8px">Minimum withdrawal: EGP 50</div>` : ''}
      </div>

      <!-- Payout Methods -->
      <div class="sec-head">
        <div class="sec-title">💳 Payout Methods <span class="sec-tag sec-tag-amber">${(methods||[]).length} / 5</span></div>
        ${(methods||[]).length < 5 ? `<button class="btn btn-amber btn-sm" onclick="openAddMethodModal()"><i class="fas fa-plus"></i> Add Method</button>` : ''}
      </div>

      ${(methods||[]).length ? `<div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:22px">
        ${methods.map(m => `<div style="display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--bord)">
          <div style="font-size:26px">${METHOD_ICONS[m.type]||'💳'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:800;font-size:13px">${m.label} ${m.is_primary?'<span class="spill s-active" style="font-size:9px">Primary</span>':''}  ${m.verified?'<span class="spill s-approved" style="font-size:9px">✓ Verified</span>':'<span class="spill s-pending" style="font-size:9px">Pending</span>'}</div>
            <div style="font-size:11px;color:var(--text2)">${m.type_label} · ${m.masked_value} · ${m.currency}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            ${!m.is_primary ? `<button class="btn btn-surf btn-sm" onclick="setPrimary('${m.id}')"><i class="fas fa-star"></i></button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="deleteMethod('${m.id}','${m.label}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('')}
      </div>` : `<div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius);padding:24px;text-align:center;margin-bottom:22px">
        <div style="font-size:36px;margin-bottom:10px">💳</div>
        <div style="font-weight:800;margin-bottom:6px">No payout method yet</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:16px">Add a method to receive your ad revenue and to pay for promotions</div>
        <button class="btn btn-amber" onclick="openAddMethodModal()"><i class="fas fa-plus"></i> Add Payout Method</button>
      </div>`}

      <!-- Withdrawals -->
      ${(withdrawals||[]).length ? `<div class="sec-head"><div class="sec-title">💸 Withdrawal History</div></div>
      <div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:22px">
        ${withdrawals.map(w => `<div class="admin-row">
          <div class="admin-row__main">
            <div class="admin-row__title">EGP ${parseFloat(w.amount_egp).toFixed(2)} → ${w.method_label} (${w.masked_value})</div>
            <div class="admin-row__sub">${new Date(w.created_at*1000).toLocaleDateString()} ${w.admin_note?'· '+w.admin_note:''}</div>
          </div>
          <span class="spill ${w.status==='paid'?'s-approved':w.status==='pending'?'s-pending':'s-banned'}">${w.status}</span>
        </div>`).join('')}
      </div>` : ''}

      <!-- Info -->
      <div class="info-box">
        <b>How payouts work:</b><br>
        1. Add your preferred payout method below<br>
        2. Admin verifies it (usually within 24h)<br>
        3. Once your summary hits <b>2,000 views or 500 likes</b>, your earnings unlock<br>
        4. Request a withdrawal — minimum <b>EGP 50</b> — processed within <b>3–5 business days</b><br>
        5. Your <b>verified</b> payment method is also used to pay for promotions
      </div>
    </div>`;

  } catch (e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load wallet</div><div class="empty-sub">${esc(e.message)}</div></div></div>`;
  }
}

// ── ADD METHOD MODAL ───────────────────────────────────────
let _walletTypes = null;
async function openAddMethodModal() {
  if (!_walletTypes) {
    try { _walletTypes = await api('GET', '/wallet/types'); } catch { toast('Could not load payment types', 'error'); return; }
  }
  const types = _walletTypes;
  const egypt = types.filter(t => t.country === 'EG');
  const intl  = types.filter(t => t.country === 'INT');

  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'addMethodOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--wide"><div class="modal-drag"></div>
    <div class="modal-head"><div class="modal-title">➕ Add Payout Method</div><button class="modal-close" onclick="document.getElementById('addMethodOverlay').remove()"><i class="fas fa-times"></i></button></div>
    <div class="modal-body">
      <div id="method-step1">
        <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Choose your preferred payment method. Your details are <b>encrypted</b> and never shared.</div>

        <div style="font-family:var(--fd);font-size:12px;font-weight:800;color:var(--amber);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">🇪🇬 Egypt</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:18px">
          ${egypt.map(t => `<div onclick="selectPayType('${t.id}')" style="background:var(--surf2);border:1.5px solid var(--bord);border-radius:var(--radius);padding:14px;cursor:pointer;transition:.15s;text-align:center" onmouseenter="this.style.borderColor='var(--amber)'" onmouseleave="this.style.borderColor='var(--bord)'">
            <div style="font-size:24px;margin-bottom:6px">${METHOD_ICONS[t.id]||'💳'}</div>
            <div style="font-size:12px;font-weight:800">${t.label}</div>
            <div style="font-size:10px;color:var(--text3)">${t.currency}</div>
          </div>`).join('')}
        </div>

        <div style="font-family:var(--fd);font-size:12px;font-weight:800;color:var(--amber);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">🌍 International</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
          ${intl.map(t => `<div onclick="selectPayType('${t.id}')" style="background:var(--surf2);border:1.5px solid var(--bord);border-radius:var(--radius);padding:14px;cursor:pointer;transition:.15s;text-align:center" onmouseenter="this.style.borderColor='var(--gold)'" onmouseleave="this.style.borderColor='var(--bord)'">
            <div style="font-size:24px;margin-bottom:6px">${METHOD_ICONS[t.id]||'💳'}</div>
            <div style="font-size:12px;font-weight:800">${t.label}</div>
            <div style="font-size:10px;color:var(--text3)">${t.currency}</div>
          </div>`).join('')}
        </div>
      </div>
      <div id="method-step2" style="display:none"></div>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

function selectPayType(typeId) {
  const types = _walletTypes || [];
  const t = types.find(x => x.id === typeId);
  if (!t) return;

  const fieldLabels = {
    phone:              'Phone Number',
    email:              'Email Address',
    instapay_id:        'InstaPay ID / Email / Phone',
    bank_name:          'Bank Name',
    account_number:     'Account Number',
    iban:               'IBAN',
    account_name:       'Account Holder Name',
    swift_bic:          'SWIFT / BIC Code',
    bank_country:       'Bank Country',
    account_currency:   'Account Currency (e.g. USD)',
    binance_id_or_email:'Binance ID or Email',
    wallet_address:     'Wallet Address',
    full_name:          'Full Name (as on ID)',
    country:            'Country',
  };

  const step2 = document.getElementById('method-step2');
  const step1 = document.getElementById('method-step1');
  step1.style.display = 'none';
  step2.style.display = '';
  step2.innerHTML = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
    <button class="btn btn-surf btn-sm" onclick="document.getElementById('method-step1').style.display='';document.getElementById('method-step2').style.display='none'"><i class="fas fa-arrow-left"></i></button>
    <div><div style="font-family:var(--fd);font-size:16px;font-weight:800">${METHOD_ICONS[typeId]||'💳'} ${t.label}</div><div style="font-size:11px;color:var(--text2)">${t.currency} · ${t.country === 'EG' ? 'Egypt' : 'International'}</div></div>
  </div>
  <div class="fgrid">
    <div class="field"><label>Label (nickname for this method)</label><input class="input gf" id="pm-label" placeholder='e.g. "My Vodafone Cash" or "PayPal USD"'></div>
    ${t.fields.map(f => `<div class="field"><label>${fieldLabels[f]||f}</label><input class="input" id="pm-field-${f}" placeholder="${fieldLabels[f]||f}"></div>`).join('')}
  </div>
  <div class="info-box" style="margin-top:12px">Your details are <b>encrypted with AES-256</b> before storage. Only the masked version (e.g. ****3456) is shown after saving.</div>
  <div id="pm-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none" role="alert"></div>
  <button class="btn btn-amber btn-block btn-lg" style="margin-top:18px" onclick="submitAddMethod('${typeId}',${JSON.stringify(t.fields)})"><i class="fas fa-lock"></i> Save Securely</button>`;
}

async function submitAddMethod(typeId, fields) {
  const label = document.getElementById('pm-label')?.value?.trim();
  const errEl = document.getElementById('pm-err');
  if (!label) { errEl.textContent = 'Please enter a label for this method'; errEl.style.display = ''; return; }
  const data = {};
  for (const f of fields) {
    data[f] = document.getElementById(`pm-field-${f}`)?.value?.trim() || '';
  }
  try {
    const res = await api('POST', '/wallet/payout-methods', { type: typeId, label, data });
    document.getElementById('addMethodOverlay')?.remove();
    toast('Payout method added! ✅ Admin will verify within 24h.', 'success', 'fa-lock');
    renderWallet(document.getElementById('appRoot'));
  } catch (e) { errEl.textContent = e.message; errEl.style.display = ''; }
}

// ── WITHDRAW MODAL ─────────────────────────────────────────
async function openWithdrawModal(available) {
  let methods;
  try { const w = await api('GET', '/wallet/me'); methods = (w.methods||[]).filter(m => m.verified); }
  catch { toast('Could not load wallet', 'error'); return; }

  if (!methods.length) { toast('No verified payout method. Add and wait for verification first.', 'error', 'fa-times'); return; }

  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'withdrawOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head"><div class="modal-title">💸 Request Withdrawal</div><button class="modal-close" onclick="document.getElementById('withdrawOverlay').remove()"><i class="fas fa-times"></i></button></div>
    <div class="modal-body">
      <div style="background:var(--gold-dim);border:1px solid rgba(255,184,0,.2);border-radius:var(--radius-sm);padding:12px;text-align:center;margin-bottom:18px">
        <div style="font-size:11px;color:var(--text2)">Available</div>
        <div style="font-family:var(--fd);font-size:24px;font-weight:800;color:var(--gold)">EGP ${parseFloat(available).toFixed(2)}</div>
      </div>
      <div class="fgrid">
        <div class="field"><label>Amount (EGP)</label><input class="input gf" id="wd-amount" type="number" min="50" max="${available}" step="0.01" placeholder="Min EGP 50"></div>
        <div class="field"><label>Send to</label><select class="select" id="wd-method">
          ${methods.map(m => `<option value="${m.id}">${METHOD_ICONS[m.type]||'💳'} ${m.label} (${m.masked_value})</option>`).join('')}
        </select></div>
      </div>
      <div class="info-box" style="margin-top:12px">Processed within <b>3–5 business days</b>. You'll be notified when sent.</div>
      <div id="wd-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none" role="alert"></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="submitWithdraw()"><i class="fas fa-arrow-down"></i> Request Withdrawal</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

async function submitWithdraw() {
  const amount = document.getElementById('wd-amount')?.value;
  const methodId = document.getElementById('wd-method')?.value;
  const errEl = document.getElementById('wd-err');
  if (!amount || parseFloat(amount) < 50) { errEl.textContent = 'Minimum withdrawal is EGP 50'; errEl.style.display = ''; return; }
  try {
    await api('POST', '/wallet/withdraw', { payout_method_id: methodId, amount_egp: parseFloat(amount) });
    document.getElementById('withdrawOverlay')?.remove();
    toast('Withdrawal request submitted! 💸 Processing within 3–5 business days.', 'success', 'fa-check');
    renderWallet(document.getElementById('appRoot'));
  } catch (e) { errEl.textContent = e.message; errEl.style.display = ''; }
}

async function setPrimary(id) {
  try { await api('PATCH', `/wallet/payout-methods/${id}/primary`); renderWallet(document.getElementById('appRoot')); }
  catch (e) { toast(e.message, 'error'); }
}
async function deleteMethod(id, label) {
  if (!confirm(`Remove "${label}"?`)) return;
  try { await api('DELETE', `/wallet/payout-methods/${id}`); toast('Removed', 'info'); renderWallet(document.getElementById('appRoot')); }
  catch (e) { toast(e.message, 'error'); }
}

// ── ADMIN WALLET FUNCTIONS ─────────────────────────────────
function adminWithdrawRow(w) {
  return `<div class="admin-row" id="wd-row-${w.id}">
    <div class="admin-row__main">
      <div class="admin-row__title">EGP ${parseFloat(w.amount_egp).toFixed(2)} — ${w.user_name} (${w.user_email})</div>
      <div class="admin-row__sub">${w.pm_type_label||w.pm_type} · ${w.masked_value} · ${new Date(w.created_at*1000).toLocaleDateString()}</div>
    </div>
    <span class="spill ${w.status==='pending'?'s-pending':w.status==='paid'?'s-approved':'s-banned'}">${w.status}</span>
    ${w.status==='pending' ? `<div class="admin-row__actions">
      <button class="btn btn-success btn-sm" onclick="adminPayWithdrawal('${w.id}')"><i class="fas fa-check"></i> Mark Paid</button>
      <button class="btn btn-surf btn-sm" onclick="adminApproveWithdrawal('${w.id}')"><i class="fas fa-clock"></i> Approve</button>
      <button class="btn btn-danger btn-sm" onclick="adminRejectWithdrawal('${w.id}')"><i class="fas fa-times"></i> Reject</button>
    </div>` : ''}
  </div>`;
}

async function adminLoadAllWithdrawals() {
  const el = document.getElementById('adminWithdrawList');
  if (!el) return;
  el.innerHTML = `<div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const all = await api('GET', '/wallet/admin/withdrawals');
    el.innerHTML = (all||[]).length ? (all||[]).map(w => adminWithdrawRow(w)).join('') : `<div style="padding:18px;text-align:center;color:var(--text2)">No withdrawals</div>`;
  } catch (e) { el.innerHTML = `<div style="padding:18px;color:var(--coral)">${esc(e.message)}</div>`; }
}

async function adminVerifyMethod(id) {
  try { await api('PATCH', `/wallet/admin/payout-methods/${id}/verify`); toast('Verified ✅', 'success', 'fa-check'); renderAdmin(document.getElementById('appRoot')); }
  catch (e) { toast(e.message, 'error'); }
}
async function adminRejectMethod(id, label) {
  const reason = prompt(`Reason for rejecting "${label}":`)||'Invalid details';
  try { await api('PATCH', `/wallet/admin/payout-methods/${id}/reject`, { reason }); toast('Rejected', 'info'); renderAdmin(document.getElementById('appRoot')); }
  catch (e) { toast(e.message, 'error'); }
}
async function adminPayWithdrawal(id) {
  const note = prompt('Confirm payment note (optional, e.g. transaction ID):') || '';
  try { await api('PATCH', `/wallet/admin/withdrawals/${id}`, { status: 'paid', admin_note: note }); toast('Marked as paid ✅', 'success', 'fa-check'); adminLoadAllWithdrawals(); }
  catch (e) { toast(e.message, 'error'); }
}
async function adminApproveWithdrawal(id) {
  try { await api('PATCH', `/wallet/admin/withdrawals/${id}`, { status: 'approved' }); toast('Approved', 'success', 'fa-check'); adminLoadAllWithdrawals(); }
  catch (e) { toast(e.message, 'error'); }
}
async function adminRejectWithdrawal(id) {
  const reason = prompt('Reason for rejection:')||'Does not meet criteria';
  try { await api('PATCH', `/wallet/admin/withdrawals/${id}`, { status: 'rejected', admin_note: reason }); toast('Rejected', 'info'); adminLoadAllWithdrawals(); }
  catch (e) { toast(e.message, 'error'); }
}


// ══════════════════════════════════════════════════════
//  SUPERVISOR DASHBOARD
//  Scope is intentionally narrow: review pending summaries (approve /
//  decline with a reason, emailed to the author) and ban users (with a
//  reason, emailed to them) — nothing else. Every action below calls the
//  EXACT SAME functions the Admin dashboard uses — aApprove, openDeclineModal,
//  openBanModal — there is no separate "supervisor version" of this logic.
// ══════════════════════════════════════════════════════
async function renderSupervisor(root) {
  const u = STATE.currentUser;
  if (!u || (u.role !== 'admin' && u.role !== 'supervisor')) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">🔒</div><div class="empty-title">Access Denied</div><div class="empty-sub">Supervisor or Admin access required</div></div></div>`;
    return;
  }
  try {
    const [pending, myActivity] = await Promise.all([
      api('GET', '/summaries/pending').catch(() => []),
      api('GET', '/admin/my-activity').catch(() => []),
    ]);
    const pendingArr = pending || [];
    const activityArr = myActivity || [];

    root.innerHTML = `<div class="page">
      <div class="admin-hero">
        <div class="admin-hero__icon"><i class="fas fa-eye"></i></div>
        <div>
          <div class="admin-hero__title">Supervision Queue</div>
          <div class="admin-hero__sub">Review incoming summaries · See what's live and what's been reported · Ban rule-breakers</div>
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <span class="badge" style="background:var(--amber-dim);color:var(--amber);font-size:13px;padding:8px 14px">
            ${pendingArr.length} pending
          </span>
        </div>
      </div>

      <!-- SUPERVISOR GUIDE -->
      <div style="background:var(--surf);border:1px solid var(--bord);border-radius:var(--radius-lg);padding:20px 22px;margin-bottom:20px">
        <div style="font-family:var(--fd);font-size:14px;font-weight:800;margin-bottom:10px;color:var(--amber)">📋 Review Checklist</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;font-size:12.5px;color:var(--text2)">
          <div style="display:flex;gap:8px;align-items:flex-start"><i class="fas fa-circle-check" style="color:var(--amber);margin-top:2px;flex-shrink:0"></i><span>Summary actually covers the subject it claims</span></div>
          <div style="display:flex;gap:8px;align-items:flex-start"><i class="fas fa-circle-check" style="color:var(--amber);margin-top:2px;flex-shrink:0"></i><span>Content matches the curriculum grade/country</span></div>
          <div style="display:flex;gap:8px;align-items:flex-start"><i class="fas fa-circle-check" style="color:var(--amber);margin-top:2px;flex-shrink:0"></i><span>No copy-paste from another Mol5sat summary</span></div>
          <div style="display:flex;gap:8px;align-items:flex-start"><i class="fas fa-circle-check" style="color:var(--amber);margin-top:2px;flex-shrink:0"></i><span>Language matches the selected language field</span></div>
          <div style="display:flex;gap:8px;align-items:flex-start"><i class="fas fa-circle-check" style="color:var(--amber);margin-top:2px;flex-shrink:0"></i><span>No inappropriate or harmful content</span></div>
          <div style="display:flex;gap:8px;align-items:flex-start"><i class="fas fa-circle-check" style="color:var(--amber);margin-top:2px;flex-shrink:0"></i><span>Pages count is reasonable and honest</span></div>
        </div>
      </div>

      <!-- PENDING QUEUE -->
      <div class="admin-panel">
        <div class="admin-panel-head">
          <h3><i class="fas fa-clock" style="color:var(--gold)"></i> Pending Review
            <span class="spill s-pending">${pendingArr.length}</span>
          </h3>
          <div style="display:flex;gap:6px">
            <input class="admin-search" id="svSearchInput" placeholder="🔍 Filter…"
              oninput="svFilter(this.value)">
          </div>
        </div>
        <div id="svPendingList">
          ${pendingArr.length === 0
            ? `<div style="padding:32px;text-align:center;color:var(--text2)">
                <div style="font-size:36px;margin-bottom:10px">✅</div>
                <div style="font-family:var(--fd);font-weight:800;font-size:16px">All clear!</div>
                <div style="font-size:13px;margin-top:4px">No summaries waiting for review.</div>
              </div>`
            : pendingArr.map(s => svSummaryRow(s)).join('')}
        </div>
      </div>

      <!-- APPROVED CONTENT — read/browse visibility into everything live -->
      <div class="admin-panel" style="margin-top:18px">
        <div class="admin-panel-head">
          <h3><i class="fas fa-file-lines" style="color:var(--gold)"></i> Approved Content</h3>
          <input class="admin-search" id="svApprovedSearchInput" placeholder="🔍 Filter…" oninput="svFilterApproved(this.value)">
        </div>
        <div id="svApprovedList"><div style="padding:24px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div></div>
      </div>

      <!-- REPORTED CONTENT — same reports queue and Resolve/Dismiss admin uses -->
      <div class="admin-panel" style="margin-top:18px">
        <div class="admin-panel-head">
          <h3><i class="fas fa-flag" style="color:var(--coral)"></i> Reported Content</h3>
          <div style="display:flex;gap:6px">
            <button class="btn btn-surf btn-sm" onclick="svLoadReports('pending')">Pending</button>
            <button class="btn btn-surf btn-sm" onclick="svLoadReports('all')">All</button>
          </div>
        </div>
        <div id="svReportsList"><div style="padding:24px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div></div>
      </div>

      <!-- RECENTLY DELETED — undo a removal -->
      <div class="admin-panel" style="margin-top:18px">
        <div class="admin-panel-head">
          <h3><i class="fas fa-trash-can" style="color:var(--coral)"></i> Recently Deleted</h3>
        </div>
        <div id="svDeletedList"><div style="padding:24px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div></div>
      </div>

      <!-- BAN / UNBAN USERS — the supervisor's other permitted action -->
      <div class="admin-panel" style="margin-top:18px">
        <div class="admin-panel-head">
          <h3><i class="fas fa-user-slash" style="color:var(--coral)"></i> Ban / Unban Users</h3>
          <input class="admin-search" id="svUserSearchInput" placeholder="🔍 Search by name, email or @username…" oninput="svFilterUsers(this.value)">
        </div>
        <div id="svUserList"><div style="padding:24px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div></div>
      </div>

      <!-- MY RECENT ACTIONS (real data — this supervisor's own approve/decline/ban history only) -->
      <div class="admin-panel" style="margin-top:18px">
        <div class="admin-panel-head">
          <h3><i class="fas fa-clock-rotate-left" style="color:var(--amber)"></i> Your Recent Actions</h3>
        </div>
        <div id="svHistoryList">${svHistoryRows(activityArr)}</div>
      </div>
    </div>`;

    svLoadUsers();
    svLoadApproved();
    svLoadReports('pending');
    svLoadDeleted();

  } catch(e) {
    root.innerHTML = `<div class="page"><div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Error loading queue</div><div class="empty-sub">${esc(e.message)}</div></div></div>`;
  }
}

function svSummaryRow(s) {
  return `<div class="admin-row" id="svRow_${s.id}">
    <div class="admin-row__main">
      <div class="admin-row__title">${esc(s.title || '')}</div>
      <div class="admin-row__sub">
        <span style="color:var(--amber);font-weight:700">${esc(s.subject||'')}</span>
        · ${esc(s.author||'')}
        · <i class="fas fa-graduation-cap" style="font-size:10px"></i> ${esc(s.grade||'')}
        · <i class="fas fa-globe" style="font-size:10px"></i> ${esc(s.country||'')}
        · <span class="lang-pill">${(s.lang||'ar').toUpperCase()}</span>
        · ${s.pages||0} pages
        · <span style="color:var(--text3);font-size:10px">${new Date((s.created_at||0)*1000).toLocaleDateString()}</span>
      </div>
      ${s.translated_from ? `<div style="font-size:11px;color:var(--text2);margin-top:3px"><i class="fas fa-language" style="color:var(--amber)"></i> Translation of: ${esc(s.translated_from)}</div>` : ''}
    </div>
    <div class="admin-row__actions" style="flex-wrap:wrap;gap:5px">
      <button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${s.id}'})">
        <i class="fas fa-eye"></i> Preview
      </button>
      <button class="btn btn-success btn-sm" onclick="aApprove('${s.id}')">
        <i class="fas fa-check"></i> Approve
      </button>
      <button class="btn btn-danger btn-sm" onclick="openDeclineModal('${s.id}','${(s.title||'').replace(/'/g,"\\'")}')">
        <i class="fas fa-times"></i> Decline
      </button>
    </div>
  </div>`;
}

function svFilter(val) {
  const v = val.toLowerCase();
  document.querySelectorAll('#svPendingList .admin-row').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(v) ? '' : 'none';
  });
}

// ── Ban/Unban Users panel — lists users with Ban/Unban buttons that call the
// exact same functions (openBanModal/executeBan, aUnban) the Admin dashboard
// uses — identical mechanics, not a separate supervisor implementation.
async function svLoadUsers(q) {
  const el = document.getElementById('svUserList');
  if (!el) return;
  try {
    const users = await api('GET', `/admin/users${q ? '?q=' + encodeURIComponent(q) : ''}`) || [];
    el.innerHTML = users.length ? users.map(usr => `<div class="admin-row">
      <div class="admin-row__main">
        <div class="admin-row__title">
          ${esc(usr.name)} ${usr.username ? `<span style="color:var(--amber);font-size:11px;font-weight:600">@${esc(usr.username)}</span>` : ''}
        </div>
        <div class="admin-row__sub">${esc(usr.email)} · ${esc(usr.country||'—')} · ${usr.uploads||0} uploads${usr.status==='banned' && usr.ban_reason ? ` · Reason: ${esc(usr.ban_reason)}` : ''}</div>
      </div>
      <span class="spill ${usr.status==='active'?'s-active':'s-banned'}">${esc(usr.status)}</span>
      <div class="admin-row__actions">
        ${usr.status==='active'
          ? `<button class="btn btn-danger btn-sm" onclick="openBanModal('${usr.id}','${(usr.name||'').replace(/'/g,"\\'")}')"><i class="fas fa-ban"></i> Ban</button>`
          : `<button class="btn btn-success btn-sm" onclick="aUnban('${usr.id}')"><i class="fas fa-check"></i> Unban</button>`}
        <button class="btn btn-surf btn-sm" onclick="navigate('creator',{id:'${usr.id}'})"><i class="fas fa-eye"></i></button>
      </div>
    </div>`).join('') : `<div style="padding:18px;text-align:center;color:var(--text2)">No users found</div>`;
  } catch (e) {
    el.innerHTML = `<div style="padding:18px;text-align:center;color:var(--coral)">${esc(e.message)}</div>`;
  }
}

let _svUserSearchTimer;
function svFilterUsers(v) {
  clearTimeout(_svUserSearchTimer);
  _svUserSearchTimer = setTimeout(() => svLoadUsers(v), 250);
}

// ── Approved Content panel — same data (/summaries?approved=1) and the same
// Remove action (adminRemoveSummary) as admin's "Approved" stat-card drill-down.
async function svLoadApproved() {
  const el = document.getElementById('svApprovedList');
  if (!el) return;
  try {
    const items = await api('GET', '/summaries?approved=1&limit=50') || [];
    el.innerHTML = items.length ? items.map(s => `<div class="admin-row">
      <div class="admin-row__main">
        <div class="admin-row__title">${esc(s.title || '')}</div>
        <div class="admin-row__sub">${esc(s.author||'?')} · ${esc(s.subject||'')} · ${esc(s.grade||'')} · ${esc(s.country||'')} · ${(s.views||0).toLocaleString()} views</div>
      </div>
      <span class="spill s-approved">Approved</span>
      <div class="admin-row__actions">
        <button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${s.id}'})"><i class="fas fa-eye"></i></button>
        <button class="btn btn-danger btn-sm" onclick="adminRemoveSummary('${s.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('') : `<div style="padding:18px;text-align:center;color:var(--text2)">No approved summaries yet</div>`;
  } catch (e) {
    el.innerHTML = `<div style="padding:18px;text-align:center;color:var(--coral)">${esc(e.message)}</div>`;
  }
}
function svFilterApproved(val) {
  const v = val.toLowerCase();
  document.querySelectorAll('#svApprovedList .admin-row').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(v) ? '' : 'none';
  });
}

// ── Recently Deleted panel — reuses the exact same restoreSummary/
// deletedSummaryRow admin's stat-card drill-down uses.
async function svLoadDeleted() {
  const el = document.getElementById('svDeletedList');
  if (!el) return;
  try {
    const items = await api('GET', '/summaries/deleted') || [];
    el.innerHTML = items.length ? items.map(s => deletedSummaryRow(s)).join('') : `<div style="padding:18px;text-align:center;color:var(--text2)">Nothing removed recently</div>`;
  } catch (e) {
    el.innerHTML = `<div style="padding:18px;text-align:center;color:var(--coral)">${esc(e.message)}</div>`;
  }
}

// ── Reported Content panel — same endpoint and row shape as admin's Reports
// panel (aLoadReports), just writing into a different target element. Resolve
// / Dismiss call the exact same shared resolveReport() function admin uses.
async function svLoadReports(filter) {
  const el = document.getElementById('svReportsList');
  if (!el) return;
  el.innerHTML = `<div style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></div>`;
  try {
    const status = filter === 'all' ? '' : 'pending';
    const reports = await api('GET', `/reports/admin${status ? '?status=' + status : ''}`);
    if (!reports?.length) {
      el.innerHTML = `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">✅ No ${filter === 'all' ? '' : 'pending '}reports</div>`;
      return;
    }
    el.innerHTML = reports.map(r => `<div class="admin-row">
      <div class="admin-row__main">
        <div class="admin-row__title" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span>${esc(r.summary_title || 'Deleted summary')}</span>
          <span class="spill ${r.status==='pending'?'s-pending':r.status==='resolved'?'s-approved':'s-banned'}" style="font-size:10px">${esc(r.status)}</span>
          <span class="spill" style="background:rgba(255,107,107,.12);color:var(--coral);font-size:10px">${esc(REPORT_REASON_LABELS[r.reason] || r.reason)}</span>
        </div>
        <div class="admin-row__sub">
          By @${esc(r.author_username||r.author_name||'?')} · Reported by @${esc(r.reporter_username||r.reporter_name||'?')} · ${new Date(r.created_at*1000).toLocaleDateString()}
        </div>
        ${r.description ? `<div class="admin-row__sub" style="color:var(--text);font-style:italic;font-size:12px">"${esc(r.description.slice(0,200))}"</div>` : ''}
        ${r.admin_note ? `<div class="admin-row__sub" style="color:var(--text3);font-size:11px">Note: ${esc(r.admin_note)}</div>` : ''}
      </div>
      <div class="admin-row__actions">
        ${r.summary_id ? `<button class="btn btn-surf btn-sm" onclick="navigate('viewer',{id:'${r.summary_id}'})"><i class="fas fa-eye"></i> View</button>` : ''}
        ${r.author_id ? `<button class="btn btn-surf btn-sm" onclick="navigate('creator',{id:'${r.author_id}'})"><i class="fas fa-user"></i></button>` : ''}
        ${r.status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="resolveReport('${r.id}','resolved')"><i class="fas fa-check"></i> Resolve</button>
          <button class="btn btn-surf btn-sm" onclick="resolveReport('${r.id}','dismissed')"><i class="fas fa-xmark"></i> Dismiss</button>
        ` : ''}
      </div>
    </div>`).join('');
  } catch (e) {
    el.innerHTML = `<div style="padding:18px;color:var(--coral);font-size:13px">Failed to load reports: ${esc(e.message)}</div>`;
  }
}

function svHistoryRows(activityArr) {
  if (!activityArr || !activityArr.length) {
    return `<div style="padding:18px;text-align:center;color:var(--text2);font-size:13px">No actions yet — approvals, declines, and bans you make will show up here.</div>`;
  }
  const iconMap = { ban_user: 'fa-ban', unban_user: 'fa-check', approve_summary: 'fa-circle-check', decline_summary: 'fa-circle-xmark' };
  const labelMap = { ban_user: 'Banned a user', unban_user: 'Unbanned a user', approve_summary: 'Approved a summary', decline_summary: 'Declined a summary' };
  return activityArr.map(a => {
    const ico = iconMap[a.action] || 'fa-circle';
    const label = labelMap[a.action] || a.action;
    const time = new Date((a.created_at||0) * 1000).toLocaleString();
    return `<div class="admin-row" style="padding:10px 16px">
      <div class="admin-row__main">
        <div class="admin-row__title" style="font-size:12px">
          <i class="fas ${ico}" style="color:var(--amber);width:14px;margin-right:6px"></i>
          <b>${esc(label)}</b>
          ${a.details ? `<span style="color:var(--text3);font-size:11px;margin-left:6px">${esc(a.details)}</span>` : ''}
        </div>
        <div class="admin-row__sub" style="font-size:10.5px">${time}</div>
      </div>
    </div>`;
  }).join('');
}

