/*
 * Best-effort details for a pasted or shared link when nothing could read the page
 * (Paste link, or Android without the helper). See PLAN.md "Link previews, with no server".
 */

const SITE_NAMES: Record<string, string> = {
  'amazon': 'Amazon', 'amzn': 'Amazon', 'a.co': 'Amazon', 'target': 'Target', 'walmart': 'Walmart',
  'etsy': 'Etsy', 'ebay': 'eBay', 'johnlewis': 'John Lewis', 'lego': 'LEGO', 'ikea': 'IKEA',
  'bestbuy': 'Best Buy', 'rei': 'REI', 'michaels': 'Michaels', 'costco': 'Costco', 'argos': 'Argos',
};

/** "www.johnlewis.com" -> "John Lewis"; unknown shops get a tidied domain ("Fancyshop"). */
export function siteName(url: string): string | undefined {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return undefined; }
  host = host.replace(/^(www|m|smile|shop)\./, '');
  if (SITE_NAMES[host]) return SITE_NAMES[host];
  const parts = host.split('.');
  // "fancykites.co.uk": skip second-level suffixes such as co.uk and com.au
  const sld = parts.length >= 3 && /^(co|com|org|net|ac|gov)$/.test(parts[parts.length - 2]!);
  const base = parts[parts.length - (sld ? 3 : 2)] ?? host;
  return SITE_NAMES[base] ?? base.charAt(0).toUpperCase() + base.slice(1);
}

const STOP = /^(dp|gp|product|products|p|ip|item|itm|listing|s|ref|buy|shop|en|us|uk|www|html?|index)$/i;

/** A title from the URL's path: `/LEGO-Botanical-Bonsai-Tree/dp/B0…` -> "LEGO Botanical Bonsai Tree". */
export function titleFromUrl(url: string): string | undefined {
  let path: string;
  try { path = decodeURIComponent(new URL(url).pathname); } catch { return undefined; }
  const best = path.split('/')
    .map(s => s.replace(/\.(html?|php|aspx?)$/i, ''))
    .filter(s => !STOP.test(s) && /[a-z]/i.test(s) && /[-_ ]/.test(s) && !/^[A-Z0-9]{8,}$/.test(s))
    .map(s => s.split(/[-_ ]+/).filter(w => w && !/^\d{5,}$/.test(w)))
    .filter(ws => ws.length >= 2)
    .sort((a, b) => b.length - a.length)[0];
  if (!best) return undefined;
  return best.map(w => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

const FILLER = new Set(('check this that out deal deals item items product look at see found i on from via in the a an great cool ' +
  'awesome nice share shared sharing with you me have take it app here is what think love like wow just my one amazing').split(' '));

/**
 * Share text that says nothing about the thing itself, such as "Check this deal out on Amazon"
 * (what the Amazon app shares): only filler words and the shop's name.
 */
export function isGenericShareText(text: string, site?: string): boolean {
  const words = text.replace(/https?:\/\/\S+/g, ' ').toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);
  const shop = site?.toLowerCase().split(/\s+/) ?? [];
  return words.every(w => FILLER.has(w) || shop.includes(w) || /\.(com|co|net|org)$/.test(w));
}

/** A title from share text like "Check out LEGO Botanical Bonsai on Amazon". */
export function titleFromShareText(text: string, site?: string): string | undefined {
  if (isGenericShareText(text, site)) return undefined;
  let t = text.replace(/https?:\/\/\S+/g, '').trim();
  t = t.replace(/^(check out|look at|i found|found|see|i like)\s+(this\s*:?\s*)?/i, '');
  if (site) t = t.replace(new RegExp(`\\s+(on|at|from)\\s+${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'i'), '');
  t = t.replace(/[\s:|–-]+$/, '').trim();
  return t.length >= 3 ? t : undefined;
}

export interface LinkGuess { url: string; title?: string; site?: string }

export function guessFromLink(url: string, shareText?: string): LinkGuess {
  const site = siteName(url);
  const fromText = shareText ? titleFromShareText(shareText, site) : undefined;
  const fromUrl = titleFromUrl(url);
  // "Check out this kite" gives just "kite"; a descriptive URL slug beats a one-word share text.
  const title = fromText && (fromText.includes(' ') || !fromUrl) ? fromText : fromUrl ?? fromText;
  return { url, site, title };
}

export const looksLikeUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim()) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}\/\S*$/i.test(s.trim());
export const normalizeUrl = (s: string) => (/^https?:\/\//i.test(s.trim()) ? s.trim() : `https://${s.trim()}`);

const SEPARATORS = [' | ', ' – ', ' — ', ' - ', ', ', ': ', '; ', ' > ', ' » ', ' • ', ' · ', ' (', ' [', ' with '];
const DANGLING = /\s+(for|with|and|or|the|of|in|to|a|an|by|&)$/i;

/**
 * A reasonable name from a shop's long product title: the part before the first natural break
 * (" | ", a spaced dash, a comma, a colon or semicolon, ">", a bullet, an opening bracket, " with "), as long as that part
 * still reads like a name (two words or more). Short titles are left alone.
 * The same rule is in packages/extract/extract.js; packages/extract/test/short-titles.json
 * is checked against both.
 */
export function shortTitle(title: string, max = 80): string {
  let t = title.replace(/\s+/g, ' ').trim();
  // A breadcrumb trail ("Home > Kitchen > Skillet") ends with the product: start from there.
  const crumbs = t.split(/ [>»] /);
  if (crumbs.length > 1 && crumbs[crumbs.length - 1]!.split(' ').length >= 2) t = crumbs[crumbs.length - 1]!;
  if (t.length <= 40) return t;
  const cuts: number[] = [];
  for (const sep of SEPARATORS) {
    for (let i = t.indexOf(sep); i > 0; i = t.indexOf(sep, i + 1)) cuts.push(i);
  }
  cuts.sort((a, b) => a - b);
  for (const c of cuts) {
    const head = t.slice(0, c).replace(/[\s,;:|–—-]+$/, '');
    if (head.split(' ').length >= 2 && head.length >= 6) {
      if (head.length <= max) return head;
      break;
    }
  }
  if (t.length <= max) return t;
  let cut = t.slice(0, max + 1);
  cut = cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:|–—(-]+$/, '');
  while (DANGLING.test(cut)) cut = cut.replace(DANGLING, '');
  return cut;
}

/** A name worth offering to shorten: long, and shortening actually changes it. */
export const canShorten = (title: string) => title.length > 50 && shortTitle(title) !== title.trim();
