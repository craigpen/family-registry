import { useEffect, useState } from 'react';
import { ArrowClockwise, Copy } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { detectDevice } from '../device.ts';
import { myLink } from '../identity.ts';
import { offerPairing } from '../pairing.ts';
import { useSetup } from '../setup.ts';
import { DeviceSetup } from './DeviceSetup.tsx';
import { Sheet } from './Sheet.tsx';
import { rich } from './text.tsx';
import { useToast } from './Toast.tsx';

const c = copy.settings;

/** This device's setup, from Settings: the same one path as on first open, with its green check. */
export function ThisDeviceSheet({ fam, open, onClose }: { fam: Family; open: boolean; onClose: () => void }) {
  const setup = useSetup(fam);
  return (
    <Sheet open={open} onClose={onClose} heading={detectDevice().platform === 'desktop' ? c.thisComputer : c.thisPhone}>
      {setup && open && <DeviceSetup fam={fam} state={setup} />}
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={onClose}>{copy.common.done}</button>
    </Sheet>
  );
}

/**
 * Getting on another device: a code first and big (the easiest), then the person's link.
 * (Lost everything? The other device's start screen has I lost my link.)
 */
export function OtherDeviceSheet({ fam, open, onClose }: { fam: Family; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState<string | null | 'busy' | 'failed'>(null);
  const pair = async () => { setCode('busy'); setCode((await offerPairing(fam.me)) ?? 'failed'); };
  useEffect(() => {
    if (!open) { setCode(null); return; }
    void pair();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(myLink(fam.me)); toast(<><Copy weight="fill" /> {c.linkCopied}</>); }
    catch { /* No clipboard here: the code above still works. */ }
  };
  return (
    <Sheet open={open} onClose={onClose} heading={c.anotherDevice}>
      <p className="hint" style={{ marginTop: 0 }}>{rich(c.anotherIntro)}</p>
      {code === 'busy' || code === null ? <div className="spinner" style={{ margin: '18px auto' }} />
        : code === 'failed' ? <p className="hint" role="alert">{c.offline}</p>
        : <>
          <div className="pair-code" aria-label={c.codeLabel}>{code.slice(0, 3)} {code.slice(3)}</div>
          <p className="hint" style={{ textAlign: 'center' }}>{c.codeHint}</p>
        </>}
      {(code === 'failed' || (code && code !== 'busy')) && (
        <button className="btn quiet" onClick={() => void pair()}><ArrowClockwise aria-hidden /> {c.newCode}</button>
      )}

      <div className="label" style={{ marginTop: 18 }}>{c.orLink}</div>
      <p className="hint" style={{ marginTop: 0 }}>{c.orLinkText}</p>
      <button className="btn ghost" onClick={() => void copyLink()}><Copy aria-hidden /> {c.copyLink}</button>

    </Sheet>
  );
}
