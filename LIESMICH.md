# Der Dümmste fliegt – Web-Version

Fan-Nachbau des Quiz-Formats (bekannt von PietSmiet, Reved und Schmobin). Alles steckt in **einer Datei**: `index.html` (wird mit `node build.js` aus `src/` gebaut).

## Lokal auf einem Gerät
1. `index.html` im Browser öffnen (Chrome, Edge, Firefox oder Safari).
2. **Spiel moderieren → Auf einem Gerät**, Spieler eintragen, starten.
3. Abgestimmt wird geheim in der **Wahlkabine** (Gerät reihum weitergeben), oder du trägst die Stimmen ein (z. B. per Discord-DM).
4. Für Discord oder OBS: **Nur Bühne** (Taste B) oder **Bühnen-Tab** öffnen und diesen Tab teilen.

## Online mit Freunden (jeder am eigenen Handy oder PC)
**Variante A – ohne eigenen Server**
1. Die HTML-Datei online stellen, z. B. per GitHub Pages oder Netlify Drop, und den Link teilen. (Es geht auch, wenn alle dieselbe Datei lokal öffnen.)
2. Moderator: **Spiel moderieren → Online mit Code**.
3. Mitspieler: Seite öffnen → **Spiel beitreten** → Code und Namen eingeben.

Der Verbindungsaufbau läuft über den kostenlosen Dienst von peerjs.com, die Spieldaten gehen möglichst direkt zwischen den Browsern hin und her. Klappt das nicht (z. B. über mobile Daten), läuft das Spiel automatisch über öffentliche MQTT-Dienste von EMQX weiter. Die Daten werden dabei mit dem Spielcode verschlüsselt; das ist wegen des kurzen Codes nur ein einfacher Schutz, also keine sensiblen Daten als Namen eingeben. Für diese Dienste gibt es keine Verfügbarkeitsgarantie.

**Variante B – Heimnetz oder eigener Server (keine fremden Dienste)**
```
node server.js            # Port 8080
PORT=3000 node server.js  # anderer Port
```
`server.js` und `index.html` müssen im selben Ordner liegen. Danach `http://<IP-des-Rechners>:8080` öffnen – der Server zeigt die Adressen beim Start an.

## Tasten für den Moderator
`R` richtig · `F` falsch · `Leertaste` weiter · `A` andere Frage · `J` Joker · `P` Timer-Pause · `B` nur Bühne · `M` Ton

## Eigene Fragen
Im Pult auf **Fragen**: eine Frage pro Zeile als `Frage|Antwort`. Alles unter `# Finale` landet im Finale, `Frage|Antwort|S` markiert eine Schätzfrage.
