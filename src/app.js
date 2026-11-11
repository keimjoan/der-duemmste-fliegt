'use strict';
(() => {
/* =========================================================================
   Der Dümmste fliegt – Web-Version
   Moderator-Gerät ist die "Wahrheit" (Engine). Bühne, Bühnen-Tab und
   Mitspieler-Geräte zeigen nur den öffentlichen Zustand an.
   ========================================================================= */

// ---------- Umgebung & Helfer ----------
const ENV = {
  inClaude: !!(window.claude && typeof window.claude.use === 'function') || /claude/i.test(location.hostname),
  isFile: location.protocol === 'file:',
  isHttp: /^https?:$/.test(location.protocol),
  server: false,
  reduced: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
};
const hot = window.claude && window.claude.hot;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (typeof v !== 'string' && k in el) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function rnd(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
const uid = (n = 8) => { const al = 'abcdefghijkmnopqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < n; i++) s += al[rnd(al.length)]; return s; };
const CODE_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { let s = ''; for (let i = 0; i < 4; i++) s += CODE_ALPHA[rnd(CODE_ALPHA.length)]; return s; };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[rnd(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function hashStr(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); }
function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim(); }
function lev(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
// Vorschlag für den Moderator, ob eine getippte Antwort stimmt (entscheiden tut der Moderator)
function checkAnswer(given, answer) {
  const g = norm(given); if (!g) return false;
  for (const opt of String(answer || '').split(/\s\/\s|\s+oder\s+/)) {
    const o = norm(opt.replace(/\(.*?\)/g, ''));
    if (!o) continue;
    if (g === o) return true;
    const gn = g.match(/\d+/g), on = o.match(/\d+/g);
    if (on && gn && on.join() === gn.join()) return true;
    if (o.length >= 4 && g.includes(o)) return true;
    const ow = o.split(' '), gw = g.split(' ');
    if (gw.every(w => ow.includes(w)) && gw.join('').length >= Math.min(4, o.replace(/ /g, '').length)) return true;
    const d = lev(g, o);
    if ((o.length >= 5 && d <= 1) || (o.length >= 9 && d <= 2)) return true;
  }
  return false;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* kein Speicher */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } }
};
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
let toastT = null;
function toast(msg, ms = 2600) {
  let t = $('.toast'); if (t) t.remove();
  t = h('div', { class: 'toast', role: 'status' }, msg); document.body.appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Kopiert!'); return true; }
  catch (e) { toast('Kopieren nicht möglich – bitte manuell markieren.'); return false; }
}

// ---------- Konstanten ----------
const AVATARS = ['🦊', '🐸', '🐼', '🦁', '🐯', '🐨', '🐵', '🐧', '🦉', '🐙', '🦄', '🐲', '🐢', '🦖', '🐝', '🦀', '🐳', '🐰', '🐻', '🐷', '🐮', '🦝', '🦥', '🦩', '🐺', '🦔', '🐌', '🦆', '🐞', '🦈', '🐱', '🐶'];
const COLORS = ['#3fe0ff', '#ff4fa3', '#ffc93c', '#56f39a', '#a98bff', '#ff8a3d', '#4f8bff', '#ff5d6c', '#2ee6c8', '#d9ff4f', '#ff7ad9', '#9fd3ff'];
const MAX_PLAYERS = 12;
const DEFAULTS = {
  lives: 3, qpp: 2, answerTime: 30, voteTime: 30, finalTime: 45, joker: true, jokerMode: 'roulette',
  onlyWrong: true, finalAt: 2, finalQuestions: 10, heartBonus: true, autoNext: false, outVote: false, customOnly: false
};
const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const heartSVG = on => `<svg viewBox="0 0 24 24" class="${on ? 'heart-on' : 'heart-off'}" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;
const heartsInline = (n, max) => `<span class="hearts-inline" aria-label="${n} von ${max} Herzen">${Array.from({ length: Math.max(n, max) }, (_, i) => heartSVG(i < n)).join('')}</span>`;
const PLANE_SVG = '<svg viewBox="0 0 64 64" class="plane" aria-hidden="true"><path d="M3 29 61 5 27 37Z" fill="#e9fbff"/><path d="M27 37 61 5 39 59Z" fill="#9fe9ff"/><path d="M27 37 31 50 39 59Z" fill="#5cc8ea"/></svg>';
const logoHTML = () => `<div class="logo" aria-label="Der Dümmste fliegt"><span class="l1">DER DÜMMSTE</span><span class="l2">FLIEGT${PLANE_SVG}</span></div>`;
const flagHTML = code => (code && typeof DDF_FLAGS !== 'undefined' && DDF_FLAGS.has(code)) ? DDF_FLAGS.get(code) : '';

// ---------- Sound (synthetisch, keine Dateien) ----------
const Sfx = {
  ctx: null, master: null, on: store.get('ddf-sound', true),
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* kein Audio */ }
  },
  tone(f, d, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.at || 0), osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g); g.connect(this.master); osc.start(t); osc.stop(t + d + 0.05);
  },
  noise(d, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.at || 0), len = Math.max(1, Math.floor(c.sampleRate * d));
    const buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = o.freq || 1200; fl.Q.value = o.q || 0.8;
    const g = c.createGain(); g.gain.value = o.vol || 0.2;
    src.connect(fl); fl.connect(g); g.connect(this.master); src.start(t);
  },
  play(name) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const T = (f, d, o) => this.tone(f, d, o);
    switch (name) {
      case 'right': T(660, .12, { type: 'triangle', vol: .25 }); T(990, .28, { type: 'triangle', vol: .25, at: .1 }); break;
      case 'wrong': T(190, .45, { type: 'sawtooth', vol: .14, to: 120 }); T(196, .45, { type: 'square', vol: .07, to: 110 }); break;
      case 'tick': T(1500, .045, { type: 'square', vol: .06 }); break;
      case 'turn': T(520, .08, { vol: .12 }); T(780, .1, { vol: .12, at: .07 }); break;
      case 'spin': T(950 + Math.random() * 250, .035, { type: 'square', vol: .05 }); break;
      case 'land': T(523, .15, { type: 'triangle', vol: .22 }); T(659, .15, { type: 'triangle', vol: .22, at: .12 }); T(784, .4, { type: 'triangle', vol: .22, at: .24 }); break;
      case 'vote': T(440, .07, { vol: .1 }); T(660, .07, { vol: .08, at: .05 }); break;
      case 'drum': this.noise(.18, { vol: .5, freq: 180, q: 1.2 }); T(95, .22, { vol: .3, to: 50 }); break;
      case 'heart': T(720, .55, { type: 'sawtooth', vol: .12, to: 170 }); this.noise(.3, { vol: .28, freq: 2600, at: .05 }); break;
      case 'out': this.noise(1.5, { vol: .32, freq: 700, q: .4 }); T(300, 1.3, { vol: .16, to: 1400, at: .25 }); T(150, .6, { type: 'square', vol: .08, to: 60 }); break;
      case 'final': [392, 523, 659, 784].forEach((f, i) => T(f, .35, { type: 'triangle', vol: .2, at: i * .14 })); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => T(f, .32, { type: 'triangle', vol: .22, at: i * .13 })); break;
      case 'join': T(880, .08, { vol: .1 }); T(1320, .12, { vol: .1, at: .06 }); break;
      case 'timeup': T(240, .6, { type: 'square', vol: .1 }); break;
      default: break;
    }
  }
};
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => Sfx.unlock(), { capture: true }));

// ---------- Fragen ----------
function parseQ(text, kind) {
  const out = []; let cat = '';
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim(); if (!line) continue;
    if (line.startsWith('#')) { cat = line.replace(/^#+\s*/, ''); continue; }
    const parts = line.split('|'); if (parts.length < 2) continue;
    const q = parts[0].trim(), a = parts[1].trim(); if (!q || !a) continue;
    out.push({ id: kind + hashStr(q), q, a, est: (parts[2] || '').trim().toUpperCase() === 'S', cat, kind });
  }
  return out;
}
function splitCustom(text) {
  const n = [], f = []; let mode = 'n';
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim(); if (!line) continue;
    if (/^#+\s*final/i.test(line)) { mode = 'f'; continue; }
    if (line.startsWith('#')) { mode = 'n'; continue; }
    const parsed = parseQ(line, 'c' + mode);
    parsed.forEach(x => { x.kind = mode; x.custom = true; (mode === 'n' ? n : f).push(x); });
  }
  return { n, f };
}
class QBank {
  constructor() {
    this.builtN = parseQ(typeof DDF_QUESTIONS_NORMAL !== 'undefined' ? DDF_QUESTIONS_NORMAL : '', 'n')
      .concat((typeof DDF_FLAG_QUESTIONS !== 'undefined' ? DDF_FLAG_QUESTIONS : []).map(([code, land]) => ({ id: 'nflag' + code, q: 'Welches Land hat diese Flagge?', a: land, flag: code, cat: 'Flaggen', kind: 'n' })));
    this.builtF = parseQ(typeof DDF_QUESTIONS_FINAL !== 'undefined' ? DDF_QUESTIONS_FINAL : '', 'f');
    this.used = new Set(store.get('ddf-used', []));
    this.loadCustom();
  }
  loadCustom() { this.customText = store.get('ddf-custom', ''); const c = splitCustom(this.customText); this.custN = c.n; this.custF = c.f; }
  setCustom(text) { store.set('ddf-custom', text); this.loadCustom(); }
  pool(kind, s) {
    const custom = kind === 'n' ? this.custN : this.custF, built = kind === 'n' ? this.builtN : this.builtF;
    if (s && s.customOnly && custom.length) return custom;
    return custom.concat(built);
  }
  draw(kind, s, exclude) {
    const ex = new Set((exclude || []).filter(Boolean));
    const pool = this.pool(kind, s).filter(q => !ex.has(q.id));
    let fresh = pool.filter(q => !this.used.has(q.id));
    if (!fresh.length) { pool.forEach(q => this.used.delete(q.id)); fresh = pool; }
    // Eigene Fragen bevorzugen, solange es frische gibt
    const own = fresh.filter(q => q.custom);
    const q = own.length && rnd(3) > 0 ? pick(own) : pick(fresh);
    if (!q) return { id: 'none' + uid(4), q: 'Keine Fragen mehr übrig – stell eine eigene Frage!', a: '–', kind };
    this.used.add(q.id); this.saveUsed();
    return Object.assign({}, q);
  }
  unuse(q) { if (q && q.id && this.used.delete(q.id)) this.saveUsed(); }
  saveUsed() { store.set('ddf-used', Array.from(this.used).slice(-3000)); }
  counts() { return { n: this.builtN.length, f: this.builtF.length, cn: this.custN.length, cf: this.custF.length }; }
}
const bank = new QBank();

// =========================================================================
//  Engine – die komplette Spiellogik (läuft nur auf dem Moderator-Gerät)
// =========================================================================
class Engine {
  constructor(G) { this.G = G || Engine.fresh(); this.subs = new Set(); }
  static fresh(mode = 'local', hostName = 'Moderator', settings = {}) {
    return {
      ver: 1, gid: uid(10), mode, code: null, hostName, settings: Object.assign({}, DEFAULTS, settings),
      players: [], phase: 'lobby', round: 0, starter: null, turns: [], t: -1, jokerUsed: null, roulette: null,
      timer: null, votes: {}, vote: null, review: null, reveal: null, final: null, winner: null, ranking: null,
      outCount: 0, history: [], fx: null, fxn: 0, autoNextAt: null, created: Date.now()
    };
  }
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  commit(fx) {
    const G = this.G;
    if (fx) { G.fxn = (G.fxn || 0) + 1; G.fx = Object.assign({ n: G.fxn, at: Date.now() }, fx); }
    G.updated = Date.now(); G.rev = (G.rev || 0) + 1;
    this.subs.forEach(fn => { try { fn(fx); } catch (e) { console.error(e); } });
  }
  get s() { return this.G.settings; }
  player(id) { return this.G.players.find(p => p.id === id) || null; }
  active() { return this.G.players.filter(p => !p.out); }
  cur() { const G = this.G; return G.phase === 'turn' ? G.turns[G.t] || null : null; }
  mkTimer(sec) { return sec > 0 ? { end: Date.now() + sec * 1000, dur: sec * 1000, paused: false, left: sec * 1000, expired: false } : null; }

  // ----- Lobby -----
  addPlayer({ name, avatar, device = false, silent = false } = {}) {
    const G = this.G; if (G.players.length >= MAX_PLAYERS) return null;
    let nm = cleanName(name) || 'Spieler ' + (G.players.length + 1);
    const taken = n => G.players.some(p => p.name.toLowerCase() === n.toLowerCase());
    if (taken(nm)) { let i = 2; while (taken(nm.slice(0, 13) + ' ' + i)) i++; nm = nm.slice(0, 13) + ' ' + i; }
    const usedC = new Set(G.players.map(p => p.color)), usedA = new Set(G.players.map(p => p.avatar));
    const color = COLORS.find(c => !usedC.has(c)) || pick(COLORS);
    const av = (avatar && AVATARS.includes(avatar) && !usedA.has(avatar)) ? avatar : (shuffle(AVATARS).find(a => !usedA.has(a)) || pick(AVATARS));
    const p = { id: uid(6), name: nm, avatar: av, color, hearts: this.s.lives, joker: true, out: false, outOrder: 0, outRound: 0, conn: false, device: !!device };
    if (G.phase !== 'lobby') { p.hearts = this.s.lives; }
    G.players.push(p);
    this.commit(silent ? null : { type: 'join', pid: p.id });
    return p;
  }
  removePlayer(pid) { const G = this.G; if (G.phase !== 'lobby') return; G.players = G.players.filter(p => p.id !== pid); this.commit(); }
  movePlayer(pid, dir) {
    const a = this.G.players, i = a.findIndex(p => p.id === pid), j = i + dir;
    if (i < 0 || j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; this.commit();
  }
  cycleAvatar(pid) {
    const p = this.player(pid); if (!p) return;
    const used = new Set(this.G.players.filter(x => x !== p).map(x => x.avatar));
    let i = AVATARS.indexOf(p.avatar);
    for (let k = 0; k < AVATARS.length; k++) { i = (i + 1) % AVATARS.length; if (!used.has(AVATARS[i])) break; }
    p.avatar = AVATARS[i]; this.commit();
  }
  rename(pid, name) { const p = this.player(pid), nm = cleanName(name); if (p && nm) { p.name = nm; this.commit(); } }
  setSettings(patch) {
    Object.assign(this.G.settings, patch);
    if (this.G.phase === 'lobby' && 'lives' in patch) this.G.players.forEach(p => { p.hearts = this.s.lives; });
    this.commit();
  }

  // ----- Spielstart & Runden -----
  start() {
    const G = this.G; if (G.players.length < 2) return false;
    G.players.forEach(p => Object.assign(p, { hearts: this.s.lives, joker: true, out: false, outOrder: 0, outRound: 0 }));
    Object.assign(G, { round: 0, starter: null, turns: [], t: -1, jokerUsed: null, roulette: null, timer: null, votes: {}, vote: null, review: null, reveal: null, final: null, winner: null, ranking: null, outCount: 0, history: [], autoNextAt: null });
    if (this.active().length <= this.s.finalAt) this.finalIntro(); else this.startRound();
    return true;
  }
  startRound() {
    const G = this.G, act = this.active(); if (!act.length) return;
    G.round += 1;
    let startIdx = 0;
    if (G.starter) {
      const seats = G.players, prev = seats.findIndex(p => p.id === G.starter);
      for (let k = 1; k <= seats.length; k++) { const p = seats[((prev < 0 ? -1 : prev) + k + seats.length) % seats.length]; if (!p.out) { startIdx = act.indexOf(p); break; } }
    }
    const order = act.slice(startIdx).concat(act.slice(0, startIdx));
    G.starter = order[0].id;
    G.turns = [];
    for (let k = 0; k < this.s.qpp; k++) order.forEach(p => G.turns.push({ pid: p.id, q: null, result: null, given: '', jokerFrom: null }));
    Object.assign(G, { jokerUsed: null, roulette: null, votes: {}, vote: null, review: null, reveal: null });
    this.startTurn(0, { type: 'round', round: G.round });
  }
  startTurn(i, fx) {
    const G = this.G;
    while (i < G.turns.length && (!this.player(G.turns[i].pid) || this.player(G.turns[i].pid).out)) i++;
    if (i >= G.turns.length) return this.endRound();
    G.phase = 'turn'; G.t = i; const turn = G.turns[i];
    if (!turn.q) turn.q = bank.draw('n', this.s);
    G.timer = this.mkTimer(this.s.answerTime); G.autoNextAt = null;
    this.commit(fx || { type: 'turn', pid: turn.pid });
  }
  mark(result, given) {
    const G = this.G, turn = this.cur(); if (!turn || turn.result || G.roulette) return false;
    turn.result = result === 'right' ? 'right' : 'wrong';
    turn.given = String(given || '').trim().slice(0, 80);
    G.timer = null;
    if (this.s.autoNext) G.autoNextAt = Date.now() + 2300;
    this.commit({ type: turn.result, pid: turn.pid });
    return true;
  }
  unmark() {
    const G = this.G, turn = this.cur(); if (!turn || !turn.result) return;
    turn.result = null; turn.given = ''; G.autoNextAt = null; G.timer = this.mkTimer(this.s.answerTime);
    this.commit({ type: 'unmark' });
  }
  next() {
    const G = this.G; if (G.phase !== 'turn') return; const turn = this.cur(); if (!turn || !turn.result) return;
    G.autoNextAt = null;
    if (G.t + 1 < G.turns.length) this.startTurn(G.t + 1); else this.endRound();
  }
  swapQuestion() {
    const G = this.G, turn = this.cur(); if (!turn || turn.result || G.roulette) return;
    const old = turn.q; bank.unuse(old); turn.q = bank.draw('n', this.s, [old && old.id]);
    G.timer = this.mkTimer(this.s.answerTime); this.commit({ type: 'swap' });
  }
  customQuestion(q, a) {
    const G = this.G, turn = this.cur(); if (!turn || turn.result || G.roulette || !String(q).trim()) return;
    if (turn.q && !turn.q.custom) bank.unuse(turn.q);
    turn.q = { id: 'adhoc' + uid(5), q: String(q).trim().slice(0, 220), a: String(a || '').trim().slice(0, 120) || '–', custom: true, kind: 'n' };
    G.timer = this.mkTimer(this.s.answerTime); this.commit({ type: 'swap' });
  }

  // ----- Joker -----
  canJoker(pid) {
    const G = this.G, turn = this.cur(), p = this.player(pid);
    return !!(this.s.joker && turn && !turn.result && !turn.jokerFrom && !G.roulette && turn.pid === pid && p && p.joker && !p.out && !G.jokerUsed && this.active().length > 1);
  }
  jokerTargets(pid) { return this.active().filter(p => p.id !== pid).map(p => p.id); }
  useJoker(pid, target) {
    if (!this.canJoker(pid)) return false;
    const G = this.G, p = this.player(pid), cands = this.jokerTargets(pid);
    const choose = this.s.jokerMode === 'choose';
    if (choose && !cands.includes(target)) return false;
    p.joker = false; G.jokerUsed = pid;
    if (choose) { this.applyJoker(pid, target); return true; }
    const to = pick(cands);
    G.roulette = { kind: 'joker', from: pid, to, cands: shuffle(cands), t0: Date.now() + 300, dur: 4300 };
    G.timer = null;
    this.commit({ type: 'roulette', from: pid, to });
    return true;
  }
  applyJoker(from, to) {
    const G = this.G, turn = this.cur(); G.roulette = null;
    if (turn) {
      turn.jokerFrom = from; turn.pid = to;
      // Nach der Joker-Frage bekommt der Aktivator eine neue reguläre Frage, danach geht die Runde normal weiter.
      G.turns.splice(G.t + 1, 0, { pid: from, q: null, result: null, given: '', jokerFrom: null });
    }
    G.timer = this.mkTimer(this.s.answerTime);
    this.commit({ type: 'jokerTo', from, to });
  }

  // ----- Auswertung & Voting -----
  endRound() {
    const G = this.G; G.phase = 'review'; G.timer = null; G.autoNextAt = null; G.roulette = null;
    G.review = { wrongs: G.turns.filter(t => t.result === 'wrong').map(t => ({ pid: t.pid, q: t.q.q, a: t.q.a, given: t.given, flag: t.q.flag || null })) };
    this.commit({ type: 'roundEnd' });
  }
  candidates() {
    const act = this.active().map(p => p.id);
    if (!this.s.onlyWrong) return act;
    const wrong = new Set(((this.G.review || {}).wrongs || []).map(w => w.pid));
    return act.filter(id => wrong.has(id));
  }
  voters() { return (this.s.outVote ? this.G.players : this.active()).map(p => p.id); }
  startVote() {
    const G = this.G; if (G.phase !== 'review') return;
    const cands = this.candidates(), voters = this.voters(), now = Date.now();
    if (!cands.length) {
      G.reveal = { none: true, counts: {}, tied: [], loser: null, at: now, applied: true, cands: [] };
      G.phase = 'reveal'; this.commit({ type: 'nobody' }); return;
    }
    if (cands.length === 1) {
      const c = cands[0];
      G.reveal = { counts: { [c]: voters.filter(v => v !== c).length }, tied: [], loser: c, auto: true, at: now, lossAt: now + 1900, applied: false, cands: [c] };
      G.phase = 'reveal'; this.commit({ type: 'reveal', auto: true }); return;
    }
    G.vote = { cands, base: cands.slice(), voters, open: true, revote: false }; G.votes = {};
    G.timer = this.mkTimer(this.s.voteTime); G.phase = 'vote';
    this.commit({ type: 'vote' });
  }
  eligible() { const v = this.G.vote; return v ? v.voters.filter(x => v.cands.some(c => c !== x)) : []; }
  allVoted() { const el = this.eligible(); return el.length > 0 && el.every(x => x in this.G.votes); }
  castVote(voter, target) {
    const G = this.G, v = G.vote;
    if (!v || !v.open || (G.phase !== 'vote' && G.phase !== 'tb')) return false;
    if (!v.voters.includes(voter) || !v.cands.includes(target) || voter === target) return false;
    const first = !(voter in G.votes); G.votes[voter] = target;
    if (this.allVoted()) G.timer = null;
    this.commit(first ? { type: 'voted', pid: voter } : null);
    return true;
  }
  reveal() {
    const G = this.G, v = G.vote; if (!v || (G.phase !== 'vote' && G.phase !== 'tb')) return;
    v.open = false; G.timer = null;
    const counts = {}; v.cands.forEach(c => { counts[c] = 0; });
    Object.keys(G.votes).forEach(voter => { const t = G.votes[voter]; if (t in counts) counts[t]++; });
    const max = Math.max(...Object.values(counts)), top = v.cands.filter(c => counts[c] === max), now = Date.now();
    const loser = max > 0 && top.length === 1 ? top[0] : null;
    G.reveal = { counts, tied: loser ? [] : top, loser, at: now, lossAt: loser ? now + 1000 + v.cands.length * 330 : null, applied: false, revote: !!v.revote, method: null, cands: (v.base || v.cands).slice() };
    G.phase = 'reveal';
    this.commit({ type: 'reveal' });
  }
  tieOptions() {
    const r = this.G.reveal; if (!r || r.loser || !r.tied || r.tied.length < 2) return null;
    const voters = this.voters().filter(id => !r.tied.includes(id));
    return { revote: voters.length > 0 && !r.revote, voters };
  }
  tieBreak(method, pid) {
    const G = this.G, r = G.reveal; if (G.phase !== 'reveal' || !r || r.loser || !r.tied || r.tied.length < 2 || G.roulette) return;
    if (method === 'revote') {
      const voters = this.voters().filter(id => !r.tied.includes(id)); if (!voters.length || r.revote) return;
      G.vote = { cands: r.tied.slice(), base: (r.cands || r.tied).slice(), voters, open: true, revote: true }; G.votes = {};
      G.timer = this.mkTimer(this.s.voteTime); G.phase = 'tb';
      this.commit({ type: 'revote' });
    } else if (method === 'random') {
      r.method = 'random';
      G.roulette = { kind: 'tie', from: null, to: pick(r.tied), cands: shuffle(r.tied), t0: Date.now() + 300, dur: 3800 };
      this.commit({ type: 'roulette', tie: true });
    } else if (method === 'host' && r.tied.includes(pid)) {
      r.method = 'host'; this.setLoser(pid);
    }
  }
  setLoser(pid) {
    const r = this.G.reveal; if (!r) return;
    r.tiedWas = r.tied; r.tied = []; r.loser = pid; r.lossAt = Date.now() + 600; r.applied = false;
    this.commit({ type: 'loserSet', pid });
  }
  applyLoss() {
    const G = this.G, r = G.reveal, p = r && this.player(r.loser); if (!p || r.applied) return;
    r.applied = true; p.hearts = Math.max(0, p.hearts - 1); r.heartsLeft = p.hearts;
    let type = 'heart';
    if (p.hearts === 0) { p.out = true; p.outOrder = ++G.outCount; p.outRound = G.round; type = 'out'; }
    G.history.push({ round: G.round, loser: p.id, counts: r.counts, out: p.out });
    this.commit({ type, pid: p.id, hearts: p.hearts });
  }
  canProceed() {
    const G = this.G; if (G.phase !== 'reveal') return false;
    const r = G.reveal; if (!r) return false;
    if (r.none) return true;
    return !!(r.loser && r.applied);
  }
  proceed() {
    if (!this.canProceed()) return;
    const act = this.active();
    if (act.length <= 1) return this.finish(act[0] ? act[0].id : null);
    if (act.length <= this.s.finalAt) return this.finalIntro();
    this.startRound();
  }

  // ----- Finale -----
  finalIntro() {
    const G = this.G, act = this.active(); G.phase = 'finalIntro'; G.timer = null; G.roulette = null;
    const start = {}; act.forEach(p => { start[p.id] = this.s.heartBonus ? p.hearts : 0; });
    G.final = { pids: act.map(p => p.id), start, score: Object.assign({}, start), i: 0, n: this.s.finalQuestions, sd: false, sdPids: null, q: null, ans: {}, revealed: false, marks: {}, sugg: {}, hist: [] };
    this.commit({ type: 'finalIntro' });
  }
  finalPids() { const f = this.G.final; return f ? (f.sd ? f.sdPids : f.pids) : []; }
  finalQuestion() {
    const G = this.G, f = G.final; if (!f) return;
    if (f.q && !f.revealed && G.phase === 'final') bank.unuse(f.q);
    f.q = bank.draw('f', this.s); f.ans = {}; f.revealed = false; f.marks = {}; f.sugg = {};
    G.timer = this.mkTimer(this.s.finalTime); G.phase = 'final';
    this.commit({ type: 'finalQ', i: f.i, sd: f.sd });
  }
  finalSwap() { const G = this.G, f = G.final; if (G.phase !== 'final' || !f || f.revealed) return; const old = f.q; bank.unuse(old); f.q = bank.draw('f', this.s, [old && old.id]); f.ans = {}; G.timer = this.mkTimer(this.s.finalTime); this.commit({ type: 'swap' }); }
  finalInput(pid, text, lock) {
    const G = this.G, f = G.final;
    if (G.phase !== 'final' || !f || f.revealed || !this.finalPids().includes(pid)) return false;
    const cur = f.ans[pid]; if (cur && cur.locked) return false;
    if (G.timer && G.timer.expired) return false;
    f.ans[pid] = { text: String(text || '').slice(0, 80), locked: !!lock };
    if (lock && this.finalPids().every(id => f.ans[id] && f.ans[id].locked)) G.timer = null;
    this.commit(lock ? { type: 'locked', pid } : null);
    return true;
  }
  finalHostInput(pid, text) { const f = this.G.final; if (!f || f.revealed) return; f.ans[pid] = { text: String(text || '').slice(0, 80), locked: false, byHost: true }; this.commit(); }
  finalReveal() {
    const G = this.G, f = G.final; if (G.phase !== 'final' || !f || f.revealed) return;
    f.revealed = true; G.timer = null;
    this.finalPids().forEach(id => {
      const a = f.ans[id] || { text: '' }; a.locked = true; f.ans[id] = a;
      if (!f.q.est && a.text) { const ok = checkAnswer(a.text, f.q.a); f.sugg[id] = ok; f.marks[id] = ok; }
    });
    this.commit({ type: 'finalReveal' });
  }
  finalMark(pid, ok) { const f = this.G.final; if (!f || !f.revealed || !this.finalPids().includes(pid)) return; f.marks[pid] = !!ok; this.commit({ type: ok ? 'fright' : 'fwrong', pid }); }
  finalReady() { const f = this.G.final; return !!(f && f.revealed && this.finalPids().every(id => typeof f.marks[id] === 'boolean')); }
  finalNext() {
    const G = this.G, f = G.final; if (G.phase !== 'final' || !this.finalReady()) return;
    const pids = this.finalPids();
    pids.forEach(id => { if (f.marks[id]) f.score[id] += 1; });
    f.hist.push({ q: f.q.q, a: f.q.a, sd: f.sd, ans: Object.fromEntries(pids.map(id => [id, (f.ans[id] || {}).text || ''])), marks: Object.assign({}, f.marks) });
    f.i += 1;
    if (!f.sd && f.i < f.n) return this.finalQuestion();
    const cand = f.sd ? f.sdPids : f.pids;
    const max = Math.max(...cand.map(id => f.score[id])), leaders = cand.filter(id => f.score[id] === max);
    if (leaders.length === 1) return this.finish(leaders[0]);
    f.sd = true; f.sdPids = leaders; this.finalQuestion();
  }
  finish(winner) {
    const G = this.G; G.phase = 'end'; G.timer = null; G.roulette = null; G.winner = winner;
    const f = G.final;
    const fins = f ? f.pids.filter(id => id !== winner).sort((a, b) => f.score[b] - f.score[a]) : this.active().map(p => p.id).filter(id => id !== winner);
    const outs = G.players.filter(p => p.out).sort((a, b) => b.outOrder - a.outOrder).map(p => p.id);
    G.ranking = [winner].concat(fins, outs).filter(Boolean);
    this.commit({ type: 'winner', pid: winner });
  }
  backToLobby() {
    const G = this.G;
    Object.assign(G, { phase: 'lobby', round: 0, starter: null, turns: [], t: -1, jokerUsed: null, roulette: null, timer: null, votes: {}, vote: null, review: null, reveal: null, final: null, winner: null, ranking: null, outCount: 0, history: [], autoNextAt: null });
    G.players.forEach(p => Object.assign(p, { hearts: this.s.lives, joker: true, out: false, outOrder: 0, outRound: 0 }));
    this.commit({ type: 'lobby' });
  }

  // ----- Moderator-Eingriffe -----
  setHearts(pid, delta) {
    const G = this.G, p = this.player(pid); if (!p) return;
    p.hearts = clamp(p.hearts + delta, 0, 9);
    if (G.phase !== 'lobby') {
      if (p.hearts === 0 && !p.out) { p.out = true; p.outOrder = ++G.outCount; p.outRound = G.round; }
      else if (p.hearts > 0 && p.out) { p.out = false; p.outOrder = 0; }
    }
    this.commit();
  }
  toggleJoker(pid) { const p = this.player(pid); if (p) { p.joker = !p.joker; this.commit(); } }
  // Bewertung einer Frage der laufenden Runde nachträglich ändern (auch noch in Auswertung, Voting, Ergebnis).
  canFix() { const G = this.G; return ['turn', 'review', 'vote', 'tb', 'reveal'].includes(G.phase) && !G.roulette; }
  fixTurn(i, result) {
    const G = this.G, t = G.turns[i];
    if (!this.canFix() || !t || !t.result) return false;
    result = result === 'right' ? 'right' : 'wrong';
    if (t.result === result) return false;
    t.result = result;
    const reset = G.phase === 'turn' ? false : this.refreshReview();
    this.commit({ type: 'fix', pid: t.pid, result, reset });
    return true;
  }
  // Fehlerliste neu aufbauen; ändert sich, wer wählbar ist, wird Voting/Ergebnis zurückgesetzt. Gibt true zurück, wenn neu abgestimmt werden muss.
  refreshReview() {
    const G = this.G;
    G.review = { wrongs: G.turns.filter(t => t.result === 'wrong').map(t => ({ pid: t.pid, q: t.q.q, a: t.q.a, given: t.given, flag: t.q.flag || null })) };
    if (G.phase === 'review') return false;
    const now = this.candidates(), same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
    if (G.phase === 'vote' && G.vote) {
      const v = G.vote, base = v.base || v.cands;
      if (same(base, now)) return false;
      if (now.length >= 2) {
        v.cands = now.slice(); v.base = now.slice();
        Object.keys(G.votes).forEach(k => { if (!now.includes(G.votes[k])) delete G.votes[k]; });
        return false;
      }
    } else if (G.phase === 'tb' && G.vote) {
      if (same(G.vote.base || G.vote.cands, now)) return false;
    } else if (G.phase === 'reveal' && G.reveal) {
      if (same(G.reveal.cands || [], now)) return false;
      this.undoLoss();
    }
    Object.assign(G, { phase: 'review', vote: null, votes: {}, reveal: null, timer: null, roulette: null });
    return true;
  }
  undoLoss() {
    const G = this.G, r = G.reveal, p = r && r.applied && this.player(r.loser); if (!p) return;
    p.hearts += 1;
    if (p.out) { if (p.outOrder === G.outCount) G.outCount -= 1; p.out = false; p.outOrder = 0; p.outRound = 0; }
    const last = G.history[G.history.length - 1];
    if (last && last.round === G.round && last.loser === p.id) G.history.pop();
    r.applied = false;
  }
  // Finale: Bewertung einer schon gespielten Finalfrage ändern (Punkte werden angepasst).
  fixFinal(k, pid, ok) {
    const G = this.G, f = G.final; if (G.phase !== 'final' || !f || f.sd) return false;
    const hq = f.hist[k]; if (!hq || !(pid in hq.marks)) return false;
    ok = !!ok; if (!!hq.marks[pid] === ok) return false;
    hq.marks[pid] = ok; f.score[pid] += ok ? 1 : -1;
    this.commit({ type: ok ? 'fright' : 'fwrong', pid });
    return true;
  }
  pauseTimer() {
    const t = this.G.timer; if (!t || t.expired) return;
    if (t.paused) { t.end = Date.now() + t.left; t.paused = false; } else { t.left = Math.max(0, t.end - Date.now()); t.paused = true; }
    this.commit();
  }
  addTime(sec) {
    const G = this.G, t = G.timer;
    if (!t) { if (['turn', 'vote', 'tb', 'final'].includes(G.phase)) { const cur = this.cur(); if (G.phase === 'turn' && (!cur || cur.result)) return; G.timer = this.mkTimer(sec); if (G.vote && (G.phase === 'vote' || G.phase === 'tb')) G.vote.open = true; this.commit(); } return; }
    if (t.paused) t.left += sec * 1000; else t.end = Math.max(t.end, Date.now()) + sec * 1000;
    t.dur += sec * 1000;
    if (t.expired) { t.expired = false; if (G.vote && (G.phase === 'vote' || G.phase === 'tb')) G.vote.open = true; if (G.phase === 'final' && G.final) Object.values(G.final.ans).forEach(a => { if (a.autoLocked) { a.locked = false; a.autoLocked = false; } }); }
    this.commit();
  }

  // ----- Zeitsteuerung (alle 200 ms) -----
  tick() {
    const G = this.G, now = Date.now(), t = G.timer;
    if (G.roulette && now >= G.roulette.t0 + G.roulette.dur + 1400) {
      const r = G.roulette;
      if (r.kind === 'joker') return this.applyJoker(r.from, r.to);
      G.roulette = null; return this.setLoser(r.to);
    }
    if (G.phase === 'reveal' && G.reveal && G.reveal.loser && !G.reveal.applied && G.reveal.lossAt && now >= G.reveal.lossAt) return this.applyLoss();
    if (G.autoNextAt && now >= G.autoNextAt) { G.autoNextAt = null; return this.next(); }
    if (t && !t.paused && !t.expired && now >= t.end) {
      t.expired = true;
      if ((G.phase === 'vote' || G.phase === 'tb') && G.vote) G.vote.open = false;
      if (G.phase === 'final' && G.final) this.finalPids().forEach(id => { const a = G.final.ans[id]; if (a && !a.locked) { a.locked = true; a.autoLocked = true; } });
      this.commit({ type: 'timeup' });
    }
  }

  // ----- Öffentlicher Zustand (geht an Bühne & Mitspieler) -----
  dotMap() {
    const G = this.G, map = {};
    if (!['turn', 'review', 'vote', 'tb', 'reveal'].includes(G.phase)) return map;
    G.turns.forEach((t, i) => {
      if (t.jokerFrom) (map[t.jokerFrom] = map[t.jokerFrom] || []).push({ r: 'joker' });
      const d = { r: t.result || (G.phase === 'turn' && i === G.t ? 'now' : null) };
      if (t.result === 'wrong' && t.q) { d.q = t.q.q; d.a = t.q.a; d.g = t.given; }
      (map[t.pid] = map[t.pid] || []).push(d);
    });
    return map;
  }
  nextPid() { const G = this.G; for (let i = G.t + 1; i < G.turns.length; i++) { const p = this.player(G.turns[i].pid); if (p && !p.out) return p.id; } return null; }
  pubFinal() {
    const f = this.G.final, pids = this.finalPids();
    return {
      pids: f.pids, active: pids, start: f.start, score: f.score, i: f.i, n: f.n, sd: f.sd,
      q: f.q ? { q: f.q.q, est: !!f.q.est, flag: f.q.flag || null, a: f.revealed ? f.q.a : null } : null,
      locked: Object.fromEntries(pids.map(id => [id, !!(f.ans[id] && f.ans[id].locked)])),
      typing: Object.fromEntries(pids.map(id => [id, !!(f.ans[id] && f.ans[id].text)])),
      revealed: f.revealed, ans: f.revealed ? Object.fromEntries(pids.map(id => [id, (f.ans[id] || {}).text || ''])) : null,
      marks: f.revealed ? f.marks : {}, histLen: f.hist.length
    };
  }
  pub() {
    const G = this.G, s = this.s, turn = this.cur(), dots = this.dotMap();
    return {
      v: 1, gid: G.gid, code: G.code, mode: G.mode, phase: G.phase, round: G.round, host: G.hostName,
      s: { lives: s.lives, qpp: s.qpp, joker: s.joker, jokerMode: s.jokerMode, onlyWrong: s.onlyWrong, finalQuestions: s.finalQuestions, heartBonus: s.heartBonus },
      players: G.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, hearts: p.hearts, joker: p.joker, out: p.out, outOrder: p.outOrder, conn: !!p.conn, device: !!p.device, cam: p.cam || null, dots: dots[p.id] || [] })),
      turn: turn ? { i: G.t, n: G.turns.length, pid: turn.pid, q: turn.q.q, flag: turn.q.flag || null, result: turn.result, given: turn.result === 'wrong' ? turn.given : '', a: turn.result ? turn.q.a : null, jokerFrom: turn.jokerFrom, next: this.nextPid() } : null,
      roulette: G.roulette, jokerUsed: G.jokerUsed, timer: G.timer,
      review: (G.review && ['review', 'vote', 'tb', 'reveal'].includes(G.phase)) ? G.review : null,
      vote: (G.vote && (G.phase === 'vote' || G.phase === 'tb')) ? { cands: G.vote.cands, voters: G.vote.voters, open: G.vote.open, revote: G.vote.revote, voted: Object.keys(G.votes) } : null,
      reveal: G.phase === 'reveal' ? G.reveal : null,
      final: G.final ? this.pubFinal() : null,
      winner: G.winner, ranking: G.ranking, fx: G.fx, now: Date.now()
    };
  }
  me(pid) {
    const G = this.G, f = G.final, can = this.canJoker(pid);
    return {
      id: pid, vote: (G.votes && G.votes[pid]) || null, canJoker: can,
      jokerTargets: can && this.s.jokerMode === 'choose' ? this.jokerTargets(pid) : null,
      canVote: !!(G.vote && G.vote.open && (G.phase === 'vote' || G.phase === 'tb') && G.vote.voters.includes(pid) && G.vote.cands.some(c => c !== pid)),
      final: f && f.ans[pid] ? { text: f.ans[pid].text, locked: f.ans[pid].locked } : null,
      isFinalist: !!(f && this.finalPids().includes(pid))
    };
  }
}

// =========================================================================
//  Netzwerk
// =========================================================================
// Bühnen-Tab im selben Browser (BroadcastChannel, sonst localStorage-Events)
class Mirror {
  constructor(role) {
    this.role = role; this.onState = null; this.onHello = null;
    try { this.bc = new BroadcastChannel('ddf-stage-v1'); this.bc.onmessage = e => this.recv(e.data); }
    catch (e) {
      this.bc = null;
      window.addEventListener('storage', ev => { if (ev.key === 'ddf-mirror' && ev.newValue) { try { this.recv(JSON.parse(ev.newValue)); } catch (x) { /* egal */ } } });
    }
  }
  send(m) { if (this.bc) { try { this.bc.postMessage(m); } catch (e) { /* egal */ } } else store.set('ddf-mirror', Object.assign({ _: Math.random() }, m)); }
  recv(m) {
    if (!m) return;
    if (m.t === 'state' && this.role === 'stage' && this.onState) this.onState(m.s);
    if (m.t === 'hello' && this.role === 'host' && this.onHello) this.onHello();
  }
}

// --- PeerJS (WebRTC, öffentlicher Vermittlungsserver von peerjs.com) ---
const PEER_PREFIX = 'ddf-dfr-';
let peerLoad = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (window.peerjs && window.peerjs.Peer) return Promise.resolve(window.peerjs.Peer);
  if (peerLoad) return peerLoad;
  peerLoad = new Promise((resolve, reject) => {
    const urls = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
    let i = 0;
    const next = () => {
      if (i >= urls.length) { peerLoad = null; return reject(new Error('Die Online-Bibliothek (PeerJS) konnte nicht geladen werden. Bist du online?')); }
      const s = document.createElement('script'); s.src = urls[i++]; s.async = true;
      const t = setTimeout(() => { s.onload = s.onerror = null; s.remove(); next(); }, 8000);
      s.onload = () => { clearTimeout(t); const P = window.Peer || (window.peerjs && window.peerjs.Peer); if (P) resolve(P); else next(); };
      s.onerror = () => { clearTimeout(t); s.remove(); next(); };
      document.head.appendChild(s);
    };
    next();
  });
  return peerLoad;
}
class PeerHostNet {
  constructor(hd) { this.h = hd; this.conns = new Map(); }
  async start(code) {
    const Peer = await loadPeer();
    return new Promise((resolve, reject) => {
      let opened = false;
      const peer = new Peer(PEER_PREFIX + code.toLowerCase(), { debug: 0 });
      this.peer = peer;
      const timer = setTimeout(() => { if (!opened) { try { peer.destroy(); } catch (e) { /* egal */ } reject({ type: 'network', message: 'Keine Verbindung zum Vermittlungsserver.' }); } }, 15000);
      peer.on('open', () => { opened = true; clearTimeout(timer); this.h.status('online'); resolve(code); });
      peer.on('connection', conn => this.wire(conn));
      peer.on('disconnected', () => {
        if (!opened || this.closed) return;
        this.h.status('reconnecting');
        setTimeout(() => { try { if (!peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { /* egal */ } }, 1500);
      });
      peer.on('error', err => {
        if (!opened) { clearTimeout(timer); try { peer.destroy(); } catch (e) { /* egal */ } reject(err); return; }
        if (err && err.type === 'peer-unavailable') return;
        this.h.status('error', err);
      });
    });
  }
  wire(conn) {
    const id = 'p:' + conn.peer + ':' + (conn.connectionId || uid(4));
    conn.on('open', () => { this.conns.set(id, conn); });
    conn.on('data', d => { if (!this.conns.has(id)) this.conns.set(id, conn); this.h.message(id, d); });
    conn.on('close', () => { this.conns.delete(id); this.h.disconnect(id); });
    conn.on('error', () => { /* close folgt */ });
  }
  send(id, msg) { const c = this.conns.get(id); if (c && c.open) { try { c.send(msg); } catch (e) { /* egal */ } } }
  close() { this.closed = true; try { this.peer && this.peer.destroy(); } catch (e) { /* egal */ } }
}
class PeerClientNet {
  constructor(hd) { this.h = hd; this.closed = false; }
  async connect(code) {
    this.code = code;
    const Peer = await loadPeer();
    if (this.closed) return;
    await new Promise((resolve, reject) => {
      const peer = new Peer({ debug: 0 }); this.peer = peer; let opened = false;
      const timer = setTimeout(() => { if (!opened) reject({ type: 'network', message: 'Keine Verbindung zum Vermittlungsserver.' }); }, 15000);
      peer.on('open', () => { opened = true; clearTimeout(timer); resolve(); });
      peer.on('error', err => { if (!opened) { clearTimeout(timer); reject(err); } else this.peerError(err); });
      peer.on('disconnected', () => { if (!this.closed) setTimeout(() => { try { if (!peer.destroyed && peer.disconnected) peer.reconnect(); } catch (e) { /* egal */ } }, 1500); });
    });
    this.dial();
  }
  dial() {
    if (this.closed) return;
    const old = this.conn; this.conn = null;
    try { if (old) old.close(); } catch (e) { /* egal */ }
    const conn = this.peer.connect(PEER_PREFIX + this.code.toLowerCase(), { reliable: true, serialization: 'json' });
    this.conn = conn;
    const openT = setTimeout(() => { if (!conn.open) this.retry(); }, 14000);
    conn.on('open', () => { clearTimeout(openT); this.h.status('open'); this.h.open(); });
    conn.on('data', d => this.h.message(d));
    conn.on('close', () => { if (this.conn === conn) { this.h.status('reconnecting'); this.retry(); } });
    conn.on('error', () => { /* close folgt */ });
  }
  peerError(err) {
    if (err && err.type === 'peer-unavailable') { this.h.status('nohost'); this.retry(3000); return; }
    this.h.status('reconnecting'); this.retry();
  }
  retry(ms = 2500) {
    if (this.closed) return; clearTimeout(this.rt);
    this.rt = setTimeout(() => {
      if (this.closed || (this.conn && this.conn.open)) return;
      try { if (this.peer.disconnected && !this.peer.destroyed) this.peer.reconnect(); } catch (e) { /* egal */ }
      this.dial();
    }, ms);
  }
  send(msg) { if (this.conn && this.conn.open) { try { this.conn.send(msg); return true; } catch (e) { /* egal */ } } return false; }
  close() { this.closed = true; clearTimeout(this.rt); try { this.peer && this.peer.destroy(); } catch (e) { /* egal */ } }
}

// --- Ausweichroute (MQTT über WebSocket, öffentliche Dienste), wenn keine Direktverbindung zustande kommt ---
const RELAY_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker-cn.emqx.io:8084/mqtt'];
const NET_FORCE = new URLSearchParams(location.search).get('net'); // ?net=relay zum Testen
const relayBytes = s => new TextEncoder().encode(s);
async function relayKeys(code) {
  if (!window.crypto || !crypto.subtle) throw { type: 'network', message: 'Dieser Browser kann die Ausweichroute nicht verschlüsseln.' };
  const c = code.toUpperCase();
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', relayBytes('ddf-dfr:' + c)));
  const hex = Array.from(hash.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
  const base = await crypto.subtle.importKey('raw', relayBytes(c), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: relayBytes('ddf-dfr-relay'), iterations: 50000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return { topic: 'ddf-dfr/' + hex, key };
}
async function relaySeal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, relayBytes(JSON.stringify(obj))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return out;
}
async function relayOpen(key, b) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}
function mqttStr(s) { const b = relayBytes(s), o = new Uint8Array(b.length + 2); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
function mqttPacket(head, ...parts) {
  let n = parts.reduce((a, p) => a + p.length, 0); const len = [];
  do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
  const total = parts.reduce((a, p) => a + p.length, 1 + len.length), o = new Uint8Array(total);
  o[0] = head; o.set(len, 1); let at = 1 + len.length;
  parts.forEach(p => { o.set(p, at); at += p.length; });
  return o;
}
// Kleiner MQTT-3.1.1-Client: QoS 0, ein Abo, verbindet sich bei Abbruch neu
class MqttLink {
  constructor(url, topic, on) { this.url = url; this.topic = topic; this.on = on; this.up = false; this.closed = false; this.buf = new Uint8Array(0); }
  open() {
    if (this.closed) return;
    this.buf = new Uint8Array(0);
    let ws; try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { return this.lost(); }
    ws.binaryType = 'arraybuffer'; this.ws = ws;
    this.openT = setTimeout(() => { try { ws.close(); } catch (e) { /* egal */ } }, 8000);
    ws.onopen = () => ws.send(mqttPacket(0x10, mqttStr('MQTT'), [4, 2, 0, 60], mqttStr('ddf-' + uid(14))));
    ws.onmessage = e => { if (this.ws === ws) this.feed(new Uint8Array(e.data)); };
    ws.onclose = () => { if (this.ws === ws) this.lost(); };
    ws.onerror = () => { /* close folgt */ };
  }
  lost() {
    clearTimeout(this.openT); clearInterval(this.pingI); this.ws = null;
    const was = this.up; this.up = false;
    if (this.closed) return;
    if (was) { if (this.on.down) this.on.down(); } else if (this.on.fail) this.on.fail();
    if (!this.closed) this.retryT = setTimeout(() => this.open(), 2500);
  }
  feed(chunk) {
    const b = new Uint8Array(this.buf.length + chunk.length); b.set(this.buf); b.set(chunk, this.buf.length);
    let at = 0;
    for (;;) {
      let mul = 1, n = 0, i = at + 1, more = true;
      while (more && i < b.length) { n += (b[i] & 127) * mul; mul *= 128; more = !!(b[i] & 128); i++; }
      if (more || i + n > b.length) break;
      this.packet(b[at], b.subarray(i, i + n)); at = i + n;
    }
    this.buf = b.slice(at);
  }
  packet(head, body) {
    const type = head >> 4;
    if (type === 2) {
      if (body[1] !== 0) { try { this.ws.close(); } catch (e) { /* egal */ } return; }
      this.ws.send(mqttPacket(0x82, [0, 1], mqttStr(this.topic), [0]));
    } else if (type === 9) {
      clearTimeout(this.openT); this.up = true;
      this.pingI = setInterval(() => { try { this.ws && this.ws.send(new Uint8Array([0xC0, 0])); } catch (e) { /* egal */ } }, 25000);
      if (this.on.up) this.on.up();
    } else if (type === 3) {
      const tl = (body[0] << 8) | body[1];
      if (this.on.msg) this.on.msg(body.slice(2 + tl));
    }
  }
  pub(topic, bytes) { if (!this.up || !this.ws) return false; try { this.ws.send(mqttPacket(0x30, mqttStr(topic), bytes)); return true; } catch (e) { return false; } }
  close() { this.closed = true; this.up = false; clearTimeout(this.openT); clearTimeout(this.retryT); clearInterval(this.pingI); const ws = this.ws; this.ws = null; try { ws && ws.close(); } catch (e) { /* egal */ } }
}
class RelayHostNet {
  constructor(hd) { this.h = hd; this.links = []; this.route = new Map(); this.pending = new Map(); this.q = Promise.resolve(); }
  async start(code) {
    this.keys = await relayKeys(code);
    return new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; reject({ type: 'network', message: 'Keine Verbindung zum Ausweich-Dienst.' }); } }, 10000);
      RELAY_BROKERS.forEach(url => {
        const link = new MqttLink(url, this.keys.topic + '/h', {
          msg: b => this.recv(link, b),
          up: () => { this.h.status('online'); if (!done) { done = true; clearTimeout(timer); resolve(code); } },
          down: () => { if (!this.links.some(l => l.up)) this.h.status('reconnecting'); }
        });
        this.links.push(link); link.open();
      });
    });
  }
  recv(link, b) {
    relayOpen(this.keys.key, b).then(d => {
      if (!d || !d.c) return;
      const id = 'r:' + d.c; this.route.set(id, link); this.h.message(id, d.m);
    }).catch(() => { /* fremde Nachricht */ });
  }
  send(id, msg) {
    if (msg.t !== 'state') return this.out(id, msg);
    // Zustände zusammenfassen, nur der neueste zählt
    this.pending.set(id, msg);
    if (!this.ft) this.ft = setTimeout(() => { this.ft = null; const items = Array.from(this.pending); this.pending.clear(); items.forEach(([i, m]) => this.out(i, m)); }, 120);
  }
  out(id, msg) {
    const link = this.route.get(id); if (!link) return;
    const topic = this.keys.topic + '/c/' + id.slice(2);
    this.q = this.q.then(() => relaySeal(this.keys.key, msg)).then(b => { link.pub(topic, b); }).catch(() => { /* egal */ });
  }
  close() { clearTimeout(this.ft); this.links.forEach(l => l.close()); this.links = []; }
}
class RelayClientNet {
  constructor(hd) { this.h = hd; this.cid = uid(12); this.closed = false; this.i = -1; this.tried = 0; this.ups = 0; this.heard = false; this.q = Promise.resolve(); }
  async connect(code) { this.keys = await relayKeys(code); this.next(); }
  next() {
    if (this.closed) return;
    this.clearT();
    if (this.link) this.link.close();
    if (this.tried >= RELAY_BROKERS.length) {
      if (!this.ups) { this.close(); this.h.status('error', { type: 'network', message: 'Keine Verbindung zum Online-Dienst. Bist du online?' }); return; }
      this.h.status('nohost'); this.tried = 0; this.ups = 0;
    }
    this.tried++; this.i = (this.i + 1) % RELAY_BROKERS.length; this.heard = false;
    const link = new MqttLink(RELAY_BROKERS[this.i], this.keys.topic + '/c/' + this.cid, {
      msg: b => this.recv(b),
      up: () => this.linkUp(),
      down: () => { if (this.heard) this.h.status('reconnecting'); },
      fail: () => { if (!this.heard && this.link === link) this.next(); }
    });
    this.link = link; link.open();
  }
  linkUp() {
    this.ups++; this.h.open();
    if (this.heard) return;
    this.helloI = setInterval(() => { if (!this.heard) this.h.open(); }, 2500);
    this.switchT = setTimeout(() => { if (!this.heard) this.next(); }, 9000);
  }
  recv(b) {
    relayOpen(this.keys.key, b).then(m => { this.heard = true; this.clearT(); this.h.message(m); }).catch(() => { /* fremde Nachricht */ });
  }
  clearT() { clearInterval(this.helloI); clearTimeout(this.switchT); }
  send(msg) {
    const link = this.link; if (!link || !link.up) return false;
    this.q = this.q.then(() => relaySeal(this.keys.key, { c: this.cid, m: msg })).then(b => { link.pub(this.keys.topic + '/h', b); }).catch(() => { /* egal */ });
    return true;
  }
  close() { this.closed = true; this.clearT(); if (this.link) this.link.close(); }
}
// Erst direkt per WebRTC, sonst automatisch über die Ausweichroute
class HybridHostNet {
  constructor(hd) {
    this.h = hd; this.up = {};
    const wrap = kind => ({ message: (id, m) => hd.message(id, m), disconnect: id => hd.disconnect(id), status: (s, err) => this.st(kind, s, err) });
    this.peer = new PeerHostNet(wrap('peer')); this.relay = new RelayHostNet(wrap('relay'));
  }
  st(kind, s, err) { this.up[kind] = s === 'online'; if (!this.ready) return; if (this.up.peer || this.up.relay) this.h.status('online'); else this.h.status(s, err); }
  async start(code) {
    const direct = NET_FORCE === 'relay' ? Promise.reject({ type: 'network' }) : this.peer.start(code);
    const [p, r] = await Promise.allSettled([direct, this.relay.start(code)]);
    const taken = p.status === 'rejected' && p.reason && p.reason.type === 'unavailable-id';
    if (taken || (p.status === 'rejected' && r.status === 'rejected')) { this.close(); throw p.reason; }
    this.ready = true;
    return code;
  }
  send(id, msg) { if (id.startsWith('r:')) this.relay.send(id, msg); else this.peer.send(id, msg); }
  close() { this.peer.close(); this.relay.close(); }
}
class HybridClientNet {
  constructor(hd) { this.h = hd; this.active = null; this.closed = false; }
  connect(code) {
    this.code = code;
    if (NET_FORCE === 'relay') return this.toRelay();
    this.active = 'peer';
    this.peer = new PeerClientNet({
      open: () => { if (this.active === 'peer') this.h.open(); },
      message: m => this.h.message(m),
      status: (s, err) => {
        if (this.active !== 'peer') return;
        if (s === 'nohost') return this.toRelay();
        if (s === 'open') { clearTimeout(this.fallT); this.fallT = null; } else this.arm();
        this.h.status(s, err);
      }
    });
    this.arm();
    this.peer.connect(code).catch(() => this.toRelay());
    return Promise.resolve();
  }
  arm() { if (!this.fallT) this.fallT = setTimeout(() => this.toRelay(), 10000); }
  async toRelay() {
    if (this.closed || this.active === 'relay') return;
    this.active = 'relay'; clearTimeout(this.fallT);
    if (this.peer) this.peer.close();
    this.relay = new RelayClientNet(this.h);
    try { await this.relay.connect(this.code); } catch (e) { this.h.status('error', e); }
  }
  send(msg) { const n = this.active === 'relay' ? this.relay : this.peer; return n ? n.send(msg) : false; }
  close() { this.closed = true; clearTimeout(this.fallT); if (this.peer) this.peer.close(); if (this.relay) this.relay.close(); }
}

// --- Eigener Server (server.js im LAN / Heimserver): SSE + POST ---
class ServerHostNet {
  constructor(hd) { this.h = hd; this.queue = []; this.token = store.get('ddf-host-token', null) || uid(14); store.set('ddf-host-token', this.token); }
  start(code) {
    this.code = code;
    return new Promise((resolve, reject) => {
      let settled = false;
      const es = new EventSource('/api/ddf/host?code=' + encodeURIComponent(code) + '&token=' + encodeURIComponent(this.token));
      this.es = es;
      es.addEventListener('ready', () => { this.h.status('online'); if (!settled) { settled = true; resolve(code); } });
      es.addEventListener('taken', () => { es.close(); if (!settled) { settled = true; reject({ type: 'unavailable-id' }); } });
      es.addEventListener('leave', e => { try { this.h.disconnect(JSON.parse(e.data).cid); } catch (x) { /* egal */ } });
      es.addEventListener('msg', e => { try { const d = JSON.parse(e.data); this.h.message(d.cid, d.msg); } catch (x) { /* egal */ } });
      es.onerror = () => { if (settled) this.h.status('reconnecting'); };
      setTimeout(() => { if (!settled) { settled = true; es.close(); reject({ type: 'network', message: 'Der Spielserver antwortet nicht.' }); } }, 8000);
    });
  }
  send(cid, msg) { this.queue.push({ cid, msg }); if (!this.ft) this.ft = setTimeout(() => this.flush(), 0); }
  flush() {
    this.ft = null; const items = this.queue.splice(0); if (!items.length) return;
    fetch('/api/ddf/host/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: this.code, token: this.token, items }) }).catch(() => { /* egal */ });
  }
  close() { try { this.es.close(); } catch (e) { /* egal */ } }
}
class ServerClientNet {
  constructor(hd) { this.h = hd; this.cid = uid(12); this.hostUp = false; }
  connect(code) {
    this.code = code;
    return new Promise(resolve => {
      let first = true;
      const es = new EventSource('/api/ddf/client?code=' + encodeURIComponent(code) + '&cid=' + this.cid);
      this.es = es;
      es.addEventListener('ready', e => {
        let d = {}; try { d = JSON.parse(e.data); } catch (x) { /* egal */ }
        this.hostUp = !!d.host;
        if (d.host) { this.h.status('open'); this.h.open(); } else this.h.status('nohost');
        if (first) { first = false; resolve(); }
      });
      es.addEventListener('hostup', () => { this.hostUp = true; this.h.status('open'); this.h.open(); });
      es.addEventListener('hostdown', () => { this.hostUp = false; this.h.status('nohost'); });
      es.addEventListener('msg', e => { try { this.h.message(JSON.parse(e.data)); } catch (x) { /* egal */ } });
      es.onerror = () => this.h.status('reconnecting');
    });
  }
  send(msg) {
    if (!this.hostUp) return false;
    fetch('/api/ddf/client/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: this.code, cid: this.cid, msg }) }).catch(() => { /* egal */ });
    return true;
  }
  close() { try { this.es.close(); } catch (e) { /* egal */ } }
}
// --- Spielerkameras über Cloudflare Realtime SFU (Worker in worker/ verwahrt das App Secret) ---
const CAM_API = '';
const camOk = () => !!CAM_API && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && !!window.RTCPeerConnection;
async function camApi(method, path, body) {
  const res = await fetch(CAM_API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.errorCode) throw new Error(d.errorDescription || 'Kameradienst antwortet nicht (' + res.status + ')');
  return d;
}
function camPc() { return new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }], bundlePolicy: 'max-bundle' }); }
function camIce(pc, ms = 2000) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(r => { const t = setTimeout(r, ms); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); } }); });
}
class CamSender {
  constructor(onInfo) { this.onInfo = onInfo; this.on = false; }
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } });
    this.on = true;
    await this.publish();
  }
  async publish() {
    if (this.pc) this.pc.close();
    const pc = camPc(); this.pc = pc;
    const tr = pc.addTransceiver(this.stream.getVideoTracks()[0], { direction: 'sendonly', sendEncodings: [{ maxBitrate: 2500000, maxFramerate: 30 }] });
    await pc.setLocalDescription(await pc.createOffer());
    await camIce(pc);
    const { sessionId } = await camApi('POST', '/sessions');
    const r = await camApi('POST', `/sessions/${sessionId}/tracks`, { sessionDescription: { type: 'offer', sdp: pc.localDescription.sdp }, tracks: [{ location: 'local', mid: tr.mid, trackName: 'cam' }] });
    if (r.tracks && r.tracks[0] && r.tracks[0].errorCode) throw new Error(r.tracks[0].errorDescription);
    await pc.setRemoteDescription(r.sessionDescription);
    pc.onconnectionstatechange = () => { if (this.pc === pc && pc.connectionState === 'failed') this.retry(); };
    this.info = { sid: sessionId, track: 'cam' };
    this.onInfo(this.info);
  }
  retry() {
    if (!this.on) return; clearTimeout(this.rt);
    this.rt = setTimeout(() => { this.publish().catch(() => this.retry()); }, 3000);
  }
  stop() {
    this.on = false; this.info = null; clearTimeout(this.rt);
    if (this.pc) this.pc.close(); this.pc = null;
    if (this.stream) this.stream.getTracks().forEach(t => t.stop()); this.stream = null;
  }
}
class CamViewer {
  constructor(onChange) { this.onChange = onChange; this.subs = new Map(); this.wanted = new Map(); this.q = Promise.resolve(); this.closed = false; }
  sync(players) {
    const w = new Map();
    players.forEach(p => { if (p.cam && !p.out) w.set(p.id, p.cam.sid + '/' + p.cam.track); });
    this.wanted = w;
    let changed = false;
    for (const [pid, s] of this.subs) if (w.get(pid) !== s.key) { this.subs.delete(pid); changed = true; }
    for (const [pid, key] of w) if (!this.subs.has(pid)) { const s = { key, stream: null, mid: null }; this.subs.set(pid, s); this.q = this.q.then(() => this.subscribe(pid, s)); }
    if (changed) this.onChange();
  }
  async session() {
    if (this.pc) return;
    const pc = camPc(); this.pc = pc;
    pc.ontrack = e => this.gotTrack(e);
    pc.onconnectionstatechange = () => { if (this.pc === pc && pc.connectionState === 'failed') this.reset(); };
    this.sid = (await camApi('POST', '/sessions')).sessionId;
  }
  gotTrack(e) {
    const mid = e.transceiver.mid;
    for (const s of this.subs.values()) if (s.mid === mid) {
      s.stream = new MediaStream([e.track]);
      e.track.onmute = e.track.onunmute = e.track.onended = () => this.onChange();
      this.onChange();
    }
  }
  async subscribe(pid, s) {
    const [sid, track] = s.key.split('/');
    for (let attempt = 0; attempt < 4; attempt++) {
      if (this.closed || this.subs.get(pid) !== s) return;
      try {
        await this.session();
        const r = await camApi('POST', `/sessions/${this.sid}/tracks`, { tracks: [{ location: 'remote', sessionId: sid, trackName: track }] });
        const t = r.tracks && r.tracks[0];
        if (!t || t.errorCode || !r.sessionDescription) throw new Error((t && t.errorDescription) || 'Kamera nicht verfügbar');
        s.mid = t.mid;
        await this.pc.setRemoteDescription(r.sessionDescription);
        await this.pc.setLocalDescription(await this.pc.createAnswer());
        await camIce(this.pc);
        await camApi('PUT', `/sessions/${this.sid}/renegotiate`, { sessionDescription: { type: 'answer', sdp: this.pc.localDescription.sdp } });
        return;
      } catch (e) { console.warn('Kamera', e.message); await new Promise(r => setTimeout(r, 2000)); }
    }
  }
  reset() {
    try { this.pc.close(); } catch (e) { /* egal */ }
    this.pc = null; this.subs.clear(); this.onChange();
    setTimeout(() => { if (this.closed) return; const w = this.wanted; for (const [pid, key] of w) if (!this.subs.has(pid)) { const s = { key, stream: null, mid: null }; this.subs.set(pid, s); this.q = this.q.then(() => this.subscribe(pid, s)); } }, 2000);
  }
  stream(pid) {
    const s = this.subs.get(pid); if (!s || !s.stream) return null;
    const t = s.stream.getVideoTracks()[0];
    return t && t.readyState === 'live' && !t.muted ? s.stream : null;
  }
  close() { this.closed = true; try { this.pc && this.pc.close(); } catch (e) { /* egal */ } }
}

function netErrorText(err) {
  if (!err) return 'Verbindung fehlgeschlagen.';
  const t = err.type || '';
  if (t === 'peer-unavailable') return 'Kein Spiel mit diesem Code gefunden.';
  if (t === 'browser-incompatible') return 'Dieser Browser kann keine Direktverbindungen (WebRTC). Probier Chrome, Edge, Firefox oder Safari.';
  if (['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(t)) return 'Keine Verbindung zum Online-Dienst. Bist du online? (Im Claude-Fenster ist das gesperrt – öffne die HTML-Datei direkt im Browser.)';
  return err.message || t || 'Verbindung fehlgeschlagen.';
}
function onlineAvailability() {
  if (ENV.server) return { ok: true, via: 'server' };
  if (ENV.inClaude) return { ok: false, via: null, why: 'Im Claude-Fenster sind Verbindungen nach außen gesperrt. Lade die HTML-Datei herunter und öffne sie direkt im Browser – dann klappt der Online-Modus.' };
  return { ok: true, via: 'peer' };
}

// =========================================================================
//  Moderator-Steuerung (verbindet Engine, Ansichten und Netzwerk)
// =========================================================================
class HostCtl {
  constructor(engine) {
    this.e = engine; this.conns = new Map(); this.net = null; this.netStatus = 'off'; this.netErr = null;
    this.views = new Set(); this.mirror = new Mirror('host'); this.mirror.onHello = () => this.publishNow();
    engine.on(() => { this.schedule(); this.saveSoon(); });
    this.tickI = setInterval(() => { try { engine.tick(); } catch (e) { console.error(e); } this.heartbeat(); }, 200);
    if (hot && hot.snapshot) { try { hot.snapshot(() => ({ G: this.e.G })); } catch (e) { /* egal */ } }
  }
  destroy() { clearInterval(this.tickI); if (this.net) this.net.close(); this.net = null; }
  schedule() { if (this.pubT) return; this.pubT = setTimeout(() => { this.pubT = null; this.publishNow(); }, 30); }
  publishNow() {
    const S = this.e.pub(); this.last = S;
    this.views.forEach(v => { try { v(S); } catch (e) { console.error(e); } });
    this.mirror.send({ t: 'state', s: S });
    if (this.net) for (const [cid, c] of this.conns) this.net.send(cid, { t: 'state', s: S, me: c.pid ? this.e.me(c.pid) : null, spectator: !c.pid });
    this.lastSend = Date.now();
  }
  heartbeat() {
    const now = Date.now();
    if (this.net && now - (this.lastSend || 0) > 3000) this.publishNow();
    for (const [cid, c] of this.conns) if (now - c.last > 15000) this.drop(cid);
  }
  saveSoon() { clearTimeout(this.saveT); this.saveT = setTimeout(() => store.set('ddf-host', { G: this.e.G, savedAt: Date.now() }), 400); }
  async goOnline() {
    if (this.net) return true;
    const av = onlineAvailability(); if (!av.ok) { this.netStatus = 'error'; this.netErr = { message: av.why }; this.e.commit(); return false; }
    const T = av.via === 'server' ? ServerHostNet : HybridHostNet;
    const resuming = !!this.e.G.code;
    let code = this.e.G.code || newCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const net = new T({
        message: (cid, m) => this.onMsg(cid, m),
        disconnect: cid => this.drop(cid),
        status: (s, err) => { if (this.net === net || s === 'online') { this.netStatus = s; this.netErr = err || null; this.e.commit(); } }
      });
      this.netStatus = 'connecting'; this.e.commit();
      try {
        await net.start(code);
        this.net = net; this.e.G.code = code; this.netStatus = 'online'; this.netErr = null; this.e.G.mode = 'online'; this.e.commit();
        return true;
      } catch (err) {
        if (err && err.type === 'unavailable-id') {
          if (resuming && attempt < 3) { await new Promise(r => setTimeout(r, 2500)); continue; }
          code = newCode(); continue;
        }
        this.netStatus = 'error'; this.netErr = err; this.e.commit(); return false;
      }
    }
    this.netStatus = 'error'; this.netErr = { message: 'Kein freier Spielcode gefunden.' }; this.e.commit(); return false;
  }
  goOffline() { if (this.net) this.net.close(); this.net = null; this.conns.clear(); this.netStatus = 'off'; this.e.G.players.forEach(p => { p.conn = false; p.cam = null; }); this.e.G.mode = 'local'; this.e.commit(); }
  onMsg(cid, m) {
    if (!m || typeof m !== 'object') return;
    let c = this.conns.get(cid); if (!c) { c = { pid: null, last: Date.now() }; this.conns.set(cid, c); }
    c.last = Date.now();
    const e = this.e;
    switch (m.t) {
      case 'hello': return this.hello(cid, c, m);
      case 'ping': return;
      case 'joker': if (c.pid) e.useJoker(c.pid, m.target); return;
      case 'vote': if (c.pid) e.castVote(c.pid, m.target); return;
      case 'final': if (c.pid) e.finalInput(c.pid, m.text, m.lock); return;
      case 'cam': {
        const p = c.pid ? e.player(c.pid) : null; if (!p) return;
        const ok = m.cam && /^[\w-]{1,128}$/.test(m.cam.sid) && /^[\w-]{1,64}$/.test(m.cam.track);
        p.cam = ok ? { sid: m.cam.sid, track: m.cam.track } : null; e.commit();
        return;
      }
      case 'bye': return this.drop(cid);
      default: return;
    }
  }
  hello(cid, c, m) {
    const e = this.e, G = e.G, name = cleanName(m.name), avatar = AVATARS.includes(m.avatar) ? m.avatar : null;
    let p = c.pid ? e.player(c.pid) : m.pid ? e.player(m.pid) : null; // Hallo kann mehrfach kommen
    if (!p && name) p = G.players.find(x => x.name.toLowerCase() === name.toLowerCase() && !x.conn) || null;
    if (!p && name && G.phase === 'lobby' && G.players.length < MAX_PLAYERS) p = e.addPlayer({ name, avatar, device: true, silent: true });
    if (p) {
      for (const [ocid, oc] of this.conns) if (ocid !== cid && oc.pid === p.id) { oc.pid = null; this.net && this.net.send(ocid, { t: 'kicked', reason: 'Du bist jetzt auf einem anderen Gerät angemeldet.' }); }
      c.pid = p.id; p.conn = true; p.device = true;
      if (G.phase === 'lobby' && avatar && !G.players.some(x => x !== p && x.avatar === avatar)) p.avatar = avatar;
    } else c.pid = null;
    const reason = c.pid ? null : (G.phase === 'lobby' ? 'Das Spiel ist voll.' : 'Das Spiel läuft schon – du schaust zu.');
    this.net && this.net.send(cid, { t: 'welcome', pid: c.pid, spectator: !c.pid, reason, code: G.code });
    e.commit(p ? { type: 'join', pid: p.id } : null);
  }
  drop(cid) {
    const c = this.conns.get(cid); this.conns.delete(cid);
    if (c && c.pid) {
      const p = this.e.player(c.pid);
      if (p && !Array.from(this.conns.values()).some(o => o.pid === p.id)) { p.conn = false; p.cam = null; this.e.commit(); }
    }
  }
  isConnected(pid) { return Array.from(this.conns.values()).some(c => c.pid === pid); }
  joinLink() {
    const code = this.e.G.code; if (!code) return '';
    if (ENV.server) return location.origin + '/#join-' + code;
    if (ENV.isHttp && !ENV.inClaude) return location.href.split('#')[0] + '#join-' + code;
    return '';
  }
}

// =========================================================================
//  Mitspieler-Steuerung
// =========================================================================
class PlayerCtl {
  constructor(code, profile) {
    this.code = code.toUpperCase(); this.profile = profile; this.S = null; this.me = null; this.offset = 0;
    this.status = 'connecting'; this.subs = new Set(); this.err = null; this.spectator = false;
  }
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
  emit() { this.subs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  async connect() {
    const av = onlineAvailability();
    if (!av.ok) { this.status = 'error'; this.err = { message: av.why }; this.emit(); return; }
    const T = av.via === 'server' ? ServerClientNet : HybridClientNet;
    this.net = new T({ open: () => this.hello(), message: m => this.onMsg(m), status: (s, err) => { this.status = s; if (err) this.err = err; this.emit(); } });
    this.emit();
    try { await this.net.connect(this.code); }
    catch (e) { this.status = 'error'; this.err = e; this.emit(); return; }
    this.pingI = setInterval(() => { if (this.net) this.net.send({ t: 'ping' }); }, 3000);
    this.watchI = setInterval(() => { if (this.lastMsg && Date.now() - this.lastMsg > 12000 && this.status === 'open') { this.status = 'stale'; this.emit(); } }, 2000);
  }
  hello() { this.net.send({ t: 'hello', pid: this.profile.pid || null, name: this.profile.name, avatar: this.profile.avatar }); }
  onMsg(m) {
    if (!m || typeof m !== 'object') return;
    this.lastMsg = Date.now(); if (this.status !== 'open') this.status = 'open';
    if (m.t === 'welcome') {
      this.profile.pid = m.pid || null; this.spectator = !!m.spectator; this.reason = m.reason;
      store.set('ddf-player', Object.assign({}, this.profile, { code: this.code }));
      if (this.cam && this.cam.info) this.send({ t: 'cam', cam: this.cam.info });
    } else if (m.t === 'state') {
      const off = m.s.now - Date.now(); this.offset = this.S ? this.offset * 0.7 + off * 0.3 : off;
      this.S = m.s; this.me = m.me; this.spectator = !!m.spectator;
    } else if (m.t === 'kicked') { this.kicked = m.reason; this.close(); }
    this.emit();
  }
  send(m) { return this.net ? this.net.send(m) : false; }
  async camToggle() {
    if (this.camBusy) return;
    if (this.cam) { this.camStop(); this.send({ t: 'cam', cam: null }); this.emit(); return; }
    this.camBusy = true; this.emit();
    const cam = new CamSender(info => this.send({ t: 'cam', cam: info }));
    try {
      await cam.start();
      this.cam = cam;
      this.camEl = h('video', { class: 'cam-preview', autoplay: true, playsinline: true });
      this.camEl.muted = true; this.camEl.setAttribute('playsinline', ''); this.camEl.srcObject = cam.stream;
    } catch (e) {
      cam.stop();
      toast(e && e.name === 'NotAllowedError' ? 'Kamera wurde nicht freigegeben.' : e && e.name === 'NotFoundError' ? 'Keine Kamera gefunden.' : 'Kamera konnte nicht starten.');
    }
    this.camBusy = false; this.emit();
  }
  camStop() { if (this.cam) this.cam.stop(); this.cam = null; this.camEl = null; }
  close() { this.camStop(); clearInterval(this.pingI); clearInterval(this.watchI); if (this.net) { try { this.net.send({ t: 'bye' }); } catch (e) { /* egal */ } this.net.close(); } this.net = null; }
}

// =========================================================================
//  Bühne (Stream-Overlay-Look, 1920x1080, skaliert)
// =========================================================================
class Stars {
  constructor(c) {
    this.c = c; this.ctx = c.getContext('2d'); c.width = 1920; c.height = 1080; this.on = true;
    this.s = Array.from({ length: 150 }, () => ({ x: Math.random() * 1920, y: Math.random() * 1080, r: Math.random() * 1.6 + 0.3, p: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.2 }));
    this.draw(0);
    if (!ENV.reduced) { let last = 0; const f = t => { if (!this.on) return; this.id = requestAnimationFrame(f); if (t - last < 70) return; last = t; this.draw(t / 1000); }; this.id = requestAnimationFrame(f); }
  }
  draw(t) {
    const x = this.ctx; x.clearRect(0, 0, 1920, 1080); x.fillStyle = '#cfe8ff';
    for (const s of this.s) { x.globalAlpha = 0.2 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.p)); x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
  }
  stop() { this.on = false; cancelAnimationFrame(this.id); }
}
function confetti(container, ms = 6500) {
  if (ENV.reduced) return;
  const c = h('canvas', { class: 'confetti' }); c.width = 1920; c.height = 1080; container.appendChild(c);
  const ctx = c.getContext('2d'), t0 = performance.now();
  const parts = Array.from({ length: 230 }, () => ({ x: Math.random() * 1920, y: -Math.random() * 1080, w: 8 + Math.random() * 10, hh: 10 + Math.random() * 16, vy: 3 + Math.random() * 5, vx: -2 + Math.random() * 4, rot: Math.random() * 6, vr: -0.2 + Math.random() * 0.4, col: pick(COLORS) }));
  const f = t => {
    const el = t - t0; ctx.clearRect(0, 0, 1920, 1080);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > 1100 && el < ms - 1500) { p.y = -20; p.x = Math.random() * 1920; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.hh / 2, p.w, p.hh); ctx.restore();
    });
    if (el < ms && c.isConnected) requestAnimationFrame(f); else c.remove();
  };
  requestAnimationFrame(f);
}
const playerById = (S, id) => (S && S.players.find(p => p.id === id)) || null;

class StageView {
  constructor(root, opts = {}) {
    this.opts = Object.assign({ sound: false }, opts);
    this.root = root; root.textContent = '';
    this.wrap = h('div', { class: 'stage-wrap' });
    this.stage = h('div', { class: 'stage', role: 'img', 'aria-label': 'Spielbühne' });
    this.canvas = h('canvas', { class: 'stars' });
    this.roundEl = h('div', { class: 'st-round' });
    this.timerVal = h('span', { class: 'val' }, '00:00');
    this.timerBar = h('i', { class: 'bar' });
    this.timerEl = h('div', { class: 'st-timer off' }, h('span', { class: 'lbl' }, 'ZEIT'), this.timerVal, this.timerBar);
    this.top = h('div', { class: 'st-top' }, this.roundEl, h('div', { html: logoHTML() }), this.timerEl);
    this.grid = h('div', { class: 'st-grid' });
    this.side = h('div', { class: 'st-side' });
    this.main = h('div', { class: 'st-main' }, this.grid, this.side);
    this.bottom = h('div', { class: 'st-bottom' });
    this.ov = h('div', { class: 'st-ov' });
    if (this.opts.cams && camOk()) this.camv = new CamViewer(() => { if (this.S) this.update(this.S, this.offset); });
    this.stage.append(this.canvas, this.top, this.main, this.bottom, this.ov);
    this.wrap.append(this.stage); root.append(this.wrap);
    this.cards = new Map(); this.S = null; this.offset = 0; this.lastFx = null; this.sig = {};
    this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(this.wrap); this.fit();
    this.stars = new Stars(this.canvas);
    this.loopFn = () => { this.raf = requestAnimationFrame(this.loopFn); this.frame(); };
    this.raf = requestAnimationFrame(this.loopFn);
  }
  fit() { const r = this.wrap.getBoundingClientRect(); const s = Math.min(r.width / 1920, r.height / 1080); if (s > 0) this.stage.style.setProperty('--scale', s); }
  destroy() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.stars.stop(); if (this.camv) this.camv.close(); this.root.textContent = ''; }
  now() { return Date.now() + this.offset; }
  snd(n) { if (this.opts.sound) Sfx.play(n); }
  setSig(key, sig, fn) { if (this.sig[key] === sig) return; this.sig[key] = sig; fn(); }

  // ---------- Hauptupdate ----------
  update(S, offset) {
    if (!S) return;
    this.offset = offset || 0; this.S = S;
    if (this.camv) this.camv.sync(S.players);
    const ph = S.phase, fmode = ['finalIntro', 'final', 'end'].includes(ph), withSide = ['review', 'vote', 'tb', 'reveal'].includes(ph);
    this.stage.classList.toggle('final-mode', fmode);
    this.stage.classList.toggle('ph-cover', ph === 'finalIntro' || ph === 'end');
    this.main.classList.toggle('with-side', withSide);
    // Rundenanzeige
    let main = '', sub = '';
    if (ph === 'lobby') { main = 'LOBBY'; sub = S.mode === 'online' ? '• WARTEN AUF SPIELER' : '• GLEICH GEHT’S LOS'; }
    else if (ph === 'turn') { main = 'RUNDE ' + S.round; sub = S.jokerUsed ? '• JOKER BENUTZT' : (S.turn ? `• FRAGE ${S.turn.i + 1}/${S.turn.n}` : ''); }
    else if (ph === 'review') { main = 'RUNDE ' + S.round; sub = '• AUSWERTUNG'; }
    else if (ph === 'vote') { main = 'RUNDE ' + S.round; sub = '• VOTING'; }
    else if (ph === 'tb') { main = 'RUNDE ' + S.round; sub = '• STICHWAHL'; }
    else if (ph === 'reveal') { main = 'RUNDE ' + S.round; sub = '• ERGEBNIS'; }
    else if (ph === 'finalIntro') { main = 'FINALE'; }
    else if (ph === 'final') { main = 'FINALE'; sub = S.final && S.final.sd ? '• ENTSCHEIDUNG' : (S.final ? `• FRAGE ${Math.min(S.final.i + 1, S.final.n)}/${S.final.n}` : ''); }
    else if (ph === 'end') { main = 'SIEGEREHRUNG'; }
    this.setSig('round', main + sub, () => { this.roundEl.innerHTML = esc(main) + (sub ? `<span class="sub">${esc(sub)}</span>` : ''); });

    // Karten
    let list = S.players.slice();
    if (fmode && S.final) list = S.final.pids.map(id => playerById(S, id)).filter(Boolean);
    const empties = ph === 'lobby' ? Math.max(0, 4 - list.length) : 0;
    this.layout(list.length + empties, withSide, fmode);
    const keep = new Set();
    list.forEach((p, i) => {
      let el = this.cards.get(p.id);
      if (!el) { el = this.makeCard(); this.cards.set(p.id, el); }
      keep.add(p.id);
      if (this.grid.children[i] !== el) this.grid.insertBefore(el, this.grid.children[i] || null);
      this.updCard(el, p, S, fmode);
    });
    for (const [id, el] of this.cards) if (!keep.has(id)) { el.remove(); this.cards.delete(id); }
    $$('.pc.empty', this.grid).forEach(x => x.remove());
    for (let i = 0; i < empties; i++) this.grid.appendChild(this.emptyCard());

    if (this.sig.phase !== ph) { this.sig.phase = ph; if (ph === 'final' || ph === 'end' || ph === 'lobby') { this.clearOv('flyout'); this.clearOv('banner'); } }
    this.renderBottom(S); this.renderSide(S); this.renderOverlays(S); this.handleFx(S);
    this.frame();
  }
  layout(n, withSide, fmode) {
    const sig = `${n}|${withSide}|${fmode}`; if (this.sig.layout === sig) return; this.sig.layout = sig;
    const W = 1800 - (withSide ? 630 : 0), H = 746, gap = 26, A = fmode ? 0.95 : 1.18;
    let best = null;
    for (let c = 1; c <= Math.max(1, n); c++) {
      const r = Math.ceil(Math.max(1, n) / c), cw = (W - gap * (c - 1)) / c, ch = (H - gap * (r - 1)) / r;
      let w = cw, hh = cw / A; if (hh > ch) { hh = ch; w = ch * A; }
      const score = w * hh; if (!best || score > best.score + 1) best = { c, w, h: hh, score };
    }
    const w = Math.floor(best.w), hh = Math.floor(best.h), cols = Math.min(best.c, Math.max(1, n));
    this.grid.style.setProperty('--cw', w + 'px');
    this.grid.style.setProperty('--ch', hh + 'px');
    this.grid.style.width = (cols * w + (cols - 1) * gap + 2) + 'px';
  }
  makeCard() {
    const video = h('video', { class: 'pc-video', autoplay: true, playsinline: true });
    video.muted = true; video.setAttribute('playsinline', '');
    const P = {
      video, dots: h('div', { class: 'pc-dots' }), joker: h('div', { class: 'pc-joker', title: 'Joker' }, 'J'),
      hearts: h('div', { class: 'pc-hearts' }), avatar: h('div', { class: 'pc-avatar' }), name: h('div', { class: 'pc-name' }),
      tag: h('div', { class: 'pc-tag hidden' }), badge: h('div', { class: 'pc-badge hidden' }), check: h('div', { class: 'pc-check hidden' }, '✓'),
      out: h('div', { class: 'pc-out' }, h('span', null, 'RAUS')), offline: h('div', { class: 'pc-offline hidden' }, 'offline'),
      score: h('div', { class: 'pc-score hidden' }), lock: h('div', { class: 'pc-lock hidden' }), answer: h('div', { class: 'pc-answer hidden' })
    };
    const inn = h('div', { class: 'pc-in' }, Object.values(P));
    const el = h('div', { class: 'pc' }, inn, h('div', { class: 'pc-fx' }));
    el._p = P; el._s = {};
    return el;
  }
  emptyCard() {
    return h('div', { class: 'pc empty', style: '--pc:#2a3466' }, h('div', { class: 'pc-in' }, h('div', { class: 'pc-avatar' }, '?'), h('div', { class: 'pc-name' }, 'FREI')));
  }
  updCard(el, p, S, fmode) {
    const P = el._p, st = el._s, ph = S.phase, now = this.now();
    const set = (k, sig, fn) => { if (st[k] !== sig) { st[k] = sig; fn(); } };
    set('color', p.color, () => el.style.setProperty('--pc', p.color));
    set('avatar', p.avatar, () => { P.avatar.textContent = p.avatar; });
    const cam = this.camv ? this.camv.stream(p.id) : null;
    set('cam', cam ? cam.id : '', () => {
      P.video.srcObject = cam; el.classList.toggle('has-cam', !!cam);
      if (cam) P.video.play().catch(() => { /* Autoplay blockiert */ });
    });
    set('name', p.name, () => { P.name.textContent = p.name.toUpperCase(); });
    // Herzen (inkl. zerbrechendem Herz direkt nach Verlust)
    const fx = S.fx, brk = fx && (fx.type === 'heart' || fx.type === 'out') && fx.pid === p.id && now - fx.at < 1700;
    const lives = Math.max(S.s.lives, p.hearts);
    set('hearts', `${p.hearts}|${lives}|${brk ? fx.n : ''}|${fmode}`, () => {
      P.hearts.classList.toggle('hidden', !!fmode);
      let out = '';
      for (let i = 0; i < lives; i++) {
        let inner = heartSVG(i < p.hearts);
        if (brk && i === p.hearts) inner += `<span class="half l">${heartSVG(true)}</span><span class="half r">${heartSVG(true)}</span>`;
        out += `<span class="hw">${inner}</span>`;
      }
      P.hearts.innerHTML = out;
    });
    // Antwort-Punkte
    const dots = fmode ? [] : (p.dots || []);
    set('dots', JSON.stringify(dots.map(d => d.r)), () => {
      P.dots.innerHTML = dots.map(d => `<i class="dot ${d.r || ''}">${d.r === 'joker' ? 'J' : ''}</i>`).join('');
    });
    // Joker
    const jVis = S.s.joker && !fmode && ph !== 'end';
    const jCls = !p.joker ? 'used' : (S.jokerUsed && S.jokerUsed !== p.id ? 'blocked' : '');
    set('joker', `${jVis}|${jCls}`, () => { P.joker.className = 'pc-joker ' + jCls + (jVis ? '' : ' hidden'); });
    // Zustände
    const t = S.turn, v = S.vote, r = S.reveal, f = S.final;
    const isTurn = ph === 'turn' && t && t.pid === p.id && !t.jokerFrom && !S.roulette;
    const isTarget = ph === 'turn' && t && t.pid === p.id && !!t.jokerFrom && !S.roulette;
    const isCand = v && v.cands.includes(p.id);
    const isSafe = v && !p.out && !v.cands.includes(p.id);
    const isLoser = ph === 'reveal' && r && r.loser === p.id;
    const voted = v && v.voted.includes(p.id);
    el.classList.toggle('is-turn', !!isTurn);
    el.classList.toggle('is-target', !!isTarget);
    el.classList.toggle('is-cand', !!isCand);
    el.classList.toggle('is-safe', !!isSafe);
    el.classList.toggle('is-loser', !!isLoser);
    el.classList.toggle('is-voted', !!voted);
    el.classList.toggle('is-out', !!p.out && !fmode);
    // Tag oben
    let tag = '', tagCls = '';
    if (isTurn) tag = 'DRAN';
    else if (isTarget) { tag = 'JOKER!'; tagCls = 'gold'; }
    else if (isCand) { tag = 'WÄHLBAR'; tagCls = 'red'; }
    else if (isSafe) { tag = 'SICHER'; tagCls = 'safe'; }
    else if (isLoser && r.applied) { tag = p.out ? 'FLIEGT' : '−1 HERZ'; tagCls = 'red'; }
    else if (ph === 'turn' && t && t.next === p.id && !t.result) { tag = 'DANACH'; tagCls = 'safe'; }
    set('tag', tag + tagCls, () => { P.tag.textContent = tag; P.tag.className = 'pc-tag ' + tagCls + (tag ? '' : ' hidden'); });
    // Häkchen beim Voting
    set('check', String(!!voted), () => P.check.classList.toggle('hidden', !voted));
    // Stimmen-Badge
    let badge = '';
    if (r && r.counts && p.id in r.counts) {
      const order = Object.keys(r.counts).sort((a, b) => r.counts[a] - r.counts[b]);
      const idx = order.indexOf(p.id), fresh = now - r.at < 3500;
      badge = `${r.counts[p.id]}|${r.at}|${fresh ? idx : 's'}`;
    }
    set('badge', badge, () => {
      if (!badge) { P.badge.className = 'pc-badge hidden'; return; }
      const parts = badge.split('|'), n = +parts[0], fresh = parts[2] !== 's';
      P.badge.textContent = n;
      P.badge.className = 'pc-badge' + (n === 0 ? ' zero' : '') + (fresh ? ' pop' : '');
      P.badge.style.setProperty('--d', fresh ? (0.25 + (+parts[2]) * 0.33) + 's' : '0s');
    });
    // Offline
    set('off', String(S.mode === 'online' && p.device && !p.conn), () => P.offline.classList.toggle('hidden', !(S.mode === 'online' && p.device && !p.conn)));
    // Finale
    const fin = fmode && f;
    set('score', fin ? `${f.score[p.id]}` : '', () => {
      P.score.className = 'pc-score' + (fin ? '' : ' hidden');
      if (fin) P.score.innerHTML = `${f.score[p.id] || 0}<small>${f.score[p.id] === 1 ? 'PUNKT' : 'PUNKTE'}</small>`;
    });
    let lock = '';
    if (fin && ph === 'final' && !f.revealed && f.active.includes(p.id)) lock = f.locked[p.id] ? 'on' : (f.typing[p.id] ? 'typing' : 'wait');
    set('lock', lock, () => {
      P.lock.className = 'pc-lock' + (lock ? '' : ' hidden') + (lock === 'on' ? ' on' : '');
      P.lock.textContent = lock === 'on' ? '✓ EINGELOGGT' : lock === 'typing' ? 'TIPPT …' : lock ? 'DENKT NACH' : '';
    });
    let ans = '';
    if (fin && ph === 'final' && f.revealed && f.ans && p.id in f.ans) { const m = f.marks[p.id]; ans = JSON.stringify([f.ans[p.id], m]); }
    set('answer', ans, () => {
      if (!ans) { P.answer.className = 'pc-answer hidden'; return; }
      const [txt, m] = JSON.parse(ans);
      P.answer.textContent = txt || '— keine Antwort —';
      P.answer.className = 'pc-answer' + (m === true ? ' right' : m === false ? ' wrong' : '');
    });
  }

  renderBottom(S) {
    const ph = S.phase, t = S.turn, v = S.vote, r = S.reveal, f = S.final;
    const sizeCls = txt => (txt.length > 90 ? 'xs' : txt.length > 58 ? 'sm' : '');
    let sig = ph, build = null;
    if (ph === 'lobby') {
      sig += S.mode + S.code + S.players.length;
      build = () => {
        if (S.mode === 'online' && S.code) return h('div', { class: 'bar-box' }, h('span', { class: 'tag' }, 'BEITRETEN'), h('div', { class: 'lobby-code' }, h('span', { class: 't' }, 'Spielcode'), h('span', { class: 'c' }, S.code), h('span', { class: 't' }, `${S.players.length} ${S.players.length === 1 ? 'Spieler' : 'Spieler'} da`)));
        return h('div', { class: 'bar-box' }, h('span', { class: 'tag gold' }, 'LOBBY'), h('div', { class: 'txt sm' }, S.players.length ? `${S.players.length} Spieler sind bereit. Gleich geht’s los!` : 'Der Moderator trägt gerade die Spieler ein …'));
      };
    } else if (ph === 'turn' && t) {
      const who = playerById(S, t.pid);
      sig += JSON.stringify([t.i, t.pid, t.q, t.flag, t.result, t.a, t.given, !!S.roulette]);
      build = () => {
        const box = h('div', { class: 'bar-box' + (t.result ? ' ' + t.result : '') });
        box.appendChild(h('span', { class: 'tag' + (t.jokerFrom ? ' gold' : '') }, (t.jokerFrom ? 'JOKER · ' : 'FRAGE · ') + (who ? who.name.toUpperCase() : '')));
        if (t.flag) box.appendChild(h('div', { class: 'flag', html: flagHTML(t.flag) }));
        const txt = h('div', { class: 'txt ' + sizeCls(t.q) }, t.q);
        if (t.result) {
          const sol = t.result === 'wrong' ? (t.given ? `Antwort: „${t.given}“ · Richtig: ${t.a}` : `Richtig: ${t.a}`) : `Antwort: ${t.a}`;
          txt.appendChild(h('span', { class: 'sol' }, sol));
        }
        box.appendChild(txt);
        if (t.result) box.appendChild(h('span', { class: 'res ' + t.result }, t.result === 'right' ? '✓ KORREKT' : '✗ FALSCH'));
        return box;
      };
    } else if (ph === 'review') {
      const n = S.review ? S.review.wrongs.length : 0;
      sig += n;
      build = () => h('div', { class: 'bar-box' }, h('span', { class: 'tag red' }, 'AUSWERTUNG'), h('div', { class: 'txt' }, n ? 'Wer hat die dümmste Antwort gegeben?' : 'Alle richtig – stark!'));
    } else if ((ph === 'vote' || ph === 'tb') && v) {
      sig += JSON.stringify([v.voters, v.voted, v.open, v.revote]);
      build = () => {
        const bar = h('div', { class: 'votebar' }, v.voters.map(id => { const p = playerById(S, id); if (!p) return null; return h('div', { class: 'vb' + (v.voted.includes(id) ? ' done' : ''), style: `--pc:${p.color}` }, h('div', { class: 'a' }, p.avatar), h('div', { class: 'n' }, p.name)); }));
        return h('div', { class: 'bar-box' }, h('span', { class: 'tag red' }, v.revote ? 'STICHWAHL' : (v.open ? 'VOTING' : 'VOTING ZU')), bar);
      };
    } else if (ph === 'reveal' && r) {
      const L = playerById(S, r.loser);
      let txt;
      if (r.none) txt = 'Niemand hatte einen Fehler – niemand verliert ein Herz.';
      else if (L && r.applied) txt = L.out ? `${L.name} fliegt raus!` : `${L.name} verliert ein Herz – noch ${L.hearts}.`;
      else if (L) txt = r.auto ? `Nur ${L.name} hatte Fehler …` : `Die meisten Stimmen: ${L.name}`;
      else if (r.tied && r.tied.length) txt = 'Gleichstand: ' + r.tied.map(id => (playerById(S, id) || {}).name).join(' & ') + (S.roulette ? ' – das Glück entscheidet' : '');
      else txt = '…';
      sig += txt;
      build = () => h('div', { class: 'bar-box' + (r.none ? ' right' : (L && r.applied ? ' wrong' : '')) }, h('span', { class: 'tag red' }, 'ERGEBNIS'), h('div', { class: 'txt ' + sizeCls(txt) }, txt));
    } else if (ph === 'finalIntro' && f) {
      sig += S.s.heartBonus;
      build = () => h('div', { class: 'bar-box' }, h('span', { class: 'tag gold' }, 'FINALE'), h('div', { class: 'txt sm' }, S.s.heartBonus ? 'Gleiche Fragen für alle · jedes übrige Herz = 1 Startpunkt' : 'Gleiche Fragen für alle · wer mehr richtig hat, gewinnt'));
    } else if (ph === 'final' && f && f.q) {
      sig += JSON.stringify([f.i, f.sd, f.q, f.revealed]);
      build = () => {
        const box = h('div', { class: 'bar-box' });
        box.appendChild(h('span', { class: 'tag gold' }, f.sd ? 'ENTSCHEIDUNG' : `FINALE · ${f.i + 1}/${f.n}`));
        if (f.q.est) box.appendChild(h('span', { class: 'tag' }, 'SCHÄTZFRAGE'));
        if (f.q.flag) box.appendChild(h('div', { class: 'flag', html: flagHTML(f.q.flag) }));
        const txt = h('div', { class: 'txt ' + sizeCls(f.q.q) }, f.q.q);
        if (f.revealed && f.q.a) txt.appendChild(h('span', { class: 'sol' }, 'Richtig: ' + f.q.a));
        box.appendChild(txt);
        return box;
      };
    } else { sig += 'none'; build = () => null; }
    this.setSig('bottom', sig, () => { this.bottom.textContent = ''; const n = build && build(); if (n) this.bottom.appendChild(n); });
  }
  renderSide(S) {
    const ph = S.phase;
    if (!['review', 'vote', 'tb', 'reveal'].includes(ph)) { this.setSig('side', '', () => { this.side.textContent = ''; }); return; }
    const wr = (S.review && S.review.wrongs) || [], v = S.vote;
    const list = v ? wr.filter(w => v.cands.includes(w.pid)) : wr;
    const sig = JSON.stringify([ph, S.round, list]);
    this.setSig('side', sig, () => {
      this.side.textContent = '';
      this.side.appendChild(h('h4', null, `FEHLER IN RUNDE ${S.round}`));
      if (!list.length) { this.side.appendChild(h('div', { class: 'none' }, 'Keine Fehler!')); return; }
      const items = list.map(w => {
        const p = playerById(S, w.pid) || { color: '#888', avatar: '?', name: '?' };
        const el = h('div', { class: 'sw', style: `--pc:${p.color}` },
          h('div', { class: 'av' }, p.avatar),
          h('div', null, h('div', { class: 'n' }, p.name), h('div', { class: 'q' }, w.q), w.given ? h('div', { class: 'g' }, '„' + w.given + '“') : null, h('div', { class: 'c' }, 'Richtig: ' + w.a)));
        this.side.appendChild(el); return el;
      });
      // so viele Fehler zeigen, wie hineinpassen
      if (this.side.clientHeight > 0 && this.side.scrollHeight > this.side.clientHeight + 2) {
        const more = h('div', { class: 'more' }, '');
        this.side.appendChild(more);
        let hidden = 0;
        while (items.length > 1 && this.side.scrollHeight > this.side.clientHeight + 2) { items.pop().remove(); hidden++; more.textContent = `+ ${hidden} weitere ${hidden === 1 ? 'Fehler' : 'Fehler'}`; }
      }
    });
  }
  renderOverlays(S) {
    const r = S.roulette, rk = r ? `${r.kind}|${r.t0}` : '';
    if (rk !== this.sig.rk) { this.sig.rk = rk; this.clearOv('roulette'); this.rl = null; if (r) this.showRoulette(r, S); }
    const fk = S.phase === 'finalIntro' && S.final ? 'fi' + S.final.pids.join() : '';
    if (fk !== this.sig.fk) { this.sig.fk = fk; this.clearOv('finalintro'); if (fk) this.showFinalIntro(S); }
    const wk = S.phase === 'end' ? 'w' + S.winner + (S.ranking || []).join() : '';
    if (wk !== this.sig.wk) { this.sig.wk = wk; this.clearOv('winner'); if (wk) this.showWinner(S); }
  }
  clearOv(k) { $$(`[data-k="${k}"]`, this.ov).forEach(x => x.remove()); }
  addOv(k, node, ms) { node.dataset.k = k; this.ov.appendChild(node); if (ms) setTimeout(() => node.remove(), ms); return node; }
  banner(title, small, cls, ms = 3100) {
    this.clearOv('banner');
    this.addOv('banner', h('div', { class: 'ov' }, h('div', { class: 'banner fade ' + (cls || '') }, title, small ? h('small', null, small) : null)), ms);
  }
  showRoulette(r, S) {
    const tw = 230, reps = 9, cands = r.cands.map(id => playerById(S, id)).filter(Boolean); if (!cands.length) return;
    const strip = h('div', { class: 'strip' });
    for (let k = 0; k < reps; k++) cands.forEach(p => strip.appendChild(h('div', { class: 'tile', style: `--pc:${p.color}` }, h('div', { class: 'a' }, p.avatar), h('div', { class: 'n' }, p.name))));
    const target = 7 * cands.length + Math.max(0, cands.findIndex(p => p.id === r.to));
    const x = -(target * tw - (1400 / 2 - tw / 2));
    const from = playerById(S, r.from);
    const res = h('div', { class: 'res' });
    const node = h('div', { class: 'ov dim' }, h('div', { class: 'roulette' },
      h('h2', null, r.kind === 'tie' ? 'ZUFALL!' : 'JOKER-ROULETTE'),
      h('div', { class: 'by', html: r.kind === 'tie' ? 'Gleichstand – das Glück entscheidet, wer ein Herz verliert' : `ausgelöst von <b>${esc(from ? from.name : '?')}</b>` }),
      h('div', { class: 'reel' }, strip, h('div', { class: 'mark' }), h('div', { class: 'fade-l' }), h('div', { class: 'fade-r' })),
      res));
    this.addOv('roulette', node);
    const elapsed = this.now() - r.t0;
    let anim = null;
    try {
      anim = strip.animate([{ transform: 'translateX(0px)' }, { transform: `translateX(${x}px)` }], { duration: r.dur, easing: 'cubic-bezier(.08,.62,.12,1)', fill: 'forwards' });
      if (elapsed > 0) anim.currentTime = Math.min(r.dur, elapsed); else { anim.pause(); setTimeout(() => anim.play(), -elapsed); }
    } catch (e) { strip.style.transform = `translateX(${x}px)`; }
    const to = playerById(S, r.to);
    this.rl = { strip, tw, anim, last: -1, landed: false, res, dur: r.dur, t0: r.t0, text: r.kind === 'tie' ? `${to ? to.name : '?'} verliert ein Herz` : `${to ? to.name : '?'} muss antworten!` };
  }
  rouletteFrame() {
    const rl = this.rl; if (!rl) return;
    const el = this.now() - rl.t0;
    if (rl.anim) {
      const m = new DOMMatrixReadOnly(getComputedStyle(rl.strip).transform);
      const idx = Math.floor((-m.m41 + 700) / rl.tw);
      if (idx !== rl.last) { if (rl.last >= 0 && el < rl.dur) this.snd('spin'); rl.last = idx; }
    }
    if (!rl.landed && el >= rl.dur) { rl.landed = true; rl.res.textContent = rl.text; rl.res.classList.add('show'); this.snd('land'); }
  }
  showFinalIntro(S) {
    const f = S.final, ps = f.pids.map(id => playerById(S, id)).filter(Boolean);
    const vs = h('div', { class: 'vs' });
    ps.forEach((p, i) => {
      if (i > 0) vs.appendChild(h('div', { class: 'x' }, 'VS'));
      vs.appendChild(h('div', { class: 'fi', style: `--pc:${p.color}` }, h('div', { class: 'a' }, p.avatar), h('div', { class: 'n' }, p.name.toUpperCase()),
        h('div', { class: 'p' }, S.s.heartBonus ? `${f.start[p.id]} ${f.start[p.id] === 1 ? 'Startpunkt' : 'Startpunkte'}` : '0 Punkte')));
    });
    this.addOv('finalintro', h('div', { class: 'ov dim' }, h('div', { class: 'final-intro' }, h('h2', null, 'FINALE'), vs,
      h('div', { class: 'rule' }, `${S.s.finalQuestions} Fragen, beide bekommen dieselbe Frage und tippen ihre Antwort. ` + (S.s.heartBonus ? 'Jedes übrige Herz zählt als Startpunkt. ' : '') + 'Bei Gleichstand entscheidet eine Entscheidungsfrage.'))));
  }
  showWinner(S) {
    const w = playerById(S, S.winner); if (!w) return;
    const rank = h('div', { class: 'rank' });
    (S.ranking || []).forEach((id, i, a) => {
      const p = playerById(S, id); if (!p) return;
      const last = i === a.length - 1 && a.length > 2;
      rank.appendChild(h('div', { class: 'ri' + (last ? ' last' : '') }, `${i + 1}.`, ' ', p.avatar, ' ', p.name, last ? ' – der Dümmste' : ''));
    });
    const node = h('div', { class: 'ov dim' }, h('div', { class: 'winner', style: `--pc:${w.color}` }, h('div', { class: 'trophy' }, '🏆'), h('div', { class: 'a' }, w.avatar), h('div', { class: 'n' }, w.name.toUpperCase()), h('div', { class: 's' }, 'ist NICHT der Dümmste!'), rank));
    this.addOv('winner', node);
    confetti(node);
  }
  flyout(p) {
    if (!p) return;
    this.clearOv('flyout');
    const node = h('div', { class: 'ov dim flyout' },
      h('div', { class: 'card-ghost', style: `--pc:${p.color}` }, h('div', { class: 'a' }, p.avatar), h('div', { class: 'n' }, p.name.toUpperCase())),
      h('div', { class: 'plane-fly', html: PLANE_SVG }),
      h('div', { class: 'out-text', html: `${esc(p.name.toUpperCase())} <span>FLIEGT RAUS!</span>` }));
    this.addOv('flyout', node, 4300);
  }
  handleFx(S) {
    const fx = S.fx; if (!fx || fx.n === this.lastFx) return;
    const first = this.lastFx == null; this.lastFx = fx.n;
    const age = this.now() - fx.at; if ((first && age > 2500) || age > 8000) return;
    const card = id => this.cards.get(id);
    const flash = (id, cls) => { const el = card(id); if (!el) return; el.classList.remove('flash-right', 'flash-wrong', 'shake'); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 1000); };
    const P = id => playerById(S, id);
    switch (fx.type) {
      case 'right': case 'fright': this.snd('right'); flash(fx.pid, 'flash-right'); break;
      case 'wrong': case 'fwrong': this.snd('wrong'); flash(fx.pid, 'flash-wrong'); break;
      case 'turn': case 'swap': this.snd('turn'); break;
      case 'round': this.snd('turn'); this.banner(`RUNDE ${fx.round}`, S.round === 1 ? 'Jeder bekommt ' + S.s.qpp + (S.s.qpp === 1 ? ' Frage' : ' Fragen') : '', 'gold', 1900); break;
      case 'jokerTo': flash(fx.to, 'flash-right'); break;
      case 'fix': {
        const p = P(fx.pid), ok = fx.result === 'right';
        this.snd(ok ? 'right' : 'wrong'); flash(fx.pid, ok ? 'flash-right' : 'flash-wrong');
        if (p) this.banner('KORREKTUR', `${p.name}: doch ${ok ? 'richtig' : 'falsch'}` + (fx.reset ? ' – es wird neu abgestimmt' : ''), ok ? 'ok' : '', 2600);
        break;
      }
      case 'voted': case 'locked': this.snd('vote'); break;
      case 'reveal': { const n = (S.reveal && Object.keys(S.reveal.counts || {}).length) || 2; for (let i = 0; i < n; i++) setTimeout(() => this.snd('drum'), 250 + i * 330); break; }
      case 'heart': { const p = P(fx.pid); this.snd('heart'); flash(fx.pid, 'shake'); if (p) this.banner(`${p.name.toUpperCase()} −1 HERZ`, `noch ${p.hearts} ${p.hearts === 1 ? 'Herz' : 'Herzen'}`, '', 2900); break; }
      case 'out': this.snd('out'); this.flyout(P(fx.pid)); break;
      case 'nobody': this.snd('right'); this.banner('ALLE RICHTIG!', 'Niemand verliert ein Herz', 'ok', 3000); break;
      case 'revote': this.banner('STICHWAHL', 'Die anderen stimmen noch einmal ab', 'gold', 2600); break;
      case 'timeup': this.snd('timeup'); break;
      case 'finalIntro': this.snd('final'); break;
      case 'finalQ': if (fx.sd) this.banner('ENTSCHEIDUNGSFRAGE', 'Wer allein richtig liegt, gewinnt', 'gold', 2800); else this.snd('turn'); break;
      case 'finalReveal': this.snd('drum'); break;
      case 'winner': this.snd('win'); break;
      case 'join': if (S.phase === 'lobby') this.snd('join'); break;
      default: break;
    }
  }
  frame() {
    const S = this.S; if (!S) return;
    const t = S.timer, show = t && ['turn', 'vote', 'tb', 'final'].includes(S.phase) && !S.roulette;
    if (!show) { if (!this.timerEl.classList.contains('off')) this.timerEl.classList.add('off'); }
    else {
      const left = t.paused ? t.left : Math.max(0, t.end - this.now());
      this.timerEl.classList.remove('off');
      const txt = t.expired ? '00:00' : fmtClock(left);
      if (this.timerVal.textContent !== txt) {
        this.timerVal.textContent = txt;
        const sec = Math.ceil(left / 1000);
        if (!t.paused && !t.expired && sec <= 5 && sec > 0 && sec !== this.lastTick) { this.lastTick = sec; this.snd('tick'); }
      }
      this.timerEl.classList.toggle('warn', !t.paused && (t.expired || left <= 5000));
      this.timerBar.style.width = (t.dur ? clamp(left / t.dur, 0, 1) * 100 : 0) + '%';
    }
    this.rouletteFrame();
  }
}

// =========================================================================
//  UI-Bausteine
// =========================================================================
let modalStack = [];
function openModal(build, opts = {}) {
  const back = h('div', { class: 'modal-back', onclick: e => { if (e.target === back && !opts.sticky) close(); } });
  const box = h('div', { class: 'modal ' + (opts.cls || ''), role: 'dialog', 'aria-modal': 'true' });
  back.appendChild(box); document.body.appendChild(back);
  const close = () => { back.remove(); modalStack = modalStack.filter(m => m !== api); if (opts.onClose) opts.onClose(); };
  const api = { close, box, render: () => { box.textContent = ''; appendAll(box, build(api)); } };
  modalStack.push(api); api.render();
  const f = box.querySelector('input, button, select, textarea'); if (f) setTimeout(() => f.focus(), 30);
  return api;
}
function appendAll(el, nodes) { [].concat(nodes).flat(Infinity).forEach(n => { if (n != null && n !== false) el.appendChild(n instanceof Node ? n : document.createTextNode(String(n))); }); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalStack.length) { const m = modalStack[modalStack.length - 1]; if (!m.box.closest('.modal-back').dataset.sticky) m.close(); } });

function rulesNodes() {
  return h('div', { class: 'rules' },
    h('p', null, 'Ein Moderator stellt die Fragen und entscheidet, was richtig ist. Alle anderen spielen um ihre Herzen.'),
    h('ul', null,
      h('li', null, 'Jeder startet mit 3 Herzen und einem Joker.'),
      h('li', null, 'Pro Runde bekommt jeder reihum 2 Fragen. Für jede Antwort gibt es 30 Sekunden – irgendwas muss man sagen.'),
      h('li', null, 'Joker: Einmal pro Spiel kannst du deine Frage abgeben. Das Joker-Roulette lost aus, wer sie stattdessen beantworten muss. Danach bekommst du eine neue Frage und die Runde geht bei dir weiter. Pro Runde darf nur ein Joker eingesetzt werden.'),
      h('li', null, 'Nach der Runde wird geheim abgestimmt: Wer hat die dümmste Antwort gegeben? Es geht nicht um die meisten Fehler, sondern um die dümmste Antwort. Wählbar ist nur, wer etwas falsch hatte.'),
      h('li', null, 'Wer die meisten Stimmen bekommt, verliert ein Herz. Bei Gleichstand gibt es eine Stichwahl, eine Entscheidung des Moderators oder den Zufall.'),
      h('li', null, 'Ohne Herzen fliegt man raus.'),
      h('li', null, 'Finale der letzten zwei: Beide bekommen dieselben 10 schwereren Fragen und tippen ihre Antwort. Jedes übrige Herz zählt als Startpunkt. Bei Gleichstand entscheidet eine Entscheidungsfrage.')),
    h('p', { class: 'small muted' }, 'Format bekannt von PietSmiet, Reved & Schmobin. Diese Web-Version ist ein Fan-Nachbau.'));
}
function confirmModal(title, text, yes, onYes) {
  openModal(m => [h('h2', null, title), text ? h('p', { class: 'muted' }, text) : null, h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: m.close }, 'Abbrechen'), h('button', { class: 'btn bad', onclick: () => { m.close(); onYes(); } }, yes))]);
}
function showRules() { openModal(m => [h('h2', null, 'So wird gespielt'), rulesNodes(), h('div', { class: 'row end' }, h('button', { class: 'btn primary', onclick: m.close }, 'Alles klar'))]); }

function showQuestionEditor() {
  openModal(m => {
    const ta = h('textarea', { class: 'inp', id: 'custom-q', spellcheck: 'false', placeholder: 'Wie alt ist unser Moderator?|27\nWelche Farbe hat Annas Auto?|Rot\n# Finale\nWie heißt die Hauptstadt von Bhutan?|Thimphu' });
    ta.value = bank.customText || '';
    const c = bank.counts();
    const only = h('input', { type: 'checkbox', id: 'custom-only' });
    only.checked = !!(App.host && App.host.e.s.customOnly);
    return [
      h('h2', null, 'Eigene Fragen'),
      h('p', { class: 'small muted' }, 'Eine Frage pro Zeile im Format ', h('b', null, 'Frage|Antwort'), '. Alles unter einer Zeile „# Finale“ landet im Finale. Eingebaut sind ', c.n, ' Rundenfragen und ', c.f, ' Finalfragen. Eigene Fragen kommen bevorzugt dran.'),
      ta,
      App.host ? h('label', { class: 'check', for: 'custom-only' }, only, h('span', null, 'Nur eigene Fragen benutzen (sobald welche da sind)')) : null,
      h('div', { class: 'row end' },
        h('button', { class: 'btn ghost', onclick: () => copyText(ta.value) }, 'Kopieren'),
        h('button', { class: 'btn', onclick: m.close }, 'Abbrechen'),
        h('button', { class: 'btn primary', onclick: () => {
          bank.setCustom(ta.value);
          if (App.host) App.host.e.setSettings({ customOnly: only.checked });
          const cc = bank.counts(); toast(`${cc.cn} eigene Runden- und ${cc.cf} Finalfragen gespeichert.`); m.close();
        } }, 'Speichern'))
    ];
  });
}

// Neu-Zeichnen aufschieben, solange im Panel gerade gedrückt wird (sonst gehen Klicks verloren)
function guardPointer(panel) {
  panel.down = false; panel.pending = null;
  panel.root.addEventListener('pointerdown', () => { panel.down = true; }, true);
  const up = () => {
    if (!panel.down) return; panel.down = false;
    if (panel.pending) { const f = panel.pending; panel.pending = null; setTimeout(() => panel.render(f), 0); }
  };
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
}

// =========================================================================
//  Moderator-Pult
// =========================================================================
class HostPanel {
  constructor(root, ctl) { this.root = root; this.ctl = ctl; this.e = ctl.e; this.ui = { manual: false, jokerPick: false, custom: false, settingsOpen: null }; this.lastRev = -1; guardPointer(this); }
  render(force) {
    if (force === undefined) force = true;
    if (this.down) { this.pending = this.pending === true || force === true ? true : 'auto'; return; }
    const rev = this.e.G.rev + '|' + this.ctl.netStatus + '|' + this.ctl.conns.size;
    if (force === 'auto' && rev === this.lastRev) return;
    this.lastRev = rev;
    const ae = document.activeElement, keep = {};
    $$('[data-keep]', this.root).forEach(i => { keep[i.id] = i.value; });
    const focus = ae && ae.id && this.root.contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
    const scroll = this.root.scrollTop;
    this.root.textContent = '';
    appendAll(this.root, [this.head(), this.mainCard(), this.fixCard(), this.playersCard(), this.settingsCard(), this.help()]);
    Object.keys(keep).forEach(id => { const el = document.getElementById(id); if (el && el.dataset.keep !== undefined) el.value = keep[id]; });
    if (focus) { const el = document.getElementById(focus.id); if (el) { el.focus(); try { if (focus.s != null) el.setSelectionRange(focus.s, focus.e); } catch (x) { /* egal */ } } }
    this.root.scrollTop = scroll;
  }
  P(id) { return this.e.player(id); }
  av(p) { return h('span', { class: 'avatar-dot', style: `--pc:${p ? p.color : '#888'}` }, p ? p.avatar : '?'); }
  head() {
    const G = this.e.G, c = this.ctl;
    let pill;
    if (G.mode === 'online') {
      const map = { online: ['live', 'Online'], connecting: ['warn', 'Verbinde …'], reconnecting: ['warn', 'Verbindung wackelt …'], error: ['err', 'Offline – Fehler'], off: ['', 'Lokal'] };
      const [cls, txt] = map[c.netStatus] || ['', c.netStatus];
      pill = h('span', { class: 'pill ' + cls }, txt + (G.code && c.netStatus === 'online' ? ' · ' + G.code : ''));
    } else pill = h('span', { class: 'pill' }, 'Lokal · ein Gerät');
    return h('div', { class: 'stack' },
      h('div', { class: 'panel-head' }, h('span', { class: 'title' }, 'MODERATOR-PULT'), pill),
      h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => App.toggleStageOnly(), title: 'Nur die Bühne zeigen (Taste B)' }, 'Nur Bühne ', h('kbd', null, 'B')),
        h('a', { class: 'btn small', href: '#buehne', target: '_blank', rel: 'noopener', title: 'Bühne in einem zweiten Tab öffnen, z. B. für OBS oder einen Fernseher' }, 'Bühnen-Tab ↗'),
        h('button', { class: 'btn small', onclick: () => { Sfx.on = !Sfx.on; store.set('ddf-sound', Sfx.on); App.syncSound(); this.render(); }, 'aria-pressed': String(Sfx.on), title: 'Ton an/aus (Taste M)' }, Sfx.on ? 'Ton an' : 'Ton aus'),
        h('button', { class: 'btn small ghost', onclick: showRules }, 'Regeln'),
        h('button', { class: 'btn small ghost', onclick: showQuestionEditor }, 'Fragen'),
        h('button', { class: 'btn small ghost', onclick: () => App.endHost(), title: 'Spiel beenden und zur Startseite' }, 'Beenden')));
  }
  mainCard() {
    const ph = this.e.G.phase;
    const fn = { lobby: this.lobby, turn: this.turnCard, review: this.review, vote: this.voteCard, tb: this.voteCard, reveal: this.revealCard, finalIntro: this.finalIntroCard, final: this.finalCard, end: this.endCard }[ph];
    return fn ? fn.call(this) : null;
  }
  // ----- Lobby -----
  lobby() {
    const e = this.e, G = e.G, c = this.ctl, av = onlineAvailability();
    const nameIn = h('input', { class: 'inp', id: 'add-name', placeholder: 'Name eingeben und Enter', maxlength: 16, autocomplete: 'off', 'data-keep': '' });
    const add = () => { const v = nameIn.value.trim(); if (!v) return; if (G.players.length >= MAX_PLAYERS) return toast('Maximal 12 Spieler.'); e.addPlayer({ name: v }); nameIn.value = ''; setTimeout(() => { const el = $('#add-name'); if (el) { el.value = ''; el.focus(); } }, 0); };
    nameIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); add(); } });
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Spielmodus' },
      h('button', { 'aria-pressed': String(G.mode !== 'online'), onclick: () => { if (G.mode === 'online') c.goOffline(); } }, 'Lokal'),
      h('button', { 'aria-pressed': String(G.mode === 'online'), disabled: !av.ok, title: av.ok ? '' : av.why, onclick: () => { if (G.mode !== 'online') { G.mode = 'online'; e.commit(); c.goOnline(); } } }, 'Online'));
    const kids = [h('h3', null, 'Spiel einrichten'), h('div', { class: 'row' }, seg, h('span', { class: 'small muted grow' }, G.mode === 'online' ? 'Mitspieler treten mit Handy oder PC bei.' : 'Du gibst alles ein – perfekt für einen Bildschirm.'))];
    if (!av.ok) kids.push(h('p', { class: 'tiny muted' }, av.why));
    if (G.mode === 'online') {
      if (c.netStatus === 'online' && G.code) {
        const link = c.joinLink();
        kids.push(h('div', { class: 'code-box' }, h('div', null, h('div', { class: 'tiny muted' }, 'SPIELCODE'), h('div', { class: 'code' }, G.code)),
          h('div', { class: 'stack', style: 'align-items:flex-end' }, link ? h('button', { class: 'btn small', onclick: () => copyText(link) }, 'Link kopieren') : null, h('button', { class: 'btn small ghost', onclick: () => copyText(G.code) }, 'Code kopieren'))));
        kids.push(h('p', { class: 'tiny muted' }, link ? 'Mitspieler öffnen den Link oder diese Seite, tippen auf „Spiel beitreten“ und geben den Code ein.' : 'Mitspieler öffnen dieselbe HTML-Datei, tippen auf „Spiel beitreten“ und geben den Code ein. Am einfachsten: Datei online stellen (z. B. GitHub Pages oder Netlify Drop) und den Link teilen.'));
      } else if (c.netStatus === 'error') {
        kids.push(h('p', { class: 'small', style: 'color:var(--bad)' }, netErrorText(c.netErr)), h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => c.goOnline() }, 'Nochmal versuchen'), h('button', { class: 'btn small ghost', onclick: () => c.goOffline() }, 'Lokal spielen')));
      } else kids.push(h('p', { class: 'small muted' }, 'Spielraum wird eröffnet …'));
    }
    kids.push(h('label', { class: 'field', for: 'host-name' }, 'Name des Moderators', h('input', { class: 'inp', id: 'host-name', value: G.hostName, maxlength: 20, onchange: ev => { G.hostName = cleanName(ev.target.value) || 'Moderator'; e.commit(); } })));
    kids.push(h('label', { class: 'field', for: 'add-name' }, G.mode === 'online' ? 'Spieler ohne eigenes Gerät hinzufügen' : 'Spieler hinzufügen', h('div', { class: 'row' }, h('div', { class: 'grow' }, nameIn), h('button', { class: 'btn', onclick: add }, 'Hinzufügen'))));
    kids.push(h('button', { class: 'btn primary big block', disabled: G.players.length < 2, onclick: () => { Sfx.unlock(); if (!e.start()) toast('Mindestens 2 Spieler.'); } }, G.players.length < 2 ? 'Mindestens 2 Spieler nötig' : `Spiel starten · ${G.players.length} Spieler`));
    return h('div', { class: 'card stack' }, kids);
  }
  // ----- Frage läuft -----
  turnCard() {
    const e = this.e, G = e.G, t = e.cur(); if (!t) return null;
    const p = this.P(t.pid), from = t.jokerFrom ? this.P(t.jokerFrom) : null, nextP = this.P(e.nextPid());
    const pct = ((G.t + (t.result ? 1 : 0)) / G.turns.length) * 100;
    const kids = [
      h('div', { class: 'row' }, h('span', { class: 'small muted grow' }, `Runde ${G.round} · Frage ${G.t + 1} von ${G.turns.length}`), G.jokerUsed ? h('span', { class: 'pill warn' }, 'Joker benutzt') : null),
      h('div', { class: 'progress' }, h('i', { style: `width:${pct}%` }))
    ];
    if (G.roulette) {
      kids.push(h('div', { class: 'qcard' }, h('div', { class: 'who' }, 'Joker-Roulette läuft …'), h('div', { class: 'small muted' }, 'Gleich steht fest, wer die Frage beantworten muss.')));
      return h('div', { class: 'card stack' }, kids);
    }
    const q = h('div', { class: 'qcard' },
      h('div', { class: 'who' }, this.av(p), h('span', null, p ? p.name : '?'), from ? h('span', { class: 'pill warn' }, 'per Joker von ' + from.name) : h('span', { class: 'pill' }, 'ist dran')),
      t.q.flag ? h('div', { class: 'flag-mini', html: flagHTML(t.q.flag) }) : null,
      h('div', { class: 'qtext' }, t.q.q),
      h('div', { class: 'answer' }, h('small', null, 'Antwort (nur du siehst sie)'), t.q.a));
    kids.push(q);
    if (!t.result) {
      kids.push(h('label', { class: 'field', for: `given-${G.round}-${G.t}` }, 'Was wurde geantwortet? (optional – erscheint bei „Falsch“ auf der Bühne)',
        h('input', { class: 'inp', id: `given-${G.round}-${G.t}`, 'data-keep': '', maxlength: 80, autocomplete: 'off', placeholder: 'z. B. „Mango“', onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); this.markFromPanel('wrong'); } } })));
      kids.push(h('div', { class: 'row' },
        h('button', { class: 'btn ok big grow', onclick: () => this.markFromPanel('right') }, '✓ Richtig ', h('kbd', null, 'R')),
        h('button', { class: 'btn bad big grow', onclick: () => this.markFromPanel('wrong') }, '✗ Falsch ', h('kbd', null, 'F'))));
      const canJ = e.canJoker(t.pid);
      const tools = h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => e.swapQuestion() }, 'Andere Frage ', h('kbd', null, 'A')),
        h('button', { class: 'btn small', onclick: () => { this.ui.custom = !this.ui.custom; this.render(); } }, 'Eigene Frage'),
        G.settings.joker ? h('button', { class: 'btn small gold', disabled: !canJ, title: canJ ? 'Joker für ' + (p ? p.name : '') : 'Joker nicht möglich', onclick: () => this.hostJoker() }, 'Joker ', h('kbd', null, 'J')) : null,
        G.timer ? h('button', { class: 'btn small', onclick: () => e.pauseTimer() }, G.timer.paused ? 'Weiter' : 'Pause', ' ', h('kbd', null, 'P')) : null,
        h('button', { class: 'btn small', onclick: () => e.addTime(10) }, '+10 s'));
      kids.push(tools);
      if (this.ui.jokerPick && canJ) {
        kids.push(h('div', { class: 'stack' }, h('div', { class: 'small muted' }, 'Wer soll die Frage bekommen?'), h('div', { class: 'row' }, e.jokerTargets(t.pid).map(id => { const x = this.P(id); return h('button', { class: 'btn small', onclick: () => { e.useJoker(t.pid, id); this.ui.jokerPick = false; } }, x.avatar + ' ' + x.name); }))));
      }
      if (this.ui.custom) {
        const qi = h('input', { class: 'inp', id: 'cq-q', 'data-keep': '', placeholder: 'Frage', maxlength: 220 }), ai = h('input', { class: 'inp', id: 'cq-a', 'data-keep': '', placeholder: 'Antwort', maxlength: 120 });
        kids.push(h('div', { class: 'stack' }, qi, ai, h('div', { class: 'row end' }, h('button', { class: 'btn small primary', onclick: () => { const qv = $('#cq-q').value, avv = $('#cq-a').value; if (!qv.trim()) return toast('Bitte eine Frage eingeben.'); this.ui.custom = false; $('#cq-q').value = ''; $('#cq-a').value = ''; e.customQuestion(qv, avv); } }, 'Diese Frage stellen'))));
      }
    } else {
      kids.push(h('div', { class: 'row' }, h('span', { class: 'result-chip ' + t.result }, t.result === 'right' ? '✓ Richtig' : '✗ Falsch' + (t.given ? ` – „${t.given}“` : '')), h('button', { class: 'btn small ghost', onclick: () => e.unmark() }, 'Korrigieren')));
      const last = G.t + 1 >= G.turns.length;
      kids.push(h('button', { class: 'btn primary big block', onclick: () => e.next() }, last ? 'Runde beenden ▶' : 'Nächste Frage ▶', ' ', h('kbd', null, 'Leertaste')));
    }
    if (nextP && !t.result) kids.push(h('div', { class: 'small muted' }, 'Danach: ', nextP.avatar, ' ', nextP.name));
    return h('div', { class: 'card stack' }, kids);
  }
  // ----- Bewertungen nachträglich korrigieren -----
  fixCard() {
    const e = this.e, G = e.G, f = G.final;
    let items = [], note = '';
    if (e.canFix()) {
      items = G.turns.map((t, i) => ({ t, i })).filter(x => x.t.result && !(G.phase === 'turn' && x.i === G.t)).map(({ t, i }) => {
        const p = this.P(t.pid), ok = t.result === 'right';
        return h('div', { class: 'fix-item' + (ok ? ' right' : ' wrong') },
          h('div', { class: 'row' }, this.av(p), h('b', { class: 'grow' }, p ? p.name : '?'),
            h('span', { class: 'result-chip ' + t.result }, ok ? '✓ Richtig' : '✗ Falsch'),
            h('button', { class: 'btn small ' + (ok ? 'bad' : 'ok'), id: `fix-${G.round}-${i}`, onclick: () => e.fixTurn(i, ok ? 'wrong' : 'right') }, ok ? 'Doch falsch' : 'Doch richtig')),
          h('div', { class: 'q' }, t.q.q), h('div', { class: 'a' }, (t.given ? `Antwort: „${t.given}“ · ` : '') + 'Richtig: ' + t.q.a));
      });
      if (G.phase !== 'turn' && G.phase !== 'review') note = 'Ändert sich dadurch, wer wählbar ist, wird neu abgestimmt; ein schon abgezogenes Herz gibt es zurück.';
    } else if (G.phase === 'final' && f && !f.sd) {
      items = f.hist.map((hq, k) => hq.sd ? null : h('div', { class: 'fix-item' },
        h('div', { class: 'q' }, `${k + 1}. ${hq.q}`), h('div', { class: 'a' }, 'Richtig: ' + hq.a),
        Object.keys(hq.marks).map(id => {
          const p = this.P(id), ok = !!hq.marks[id];
          return h('div', { class: 'row' }, this.av(p), h('span', { class: 'grow' }, (p ? p.name : '?') + ': „' + (hq.ans[id] || '—') + '“'),
            h('span', { class: 'result-chip ' + (ok ? 'right' : 'wrong') }, ok ? '✓' : '✗'),
            h('button', { class: 'btn small ' + (ok ? 'bad' : 'ok'), onclick: () => e.fixFinal(k, id, !ok) }, ok ? 'Doch falsch' : 'Doch richtig'));
        }))).filter(Boolean);
    }
    if (!items.length) return null;
    const open = !!this.ui.fixOpen;
    return h('div', { class: 'card stack' },
      h('button', { class: 'btn small ghost block', 'aria-expanded': String(open), onclick: () => { this.ui.fixOpen = !open; this.render(); } }, (open ? '▾ ' : '▸ ') + `Bewertungen korrigieren (${items.length})`),
      open ? h('div', { class: 'stack' }, items) : null,
      open && note ? h('div', { class: 'tiny muted' }, note) : null);
  }
  markFromPanel(res) {
    const G = this.e.G, inp = document.getElementById(`given-${G.round}-${G.t}`);
    this.e.mark(res, inp ? inp.value : '');
  }
  hostJoker() {
    const e = this.e, t = e.cur(); if (!t || !e.canJoker(t.pid)) return;
    if (e.s.jokerMode === 'choose') { this.ui.jokerPick = !this.ui.jokerPick; this.render(); return; }
    e.useJoker(t.pid);
  }
  wrongList(wrongs) {
    if (!wrongs.length) return h('div', { class: 'small', style: 'color:var(--ok)' }, 'Niemand hatte einen Fehler.');
    return h('div', { class: 'wronglist' }, wrongs.map(w => { const p = this.P(w.pid); return h('div', { class: 'wrong-item' }, h('div', { class: 'row' }, this.av(p), h('b', null, p ? p.name : '?')), h('div', { class: 'q' }, w.q), h('div', { class: 'a' }, (w.given ? `Antwort: „${w.given}“ · ` : '') + 'Richtig: ' + w.a)); }));
  }
  review() {
    const e = this.e, G = e.G, cands = e.candidates();
    const label = !cands.length ? 'Weiter – niemand verliert ein Herz ▶' : cands.length === 1 ? `Nur ${this.P(cands[0]).name} hatte Fehler – verliert ein Herz ▶` : 'Voting starten ▶';
    return h('div', { class: 'card stack' }, h('h3', null, `Runde ${G.round} vorbei – Fehler`), this.wrongList(G.review.wrongs),
      cands.length > 1 ? h('div', { class: 'small muted' }, 'Wählbar: ' + cands.map(id => this.P(id).name).join(', ')) : null,
      h('button', { class: 'btn primary big block', onclick: () => e.startVote() }, label, ' ', h('kbd', null, 'Leertaste')));
  }
  voteCard() {
    const e = this.e, G = e.G, v = G.vote; if (!v) return null;
    const el = e.eligible(), done = el.filter(id => id in G.votes).length;
    const rows = v.voters.map(id => {
      const p = this.P(id), can = el.includes(id), has = id in G.votes, conn = this.ctl.isConnected(id);
      const row = h('div', { class: 'voterow' }, this.av(p), h('span', null, p.name), h('span', { class: 'st' + (has ? ' done' : '') }, !can ? 'kann niemanden wählen' : has ? '✓ abgestimmt' : conn ? 'stimmt ab …' : (G.mode === 'online' ? 'kein Gerät' : 'offen')));
      if (can && (this.ui.manual || !conn) && v.open) {
        const sel = h('select', { class: 'inp', style: 'width:auto;min-height:34px;padding:4px 8px', 'aria-label': 'Stimme von ' + p.name, onchange: ev => { if (ev.target.value) e.castVote(id, ev.target.value); } },
          h('option', { value: '' }, has ? '••••' : 'Stimme …'), v.cands.filter(c => c !== id).map(c => h('option', { value: c }, this.P(c).name)));
        row.appendChild(sel);
      }
      return row;
    });
    const needBooth = v.open && el.some(id => !(id in G.votes) && !this.ctl.isConnected(id));
    return h('div', { class: 'card stack' },
      h('h3', null, v.revote ? 'Stichwahl läuft' : 'Voting läuft'),
      h('div', { class: 'row' }, h('span', { class: 'grow' }, `${done} von ${el.length} Stimmen`), G.timer ? h('button', { class: 'btn small', onclick: () => e.addTime(15) }, '+15 s') : null, !v.open ? h('span', { class: 'pill warn' }, 'Zeit abgelaufen') : null),
      h('div', { class: 'small muted' }, 'Wählbar: ' + v.cands.map(id => this.P(id).name).join(', ')),
      h('div', { class: 'stack' }, rows),
      needBooth ? h('button', { class: 'btn gold block', onclick: () => openBooth(this.ctl) }, 'Wahlkabine öffnen (Gerät reihum weitergeben)') : null,
      h('button', { class: 'btn small ghost', onclick: () => { this.ui.manual = !this.ui.manual; this.render(); } }, this.ui.manual ? 'Manuelle Eingabe ausblenden' : 'Stimmen manuell eintragen'),
      h('button', { class: 'btn primary big block', onclick: () => e.reveal() }, 'Auflösen ▶', ' ', h('kbd', null, 'Leertaste')));
  }
  revealCard() {
    const e = this.e, G = e.G, r = G.reveal; if (!r) return null;
    const kids = [h('h3', null, 'Ergebnis')];
    if (r.none) kids.push(h('p', null, 'Niemand hatte einen Fehler – keiner verliert ein Herz.'));
    else {
      const entries = Object.keys(r.counts).sort((a, b) => r.counts[b] - r.counts[a]);
      kids.push(h('div', { class: 'stack' }, entries.map(id => { const p = this.P(id); return h('div', { class: 'voterow' }, this.av(p), h('span', null, p.name), h('span', { class: 'st' }, r.counts[id] + (r.counts[id] === 1 ? ' Stimme' : ' Stimmen'))); })));
    }
    if (r.loser) {
      const L = this.P(r.loser);
      kids.push(h('p', null, r.applied ? (L.out ? `${L.name} hat kein Herz mehr und fliegt raus!` : `${L.name} verliert ein Herz (noch ${L.hearts}).`) : `${L.name} verliert gleich ein Herz …`));
    } else if (r.tied && r.tied.length) {
      const opt = e.tieOptions() || {};
      kids.push(h('p', null, 'Gleichstand zwischen ' + r.tied.map(id => this.P(id).name).join(' & ') + '. Wie wird entschieden?'));
      if (G.roulette) kids.push(h('p', { class: 'small muted' }, 'Zufall läuft …'));
      else kids.push(h('div', { class: 'stack' },
        h('button', { class: 'btn block', disabled: !opt.revote, title: opt.revote ? '' : 'Keine weiteren Wähler oder schon eine Stichwahl gehabt', onclick: () => e.tieBreak('revote') }, 'Stichwahl – die anderen stimmen ab'),
        h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Ich entscheide:'), r.tied.map(id => h('button', { class: 'btn small bad', onclick: () => e.tieBreak('host', id) }, this.P(id).name))),
        h('button', { class: 'btn block gold', onclick: () => e.tieBreak('random') }, 'Zufall entscheiden lassen')));
    }
    const act = e.active().length, toFinal = act <= e.s.finalAt;
    kids.push(h('button', { class: 'btn primary big block', disabled: !e.canProceed(), onclick: () => e.proceed() }, act <= 1 ? 'Spiel beenden ▶' : toFinal ? 'Zum Finale ▶' : 'Nächste Runde ▶', ' ', h('kbd', null, 'Leertaste')));
    return h('div', { class: 'card stack' }, kids);
  }
  finalIntroCard() {
    const e = this.e, f = e.G.final;
    return h('div', { class: 'card stack' }, h('h3', null, 'Finale!'),
      h('div', { class: 'stack' }, f.pids.map(id => { const p = this.P(id); return h('div', { class: 'voterow' }, this.av(p), h('span', null, p.name), h('span', { class: 'st' }, `${f.start[id]} Startpunkt${f.start[id] === 1 ? '' : 'e'}`)); })),
      h('p', { class: 'small muted' }, `${f.n} Fragen. Beide tippen ihre Antwort (oder sagen sie dir leise), dann deckst du auf.`),
      h('button', { class: 'btn primary big block', onclick: () => e.finalQuestion() }, 'Erste Finalfrage ▶', ' ', h('kbd', null, 'Leertaste')));
  }
  finalCard() {
    const e = this.e, G = e.G, f = G.final, pids = e.finalPids(); if (!f || !f.q) return null;
    const kids = [
      h('div', { class: 'row' }, h('span', { class: 'small muted grow' }, f.sd ? 'Entscheidungsfrage' : `Finalfrage ${f.i + 1} von ${f.n}`), h('span', { class: 'pill' }, pids.map(id => `${this.P(id).name} ${f.score[id]}`).join(' : '))),
      h('div', { class: 'qcard' }, f.q.est ? h('span', { class: 'pill warn' }, 'Schätzfrage – wer näher dran ist, bekommt den Punkt') : null, f.q.flag ? h('div', { class: 'flag-mini', html: flagHTML(f.q.flag) }) : null,
        h('div', { class: 'qtext' }, f.q.q), h('div', { class: 'answer' }, h('small', null, 'Antwort'), f.q.a))
    ];
    const rows = pids.map(id => {
      const p = this.P(id), a = f.ans[id], conn = this.ctl.isConnected(id);
      const box = h('div', { class: 'fa' }, h('div', { class: 'row' }, this.av(p), h('b', null, p.name), h('span', { class: 'grow' }), h('span', { class: 'pill ' + (a && a.locked ? 'live' : '') }, a && a.locked ? 'eingeloggt' : conn ? (a && a.text ? 'tippt …' : 'denkt nach') : 'ohne Gerät')));
      if (!f.revealed) {
        if (conn) box.appendChild(h('div', { class: 't' }, a && a.text ? a.text : '—'));
        else box.appendChild(h('input', { class: 'inp', id: `fa-${id}-${f.i}-${f.hist.length}`, 'data-keep': '', placeholder: 'Antwort eintragen (optional)', maxlength: 80, value: a ? a.text : '', oninput: ev => e.finalHostInput(id, ev.target.value) }));
      } else {
        box.appendChild(h('div', { class: 't' }, a && a.text ? a.text : '— keine Antwort —'));
        const m = f.marks[id];
        box.appendChild(h('div', { class: 'row' },
          h('button', { class: 'btn small ' + (m === true ? 'ok' : ''), 'aria-pressed': String(m === true), onclick: () => e.finalMark(id, true) }, '✓ Richtig'),
          h('button', { class: 'btn small ' + (m === false ? 'bad' : ''), 'aria-pressed': String(m === false), onclick: () => e.finalMark(id, false) }, '✗ Falsch'),
          typeof f.sugg[id] === 'boolean' ? h('span', { class: 'tiny muted' }, 'Vorschlag: ' + (f.sugg[id] ? 'richtig' : 'falsch')) : null));
      }
      return box;
    });
    kids.push(h('div', { class: 'final-ans' }, rows));
    if (!f.revealed) {
      kids.push(h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => e.finalSwap() }, 'Andere Frage'), G.timer ? h('button', { class: 'btn small', onclick: () => e.pauseTimer() }, G.timer.paused ? 'Weiter' : 'Pause') : null, h('button', { class: 'btn small', onclick: () => e.addTime(15) }, '+15 s')));
      kids.push(h('button', { class: 'btn primary big block', onclick: () => e.finalReveal() }, 'Aufdecken ▶', ' ', h('kbd', null, 'Leertaste')));
    } else {
      kids.push(h('button', { class: 'btn primary big block', disabled: !e.finalReady(), onclick: () => e.finalNext() }, e.finalReady() ? 'Weiter ▶' : 'Erst alle bewerten', ' ', h('kbd', null, 'Leertaste')));
    }
    return h('div', { class: 'card stack' }, kids);
  }
  endCard() {
    const e = this.e, G = e.G, w = this.P(G.winner);
    return h('div', { class: 'card stack' }, h('h3', null, 'Spielende'),
      w ? h('div', { class: 'row' }, this.av(w), h('b', { style: 'font-size:20px' }, w.name), h('span', { class: 'muted' }, 'gewinnt!')) : null,
      h('ol', { class: 'small', style: 'margin:0;padding-left:20px' }, (G.ranking || []).map((id, i, a) => { const p = this.P(id); return h('li', null, p ? p.name : '?', i === a.length - 1 && a.length > 2 ? ' – der Dümmste' : ''); })),
      h('button', { class: 'btn primary block', onclick: () => e.backToLobby() }, 'Nochmal mit denselben Spielern'),
      h('button', { class: 'btn block ghost', onclick: () => App.endHost() }, 'Zur Startseite'));
  }
  playersCard() {
    const e = this.e, G = e.G, lobby = G.phase === 'lobby';
    if (!G.players.length) return h('div', { class: 'card' }, h('h3', null, 'Spieler'), h('p', { class: 'small muted' }, G.mode === 'online' ? 'Noch niemand da. Teile den Code!' : 'Noch keine Spieler eingetragen.'));
    const rows = G.players.map((p, i) => {
      const conn = this.ctl.isConnected(p.id);
      const row = h('div', { class: 'prow' + (p.out ? ' out' : '') },
        h('span', { class: 'conn' + (conn ? ' on' : ''), title: p.device ? (conn ? 'verbunden' : 'getrennt') : 'ohne Gerät' }),
        h('button', { class: 'avatar-dot', style: `--pc:${p.color};border:0;cursor:${lobby ? 'pointer' : 'default'}`, title: lobby ? 'Avatar wechseln' : '', onclick: () => lobby && e.cycleAvatar(p.id), 'aria-label': 'Avatar von ' + p.name }, p.avatar),
        h('span', { class: 'nm' }, p.name),
        h('span', { html: heartsInline(p.hearts, e.s.lives) }));
      if (lobby) row.append(
        h('button', { class: 'ic', disabled: i === 0, onclick: () => e.movePlayer(p.id, -1), 'aria-label': 'nach oben' }, '▲'),
        h('button', { class: 'ic', disabled: i === G.players.length - 1, onclick: () => e.movePlayer(p.id, 1), 'aria-label': 'nach unten' }, '▼'),
        h('button', { class: 'ic', onclick: () => e.removePlayer(p.id), 'aria-label': p.name + ' entfernen' }, '✕'));
      else row.append(
        h('button', { class: 'ic', onclick: () => e.setHearts(p.id, -1), title: 'Herz abziehen', 'aria-label': 'Herz abziehen' }, '−'),
        h('button', { class: 'ic', onclick: () => e.setHearts(p.id, 1), title: 'Herz geben', 'aria-label': 'Herz geben' }, '+'),
        G.settings.joker ? h('button', { class: 'ic', style: p.joker ? 'color:var(--gold)' : 'opacity:.5', onclick: () => e.toggleJoker(p.id), title: p.joker ? 'Joker vorhanden (klicken zum Entfernen)' : 'Joker weg (klicken zum Zurückgeben)' }, 'J') : null);
      return row;
    });
    return h('div', { class: 'card' }, h('h3', null, `Spieler (${G.players.length})`), h('div', { class: 'plist' }, rows));
  }
  settingsCard() {
    const e = this.e, s = e.s, lobby = e.G.phase === 'lobby';
    const sel = (id, label, key, opts, disabled) => h('label', { class: 'field', for: id }, label, h('select', { class: 'inp', id, disabled: !!disabled, onchange: ev => e.setSettings({ [key]: isNaN(+ev.target.value) ? ev.target.value : +ev.target.value }) }, opts.map(([v, t]) => h('option', { value: v, selected: String(s[key]) === String(v) }, t))));
    const chk = (id, label, key, disabled) => h('label', { class: 'check full', for: id }, h('input', { type: 'checkbox', id, checked: !!s[key], disabled: !!disabled, onchange: ev => e.setSettings({ [key]: ev.target.checked }) }), h('span', null, label));
    const secs = arr => arr.map(v => [v, v ? v + ' Sekunden' : 'ohne Timer']);
    const grid = h('div', { class: 'settings-grid' },
      sel('set-lives', 'Herzen', 'lives', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], !lobby),
      sel('set-qpp', 'Fragen pro Spieler & Runde', 'qpp', [[1, '1'], [2, '2'], [3, '3']], !lobby),
      sel('set-at', 'Antwortzeit', 'answerTime', secs([0, 10, 15, 20, 30, 45, 60])),
      sel('set-vt', 'Voting-Zeit', 'voteTime', secs([0, 15, 20, 30, 45, 60])),
      sel('set-fq', 'Finalfragen', 'finalQuestions', [[5, '5'], [7, '7'], [10, '10'], [12, '12'], [15, '15']], !lobby),
      sel('set-ft', 'Antwortzeit im Finale', 'finalTime', secs([0, 20, 30, 45, 60, 90])),
      sel('set-fa', 'Finale ab', 'finalAt', [[2, '2 Spielern'], [3, '3 Spielern']], !lobby),
      sel('set-jm', 'Joker-Ziel', 'jokerMode', [['roulette', 'Roulette (Zufall)'], ['choose', 'Selbst aussuchen']], !s.joker),
      chk('set-joker', 'Joker spielen (1 pro Spieler, max. 1 pro Runde)', 'joker', !lobby),
      chk('set-ow', 'Nur wer Fehler hatte, ist wählbar', 'onlyWrong'),
      chk('set-hb', 'Übrige Herzen zählen im Finale als Startpunkte', 'heartBonus', !lobby),
      chk('set-ov', 'Ausgeschiedene stimmen weiter mit', 'outVote'),
      chk('set-an', 'Nach dem Bewerten automatisch zur nächsten Frage', 'autoNext'));
    const open = this.ui.settingsOpen == null ? lobby : this.ui.settingsOpen;
    return h('details', { class: 'card details', open: open || undefined, ontoggle: ev => { this.ui.settingsOpen = ev.target.open; } }, h('summary', null, 'Einstellungen'), grid);
  }
  help() {
    return h('div', { class: 'kbd-help' }, 'Tasten: ', h('kbd', null, 'R'), ' richtig · ', h('kbd', null, 'F'), ' falsch · ', h('kbd', null, 'Leertaste'), ' weiter · ', h('kbd', null, 'A'), ' andere Frage · ', h('kbd', null, 'J'), ' Joker · ', h('kbd', null, 'P'), ' Pause · ', h('kbd', null, 'B'), ' nur Bühne · ', h('kbd', null, 'M'), ' Ton');
  }
}

// ----- Wahlkabine: geheime Abstimmung auf einem Gerät -----
function openBooth(ctl) {
  const e = ctl.e;
  const queue = () => e.eligible().filter(id => !(id in e.G.votes) && !ctl.isConnected(id));
  let step = 'hand', cur = queue()[0] || null, sel = null;
  const modal = openModal(m => {
    const v = e.G.vote;
    if (!v || !v.open) return [h('h2', null, 'Wahlkabine'), h('p', null, 'Das Voting ist geschlossen.'), h('button', { class: 'btn primary', onclick: m.close }, 'Schließen')];
    if (!cur) return [h('h2', null, 'Alle Stimmen sind drin!'), h('div', { class: 'row end' }, h('button', { class: 'btn', onclick: m.close }, 'Schließen'), h('button', { class: 'btn primary', onclick: () => { m.close(); e.reveal(); } }, 'Jetzt auflösen'))];
    const p = e.player(cur);
    if (step === 'hand') return [
      h('div', { class: 'tiny muted' }, 'WAHLKABINE'),
      h('div', { class: 'big' }, 'Gib das Gerät an'),
      h('div', { class: 'big', style: `color:${p.color}` }, p.avatar + ' ' + p.name.toUpperCase()),
      h('p', { class: 'muted' }, 'Alle anderen bitte wegschauen.'),
      h('button', { class: 'btn primary big block', onclick: () => { step = 'choose'; sel = null; m.render(); } }, `Ich bin ${p.name} – weiter`),
      h('button', { class: 'btn ghost block', onclick: () => { const q = queue(); const i = q.indexOf(cur); cur = q[i + 1] || null; step = 'hand'; m.render(); } }, 'Überspringen')];
    if (step === 'choose') {
      const wr = (e.G.review && e.G.review.wrongs) || [];
      return [
        h('div', { class: 'big' }, `${p.name}, wer hat die dümmste Antwort gegeben?`),
        h('div', { class: 'opts' }, v.cands.filter(c => c !== cur).map(c => {
          const x = e.player(c), ws = wr.filter(w => w.pid === c);
          return h('button', { class: 'vote-opt', 'aria-pressed': String(sel === c), onclick: () => { sel = c; m.render(); } },
            h('div', { class: 'top' }, h('span', { class: 'avatar-dot', style: `--pc:${x.color}` }, x.avatar), x.name),
            ws.map(w => h('div', { class: 'w' }, w.q + (w.given ? ` → „${w.given}“` : ''))));
        })),
        h('button', { class: 'btn bad big block', disabled: !sel, onclick: () => { e.castVote(cur, sel); step = 'done'; m.render(); setTimeout(() => { cur = queue()[0] || null; step = 'hand'; if (modalStack.includes(modal)) m.render(); }, 900); } }, 'Stimme abgeben')];
    }
    return [h('div', { class: 'big' }, 'Danke!'), h('p', { class: 'muted' }, 'Deine Stimme ist gespeichert.')];
  }, { cls: 'booth', sticky: true });
  modal.box.closest('.modal-back').dataset.sticky = '1';
  const closeBtn = h('button', { class: 'btn small ghost', style: 'align-self:flex-end', onclick: () => modal.close() }, 'Wahlkabine schließen');
  const origRender = modal.render; modal.render = () => { origRender(); modal.box.appendChild(closeBtn); };
  modal.render();
}

// =========================================================================
//  Mitspieler-Ansicht
// =========================================================================
class PlayerPanel {
  constructor(root, ctl) { this.root = root; this.ctl = ctl; this.confirmJoker = false; this.sendT = null; this.lastSig = ''; guardPointer(this); }
  render(force) {
    if (this.down) { this.pending = force ? true : 'soft'; return; }
    if (force === 'soft') force = false;
    const c = this.ctl, S = c.S;
    const sig = JSON.stringify([c.status, c.spectator, c.reason, c.kicked, c.err && (c.err.message || c.err.type), S ? Object.assign({}, S, { now: 0, fx: null }) : null, c.me, this.confirmJoker, Sfx.on]);
    if (!force && sig === this.lastSig) return;
    this.lastSig = sig;
    const ae = document.activeElement, keep = {};
    $$('[data-keep]', this.root).forEach(i => { keep[i.id] = i.value; });
    const focus = ae && ae.id && this.root.contains(ae) ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
    const scroll = this.root.scrollTop;
    this.root.textContent = '';
    appendAll(this.root, this.build());
    Object.keys(keep).forEach(id => { const el = document.getElementById(id); if (el && el.dataset.keep !== undefined && !el.disabled) el.value = keep[id]; });
    if (focus) { const el = document.getElementById(focus.id); if (el) { el.focus(); try { if (focus.s != null) el.setSelectionRange(focus.s, focus.e); } catch (x) { /* egal */ } } }
    this.root.scrollTop = scroll;
  }
  build() {
    const c = this.ctl, S = c.S, me = c.me;
    const statusTxt = { connecting: 'Verbinde …', open: 'Verbunden', reconnecting: 'Verbindung wackelt – verbinde neu …', nohost: 'Kein Spiel mit diesem Code gefunden – warte auf den Moderator …', stale: 'Keine Antwort vom Moderator …', error: 'Verbindung fehlgeschlagen' }[c.status] || c.status;
    const head = h('div', { class: 'pp-head' }, h('div', { html: logoHTML() }), h('div', { class: 'stack', style: 'align-items:flex-end;gap:2px' }, h('span', { class: 'pp-timer', id: 'pp-timer' }, ''), h('span', { class: 'tiny muted' }, S ? (S.phase === 'lobby' ? 'Lobby' : ['finalIntro', 'final', 'end'].includes(S.phase) ? 'Finale' : 'Runde ' + S.round) : '')));
    const status = h('div', { class: 'status-line' }, h('span', { class: 'pill ' + (c.status === 'open' ? 'live' : c.status === 'error' ? 'err' : 'warn') }, statusTxt), h('span', null, 'Code ' + c.code));
    const out = [head, status];
    if (c.kicked) { out.push(h('div', { class: 'card' }, h('p', null, c.kicked), h('button', { class: 'btn', onclick: () => App.home() }, 'Zur Startseite'))); return out; }
    if (c.status === 'error') { out.push(h('div', { class: 'card stack' }, h('p', null, netErrorText(c.err)), h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => App.join(c.code, c.profile) }, 'Nochmal versuchen'), h('button', { class: 'btn ghost', onclick: () => App.home() }, 'Zurück')))); return out; }
    if (!S) { out.push(h('div', { class: 'card' }, h('p', { class: 'muted' }, c.status === 'nohost' ? 'Prüfe den Code. Sobald der Moderator das Spiel eröffnet, geht es automatisch weiter.' : 'Einen Moment …'), h('button', { class: 'btn ghost small', onclick: () => App.home() }, 'Abbrechen'))); return out; }
    const mine = me && me.id ? playerById(S, me.id) : null;
    if (c.spectator || !mine) out.push(h('div', { class: 'card small' }, c.reason || 'Du schaust zu.'));
    else out.push(h('div', { class: 'card me-card', style: `--pc:${mine.color}` }, h('span', { class: 'avatar-dot' }, mine.avatar), h('div', { class: 'grow' }, h('div', { class: 'nm' }, mine.name), h('div', { html: heartsInline(mine.hearts, S.s.lives) })), S.s.joker ? h('span', { class: 'pill ' + (mine.joker ? 'warn' : '') }, mine.joker ? 'Joker bereit' : 'Joker weg') : null));
    if (mine && mine.out && S.phase !== 'end') out.push(h('div', { class: 'card', style: 'border-color:rgba(255,77,94,.5)' }, h('b', null, 'Du bist raus.'), h('div', { class: 'small muted' }, 'Schau weiter zu – vielleicht fliegt gleich der Nächste.')));
    if (c.camEl && mine) { out.push(c.camEl); c.camEl.play().catch(() => { /* Autoplay blockiert */ }); }
    out.push(this.phaseCard(S, me, mine));
    out.push(this.roster(S, me));
    out.push(h('div', { class: 'row' }, camOk() && mine ? h('button', { class: 'btn small ' + (c.cam ? 'gold' : 'ghost'), disabled: !!c.camBusy, onclick: () => c.camToggle() }, c.camBusy ? 'Kamera startet …' : c.cam ? 'Kamera aus' : 'Kamera an') : null, h('button', { class: 'btn small ghost', onclick: showRules }, 'Regeln'), h('button', { class: 'btn small ghost', onclick: () => { Sfx.on = !Sfx.on; store.set('ddf-sound', Sfx.on); App.syncSound(); this.render(true); } }, Sfx.on ? 'Ton an' : 'Ton aus'), h('button', { class: 'btn small ghost', onclick: () => confirmModal('Spiel verlassen?', 'Du kannst später mit demselben Namen wieder beitreten.', 'Verlassen', () => App.home()) }, 'Verlassen')));
    return out;
  }
  phaseCard(S, me, mine) {
    const ph = S.phase, myId = me && me.id;
    if (ph === 'lobby') return h('div', { class: 'card' }, h('b', null, 'Du bist dabei!'), h('div', { class: 'small muted' }, 'Warte, bis der Moderator das Spiel startet.'));
    if (ph === 'turn' && S.turn) {
      const t = S.turn, p = playerById(S, t.pid), isMe = t.pid === myId;
      if (S.roulette) { const f = playerById(S, S.roulette.from); return h('div', { class: 'turn-banner' }, h('b', null, 'Joker-Roulette!'), h('div', { class: 'small muted' }, `${f ? f.name : '?'} hat den Joker gezogen …`)); }
      const kids = [h('div', { class: 'row' }, h('span', { class: 'avatar-dot', style: `--pc:${p ? p.color : '#888'}` }, p ? p.avatar : '?'), h('b', null, isMe ? 'DU BIST DRAN!' : `${p ? p.name : '?'} ist dran`), t.jokerFrom ? h('span', { class: 'pill warn' }, 'per Joker') : null)];
      if (t.flag) kids.push(h('div', { class: 'flag-mini', html: flagHTML(t.flag) }));
      kids.push(h('div', { class: 'big-q' }, t.q));
      if (t.result) kids.push(h('div', { class: 'result-chip ' + t.result }, (t.result === 'right' ? '✓ Korrekt' : '✗ Falsch') + (t.a ? ' · ' + t.a : '')));
      if (isMe && me.canJoker) {
        if (me.jokerTargets) kids.push(h('div', { class: 'stack' }, h('div', { class: 'small muted' }, 'Joker: Wer soll die Frage bekommen?'), h('div', { class: 'row' }, me.jokerTargets.map(id => { const x = playerById(S, id); return h('button', { class: 'btn small gold', onclick: () => this.ctl.send({ t: 'joker', target: id }) }, x.avatar + ' ' + x.name); }))));
        else if (!this.confirmJoker) kids.push(h('button', { class: 'btn gold big block', onclick: () => { this.confirmJoker = true; this.render(true); setTimeout(() => { this.confirmJoker = false; this.render(true); }, 4000); } }, 'Joker einsetzen'));
        else kids.push(h('button', { class: 'btn gold big block', onclick: () => { this.confirmJoker = false; this.ctl.send({ t: 'joker' }); } }, 'Wirklich? Tippen zum Bestätigen'));
      }
      return h('div', { class: 'turn-banner' + (isMe ? ' mine' : '') }, kids);
    }
    if (ph === 'review') return h('div', { class: 'card stack' }, h('b', null, 'Runde vorbei – gleich wird abgestimmt.'), this.wrongs(S, S.review ? S.review.wrongs : []));
    if ((ph === 'vote' || ph === 'tb') && S.vote) {
      const v = S.vote;
      if (!me || !me.canVote) return h('div', { class: 'card stack' }, h('b', null, v.revote ? 'Stichwahl läuft' : 'Voting läuft'), h('div', { class: 'small muted' }, v.voters.includes(myId) && !v.open ? 'Die Zeit ist um.' : 'Du stimmst diesmal nicht ab.'), h('div', { class: 'small' }, `${v.voted.length} Stimmen abgegeben`));
      const wr = (S.review && S.review.wrongs) || [];
      return h('div', { class: 'card stack' },
        h('b', null, v.revote ? 'Stichwahl: Wer war dümmer?' : 'Wer hat die dümmste Antwort gegeben?'),
        h('div', { class: 'small muted' }, me.vote ? 'Deine Stimme ist drin – du kannst sie bis Zeitende ändern.' : 'Tippe auf eine Person. Die Wahl ist geheim.'),
        v.cands.filter(id => id !== myId).map(id => {
          const x = playerById(S, id), ws = wr.filter(w => w.pid === id);
          return h('button', { class: 'vote-opt', 'aria-pressed': String(me.vote === id), onclick: () => this.ctl.send({ t: 'vote', target: id }) },
            h('div', { class: 'top' }, h('span', { class: 'avatar-dot', style: `--pc:${x.color}` }, x.avatar), x.name, me.vote === id ? h('span', { class: 'pill err', style: 'margin-left:auto' }, 'deine Stimme') : null),
            ws.map(w => h('div', { class: 'w' }, w.q + (w.given ? ` → „${w.given}“` : '') + ' · richtig: ' + w.a)));
        }));
    }
    if (ph === 'reveal' && S.reveal) {
      const r = S.reveal, L = playerById(S, r.loser);
      const ent = Object.keys(r.counts || {}).sort((a, b) => r.counts[b] - r.counts[a]);
      return h('div', { class: 'card stack' }, h('b', null, 'Ergebnis'),
        r.none ? h('div', null, 'Niemand verliert ein Herz.') : h('div', { class: 'stack' }, ent.map(id => { const x = playerById(S, id); return h('div', { class: 'row' }, h('span', { class: 'avatar-dot', style: `--pc:${x.color}` }, x.avatar), h('span', { class: 'grow' }, x.name), h('b', null, r.counts[id])); })),
        L && r.applied ? h('div', { style: 'color:var(--bad);font-weight:700' }, L.out ? `${L.name} fliegt raus!` : `${L.name} verliert ein Herz.`) : null,
        !L && r.tied && r.tied.length ? h('div', { class: 'small muted' }, 'Gleichstand – der Moderator entscheidet, wie es weitergeht.') : null);
    }
    if (ph === 'finalIntro' && S.final) {
      const f = S.final;
      return h('div', { class: 'card stack' }, h('b', null, 'FINALE!'), f.pids.map(id => { const x = playerById(S, id); return h('div', { class: 'row' }, h('span', { class: 'avatar-dot', style: `--pc:${x.color}` }, x.avatar), h('span', { class: 'grow' }, x.name), h('span', { class: 'pill warn' }, f.start[id] + ' Startpunkte')); }));
    }
    if (ph === 'final' && S.final && S.final.q) {
      const f = S.final, isFin = me && me.isFinalist;
      const kids = [h('div', { class: 'row' }, h('b', { class: 'grow' }, f.sd ? 'Entscheidungsfrage' : `Finalfrage ${f.i + 1}/${f.n}`), h('span', { class: 'pill' }, f.active.map(id => `${(playerById(S, id) || {}).name} ${f.score[id]}`).join(' : ')))];
      if (f.q.est) kids.push(h('span', { class: 'pill warn' }, 'Schätzfrage – wer näher dran ist, punktet'));
      if (f.q.flag) kids.push(h('div', { class: 'flag-mini', html: flagHTML(f.q.flag) }));
      kids.push(h('div', { class: 'big-q' }, f.q.q));
      if (isFin && !f.revealed) {
        const locked = me.final && me.final.locked;
        if (locked) kids.push(h('div', { class: 'result-chip right' }, 'Eingeloggt: ' + (me.final.text || '—')));
        else {
          const id = 'final-in-' + f.histLen + '-' + f.i;
          const inp = h('input', { class: 'inp', id, 'data-keep': '', maxlength: 80, placeholder: 'Deine Antwort', autocomplete: 'off', value: me.final ? me.final.text : '',
            oninput: ev => { clearTimeout(this.sendT); const val = ev.target.value; this.sendT = setTimeout(() => this.ctl.send({ t: 'final', text: val, lock: false }), 350); },
            onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); this.lockFinal(id); } } });
          kids.push(inp, h('button', { class: 'btn primary big block', onclick: () => this.lockFinal(id) }, 'Einloggen'));
        }
      } else if (f.revealed) {
        kids.push(h('div', { class: 'small muted' }, 'Richtig: ' + (f.q.a || '')));
        f.active.forEach(id => { const x = playerById(S, id), m = f.marks[id]; kids.push(h('div', { class: 'row' }, h('span', { class: 'avatar-dot', style: `--pc:${x.color}` }, x.avatar), h('span', { class: 'grow' }, `${x.name}: ${f.ans[id] || '—'}`), h('b', { style: `color:${m === true ? 'var(--ok)' : m === false ? 'var(--bad)' : 'var(--muted)'}` }, m === true ? '✓' : m === false ? '✗' : '…'))); });
      } else kids.push(h('div', { class: 'small muted' }, f.active.map(id => `${(playerById(S, id) || {}).name}: ${f.locked[id] ? 'eingeloggt' : f.typing[id] ? 'tippt …' : 'denkt nach'}`).join(' · ')));
      return h('div', { class: 'turn-banner' + (isFin && !f.revealed ? ' mine' : '') }, kids);
    }
    if (ph === 'end') {
      const w = playerById(S, S.winner);
      return h('div', { class: 'card stack' }, h('b', null, w ? `${w.avatar} ${w.name} gewinnt!` : 'Spielende'), h('ol', { class: 'small', style: 'margin:0;padding-left:20px' }, (S.ranking || []).map((id, i, a) => h('li', null, (playerById(S, id) || {}).name, i === a.length - 1 && a.length > 2 ? ' – der Dümmste' : ''))));
    }
    return null;
  }
  lockFinal(id) { const el = document.getElementById(id); clearTimeout(this.sendT); this.ctl.send({ t: 'final', text: el ? el.value : '', lock: true }); }
  wrongs(S, list) {
    if (!list.length) return h('div', { class: 'small', style: 'color:var(--ok)' }, 'Alle hatten alles richtig!');
    return h('div', { class: 'wronglist' }, list.map(w => { const p = playerById(S, w.pid); return h('div', { class: 'wrong-item' }, h('b', null, p ? p.name : '?'), h('div', { class: 'q' }, w.q), h('div', { class: 'a' }, (w.given ? `„${w.given}“ · ` : '') + 'richtig: ' + w.a)); }));
  }
  roster(S, me) {
    const list = S.players;
    return h('div', { class: 'card' }, h('h3', null, 'Spieler'), h('div', { class: 'roster' }, list.map(p => {
      const turn = S.phase === 'turn' && S.turn && S.turn.pid === p.id;
      return h('div', { class: 'r' + (turn ? ' turn' : '') + (p.out ? ' out' : '') },
        h('span', { class: 'avatar-dot', style: `--pc:${p.color}` }, p.avatar), h('span', { class: 'nm' }, p.name + (me && me.id === p.id ? ' (du)' : '')),
        h('span', { class: 'mini-dots' }, (p.dots || []).map(d => h('i', { class: d.r || '' }))),
        h('span', { html: heartsInline(p.hearts, S.s.lives) }));
    })));
  }
  frame() {
    const el = document.getElementById('pp-timer'), S = this.ctl.S; if (!el || !S) return;
    const t = S.timer, show = t && ['turn', 'vote', 'tb', 'final'].includes(S.phase) && !S.roulette;
    if (!show) { if (el.textContent) el.textContent = ''; return; }
    const left = t.paused ? t.left : Math.max(0, t.end - (Date.now() + this.ctl.offset));
    const txt = t.expired ? '00:00' : fmtClock(left); if (el.textContent !== txt) el.textContent = txt;
    el.classList.toggle('warn', !t.paused && left <= 5000);
  }
}

// =========================================================================
//  App-Steuerung & Bildschirme
// =========================================================================
const App = {
  root: null, host: null, hostView: null, player: null, stage: null, cleanup: [],
  clear() {
    this.cleanup.forEach(fn => { try { fn(); } catch (e) { /* egal */ } }); this.cleanup = [];
    modalStack.slice().forEach(m => m.close());
    this.root.textContent = '';
  },
  syncSound() { if (this.hostView && this.hostView.stage) this.hostView.stage.opts.sound = Sfx.on; if (this.playerStage) this.playerStage.opts.sound = Sfx.on && !!this.playerSound; },
  // ---------- Startseite ----------
  home() {
    if (this.player) { this.player.close(); this.player = null; }
    if (this.host) { this.host.destroy(); this.host = null; this.hostView = null; }
    if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* egal */ } }
    this.clear();
    const bg = h('div', { class: 'bg', 'aria-hidden': 'true' });
    const saved = store.get('ddf-host', null);
    const canResume = saved && saved.G && saved.G.phase && saved.G.phase !== 'end' && saved.G.players && saved.G.players.length && Date.now() - (saved.savedAt || 0) < 1000 * 60 * 60 * 12;
    const prof = store.get('ddf-player', null);
    const card = h('div', { class: 'home-card' },
      h('div', { html: logoHTML() }),
      h('p', { class: 'tagline' }, 'Das Quiz, bei dem nicht der verliert, der am meisten falsch hat – sondern wer die dümmste Antwort gibt.'),
      h('div', { class: 'choices' },
        h('button', { class: 'choice', onclick: () => this.chooseMode() }, h('span', { class: 'ico' }, '🎙️'), h('div', null, h('b', null, 'Spiel moderieren'), h('span', null, 'Fragen stellen, bewerten, Voting leiten'))),
        h('button', { class: 'choice', onclick: () => this.joinScreen() }, h('span', { class: 'ico' }, '📱'), h('div', null, h('b', null, 'Spiel beitreten'), h('span', null, 'Mit Code als Mitspieler auf Handy oder PC'))),
        canResume ? h('button', { class: 'choice', onclick: () => this.startHost(null, saved.G) }, h('span', { class: 'ico' }, '⏯️'), h('div', null, h('b', null, 'Letztes Spiel fortsetzen'), h('span', null, `${saved.G.phase === 'lobby' ? 'Lobby' : saved.G.phase.startsWith('final') ? 'Finale' : 'Runde ' + saved.G.round} · ${saved.G.players.length} Spieler`))) : null,
        prof && prof.code ? h('button', { class: 'choice', onclick: () => this.join(prof.code, prof) }, h('span', { class: 'ico' }, '↩️'), h('div', null, h('b', null, `Wieder beitreten: ${prof.code}`), h('span', null, `als ${prof.avatar || ''} ${prof.name}`))) : null),
      h('div', { class: 'rules-mini' }, h('b', null, 'Kurz erklärt'), h('ul', null,
        h('li', null, '3 Herzen, pro Runde 2 Fragen für jeden, 30 Sekunden Zeit.'),
        h('li', null, 'Nach jeder Runde geheimes Voting: Die dümmste Antwort kostet ein Herz.'),
        h('li', null, 'Joker gibt deine Frage per Roulette an jemand anderen weiter – danach bekommst du eine neue Frage.'),
        h('li', null, 'Die letzten zwei spielen das Finale – übrige Herzen zählen als Punkte.')),
        h('button', { class: 'btn small ghost', style: 'margin-top:8px', onclick: showRules }, 'Alle Regeln')));
    this.root.appendChild(h('div', { class: 'home' }, bg, h('div', { class: 'front' }, card)));
    const demo = new StageView(bg, { sound: false });
    demo.update(demoState(), 0);
    this.cleanup.push(() => demo.destroy());
  },
  chooseMode() {
    const av = onlineAvailability();
    openModal(m => [
      h('h2', null, 'Wie wollt ihr spielen?'),
      h('button', { class: 'choice', onclick: () => { m.close(); this.startHost('local'); } }, h('span', { class: 'ico' }, '🖥️'), h('div', null, h('b', null, 'Auf einem Gerät'), h('span', null, 'Alle schauen auf einen Bildschirm oder du teilst ihn auf Discord. Abgestimmt wird in der Wahlkabine oder du trägst die Stimmen ein.'))),
      h('button', { class: 'choice', disabled: !av.ok, onclick: () => { m.close(); this.startHost('online'); } }, h('span', { class: 'ico' }, '🌐'), h('div', null, h('b', null, 'Online mit Code'), h('span', null, av.ok ? 'Mitspieler treten mit Handy oder PC bei: Joker drücken, geheim abstimmen, im Finale tippen.' : av.why))),
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: m.close }, 'Abbrechen'))
    ]);
  },
  // ---------- Moderator ----------
  startHost(mode, G) {
    this.clear();
    const engine = new Engine(G ? JSON.parse(JSON.stringify(G)) : Engine.fresh(mode || 'local'));
    if (G) { engine.G.players.forEach(p => { p.conn = false; p.cam = null; }); }
    const ctl = new HostCtl(engine); this.host = ctl;
    const stageArea = h('div', { class: 'stage-area' });
    const panelEl = h('div', { class: 'panel', id: 'host-panel' });
    const shell = h('div', { class: 'host' }, stageArea, panelEl);
    this.root.appendChild(shell);
    const stage = new StageView(stageArea, { sound: Sfx.on, cams: true });
    stageArea.appendChild(h('button', { class: 'btn small stage-only-hint', onclick: () => this.toggleStageOnly() }, 'Pult zeigen (B)'));
    const panel = new HostPanel(panelEl, ctl);
    this.hostView = { stage, panel, shell };
    ctl.views.add(S => { stage.update(S, 0); panel.render('auto'); });
    this.cleanup.push(() => { stage.destroy(); });
    ctl.publishNow();
    if (engine.G.mode === 'online') ctl.goOnline();
    window.__ddf = { engine, ctl };
  },
  endHost() {
    const done = () => { store.del('ddf-host'); this.home(); };
    const G = this.host && this.host.e.G;
    if (G && (G.mode === 'online' || !['lobby', 'end'].includes(G.phase))) return confirmModal('Spiel beenden?', G.mode === 'online' ? 'Der Spielstand wird gelöscht und die Mitspieler werden getrennt.' : 'Der Spielstand wird gelöscht.', 'Beenden', done);
    done();
  },
  toggleStageOnly() { if (!this.hostView) return; this.hostView.shell.classList.toggle('stage-only'); setTimeout(() => this.hostView && this.hostView.stage.fit(), 30); },
  // ---------- Beitreten ----------
  joinScreen(code) {
    this.clear();
    const prof = store.get('ddf-player', {}) || {};
    let avatar = prof.avatar && AVATARS.includes(prof.avatar) ? prof.avatar : pick(AVATARS);
    const codeIn = h('input', { class: 'inp', id: 'join-code', maxlength: 4, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'ABCD', value: code || '', style: 'font-family:var(--font-display);font-size:28px;letter-spacing:.2em;text-transform:uppercase;text-align:center' });
    const nameIn = h('input', { class: 'inp', id: 'join-name', maxlength: 16, autocomplete: 'nickname', placeholder: 'Dein Name', value: prof.name || '' });
    const grid = h('div', { class: 'avatar-grid', role: 'group', 'aria-label': 'Avatar wählen' });
    const drawGrid = () => { grid.textContent = ''; AVATARS.forEach(a => grid.appendChild(h('button', { type: 'button', 'aria-pressed': String(a === avatar), 'aria-label': 'Avatar ' + a, onclick: () => { avatar = a; drawGrid(); } }, a))); };
    drawGrid();
    const av = onlineAvailability();
    const go = ev => {
      if (ev) ev.preventDefault();
      const c = codeIn.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), n = cleanName(nameIn.value);
      if (c.length !== 4) { toast('Der Code hat 4 Zeichen.'); codeIn.focus(); return; }
      if (!n) { toast('Bitte gib einen Namen ein.'); nameIn.focus(); return; }
      const same = prof.code === c && prof.name === n;
      this.join(c, { name: n, avatar, pid: same ? prof.pid : null });
    };
    const form = h('form', { class: 'home-card', onsubmit: go },
      h('div', { html: logoHTML() }),
      h('h2', { style: 'font-size:20px;text-align:center' }, 'Spiel beitreten'),
      !av.ok ? h('p', { class: 'small', style: 'color:var(--gold)' }, av.why) : null,
      h('label', { class: 'field', for: 'join-code' }, 'Spielcode vom Moderator', codeIn),
      h('label', { class: 'field', for: 'join-name' }, 'Name', nameIn),
      h('div', { class: 'field' }, 'Avatar', grid),
      h('button', { class: 'btn primary big block', type: 'submit', disabled: !av.ok }, 'Beitreten'),
      h('button', { class: 'btn ghost block', type: 'button', onclick: () => this.home() }, 'Zurück'));
    this.root.appendChild(h('div', { class: 'home' }, h('div', { class: 'front' }, form)));
    setTimeout(() => (code ? nameIn : codeIn).focus(), 50);
  },
  join(code, profile) {
    if (this.player) { this.player.close(); this.player = null; }
    this.clear();
    try { history.replaceState(null, '', location.pathname + location.search + '#join-' + code); } catch (e) { /* egal */ }
    const ctl = new PlayerCtl(code, Object.assign({}, profile)); this.player = ctl;
    const stageArea = h('div', { class: 'stage-area' });
    const panelEl = h('div', { class: 'panel' });
    this.root.appendChild(h('div', { class: 'player' }, stageArea, panelEl));
    const panel = new PlayerPanel(panelEl, ctl);
    let stage = null;
    const wide = () => window.innerWidth > 1100;
    const ensureStage = () => { if (!stage && wide()) { stage = new StageView(stageArea, { sound: false }); this.playerStage = stage; if (ctl.S) stage.update(ctl.S, ctl.offset); } };
    ensureStage();
    const onResize = () => ensureStage(); window.addEventListener('resize', onResize);
    ctl.on(() => { panel.render(); if (stage && ctl.S) stage.update(ctl.S, ctl.offset); });
    let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); panel.frame(); }; loop();
    this.cleanup.push(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); if (stage) stage.destroy(); this.playerStage = null; });
    panel.render();
    ctl.connect();
    window.__ddfp = ctl;
  },
  // ---------- Nur Bühne (zweiter Tab) ----------
  stageOnly() {
    this.clear();
    const area = h('div', { class: 'stage-area', style: 'position:fixed;inset:0' });
    this.root.appendChild(area);
    const stage = new StageView(area, { sound: false, cams: true });
    const wait = h('div', { class: 'toast', style: 'bottom:auto;top:16px' }, 'Warte auf den Moderator-Tab in diesem Browser …');
    document.body.appendChild(wait);
    const snd = h('button', { class: 'btn small', style: 'position:fixed;right:12px;bottom:12px;z-index:5;opacity:.6' }, 'Ton aus');
    snd.onclick = () => { Sfx.unlock(); stage.opts.sound = !stage.opts.sound; snd.textContent = stage.opts.sound ? 'Ton an' : 'Ton aus'; };
    document.body.appendChild(snd);
    const mirror = new Mirror('stage');
    mirror.onState = S => { wait.remove(); stage.update(S, 0); };
    mirror.send({ t: 'hello' });
    const iv = setInterval(() => { if (!stage.S) mirror.send({ t: 'hello' }); }, 2000);
    this.cleanup.push(() => { clearInterval(iv); stage.destroy(); wait.remove(); snd.remove(); });
  }
};

function demoState() {
  const P = (id, name, avatar, color, hearts, dots, joker = true) => ({ id, name, avatar, color, hearts, joker, out: hearts === 0, outOrder: 0, conn: true, device: false, dots: dots.map(r => ({ r })) });
  return {
    v: 1, phase: 'turn', round: 3, mode: 'local', code: null, host: 'Demo',
    s: { lives: 3, qpp: 2, joker: true, jokerMode: 'roulette', onlyWrong: true, finalQuestions: 10, heartBonus: true },
    players: [
      P('a', 'Anna', '🦊', COLORS[0], 3, ['right', 'now']), P('b', 'Ben', '🐸', COLORS[1], 2, ['wrong', null], false), P('c', 'Cem', '🐼', COLORS[2], 3, ['right', null]),
      P('d', 'Dana', '🦉', COLORS[3], 1, ['right', null]), P('e', 'Emil', '🐙', COLORS[4], 2, ['wrong', null]), P('f', 'Fiona', '🦄', COLORS[5], 3, ['right', null]),
      P('g', 'Gregor', '🐢', COLORS[6], 0, []), P('h', 'Hannah', '🐝', COLORS[7], 2, ['right', null])
    ],
    turn: { i: 9, n: 14, pid: 'a', q: 'Welches Tier kann seine Augen unabhängig voneinander bewegen?', flag: null, result: null, given: '', a: null, jokerFrom: null, next: 'b' },
    roulette: null, jokerUsed: null, timer: { end: Date.now() + 24000, dur: 30000, paused: true, left: 24000, expired: false },
    review: null, vote: null, reveal: null, final: null, winner: null, ranking: null, fx: null, now: Date.now()
  };
}

// ---------- Tastatur für den Moderator ----------
document.addEventListener('keydown', ev => {
  const ctl = App.host; if (!ctl || !App.hostView || modalStack.length) return;
  const tg = ev.target;
  if (tg && tg.matches && tg.matches('input, textarea, select')) { if (ev.key === 'Escape') tg.blur(); return; }
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const k = ev.key.toLowerCase(), e = ctl.e, G = e.G, panel = App.hostView.panel;
  if ((k === ' ' || k === 'enter') && tg && tg.closest && tg.closest('button, a, summary')) return;
  let handled = true;
  if (k === 'r' && G.phase === 'turn') panel.markFromPanel('right');
  else if (k === 'f' && G.phase === 'turn') panel.markFromPanel('wrong');
  else if (k === 'a') { if (G.phase === 'turn') e.swapQuestion(); else if (G.phase === 'final') e.finalSwap(); }
  else if (k === 'j' && G.phase === 'turn') panel.hostJoker();
  else if (k === 'p') e.pauseTimer();
  else if (k === 'b') App.toggleStageOnly();
  else if (k === 'm') { Sfx.on = !Sfx.on; store.set('ddf-sound', Sfx.on); App.syncSound(); panel.render(); toast(Sfx.on ? 'Ton an' : 'Ton aus', 1200); }
  else if (k === ' ' || k === 'enter') {
    const t = e.cur();
    if (G.phase === 'turn' && t && t.result) e.next();
    else if (G.phase === 'review') e.startVote();
    else if (G.phase === 'vote' || G.phase === 'tb') e.reveal();
    else if (G.phase === 'reveal') e.proceed();
    else if (G.phase === 'finalIntro') e.finalQuestion();
    else if (G.phase === 'final') { if (!G.final.revealed) e.finalReveal(); else e.finalNext(); }
    else handled = false;
  } else handled = false;
  if (handled) ev.preventDefault();
});

// ---------- Start ----------
async function detectServer() {
  // server.js markiert die ausgelieferte Seite – so braucht es keine Test-Anfrage
  ENV.server = ENV.isHttp && !ENV.inClaude && document.documentElement.getAttribute('data-ddf-server') === '1';
}
function route(data) {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (hash === 'buehne') return App.stageOnly();
  const m = hash.match(/^join-([a-z0-9]{4})$/i);
  if (m) {
    const prof = store.get('ddf-player', null);
    if (prof && prof.code === m[1].toUpperCase() && prof.name) return App.join(prof.code, prof);
    return App.joinScreen(m[1].toUpperCase());
  }
  if (data && data.G && data.G.players) return App.startHost(null, data.G);
  App.home();
}
async function start(data) {
  App.root = document.getElementById('app');
  await detectServer();
  route(data);
}
window.addEventListener('hashchange', () => {
  const hash = location.hash.replace(/^#/, '');
  if (hash === 'buehne' && !App.host) App.stageOnly();
});
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
})();
