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
