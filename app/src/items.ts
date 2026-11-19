import { bytesToHex } from '@noble/hashes/utils.js';
import { buildItemEvent, newItemId, newItemKey, type Item, type ItemInput, type ItemState } from '@family-registry/core';
import { db } from './db.ts';
import { deriveFamily } from './family.ts';
import { groupsOf, me, nextTime, publish, secretKeyOf } from './store.ts';

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

async function current() {
  const id = await me();
  return deriveFamily(id, await db.events.toArray());
}

/** Signs and queues one version of an item, readable by all of this person's groups. */
async function write(id: string, itemKey: Uint8Array, content: ItemInput | { v: 1; deleted: true }, previous?: number) {
  const identity = await me();
  await publish(buildItemEvent({
    id, content, itemKey, groups: groupsOf(identity), secretKey: secretKeyOf(identity), createdAt: nextTime(previous),
  }));
}

const fromDraft = (d: ItemDraft, owner: string): ItemInput => ({
  v: 1, title: d.title.trim(), links: d.links.map(l => l.trim()).filter(Boolean), image: d.image,
  price: clean(d.price), notes: clean(d.notes), reallyWant: d.reallyWant, seenAt: clean(d.seenAt), createdFor: owner,
});

/** Adds an item to a list: your own, or one you help keep. */
export async function addItem(d: ItemDraft, owner?: string): Promise<string> {
  const identity = await me();
  const id = newItemId();
  await write(id, newItemKey(), fromDraft(d, owner ?? identity.pubkey));
  return id;
}

async function find(id: string): Promise<ItemState> {
  const it = (await current()).items.find(i => i.id === id);
  if (!it) throw new Error('That item is gone');
  return it;
}

export async function updateItem(id: string, d: ItemDraft): Promise<void> {
  const it = await find(id);
  await write(id, it.itemKey, { ...fromDraft(d, it.owner), gotAt: it.content.gotAt }, it.updatedAt);
}

/** Removes an item. Returns an undo that brings it back as it was. */
export async function removeItem(id: string): Promise<() => Promise<void>> {
  const it = await find(id);
  await write(id, it.itemKey, { v: 1, deleted: true }, it.updatedAt);
  const removedAt = nextTime(it.updatedAt);
  return () => write(id, it.itemKey, it.content, removedAt);
}

export async function markGot(id: string, got: boolean): Promise<void> {
  const it = await find(id);
  const content: Item = { ...it.content };
  if (got) content.gotAt = Math.floor(Date.now() / 1000); else delete content.gotAt;
  await write(id, it.itemKey, content, it.updatedAt);
}

/** Groups can be joined after items were made: re-wrap my items so every group I'm in can read them. */
export async function shareItemsWithAllGroups(): Promise<void> {
  const fam = await current();
  const tags = fam.me.groups.map(g => g.tag);
  for (const it of fam.items) {
    if (it.owner !== fam.me.pubkey || it.updatedBy !== fam.me.pubkey) continue;
    if (tags.every(t => it.groups.includes(t))) continue;
    await write(it.id, it.itemKey, it.content, it.updatedAt);
  }
}

export const itemKeyHex = (it: ItemState) => bytesToHex(it.itemKey);
