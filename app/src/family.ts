import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MAX_FUTURE_SECONDS, deriveState, hiddenTag, readEvent, type EventRecord, type FamilyState, type ItemState, type Person } from '@family-registry/core';
import { db, type Identity, type StoredEvent } from './db.ts';
import { groupsOf, readableGroupsOf, secretKeyOf } from './store.ts';

/*
 * Decrypting and checking an event happens once; the result is cached by event id.
 * The cache resets when this device's groups change, since that changes what's readable.
 */
let cacheKey = '';
const cache = new Map<string, EventRecord>();

export function recordsFor(me: Identity, events: StoredEvent[]): EventRecord[] {
  const key = me.pubkey + me.groups.map(g => g.tag).join() + ':' + (me.oldGroups ?? []).map(g => g.tag).join();
  if (key !== cacheKey) { cache.clear(); cacheKey = key; }
  const groups = readableGroupsOf(me), sk = secretKeyOf(me);
  return events.map(e => {
    let r = cache.get(e.id);
    if (!r) { r = readEvent(e.event, groups, sk, { trusted: e.mine }); cache.set(e.id, r); }
    return r;
  });
}

export interface Family extends FamilyState {
  me: Identity;
  /** Me as the roster has me, or a stand-in built from this device's identity. */
  self: Person;
  isOrganizer: boolean;
  /** Everyone else, in roster order. */
  others: Person[];
  itemsOf: (pubkey: string) => ItemState[];
  /**
   * Minutes this device's clock is behind the family's: others' things dated over an hour ahead
   * are set aside until their time comes, so a clock set wrong (often the time zone) hides them. 0 when fine.
   */
  clockBehind: number;
}

export function deriveFamily(me: Identity, events: StoredEvent[]): Family {
  const state = deriveState(recordsFor(me, events), groupsOf(me));
  const self = state.people.get(me.pubkey) ?? {
    pubkey: me.pubkey, name: me.name || 'Me', organizer: false, managed: false, helpers: [], groups: me.groups.map(g => g.tag),
  };
  // Belt and braces: this device never fetches claims on my items or surprise ideas for me,
  // but if any arrived anyway, they're dropped here before anything can show them.
  const items = state.items
    .filter(i => !(i.owner === me.pubkey && i.content.surprise))
    .map(i => (i.owner === me.pubkey ? { ...i, claims: { others: [], boughtTwice: false } } : i));
  const now = Math.floor(Date.now() / 1000);
  const ahead = Math.max(0, ...events.filter(e => e.event.pubkey !== me.pubkey && e.event.created_at > now + MAX_FUTURE_SECONDS).map(e => e.event.created_at - now));
  return {
    ...state, items, me, self, clockBehind: Math.round(ahead / 60),
    isOrganizer: self.organizer,
    others: [...state.people.values()].filter(p => p.pubkey !== me.pubkey),
    itemsOf: pk => items.filter(i => i.owner === pk),
  };
}

/** The family as this device currently knows it. `undefined` while loading, `null` when not signed in. */
export function useFamily(): Family | null | undefined {
  const me = useLiveQuery(() => db.identity.get('me').then(x => x ?? null), [], undefined);
  const events = useLiveQuery(() => db.events.toArray(), [], undefined);
  return useMemo(() => {
    if (me === undefined || events === undefined) return undefined;
    if (me === null) return null;
    return deriveFamily(me, events);
  }, [me, events]);
}

/**
 * The hidden tags this device fetches: everyone's in each group, except this person's own.
 * This is what keeps claims and surprise ideas for you off your device.
 */
export function hiddenTagsToFetch(fam: Family): string[] {
  const out = new Set<string>();
  for (const g of groupsOf(fam.me)) {
    const members = fam.groups.find(x => x.tag === g.tag)?.members ?? [];
    for (const m of members) if (m.pubkey !== fam.me.pubkey) out.add(hiddenTag(g, m.pubkey));
  }
  // Claims made before someone was removed stay under the old words: keep fetching those (never my own).
  for (const g of readableGroupsOf(fam.me).slice(fam.me.groups.length)) {
    for (const p of fam.people.keys()) if (p !== fam.me.pubkey) out.add(hiddenTag(g, p));
  }
  return [...out].sort();
}
