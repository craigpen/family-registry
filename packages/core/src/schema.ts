import * as v from 'valibot';

/*
 * Event content formats. Fields are only ever ADDED (optional, with defaults);
 * never renamed or repurposed. Content from a version we don't know is skipped.
 */

const Hex64 = v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/));
const Image = v.pipe(v.string(), v.maxLength(60_000), v.check(s => s.startsWith('data:image/') || s.startsWith('https://'), 'image must be data: or https:'));

export const ItemV1 = v.object({
  v: v.literal(1),
  title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  links: v.optional(v.pipe(v.array(v.pipe(v.string(), v.url(), v.maxLength(2000))), v.maxLength(10)), []),
  image: v.optional(Image),
  price: v.optional(v.pipe(v.string(), v.maxLength(40))),
  notes: v.optional(v.pipe(v.string(), v.maxLength(2000))),
  reallyWant: v.optional(v.boolean(), false),
  seenAt: v.optional(v.pipe(v.string(), v.maxLength(100))),
  /** The recipient's pubkey. */
  createdFor: Hex64,
  /** A surprise idea: hidden from the recipient. */
  surprise: v.optional(v.boolean(), false),
  /** When the recipient marked it "Got it" themselves (unix seconds). */
  gotAt: v.optional(v.number()),
});
export type Item = v.InferOutput<typeof ItemV1>;
export type ItemInput = v.InferInput<typeof ItemV1>;

export const TombstoneV1 = v.object({ v: v.literal(1), deleted: v.literal(true) });
export type Tombstone = v.InferOutput<typeof TombstoneV1>;

export const ItemContent = v.union([TombstoneV1, ItemV1]);

/** Parses decrypted item content. Returns null for anything invalid or from an unknown version. */
export function parseItem(raw: unknown): Item | Tombstone | null {
  const r = v.safeParse(ItemContent, raw);
  return r.success ? r.output : null;
}

export const isTombstone = (x: Item | Tombstone): x is Tombstone => 'deleted' in x;

const MonthDay = v.pipe(v.string(), v.regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/));
/** The year someone was born, so a birthday can say "turns 10". Optional everywhere. */
const BirthYear = v.pipe(v.number(), v.integer(), v.minValue(1900), v.maxValue(2100));
const Name = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(60));
const Words = v.pipe(v.array(v.pipe(v.string(), v.regex(/^[a-z]+$/))), v.minLength(4), v.maxLength(12));

export const MemberV1 = v.object({
  pubkey: Hex64,
  name: Name,
  /** The face color, e.g. "#CF4339". */
  color: v.optional(v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}$/))),
  /** "MM-DD". */
  birthday: v.optional(MonthDay),
  /** Added later: the year they were born. */
  birthYear: v.optional(BirthYear),
  organizer: v.optional(v.boolean(), false),
  /** Someone who doesn't use the app (a toddler, a friend); their helpers keep their list. */
  managed: v.optional(v.boolean(), false),
  /** People allowed to edit this person's list. */
  helpers: v.optional(v.pipe(v.array(Hex64), v.maxLength(20)), []),
  /** Added later: who they're married to (or partnered with), and their anniversary ("MM-DD", year optional). Set on both. */
  partner: v.optional(Hex64),
  anniversary: v.optional(MonthDay),
  anniversaryYear: v.optional(BirthYear),
});
export type Member = v.InferOutput<typeof MemberV1>;
export type MemberInput = v.InferInput<typeof MemberV1>;

/** `d = roster`: signed by an organizer, encrypted with the group key. */
export const RosterV1 = v.object({
  v: v.literal(1),
  name: Name,
  members: v.pipe(v.array(MemberV1), v.maxLength(200)),
});
export type Roster = v.InferOutput<typeof RosterV1>;
export type RosterInput = v.InferInput<typeof RosterV1>;

/** `d = joined:<device>:<group>`: a member's device saying it's set up and when it was last open. */
const Short = v.pipe(v.string(), v.maxLength(20));
/** What kind of device it is, so the person's other devices and the organizers can tell where they're set up. */
export const DeviceKindV1 = v.object({
  /** "ios", "android" or "desktop" (others may come later). */
  platform: v.optional(Short),
  /** "Chrome", "Edge", "Safari", "Firefox", "Samsung"... */
  browser: v.optional(Short),
  /** Running as an installed app (Home Screen, installed window), not a browser tab. */
  app: v.optional(v.boolean()),
  /** The gift button (browser extension) is installed alongside. */
  button: v.optional(v.boolean()),
});
export type DeviceKind = v.InferOutput<typeof DeviceKindV1>;

export const JoinedV1 = v.object({
  v: v.literal(1),
  device: v.pipe(v.string(), v.maxLength(40)),
  lastSeen: v.number(),
  /** Added later: older devices don't say. */
  kind: v.optional(DeviceKindV1),
});
export type Joined = v.InferOutput<typeof JoinedV1>;

/**
 * `d = profile:<person pubkey>:<group>`: a person's own photo and birthday, encrypted with the group key.
 * Kept apart from the roster so photos don't crowd it (one roster carries everyone, capped at 64 KB).
 * Written by the person, an organizer, or a helper of a managed person; the newest accepted one wins.
 */
export const ProfileV1 = v.object({
  v: v.literal(1),
  /** A small square face photo, a data: URL (WebP, about 160 px, around 8 KB). Absent: no photo. */
  photo: v.optional(v.pipe(v.string(), v.maxLength(24_000), v.check(s => s.startsWith('data:image/'), 'photo must be data:image/'))),
  /** "MM-DD", overriding the roster's. An empty string means "no birthday"; absent means "use the roster's". */
  birthday: v.optional(v.union([MonthDay, v.literal('')])),
  /** Added later: the year they were born, overriding the roster's. 0 means "none"; absent means "use the roster's". */
  birthYear: v.optional(v.union([BirthYear, v.literal(0)])),
});
export type Profile = v.InferOutput<typeof ProfileV1>;

/** `d = vault`: the organizers' copy of everyone's words: the family backup. Readable by organizers only. */
export const VaultV1 = v.object({
  v: v.literal(1),
  groups: v.pipe(v.array(v.object({ tag: v.string(), words: Words, organizer: Words })), v.maxLength(20)),
  people: v.pipe(v.array(v.object({ pubkey: Hex64, words: Words, invitedAt: v.optional(v.number()) })), v.maxLength(200)),
});
export type Vault = v.InferOutput<typeof VaultV1>;

/**
 * `d = rekey:<old group>`: after someone is removed, an organizer gives the group new words.
 * Sealed like the vault, for each remaining member only, and tagged with the old group so they find it.
 */
export const RekeyV1 = v.object({ v: v.literal(1), words: Words });
export type Rekey = v.InferOutput<typeof RekeyV1>;

const parser = <T extends v.GenericSchema>(schema: T) => (raw: unknown): v.InferOutput<T> | null => {
  const r = v.safeParse(schema, raw);
  return r.success ? r.output : null;
};
export const parseRoster = parser(RosterV1);
export const parseJoined = parser(JoinedV1);
export const parseVault = parser(VaultV1);
export const parseProfile = parser(ProfileV1);
export const parseRekey = parser(RekeyV1);
