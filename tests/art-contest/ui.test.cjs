const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const ROOT = require('path').resolve(__dirname, '../..'); const SP = require('os').tmpdir();
const out = []; const ok = (n, c, i = '') => out.push((c ? 'PASS ' : 'FAIL ') + n + (i ? '  [' + i + ']' : ''));
const now = Date.now(), H = 3600e3;
const current = { group: { id: 'g1', number: 2, ends_at: new Date(now + 5 * H).toISOString() }, artworks: [{ id: '11111111-1111-1111-1111-111111111111', entry_number: 3, display_name: 'سارة', image_url: '/assets/logo.png', votes: 4 }, { id: '22222222-2222-2222-2222-222222222222', entry_number: 4, display_name: 'محمد', image_url: '/assets/weekend.png', votes: 1 }], turnstileSiteKey: null };
const results = { results: [{ number: 1, ends_at: new Date(now - 2 * H).toISOString(), entry_number: 1, display_name: 'ليان', image_url: '/assets/logo.png', votes: 9 }, { number: 2, ends_at: current.group.ends_at, entry_number: 3, display_name: 'سارة', image_url: '/assets/logo.png', votes: 4 }] };
(async () => {
  const b = await chromium.launch();
  for (const [label, dev] of [['Android-Pixel7', devices['Pixel 7']], ['iPhone13-emulated', devices['iPhone 13']], ['Desktop', { viewport: { width: 1366, height: 850 } }]]) {
    const ctx = await b.newContext({ ...dev, ignoreHTTPSErrors: true }); const p = await ctx.newPage(); let votePosts = 0, curCalls = 0;
    await p.route('**/*', async r => {
      const u = new URL(r.request().url()); if (u.hostname !== 'kp.test') return r.abort();
      if (u.pathname === '/api/art-contest/current') { curCalls++; return r.fulfill({ json: current }); }
      if (u.pathname === '/api/art-contest/results') return r.fulfill({ json: results });
      if (u.pathname === '/api/art-contest/challenge') return r.fulfill({ json: { nonce: 'a'.repeat(32), expires: now + 1e5, signature: 'x', difficulty: 3 } });
      if (u.pathname === '/api/art-contest/vote') { votePosts++; return r.fulfill({ status: 200, json: { message: 'تم تسجيل صوتك بنجاح 🎨' } }); }
      let f = u.pathname === '/' ? '/index.html' : u.pathname; if (f === '/art-contest') f = '/art-contest.html';
      const fp = path.join(ROOT, f); if (fs.existsSync(fp)) return r.fulfill({ path: fp }); return r.fulfill({ status: 404, body: '' });
    });
    await p.goto('https://kp.test/');
    const order = await p.$$eval('.campaign-panel', els => els.map(e => e.className));
    ok(label + ': home order vacation->art', order[0].includes('vacation') && order[1].includes('art'));
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(label + ': home no horizontal overflow', ov <= 0, 'overflow=' + ov + 'px');
    ok(label + ': home art CTA -> /art-contest', (await p.getAttribute('.art-campaign a', 'href')) === '/art-contest');
    await p.screenshot({ path: SP + '/home-' + label + '.png' });
    await p.clock.install();
    await p.goto('https://kp.test/art-contest'); await p.waitForSelector('.art-card');
    const ov2 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(label + ': contest no horizontal overflow', ov2 <= 0, 'overflow=' + ov2);
    ok(label + ': cards show name + entry #', (await p.textContent('#art-grid')).includes('سارة — مشاركة #3'));
    ok(label + ': votes shown', (await p.textContent('#art-grid')).includes('4 صوت'));
    ok(label + ': only ended groups as tiles', (await p.$$('.group-tile')).length === 1);
    await p.click('.group-tile'); await p.waitForSelector('#past-results .art-card',{timeout:3000}).catch(()=>{}); ok(label + ': tile opens past group, no vote button', (await p.$$('#past-results .art-card')).length === 1 && !(await p.$('#past-results .art-card button:not(.art-image-button)')));
    await p.click('.group-tile'); await p.waitForFunction(()=>!document.querySelector('#past-results .art-card'),null,{timeout:3000}).catch(()=>{}); ok(label + ': second click hides', (await p.$$('#past-results .art-card')).length === 0);
    await p.click('#art-grid .art-image-button'); ok(label + ': zoom opens', await p.$eval('#zoom-dialog', d => d.open));
    await p.clock.runFor(16000); ok(label + ': zoom stays open across 15s refresh', await p.$eval('#zoom-dialog', d => d.open));
    await p.keyboard.press('Escape'); ok(label + ': Esc closes zoom', !(await p.$eval('#zoom-dialog', d => d.open)));
    await p.click('#art-grid .art-card button:not(.art-image-button)'); ok(label + ': vote dialog opens', await p.$eval('#vote-dialog', d => d.open));
    await p.fill('input[name=name]', 'أبو سارة'); await p.fill('input[name=phone]', '0512345678');
    const c0 = curCalls; await p.clock.runFor(31000);
    ok(label + ': dialog + inputs preserved through 2 refresh cycles', await p.$eval('#vote-dialog', d => d.open) && (await p.inputValue('input[name=phone]')) === '0512345678' && curCalls === c0);
    await p.fill('input[name=phone]', '٠٥١٢٣٤٥٦٧٨'); const v1 = await p.$eval('input[name=phone]', i => ({ valid: i.checkValidity(), msg: i.validationMessage }));
    ok(label + ': FIX Arabic-Indic digits allowed by form', v1.valid);
    await p.fill('input[name=phone]', '051 234 5678'); ok(label + ': FIX "051 234 5678" allowed by form', (await p.$eval('input[name=phone]', i => i.checkValidity())));
    await p.fill('input[name=phone]', '0512345678');
    await p.click('.vote-submit');
    for (let i = 0; i < 200 && !(await p.textContent('#vote-message')).includes('تم'); i++) await p.clock.runFor(50);
    ok(label + ': success message shown', (await p.textContent('#vote-message')).includes('تم'));
    ok(label + ': FIX submit stays disabled until close', (await p.$eval('.vote-submit', b => b.disabled)));
    await p.clock.runFor(1200); ok(label + ': dialog closes after success', !(await p.$eval('#vote-dialog', d => d.open)), 'votePosts=' + votePosts);
    await p.screenshot({ path: SP + '/contest-' + label + '.png', fullPage: true });
    await ctx.close();
  }
  await b.close(); console.log(out.join('\n'));
})();
