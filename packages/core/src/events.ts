import { finalizeEvent, verifyEvent, type Event, type EventTemplate } from 'nostr-tools/pure';
import type { GroupKeys } from './keys.ts';
import { open, seal, unwrapKey, wrapKey } from './crypto.ts';
import { parseItem, type Item, type ItemInput, type Tombstone } from './schema.ts';

/** NIP-78 application data, parameterised replaceable. */
export const KIND = 30078;
/** Events dated further ahead than this are ignored until their time comes (PLAN.md section 6). */
export const MAX_FUTURE_SECONDS = 60 * 60;

export const itemTag = (id: string) => `item:${id}`;

/** A random item id: 16 bytes as hex. */
export function newItemId(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
}

export interface BuildItem {
  id: string;
  content: ItemInput | Tombstone;
  itemKey: Uint8Array;
  groups: GroupKeys[];
  secretKey: Uint8Array;
  createdAt?: number;
  /** Only for test vectors: fixed nonces make the output deterministic. */
  nonces?: { content: Uint8Array; wraps: Uint8Array[] };
}

/** Builds and signs an item event, readable by every group in `groups`. */
export function buildItemEvent(b: BuildItem): Event {
  const tags: string[][] = [['d', itemTag(b.id)]];
  b.groups.forEach((g, i) => {
    tags.push(['h', g.tag]);
    tags.push(['k', g.tag, wrapKey(b.itemKey, g.key, b.nonces?.wraps[i])]);
  });
  const template: EventTemplate = {
    kind: KIND,
    created_at: b.createdAt ?? Math.floor(Date.now() / 1000),
    tags,
    content: seal(b.content, b.itemKey, b.nonces?.content),
  };
  return finalizeEvent(template, b.secretKey);
}

export interface ReadItem {
  id: string;
  author: string;
  createdAt: number;
  eventId: string;
  itemKey: Uint8Array;
  content: Item | Tombstone;
}

/** Verifies, unwraps and parses an item event with any group key we hold. Null if we can't read it. */
export function readItemEvent(ev: Event, groups: GroupKeys[], now = Math.floor(Date.now() / 1000), verified = false): ReadItem | null {
  if (ev.kind !== KIND || ev.created_at > now + MAX_FUTURE_SECONDS || (!verified && !verifyEvent(ev))) return null;
  const d = ev.tags.find(t => t[0] === 'd')?.[1];
  if (!d?.startsWith('item:')) return null;
  for (const g of groups) {
    const wrapped = ev.tags.find(t => t[0] === 'k' && t[1] === g.tag)?.[2];
    if (!wrapped) continue;
    const itemKey = unwrapKey(wrapped, g.key);
    if (!itemKey) continue;
    const content = parseItem(open(ev.content, itemKey));
    if (!content) return null;
    return { id: d.slice(5), author: ev.pubkey, createdAt: ev.created_at, eventId: ev.id, itemKey, content };
  }
  return null;
}

/**
 * The current version of an item: the newest event from an allowed editor.
 * Ties go to the lower event id, so every device picks the same one.
 */
export function newestVersion<T extends { author: string; createdAt: number; eventId: string }>(
  versions: T[], allowed: (author: string) => boolean,
): T | undefined {
  return versions
    .filter(x => allowed(x.author))
    .sort((a, b) => b.createdAt - a.createdAt || (a.eventId < b.eventId ? -1 : 1))[0];
}
