import { useEffect, useState, type ReactNode } from 'react';
import { Cake, Camera, CaretRight, CheckCircle, DeviceMobile, Devices as DevicesIcon, Laptop, Question, Storefront, TextAa, Trash } from '@phosphor-icons/react';
import { saveProfile } from '../profile.ts';
import { FacePicker } from './FacePicker.tsx';
import { BirthdayPicker, joinBirthday, parseYear, splitBirthday } from './PeopleSheets.tsx';
import { detectDevice } from '../device.ts';
import type { Family } from '../family.ts';
import { useSetup } from '../setup.ts';
import { copy } from '../copy.ts';
import { ConnectionCheck } from './ConnectionCheck.tsx';
import { Sheet } from './Sheet.tsx';
import { rich } from './text.tsx';

export function SettingsSheet({ open, onClose, fam, largeText, onLargeText, onThisDevice, onOtherDevice }: {
  open: boolean; onClose: () => void; fam: Family; largeText: boolean; onLargeText: (on: boolean) => void;
  onThisDevice: () => void; onOtherDevice: () => void;
}) {
  const me = fam.me, self = fam.self;
  const setup = useSetup(fam);
  const desktop = detectDevice().platform === 'desktop';
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
  const [year, setYearText] = useState(self.birthYear ? String(self.birthYear) : '');
  useEffect(() => { if (open) setYearText(self.birthYear ? String(self.birthYear) : ''); }, [open, self.birthYear]);
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
  /** Saves once it's a whole year (or emptied). */
  const pickYear = async (text: string) => {
    setYearText(text);
    const y = parseYear(text);
    if ((text && !y) || y === (self.birthYear ?? null)) return;
    const run = await saveProfile(me.pubkey, { birthYear: y });
    setUndo({ id: Date.now(), text: <><Cake weight="fill" /> {copy.toasts.birthdaySaved}</>, run });
  };
  const c = copy.settings;

  return (
    <Sheet open={open} onClose={onClose} heading={c.title} headingStyle={{ marginBottom: 12 }}>
      <div className="label" style={{ marginTop: 0 }}>{c.aboutYou}</div>
      <FacePicker person={self} photo={self.photo} onChange={setPhoto} selfie />
      <BirthdayPicker month={month} day={day} setMonth={m => void pickBirthday(m, day)} setDay={d => void pickBirthday(month, d)} year={year} setYear={y => void pickYear(y)} />
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

      <div className="label" style={{ marginTop: 22 }}>{c.devices}</div>
      <button className="link device-row" onClick={onThisDevice}>
        {desktop ? <Laptop aria-hidden /> : <DeviceMobile aria-hidden />}
        <span>{desktop ? c.thisComputer : c.thisPhone}</span>
        {setup?.done
          ? <b className="st joined"><CheckCircle weight="fill" aria-hidden /> {c.setUp}</b>
          : <b className="st todo">{c.notSetUp} <CaretRight weight="bold" aria-hidden /></b>}
      </button>
      <button className="btn ghost" onClick={onOtherDevice}><DevicesIcon aria-hidden /> {c.anotherDevice}</button>
      <a className="link" href={`${import.meta.env.BASE_URL}help#helpers`} style={{ marginTop: 14 }}><Storefront aria-hidden /><span>{c.shopsFaster}</span></a>
      <a className="link" href={`${import.meta.env.BASE_URL}help`}><Question aria-hidden /><span>{c.helpSetup}</span></a>
      <ConnectionCheck fam={fam} />
    </Sheet>
  );
}
