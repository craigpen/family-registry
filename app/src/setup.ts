import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { DeviceKind } from '@family-registry/core';
import { db, type Prefs } from './db.ts';
import { androidAppInstalled, browserName, desktopOs, detectDevice, inAndroidApp, isPrivateWindow, type Platform } from './device.ts';
import type { Family } from './family.ts';

/*
 * Getting set up on this device: one path, picked for the device, that ends in a green check
 * the app sets itself (docs/PLAN.md "Invites and getting set up").
 *
 *   Android, Chrome or Samsung Internet  get the Android app (APK)     Chrome says it's installed
 *   Android, other browsers              open in Chrome (copy link)   Chrome signs in with the link
 *   iPhone or iPad, any browser          Add to Home Screen + code    the Home Screen app signs in
 *   Computer, Chrome or Edge             add the gift button          the button marks the app's pages
 *   Computer, other browsers             open in Chrome or Edge       Chrome or Edge signs in with the link
 *
 * Checks that happen elsewhere (another browser, the Home Screen app) are seen through that
 * device's "joined" marker, which says what kind of device it is.
 */

/** The gift button's Chrome Web Store page, once it's listed. Until then the setup step loads it from the zip (Developer mode). */
export const STORE_URL: string | null = null;

/** The iPhone/iPad Shortcut (Safari's Share, then Add to wish list), built once and shared from iCloud (shortcut/README.md). */
export const SHORTCUT_URL = 'https://www.icloud.com/shortcuts/6711720a4d424c78869b53c9829ef362';

export type SetupPath =
  /** The Android app: the wish list on the home screen, and Add to wish list (with photo and price) in Share. */
  | { kind: 'android-app' }
  | { kind: 'button'; browser: 'Chrome' | 'Edge' }
  | { kind: 'ios-home' }
  /** A private window: nothing here lasts and extensions are off, so start over in a normal one. */
  | { kind: 'private'; platform: 'android' | 'desktop'; browser: string }
  | { kind: 'open-in'; platform: 'android' | 'desktop'; browser: 'Chrome' | 'Edge' | 'Chrome or Edge'; mac: boolean };

/** Chrome-based browsers that can install the app (and, on a computer, run the gift button). */
const installs = (browser: string, platform: Platform) =>
  platform === 'android' ? browser === 'Chrome' || browser === 'Samsung' || browser === 'Edge' : browser === 'Chrome' || browser === 'Edge';

export function setupPath(platform: Platform = detectDevice().platform, browser = browserName()): SetupPath {
  if (platform === 'ios') return { kind: 'ios-home' };
  if (platform === 'android' && installs(browser, platform)) return { kind: 'android-app' };
  if (platform === 'desktop' && installs(browser, platform)) return { kind: 'button', browser: browser === 'Edge' ? 'Edge' : 'Chrome' };
  if (platform === 'android') return { kind: 'open-in', platform, browser: 'Chrome', mac: false };
  const os = desktopOs();
  return { kind: 'open-in', platform, browser: os === 'windows' ? 'Edge' : 'Chrome or Edge', mac: os === 'mac' };
}

declare const __EXTENSION_VERSION__: string;

/** The gift button marks the app's pages as it loads (extension/mark.js), with its version. */
export const giftButtonVersion = () => typeof document !== 'undefined' ? document.documentElement.dataset.wishButton : undefined;
export const hasGiftButton = () => !!giftButtonVersion();

/** Is `a` an older version than `b`? ("0.2.9" < "0.2.12") */
export function olderVersion(a: string, b: string) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
}
/** The gift button is in, but older than this site expects: unpacked extensions never update themselves. */
export const giftButtonOutdated = () => {
  const v = giftButtonVersion();
  return !!v && typeof __EXTENSION_VERSION__ === 'string' && olderVersion(v, __EXTENSION_VERSION__);
};

/** What this device is, for its "joined" marker. */
export function deviceKind(): DeviceKind {
  const d = detectDevice();
  const kind: DeviceKind = { platform: d.platform, browser: browserName() };
  if (d.standalone) kind.app = true;
  if (hasGiftButton()) kind.button = true;
  return kind;
}

async function updatePrefs(change: (p: Prefs) => Partial<Prefs>) {
  await db.transaction('rw', db.prefs, async () => {
    const p = (await db.prefs.get('prefs')) ?? { id: 'prefs' as const, largeText: false };
    await db.prefs.put({ ...p, ...change(p) });
  });
}

/** The setup step was shown: anything that signs in elsewhere from now on counts towards it. */
export const startSetup = () => updatePrefs(p => ({ setup: { ...p.setup, startedAt: p.setup?.startedAt ?? Math.floor(Date.now() / 1000) } }));
export const markTourSeen = () => updatePrefs(() => ({ tourSeen: true }));
/** Not now, or the setup sheet closed before it was done: don't bring it up again for a while. */
export const markDismissed = () => updatePrefs(p => ({ setup: { ...p.setup, dismissedAt: Math.floor(Date.now() / 1000) } }));

/** A Home Screen app not opened for this long is taken to be gone. */
const HOME_SCREEN_STALE = 30 * 24 * 3600;
/** How long Not now holds before the setup step comes up again by itself. */
const REMIND_AFTER = 7 * 24 * 3600;

/** Should the setup step come up by itself when the app opens? Not done here, and not put off lately. */
export function shouldRemind(state: SetupState | undefined, prefs: Prefs | undefined) {
  if (!state || state.done || prefs === undefined) return false;
  const off = prefs.setup?.dismissedAt;
  return !off || Date.now() / 1000 - off > REMIND_AFTER;
}


/** Does this other device finish the path? */
function finishes(path: SetupPath, kind: DeviceKind | undefined): boolean {
  if (!kind) return false;
  if (path.kind === 'ios-home') return kind.platform === 'ios' && !!kind.app;
  if (path.kind === 'open-in') {
    if (kind.platform !== path.platform) return false;
    return path.platform === 'android' ? kind.browser === 'Chrome' || kind.browser === 'Samsung' : kind.browser === 'Chrome' || kind.browser === 'Edge';
  }
  if (path.kind === 'private') return kind.platform === path.platform && kind.browser === path.browser;
  return false;
}

export interface SetupState {
  path: SetupPath;
  /** Finished, here or (for open-in and the Home Screen) on the device it led to. */
  done: boolean;
  /** Already running as an installed app, so there was nothing to do here. */
  already: boolean;
  /** The browser it was finished in, for open-in. */
  browser?: string;
  /** The gift button is in but an older version: the step becomes Update it. */
  update?: boolean;
}

/** The setup path for this device and whether it's finished: updates as soon as it is. */
export function useSetup(fam: Family): SetupState | undefined {
  const prefs = useLiveQuery(() => db.prefs.get('prefs').then(p => p ?? null), [], undefined);
  const [button, setButton] = useState(hasGiftButton);
  const outdated = button && giftButtonOutdated();
  const [privateWindow, setPrivate] = useState<boolean>();
  const app = useAndroidApp();
  useEffect(() => { void isPrivateWindow().then(setPrivate); }, []);
  // The extension's mark can land a moment after the app starts.
  useEffect(() => {
    if (button) return;
    const timer = setInterval(() => { if (hasGiftButton()) setButton(true); }, 1000);
    return () => clearInterval(timer);
  }, [button]);
  if (prefs === undefined || privateWindow === undefined) return undefined;
  const device = detectDevice();
  // Not settled until Chrome has said whether the Android app is installed: otherwise the setup
  // step can pop up for a moment on every open, only to say the app is installed.
  if (device.platform === 'android' && !app.checked) return undefined;
  let path = setupPath(device.platform);
  if (privateWindow && device.platform !== 'ios') path = { kind: 'private', platform: device.platform, browser: browserName() };
  if (path.kind === 'button' && outdated) return { path, done: false, already: false, update: true };
  // On Android only the Android app counts: an installed web app can't read shops' pages.
  const already = device.platform === 'android' ? inAndroidApp() : device.standalone || (device.platform === 'desktop' && button);
  if (already) return { path, done: true, already };
  // Chrome checks the phone itself, so this also notices when the app is uninstalled.
  if (path.kind === 'android-app' && app.installed) return { path, done: true, already: false };
  const since = (prefs?.setup?.startedAt ?? Infinity) - 120;
  for (const [id, seen] of fam.devices.get(fam.me.pubkey) ?? []) {
    if (id === prefs?.device || seen.lastSeen < since) continue;
    // Safari can't tell when the Home Screen app is deleted. It checks in whenever it's opened, so
    // one that hasn't been opened in a month no longer counts, and the step comes back.
    if (path.kind === 'ios-home' && Date.now() / 1000 - seen.lastSeen > HOME_SCREEN_STALE) continue;
    if (finishes(path, seen.kind)) return { path, done: true, already: false, browser: seen.kind?.browser };
  }
  return { path, done: false, already: false };
}

/** Whether the Android app is installed, checked now, every few seconds, and on coming back to the page. */
function useAndroidApp(): { installed?: boolean; checked: boolean } {
  const [state, setState] = useState<{ installed?: boolean; checked: boolean }>({ checked: false });
  useEffect(() => {
    if (detectDevice().platform !== 'android') return;
    let live = true;
    // Never more than a few seconds unsettled, even if Chrome doesn't answer.
    const giveUp = setTimeout(() => { if (live) setState(s => (s.checked ? s : { checked: true })); }, 3000);
    const check = () => void androidAppInstalled().then(v => { if (live) setState({ installed: v, checked: true }); });
    check();
    const timer = setInterval(check, 4000);
    addEventListener('visibilitychange', check);
    return () => { live = false; clearTimeout(giveUp); clearInterval(timer); removeEventListener('visibilitychange', check); };
  }, []);
  return state;
}

/** Whether to show the one-time how-to after setup. */
export const useTourSeen = () => useLiveQuery(() => db.prefs.get('prefs').then(p => !!p?.tourSeen), [], undefined);
