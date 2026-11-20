/** What kind of device and browser the app is open in, to show the right install steps. */
export type Platform = 'ios' | 'android' | 'desktop';

export interface Device {
  platform: Platform;
  /** Inside another app's built-in browser (Gmail, Facebook...), which can't install apps. */
  inApp: boolean;
  /** Already running as an installed app. */
  standalone: boolean;
}

/** The browser by name, as far as it can be told. Chrome-based browsers that aren't Chrome name themselves. */
export function browserName(ua = navigator.userAgent): string {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
  if (/SamsungBrowser\//.test(ua)) return 'Samsung';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Chrome\/|CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'other';
}

/** Windows or a Mac (for naming the right browser to switch to). */
export const desktopOs = (ua = navigator.userAgent): 'windows' | 'mac' | 'other' =>
  /Windows/.test(ua) ? 'windows' : /Macintosh|Mac OS X/.test(ua) ? 'mac' : 'other';

/** The Android app's package: its icon opens this site full-screen (android-helper). */
export const ANDROID_APP = 'app.familyregistry.helper';

/**
 * Opened from the Android app? Chrome says so in the referrer of the page the app opens; it's
 * kept for the rest of the visit, since later pages lose it.
 */
export function inAndroidApp(): boolean {
  try {
    if (document.referrer.startsWith(`android-app://${ANDROID_APP}`) || appVersionInAddress()) sessionStorage.setItem('android-app', '1');
    return sessionStorage.getItem('android-app') === '1';
  } catch {
    return false;
  }
}

/** The version the Android app put in the address it opened (`?app=11`), from 0.2.2 on. */
function appVersionInAddress(): number | undefined {
  const v = Number(new URLSearchParams(location.search).get('app'));
  return Number.isInteger(v) && v > 0 ? v : undefined;
}

/** The last Android app version that didn't say which it was (0.2.1). */
const APP_VERSION_UNSAID = 10;

/**
 * The version of the Android app this page is running in (its versionCode), remembered from the
 * address it opened. Undefined outside the app.
 */
export function androidAppVersion(): number | undefined {
  try {
    const said = appVersionInAddress();
    if (said) localStorage.setItem('android-app-version', String(said));
    if (!inAndroidApp()) return undefined;
    return Number(localStorage.getItem('android-app-version')) || APP_VERSION_UNSAID;
  } catch {
    return undefined;
  }
}
// Read it before the address is tidied away.
if (typeof location !== 'undefined') androidAppVersion();

/** Is the Android app installed on this phone? (Chrome on Android only; undefined where it can't tell.) */
export async function androidAppInstalled(): Promise<boolean | undefined> {
  const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<{ id?: string; platform: string }[]> };
  if (!nav.getInstalledRelatedApps) return undefined;
  try {
    return (await nav.getInstalledRelatedApps()).some(a => a.id === ANDROID_APP);
  } catch {
    return undefined;
  }
}

export function detectDevice(ua = navigator.userAgent): Device {
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|GSA\/|Snapchat|LinkedInApp|Twitter|; wv\)|GmailWebView/i.test(ua)
    || (ios && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true || inAndroidApp();
  return { platform: ios ? 'ios' : android ? 'android' : 'desktop', inApp, standalone };
}

/** The browser's own install prompt (Chrome, Edge, Samsung Internet), saved when it's offered. */
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferred = e as InstallPrompt;
  listeners.forEach(fn => fn());
});
addEventListener('appinstalled', () => { deferred = null; listeners.forEach(fn => fn()); });

/**
 * Is this a private (incognito or InPrivate) window? Chrome and Edge give one a storage quota
 * capped by memory, far below a normal window's share of the disk. A good guess, not a promise:
 * a nearly full disk could look the same, so the wording says "looks like".
 */
export async function isPrivateWindow(): Promise<boolean> {
  try {
    if (!/Chrome\//.test(navigator.userAgent) || !navigator.storage?.estimate) return false;
    const { quota } = await navigator.storage.estimate();
    const heap = (performance as Performance & { memory?: { jsHeapSizeLimit: number } }).memory?.jsHeapSizeLimit ?? 1024 ** 3;
    return !!quota && quota < heap * 2;
  } catch {
    return false;
  }
}

export const canPromptInstall = () => deferred !== null;
export const onInstallChange = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };

/** Shows the browser's install box. Resolves true if the person installed. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const d = deferred;
  await d.prompt();
  const { outcome } = await d.userChoice;
  if (outcome === 'accepted') deferred = null;
  return outcome === 'accepted';
}
