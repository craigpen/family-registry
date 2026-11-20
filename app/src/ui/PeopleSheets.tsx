import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy, EnvelopeSimple, Lifebuoy, PaperPlaneTilt, QrCode } from '@phosphor-icons/react';
import { cleanCode } from '@family-registry/core';
import { sendPairingFor } from '../pairing.ts';
import type { Family } from '../family.ts';
import { inviteLinkFor } from '../people.ts';
import { Avatar, QR, firstName } from './bits.tsx';
import { copy } from '../copy.ts';
import { FacePicker } from './FacePicker.tsx';
import { Sheet } from './Sheet.tsx';
import { rich, t } from './text.tsx';

const i = copy.invite;
const ps = copy.personSheets;

export function inviteMessage(name: string, link: string, groupName: string, addedToGroup: boolean, from: string): string {
  const help = new URL(`${import.meta.env.BASE_URL}help`, location.origin).href;
  const intro = addedToGroup ? t(i.introAdded, { group: groupName }) : i.introNew;
  return t(i.message, { name, intro, link, help, from });
}

/** Sending someone their personal link, through whatever app the organizer already uses with them. */
export function InviteSheet({ fam, target, onClose, onSent }: {
  fam: Family; target: { pubkey: string; group: string } | null; onClose: () => void; onSent: (how: 'share' | 'copy' | 'email' | 'qr') => void;
}) {
  const p = target ? fam.people.get(target.pubkey) : undefined;
  const group = target ? fam.groups.find(g => g.tag === target.group) : undefined;
  const link = target ? inviteLinkFor(fam, target.pubkey, target.group) : undefined;
  const joinedBefore = !!(target && fam.joined.get(target.pubkey)?.size);
  const [msg, setMsg] = useState('');
  const [qr, setQr] = useState(false);
  /** "They lost their link": the number their device shows, and how sending it went. */
  const [number, setNumber] = useState<null | { code: string; state: 'typing' | 'busy' | 'sent' | 'failed' }>(null);
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    if (p && link && group) setMsg(inviteMessage(firstName(p.name), link, group.name, joinedBefore, firstName(fam.self.name)));
    setQr(false);
    setNumber(null);
  }, [p?.pubkey, link, group?.name, joinedBefore]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p || !group) return <Sheet open={false} onClose={onClose} heading="">{null}</Sheet>;

  const share = async () => {
    try { await navigator.share({ title: i.subject, text: msg }); onSent('share'); }
    catch (e) { if ((e as Error).name !== 'AbortError') void copyMessage(); }
  };
  const copyMessage = async () => {
    try { await navigator.clipboard.writeText(msg); onSent('copy'); } catch { /* the text is on screen to copy by hand */ }
  };
  const email = () => {
    location.href = `mailto:?subject=${encodeURIComponent(i.subject)}&body=${encodeURIComponent(msg)}`;
    onSent('email');
  };

  const head = <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar person={p} size="sm" />{t(i.heading, { name: firstName(p.name) })}</span>;
  if (!link) return (
    <Sheet open onClose={onClose} heading={head}>
      <div className="note"><span>{i.noWords}</span></div>
    </Sheet>
  );

  if (qr) return (
    <Sheet open onClose={onClose} heading={head}>
      <div className="qr-big">
        <QR text={link} size={240} label={t(i.qrLabel, { name: p.name })} />
        <div><b>{t(i.qrTitle, { name: firstName(p.name) })}</b><div className="hint">{i.qrHint}</div></div>
      </div>
      <button className="btn primary" onClick={() => onSent('qr')}>{copy.common.done}</button>
      <button className="btn ghost" onClick={() => setQr(false)}>{copy.common.back}</button>
    </Sheet>
  );

  if (number) {
    const send = async (code: string) => {
      setNumber({ code, state: 'busy' });
      const ok = await sendPairingFor(fam, p.pubkey, code).catch(() => false);
      setNumber({ code, state: ok ? 'sent' : 'failed' });
    };
    return (
      <Sheet open onClose={onClose} heading={head}>
        {number.state === 'sent' ? <>
          <div className="note" role="status"><Check weight="bold" aria-hidden /><span>{t(i.numberSent, { name: firstName(p.name) })}</span></div>
          <button className="btn primary" onClick={onClose}>{copy.common.done}</button>
        </> : <>
          <h3 style={{ margin: '4px 0 6px' }}>{t(i.numberTitle, { name: firstName(p.name) })}</h3>
          <p className="hint">{rich(i.numberHint)}</p>
          <input className="field code-field" inputMode="numeric" autoComplete="off" aria-label={i.numberLabel} placeholder={copy.start.codePlaceholder} autoFocus
            value={number.code.length > 3 ? `${number.code.slice(0, 3)} ${number.code.slice(3)}` : number.code}
            onChange={e => setNumber({ code: cleanCode(e.target.value), state: 'typing' })} />
          {number.state === 'failed' && <p className="hint" role="alert">{i.numberFailed}</p>}
          <button className="btn primary" disabled={number.code.length !== 6 || number.state === 'busy'} onClick={() => void send(number.code)}>
            {number.state === 'busy' ? copy.start.checking : i.numberSend}
          </button>
          <button className="btn ghost" onClick={() => setNumber(null)}>{copy.common.back}</button>
        </>}
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} heading={head}>
      <p className="hint">{t(i.hint, { name: firstName(p.name), group: group.name })}</p>
      <textarea className="field small msg" rows={9} aria-label={i.messageLabel} value={msg} onChange={e => setMsg(e.target.value)} />
      {canShare ? <>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={share}><PaperPlaneTilt weight="bold" aria-hidden /> {i.send}</button>
        <p className="hint" style={{ textAlign: 'center', marginBottom: 12 }}>{i.sendHint}</p>
      </> : (
        <button className="btn primary" style={{ marginTop: 14 }} onClick={email}><EnvelopeSimple weight="bold" aria-hidden /> {i.email}</button>
      )}
      <div className="two" style={{ marginTop: 10 }}>
        <button className="btn ghost" onClick={copyMessage}><Copy aria-hidden /> {i.copy}</button>
        <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => setQr(true)}><QrCode aria-hidden /> {i.inPerson}</button>
      </div>
      <button className="btn quiet" onClick={() => setNumber({ code: '', state: 'typing' })}><Lifebuoy aria-hidden /> {i.byNumber}</button>
    </Sheet>
  );
}

export const pad = (n: number) => String(n).padStart(2, '0');

const MONTHS = ps.months;

/** "MM-DD" from the two pickers, or null when either is empty. */
export const joinBirthday = (month: string, day: string) => (month && day ? `${pad(+month)}-${pad(+day)}` : null);
/** The two pickers' values for "MM-DD". */
export const splitBirthday = (mmdd?: string): [string, string] => {
  const [m, d] = mmdd?.split('-') ?? [];
  return [m ? String(+m) : '', d ? String(+d) : ''];
};

export function BirthdayPicker({ month, day, setMonth, setDay }: { month: string; day: string; setMonth: (m: string) => void; setDay: (d: string) => void }) {
  return <>
    <label className="label">{ps.birthday}</label>
    <div className="two">
      <select className="field small" aria-label={ps.monthLabel} value={month} onChange={e => setMonth(e.target.value)}>
        <option value="">{ps.month}</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className="field small" aria-label={ps.dayLabel} value={day} onChange={e => setDay(e.target.value)}>
        <option value="">{ps.day}</option>
        {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
    </div>
  </>;
}

function Toggle({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return <button className="toggle" aria-pressed={on} onClick={() => onChange(!on)}><span>{children}</span><span className="switch" /></button>;
}

export function AddPersonSheet({ fam, open, onClose, onSave }: {
  fam: Family; open: boolean; onClose: () => void; onSave: (p: { name: string; birthday?: string; groups: string[]; managed: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [managed, setManaged] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(''); setMonth(''); setDay(''); setManaged(false); setGroups(fam.groups.slice(0, 1).map(g => g.tag)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const birthday = month && day ? `${pad(+month)}-${pad(+day)}` : undefined;
  const save = async () => {
    if (!name.trim() || !groups.length) return;
    setBusy(true);
    try { await onSave({ name: name.trim(), birthday, groups, managed }); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} heading={ps.addTitle} headingStyle={{ marginBottom: 12 }}>
      <input className="field" placeholder={ps.theirName} aria-label={ps.theirName} value={name} onChange={e => setName(e.target.value)} />
      <BirthdayPicker month={month} day={day} setMonth={setMonth} setDay={setDay} />
      <Toggle on={managed} onChange={setManaged}>{ps.wontUse}<small className="hint" style={{ display: 'block', margin: 0 }}>{ps.wontUseHint}</small></Toggle>
      {fam.groups.length > 1 && <>
        <label className="label">{ps.groups}</label>
        {fam.groups.map(g => {
          const on = groups.includes(g.tag);
          return <button key={g.tag} className="check" aria-pressed={on} onClick={() => setGroups(on ? groups.filter(t => t !== g.tag) : [...groups, g.tag])}><span className="box">{on && <Check weight="bold" />}</span>{g.name}</button>;
        })}
      </>}
      <button className="btn primary" style={{ marginTop: 16 }} disabled={!name.trim() || !groups.length || busy} onClick={save}>{name.trim() ? t(ps.addName, { name: firstName(name.trim()) }) : ps.addThem}</button>
    </Sheet>
  );
}

export interface PersonEdits { name: string; birthday: string | null; helpers: string[]; managed: boolean; organizer: boolean; photo: string | null }

/**
 * Change someone's details. Organizers change everything (name, birthday, photo, who helps keep
 * their list, organizer); the helpers of a managed person change just the photo and birthday.
 * Nothing is saved until Save, so removing a photo here needs no Undo.
 */
export function EditPersonSheet({ fam, pubkey, onClose, onSave }: {
  fam: Family; pubkey: string | null; onClose: () => void;
  onSave: (pk: string, ch: PersonEdits) => Promise<void>;
}) {
  const p = pubkey ? fam.people.get(pubkey) : undefined;
  const [name, setName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [helpers, setHelpers] = useState<string[]>([]);
  const [managed, setManaged] = useState(false);
  const [organizer, setOrganizer] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!p) return;
    setName(p.name); setHelpers(p.helpers); setManaged(p.managed); setOrganizer(p.organizer); setPhoto(p.photo ?? null);
    const [m, d] = splitBirthday(p.birthday);
    setMonth(m); setDay(d);
  }, [pubkey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return <Sheet open={false} onClose={onClose} heading="">{null}</Sheet>;
  const self = p.pubkey === fam.me.pubkey;
  const full = fam.isOrganizer;
  const others = [...fam.people.values()].filter(x => x.pubkey !== p.pubkey && !x.managed);
  return (
    <Sheet open onClose={onClose} heading={<span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar person={{ ...p, photo: photo ?? undefined }} size="sm" />{p.name}</span>} headingStyle={{ marginBottom: 12 }}>
      <FacePicker person={{ ...p, name: name || p.name }} photo={photo ?? undefined} onChange={setPhoto} />
      {full && <input className="field" aria-label={ps.nameLabel} value={name} onChange={e => setName(e.target.value)} />}
      <BirthdayPicker month={month} day={day} setMonth={setMonth} setDay={setDay} />
      {full && !self && <>
        <label className="label">{t(ps.helpersLabel, { name: firstName(p.name) })}</label>
        <p className="hint" style={{ marginTop: 0 }}>{ps.helpersHint}</p>
        {others.map(h => {
          const on = helpers.includes(h.pubkey);
          return <button key={h.pubkey} className="check" aria-pressed={on} onClick={() => setHelpers(on ? helpers.filter(x => x !== h.pubkey) : [...helpers, h.pubkey])}><span className="box">{on && <Check weight="bold" />}</span><Avatar person={h} size="sm" />{h.pubkey === fam.me.pubkey ? copy.common.you : h.name}</button>;
        })}
        <div style={{ marginTop: 10 }} />
        <Toggle on={managed} onChange={setManaged}>{ps.doesntUse}</Toggle>
        {!managed && <Toggle on={organizer} onChange={setOrganizer}>{ps.coOrganizer}<small className="hint" style={{ display: 'block', margin: 0 }}>{ps.coOrganizerHint}</small></Toggle>}
      </>}
      <button className="btn primary" style={{ marginTop: 16 }} disabled={!name.trim() || busy} onClick={async () => {
        setBusy(true);
        try { await onSave(p.pubkey, { name: name.trim(), birthday: joinBirthday(month, day), helpers, managed, organizer: managed ? false : organizer, photo }); }
        finally { setBusy(false); }
      }}>{copy.common.save}</button>
    </Sheet>
  );
}

export function NewGroupSheet({ fam, open, onClose, onSave }: {
  fam: Family; open: boolean; onClose: () => void; onSave: (name: string, members: string[]) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(''); setMembers(fam.others.map(p => p.pubkey)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={open} onClose={onClose} heading={ps.newGroupTitle} headingStyle={{ marginBottom: 6 }}>
      <p className="hint">{ps.newGroupHint}</p>
      <input className="field" style={{ marginTop: 12 }} placeholder={ps.groupName} aria-label={ps.groupName} value={name} onChange={e => setName(e.target.value)} />
      {fam.others.length > 0 && <label className="label">{ps.whosIn}</label>}
      {fam.others.map(p => {
        const on = members.includes(p.pubkey);
        return <button key={p.pubkey} className="check" aria-pressed={on} onClick={() => setMembers(on ? members.filter(x => x !== p.pubkey) : [...members, p.pubkey])}><span className="box">{on && <Check weight="bold" />}</span><Avatar person={p} size="sm" />{p.name}</button>;
      })}
      <button className="btn primary" style={{ marginTop: 16 }} disabled={!name.trim() || busy} onClick={async () => { setBusy(true); try { await onSave(name.trim(), members); } finally { setBusy(false); } }}>{ps.startIt}</button>
    </Sheet>
  );
}
