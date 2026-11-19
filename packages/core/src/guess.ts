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

/** A title from share text like "Check out LEGO Botanical Bonsai on Amazon". */
export function titleFromShareText(text: string, site?: string): string | undefined {
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
