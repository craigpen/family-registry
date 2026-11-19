import { useEffect } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from './Toast.tsx';

/** A new version waits until the person chooses to load it: never swapped in mid-use. */
export function UpdatePrompt() {
  const toast = useToast();
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  useEffect(() => {
    if (needRefresh) toast(<><Sparkle weight="fill" /> New version ready</>, { sticky: true, action: { label: 'Update', run: () => updateServiceWorker(true) } });
  }, [needRefresh, toast, updateServiceWorker]);
  return null;
}
