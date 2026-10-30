/* تكافل — الواجهة الإدارية: الإطار، الرئيسية، معلوماتي، الصلاحيات، التصنيفات، التقارير، السجل، الإشعارات */
'use strict';
const COMPANY = 'شركة إنجاز للحلول البرمجية', WA_NUM = '07764100065', WA_LINK = 'https://wa.me/9647764100065';
const normPhone = s => String(s || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '').replace(/^00/, '').replace(/^964/, '').replace(/^0+/, '');
const NV = [['home', 'الرئيسية', 'bi-house-gear'], ['profile', 'معلوماتي', 'bi-person-lines-fill'], ['users', 'المستخدمين', 'bi-person-gear', 'users.view'], ['roles', 'قوالب الصلاحيات', 'bi-shield-lock', 'roles.view'], ['cats', 'التصنيفات', 'bi-tags', 'cats.view'],
  ['areas', 'المناطق', 'bi-geo-alt-fill', 'areas.view'], ['families', 'العائلات', 'bi-house-heart', 'families.view'], ['beneficiaries', 'المستفيدين', 'bi-people-fill', 'beneficiaries.view'], ['donors', 'المتبرعين', 'bi-person-hearts', 'donors.view'],
  ['funds', 'الصناديق', 'bi-safe', 'funds.view'], ['transfers', 'تدوير الأموال', 'bi-arrow-left-right', 'funds.view'], ['donations', 'التبرعات', 'bi-cash-coin', 'donations.view'], ['expenses', 'الصرفيات', 'bi-cash', 'expenses.view'],
  ['campaigns', 'الحملات', 'bi-megaphone', 'campaigns.view'], ['projects', 'المشاريع', 'bi-building-gear', 'projects.view'], ['reports', 'التقارير', 'bi-graph-up', 'reports.access'], ['audit', 'سجل العمليات', 'bi-clock-history', 'system.audit'],
  ['settings', 'الإعدادات', 'bi-gear-fill', 'settings.any'], ['receipts', 'إعدادات الوصولات', 'bi-receipt', 'settings.org'], ['public-set', 'إعدادات العرض العام', 'bi-globe-americas', 'settings.public'],
  ['notifs', 'الإشعارات', 'bi-bell'], ['notif-set', 'إعدادات الإشعارات', 'bi-sliders'], ['pub', 'الواجهة العامة', 'bi-globe'], ['out', 'تسجيل الخروج', 'bi-box-arrow-right']];
const nvOk = x => !x[3] || (x[3] === 'settings.any' ? can('settings.org') || can('settings.public') : can(x[3]));
const PUBV = ['pub', 'orgs', 'camps', 'projs', 'verify', 'org', 'login'];
let V = 'pub', DEFERRED = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); DEFERRED = e; render(true); });
function installApp() { if (DEFERRED) { DEFERRED.prompt(); DEFERRED.userChoice.finally(() => { DEFERRED = null; render(true); }); } else T('ثبّت التطبيق من قائمة المتصفح ⋮ ← «إضافة إلى الشاشة الرئيسية»'); }
function go(v) { if (location.hash.slice(1) === v) { V = v; render(); } else location.hash = v; }
addEventListener('hashchange', () => { V = readHash() || (AUTH ? 'home' : 'pub'); render(); });

let PUBAT = 0;
function ensurePub() { if (Date.now() - PUBAT < 15000) return; PUBAT = Date.now(); loadPub().then(() => { if (PUBV.includes(V) && V !== 'login' && !$('.m') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) render(true); }); }
function routeFix() {
  if (V === 'out') { doLogout(); return false; }
  if (!AUTH && !PUBV.includes(V)) V = 'login';
  if (AUTH && V === 'login') V = 'home';
  return true;
}
function render(keep) {
  if (!routeFix()) return;
  const y = scrollY, isPub = PUBV.includes(V);
  document.body.className = isPub ? 'pub' : '';
  $('#app').innerHTML = (V === 'login' ? '' : (isPub ? pubShell() : shell())) + `<main>${view()}</main>` + (V === 'login' ? '' : (isPub ? pubFoot() : foot())) + '<button class="top" id="topb" onclick="scrollTo({top:0,behavior:\'smooth\'})"><i class="bi bi-chevron-up"></i></button>';
  after();
  scrollTo(0, keep ? y : 0);
}
addEventListener('scroll', () => { const b = $('#topb'); if (b) b.style.display = scrollY > 400 ? 'block' : 'none'; }, { passive: true });
function after() {
  if (V === 'audit' && AUTH) auRefresh();
  if (PUBV.includes(V)) ensurePub();
  if (AUTH && ENT[V] && $('#ltab')) refreshList(V);
  if (V === 'receipts') rcRefresh();
  if (V === 'org' || V === 'camps' || V === 'projs' || V === 'pub' || V === 'orgs') pubAfter();
}
function view() {
  if (AUTH && !PUBV.includes(V)) {
    if (ENT[V]) return listPage(V);
    const m = /^rep-(\w+)$/.exec(V); if (m) return reportPage(m[1]);
    const f = ({ home, profile, roles, cats, reports, audit, notifs, 'notif-set': notifSet, receipts, 'public-set': pubSet, settings: settingsHub })[V];
    return f ? f() : home();
  }
  return ({ pub: pubHome, orgs: pubOrgs, camps: pubCamps, projs: pubProjs, verify: pubVerify, org: pubOrg, login })[V]();
}
function shell() {
  const n = unread();
  return `<div class="bar"><span class="logo" onclick="go('home')">تكافل <i class="bi bi-heart-pulse-fill"></i></span><span>${DEFERRED ? `<button class="ib" onclick="installApp()" title="تثبيت"><i class="bi bi-download" style="color:var(--p)"></i></button>` : ''}<button class="ib" onclick="go('notifs')" title="الإشعارات"><i class="bi bi-bell-fill"></i>${n ? `<span class="dot">${n}</span>` : ''}</button><button class="ib" onclick="th()" title="الوضع الليلي"><i class="bi bi-moon-stars-fill"></i></button><button class="ib" onclick="refreshNow()" title="تحديث"><i class="bi bi-arrow-clockwise"></i></button><button class="ib" onclick="history.back()" title="رجوع"><i class="bi bi-arrow-left-circle"></i></button><button class="ib" onclick="dr()"><i class="bi bi-list"></i></button></span></div>${npr()}`;
}
async function refreshNow() { T('جارٍ التحديث...'); await sync(true); render(true); T('✅ تم التحديث'); }
function npr() {
  let off = false; try { off = localStorage.getItem('tk_npr') === '1'; } catch {}
  if (off || ('Notification' in window && Notification.permission === 'granted') || !('Notification' in window)) return '';
  return `<div style="padding:14px 14px 0"><div class="info" style="margin:0"><i class="bi bi-bell-fill"></i><span style="flex:1;font-weight:600">فعّل الإشعارات حتى توصلك تنبيهات فورية عن التبرعات والصرفيات والعمليات الجديدة</span><button class="btn s" style="background:#0dcaf0;color:#000" onclick="askPush()"><i class="bi bi-bell"></i> تفعيل الآن</button><button class="btn s o" style="border-color:var(--m);color:var(--m)" onclick="try{localStorage.setItem('tk_npr','1')}catch(e){};render(true)"><i class="bi bi-x-lg"></i></button></div></div>`;
}
async function askPush() {
  if (!('Notification' in window)) return T('المتصفح لا يدعم الإشعارات');
  const p = await Notification.requestPermission(); T(p === 'granted' ? '🔔 تم تفعيل إشعارات الجهاز' : 'لم يتم السماح بالإشعارات من المتصفح'); render(true);
  if (p === 'granted') try { new Notification('تكافل', { body: 'تم تفعيل الإشعارات بنجاح', icon: '/icon.svg', dir: 'rtl' }); } catch {}
}
function dr(items) {
  const l = items || (AUTH ? NV.filter(nvOk) : PUB_NAV());
  const d = document.createElement('div'); d.className = 'dr'; d.onclick = e => { if (e.target === d) d.remove(); };
  d.innerHTML = `<nav>${l.map(x => `<a class="${V === x[0] ? 'on' : ''}" onclick="${x[4] || `go('${x[0]}')`};this.closest('.dr').remove()"><i class="bi ${x[2]}"></i> ${x[1]}</a>`).join('')}</nav>`;
  document.body.append(d);
}
function foot() {
  return `<footer><b style="font-size:19px;color:var(--t)">تكافل <i class="bi bi-heart-pulse-fill" style="color:var(--p)"></i></b><br>منصة إدارة العمل الخيري الشاملة<div class="fs"><a href="${WA_LINK}" target="_blank" rel="noopener" title="واتساب"><i class="bi bi-whatsapp"></i></a><a href="tel:${WA_NUM}" title="اتصال"><i class="bi bi-telephone"></i></a></div>
<b style="color:var(--t)">جميع الحقوق محفوظة لـ ${COMPANY}</b><br>للتواصل واتساب: <a href="${WA_LINK}" target="_blank" rel="noopener" dir="ltr">${WA_NUM}</a><br><span>V. 2.0.0 © ${new Date().getFullYear()}</span></footer>`;
}

/* ---------- الرئيسية ---------- */
function home() {
  const dons = S.donations.filter(okD), exps = S.expenses.filter(okE), L = c => live(c);
  const bs = [['bi-house-heart', 'var(--p)', L('families').filter(f => f.status === 'نشطة').length, 'عائلة نشطة'], ['bi-people-fill', '#0dcaf0', L('beneficiaries').filter(f => f.status === 'نشط').length, 'مستفيد نشط'], ['bi-geo-alt-fill', 'var(--ok)', L('areas').filter(f => f.status === 'مفعل').length, 'منطقة مفعّلة'], ['bi-person-hearts', 'var(--bad)', L('donors').filter(f => f.status === 'مفعل').length, 'متبرع مفعّل']];
  const empty = (i, t) => `<div class="em"><i class="bi ${i}"></i>${t}</div>`;
  const box = (ic, t, b) => `<div class="card"><b><i class="bi ${ic}" style="color:var(--p)"></i> ${t}</b><div style="margin-top:8px">${b}</div></div>`;
  const fs = can('funds.view') ? L('funds').filter(f => f.status === 'مفعل') : [];
  return `<div class="ct" style="font-size:54px;color:var(--p)"><i class="bi bi-heart-pulse-fill"></i></div><h2 style="margin:0">مرحباً بك، ${esc(ME.name)}</h2><p class="sm ct">${esc(S.P.name)}</p>
<div class="card"><b class="sm"><i class="bi bi-grid-3x3-gap"></i> التنقل السريع</b><div class="grid" style="margin-top:10px">${NV.filter(nvOk).map(x => `<div class="q ${x[0] === 'out' ? 'out' : ''}" onclick="go('${x[0]}')"><i class="bi ${x[2]}"></i>${x[1]}</div>`).join('')}</div></div>
${can('reports.summary') || can('donations.view') ? box('bi-bar-chart', 'الملخص المالي', `<div class="sm4"><div class="sc g"><i class="bi bi-cash-coin ic"></i><div class="n">${money(sum(dons))}</div><div class="l">إجمالي التبرعات</div><div class="u">(د.ع)</div><span class="b" style="background:var(--ok)">${dons.length} تبرع</span></div><div class="sc r"><i class="bi bi-cash ic"></i><div class="n">${money(sum(exps))}</div><div class="l">إجمالي الصرفيات</div><div class="u">(د.ع)</div><span class="b" style="background:var(--bad)">${exps.length} صرفية</span></div><div class="sc p"><i class="bi bi-safe2 ic"></i><div class="n">${money(L('funds').reduce((a, f) => a + fundBal(f.id), 0))}</div><div class="l">صافي الأرصدة</div><div class="u">(د.ع)</div><span class="b" style="background:#6c757d">كل الصناديق</span></div><div class="sc s"><i class="bi bi-activity ic"></i><div class="two"><div><div class="n" style="color:#212529">${L('campaigns').filter(c => campStatus(c) === 'نشطة').length}</div>حملة</div><span class="dv"></span><div><div class="n" style="color:#212529">${L('projects').filter(p => p.status === 'تنفيذ').length}</div>مشروع</div></div><div class="l">نشطة حالياً</div></div></div>`) : ''}
${can('funds.view') ? box('bi-safe', 'أرصدة الصناديق', fs.length ? fs.map(f => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--b)"><span>${esc(f.name)}</span><b>${money(fundBal(f.id))}</b></div>`).join('') : empty('bi-inbox', 'لا توجد صناديق')) : ''}
${can('campaigns.view') ? box('bi-megaphone', 'الحملات النشطة', L('campaigns').filter(c => campStatus(c) === 'نشطة').map(c => `<div style="padding:6px 0"><b>${esc(c.name)}</b>${num(c.goal) ? `<div class="pr" style="margin:4px 0"><i style="width:${Math.min(100, campRaised(c.id) / c.goal * 100)}%"></i></div><span class="sm">${money(campRaised(c.id))} / ${money(c.goal)}</span>` : ''}</div>`).join('') || empty('bi-inbox', 'لا توجد حملات نشطة')) : ''}
${can('donations.view') ? box('bi-cash-coin', 'آخر التبرعات', [...L('donations')].sort((a, b) => b._c - a._c).slice(0, 4).map(d => `<div style="display:flex;justify-content:space-between;padding:5px 0"><span>${esc(nm('donors', d.donor))}</span><b>${money(d.amount)}</b></div>`).join('') || empty('bi-inbox', 'لا توجد تبرعات')) : ''}
${can('expenses.view') ? box('bi-cash', 'آخر الصرفيات', [...L('expenses')].sort((a, b) => b._c - a._c).slice(0, 4).map(d => `<div style="display:flex;justify-content:space-between;padding:5px 0"><span>${esc(d.title)}</span><b>${money(d.amount)}</b></div>`).join('') || empty('bi-inbox', 'لا توجد صرفيات')) : ''}
${box('bi-people', 'إحصائيات المستفيدين', `<div class="grid">${bs.map(b => `<div class="card ct" style="margin:0"><i class="bi ${b[0]}" style="font-size:26px;color:${b[1]}"></i><br><b style="font-size:22px">${b[2]}</b><br><span class="sm">${b[3]}</span></div>`).join('')}</div>`)}`;
}
function settingsHub() {
  return `<h2><i class="bi bi-gear-fill"></i> الإعدادات</h2><div class="grid">${NV.filter(x => ['receipts', 'public-set', 'notif-set'].includes(x[0]) && nvOk(x)).map(x => `<div class="q" onclick="go('${x[0]}')"><i class="bi ${x[2]}"></i>${x[1]}</div>`).join('')}</div>`;
}

/* ---------- معلوماتي ---------- */
function profile() {
  const u = get('users', ME.id) || { name: ME.name, email: ME.email, phone: '' };
  return `<h2><i class="bi bi-person-lines-fill"></i> معلوماتي</h2><div class="card ct"><i class="bi bi-person-circle" style="font-size:80px;color:var(--p)"></i><h3 style="margin:0">${esc(u.name)}</h3><span class="bg i">${esc(S.P.name)}</span> <span class="bg p">${esc(nm('roles', u.role, 'مدير'))}</span><hr style="border-color:var(--b)"><div style="text-align:start"><label class="f">الاسم الكامل <i>*</i></label><input id="pn" value="${esc(u.name)}"><label class="f">البريد الإلكتروني (لا يمكن تغييره)</label><input value="${esc(u.email)}" disabled dir="ltr"><label class="f">رقم الهاتف</label><input id="pp" value="${esc(u.phone || '')}" inputmode="tel"></div><button class="btn" onclick="saveProfile()"><i class="bi bi-check2-circle"></i> حفظ التعديلات</button></div>
<div class="card"><div class="hd"><i class="bi bi-key"></i> تغيير كلمة المرور</div><label class="f">كلمة المرور الحالية</label><input id="po" type="password" autocomplete="current-password"><label class="f">كلمة المرور الجديدة</label><input id="pw1" type="password" autocomplete="new-password"><label class="f">تأكيد كلمة المرور</label><input id="pw2" type="password" autocomplete="new-password"><button class="btn" onclick="savePass()"><i class="bi bi-shield-check"></i> تغيير كلمة المرور</button></div>`;
}
function saveProfile() {
  const u = get('users', ME.id), n = $('#pn').value.trim(); if (!n) return T('⚠️ الاسم مطلوب');
  u.name = n; u.phone = $('#pp').value.trim(); touch(u); ME.name = n; logOp('تعديل', 'المستخدمين', 'تعديل معلوماتي'); save(); T('✅ تم حفظ التعديلات'); render(true);
}
async function savePass() {
  const o = $('#po').value, a = $('#pw1').value, b = $('#pw2').value;
  if (!o || !a) return T('⚠️ أدخل كلمة المرور الحالية والجديدة'); if (a.length < 6) return T('⚠️ كلمة المرور ست خانات على الأقل'); if (a !== b) return T('⚠️ تأكيد كلمة المرور غير مطابق');
  try { await API('/password', { method: 'POST', body: JSON.stringify({ old: o, password: a }) }); T('✅ تم تغيير كلمة المرور'); ['po', 'pw1', 'pw2'].forEach(i => $('#' + i).value = ''); } catch (e) { T(e.message === 'wrong_password' ? '⚠️ كلمة المرور الحالية غير صحيحة' : '⚠️ تعذّر تغيير كلمة المرور'); }
}

/* ---------- قوالب الصلاحيات ---------- */
const permCount = r => (r.perms || []).includes('*') ? ALL_PERMS.length : (r.perms || []).length;
let RQ = '';
function roles() {
  if (!can('roles.view')) return noAccess();
  const rows = S.roles.filter(r => !r.deleted && r.name.includes(RQ));
  return `<h2><i class="bi bi-shield-lock"></i> قوالب الصلاحيات</h2><div class="card">${can('roles.create') ? `<button class="btn o" onclick="roleForm()"><i class="bi bi-plus-lg"></i> إضافة دور</button>` : ''}<input placeholder="بحث بالاسم..." value="${esc(RQ)}" onchange="RQ=this.value;render(true)"><div class="sm ct">النتائج: ${rows.length}</div></div>
<div class="card ov"><table><tr><th>ID</th><th>اسم الدور</th><th>الصلاحيات</th><th>المستخدمون</th><th>الإعدادات</th></tr>${rows.map((r, i) => `<tr><td>${S.roles.indexOf(r) + 1}</td><td><i class="bi bi-shield-lock" style="color:var(--p)"></i> <b>${esc(r.name)}</b></td><td><span class="bg p">${permCount(r)}</span></td><td>${live('users').filter(u => u.role === r.id).length}</td><td class="act">${can('roles.edit') && (!r.sys || ME.perms.has('*')) ? `<button class="btn xs" onclick="roleForm('${r.id}')"><i class="bi bi-pencil-square"></i></button>` : ''}${can('roles.delete') && !r.sys ? `<button class="btn xs d" onclick="roleDel('${r.id}')"><i class="bi bi-trash3"></i></button>` : ''}</td></tr>`).join('')}</table></div>`;
}
function roleForm(id) {
  const r = id ? get('roles', id) : null, locked = r && (r.perms || []).includes('*'), cur = new Set(r ? r.perms : []);
  const grp = PERM_GROUPS.map(([n, ps]) => `<div class="pk"><h5><i class="bi bi-folder2-open"></i> ${n}</h5>${ps.map(([k, l]) => `<label><input type="checkbox" class="pc" value="${k}" ${locked || cur.has(k) ? 'checked' : ''} ${locked ? 'disabled' : ''} onchange="pcCount()"> ${l}</label>`).join('')}</div>`).join('');
  modal(`<i class="bi bi-${r ? 'pencil-square' : 'plus-circle'}"></i> ${r ? 'تعديل' : 'إنشاء'} قالب صلاحيات`, `<label class="f">اسم الدور <i>*</i></label><input id="rn" value="${esc(r ? r.name : '')}"><div class="info"><i class="bi bi-info-circle"></i> تحديث صلاحيات هذا الدور لاحقاً سيُحدّث جميع المستخدمين المرتبطين به تلقائياً.</div>${locked ? '<div class="warn">دور المدير يملك كل الصلاحيات ولا يمكن تقييده.</div>' : `<label class="tg"><span>تحديد جميع الصلاحيات</span><input type="checkbox" id="pall" onchange="$$('.pc').forEach(c=>c.checked=this.checked);pcCount()"><i></i></label>`}<div class="ct" style="margin-bottom:8px"><span class="bg p">المحددة: <span id="pcn">0</span></span></div>${grp}<button class="btn" onclick="roleSave('${id || ''}')"><i class="bi bi-check2-circle"></i> ${r ? 'حفظ التعديلات' : 'إنشاء الدور'}</button>`, true);
  pcCount();
}
const pcCount = () => { const n = $$('.pc:checked').length; $('#pcn').textContent = n; const a = $('#pall'); if (a) a.checked = n === ALL_PERMS.length; };
function roleSave(id) {
  const n = $('#rn').value.trim(); if (!n) return T('⚠️ اسم الدور مطلوب');
  if (S.roles.some(r => !r.deleted && r.id !== id && r.name === n)) return T('⚠️ يوجد دور بنفس الاسم');
  const perms = $$('.pc:checked').map(c => c.value), r = id ? get('roles', id) : null;
  if (!ME.perms.has('*') && perms.includes('*')) return;
  if (r) { r.name = n; if (!(r.perms || []).includes('*')) r.perms = perms; touch(r); logOp('تعديل', 'قوالب الصلاحيات', n); }
  else { const t = Date.now(); S.roles.push({ id: 'r_' + uid(), name: n, perms, _c: t, _u: t }); logOp('إنشاء', 'قوالب الصلاحيات', n); }
  save(); closeM(); T('✅ تم الحفظ'); refreshMe(); render(true);
}
function roleDel(id) {
  const r = get('roles', id), n = live('users').filter(u => u.role === id).length;
  if (n) return T(`⚠️ لا يمكن حذف الدور: مرتبط بـ ${n} مستخدم`);
  confirmBox(`حذف الدور «${esc(r.name)}»؟`, () => { r.deleted = true; touch(r); logOp('حذف', 'قوالب الصلاحيات', r.name); save(); T('🗑 تم الحذف'); render(true); }, 'حذف');
}

/* ---------- التصنيفات ---------- */
let CG = 'benef';
const catUse = c => (c.grp || 'benef') === 'benef' ? live('beneficiaries').filter(b => (b.cats || []).includes(c.id)).length : (CAT_USE[c.grp] || []).reduce((n, [co, f]) => n + live(co).filter(r => r[f] === c.name).length, 0);
function catGrp(g) { CG = g; render(true); }
function cats() {
  if (!can('cats.view')) return noAccess();
  const L = catsOf(CG), gl = CAT_GROUPS.find(x => x[0] === CG)[1], cc = can('cats.create'), ce = can('cats.edit'), cd = can('cats.delete');
  const cn = c => (COLORS.find(x => x[1] === c) || ['—'])[0];
  return `<h2><i class="bi bi-tags"></i> إدارة التصنيفات</h2><p class="sm ct">تصنيفات ديناميكية تتحكم بخيارات القوائم المنسدلة في جميع أقسام النظام</p>
<div class="tabs">${CAT_GROUPS.map(g => `<button type="button" class="${g[0] === CG ? 'on' : ''}" style="flex:none" onclick="catGrp('${g[0]}')">${g[1]}</button>`).join('')}</div>
<h3 class="ct"><span style="color:var(--p)">${gl} <i class="bi bi-tags"></i></span></h3><p class="sm ct">عدد التصنيفات: ${L.length}</p>${cc ? `<div class="card"><label class="f">اسم التصنيف الجديد <i>*</i></label><input id="cn" placeholder="اسم التصنيف الجديد"><div class="grid"><div><label class="f">اللون</label><select id="cc">${COLORS.map(c => `<option value="${c[1]}">${c[0]}</option>`).join('')}</select></div><div><label class="f">الأيقونة (اختياري)</label><input id="ci" dir="ltr" placeholder="bi-heart"></div></div><button class="btn" onclick="catAdd()"><i class="bi bi-plus-circle"></i> إضافة</button></div>` : ''}
<div class="card ov"><table><tr><th>#</th><th>المعاينة</th><th>الاسم</th><th>اللون</th><th>الأيقونة</th><th>الحالة</th><th>الإعدادات</th></tr>${L.map((c, i) => `<tr><td>${i + 1}</td><td>${catBadge(c.id)}</td><td>${esc(c.name)}</td><td><span class="bg" style="background:${esc(c.color)}${c.color === '#ffc107' ? ';color:#000' : ''}">${cn(c.color)}</span></td><td>${c.icon ? `<i class="bi ${esc(c.icon)}" style="font-size:20px"></i>` : '—'}</td><td>${stb(c.status)}</td><td class="act">${ce ? `<button class="btn xs o" ${i ? '' : 'disabled'} onclick="catMove('${c.id}',-1)"><i class="bi bi-arrow-up"></i></button><button class="btn xs o" ${i < L.length - 1 ? '' : 'disabled'} onclick="catMove('${c.id}',1)"><i class="bi bi-arrow-down"></i></button><button class="btn xs y" title="${c.status === 'مفعل' ? 'إخفاء' : 'إظهار'}" onclick="catToggle('${c.id}')"><i class="bi bi-eye${c.status === 'مفعل' ? '-slash' : ''}"></i></button><button class="btn xs" onclick="catEdit('${c.id}')"><i class="bi bi-pencil-square"></i></button>` : ''}${cd ? `<button class="btn xs d" onclick="catDel('${c.id}')"><i class="bi bi-trash3"></i></button>` : ''}</td></tr>`).join('')}</table>${L.length ? '' : '<div class="em"><i class="bi bi-inbox"></i>لا توجد تصنيفات</div>'}</div><p class="sm ct"><i class="bi bi-info-circle"></i> الأيقونات من <a href="https://icons.getbootstrap.com" target="_blank" rel="noopener">Bootstrap Icons</a> — مثال: bi-heart, bi-star, bi-cash-coin</p>`;
}
const cleanIcon = v => { v = v.trim(); return !v ? '' : /^bi-[a-z0-9-]+$/.test(v) ? v : /^[a-z0-9-]+$/.test(v) ? 'bi-' + v : null; };
function catAdd() {
  const n = $('#cn').value.trim(), ic = cleanIcon($('#ci').value); if (!n) return T('⚠️ اسم التصنيف مطلوب'); if (ic === null) return T('⚠️ اسم الأيقونة غير صحيح'); if (dupName('cats', n, null, x => (x.grp || 'benef') === CG)) return T('⚠️ التصنيف موجود');
  const t = Date.now(), mx = Math.max(t, ...catsOf(CG).map(c => c._c + 1)); S.cats.push({ id: 'c_' + uid(), grp: CG, name: n, color: $('#cc').value, icon: ic, status: 'مفعل', _c: mx, _u: t }); logOp('إنشاء', 'التصنيفات', n); save(); T('✅ تمت الإضافة'); render(true);
}
function catMove(id, d) { const c0 = get('cats', id), L = catsOf(c0.grp || 'benef'), i = L.findIndex(c => c.id === id), j = i + d; if (j < 0 || j >= L.length) return; const a = L[i], b = L[j], t = a._c; a._c = b._c; b._c = t; touch(a); touch(b); save(); render(true); }
function catToggle(id) { const c = get('cats', id); c.status = c.status === 'مفعل' ? 'موقوف' : 'مفعل'; touch(c); logOp('تعديل', 'التصنيفات', c.name); save(); render(true); }
function catEdit(id) {
  const c = get('cats', id);
  modal('<i class="bi bi-pencil-square"></i> تعديل تصنيف', `<label class="f">الاسم <i>*</i></label><input id="en" value="${esc(c.name)}"><label class="f">اللون</label><select id="ec">${COLORS.map(x => `<option value="${x[1]}" ${x[1] === c.color ? 'selected' : ''}>${x[0]}</option>`).join('')}</select><label class="f">الأيقونة</label><input id="ei" dir="ltr" value="${esc(c.icon || '')}"><button class="btn" onclick="catSave('${id}')"><i class="bi bi-check2-circle"></i> حفظ</button>`);
}
function catSave(id) {
  const c = get('cats', id), g = c.grp || 'benef', n = $('#en').value.trim(), ic = cleanIcon($('#ei').value); if (!n) return T('⚠️ الاسم مطلوب'); if (ic === null) return T('⚠️ اسم الأيقونة غير صحيح'); if (dupName('cats', n, id, x => (x.grp || 'benef') === g)) return T('⚠️ التصنيف موجود');
  if (n !== c.name) (CAT_USE[g] || []).forEach(([co, f]) => S[co].forEach(r => { if (!r.deleted && r[f] === c.name) { r[f] = n; touch(r); } }));
  Object.assign(c, { name: n, color: $('#ec').value, icon: ic }); touch(c); logOp('تعديل', 'التصنيفات', n); save(); closeM(); T('✅ تم الحفظ'); render(true);
}
function catDel(id) { const c = get('cats', id), n = catUse(c); if (n) return T(`⚠️ لا يمكن حذف التصنيف: مستخدم في ${n} سجل`); confirmBox(`حذف التصنيف «${esc(c.name)}»؟`, () => { c.deleted = true; touch(c); logOp('حذف', 'التصنيفات', c.name); save(); T('🗑 تم الحذف'); render(true); }, 'حذف'); }

/* ---------- التقارير ---------- */
const RF = { id: '', v: {} };
const inRange = (d, v) => (!v.from || d >= v.from) && (!v.to || d <= v.to);
const dateF = [{ id: 'from', l: 'من تاريخ', t: 'date' }, { id: 'to', l: 'إلى تاريخ', t: 'date' }];
const fundF = { id: 'fund', l: 'الصندوق', t: 'sel', o: () => live('funds').map(f => [f.id, f.name]) };
const REPS = {
  donations: {
    t: 'تقرير التبرعات', d: 'تفاصيل التبرعات حسب الفترة والصندوق', ic: 'bi-cash-coin', col: '#198754', perm: 'reports.donations',
    f: [...dateF, fundF, { id: 'campaign', l: 'الحملة', t: 'sel', o: () => live('campaigns').map(f => [f.id, f.name]) }, { id: 'method', l: 'طريقة الدفع', t: 'sel', o: () => ['نقدي', 'تحويل', 'حوالة', 'شيك', 'أخرى'].map(x => [x, x]) }],
    b: v => { const R = live('donations').filter(d => okD(d) && inRange(d.date, v) && (!v.fund || d.fund === v.fund) && (!v.campaign || d.campaign === v.campaign) && (!v.method || d.method === v.method)).sort((a, b) => a.date.localeCompare(b.date)); return { head: ['رقم الوصل', 'التاريخ', 'المتبرع', 'الصندوق', 'الحملة', 'الدفع', 'المبلغ'], rows: R.map(d => [rcNo(d), fd(d.date), nm('donors', d.donor), nm('funds', d.fund), nm('campaigns', d.campaign, ''), d.method, num(d.amount)]), num: [6], sum: [['عدد التبرعات', R.length], ['الإجمالي (د.ع)', money(sum(R))]], foot: ['', '', '', '', '', 'الإجمالي', sum(R)] }; },
  },
  expenses: {
    t: 'تقرير الصرفيات', d: 'تفاصيل الصرفيات حسب الفترة والحالة', ic: 'bi-cash', col: '#dc3545', perm: 'reports.expenses',
    f: [...dateF, fundF, { id: 'status', l: 'الحالة', t: 'sel', o: () => [['معتمدة', 'معتمدة'], ['بانتظار الموافقة', 'بانتظار الموافقة']] }],
    b: v => { const R = live('expenses').filter(e => inRange(e.date, v) && (!v.fund || e.fund === v.fund) && (!v.status || (e.status || 'معتمدة') === v.status)).sort((a, b) => a.date.localeCompare(b.date)); return { head: ['التاريخ', 'البند', 'الصندوق', 'المستفيد', 'المشروع', 'الحالة', 'المبلغ'], rows: R.map(e => [fd(e.date), e.title, nm('funds', e.fund), nm('beneficiaries', e.ben, ''), nm('projects', e.project, ''), e.status || 'معتمدة', num(e.amount)]), num: [6], sum: [['عدد الصرفيات', R.length], ['الإجمالي المعتمد (د.ع)', money(sum(R.filter(okE)))]], foot: ['', '', '', '', '', 'الإجمالي المعتمد', sum(R.filter(okE))] }; },
  },
  campaigns: {
    t: 'تقرير الحملات', d: 'أداء الحملات ونسب الإنجاز', ic: 'bi-megaphone', col: '#6c5ce7', perm: 'reports.campaigns',
    f: [{ id: 'status', l: 'الحالة', t: 'sel', o: () => ['نشطة', 'مكتملة', 'متوقفة'].map(x => [x, x]) }],
    b: v => { const R = live('campaigns').filter(c => !v.status || campStatus(c) === v.status); return { head: ['الحملة', 'الصندوق', 'الحالة', 'المستهدف', 'المجموع', 'الإنجاز', 'عدد التبرعات', 'المتبرعون', 'المصروف'], rows: R.map(c => { const D = S.donations.filter(d => okD(d) && d.campaign === c.id); return [c.name, nm('funds', c.fund), campStatus(c), num(c.goal), campRaised(c.id), num(c.goal) ? Math.round(campRaised(c.id) / c.goal * 100) + '%' : '—', D.length, new Set(D.map(d => d.donor)).size, campSpent(c.id)]; }), num: [3, 4, 8], sum: [['عدد الحملات', R.length], ['إجمالي المجموع (د.ع)', money(sum(R, c => campRaised(c.id)))]] }; },
  },
  funds: {
    t: 'تقرير الصناديق', d: 'أرصدة الصناديق والحركات المالية', ic: 'bi-safe', col: '#0dcaf0', perm: 'reports.funds', f: [],
    b: () => { const R = live('funds'); return { head: ['الصندوق', 'النوع', 'الافتتاحي', 'التبرعات', 'الصرفيات', 'تحويل وارد', 'تحويل صادر', 'مقيّد بحملات', 'الرصيد'], rows: R.map(f => [f.name, f.type || '', num(f.open), sum(S.donations.filter(d => okD(d) && d.fund === f.id)), sum(S.expenses.filter(e => okE(e) && e.fund === f.id)), sum(S.transfers.filter(t => !t.deleted && t.to === f.id)), sum(S.transfers.filter(t => !t.deleted && t.from === f.id)), restrictedIn(f.id), fundBal(f.id)]), num: [2, 3, 4, 5, 6, 7, 8], sum: [['عدد الصناديق', R.length], ['إجمالي الأرصدة (د.ع)', money(sum(R, f => fundBal(f.id)))]], foot: ['الإجمالي', '', ...[2, 3, 4, 5, 6, 7, 8].map(i => 0)] }; },
  },
  beneficiaries: {
    t: 'تقرير المستفيدين', d: 'العائلات والأفراد والمبالغ المصروفة', ic: 'bi-people-fill', col: '#ffc107', perm: 'reports.beneficiaries',
    f: [{ id: 'area', l: 'المنطقة', t: 'sel', o: () => live('areas').map(f => [f.id, f.name]) }, { id: 'status', l: 'الحالة', t: 'sel', o: () => ['نشط', 'متوقف', 'معلق'].map(x => [x, x]) }],
    b: v => { const R = live('beneficiaries').filter(b => (!v.area || b.area === v.area) && (!v.status || b.status === v.status)); const rec = b => sum(S.expenses.filter(e => okE(e) && e.ben === b.id)); return { head: ['المستفيد', 'الهاتف', 'العائلة', 'المنطقة', 'الأنواع', 'الحالة', 'المبلغ المصروف'], rows: R.map(b => [b.name, b.phone || '', nm('families', b.family, ''), nm('areas', b.area, ''), (b.cats || []).map(c => nm('cats', c, '')).join('، '), b.status, rec(b)]), num: [6], sum: [['عدد المستفيدين', R.length], ['عدد العائلات', new Set(R.map(b => b.family).filter(Boolean)).size], ['إجمالي المصروف (د.ع)', money(sum(R, rec))]], foot: ['', '', '', '', '', 'الإجمالي', sum(R, rec)] }; },
  },
  donors: {
    t: 'تقرير المتبرعين', d: 'أنشط المتبرعين وإجمالي تبرعاتهم', ic: 'bi-person-hearts', col: '#dc3545', perm: 'reports.donors', f: [...dateF],
    b: v => { const R = live('donors').map(d => { const D = S.donations.filter(x => okD(x) && x.donor === d.id && inRange(x.date, v)); return [d.name, d.phone || '', D.length, sum(D), D.map(x => x.date).sort().pop() || '']; }).filter(r => r[2]).sort((a, b) => b[3] - a[3]); return { head: ['المتبرع', 'الهاتف', 'عدد التبرعات', 'الإجمالي', 'آخر تبرع'], rows: R.map(r => [...r.slice(0, 4), fd(r[4])]), num: [3], sum: [['عدد المتبرعين', R.length], ['الإجمالي (د.ع)', money(sum(R, r => r[3]))]], foot: ['', 'الإجمالي', R.reduce((t, r) => t + r[2], 0), sum(R, r => r[3]), ''] }; },
  },
  monthly: {
    t: 'متابعة الجمع الشهري', d: 'منو دفع ومنو ما دفع بالشهر', ic: 'bi-calendar-check', col: '#6c5ce7', perm: 'reports.donations',
    f: [{ id: 'month', l: 'الشهر', t: 'month', def: () => td().slice(0, 7) }, { id: 'st', l: 'الحالة', t: 'sel', o: () => [['paid', 'دفعوا'], ['unpaid', 'لم يدفعوا']] }, { id: 'fund', ...fundF }],
    b: v => { const m = v.month || td().slice(0, 7); const R = live('donors').filter(d => d.status === 'مفعل').map(d => { const D = S.donations.filter(x => okD(x) && x.donor === d.id && ym(x.date) === m && (!v.fund || x.fund === v.fund)); return [d.name, d.phone || '', sum(D), D.map(x => x.date).sort().pop() || '', D.length ? 'دفع ✓' : 'لم يدفع ✗']; }).filter(r => !v.st || (v.st === 'paid') === (r[2] > 0)); const paid = R.filter(r => r[2] > 0); return { head: ['المتبرع', 'الهاتف', 'المبلغ', 'تاريخ الدفع', 'الحالة'], rows: R.map(r => [r[0], r[1], r[2], fd(r[3]), r[4]]), num: [2], sum: [['دفعوا', paid.length], ['لم يدفعوا', R.length - paid.length], ['الإجمالي (د.ع)', money(sum(paid, r => r[2]))]] }; },
  },
  summary: {
    t: 'الملخص المالي', d: 'تقرير شامل للإيرادات والمصروفات', ic: 'bi-clipboard-data', col: '#212529', perm: 'reports.summary', f: [...dateF],
    b: v => {
      const D = S.donations.filter(d => okD(d) && inRange(d.date, v)), E = S.expenses.filter(e => okE(e) && inRange(e.date, v));
      const months = [...new Set([...D, ...E].map(x => ym(x.date)))].sort().slice(-12);
      const rows = live('funds').map(f => [f.name, sum(D.filter(d => d.fund === f.id)), sum(E.filter(e => e.fund === f.id)), sum(D.filter(d => d.fund === f.id)) - sum(E.filter(e => e.fund === f.id)), fundBal(f.id)]);
      return { head: ['الصندوق', 'الإيرادات', 'المصروفات', 'الصافي (الفترة)', 'الرصيد الحالي'], rows, num: [1, 2, 3, 4], sum: [['الإيرادات (د.ع)', money(sum(D))], ['المصروفات (د.ع)', money(sum(E))], ['الصافي (د.ع)', money(sum(D) - sum(E))]], foot: ['الإجمالي', sum(D), sum(E), sum(D) - sum(E), sum(live('funds'), f => fundBal(f.id))], chart: months.map(m => [m, sum(D.filter(d => ym(d.date) === m)), sum(E.filter(e => ym(e.date) === m))]) };
    },
  },
};
const repOk = k => can('reports.access') && can(REPS[k].perm);
function reports() {
  if (!can('reports.access')) return noAccess();
  return `<h2><i class="bi bi-graph-up"></i> التقارير</h2><div class="grid">${Object.entries(REPS).filter(([k]) => repOk(k)).map(([k, r]) => `<div class="card rep" onclick="RF.id='';go('rep-${k}')"><i class="bi ${r.ic}" style="color:${r.col}"></i><b>${r.t}</b><div class="sm">${r.d}</div></div>`).join('')}</div>`;
}
function reportPage(k) {
  const R = REPS[k]; if (!R || !repOk(k)) return noAccess();
  if (RF.id !== k) { RF.id = k; RF.v = {}; R.f.forEach(f => { if (f.def) RF.v[f.id] = f.def(); }); }
  const data = R.b(RF.v), fl = R.f.map(f => `<div><label class="f">${f.l}</label>${f.t === 'sel' ? `<select onchange="RF.v['${f.id}']=this.value;render(true)"><option value="">الكل</option>${f.o().map(([v, l]) => `<option value="${esc(v)}" ${RF.v[f.id] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : `<input type="${f.t}" value="${esc(RF.v[f.id] || '')}" onchange="RF.v['${f.id}']=this.value;render(true)">`}</div>`).join('');
  const ft = data.foot ? (k === 'funds' ? ['الإجمالي', '', ...[2, 3, 4, 5, 6, 7, 8].map(i => sum(data.rows, r => r[i]))] : data.foot) : null;
  const tbl = `<table><tr><th>#</th>${data.head.map(h => `<th>${h}</th>`).join('')}</tr>${data.rows.map((r, i) => `<tr><td>${i + 1}</td>${r.map((c, j) => `<td>${data.num && data.num.includes(j) ? money(c) : esc(c)}</td>`).join('')}</tr>`).join('')}${ft && data.rows.length ? `<tr style="font-weight:700;background:var(--hi)"><td></td>${ft.map((c, j) => `<td>${typeof c === 'number' ? money(c) : esc(c)}</td>`).join('')}</tr>` : ''}</table>${data.rows.length ? '' : '<div class="em"><i class="bi bi-inbox"></i>لا توجد بيانات ضمن الفلاتر المحددة</div>'}`;
  const chart = data.chart && data.chart.length ? (() => { const mx = Math.max(1, ...data.chart.flatMap(c => [c[1], c[2]])); return `<div class="card"><b>الإيرادات والمصروفات شهرياً</b><div class="chart">${data.chart.map(c => `<div><i style="height:${c[1] / mx * 100}%;background:var(--ok)" title="إيرادات ${money(c[1])}"></i><i style="height:${c[2] / mx * 100}%;background:var(--bad)" title="مصروفات ${money(c[2])}"></i></div>`).join('')}</div><div class="cl">${data.chart.map(c => `<span>${c[0].slice(2)}</span>`).join('')}</div><div class="legend"><span><i style="background:var(--ok)"></i>الإيرادات</span><span><i style="background:var(--bad)"></i>المصروفات</span></div></div>`; })() : '';
  return `<h2><i class="bi ${R.ic}" style="color:${R.col}"></i> ${R.t}</h2><button class="btn o" onclick="go('reports')" style="margin-bottom:10px"><i class="bi bi-arrow-right"></i> كل التقارير</button>
${fl ? `<div class="card"><div class="grid">${fl}</div></div>` : ''}<div class="stat" style="grid-template-columns:repeat(${data.sum.length},1fr)">${data.sum.map(s => `<div><b>${s[1]}</b><span>${s[0]}</span></div>`).join('')}</div>${chart}
<div class="card ov" id="rtab">${tbl}</div><div class="grid"><button class="btn g" onclick="repExport('${k}')"><i class="bi bi-file-earmark-excel"></i> تصدير Excel</button><button class="btn d" onclick="repPrint('${k}')"><i class="bi bi-file-earmark-pdf"></i> طباعة / PDF</button></div>`;
}
function repExport(k) {
  const R = REPS[k], d = R.b(RF.v), ft = d.foot ? (k === 'funds' ? ['الإجمالي', '', ...[2, 3, 4, 5, 6, 7, 8].map(i => sum(d.rows, r => r[i]))] : d.foot) : null;
  download(`${R.t}-${td()}.csv`, csv([[R.t, S.P.name, fd(td())], d.head, ...d.rows, ...(ft ? [ft] : [])])); logOp('تصدير', 'التقارير', R.t);
}
function repPrint(k) {
  const R = REPS[k], d = R.b(RF.v);
  $('#printarea').innerHTML = `<div class="rptp"><h2 style="margin:0">${esc(S.P.name)}</h2><h3 style="margin:4px 0">${R.t}</h3><div class="sm">${fd(td())}</div><p>${d.sum.map(s => `<b>${s[0]}:</b> ${s[1]}`).join(' &nbsp; | &nbsp; ')}</p><table border="1" cellspacing="0" cellpadding="4" style="width:100%;border-collapse:collapse"><tr><th>#</th>${d.head.map(h => `<th>${h}</th>`).join('')}</tr>${d.rows.map((r, i) => `<tr><td>${i + 1}</td>${r.map((c, j) => `<td>${d.num && d.num.includes(j) ? money(c) : esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`;
  setPageStyle('A4', 'portrait'); setTimeout(() => print(), 60);
}
function setPageStyle(size, orient) { let s = $('#pgstyle'); if (!s) { s = document.createElement('style'); s.id = 'pgstyle'; document.head.append(s); } s.textContent = `@page{size:${size} ${orient};margin:0}`; }

/* ---------- سجل العمليات ---------- */
const AU = { q: '', op: '', sec: '', user: '', from: '', to: '', size: 25, page: 1 };
function audit() {
  if (!can('system.audit')) return noAccess();
  const ops = [...new Set(S.log.map(l => l.op))], secs = [...new Set(S.log.map(l => l.section))], us = [...new Set(S.log.map(l => l.uname))].filter(Boolean);
  const sel = (id, l, arr) => `<select onchange="AU.${id}=this.value;AU.page=1;auRefresh()"><option value="">${l}</option>${arr.map(x => `<option ${AU[id] === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  return `<h2><i class="bi bi-clock-history"></i> سجل العمليات</h2><div class="card"><input placeholder="اسم، رقم وصل، مبلغ..." value="${esc(AU.q)}" oninput="AU.q=this.value;AU.page=1;clearTimeout(auT);auT=setTimeout(auRefresh,160)"><div class="grid">${sel('op', 'العملية', ops)}${sel('sec', 'القسم', secs)}${sel('user', 'المستخدم', us)}<select onchange="AU.size=+this.value;AU.page=1;auRefresh()">${[25, 50, 100].map(n => `<option ${AU.size === n ? 'selected' : ''}>${n}</option>`).join('')}</select><input type="date" value="${AU.from}" onchange="AU.from=this.value;auRefresh()"><input type="date" value="${AU.to}" onchange="AU.to=this.value;auRefresh()"></div><div class="sm ct" id="aucnt"></div></div><div class="card ov" id="autab"></div>`;
}
let auT;
function auRefresh() {
  const dt = l => { const d = new Date(l.ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const q = AU.q.trim().toLowerCase(), R = [...S.log].sort((a, b) => b.ts - a.ts).filter(l => (!AU.op || l.op === AU.op) && (!AU.sec || l.section === AU.sec) && (!AU.user || l.uname === AU.user) && (!AU.from || dt(l) >= AU.from) && (!AU.to || dt(l) <= AU.to) && (!q || (l.label + ' ' + l.section + ' ' + l.uname).toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(R.length / AU.size)); if (AU.page > pages) AU.page = pages;
  const cur = R.slice((AU.page - 1) * AU.size, AU.page * AU.size), c = o => /حذف/.test(o) ? 'r' : /تعديل/.test(o) ? 'w' : /استعادة|تأكيد|موافقة/.test(o) ? 'i' : /دخول|خروج|تصدير/.test(o) ? 'x' : '';
  $('#aucnt').textContent = `النتائج: ${R.length}`;
  $('#autab').innerHTML = `<table><tr><th>#</th><th>العملية</th><th>القسم</th><th>السجل</th><th>الوقت</th></tr>${cur.map((l, i) => `<tr><td>${(AU.page - 1) * AU.size + i + 1}</td><td><span class="bg ${c(l.op)}" ${/تعديل/.test(l.op) ? 'style="color:#000"' : ''}>${esc(l.op)}</span></td><td>${esc(l.section)}</td><td>${esc(l.label)}<br><small style="color:var(--p)">${esc(l.uname)}</small></td><td><span dir="ltr">${new Date(l.ts).toLocaleString('en-GB')}</span></td></tr>`).join('')}</table>${R.length ? '' : '<div class="em"><i class="bi bi-inbox"></i>لا توجد عمليات</div>'}${pages > 1 ? `<div class="pg">${Array.from({ length: pages }, (_, i) => i + 1).filter(i => i === 1 || i === pages || Math.abs(i - AU.page) <= 1).map(i => `<button class="${i === AU.page ? 'on' : ''}" onclick="AU.page=${i};auRefresh()">${i}</button>`).join('')}</div>` : ''}`;
}

/* ---------- الإشعارات ---------- */
function notifs() {
  const L = myNf().slice(0, 100), n = unread();
  return `<h2><i class="bi bi-bell"></i> الإشعارات</h2>${L.length ? `<div class="tb"><button class="btn o" onclick="nfRead()"><i class="bi bi-check2-all"></i> تعليم الكل كمقروء (${n})</button></div>` : ''}<div class="card">${L.length ? L.map(x => { const un = !(x.read || {})[ME.email]; return `<div style="padding:8px 4px;border-bottom:1px solid var(--b);${un ? 'background:var(--hi);border-radius:8px;' : ''}cursor:pointer" onclick="nfRead('${x.id}')">${un ? '<span class="bg p" style="float:inline-start">جديد</span>' : ''}${esc(x.msg)}<br><span class="sm">${esc(x.byName || '')} · ${new Date(x.ts).toLocaleString('en-GB')}</span></div>`; }).join('') : '<div class="em"><i class="bi bi-inbox"></i>لا توجد إشعارات — ستظهر هنا عند إضافة تبرعات أو صرفيات</div>'}</div>`;
}
function nfRead(id) { const t = Date.now(); (id ? S.nf.filter(x => x.id === id) : S.nf).forEach(x => { x.read = { ...(x.read || {}), [ME.email]: true }; x._u = t; }); save(); render(true); }

/* ---------- تسجيل الدخول ---------- */
function login() {
  return `<div class="lg"><div class="card ct"><div class="logo" style="font-size:36px;color:#0b6b63;justify-content:center">تكافل <i class="bi bi-heart-pulse-fill" style="color:#0b6b63"></i></div><p class="sm">منصة إدارة العمل الخيري الشاملة</p><div id="le" style="display:none;background:#f8d7da;color:#842029;border-radius:9px;padding:8px;margin-bottom:8px;font-size:14px"></div><input id="lu" type="email" placeholder="البريد الإلكتروني" autocomplete="username" dir="ltr" style="text-align:start" onkeydown="if(event.key=='Enter')$('#lw').focus()"><input id="lw" type="password" placeholder="كلمة المرور" autocomplete="current-password" onkeydown="if(event.key=='Enter')doLogin()"><label class="f" style="text-align:start;display:flex;gap:6px;align-items:center"><input type="checkbox" id="lr" checked> تذكرني</label><button class="btn" id="lb" style="background:#0b6b63" onclick="doLogin()"><i class="bi bi-box-arrow-in-right"></i> تسجيل الدخول</button><p><a style="color:#0b6b63;cursor:pointer" onclick="go('pub')">العودة للصفحة الرئيسية <i class="bi bi-arrow-left"></i></a></p></div></div>`;
}
