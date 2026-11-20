import { buildPairEvent, newPairCode, openPairEvent, pairSecrets, type Pairing } from '@family-registry/core';
import { db, type Identity } from './db.ts';
import type { Family } from './family.ts';
import { NAMESPACE, signIn } from './identity.ts';
import { sync } from './sync.ts';

/*
 * Pairing a device with a 6-digit code: "Use it on another device" on a signed-in one, "I have a code"
 * on the new one. Also how an iPhone's Home Screen app signs in when it doesn't share
 * Safari's storage (PLAN.md "The iOS gap").
 *
 * "I lost my link" runs it the other way round: the lost device makes the code and shows it,
 * the person reads it out to an organizer, and the organizer's app posts their words under it.
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

/**
 * An organizer signing someone's device in with the number it shows ("I lost my link"):
 * posts that person's words, for all their groups, under the number for 10 minutes.
 * False when their words aren't in the family backup here, or the post didn't go out.
 */
export async function sendPairingFor(fam: Family, pubkey: string, code: string): Promise<boolean> {
  const person = fam.people.get(pubkey);
  const words = fam.vault?.people.find(p => p.pubkey === pubkey)?.words;
  if (!person || !words) return false;
  const groups = person.groups
    .map(tag => fam.vault?.groups.find(g => g.tag === tag) ?? fam.me.groups.find(g => g.tag === tag))
    .filter(g => g !== undefined)
    .map(g => ({ words: g.words, organizer: g.organizer }));
  if (!groups.length) return false;
  const pairing: Pairing = { v: 1, name: person.name, member: words, groups };
  return sync.sendNow(buildPairEvent(pairing, await pairSecrets(code, NAMESPACE)));
}

/**
 * An organizer showing a code for someone (Show a code): their words go out under a fresh code
 * for 10 minutes, and their device types it in. Null when that couldn't be done.
 */
export async function offerPairingFor(fam: Family, pubkey: string): Promise<string | null> {
  const code = newPairCode();
  return (await sendPairingFor(fam, pubkey, code)) ? code : null;
}

/**
 * The lost device's side: checks every few seconds until an organizer has sent this person's
 * words under `code` (then signs in), the 10 minutes run out, or `signal` stops it.
 */
export async function waitForPairing(code: string, signal: AbortSignal, every = 3000): Promise<PairResult | 'expired' | 'stopped'> {
  const until = Date.now() + 10 * 60_000;
  while (Date.now() < until) {
    if (signal.aborted) return 'stopped';
    try {
      const r = await pairWithCode(code);
      if (r !== 'not-found') return r;
    } catch { /* offline for a moment: keep trying */ }
    await new Promise(res => setTimeout(res, every));
  }
  return 'expired';
}
