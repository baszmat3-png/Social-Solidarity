/* تكافل — محرّك الأقسام: قوائم، نماذج، حذف/استعادة، تحديد جماعي */
'use strict';
const stb = v => { const c = /موقوف|متوقف|ملغ/.test(v) ? 'x' : /معلق|تخطيط|بانتظار/.test(v) ? 'w' : /تنفيذ/.test(v) ? 'i' : ''; return `<span class="bg ${c}">${esc(v || '—')}</span>`; };
const rf = (c, id) => esc(nm(c, id));
const money = v => fmt(v);
const prog = p => `<div class="pr" style="min-width:90px"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div><span class="sm">${Math.round(p)}%</span>`;
const ST2 = ['مفعل', 'موقوف'];
const refsOpt = (c, only) => () => live(c).filter(x => !only || only(x)).map(x => [x.id, x.name]);
const dupName = (k, name, id, extra) => live(k).some(x => x.id !== id && x.name.trim() === name.trim() && (!extra || extra(x)));
const FUND_TYPES = catOpts('fund');

const ENT = {
  funds: {
    t: 'إدارة الصناديق', ic: 'bi-safe', add: 'إضافة صندوق', mk: 'إنشاء الصندوق', sg: 'صندوق', ph: 'بحث بالاسم...', g: 'funds',
    fields: [{ id: 'name', l: 'اسم الصندوق', t: 'text', req: 1, ph: 'اسم الصندوق' }, { id: 'type', l: 'نوع الصندوق', t: 'select', opts: FUND_TYPES, blank: 1, cg: 1 },
      { id: 'open', l: 'الرصيد الافتتاحي (د.ع)', t: 'number', hint: 'اتركه فارغاً إذا صندوق جديد بدون رصيد سابق' }, { id: 'status', l: 'الحالة', t: 'select', opts: ST2, def: 'مفعل' }, { id: 'desc', l: 'الوصف', t: 'area', ph: 'وصف الصندوق' }],
    cols: [{ id: 'name', l: 'اسم الصندوق', r: r => `<b>${esc(r.name)}</b>`, s: r => r.name }, { id: 'type', l: 'النوع', r: r => esc(r.type || '—'), s: r => r.type || '' },
      { id: 'open', l: 'الرصيد الافتتاحي', r: r => money(r.open), s: r => num(r.open) }, { id: 'bal', l: 'الرصيد الحالي', r: r => `<b>${money(fundBal(r.id))}</b>`, s: r => fundBal(r.id) }, { id: 'status', l: 'الحالة', r: r => stb(r.status), s: r => r.status }],
    search: r => r.name + ' ' + (r.desc || ''),
    filters: [{ id: 'type', l: 'كل الأنواع', opts: FUND_TYPES, test: (r, v) => r.type === v }, { id: 'status', l: 'الحالة', opts: ST2, test: (r, v) => r.status === v }],
    bulkStatus: ST2,
    stats: () => { const L = live('funds'); return `<div class="stat"><div><b>${money(sum(L.filter(f => f.status === 'مفعل'), f => fundBal(f.id)))}</b><span>إجمالي الأرصدة (د.ع)</span></div><div><b>${money(sum(L, f => f.open))}</b><span>الأرصدة الافتتاحية</span></div><div><b>${L.filter(f => f.status === 'مفعل').length}</b><span>الصناديق النشطة</span></div></div>`; },
    refs: r => [['تبرع', S.donations.filter(x => !x.deleted && x.fund === r.id).length], ['صرفية', S.expenses.filter(x => !x.deleted && x.fund === r.id).length], ['تحويل', S.transfers.filter(x => !x.deleted && (x.from === r.id || x.to === r.id)).length], ['حملة', live('campaigns').filter(x => x.fund === r.id).length], ['مشروع', live('projects').filter(x => x.fund === r.id).length]],
    check: (d, o) => (dupName('funds', d.name, o && o.id) ? 'يوجد صندوق بنفس الاسم' : d.open < 0 ? 'الرصيد الافتتاحي لا يمكن أن يكون سالباً' : null),
  },
  areas: {
    t: 'إدارة المناطق', ic: 'bi-geo-alt-fill', add: 'إضافة منطقة', mk: 'إنشاء المنطقة', sg: 'منطقة', ph: 'بحث بالاسم...', g: 'areas',
    fields: [{ id: 'name', l: 'اسم المنطقة', t: 'text', req: 1 }, { id: 'status', l: 'الحالة', t: 'select', opts: ST2, def: 'مفعل' }],
    cols: [{ id: 'name', l: 'اسم المنطقة', r: r => `<b>${esc(r.name)}</b>`, s: r => r.name }, { id: 'fam', l: 'العائلات', r: r => live('families').filter(f => f.area === r.id).length, s: r => live('families').filter(f => f.area === r.id).length },
      { id: 'ben', l: 'المستفيدين', r: r => live('beneficiaries').filter(f => f.area === r.id).length, s: r => live('beneficiaries').filter(f => f.area === r.id).length }, { id: 'status', l: 'الحالة', r: r => stb(r.status), s: r => r.status }],
    search: r => r.name, filters: [{ id: 'status', l: 'الحالة', opts: ST2, test: (r, v) => r.status === v }], bulkStatus: ST2,
    refs: r => [['عائلة', live('families').filter(x => x.area === r.id).length], ['مستفيد', live('beneficiaries').filter(x => x.area === r.id).length], ['مشروع', live('projects').filter(x => x.area === r.id).length]],
    check: (d, o) => dupName('areas', d.name, o && o.id) ? 'يوجد منطقة بنفس الاسم' : null,
  },
  families: {
    t: 'إدارة العائلات', ic: 'bi-house-heart', add: 'إضافة عائلة', mk: 'إنشاء العائلة', sg: 'عائلة', ph: 'بحث بالاسم، الهاتف...', g: 'families',
    fields: [{ id: 'name', l: 'اسم العائلة', t: 'text', req: 1, ph: 'اسم العائلة' }, { id: 'area', l: 'المنطقة', t: 'select', opts: refsOpt('areas', a => a.status === 'مفعل'), req: 1, blank: 'ابحث عن منطقة...' },
      { id: 'phone', l: 'هاتف التواصل', t: 'tel' }, { id: 'addr', l: 'العنوان', t: 'text' }, { id: 'status', l: 'الحالة', t: 'select', opts: ['نشطة', 'موقوفة'], def: 'نشطة' }, { id: 'notes', l: 'ملاحظات', t: 'area' }],
    cols: [{ id: 'name', l: 'اسم العائلة', r: r => `<b>${esc(r.name)}</b>`, s: r => r.name }, { id: 'area', l: 'المنطقة', r: r => rf('areas', r.area), s: r => nm('areas', r.area) }, { id: 'phone', l: 'الهاتف', r: r => esc(r.phone || '—') },
      { id: 'mem', l: 'الأفراد', r: r => live('beneficiaries').filter(b => b.family === r.id).length, s: r => live('beneficiaries').filter(b => b.family === r.id).length }, { id: 'status', l: 'الحالة', r: r => stb(r.status), s: r => r.status }],
    search: r => r.name + ' ' + (r.phone || '') + ' ' + (r.addr || ''),
    filters: [{ id: 'area', l: 'كل المناطق', opts: refsOpt('areas'), test: (r, v) => r.area === v }, { id: 'status', l: 'الحالة', opts: ['نشطة', 'موقوفة'], test: (r, v) => r.status === v }],
    bulkStatus: [['نشطة', 'تفعيل', 'bi-check-circle', 'g'], ['موقوفة', 'إيقاف', 'bi-pause-circle', 'w']],
    refs: r => [['مستفيد', live('beneficiaries').filter(x => x.family === r.id).length]],
  },
  beneficiaries: {
    t: 'إدارة المستفيدين', ic: 'bi-people-fill', add: 'إضافة مستفيد', mk: 'إضافة المستفيد', sg: 'مستفيد', ph: 'بحث بالاسم، الهاتف، الهوية...', g: 'beneficiaries',
    tabs: [['bi-person', 'البيانات الأساسية'], ['bi-list-ul', 'تفاصيل إضافية'], ['bi-tags', 'أنواع الاستفادة']],
    fields: [
      { id: 'name', l: 'اسم المستفيد', t: 'text', req: 1, tab: 0, ph: 'اسم المستفيد' }, { id: 'phone', l: 'رقم الهاتف', t: 'tel', tab: 0 },
      { id: 'family', l: 'العائلة', t: 'select', opts: refsOpt('families', f => f.status === 'نشطة'), blank: 'ابحث عن عائلة أو اتركه فارغاً...', tab: 0 }, { id: 'area', l: 'المنطقة', t: 'select', opts: refsOpt('areas', a => a.status === 'مفعل'), blank: 'ابحث عن منطقة (اختياري)...', tab: 0 },
      { id: 'sex', l: 'الجنس', t: 'select', opts: ['ذكر', 'أنثى'], blank: 1, tab: 0, half: 1 }, { id: 'status', l: 'الحالة', t: 'select', opts: ['نشط', 'متوقف', 'معلق'], def: 'نشط', tab: 0, half: 1 },
      { id: 'head', l: 'رب العائلة', t: 'toggle', tab: 0, after: `<div style="text-align:center;font-size:13px;line-height:2"><span class="bg">نشط</span> يستلم المساعدات<br><span class="bg x">متوقف</span> توقف مؤقتاً عن الاستلام<br><span class="bg w">معلق</span> قيد المراجعة أو التحقق</div>` },
      { id: 'birth', l: 'تاريخ الميلاد', t: 'date', tab: 1 }, { id: 'idno', l: 'رقم الهوية', t: 'text', tab: 1, ph: 'رقم الهوية' }, { id: 'marital', l: 'الحالة الاجتماعية', t: 'select', opts: catOpts('marital'), blank: 1, cg: 1, tab: 1 },
      { id: 'job', l: 'حالة التوظيف', t: 'select', opts: catOpts('job'), blank: 1, cg: 1, tab: 1 }, { id: 'edu', l: 'المستوى التعليمي', t: 'select', opts: catOpts('edu'), blank: 1, cg: 1, tab: 1 },
      { id: 'income', l: 'الدخل الشهري', t: 'number', tab: 1 }, { id: 'addr', l: 'العنوان التفصيلي', t: 'text', tab: 1, ph: 'العنوان' }, { id: 'health', l: 'الحالة الصحية', t: 'text', tab: 1, ph: 'الحالة الصحية' }, { id: 'notes', l: 'ملاحظات', t: 'area', tab: 1 },
      { id: 'cats', l: 'أنواع الاستفادة', t: 'multi', opts: () => catsOf('benef').filter(c => c.status === 'مفعل').map(c => [c.id, c.name]), tab: 2 }],
    cols: [{ id: 'name', l: 'الاسم', r: r => `<b>${esc(r.name)}</b>${r.head ? ' <i class="bi bi-star-fill" style="color:#e0a800" title="رب العائلة"></i>' : ''}`, s: r => r.name }, { id: 'phone', l: 'الهاتف', r: r => esc(r.phone || '—') },
      { id: 'family', l: 'العائلة', r: r => rf('families', r.family), s: r => nm('families', r.family, '') }, { id: 'area', l: 'المنطقة', r: r => rf('areas', r.area), s: r => nm('areas', r.area, '') },
      { id: 'cats', l: 'نوع الاستفادة', r: r => (r.cats || []).map(c => catBadge(c)).join(' ') || '—' }, { id: 'status', l: 'الحالة', r: r => stb(r.status), s: r => r.status }],
    search: r => [r.name, r.phone, r.idno, r.addr].join(' '),
    filters: [{ id: 'status', l: 'الحالة', opts: ['نشط', 'متوقف', 'معلق'], test: (r, v) => r.status === v }, { id: 'cat', l: 'كل الأنواع', opts: () => catsOf('benef').map(c => [c.id, c.name]), test: (r, v) => (r.cats || []).includes(v) },
      { id: 'area', l: 'المنطقة', opts: refsOpt('areas'), test: (r, v) => r.area === v }, { id: 'sex', l: 'الجنس', opts: ['ذكر', 'أنثى'], test: (r, v) => r.sex === v }],
    bulkStatus: [['نشط', 'تفعيل', 'bi-check-circle', 'g'], ['متوقف', 'إيقاف', 'bi-pause-circle', 'w']],
    refs: r => [['صرفية', S.expenses.filter(x => !x.deleted && x.ben === r.id).length]],
    check: (d, o) => { if (d.head && d.family && live('beneficiaries').some(b => b.family === d.family && b.head && b.id !== (o && o.id))) return 'هذه العائلة لديها رب عائلة آخر'; },
  },
  donors: {
    t: 'إدارة المتبرعين', ic: 'bi-person-hearts', add: 'إضافة متبرع', mk: 'إضافة المتبرع', sg: 'متبرع', ph: 'بحث بالاسم، الهاتف، البريد...', g: 'donors',
    fields: [{ id: 'name', l: 'اسم المتبرع', t: 'text', req: 1, ph: 'اسم المتبرع' }, { id: 'phone', l: 'رقم الهاتف', t: 'tel' }, { id: 'email', l: 'البريد الإلكتروني', t: 'email' }, { id: 'idno', l: 'رقم الهوية', t: 'text' },
      { id: 'type', l: 'نوع المتبرع', t: 'select', opts: catOpts('donor'), blank: 1, cg: 1 }, { id: 'city', l: 'المدينة', t: 'text' }, { id: 'addr', l: 'العنوان', t: 'text' }, { id: 'status', l: 'الحالة', t: 'select', opts: ST2, def: 'مفعل' }, { id: 'notes', l: 'ملاحظات', t: 'area' }],
    cols: [{ id: 'name', l: 'الاسم', r: r => `<b>${esc(r.name)}</b>`, s: r => r.name }, { id: 'phone', l: 'الهاتف', r: r => esc(r.phone || '—') }, { id: 'type', l: 'النوع', r: r => esc(r.type || '—'), s: r => r.type || '' }, { id: 'city', l: 'المدينة', r: r => esc(r.city || '—') },
      { id: 'tot', l: 'إجمالي التبرعات', r: r => money(sum(S.donations.filter(d => okD(d) && d.donor === r.id))), s: r => sum(S.donations.filter(d => okD(d) && d.donor === r.id)) }, { id: 'status', l: 'الحالة', r: r => stb(r.status), s: r => r.status }],
    search: r => [r.name, r.phone, r.email, r.idno].join(' '),
    filters: [{ id: 'type', l: 'كل الأنواع', opts: catOpts('donor'), test: (r, v) => r.type === v }, { id: 'status', l: 'الحالة', opts: ST2, test: (r, v) => r.status === v }], bulkStatus: ST2,
    refs: r => [['تبرع', S.donations.filter(x => !x.deleted && x.donor === r.id).length]],
    check: (d, o) => { if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) return 'البريد الإلكتروني غير صحيح'; if (d.phone && live('donors').some(x => x.id !== (o && o.id) && normPhone(x.phone) === normPhone(d.phone))) return 'رقم الهاتف مسجل لمتبرع آخر'; },
  },
  transfers: {
    t: 'تدوير الأموال', ic: 'bi-arrow-left-right', add: 'تدوير جديد', mk: 'تنفيذ التدوير', sg: 'تحويل', ph: 'بحث بالسبب أو الملاحظات...', g: 'funds', perm: 'funds', nk: 'funds', nev: 'xfer',
    fields: [{ id: 'from', l: 'من صندوق', t: 'select', opts: refsOpt('funds', f => f.status === 'مفعل'), req: 1, blank: 'اختر الصندوق المصدر...' }, { id: 'to', l: 'إلى صندوق', t: 'select', opts: refsOpt('funds', f => f.status === 'مفعل'), req: 1, blank: 'اختر الصندوق المستلم...' },
      { id: 'amount', l: 'المبلغ (د.ع)', t: 'number', req: 1 }, { id: 'date', l: 'تاريخ التحويل', t: 'date', req: 1, def: 'today' }, { id: 'reason', l: 'السبب', t: 'text', ph: 'سبب التدوير' }, { id: 'notes', l: 'ملاحظات', t: 'area' }],
    cols: [{ id: 'date', l: 'التاريخ', r: r => fd(r.date), s: r => r.date }, { id: 'from', l: 'من', r: r => rf('funds', r.from), s: r => nm('funds', r.from) }, { id: 'to', l: 'إلى', r: r => rf('funds', r.to), s: r => nm('funds', r.to) },
      { id: 'amount', l: 'المبلغ', r: r => `<b>${money(r.amount)}</b>`, s: r => num(r.amount) }, { id: 'reason', l: 'السبب', r: r => esc(r.reason || '—') }],
    search: r => [r.reason, r.notes, nm('funds', r.from), nm('funds', r.to)].join(' '),
    filters: [{ id: 'from', l: 'من صندوق', opts: refsOpt('funds'), test: (r, v) => r.from === v }, { id: 'to', l: 'إلى صندوق', opts: refsOpt('funds'), test: (r, v) => r.to === v }],
    check: (d, o) => { if (d.from === d.to) return 'اختر صندوقين مختلفين'; if (!(d.amount > 0)) return 'المبلغ يجب أن يكون أكبر من صفر'; const a = available(d.from, null, o && o.id); if (d.amount > a) return `المبلغ أكبر من المتاح للتحويل في الصندوق المصدر (${money(Math.max(0, a))} د.ع) — الأموال المقيدة بحملات لا يمكن تدويرها`; },
    label: r => `${nm('funds', r.from)} ← ${nm('funds', r.to)}: ${money(r.amount)}`,
  },
  donations: {
    t: 'التبرعات', ic: 'bi-cash-coin', add: 'إضافة تبرع', mk: 'تسجيل التبرع', sg: 'تبرع', ph: 'بحث بالمتبرع، رقم الوصل، المبلغ...', g: 'donations',
    fields: [{ id: 'donor', l: 'المتبرع', t: 'select', opts: refsOpt('donors', d => d.status === 'مفعل'), req: 1, blank: 'اختر المتبرع...' },
      { id: 'campaign', l: 'الحملة', t: 'select', opts: refsOpt('campaigns', c => c.status === 'نشطة'), blank: 'بدون حملة', onchange: 'donCamp(this)' },
      { id: 'fund', l: 'الصندوق', t: 'select', opts: refsOpt('funds', f => f.status === 'مفعل'), req: 1, blank: 'اختر الصندوق...' },
      { id: 'amount', l: 'المبلغ (د.ع)', t: 'number', req: 1 }, { id: 'method', l: 'طريقة الدفع', t: 'select', opts: catOpts('pay'), def: 'نقدي', cg: 1 }, { id: 'date', l: 'التاريخ', t: 'date', req: 1, def: 'today' }, { id: 'notes', l: 'ملاحظات', t: 'area' }],
    cols: [{ id: 'no', l: 'رقم الوصل', r: r => `<span dir="ltr">${rcNo(r)}</span>`, s: r => rcNo(r) }, { id: 'donor', l: 'المتبرع', r: r => `<b>${rf('donors', r.donor)}</b>`, s: r => nm('donors', r.donor) }, { id: 'fund', l: 'الصندوق', r: r => rf('funds', r.fund), s: r => nm('funds', r.fund) },
      { id: 'campaign', l: 'الحملة', r: r => rf('campaigns', r.campaign), s: r => nm('campaigns', r.campaign, '') }, { id: 'amount', l: 'المبلغ', r: r => `<b>${money(r.amount)}</b>`, s: r => num(r.amount) },
      { id: 'date', l: 'التاريخ', r: r => fd(r.date), s: r => r.date }, { id: 'method', l: 'الدفع', r: r => esc(r.method || '—') }, { id: 'status', l: 'الحالة', r: r => stb(r.status || 'مؤكد'), s: r => r.status || 'مؤكد' }],
    search: r => [nm('donors', r.donor), rcNo(r), r.amount, r.notes, nm('campaigns', r.campaign)].join(' '),
    filters: [{ id: 'fund', l: 'كل الصناديق', opts: refsOpt('funds'), test: (r, v) => r.fund === v }, { id: 'campaign', l: 'كل الحملات', opts: refsOpt('campaigns'), test: (r, v) => r.campaign === v },
      { id: 'method', l: 'طريقة الدفع', opts: catOpts('pay'), test: (r, v) => r.method === v }, { id: 'status', l: 'الحالة', opts: ['مؤكد', 'بانتظار التأكيد'], test: (r, v) => (r.status || 'مؤكد') === v }],
    dates: 1, total: rows => `الإجمالي: <b>${money(sum(rows.filter(okD)))}</b> د.ع`,
    extra: r => (r.deleted ? '' : `<button class="btn xs o" title="وصل" onclick="rcPreview('${r.id}')"><i class="bi bi-receipt"></i></button>`) + (!r.deleted && r.status === 'بانتظار التأكيد' && can('donations.confirm') ? `<button class="btn xs g" title="تأكيد الاستلام" onclick="approve('donations','${r.id}')"><i class="bi bi-check-lg"></i></button>` : ''),
    prep: (r, isNew) => { if (isNew) r.by = ME.name; if (isNew) r.status = can('donations.confirm') ? 'مؤكد' : 'بانتظار التأكيد'; },
    check: (d, o) => {
      if (!(d.amount > 0)) return 'المبلغ يجب أن يكون أكبر من صفر';
      const c = d.campaign && get('campaigns', d.campaign);
      if (c) {
        if (!o || o.campaign !== c.id) { const st = campStatus(c); if (st !== 'نشطة') return `الحملة «${c.name}» ${st === 'مكتملة' ? 'وصلت هدفها' : 'غير نشطة'} ولا تستقبل تبرعات`; }
        if (c.fund !== d.fund) d.fund = c.fund;
        if (num(c.goal) > 0 && !c.exceed) { const left = num(c.goal) - campRaised(c.id, o && o.id); if (d.amount > left) return `المبلغ يتجاوز المتبقي من هدف الحملة (${money(Math.max(0, left))} د.ع)`; }
      }
      if (o && o.fund !== d.fund && o.status !== 'بانتظار التأكيد') { const nb = fundBal(o.fund, o.id); if (nb - restrictedIn(o.fund, o.id) < 0) return 'لا يمكن نقل التبرع: سيجعل رصيد الصندوق السابق سالباً'; }
    },
    after: (r, n) => { const c = r.campaign && get('campaigns', r.campaign); if (c && okD(r) && num(c.goal) > 0 && campRaised(c.id) >= num(c.goal) && !c.goalNotified) { notify('campaigns.goal', `🎯 حملة «${c.name}» وصلت هدفها`); } },
    label: r => `${rcNo(r)} — ${nm('donors', r.donor)} — ${money(r.amount)}`,
  },
  expenses: {
    t: 'الصرفيات', ic: 'bi-cash', add: 'إضافة صرفية', mk: 'تسجيل الصرفية', sg: 'صرفية', ph: 'بحث بالبند، المستفيد...', g: 'expenses',
    fields: [{ id: 'title', l: 'البند', t: 'text', req: 1, ph: 'مثال: سلة غذائية' }, { id: 'type', l: 'نوع الصرفية', t: 'select', opts: catOpts('exp'), blank: 1, cg: 1 }, { id: 'fund', l: 'الصندوق', t: 'select', opts: refsOpt('funds', f => f.status === 'مفعل'), req: 1, blank: 'اختر الصندوق...' },
      { id: 'campaign', l: 'الحملة (للأموال المقيّدة)', t: 'select', opts: refsOpt('campaigns'), blank: 'بدون حملة' }, { id: 'project', l: 'المشروع', t: 'select', opts: refsOpt('projects'), blank: 'بدون مشروع' }, { id: 'ben', l: 'المستفيد', t: 'select', opts: refsOpt('beneficiaries', b => b.status === 'نشط'), blank: 'بدون مستفيد محدد' },
      { id: 'amount', l: 'المبلغ (د.ع)', t: 'number', req: 1 }, { id: 'date', l: 'التاريخ', t: 'date', req: 1, def: 'today' }, { id: 'notes', l: 'ملاحظات', t: 'area' }],
    cols: [{ id: 'date', l: 'التاريخ', r: r => fd(r.date), s: r => r.date }, { id: 'title', l: 'البند', r: r => `<b>${esc(r.title)}</b>`, s: r => r.title }, { id: 'fund', l: 'الصندوق', r: r => rf('funds', r.fund), s: r => nm('funds', r.fund) }, { id: 'ben', l: 'المستفيد', r: r => rf('beneficiaries', r.ben), s: r => nm('beneficiaries', r.ben, '') },
      { id: 'project', l: 'المشروع', r: r => rf('projects', r.project), s: r => nm('projects', r.project, '') }, { id: 'amount', l: 'المبلغ', r: r => `<b>${money(r.amount)}</b>`, s: r => num(r.amount) }, { id: 'status', l: 'الحالة', r: r => stb(r.status || 'معتمدة'), s: r => r.status || 'معتمدة' }],
    search: r => [r.title, nm('beneficiaries', r.ben), nm('projects', r.project), r.amount, r.notes].join(' '),
    filters: [{ id: 'type', l: 'كل الأنواع', opts: catOpts('exp'), test: (r, v) => r.type === v }, { id: 'fund', l: 'كل الصناديق', opts: refsOpt('funds'), test: (r, v) => r.fund === v }, { id: 'project', l: 'كل المشاريع', opts: refsOpt('projects'), test: (r, v) => r.project === v }, { id: 'status', l: 'الحالة', opts: ['معتمدة', 'بانتظار الموافقة'], test: (r, v) => (r.status || 'معتمدة') === v }],
    dates: 1, total: rows => `الإجمالي: <b>${money(sum(rows.filter(okE)))}</b> د.ع`,
    extra: r => !r.deleted && r.status === 'بانتظار الموافقة' && can('expenses.approve') ? `<button class="btn xs g" title="موافقة" onclick="approve('expenses','${r.id}')"><i class="bi bi-check-lg"></i></button>` : '',
    prep: (r, isNew) => { if (isNew) r.status = can('expenses.approve') ? 'معتمدة' : 'بانتظار الموافقة'; },
    check: (d, o) => {
      if (!(d.amount > 0)) return 'المبلغ يجب أن يكون أكبر من صفر';
      if (d.project && !d.campaign) { const pc = projCamp(d.project); if (pc) d.campaign = pc; }
      const pend = (o ? o.status : (can('expenses.approve') ? 'معتمدة' : 'بانتظار الموافقة')) === 'بانتظار الموافقة';
      if (!pend) { const a = available(d.fund, d.campaign, o && o.id); if (d.amount > a) return `المبلغ أكبر من المتاح للصرف في الصندوق (${money(Math.max(0, a))} د.ع). الأموال المقيدة بحملات لا تُصرف إلا عليها أو على مشاريعها`; }
    },
    label: r => `${r.title} — ${money(r.amount)}`,
  },
  campaigns: {
    t: 'الحملات', ic: 'bi-megaphone', add: 'إضافة حملة', mk: 'إنشاء الحملة', sg: 'حملة', ph: 'بحث بالاسم أو الوصف...', g: 'campaigns', title: 'إنشاء حملة جديدة',
    fields: [{ id: 'name', l: 'اسم الحملة', t: 'text', req: 1, ph: 'مثال: حملة شتاء 2026' }, { id: 'fund', l: 'الصندوق', t: 'select', opts: refsOpt('funds', f => f.status === 'مفعل'), req: 1, blank: 'اختر الصندوق...' },
      { id: 'goal', l: 'المبلغ المستهدف (د.ع)', t: 'number' }, { id: 'type', l: 'نوع الحملة', t: 'select', opts: catOpts('camp'), blank: 1, cg: 1 }, { id: 'season', l: 'الموسم', t: 'select', opts: catOpts('season'), blank: 1, cg: 1 },
      { id: 'start', l: 'تاريخ البداية', t: 'date', def: 'today' }, { id: 'end', l: 'تاريخ النهاية', t: 'date' }, { id: 'status', l: 'الحالة', t: 'select', opts: ['نشطة', 'مكتملة', 'متوقفة'], def: 'نشطة' },
      { id: 'pub', l: 'عامة', t: 'toggle', def: true }, { id: 'exceed', l: 'تجاوز المستهدف', t: 'toggle', hint: 'السماح باستقبال تبرعات بعد الوصول للهدف' },
      { id: 'restricted', l: 'أموال مقيدة — لا تُصرف إلا على هذه الحملة أو مشاريعها', t: 'toggle' }, { id: 'desc', l: 'الوصف', t: 'area', ph: 'وصف الحملة وأهدافها' }, { id: 'images', l: 'الصور', t: 'links', kind: 'img' }, { id: 'videos', l: 'روابط الفيديوهات', t: 'links', kind: 'vid' }],
    cols: [{ id: 'name', l: 'الحملة', r: r => `<b>${esc(r.name)}</b>`, s: r => r.name }, { id: 'fund', l: 'الصندوق', r: r => rf('funds', r.fund), s: r => nm('funds', r.fund) }, { id: 'goal', l: 'المستهدف', r: r => money(r.goal), s: r => num(r.goal) },
      { id: 'raised', l: 'المجموع', r: r => money(campRaised(r.id)), s: r => campRaised(r.id) }, { id: 'pct', l: 'الإنجاز', r: r => num(r.goal) ? prog(campRaised(r.id) / r.goal * 100) : '—', s: r => num(r.goal) ? campRaised(r.id) / r.goal : 0 },
      { id: 'status', l: 'الحالة', r: r => stb(campStatus(r)), s: r => campStatus(r) }, { id: 'pub', l: 'عامة', r: r => r.pub !== false ? '<i class="bi bi-globe2" style="color:var(--ok)"></i>' : '<i class="bi bi-eye-slash sm"></i>' }],
    search: r => r.name + ' ' + (r.desc || ''), filters: [{ id: 'status', l: 'الحالة', opts: ['نشطة', 'مكتملة', 'متوقفة'], test: (r, v) => campStatus(r) === v }, { id: 'fund', l: 'كل الصناديق', opts: refsOpt('funds'), test: (r, v) => r.fund === v }],
    bulkStatus: [['نشطة', 'تفعيل', 'bi-check-circle', 'g'], ['متوقفة', 'إيقاف', 'bi-pause-circle', 'w']],
    refs: r => [['تبرع', S.donations.filter(x => !x.deleted && x.campaign === r.id).length], ['مشروع', live('projects').filter(x => x.camp === r.id).length], ['صرفية', S.expenses.filter(x => !x.deleted && x.campaign === r.id).length]],
    check: (d, o) => { if (d.end && d.start && d.end < d.start) return 'تاريخ النهاية قبل تاريخ البداية'; if (o && o.restricted && !d.restricted && restrictedOf(o) > 0) return 'لا يمكن إلغاء التقييد: يوجد رصيد مقيّد لم يُصرف بعد'; },
  },
  projects: {
    t: 'المشاريع', ic: 'bi-building-gear', add: 'إضافة مشروع', mk: 'إنشاء المشروع', sg: 'مشروع', ph: 'بحث بالاسم أو الوصف...', g: 'projects', title: 'إنشاء مشروع جديد',
    fields: [{ id: 'name', l: 'اسم المشروع', t: 'text', req: 1, ph: 'مثال: بناء مدرسة في قضاء الرفاء' }, { id: 'fund', l: 'الصندوق', t: 'select', opts: refsOpt('funds', f => f.status === 'مفعل'), blank: 'اختر الصندوق...' },
      { id: 'camp', l: 'الحملة المرتبطة (اختياري)', t: 'select', opts: refsOpt('campaigns'), blank: 'ربط بحملة...' }, { id: 'budget', l: 'الميزانية (د.ع)', t: 'number' },
      { id: 'type', l: 'نوع المشروع', t: 'select', opts: catOpts('proj'), blank: 1, cg: 1 }, { id: 'area', l: 'المنطقة', t: 'select', opts: refsOpt('areas', a => a.status === 'مفعل'), blank: 'اختر المنطقة...' },
      { id: 'start', l: 'تاريخ البداية', t: 'date', def: 'today' }, { id: 'end', l: 'تاريخ النهاية المتوقع', t: 'date' }, { id: 'status', l: 'الحالة', t: 'select', opts: ['تخطيط', 'تنفيذ', 'مكتمل', 'متوقف'], def: 'تخطيط' },
      { id: 'pct', l: 'نسبة إنجاز المشروع', t: 'range' }, { id: 'pub', l: 'مشروع عام (يظهر للجمهور)', t: 'toggle', def: true }, { id: 'desc', l: 'الوصف', t: 'area', ph: 'وصف المشروع وأهدافه' }, { id: 'images', l: 'الصور', t: 'links', kind: 'img' }, { id: 'videos', l: 'روابط الفيديوهات', t: 'links', kind: 'vid' }],
    cols: [{ id: 'name', l: 'المشروع', r: r => `<b>${esc(r.name)}</b>`, s: r => r.name }, { id: 'fund', l: 'الصندوق', r: r => rf('funds', r.fund), s: r => nm('funds', r.fund, '') }, { id: 'budget', l: 'الميزانية', r: r => money(r.budget), s: r => num(r.budget) },
      { id: 'spent', l: 'المصروف', r: r => money(sum(S.expenses.filter(e => okE(e) && e.project === r.id))), s: r => sum(S.expenses.filter(e => okE(e) && e.project === r.id)) }, { id: 'status', l: 'الحالة', r: r => stb(r.status), s: r => r.status }, { id: 'pct', l: 'الإنجاز', r: r => prog(num(r.pct)), s: r => num(r.pct) }],
    search: r => r.name + ' ' + (r.desc || ''), filters: [{ id: 'status', l: 'الحالة', opts: ['تخطيط', 'تنفيذ', 'مكتمل', 'متوقف'], test: (r, v) => r.status === v }, { id: 'fund', l: 'كل الصناديق', opts: refsOpt('funds'), test: (r, v) => r.fund === v }],
    refs: r => [['صرفية', S.expenses.filter(x => !x.deleted && x.project === r.id).length]],
    check: (d, o) => d.end && d.start && d.end < d.start ? 'تاريخ النهاية قبل تاريخ البداية' : null,
  },
  users: {
    t: 'إدارة المستخدمين', ic: 'bi-person-gear', add: 'إضافة مستخدم', mk: 'إنشاء المستخدم', sg: 'مستخدم', ph: 'بحث بالاسم، البريد، الهاتف...', g: 'users',
    fields: [{ id: 'name', l: 'الاسم الكامل', t: 'text', req: 1 }, { id: 'email', l: 'البريد الإلكتروني', t: 'email', req: 1 }, { id: 'phone', l: 'رقم الهاتف', t: 'tel' },
      { id: 'role', l: 'نوع المستخدم', t: 'select', opts: refsOpt('roles'), req: 1, blank: 'اختر الدور...' }, { id: 'status', l: 'الحالة', t: 'select', opts: ST2, def: 'مفعل' },
      { id: 'password', l: 'كلمة المرور', t: 'password', nostore: 1, hint: 'ست خانات على الأقل — عند التعديل اتركها فارغة لعدم التغيير' }],
    cols: [{ id: 'name', l: 'الاسم', r: r => `<i class="bi bi-person-circle" style="color:var(--p)"></i> <b>${esc(r.name)}</b>`, s: r => r.name }, { id: 'email', l: 'البريد', r: r => `<span dir="ltr">${esc(r.email)}</span>` }, { id: 'phone', l: 'الهاتف', r: r => esc(r.phone || '—') },
      { id: 'role', l: 'النوع', r: r => `<span class="bg w" style="color:#000">${rf('roles', r.role)}</span>`, s: r => nm('roles', r.role) }, { id: 'status', l: 'الحالة', r: r => stb(r.status), s: r => r.status }],
    search: r => [r.name, r.email, r.phone].join(' '), filters: [{ id: 'role', l: 'كل الأنواع', opts: refsOpt('roles'), test: (r, v) => r.role === v }, { id: 'status', l: 'كل الحالات', opts: ST2, test: (r, v) => r.status === v }], bulkStatus: ST2,
    protect: r => ME && r.id === ME.id ? 'لا يمكنك تنفيذ هذا الإجراء على حسابك الحالي' : isAdminRole(r.role) && live('users').filter(u => isAdminRole(u.role) && u.status === 'مفعل' && u.id !== r.id).length < 1 ? 'يجب أن يبقى مدير واحد مفعّل على الأقل' : null,
    check: async (d, o) => {
      if (!/^\S+@\S+\.\S+$/.test(d.email)) return 'البريد الإلكتروني غير صحيح';
      if (S.users.some(u => !u.deleted && u.id !== (o && o.id) && u.email.toLowerCase() === d.email.toLowerCase())) return 'البريد الإلكتروني مستخدم';
      if (!ME.perms.has('*') && isAdminRole(d.role)) return 'لا تملك صلاحية منح دور المدير';
      if (!o && !d.password) return 'كلمة المرور مطلوبة للمستخدم الجديد';
      if (o && ME && o.id === ME.id && (d.status !== 'مفعل' || d.role !== o.role)) return 'لا يمكنك تغيير حالتك أو دورك';
      if (d.password) { if (d.password.length < 6) return 'كلمة المرور ست خانات على الأقل'; try { await API('/users/credentials', { method: 'POST', body: JSON.stringify({ email: d.email, password: d.password }) }); } catch (e) { return 'تعذّر حفظ كلمة المرور على الخادم'; } }
    },
  },
};
const isAdminRole = id => { const r = get('roles', id); return !!(r && (r.perms || []).includes('*')); };
const catBadge = id => { const c = get('cats', id); return c ? `<span class="bg" style="background:${esc(c.color)}${c.color === '#ffc107' ? ';color:#000' : ''}">${c.icon ? `<i class="bi ${esc(c.icon)}"></i> ` : ''}${esc(c.name)}</span>` : ''; };
const entPerm = k => ENT[k].perm || k;
const entLabel = (k, r) => (ENT[k].label ? ENT[k].label(r) : r.name || r.title || r.id);

/* ---------- حالة القوائم ---------- */
const LS = {};
const ls = k => LS[k] || (LS[k] = { q: '', page: 1, size: 10, view: 'a', sort: null, dir: 1, f: {}, sel: new Set(), hide: new Set(), from: '', to: '' });
const optList = o => (typeof o === 'function' ? o() : o).map(x => Array.isArray(x) ? x : [x, x]);

function listRows(k) {
  const E = ENT[k], st = ls(k);
  let rows = S[k].filter(r => !!r.deleted === (st.view === 'd'));
  const q = st.q.trim().toLowerCase();
  if (q) rows = rows.filter(r => E.search(r).toLowerCase().includes(q));
  for (const f of E.filters || []) if (st.f[f.id]) rows = rows.filter(r => f.test(r, st.f[f.id]));
  if (E.dates) { if (st.from) rows = rows.filter(r => r.date >= st.from); if (st.to) rows = rows.filter(r => r.date <= st.to); }
  const sc = st.sort && E.cols.find(c => c.id === st.sort);
  if (sc && sc.s) rows = [...rows].sort((a, b) => { const x = sc.s(a), y = sc.s(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ar')) * st.dir; });
  else rows = [...rows].sort((a, b) => (b._c || 0) - (a._c || 0));
  return rows;
}
function listPage(k) {
  const E = ENT[k], st = ls(k), p = entPerm(k);
  if (!can(p + '.view')) return noAccess();
  st.sel.clear();
  const filt = (E.filters || []).map(f => `<select onchange="lf('${k}','${f.id}',this.value)"><option value="">${f.l}</option>${optList(f.opts).map(([v, l]) => `<option value="${esc(v)}" ${st.f[f.id] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`).join('');
  const hid = E.cols.map(c => `<label><input type="checkbox" ${st.hide.has(c.id) ? '' : 'checked'} onchange="lcol('${k}','${c.id}',this.checked)"> ${c.l}</label>`).join('');
  return `<h2><i class="bi ${E.ic}"></i> ${E.t}</h2>${E.stats ? E.stats() : ''}
<div class="card"><div class="tb">${can(p + '.create') ? `<button class="btn o" onclick="openForm('${k}')"><i class="bi bi-plus-lg"></i> ${E.add}</button>` : ''}<div class="dd"><button class="btn o" style="width:auto" onclick="this.nextElementSibling.hidden=!this.nextElementSibling.hidden"><i class="bi bi-layout-three-columns"></i></button><div class="dd-m" hidden>${hid}</div></div></div>
<input placeholder="${E.ph}" value="${esc(st.q)}" oninput="lq('${k}',this.value)">
<div class="grid">${filt}</div>${E.dates ? `<div class="grid"><div><label class="f">من تاريخ</label><input type="date" value="${st.from}" onchange="ls('${k}').from=this.value;ls('${k}').page=1;refreshList('${k}')"></div><div><label class="f">إلى تاريخ</label><input type="date" value="${st.to}" onchange="ls('${k}').to=this.value;ls('${k}').page=1;refreshList('${k}')"></div></div>` : ''}
<div class="grid"><select onchange="ls('${k}').size=+this.value;ls('${k}').page=1;refreshList('${k}')">${[10, 25, 50, 100].map(n => `<option ${st.size === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
<select onchange="ls('${k}').view=this.value;ls('${k}').page=1;ls('${k}').sel.clear();refreshList('${k}')"><option value="a" ${st.view === 'a' ? 'selected' : ''}>النشطة</option>${can('system.restore') ? `<option value="d" ${st.view === 'd' ? 'selected' : ''}>المحذوفة</option>` : ''}</select></div>
<div class="sm ct" id="lcnt"></div></div><div id="lbulk"></div><div class="card ov" id="ltab"></div>`;
}
function lq(k, v) { const st = ls(k); st.q = v; st.page = 1; clearTimeout(lq.t); lq.t = setTimeout(() => refreshList(k), 160); }
function lf(k, f, v) { const st = ls(k); st.f[f] = v; st.page = 1; refreshList(k); }
function lcol(k, c, on) { const h = ls(k).hide; on ? h.delete(c) : h.add(c); refreshList(k); }
function lsort(k, c) { const st = ls(k); if (st.sort === c) st.dir *= -1; else { st.sort = c; st.dir = 1; } refreshList(k); }
function lpage(k, n) { ls(k).page = n; refreshList(k); }
function refreshList(k) {
  const E = ENT[k], st = ls(k), p = entPerm(k), rows = listRows(k), pages = Math.max(1, Math.ceil(rows.length / st.size));
  if (st.page > pages) st.page = pages;
  const cur = rows.slice((st.page - 1) * st.size, st.page * st.size), cols = E.cols.filter(c => !st.hide.has(c.id)), del = st.view === 'd';
  $('#lcnt').innerHTML = `النتائج: ${rows.length}${E.total && !del ? ' — ' + E.total(rows) : ''}`;
  const n = st.sel.size, canE = can(p + '.edit'), canD = can(p + '.delete');
  $('#lbulk').innerHTML = n ? `<div class="bulk"><b><i class="bi bi-check2-square"></i> تم تحديد: ${n}</b>${del ? (can('system.restore') ? `<button class="btn xs g" onclick="bulkDo('${k}','restore')"><i class="bi bi-arrow-counterclockwise"></i> استعادة</button>` : '') : `${canE ? (E.bulkStatus || []).map(s => { s = Array.isArray(s) ? s : [s, s, '', 'w']; return `<button class="btn xs ${s[3] || 'w'}" onclick="bulkDo('${k}','st','${esc(s[0])}')">${s[2] ? `<i class="bi ${s[2]}"></i> ` : ''}${s[1]}</button>`; }).join('') : ''}${canD ? `<button class="btn xs d" onclick="bulkDo('${k}','del')"><i class="bi bi-trash3"></i> حذف</button>` : ''}`}<button class="btn xs o" onclick="ls('${k}').sel.clear();refreshList('${k}')"><i class="bi bi-x-lg"></i> إلغاء</button></div>` : '';
  const allSel = cur.length && cur.every(r => st.sel.has(r.id));
  $('#ltab').innerHTML = `<table><tr><th><input type="checkbox" ${allSel ? 'checked' : ''} onchange="lall('${k}',this.checked)"></th><th>#</th>${cols.map(c => `<th class="${c.s ? 'so' : ''}" ${c.s ? `onclick="lsort('${k}','${c.id}')"` : ''}>${c.l}${c.s ? (st.sort === c.id ? (st.dir > 0 ? ' ↑' : ' ↓') : ' <small style="opacity:.6">⇅</small>') : ''}</th>`).join('')}<th>الإعدادات</th></tr>${cur.map((r, i) => `<tr class="${st.sel.has(r.id) ? 'sel' : ''}"><td><input type="checkbox" ${st.sel.has(r.id) ? 'checked' : ''} onchange="lsel('${k}','${r.id}',this.checked)"></td><td>${(st.page - 1) * st.size + i + 1}</td>${cols.map(c => `<td>${c.r(r)}</td>`).join('')}<td class="act">${rowActs(k, r)}</td></tr>`).join('')}</table>${rows.length ? '' : `<div class="em"><i class="bi bi-inbox"></i>${del ? 'لا توجد سجلات محذوفة' : 'لا توجد بيانات — أضف أول سجل'}</div>`}${pages > 1 ? `<div class="pg">${pageBtns(k, st.page, pages)}</div>` : ''}`;
}
const pageBtns = (k, c, n) => { const a = []; for (let i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - c) <= 1) a.push(i); else if (a[a.length - 1] !== '…') a.push('…'); return a.map(i => i === '…' ? '<span>…</span>' : `<button class="${i === c ? 'on' : ''}" onclick="lpage('${k}',${i})">${i}</button>`).join(''); };
function lsel(k, id, on) { const s = ls(k).sel; on ? s.add(id) : s.delete(id); refreshList(k); }
function lall(k, on) { const st = ls(k), rows = listRows(k).slice((st.page - 1) * st.size, st.page * st.size); rows.forEach(r => on ? st.sel.add(r.id) : st.sel.delete(r.id)); refreshList(k); }
function rowActs(k, r) {
  const E = ENT[k], p = entPerm(k);
  if (r.deleted) return can('system.restore') ? `<button class="btn xs g" title="استعادة" onclick="restoreRec('${k}','${r.id}')"><i class="bi bi-arrow-counterclockwise"></i></button>` : '';
  let h = E.extra ? E.extra(r) : '';
  if (E.bulkStatus && can(p + '.edit') && k === 'users' && ME && r.id !== ME.id) h += r.status === 'مفعل' ? `<button class="btn xs y" title="إيقاف" onclick="setStatus('${k}','${r.id}','موقوف')"><i class="bi bi-pause-circle"></i></button>` : `<button class="btn xs g" title="تفعيل" onclick="setStatus('${k}','${r.id}','مفعل')"><i class="bi bi-play-circle"></i></button>`;
  if (can(p + '.edit')) h += `<button class="btn xs" title="تعديل" onclick="openForm('${k}','${r.id}')"><i class="bi bi-pencil-square"></i></button>`;
  if (can(p + '.delete')) h += `<button class="btn xs d" title="حذف" onclick="delRec('${k}','${r.id}')"><i class="bi bi-trash3"></i></button>`;
  return h;
}

/* ---------- العمليات ---------- */
function nkey(k, ev) { const E = ENT[k]; return (E.nk || k) + '.' + ev; }
function blocked(k, r) {
  const E = ENT[k]; let why = E.protect && E.protect(r); if (why) return why;
  const refs = (E.refs ? E.refs(r) : []).filter(x => x[1] > 0);
  return refs.length ? `لا يمكن حذف «${esc(entLabel(k, r))}» لأنه مرتبط بـ: ` + refs.map(x => x[1] + ' ' + x[0]).join('، ') : null;
}
function doDelete(k, r) {
  r.deleted = true; r.delAt = Date.now(); touch(r);
  logOp('حذف', ENT[k].t, entLabel(k, r)); if (ENT[k].g && !['transfers'].includes(k)) notify(nkey(k, 'del'), `🗑 حذف ${ENT[k].sg}: ${entLabel(k, r)}`); else if (k === 'transfers') notify('funds.xfer_del', `🗑 حذف تحويل: ${entLabel(k, r)}`);
}
function delRec(k, id) {
  const r = get(k, id), why = blocked(k, r);
  if (why) return T('⚠️ ' + why.replace(/&[a-z#0-9]+;/g, ''));
  confirmBox(`حذف «${esc(entLabel(k, r))}»؟ يمكن استعادته لاحقاً من قائمة المحذوفات.`, () => { doDelete(k, r); save(); T('🗑 تم الحذف'); render(true); }, 'حذف');
}
function restoreRec(k, id) {
  const r = get(k, id); delete r.deleted; delete r.delAt; touch(r);
  logOp('استعادة', ENT[k].t, entLabel(k, r)); notify(k === 'transfers' ? 'funds.xfer' : nkey(k, 'restore'), `↩️ استعادة ${ENT[k].sg}: ${entLabel(k, r)}`);
  save(); T('↩️ تمت الاستعادة'); render(true);
}
function setStatus(k, id, v) {
  const r = get(k, id), why = v !== 'مفعل' && ENT[k].protect && ENT[k].protect(r); if (why) return T('⚠️ ' + why);
  r.status = v; touch(r); logOp('تعديل', ENT[k].t, `${entLabel(k, r)} ← ${v}`); notify(nkey(k, 'edit'), `✏️ تعديل ${ENT[k].sg}: ${entLabel(k, r)} (${v})`); save(); T('✅ تم التحديث'); render(true);
}
function bulkDo(k, act, v) {
  const st = ls(k), ids = [...st.sel], rs = ids.map(i => get(k, i)).filter(Boolean);
  if (act === 'del') {
    const bad = rs.map(r => blocked(k, r)).filter(Boolean);
    if (bad.length) return T('⚠️ ' + bad[0].replace(/&[a-z#0-9]+;/g, '') + (bad.length > 1 ? ` (+${bad.length - 1} أخرى)` : ''));
    return confirmBox(`حذف ${rs.length} سجل؟ يمكن استعادتها لاحقاً.`, () => { rs.forEach(r => doDelete(k, r)); st.sel.clear(); save(); T('🗑 تم حذف ' + rs.length); render(true); }, 'حذف');
  }
  if (act === 'restore') { rs.forEach(r => { delete r.deleted; delete r.delAt; touch(r); logOp('استعادة', ENT[k].t, entLabel(k, r)); }); st.sel.clear(); notify(nkey(k, 'restore'), `↩️ استعادة ${rs.length} من ${ENT[k].t}`); save(); T('↩️ تمت الاستعادة'); return render(true); }
  if (act === 'st') {
    const bad = v !== 'مفعل' && rs.map(r => ENT[k].protect && ENT[k].protect(r)).find(Boolean); if (bad) return T('⚠️ ' + bad);
    rs.forEach(r => { r.status = v; touch(r); logOp('تعديل', ENT[k].t, `${entLabel(k, r)} ← ${v}`); }); st.sel.clear(); notify(nkey(k, 'edit'), `✏️ تحديث حالة ${rs.length} من ${ENT[k].t} إلى ${v}`); save(); T('✅ تم التحديث'); render(true);
  }
}
function approve(k, id) {
  const r = get(k, id), isD = k === 'donations';
  if (!isD) { const a = available(r.fund, r.campaign, r.id); if (r.amount > a) return T(`⚠️ لا يتوفر رصيد كافٍ للموافقة (المتاح ${money(Math.max(0, a))})`); }
  r.status = isD ? 'مؤكد' : 'معتمدة'; touch(r); logOp(isD ? 'تأكيد' : 'موافقة', ENT[k].t, entLabel(k, r));
  if (isD) ENT.donations.after(r); save(); T('✅ تم'); render(true);
}

/* ---------- النماذج ---------- */
let FORM = null;
function selOpts(f, v) {
  let o = optList(f.opts); if (v && !o.some(x => x[0] === v)) { const nmv = typeof f.opts === 'function' && !f.cg ? null : v; const lab = ['fund', 'campaign', 'camp', 'area', 'family', 'donor', 'project', 'ben', 'from', 'to'].includes(f.id) ? nm({ fund: 'funds', campaign: 'campaigns', camp: 'campaigns', area: 'areas', family: 'families', donor: 'donors', project: 'projects', ben: 'beneficiaries', from: 'funds', to: 'funds' }[f.id], v, null) : nmv; if (lab) o = [...o, [v, lab]]; }
  return (f.blank ? `<option value="">${f.blank === 1 ? '—' : f.blank}</option>` : '') + o.map(([x, l]) => `<option value="${esc(x)}" ${x === v ? 'selected' : ''}>${esc(l)}</option>`).join('');
}
function fieldHtml(f, rec) {
  const id = 'f_' + f.id; let v = rec ? rec[f.id] : undefined; if (v === undefined || v === null) v = f.def === 'today' ? td() : f.def ?? (f.t === 'toggle' ? false : f.t === 'range' ? 0 : f.t === 'links' || f.t === 'multi' ? [] : '');
  const L = `<label class="f">${f.l}${f.req ? ' <i>*</i>' : ''}</label>`, H = f.hint ? `<div class="hint">${f.hint}</div>` : '', A = f.after || '';
  const wrap = h => `<div class="fw" data-tab="${f.tab ?? ''}" ${f.half ? 'data-half="1"' : ''}>${h}${A}</div>`;
  switch (f.t) {
    case 'area': return wrap(L + `<textarea id="${id}" rows="3" placeholder="${esc(f.ph || f.l)}">${esc(v)}</textarea>` + H);
    case 'select': return wrap(L + `<select id="${id}" ${f.onchange ? `onchange="${f.onchange}"` : ''}>${selOpts(f, v)}</select>` + H);
    case 'toggle': return wrap(`<label class="tg"><span>${f.l}${f.hint ? `<small>${f.hint}</small>` : ''}</span><input type="checkbox" id="${id}" ${v ? 'checked' : ''}><i></i></label>`);
    case 'range': return wrap(L + `<div style="display:flex;gap:10px;align-items:center"><span class="bg p" style="min-width:48px;text-align:center" id="${id}_v">${num(v)}%</span><input type="range" id="${id}" min="0" max="100" step="5" value="${num(v)}" oninput="$('#${id}_v').textContent=this.value+'%'"></div>`);
    case 'multi': { const o = optList(f.opts); return wrap(L + (o.length ? `<div class="chk" id="${id}">${o.map(([x, l]) => `<label class="${(v || []).includes(x) ? 'on' : ''}"><input type="checkbox" value="${esc(x)}" ${(v || []).includes(x) ? 'checked' : ''} onchange="this.parentNode.classList.toggle('on',this.checked);$('#tabcnt').textContent=$$('#${id} input:checked').length"> ${esc(l)}</label>`).join('')}</div>` : `<div class="em">لا توجد تصنيفات مفعّلة — أضفها من قسم التصنيفات</div>`)); }
    case 'links': { FORM.links[f.id] = [...(v || [])]; return wrap(linksHtml(f)); }
    default: return wrap(L + `<input id="${id}" type="${f.t === 'number' ? 'number' : f.t === 'date' ? 'date' : f.t === 'password' ? 'password' : f.t === 'tel' ? 'tel' : f.t === 'email' ? 'email' : 'text'}" ${f.t === 'number' ? 'min="0" step="any" inputmode="decimal"' : ''} ${f.t === 'password' ? 'autocomplete="new-password"' : ''} placeholder="${f.t === 'number' ? '0' : esc(f.ph || f.l)}" value="${esc(v)}">` + H);
  }
}
function linksHtml(f) {
  const arr = FORM.links[f.id], img = f.kind === 'img';
  return `<div class="sec"><i class="bi ${img ? 'bi-image' : 'bi-play-circle'}"></i> ${f.l}</div>${img ? `<div class="hint">اختر الصور مباشرة من الاستوديو — الأبعاد الموصى بها <b>800×450</b> بكسل (نسبة 16:9). تُصغَّر الصور تلقائياً قبل الرفع.</div>` : `<div class="hint">يدعم يوتيوب وفيسبوك — الصق رابط الفيديو الكامل. لفيديو فيسبوك: انسخ الرابط من المتصفح مباشرة.</div>`}
${img ? `<div class="lk"><button type="button" class="btn s o" onclick="$('#lkf_${f.id}').click()"><i class="bi bi-images"></i> إضافة صورة من الاستوديو</button><input type="file" id="lkf_${f.id}" accept="image/*" multiple hidden onchange="lkUpload('${f.id}',this)"></div>` : `<div class="lk"><input id="lki_${f.id}" dir="ltr" placeholder="https://www.youtube.com/watch?v=xxx"><button type="button" class="btn s o" onclick="lkAdd('${f.id}','${f.kind}')"><i class="bi bi-plus-lg"></i> إضافة</button></div>`}
<div id="lkl_${f.id}">${linkList(f.id)}</div>`;
}
const linkList = id => FORM.links[id].length ? FORM.links[id].map((u, i) => `<div class="lkl">${id === 'images' ? `<img src="${esc(u)}" alt="" style="height:44px;width:72px;object-fit:cover;border-radius:6px">` : `<span>${esc(u)}</span>`}<i class="bi bi-x-circle" onclick="lkDel('${id}',${i})"></i></div>`).join('') : `<div class="em" style="padding:8px"><i class="bi bi-${id === 'images' ? 'image' : 'play-circle'}"></i>${id === 'images' ? 'لا توجد صور — أضف أول صورة من الاستوديو' : 'لا توجد روابط — أضف أول رابط أعلاه'}</div>`;
const imgShrink = (file, max, q) => new Promise((ok, no) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', q)); }; im.onerror = () => { URL.revokeObjectURL(u); no(new Error('img')); }; im.src = u; });
async function lkUpload(id, inp) {
  const files = [...inp.files]; inp.value = '';
  for (const f of files) {
    if (FORM.links[id].length >= 10) { T('⚠️ الحد الأقصى 10 صور'); break; }
    if (!/^image\//.test(f.type)) { T('⚠️ الملف المختار ليس صورة'); continue; }
    try {
      T('⏳ جارٍ رفع الصورة...');
      const r = await API('/media', { method: 'POST', body: JSON.stringify({ data: await imgShrink(f, 1280, 0.82) }) });
      FORM.links[id].push(r.url); $('#lkl_' + id).innerHTML = linkList(id); T('✅ تمت إضافة الصورة');
    } catch (e) { T(e && e.status === 413 ? '⚠️ حجم الصورة كبير' : '⚠️ تعذر رفع الصورة'); }
  }
}
function lkAdd(id, kind) { const i = $('#lki_' + id), u = i.value.trim(); if (!u) return; if (!isUrl(u)) return T('⚠️ الرابط غير صحيح (يبدأ بـ https://)'); if (kind === 'vid' && !videoEmbed(u)) return T('⚠️ الفيديو غير مدعوم — استخدم رابط يوتيوب أو فيسبوك'); if (FORM.links[id].includes(u)) return T('⚠️ الرابط مضاف مسبقاً'); FORM.links[id].push(u); i.value = ''; $('#lkl_' + id).innerHTML = linkList(id); }
function lkDel(id, i) { FORM.links[id].splice(i, 1); $('#lkl_' + id).innerHTML = linkList(id); }
function donCamp(sel) { const c = get('campaigns', sel.value), f = $('#f_fund'); if (c && f) { f.value = c.fund; f.disabled = true; } else if (f) f.disabled = false; }
function openForm(k, id) {
  const E = ENT[k], old = id ? get(k, id) : null, p = entPerm(k);
  if (!can(p + (old ? '.edit' : '.create'))) return T('⚠️ لا تملك الصلاحية');
  FORM = { k, id, links: {}, tab: 0 };
  const body = (E.tabs ? `<div class="tabs">${E.tabs.map((t, i) => `<button type="button" class="${i ? '' : 'on'}" onclick="formTab(${i})"><i class="bi ${t[0]}"></i>${t[1]}${i === 2 ? ` <span class="bg p" id="tabcnt">${(old?.cats || []).length}</span>` : ''}</button>`).join('')}</div>` : '') + E.fields.map(f => fieldHtml(f, old)).join('') + `<button class="btn" id="fsave" onclick="saveForm()" style="margin-top:10px"><i class="bi bi-${old ? 'check2-circle' : 'plus-circle'}"></i> ${old ? 'حفظ التعديلات' : E.mk}</button>`;
  const m = modal(`<i class="bi bi-${old ? 'pencil-square' : 'plus-circle'}"></i> ${old ? 'تعديل' : (E.title || E.add)}${old ? ' — ' + esc(E.sg) : ''}`, body);
  if (E.tabs) formTab(0);
  const half = [...m.querySelectorAll('[data-half]')]; if (half.length === 2) { const w = document.createElement('div'); w.className = 'grid'; half[0].before(w); w.append(half[0], half[1]); }
  if (k === 'donations' && $('#f_campaign').value) donCamp($('#f_campaign'));
  const first = m.querySelector('input:not([type=checkbox]),select'); if (first && !old && first.tagName === 'INPUT') setTimeout(() => { if (!$('.m input:focus,.m select:focus,.m textarea:focus')) first.focus(); }, 50);
}
function formTab(i) { FORM.tab = i; $$('.tabs button').forEach((b, j) => b.classList.toggle('on', i === j)); $$('.fw').forEach(w => { if (w.dataset.tab !== '') w.style.display = +w.dataset.tab === i ? '' : 'none'; }); }
function readField(f) {
  const el = $('#f_' + f.id);
  switch (f.t) {
    case 'toggle': return el.checked;
    case 'number': return el.value === '' ? '' : Math.max(0, +el.value);
    case 'range': return +el.value;
    case 'multi': return $$('#f_' + f.id + ' input:checked').map(x => x.value);
    case 'links': return [...FORM.links[f.id]];
    case 'select': return el.value;
    default: return el.value.trim();
  }
}
async function saveForm() {
  const { k, id } = FORM, E = ENT[k], old = id ? get(k, id) : null, data = {};
  for (const f of E.fields) {
    data[f.id] = readField(f);
    if (f.id === 'fund' && $('#f_fund').disabled) data.fund = $('#f_fund').value;
    if (f.req && (data[f.id] === '' || data[f.id] == null)) { if (f.tab != null && E.tabs) formTab(f.tab); $('#f_' + f.id).focus(); return T('⚠️ الحقل مطلوب: ' + f.l); }
  }
  for (const f of E.fields) if (f.t === 'number' && data[f.id] === '') data[f.id] = 0;
  const btn = $('#fsave'); btn.disabled = true;
  try {
    const err = E.check && await E.check(data, old);
    if (err) { btn.disabled = false; return T('⚠️ ' + err); }
  } catch (e) { btn.disabled = false; return T('⚠️ حدث خطأ غير متوقع'); }
  for (const f of E.fields) if (f.nostore) delete data[f.id];
  let rec;
  if (old) { Object.assign(old, data); touch(old); rec = old; logOp('تعديل', E.t, entLabel(k, rec)); notify(k === 'transfers' ? 'funds.xfer_edit' : nkey(k, 'edit'), `✏️ تعديل ${E.sg}: ${entLabel(k, rec)}`); }
  else {
    const t = Date.now(); rec = { id: k[0] + '_' + uid(), _c: t, _u: t, ...data }; E.prep && E.prep(rec, true); S[k].push(rec);
    logOp('إنشاء', E.t, entLabel(k, rec)); notify(k === 'transfers' ? 'funds.xfer' : nkey(k, 'new'), `➕ ${E.sg} جديد: ${entLabel(k, rec)}`);
  }
  E.after && E.after(rec, !old);
  save(); closeM(); T('✅ تم الحفظ'); render(true);
}
const noAccess = () => `<div class="card em"><i class="bi bi-shield-lock"></i>لا تملك صلاحية الوصول لهذه الصفحة</div>`;
