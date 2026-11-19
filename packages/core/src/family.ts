import { finalizeEvent, getPublicKey, verifyEvent, type Event } from 'nostr-tools/pure';
import { v2 as nip44 } from 'nostr-tools/nip44';
import { fingerprint, type GroupKeys } from './keys.ts';
import { newItemKey, open, seal, unwrapKey, wrapKey } from './crypto.ts';
import { KIND, MAX_FUTURE_SECONDS, newestVersion, readItemEvent } from './events.ts';
import { claimTag, openClaim, openReveal, resolveClaims, type Claim, type ClaimSummary } from './giving.ts';
import {
  isTombstone, parseJoined, parseRoster, parseVault,
  type Item, type Joined, type Member, type Roster, type RosterInput, type Tombstone, type Vault,
} from './schema.ts';

/** A group this device belongs to: its keys plus the organizer fingerprint from the invite link. */
export interface GroupAccess extends GroupKeys {
  organizer: string[];
}

const now = () => Math.floor(Date.now() / 1000);
const claimTagOf = (i: { itemKey: Uint8Array }) => claimTag(i.itemKey);
const dTagOf = (ev: Event) => ev.tags.find(t => t[0] === 'd')?.[1] ?? '';

/** Events are replaceable per (author, kind, d tag); this is the key a store keeps the newest of. */
export const replaceableKey = (ev: Event) => `${ev.pubkey}:${ev.kind}:${dTagOf(ev)}`;

export const joinedTag = (device: string, groupTag: string) => `joined:${device}:${groupTag.slice(0, 8)}`;
/** One roster per group per organizer: the group goes in the d tag so an organizer's groups don't replace each other. */
export const rosterTag = (groupTag: string) => `roster:${groupTag.slice(0, 8)}`;

/** A group-readable event (roster, joined): content sealed with the group key itself. */
export function buildGroupEvent(d: string, content: unknown, group: GroupKeys, secretKey: Uint8Array, createdAt = now()): Event {
  return finalizeEvent({ kind: KIND, created_at: createdAt, tags: [['d', d], ['h', group.tag]], content: seal(content, group.key) }, secretKey);
}

export const buildRosterEvent = (roster: RosterInput, group: GroupKeys, sk: Uint8Array, createdAt?: number) =>
  buildGroupEvent(rosterTag(group.tag), roster, group, sk, createdAt);

export const buildJoinedEvent = (device: string, group: GroupKeys, sk: Uint8Array, at = now()) =>
  buildGroupEvent(joinedTag(device, group.tag), { v: 1, device, lastSeen: at }, group, sk, at);

/**
 * The organizers' vault: sealed with a random key that's wrapped for each organizer
 * (NIP-44 between the author and that organizer). Tagged with each group so it syncs
 * alongside, but only organizers can open it.
 */
export function buildVaultEvent(vault: Vault, organizers: string[], groupTags: string[], sk: Uint8Array, createdAt = now()): Event {
  const k = newItemKey();
  const tags: string[][] = [['d', 'vault'], ...groupTags.map(t => ['h', t])];
  for (const pk of new Set([getPublicKey(sk), ...organizers])) {
    tags.push(['p', pk, wrapKey(k, nip44.utils.getConversationKey(sk, pk))]);
  }
  return finalizeEvent({ kind: KIND, created_at: createdAt, tags, content: seal(vault, k) }, sk);
}

export function readVaultEvent(ev: Event, sk: Uint8Array): Vault | null {
  const me = getPublicKey(sk);
  const wrapped = ev.tags.find(t => t[0] === 'p' && t[1] === me)?.[2];
  if (!wrapped) return null;
  const k = unwrapKey(wrapped, nip44.utils.getConversationKey(sk, ev.pubkey));
  return k ? parseVault(open(ev.content, k)) : null;
}

/** What one event says, once verified and decrypted. Computed once per event and cached by the app. */
export type EventRecord =
  | { type: 'roster'; id: string; author: string; createdAt: number; group: string; roster: Roster }
  | { type: 'joined'; id: string; author: string; createdAt: number; group: string; joined: Joined }
  | { type: 'item'; id: string; author: string; createdAt: number; itemId: string; itemKey: Uint8Array; groups: string[]; content: Item | Tombstone }
  | { type: 'vault'; id: string; author: string; createdAt: number; vault: Vault }
  /** Claims and reveals: verified, but opened later with the item's key (see deriveState). */
  | { type: 'sealed'; id: string; author: string; createdAt: number; d: string; content: string }
  | { type: 'unreadable'; id: string };

/** Reads any event we might receive. `trusted` skips signature checks for events this device made. */
export function readEvent(ev: Event, groups: GroupKeys[], sk: Uint8Array, opts: { trusted?: boolean; at?: number } = {}): EventRecord {
  const no = { type: 'unreadable' as const, id: ev.id };
  if (ev.kind !== KIND || ev.created_at > (opts.at ?? now()) + MAX_FUTURE_SECONDS) return no;
  if (!opts.trusted && !verifyEvent(ev)) return no;
  const d = dTagOf(ev);
  const base = { id: ev.id, author: ev.pubkey, createdAt: ev.created_at };

  if (d.startsWith('item:')) {
    const r = readItemEvent(ev, groups, opts.at, true);
    if (!r) return no;
    const tags = new Set(ev.tags.filter(t => t[0] === 'k').map(t => t[1]!));
    return { ...base, type: 'item', itemId: r.id, itemKey: r.itemKey, content: r.content, groups: [...tags] };
  }
  if (d === 'vault') {
    const vault = readVaultEvent(ev, sk);
    return vault ? { ...base, type: 'vault', vault } : no;
  }
  if (d.startsWith('claim:') || d.startsWith('given:')) return { ...base, type: 'sealed', d, content: ev.content };
  const h = ev.tags.find(t => t[0] === 'h')?.[1];
  const group = groups.find(g => g.tag === h);
  if (!group) return no;
  const raw = open(ev.content, group.key);
  if (d === rosterTag(group.tag)) {
    const roster = parseRoster(raw);
    return roster ? { ...base, type: 'roster', group: group.tag, roster } : no;
  }
  if (d.startsWith('joined:')) {
    const joined = parseJoined(raw);
    return joined ? { ...base, type: 'joined', group: group.tag, joined } : no;
  }
  return no;
}

export interface Person extends Member {
  /** Tags of the groups this person is in. */
  groups: string[];
}

/** A person as a roster entry. */
export const asMember = ({ pubkey, name, color, birthday, organizer, managed, helpers }: Member): Member =>
  ({ pubkey, name, color, birthday, organizer, managed, helpers });

export interface GroupState {
  tag: string;
  name: string;
  members: Member[];
  /** Who signed the roster we're using, and when. */
  rosterBy?: string;
  rosterAt?: number;
}

export interface ItemState {
  id: string;
  owner: string;
  content: Item;
  itemKey: Uint8Array;
  updatedAt: number;
  updatedBy: string;
  /** Who first added it (for surprise ideas: "Idea from Kate"). */
  addedBy: string;
  /** Groups the current version is readable by. */
  groups: string[];
  /** Claims on it. Never present on the recipient's own device: their app doesn't fetch them. */
  claims: ClaimSummary;
  /** Givers who have revealed it, after the occasion (or early, by tapping Given). */
  given: { by: string; occasion: string; at: number }[];
}

export interface FamilyState {
  groups: GroupState[];
  people: Map<string, Person>;
  items: ItemState[];
  /** Items whose newest version is a removal, as they were last seen (to tell people who were getting them). */
  removed: ItemState[];
  /** pubkey -> device -> last seen (unix seconds), across all groups. */
  joined: Map<string, Map<string, number>>;
  vault: Vault | null;
}

/**
 * The current roster of a group. Starting from the organizer named in the invite link
 * (by fingerprint), a roster is accepted from that key or from anyone an accepted roster
 * lists as an organizer. The newest roster from an accepted organizer wins.
 */
function currentRoster(rosters: Extract<EventRecord, { type: 'roster' }>[], organizer: string[]): Extract<EventRecord, { type: 'roster' }> | undefined {
  const fp = organizer.join('-');
  const accepted = new Set(rosters.filter(r => fingerprint(r.author).join('-') === fp).map(r => r.author));
  for (;;) {
    const best = newestVersion(rosters.map(r => ({ ...r, eventId: r.id })), a => accepted.has(a));
    if (!best) return undefined;
    const before = accepted.size;
    for (const m of best.roster.members) if (m.organizer) accepted.add(m.pubkey);
    if (accepted.size === before) return best;
  }
}

/** Works out the family as it stands from everything we've received. Pure: same records, same answer. */
export function deriveState(records: EventRecord[], groups: GroupAccess[]): FamilyState {
  const rosters = records.filter((r): r is Extract<EventRecord, { type: 'roster' }> => r.type === 'roster');
  const groupStates: GroupState[] = groups.map(g => {
    const r = currentRoster(rosters.filter(x => x.group === g.tag), g.organizer);
    return { tag: g.tag, name: r?.roster.name ?? 'Family', members: r?.roster.members ?? [], rosterBy: r?.author, rosterAt: r?.createdAt };
  });

  const people = new Map<string, Person>();
  for (const g of groupStates) {
    for (const m of g.members) {
      const p = people.get(m.pubkey);
      if (p) {
        p.groups.push(g.tag);
        p.organizer ||= m.organizer;
        p.helpers = [...new Set([...p.helpers, ...m.helpers])];
      } else {
        people.set(m.pubkey, { ...m, helpers: [...m.helpers], groups: [g.tag] });
      }
    }
  }
  // Who may edit: a list item, its owner and their helpers; a surprise idea, anyone in the family but the recipient.
  const mayEdit = (owner: string, surprise: boolean, author: string) =>
    surprise ? author !== owner && people.has(author) : author === owner || !!people.get(owner)?.helpers.includes(author);

  // Items: group versions by id; the owner and kind are fixed by the first valid version.
  const versions = new Map<string, Extract<EventRecord, { type: 'item' }>[]>();
  for (const r of records) if (r.type === 'item') versions.set(r.itemId, [...(versions.get(r.itemId) ?? []), r]);
  const items: ItemState[] = [];
  const removed: ItemState[] = [];
  for (const [id, vs] of versions) {
    const byTime = [...vs].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
    const first = byTime.find(v => !isTombstone(v.content) && mayEdit(v.content.createdFor, v.content.surprise, v.author));
    if (!first || isTombstone(first.content)) continue;
    const { createdFor: owner, surprise } = first.content;
    const allowed = (a: string) => mayEdit(owner, surprise, a);
    const newest = newestVersion(vs.map(v => ({ ...v, eventId: v.id })), allowed);
    const lastContent = newestVersion(vs.filter(v => !isTombstone(v.content) && v.content.createdFor === owner).map(v => ({ ...v, eventId: v.id })), allowed);
    if (!newest || !lastContent || isTombstone(lastContent.content)) continue;
    const state: ItemState = {
      id, owner, content: lastContent.content, itemKey: lastContent.itemKey, updatedAt: newest.createdAt, updatedBy: newest.author,
      addedBy: first.author, groups: newest.groups, claims: { others: [], boughtTwice: false }, given: [],
    };
    if (isTombstone(newest.content)) removed.push(state);
    else if (newest.content.createdFor === owner && newest.content.surprise === surprise) items.push({ ...state, content: newest.content, itemKey: newest.itemKey });
  }

  // Claims and reveals name their item only inside; match them up through each item's key.
  const all = [...items, ...removed];
  const byClaimTag = new Map(all.map(i => [claimTagOf(i), i]));
  const byId = new Map(all.map(i => [i.id, i]));
  const claims = new Map<string, { author: string; createdAt: number; claim: Claim }[]>();
  for (const r of records) {
    if (r.type !== 'sealed') continue;
    if (r.d.startsWith('claim:')) {
      const it = byClaimTag.get(r.d);
      const claim = it && r.author !== it.owner ? openClaim(r.content, it) : null;
      if (claim && it) claims.set(it.id, [...(claims.get(it.id) ?? []), { author: r.author, createdAt: r.createdAt, claim }]);
    } else {
      const it = byId.get(r.d.slice('given:'.length));
      const reveal = it && r.author !== it.owner ? openReveal(r.content, it) : null;
      if (reveal && it) it.given.push({ by: r.author, occasion: reveal.occasion, at: r.createdAt });
    }
  }
  for (const it of all) it.claims = resolveClaims(claims.get(it.id) ?? []);

  const joined = new Map<string, Map<string, number>>();
  for (const r of records) {
    if (r.type !== 'joined') continue;
    const devices = joined.get(r.author) ?? new Map<string, number>();
    devices.set(r.joined.device, Math.max(devices.get(r.joined.device) ?? 0, r.joined.lastSeen));
    joined.set(r.author, devices);
  }

  const organizers = new Set([...people.values()].filter(p => p.organizer).map(p => p.pubkey));
  const vaults = records.filter((r): r is Extract<EventRecord, { type: 'vault' }> => r.type === 'vault');
  const vault = newestVersion(vaults.map(v => ({ ...v, eventId: v.id })), a => organizers.has(a) || organizers.size === 0)?.vault ?? null;

  return { groups: groupStates, people, items, removed, joined, vault };
}
