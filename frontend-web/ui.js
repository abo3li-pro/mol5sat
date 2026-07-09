// ═══════════════════════════════════════════════════════
//  UI BOOTSTRAP
// ═══════════════════════════════════════════════════════
let _userMenuOpen = false;

function toggleTheme(){
  const h = document.documentElement;
  const next = h.dataset.theme === 'dark' ? 'light' : 'dark';
  h.dataset.theme = next;
  // Icon shows what clicking will switch TO — moon = go dark, sun = go light
  document.getElementById('themeIcon').className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  try { localStorage.setItem('mol5sat_theme', next); } catch(e){}
}
function toggleSidebar(){ document.body.classList.toggle('sb-open'); }
function toggleMobSearch(){ document.getElementById('mobSearch').classList.toggle('open'); }

let _sugTimer;
function onSearchInput(val){
  clearTimeout(_sugTimer);
  _sugTimer = setTimeout(() => {
    if (!val || val.length < 2) { document.getElementById('searchSug').classList.add('hidden'); return; }
    const sug = []; const seen = new Set();
    Object.keys(SUBJECT_BRANCHES).forEach(k => {
      if ((k.includes(val.toLowerCase()) || val.toLowerCase().includes(k)) && !seen.has(k)) {
        seen.add(k); sug.push({ text: k.charAt(0).toUpperCase() + k.slice(1), icon: 'fa-magnifying-glass' });
      }
    });
    SUBJECTS.forEach(s => {
      if (s.toLowerCase().includes(val.toLowerCase()) && !seen.has(s)) {
        seen.add(s); sug.push({ text: s, icon: 'fa-atom' });
      }
    });
    const el = document.getElementById('searchSug');
    if (!sug.length) { el.classList.add('hidden'); return; }
    el.innerHTML = sug.slice(0, 7).map(s => `<div class="sug-item" onclick="selectSug('${s.text.replace(/'/g,"\\'")}')"><i class="fas ${s.icon}" aria-hidden="true"></i><span class="sk">${s.text}</span></div>`).join('');
    el.classList.remove('hidden');
  }, 160);
}
function selectSug(text){
  document.getElementById('searchSug').classList.add('hidden');
  document.getElementById('searchInput').value = text;
  document.getElementById('mobSearchInput').value = text;
  doSearch();
}
function doSearch(){
  const q = (document.getElementById('searchInput')?.value || document.getElementById('mobSearchInput')?.value || '').trim();
  document.getElementById('searchSug').classList.add('hidden');
  STATE.routeData = { q };
  navigate('search', { q });
}

document.addEventListener('click', e => {
  if (!e.target.closest('#searchWrap') && !e.target.closest('#searchSug') && !e.target.closest('.mob-search'))
    document.getElementById('searchSug').classList.add('hidden');
  if (!e.target.closest('#navAvatar') && !e.target.closest('#userMenu'))
    closeUserMenu();
  if (e.target.classList.contains('overlay') && !['uploadOverlay','banOverlay','ipBanOverlay'].includes(e.target.id))
    e.target.remove();
});

function toggleUserMenu(e){
  if (e) e.stopPropagation();
  if (_userMenuOpen) { closeUserMenu(); return; }
  if (!STATE.loggedIn) { openSignIn(); return; }
  _userMenuOpen = true;
  const u = STATE.currentUser;
  if (!u) { _userMenuOpen = false; openSignIn(); return; }
  const safeName = (u.name || '').trim();
  const initials = safeName ? safeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  const photo = u.profile_photo || u.photo || '';
  const avatarHtml = photo
    ? `<img src="${photo}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--bord2)">`
    : `<div class="um-av">${initials}</div>`;
  const m = document.createElement('div'); m.className = 'user-menu'; m.id = 'userMenu';
  const isAdmin = u.role === 'admin';
  const hasUploads = (() => {
    if (typeof MOCK_SUMMARIES !== 'undefined') {
      return MOCK_SUMMARIES.some(s => s.authorId === u.id && s.approved);
    }
    return (u.uploads || 0) > 0;
  })();
  m.innerHTML = `
    <div class="um-section um-section--first">
      <div class="user-menu-header">
        ${avatarHtml}
        <div>
          <div class="um-name">${safeName || 'Guest'}</div>
          ${u.username ? `<div style="color:var(--amber);font-size:11px;font-weight:700">@${u.username}</div>` : ''}
          <div class="um-email">${u.email}</div>
        </div>
      </div>
    </div>
    <div class="um-section">
      <div class="um-item" onclick="navTo('profile');closeUserMenu()"><i class="fas fa-circle-user" aria-hidden="true"></i> My Profile</div>
      <div class="um-item" onclick="navTo('notifications');closeUserMenu()"><i class="fas fa-bell" aria-hidden="true"></i> Notifications ${STATE.unreadCount > 0 ? `<span style="background:var(--coral);color:#fff;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:900;margin-left:4px">${STATE.unreadCount}</span>` : ''}</div>
      ${isAdmin ? `<div class="um-item" onclick="navTo('admin');closeUserMenu()"><i class="fas fa-shield-halved" aria-hidden="true"></i> Admin Panel</div>` : ''}
      ${!isAdmin ? `<div class="um-item" onclick="openUploadModal();closeUserMenu()"><i class="fas fa-upload" aria-hidden="true"></i> Upload Summary</div>
      <div class="um-item" onclick="navTo('following');closeUserMenu()"><i class="fas fa-users" aria-hidden="true"></i> Following</div>
      ${hasUploads ? `<div class="um-item" onclick="navTo('earnings');closeUserMenu()"><i class="fas fa-coins" aria-hidden="true"></i> Earnings</div>
      <div class="um-item" onclick="navTo('wallet');closeUserMenu()"><i class="fas fa-wallet" aria-hidden="true"></i> Wallet</div>` : ''}` : ''}
    </div>
    <div class="um-section">
      ${!isAdmin ? `<div class="um-item" onclick="navTo('settings');closeUserMenu()"><i class="fas fa-gear" aria-hidden="true"></i> Settings</div>
      <div class="um-item" onclick="openChangePassword();closeUserMenu()"><i class="fas fa-lock" aria-hidden="true"></i> Change Password</div>` : ''}
      <div class="um-item danger" onclick="signOut();closeUserMenu()"><i class="fas fa-right-from-bracket" aria-hidden="true"></i> Sign Out</div>
    </div>`;
  document.body.appendChild(m);
  // Position near avatar
  const av = document.getElementById('navAvatar');
  if (av) {
    const r = av.getBoundingClientRect();
    const menuW = 260;
    let left = r.right - menuW;
    if (left < 8) left = 8;
    m.style.top = (r.bottom + 8) + 'px';
    m.style.right = (window.innerWidth - r.right) + 'px';
    m.style.left = 'auto';
  }
}
function closeUserMenu(){ _userMenuOpen = false; document.getElementById('userMenu')?.remove(); }

function updateNavForUser(){
  const u = STATE.currentUser;
  const av = document.getElementById('navAvatar');
  const isGuest = !STATE.loggedIn || !u;

  if (isGuest) {
    // Guest mode: show sign-in icon instead of avatar
    if (av) {
      av.textContent = '→';
      av.title = 'Sign in';
      av.onclick = (e) => { e.stopPropagation(); openSignIn(); };
      av.style.background = 'var(--amber-dim)';
      av.style.border = '1.5px solid rgba(232,93,4,.3)';
      av.style.fontSize = '16px';
      av.style.fontWeight = '900';
      av.style.color = 'var(--amber)';
    }
    // Show guest banner
    document.getElementById('guestBanner')?.classList.remove('hidden');
    // Hide Curriculum feed link only (si-div-feeds removed from HTML — no longer needed)
    const feedHideIds = ['si-sec-feeds','si-curr'];
    feedHideIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    // Keep si-sci visible for guests — science feed is their default
    // Hide the search-mode toggle (curriculum vs science) — guests only see science
    const smBtn = document.getElementById('searchModeBtn');
    if (smBtn) smBtn.style.display = 'none';
    // Hide entire "You" section
    const youHideIds = ['si-sec-you','si-profile','si-upload','si-saved','si-following','si-notif','si-earnings','si-wallet','si-div-you'];
    youHideIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    // Hide "All Subjects" from Discover (and its section label)
    const discoverHideIds = ['si-sec-discover','si-subjects','si-div-discover'];
    discoverHideIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    // Hide auth-only bottom nav items
    const bnHideIds = ['si-admin','si-admin-sec','bn-upload','bn-notif','bn-profile','bn-admin'];
    bnHideIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    return;
  }

  if (av) {
    const photo = u.profile_photo || u.photo || '';
    if (photo) {
      av.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      av.style.background = 'transparent';
      av.style.border = 'none';
      av.style.padding = '0';
    } else {
      av.textContent = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      av.style.background = '';
      av.style.border = '';
      av.style.padding = '';
    }
    av.onclick = (e) => toggleUserMenu(e);
    av.title = u.name;
  }
  // Hide guest banner
  document.getElementById('guestBanner')?.classList.add('hidden');
  // Restore all sections hidden for guests
  const restoreIds = ['si-sec-feeds','si-curr','si-sci','si-sec-you','si-profile','si-saved','si-following','si-notif','si-div-you','si-sec-discover','si-subjects','si-div-discover','bn-notif','bn-profile'];
  restoreIds.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
  // Wallet & Earnings only visible if user has at least one approved upload
  const hasUploads = (() => {
    if (typeof MOCK_SUMMARIES !== 'undefined') {
      return MOCK_SUMMARIES.some(s => s.authorId === u.id && s.approved);
    }
    return (u.uploads || 0) > 0;
  })();
  ['si-earnings','si-wallet'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = hasUploads ? '' : 'none';
  });
  // Restore search mode button
  const smBtn = document.getElementById('searchModeBtn');
  if (smBtn) smBtn.style.display = '';
  const isAdmin = u.role === 'admin';
  // Show/hide admin-only items
  document.getElementById('si-admin')?.style && (document.getElementById('si-admin').style.display = isAdmin ? '' : 'none');
  document.getElementById('si-admin-sec')?.style && (document.getElementById('si-admin-sec').style.display = (isAdmin || u.role==='supervisor') ? '' : 'none');
  if (document.getElementById('si-supervisor')) document.getElementById('si-supervisor').style.display = u.role==='supervisor' ? '' : 'none';
  document.getElementById('bn-admin')?.style && (document.getElementById('bn-admin').style.display = isAdmin ? '' : 'none');
  // Show/hide upload for non-admins
  document.getElementById('si-upload')?.style && (document.getElementById('si-upload').style.display = isAdmin ? 'none' : '');
  document.getElementById('bn-upload')?.style && (document.getElementById('bn-upload').style.display = isAdmin ? 'none' : '');
}
function setSidebarActive(route){
  document.querySelectorAll('.si-item').forEach(el => el.classList.remove('active','active-a'));
  document.querySelectorAll('.bn-item').forEach(el => el.classList.remove('active','active-a'));
  const map = { home:'si-home', search:'si-search', profile:'si-profile', admin:'si-admin', saved:'si-saved', following:'si-following', notifications:'si-notif', trending:'si-trending', earnings:'si-earnings', wallet:'si-wallet' };
  if (map[route]) { const el = document.getElementById(map[route]); if (el) el.classList.add(route === 'admin' ? 'active-a' : 'active'); }
  const bnMap = { home:'bn-home', search:'bn-search', profile:'bn-profile', admin:'bn-admin', notifications:'bn-notif' };
  if (bnMap[route]) { const el = document.getElementById(bnMap[route]); if (el) el.classList.add(route === 'admin' ? 'active-a' : 'active'); }
}

// ── AUTH MODALS ────────────────────────────────────────────
function openSignIn(){
  closeAnyModal();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'siOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow" role="dialog" aria-modal="true" aria-label="Sign in"><div class="modal-drag"></div>
    <div class="modal-head"><div class="modal-title">👋 Sign In</div><button class="modal-close" onclick="document.getElementById('siOverlay').remove()" aria-label="Close"><i class="fas fa-times" aria-hidden="true"></i></button></div>
    <div class="modal-body">
      <div class="fgrid">
        <div class="field"><label for="si-email">Email</label><input class="input" id="si-email" type="email" placeholder="your@email.com" autofocus autocomplete="email"></div>
        <div class="field"><label for="si-pass">Password</label><input class="input" id="si-pass" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')submitSignIn()"></div>
      </div>
      <div style="text-align:right;margin-top:6px"><span style="font-size:12px;color:var(--amber);cursor:pointer;font-weight:700" onclick="document.getElementById('siOverlay').remove();openForgotPassword()">Forgot password?</span></div>
      <div id="si-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none" role="alert"></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="submitSignIn()"><i class="fas fa-right-to-bracket" aria-hidden="true"></i> Sign In</button>
      <div style="text-align:center;margin-top:14px;font-size:12px;color:var(--text2)">No account? <span style="color:var(--amber);cursor:pointer;font-weight:700" onclick="document.getElementById('siOverlay').remove();openSignUp()">Sign Up Free →</span></div>
      <div class="info-box" style="margin-top:14px"><b>Demo accounts (password for all: <code>pass123</code>):</b><br>admin@mol5sat.org / admin123 · ahmed@example.com / pass123 · mona@example.com / pass123</div>
    </div>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(() => document.getElementById('si-email')?.focus(), 100);
}

async function submitSignIn(){
  const email = document.getElementById('si-email')?.value?.trim();
  const pass = document.getElementById('si-pass')?.value;
  const errEl = document.getElementById('si-err');
  if (!email || !pass) { errEl.textContent = 'Please fill in all fields'; errEl.style.display = ''; return; }
  try {
    // doSignIn (overridden by api.js) handles auth, STATE update, modal close, navigate, toast
    await doSignIn(email, pass);
  } catch (e) { errEl.textContent = e.message; errEl.style.display = ''; }
}

function openForgotPassword(){
  closeAnyModal();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'fpOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow" role="dialog" aria-modal="true" aria-label="Forgot password"><div class="modal-drag"></div>
    <div class="modal-head"><div class="modal-title">🔑 Forgot Password</div><button class="modal-close" onclick="document.getElementById('fpOverlay').remove()" aria-label="Close"><i class="fas fa-times" aria-hidden="true"></i></button></div>
    <div class="modal-body" id="fpBody">
      <p style="font-size:13px;color:var(--text2);margin-bottom:18px;line-height:1.6">Enter the email address associated with your account and we'll send you a reset link.</p>
      <div class="fgrid"><div class="field"><label for="fp-email">Email Address</label><input class="input gf" id="fp-email" type="email" placeholder="your@email.com" autofocus autocomplete="email" onkeydown="if(event.key==='Enter')submitForgotPassword()"></div></div>
      <div id="fp-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none" role="alert"></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="submitForgotPassword()"><i class="fas fa-paper-plane" aria-hidden="true"></i> Send Reset Link</button>
      <div style="text-align:center;margin-top:14px;font-size:12px;color:var(--text2)">Remember your password? <span style="color:var(--amber);cursor:pointer;font-weight:700" onclick="document.getElementById('fpOverlay').remove();openSignIn()">Sign In →</span></div>
    </div>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(() => document.getElementById('fp-email')?.focus(), 100);
}

async function submitForgotPassword(){
  const email = (document.getElementById('fp-email')?.value || '').trim();
  const errEl = document.getElementById('fp-err');
  if (!email) { errEl.textContent = 'Please enter your email'; errEl.style.display = ''; return; }
  const btn = document.querySelector('#fpOverlay .btn-primary');
  if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }
  try {
    await api('POST', '/auth/forgot-password', { email });
    const body = document.getElementById('fpBody');
    if (body) {
      body.innerHTML = `<div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:16px">📧</div>
        <div style="font-family:var(--fd);font-size:17px;font-weight:800;margin-bottom:8px;color:var(--gold)">Check your inbox!</div>
        <p style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:20px">If <b style="color:var(--text)">${esc(email)}</b> is registered, you'll receive a reset link within a few minutes. The link expires in 15 minutes.</p>
        <button class="btn btn-surf btn-block" onclick="document.getElementById('fpOverlay').remove();openSignIn()"><i class="fas fa-arrow-left"></i> Back to Sign In</button>
      </div>`;
    }
  } catch (e) {
    errEl.textContent = e.message || 'Something went wrong. Please try again.';
    errEl.style.display = '';
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
}

function openResetPassword(token){
  closeAnyModal();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'rpOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow" role="dialog" aria-modal="true" aria-label="Reset password"><div class="modal-drag"></div>
    <div class="modal-head"><div class="modal-title">🔑 Choose a New Password</div><button class="modal-close" onclick="document.getElementById('rpOverlay').remove()" aria-label="Close"><i class="fas fa-times" aria-hidden="true"></i></button></div>
    <div class="modal-body" id="rpBody">
      <input type="hidden" id="rp-token" value="${esc(token || '')}">
      <div class="fgrid"><div class="field"><label for="rp-pass">New Password</label><input class="input gf" id="rp-pass" type="password" placeholder="At least 6 characters" autofocus autocomplete="new-password" onkeydown="if(event.key==='Enter')submitResetPassword()"></div></div>
      <div id="rp-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none" role="alert"></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="submitResetPassword()"><i class="fas fa-key" aria-hidden="true"></i> Update Password</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  setTimeout(() => document.getElementById('rp-pass')?.focus(), 100);
}

async function submitResetPassword(){
  const token = document.getElementById('rp-token')?.value || '';
  const password = document.getElementById('rp-pass')?.value || '';
  const errEl = document.getElementById('rp-err');
  if (!password || password.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; errEl.style.display = ''; return; }
  const btn = document.querySelector('#rpOverlay .btn-primary');
  if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }
  try {
    await api('POST', '/auth/reset-password', { token, new_password: password });
    const body = document.getElementById('rpBody');
    if (body) {
      body.innerHTML = `<div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <div style="font-family:var(--fd);font-size:17px;font-weight:800;margin-bottom:8px;color:var(--gold)">Password updated!</div>
        <p style="font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:20px">You can now sign in with your new password.</p>
        <button class="btn btn-primary btn-block" onclick="document.getElementById('rpOverlay').remove();openSignIn()"><i class="fas fa-right-to-bracket"></i> Sign In</button>
      </div>`;
    }
  } catch (e) {
    errEl.textContent = e.message || 'Reset link is invalid or has expired. Please request a new one.';
    errEl.style.display = '';
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
}

function openSignUp(){
  closeAnyModal();
  const dc = 'Egypt'; const cData = COUNTRIES[dc] || {};
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'suOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--wide" role="dialog" aria-modal="true" aria-label="Create account"><div class="modal-drag"></div>
    <div class="modal-head"><div class="modal-title">✨ Create Account</div><button class="modal-close" onclick="document.getElementById('suOverlay').remove()" aria-label="Close"><i class="fas fa-times" aria-hidden="true"></i></button></div>
    <div class="modal-body">
      <div class="fgrid">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px">
          <div class="profile-photo-wrap" onclick="document.getElementById('su-photo-input').click()" title="Upload profile photo (optional)">
            <div class="profile-photo-av" id="su-photo-preview" style="width:64px;height:64px;font-size:22px">?</div>
            <div class="profile-photo-edit"><i class="fas fa-camera" style="font-size:10px"></i></div>
          </div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;margin-bottom:2px">Profile Photo <span style="color:var(--text3);font-weight:400">(optional)</span></div>
            <div style="font-size:11px;color:var(--text3)">JPG, PNG or WebP — max 2MB<br>You can always change this later in Settings</div>
          </div>
          <input type="file" id="su-photo-input" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="suPreviewPhoto(this)">
        </div>
        <div class="fgrid fgrid2">
          <div class="field"><label for="su-name">Full Name *</label><input class="input gf" id="su-name" placeholder="Your display name" autofocus autocomplete="name"></div>
          <div class="field"><label for="su-username">Username * <span style="font-weight:400;color:var(--text2);font-size:11px">(unique, like Reddit)</span></label>
            <div style="position:relative">
              <input class="input" id="su-username" placeholder="e.g. ahmed_rocks" autocomplete="username" oninput="checkUsernameAvail(this.value)" style="padding-left:26px">
              <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text2);font-size:13px">@</span>
            </div>
            <div id="su-uname-msg" style="font-size:11px;margin-top:3px;height:14px"></div>
          </div>
        </div>
        <div class="field"><label for="su-email">Email *</label><input class="input" id="su-email" type="email" placeholder="your@email.com" autocomplete="email"></div>
        <div class="field"><label for="su-pass">Password *</label><input class="input" id="su-pass" type="password" placeholder="Min 6 characters" autocomplete="new-password"></div>
        <div class="field"><label>I am a…</label>
          <div class="radio-cards">
            <div class="radio-card sel" id="su-rc-student" onclick="suSetType('student')"><div class="rc-icon">🎒</div><div class="rc-title">Student</div><div class="rc-sub">K-12 / secondary school</div></div>
            <div class="radio-card" id="su-rc-colleague" onclick="suSetType('colleague')"><div class="rc-icon">🎓</div><div class="rc-title">Colleague</div><div class="rc-sub">University / higher education</div></div>
          </div>
        </div>
        <div class="field"><label for="su-country">Country *</label><select class="select" id="su-country" onchange="suCountryChange()">${ALL_COUNTRIES.map(c=>`<option value="${c}" ${c===dc?'selected':''}>${c}</option>`).join('')}</select></div>
        <div id="su-student-sec">
          <div class="fgrid fgrid2">
            <div class="field"><label for="su-school">School Type</label><select class="select" id="su-school">${(cData.schoolTypes||['General']).map(t=>`<option>${t}</option>`).join('')}</select></div>
            <div class="field"><label for="su-grade">Grade</label><select class="select" id="su-grade">${(cData.grades||['General']).map(g=>`<option>${g}</option>`).join('')}</select></div>
          </div>
        </div>
        <div id="su-colleague-sec" style="display:none">
          <div class="fgrid fgrid2">
            <div class="field"><label for="su-spec">Specialization</label><select class="select" id="su-spec">${getCollegeCategoriesForCountry(dc).map(c=>`<option>${c}</option>`).join('')}</select></div>
            <div class="field"><label for="su-major">Major</label><input class="input" id="su-major" placeholder="e.g. Software Engineering"></div>
          </div>
        </div>
        <div class="field"><label>Interests (optional)</label>
          <div class="chip-grid">${SUBJECTS.map(s=>`<div class="chip" onclick="this.classList.toggle('sel')" data-subj="${s}">${s}</div>`).join('')}</div>
        </div>
      </div>
      <div id="su-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none" role="alert"></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:20px" onclick="submitSignUp()"><i class="fas fa-user-plus" aria-hidden="true"></i> Create Account</button>
      <div style="text-align:center;margin-top:14px;font-size:12px;color:var(--text2)">Already have an account? <span style="color:var(--amber);cursor:pointer;font-weight:700" onclick="document.getElementById('suOverlay').remove();openSignIn()">Sign In →</span></div>
    </div>
  </div>`;
  document.body.appendChild(ov);
}
// ── USERNAME AVAILABILITY CHECK ───────────────────────────
let _unameTimer = null;
function checkUsernameAvail(val) {
  const el = document.getElementById('su-uname-msg');
  if (!el) return;
  const v = val.trim().toLowerCase();
  if (!v) { el.textContent = ''; return; }
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(v)) {
    el.textContent = '⚠ 3–20 chars, start with a letter, letters/numbers/underscores only';
    el.style.color = 'var(--coral)'; return;
  }
  clearTimeout(_unameTimer);
  el.textContent = '…'; el.style.color = 'var(--text2)';
  _unameTimer = setTimeout(async () => {
    try {
      const r = await fetch(`/api/auth/check-username?username=${encodeURIComponent(v)}`);
      const d = await r.json();
      if (d.available) { el.textContent = '✓ Available'; el.style.color = 'var(--green,#22c55e)'; }
      else { el.textContent = d.reason || '✗ Already taken'; el.style.color = 'var(--coral)'; }
    } catch { el.textContent = ''; }
  }, 400);
}


function suSetType(t){
  document.getElementById('su-rc-student').className = 'radio-card ' + (t==='student'?'sel':'');
  document.getElementById('su-rc-colleague').className = 'radio-card ' + (t==='colleague'?'sel-a':'');
  document.getElementById('su-student-sec').style.display = t==='student'?'':'none';
  document.getElementById('su-colleague-sec').style.display = t==='colleague'?'':'none';
}
function suCountryChange(){
  const c = document.getElementById('su-country').value; const d = COUNTRIES[c]||{};
  const se = document.getElementById('su-school'); const ge = document.getElementById('su-grade'); const spe = document.getElementById('su-spec');
  if (se) se.innerHTML = (d.schoolTypes||['General']).map(t=>`<option>${t}</option>`).join('');
  if (ge) ge.innerHTML = (d.grades||['General']).map(g=>`<option>${g}</option>`).join('');
  if (spe) spe.innerHTML = getCollegeCategoriesForCountry(c).map(cat=>`<option>${cat}</option>`).join('');
}
function suPreviewPhoto(input) {
  const file = input.files[0]; if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('Photo must be under 2MB', 'error', 'fa-image'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('su-photo-preview');
    if (prev) prev.outerHTML = `<img id="su-photo-preview" src="${e.target.result}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--gold)">`;
    window._suPhotoDataUrl = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function submitSignUp(){
  const name     = document.getElementById('su-name')?.value?.trim();
  const username = document.getElementById('su-username')?.value?.trim().toLowerCase();
  const email    = document.getElementById('su-email')?.value?.trim();
  const password = document.getElementById('su-pass')?.value;
  const errEl    = document.getElementById('su-err');
  if (!name || !username || !email || !password) { errEl.textContent = 'Name, username, email and password are required'; errEl.style.display = ''; return; }
  if (!/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(username)) { errEl.textContent = 'Invalid username format'; errEl.style.display = ''; return; }
  const ut = document.getElementById('su-rc-colleague')?.classList.contains('sel-a') ? 'colleague' : 'student';
  const interests = [...document.querySelectorAll('#suOverlay .chip.sel')].map(el => el.dataset.subj).filter(Boolean);
  const payload = {
    name, username, email, password,
    country: document.getElementById('su-country')?.value || 'Egypt',
    user_type: ut,
    school: ut==='student' ? document.getElementById('su-school')?.value : '',
    grade: ut==='student' ? document.getElementById('su-grade')?.value : '',
    specialization: ut==='colleague' ? document.getElementById('su-spec')?.value : '',
    major: ut==='colleague' ? document.getElementById('su-major')?.value : '',
    interests,
    profile_photo: window._suPhotoDataUrl || '',
  };
  try {
    await doSignUp(payload);
    logActivity('register', 'user', STATE.currentUser?.id || '', `New account: ${name} (${ut})`);
    window._suPhotoDataUrl = null;
    document.getElementById('suOverlay')?.remove();
    updateNavForUser();
    await loadNotifications();
    navigate('home');
    toast(`Welcome to Mol5sat, ${name}! 🎉`, 'success', 'fa-champagne-glasses');
  } catch (e) { errEl.textContent = e.message; errEl.style.display = ''; }
}

// ── UPLOAD MODAL ───────────────────────────────────────────
var US = window.US = { step:1, audience:'students', isPaid:false, selectedCompanies:[], memberRequired:false, companies:[] };

async function openUploadModal(){
  if (!STATE.loggedIn) { openSignIn(); return; }
  try { US.companies = await api('GET', '/companies') || []; } catch { US.companies = []; }
  US = { step:1, audience:'students', isPaid:false, selectedCompanies:[], memberRequired:false, bannerDataUrl:null, title:'', subject:'', lang:'ar', school:'', grade:'', spec:'', content:'', translatedFrom:'', fileName:'', companies:[] };
  showUploadModal();
}
function showUploadModal(){
  document.getElementById('uploadOverlay')?.remove();
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'uploadOverlay';
  ov.innerHTML = `<div class="modal modal--wide" role="dialog" aria-modal="true" aria-label="Upload summary"><div class="modal-drag"></div>
    <div class="modal-head"><div class="modal-title">📤 Upload Summary</div><button class="modal-close" onclick="document.getElementById('uploadOverlay').remove()" aria-label="Close"><i class="fas fa-times" aria-hidden="true"></i></button></div>
    <div class="modal-body" id="uploadBody">${renderUS()}</div></div>`;
  document.body.appendChild(ov);
}
function renderUS(){
  const { step, audience, isPaid, selectedCompanies, memberRequired, companies } = US;
  const total = isPaid ? 4 : 3;
  const bar = Array.from({length:total}, (_,i) => `<div class="step-seg ${i<step?'on':''}" aria-hidden="true"></div>`).join('');
  const u = STATE.currentUser; const cData = COUNTRIES[u.country]||{};
  if (step===1) return `<div class="step-bar" role="progressbar" aria-valuenow="${step}" aria-valuemax="${total}">${bar}</div>
    <div style="font-family:var(--fd);font-size:17px;font-weight:800;margin-bottom:18px">Step 1 — Basic Info</div>
    <div class="fgrid">
      <div class="field"><label for="up-title">Title *</label><input class="input gf" id="up-title" placeholder="e.g. ملخص الكيمياء العضوية — ثالث ثانوي" value="${esc(US.title||'')}"></div>
      <div class="field">
        <label>Banner Image <span style="color:var(--coral)">*</span> <span style="font-weight:400;color:var(--text3);font-size:11px">(shown on the card — required)</span></label>
        <div id="up-banner-wrap" style="border:2px dashed ${US.bannerDataUrl?'var(--gold)':'var(--bord)'};border-radius:var(--radius);padding:18px;text-align:center;cursor:pointer;transition:.18s;position:relative"
          onmouseenter="this.style.borderColor='var(--amber)'" onmouseleave="this.style.borderColor='${US.bannerDataUrl?'var(--gold)':'var(--bord)'}'"
          onclick="document.getElementById('up-banner').click()">
          <div id="up-banner-preview" style="width:100%;height:80px;border-radius:8px;overflow:hidden;margin-bottom:10px;display:flex;align-items:center;justify-content:center;font-size:28px;${US.bannerDataUrl?'':'background:linear-gradient(135deg,var(--surf3),var(--surf4))'}">
            ${US.bannerDataUrl ? `<img src="${US.bannerDataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">` : '🖼️'}
          </div>
          <div style="font-size:12px;font-weight:700" id="up-banner-label">${US.bannerDataUrl ? '✅ Banner uploaded — click to change' : 'Click to upload banner (JPG, PNG, WebP — max 2MB)'}</div>
          <input type="file" id="up-banner" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="previewBanner(this)">
        </div>
      </div>
      <div class="fgrid fgrid2">
        <div class="field"><label for="up-subject">Subject *</label><select class="select" id="up-subject"><option value="">Select…</option>${SUBJECTS.map(s=>`<option ${s===(US.subject||'')?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label for="up-lang">Language *</label><select class="select" id="up-lang"><option value="ar" ${(US.lang||'ar')==='ar'?'selected':''}>العربية</option><option value="en" ${(US.lang||'')==='en'?'selected':''}>English</option><option value="fr" ${(US.lang||'')==='fr'?'selected':''}>Français</option></select></div>
      </div>
      <div class="field">
        <label for="up-translated-from">Translation of another summary? <span style="font-size:11px;color:var(--text3);font-weight:400">(optional)</span></label>
        <input class="input" id="up-translated-from" placeholder="Paste the original summary ID or leave blank…" value="${esc(US.translatedFrom||'')}">
      </div>
      <div class="field"><label>This summary is for…</label>
        <div class="radio-cards">
          <div class="radio-card ${audience==='students'?'sel':''}" onclick="US.audience='students';document.getElementById('uploadBody').innerHTML=renderUS()"><div class="rc-icon">🎒</div><div class="rc-title">Students</div><div class="rc-sub">Linked to school grade</div></div>
          <div class="radio-card ${audience==='colleagues'?'sel-a':''}" onclick="US.audience='colleagues';document.getElementById('uploadBody').innerHTML=renderUS()"><div class="rc-icon">🎓</div><div class="rc-title">Colleagues</div><div class="rc-sub">University level</div></div>
        </div>
      </div>
      ${audience==='students' ? `<div class="fgrid fgrid2">
        <div class="field"><label for="up-school">School Type</label><select class="select" id="up-school">${(cData.schoolTypes||['General']).map(t=>`<option ${t===(US.school||u.school||'')?'selected':''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label for="up-grade">Grade Level</label><select class="select" id="up-grade">${(cData.grades||['General']).map(g=>`<option ${g===(US.grade||u.grade||'')?'selected':''}>${g}</option>`).join('')}</select></div>
      </div>` : `<div class="field"><label for="up-spec">Specialization</label><select class="select" id="up-spec">${getCollegeCategoriesForCountry(u.country).map(c=>`<option ${c===(US.spec||'')?'selected':''}>${c}</option>`).join('')}</select></div>`}
    </div>
    <div class="step-actions"><button class="btn btn-primary" onclick="upNext()">Next <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div>`;
  if (step===2) return `<div class="step-bar" role="progressbar" aria-valuenow="${step}" aria-valuemax="${total}">${bar}</div>
    <div style="font-family:var(--fd);font-size:17px;font-weight:800;margin-bottom:18px">Step 2 — Content</div>
    <div class="fgrid">
      <div style="border:2px dashed var(--bord);border-radius:var(--radius);padding:36px;text-align:center;cursor:pointer;transition:.18s" onmouseenter="this.style.borderColor='var(--amber)'" onmouseleave="this.style.borderColor='var(--bord)'" onclick="document.getElementById('up-file').click()">
        <div style="font-size:34px;margin-bottom:12px">📎</div>
        <div style="font-weight:800;margin-bottom:4px">Click to upload PDF / DOCX</div>
        <div style="font-size:12px;color:var(--text2)" id="up-fname">${US.fileName||'Max 50MB'}</div>
        <input type="file" id="up-file" accept=".pdf,.docx,.doc" style="display:none" aria-label="Upload file" onchange="US.fileName=this.files[0]?.name||'';document.getElementById('up-fname').textContent=US.fileName||'Max 50MB'">
      </div>
      <div style="text-align:center;font-size:12px;color:var(--text3)">— or paste text below —</div>
      <div class="field"><label for="up-content">Summary Content</label><textarea class="textarea" style="min-height:160px" id="up-content" placeholder="Paste your summary here…">${esc(US.content||'')}</textarea></div>
    </div>
    <div class="step-actions">
      <button class="btn btn-surf" onclick="US.step=1;document.getElementById('uploadBody').innerHTML=renderUS()"><i class="fas fa-arrow-left" aria-hidden="true"></i> Back</button>
      <button class="btn btn-primary" onclick="upNext()">Next <i class="fas fa-arrow-right" aria-hidden="true"></i></button>
    </div>`;
  if (step===3) return `<div class="step-bar" role="progressbar" aria-valuenow="${step}" aria-valuemax="${total}">${bar}</div>
    <div style="font-family:var(--fd);font-size:17px;font-weight:800;margin-bottom:18px">Step 3 — Monetisation</div>
    <div class="fgrid">
      <div class="radio-cards">
        <div class="radio-card ${!isPaid?'sel':''}" onclick="US.isPaid=false;document.getElementById('uploadBody').innerHTML=renderUS()"><div class="rc-icon">🆓</div><div class="rc-title">Free</div><div class="rc-sub">No ads. Full access.</div></div>
        <div class="radio-card ${isPaid?'sel-a':''}" onclick="US.isPaid=true;document.getElementById('uploadBody').innerHTML=renderUS()"><div class="rc-icon">💰</div><div class="rc-title">With Ads</div><div class="rc-sub">Earn revenue from partners.</div></div>
      </div>
      ${isPaid ? `<div class="info-box"><b>Min 500 likes or 2,000 views</b> before revenue starts. Your share grows with audience.</div>
      <div class="fgrid fgrid2">
        <div class="field"><label for="up-adEvery">Show ad every N pages</label><select class="select" id="up-adEvery"><option value="4">Every 4 pages</option><option value="5">Every 5 pages</option><option value="6" selected>Every 6 pages</option><option value="8">Every 8 pages</option></select></div>
        <div class="field"><label for="up-adDuration">Ad display duration</label><select class="select" id="up-adDuration"><option value="5">5 seconds</option><option value="10" selected>10 seconds</option><option value="15">15 seconds</option><option value="20">20 seconds</option><option value="30">30 seconds</option></select></div>
      </div>` : ''}
      <div class="info-box" style="margin-top:8px;font-size:12px">
        <i class="fas fa-crown" style="color:var(--amber)"></i>
        <b>Membership perk:</b> Subscribers who pay for your membership tier see fewer or no ads in your summaries — you set the level in <span onclick="navTo('membership');document.getElementById('uploadOverlay')?.remove()" style="color:var(--amber);cursor:pointer;text-decoration:underline">Membership Settings</span>.
      </div>
    </div>
    <div class="step-actions">
      <button class="btn btn-surf" onclick="US.step=2;document.getElementById('uploadBody').innerHTML=renderUS()"><i class="fas fa-arrow-left" aria-hidden="true"></i> Back</button>
      <button class="btn btn-primary" onclick="upNext()">${isPaid?'Choose Advertisers':'Submit for Review'} <i class="fas fa-arrow-right" aria-hidden="true"></i></button>
    </div>`;
  if (step===4 && isPaid) return `<div class="step-bar" role="progressbar" aria-valuenow="${step}" aria-valuemax="${total}">${bar}</div>
    <div style="font-family:var(--fd);font-size:17px;font-weight:800;margin-bottom:14px">Step 4 — Choose Advertisers</div>
    <div style="margin-bottom:12px"><input class="admin-search" style="width:100%" placeholder="🔍 Search companies…" aria-label="Search companies" oninput="filterUpCompanies(this.value)"></div>
    <div class="company-grid" id="upCompGrid">${upCompanyGrid(companies, '')}</div>
    <div style="margin-top:10px;font-size:12px;color:var(--text2)">Selected: <b style="color:var(--amber)">${selectedCompanies.length}</b> / 3</div>
    <div class="step-actions">
      <button class="btn btn-surf" onclick="US.step=3;document.getElementById('uploadBody').innerHTML=renderUS()"><i class="fas fa-arrow-left" aria-hidden="true"></i> Back</button>
      <button class="btn btn-primary" onclick="submitUpload()"><i class="fas fa-paper-plane" aria-hidden="true"></i> Submit for Review</button>
    </div>`;
}
function upCompanyGrid(companies, filter){
  const f = filter.toLowerCase();
  const filtered = companies.filter(c => !f || c.name.toLowerCase().includes(f) || c.category.toLowerCase().includes(f));
  if (!filtered.length) return `<div style="padding:20px;text-align:center;color:var(--text2)">No companies found</div>`;
  return filtered.map(c => `<div class="company-card ${US.selectedCompanies.includes(c.id)?'selected':''}" onclick="upToggleCompany('${c.id}')" role="checkbox" aria-checked="${US.selectedCompanies.includes(c.id)}">
    <div class="cc-logo">${c.logo||'🏢'}</div>
    <div class="cc-info"><div class="cc-name">${c.name}</div><div class="cc-cat">${c.category}</div><div class="cc-cpm">$${c.cpm} CPM</div></div>
    ${US.selectedCompanies.includes(c.id)?'<i class="fas fa-circle-check cc-check" aria-hidden="true"></i>':''}
  </div>`).join('');
}
function filterUpCompanies(v){ const el = document.getElementById('upCompGrid'); if (el) el.innerHTML = upCompanyGrid(US.companies, v); }
function upToggleCompany(id){
  const i = US.selectedCompanies.indexOf(id);
  if (i >= 0) US.selectedCompanies.splice(i, 1);
  else { if (US.selectedCompanies.length >= 3) { toast('Max 3 advertisers','error','fa-exclamation'); return; } US.selectedCompanies.push(id); }
  document.getElementById('uploadBody').innerHTML = renderUS();
}
function previewBanner(input) {
  const file = input.files[0]; if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('Image too large — max 8MB', 'error', 'fa-image'); input.value = ''; return; }
  // Open crop editor with 3:1 ratio for summary banners
  openImageCropper(file, 3/1, (dataUrl) => {
    const preview = document.getElementById('up-banner-preview');
    const label   = document.getElementById('up-banner-label');
    const wrap    = document.getElementById('up-banner-wrap');
    if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`;
    if (label)   label.textContent = '✅ Banner cropped and ready';
    if (wrap)    wrap.style.borderColor = 'var(--gold)';
    US.bannerDataUrl = dataUrl;
  });
}

function upNext(){
  const max = US.isPaid ? 4 : 3;
  if (US.step === 1) {
    // Capture all Step 1 field values into US before re-render destroys them
    US.title   = document.getElementById('up-title')?.value?.trim() || US.title || '';
    US.subject = document.getElementById('up-subject')?.value || US.subject || '';
    US.lang    = document.getElementById('up-lang')?.value || US.lang || 'ar';
    US.translatedFrom = document.getElementById('up-translated-from')?.value?.trim() || '';
    US.school  = document.getElementById('up-school')?.value || US.school || '';
    US.grade   = document.getElementById('up-grade')?.value || US.grade || '';
    US.spec    = document.getElementById('up-spec')?.value || US.spec || '';
    // Validate required banner
    if (!US.bannerDataUrl) {
      toast('Please upload a banner image — it\'s required', 'error', 'fa-image');
      const wrap = document.getElementById('up-banner-wrap');
      if (wrap) wrap.style.borderColor = 'var(--coral)';
      return;
    }
    if (!US.title) { toast('Title is required', 'error', 'fa-exclamation'); return; }
    if (!US.subject) { toast('Subject is required', 'error', 'fa-exclamation'); return; }
  }
  if (US.step === 2) {
    // Capture Step 2 content field
    US.content = document.getElementById('up-content')?.value || US.content || '';
  }
  if (US.step < max) { US.step++; document.getElementById('uploadBody').innerHTML = renderUS(); }
  else submitUpload();
}
async function submitUpload(){
  const u = STATE.currentUser;
  // Use values saved in US object (captured in upNext) rather than DOM (which may have been re-rendered)
  const title   = US.title   || document.getElementById('up-title')?.value?.trim();
  const subject = US.subject || document.getElementById('up-subject')?.value;
  const lang    = US.lang    || document.getElementById('up-lang')?.value || 'ar';
  const content = US.content || document.getElementById('up-content')?.value || '';
  if (!title || !subject) { toast('Title and subject are required', 'error', 'fa-exclamation'); return; }
  const formData = new FormData();
  formData.append('title', title);
  formData.append('subject', subject);
  formData.append('lang', lang);
  formData.append('audience', US.audience);
  formData.append('country', u.country);
  if (US.translatedFrom) formData.append('translated_from', US.translatedFrom);
  if (US.audience === 'students') {
    formData.append('school', US.school || u.school || '');
    formData.append('grade', US.grade  || u.grade  || '');
  } else {
    formData.append('specialization', US.spec || '');
  }
  formData.append('content', content);
  if (US.bannerDataUrl) formData.append('banner_data_url', US.bannerDataUrl);
  formData.append('is_paid', US.isPaid ? '1' : '0');
  formData.append('ad_every', document.getElementById('up-adEvery')?.value || '6');
  formData.append('ad_duration_seconds', document.getElementById('up-adDuration')?.value || '10');
  formData.append('membership_required', '0');
  formData.append('companies', JSON.stringify(US.selectedCompanies));
  const file = document.getElementById('up-file')?.files[0];
  if (file) formData.append('file', file);
  try {
    await api('POST', '/summaries', formData, true);
    document.getElementById('uploadOverlay')?.remove();
    toast('Submitted for review! ✅ You\'ll be notified when approved.', 'success', 'fa-circle-check');
  } catch (e) { toast(e.message, 'error', 'fa-times'); }
}
function closeAnyModal(){
  ['siOverlay','suOverlay','uploadOverlay','reportOverlay','siteReportOverlay',
   'fpOverlay','rpOverlay','cropOverlay',
   'addMethodOverlay','banOverlay','plagActionOverlay','promoGateOverlay','promoOverlay','withdrawOverlay'
  ].forEach(id => document.getElementById(id)?.remove());
}

// ── REPORT MODAL ──────────────────────────────────────────────
var REPORT_REASONS = window.REPORT_REASONS = [
  { value: 'stolen_content',   label: '🔏 Stolen / copied content',           desc: 'This summary was taken from another creator without credit' },
  { value: 'wrong_curriculum', label: '📚 Doesn\'t match curriculum',          desc: 'Content doesn\'t match the stated grade or curriculum' },
  { value: 'wrong_subject',    label: '🔬 Wrong subject category',             desc: 'Filed under the wrong subject or topic' },
  { value: 'not_educational',  label: '🚫 Not educational content',            desc: 'This isn\'t an academic summary at all' },
  { value: 'spam',             label: '📧 Spam or repetitive',                 desc: 'Copy-pasted or posted multiple times' },
  { value: 'inappropriate',    label: '⚠️ Inappropriate content',              desc: 'Contains offensive, adult, or harmful content' },
  { value: 'low_quality',      label: '📉 Very low quality',                   desc: 'So poorly written it\'s not useful to anyone' },
  { value: 'wrong_language',   label: '🌐 Listed in wrong language',           desc: 'Language tag doesn\'t match the actual content' },
  { value: 'misleading_title', label: '📝 Misleading title',                   desc: 'Title promises content that isn\'t there' },
  { value: 'other',            label: '❓ Other',                              desc: 'Explain in the description below' },
];

function openReportModal(summaryId, summaryTitle) {
  if (!STATE.loggedIn) { openSignIn(); return; }
  document.getElementById('reportOverlay')?.remove();
  let selectedReason = null;
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'reportOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.innerHTML = `<div class="modal modal--narrow" role="dialog" aria-modal="true" aria-label="Report summary">
    <div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title"><i class="fas fa-flag" style="color:var(--coral)"></i> Report Summary</div>
      <button class="modal-close" onclick="document.getElementById('reportOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="color:var(--text2);font-size:13px;margin-bottom:16px;line-height:1.6">
        Reporting: <b style="color:var(--text)">${summaryTitle}</b><br>
        <span style="font-size:12px">Reports are reviewed by our admin team. Abuse of the report system may result in account suspension.</span>
      </div>
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px">Why are you reporting this?</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px" id="reportReasons">
        ${REPORT_REASONS.map(r => `<div class="report-reason-opt" data-val="${r.value}" onclick="selectReportReason('${r.value}',this)"
          style="display:flex;align-items:flex-start;gap:12px;padding:11px 14px;border:1.5px solid var(--bord);border-radius:var(--radius-sm);cursor:pointer;transition:.15s;background:var(--bg2)">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;line-height:1.3">${r.label}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">${r.desc}</div>
          </div>
          <div style="width:18px;height:18px;border-radius:50%;border:2px solid var(--bord);flex-shrink:0;margin-top:2px;transition:.15s" class="rr-dot"></div>
        </div>`).join('')}
      </div>
      <div class="field">
        <label>Additional description <span style="font-weight:400;color:var(--text3)">(optional)</span></label>
        <textarea class="textarea" id="report-desc" placeholder="Give more details to help our team understand the issue…" style="min-height:80px"></textarea>
      </div>
      <div id="report-err" style="color:var(--coral);font-size:12px;margin-top:6px;display:none"></div>
      <button class="btn btn-danger btn-block btn-lg" style="margin-top:16px" onclick="submitReport('${summaryId}')">
        <i class="fas fa-flag"></i> Submit Report
      </button>
    </div>
  </div>`;
  document.body.appendChild(ov);
}

function selectReportReason(val, el) {
  // Deselect all
  document.querySelectorAll('.report-reason-opt').forEach(opt => {
    opt.style.borderColor = 'var(--bord)';
    opt.style.background = 'var(--bg2)';
    opt.querySelector('.rr-dot').style.borderColor = 'var(--bord)';
    opt.querySelector('.rr-dot').style.background = 'transparent';
  });
  // Select clicked
  el.style.borderColor = 'var(--coral)';
  el.style.background = 'rgba(255,107,107,.06)';
  el.querySelector('.rr-dot').style.borderColor = 'var(--coral)';
  el.querySelector('.rr-dot').style.background = 'var(--coral)';
  // Store in dataset
  document.getElementById('reportOverlay').dataset.reason = val;
}

async function submitReport(summaryId) {
  const reason = document.getElementById('reportOverlay')?.dataset.reason;
  const description = document.getElementById('report-desc')?.value?.trim();
  const errEl = document.getElementById('report-err');
  if (!reason) { errEl.textContent = 'Please select a reason'; errEl.style.display = ''; return; }
  try {
    await api('POST', '/reports', { summary_id: summaryId, reason, description });
    document.getElementById('reportOverlay')?.remove();
    toast('Report submitted. Our team will review it. 🙏', 'success', 'fa-flag');
  } catch (e) {
    if (errEl) { errEl.textContent = e.message; errEl.style.display = ''; }
    else toast(e.message, 'error');
  }
}


// ═══════════════════════════════════════════════════════
//  SITE ISSUE REPORT SYSTEM
// ═══════════════════════════════════════════════════════
var SITE_REPORT_REASONS = window.SITE_REPORT_REASONS = [
  { value: 'bug',           label: '🐛 Bug / Malfunction',          desc: 'Something on the site is broken or not working as expected' },
  { value: 'security',      label: '🔒 Security Vulnerability',      desc: 'Possible data breach, unauthorized access, or unsafe behavior' },
  { value: 'performance',   label: '⚡ Performance Issue',           desc: 'Site is very slow, pages hang, or features time out' },
  { value: 'ui_broken',     label: '🖥️ Broken UI / Layout',          desc: 'Buttons, pages, or elements display incorrectly or are unusable' },
  { value: 'login',         label: '🔑 Login / Auth Problem',        desc: "Can't sign in, sign up, or reset password" },
  { value: 'payment',       label: '💳 Payment / Wallet Issue',      desc: 'Payment failed, wrong amount, wallet not updating' },
  { value: 'content',       label: '📄 Missing or Wrong Content',    desc: 'Content that should appear is missing or displaying incorrectly' },
  { value: 'notification',  label: '🔔 Notification Problem',        desc: 'Notifications not sending, duplicated, or wrong' },
  { value: 'other',         label: '❓ Other',                       desc: 'Describe the issue in detail below (required)' },
];

function openSiteReportModal() {
  document.getElementById('siteReportOverlay')?.remove();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.id = 'siteReportOverlay';
  ov.onclick = e => { if (e.target === ov) ov.remove(); };

  ov.innerHTML = `<div class="modal modal--narrow" role="dialog" aria-modal="true" aria-label="Report site issue">
    <div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title"><i class="fas fa-triangle-exclamation" style="color:var(--coral)"></i> Report Site Issue</div>
      <button class="modal-close" onclick="document.getElementById('siteReportOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div style="color:var(--text2);font-size:13px;margin-bottom:16px;line-height:1.6">
        Help us improve Mol5sat. Reports are reviewed by our team and are completely anonymous to other users.
      </div>
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);margin-bottom:10px">What kind of issue are you reporting?</div>
      <div id="siteReportReasons">
        ${SITE_REPORT_REASONS.map(r => `<div class="site-report-opt" data-val="${r.value}" onclick="selectSiteReportReason('${r.value}',this)">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;line-height:1.3">${r.label}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">${r.desc}</div>
          </div>
          <div class="sro-dot"></div>
        </div>`).join('')}
      </div>
      <div class="field" id="siteReportDescField" style="margin-top:14px">
        <label id="siteReportDescLabel">Additional details <span style="font-weight:400;color:var(--text3)" id="siteReportDescOptional">(optional)</span></label>
        <textarea class="textarea" id="site-report-desc" placeholder="Describe the issue in as much detail as possible…" style="min-height:90px" maxlength="2000"></textarea>
      </div>
      <div id="site-report-err" style="color:var(--coral);font-size:12px;margin-top:6px;display:none"></div>
      <button class="btn btn-danger btn-block btn-lg" style="margin-top:16px" onclick="submitSiteReport()">
        <i class="fas fa-paper-plane"></i> Submit Report
      </button>
    </div>
  </div>`;

  document.body.appendChild(ov);
}

function selectSiteReportReason(val, el) {
  // Deselect all
  document.querySelectorAll('.site-report-opt').forEach(opt => {
    opt.classList.remove('selected');
  });
  // Select clicked
  el.classList.add('selected');
  document.getElementById('siteReportOverlay').dataset.reason = val;

  // Toggle required state for "other"
  const isOther = val === 'other';
  const optionalSpan = document.getElementById('siteReportDescOptional');
  const descField = document.getElementById('site-report-desc');
  if (isOther) {
    optionalSpan.textContent = '(required)';
    optionalSpan.style.color = 'var(--coral)';
    optionalSpan.style.fontWeight = '700';
    descField.placeholder = 'Please describe the issue in detail…';
  } else {
    optionalSpan.textContent = '(optional)';
    optionalSpan.style.color = 'var(--text3)';
    optionalSpan.style.fontWeight = '400';
    descField.placeholder = 'Describe the issue in as much detail as possible…';
  }
}

async function submitSiteReport() {
  const ov = document.getElementById('siteReportOverlay');
  const reason = ov?.dataset.reason;
  const description = document.getElementById('site-report-desc')?.value?.trim();
  const errEl = document.getElementById('site-report-err');

  if (errEl) errEl.style.display = 'none';

  if (!reason) {
    if (errEl) { errEl.textContent = 'Please select a reason for your report.'; errEl.style.display = ''; }
    return;
  }
  if (reason === 'other' && !description) {
    if (errEl) { errEl.textContent = 'Please describe the issue when selecting "Other".'; errEl.style.display = ''; }
    document.getElementById('site-report-desc')?.focus();
    return;
  }

  try {
    await api('POST', '/site-reports', {
      reason,
      description: description || '',
      page: window.location.hash || '#home',
      user_agent: navigator.userAgent,
    });
    ov?.remove();
    toast('Thank you! Your report has been submitted. 🙏', 'success', 'fa-check');
  } catch (e) {
    if (errEl) { errEl.textContent = e.message || 'Failed to submit report. Please try again.'; errEl.style.display = ''; }
    else toast(e.message || 'Failed to submit', 'error');
  }
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
// The actual boot sequence (session restore, route resolution, initial
// render) lives in router.js's DOMContentLoaded handler — that is the
// single source of truth for what route a guest/logged-in user lands on.
// This used to also run its own boot logic on window 'load', which fired
// a second time after DOMContentLoaded, re-ran initAuth()/updateNavForUser(),
// and then unconditionally called navigate('home') — silently overriding
// whatever route router.js had just decided (e.g. sending guests to /home
// even when they should see the landing page) and racing its render() call.
// Only the cosmetic, render-independent bits stay here.
window.addEventListener('load', () => {
  const mobBtn = document.getElementById('mobSearchBtn');
  const checkMob = () => { if (mobBtn) mobBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none'; };
  checkMob(); window.addEventListener('resize', checkMob);

  // Set the correct initial icon based on the actual active theme
  const theme = document.documentElement.dataset.theme || 'light';
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
});
