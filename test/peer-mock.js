// Nachbildung der PeerJS-API über BroadcastChannel (nur für Tests im selben Browser-Kontext)
(() => {
  const bc = new BroadcastChannel('peer-mock-v1');
  const peers = {};      // registrierte Peers dieser Seite
  const pending = {};    // claim -> Peer
  const rid = () => Math.random().toString(36).slice(2, 10);
  class Em {
    constructor() { this._h = {}; }
    on(ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); return this; }
    off(ev) { delete this._h[ev]; return this; }
    emit(ev, ...a) { (this._h[ev] || []).slice().forEach(f => { try { f(...a); } catch (e) { console.error(e); } }); }
  }
  const err = (type, msg) => Object.assign(new Error(msg), { type });
  class DataConnection extends Em {
    constructor(local, remote, cid, opts) { super(); this._local = local; this.peer = remote; this.connectionId = cid; this.open = false; this.serialization = (opts && opts.serialization) || 'binary'; this.reliable = true; this.metadata = opts && opts.metadata; }
    send(data) { if (!this.open) throw err('not-open', 'Connection is not open'); bc.postMessage({ t: 'data', to: this.peer, from: this._local.id, cid: this.connectionId, data: JSON.parse(JSON.stringify(data)) }); }
    close() { if (this._closed) return; this._closed = true; const was = this.open; this.open = false; bc.postMessage({ t: 'close', to: this.peer, from: this._local.id, cid: this.connectionId }); delete this._local._conns[this.connectionId]; if (was || true) this.emit('close'); }
  }
  class Peer extends Em {
    constructor(id, opts) {
      super();
      if (id && typeof id === 'object') { opts = id; id = null; }
      this.id = id || 'mock-' + rid(); this.options = opts || {}; this._conns = {};
      this.destroyed = false; this.disconnected = false; this.open = false;
      const claim = rid(); this._claim = claim; pending[claim] = this;
      bc.postMessage({ t: 'claim', id: this.id, claim });
      setTimeout(() => {
        delete pending[claim];
        if (this.destroyed) return;
        if (this._taken) { this.emit('error', err('unavailable-id', 'ID "' + this.id + '" is taken')); return; }
        this.open = true; peers[this.id] = this; this.emit('open', this.id);
      }, 160);
    }
    connect(remote, opts) {
      const cid = 'dc_' + rid(), conn = new DataConnection(this, remote, cid, opts);
      this._conns[cid] = conn;
      bc.postMessage({ t: 'connect', to: remote, from: this.id, cid, opts: { serialization: conn.serialization } });
      setTimeout(() => { if (!conn.open && !conn._closed) { delete this._conns[cid]; this.emit('error', err('peer-unavailable', 'Could not connect to peer ' + remote)); } }, 1200);
      return conn;
    }
    reconnect() { this.disconnected = false; }
    disconnect() { this.disconnected = true; this.emit('disconnected', this.id); }
    destroy() {
      if (this.destroyed) return; this.destroyed = true;
      Object.values(this._conns).forEach(c => c.close());
      delete peers[this.id]; bc.postMessage({ t: 'gone', id: this.id }); this.emit('close');
    }
  }
  bc.onmessage = ev => {
    const m = ev.data || {};
    if (m.t === 'claim') { if (peers[m.id] && !peers[m.id].destroyed) bc.postMessage({ t: 'taken', claim: m.claim }); return; }
    if (m.t === 'taken') { const p = pending[m.claim]; if (p) p._taken = true; return; }
    if (m.t === 'connect') {
      const host = peers[m.to]; if (!host || host.destroyed) return;
      const conn = new DataConnection(host, m.from, m.cid, m.opts);
      host._conns[m.cid] = conn;
      host.emit('connection', conn);
      setTimeout(() => { conn.open = true; conn.emit('open'); bc.postMessage({ t: 'accept', to: m.from, from: m.to, cid: m.cid }); }, 20);
      return;
    }
    const p = peers[m.to]; if (!p) return;
    const conn = p._conns[m.cid];
    if (m.t === 'accept' && conn) { conn.open = true; conn.emit('open'); }
    else if (m.t === 'data' && conn) conn.emit('data', m.data);
    else if (m.t === 'close' && conn) { conn.open = false; conn._closed = true; delete p._conns[m.cid]; conn.emit('close'); }
  };
  bc.addEventListener('message', ev => {
    const m = ev.data || {};
    if (m.t === 'gone') Object.values(peers).forEach(p => Object.values(p._conns).forEach(c => { if (c.peer === m.id) { c.open = false; c._closed = true; delete p._conns[c.connectionId]; c.emit('close'); } }));
  });
  window.addEventListener('pagehide', () => Object.values(peers).forEach(p => p.destroy()));
  window.Peer = Peer;
  window.__peerMock = true;
})();
