import { beforeEach, describe, expect, it } from 'vitest';
import { hiddenTag, parseInvite } from '@family-registry/core';
import type { Event } from 'nostr-tools/pure';
import { RegistryDB, db, useDatabase } from './db.ts';
import { deriveFamily, hiddenTagsToFetch } from './family.ts';
import { signIn, startFamily } from './identity.ts';
import { addIdea, addItem, removeItem, reveal, revealPastGifts, setClaim } from './items.ts';
import { addPerson, inviteLinkFor, updatePerson } from './people.ts';
import { groupsOf, ingest } from './store.ts';

/*
 * A small family on separate "devices" (separate databases). A shared list of events
 * stands in for the relays; each device fetches only what its subscriptions would.
 */
const relay: Event[] = [];
const devices = new Map<string, RegistryDB>();
let n = 0;

async function use(name: string) {
  if (!devices.has(name)) devices.set(name, new RegistryDB(`giving-${++n}-${name}`));
  useDatabase(devices.get(name)!);
}
/** Publish this device's events, then fetch what its filters match (like a relay subscription). */
async function sync(name: string) {
  await use(name);
  for (const e of await db.events.toArray()) if (!relay.some(r => r.id === e.event.id)) relay.push(e.event);
  const fam = await family();
  const h = new Set(fam.me.groups.map(g => g.tag));
  const x = new Set(hiddenTagsToFetch(fam));
  for (const ev of relay) if (ev.tags.some(t => (t[0] === 'h' && h.has(t[1]!)) || (t[0] === 'x' && x.has(t[1]!)))) await ingest(ev);
}
const family = async () => deriveFamily((await db.identity.get('me'))!, await db.events.toArray());
const draft = (title: string) => ({ title, links: [], reallyWant: false });

let mom = '', lily = '', dad = '';
beforeEach(async () => {
  relay.length = 0;
  devices.clear();
  await use('dad');
  await startFamily('Dad');
  const tag = (await family()).groups[0]!.tag;
  dad = (await family()).me.pubkey;
  mom = await addPerson({ name: 'Mom', groups: [tag] });
  lily = await addPerson({ name: 'Lily', birthday: '11-30', groups: [tag] });
  const fam = await family();
  const links = { mom: inviteLinkFor(fam, mom, tag)!, lily: inviteLinkFor(fam, lily, tag)! };
  await sync('dad');
  for (const who of ['mom', 'lily'] as const) {
    await use(who);
    await signIn(parseInvite(new URL(links[who]).hash)!);
    await sync(who);
  }
});

describe('claims', () => {
  it("Mom's claim shows to Dad and never reaches Lily's device", async () => {
    await use('lily');
    const paints = await addItem(draft('Paints'));
    await sync('lily');

    await sync('mom');
    const it = (await family()).items.find(i => i.id === paints)!;
    await setClaim(it, 'getting', 'christmas-2026');
    await sync('mom');

    await sync('dad');
    expect((await family()).items.find(i => i.id === paints)!.claims.holder).toMatchObject({ author: mom, state: 'getting' });

    await sync('lily');
    expect((await db.events.toArray()).some(e => e.slot.includes(':claim:'))).toBe(false);
    expect((await family()).items.find(i => i.id === paints)!.claims.holder).toBeUndefined();
  });

  it("Lily's device asks for everyone's hidden tag but her own", async () => {
    await use('lily');
    const fam = await family();
    const g = groupsOf(fam.me)[0]!;
    const tags = hiddenTagsToFetch(fam);
    expect(tags).not.toContain(hiddenTag(g, lily));
    expect(tags).toContain(hiddenTag(g, mom));
    expect(tags).toContain(hiddenTag(g, dad));
  });

  it('even if a claim on her item reached Lily’s device, it would not show', async () => {
    await use('lily');
    const paints = await addItem(draft('Paints'));
    await sync('lily');
    await sync('mom');
    await setClaim((await family()).items.find(i => i.id === paints)!, 'bought', 'christmas-2026');
    await sync('mom');
    await use('lily');
    for (const e of relay) await ingest(e); // everything, ignoring her filters
    expect((await family()).items.find(i => i.id === paints)!.claims.holder).toBeUndefined();
  });
});

describe('secret ideas', () => {
  it('everyone but the recipient sees them', async () => {
    await use('mom');
    await addIdea(draft('Riding lesson'), lily);
    await sync('mom');
    await sync('dad');
    expect((await family()).itemsOf(lily).map(i => i.content.title)).toEqual(['Riding lesson']);
    await sync('lily');
    expect((await family()).itemsOf(lily)).toHaveLength(0);
  });
});

describe('received', () => {
  it('after the occasion, what was bought moves to the recipient’s Received, from the giver', async () => {
    await use('lily');
    const paints = await addItem(draft('Paints'));
    await sync('lily');
    await sync('mom');
    await setClaim((await family()).items.find(i => i.id === paints)!, 'bought', 'christmas-2026');
    expect(await revealPastGifts('2026-12-25')).toBe(0); // not yet
    expect(await revealPastGifts('2026-12-26')).toBe(1);
    expect(await revealPastGifts('2026-12-27')).toBe(0); // only once
    await sync('mom');
    await sync('lily');
    expect((await family()).items.find(i => i.id === paints)!.given).toMatchObject([{ by: mom, occasion: 'christmas-2026' }]);
  });

  it('a giver can reveal early with "I\'ve given it already"', async () => {
    await use('lily');
    const paints = await addItem(draft('Paints'));
    await sync('lily');
    await sync('dad');
    await reveal((await family()).items.find(i => i.id === paints)!, 'birthday-2026-11-30');
    await sync('dad');
    await sync('lily');
    expect((await family()).items.find(i => i.id === paints)!.given[0]!.by).toBe(dad);
  });
});

describe('helpers and managed people', () => {
  it('a helper keeps a managed person’s list and sees claims on it', async () => {
    await use('dad');
    const tag = (await family()).groups[0]!.tag;
    const baby = await addPerson({ name: 'Baby Nora', groups: [tag], managed: true, helpers: [mom] });
    await sync('dad');
    await sync('mom');
    const rattle = await addItem(draft('Rattle'), baby);
    await sync('mom');
    await sync('dad');
    expect((await family()).itemsOf(baby).map(i => i.content.title)).toEqual(['Rattle']);
    await setClaim((await family()).items.find(i => i.id === rattle)!, 'getting', 'christmas-2026');
    await sync('dad');
    await sync('mom');
    expect((await family()).items.find(i => i.id === rattle)!.claims.holder?.author).toBe(dad);
  });

  it('only the owner and their helpers can change a list', async () => {
    await use('dad');
    await updatePerson(lily, { helpers: [mom] });
    await sync('dad');
    await use('lily');
    const id = await addItem(draft('Paints'));
    await sync('lily');
    await sync('mom');
    expect((await family()).people.get(lily)!.helpers).toEqual([mom]);
    const undo = await removeItem(id); // Mom, as Lily's helper
    expect(undo).toBeTypeOf('function');
    await sync('mom');
    await sync('lily');
    expect((await family()).items.find(i => i.id === id)).toBeUndefined();
  });
});
