import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy, EnvelopeSimple, PaperPlaneTilt, QrCode } from '@phosphor-icons/react';
import type { Family } from '../family.ts';
import { inviteLinkFor } from '../people.ts';
import { Avatar, QR, firstName } from './bits.tsx';
import { Sheet } from './Sheet.tsx';

const SUBJECT = 'Your spot on our family wish list';

export function inviteMessage(name: string, link: string, groupName: string, addedToGroup: boolean, from: string): string {
  const help = new URL(`${import.meta.env.BASE_URL}help`, location.origin).href;
  const intro = addedToGroup
    ? `Hi ${name}! You've been added to ${groupName} on our family wish list.`
    : `Hi ${name}! I've set up a wish list for the family, for Christmas and birthdays. You can see what everyone would like, quietly say "I'll get this", and keep your own list.`;
  return `${intro}

Here's your link. Open it on the phone or tablet you use most:
${link}

1. Open the link
2. It shows you how to keep it on your Home Screen (takes a minute)
3. Add a few things you'd like

Help with pictures: ${help}

Keep this message: it's how you get back in on a new phone. Please don't forward it. The link is just for you.

${from}`;
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
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    if (p && link && group) setMsg(inviteMessage(firstName(p.name), link, group.name, joinedBefore, firstName(fam.self.name)));
    setQr(false);
  }, [p?.pubkey, link, group?.name, joinedBefore]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p || !group) return <Sheet open={false} onClose={onClose} heading="">{null}</Sheet>;

  const share = async () => {
    try { await navigator.share({ title: SUBJECT, text: msg }); onSent('share'); }
    catch (e) { if ((e as Error).name !== 'AbortError') void copy(); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(msg); onSent('copy'); } catch { /* the text is on screen to copy by hand */ }
  };
  const email = () => {
    location.href = `mailto:?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(msg)}`;
    onSent('email');
  };

  const head = <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar person={p} size="sm" />Invite {firstName(p.name)}</span>;
  if (!link) return (
    <Sheet open onClose={onClose} heading={head}>
      <div className="note"><span>Their words aren't in your family backup on this device yet. If another organizer added them, wait a moment for it to sync.</span></div>
    </Sheet>
  );

  if (qr) return (
    <Sheet open onClose={onClose} heading={head}>
      <div className="qr-big">
        <QR text={link} size={240} label={`QR code for ${p.name}'s link`} />
        <div><b>Point {firstName(p.name)}'s phone camera at this</b><div className="hint">Then tap the link that pops up, and help with the install steps.</div></div>
      </div>
      <button className="btn primary" onClick={() => onSent('qr')}>Done</button>
      <button className="btn ghost" onClick={() => setQr(false)}>Back</button>
    </Sheet>
  );

  return (
    <Sheet open onClose={onClose} heading={head}>
      <p className="hint">{firstName(p.name)} gets a personal link to {group.name}. It works on any phone, tablet or computer, and there's no password. Change the message if you like.</p>
      <textarea className="field small msg" rows={9} aria-label="Invite message" value={msg} onChange={e => setMsg(e.target.value)} />
      {canShare ? <>
        <button className="btn primary" style={{ marginTop: 14 }} onClick={share}><PaperPlaneTilt weight="bold" aria-hidden /> Send invite</button>
        <p className="hint" style={{ textAlign: 'center', marginBottom: 12 }}>Pick Messages, WhatsApp, email or any app you use</p>
      </> : (
        <button className="btn primary" style={{ marginTop: 14 }} onClick={email}><EnvelopeSimple weight="bold" aria-hidden /> Email it</button>
      )}
      <div className="two" style={{ marginTop: 10 }}>
        <button className="btn ghost" onClick={copy}><Copy aria-hidden /> Copy</button>
        <button className="btn ghost" style={{ marginTop: 0 }} onClick={() => setQr(true)}><QrCode aria-hidden /> In person</button>
      </div>
    </Sheet>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function BirthdayPicker({ month, day, setMonth, setDay }: { month: string; day: string; setMonth: (m: string) => void; setDay: (d: string) => void }) {
  return <>
    <label className="label">Birthday (optional)</label>
    <div className="two">
      <select className="field small" aria-label="Birthday month" value={month} onChange={e => setMonth(e.target.value)}>
        <option value="">Month</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className="field small" aria-label="Birthday day" value={day} onChange={e => setDay(e.target.value)}>
        <option value="">Day</option>
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
    <Sheet open={open} onClose={onClose} heading="Add someone" headingStyle={{ marginBottom: 12 }}>
      <input className="field" placeholder="Their name" aria-label="Their name" value={name} onChange={e => setName(e.target.value)} />
      <BirthdayPicker month={month} day={day} setMonth={setMonth} setDay={setDay} />
      <Toggle on={managed} onChange={setManaged}>They won't use the app<small className="hint" style={{ display: 'block', margin: 0 }}>A young child, say. You keep their list, and can give them their own link later.</small></Toggle>
      {fam.groups.length > 1 && <>
        <label className="label">Groups</label>
        {fam.groups.map(g => {
          const on = groups.includes(g.tag);
          return <button key={g.tag} className="check" aria-pressed={on} onClick={() => setGroups(on ? groups.filter(t => t !== g.tag) : [...groups, g.tag])}><span className="box">{on && <Check weight="bold" />}</span>{g.name}</button>;
        })}
      </>}
      <button className="btn primary" style={{ marginTop: 16 }} disabled={!name.trim() || !groups.length || busy} onClick={save}>Add {name.trim() ? firstName(name.trim()) : 'them'}</button>
    </Sheet>
  );
}

/** Change someone's details: name, birthday, who helps keep their list, organizer. */
export function EditPersonSheet({ fam, pubkey, onClose, onSave }: {
  fam: Family; pubkey: string | null; onClose: () => void;
  onSave: (pk: string, ch: { name: string; birthday: string | null; helpers: string[]; managed: boolean; organizer: boolean }) => Promise<void>;
}) {
  const p = pubkey ? fam.people.get(pubkey) : undefined;
  const [name, setName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [helpers, setHelpers] = useState<string[]>([]);
  const [managed, setManaged] = useState(false);
  const [organizer, setOrganizer] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!p) return;
    setName(p.name); setHelpers(p.helpers); setManaged(p.managed); setOrganizer(p.organizer);
    const [m, d] = p.birthday?.split('-') ?? ['', ''];
    setMonth(m ? String(+m) : ''); setDay(d ? String(+d) : '');
  }, [pubkey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return <Sheet open={false} onClose={onClose} heading="">{null}</Sheet>;
  const self = p.pubkey === fam.me.pubkey;
  const others = [...fam.people.values()].filter(x => x.pubkey !== p.pubkey && !x.managed);
  return (
    <Sheet open onClose={onClose} heading={<span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar person={p} size="sm" />{p.name}</span>} headingStyle={{ marginBottom: 12 }}>
      <input className="field" aria-label="Name" value={name} onChange={e => setName(e.target.value)} />
      <BirthdayPicker month={month} day={day} setMonth={setMonth} setDay={setDay} />
      {!self && <>
        <label className="label">Who helps keep {firstName(p.name)}'s list</label>
        <p className="hint" style={{ marginTop: 0 }}>They can add to it and change it, and they see who's getting what on it.</p>
        {others.map(h => {
          const on = helpers.includes(h.pubkey);
          return <button key={h.pubkey} className="check" aria-pressed={on} onClick={() => setHelpers(on ? helpers.filter(x => x !== h.pubkey) : [...helpers, h.pubkey])}><span className="box">{on && <Check weight="bold" />}</span><Avatar person={h} size="sm" />{h.pubkey === fam.me.pubkey ? 'You' : h.name}</button>;
        })}
        <div style={{ marginTop: 10 }} />
        <Toggle on={managed} onChange={setManaged}>Doesn't use the app</Toggle>
        {!managed && <Toggle on={organizer} onChange={setOrganizer}>Co-organizer<small className="hint" style={{ display: 'block', margin: 0 }}>Can add people and send invites, and holds the family backup.</small></Toggle>}
      </>}
      <button className="btn primary" style={{ marginTop: 16 }} disabled={!name.trim() || busy} onClick={async () => {
        setBusy(true);
        try { await onSave(p.pubkey, { name: name.trim(), birthday: month && day ? `${pad(+month)}-${pad(+day)}` : null, helpers, managed, organizer: managed ? false : organizer }); }
        finally { setBusy(false); }
      }}>Save</button>
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
    <Sheet open={open} onClose={onClose} heading="Start another group" headingStyle={{ marginBottom: 6 }}>
      <p className="hint">For example "Family + in-laws". Each group sees its own people's lists. You can add new people to it afterwards.</p>
      <input className="field" style={{ marginTop: 12 }} placeholder="Group name" aria-label="Group name" value={name} onChange={e => setName(e.target.value)} />
      {fam.others.length > 0 && <label className="label">Who's in it</label>}
      {fam.others.map(p => {
        const on = members.includes(p.pubkey);
        return <button key={p.pubkey} className="check" aria-pressed={on} onClick={() => setMembers(on ? members.filter(x => x !== p.pubkey) : [...members, p.pubkey])}><span className="box">{on && <Check weight="bold" />}</span><Avatar person={p} size="sm" />{p.name}</button>;
      })}
      <button className="btn primary" style={{ marginTop: 16 }} disabled={!name.trim() || busy} onClick={async () => { setBusy(true); try { await onSave(name.trim(), members); } finally { setBusy(false); } }}>Start it</button>
    </Sheet>
  );
}
