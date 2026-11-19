import { beforeEach, describe, expect, it } from 'vitest';
import { parseInvite } from '@family-registry/core';
import { RegistryDB, db, useDatabase } from './db.ts';
import { deriveFamily } from './family.ts';
import { signIn, startFamily, switchTo } from './identity.ts';
import { addItem, markGot, removeItem, shareItemsWithAllGroups, updateItem } from './items.ts';
import { addPerson, createGroup, inviteLinkFor, markInvited } from './people.ts';
import { ingest } from './store.ts';

let n = 0;
const fresh = () => useDatabase(new RegistryDB(`test-${++n}`));
const family = async () => deriveFamily((await db.identity.get('me'))!, await db.events.toArray());
const draft = (title: string) => ({ title, links: [], reallyWant: false });

beforeEach(async () => {
  fresh();
  await startFamily('Dad');
});

describe('starting a family', () => {
  it('makes you the organizer of "Our family", with your words in the vault', async () => {
    const fam = await family();
    expect(fam.isOrganizer).toBe(true);
    expect(fam.groups[0]!.name).toBe('Our family');
    expect(fam.self.name).toBe('Dad');
    expect(fam.vault?.people[0]!.words).toEqual(fam.me.memberWords);
    expect(await db.outbox.count()).toBe(2); // roster + vault, waiting to go out
  });
});

describe('my list', () => {
  it('add, edit, remove with undo, and got it', async () => {
    const id = await addItem({ ...draft('  Kite '), price: '$20' });
    let it = (await family()).items.find(i => i.id === id)!;
    expect(it.content).toMatchObject({ title: 'Kite', price: '$20' });

    await updateItem(id, { ...draft('Red kite'), notes: '' });
    it = (await family()).items.find(i => i.id === id)!;
    expect(it.content.title).toBe('Red kite');
    expect(it.content.notes).toBeUndefined();

    const undo = await removeItem(id);
    expect((await family()).items.find(i => i.id === id)).toBeUndefined();
    await undo();
    expect((await family()).items.find(i => i.id === id)?.content.title).toBe('Red kite');

    await markGot(id, true);
    expect((await family()).items.find(i => i.id === id)?.content.gotAt).toBeTypeOf('number');
  });

  it('only the newest unsent version of an item waits in the outbox', async () => {
    const before = await db.outbox.count();
    const id = await addItem(draft('Kite'));
    await updateItem(id, draft('A'));
    await updateItem(id, draft('B'));
    expect(await db.outbox.count()).toBe(before + 1);
  });
});

describe('people and invites', () => {
  it('adding someone puts them in the roster and their words in the vault', async () => {
    const tag = (await family()).groups[0]!.tag;
    const mom = await addPerson({ name: 'Mom', birthday: '01-14', groups: [tag] });
    const fam = await family();
    expect(fam.people.get(mom)).toMatchObject({ name: 'Mom', birthday: '01-14' });
    expect(fam.vault?.people.map(p => p.pubkey)).toContain(mom);

    await markInvited(mom);
    expect((await family()).vault?.people.find(p => p.pubkey === mom)?.invitedAt).toBeTypeOf('number');
  });

  it("an invite link signs another device in as that person, and they see the family", async () => {
    const fam = await family();
    const tag = fam.groups[0]!.tag;
    const mom = await addPerson({ name: 'Mom', groups: [tag] });
    const dadsItem = await addItem(draft('Pizza pan'));
    const link = inviteLinkFor(await family(), mom, tag)!;
    const sent = await db.events.toArray();

    // Mom's phone: a fresh database that receives what Dad published.
    fresh();
    const r = await signIn(parseInvite(new URL(link).hash)!);
    expect(r.kind).toBe('signed-in');
    for (const e of sent) await ingest(e.event);
    const moms = await family();
    expect(moms.me.pubkey).toBe(mom);
    expect(moms.self.name).toBe('Mom');
    expect(moms.isOrganizer).toBe(false);
    expect(moms.vault).toBeNull(); // only organizers can open it
    expect(moms.itemsOf(fam.me.pubkey).map(i => i.id)).toEqual([dadsItem]);
  });

  it("opening someone else's link doesn't silently replace you", async () => {
    const fam = await family();
    const mom = await addPerson({ name: 'Mom', groups: [fam.groups[0]!.tag] });
    const inv = parseInvite(new URL(inviteLinkFor(await family(), mom, fam.groups[0]!.tag)!).hash)!;
    const r = await signIn(inv);
    expect(r.kind).toBe('someone-else');
    expect((await db.identity.get('me'))!.pubkey).toBe(fam.me.pubkey);
    await switchTo(inv);
    expect((await db.identity.get('me'))!.pubkey).toBe(mom);
  });

  it('a second group: rosters stay separate, and items are re-shared with it', async () => {
    const tag = (await family()).groups[0]!.tag;
    await addPerson({ name: 'Mom', groups: [tag] });
    const id = await addItem(draft('Socks'));
    const inlaws = await createGroup('Family + in-laws', []);
    let fam = await family();
    expect(fam.groups.map(g => g.name)).toEqual(['Our family', 'Family + in-laws']);
    expect(fam.groups[0]!.members).toHaveLength(2);
    expect(fam.groups[1]!.members).toHaveLength(1);

    expect(fam.items.find(i => i.id === id)!.groups).not.toContain(inlaws);
    await shareItemsWithAllGroups();
    fam = await family();
    expect(fam.items.find(i => i.id === id)!.groups).toContain(inlaws);
  });
});
