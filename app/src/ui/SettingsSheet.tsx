import { useState } from 'react';
import { Copy, DeviceMobile, Eye, Question, TextAa } from '@phosphor-icons/react';
import { offerPairing } from '../pairing.ts';
import type { Identity } from '../db.ts';
import { myLink } from '../identity.ts';
import { Sheet } from './Sheet.tsx';
import { useToast } from './Toast.tsx';

export function SettingsSheet({ open, onClose, me, largeText, onLargeText }: {
  open: boolean; onClose: () => void; me: Identity; largeText: boolean; onLargeText: (on: boolean) => void;
}) {
  const [showWords, setShowWords] = useState(false);
  const [code, setCode] = useState<string | null | 'busy' | 'failed'>(null);
  const pair = async () => { setCode('busy'); setCode((await offerPairing(me)) ?? 'failed'); };
  const toast = useToast();
  const group = me.groups[0]!;
  const copy = async () => {
    try { await navigator.clipboard.writeText(myLink(me)); toast(<><Copy weight="fill" /> Your link is copied</>); }
    catch { setShowWords(true); }
  };

  return (
    <Sheet open={open} onClose={onClose} heading="Settings" headingStyle={{ marginBottom: 12 }}>
      <button className="toggle" aria-pressed={largeText} onClick={() => onLargeText(!largeText)}>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><TextAa aria-hidden /> Larger text</span><span className="switch" />
      </button>

      <div className="label" style={{ marginTop: 22 }}>On another phone, tablet or computer</div>
      <div className="note" style={{ marginBottom: 10 }}><span>Open your own link there and you'll be you. Keep it to yourself: whoever has it can use your list.</span></div>
      <button className="btn ghost" onClick={pair} disabled={code === 'busy'}><DeviceMobile aria-hidden /> Add a device</button>
      {code === 'failed' && <p className="hint" role="alert">Couldn't reach the internet. Try again when you're online.</p>}
      {code && code !== 'busy' && code !== 'failed' && <>
        <div className="pair-code" aria-label="Pairing code">{code.slice(0, 3)} {code.slice(3)}</div>
        <p className="hint" style={{ textAlign: 'center' }}>On the other device, choose <b>I have a code from my other device</b> and type this. It works for 10 minutes.</p>
      </>}
      <button className="btn ghost" onClick={copy}><Copy aria-hidden /> Copy my link</button>
      <button className="btn ghost" onClick={() => setShowWords(s => !s)}><Eye aria-hidden /> {showWords ? 'Hide' : 'Show'} my words</button>
      {showWords && (
        <p className="words" aria-label="Your words">{[...group.words, ...me.memberWords, ...group.organizer].join(' ')}</p>
      )}
      <a className="link" href={`${import.meta.env.BASE_URL}help`} style={{ marginTop: 14 }}><Question aria-hidden /><span>Help with setting up</span></a>
    </Sheet>
  );
}
