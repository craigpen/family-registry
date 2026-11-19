/** What kind of device and browser the app is open in, to show the right install steps. */
export type Platform = 'ios' | 'android' | 'desktop';

export interface Device {
  platform: Platform;
  /** Inside another app's built-in browser (Gmail, Facebook...), which can't install apps. */
  inApp: boolean;
  /** Already running as an installed app. */
  standalone: boolean;
}

export function detectDevice(ua = navigator.userAgent): Device {
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|GSA\/|Snapchat|LinkedInApp|Twitter|; wv\)|GmailWebView/i.test(ua)
    || (ios && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
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
