import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { buildItemEvent, itemTag, newItemId, newItemKey, type Item, type Tombstone } from '@family-registry/core';
import { db, type Identity, type LocalItem } from './db.ts';

export interface ItemDraft {
  title: string;
  links: string[];
  image?: string;
  price?: string;
  notes?: string;
  reallyWant: boolean;
  seenAt?: string;
}

const clean = (s?: string) => (s?.trim() ? s.trim() : undefined);

function contentOf(it: LocalItem, me: Identity): Item | Tombstone {
  if (it.deleted) return { v: 1, deleted: true };
  return {
    v: 1, title: it.title, links: it.links, image: it.image, price: it.price, notes: it.notes,
    reallyWant: it.reallyWant, seenAt: it.seenAt, createdFor: me.pubkey, surprise: false,
  };
}

/** Signs the item's current state and queues it for the relays, replacing any unsent older version. */
async function enqueue(it: LocalItem, me: Identity) {
  const event = buildItemEvent({
    id: it.id,
    content: contentOf(it, me),
    itemKey: hexToBytes(it.itemKey),
    groups: [{ tag: me.groupTag, key: hexToBytes(me.groupKey) }],
    secretKey: hexToBytes(me.secretKey),
    createdAt: Math.floor(it.updatedAt / 1000),
  });
  const dTag = itemTag(it.id);
  await db.outbox.where('dTag').equals(dTag).delete();
  await db.outbox.put({ eventId: event.id, dTag, event, queuedAt: Date.now() });
}

async function me(): Promise<Identity> {
  const id = await db.identity.get('me');
  if (!id) throw new Error('Not signed in');
  return id;
}

export async function addItem(d: ItemDraft): Promise<LocalItem> {
  const now = Date.now();
  const it: LocalItem = {
    id: newItemId(), itemKey: bytesToHex(newItemKey()), createdAt: now, updatedAt: now,
    title: d.title.trim(), links: d.links.filter(Boolean), image: d.image, price: clean(d.price),
    notes: clean(d.notes), reallyWant: d.reallyWant, seenAt: clean(d.seenAt),
  };
  await db.transaction('rw', db.items, db.outbox, db.identity, async () => {
    await db.items.put(it);
    await enqueue(it, await me());
  });
  return it;
}

export async function updateItem(id: string, patch: Partial<ItemDraft> & { receivedAt?: number | undefined; deleted?: boolean }): Promise<void> {
  await db.transaction('rw', db.items, db.outbox, db.identity, async () => {
    const cur = await db.items.get(id);
    if (!cur) return;
    // Never let a clock step backwards make an edit look older than the last one.
    const updatedAt = Math.max(Date.now(), cur.updatedAt + 1000);
    const next: LocalItem = { ...cur, ...patch, updatedAt };
    if (patch.title !== undefined) next.title = patch.title.trim();
    for (const k of ['price', 'notes', 'seenAt'] as const) if (k in patch) next[k] = clean(patch[k]);
    await db.items.put(next);
    await enqueue(next, await me());
  });
}

/** Removes an item. Returns an undo that brings it back exactly as it was. */
export async function removeItem(id: string): Promise<() => Promise<void>> {
  await updateItem(id, { deleted: true });
  return () => updateItem(id, { deleted: false });
}

export const markReceived = (id: string, got: boolean) => updateItem(id, { receivedAt: got ? Date.now() : undefined });
