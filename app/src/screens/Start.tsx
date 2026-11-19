import { useMemo, useRef, useState } from 'react';
import { DeviceMobile, Gift, Key } from '@phosphor-icons/react';
import { FINGERPRINT_WORDS, SECRET_WORDS, cleanCode, splitWords, validWords, type Invite } from '@family-registry/core';
import { detectDevice } from '../device.ts';
import type { PairResult } from '../pairing.ts';

/**
 * Shown when the app is opened without a personal link. Most people never see this:
 * their invite link signs them in. It offers a code from another device (and, on an
 * iPhone's Home Screen app, leads with it), typing the words, or starting a new family.
 */
export function Start({ onInvite, onStartFamily, onCode }: {
  onInvite: (inv: Invite) => void; onStartFamily: (name: string) => void; onCode: (code: string) => Promise<PairResult>;
}) {
  const device = useMemo(() => detectDevice(), []);
  // An iPhone Home Screen app doesn't share Safari's storage: it needs the code Safari showed.
  const iosHome = device.platform === 'ios' && device.standalone;
  const [mode, setMode] = useState<'hello' | 'words' | 'new' | 'code'>(iosHome ? 'code' : 'hello');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const words = splitWords(text);
  const need = SECRET_WORDS * 2 + FINGERPRINT_WORDS;

  function submitWords() {
    const inv = {
      group: words.slice(0, SECRET_WORDS),
      member: words.slice(SECRET_WORDS, SECRET_WORDS * 2),
      organizer: words.slice(SECRET_WORDS * 2, need),
    };
    if (words.length === need && validWords(inv.group) && validWords(inv.member) && validWords(inv.organizer, FINGERPRINT_WORDS)) onInvite(inv);
  }

  async function submitCode(c = code) {
    if (c.length !== 6 || busy) return;
    setBusy(true);
    setCodeError('');
    try {
      const r = await onCode(c);
      if (r === 'not-found') setCodeError('That code didn’t work. Codes last 10 minutes: get a new one on your other device and try again.');
    } catch {
      setCodeError('Couldn’t check the code. Are you online?');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'code') return (
    <section className="screen welcome">
      <div className="mark"><DeviceMobile weight="duotone" aria-hidden /></div>
      <h1>{iosHome ? 'One last step' : 'Type the code'}</h1>
      <p>{iosHome
        ? <>Go back to <b>Safari</b>. Your code is waiting on the page. Type it here.</>
        : <>On your other device, open <b>Settings</b> and choose <b>Add a device</b>. Type the 6 numbers it shows.</>}</p>
      <input ref={codeRef} className="field code-field" inputMode="numeric" autoComplete="one-time-code" aria-label="6-digit code" placeholder="000 000"
        value={code.length > 3 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
        onChange={e => { const c = cleanCode(e.target.value); setCode(c); if (c.length === 6) void submitCode(c); }} />
      {codeError && <p className="hint" role="alert" style={{ color: 'var(--accent)' }}>{codeError}</p>}
      <button className="btn primary" disabled={code.length !== 6 || busy} onClick={() => submitCode()}>{busy ? 'Checking…' : 'Continue'}</button>
      <button className="btn quiet" onClick={() => setMode('hello')}>{iosHome ? 'Other ways in' : 'Back'}</button>
    </section>
  );

  if (mode === 'words') return (
    <section className="screen welcome">
      <div className="mark"><Key weight="duotone" aria-hidden /></div>
      <h1>Type your words</h1>
      <p>All {need} of them, in order. Spaces, commas or new lines are all fine.</p>
      <textarea className="field small" rows={4} value={text} onChange={e => setText(e.target.value)} aria-label="Your words" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <p className="hint">{words.length} of {need} words</p>
      <button className="btn primary" style={{ marginTop: 14 }} disabled={words.length !== need} onClick={submitWords}>Continue</button>
      <button className="btn quiet" onClick={() => setMode('hello')}>Back</button>
    </section>
  );

  if (mode === 'new') return (
    <section className="screen welcome">
      <div className="mark"><Gift weight="duotone" aria-hidden /></div>
      <h1>Start a family</h1>
      <p>You'll be the organizer: you add everyone and send them their links.</p>
      <input className="field" placeholder="Your first name" aria-label="Your first name" value={name} autoFocus
        onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && onStartFamily(name.trim())} />
      <button className="btn primary" disabled={!name.trim()} onClick={() => onStartFamily(name.trim())}>Start</button>
      <button className="btn quiet" onClick={() => setMode('hello')}>Back</button>
    </section>
  );

  return (
    <section className="screen welcome">
      <div className="mark"><Gift weight="duotone" aria-hidden /></div>
      <h1>Family wish lists</h1>
      <p>To join your family, open the personal link they sent you. Look for a message from whoever set it up.</p>
      <button className="btn ghost" onClick={() => setMode('code')}><DeviceMobile aria-hidden /> I have a code from my other device</button>
      <button className="btn ghost" onClick={() => setMode('words')}><Key aria-hidden /> I have my words</button>
      <button className="btn quiet" onClick={() => setMode('new')}>Start a new family</button>
    </section>
  );
}
