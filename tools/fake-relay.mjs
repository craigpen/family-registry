// A small in-memory Nostr relay (NIP-01) for tests and local development, so nothing
// touches public relays. Keeps the newest replaceable event per (author, kind, d).
//
//   node tools/fake-relay.mjs [port]     (default 4791)
import { WebSocketServer } from 'ws';
import { verifyEvent } from 'nostr-tools/pure';

export function startRelay(port = 4791) {
  const events = new Map(); // id -> event
  const replaceable = new Map(); // pubkey:kind:d -> id
  const subs = new Set(); // { ws, id, filters }

  const dOf = e => e.tags.find(t => t[0] === 'd')?.[1] ?? '';
  const isReplaceable = k => (k >= 30000 && k < 40000) || k === 0 || k === 3 || (k >= 10000 && k < 20000);

  function matches(e, f) {
    if (f.ids && !f.ids.includes(e.id)) return false;
    if (f.authors && !f.authors.includes(e.pubkey)) return false;
    if (f.kinds && !f.kinds.includes(e.kind)) return false;
    if (f.since && e.created_at < f.since) return false;
    if (f.until && e.created_at > f.until) return false;
    for (const [k, vals] of Object.entries(f)) {
      if (k[0] !== '#') continue;
      if (!e.tags.some(t => t[0] === k.slice(1) && vals.includes(t[1]))) return false;
    }
    return true;
  }

  function store(e) {
    if (events.has(e.id)) return 'duplicate: already have it';
    if (isReplaceable(e.kind)) {
      const key = `${e.pubkey}:${e.kind}:${dOf(e)}`;
      const old = events.get(replaceable.get(key));
      if (old && (old.created_at > e.created_at || (old.created_at === e.created_at && old.id < e.id))) return 'duplicate: have a newer one';
      if (old) events.delete(old.id);
      replaceable.set(key, e.id);
    }
    events.set(e.id, e);
    return '';
  }

  const wss = new WebSocketServer({ port });
  wss.on('connection', ws => {
    ws.on('message', raw => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      const [type, ...rest] = msg;
      if (type === 'EVENT') {
        const e = rest[0];
        if (!e || !verifyEvent(e)) { ws.send(JSON.stringify(['OK', e?.id ?? '', false, 'invalid: bad signature'])); return; }
        const dup = store(e);
        ws.send(JSON.stringify(['OK', e.id, true, dup]));
        if (!dup) for (const s of subs) if (s.filters.some(f => matches(e, f))) s.ws.send(JSON.stringify(['EVENT', s.id, e]));
      } else if (type === 'REQ') {
        const [id, ...filters] = rest;
        for (const s of subs) if (s.ws === ws && s.id === id) subs.delete(s);
        subs.add({ ws, id, filters });
        const sent = new Set();
        for (const f of filters) {
          const found = [...events.values()].filter(e => matches(e, f)).sort((a, b) => b.created_at - a.created_at).slice(0, f.limit ?? Infinity);
          for (const e of found) if (!sent.has(e.id)) { sent.add(e.id); ws.send(JSON.stringify(['EVENT', id, e])); }
        }
        ws.send(JSON.stringify(['EOSE', id]));
      } else if (type === 'CLOSE') {
        for (const s of subs) if (s.ws === ws && s.id === rest[0]) subs.delete(s);
      }
    });
    ws.on('close', () => { for (const s of subs) if (s.ws === ws) subs.delete(s); });
  });
  return { close: () => new Promise(r => wss.close(r)), events, port };
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/').replace(/^\//, '')}` || process.argv[1]?.endsWith('fake-relay.mjs')) {
  const port = Number(process.argv[2] ?? 4791);
  startRelay(port);
  console.log(`fake relay on ws://localhost:${port}`);
}
