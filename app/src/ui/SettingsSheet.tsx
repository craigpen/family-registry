import { useState } from 'react';
import { Copy, Eye, TextAa } from '@phosphor-icons/react';
import type { Identity } from '../db.ts';
import { myLink } from '../identity.ts';
import { Sheet } from './Sheet.tsx';
import { useToast } from './Toast.tsx';

export function SettingsSheet({ open, onClose, me, largeText, onLargeText }: {
  open: boolean; onClose: () => void; me: Identity; largeText: boolean; onLargeText: (on: boolean) => void;
}) {
  const [showWords, setShowWords] = useState(false);
  const toast = useToast();
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
      <button className="btn ghost" onClick={copy}><Copy aria-hidden /> Copy my link</button>
      <button className="btn ghost" onClick={() => setShowWords(s => !s)}><Eye aria-hidden /> {showWords ? 'Hide' : 'Show'} my words</button>
      {showWords && (
        <p className="words" aria-label="Your words">
          {[...me.groupWords, ...me.memberWords, ...me.organizerWords].join(' ')}
        </p>
      )}
    </Sheet>
  );
}
