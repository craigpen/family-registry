import { v2 as nip44 } from 'nostr-tools/nip44';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';

/** A fresh random item key K. Each item's content is encrypted with its own K. */
export const newItemKey = (): Uint8Array => randomBytes(32);

/** Encrypts JSON with a 32-byte key used directly as a NIP-44 v2 conversation key. */
export function seal(value: unknown, key: Uint8Array, nonce?: Uint8Array): string {
  return nip44.encrypt(JSON.stringify(value), key, nonce);
}

/** Decrypts and parses, or returns undefined if the key is wrong or the data is damaged. */
export function open(payload: string, key: Uint8Array): unknown {
  try {
    return JSON.parse(nip44.decrypt(payload, key));
  } catch {
    return undefined;
  }
}

/** Wraps an item key for a group, so everyone with the group key can read the item. */
export function wrapKey(itemKey: Uint8Array, groupKey: Uint8Array, nonce?: Uint8Array): string {
  return nip44.encrypt(bytesToHex(itemKey), groupKey, nonce);
}

export function unwrapKey(wrapped: string, groupKey: Uint8Array): Uint8Array | undefined {
  try {
    const hex = nip44.decrypt(wrapped, groupKey);
    return /^[0-9a-f]{64}$/.test(hex) ? hexToBytes(hex) : undefined;
  } catch {
    return undefined;
  }
}
