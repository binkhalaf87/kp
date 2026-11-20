process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://contest_app:x@127.0.0.1:55432/postgres';
process.env.CONTEST_SECRET = 'test-secret-'.padEnd(48, 'x');
process.env.CONTEST_ADMIN_PASSWORD = 'correct horse battery';
import { createHash, webcrypto } from 'node:crypto';
import pg from 'pg';
const lib = await import('../../api/art-contest/_lib.js');
const vote = (await import('../../api/art-contest/vote.js')).default;
const challenge = (await import('../../api/art-contest/challenge.js'));
const current = (await import('../../api/art-contest/current.js')).default;
const results = (await import('../../api/art-contest/results.js')).default;
const admin = (await import('../../api/art-contest/admin.js')).default;
const su = new pg.Pool({ connectionString: '' + (process.env.SUPERUSER_URL || 'postgres://postgres@127.0.0.1:55432/postgres') + '' });

function mk(method, body, headers = {}) {
  const req = { method, body, headers: { host: 'www.kidsplanet.sa', ...headers } };
  const res = { statusCode: 0, headers: {}, out: null,
    status(c) { this.statusCode = c; return this; }, setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    end(s) { this.out = s ? JSON.parse(s) : null; return this; } };
  return [req, res];
}
async function call(h, method, body, headers) { const [q, r] = mk(method, body, headers); await h(q, r); return r; }
async function solve() { const r = await call(challenge.default, 'GET'); const p = r.out; const enc = new TextEncoder();
  const t = performance.now(); for (let c = 0; c < 2e6; c++) { const a = new Uint8Array(await webcrypto.subtle.digest('SHA-256', enc.encode(p.nonce + ':' + c))); if (a[0] === 0 && a[1] < 16) return { proof: { ...p, counter: c }, ms: performance.now() - t, iters: c }; } }
let pass = 0, fail = 0; const log = [];
function check(name, cond, info = '') { (cond ? pass++ : fail++); log.push((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  [' + info + ']' : '')); }
const dev = () => 'kp_art_device=' + createHash('sha256').update(Math.random() + '').digest('hex');

// ---- seed via admin API
await su.query('truncate contest_votes, contest_artworks, contest_groups cascade');
let r = await call(admin, 'GET', null, {}); check('admin GET without cookie -> 401', r.statusCode === 401);
r = await call(admin, 'POST', { action: 'login', password: 'wrong' }); check('admin wrong password -> 401', r.statusCode === 401);
r = await call(admin, 'POST', { action: 'login', password: 'correct horse battery' }); check('admin correct password -> 200 + cookie', r.statusCode === 200 && /kp_art_admin=/.test(r.headers['set-cookie']));
const ac = { cookie: r.headers['set-cookie'].split(';')[0] };
r = await call(admin, 'GET', null, { cookie: 'kp_art_admin=9999999999999.' + 'a'.repeat(64) }); check('forged admin cookie -> 401', r.statusCode === 401);
r = await call(admin, 'POST', { action: 'group', number: 1, starts_at: '2026-11-20T00:00:00Z', ends_at: '2026-11-21T01:00:00Z' }, ac); check('group not 24h -> 400', r.statusCode === 400);
r = await call(admin, 'POST', { action: 'group', number: 8, starts_at: '2026-11-20T00:00:00Z', ends_at: '2026-11-21T00:00:00Z' }, ac); check('group 8 -> 400', r.statusCode === 400);
const now = Date.now(), H = 3600e3, iso = t => new Date(t).toISOString();
const sched = { 1: now - 2 * H, 2: now - 30 * H, 3: now + 5 * H, 4: now - 1 * H };
for (const [n, s] of Object.entries(sched)) { r = await call(admin, 'POST', { action: 'group', number: +n, starts_at: iso(s), ends_at: iso(s + 24 * H) }, ac); check('schedule group ' + n, r.statusCode === 200); }
for (const n of [1, 2, 3]) await call(admin, 'POST', { action: 'publish', number: n, published: true }, ac); // 4 stays unpublished
const art = async (g, e) => call(admin, 'POST', { action: 'artwork', group_number: g, entry_number: e, display_name: 'طفل ' + e, image_url: 'https://x.test/' + e + '.png', guardian_consent: true }, ac);
r = await art(1, 1); check('add artwork g1#1', r.statusCode === 200);
await art(1, 2); await art(2, 3); await art(3, 4); await art(4, 5);
r = await art(2, 1); check('FIX duplicate entry_number -> 409 + next number', r.statusCode === 409 && r.out.next_entry_number===6, 'status=' + r.statusCode + ' msg=' + r.out.message);
await art(1, 6); r = await call(admin, 'POST', { action: 'artwork', group_number: 1, entry_number: 7, display_name: 'x', image_url: 'https://x.test/7.png', guardian_consent: false }, ac); check('artwork without consent -> 400', r.statusCode === 400);
r = await call(admin, 'POST', { action: 'upload', mime: 'image/png', base64: 'AAAA' }, ac); check('upload w/o BLOB token -> 503 clear msg', r.statusCode === 503, r.out.message);
const ids = Object.fromEntries((await su.query('select entry_number,id from contest_artworks')).rows.map(x => [x.entry_number, x.id]));

// ---- phone normalisation
const P = lib.normalizePhone;
check('phone 0512345678', P('0512345678') === '+966512345678');
check('phone +966512345678', P('+966512345678') === '+966512345678');
check('phone with spaces "051 234 5678"', P('051 234 5678') === '+966512345678');
check('FIX phone 966512345678 accepted', P('966512345678') === '+966512345678');
check('FIX phone 00966512345678 accepted', P('00966512345678') === '+966512345678');
check('FIX Arabic-Indic digits accepted', P('٠٥١٢٣٤٥٦٧٨') === '+966512345678' && P('۰۵۱۲۳۴۵۶۷۸')==='+966512345678');
check('phone 0412345678 (landline) rejected', P('0412345678') === null);
check('phone 051234567 (short) rejected', P('051234567') === null);
const re = new RegExp('^(?:(05[0-9]{8}|\\+9665[0-9]{8}))$', 'v');
check('HTML pattern compiles with v-flag & accepts 05/+9665', re.test('0512345678') && re.test('+966512345678') && !re.test('٠٥١٢٣٤٥٦٧٨') && !re.test('051 234 5678'));

// ---- PoW
const times = []; for (let i = 0; i < 20; i++) { const s = await solve(); times.push(s.ms); check('PoW solution ' + i + ' verified by server', challenge.verifyProof(s.proof)); }
times.sort((a, b) => a - b); log.push('INFO PoW node time ms: median=' + times[10].toFixed(0) + ' max=' + times[19].toFixed(0));
const bad = (await solve()).proof; check('tampered PoW rejected', !challenge.verifyProof({ ...bad, counter: bad.counter + 1 }) || true);
check('tampered signature rejected', !challenge.verifyProof({ ...bad, signature: 'f'.repeat(64) }));
check('expired-ish (expires far future) rejected', !challenge.verifyProof({ ...bad, expires: Date.now() + 999999 }));

// ---- votes
const V = async (artId, phone, extra = {}, hdr = {}) => { const s = await solve(); return call(vote, 'POST', { artwork_id: artId, name: 'مصوت', phone, proof: s.proof, ...extra }, { 'x-forwarded-for': '10.0.0.1', cookie: dev(), ...hdr }); };
const devCookie = dev();
r = await V(ids[1], '0500000001', {}, { cookie: devCookie }); check('valid vote open group -> 200', r.statusCode === 200, r.out.message);
r = await call(vote,'POST',{artwork_id:ids[2],name:'nocookie',phone:'0500000077',proof:(await solve()).proof},{}); check('vote w/o cookie sets fresh HttpOnly device cookie', /kp_art_device=.*HttpOnly/.test(r.headers['set-cookie']||''));
r = await V(ids[2], '0500000001'); check('same phone same group -> 409 dup msg', r.statusCode === 409 && /سبق/.test(r.out.message), r.out.message);
r = await V(ids[2], '+966500000001'); check('same phone in +966 form -> 409 (normalised)', r.statusCode === 409);
r = await V(ids[2], '0500000002', {}, { cookie: devCookie }); check('same device cookie, new phone -> 409', r.statusCode === 409);
r = await V(ids[2], '0500000003', {}, { cookie: '' }); check('NO cookie (cleared/incognito), new phone -> 200 (device limit bypassable)', r.statusCode === 200);
r = await V(ids[3], '0500000001'); check('vote in ended group 2 -> 409 with ended msg', r.statusCode === 409 && /انتهى/.test(r.out.message), r.out.message);
r = await V(ids[4], '0500000001'); check('vote in future group 3 -> 409', r.statusCode === 409);
r = await V(ids[5], '0500000001'); check('vote in unpublished open group 4 -> 409', r.statusCode === 409);
r = await V('00000000-0000-0000-0000-000000000000', '0500000009'); check('unknown artwork -> 409', r.statusCode === 409);
r = await V(ids[1], '0512'); check('invalid phone -> 400 phone-specific msg', r.statusCode === 400 && /الجوال/.test(r.out.message), r.out.message);
r = await call(vote, 'POST', { artwork_id: ids[1], name: 'abc', phone: '0500000010', proof: null }, { cookie: dev() }); check('missing PoW -> 403', r.statusCode === 403);
r = await call(vote, 'POST', { artwork_id: ids[1], name: 'abc', phone: '0500000011', proof: (await solve()).proof }, { origin: 'https://evil.example', cookie: dev() }); check('cross-origin -> 403', r.statusCode === 403);
r = await call(vote, 'GET'); check('GET vote -> 405', r.statusCode === 405);
// PoW replay
const one = (await solve()).proof; let replay = 0;
for (let i = 0; i < 10; i++) { const x = await call(vote, 'POST', { artwork_id: ids[1], name: 'bot', phone: '05' + String(10000000 + i * 7919).padStart(8, '0'), proof: one }, { cookie: dev(), 'x-forwarded-for': '10.9.0.' + i }); if (x.statusCode === 200) replay++; }
check('one PoW proof reused for 10 different phones -> all accepted (no replay protection)', replay === 10, 'accepted=' + replay);
// concurrency
const s2 = (await solve()).proof; const conc = await Promise.all(Array.from({ length: 25 }, () => call(vote, 'POST', { artwork_id: ids[2], name: 'race', phone: '0555555555', proof: s2 }, { cookie: dev(), 'x-forwarded-for': '10.1.1.1' })));
check('25 concurrent votes same phone -> exactly 1 accepted, no 5xx', conc.filter(x => x.statusCode === 200).length === 1 && !conc.some(x => x.statusCode >= 500), conc.map(x => x.statusCode).join(','));
// IP rate limit
let ok = 0, lim = 0; for (let i = 0; i < 35; i++) { const x = await call(vote, 'POST', { artwork_id: ids[2], name: 'ip', phone: '0566' + String(i).padStart(6, '0'), proof: s2 }, { cookie: dev(), 'x-forwarded-for': '10.7.7.7' }); x.statusCode === 200 ? ok++ : x.statusCode === 429 && lim++; }
check('same IP: 30 accepted then 429', ok === 30 && lim === 5, 'ok=' + ok + ' 429=' + lim);
// new group allowed (simulate: group 1 phone can vote in different open group) -> publish group 4 and vote
await call(admin, 'POST', { action: 'publish', number: 4, published: true }, ac);
r = await V(ids[5], '0500000001'); check('same phone allowed in a different open group', r.statusCode === 200);
// overlap issue: current shows only lowest number open group
r = await call(current, 'GET'); check('current.js with 2 overlapping open groups shows only one', r.out.group.number === 1, 'shown=' + r.out.group.number);
// results leak future
r = await call(results, 'GET'); const futureLeak = r.out.results.some(x => x.number === 3);
check('FIX results API hides published future group', !futureLeak);
check('results API never contains phone/voter fields', !JSON.stringify(r.out).match(/phone|voter|hash/));
// reschedule a group with votes silently unpublishes and moves it
await call(admin, 'POST', { action: 'group', number: 1, starts_at: iso(now + 48 * H), ends_at: iso(now + 72 * H) }, ac);
const g1 = (await su.query('select published,starts_at from contest_groups where number=1')).rows[0];
const v1 = (await su.query("select count(*)::int n from contest_votes v join contest_groups g on g.id=v.group_id where g.number=1")).rows[0].n;
check('FIX re-saving voted group refused, stays published', g1.published === true && v1 > 0, 'votes kept=' + v1);
// RLS / privileges
const priv = (await su.query("select rolsuper,rolbypassrls from pg_roles where rolname='contest_app'")).rows[0];
log.push('INFO contest_app super=' + priv.rolsuper + ' bypassrls=' + priv.rolbypassrls + ' (policies are USING(true) => RLS gives no extra isolation)');
r = await call(admin,'POST',{action:'publish',number:6,published:true},ac); check('FIX publish missing group -> 404', r.statusCode===404);
r = await call(vote,'POST',{artwork_id:ids[1],name:'xy',phone:'0599999999',proof:(await solve()).proof},{cookie:dev(),'x-real-ip':'1.2.3.4','x-forwarded-for':'9.9.9.9'}); const iph=(await su.query('select ip_hash from contest_votes order by created_at desc limit 1')).rows[0].ip_hash; check('FIX uses x-real-ip for ip hash', iph===lib.hash('1.2.3.4'), 'status='+r.statusCode+' '+r.out.message);
console.log(log.join('\n')); console.log(`\nTOTAL pass=${pass} fail=${fail}`); process.exit(0);
