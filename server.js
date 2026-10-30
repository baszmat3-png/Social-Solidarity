// تكافل — خادم Express: واجهة ثابتة + API + تخزين (Postgres أو ملف JSON)
// يدعم: عدة مستخدمين بكلمات مرور مشفّرة، فرض الصلاحيات، دمج التعديلات المتزامنة، رفع الشعار/الغلاف، API عام.
const express = require('express'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const { ADMIN_EMAIL = 'admin@takaful.local', ADMIN_PASSWORD = 'ChangeMe123', DATABASE_URL, PORT = 3000 } = process.env;
const SECRET = process.env.SECRET || crypto.randomBytes(32).toString('hex');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '6mb' }));
app.use((req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' }); next(); });

/* ---------- التخزين (مفتاح/قيمة) ---------- */
let store;
if (DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false });
  store = {
    init: () => pool.query('create table if not exists kv(k text primary key, v jsonb not null)'),
    get: async k => (await pool.query('select v from kv where k=$1', [k])).rows[0]?.v ?? null,
    set: (k, v) => pool.query('insert into kv(k,v) values($1,$2) on conflict(k) do update set v=excluded.v', [k, JSON.stringify(v)]),
  };
} else {
  const f = path.join(__dirname, 'data', 'db.json');
  let cache = null;
  const load = () => { if (!cache) { try { cache = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { cache = {}; } if (cache.S && !cache.state) cache = { state: cache }; } return cache; };
  const flush = () => { const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(cache)); fs.renameSync(t, f); };
  store = {
    init: async () => fs.mkdirSync(path.dirname(f), { recursive: true }),
    get: async k => load()[k] ?? null,
    set: async (k, v) => { load()[k] = v; flush(); },
  };
}
let lock = Promise.resolve();                       // تسلسل الكتابة لتفادي تضارب الدمج
const serial = fn => (lock = lock.then(fn, fn));

/* ---------- كلمات المرور والرمز ---------- */
const sign = d => crypto.createHmac('sha256', SECRET).update(d).digest('base64url');
const mkToken = email => { const b = Buffer.from(JSON.stringify({ email, exp: Date.now() + 7 * 864e5 })).toString('base64url'); return b + '.' + sign(b); };
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const scrypt = (p, s) => new Promise((ok, no) => crypto.scrypt(String(p), s, 32, (e, k) => e ? no(e) : ok(k.toString('hex'))));
const lc = s => String(s || '').trim().toLowerCase();
async function setPass(email, pw) {
  const c = (await store.get('creds')) || {}, s = crypto.randomBytes(16).toString('hex');
  c[lc(email)] = { s, h: await scrypt(pw, s) };
  await store.set('creds', c);
}
async function checkPass(email, pw) {
  const c = (await store.get('creds')) || {}, r = c[lc(email)];
  if (r) return safeEq(await scrypt(pw, r.s), r.h);
  return lc(email) === lc(ADMIN_EMAIL) && safeEq(pw, ADMIN_PASSWORD);
}
const stateOf = async () => (await store.get('state')) || { S: {} };

// يحدد المستخدم وصلاحياته من الحالة المخزّنة
async function resolveUser(email) {
  const S = (await stateOf()).S || {};
  const u = (S.users || []).find(x => lc(x.email) === lc(email) && !x.deleted);
  if (u) {
    if (u.status !== 'مفعل') return null;
    const role = (S.roles || []).find(r => r.id === u.role && !r.deleted);
    return { email: u.email, id: u.id, name: u.name, perms: new Set(role ? role.perms : []) };
  }
  if (lc(email) === lc(ADMIN_EMAIL)) return { email, id: null, name: 'مدير النظام', perms: new Set(['*']) };
  return null;
}
const auth = async (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', ''), [b, s] = t.split('.');
    if (b && s && safeEq(s, sign(b))) {
      const p = JSON.parse(Buffer.from(b, 'base64url'));
      if (p.exp > Date.now()) {
        const u = await resolveUser(p.email);
        if (u) { u.has = k => u.perms.has('*') || u.perms.has(k); req.user = u; return next(); }
      }
    }
  } catch {}
  res.status(401).json({ error: 'unauthorized' });
};
const need = k => (req, res, next) => req.user.has(k) ? next() : res.status(403).json({ error: 'forbidden' });

const buckets = new Map();
const limiter = (name, max, ms = 9e5) => (req, res, next) => {
  const k = name + ':' + req.ip, now = Date.now(), a = (buckets.get(k) || []).filter(t => now - t < ms);
  if (a.length >= max) return res.status(429).json({ error: 'too_many_attempts' });
  a.push(now); buckets.set(k, a); next();
};
setInterval(() => { const now = Date.now(); for (const [k, a] of buckets) if (!a.some(t => now - t < 9e5)) buckets.delete(k); }, 6e5).unref();

/* ---------- دمج الحالة ---------- */
const COLL = ['funds', 'donors', 'areas', 'families', 'beneficiaries', 'campaigns', 'projects', 'donations', 'expenses', 'transfers', 'users', 'roles', 'cats', 'log', 'nf'];
const OBJ = { R: 'settings.org', P: 'settings.public', NS: null };
const WRITE_KEYS = ['create', 'edit', 'delete'];
function canWrite(u, c) {
  if (c === 'log' || c === 'nf') return true;
  const e = c === 'transfers' ? 'funds' : c;
  return WRITE_KEYS.some(a => u.has(e + '.' + a)) || u.has('system.restore') ||
    (c === 'donations' && u.has('donations.confirm')) || (c === 'expenses' && u.has('expenses.approve'));
}
const isAll = (S, roleId) => { const r = (S.roles || []).find(x => x.id === roleId); return !!(r && (r.perms || []).includes('*')); };

function mergeColl(c, cur = [], inc = [], u, S) {
  const m = new Map(cur.map(x => [x.id, x]));
  const allowed = canWrite(u, c);
  for (const x of inc) {
    if (!x || typeof x.id !== 'string' || x.id.length > 40) continue;
    const o = m.get(x.id);
    if (c === 'nf') {                                         // الإشعارات: دمج علامات القراءة فقط
      if (o) o.read = { ...(o.read || {}), ...(x.read || {}) }; else if (!o) m.set(x.id, { ...x, read: x.read || {} });
      continue;
    }
    if (o && (x._u || 0) <= (o._u || 0)) continue;           // الأحدث يفوز
    if (c === 'log') { if (!o) m.set(x.id, x); continue; }
    let rec = x;
    if (c === 'users') {
      const mine = u.id && x.id === u.id;
      if (!allowed && !mine) continue;
      if (o && !allowed && mine) rec = { ...o, name: x.name, phone: x.phone, _u: x._u };      // المستخدم يعدّل اسمه وهاتفه فقط
      if (!u.has('*') && (isAll(S, rec.role) || (o && isAll(S, o.role)))) continue;          // لا أحد غير المدير الكامل يمنح/يعدّل صلاحية كاملة
      if (u.id && x.id === u.id && o && o.role !== rec.role && !u.has('*')) rec = { ...rec, role: o.role, status: o.status };
    } else if (!allowed) continue;
    if (c === 'roles' && !u.has('*') && ((rec.perms || []).includes('*') || (o && (o.perms || []).includes('*')))) continue;
    m.set(x.id, rec);
  }
  let out = [...m.values()].sort((a, b) => (a._c || 0) - (b._c || 0) || (a.id < b.id ? -1 : 1));
  if (c === 'log') out = out.slice(-3000);
  if (c === 'nf') out = out.slice(-400);
  return out;
}
function mergeState(cur, inc, u) {
  const out = { ...cur };
  for (const c of COLL) out[c] = mergeColl(c, cur[c], Array.isArray(inc[c]) ? inc[c] : [], u, cur);
  for (const [k, perm] of Object.entries(OBJ)) {
    const a = cur[k], b = inc[k];
    if (b && typeof b === 'object' && (!a || (b._u || 0) > (a._u || 0)) && (!perm || u.has(perm))) out[k] = b;
  }
  const ns = { ...(cur.NS || {}) };                                  // تفضيلات الإشعارات: لكل مستخدم مفتاحه
  for (const [e, v] of Object.entries(inc.NS || {})) if (lc(e) === lc(u.email) && (!ns[e] || (v._u || 0) > (ns[e]._u || 0))) ns[e] = v;
  out.NS = ns;
  return out;
}
// يضمن وجود حساب مدير النظام في قائمة المستخدمين
function ensureAdmin(S) {
  if (!Array.isArray(S.users)) S.users = [];
  if (!S.users.some(x => lc(x.email) === lc(ADMIN_EMAIL))) {
    let role = (S.roles || []).find(r => (r.perms || []).includes('*'));
    if (!role) { role = { id: 'r_admin', name: 'مدير المؤسسة', perms: ['*'], sys: true, _c: 1, _u: 1 }; (S.roles = S.roles || []).push(role); }
    S.users.push({ id: 'u_admin', name: 'مدير النظام', email: ADMIN_EMAIL, phone: '', role: role.id, status: 'مفعل', _c: 1, _u: 1 });
  }
}

/* ---------- API: الدخول ---------- */
app.get('/healthz', (_, res) => res.send('ok'));

app.post('/api/login', limiter('login', 15), async (req, res) => {
  try {
    const { email = '', password = '' } = req.body || {};
    if (!email || !password || !(await checkPass(email, String(password)))) return res.status(401).json({ error: 'invalid_credentials' });
    const u = await resolveUser(email);
    if (!u) return res.status(403).json({ error: 'suspended' });
    res.json({ token: mkToken(u.email), email: u.email });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server' }); }
});

app.post('/api/password', auth, limiter('pw', 20), async (req, res) => {
  const { old = '', password = '' } = req.body || {};
  if (String(password).length < 6) return res.status(400).json({ error: 'short_password' });
  if (!(await checkPass(req.user.email, String(old)))) return res.status(403).json({ error: 'wrong_password' });
  await setPass(req.user.email, String(password));
  res.json({ ok: true });
});

// إنشاء/تغيير كلمة مرور مستخدم (لمن يملك صلاحية إدارة المستخدمين)
app.post('/api/users/credentials', auth, async (req, res) => {
  const { email = '', password = '' } = req.body || {};
  if (!(req.user.has('users.create') || req.user.has('users.edit'))) return res.status(403).json({ error: 'forbidden' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'bad_email' });
  if (String(password).length < 6) return res.status(400).json({ error: 'short_password' });
  const S = (await stateOf()).S || {}, target = (S.users || []).find(x => lc(x.email) === lc(email) && !x.deleted);
  if (target && isAll(S, target.role) && !req.user.has('*')) return res.status(403).json({ error: 'forbidden' });
  await setPass(email, String(password));
  res.json({ ok: true });
});

/* ---------- API: الحالة ---------- */
app.get('/api/me', auth, (req, res) => res.json({ email: req.user.email, perms: [...req.user.perms] }));

app.get('/api/state', auth, async (req, res) => {
  const st = await stateOf(); st.S = st.S || {};
  if (req.user.has('*')) ensureAdmin(st.S);
  res.json({ S: st.S });
});

app.put('/api/state', auth, (req, res) => serial(async () => {
  try {
    const inc = req.body && req.body.S;
    if (!inc || typeof inc !== 'object') return res.status(400).json({ error: 'bad_body' });
    const st = await stateOf(), cur = st.S || {};
    const first = !Object.keys(cur).length;
    const merged = first && req.user.has('*') ? { ...inc } : mergeState(cur, inc, req.user);
    if (first) for (const c of COLL) merged[c] = Array.isArray(merged[c]) ? merged[c] : [];
    ensureAdmin(merged);
    await store.set('state', { S: merged });
    res.json({ S: merged });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server' }); }
}));

/* ---------- API: الصور (شعار/غلاف) ---------- */
const IMG = { logo: 2 * 1024 * 1024, cover: 4 * 1024 * 1024 };
app.post('/api/upload/:name', auth, need('settings.public'), async (req, res) => {
  const name = req.params.name, d = String(req.body?.data || '');
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(d);
  if (!IMG[name] || !m) return res.status(400).json({ error: 'bad_image' });
  if (Buffer.from(m[2], 'base64').length > IMG[name]) return res.status(413).json({ error: 'too_large' });
  await store.set('img:' + name, { type: m[1], b64: m[2], v: Date.now() });
  res.json({ url: `/api/img/${name}?v=${Date.now()}` });
});
app.delete('/api/upload/:name', auth, need('settings.public'), async (req, res) => {
  if (IMG[req.params.name]) await store.set('img:' + req.params.name, null);
  res.json({ ok: true });
});
app.get('/api/img/:name', async (req, res) => {
  const r = IMG[req.params.name] && await store.get('img:' + req.params.name);
  if (!r) return res.status(404).end();
  res.set({ 'Content-Type': r.type, 'Cache-Control': 'public, max-age=300' }).send(Buffer.from(r.b64, 'base64'));
});

/* ---------- API: صور الحملات والمشاريع (مرفوعة من الاستوديو) ---------- */
app.post('/api/media', auth, async (req, res) => {
  try {
    if (!['campaigns.create', 'campaigns.edit', 'projects.create', 'projects.edit', 'settings.public'].some(k => req.user.has(k))) return res.status(403).json({ error: 'forbidden' });
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String((req.body && req.body.data) || ''));
    if (!m) return res.status(400).json({ error: 'bad_image' });
    if (Buffer.from(m[2], 'base64').length > 3 * 1024 * 1024) return res.status(413).json({ error: 'too_large' });
    const id = crypto.randomBytes(8).toString('hex');
    await store.set('media:' + id, { type: m[1], b64: m[2], v: Date.now() });
    res.json({ url: `/api/media/${id}` });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server' }); }
});
app.get('/api/media/:id', async (req, res) => {
  const r = /^[a-f0-9]{16}$/.test(req.params.id) && await store.get('media:' + req.params.id);
  if (!r) return res.status(404).end();
  res.set({ 'Content-Type': r.type, 'Cache-Control': 'public, max-age=86400' }).send(Buffer.from(r.b64, 'base64'));
});

/* ---------- API: عام (للزوار) ---------- */
const num = v => +v || 0;
const rcNo = (d, all) => {
  const y = String(d.date || '').slice(0, 4), L = all.filter(x => String(x.date || '').slice(0, 4) === y).sort((a, b) => (a._c || 0) - (b._c || 0) || (a.id < b.id ? -1 : 1));
  return `DON-${y}-${String(L.findIndex(x => x.id === d.id) + 1).padStart(4, '0')}`;
};
const confirmed = d => !d.deleted && d.status !== 'بانتظار التأكيد';
const approved = e => !e.deleted && e.status !== 'بانتظار الموافقة';
const normPhone = s => String(s || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '').replace(/^00/, '').replace(/^964/, '').replace(/^0+/, '');
const safeUrl = u => /^(https?:\/\/|\/api\/media\/[a-f0-9]{16}$)/i.test(u) ? u : '';

app.get('/api/public', async (_, res) => {
  const S = (await stateOf()).S || {}, P = S.P || {}, sec = P.sections || {};
  const live = a => (S[a] || []).filter(x => !x.deleted);
  const dons = live('donations').filter(confirmed), exps = live('expenses').filter(approved);
  const raised = id => dons.filter(d => d.campaign === id).reduce((t, d) => t + num(d.amount), 0);
  const on = k => sec[k] !== false;
  const camp = c => {
    const r = raised(c.id), st = c.status === 'نشطة' && num(c.goal) > 0 && r >= num(c.goal) ? 'مكتملة' : c.status;
    return { id: c.id, name: c.name, desc: c.desc || '', images: (c.images || []).map(safeUrl).filter(Boolean), videos: (c.videos || []).map(safeUrl).filter(Boolean), goal: num(c.goal), raised: r, status: st, start: c.start || '', end: c.end || '', type: c.type || '' };
  };
  const spent = pid => exps.filter(e => e.project === pid).reduce((t, e) => t + num(e.amount), 0);
  const proj = p => ({ id: p.id, name: p.name, desc: p.desc || '', images: (p.images || []).map(safeUrl).filter(Boolean), videos: (p.videos || []).map(safeUrl).filter(Boolean), budget: num(p.budget), status: p.status, pct: num(p.pct), type: p.type || '', start: p.start || '', end: p.end || '' });
  const campaigns = live('campaigns').filter(c => c.pub !== false).map(camp), projects = live('projects').filter(p => p.pub !== false).map(proj);
  const det = P.statsDetail || {};
  const stats = { campaigns: campaigns.length, projects: projects.length };
  if (det.donors !== false) stats.donors = live('donors').filter(x => x.status === 'مفعل').length;
  if (det.beneficiaries !== false) stats.beneficiaries = live('beneficiaries').filter(x => x.status === 'نشط').length;
  const fin = P.fin ? { donations: dons.reduce((t, d) => t + num(d.amount), 0), expenses: exps.reduce((t, e) => t + num(e.amount), 0) } : null;
  if (fin) fin.balance = fin.donations - fin.expenses;
  res.json({
    empty: !Object.keys(S).length,
    org: { name: P.name || 'المؤسسة', about: P.about || '', logo: P.logo || '', cover: P.cover || '', phone: P.phone || '', email: P.email || '', site: safeUrl(P.site), address: P.address || '', city: P.city || '', province: P.province || '', social: Object.fromEntries(Object.entries(P.social || {}).map(([k, v]) => [k, safeUrl(v)])), slider: (P.slider || []).map(safeUrl).filter(Boolean), videos: (P.videos || []).map(safeUrl).filter(Boolean), sections: Object.fromEntries(['about', 'stats', 'camps', 'proj', 'gal', 'vid', 'cont', 'soc'].map(k => [k, on(k)])) },
    campaigns, projects, stats, fin,
  });
});

// التحقق من التبرعات برقم الهاتف أو برقم الوصل
app.post('/api/verify', limiter('verify', 30), async (req, res) => {
  const S = (await stateOf()).S || {}, q = String(req.body?.q ?? req.body?.phone ?? '').trim();
  if (!q) return res.json({ found: false });
  const all = S.donations || [], live = all.filter(confirmed);
  const camp = id => (S.campaigns || []).find(c => c.id === id), fund = id => (S.funds || []).find(f => f.id === id);
  const row = d => ({ no: rcNo(d, all), amount: num(d.amount), campaign: camp(d.campaign)?.name || '', fund: fund(d.fund)?.name || '', date: d.date, method: d.method });
  const m = /^don-(\d{4})-(\d+)$/i.exec(q);
  if (m) {
    const d = live.find(x => rcNo(x, all).toLowerCase() === q.toLowerCase());
    return res.json(d ? { found: true, by: 'receipt', donations: [row(d)] } : { found: false });
  }
  const p = normPhone(q);
  const donor = p.length >= 7 && (S.donors || []).find(x => !x.deleted && normPhone(x.phone) === p);
  if (!donor) return res.json({ found: false });
  const name = String(donor.name || '').split(' ')[0];
  res.json({ found: true, by: 'phone', name, donations: live.filter(x => x.donor === donor.id).sort((a, b) => String(b.date).localeCompare(String(a.date))).map(row) });
});

/* ---------- الواجهة ---------- */
app.use('/api', (_, res) => res.status(404).json({ error: 'not_found' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '5m' }));
app.use((_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

store.init().then(() => app.listen(PORT, () => console.log('تكافل يعمل على المنفذ ' + PORT)))
  .catch(e => { console.error('فشل الاتصال بقاعدة البيانات', e); process.exit(1); });
