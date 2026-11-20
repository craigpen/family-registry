import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** How often an open app looks for a newer version (it also looks whenever it's brought back). */
const CHECK_EVERY = 60 * 60 * 1000;

/**
 * Keeps the app up to date by itself: nobody has to tap Update. A new version is swapped in only
 * at a quiet moment, so nothing half-typed is lost: when the app is in the background, or when
 * it's open with no sheet up and no box being typed in. Changes are saved as they're made, so a
 * reload loses nothing else.
 */
export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const look = () => { if (navigator.onLine) void reg.update().catch(() => {}); };
      setInterval(look, CHECK_EVERY);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') look(); });
    },
  });
  useEffect(() => {
    if (!needRefresh) return;
    const quiet = () => {
      if (document.visibilityState === 'hidden') return true;
      const busy = document.querySelector('[role="dialog"]')
        || (document.activeElement instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
      return !busy;
    };
    const tryNow = () => { if (quiet()) void updateServiceWorker(true); };
    tryNow();
    const timer = setInterval(tryNow, 5000);
    document.addEventListener('visibilitychange', tryNow);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tryNow); };
  }, [needRefresh, updateServiceWorker]);
  return null;
}
