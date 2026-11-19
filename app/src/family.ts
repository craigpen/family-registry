import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { deriveState, readEvent, type EventRecord, type FamilyState, type ItemState, type Person } from '@family-registry/core';
import { db, type Identity, type StoredEvent } from './db.ts';
import { groupsOf, secretKeyOf } from './store.ts';

/*
 * Decrypting and checking an event happens once; the result is cached by event id.
 * The cache resets when this device's groups change, since that changes what's readable.
 */
let cacheKey = '';
const cache = new Map<string, EventRecord>();

export function recordsFor(me: Identity, events: StoredEvent[]): EventRecord[] {
  const key = me.pubkey + me.groups.map(g => g.tag).join();
  if (key !== cacheKey) { cache.clear(); cacheKey = key; }
  const groups = groupsOf(me), sk = secretKeyOf(me);
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
}

export function deriveFamily(me: Identity, events: StoredEvent[]): Family {
  const state = deriveState(recordsFor(me, events), groupsOf(me));
  const self = state.people.get(me.pubkey) ?? {
    pubkey: me.pubkey, name: me.name || 'Me', organizer: false, managed: false, helpers: [], groups: me.groups.map(g => g.tag),
  };
  return {
    ...state, me, self,
    isOrganizer: self.organizer,
    others: [...state.people.values()].filter(p => p.pubkey !== me.pubkey),
    itemsOf: pk => state.items.filter(i => i.owner === pk),
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
