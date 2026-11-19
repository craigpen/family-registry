import { finalizeEvent, generateSecretKey, verifyEvent, type Event } from 'nostr-tools/pure';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import * as v from 'valibot';
import { open, seal } from './crypto.ts';
import { KIND } from './events.ts';
import { SCRYPT } from './keys.ts';

/*
 * Pairing a new device with a 6-digit code (PLAN.md section 5, "Pairing a new device").
 * The signed-in device posts its person's words to the relays, encrypted with a key slowly
 * derived from the code, under a d tag also derived from it, from a throwaway key, expiring
 * in 10 minutes. The new device types the code, finds the event and opens it.
 *
 * Family-grade: a code is a million guesses, each slowed by scrypt, inside a 10-minute window.
 */

export const PAIR_MINUTES = 10;
const SALT = { tag: 'family-registry/pair-tag/v1', key: 'family-registry/pair-key/v1' } as const;

export const PairingV1 = v.object({
  v: v.literal(1),
  name: v.optional(v.string(), ''),
  member: v.array(v.string()),
  groups: v.pipe(v.array(v.object({ words: v.array(v.string()), organizer: v.array(v.string()) })), v.minLength(1)),
});
export type Pairing = v.InferOutput<typeof PairingV1>;

/** Six random digits, e.g. "482913". */
export function newPairCode(): string {
  const b = new Uint32Array(1);
  let n: number;
  do { crypto.getRandomValues(b); n = b[0]!; } while (n >= 4_294_000_000); // no modulo bias
  return String(n % 1_000_000).padStart(6, '0');
}

export const cleanCode = (s: string) => s.replace(/\D/g, '').slice(0, 6);

export async function pairSecrets(code: string, namespace = ''): Promise<{ d: string; key: Uint8Array }> {
  const c = utf8ToBytes(cleanCode(code));
  const [tag, key] = await Promise.all([
    scryptAsync(c, utf8ToBytes(SALT.tag + namespace), SCRYPT),
    scryptAsync(c, utf8ToBytes(SALT.key + namespace), SCRYPT),
  ]);
  return { d: `pair:${bytesToHex(tag).slice(0, 32)}`, key };
}

export function buildPairEvent(pairing: Pairing, secrets: { d: string; key: Uint8Array }, at = Math.floor(Date.now() / 1000)): Event {
  return finalizeEvent({
    kind: KIND, created_at: at,
    tags: [['d', secrets.d], ['expiration', String(at + PAIR_MINUTES * 60)]],
    content: seal(pairing, secrets.key),
  }, generateSecretKey());
}

/** Opens a pairing event, or null if it's wrong, damaged or expired. */
export function openPairEvent(ev: Event, secrets: { d: string; key: Uint8Array }, now = Math.floor(Date.now() / 1000)): Pairing | null {
  if (ev.kind !== KIND || !verifyEvent(ev)) return null;
  if (ev.tags.find(t => t[0] === 'd')?.[1] !== secrets.d) return null;
  const exp = Number(ev.tags.find(t => t[0] === 'expiration')?.[1]);
  if (!exp || now > exp) return null;
  const r = v.safeParse(PairingV1, open(ev.content, secrets.key));
  return r.success ? r.output : null;
}
