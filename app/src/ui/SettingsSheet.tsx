import { useEffect, useState, type ReactNode } from 'react';
import { Cake, Camera, Copy, DeviceMobile, Eye, Question, Storefront, TextAa, Trash } from '@phosphor-icons/react';
import type { Person } from '@family-registry/core';
import { saveProfile } from '../profile.ts';
import { FacePicker } from './FacePicker.tsx';
import { BirthdayPicker, joinBirthday, splitBirthday } from './PeopleSheets.tsx';
import { offerPairing } from '../pairing.ts';
import type { Identity } from '../db.ts';
import { myLink } from '../identity.ts';
import { copy } from '../copy.ts';
import { Sheet } from './Sheet.tsx';
import { rich } from './text.tsx';
import { useToast } from './Toast.tsx';

export function SettingsSheet({ open, onClose, me, self, largeText, onLargeText }: {
  open: boolean; onClose: () => void; me: Identity; self: Person; largeText: boolean; onLargeText: (on: boolean) => void;
}) {
  const toast = useToast();
  // Inside the sheet, not a toast: while a sheet is open, nothing behind it can be tapped.
  const [undo, setUndo] = useState<{ id: number; text: ReactNode; run: () => Promise<void> } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(timer);
  }, [undo]);
  useEffect(() => { if (!open) setUndo(null); }, [open]);
  const [[month, day], setBirthday] = useState(() => splitBirthday(self.birthday));
  useEffect(() => { if (open) setBirthday(splitBirthday(self.birthday)); }, [open, self.birthday]);
  // Changes save as you make them, each with an Undo.
  const setPhoto = async (photo: string | null) => {
    const run = await saveProfile(me.pubkey, { photo });
    setUndo({ id: Date.now(), text: <>{photo ? <Camera weight="fill" /> : <Trash weight="fill" />} {photo ? copy.toasts.photoSaved : copy.toasts.photoRemoved}</>, run });
  };
  const pickBirthday = async (m: string, d: string) => {
    setBirthday([m, d]);
    const next = joinBirthday(m, d);
    if ((m && !d) || (!m && d) || next === (self.birthday ?? null)) return;
    const run = await saveProfile(me.pubkey, { birthday: next });
    setUndo({ id: Date.now(), text: <><Cake weight="fill" /> {copy.toasts.birthdaySaved}</>, run });
  };
  const [showWords, setShowWords] = useState(false);
  const [code, setCode] = useState<string | null | 'busy' | 'failed'>(null);
  const pair = async () => { setCode('busy'); setCode((await offerPairing(me)) ?? 'failed'); };
  const c = copy.settings;
  const group = me.groups[0]!;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(myLink(me)); toast(<><Copy weight="fill" /> {c.linkCopied}</>); }
    catch { setShowWords(true); }
  };

  return (
    <Sheet open={open} onClose={onClose} heading={c.title} headingStyle={{ marginBottom: 12 }}>
      <div className="label" style={{ marginTop: 0 }}>{c.aboutYou}</div>
      <FacePicker person={self} photo={self.photo} onChange={setPhoto} selfie />
      <BirthdayPicker month={month} day={day} setMonth={m => void pickBirthday(m, day)} setDay={d => void pickBirthday(month, d)} />
      {undo && (
        <div className="inline-undo" role="status" key={undo.id}>
          <span>{undo.text}</span>
          <button onClick={() => { const u = undo; setUndo(null); void u.run(); }}>{copy.common.undo}</button>
        </div>
      )}
      <div style={{ marginTop: 22 }} />
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
