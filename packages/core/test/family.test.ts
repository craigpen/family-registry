import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import {
  buildItemEvent, buildJoinedEvent, buildRosterEvent, buildVaultEvent, deriveState, fingerprint, groupKeys,
  newItemId, newItemKey, randomWords, readEvent, readVaultEvent, replaceableKey,
  type EventRecord, type GroupAccess, type MemberInput,
} from '../src/index.ts';

const person = (name: string) => {
  const sk = generateSecretKey();
  return { name, sk, pk: getPublicKey(sk) };
};
const dad = person('Dad'), mom = person('Mom'), lily = person('Lily'), stranger = person('Stranger');

async function family() {
  const keys = await groupKeys(randomWords());
  const group: GroupAccess = { ...keys, organizer: fingerprint(dad.pk) };
  const members: MemberInput[] = [
    { pubkey: dad.pk, name: 'Dad', organizer: true },
    { pubkey: mom.pk, name: 'Mom' },
    { pubkey: lily.pk, name: 'Lily', helpers: [mom.pk] },
  ];
  const roster = buildRosterEvent({ v: 1, name: 'Our family', members }, keys, dad.sk, 100);
  return { group, roster, members };
}

const read = (evs: Parameters<typeof readEvent>[0][], groups: GroupAccess[], sk = dad.sk): EventRecord[] =>
  evs.map(e => readEvent(e, groups, sk, { at: 10_000 }));

const item = (by: typeof dad, owner: string, group: GroupAccess, title: string, at: number, id = newItemId(), itemKey = newItemKey()) =>
  buildItemEvent({ id, content: { v: 1, title, createdFor: owner }, itemKey, groups: [group], secretKey: by.sk, createdAt: at });

describe('roster', () => {
  it('comes from the organizer named in the link', async () => {
    const { group, roster } = await family();
    const s = deriveState(read([roster], [group]), [group]);
    expect(s.groups[0]!.name).toBe('Our family');
    expect([...s.people.values()].map(p => p.name)).toEqual(['Dad', 'Mom', 'Lily']);
  });

  it('ignores a roster from someone who is not an organizer', async () => {
    const { group, roster, members } = await family();
    const forged = buildRosterEvent({ v: 1, name: 'Hacked', members: [...members, { pubkey: stranger.pk, name: 'Stranger' }] }, group, mom.sk, 200);
    const s = deriveState(read([roster, forged], [group]), [group]);
    expect(s.groups[0]!.name).toBe('Our family');
    expect(s.people.has(stranger.pk)).toBe(false);
  });

  it('accepts a newer roster from a co-organizer the current roster names', async () => {
    const { group, members } = await family();
    const withMom = buildRosterEvent({ v: 1, name: 'Our family', members: members.map(m => m.pubkey === mom.pk ? { ...m, organizer: true } : m) }, group, dad.sk, 100);
    const byMom = buildRosterEvent({ v: 1, name: 'The Pendletons', members }, group, mom.sk, 300);
    const s = deriveState(read([withMom, byMom], [group]), [group]);
    expect(s.groups[0]!.name).toBe('The Pendletons');
  });

  it("can't be read without the group key", async () => {
    const { group, roster } = await family();
    const other: GroupAccess = { ...(await groupKeys(randomWords())), organizer: group.organizer };
    expect(read([roster], [other])[0]!.type).toBe('unreadable');
  });
});

describe('items', () => {
  it('belong to the person they were created for', async () => {
    const { group, roster } = await family();
    const s = deriveState(read([roster, item(mom, mom.pk, group, 'Scarf', 200)], [group]), [group]);
    expect(s.items).toHaveLength(1);
    expect(s.items[0]).toMatchObject({ owner: mom.pk, content: { title: 'Scarf' } });
  });

  it("can't be put on someone else's list unless you're their helper", async () => {
    const { group, roster } = await family();
    const evs = [roster, item(dad, mom.pk, group, 'Forged', 200), item(mom, lily.pk, group, 'Paints', 200)];
    const titles = deriveState(read(evs, [group]), [group]).items.map(i => i.content.title);
    expect(titles).toEqual(['Paints']);
  });

  it('newest edit from an allowed editor wins; others are ignored', async () => {
    const { group, roster } = await family();
    const id = newItemId(), k = newItemKey();
    const evs = [
      roster,
      item(lily, lily.pk, group, 'Paints', 200, id, k),
      item(mom, lily.pk, group, 'Watercolour paints', 300, id, k),
      item(dad, lily.pk, group, 'Dad was here', 400, id, k),
    ];
    const s = deriveState(read(evs, [group]), [group]);
    expect(s.items[0]!.content.title).toBe('Watercolour paints');
  });

  it('a tombstone removes an item; a later edit brings it back', async () => {
    const { group, roster } = await family();
    const id = newItemId(), itemKey = newItemKey();
    const add = item(mom, mom.pk, group, 'Scarf', 200, id, itemKey);
    const del = buildItemEvent({ id, content: { v: 1, deleted: true }, itemKey, groups: [group], secretKey: mom.sk, createdAt: 300 });
    expect(deriveState(read([roster, add, del], [group]), [group]).items).toHaveLength(0);
    const back = item(mom, mom.pk, group, 'Scarf', 400, id, itemKey);
    expect(deriveState(read([roster, add, del, back], [group]), [group]).items).toHaveLength(1);
  });

  it("a stranger's tombstone does nothing", async () => {
    const { group, roster } = await family();
    const id = newItemId(), itemKey = newItemKey();
    const add = item(mom, mom.pk, group, 'Scarf', 200, id, itemKey);
    const del = buildItemEvent({ id, content: { v: 1, deleted: true }, itemKey, groups: [group], secretKey: dad.sk, createdAt: 300 });
    expect(deriveState(read([roster, add, del], [group]), [group]).items).toHaveLength(1);
  });
});

describe('joined', () => {
  it('counts devices per person', async () => {
    const { group, roster } = await family();
    const evs = [roster, buildJoinedEvent('phone', group, mom.sk, 500), buildJoinedEvent('laptop', group, mom.sk, 600)];
    const s = deriveState(read(evs, [group]), [group]);
    expect(s.joined.get(mom.pk)?.size).toBe(2);
    expect(s.joined.has(lily.pk)).toBe(false);
  });

  it('uses a different replaceable slot per device and group', async () => {
    const { group } = await family();
    const a = buildJoinedEvent('phone', group, mom.sk), b = buildJoinedEvent('laptop', group, mom.sk);
    expect(replaceableKey(a)).not.toBe(replaceableKey(b));
  });
});

describe('vault', () => {
  it('only organizers can open it', async () => {
    const { group } = await family();
    const vault = { v: 1 as const, groups: [{ tag: group.tag, words: randomWords(), organizer: group.organizer }], people: [{ pubkey: mom.pk, words: randomWords() }] };
    const ev = buildVaultEvent(vault, [mom.pk], [group.tag], dad.sk);
    expect(readVaultEvent(ev, dad.sk)).toEqual(vault);
    expect(readVaultEvent(ev, mom.sk)).toEqual(vault);
    expect(readVaultEvent(ev, lily.sk)).toBeNull();
  });
});
