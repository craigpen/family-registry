import { bytesToHex } from '@noble/hashes/utils.js';
import {
  buildJoinedEvent, buildRosterEvent, buildVaultEvent, fingerprint, groupKeys, inviteLink, memberKeys, randomWords,
  type Invite,
} from '@family-registry/core';
import { db, type Identity, type MyGroup } from './db.ts';
import { groupsOf, publish, secretKeyOf } from './store.ts';
import { deviceKind } from './setup.ts';

/** Staging builds keep their data apart from the real family's (PLAN.md section 9). */
export const NAMESPACE = (import.meta.env.VITE_NAMESPACE as string | undefined) ?? '';

export const COLORS = ['#5B7FD6', '#CF4339', '#E58A3A', '#2F8F6B', '#A05BC9', '#C9576F', '#3A8FB7', '#8A6A3A', '#D9962B', '#4C9A9A'];

async function groupFor(inv: Invite): Promise<MyGroup> {
  const g = await groupKeys(inv.group, NAMESPACE);
  return { words: inv.group, organizer: inv.organizer, tag: g.tag, key: bytesToHex(g.key) };
}

/** Set when this device was taken out of its last group: the start screen says so. Holds the group's name. */
export const REMOVED_KEY = 'removed-from';

export type SignInResult = { kind: 'signed-in' | 'added-group' | 'already'; identity: Identity } | { kind: 'someone-else'; invite: Invite; current: Identity };

/**
 * Signs this device in from a personal link. If the device already belongs to the same
 * person, a new group is simply added. If it belongs to someone else, nothing changes
 * until the person chooses (see `switchTo`).
 */
export async function signIn(inv: Invite, name = ''): Promise<SignInResult> {
  const [mine, group] = await Promise.all([memberKeys(inv.member), groupFor(inv)]);
  const existing = await db.identity.get('me');
  try { localStorage.removeItem(REMOVED_KEY); } catch { /* only a note */ }
  if (existing && existing.pubkey !== mine.pubkey) return { kind: 'someone-else', invite: inv, current: existing };
  if (existing) {
    if (existing.groups.some(g => g.tag === group.tag)) return { kind: 'already', identity: existing };
    const identity = { ...existing, groups: [...existing.groups, group] };
    await db.identity.put(identity);
    return { kind: 'added-group', identity };
  }
  const identity: Identity = {
    id: 'me', name, memberWords: inv.member, secretKey: bytesToHex(mine.secretKey), pubkey: mine.pubkey, groups: [group], welcomed: false,
  };
  await db.identity.put(identity);
  return { kind: 'signed-in', identity };
}

/** This device becomes someone else: what they had here is cleared (it's all on the relays). */
export async function switchTo(inv: Invite): Promise<SignInResult> {
  await db.transaction('rw', db.identity, db.events, db.outbox, async () => {
    await Promise.all([db.identity.clear(), db.events.clear(), db.outbox.clear()]);
  });
  return signIn(inv);
}

/** Starts a brand-new family, with this person as its organizer. */
export async function startFamily(name: string, familyName = 'Our family'): Promise<Identity> {
  const member = randomWords();
  const keys = await memberKeys(member);
  const result = await signIn({ group: randomWords(), member, organizer: fingerprint(keys.pubkey) }, name);
  if (result.kind === 'someone-else') throw new Error('This device already belongs to someone');
  const me = result.identity;
  const group = groupsOf(me)[0]!;
  const sk = secretKeyOf(me);
  await publish(buildRosterEvent({ v: 1, name: familyName, members: [{ pubkey: me.pubkey, name, organizer: true, color: COLORS[0] }] }, group, sk));
  await publish(buildVaultEvent({
    v: 1,
    groups: [{ tag: group.tag, words: me.groups[0]!.words, organizer: group.organizer }],
    people: [{ pubkey: me.pubkey, words: member }],
  }, [], [group.tag], sk));
  return me;
}

/** Says "this device is set up and in use" (and what kind of device it is), at most once a day per group or when that changes. */
export async function announceJoined(me: Identity) {
  const prefs = (await db.prefs.get('prefs')) ?? { id: 'prefs' as const, largeText: false };
  const device = prefs.device ?? crypto.randomUUID().slice(0, 8);
  // Kept before anything goes out, so this device never mistakes its own marker for another device's.
  if (!prefs.device) await db.prefs.put({ ...prefs, device });
  const now = Math.floor(Date.now() / 1000);
  const known = new Set((await db.events.toArray()).filter(e => e.mine && e.slot.includes(`:joined:${device}:`)).map(e => e.slot));
  const kind = deviceKind();
  const kindText = JSON.stringify(kind);
  const due = !prefs.joinedAt || now - prefs.joinedAt > 86_400 || prefs.joinedKind !== kindText;
  const groups = groupsOf(me);
  const missing = groups.filter(g => ![...known].some(s => s.endsWith(`:${g.tag.slice(0, 8)}`)));
  for (const g of due ? groups : missing) await publish(buildJoinedEvent(device, g, secretKeyOf(me), now, kind));
  const latest = (await db.prefs.get('prefs')) ?? prefs;
  await db.prefs.put({ ...latest, device, joinedAt: due ? now : prefs.joinedAt, joinedKind: kindText });
}

/** The person's own link for a group, to open on another device. */
export function myLink(me: Identity, group = me.groups[0]!): string {
  return linkFor(group.words, me.memberWords, group.organizer);
}

export function linkFor(groupWords: string[], memberWords: string[], organizer: string[]): string {
  return inviteLink(new URL(import.meta.env.BASE_URL, location.origin).href, { group: groupWords, member: memberWords, organizer });
}

/**
 * If this device's person is a group's organizer (by the fingerprint in their link) but the
 * group has no roster yet, make one. Covers families started before rosters existed, and a
 * roster that never reached the relays. Only runs after a full sync, so it can't race a real one.
 */
export async function ensureRosters(me: Identity, groupsWithRoster: string[]) {
  const sk = secretKeyOf(me);
  const mine = fingerprint(me.pubkey).join('-');
  for (const g of groupsOf(me)) {
    if (g.organizer.join('-') !== mine || groupsWithRoster.includes(g.tag)) continue;
    // New words after a removal: the roster comes from whoever made them, maybe still on its way.
    if (me.groups.find(x => x.tag === g.tag)?.from) continue;
    await publish(buildRosterEvent({ v: 1, name: 'Our family', members: [{ pubkey: me.pubkey, name: me.name || 'Me', organizer: true, color: COLORS[0] }] }, g, sk));
    const words = me.groups.find(x => x.tag === g.tag)!.words;
    await publish(buildVaultEvent({ v: 1, groups: [{ tag: g.tag, words, organizer: g.organizer }], people: [{ pubkey: me.pubkey, words: me.memberWords }] }, [], [g.tag], sk));
  }
}
