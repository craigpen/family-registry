import { useState } from 'react';
import { Copy, DeviceMobile, Eye, Question, Storefront, TextAa } from '@phosphor-icons/react';
import { offerPairing } from '../pairing.ts';
import type { Identity } from '../db.ts';
import { myLink } from '../identity.ts';
import { copy } from '../copy.ts';
import { Sheet } from './Sheet.tsx';
import { rich } from './text.tsx';
import { useToast } from './Toast.tsx';

export function SettingsSheet({ open, onClose, me, largeText, onLargeText }: {
  open: boolean; onClose: () => void; me: Identity; largeText: boolean; onLargeText: (on: boolean) => void;
}) {
  const [showWords, setShowWords] = useState(false);
  const [code, setCode] = useState<string | null | 'busy' | 'failed'>(null);
  const pair = async () => { setCode('busy'); setCode((await offerPairing(me)) ?? 'failed'); };
  const toast = useToast();
  const c = copy.settings;
  const group = me.groups[0]!;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(myLink(me)); toast(<><Copy weight="fill" /> {c.linkCopied}</>); }
    catch { setShowWords(true); }
  };

  return (
    <Sheet open={open} onClose={onClose} heading={c.title} headingStyle={{ marginBottom: 12 }}>
      <button className="toggle" aria-pressed={largeText} onClick={() => onLargeText(!largeText)}>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><TextAa aria-hidden /> {c.largerText}</span><span className="switch" />
      </button>

      <div className="label" style={{ marginTop: 22 }}>{c.otherDevice}</div>
      <div className="note" style={{ marginBottom: 10 }}><span>{c.otherDeviceNote}</span></div>
      <button className="btn ghost" onClick={pair} disabled={code === 'busy'}><DeviceMobile aria-hidden /> {c.addDevice}</button>
      {code === 'failed' && <p className="hint" role="alert">{c.offline}</p>}
      {code && code !== 'busy' && code !== 'failed' && <>
        <div className="pair-code" aria-label={c.codeLabel}>{code.slice(0, 3)} {code.slice(3)}</div>
        <p className="hint" style={{ textAlign: 'center' }}>{rich(c.codeHint)}</p>
      </>}
      <button className="btn ghost" onClick={copyLink}><Copy aria-hidden /> {c.copyLink}</button>
      <button className="btn ghost" onClick={() => setShowWords(s => !s)}><Eye aria-hidden /> {showWords ? c.hideWords : c.showWords}</button>
      {showWords && (
        <p className="words" aria-label={c.wordsLabel}>{[...group.words, ...me.memberWords, ...group.organizer].join(' ')}</p>
      )}
      <a className="link" href={`${import.meta.env.BASE_URL}help#helpers`} style={{ marginTop: 14 }}><Storefront aria-hidden /><span>{c.shopsFaster}</span></a>
      <a className="link" href={`${import.meta.env.BASE_URL}help`}><Question aria-hidden /><span>{c.helpSetup}</span></a>
    </Sheet>
  );
}
