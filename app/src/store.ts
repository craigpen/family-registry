import { hexToBytes } from '@noble/hashes/utils.js';
import { replaceableKey, type GroupAccess } from '@family-registry/core';
import type { Event } from 'nostr-tools/pure';
import { db, type Identity } from './db.ts';

/** Keeps an event if it's the newest for its slot. Returns true if it was new to us. */
export async function ingest(event: Event, mine = false): Promise<boolean> {
  const slot = replaceableKey(event);
  return db.transaction('rw', db.events, async () => {
    if (await db.events.get(event.id)) return false;
    const cur = await db.events.where('slot').equals(slot).first();
    if (cur && (cur.createdAt > event.created_at || (cur.createdAt === event.created_at && cur.id < event.id))) return false;
    if (cur) await db.events.delete(cur.id);
    await db.events.put({ id: event.id, slot, createdAt: event.created_at, event, mine });
    return true;
  });
}

/** Saves an event this device made and queues it for the relays, replacing any unsent older one. */
export async function publish(event: Event): Promise<void> {
  const slot = replaceableKey(event);
  await db.transaction('rw', db.events, db.outbox, async () => {
    await ingest(event, true);
    await db.outbox.where('slot').equals(slot).delete();
    await db.outbox.put({ eventId: event.id, slot, event, queuedAt: Date.now() });
  });
  onPublished?.();
}

let onPublished: (() => void) | undefined;
/** The sync engine registers here so new events go out straight away. */
export const whenPublished = (fn: () => void) => { onPublished = fn; };

export async function me(): Promise<Identity> {
  const id = await db.identity.get('me');
  if (!id) throw new Error('Not signed in');
  return id;
}

export const secretKeyOf = (id: Identity) => hexToBytes(id.secretKey);
export const groupsOf = (id: Identity): GroupAccess[] =>
  id.groups.map(g => ({ tag: g.tag, key: hexToBytes(g.key), organizer: g.organizer }));

/** A created_at that's never older than the version it replaces, so edits always win. */
export const nextTime = (previous?: number) => Math.max(Math.floor(Date.now() / 1000), (previous ?? 0) + 1);
