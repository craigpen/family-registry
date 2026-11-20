import { useState } from 'react';
import { verifyEvent } from 'nostr-tools/pure';
import { MAX_FUTURE_SECONDS } from '@family-registry/core';
import { recordsFor } from '../family.ts';
import { CheckCircle, WifiHigh, XCircle } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { listenTagsOf } from '../store.ts';
import { sync } from '../sync.ts';
import { db } from '../db.ts';
import { plural, t } from './text.tsx';

const c = copy.settings;

type Result = {
  relays: { url: string; reached: boolean; events: number }[];
  stored: number;
  /** Set aside here: dated over an hour ahead of this device's clock, a signature that doesn't check out, or can't be opened. */
  future: number; badSignature: number; unopened: number;
  /** The newest thing another device wrote, as minutes ahead of this device's clock (when it's ahead). */
  aheadMinutes: number;
};

/**
 * In Settings, for when something seems missing on one device: whether each relay answers, how
 * many of the family's events it holds, and what this device has. Read out to whoever helps.
 */
export function ConnectionCheck({ fam }: { fam: Family }) {
  const [state, setState] = useState<'idle' | 'busy' | Result>('idle');
  const run = async () => {
    setState('busy');
    const [relays, events] = await Promise.all([sync.check(listenTagsOf(fam.me)), db.events.toArray()]);
    const now = Math.floor(Date.now() / 1000);
    const others = events.filter(e => e.event.pubkey !== fam.me.pubkey);
    const records = recordsFor(fam.me, others);
    let future = 0, badSignature = 0, unopened = 0;
    others.forEach((e, i) => {
      if (records[i]!.type !== 'unreadable') return;
      if (e.event.created_at > now + MAX_FUTURE_SECONDS) future++;
      else if (!verifyEvent({ ...e.event })) badSignature++;
      else unopened++;
    });
    const newest = Math.max(0, ...others.map(e => e.event.created_at));
    setState({ relays, stored: events.length, future, badSignature, unopened, aheadMinutes: Math.max(0, Math.round((newest - now) / 60)) });
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
          {(state.future + state.badSignature + state.unopened > 0) && (
            <li className="bad">
              <XCircle weight="fill" aria-hidden />
              <span><b>{c.setAsideLabel}</b> {t(c.setAside, { future: state.future, signature: state.badSignature, unopened: state.unopened })}</span>
            </li>
          )}
          <li className={state.aheadMinutes > 60 ? 'bad' : 'ok'}>
            {state.aheadMinutes > 60 ? <XCircle weight="fill" aria-hidden /> : <CheckCircle weight="fill" aria-hidden />}
            <span><b>{c.clockLabel}</b> {t(state.aheadMinutes > 60 ? c.clockBehind : c.clockOk, { time: new Date().toLocaleString(), minutes: state.aheadMinutes })}</span>
          </li>
        </ul>
      )}
    </div>
  );
}
