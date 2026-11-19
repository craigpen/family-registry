import * as v from 'valibot';
import { db } from './db.ts';
import type { Family } from './family.ts';
import { addIdea, addItem } from './items.ts';

/*
 * Importing a list from a shop (Amazon to start with). The browser extension reads the list
 * page and hands it to the app's /import page in the same browser (window messages, checked
 * to come from this very page). PLAN.md "Importing an Amazon list".
 */

export const ImportedItem = v.object({
  asin: v.optional(v.string(), ''),
  title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  url: v.optional(v.string(), ''),
  image: v.optional(v.string(), ''),
  price: v.optional(v.string(), ''),
  highest: v.optional(v.boolean(), false),
  notes: v.optional(v.string(), ''),
});
export const ImportedList = v.object({
  source: v.optional(v.string(), 'amazon'),
  name: v.pipe(v.string(), v.maxLength(200)),
  url: v.string(),
  items: v.pipe(v.array(ImportedItem), v.maxLength(500)),
});
export type ImportedList = v.InferOutput<typeof ImportedList>;
export type ImportedItem = v.InferOutput<typeof ImportedItem>;

export const parseImportedList = (raw: unknown) => {
  const r = v.safeParse(ImportedList, raw);
  return r.success ? r.output : null;
};

export type ImportMode = 'mine' | 'helper' | 'ideas';

/** Where items go for a given person: my list, a list I help keep, or secret ideas. */
export function modeFor(fam: Family, pubkey: string): ImportMode {
  if (pubkey === fam.me.pubkey) return 'mine';
  return fam.people.get(pubkey)?.helpers.includes(fam.me.pubkey) ? 'helper' : 'ideas';
}

/** "Lily's birthday" suggests Lily; otherwise whoever this list went to last time, else me. */
export function suggestTarget(fam: Family, list: ImportedList, remembered?: string): string {
  if (remembered && (remembered === fam.me.pubkey || fam.people.has(remembered))) return remembered;
  const name = list.name.toLowerCase();
  const match = fam.others.find(p => new RegExp(`\\b${p.name.replace(/^(Aunt|Uncle) /, '').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(name));
  return match?.pubkey ?? fam.me.pubkey;
}

const asinOf = (url: string) => url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/)?.[1];

/** Items already on the chosen list (matched by Amazon product ID, or failing that by title). */
export function alreadyThere(fam: Family, target: string, item: ImportedItem): boolean {
  const mode = modeFor(fam, target);
  const existing = fam.itemsOf(target).filter(i => (mode === 'ideas') === i.content.surprise);
  return existing.some(i =>
    (item.asin && i.content.links.some(l => asinOf(l) === item.asin)) ||
    i.content.title.trim().toLowerCase() === item.title.trim().toLowerCase());
}

/** Adds the chosen items, and remembers where this list goes for next time. */
export async function importItems(fam: Family, list: ImportedList, target: string, items: ImportedItem[], onProgress?: (n: number) => void): Promise<number> {
  const mode = modeFor(fam, target);
  let n = 0;
  for (const it of items) {
    const draft = {
      title: it.title, links: it.url ? [it.url] : [], price: it.price || undefined, notes: it.notes || undefined,
      reallyWant: it.highest, image: it.image && (it.image.startsWith('data:image/') || it.image.startsWith('https://')) ? it.image : undefined,
      seenAt: it.asin ? 'Amazon' : undefined,
    };
    if (mode === 'ideas') await addIdea(draft, target);
    else await addItem(draft, mode === 'mine' ? undefined : target);
    onProgress?.(++n);
  }
  const prefs = (await db.prefs.get('prefs')) ?? { id: 'prefs' as const, largeText: false };
  await db.prefs.put({ ...prefs, importTargets: { ...(prefs.importTargets ?? {}), [list.url]: target } });
  return n;
}

/* The handshake with the extension, through window messages on this page only. */
export const READY = 'family-registry/import-ready';
export const LIST = 'family-registry/import';

export function listenForList(onList: (list: ImportedList) => void): () => void {
  const handler = (e: MessageEvent) => {
    if (e.source !== window || e.origin !== location.origin) return;
    if (e.data?.type !== LIST) return;
    const list = parseImportedList(e.data.list);
    if (list) onList(list);
  };
  addEventListener('message', handler);
  // Say we're ready (again shortly after, in case the extension's script wasn't listening yet).
  const ready = () => postMessage({ type: READY }, location.origin);
  ready();
  const t = setInterval(ready, 1000);
  return () => { removeEventListener('message', handler); clearInterval(t); };
}
