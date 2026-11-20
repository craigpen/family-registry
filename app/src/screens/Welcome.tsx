import { ClockNote } from '../ui/ClockNote.tsx';
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { saveProfile, type ProfileChanges } from '../profile.ts';
import { FacePicker } from '../ui/FacePicker.tsx';
import { BirthdayPicker, joinBirthday, parseYear, splitBirthday } from '../ui/PeopleSheets.tsx';
import { ArrowRight, Gift } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import { detectDevice } from '../device.ts';
import { markDismissed, markTourSeen, useSetup } from '../setup.ts';
import { DeviceSetup } from '../ui/DeviceSetup.tsx';
import { Tour } from '../ui/Tour.tsx';
import type { Family } from '../family.ts';
import { Avatar, firstName } from '../ui/bits.tsx';
import { OpenInBrowser } from '../ui/InstallSteps.tsx';
import { plural, rich, t } from '../ui/text.tsx';

const c = copy.welcome;

type Step = 'hi' | 'about' | 'setup' | 'tour';

/** Remembers on this device that About you was answered or skipped. */
async function markAboutAsked() {
  const p = (await db.prefs.get('prefs')) ?? { id: 'prefs' as const, largeText: false };
  await db.prefs.put({ ...p, aboutAsked: true });
}

/**
 * The one-time "About you" step: a photo and a birthday, both optional.
 * Nothing is saved until Done, so there's nothing to undo; Skip for now saves nothing.
 */
function AboutYou({ fam, name, onNext }: { fam: Family; name: string; onNext: () => void }) {
  const self = fam.self;
  const [photo, setPhoto] = useState<string | null>(self.photo ?? null);
  const [[month, day], setBirthday] = useState(() => splitBirthday(self.birthday));
  const [year, setYear] = useState(self.birthYear ? String(self.birthYear) : '');
  const [busy, setBusy] = useState(false);
  const known = !!self.birthday;
  const finish = async (save: boolean) => {
    setBusy(true);
    try {
      const ch: ProfileChanges = {};
      if (save && photo !== (self.photo ?? null)) ch.photo = photo;
      const bday = joinBirthday(month, day);
      if (save && bday !== (self.birthday ?? null) && (bday || known)) ch.birthday = bday;
      const y = parseYear(year);
      if (save && y !== (self.birthYear ?? null) && (y || self.birthYear)) ch.birthYear = y;
      if (Object.keys(ch).length) await saveProfile(fam.me.pubkey, ch);
      await markAboutAsked();
      onNext();
    } finally { setBusy(false); }
  };
  const a = copy.aboutYou;
  return (
    <section className="screen welcome about">
      <h1>{a.title}</h1>
      <p>{a.text}</p>
      <FacePicker person={{ ...self, name: name.trim() || self.name }} photo={photo ?? undefined} onChange={setPhoto} selfie />
      <BirthdayPicker month={month} day={day} setMonth={m => setBirthday([m, day])} setDay={d => setBirthday([month, d])} year={year} setYear={setYear} />
      {known && <p className="hint">{a.birthdayKnown}</p>}
      <button className="btn primary" style={{ marginTop: 18 }} disabled={busy} onClick={() => void finish(true)}>{a.done}</button>
      <button className="btn ghost" disabled={busy} onClick={() => void finish(false)}>{a.skip}</button>
      <p className="hint" style={{ textAlign: 'center' }}>{a.later}</p>
    </section>
  );
}

/**
 * First open after signing in: greets the person by name and face (from the roster), asks once
 * for a photo and birthday (About you), then offers the one way to get set up on this device
 * (setup.ts), and once, a quick how-to. PLAN.md "Invites and getting set up".
 * Someone already set up on another device (opening their link in a second browser) skips
 * About you and the how-to: they've seen both.
 */
export function Welcome({ fam, waiting, onDone }: { fam: Family; waiting: boolean; onDone: (next: 'add' | 'family', name?: string) => void }) {
  const device = useMemo(() => detectDevice(), []);
  const [step, setStep] = useState<Step>('hi');
  const prefs = useLiveQuery(() => db.prefs.get('prefs').then(p => p ?? null), [], undefined);
  const setup = useSetup(fam);
  const [name, setName] = useState('');
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setGaveUp(true), 10_000); return () => clearTimeout(timer); }, []);

  const self = fam.self;
  const known = fam.people.has(fam.me.pubkey);
  const group = fam.groups.find(g => g.members.length)?.name;
  const others = fam.others.length;
  // Set up on another device already? Decided once, on leaving the greeting: a device that this
  // one's setup step leads to (Chrome, the Home Screen app) arrives later and mustn't count.
  const [elsewhere, setElsewhere] = useState<boolean | null>(null);
  const elsewhereNow = () => [...(fam.devices.get(fam.me.pubkey)?.keys() ?? [])].some(d => d !== prefs?.device);

  /** The next step after `from` that still has something to do. */
  const after = (from: Step, before: boolean): Step | 'leave' => {
    const order: Step[] = ['hi', 'about', 'setup', 'tour'];
    for (const s of order.slice(order.indexOf(from) + 1)) {
      if (s === 'about' && (prefs?.aboutAsked || before)) continue;
      if (s === 'setup' && setup?.already) continue;
      if (s === 'tour' && (prefs?.tourSeen || before)) continue;
      return s;
    }
    return 'leave';
  };
  const next = (from: Step) => {
    const before = elsewhere ?? elsewhereNow();
    if (elsewhere === null) setElsewhere(before);
    const to = after(from, before);
    if (to === 'leave') onDone('family', name); else setStep(to);
  };

  if ((!known && waiting && !gaveUp) || prefs === undefined || setup === undefined) return (
    <section className="screen welcome" aria-busy="true"><div className="spinner" /><p>{c.finding}</p></section>
  );

  if (step === 'about') return <AboutYou fam={fam} name={name} onNext={() => next('about')} />;

  if (step === 'setup') return (
    <section className="screen setup">
      <DeviceSetup fam={fam} state={setup} />
      {setup.done
        ? <button className="btn primary" onClick={() => next('setup')}>{copy.setup.continue}</button>
        : <>
          <button className="btn ghost" onClick={() => { void markDismissed(); next('setup'); }}>{copy.setup.notNow}</button>
          <p className="hint" style={{ textAlign: 'center' }}>{copy.setup.later}</p>
        </>}
    </section>
  );

  if (step === 'tour') return (
    <Tour fam={fam} onDone={to => { void markTourSeen(); onDone(to, name); }} />
  );

  return (
    <section className="screen welcome">
      <div style={{ marginTop: 10 }}>{known ? <Avatar person={self} size="lg" /> : <div className="mark"><Gift weight="duotone" aria-hidden /></div>}</div>
      <h1>{known ? t(c.hello, { name: firstName(self.name) }) : c.helloAnon}</h1>
      <ClockNote fam={fam} />
      <p>
        {group && others ? <>{rich(plural(c.inGroup, others), { group })} </> : null}
        {c.pitch}
      </p>
      {!known && !fam.isOrganizer && (
        <input className="field" placeholder={c.firstName} aria-label={c.firstName} value={name} onChange={e => setName(e.target.value)} />
      )}
      {device.inApp ? (
        <OpenInBrowser platform={device.platform} />
      ) : (
        <button className="btn primary" disabled={!known && !fam.isOrganizer && !name.trim()} onClick={() => next('hi')}>
          {c.start} <ArrowRight weight="bold" aria-hidden />
        </button>
      )}
    </section>
  );
}

export function Working({ text }: { text: string }) {
  return (
    <section className="screen welcome" aria-busy="true">
      <div className="spinner" />
      <p>{text}</p>
    </section>
  );
}
