// Online-Modus über den eigenen Server (server.js): Moderator + 4 Mitspieler-Geräte
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8099/';  // server.js mit PORT=8099
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const mk = async (name, vp) => {
    const ctx = await browser.newContext({ viewport: vp || { width: 1400, height: 860 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    return page;
  };
  const host = await mk('host', { width: 1600, height: 900 });
  await host.goto(BASE);
  await host.waitForTimeout(600);
  await host.click('text=Spiel moderieren');
  await host.click('text=Online mit Code');
  await host.waitForFunction(() => window.__ddf && window.__ddf.ctl.netStatus === 'online', null, { timeout: 10000 });
  const code = await host.evaluate(() => window.__ddf.engine.G.code);
  console.log('code', code, 'server mode');

  const names = ['Annika', 'Sam', 'Kroko', 'Hugo'];
  const players = [];
  for (let i = 0; i < names.length; i++) {
    const vp = i === 0 ? { width: 390, height: 844 } : undefined;
    const p = await mk(names[i], vp);
    await p.goto(BASE + '#join-' + code);
    await p.waitForSelector('#join-name');
    await p.fill('#join-name', names[i]);
    await p.click(`.avatar-grid button >> nth=${i + 3}`);
    await p.click('button[type=submit]');
    players.push(p);
  }
  await host.waitForFunction(n => window.__ddf.engine.G.players.length === n, names.length, { timeout: 10000 });
  // Spieler ohne Gerät
  await host.fill('#add-name', 'Olli');
  await host.keyboard.press('Enter');
  await host.waitForTimeout(500);
  await host.screenshot({ path: path.join(OUT, 'o01-host-lobby.png') });
  await players[0].screenshot({ path: path.join(OUT, 'o02-phone-lobby.png') });
  console.log('lobby players', await host.evaluate(() => window.__ddf.engine.G.players.map(p => p.name + (p.conn ? '+' : '-')).join(',')));

  await host.click('text=Spiel starten');
  await host.waitForTimeout(800);
  const cur = () => host.evaluate(() => { const e = window.__ddf.engine, t = e.cur(); return t ? { pid: t.pid, name: e.player(t.pid).name, t: e.G.t, n: e.G.turns.length } : { phase: e.G.phase }; });
  let c = await cur();
  console.log('first turn', c);
  const pageOf = name => players[names.indexOf(name)];
  // Joker vom Handy des aktuellen Spielers (falls er ein Gerät hat)
  let jp = pageOf(c.name);
  if (!jp) { await host.click('text=Richtig'); await host.keyboard.press(' '); await host.waitForTimeout(400); c = await cur(); jp = pageOf(c.name); }
  await jp.waitForSelector('text=Joker einsetzen', { timeout: 5000 });
  await jp.screenshot({ path: path.join(OUT, 'o03-player-myturn.png') });
  await jp.click('text=Joker einsetzen');
  await jp.click('text=Wirklich?');
  await host.waitForTimeout(1600);
  await host.screenshot({ path: path.join(OUT, 'o04-host-roulette.png') });
  await players[1].screenshot({ path: path.join(OUT, 'o05-player-roulette.png') });
  await host.waitForTimeout(5200);
  c = await cur();
  console.log('after joker', c, await host.evaluate(() => window.__ddf.engine.G.turns[window.__ddf.engine.G.t].jokerFrom));
  // Runde zu Ende spielen: jeder 2. falsch
  for (let k = 0; k < 20; k++) {
    const st = await host.evaluate(() => window.__ddf.engine.G.phase);
    if (st !== 'turn') break;
    const ok = k % 2 === 0;
    await host.evaluate(ok => window.__ddf.engine.mark(ok ? 'right' : 'wrong', ok ? '' : 'Keine Ahnung'), ok);
    await host.waitForTimeout(120);
    await host.keyboard.press(' ');
    await host.waitForTimeout(120);
  }
  await host.keyboard.press(' '); // Voting starten
  await host.waitForTimeout(600);
  const vote = await host.evaluate(() => { const v = window.__ddf.engine.G.vote; return v && { cands: v.cands.map(id => window.__ddf.engine.player(id).name), voters: v.voters.length }; });
  console.log('vote', vote);
  // Alle Geräte stimmen ab (erste Option)
  for (const p of players) {
    const opt = p.locator('.vote-opt').first();
    if (await opt.count()) await opt.click();
  }
  await players[0].waitForTimeout(500);
  await players[0].screenshot({ path: path.join(OUT, 'o06-phone-vote.png') });
  // Olli (ohne Gerät) über das Pult
  const sel = await host.$('select[aria-label="Stimme von Olli"]');
  if (sel) { const val = await sel.evaluate(s => s.options[1] && s.options[1].value); if (val) await sel.selectOption(val); }
  await host.waitForTimeout(500);
  await host.screenshot({ path: path.join(OUT, 'o07-host-vote.png') });
  console.log('votes', await host.evaluate(() => Object.keys(window.__ddf.engine.G.votes).length + '/' + window.__ddf.engine.eligible().length));
  await host.keyboard.press(' ');
  await host.waitForTimeout(3500);
  await host.screenshot({ path: path.join(OUT, 'o08-host-reveal.png') });
  await players[2].screenshot({ path: path.join(OUT, 'o09-player-reveal.png') });

  // Reconnect-Test: ein Mitspieler lädt neu
  await players[1].reload();
  await players[1].waitForTimeout(2500);
  const reconn = await host.evaluate(() => window.__ddf.engine.G.players.map(p => p.name + (p.conn ? '+' : '-')).join(','));
  console.log('after player reload', reconn);

  // Moderator lädt neu und setzt fort
  await host.reload();
  await host.waitForTimeout(800);
  await host.click('text=Letztes Spiel fortsetzen');
  await host.waitForFunction(() => window.__ddf && window.__ddf.ctl.netStatus === 'online', null, { timeout: 15000 });
  await host.waitForTimeout(5000);
  const after = await host.evaluate(() => ({ code: window.__ddf.engine.G.code, phase: window.__ddf.engine.G.phase, conns: window.__ddf.engine.G.players.map(p => p.name + (p.conn ? '+' : '-')).join(',') }));
  console.log('after host reload', after);

  // Schnell bis ins Finale (über die Engine)
  await host.evaluate(async () => {
    const e = window.__ddf.engine, G = e.G, sleep = ms => new Promise(r => setTimeout(r, ms));
    let loops = 0;
    while (G.phase !== 'finalIntro' && G.phase !== 'end' && loops++ < 300) {
      if (G.phase === 'reveal') { if (G.reveal.tied && G.reveal.tied.length && !G.reveal.loser) e.tieBreak('host', G.reveal.tied[0]); await sleep(1300); if (e.canProceed()) e.proceed(); continue; }
      if (G.phase === 'turn') { const t = e.cur(); const p = e.player(t.pid); if (!t.result) e.mark('wrong', 'quatsch'); e.next(); continue; }
      if (G.phase === 'review') { e.startVote(); continue; }
      if (G.phase === 'vote' || G.phase === 'tb') { const v = G.vote; v.voters.forEach(voter => { const c = v.cands.filter(x => x !== voter); if (c.length) e.castVote(voter, c[c.length - 1]); }); e.reveal(); continue; }
      await sleep(50);
    }
  });
  await host.waitForTimeout(800);
  const fin = await host.evaluate(() => { const e = window.__ddf.engine; return e.G.final ? e.G.final.pids.map(id => e.player(id).name) : null; });
  console.log('finalists', fin);
  await host.keyboard.press(' ');
  await host.waitForTimeout(800);
  // Finalisten tippen auf ihren Geräten
  for (let q = 0; q < 12; q++) {
    const s = await host.evaluate(() => { const e = window.__ddf.engine; return { phase: e.G.phase, pids: e.finalPids().map(id => e.player(id).name) }; });
    if (s.phase !== 'final') break;
    for (const nm of s.pids) {
      const p = pageOf(nm); if (!p) continue;
      const inp = p.locator('input[id^="final-in-"]');
      if (await inp.count()) { await inp.fill(q % 2 ? 'falsch' : 'Rom'); await p.click('text=Einloggen'); }
    }
    await host.waitForTimeout(600);
    if (q === 0) { await host.screenshot({ path: path.join(OUT, 'o10-host-final-locked.png') }); const fp = pageOf(s.pids[0]); if (fp) await fp.screenshot({ path: path.join(OUT, 'o11-finalist-locked.png') }); }
    await host.click('text=Aufdecken');
    await host.waitForTimeout(500);
    await host.evaluate(() => { const e = window.__ddf.engine; e.finalPids().forEach((id, k) => { if (typeof e.G.final.marks[id] !== 'boolean') e.finalMark(id, k === 0); }); });
    if (q === 0) await host.screenshot({ path: path.join(OUT, 'o12-host-final-reveal.png') });
    await host.waitForTimeout(200);
    await host.click('#host-panel .btn.primary.big');
    await host.waitForTimeout(300);
  }
  await host.waitForTimeout(1500);
  await host.screenshot({ path: path.join(OUT, 'o13-host-end.png') });
  await players[0].screenshot({ path: path.join(OUT, 'o14-phone-end.png') });
  console.log('end', await host.evaluate(() => { const e = window.__ddf.engine; return { phase: e.G.phase, winner: e.G.winner && e.player(e.G.winner).name, score: e.G.final && e.G.final.score }; }));
  const ptxt = await players[3].evaluate(() => document.querySelector('.panel').innerText.slice(0, 300));
  console.log('player3 text:', ptxt.replace(/\n/g, ' | '));
  console.log('errors', errors);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
