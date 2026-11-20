import { parseAddPrefill, parseInvite, type AddPrefill, type Invite } from '@family-registry/core';

export interface Arrival {
  invite: Invite | null;
  add: AddPrefill | null;
  /** Opened at /import by the browser extension, which then hands over a list. */
  importing: boolean;
}

const base = () => import.meta.env.BASE_URL;

/** What the page was opened with: a personal link, and/or something to add (share target, helpers). */
export function readArrival(loc: Location = location): Arrival {
  const isAdd = loc.pathname === `${base()}add` || loc.pathname === `${base()}add/`;
  return {
    invite: parseInvite(loc.hash),
    add: isAdd ? parseAddPrefill(loc.hash) ?? parseAddPrefill(loc.search) : null,
    importing: loc.pathname === `${base()}import` || loc.pathname === `${base()}import/`,
  };
}

/** iOS Safari before Add to Home Screen: keep the link in the address bar so the icon carries it (PLAN.md "The iOS gap"). */
export function keepLinkInAddressBar(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/** Takes the secrets and share details out of the address bar once they're saved. */
export function tidyAddressBar(keepInvite: boolean) {
  const url = keepInvite ? `${base()}${location.hash}` : base();
  history.replaceState(history.state, '', url);
}

/** The public setup guide lives at /help and needs no identity. */
export const isHelpPage = (loc: Location = location) =>
  loc.pathname === `${base()}help` || loc.pathname === `${base()}help/`;

/** The hidden page the browser extension's popup talks to for quick-adds (see embed.tsx). */
export const isEmbedPage = (loc: Location = location) =>
  loc.pathname === `${base()}embed` || loc.pathname === `${base()}embed/`;
