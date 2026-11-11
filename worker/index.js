// Cloudflare Worker für die Spielerkameras: reicht Anfragen an Cloudflare Realtime SFU weiter,
// damit das App Secret nicht in der öffentlichen Seite stehen muss.
const API = 'https://rtc.live.cloudflare.com/v1/apps/';
const ID = '[A-Za-z0-9_-]{1,128}';
const ROUTES = [
  { method: 'POST', re: new RegExp('^/sessions$'), to: () => 'sessions/new' },
  { method: 'POST', re: new RegExp(`^/sessions/(${ID})/tracks$`), to: m => `sessions/${m[1]}/tracks/new` },
  { method: 'PUT', re: new RegExp(`^/sessions/(${ID})/renegotiate$`), to: m => `sessions/${m[1]}/renegotiate` }
];
const MAX_BODY = 256 * 1024;

function allowedOrigin(origin, env) {
  if (!origin) return false;
  if ((env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).includes(origin)) return true;
  return /^http:\/\/localhost(:\d+)?$/.test(origin);
}
function cors(origin) {
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    if (!allowedOrigin(origin, env)) return json({ error: 'origin' }, 403, {});
    const headers = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const path = new URL(req.url).pathname;
    for (const r of ROUTES) {
      const m = path.match(r.re);
      if (!m || r.method !== req.method) continue;
      const body = await req.text();
      if (body.length > MAX_BODY) return json({ error: 'too large' }, 413, headers);
      const res = await fetch(API + env.SFU_APP_ID + '/' + r.to(m), {
        method: r.method,
        headers: { Authorization: 'Bearer ' + env.SFU_SECRET, 'Content-Type': 'application/json' },
        body: body || undefined
      });
      return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': 'application/json', ...headers } });
    }
    return json({ error: 'not found' }, 404, headers);
  }
};
