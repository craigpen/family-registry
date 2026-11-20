import {
  buildClaimEvent, buildItemEvent, buildRevealEvent, claimTag, newItemId, newItemKey, occasionPassed, today,
  type ClaimStateName, type GroupKeys, type Item, type ItemInput, type ItemState,
} from '@family-registry/core';
import { db } from './db.ts';
import { deriveFamily, type Family } from './family.ts';
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

async function current(): Promise<Family> {
  return deriveFamily(await me(), await db.events.toArray());
}

/**
 * Which of my groups an item goes to. My own list goes to all my groups. Someone else's list
 * (as their helper) and secret ideas go only to groups that person is in.
 */
function audience(fam: Family, owner: string): GroupKeys[] {
  const mine = groupsOf(fam.me);
  if (owner === fam.me.pubkey) return mine;
  const theirs = fam.people.get(owner)?.groups ?? [];
  return mine.filter(g => theirs.includes(g.tag));
}

/** Signs and queues one version of an item. Secret ideas are hidden from their recipient. */
async function write(fam: Family, id: string, itemKey: Uint8Array, owner: string, surprise: boolean, content: ItemInput | { v: 1; deleted: true }, previous?: number) {
  await publish(buildItemEvent({
    id, content, itemKey, groups: audience(fam, owner), secretKey: secretKeyOf(fam.me), createdAt: nextTime(previous),
    hiddenFrom: surprise ? owner : undefined,
  }));
}

const fromDraft = (d: ItemDraft, owner: string, surprise = false): ItemInput => ({
  v: 1, title: d.title.trim(), links: d.links.map(l => l.trim()).filter(Boolean), image: d.image,
  price: clean(d.price), notes: clean(d.notes), reallyWant: d.reallyWant, seenAt: clean(d.seenAt), createdFor: owner, surprise,
});

/** Adds an item to a list: your own, or one you help keep. */
export async function addItem(d: ItemDraft, owner?: string): Promise<string> {
  const fam = await current();
  const id = newItemId();
  const to = owner ?? fam.me.pubkey;
  await write(fam, id, newItemKey(), to, false, fromDraft(d, to));
  return id;
}

/** A secret idea for someone: everyone in their groups sees it, except them. */
export async function addIdea(d: ItemDraft, recipient: string): Promise<string> {
  const fam = await current();
  const id = newItemId();
  await write(fam, id, newItemKey(), recipient, true, fromDraft(d, recipient, true));
  return id;
}

async function find(id: string): Promise<[Family, ItemState]> {
  const fam = await current();
  const it = fam.items.find(i => i.id === id);
  if (!it) throw new Error('That item is gone');
  return [fam, it];
}

export async function updateItem(id: string, d: ItemDraft): Promise<void> {
  const [fam, it] = await find(id);
  await write(fam, id, it.itemKey, it.owner, it.content.surprise, { ...fromDraft(d, it.owner, it.content.surprise), gotAt: it.content.gotAt }, it.updatedAt);
}

/** Removes an item. Returns an undo that brings it back as it was. */
export async function removeItem(id: string): Promise<() => Promise<void>> {
  const [fam, it] = await find(id);
  await write(fam, id, it.itemKey, it.owner, it.content.surprise, { v: 1, deleted: true }, it.updatedAt);
  const removedAt = nextTime(it.updatedAt);
  return async () => write(await current(), id, it.itemKey, it.owner, it.content.surprise, it.content, removedAt);
}

export async function markGot(id: string, got: boolean): Promise<void> {
  const [fam, it] = await find(id);
  const content: Item = { ...it.content };
  if (got) content.gotAt = Math.floor(Date.now() / 1000); else delete content.gotAt;
  await write(fam, id, it.itemKey, it.owner, it.content.surprise, content, it.updatedAt);
}

/**
 * Groups can be joined after items were made, and get new words when someone is removed: re-wrap
 * items so every group they belong in can read them. My own items, and after new words, also the
 * lists I keep for someone who doesn't use the app and the surprise ideas I added.
 */
export async function shareItemsWithAllGroups(): Promise<void> {
  const fam = await current();
  const me = fam.me.pubkey;
  const old = new Set((fam.me.oldGroups ?? []).map(g => g.tag));
  for (const it of fam.items) {
    const need = audience(fam, it.owner).map(g => g.tag);
    if (need.every(t => it.groups.includes(t))) continue;
    const moved = it.groups.some(t => old.has(t));
    const owner = fam.people.get(it.owner);
    const mine = !it.content.surprise && it.owner === me && (it.updatedBy === me || moved);
    const keeping = moved && !it.content.surprise && it.owner !== me && !!owner?.managed && owner.helpers.includes(me);
    const idea = moved && it.content.surprise && it.addedBy === me;
    if (!mine && !keeping && !idea) continue;
    await write(fam, it.id, it.itemKey, it.owner, it.content.surprise, it.content, it.updatedAt);
  }
}

/* ---------- Giving ---------- */

/** "I'll get this", "Bought it", or "Never mind" (released). Any earlier claim of mine is replaced. */
export async function setClaim(item: ItemState, state: ClaimStateName, occasion: string): Promise<void> {
  const fam = await current();
  const slot = `${fam.me.pubkey}:30078:${claimTag(item.itemKey)}`;
  const prev = (await db.events.where('slot').equals(slot).first())?.createdAt;
  await publish(buildClaimEvent(item, audience(fam, item.owner), { state, occasion }, secretKeyOf(fam.me), nextTime(prev)));
}

/** Tells the recipient's app this was given, so it moves to their Received. */
export async function reveal(item: ItemState, occasion: string): Promise<void> {
  const fam = await current();
  await publish(buildRevealEvent(item, audience(fam, item.owner), occasion, secretKeyOf(fam.me)));
}

/**
 * After an occasion has passed, reveal everything I bought for it (PLAN.md "Received").
 * Runs whenever the app opens; anything already revealed is skipped.
 */
export async function revealPastGifts(on = today()): Promise<number> {
  const fam = await current();
  let n = 0;
  for (const it of fam.items) {
    const mine = [it.claims.holder, ...it.claims.others].find(c => c?.author === fam.me.pubkey);
    if (!mine || mine.state !== 'bought' || !occasionPassed(mine.occasion, on)) continue;
    if (it.given.some(g => g.by === fam.me.pubkey)) continue;
    await reveal(it, mine.occasion);
    n++;
  }
  return n;
}

/** Gives several items new names at once (e.g. shortened). Returns an undo that puts the old names back. */
export async function renameItems(changes: { id: string; title: string }[]): Promise<() => Promise<void>> {
  const before: { id: string; title: string }[] = [];
  for (const ch of changes) {
    const [fam, it] = await find(ch.id);
    if (it.content.title === ch.title) continue;
    before.push({ id: it.id, title: it.content.title });
    await write(fam, it.id, it.itemKey, it.owner, it.content.surprise, { ...it.content, title: ch.title }, it.updatedAt);
  }
  return async () => { if (before.length) await renameItems(before); };
}
