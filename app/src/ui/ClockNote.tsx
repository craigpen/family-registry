import { Clock } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { rich } from './text.tsx';

/**
 * This device's clock is well behind everyone else's (most often the time zone is wrong), so the
 * family's newest things look like they're from the future and stay hidden. Says how to fix it.
 */
export function ClockNote({ fam }: { fam: Family }) {
  if (!fam.clockBehind) return null;
  return (
    <div className="note" role="status">
      <Clock aria-hidden />
      <span>{rich(copy.sync.clockBehind)}</span>
    </div>
  );
}
