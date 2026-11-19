import { useLiveQuery } from 'dexie-react-hooks';
import type { ItemState } from '@family-registry/core';
import { db } from './db.ts';

/*
 * "New since your last visit" dots, instead of push notifications. Kept per person on
 * this device: when you last opened their list. Before that, anything added after you
 * joined counts as new.
 */

export interface Seen { since: number; at: Record<string, number> }

export function useSeen(): Seen {
  const prefs = useLiveQuery(() => db.prefs.get('prefs'), []);
  return { since: prefs?.since ?? Math.floor(Date.now() / 1000), at: prefs?.seen ?? {} };
}

export const lastSeen = (seen: Seen, pubkey: string) => seen.at[pubkey] ?? seen.since;

/** Something's new if someone else changed it after you last looked. */
export const isNew = (seen: Seen, pubkey: string, it: ItemState, me: string) =>
  it.updatedBy !== me && it.updatedAt > lastSeen(seen, pubkey);

export async function markSeen(pubkey: string) {
  const p = (await db.prefs.get('prefs')) ?? { id: 'prefs' as const, largeText: false };
  await db.prefs.put({ ...p, seen: { ...(p.seen ?? {}), [pubkey]: Math.floor(Date.now() / 1000) } });
}

export async function startSeen() {
  const p = (await db.prefs.get('prefs')) ?? { id: 'prefs' as const, largeText: false };
  if (!p.since) await db.prefs.put({ ...p, since: Math.floor(Date.now() / 1000) });
}
