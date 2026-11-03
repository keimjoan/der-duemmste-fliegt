// Ausweichroute über die echten MQTT-Dienste: erzwungen, als automatischer Wechsel, falscher Code, offline
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'));
const fail = [];
const check = (name, ok, extra = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? ' – ' + extra : '')); if (!ok) fail.push(name); };
(async () => {
  const server = http.createServer((q, s) => { s.setHeader('Content-Type', 'text/html; charset=utf-8'); s.end(HTML); }).listen(0);
  const BASE = 'http://localhost:' + server.address().port + '/index.html';
  const browser = await chromium.launch();
  const errors = [];
  const mk = async (ctx, name) => { const p = await ctx.newPage(); p.on('pageerror', e => errors.push(name + ': ' + e.message)); return p; };
  const join = async (p, url, name) => { await p.goto(url); await p.fill('#join-name', name); await p.click('button[type=submit]'); };
  const fresh = () => browser.newContext({ viewport: { width: 1200, height: 800 } });
  const status = p => p.evaluate(() => window.__ddfp && window.__ddfp.status);
  const players = host => host.evaluate(() => window.__ddf.engine.G.players.map(p => p.name + (p.conn ? '+' : '-')).join(','));

  // Moderator nur über die Ausweichroute
  const host = await mk(await fresh(), 'host');
  await host.goto(BASE + '?net=relay');
  await host.click('text=Spiel moderieren');
  await host.click('text=Online mit Code');
  await host.waitForFunction(() => window.__ddf && window.__ddf.ctl.netStatus === 'online', null, { timeout: 20000 });
  const code = await host.evaluate(() => window.__ddf.engine.G.code);
  console.log('code', code);

  // 1. Mitspieler erzwungen über die Ausweichroute
  const a = await mk(await fresh(), 'Anna');
  await join(a, BASE + '?net=relay#join-' + code, 'Anna');
  await a.waitForFunction(() => window.__ddfp && window.__ddfp.S, null, { timeout: 30000 });
  check('Beitritt über Ausweichroute', (await status(a)) === 'open');

  // 2. Direktverbindung scheitert (kein WebRTC möglich) -> automatischer Wechsel
  const ctxB = await fresh();
  await ctxB.addInitScript(() => { window.RTCPeerConnection = function () { throw new Error('blockiert'); }; });
  const b = await mk(ctxB, 'Ben');
  await join(b, BASE + '#join-' + code, 'Ben');
  const t0 = Date.now();
  await b.waitForFunction(() => window.__ddfp && window.__ddfp.S, null, { timeout: 45000 });
  check('Automatischer Wechsel', (await b.evaluate(() => window.__ddfp.net.active)) === 'relay', ((Date.now() - t0) / 1000).toFixed(1) + ' s');

  const c = await mk(await fresh(), 'Cem');
  await join(c, BASE + '?net=relay#join-' + code, 'Cem');
  await c.waitForFunction(() => window.__ddfp && window.__ddfp.S, null, { timeout: 30000 });

  await host.waitForTimeout(6000);
  const list = await players(host);
  check('Keine doppelten Spieler', list === 'Anna+,Ben+,Cem+', list);

  // 3. Spiel läuft über die Route: Start und Joker vom Gerät
  await host.click('text=Spiel starten');
  await a.waitForFunction(() => window.__ddfp.S.phase === 'turn', null, { timeout: 10000 });
  check('Spielstart kommt an', true);
  const cur = await host.evaluate(() => window.__ddf.engine.player(window.__ddf.engine.cur().pid).name);
  const jp = { Anna: a, Ben: b, Cem: c }[cur];
  await jp.click('text=Joker einsetzen'); await jp.click('text=Wirklich?');
  await host.waitForFunction(() => window.__ddf.engine.cur().jokerFrom, null, { timeout: 15000 });
  check('Joker vom Gerät kommt an', true);

  // 4. Größe der Nachrichten im Rahmen
  const size = await host.evaluate(() => { const c = window.__ddf.ctl; return JSON.stringify({ t: 'state', s: c.e.pub(), me: null }).length; });
  check('Zustand unter 20 KB', size < 20000, size + ' Zeichen');

  // 5. Falscher Code: klare Meldung statt endlosem Laden
  const bad = await mk(await fresh(), 'bad');
  await join(bad, BASE + '#join-ZZZZ', 'Falsch');
  await bad.waitForFunction(() => window.__ddfp && window.__ddfp.status === 'nohost', null, { timeout: 45000 });
  check('Falscher Code wird gemeldet', (await bad.textContent('body')).includes('Kein Spiel mit diesem Code'));
  await bad.close();

  // 6. Alles blockiert: Fehlermeldung mit „Nochmal versuchen“
  const ctxOff = await fresh();
  await ctxOff.route(/unpkg|jsdelivr|peerjs/, r => r.abort());
  await ctxOff.routeWebSocket(/.*/, ws => ws.close());
  const off = await mk(ctxOff, 'off');
  await join(off, BASE + '#join-ABCD', 'Offline');
  await off.waitForFunction(() => window.__ddfp && window.__ddfp.status === 'error', null, { timeout: 60000 });
  check('Offline zeigt Fehler', (await off.textContent('body')).includes('Nochmal versuchen'));

  check('Keine Seitenfehler', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(fail.length ? 'FEHLGESCHLAGEN: ' + fail.join(', ') : 'Alle Prüfungen bestanden');
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
