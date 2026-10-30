/* تكافل — الإعدادات: الوصولات، العرض العام، الإشعارات */
'use strict';
const tg = (id, t, on, sub, oc) => `<label class="tg"><span>${t}${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''} ${oc ? `onchange="${oc}"` : ''}><i></i></label>`;
const clone = o => JSON.parse(JSON.stringify(o));

/* ===== الوصولات ===== */
let RD = null;
const TPL = [['كلاسيكي', 'جدول تقليدي مع حدود أنيقة', 'bi-table'], ['عصري', 'تصميم ملون بزوايا مدورة', 'bi-palette'], ['رسمي', 'إطار رسمي مع هيدر مميز', 'bi-award'], ['مختصر', 'حجم صغير — مثالي للنسخ المتعددة', 'bi-arrows-angle-contract']];
const ELS = [['logo', 'شعار المؤسسة', 'bi-image'], ['qr', 'رمز التحقق QR', 'bi-qr-code'], ['sign', 'خانة التوقيع', 'bi-pen'], ['stamp', 'خانة الختم', 'bi-patch-check'], ['words', 'المبلغ بالحروف', 'bi-type'], ['rcv', 'اسم المستلم', 'bi-person-check'], ['notes', 'الملاحظات', 'bi-sticky']];
function qrSvg(text) {
  try { if (window.qrcode) { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } } catch {}
  return '';
}
function rcOne(d, label, R) {
  const e = R.els, no = rcNo(d), logo = e.logo && S.P.logo ? `<img src="${esc(S.P.logo)}" alt="">` : '', t = R.tpl;
  const rows = [['رقم الوصل', `<span dir="ltr">${no}</span>`], ['التاريخ', fd(d.date)], ['المتبرع', esc(nm('donors', d.donor))], ['الصندوق', esc(nm('funds', d.fund))], ['الحملة', esc(nm('campaigns', d.campaign))], ['طريقة الدفع', esc(d.method || '—')]];
  const rowH = rows.map(r => `<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  const amt = `<div class="${t === 2 ? 'amt' : 'row amt'}">${t === 2 ? `<div style="font-size:11px;font-weight:400">المبلغ</div>${money(d.amount)}<div style="font-size:11px;font-weight:400">دينار عراقي</div>` : `<span>المبلغ</span><b>${money(d.amount)} دينار عراقي</b>`}</div>`;
  const qr = e.qr ? `<div><div class="qr">${qrSvg(location.origin + '/#verify:' + no) || 'QR'}</div></div>` : '';
  const sg = `<div class="sg"><div>${e.rcv ? `المستلم<br><b>${esc(d.by || (ME && ME.name) || '')}</b>` : ''}${e.sign ? '<div class="ln">التوقيع</div>' : ''}</div>${qr}<div>${e.stamp ? '<div class="stp">الختم</div><div>ختم المؤسسة</div>' : ''}</div></div>`;
  const head = t === 2 ? `<div class="org">${logo}<h4>${esc(S.P.name)}</h4><div class="tt">وصل استلام تبرع</div></div>` : `<div class="org"><div><h4>${esc(S.P.name)}</h4>${t === 3 ? '' : '<div class="tt">وصل استلام تبرع</div>'}</div>${logo}${t === 3 ? '<div class="tt">وصل استلام تبرع</div>' : ''}</div>`;
  const inner = (t === 2 ? '<div class="bd">' : '') + (t === 2 ? '' : head) + (t === 2 ? amt + rowH : rowH + amt) + (e.words ? `<div class="wd">فقط ${words(d.amount)} دينار عراقي لا غير</div>` : '') + (e.notes && d.notes ? `<div class="row"><span>ملاحظات: ${esc(d.notes)}</span></div>` : '') + sg + (t === 2 ? '</div>' : '');
  return `<div class="rcp t${t}">${label ? `<div class="lb">${label}</div>` : ''}${t === 2 ? head : ''}${inner}</div>`;
}
function rcPages(d, R) {
  const L = R.copies === 2 ? ['نسخة المؤسسة', 'نسخة المتبرع'] : [''];
  if (R.mode === 'separate' && L.length > 1) return L.map(l => rcOne(d, l, R));
  return [L.map(l => rcOne(d, l, R)).join(L.length > 1 ? '<div class="cutl">✂ قص هنا</div>' : '')];
}
const sampleDon = () => S.donations.find(d => !d.deleted) || { id: 'x', date: td(), donor: '', fund: '', amount: 500000, method: 'نقدي', notes: 'تبرع لحملة الشتاء', _c: 0, by: ME ? ME.name : '' };
function sampleFix(d) { return d.id === 'x' ? { ...d } : d; }
function receipts() {
  if (!can('settings.org')) return noAccess();
  if (!RD) RD = clone(S.R);
  return `<h2><i class="bi bi-receipt"></i> إعدادات الوصولات</h2>
<div class="card"><div class="hd"><i class="bi bi-palette"></i> اختر القالب</div><div class="grid" id="rtpl"></div></div>
<div class="card"><div class="hd"><i class="bi bi-printer"></i> إعدادات الطباعة</div><div class="grid"><div><label class="f">حجم الورقة</label><select onchange="RD.size=this.value;rcRefresh()"><option ${RD.size === 'A5' ? 'selected' : ''}>A5</option><option ${RD.size === 'A4' ? 'selected' : ''}>A4</option></select></div><div><label class="f">الاتجاه</label><select onchange="RD.orient=this.value;rcRefresh()"><option value="portrait" ${RD.orient === 'portrait' ? 'selected' : ''}>عمودي</option><option value="landscape" ${RD.orient === 'landscape' ? 'selected' : ''}>أفقي</option></select></div><div><label class="f">عدد النسخ</label><select onchange="RD.copies=+this.value;rcRefresh()"><option value="1" ${RD.copies === 1 ? 'selected' : ''}>نسخة واحدة</option><option value="2" ${RD.copies === 2 ? 'selected' : ''}>2 نسختان</option></select></div><div><label class="f">طريقة النسخ</label><select onchange="RD.mode=this.value;rcRefresh()"><option value="same" ${RD.mode === 'same' ? 'selected' : ''}>نفس الورقة</option><option value="separate" ${RD.mode === 'separate' ? 'selected' : ''}>ورقة منفصلة</option></select></div></div></div>
<div class="card"><div class="hd"><i class="bi bi-ui-checks"></i> عناصر الوصل</div><div class="grid">${ELS.map(x => tg('el_' + x[0], `<i class="bi ${x[2]}" style="color:var(--p)"></i> ${x[1]}`, RD.els[x[0]], '', `RD.els.${x[0]}=this.checked?1:0;rcRefresh()`)).join('')}</div><div class="warn"><i class="bi bi-lock-fill"></i> <b>إجبارية:</b> رقم الوصل، المبلغ، التاريخ، المؤسسة، الصندوق</div>${S.P.logo ? '' : '<div class="hint" style="margin-top:6px">لعرض الشعار على الوصل ارفعه من «إعدادات العرض العام».</div>'}</div>
<div class="card"><div class="hd"><i class="bi bi-eye"></i> <span id="rcT"></span></div><div class="pvbox" id="pv"></div></div><button class="btn" onclick="rcSave()"><i class="bi bi-check2-circle"></i> حفظ إعدادات الوصولات</button>`;
}
function rcRefresh() {
  if (!RD || !$('#pv')) return;
  $('#rtpl').innerHTML = TPL.map((x, i) => `<div class="tp ${RD.tpl === i + 1 ? 'on' : ''}" onclick="RD.tpl=${i + 1};rcRefresh()"><i class="bi ${x[2]}"></i><b>${x[0]}</b><div class="sm">${x[1]}</div>${RD.tpl === i + 1 ? '<span class="bg p"><i class="bi bi-check-lg"></i></span>' : ''}</div>`).join('');
  $('#rcT').innerHTML = `معاينة (${TPL[RD.tpl - 1][0]} | ${RD.size} | ${RD.orient === 'portrait' ? 'عمودي' : 'أفقي'} | ${RD.copies === 2 ? '2 ' + (RD.mode === 'same' ? 'بنفس الورقة' : 'بورقتين') : '1 نسخة'})`;
  $('#pv').innerHTML = rcPages(sampleFix(sampleDon()), RD).join('<div class="cutl" style="color:#555">— صفحة جديدة —</div>');
}
function rcSave() { S.R = { ...clone(RD), _u: Date.now() }; logOp('تعديل', 'إعدادات الوصولات', 'حفظ قالب الوصل'); save(); T('✅ تم حفظ إعدادات الوصولات'); }
function printReceipts(list) {
  const R = S.R; $('#printarea').innerHTML = list.flatMap(d => rcPages(d, R)).map(p => `<div class="pgbox">${p}</div>`).join('');
  setPageStyle(R.size, R.orient); setTimeout(() => print(), 80);
}
function rcPreview(id) {
  const d = get('donations', id), R = S.R;
  modal('<i class="bi bi-receipt"></i> وصل استلام تبرع', `<div class="pvbox">${rcPages(d, R).join('<div class="cutl" style="color:#555">— صفحة جديدة —</div>')}</div><button class="btn" style="margin-top:10px" onclick="printReceipts([get('donations','${id}')])"><i class="bi bi-printer"></i> طباعة</button>`);
}
document.addEventListener('DOMContentLoaded', () => { const s = document.querySelector('script[src*="qrcode"]'); if (s) s.addEventListener('load', () => { if (V === 'receipts') rcRefresh(); }); });

/* ===== إعدادات الصفحة العامة ===== */
let PD = null;
const SECS = [['about', 'عن المؤسسة', 'عرض وصف ومعلومات المؤسسة', 'bi-info-circle'], ['stats', 'الإحصائيات', 'أرقام الحملات والمشاريع', 'bi-bar-chart'], ['camps', 'الحملات النشطة', 'عرض قائمة حملات التبرع', 'bi-megaphone'], ['proj', 'المشاريع', 'عرض قائمة المشاريع', 'bi-building-gear'],
  ['gal', 'معرض الصور', 'عرض صور السلايدر', 'bi-images'], ['vid', 'الفيديوهات', 'يوتيوب وفيسبوك وغيرها', 'bi-play-circle'], ['cont', 'معلومات التواصل', 'الهاتف والعنوان والبريد', 'bi-telephone'], ['soc', 'روابط السوشال', 'فيسبوك، انستغرام، واتساب...', 'bi-share']];
const SOC = [['facebook', 'فيسبوك', 'bi-facebook'], ['instagram', 'انستغرام', 'bi-instagram'], ['telegram', 'تليگرام', 'bi-telegram'], ['whatsapp', 'واتساب', 'bi-whatsapp'], ['website', 'الموقع', 'bi-globe']];
function pdList(k, kind) {
  const arr = PD[k] || []; return `<div id="pl_${k}">${arr.length ? arr.map((u, i) => `<div class="lkl"><span>${esc(u)}</span><i class="bi bi-x-circle" onclick="pdDel('${k}',${i})"></i></div>`).join('') : `<div class="em" style="padding:10px"><i class="bi bi-${kind === 'img' ? 'image' : 'play-circle'}"></i>لا توجد ${kind === 'img' ? 'صور — أضف روابط صور أعلاه' : 'روابط — أضف أول رابط أعلاه'}</div>`}</div>`;
}
function pdAdd(k, kind) {
  const i = $('#pi_' + k), u = i.value.trim(); if (!u) return; if (!isUrl(u)) return T('⚠️ الرابط غير صحيح (يبدأ بـ https://)'); if (kind === 'vid' && !videoEmbed(u)) return T('⚠️ الفيديو غير مدعوم — استخدم رابط يوتيوب أو فيسبوك');
  PD[k] = PD[k] || []; if (PD[k].includes(u)) return T('⚠️ الرابط مضاف مسبقاً'); PD[k].push(u); i.value = ''; $('#pl_' + k).outerHTML = pdList(k, kind);
}
function pdDel(k, i) { PD[k].splice(i, 1); $('#pl_' + k).outerHTML = pdList(k, k === 'slider' ? 'img' : 'vid'); }
function pubSet() {
  if (!can('settings.public')) return noAccess();
  if (!PD) PD = clone(S.P);
  const on = k => PD.sections[k] !== false;
  return `<h2><i class="bi bi-globe-americas"></i> إعدادات الصفحة العامة</h2><button class="btn o" onclick="pubPreview()" style="margin-bottom:10px"><i class="bi bi-eye"></i> معاينة الصفحة العامة</button>
<div class="card"><div class="hd">أقسام الصفحة العامة<small>تحكم بالأقسام التي تظهر في صفحة مؤسستك العامة</small></div>${SECS.map(x => tg('sc_' + x[0], `${x[1]} <i class="bi ${x[3]}" style="color:var(--p)"></i>`, on(x[0]), x[2], `PD.sections['${x[0]}']=this.checked`)).join('')}<div class="sm"><i class="bi bi-bar-chart-steps"></i> تفاصيل الإحصائيات</div><div class="grid" style="margin-top:6px">${tg('sd_donors', 'عدد المتبرعين', PD.statsDetail.donors !== false, '', `PD.statsDetail.donors=this.checked`)}${tg('sd_ben', 'عدد المستفيدين', PD.statsDetail.beneficiaries !== false, '', `PD.statsDetail.beneficiaries=this.checked`)}</div></div>
<div class="card" style="background:#fff8e1;color:#000">${tg('fin', '<i class="bi bi-shield-check" style="color:#e0a800"></i> الشفافية المالية', PD.fin, 'عرض الأرقام المالية للجمهور — يعزز الثقة والمصداقية', 'PD.fin=this.checked')}</div>
<div class="card"><div class="hd"><i class="bi bi-building"></i> بيانات المؤسسة</div><label class="f">اسم المؤسسة <i>*</i></label><input id="pdn" value="${esc(PD.name)}" oninput="PD.name=this.value"></div>
<div class="card"><div class="hd"><i class="bi bi-images"></i> الشعار وصورة الغلاف</div><div class="ct"><b><i class="bi bi-person-badge"></i> الشعار (Logo)</b></div><div class="upv" id="logoPv">${PD.logo ? `<img src="${esc(PD.logo)}" alt="">` : '<i class="bi bi-building"></i>'}</div><input type="file" accept="image/png,image/jpeg,image/webp" onchange="imgUp('logo',this)"><div class="hint ct">200×200 بكسل — مربع — حد أقصى 2MB ${PD.logo ? '<a style="color:var(--bad);cursor:pointer" onclick="imgDel(\'logo\')">حذف الشعار</a>' : ''}</div>
<div class="ct" style="margin-top:8px"><b><i class="bi bi-image"></i> صورة الغلاف (Cover)</b></div><div class="upc" id="coverPv" style="${PD.cover ? `background-image:url('${esc(PD.cover)}')` : ''}">${PD.cover ? '' : '<i class="bi bi-image" style="font-size:32px"></i>&nbsp;لا توجد صورة غلاف'}</div><input type="file" accept="image/png,image/jpeg,image/webp" onchange="imgUp('cover',this)"><div class="hint ct">1200×400 بكسل (نسبة 3:1) — حد أقصى 4MB ${PD.cover ? '<a style="color:var(--bad);cursor:pointer" onclick="imgDel(\'cover\')">حذف الغلاف</a>' : ''}</div></div>
<div class="card"><div class="hd"><i class="bi bi-info-circle"></i> نبذة عن المؤسسة</div><textarea rows="5" placeholder="اكتب نبذة تعريفية عن المؤسسة تظهر في الصفحة العامة..." maxlength="2000" oninput="PD.about=this.value">${esc(PD.about)}</textarea><div class="hint">تظهر في الصفحة العامة للمؤسسة</div></div>
<div class="card"><div class="hd"><i class="bi bi-play-circle"></i> فيديوهات تعريفية</div><b><i class="bi bi-play-circle"></i> روابط الفيديوهات</b><div class="hint">يدعم يوتيوب وفيسبوك — الصق رابط الفيديو الكامل. لفيديو فيسبوك: انسخ الرابط من المتصفح مباشرة.</div><div class="lk"><input id="pi_videos" dir="ltr" placeholder="https://www.youtube.com/watch?v=xxx"><button class="btn s o" onclick="pdAdd('videos','vid')"><i class="bi bi-plus-lg"></i> إضافة</button></div>${pdList('videos', 'vid')}</div>
<div class="card"><div class="hd"><i class="bi bi-images"></i> صور السلايدر</div><div class="hint">أضف روابط صور مباشرة لتظهر في السلايدر بالصفحة العامة.</div><div class="lk"><input id="pi_slider" dir="ltr" placeholder="https://example.com/image.jpg"><button class="btn s o" onclick="pdAdd('slider','img')"><i class="bi bi-plus-lg"></i> إضافة</button></div>${pdList('slider', 'img')}</div>
<div class="card"><div class="hd"><i class="bi bi-telephone"></i> معلومات التواصل</div>${[['phone', 'الهاتف', '07xxxxxxxxx', 'tel'], ['email', 'البريد الإلكتروني', 'info@org.com', 'email'], ['site', 'الموقع الإلكتروني', 'https://www.org.com', 'url'], ['address', 'العنوان', 'العنوان التفصيلي', 'text'], ['city', 'المدينة', 'بغداد', 'text'], ['province', 'المحافظة', 'بغداد', 'text']].map(([k, l, p, t]) => `<label class="f">${l}</label><input type="${t}" placeholder="${p}" value="${esc(PD[k] || '')}" oninput="PD.${k}=this.value" ${t === 'url' || t === 'email' ? 'dir="ltr"' : ''}>`).join('')}</div>
<div class="card"><div class="hd"><i class="bi bi-share"></i> روابط السوشال</div>${SOC.map(([k, l, ic]) => `<label class="f"><i class="bi ${ic}"></i> ${l}</label><input dir="ltr" placeholder="https://" value="${esc((PD.social || {})[k] || '')}" oninput="PD.social=PD.social||{};PD.social['${k}']=this.value">`).join('')}</div>
<button class="btn" onclick="pdSave()"><i class="bi bi-check2-circle"></i> حفظ الإعدادات</button>`;
}
function imgUp(name, inp) {
  const f = inp.files[0]; if (!f) return; const lim = name === 'logo' ? 2 : 4;
  if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { inp.value = ''; return T('⚠️ الصيغة غير مدعومة (PNG / JPG / WEBP)'); }
  if (f.size > lim * 1024 * 1024) { inp.value = ''; return T(`⚠️ الحجم أكبر من ${lim}MB`); }
  const r = new FileReader(); r.onload = async () => {
    try { const d = await API('/upload/' + name, { method: 'POST', body: JSON.stringify({ data: r.result }) }); PD[name] = d.url; T('✅ تم رفع الصورة — اضغط حفظ لاعتمادها'); render(true); } catch (e) { T(e.message === 'too_large' ? '⚠️ الصورة كبيرة' : '⚠️ تعذّر رفع الصورة'); }
  }; r.readAsDataURL(f);
}
async function imgDel(name) { try { await API('/upload/' + name, { method: 'DELETE' }); PD[name] = ''; T('تم الحذف — اضغط حفظ'); render(true); } catch { T('⚠️ تعذّر الحذف'); } }
function pdSave() {
  if (!PD.name.trim()) return T('⚠️ اسم المؤسسة مطلوب');
  if (PD.email && !/^\S+@\S+\.\S+$/.test(PD.email)) return T('⚠️ البريد الإلكتروني غير صحيح');
  if (PD.site && !isUrl(PD.site)) return T('⚠️ رابط الموقع يجب أن يبدأ بـ https://');
  for (const [k, v] of Object.entries(PD.social || {})) if (v && !isUrl(v)) return T('⚠️ رابط غير صحيح: ' + (SOC.find(s => s[0] === k) || [0, k])[1]);
  PD.name = PD.name.trim(); S.P = { ...clone(PD), _u: Date.now() }; logOp('تعديل', 'إعدادات الصفحة العامة', 'حفظ إعدادات الصفحة العامة'); save(); T('✅ تم حفظ الإعدادات');
}
async function pubPreview() { if (PD && JSON.stringify({ ...PD, _u: 0 }) !== JSON.stringify({ ...S.P, _u: 0 })) { pdSave(); } await sync(true); PUBAT = 0; go('org'); }

/* ===== إعدادات الإشعارات ===== */
let ND = null;
function notifSet() {
  if (!ND) ND = new Set(myNS().off || []);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const push = perm === 'granted' ? `<p class="sm"><i class="bi bi-check-circle-fill" style="color:var(--ok)"></i> إشعارات الجهاز مفعّلة على هذا المتصفح</p><button class="btn o" onclick="try{new Notification('تكافل',{body:'هذا إشعار تجريبي',icon:'/icon.svg',dir:'rtl'})}catch(e){}"><i class="bi bi-bell"></i> إرسال إشعار تجريبي</button>`
    : perm === 'denied' ? `<p class="sm"><i class="bi bi-x-circle-fill" style="color:var(--bad)"></i> الإشعارات محظورة — فعّلها من إعدادات الموقع في المتصفح ثم أعد تحميل الصفحة</p>`
    : perm === 'unsupported' ? `<p class="sm">هذا المتصفح لا يدعم إشعارات الجهاز</p>` : `<p class="sm"><i class="bi bi-bell-slash"></i> الإشعارات معطلة — فعّل الإشعارات لتصلك التحديثات على جوالك</p><button class="btn" onclick="askPush().then(()=>render(true))"><i class="bi bi-bell"></i> تفعيل</button>`;
  return `<h2><i class="bi bi-sliders"></i> إعدادات الإشعارات</h2><div class="card"><div class="hd"><i class="bi bi-phone"></i> إشعارات الجهاز (Push)</div>${push}</div>
<div class="card"><div class="hd"><i class="bi bi-list-check"></i> أنواع الإشعارات <span style="float:inline-start;display:flex;gap:6px"><button class="btn xs" style="background:#fff;color:var(--p)" onclick="ndAll(true)">تفعيل الكل</button><button class="btn xs" style="background:#fff;color:var(--p)" onclick="ndAll(false)">إيقاف الكل</button></span></div><div class="hint"><i class="bi bi-info-circle"></i> اختر الأحداث التي تريد استلام إشعارات عنها — ستظهر في صفحة الإشعارات وعلى جهازك.</div>
${NG.map(g => `<b style="color:var(--p)"><i class="bi bi-folder2-open"></i> ${g[1]}</b>${g[3].map(([e, l]) => tg('nd_' + g[0] + '_' + e, l, !ND.has(g[0] + '.' + e), '', `ndSet('${g[0]}.${e}',this.checked)`)).join('')}`).join('')}<b style="color:var(--p)"><i class="bi bi-folder2-open"></i> الإعدادات</b>${tg('nd_sys', 'اشتراك بقرب الانتهاء', !ND.has('sys.expiry'), '', `ndSet('sys.expiry',this.checked)`)}</div><button class="btn" onclick="ndSave()"><i class="bi bi-check2-circle"></i> حفظ التفضيلات</button>`;
}
const ndSet = (k, on) => on ? ND.delete(k) : ND.add(k);
function ndAll(on) { ND = new Set(on ? [] : [...NG.flatMap(g => g[3].map(e => g[0] + '.' + e[0])), 'sys.expiry']); render(true); }
function ndSave() { S.NS = S.NS || {}; S.NS[ME.email] = { off: [...ND], _u: Date.now() }; save(); T('✅ تم حفظ التفضيلات'); }
