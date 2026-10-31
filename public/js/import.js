/* تكافل — استيراد المتبرعين من Excel / CSV مع التعرف الذكي على الأعمدة */
'use strict';
const IMP_MAX = 5000;
/* [الحقل، التسمية، نمط العنوان (بعد التطبيع)] */
const IMP_F = [
  ['name', 'الاسم', /اسم|name|متبرع|الكامل|full/],
  ['phone', 'رقم الهاتف', /هاتف|موبايل|مبايل|جوال|تلفون|mobile|phone|tel|whats|واتس|contact|تواصل/],
  ['addr', 'العنوان', /عنوان|سكن|منطقه|محله|address|location|(^|\s)حي(\s|$)/],
  ['city', 'المدينة', /مدينه|محافظه|city|province|قضاء/],
  ['email', 'البريد الإلكتروني', /بريد|ايميل|e-?mail|mail/],
  ['idno', 'رقم الهوية', /هويه|بطاقه|national|قومي|identity|^id$/],
  ['type', 'نوع المتبرع', /نوع|type|فئه/],
  ['notes', 'ملاحظات', /ملاحظ|notes?|remark|تعليق/],
];
let IMP = null;
const impN = s => String(s == null ? '' : s).trim().toLowerCase().replace(/[ً-ٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ');
const impDigits = s => String(s == null ? '' : s).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/\D/g, '');
function impPhone(v) {
  let d = impDigits(v); if (!d) return '';
  if (d.startsWith('00964')) d = d.slice(5); else if (d.startsWith('964')) d = d.slice(3);
  if (/^7\d{9}$/.test(d)) d = '0' + d;
  return d.length >= 7 ? d : '';
}
const impIsPhone = v => /^07\d{9}$/.test(impPhone(v));
const impIsMail = v => /^\S+@\S+\.\S+$/.test(String(v).trim());
const impLetters = v => /^[\p{L}\s.'\-]{3,}$/u.test(String(v).trim());
const impCol = i => { let s = '', n = i; do { s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };

function impCsv(t) {
  t = t.replace(/^﻿/, ''); const first = t.split(/\r?\n/)[0] || '';
  const d = [',', ';', '\t'].map(x => [x, first.split(x).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === d) { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; rows.push(r); r = []; }
    else c += ch;
  }
  if (c !== '' || r.length) { r.push(c); rows.push(r); }
  return rows;
}
const loadXLSX = () => window.XLSX ? Promise.resolve() : new Promise((ok, no) => {
  const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = () => no(new Error('xlsx')); document.head.append(s);
});
async function impRead(file) {
  if (/\.csv$|\.txt$/i.test(file.name)) {
    const buf = await file.arrayBuffer(); let t = new TextDecoder('utf-8').decode(buf);
    if (t.includes('�')) { try { t = new TextDecoder('windows-1256').decode(buf); } catch {} }
    return impCsv(t);
  }
  await loadXLSX();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  for (const n of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' });
    if (rows.some(r => r.some(c => String(c).trim()))) return rows;
  }
  return [];
}

/* التعرف الذكي: درجة (حقل، عمود) = تطابق العنوان + تحليل محتوى العمود */
function impAuto() {
  const R = IMP.rows, nc = Math.max(0, ...R.map(r => r.length)), sample = ci => R.slice(0, 200).map(r => r[ci]).filter(v => String(v == null ? '' : v).trim());
  const scores = [];
  for (let ci = 0; ci < nc; ci++) {
    const h = IMP.head[ci] ? impN(IMP.head[ci]) : '', v = sample(ci), n = v.length || 1;
    const ph = v.filter(impIsPhone).length / n, ml = v.filter(impIsMail).length / n, ls = v.filter(impLetters).length / n, w2 = v.filter(x => impLetters(x) && String(x).trim().split(/\s+/).length >= 2).length / n;
    const ad = v.filter(x => /\p{L}/u.test(x) && (/\d/.test(x) || /[,،\-\/]/.test(x) || String(x).length > 14) && !impIsMail(x)).length / n;
    for (const [f, , re] of IMP_F) {
      let hs = h && re.test(h) ? 10 : 0; if (f === 'name' && /نوع|type|فئه|ملاحظ|مدينه|محافظه|عنوان|بريد/.test(h)) hs = 0;
      let cs = 0;
      if (f === 'phone') cs = ph * 6; else if (f === 'email') cs = ml * 6; else if (f === 'name') cs = ls * 2 + w2 * 3 - ph * 5; else if (f === 'addr') cs = ad * 3 - ph * 5;
      const min = f === 'name' ? 4 : f === 'addr' ? 2.5 : 3.5;
      if (hs || cs >= min) scores.push([hs + cs, f, ci]);
    }
  }
  scores.sort((a, b) => b[0] - a[0]);
  const map = {}, used = new Set();
  for (const [, f, ci] of scores) { if (map[f] != null || used.has(ci)) continue; map[f] = ci; used.add(ci); }
  IMP.map = map; IMP.auto = { ...map };
}

function impBuild() {
  const M = IMP.map, g = (r, f) => M[f] != null && M[f] >= 0 ? String(r[M[f]] == null ? '' : r[M[f]]).trim() : '';
  const have = new Set(live('donors').map(d => normPhone(d.phone)).filter(Boolean)), haveN = new Set(live('donors').filter(d => !normPhone(d.phone)).map(d => impN(d.name)));
  const ok = [], dup = [], bad = []; let badMail = 0;
  const types = catOpts('donor')();
  IMP.rows.slice(IMP.hasHead ? 1 : 0).forEach(r => {
    if (!r.some(c => String(c == null ? '' : c).trim())) return;
    const name = g(r, 'name').replace(/\s+/g, ' '); if (name.length < 2) { bad.push(r); return; }
    let email = g(r, 'email'); if (email && !impIsMail(email)) { email = ''; badMail++; }
    const phone = impPhone(g(r, 'phone')), key = phone ? normPhone(phone) : '', nk = impN(name);
    let type = g(r, 'type'); if (type && !types.includes(type)) { const m = types.find(x => impN(x) === impN(type)); type = m || IMP.type || ''; } if (!type) type = IMP.type || '';
    const rec = { name, phone, addr: g(r, 'addr'), city: g(r, 'city'), email, idno: g(r, 'idno'), type, notes: g(r, 'notes') };
    if (IMP.skipDup && (key ? have.has(key) : haveN.has(nk))) { dup.push(rec); return; }
    if (key) have.add(key); else haveN.add(nk);
    ok.push(rec);
  });
  return { ok, dup, bad, badMail };
}

function impOpen() {
  if (!can('donors.create')) return T('⚠️ لا تملك صلاحية إضافة متبرعين');
  IMP = { rows: [], head: [], map: {}, auto: {}, hasHead: true, file: '', skipDup: true, type: '' };
  modal('<i class="bi bi-file-earmark-excel"></i> استيراد المتبرعين', `<div id="impBody">${impStart()}</div>`, true);
}
const impStart = () => `<div class="hint">ارفع ملف <b>Excel</b> (xlsx / xls) أو <b>CSV</b> يحتوي على الاسم والعنوان ورقم الهاتف — يتعرف النظام على الأعمدة تلقائياً حتى لو اختلفت أسماؤها أو ترتيبها، ويمكنك تعديل التعرف قبل الاستيراد.</div>
<label class="btn o" style="margin-top:10px;cursor:pointer"><i class="bi bi-upload"></i> اختيار ملف<input type="file" accept=".xlsx,.xls,.csv,.txt" hidden onchange="impPick(this)"></label>
<div class="hint" style="margin-top:8px">الحد الأقصى ${IMP_MAX} صف. الأسماء المكررة (بنفس رقم الهاتف) تُتخطى تلقائياً.</div>`;

async function impPick(inp) {
  const f = inp.files[0]; inp.value = ''; if (!f) return;
  $('#impBody').innerHTML = '<div class="em"><i class="bi bi-hourglass-split"></i>جارٍ قراءة الملف...</div>';
  try {
    let rows = (await impRead(f)).map(r => r.map(c => c == null ? '' : c));
    rows = rows.filter(r => r.some(c => String(c).trim()));
    if (!rows.length) { $('#impBody').innerHTML = impStart(); return T('⚠️ الملف فارغ'); }
    if (rows.length > IMP_MAX + 1) { rows = rows.slice(0, IMP_MAX + 1); T(`⚠️ سيُستورد أول ${IMP_MAX} صف فقط`); }
    const first = rows[0], pm = r => (r || []).some(c => impIsPhone(c) || impIsMail(c)), short = c => String(c).trim().length <= 25 && String(c).trim().split(/\s+/).length <= 3;
    const looks = !pm(first) && (first.some(c => short(c) && IMP_F.some(([, , re]) => re.test(impN(c)))) || pm(rows[1]));
    Object.assign(IMP, { rows, file: f.name, hasHead: looks, head: looks ? first.map(c => String(c).trim()) : [] });
    impAuto(); impRender();
  } catch (e) {
    $('#impBody').innerHTML = impStart();
    T(e && e.message === 'xlsx' ? '⚠️ تعذر تحميل مكتبة Excel — تحقق من الاتصال أو احفظ الملف بصيغة CSV' : '⚠️ تعذر قراءة الملف');
  }
}
function impRender() {
  const R = IMP.rows, nc = Math.max(0, ...R.map(r => r.length)), first = R[IMP.hasHead ? 1 : 0] || [];
  const opt = (f) => `<option value="-1">— تجاهل —</option>${Array.from({ length: nc }, (_, i) => `<option value="${i}" ${IMP.map[f] === i ? 'selected' : ''}>${impCol(i)}: ${esc(IMP.head[i] || 'عمود ' + (i + 1))}${first[i] ? ' — ' + esc(String(first[i]).slice(0, 22)) : ''}</option>`).join('')}`;
  const B = impBuild(), pv = B.ok.slice(0, 5), cols = IMP_F.filter(([f]) => IMP.map[f] != null && IMP.map[f] >= 0);
  const nameOk = IMP.map.name != null && IMP.map.name >= 0;
  $('#impBody').innerHTML = `<div class="sm"><i class="bi bi-file-earmark-excel"></i> <b>${esc(IMP.file)}</b> — ${R.length - (IMP.hasHead ? 1 : 0)} صف ${tg('imph', 'الصف الأول عناوين أعمدة', IMP.hasHead, '', 'impHead(this.checked)')}</div>
<div class="sec"><i class="bi bi-magic"></i> مطابقة الحقول <span class="bg p">تعرّف تلقائي</span></div>
<div class="grid">${IMP_F.map(([f, l]) => `<div><label class="f">${l}${f === 'name' ? ' <i>*</i>' : ''}${IMP.auto[f] != null && IMP.map[f] === IMP.auto[f] ? ' <i class="bi bi-check-circle-fill" style="color:var(--ok)"></i>' : ''}</label><select onchange="impSet('${f}',+this.value)">${opt(f)}</select></div>`).join('')}</div>
<div class="grid" style="margin-top:8px"><div><label class="f">النوع الافتراضي (إن لم يُحدَّد في الملف)</label><select onchange="IMP.type=this.value;impRender()"><option value="">— بدون —</option>${catOpts('donor')().map(x => `<option ${IMP.type === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div></div>
${tg('impdup', 'تخطي المتبرعين المكررين', IMP.skipDup, 'مطابقة برقم الهاتف (أو الاسم إن لم يوجد هاتف)', 'IMP.skipDup=this.checked;impRender()')}
${nameOk ? `<div class="sec"><i class="bi bi-eye"></i> معاينة</div><div class="card ov"><table><tr>${cols.map(([, l]) => `<th>${l}</th>`).join('')}</tr>${pv.map(r => `<tr>${cols.map(([f]) => `<td>${esc(r[f] || '—')}</td>`).join('')}</tr>`).join('')}</table></div>` : '<div class="warn"><i class="bi bi-exclamation-triangle"></i> اختر عمود «الاسم» للمتابعة</div>'}
<div class="sm ct" style="margin:8px 0"><span class="bg">✅ جديد: ${B.ok.length}</span> <span class="bg w">⚠️ مكرر: ${B.dup.length}</span> <span class="bg x">❌ بدون اسم: ${B.bad.length}</span>${B.badMail ? ` <span class="sm">(${B.badMail} بريد غير صالح تم تجاهله)</span>` : ''}</div>
<button class="btn" ${nameOk && B.ok.length ? '' : 'disabled'} onclick="impRun()"><i class="bi bi-lightning-charge-fill"></i> استيراد ${B.ok.length} متبرع</button>
<button class="btn o" style="margin-top:6px" onclick="$('#impBody').innerHTML=impStart()"><i class="bi bi-arrow-repeat"></i> اختيار ملف آخر</button>`;
}
function impSet(f, v) { if (v < 0) delete IMP.map[f]; else { Object.keys(IMP.map).forEach(k => { if (IMP.map[k] === v && k !== f) delete IMP.map[k]; }); IMP.map[f] = v; } impRender(); }
function impHead(on) {
  IMP.hasHead = on; IMP.head = on ? IMP.rows[0].map(c => String(c).trim()) : []; impAuto(); impRender();
}
function impRun() {
  if (!can('donors.create')) return T('⚠️ لا تملك الصلاحية');
  const B = impBuild(); if (!B.ok.length) return T('⚠️ لا توجد سجلات جديدة للاستيراد');
  const t = Date.now();
  B.ok.forEach((d, i) => S.donors.push({ id: 'd_' + uid() + i, _c: t + i, _u: t, status: 'مفعل', ...d }));
  logOp('إنشاء', 'إدارة المتبرعين', `استيراد ${B.ok.length} متبرع من ملف ${IMP.file}`);
  notify(nkey('donors', 'new'), `➕ تم استيراد ${B.ok.length} متبرع من ملف`);
  save(); closeM(); T(`✅ تم استيراد ${B.ok.length} متبرع${B.dup.length ? ` — تخطي ${B.dup.length} مكرر` : ''}`); render(true);
}
