// ── Shared helpers (from index.html inline script)

// ── Small helpers that live only in index.html ─────────────
function setFeedSort(k){ STATE.feedSort=k; render(); }
function setSearchSort(k){ STATE.searchSort=k; render(); }

// Full sort options shown in one bar, grouped by category
var _SORT_OPTS = window._SORT_OPTS = [
  // Relevance
  {k:'recommended', i:'fa-wand-magic-sparkles', l:'Recommended',   group:'relevance'},
  {k:'curriculum',  i:'fa-graduation-cap',       l:'My Curriculum', group:'relevance'},
  // Date — Newest and Oldest always together
  {k:'date',        i:'fa-calendar-day',          l:'Newest',        group:'date'},
  {k:'date-asc',    i:'fa-rotate-left',           l:'Oldest',        group:'date'},
  // Engagement
  {k:'likes',       i:'fa-heart',                 l:'Top Liked',     group:'engage'},
  {k:'views',       i:'fa-eye',                   l:'Most Viewed',   group:'engage'},
  // Alpha
  {k:'az',          i:'fa-arrow-down-a-z',        l:'A → Z',         group:'alpha'},
  {k:'za',          i:'fa-arrow-up-z-a',          l:'Z → A',         group:'alpha'},
  // Language
  {k:'lang-ar',     l:'🇸🇦 Arabic',                group:'lang'},
  {k:'lang-en',     l:'🇺🇸 English',               group:'lang'},
  {k:'lang-fr',     l:'🇫🇷 French',                group:'lang'},
  // Pages length
  {k:'pages-desc',  i:'fa-file-circle-plus',        l:'Most Pages',    group:'pages'},
  {k:'pages-asc',   i:'fa-file-circle-minus',        l:'Fewest Pages',  group:'pages'},
  // Advanced (only science context)
  {k:'advanced',    i:'fa-chart-line',             l:'Advanced',      group:'advanced'},
];

function sortBarHTML(currentSort, onChangeFn='setFeedSort', context='feed'){
  const u = STATE.currentUser;
  const showCurr    = u && u.role !== 'admin' && context !== 'science';
  const showAdv     = context === 'science' && u && u.role !== 'admin';
  const isAdvActive = currentSort && (currentSort === 'advanced' || currentSort.startsWith('advanced:'));

  // Build the grade dropdown for Advanced mode
  const advDropdownHTML = () => {
    if (!isAdvActive || !u) return '';
    const grades  = (COUNTRIES[u.country]?.grades || []);
    const userIdx = getGradeIndex(u.country, u.grade);
    // Only grades above the user, plus University
    const aheadGrades = grades.filter((g, i) => i > userIdx || g === 'University');
    if (!aheadGrades.length) return '<span style="font-size:11px;color:var(--text2);margin-left:4px">No higher grades found for your country</span>';
    const currentTarget = currentSort.includes(':') ? currentSort.split(':').slice(1).join(':') : 'all';
    const opts = [
      {val:'all',        lbl:'All grades ahead'},
      {val:'university', lbl:'🎓 University only'},
      ...aheadGrades.filter(g => g !== 'University').map(g => ({val:g, lbl:g})),
    ];
    return `<select class="select" style="height:30px;font-size:12px;padding:0 28px 0 10px;border-radius:8px;min-width:170px;margin-left:6px"
      onchange="${onChangeFn}('advanced:'+this.value)">
      ${opts.map(o => `<option value="${o.val}" ${currentTarget===o.val?'selected':''}>${o.lbl}</option>`).join('')}
    </select>`;
  };

  const chip = (o) => {
    const active = currentSort === o.k || (o.k === 'advanced' && isAdvActive);
    return `<span class="sort-chip ${active?'active':''}" onclick="${onChangeFn}('${o.k}')" title="${o.l}">
      ${o.i ? `<i class="fas ${o.i}"></i>` : ''} ${o.l}
    </span>`;
  };

  const relevance = _SORT_OPTS.filter(o => o.group === 'relevance');
  const dates     = _SORT_OPTS.filter(o => o.group === 'date');
  const engage    = _SORT_OPTS.filter(o => o.group === 'engage');
  const alpha     = _SORT_OPTS.filter(o => o.group === 'alpha');
  const langs     = _SORT_OPTS.filter(o => o.group === 'lang');
  const advOpts   = _SORT_OPTS.filter(o => o.group === 'advanced');
  const pagesOpts = _SORT_OPTS.filter(o => o.group === 'pages');

  return `<div class="sort-bar" style="flex-wrap:wrap;gap:8px 4px;align-items:center">
    <span class="sort-label">Sort:</span>
    <div class="sort-chips" style="flex-wrap:wrap;gap:5px;align-items:center">
      ${relevance.filter(o => o.k !== 'curriculum' || showCurr).map(chip).join('')}
      <span class="sort-sep"></span>
      ${dates.map(chip).join('')}
      <span class="sort-sep"></span>
      ${engage.map(chip).join('')}
      <span class="sort-sep"></span>
      ${alpha.map(chip).join('')}
      <span class="sort-sep"></span>
      ${langs.map(chip).join('')}
      <span class="sort-sep"></span>
      ${pagesOpts.map(chip).join('')}
      ${showAdv ? `<span class="sort-sep"></span>${advOpts.map(chip).join('')}${advDropdownHTML()}` : ''}
    </div>
  </div>`;
}

// ── Per-user saved set ──────────────────────────────────────
var USER_SAVED = window.USER_SAVED = {};
function getUserSaved(){
  const uid = STATE.currentUser?.id; if(!uid) return new Set();
  if(!USER_SAVED[uid]) USER_SAVED[uid] = new Set();
  return USER_SAVED[uid];
}
function toggleSave(sid){
  if(!STATE.loggedIn){ openSignIn(); return; }
  const s = getUserSaved();
  if(s.has(sid)){ s.delete(sid); toast('Removed from saved','info','fa-bookmark'); }
  else { s.add(sid); toast('Saved! 🔖','success','fa-bookmark'); }
}
function isSaved(sid){ return getUserSaved().has(sid); }

// ── Guest banner dismiss ────────────────────────────────────
function dismissGuestBanner(){
  document.getElementById('guestBanner')?.classList.add('hidden');
}

// ── Change Password Modal ───────────────────────────────────
function openChangePassword(){
  document.getElementById('chpwOverlay')?.remove();
  const ov=document.createElement('div'); ov.className='overlay'; ov.id='chpwOverlay';
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  ov.innerHTML=`<div class="modal modal--narrow"><div class="modal-drag"></div>
    <div class="modal-head">
      <div class="modal-title">🔑 Change Password</div>
      <button class="modal-close" onclick="document.getElementById('chpwOverlay').remove()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div class="fgrid">
        <div class="field"><label>Current Password</label>
          <div style="position:relative">
            <input class="input" id="chpw-old" type="password" placeholder="Your current password" style="padding-right:44px" autofocus>
            <button onclick="togglePassVis('chpw-old',this)" type="button" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div class="field"><label>New Password</label>
          <div style="position:relative">
            <input class="input gf" id="chpw-new1" type="password" placeholder="Min 8 characters" style="padding-right:44px" oninput="chpwStrength(this.value)">
            <button onclick="togglePassVis('chpw-new1',this)" type="button" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px"><i class="fas fa-eye"></i></button>
          </div>
          <div id="chpw-strength" style="font-size:11px;color:var(--text3);margin-top:4px;min-height:16px"></div>
        </div>
        <div class="field"><label>Confirm New Password</label>
          <div style="position:relative">
            <input class="input gf" id="chpw-new2" type="password" placeholder="Repeat new password" style="padding-right:44px" onkeydown="if(event.key==='Enter')doChangePassword()">
            <button onclick="togglePassVis('chpw-new2',this)" type="button" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px"><i class="fas fa-eye"></i></button>
          </div>
        </div>
      </div>
      <div id="chpw-err" style="color:var(--coral);font-size:12px;margin-top:8px;display:none"></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:18px" onclick="doChangePassword()">
        <i class="fas fa-shield-halved"></i> Update Password
      </button>
      <div style="text-align:center;margin-top:12px">
        <span style="font-size:12px;color:var(--amber);cursor:pointer;font-weight:700" onclick="document.getElementById('chpwOverlay').remove();openForgotPassword()">Forgot current password?</span>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
}
function chpwStrength(v){
  const el=document.getElementById('chpw-strength'); if(!el) return;
  if(!v){ el.textContent=''; return; }
  const score=(v.length>=8?1:0)+(/[A-Z]/.test(v)?1:0)+(/[0-9]/.test(v)?1:0)+(/[^A-Za-z0-9]/.test(v)?1:0);
  const labels=['','Weak 🔴','Fair 🟡','Good 🟢','Strong 💪'];
  el.innerHTML='Strength: <b>'+(labels[score]||labels[1])+'</b>';
}
async function doChangePassword(){
  const u=STATE.currentUser; if(!u) return;
  const oldVal=(document.getElementById('chpw-old')?.value||'');
  const new1=(document.getElementById('chpw-new1')?.value||'');
  const new2=(document.getElementById('chpw-new2')?.value||'');
  const errEl=document.getElementById('chpw-err');
  const showErr=msg=>{ if(errEl){ errEl.textContent=msg; errEl.style.display=''; } };
  // Client-side validation only (no password comparison — that's the server's job)
  if(!oldVal){ showErr('Please enter your current password.'); return; }
  if(new1.length < 8){ showErr('New password must be at least 8 characters.'); return; }
  if(new1 !== new2){ showErr('New passwords do not match.'); return; }
  if(new1 === oldVal){ showErr('New password must be different from current password.'); return; }
  // Disable button during request
  const btn=document.querySelector('#chpwOverlay .btn-primary');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Updating…'; }
  try {
    await api('PATCH', '/auth/password', { currentPassword: oldVal, newPassword: new1 });
    document.getElementById('chpwOverlay')?.remove();
    toast('Password updated successfully! 🔐','success','fa-shield-halved');
  } catch(e) {
    showErr(e.message || 'Could not update password. Check your current password.');
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="fas fa-shield-halved"></i> Update Password'; }
  }
}

// ── Website: patch updateMeta to also update canonical URL ──
const _origUpdateMeta = window.updateMeta;
window.updateMeta = function(opts) {
  if (_origUpdateMeta) _origUpdateMeta(opts);
  // Update canonical for current URL
  const can = document.querySelector('link[rel="canonical"]');
  if (can && opts && opts.canonical) {
    can.href = 'https://mol5sat.org' + opts.canonical;
  }
  // Update og:url
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl && opts && opts.canonical) {
    ogUrl.setAttribute('content', 'https://mol5sat.org' + opts.canonical);
  }
};
