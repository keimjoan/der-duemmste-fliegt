// Bühnen-Tab: zweiter Tab im selben Browser spiegelt die Bühne
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
const URL = process.env.URL || 'http://localhost:8098/index.html';
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  const host = await ctx.newPage(); host.on('pageerror', e => errors.push('host ' + e.message));
  await host.goto(URL);
  await host.click('text=Spiel moderieren'); await host.click('text=Auf einem Gerät');
  for (const n of ['Lena', 'Mo', 'Pia', 'Tom', 'Ute', 'Vik', 'Wim', 'Xen']) { await host.fill('#add-name', n); await host.keyboard.press('Enter'); await host.waitForTimeout(40); }
  await host.click('text=Spiel starten');
  await host.waitForTimeout(2200);
  const st = await ctx.newPage(); st.on('pageerror', e => errors.push('stage ' + e.message));
  await st.goto(URL + '#buehne');
  await st.waitForTimeout(1500);
  await st.screenshot({ path: path.join(OUT, 's01-stage-tab.png') });
  await host.keyboard.press('f'); await host.waitForTimeout(500);
  const q = await st.evaluate(() => document.querySelector('.bar-box .txt') && document.querySelector('.bar-box .txt').innerText);
  console.log('stage tab shows:', q && q.replace(/\n/g, ' | '));
  // Nur-Bühne-Modus im Moderator-Tab
  await host.keyboard.press('b'); await host.waitForTimeout(400);
  await host.screenshot({ path: path.join(OUT, 's02-host-stage-only.png') });
  await host.keyboard.press('b');
  // schmaler Bildschirm (Tablet hochkant)
  await host.setViewportSize({ width: 820, height: 1180 }); await host.waitForTimeout(500);
  await host.screenshot({ path: path.join(OUT, 's03-host-tablet.png') });
  console.log('errors', errors);
  await browser.close();
})();
