// Baut alle Quellen (src/) zu einer einzigen HTML-Datei zusammen: index.html
const fs = require('fs');
const path = require('path');
const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');

const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Der Dümmste fliegt – das Quiz, bei dem die dümmste Antwort ein Herz kostet. Moderator-Pult, Bühne im Stream-Look, Joker-Roulette, geheimes Voting und Finale.">
<title>Der Dümmste fliegt</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Rubik:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
${src('styles.css')}
</style>
</head>
<body>
<div id="app" class="app"></div>
<noscript><p style="padding:20px;font-family:sans-serif;color:#fff">Bitte JavaScript aktivieren.</p></noscript>
<script>
${src('questions.js')}
</script>
<script>
${src('flags.js')}
</script>
<script>
${src('app.js')}
</script>
</body>
</html>
`;
const out = path.join(__dirname, 'index.html');
fs.writeFileSync(out, html);
console.log('gebaut:', out, (html.length / 1024).toFixed(1) + ' KB');
