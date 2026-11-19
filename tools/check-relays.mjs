// Checks that public relays accept and return our kind of event (PLAN.md section 6):
// kind 30078, a ~30 KB item, read back by tag. Uses a throwaway key and random
// content that expires in an hour (NIP-40). No family data is involved.
//
//   node tools/check-relays.mjs [wss://relay ...]
import { Relay } from 'nostr-tools/relay';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import { randomBytes } from 'node:crypto';

const relays = process.argv.slice(2).length ? process.argv.slice(2) : [
  'wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net', 'wss://relay.nostr.band',
  'wss://nostr.mom', 'wss://relay.snort.social', 'wss://offchain.pub', 'wss://nostr.wine',
];

const sk = generateSecretKey();
const tag = randomBytes(16).toString('hex');
const now = Math.floor(Date.now() / 1000);
const event = finalizeEvent({
  kind: 30078, created_at: now,
  tags: [['d', `relay-check:${tag}`], ['h', tag], ['expiration', String(now + 3600)]],
  content: randomBytes(22_000).toString('base64'), // ~30 KB, like an item with a photo
}, sk);

const timeout = (ms, what) => new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out`)), ms));

async function check(url) {
  const t0 = Date.now();
  let relay;
  try {
    relay = await Promise.race([Relay.connect(url), timeout(6000, 'connect')]);
    await Promise.race([relay.publish(event), timeout(8000, 'publish')]);
    const got = await Promise.race([new Promise(resolve => {
      const found = [];
      const sub = relay.subscribe([{ kinds: [30078], '#h': [tag] }], {
        onevent: e => found.push(e),
        oneose: () => { sub.close(); resolve(found); },
      });
    }), timeout(8000, 'read back')]);
    const ok = got.some(e => e.id === event.id);
    return `${ok ? 'OK  ' : 'MISS'} ${url}  ${ok ? '' : '(accepted but not returned by #h)'} ${Date.now() - t0} ms`;
  } catch (e) {
    return `FAIL ${url}  ${String(e.message ?? e).slice(0, 90)}`;
  } finally {
    relay?.close();
  }
}

console.log(`event ${event.id.slice(0, 12)}…, ${JSON.stringify(event).length} bytes`);
for (const line of await Promise.all(relays.map(check))) console.log(line);
process.exit(0);
