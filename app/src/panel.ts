import type { AddPrefill } from '@family-registry/core';
import { isExtensionOrigin } from './embed.tsx';

/*
 * When the app is shown in the browser extension's side panel, the panel can tell it what's
 * on the page beside it (read with the shared extract.js). That's how + offers "this page".
 */

/** True when this page is inside the extension's side panel (Chrome tells a frame its ancestors). */
export function inExtensionPanel(): boolean {
  if (parent === window) return false;
  const ancestors = (location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
  return !!ancestors && ancestors.length > 0 && isExtensionOrigin(ancestors[0]!);
}

export interface PanelPage {
  prefill: AddPrefill | null;
  needsPermission: boolean;
  /** Beside the panel is a whole list (an Amazon list), not one product. */
  list?: { name: string; count: number };
}

interface Found { url: string; title: string; images: string[]; price: string; site: string; notes: string }

const toPrefill = (f: Found | null | undefined): AddPrefill | null =>
  f ? { url: f.url, title: f.title, images: f.images, price: f.price || undefined, site: f.site || undefined, notes: f.notes || undefined } : null;

let seq = 0;
function ask(type: 'fr/page-request' | 'fr/allow-pages', ms: number): Promise<PanelPage> {
  const id = `p${++seq}`;
  return new Promise(resolve => {
    const done = (r: PanelPage) => { removeEventListener('message', on); clearTimeout(t); resolve(r); };
    const t = setTimeout(() => done({ prefill: null, needsPermission: false }), ms);
    function on(e: MessageEvent) {
      if (e.source !== parent || !isExtensionOrigin(e.origin) || e.data?.id !== id) return;
      done({ prefill: toPrefill(e.data.found), needsPermission: !!e.data.needsPermission, list: e.data.list });
    }
    addEventListener('message', on);
    parent.postMessage({ type, id }, '*'); // carries no data
  });
}

/** What's on the page beside the panel, if it's a product. */
export const pageBesidePanel = () => ask('fr/page-request', 8000);

/** Asks (from a click) for permission to read shop pages, then reads the page. */
export const allowPagesAndRead = () => ask('fr/allow-pages', 60_000);

/** Imports the list open beside the panel; the panel switches to the import page to receive it. */
export const importListBesidePanel = () => parent.postMessage({ type: 'fr/import-page' }, '*'); // carries no data
