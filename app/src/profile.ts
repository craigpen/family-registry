import { buildProfileEvent, profileTag, type Profile } from '@family-registry/core';
import { db } from './db.ts';
import { deriveFamily, type Family } from './family.ts';
import { groupsOf, me, nextTime, publish, secretKeyOf } from './store.ts';

/*
 * A person's photo and birthday, in their profile event (PLAN.md "Data model").
 * Written by the person, an organizer, or a helper of a managed person.
 */

async function family(): Promise<Family> {
  return deriveFamily(await me(), await db.events.toArray());
}

/** What to change: a photo (null removes it), a birthday "MM-DD" (null clears it). Left out: kept as is. */
export interface ProfileChanges { photo?: string | null; birthday?: string | null }

/** The profile as it stands now, in the shape it's written. */
function current(fam: Family, person: string): Profile {
  const p = fam.profiles.get(person);
  return { v: 1, ...(p?.photo ? { photo: p.photo } : {}), ...(p?.birthday !== undefined ? { birthday: p.birthday } : {}) };
}

/**
 * Saves changes to someone's profile, readable in every group this device shares with them.
 * Returns an undo that puts back what was there.
 */
export async function saveProfile(person: string, ch: ProfileChanges): Promise<() => Promise<void>> {
  const fam = await family();
  const before = current(fam, person);
  const next: Profile = { ...before };
  if (ch.photo !== undefined) { if (ch.photo) next.photo = ch.photo; else delete next.photo; }
  if (ch.birthday !== undefined) next.birthday = ch.birthday ?? '';
  await write(fam, person, next);
  return async () => write(await family(), person, before);
}

async function write(fam: Family, person: string, profile: Profile) {
  const theirs = fam.people.get(person)?.groups ?? fam.me.groups.map(g => g.tag);
  const groups = groupsOf(fam.me).filter(g => person === fam.me.pubkey || theirs.includes(g.tag));
  const at = nextTime(fam.profiles.get(person)?.at);
  for (const g of groups) {
    const prev = (await db.events.where('slot').equals(`${fam.me.pubkey}:30078:${profileTag(person, g.tag)}`).first())?.createdAt;
    await publish(buildProfileEvent(person, profile, g, secretKeyOf(fam.me), Math.max(at, nextTime(prev))));
  }
}

/** Whose photo and birthday this person may change here. */
export const mayEditProfile = (fam: Family, person: string) => {
  const p = fam.people.get(person);
  return person === fam.me.pubkey || fam.isOrganizer || !!(p?.managed && p.helpers.includes(fam.me.pubkey));
};

/**
 * Profiles I wrote, copied into any group they're missing from (a group joined later, or new
 * words after someone was removed). Runs after each sync; anything already there is skipped.
 */
export async function shareProfilesWithAllGroups(): Promise<void> {
  const fam = await family();
  for (const [person, p] of fam.profiles) {
    if (p.by !== fam.me.pubkey) continue;
    const theirs = fam.people.get(person)?.groups;
    if (!theirs) continue;
    for (const g of groupsOf(fam.me).filter(x => theirs.includes(x.tag))) {
      if (await db.events.where('slot').equals(`${fam.me.pubkey}:30078:${profileTag(person, g.tag)}`).first()) continue;
      await publish(buildProfileEvent(person, current(fam, person), g, secretKeyOf(fam.me), nextTime(p.at)));
    }
  }
}
