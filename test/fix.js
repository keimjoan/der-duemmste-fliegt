// Nachträgliche Korrektur von Bewertungen (Runde, Auswertung, Voting, Ergebnis, Finale)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.URL || 'file://' + path.join(__dirname, '..', 'index.html');

let fails = 0;
const check = (name, ok, info) => { console.log((ok ? 'OK   ' : 'FEHL ') + name + (ok || info === undefined ? '' : ' → ' + JSON.stringify(info))); if (!ok) fails++; };

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(600);
  await page.click('text=Spiel moderieren');
  await page.click('text=Auf einem Gerät');
  for (const n of ['Anna', 'Ben', 'Cem', 'Dana']) { await page.fill('#add-name', n); await page.keyboard.press('Enter'); await page.waitForTimeout(60); }

  // Hilfen im Browser: Runde spielen, bei der die genannten Spieler je ihre erste Frage falsch haben
  await page.evaluate(() => {
    const e = window.__ddf.engine;
    window.__t = {
      ids: () => Object.fromEntries(e.G.players.map(p => [p.name, p.id])),
      fresh: () => { e.backToLobby(); e.G.players.forEach(p => { p.hearts = e.s.lives; }); e.s.autoNext = false; e.start(); },
      play: (wrongNames, stopAt) => {
        const ids = window.__t.ids(), wrong = new Set(wrongNames.map(n => ids[n])), done = new Set();
        while (e.G.phase === 'turn') {
          if (stopAt !== undefined && e.G.t === stopAt) return;
          const t = e.cur(), w = wrong.has(t.pid) && !done.has(t.pid);
          if (w) done.add(t.pid);
          e.mark(w ? 'wrong' : 'right', w ? 'Quatsch' : ''); e.next();
        }
      },
      st: () => { const G = e.G; return { phase: G.phase, wrongs: G.review ? G.review.wrongs.map(w => e.player(w.pid).name) : null, cands: e.candidates().map(id => e.player(id).name), vote: G.vote ? G.vote.cands.map(id => e.player(id).name) : null, hearts: Object.fromEntries(G.players.map(p => [p.name, p.hearts])), hist: G.history.length }; },
      turnOf: (name, result) => { const id = window.__t.ids()[name]; return e.G.turns.findIndex(t => t.pid === id && t.result === result); }
    };
  });
  const T = (fn, ...a) => page.evaluate(([fn, a]) => window.__t[fn](...a), [fn, a]);
  const E = (code) => page.evaluate(code);

  // 1) Während der Runde über die Oberfläche: frühere Frage von falsch auf richtig
  await T('fresh');
  await T('play', ['Anna'], 3);
  await page.click('text=Bewertungen korrigieren');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'fix-01-runde.png') });
  const iA = await T('turnOf', 'Anna', 'wrong');
  await page.click(`#fix-1-${iA}`);
  await page.waitForTimeout(300);
  check('Runde: Klick „Doch richtig“ ändert die Bewertung', await E(`window.__ddf.engine.G.turns[${iA}].result`) === 'right');
  await page.screenshot({ path: path.join(OUT, 'fix-02-runde-korrigiert.png') });

  // 2) Auswertung: Fehlerliste und Wählbare passen sich an
  await T('fresh'); await T('play', ['Anna', 'Ben']);
  let s = await T('st');
  check('Auswertung vorher: Anna & Ben wählbar', s.phase === 'review' && s.cands.join() === 'Anna,Ben', s);
  await E(`window.__ddf.engine.fixTurn(${await T('turnOf', 'Ben', 'wrong')}, 'right')`);
  s = await T('st');
  check('Auswertung nachher: nur Anna', s.phase === 'review' && s.wrongs.join() === 'Anna' && s.cands.join() === 'Anna', s);
  await page.screenshot({ path: path.join(OUT, 'fix-03-auswertung.png') });

  // 3) Voting mit 3 Wählbaren: einer fällt weg, Voting läuft mit 2 weiter, Stimmen für ihn verfallen
  await T('fresh'); await T('play', ['Anna', 'Ben', 'Cem']);
  await E('window.__ddf.engine.startVote()');
  const ids = await T('ids');
  await E(`window.__ddf.engine.castVote('${ids.Dana}', '${ids.Cem}'); window.__ddf.engine.castVote('${ids.Anna}', '${ids.Ben}')`);
  await E(`window.__ddf.engine.fixTurn(${await T('turnOf', 'Cem', 'wrong')}, 'right')`);
  s = await T('st');
  const votes = await E('Object.keys(window.__ddf.engine.G.votes).length');
  check('Voting: läuft mit Anna & Ben weiter, Stimme für Cem verfällt', s.phase === 'vote' && s.vote.join() === 'Anna,Ben' && votes === 1, { s, votes });

  // 4) Voting mit 2 Wählbaren: einer fällt weg → zurück zur Auswertung
  await E(`window.__ddf.engine.fixTurn(${await T('turnOf', 'Ben', 'wrong')}, 'right')`);
  s = await T('st');
  check('Voting: nur noch einer wählbar → zurück zur Auswertung', s.phase === 'review' && s.cands.join() === 'Anna', s);

  // 5) Ergebnis: Herz schon abgezogen → wird zurückgegeben, neu abstimmen
  await T('fresh'); await T('play', ['Anna', 'Ben']);
  await E('window.__ddf.engine.startVote()');
  await E(`const e = window.__ddf.engine; e.castVote('${ids.Cem}', '${ids.Anna}'); e.castVote('${ids.Dana}', '${ids.Anna}'); e.castVote('${ids.Ben}', '${ids.Anna}'); e.reveal();`);
  await page.waitForFunction(() => window.__ddf.engine.G.reveal && window.__ddf.engine.G.reveal.applied, null, { timeout: 8000 });
  s = await T('st');
  check('Ergebnis: Anna hat ein Herz verloren', s.hearts.Anna === 2 && s.hist === 1, s);
  await E(`window.__ddf.engine.fixTurn(${await T('turnOf', 'Anna', 'wrong')}, 'right')`);
  s = await T('st');
  check('Ergebnis korrigiert: Herz zurück, Auswertung neu, nur Ben wählbar', s.phase === 'review' && s.hearts.Anna === 3 && s.hist === 0 && s.cands.join() === 'Ben', s);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'fix-04-ergebnis-zurueck.png') });

  // 6) Ergebnis: Rauswurf wird rückgängig gemacht
  await T('fresh');
  await E(`window.__ddf.engine.G.players.forEach(p => { p.hearts = p.name === 'Anna' ? 1 : 3; })`);
  await T('play', ['Anna']);
  await E('window.__ddf.engine.startVote()');
  await page.waitForFunction(() => window.__ddf.engine.G.reveal && window.__ddf.engine.G.reveal.applied, null, { timeout: 8000 });
  const out1 = await E(`(() => { const p = window.__ddf.engine.G.players.find(p => p.name === 'Anna'); return [p.out, window.__ddf.engine.G.outCount]; })()`);
  await E(`window.__ddf.engine.fixTurn(${await T('turnOf', 'Anna', 'wrong')}, 'right')`);
  const out2 = await E(`(() => { const p = window.__ddf.engine.G.players.find(p => p.name === 'Anna'); return [p.out, p.hearts, window.__ddf.engine.G.outCount, window.__ddf.engine.G.phase]; })()`);
  check('Rauswurf zurückgenommen', out1[0] === true && out1[1] === 1 && out2[0] === false && out2[1] === 1 && out2[2] === 0 && out2[3] === 'review', { out1, out2 });

  // 7) Ergebnis: Änderung ohne Einfluss auf Wählbare → Ergebnis bleibt
  await T('fresh'); await T('play', ['Anna', 'Ben']);
  await E('window.__ddf.engine.startVote()');
  await E(`const e = window.__ddf.engine; e.castVote('${ids.Cem}', '${ids.Anna}'); e.castVote('${ids.Dana}', '${ids.Anna}'); e.castVote('${ids.Ben}', '${ids.Anna}'); e.reveal();`);
  const rightIdx = await T('turnOf', 'Cem', 'right');
  await E(`window.__ddf.engine.fixTurn(${rightIdx}, 'right')`); // keine Änderung
  s = await T('st');
  check('Ergebnis: gleiche Bewertung erneut setzen ändert nichts', s.phase === 'reveal', s);

  // 8) Finale: Bewertung einer gespielten Finalfrage ändern → Punkte angepasst
  await E(`const e = window.__ddf.engine; e.backToLobby(); e.G.players.filter(p => p.name === 'Cem' || p.name === 'Dana').forEach(p => { e.G.players.splice(e.G.players.indexOf(p), 1); }); e.commit(); e.start();`);
  await E(`const e = window.__ddf.engine; e.finalQuestion(); e.finalReveal(); e.finalPids().forEach(id => e.finalMark(id, false)); e.finalNext();`);
  const sc1 = await E('Object.values(window.__ddf.engine.G.final.score)');
  const aId = await E('window.__ddf.engine.G.final.pids[0]');
  await page.click('text=Bewertungen korrigieren');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'fix-05-finale.png') });
  await E(`window.__ddf.engine.fixFinal(0, '${aId}', true)`);
  const sc2 = await E(`window.__ddf.engine.G.final.score['${aId}']`);
  check('Finale: Punkt nachträglich gutgeschrieben', sc2 === sc1[0] + 1, { sc1, sc2 });

  check('keine Fehler in der Konsole', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} Prüfung(en) fehlgeschlagen` : 'alles ok');
  process.exit(fails ? 1 : 0);
})();
