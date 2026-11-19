import { bytesToHex } from '@noble/hashes/utils.js';
import {
  fingerprint, groupKeys, inviteLink, memberKeys, randomWords, type Invite,
} from '@family-registry/core';
import { db, type Identity } from './db.ts';

/** Signs this device in from a personal link's words. Takes about a second (slow on purpose). */
export async function signIn(inv: Invite, name = ''): Promise<Identity> {
  const [me, group] = await Promise.all([memberKeys(inv.member), groupKeys(inv.group)]);
  const existing = await db.identity.get('me');
  const identity: Identity = {
    id: 'me',
    name: existing?.pubkey === me.pubkey ? existing.name : name,
    memberWords: inv.member,
    groupWords: inv.group,
    organizerWords: inv.organizer,
    secretKey: bytesToHex(me.secretKey),
    pubkey: me.pubkey,
    groupTag: group.tag,
    groupKey: bytesToHex(group.key),
    isOrganizer: fingerprint(me.pubkey).join('-') === inv.organizer.join('-'),
    welcomed: existing?.pubkey === me.pubkey ? existing.welcomed : false,
  };
  await db.identity.put(identity);
  return identity;
}

/** Starts a brand-new family with this person as its organizer. */
export async function startFamily(name: string): Promise<Identity> {
  const member = randomWords();
  const { pubkey } = await memberKeys(member);
  return signIn({ group: randomWords(), member, organizer: fingerprint(pubkey) }, name);
}

export const inviteOf = (id: Identity): Invite => ({ group: id.groupWords, member: id.memberWords, organizer: id.organizerWords });

/** The person's own link, to open on another device. */
export function myLink(id: Identity): string {
  return inviteLink(new URL(import.meta.env.BASE_URL, location.origin).href, inviteOf(id));
}
