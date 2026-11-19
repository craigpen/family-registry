import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { copy } from '../copy.ts';

/** A note that shows until it's dismissed with Got it, once per device ("Show once" in the wording review). */
export function Tip({ id, icon, children }: { id: string; icon?: ReactNode; children: ReactNode }) {
  // 'loading' until the prefs are read, so a dismissed tip never flashes up.
  const seen = useLiveQuery(async () => (await db.prefs.get('prefs'))?.tips ?? [], [], 'loading' as const);
  if (seen === 'loading' || seen.includes(id)) return null;
  const dismiss = async () => {
    const p = (await db.prefs.get('prefs')) ?? { id: 'prefs' as const, largeText: false };
    await db.prefs.put({ ...p, tips: [...new Set([...(p.tips ?? []), id])] });
  };
  return (
    <div className="note tip">
      {icon}
      <span>{children}</span>
      <button onClick={() => void dismiss()}>{copy.common.gotIt}</button>
    </div>
  );
}
