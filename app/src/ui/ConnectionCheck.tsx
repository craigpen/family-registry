import { useState } from 'react';
import { CheckCircle, WifiHigh, XCircle } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { listenTagsOf } from '../store.ts';
import { sync } from '../sync.ts';
import { db } from '../db.ts';
import { plural, t } from './text.tsx';

const c = copy.settings;

type Result = { relays: { url: string; reached: boolean; events: number }[]; stored: number };

/**
 * In Settings, for when something seems missing on one device: whether each relay answers, how
 * many of the family's events it holds, and what this device has. Read out to whoever helps.
 */
export function ConnectionCheck({ fam }: { fam: Family }) {
  const [state, setState] = useState<'idle' | 'busy' | Result>('idle');
  const run = async () => {
    setState('busy');
    const [relays, stored] = await Promise.all([sync.check(listenTagsOf(fam.me)), db.events.count()]);
    setState({ relays, stored });
  };
  const hasList = fam.groups.every(g => g.rosterBy);
  return (
    <div className="connection-check">
      <button className="btn quiet" disabled={state === 'busy'} onClick={() => void run()}>
        <WifiHigh aria-hidden /> {state === 'busy' ? c.checkBusy : c.check}
      </button>
      {typeof state === 'object' && (
        <ul className="check-list" role="status">
          {state.relays.map(r => (
            <li key={r.url} className={r.reached ? 'ok' : 'bad'}>
              {r.reached ? <CheckCircle weight="fill" aria-hidden /> : <XCircle weight="fill" aria-hidden />}
              <span><b>{r.url.replace(/^wss:\/\//, '')}</b> {r.reached ? plural(c.relayEvents, r.events) : c.relayNotReached}</span>
            </li>
          ))}
          <li className={hasList ? 'ok' : 'bad'}>
            {hasList ? <CheckCircle weight="fill" aria-hidden /> : <XCircle weight="fill" aria-hidden />}
            <span><b>{c.thisDeviceLabel}</b> {hasList ? plural(c.deviceHasList, fam.people.size, { events: state.stored }) : t(c.deviceNoList, { events: state.stored })}</span>
          </li>
        </ul>
      )}
    </div>
  );
}
