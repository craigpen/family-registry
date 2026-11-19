import { scryptAsync } from '@noble/hashes/scrypt.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { getPublicKey } from 'nostr-tools/pure';
import { FINGERPRINT_WORDS, joinWords, wordsFromBytes } from './words.ts';

/*
 * FROZEN. Every value in this file decides someone's keys. Changing any of them
 * strands every family's data. A new scheme gets new names (v2) alongside these.
 */
export const SCRYPT = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 } as const;
export const SALT = {
  member: 'family-registry/member/v1',
  group: 'family-registry/group/v1',
} as const;
export const LABEL = {
  groupTag: 'family-registry/group-tag/v1',
  groupKey: 'family-registry/group-key/v1',
  fingerprint: 'family-registry/fingerprint/v1',
} as const;

export interface MemberKeys {
  secretKey: Uint8Array;
  pubkey: string;
}

export interface GroupKeys {
  /** Marks the group's events on relays (`["h", tag]`). 32 hex chars. */
  tag: string;
  /** NIP-44 v2 conversation key for the group's encrypted events. */
  key: Uint8Array;
}

const slowHash = (words: readonly string[], salt: string) =>
  scryptAsync(utf8ToBytes(joinWords(words)), utf8ToBytes(salt), SCRYPT);

/** A person's Nostr keys, from their member words. Takes about half a second on purpose. */
export async function memberKeys(words: readonly string[]): Promise<MemberKeys> {
  let sk = await slowHash(words, SALT.member);
  // A 32-byte hash is a valid secp256k1 key except with probability ~2^-128;
  // rehashing keeps the derivation deterministic if that ever happens.
  for (;;) {
    try {
      return { secretKey: sk, pubkey: getPublicKey(sk) };
    } catch {
      sk = sha256(sk);
    }
  }
}

export async function groupKeys(words: readonly string[]): Promise<GroupKeys> {
  const g = await slowHash(words, SALT.group);
  return {
    tag: bytesToHex(hkdf(sha256, g, undefined, utf8ToBytes(LABEL.groupTag), 16)),
    key: hkdf(sha256, g, undefined, utf8ToBytes(LABEL.groupKey), 32),
  };
}

/** Four words that identify an organizer's public key, carried in invite links (`&o=`). */
export function fingerprint(pubkey: string): string[] {
  const h = hkdf(sha256, hexToBytes(pubkey), undefined, utf8ToBytes(LABEL.fingerprint), 4 * FINGERPRINT_WORDS);
  return wordsFromBytes(h, FINGERPRINT_WORDS);
}
