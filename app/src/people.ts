import { bytesToHex } from '@noble/hashes/utils.js';
import {
  asMember, buildRosterEvent, buildVaultEvent, fingerprint, groupKeys, memberKeys, randomWords,
  type Member, type Vault,
} from '@family-registry/core';
import { db, type MyGroup } from './db.ts';
import { deriveFamily, type Family } from './family.ts';
import { COLORS, NAMESPACE, linkFor } from './identity.ts';
import { saveProfile } from './profile.ts';
import { groupsOf, me, nextTime, publish, secretKeyOf } from './store.ts';

/*
 * Organizer actions: the roster (who's in each group) and the vault (everyone's words).
 * Both are replaceable events; each change publishes a new version.
 */

async function family(): Promise<Family> {
  return deriveFamily(await me(), await db.events.toArray());
}

async function saveRoster(fam: Family, tag: string, members: Member[], name?: string) {
  const g = groupsOf(fam.me).find(x => x.tag === tag)!;
  const cur = fam.groups.find(x => x.tag === tag)!;
  // Each organizer signs their own version; the newest accepted one wins on every device.
  await publish(buildRosterEvent({ v: 1, name: name ?? cur.name, members: members.map(asMember) }, g, secretKeyOf(fam.me), nextTime(cur.rosterAt)));
}

async function saveVault(fam: Family, vault: Vault) {
  const organizers = [...fam.people.values()].filter(p => p.organizer).map(p => p.pubkey);
  const prev = (await db.events.where('slot').equals(`${fam.me.pubkey}:30078:vault`).first())?.createdAt;
  await publish(buildVaultEvent(vault, organizers, fam.me.groups.map(g => g.tag), secretKeyOf(fam.me), nextTime(prev)));
}

const emptyVault = (fam: Family): Vault => ({ v: 1, groups: [], people: [{ pubkey: fam.me.pubkey, words: fam.me.memberWords }] });

/** Makes sure the vault knows every group this organizer is in (with its words). */
function withGroups(fam: Family, vault: Vault): Vault {
  const groups = [...vault.groups];
  for (const g of fam.me.groups) if (!groups.some(x => x.tag === g.tag)) groups.push({ tag: g.tag, words: g.words, organizer: g.organizer });
  return { ...vault, groups };
}

export interface NewPerson {
  name: string;
  birthday?: string;
  groups: string[];
  /** Won't use the app (a young child, say): their helpers keep their list. */
  managed?: boolean;
  /** People who can add to and edit their list. */
  helpers?: string[];
}

/** Adds someone to the family: new words, a place in each chosen group's roster, and a copy in the vault. */
export async function addPerson(p: NewPerson): Promise<string> {
  const fam = await family();
  const words = randomWords();
  const { pubkey } = await memberKeys(words);
  const color = COLORS[(fam.people.size) % COLORS.length];
  for (const tag of p.groups) {
    const g = fam.groups.find(x => x.tag === tag)!;
    await saveRoster(fam, tag, [...g.members, {
      pubkey, name: p.name.trim(), birthday: p.birthday || undefined, color, organizer: false,
      managed: !!p.managed, helpers: p.helpers ?? (p.managed ? [fam.me.pubkey] : []),
    }]);
  }
  const vault = withGroups(fam, fam.vault ?? emptyVault(fam));
  await saveVault(fam, { ...vault, people: [...vault.people, { pubkey, words }] });
  return pubkey;
}

/** Adds people who are already in the family to another group. */
export async function addToGroup(tag: string, pubkeys: string[]) {
  const fam = await family();
  const g = fam.groups.find(x => x.tag === tag)!;
  const add = pubkeys.map(pk => fam.people.get(pk)).filter(p => p && !g.members.some(m => m.pubkey === p.pubkey)) as Member[];
  if (add.length) await saveRoster(fam, tag, [...g.members, ...add.map(p => ({ ...p, organizer: false }))]);
}

/** Starts another group (say "Family + in-laws") that this organizer runs. */
export async function createGroup(name: string, memberPubkeys: string[]): Promise<string> {
  const fam = await family();
  const words = randomWords();
  const keys = await groupKeys(words, NAMESPACE);
  const group: MyGroup = { words, organizer: fingerprint(fam.me.pubkey), tag: keys.tag, key: bytesToHex(keys.key) };
  await db.identity.update('me', { groups: [...fam.me.groups, group] });
  const updated = deriveFamily((await db.identity.get('me'))!, await db.events.toArray());
  const others = memberPubkeys.map(pk => fam.people.get(pk)).filter(p => !!p).map(p => ({ ...p, organizer: false }));
  await saveRoster(updated, group.tag, [{ ...fam.self, organizer: true }, ...others], name.trim());
  await saveVault(updated, withGroups(updated, updated.vault ?? emptyVault(updated)));
  return group.tag;
}

export async function renameGroup(tag: string, name: string) {
  const fam = await family();
  await saveRoster(fam, tag, fam.groups.find(g => g.tag === tag)!.members, name.trim());
}

/** Remembers when someone's invite went out, for the organizer view. */
export async function markInvited(pubkey: string) {
  const fam = await family();
  const vault = withGroups(fam, fam.vault ?? emptyVault(fam));
  await saveVault(fam, { ...vault, people: vault.people.map(p => (p.pubkey === pubkey ? { ...p, invitedAt: Math.floor(Date.now() / 1000) } : p)) });
}

/** A person's link into a group, rebuilt from the vault. */
export function inviteLinkFor(fam: Family, pubkey: string, tag: string): string | undefined {
  const person = fam.vault?.people.find(p => p.pubkey === pubkey);
  const group = fam.vault?.groups.find(g => g.tag === tag) ?? fam.me.groups.find(g => g.tag === tag);
  return person && group ? linkFor(group.words, person.words, group.organizer) : undefined;
}

export interface PersonChanges { name?: string; birthday?: string | null; helpers?: string[]; managed?: boolean; organizer?: boolean }

/** Changes someone's details in every group they're in. */
export async function updatePerson(pubkey: string, ch: PersonChanges) {
  let fam = await family();
  for (const g of fam.groups) {
    if (!g.members.some(m => m.pubkey === pubkey)) continue;
    await saveRoster(fam, g.tag, g.members.map(m => m.pubkey !== pubkey ? m : {
      ...m,
      ...(ch.name !== undefined ? { name: ch.name.trim() } : {}),
      ...(ch.birthday !== undefined ? { birthday: ch.birthday ?? undefined } : {}),
      ...(ch.helpers !== undefined ? { helpers: ch.helpers.filter(h => h !== pubkey) } : {}),
      ...(ch.managed !== undefined ? { managed: ch.managed } : {}),
      ...(ch.organizer !== undefined ? { organizer: ch.organizer } : {}),
    }));
    fam = await family();
  }
  // A birthday the person set themselves would hide the roster's: change it there too.
  if (ch.birthday !== undefined && fam.profiles.get(pubkey)?.birthday !== undefined) await saveProfile(pubkey, { birthday: ch.birthday });
  // A new co-organizer needs to be able to open the vault.
  if (ch.organizer) await saveVault(fam, withGroups(fam, fam.vault ?? emptyVault(fam)));
}
