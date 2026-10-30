/* تكافل — النواة: الحالة، الصلاحيات، المزامنة، الإشعارات، الحسابات المالية */
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (+n || 0).toLocaleString('en-US');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const td = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fd = s => String(s || '').replace(/-/g, '/');
const ym = s => String(s || '').slice(0, 7);
let toastT;
function T(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 2600); }

/* ---------- الصلاحيات ---------- */
const ENTS = [['users', 'المستخدمين', 'مستخدم'], ['roles', 'قوالب الصلاحيات', 'قالب صلاحيات'], ['cats', 'التصنيفات', 'تصنيف'], ['areas', 'المناطق', 'منطقة'], ['families', 'العائلات', 'عائلة'], ['beneficiaries', 'المستفيدين', 'مستفيد'], ['donors', 'المتبرعين', 'متبرع'], ['funds', 'الصناديق', 'صندوق'], ['donations', 'التبرعات', 'تبرع'], ['expenses', 'الصرفيات', 'صرفية'], ['campaigns', 'الحملات', 'حملة'], ['projects', 'المشاريع', 'مشروع']];
const PERM_GROUPS = [
  ...ENTS.map(([k, pl, sg]) => [pl, [[k + '.view', 'عرض ' + pl], [k + '.create', 'إنشاء ' + sg], [k + '.edit', 'تعديل ' + sg], [k + '.delete', 'حذف ' + sg], ...(k === 'donations' ? [['donations.confirm', 'تأكيد استلام تبرع']] : []), ...(k === 'expenses' ? [['expenses.approve', 'الموافقة على صرفية']] : [])]]),
  ['التقارير', [['reports.access', 'الوصول للتقارير'], ['reports.donations', 'تقرير التبرعات'], ['reports.expenses', 'تقرير الصرفيات'], ['reports.campaigns', 'تقرير الحملات'], ['reports.funds', 'تقرير الصناديق'], ['reports.beneficiaries', 'تقرير المستفيدين'], ['reports.donors', 'تقرير المتبرعين'], ['reports.summary', 'الملخص المالي']]],
  ['الإعدادات', [['settings.org', 'إعدادات المؤسسة والوصولات'], ['settings.public', 'إعدادات الصفحة العامة']]],
  ['النظام', [['system.audit', 'سجل العمليات'], ['system.restore', 'استعادة المحذوفات']]]];
const ALL_PERMS = PERM_GROUPS.flatMap(g => g[1].map(x => x[0]));
const V_ = ALL_PERMS.filter(p => p.endsWith('.view') || p === 'reports.access' || p.startsWith('reports.'));
const only = (...ents) => ALL_PERMS.filter(p => ents.some(e => p.startsWith(e + '.')));
const DEF_ROLES = [
  ['مدير المؤسسة', ['*'], true],
  ['نائب المدير', ALL_PERMS.filter(p => !/^(users|roles)\.(create|edit|delete)$/.test(p) && p !== 'settings.org')],
  ['المحاسب', [...new Set([...only('funds', 'donations', 'expenses'), ...V_, 'campaigns.view', 'projects.view', 'donors.view', 'beneficiaries.view'])]],
  ['مسؤول المستفيدين', [...new Set([...only('families', 'beneficiaries', 'areas'), 'cats.view', 'reports.access', 'reports.beneficiaries'])]],
  ['مسؤول الحملات', [...new Set([...only('campaigns', 'projects'), 'donors.view', 'funds.view', 'donations.view', 'reports.access', 'reports.campaigns'])]],
  ['مدخل بيانات', ALL_PERMS.filter(p => /\.(view|create)$/.test(p) && !/^(users|roles|reports|cats)/.test(p) && p !== 'reports.access')],
  ['مراقب', V_.filter(p => !/^(users|roles)\./.test(p))],
];

/* ---------- الحالة ---------- */
const COLL = ['funds', 'donors', 'areas', 'families', 'beneficiaries', 'campaigns', 'projects', 'donations', 'expenses', 'transfers', 'users', 'roles', 'cats', 'log', 'nf'];
const CAT_GROUPS = [['benef', 'أنواع المستفيدين'], ['marital', 'الحالة الاجتماعية'], ['job', 'حالة التوظيف'], ['edu', 'المستوى التعليمي'], ['fund', 'أنواع الصناديق'], ['donor', 'أنواع المتبرعين'], ['pay', 'طرق الدفع'], ['freq', 'فترات التكرار'], ['exp', 'أنواع الصرفيات'], ['camp', 'أنواع الحملات'], ['season', 'المواسم'], ['proj', 'أنواع المشاريع'], ['pmove', 'أنواع حركات المشاريع']];
const _R = '#dc3545', _Y = '#ffc107', _S = '#0dcaf0', _G = '#6c757d', _B = '#0d6efd', _D = '#212529', _K = '#198754';
const DEF_CATS = {
  benef: [['يتيم', _R, 'bi-person-hearts'], ['أرملة', _Y, 'bi-person'], ['فقير', _S, 'bi-house-exclamation'], ['ذو إعاقة', _G, 'bi-person-wheelchair'], ['طالب علم', _B, 'bi-mortarboard'], ['مسن', _D, ''], ['مريض', _R, 'bi-hospital'], ['أخرى', _G, 'bi-three-dots']],
  marital: [['أعزب/عزباء', _S, ''], ['متزوج/ة', _K, ''], ['مطلق/ة', _Y, ''], ['أرمل/ة', _R, '']],
  job: [['موظف', _K, ''], ['عاطل عن العمل', _R, ''], ['طالب', _S, ''], ['متقاعد', _G, ''], ['ذو إعاقة', _Y, ''], ['عامل حر', _B, ''], ['ربة منزل', _S, '']],
  edu: [['أمي', _D, ''], ['يقرأ ويكتب', _G, ''], ['ابتدائي', _S, ''], ['متوسط', _B, ''], ['إعدادي', _K, ''], ['دبلوم', _Y, ''], ['بكالوريوس', _B, ''], ['دراسات عليا', _R, '']],
  fund: [['صندوق عام', _B, 'bi-box-seam'], ['صندوق الأيتام', _R, 'bi-person-hearts'], ['صندوق الطوارئ', _Y, 'bi-exclamation-triangle'], ['صندوق موسمي', _S, 'bi-calendar-event'], ['صندوق استثماري', _K, 'bi-graph-up-arrow']],
  donor: [['فرد', _B, 'bi-person'], ['شركة', _K, 'bi-building'], ['جهة', _S, 'bi-bank']],
  pay: [['نقدي', _K, 'bi-cash'], ['تحويل مصرفي', _B, 'bi-bank'], ['صك / شيك', _S, 'bi-receipt'], ['دفع إلكتروني', _Y, 'bi-credit-card'], ['عيني (مواد)', _G, 'bi-box'], ['زين كاش', _K, 'bi-phone'], ['آسيا حوالة', _B, 'bi-arrow-left-right']],
  freq: [['أسبوعي', _S, ''], ['شهري', _B, ''], ['ربع سنوي', _K, ''], ['نصف سنوي', _Y, ''], ['سنوي', _R, '']],
  exp: [['مساعدة مباشرة', _K, 'bi-hand-thumbs-up'], ['راتب / كفالة شهرية', _B, 'bi-wallet2'], ['مشروع خيري', _S, 'bi-building'], ['مصاريف تشغيلية', _G, 'bi-gear'], ['طوارئ', _R, 'bi-exclamation-diamond'], ['إيجار', _Y, 'bi-house'], ['علاج طبي', _R, 'bi-hospital'], ['رسوم دراسية', _B, 'bi-mortarboard']],
  camp: [['حملة عامة', _B, 'bi-megaphone'], ['حملة شخصية', _S, 'bi-person-standing'], ['حملة عائلية', _K, 'bi-people'], ['حملة موسمية', _Y, 'bi-calendar-event'], ['حملة طوارئ', _R, 'bi-exclamation-circle'], ['حملة استثمارية', _K, 'bi-graph-up']],
  season: [['شهر رمضان', _K, 'bi-moon-stars'], ['عيد الفطر', _B, 'bi-gift'], ['عيد الأضحى', _S, 'bi-gift-fill'], ['محرم / عاشوراء', _D, 'bi-calendar'], ['موسم الشتاء', _S, 'bi-snow'], ['موسم الصيف', _Y, 'bi-sun'], ['بداية العام الدراسي', _B, 'bi-backpack']],
  proj: [['مشروع استثماري', _K, 'bi-graph-up'], ['مشروع إنشائي', _B, 'bi-buildings'], ['مشروع تعليمي', _S, 'bi-book'], ['مشروع صحي', _R, 'bi-hospital'], ['مشروع زراعي', _K, 'bi-tree']],
  pmove: [['استثمار', _B, 'bi-arrow-down-circle'], ['مصروف', _R, 'bi-arrow-up-circle'], ['إيراد', _K, 'bi-arrow-down-circle-fill']],
};
/* الحقول التي تحفظ اسم التصنيف (لمنع الحذف أثناء الاستخدام وتحديث الاسم عند إعادة التسمية) */
const CAT_USE = { marital: [['beneficiaries', 'marital']], job: [['beneficiaries', 'job']], edu: [['beneficiaries', 'edu']], fund: [['funds', 'type']], donor: [['donors', 'type']], pay: [['donations', 'method']], exp: [['expenses', 'type']], camp: [['campaigns', 'type']], season: [['campaigns', 'season']], proj: [['projects', 'type']] };
const seedCats = (g, t) => DEF_CATS[g].map((c, i) => ({ id: 'c_' + g + '_' + i, grp: g, name: c[0], color: c[1], icon: c[2], status: 'مفعل', _c: t + i, _u: t }));
const catsOf = g => S.cats.filter(c => !c.deleted && (c.grp || 'benef') === g).sort((a, b) => a._c - b._c);
const catOpts = g => () => catsOf(g).filter(c => c.status === 'مفعل').map(c => c.name);
const COLORS = [['أحمر', '#dc3545'], ['أصفر', '#ffc107'], ['سماوي', '#0dcaf0'], ['رمادي', '#6c757d'], ['أزرق', '#0d6efd'], ['غامق', '#212529'], ['أخضر', '#198754'], ['بنفسجي', '#6f42c1'], ['برتقالي', '#fd7e14']];
const DEF_R = { tpl: 1, size: 'A5', orient: 'portrait', copies: 2, mode: 'same', els: { logo: 1, qr: 1, sign: 1, stamp: 1, words: 1, rcv: 1, notes: 1 } };
const DEF_P = { name: 'مؤسستي الخيرية', about: '', sections: {}, statsDetail: {}, fin: false, slider: [], videos: [], social: {}, phone: '', email: '', site: '', address: '', city: 'بغداد', province: 'بغداد', logo: '', cover: '' };
function freshState() {
  const t = Date.now(), S = {};
  COLL.forEach(c => S[c] = []);
  S.roles = DEF_ROLES.map((r, i) => ({ id: i ? 'r_' + uid() : 'r_admin', name: r[0], perms: r[1], sys: !!r[2], _c: t + i, _u: t }));
  S.cats = CAT_GROUPS.flatMap(g => seedCats(g[0], t));
  S.funds = [{ id: 'f_' + uid(), name: 'الصندوق العام', type: 'صندوق عام', open: 0, status: 'مفعل', _c: t, _u: t }];
  S.R = { ...DEF_R, _u: 0 }; S.P = { ...DEF_P, _u: 0 }; S.NS = {};
  return S;
}
/* ترحيل البيانات القديمة: نسب التصنيفات القديمة لمجموعة المستفيدين وإضافة المجموعات الناقصة */
function migrateCats() {
  const t = Date.now(); let ch = false;
  S.cats.forEach(c => { if (!c.grp) { c.grp = 'benef'; c._u = t; ch = true; } });
  CAT_GROUPS.forEach(g => { if (!S.cats.some(c => c.grp === g[0])) { S.cats.push(...seedCats(g[0], t)); ch = true; } });
  return ch;
}
let S = freshState(), ME = null, TOK = '', AUTH = false, PUB = null;
const live = c => S[c].filter(x => !x.deleted);
const get = (c, id) => S[c].find(x => x.id === id);
const nm = (c, id, d = '—') => { const r = get(c, id); return r ? r.name : d; };
const touch = r => { r._u = Date.now(); return r; };
const can = k => !!ME && (ME.perms.has('*') || ME.perms.has(k));
const canAny = (e, ...a) => a.some(x => can(e + '.' + x));

/* ---------- الاتصال بالخادم ---------- */
async function API(p, o = {}) {
  const r = await fetch('/api' + p, { ...o, headers: { 'Content-Type': 'application/json', ...(TOK ? { Authorization: 'Bearer ' + TOK } : {}) } });
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok) { const e = new Error((j && j.error) || r.status); e.status = r.status; throw e; }
  return j;
}
function mergeLocal(srv) {
  const isNew = {};
  for (const c of COLL) {
    const m = new Map(S[c].map(x => [x.id, x]));
    for (const x of srv[c] || []) {
      const o = m.get(x.id);
      if (!o) { m.set(x.id, x); if (c === 'nf') isNew[x.id] = x; }
      else if (c === 'nf') o.read = { ...(x.read || {}), ...(o.read || {}) };
      else if ((x._u || 0) > (o._u || 0)) m.set(x.id, x);
    }
    S[c] = [...m.values()].sort((a, b) => (a._c || 0) - (b._c || 0) || (a.id < b.id ? -1 : 1));
  }
  for (const k of ['R', 'P']) if (srv[k] && (srv[k]._u || 0) >= ((S[k] || {})._u || 0)) S[k] = srv[k];
  S.NS = { ...(srv.NS || {}), ...Object.fromEntries(Object.entries(S.NS || {}).filter(([e, v]) => !(srv.NS || {})[e] || (v._u || 0) > srv.NS[e]._u)) };
  return isNew;
}
let syncing = false, again = false, saveT, LASTJ = '';
const snap = () => JSON.stringify(S);
async function sync(quiet) {
  if (!AUTH) return;
  if (syncing) { again = true; return; }
  syncing = true;
  try {
    const d = await API('/state', { method: 'PUT', body: JSON.stringify({ S }) });
    const before = snap(), nw = mergeLocal(d.S);
    deliver(nw);
    if (snap() !== before && !$('.m') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) render(true);
    LASTJ = snap();
  } catch (e) {
    if (e.status === 401) { doLogout(true); }
    else if (!quiet) T('⚠️ تعذّر الحفظ على الخادم — سيُعاد المحاولة');
  } finally { syncing = false; if (again) { again = false; sync(true); } }
}
function save() { clearTimeout(saveT); saveT = setTimeout(sync, 350); }
setInterval(() => { if (AUTH && !document.hidden) sync(true); }, 25000);

/* ---------- السجل والإشعارات ---------- */
function logOp(op, section, label) {
  const t = Date.now();
  S.log.push({ id: 'l_' + uid(), _c: t, _u: t, op, section, label: String(label ?? ''), user: ME ? ME.email : '', uname: ME ? ME.name : '', ts: t });
}
const NG = [
  ['donations', 'التبرعات', 'bi-cash-coin', [['new', 'تبرع جديد'], ['edit', 'تعديل تبرع'], ['del', 'حذف تبرع'], ['restore', 'استعادة تبرع']]],
  ['expenses', 'الصرفيات', 'bi-cash', [['new', 'صرفية جديدة'], ['edit', 'تعديل صرفية'], ['del', 'حذف صرفية'], ['restore', 'استعادة صرفية']]],
  ['campaigns', 'الحملات', 'bi-megaphone', [['new', 'حملة جديدة'], ['edit', 'تعديل حملة'], ['del', 'حذف حملة'], ['restore', 'استعادة حملة'], ['goal', 'حملة وصلت هدفها']]],
  ['projects', 'المشاريع', 'bi-building-gear', [['new', 'مشروع جديد'], ['edit', 'تعديل مشروع'], ['del', 'حذف مشروع'], ['restore', 'استعادة مشروع']]],
  ['donors', 'المتبرعين', 'bi-person-hearts', [['new', 'متبرع جديد'], ['edit', 'تعديل متبرع'], ['del', 'حذف متبرع'], ['restore', 'استعادة متبرع']]],
  ['beneficiaries', 'المستفيدين', 'bi-people-fill', [['new', 'مستفيد جديد'], ['edit', 'تعديل مستفيد'], ['del', 'حذف مستفيد'], ['restore', 'استعادة مستفيد']]],
  ['families', 'العائلات', 'bi-house-heart', [['new', 'عائلة جديدة'], ['edit', 'تعديل عائلة'], ['del', 'حذف عائلة'], ['restore', 'استعادة عائلة']]],
  ['funds', 'الصناديق', 'bi-safe', [['new', 'صندوق جديد'], ['edit', 'تعديل صندوق'], ['del', 'حذف صندوق'], ['restore', 'استعادة صندوق'], ['xfer', 'تحويل أموال'], ['xfer_edit', 'تعديل تحويل'], ['xfer_del', 'حذف تحويل']]],
  ['users', 'المستخدمون', 'bi-person-gear', [['new', 'مستخدم جديد'], ['edit', 'تعديل مستخدم'], ['del', 'حذف مستخدم']]],
  ['areas', 'المناطق', 'bi-geo-alt', [['new', 'منطقة جديدة'], ['edit', 'تعديل منطقة'], ['del', 'حذف منطقة'], ['restore', 'استعادة منطقة']]],
];
const myNS = () => (S.NS && ME && S.NS[ME.email]) || { off: [] };
const nOn = k => !(myNS().off || []).includes(k);
function notify(key, msg) {
  const t = Date.now();
  S.nf.push({ id: 'n_' + uid(), _c: t, _u: t, key, msg, by: ME.email, byName: ME.name, ts: t, read: { [ME.email]: true } });
}
const myNf = () => S.nf.filter(n => nOn(n.key)).sort((a, b) => b.ts - a.ts);
const unread = () => myNf().filter(n => !(n.read || {})[ME.email]).length;
function deliver(nw) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  Object.values(nw).filter(n => n.by !== ME.email && nOn(n.key)).slice(-3).forEach(n => { try { new Notification('تكافل', { body: n.msg, icon: '/icon.svg', dir: 'rtl', lang: 'ar' }); } catch {} });
}

/* ---------- الحسابات المالية ---------- */
const num = v => +v || 0;
const okD = d => !d.deleted && d.status !== 'بانتظار التأكيد';
const okE = e => !e.deleted && e.status !== 'بانتظار الموافقة';
const sum = (a, f = x => x.amount) => a.reduce((t, x) => t + num(f(x)), 0);
const projCamp = pid => (get('projects', pid) || {}).camp;
const campRaised = (cid, ex) => sum(S.donations.filter(d => okD(d) && d.campaign === cid && d.id !== ex));
const campSpent = (cid, ex) => sum(S.expenses.filter(e => okE(e) && e.id !== ex && (e.campaign === cid || (e.project && projCamp(e.project) === cid))));
const campStatus = c => c.status === 'نشطة' && num(c.goal) > 0 && campRaised(c.id) >= num(c.goal) ? 'مكتملة' : c.status;
const fundBal = (fid, ex) => num((get('funds', fid) || {}).open)
  + sum(S.donations.filter(d => okD(d) && d.fund === fid && d.id !== ex)) - sum(S.expenses.filter(e => okE(e) && e.fund === fid && e.id !== ex))
  + sum(S.transfers.filter(t => !t.deleted && t.to === fid && t.id !== ex)) - sum(S.transfers.filter(t => !t.deleted && t.from === fid && t.id !== ex));
const restrictedOf = (c, ex) => Math.max(0, campRaised(c.id) - campSpent(c.id, ex));
const restrictedIn = (fid, ex) => sum(live('campaigns').filter(c => c.fund === fid && c.restricted), c => restrictedOf(c, ex));
// المتاح للصرف: الرصيد العام (دون الأموال المقيدة) + المتبقي من الحملة المقيّدة المرتبطة
function available(fid, cid, ex) {
  let a = fundBal(fid, ex) - restrictedIn(fid, ex);
  const c = cid && get('campaigns', cid);
  if (c && c.restricted && c.fund === fid) a += restrictedOf(c, ex);
  return a;
}
const rcNo = d => {
  const y = String(d.date || '').slice(0, 4), L = S.donations.filter(x => String(x.date || '').slice(0, 4) === y).sort((a, b) => (a._c || 0) - (b._c || 0) || (a.id < b.id ? -1 : 1));
  return `DON-${y}-${String(L.findIndex(x => x.id === d.id) + 1).padStart(4, '0')}`;
};
const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUND = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
const b1000 = n => { const h = Math.floor(n / 100), r = n % 100, p = []; if (h) p.push(HUND[h]); if (r) { if (r < 20) p.push(ONES[r]); else { const o = r % 10, t = Math.floor(r / 10); p.push(o ? ONES[o] + ' و' + TENS[t] : TENS[t]); } } return p.join(' و'); };
function words(n) {
  n = Math.floor(+n || 0); if (!n) return 'صفر';
  const sc = [[1e9, 'مليار', 'ملياران', 'مليارات'], [1e6, 'مليون', 'مليونان', 'ملايين'], [1e3, 'ألف', 'ألفان', 'آلاف']], out = [];
  for (const [v, s1, s2, sp] of sc) { const q = Math.floor(n / v); n %= v; if (!q) continue; out.push(q === 1 ? s1 : q === 2 ? s2 : q <= 10 ? b1000(q) + ' ' + sp : b1000(q) + ' ' + s1); }
  if (n) out.push(b1000(n));
  return out.join(' و');
}

/* ---------- النوافذ ---------- */
function modal(title, body, wide) {
  const d = document.createElement('div'); d.className = 'm' + (wide ? ' wide' : '');
  d.innerHTML = `<div><div class="hd"><span>${title}</span><i class="bi bi-x-lg x" onclick="closeM(this)"></i></div><div class="bd">${body}</div></div>`;
  document.body.append(d); return d;
}
const closeM = el => { const m = el ? el.closest('.m') : [...document.querySelectorAll('.m')].pop(); if (m) m.remove(); };
function confirmBox(msg, ok, label = 'تأكيد', cls = 'd') {
  const m = modal('<i class="bi bi-exclamation-triangle"></i> تأكيد', `<p>${msg}</p><div class="grid"><button class="btn ${cls}" id="cfy">${label}</button><button class="btn o" onclick="closeM(this)">إلغاء</button></div>`);
  m.querySelector('#cfy').onclick = () => { m.remove(); ok(); };
}
const th = () => { const r = document.documentElement; const n = r.dataset.theme === 'dark' ? 'light' : 'dark'; r.dataset.theme = n; try { localStorage.setItem('tk_theme', n); } catch {} };
try { const t = localStorage.getItem('tk_theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
const download = (name, text, type = 'text/csv;charset=utf-8') => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
const csv = rows => rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
const isUrl = u => /^https?:\/\/\S+$/i.test(u);
function videoEmbed(u) {
  let m;
  if ((m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(u))) return `https://www.youtube.com/embed/${m[1]}`;
  if (/facebook\.com|fb\.watch/.test(u)) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false`;
  return '';
}
