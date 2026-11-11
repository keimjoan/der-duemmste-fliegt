// Lokaler Modus: kompletter Spielablauf über die echte Oberfläche
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '01-home.png') });

  await page.click('text=Spiel moderieren');
  await page.click('text=Auf einem Gerät');
  for (const n of ['Anna', 'Ben', 'Cem', 'Dana', 'Emil']) {
    await page.fill('#add-name', n);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02-lobby.png') });
  const nPlayers = await page.evaluate(() => window.__ddf.engine.G.players.length);
  console.log('players', nPlayers);

  await page.click('text=Spiel starten');
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, '03-turn.png') });

  // Runde 1: abwechselnd richtig/falsch über Tasten
  let guard = 0;
  const G = () => page.evaluate(() => { const G = window.__ddf.engine.G; return { phase: G.phase, t: G.t, n: G.turns.length, round: G.round, roulette: !!G.roulette, result: G.turns[G.t] && G.turns[G.t].result }; });
  let st = await G();
  while (st.phase === 'turn' && guard++ < 50) {
    if (st.t === 3 && st.round === 1) {
      // Joker per Taste J
      await page.keyboard.press('j');
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, '04-roulette.png') });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: path.join(OUT, '05-after-joker.png') });
      const jk = await page.evaluate(() => { const G = window.__ddf.engine.G, t = G.turns[G.t], n = G.turns[G.t + 1]; return { from: t.jokerFrom, next: n && n.pid, nextJoker: n && n.jokerFrom }; });
      console.log('joker check', jk);
      if (!jk.from || jk.next !== jk.from || jk.nextJoker) throw new Error('Nach der Joker-Frage ist nicht der Aktivator dran: ' + JSON.stringify(jk));
    }
    st = await G();
    if (st.t === 1) { await page.fill(`#given-${st.round}-${st.t}`, 'Mango'); await page.press(`#given-${st.round}-${st.t}`, 'Enter'); }
    else await page.keyboard.press(st.t % 3 === 1 ? 'f' : 'r');
    await page.waitForTimeout(150);
    if (st.t === 1) await page.screenshot({ path: path.join(OUT, '06-wrong.png') });
    await page.keyboard.press(' ');
    await page.waitForTimeout(150);
    st = await G();
  }
  console.log('after round 1', st);
  await page.screenshot({ path: path.join(OUT, '07-review.png') });
  await page.keyboard.press(' '); // Voting starten
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '08-vote.png') });
  // Wahlkabine benutzen
  await page.click('text=Wahlkabine öffnen');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '09-booth.png') });
  for (let i = 0; i < 8; i++) {
    const hasHand = await page.$('text=– weiter');
    if (!hasHand) break;
    await hasHand.click();
    await page.waitForTimeout(150);
    const opt = await page.$('.modal .vote-opt');
    if (!opt) break;
    await opt.click();
    await page.click('text=Stimme abgeben');
    await page.waitForTimeout(1100);
  }
  await page.screenshot({ path: path.join(OUT, '10-booth-done.png') });
  const reveal = await page.$('text=Jetzt auflösen');
  if (reveal) await reveal.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, '11-reveal.png') });
  await page.waitForTimeout(3200);
  await page.screenshot({ path: path.join(OUT, '12-heart.png') });
  console.log('reveal', await page.evaluate(() => JSON.stringify(window.__ddf.engine.G.reveal)));

  // Restliche Runden schnell über die Engine (mit Tie-Break-Fällen)
  const fast = await page.evaluate(async () => {
    const e = window.__ddf.engine, G = e.G, log = [];
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let loops = 0;
    while (G.phase !== 'finalIntro' && G.phase !== 'end' && loops++ < 200) {
      if (G.phase === 'reveal') {
        if (G.reveal.tied && G.reveal.tied.length && !G.reveal.loser) { e.tieBreak('host', G.reveal.tied[0]); }
        await sleep(1500);
        if (e.canProceed()) { e.proceed(); log.push('proceed->' + G.phase + ' r' + G.round + ' act' + e.active().length); }
        continue;
      }
      if (G.phase === 'turn') { const t = e.cur(); if (!t.result) e.mark(Math.random() < 0.5 ? 'wrong' : 'right', 'x'); e.next(); continue; }
      if (G.phase === 'review') { e.startVote(); continue; }
      if (G.phase === 'vote' || G.phase === 'tb') {
        const v = G.vote; v.voters.forEach(voter => { const c = v.cands.filter(x => x !== voter); if (c.length) e.castVote(voter, c[0]); });
        e.reveal(); continue;
      }
      await sleep(50);
    }
    return { phase: G.phase, log, hearts: G.players.map(p => p.name + ':' + p.hearts + (p.out ? 'X' : '')) };
  });
  console.log('fast', JSON.stringify(fast));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '13-final-intro.png') });
  await page.keyboard.press(' ');
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, '14-final-q.png') });
  // Finale durchspielen: Antworten eintippen (Host-Eingabe), aufdecken, bewerten
  for (let i = 0; i < 14; i++) {
    const s = await page.evaluate(() => { const G = window.__ddf.engine.G; return { phase: G.phase, rev: G.final && G.final.revealed, pids: window.__ddf.engine.finalPids(), i: G.final && G.final.i, hl: G.final && G.final.hist.length }; });
    if (s.phase !== 'final') break;
    for (const [k, pid] of s.pids.entries()) {
      const sel = `#fa-${pid}-${s.i}-${s.hl}`;
      if (await page.$(sel)) await page.fill(sel, k === 0 ? 'Rom' : 'Keine Ahnung');
    }
    if (i === 0) await page.screenshot({ path: path.join(OUT, '15a-final-typing.png') });
    await page.click('text=Aufdecken');
    await page.waitForTimeout(400);
    if (i === 0) await page.screenshot({ path: path.join(OUT, '15-final-reveal.png') });
    // alle bewerten: erster richtig, zweiter falsch
    await page.evaluate(() => { const e = window.__ddf.engine; e.finalPids().forEach((id, k) => e.finalMark(id, k === 0)); });
    await page.waitForTimeout(150);
    await page.click('#host-panel .btn.primary.big');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '16-winner.png') });
  console.log('end', await page.evaluate(() => { const G = window.__ddf.engine.G; return JSON.stringify({ phase: G.phase, winner: G.winner, ranking: G.ranking, score: G.final && G.final.score }); }));
  console.log('errors', errors);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
