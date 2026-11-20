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
 * Taken out of a group: its newest roster (after a full sync) doesn't list me. The group goes
 * from this device; if it was the last one, so does everything else, and the start screen says why.
 * Returns true if this device let go of a group.
 */
export async function leaveRemovedGroups(fam: Family): Promise<boolean> {
  const gone = fam.groups.filter(g => g.rosterBy && !g.members.some(m => m.pubkey === fam.me.pubkey));
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
