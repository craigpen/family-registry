import { useEffect, useRef } from 'react';
import { firstName } from './ui/bits.tsx';
import { useFamily, type Family } from './family.ts';
import { addIdea, addItem, type ItemDraft } from './items.ts';
import { modeFor } from './importing.ts';
import { db } from './db.ts';
import { sync } from './sync.ts';

/*
 * /embed: a page with no UI that the browser extension's popup loads out of sight, so a
 * quick-add happens without leaving the shop's page. Because it's this site, it has this
 * browser's sign-in. It answers two questions, and only to browser extensions:
 *   fr/hello -> who's signed in, and whose lists they can add to
 *   fr/add   -> add this item (to my list, a list I help keep, or as a secret idea)
 * Nothing here reads lists or claims.
 */

export const isExtensionOrigin = (origin: string) => /^(chrome|moz|safari-web)-extension:\/\//.test(origin);

export interface EmbedPerson { pubkey: string; name: string; color?: string; mode: 'mine' | 'helper' | 'ideas' }

function people(fam: Family): EmbedPerson[] {
  return [fam.self, ...fam.others].map(p => ({ pubkey: p.pubkey, name: p.pubkey === fam.me.pubkey ? 'Me' : firstName(p.name), color: p.color, mode: modeFor(fam, p.pubkey) }));
}

/** Waits (briefly) for what was just saved to reach the relays. */
async function sent(ms = 6000): Promise<boolean> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    await sync.flush();
    if ((await db.outbox.count()) === 0) return true;
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

export function EmbedBridge() {
  const fam = useFamily();
  const famRef = useRef<Family | null | undefined>(undefined);
  famRef.current = fam;

  useEffect(() => { sync.start(); }, []);

  useEffect(() => {
    const reply = (e: MessageEvent, msg: object) => (e.source as Window | null)?.postMessage(msg, e.origin);
    const onMessage = async (e: MessageEvent) => {
      if (!isExtensionOrigin(e.origin) || !e.data || typeof e.data !== 'object') return;
      const { type, id } = e.data as { type?: string; id?: string };
      // Wait for this browser's family to load (it's read from local storage, so it's quick).
      for (let i = 0; famRef.current === undefined && i < 50; i++) await new Promise(r => setTimeout(r, 100));
      const f = famRef.current;
      if (type === 'fr/hello') {
        reply(e, f && f.me.welcomed
          ? { type: 'fr/state', id, signedIn: true, people: people(f) }
          : { type: 'fr/state', id, signedIn: false, people: [] });
      } else if (type === 'fr/add' && f) {
        const { draft, owner } = e.data as { draft: ItemDraft; owner?: string };
        try {
          const target = owner && owner !== f.me.pubkey ? owner : undefined;
          if (target && modeFor(f, target) === 'ideas') await addIdea(draft, target);
          else await addItem(draft, target);
          reply(e, { type: 'fr/added', id, ok: true, sent: await sent() });
        } catch (err) {
          reply(e, { type: 'fr/added', id, ok: false, reason: String((err as Error).message ?? err) });
        }
      }
    };
    addEventListener('message', onMessage);
    // Tell the extension we're here (no data in this message).
    if (parent !== window) parent.postMessage({ type: 'fr/ready' }, '*');
    return () => removeEventListener('message', onMessage);
  }, []);

  return null;
}
