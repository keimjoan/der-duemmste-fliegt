# Der Dümmste fliegt – Hinweise für Claude Code

Fan-Nachbau des Quiz-Formats „Der Dümmste fliegt“ (Vorlage: Schmobins Version, Format von PietSmiet/Reved) als Web-App. Oberfläche und Texte sind **deutsch**.

## Aufbau
- `src/` ist die Quelle, `index.html` wird daraus **gebaut** – nie direkt in `index.html` editieren.
  - `src/app.js` – gesamte App: Helfer, Sound (WebAudio), Fragenbank, `Engine` (Spiellogik), Netzwerk, `HostCtl`, `PlayerCtl`, `StageView` (Bühne), `HostPanel`, `PlayerPanel`, Bildschirme, Boot.
  - `src/styles.css` – Design-Tokens im `:root`, Bühne ist 1920×1080 und wird per `--scale` skaliert.
  - `src/questions.js` – Fragen als Text: `Frage|Antwort` (Alternativen mit ` / `), `Frage|Antwort|S` = Schätzfrage, `# Kategorie`.
  - `src/flags.js` – Flaggen als SVG (Emoji-Flaggen gehen unter Windows nicht).
- `build.js` setzt alles zu **einer** selbstständigen `index.html` zusammen (läuft auch als Claude-Artifact und auf GitHub Pages).
- `server.js` – optionaler Spielserver ohne Abhängigkeiten (SSE + POST) für LAN/Heimserver; markiert die ausgelieferte Seite mit `data-ddf-server="1"`.

## Architektur
- Das Moderator-Gerät ist die einzige Wahrheit: `Engine` hält den Zustand `G`, `engine.pub()` erzeugt den öffentlichen Zustand (ohne Antworten, Stimmen, Finale-Antworten vor dem Aufdecken), `engine.me(pid)` die persönlichen Daten.
- Phasen: `lobby → turn → review → vote (→ tb Stichwahl) → reveal → … → finalIntro → final → end`.
- Einmal-Effekte laufen über `G.fx` (fortlaufende Nummer `n`), die Bühne spielt sie genau einmal ab.
- Transporte: `Mirror` (BroadcastChannel, Bühnen-Tab im selben Browser), `HybridHostNet/HybridClientNet` (erst direkt per `PeerHostNet/PeerClientNet`, PeerJS 1.5.4 vom CDN, öffentlicher Dienst peerjs.com; sonst `RelayHostNet/RelayClientNet`, verschlüsselt über öffentliche MQTT-Dienste, zum Testen mit `?net=relay` erzwingbar), `ServerHostNet/ServerClientNet` (server.js).
- Im Claude-Artifact sind Verbindungen nach außen gesperrt → dort nur Lokal-Modus (`ENV.inClaude`). Kein `alert/confirm/prompt`, kein `window.open`; `localStorage` nur über `store` (try/catch).
- Panels werden bei Änderungen neu gezeichnet; `guardPointer` verhindert verlorene Klicks, `data-keep` erhält Eingaben.

## Regeln (Standard-Einstellungen)
3 Herzen · 2 Fragen pro Spieler und Runde (Startspieler rotiert) · 30 s Antwortzeit · 1 Joker pro Spieler, max. 1 pro Runde, Joker-Roulette lost das Ziel aus · geheimes Voting 30 s, wählbar nur wer Fehler hatte · meiste Stimmen = −1 Herz · Gleichstand: Stichwahl / Moderator / Zufall · Finale der letzten 2: 10 Fragen, getippt, übrige Herzen = Startpunkte, Gleichstand = Entscheidungsfrage.

## Befehle
```bash
node build.js                      # index.html neu bauen (nach jeder Änderung in src/)
node server.js                     # Spielserver auf Port 8080 (PORT=… für anderen Port)
npm install                        # einmalig für die Tests (Playwright)
npx playwright install chromium    # falls noch kein Chromium da ist

# Tests (spielen echte Partien über die Oberfläche durch, Screenshots in test/shots/)
node test/local.js                                   # Lokal-Modus, öffnet index.html direkt
PORT=8099 node server.js &  node test/online.js      # Online über server.js, 4 Geräte + Neuladen
python3 -m http.server 8098 &  node test/peer.js     # Online über PeerJS (mit Nachbildung test/peer-mock.js)
python3 -m http.server 8098 &  node test/stage.js    # Bühnen-Tab, Nur-Bühne, Tablet-Layout
node test/relay.js                                   # Ausweichroute über die echten MQTT-Dienste (braucht Internet)
```
Nach Änderungen: bauen, passende Tests laufen lassen, Screenshots ansehen, dann committen. GitHub Pages (falls aktiv) veröffentlicht `index.html` aus `main` automatisch.

## Für Engine-Tests in der Browser-Konsole
`window.__ddf` = `{ engine, ctl }` beim Moderator, `window.__ddfp` = PlayerCtl beim Mitspieler.
