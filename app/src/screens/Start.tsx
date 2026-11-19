import { useMemo, useRef, useState } from 'react';
import { DeviceMobile, Gift, Key } from '@phosphor-icons/react';
import { FINGERPRINT_WORDS, SECRET_WORDS, cleanCode, splitWords, validWords, type Invite } from '@family-registry/core';
import { copy } from '../copy.ts';
import { detectDevice } from '../device.ts';
import type { PairResult } from '../pairing.ts';
import { rich, t } from '../ui/text.tsx';

const c = copy.start;

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

  async function submitCode(entered = code) {
    if (entered.length !== 6 || busy) return;
    setBusy(true);
    setCodeError('');
    try {
      const r = await onCode(entered);
      if (r === 'not-found') setCodeError(c.codeWrong);
    } catch {
      setCodeError(c.codeOffline);
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'code') return (
    <section className="screen welcome">
      <div className="mark"><DeviceMobile weight="duotone" aria-hidden /></div>
      <h1>{iosHome ? c.codeTitleIos : c.codeTitle}</h1>
      <p>{rich(iosHome ? c.codeTextIos : c.codeText)}</p>
      <input ref={codeRef} className="field code-field" inputMode="numeric" autoComplete="one-time-code" aria-label={c.codeLabel} placeholder={c.codePlaceholder}
        value={code.length > 3 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
        onChange={e => { const v = cleanCode(e.target.value); setCode(v); if (v.length === 6) void submitCode(v); }} />
      {codeError && <p className="hint" role="alert" style={{ color: 'var(--accent)' }}>{codeError}</p>}
      <button className="btn primary" disabled={code.length !== 6 || busy} onClick={() => submitCode()}>{busy ? c.checking : copy.common.continue}</button>
      <button className="btn quiet" onClick={() => setMode('hello')}>{iosHome ? c.otherWays : copy.common.back}</button>
    </section>
  );

  if (mode === 'words') return (
    <section className="screen welcome">
      <div className="mark"><Key weight="duotone" aria-hidden /></div>
      <h1>{c.wordsTitle}</h1>
      <p>{t(c.wordsText, { n: need })}</p>
      <textarea className="field small" rows={4} value={text} onChange={e => setText(e.target.value)} aria-label={c.wordsLabel} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <p className="hint">{t(c.wordsCount, { n: words.length, need })}</p>
      <button className="btn primary" style={{ marginTop: 14 }} disabled={words.length !== need} onClick={submitWords}>{copy.common.continue}</button>
      <button className="btn quiet" onClick={() => setMode('hello')}>{copy.common.back}</button>
    </section>
  );

  if (mode === 'new') return (
    <section className="screen welcome">
      <div className="mark"><Gift weight="duotone" aria-hidden /></div>
      <h1>{c.newTitle}</h1>
      <p>{c.newText}</p>
      <input className="field" placeholder={c.firstName} aria-label={c.firstName} value={name} autoFocus
        onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && onStartFamily(name.trim())} />
      <button className="btn primary" disabled={!name.trim()} onClick={() => onStartFamily(name.trim())}>{c.start}</button>
      <button className="btn quiet" onClick={() => setMode('hello')}>{copy.common.back}</button>
    </section>
  );

  return (
    <section className="screen welcome">
      <div className="mark"><Gift weight="duotone" aria-hidden /></div>
      <h1>{c.title}</h1>
      <p>{c.intro}</p>
      <button className="btn ghost" onClick={() => setMode('code')}><DeviceMobile aria-hidden /> {c.haveCode}</button>
      <button className="btn ghost" onClick={() => setMode('words')}><Key aria-hidden /> {c.haveWords}</button>
      <button className="btn quiet" onClick={() => setMode('new')}>{c.newFamily}</button>
    </section>
  );
}
