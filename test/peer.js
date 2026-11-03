// Online-Modus über PeerJS (hier mit Nachbildung der PeerJS-API) – Moderator + 3 Mitspieler
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots');
const BASE = process.env.BASE || 'http://localhost:8098/index.html';
const MOCK = fs.readFileSync(path.join(__dirname, 'peer-mock.js'), 'utf8');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 860 } });
  await ctx.addInitScript(MOCK);
  // CDN-Ladeversuche abfangen, damit sicher die Nachbildung benutzt wird
  await ctx.route(/unpkg|jsdelivr/, r => r.abort());
  const errors = [];
  const mk = async (name, memStore = true) => { const p = await ctx.newPage();
    if (memStore) await p.addInitScript(() => { const m = {}; Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } } }); }); p.on('pageerror', e => errors.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); }); return p; };
  const host = await mk('host', false);
  await host.goto(BASE);
  await host.waitForTimeout(500);
  const env = await host.evaluate(() => ({ mock: !!window.__peerMock }));
  console.log('env', env);
  await host.click('text=Spiel moderieren');
  await host.click('text=Online mit Code');
  await host.waitForFunction(() => window.__ddf && window.__ddf.ctl.netStatus === 'online', null, { timeout: 10000 });
  const code = await host.evaluate(() => window.__ddf.engine.G.code);
  console.log('code', code);
  // falscher Code zuerst
  const bad = await mk('bad');
  await bad.goto(BASE + '#join-ZZZZ');
  await bad.fill('#join-name', 'Falsch');
  await bad.click('button[type=submit]');
  await bad.waitForTimeout(2500);
  console.log('wrong code status:', await bad.evaluate(() => window.__ddfp && window.__ddfp.status));
  await bad.close();
  const names = ['Tim', 'Schradin', 'Rohat'];
  const ps = [];
  for (const n of names) {
    const p = await mk(n);
    await p.goto(BASE + '#join-' + code);
    await p.fill('#join-name', n);
    await p.click('button[type=submit]');
    ps.push(p);
    await p.waitForTimeout(400);
  }
  await host.waitForFunction(() => window.__ddf.engine.G.players.filter(p => p.conn).length === 3, null, { timeout: 10000 });
  console.log('joined', await host.evaluate(() => window.__ddf.engine.G.players.map(p => p.name + (p.conn ? '+' : '-')).join(',')));
  await host.click('text=Spiel starten');
  await host.waitForTimeout(600);
  // Joker im Modus Roulette vom Gerät
  const cur = await host.evaluate(() => window.__ddf.engine.player(window.__ddf.engine.cur().pid).name);
  const jp = ps[names.indexOf(cur)];
  await jp.click('text=Joker einsetzen'); await jp.click('text=Wirklich?');
  await host.waitForTimeout(6200);
  console.log('joker ->', await host.evaluate(() => { const e = window.__ddf.engine, t = e.cur(); return e.player(t.pid).name + ' (von ' + e.player(t.jokerFrom).name + ')'; }));
  // Runde: alle falsch
  for (let k = 0; k < 10; k++) { const ph = await host.evaluate(() => window.__ddf.engine.G.phase); if (ph !== 'turn') break; await host.evaluate(() => window.__ddf.engine.mark('wrong', 'nö')); await host.waitForTimeout(80); await host.keyboard.press(' '); await host.waitForTimeout(80); }
  await host.keyboard.press(' ');
  await host.waitForTimeout(400);
  // Alle stimmen für den ersten wählbaren
  for (const p of ps) { const o = p.locator('.vote-opt').first(); if (await o.count()) await o.click(); }
  await host.waitForTimeout(500);
  console.log('votes', await host.evaluate(() => JSON.stringify(Object.keys(window.__ddf.engine.G.votes).length)));
  await host.keyboard.press(' ');
  await host.waitForTimeout(3800);
  console.log('reveal', await host.evaluate(() => { const e = window.__ddf.engine, r = e.G.reveal; return JSON.stringify({ loser: r.loser && e.player(r.loser).name, tied: r.tied.map(id => e.player(id).name), applied: r.applied }); }));
  // Tie-Break per Stichwahl, falls nötig
  const tied = await host.evaluate(() => { const r = window.__ddf.engine.G.reveal; return r.tied && r.tied.length > 1; });
  if (tied) {
    const can = await host.evaluate(() => (window.__ddf.engine.tieOptions() || {}).revote);
    if (can) { await host.click('text=Stichwahl – die anderen stimmen ab'); await host.waitForTimeout(400); for (const p of ps) { const o = p.locator('.vote-opt').first(); if (await o.count()) await o.click(); } await host.waitForTimeout(400); await host.keyboard.press(' '); }
    else { await host.click('text=Zufall entscheiden lassen'); await host.waitForTimeout(5500); }
    await host.waitForTimeout(3000);
    console.log('after tie', await host.evaluate(() => { const e = window.__ddf.engine, r = e.G.reveal; return JSON.stringify({ phase: e.G.phase, loser: r && r.loser && e.player(r.loser).name, applied: r && r.applied }); }));
  }
  await ps[0].screenshot({ path: path.join(OUT, 'p01-player-wide.png') });
  // Spieler-Seite schließen -> Moderator sieht offline
  await ps[2].close();
  await host.waitForTimeout(1500);
  console.log('after close', await host.evaluate(() => window.__ddf.engine.G.players.map(p => p.name + (p.conn ? '+' : '-')).join(',')));
  console.log('errors', errors.filter(e => !/ERR_FAILED|net::/.test(e)));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
