import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import {
  buildGroupEvent, buildItemEvent, buildJoinedEvent, buildProfileEvent, buildRosterEvent, buildVaultEvent, deriveState, fingerprint, groupKeys,
  profileTag,
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
      item(mom, lily.pk, group, 'Watercolor paints', 300, id, k),
      item(dad, lily.pk, group, 'Dad was here', 400, id, k),
    ];
    const s = deriveState(read(evs, [group]), [group]);
    expect(s.items[0]!.content.title).toBe('Watercolor paints');
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

  it('says what kind of device it is, when it says', async () => {
    const { group, roster } = await family();
    const evs = [roster, buildJoinedEvent('phone', group, mom.sk, 500, { platform: 'ios', browser: 'Safari', app: true }), buildJoinedEvent('laptop', group, mom.sk, 600)];
    const s = deriveState(read(evs, [group]), [group]);
    expect(s.devices.get(mom.pk)?.get('phone')).toEqual({ lastSeen: 500, kind: { platform: 'ios', browser: 'Safari', app: true } });
    expect(s.devices.get(mom.pk)?.get('laptop')).toEqual({ lastSeen: 600, kind: undefined });
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

describe('profiles', () => {
  const photo = 'data:image/webp;base64,AAAA';
  const kid = person('Kid');
  async function withKid() {
    const f = await family();
    const members: MemberInput[] = [...f.members, { pubkey: kid.pk, name: 'Kid', managed: true, helpers: [mom.pk] }];
    const roster = buildRosterEvent({ v: 1, name: 'Our family', members: members.map(m => m.pubkey === lily.pk ? { ...m, birthday: '03-14' } : m) }, f.group, dad.sk, 100);
    return { ...f, roster };
  }

  it('round-trips through the group key and puts the photo on the person', async () => {
    const { group, roster } = await withKid();
    const ev = buildProfileEvent(lily.pk, { v: 1, photo, birthday: '04-01' }, group, lily.sk, 200);
    expect(ev.tags.find(t => t[0] === 'd')![1]).toBe(profileTag(lily.pk, group.tag));
    const recs = read([roster, ev], [group]);
    expect(recs[1]).toMatchObject({ type: 'profile', person: lily.pk, profile: { photo, birthday: '04-01' } });
    const s = deriveState(recs, [group]);
    expect(s.people.get(lily.pk)!.photo).toBe(photo);
    expect(s.profiles.get(lily.pk)).toMatchObject({ by: lily.pk, at: 200 });
  });

  it("overrides the roster's birthday, keeps it when absent, and clears it with an empty string", async () => {
    const { group, roster } = await withKid();
    const bday = (p: Parameters<typeof buildProfileEvent>[1]) =>
      deriveState(read([roster, buildProfileEvent(lily.pk, p, group, lily.sk, 200)], [group]), [group]).people.get(lily.pk)!.birthday;
    expect(bday({ v: 1, birthday: '04-01' })).toBe('04-01');
    expect(bday({ v: 1, photo })).toBe('03-14');
    expect(bday({ v: 1, birthday: '' })).toBeUndefined();
  });

  it('accepts the person, organizers and helpers of a managed person; nobody else', async () => {
    const { group, roster } = await withKid();
    const who = (person: string, by: typeof dad) =>
      deriveState(read([roster, buildProfileEvent(person, { v: 1, photo }, group, by.sk, 200)], [group]), [group]).people.get(person)!.photo;
    expect(who(mom.pk, mom)).toBe(photo);
    expect(who(mom.pk, dad)).toBe(photo);
    expect(who(kid.pk, mom)).toBe(photo);
    // Mom helps keep Lily's list, but Lily uses the app herself: her face is hers.
    expect(who(lily.pk, mom)).toBeUndefined();
    expect(who(mom.pk, lily)).toBeUndefined();
    expect(who(dad.pk, stranger)).toBeUndefined();
  });

  it('takes the newest accepted version across authors', async () => {
    const { group, roster } = await withKid();
    const a = buildProfileEvent(kid.pk, { v: 1, photo: 'data:image/webp;base64,OLD' }, group, mom.sk, 200);
    const b = buildProfileEvent(kid.pk, { v: 1 }, group, dad.sk, 300);
    const forged = buildProfileEvent(kid.pk, { v: 1, photo: 'data:image/webp;base64,BAD' }, group, stranger.sk, 400);
    const s = deriveState(read([roster, a, b, forged], [group]), [group]);
    expect(s.people.get(kid.pk)!.photo).toBeUndefined();
    expect(s.profiles.get(kid.pk)!.by).toBe(dad.pk);
  });

  it('is unreadable when it names another group or holds a web photo', async () => {
    const { group, roster } = await withKid();
    const evil = buildGroupEvent(`profile:${lily.pk}:ffffffff`, { v: 1, photo }, group, lily.sk, 200);
    const web = buildGroupEvent(profileTag(lily.pk, group.tag), { v: 1, photo: 'https://example.com/a.png' }, group, lily.sk, 200);
    expect(read([roster, evil, web], [group]).slice(1).map(r => r.type)).toEqual(['unreadable', 'unreadable']);
  });
});
