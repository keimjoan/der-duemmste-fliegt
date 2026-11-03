#!/usr/bin/env node
/*
  Der Dümmste fliegt – kleiner Spielserver (optional, ohne Abhängigkeiten)
  -----------------------------------------------------------------------
  Nur nötig, wenn ihr ohne den öffentlichen PeerJS-Dienst spielen wollt,
  z. B. im Heimnetz (LAN) oder auf einem eigenen Server.

  Start:   node server.js            (Port 8080)
           PORT=3000 node server.js  (anderer Port)
  Dann:    http://<IP-dieses-Rechners>:8080 im Browser öffnen.
  Die Datei index.html (das Spiel) muss im selben Ordner liegen.
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 8080;
const FILE = fs.existsSync(path.join(__dirname, 'index.html')) ? path.join(__dirname, 'index.html') : path.join(__dirname, 'der-duemmste-fliegt.html');
const rooms = new Map(); // code -> { host: {res, token} | null, hostToken, clients: Map(cid -> res), touched }

const room = code => {
  let r = rooms.get(code);
  if (!r) { r = { host: null, hostToken: null, clients: new Map(), touched: Date.now() }; rooms.set(code, r); }
  r.touched = Date.now();
  return r;
};
const sse = (res, event, data) => { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data == null ? {} : data)}\n\n`); } catch (e) { /* Verbindung weg */ } };
const openSSE = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 2000\n\n');
  const ka = setInterval(() => { try { res.write(': ka\n\n'); } catch (e) { /* egal */ } }, 15000);
  req.on('close', () => clearInterval(ka));
};
const validCode = c => /^[A-Z0-9]{4}$/.test(c || '');
const readBody = req => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 256 * 1024) { reject(new Error('zu groß')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); } });
  req.on('error', reject);
});
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && (p === '/' || p === '/index.html' || p === '/der-duemmste-fliegt.html')) {
      fs.readFile(FILE, (err, buf) => {
        if (err) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('index.html fehlt neben server.js – erst `node build.js` ausführen.'); }
        const html = buf.toString('utf8').replace('<html lang="de">', '<html lang="de" data-ddf-server="1">');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(html);
      });
      return;
    }
    if (p === '/api/ddf/ping') return json(res, 200, { ddf: 1 });

    // Moderator verbindet sich (Server-Sent Events)
    if (req.method === 'GET' && p === '/api/ddf/host') {
      const code = (url.searchParams.get('code') || '').toUpperCase(), token = url.searchParams.get('token') || '';
      if (!validCode(code) || !token) return json(res, 400, { error: 'code/token' });
      const r = room(code);
      openSSE(req, res);
      if (r.host && r.hostToken !== token) { sse(res, 'taken', {}); return res.end(); }
      if (r.host && r.host.res !== res) { try { r.host.res.end(); } catch (e) { /* egal */ } }
      r.host = { res, token }; r.hostToken = token;
      sse(res, 'ready', { clients: [...r.clients.keys()] });
      for (const [, cres] of r.clients) sse(cres, 'hostup', {});
      req.on('close', () => {
        if (r.host && r.host.res === res) {
          r.host = null;
          for (const [, cres] of r.clients) sse(cres, 'hostdown', {});
        }
      });
      return;
    }
    if (req.method === 'POST' && p === '/api/ddf/host/send') {
      const b = await readBody(req), code = String(b.code || '').toUpperCase(), r = rooms.get(code);
      if (!r || !r.host || r.hostToken !== b.token) return json(res, 403, { error: 'kein Moderator' });
      r.touched = Date.now();
      for (const it of (Array.isArray(b.items) ? b.items : [])) { const c = r.clients.get(it.cid); if (c) sse(c, 'msg', it.msg); }
      return json(res, 200, { ok: 1 });
    }

    // Mitspieler verbindet sich
    if (req.method === 'GET' && p === '/api/ddf/client') {
      const code = (url.searchParams.get('code') || '').toUpperCase(), cid = url.searchParams.get('cid') || '';
      if (!validCode(code) || !/^[a-z0-9]{4,24}$/.test(cid)) return json(res, 400, { error: 'code/cid' });
      const r = room(code);
      openSSE(req, res);
      const old = r.clients.get(cid); if (old && old !== res) { try { old.end(); } catch (e) { /* egal */ } }
      r.clients.set(cid, res);
      sse(res, 'ready', { host: !!r.host });
      req.on('close', () => {
        if (r.clients.get(cid) === res) {
          r.clients.delete(cid);
          if (r.host) sse(r.host.res, 'leave', { cid });
        }
      });
      return;
    }
    if (req.method === 'POST' && p === '/api/ddf/client/send') {
      const b = await readBody(req), code = String(b.code || '').toUpperCase(), r = rooms.get(code);
      if (!r || !r.host) return json(res, 409, { error: 'kein Moderator' });
      if (!r.clients.has(b.cid)) return json(res, 403, { error: 'unbekannt' });
      r.touched = Date.now();
      sse(r.host.res, 'msg', { cid: b.cid, msg: b.msg });
      return json(res, 200, { ok: 1 });
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Nicht gefunden');
  } catch (e) {
    try { json(res, 400, { error: String(e.message || e) }); } catch (x) { /* egal */ }
  }
});

// leere Räume aufräumen
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) if (!r.host && !r.clients.size && now - r.touched > 10 * 60 * 1000) rooms.delete(code);
}, 60 * 1000);

server.listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('Der Dümmste fliegt läuft:');
  console.log(`  auf diesem Rechner:  http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  im Heimnetz:         http://${ip}:${PORT}`));
});
