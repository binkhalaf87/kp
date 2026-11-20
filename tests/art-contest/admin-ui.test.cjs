const { chromium } = require('playwright'); const fs = require('fs');
const out = []; const ok = (n, c, i = '') => out.push((c ? 'PASS ' : 'FAIL ') + n + (i ? '  [' + i + ']' : ''));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ignoreHTTPSErrors: true, timezoneId: 'Europe/London' }); const p = await ctx.newPage();
  let authed = false; const posts = [];
  const state = { groups: [{ id: 'g1', number: 1, starts_at: '2026-11-20T21:00:00Z', ends_at: '2026-11-21T21:00:00Z', published: true }], artworks: [{ id: 'a1', group_id: 'g1', entry_number: 1, display_name: '=HYPERLINK("x")', image_url: 'https://x/1.png', votes: 3 }] };
  await p.route('**/*', async r => {
    const u = new URL(r.request().url()); if (u.hostname !== 'kp.test') return r.abort();
    if (u.pathname === '/api/art-contest/admin') {
      if (r.request().method() === 'GET') return authed ? r.fulfill({ json: state }) : r.fulfill({ status: 401, json: { message: 'يرجى تسجيل الدخول' } });
      const body = JSON.parse(r.request().postData()); posts.push(body);
      if (body.action === 'login') { if (body.password === 'pw') { authed = true; return r.fulfill({ json: { ok: true } }); } return r.fulfill({ status: 401, json: { message: 'كلمة المرور غير صحيحة' } }); }
      if (body.action === 'upload') return r.fulfill({ json: { url: 'https://blob.test/new.png' } });
      if (body.action === 'artwork') return r.fulfill({ json: { ok: true } });
      if (body.action === 'group') return r.fulfill({ json: { ok: true } });
    }
    if (u.pathname === '/admin/art-contest') return r.fulfill({ path: require('path').resolve(__dirname, '../../admin/art-contest.html') });
    return r.fulfill({ status: 404, body: '' });
  });
  await p.goto('https://kp.test/admin/art-contest');
  ok('login form visible when unauthenticated', await p.isVisible('#login'));
  await p.fill('#password', 'bad'); await p.press('#password', 'Enter'); await p.waitForTimeout(300);
  ok('wrong password -> clear message', (await p.textContent('#message')).includes('غير صحيحة'));
  await p.fill('#password', 'pw'); await p.press('#password', 'Enter'); await p.waitForSelector('#workspace', { state: 'visible' });
  ok('login via Enter works, workspace shown', true);
  ok('artworks table shows group column', (await p.textContent('#arts')).startsWith('1'));
  ok('next free entry hint shown', (await p.textContent('#nextEntry')).includes('2'));
  await p.fill('[name=number]', '2'); await p.fill('[name=starts_at]', '2026-11-22T00:00'); await p.click('#groupForm button'); await p.waitForTimeout(300);
  const g = posts.find(x => x.action === 'group');
  ok('Riyadh 00:00 sent as 21:00Z previous day, regardless of browser TZ', g && g.starts_at === '2026-11-21T21:00:00.000Z' && g.ends_at === '2026-11-22T21:00:00.000Z', g && g.starts_at);
  fs.writeFileSync(require('os').tmpdir() + '/a.png', Buffer.from('89504e470d0a1a0a', 'hex'));
  const fill = async (e) => { await p.fill('[name=group_number]', '1'); await p.fill('[name=entry_number]', String(e)); await p.fill('[name=display_name]', 'ريم'); await p.setInputFiles('[name=file]', { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') }); await p.check('[name=guardian_consent]'); };
  await fill(1); const before = posts.length; await p.click('#artForm button'); await p.waitForTimeout(300);
  ok('duplicate entry blocked BEFORE upload (no orphan blob)', posts.length === before && (await p.textContent('#message')).includes('مستخدم مسبقًا'));
  ok('fields kept after failure', (await p.inputValue('[name=display_name]')) === 'ريم' && (await p.inputValue('[name=entry_number]')) === '1');
  await p.fill('[name=entry_number]', '2'); await p.click('#artForm button'); await p.waitForTimeout(500);
  ok('success message clear', (await p.textContent('#message')).includes('بنجاح'), await p.textContent('#message'));
  ok('fields kept after success', (await p.inputValue('[name=display_name]')) === 'ريم' && (await p.inputValue('[name=entry_number]')) === '2' && await p.isChecked('[name=guardian_consent]'));
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#exportBtn')]); const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok('CSV has group column + formula-injection guard', csv.includes('"المجموعة"') && csv.includes(`"'=HYPERLINK`), csv.split('\r\n')[1]);
  await b.close(); console.log(out.join('\n'));
})();
