import { useState } from 'react';
import { Gift } from '@phosphor-icons/react';
import type { Identity } from '../db.ts';

/**
 * First open after signing in. Until the roster arrives (milestone 2), the person
 * gives their own name; device-specific install steps come with the invite flow.
 */
export function Welcome({ me, onDone }: { me: Identity; onDone: (name: string) => void }) {
  const [name, setName] = useState(me.name);
  return (
    <section className="screen welcome">
      <div className="mark"><Gift weight="duotone" aria-hidden /></div>
      <h1>{me.name ? `Welcome, ${me.name}!` : 'Welcome!'}</h1>
      <p>Keep one list of things you'd love. Your family can quietly pick something to get, and you'll never see who.</p>
      {!me.name && (
        <input className="field" placeholder="Your first name" aria-label="Your first name" value={name} autoFocus
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && onDone(name.trim())} />
      )}
      <button className="btn primary" disabled={!name.trim()} onClick={() => onDone(name.trim())}>Let's go</button>
    </section>
  );
}

export function Working({ text }: { text: string }) {
  return (
    <section className="screen welcome" aria-busy="true">
      <div className="spinner" />
      <p>{text}</p>
    </section>
  );
}
