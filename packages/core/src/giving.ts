import { finalizeEvent, type Event } from 'nostr-tools/pure';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import * as v from 'valibot';
import type { GroupKeys } from './keys.ts';
import { open, seal } from './crypto.ts';
import { KIND } from './events.ts';

/*
 * Giving: claims ("I'll get this" / "Bought it"), surprise ideas and reveals.
 *
 * The surprise is protected by what each device *fetches*. Claims on someone's items,
 * and surprise ideas for them, carry that person's "hidden" tag instead of the group's
 * `h` tag. Every device subscribes to the hidden tags of everyone except its own person,
 * so the recipient's app never even downloads them (PLAN.md section 6).
 */

const LABEL = {
  hidden: 'family-registry/hidden/v1:',
  claimTag: 'claim-tag',
  claimKey: 'hidden',
} as const;

const now = () => Math.floor(Date.now() / 1000);

/** The tag that marks events about `pubkey` that `pubkey` must never fetch. One per group. */
export const hiddenTag = (group: GroupKeys, pubkey: string) =>
  bytesToHex(hkdf(sha256, group.key, undefined, utf8ToBytes(LABEL.hidden + pubkey), 16));

/** A claim's d tag is blinded, so relays can't link claims to items or count them. */
export const claimTag = (itemKey: Uint8Array) => `claim:${bytesToHex(hmac(sha256, itemKey, utf8ToBytes(LABEL.claimTag))).slice(0, 32)}`;
const claimKey = (itemKey: Uint8Array) => hkdf(sha256, itemKey, undefined, utf8ToBytes(LABEL.claimKey), 32);

export const revealTag = (itemId: string) => `given:${itemId}`;

const ItemId = v.pipe(v.string(), v.regex(/^[0-9a-f]{32}$/));
const Occasion = v.pipe(v.string(), v.regex(/^(christmas-\d{4}|birthday-\d{4}-\d{2}-\d{2})$/));

export const ClaimV1 = v.object({
  v: v.literal(1),
  item: ItemId,
  state: v.picklist(['getting', 'bought', 'released']),
  occasion: Occasion,
});
export type Claim = v.InferOutput<typeof ClaimV1>;
export type ClaimStateName = Claim['state'];

export const RevealV1 = v.object({ v: v.literal(1), item: ItemId, occasion: Occasion });
export type Reveal = v.InferOutput<typeof RevealV1>;

export interface ClaimTarget { id: string; itemKey: Uint8Array; owner: string }

/**
 * A claim by the signer on an item. Tagged with the recipient's hidden tag in each group
 * that can see the item, so the recipient's app never fetches it.
 */
export function buildClaimEvent(item: ClaimTarget, groups: GroupKeys[], claim: { state: ClaimStateName; occasion: string }, sk: Uint8Array, createdAt = now()): Event {
  const content: Claim = { v: 1, item: item.id, ...claim };
  return finalizeEvent({
    kind: KIND, created_at: createdAt,
    tags: [['d', claimTag(item.itemKey)], ...groups.map(g => ['x', hiddenTag(g, item.owner)])],
    content: seal(content, claimKey(item.itemKey)),
  }, sk);
}

export function openClaim(content: string, item: ClaimTarget): Claim | null {
  const r = v.safeParse(ClaimV1, open(content, claimKey(item.itemKey)));
  return r.success && r.output.item === item.id ? r.output : null;
}

/** The giver tells the recipient's app that this was given (after the occasion). Readable by the recipient. */
export function buildRevealEvent(item: ClaimTarget, groups: GroupKeys[], occasion: string, sk: Uint8Array, createdAt = now()): Event {
  const content: Reveal = { v: 1, item: item.id, occasion };
  return finalizeEvent({
    kind: KIND, created_at: createdAt,
    tags: [['d', revealTag(item.id)], ...groups.map(g => ['h', g.tag])],
    content: seal(content, item.itemKey),
  }, sk);
}

export function openReveal(content: string, item: ClaimTarget): Reveal | null {
  const r = v.safeParse(RevealV1, open(content, item.itemKey));
  return r.success && r.output.item === item.id ? r.output : null;
}

export interface ActiveClaim { author: string; state: 'getting' | 'bought'; occasion: string; createdAt: number }

export interface ClaimSummary {
  /** Whoever has it: the first to buy it, or else the first to say "I'll get this". */
  holder?: ActiveClaim;
  /** Everyone else with an active claim. */
  others: ActiveClaim[];
  /** Two or more people bought it: nobody is overruled, they're all told. */
  boughtTwice: boolean;
}

/**
 * Who gets it when two people claim (PLAN.md "Who gets it when two people claim"):
 * bought beats getting; then the earlier claim; ties go to the lower pubkey.
 * Future-dated events were already dropped when read.
 */
export function resolveClaims(claims: { author: string; createdAt: number; claim: Claim }[]): ClaimSummary {
  // Newest claim per person is what they currently say.
  const latest = new Map<string, { author: string; createdAt: number; claim: Claim }>();
  for (const c of claims) {
    const cur = latest.get(c.author);
    if (!cur || c.createdAt > cur.createdAt) latest.set(c.author, c);
  }
  const active: ActiveClaim[] = [...latest.values()]
    .filter(c => c.claim.state !== 'released')
    .map(c => ({ author: c.author, state: c.claim.state as 'getting' | 'bought', occasion: c.claim.occasion, createdAt: c.createdAt }));
  const order = (a: ActiveClaim, b: ActiveClaim) =>
    (a.state === b.state ? 0 : a.state === 'bought' ? -1 : 1) || a.createdAt - b.createdAt || (a.author < b.author ? -1 : 1);
  active.sort(order);
  return { holder: active[0], others: active.slice(1), boughtTwice: active.filter(c => c.state === 'bought').length > 1 };
}

/* ---------- Occasions ---------- */

export interface Occasion { id: string; kind: 'christmas' | 'birthday'; date: string }

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Today as YYYY-MM-DD in local time. */
export const today = (d = new Date()) => iso(d);

export function occasionFromId(id: string): Occasion | null {
  let m = id.match(/^christmas-(\d{4})$/);
  if (m) return { id, kind: 'christmas', date: `${m[1]}-12-25` };
  m = id.match(/^birthday-(\d{4}-\d{2}-\d{2})$/);
  return m ? { id, kind: 'birthday', date: m[1]! } : null;
}

/** The next Christmas and the next birthday (if known), soonest first. Today counts as upcoming. */
export function upcomingOccasions(birthday: string | undefined, on = today()): Occasion[] {
  const year = Number(on.slice(0, 4));
  const xmas = `${year}-12-25` >= on ? year : year + 1;
  const list: Occasion[] = [{ id: `christmas-${xmas}`, kind: 'christmas', date: `${xmas}-12-25` }];
  if (birthday) {
    const y = `${year}-${birthday}` >= on ? year : year + 1;
    list.push({ id: `birthday-${y}-${birthday}`, kind: 'birthday', date: `${y}-${birthday}` });
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** True from the day after the occasion. */
export const occasionPassed = (id: string, on = today()) => {
  const o = occasionFromId(id);
  return !!o && on > o.date;
};
