import { FINGERPRINT_WORDS, SECRET_WORDS, joinWords, splitWords, validWords } from './words.ts';

/** What a personal link carries. Everything is in the #fragment, which never reaches the web host. */
export interface Invite {
  group: string[];
  member: string[];
  organizer: string[];
}

/** What the share helpers, the extension and the share target hand to the Add sheet. */
export interface AddPrefill {
  url?: string;
  title?: string;
  text?: string;
  images: string[];
  price?: string;
  site?: string;
}

export function inviteLink(base: string, inv: Invite): string {
  return `${base.replace(/#.*$/, '')}#g=${joinWords(inv.group)}&m=${joinWords(inv.member)}&o=${joinWords(inv.organizer)}`;
}

/** Reads an invite from a fragment such as `#g=a-b-c-d-e-f&m=...&o=...`, or returns null. */
export function parseInvite(fragment: string): Invite | null {
  const p = new URLSearchParams(fragment.replace(/^#/, ''));
  const group = splitWords(p.get('g') ?? '');
  const member = splitWords(p.get('m') ?? '');
  const organizer = splitWords(p.get('o') ?? '');
  if (!validWords(group, SECRET_WORDS) || !validWords(member, SECRET_WORDS) || !validWords(organizer, FINGERPRINT_WORDS)) return null;
  return { group, member, organizer };
}

/** Reads Add sheet details from `#url=…&title=…&image=…` or a share target's `?url=…&title=…&text=…`. */
export function parseAddPrefill(params: string): AddPrefill | null {
  const p = new URLSearchParams(params.replace(/^[#?]/, ''));
  const pick = (k: string) => p.get(k)?.trim() || undefined;
  const out: AddPrefill = {
    url: pick('url'), title: pick('title'), text: pick('text'),
    images: p.getAll('image').filter(Boolean), price: pick('price'), site: pick('site'),
  };
  // Android often puts the link inside the shared text rather than in `url`.
  if (!out.url && out.text) {
    const m = out.text.match(/https?:\/\/\S+/);
    if (m) {
      out.url = m[0];
      out.text = out.text.replace(m[0], '').trim() || undefined;
    }
  }
  return out.url || out.title || out.text || out.images.length ? out : null;
}
