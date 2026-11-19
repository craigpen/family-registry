import { buildPairEvent, newPairCode, openPairEvent, pairSecrets, type Pairing } from '@family-registry/core';
import { db, type Identity } from './db.ts';
import { NAMESPACE, signIn } from './identity.ts';
import { sync } from './sync.ts';

/*
 * Pairing a device with a 6-digit code: "Add a device" on a signed-in one, "I have a code"
 * on the new one. Also how an iPhone's Home Screen app signs in when it doesn't share
 * Safari's storage (PLAN.md "The iOS gap").
 */

/** Posts this person's words for 10 minutes under a fresh code, and returns the code. */
export async function offerPairing(me: Identity): Promise<string | null> {
  const code = newPairCode();
  const pairing: Pairing = { v: 1, name: me.name, member: me.memberWords, groups: me.groups.map(g => ({ words: g.words, organizer: g.organizer })) };
  const sent = await sync.sendNow(buildPairEvent(pairing, await pairSecrets(code, NAMESPACE)));
  return sent ? code : null;
}

export type PairResult = 'paired' | 'not-found' | 'someone-else';

/** Finds what was posted under this code and signs this device in as that person, in all their groups. */
export async function pairWithCode(code: string): Promise<PairResult> {
  const secrets = await pairSecrets(code, NAMESPACE);
  const events = await sync.fetchOnce({ kinds: [30078], '#d': [secrets.d] });
  const pairing = events.map(e => openPairEvent(e, secrets)).find(p => p !== null);
  if (!pairing) return 'not-found';
  for (const g of pairing.groups) {
    const r = await signIn({ group: g.words, member: pairing.member, organizer: g.organizer }, pairing.name);
    if (r.kind === 'someone-else') return 'someone-else';
  }
  // They've already been welcomed on their other device.
  await db.identity.update('me', { welcomed: true });
  return 'paired';
}
