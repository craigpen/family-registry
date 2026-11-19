import { useState } from 'react';
import { Gift, Key } from '@phosphor-icons/react';
import { FINGERPRINT_WORDS, SECRET_WORDS, splitWords, validWords, type Invite } from '@family-registry/core';

/**
 * Shown when the app is opened without a personal link. Most people never see this:
 * their invite link signs them in. It offers typing the words (as read out over the
 * phone) or starting a new family as its organizer.
 */
export function Start({ onInvite, onStartFamily }: { onInvite: (inv: Invite) => void; onStartFamily: (name: string) => void }) {
  const [mode, setMode] = useState<'hello' | 'words' | 'new'>('hello');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
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
      <button className="btn ghost" onClick={() => setMode('words')}><Key aria-hidden /> I have my words</button>
      <button className="btn quiet" onClick={() => setMode('new')}>Start a new family</button>
    </section>
  );
}
