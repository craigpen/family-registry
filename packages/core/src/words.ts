import { WORDS } from './wordlist.ts';

/** Words per secret (member words, group words): 6 words of ~10.9 bits each, about 65 bits. */
export const SECRET_WORDS = 6;
/** Words in an organizer fingerprint. Not a secret: just enough to tell organizers apart. */
export const FINGERPRINT_WORDS = 4;

const INDEX = new Map(WORDS.map((w, i) => [w, i]));

/** Uniformly random words from the list, using rejection sampling to avoid modulo bias. */
export function randomWords(count = SECRET_WORDS): string[] {
  const n = WORDS.length;
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const out: string[] = [];
  const buf = new Uint32Array(1);
  while (out.length < count) {
    crypto.getRandomValues(buf);
    const r = buf[0]!;
    if (r < limit) out.push(WORDS[r % n]!);
  }
  return out;
}

/** Splits anything a person might type or dictate ("Maple otter, lantern...") into words. */
export function splitWords(input: string): string[] {
  return input.toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

export const isWord = (w: string): boolean => INDEX.has(w);

export function validWords(words: readonly string[], count = SECRET_WORDS): boolean {
  return words.length === count && words.every(isWord);
}

/** The canonical form used for key derivation and links: lowercase, hyphen-joined. */
export const joinWords = (words: readonly string[]): string => words.join('-');

/** Picks `count` words from bytes (used for fingerprints). Slight modulo bias is fine there. */
export function wordsFromBytes(bytes: Uint8Array, count: number): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from({ length: count }, (_, i) => WORDS[view.getUint32(i * 4) % WORDS.length]!);
}
