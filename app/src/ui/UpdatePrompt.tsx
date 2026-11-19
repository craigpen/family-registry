import { useEffect } from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { copy } from '../copy.ts';
import { useToast } from './Toast.tsx';

/** A new version waits until the person chooses to load it: never swapped in mid-use. */
export function UpdatePrompt() {
  const toast = useToast();
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  useEffect(() => {
    if (needRefresh) toast(<><Sparkle weight="fill" /> {copy.toasts.newVersion}</>, { sticky: true, action: { label: copy.toasts.update, run: () => updateServiceWorker(true) } });
  }, [needRefresh, toast, updateServiceWorker]);
  return null;
}
