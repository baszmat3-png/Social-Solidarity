/* تكافل — الإقلاع: الدخول والخروج وتحميل الحالة */
'use strict';
let VP = '';
function readHash() { const h = location.hash.slice(1).split(':'); VP = h[1] || ''; return h[0]; }
function refreshMe() {
  if (!ME) return;
  const u = S.users.find(x => x.email.toLowerCase() === ME.email.toLowerCase() && !x.deleted);
  if (!u || u.status !== 'مفعل') return doLogout(true);
  const r = get('roles', u.role); ME.id = u.id; ME.name = u.name; ME.perms = new Set(r && !r.deleted ? r.perms : []);
}
const _sync = sync;
sync = async function (q) { await _sync(q); refreshMe(); };
async function loadPub() { try { PUB = await API('/public'); } catch { PUB = null; } }
async function doLogin() {
  const b = $('#lb'), e = $('#le'); e.style.display = 'none'; b.disabled = true;
  try {
    const d = await API('/login', { method: 'POST', body: JSON.stringify({ email: $('#lu').value.trim(), password: $('#lw').value }) });
    TOK = d.token; try { ($('#lr').checked ? localStorage : sessionStorage).setItem('tk', TOK); } catch {}
    await boot(true); logOp('دخول', 'النظام', 'تسجيل دخول'); save(); go('home');
  } catch (x) { b.disabled = false; e.textContent = x.status === 429 ? 'محاولات كثيرة — حاول بعد قليل' : x.message === 'suspended' ? 'الحساب موقوف' : 'البريد الإلكتروني أو كلمة المرور غير صحيحة'; e.style.display = 'block'; }
}
function doLogout(silent) {
  try { localStorage.removeItem('tk'); sessionStorage.removeItem('tk'); } catch {}
  TOK = ''; AUTH = false; ME = null; S = freshState(); RD = PD = ND = null;
  location.hash = 'login'; V = 'login'; loadPub().then(() => { render(); if (!silent) T('تم تسجيل الخروج'); });
}
async function boot(fresh) {
  V = readHash() || 'pub';
  if (!fresh) { try { TOK = localStorage.getItem('tk') || sessionStorage.getItem('tk') || ''; } catch {} }
  if (TOK) {
    try {
      const d = await API('/state'), me = await API('/me');
      ME = { email: me.email, perms: new Set(me.perms), name: '', id: null };
      S = freshState(); const srv = d.S || {};
      if (!Object.keys(srv).length) { /* أول تشغيل: نبدأ بالحالة الافتراضية */ } else { S = Object.assign(freshState(), srv); COLL.forEach(c => { if (!Array.isArray(S[c])) S[c] = []; }); }
      S.R = { ...DEF_R, ...(S.R || {}), els: { ...DEF_R.els, ...((S.R || {}).els || {}) } }; S.P = { ...DEF_P, ...(S.P || {}) }; S.NS = S.NS || {};
      AUTH = true; if (!Object.keys(srv).length) { await sync(true); await _sync(true); }
      const u = S.users.find(x => x.email.toLowerCase() === me.email.toLowerCase());
      ME.id = u ? u.id : null; ME.name = u ? u.name : 'مدير النظام';
      if (u) refreshMe(); else if (!me.perms.includes('*')) throw Object.assign(new Error('x'), { status: 401 });
      LASTJ = snap(); if (!fresh && (V === 'pub' && !location.hash || V === 'login')) V = 'home';
    } catch (e) { TOK = ''; AUTH = false; ME = null; try { localStorage.removeItem('tk'); sessionStorage.removeItem('tk'); } catch {} }
  }
  if (!AUTH) { await loadPub(); PUBAT = Date.now(); }
  render();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
boot();
