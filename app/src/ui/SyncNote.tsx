import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CloudSlash } from '@phosphor-icons/react';
import { db } from '../db.ts';
import { sync, type SyncStatus } from '../sync.ts';

const STUCK_MS = 15_000;

/**
 * A calm note when there's no connection, or when changes have been waiting a while.
 * Silent otherwise: a save that goes out in a second needs no comment.
 */
export function SyncNote() {
  const [status, setStatus] = useState<SyncStatus>(sync.status);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const off = sync.onStatus(setStatus); return () => { off(); }; }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  const oldest = useLiveQuery(() => db.outbox.orderBy('queuedAt').first(), [], undefined);
  const stuck = !!oldest && now - oldest.queuedAt > STUCK_MS;
  if (status !== 'offline' && !stuck) return null;
  return (
    <div className="note" aria-live="polite">
      <CloudSlash aria-hidden />
      <span>{status === 'offline'
        ? oldest ? 'No connection. Your changes are saved here and will go out when you’re back online.' : 'No connection. You’re seeing what was here last time.'
        : 'Your latest changes are saved here, but haven’t reached the family yet. They’ll keep trying.'}</span>
    </div>
  );
}
