import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardText, DeviceMobile, Gift, Lifebuoy } from '@phosphor-icons/react';
import { cleanCode, newPairCode, parseInvite } from '@family-registry/core';
import { copy } from '../copy.ts';
import { detectDevice } from '../device.ts';
import { waitForPairing, type PairResult } from '../pairing.ts';
import { REMOVED_KEY } from '../identity.ts';
import { mayStartFamily } from '../route.ts';
import { rich, t } from '../ui/text.tsx';

const c = copy.start;

/**
 * Shown when the app is opened without a personal link. Most people never see this:
 * their invite link signs them in. It offers a code from another device (and, on an
 * iPhone's Home Screen app, leads with it), and "I lost my link", which shows a number to
 * read out to an organizer. Starting a new family only shows with the start link, and then it comes first.
 */
export function Start({ onStartFamily, onCode }: {
  onStartFamily: (name: string) => void; onCode: (code: string) => Promise<PairResult>;
}) {
  const device = useMemo(() => detectDevice(), []);
  // An iPhone Home Screen app doesn't share Safari's storage: it needs the code Safari showed.
  const iosHome = device.platform === 'ios' && device.standalone;
  const [mode, setMode] = useState<'hello' | 'lost' | 'new' | 'code'>(iosHome ? 'code' : 'hello');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const [mayStart, setMayStart] = useState(false);
  const [removedFrom] = useState(() => { try { return localStorage.getItem(REMOVED_KEY); } catch { return null; } });
  useEffect(() => {
    const check = () => void mayStartFamily().then(ok => {
      setMayStart(ok);
      if (ok && !iosHome) setMode(m => (m === 'hello' ? 'new' : m));
    });
    check();
    addEventListener('hashchange', check);
    return () => removeEventListener('hashchange', check);
  }, [iosHome]);
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

  /** The person's link, pasted: it signs in the same way as opening it (App listens for the address changing). */
  const [pasted, setPasted] = useState('');
  const [pasteError, setPasteError] = useState(false);
  const takePasted = (text: string) => {
    setPasted(text);
    const at = text.indexOf('#');
    const fragment = at >= 0 ? text.slice(at).trim() : '';
    if (fragment && parseInvite(fragment)) { setPasteError(false); location.hash = fragment; }
    else setPasteError(!!text.trim());
  };
  const paste = async () => {
    try { takePasted(await navigator.clipboard.readText()); }
    catch { document.getElementById('paste-link')?.focus(); }
  };

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
      {iosHome && <>
        <div className="label" style={{ marginTop: 22 }}>{c.pasteTitle}</div>
        <p className="hint" style={{ marginTop: 0 }}>{rich(c.pasteHint)}</p>
        <button className="btn ghost" onClick={() => void paste()}><ClipboardText aria-hidden /> {c.pasteButton}</button>
        <input id="paste-link" className="field small" aria-label={c.pasteLabel} placeholder={c.pasteLabel} autoComplete="off" autoCapitalize="off" value={pasted} onChange={e => takePasted(e.target.value)} />
        {pasteError && <p className="hint" role="alert" style={{ color: 'var(--accent)' }}>{c.pasteWrong}</p>}
      </>}
      <button className="btn quiet" onClick={() => setMode('hello')}>{iosHome ? c.otherWays : copy.common.back}</button>
    </section>
  );

  if (mode === 'lost') return <LostLink onBack={() => setMode('hello')} />;

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
      {removedFrom ? <div className="note" role="status"><span>{t(c.removed, { group: removedFrom })}</span></div> : <p>{c.intro}</p>}
      <button className="btn ghost" onClick={() => setMode('code')}><DeviceMobile aria-hidden /> {c.haveCode}</button>
      <button className="btn ghost" onClick={() => setMode('lost')}><Lifebuoy aria-hidden /> {c.lostLink}</button>
      {mayStart && <button className="btn quiet" onClick={() => setMode('new')}>{c.newFamily}</button>}
    </section>
  );
}

/**
 * "I lost my link": a fresh number to read out to whoever set up the family. They type it in
 * (People, the person, They lost their link) and this screen signs in by itself. Numbers last 10 minutes.
 */
function LostLink({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState(() => newPairCode());
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const stop = new AbortController();
    setExpired(false);
    void waitForPairing(code, stop.signal).then(r => { if (r === 'expired') setExpired(true); });
    return () => stop.abort();
  }, [code]);
  return (
    <section className="screen welcome">
      <div className="mark"><Lifebuoy weight="duotone" aria-hidden /></div>
      <h1>{c.lostTitle}</h1>
      <p>{c.lostText}</p>
      {expired ? <>
        <p className="hint">{c.lostExpired}</p>
        <button className="btn primary" onClick={() => setCode(newPairCode())}>{c.lostNewNumber}</button>
      </> : <>
        <div className="pair-code" aria-label={c.lostCodeLabel}>{code.slice(0, 3)} {code.slice(3)}</div>
        <p className="hint" role="status" style={{ textAlign: 'center' }}>{c.lostWaiting}</p>
      </>}
      <button className="btn quiet" onClick={onBack}>{copy.common.back}</button>
    </section>
  );
}
