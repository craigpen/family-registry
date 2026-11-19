import { parseAddPrefill, parseInvite, type AddPrefill, type Invite } from '@family-registry/core';

export interface Arrival {
  invite: Invite | null;
  add: AddPrefill | null;
}

const base = () => import.meta.env.BASE_URL;

/** What the page was opened with: a personal link, and/or something to add (share target, helpers). */
export function readArrival(loc: Location = location): Arrival {
  const isAdd = loc.pathname === `${base()}add` || loc.pathname === `${base()}add/`;
  return {
    invite: parseInvite(loc.hash),
    add: isAdd ? parseAddPrefill(loc.hash) ?? parseAddPrefill(loc.search) : null,
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
  history.replaceState(null, '', url);
}
