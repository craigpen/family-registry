import { bytesToHex } from '@noble/hashes/utils.js';
import { groupKeys } from '@family-registry/core';
import { db, type MyGroup } from './db.ts';
import type { Family } from './family.ts';
import { NAMESPACE, REMOVED_KEY } from './identity.ts';

/*
 * Removing someone gives each of their groups new words (people.ts `removePerson`). Everyone who
 * stays gets them in a sealed event only they can open; their app moves over here, by itself.
 * The old words are kept, only to read what was written before. The person who was removed
 * finds the group's roster without them, and their app lets go of the group.
 */

/** Swaps a group for its new words on this device, keeping the old ones for reading. */
export async function moveGroup(oldTag: string, next: MyGroup) {
  await db.transaction('rw', db.identity, async () => {
    const me = (await db.identity.get('me'))!;
    const old = me.groups.find(g => g.tag === oldTag);
    if (!old) return;
    const groups = me.groups.some(g => g.tag === next.tag)
      ? me.groups.filter(g => g.tag !== oldTag)
      : me.groups.map(g => (g.tag === oldTag ? next : g));
    const oldGroups = [...(me.oldGroups ?? []).filter(g => g.tag !== oldTag), old];
    await db.identity.put({ ...me, groups, oldGroups });
  });
}

let following = false;

/** Moves to any new words an organizer has given my groups. True if anything moved. */
export async function followRekeys(fam: Family): Promise<boolean> {
  if (following || !fam.rekeys.size) return false;
  following = true;
  let moved = false;
  try {
    for (const [tag, r] of fam.rekeys) {
      const old = fam.me.groups.find(g => g.tag === tag);
      if (!old) continue;
      const keys = await groupKeys(r.words, NAMESPACE);
      if (keys.tag === tag) continue;
      await moveGroup(tag, { words: r.words, organizer: old.organizer, tag: keys.tag, key: bytesToHex(keys.key), from: tag });
      moved = true;
    }
  } finally {
    following = false;
  }
  return moved;
}

/**
 * Remembers, per group, the newest roster that listed me. Only a roster made after that one,
 * without me, means I was removed: a device that has just signed in can briefly hold an older
 * roster from before I was added, and that must never sign it out.
 */
export async function noteRosters(fam: Family) {
  const me = fam.me.pubkey;
  const fresh = fam.groups.filter(g => g.rosterAt && g.members.some(m => m.pubkey === me)
    && (fam.me.groups.find(x => x.tag === g.tag)?.seenIn ?? 0) < g.rosterAt);
  if (!fresh.length) return;
  await db.transaction('rw', db.identity, async () => {
    const id = (await db.identity.get('me'))!;
    await db.identity.put({ ...id, groups: id.groups.map(x => {
      const g = fresh.find(f => f.tag === x.tag);
      return g ? { ...x, seenIn: Math.max(x.seenIn ?? 0, g.rosterAt!) } : x;
    }) });
  });
}

/**
 * Taken out of a group: after a full sync, its roster is newer than the last one that listed me,
 * and doesn't. The group goes from this device; if it was the last one, so does everything else,
 * and the start screen says why. Returns true if this device let go of a group.
 */
export async function leaveRemovedGroups(fam: Family): Promise<boolean> {
  const gone = fam.groups.filter(g => {
    const seenIn = fam.me.groups.find(x => x.tag === g.tag)?.seenIn;
    return g.rosterBy && g.rosterAt && seenIn !== undefined && g.rosterAt > seenIn && !g.members.some(m => m.pubkey === fam.me.pubkey);
  });
  if (!gone.length) return false;
  const left = fam.me.groups.filter(g => !gone.some(x => x.tag === g.tag));
  if (left.length) {
    await db.identity.update('me', { groups: left });
    return true;
  }
  try { localStorage.setItem(REMOVED_KEY, gone[0]!.name); } catch { /* only a note */ }
  await db.transaction('rw', db.identity, db.events, db.outbox, async () => {
    await Promise.all([db.identity.clear(), db.events.clear(), db.outbox.clear()]);
  });
  return true;
}
