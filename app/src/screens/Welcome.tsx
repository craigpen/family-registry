import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { offerPairing } from '../pairing.ts';
import { db } from '../db.ts';
import { saveProfile, type ProfileChanges } from '../profile.ts';
import { FacePicker } from '../ui/FacePicker.tsx';
import { BirthdayPicker, joinBirthday, splitBirthday } from '../ui/PeopleSheets.tsx';
import { ArrowLeft, DeviceMobile, Gift, HouseLine, Plus } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import { detectDevice, type Platform } from '../device.ts';
import type { Family } from '../family.ts';
import { Avatar, firstName } from '../ui/bits.tsx';
import { DesktopSetup, InstallSteps, OpenInBrowser } from '../ui/InstallSteps.tsx';
import { plural, rich, t } from '../ui/text.tsx';

const c = copy.welcome;

type Step = 'hi' | 'about' | 'install' | 'done';
type After = 'install' | 'done' | 'family';

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
  const [busy, setBusy] = useState(false);
  const known = !!self.birthday;
  const finish = async (save: boolean) => {
    setBusy(true);
    try {
      const ch: ProfileChanges = {};
      if (save && photo !== (self.photo ?? null)) ch.photo = photo;
      const bday = joinBirthday(month, day);
      if (save && bday !== (self.birthday ?? null) && (bday || known)) ch.birthday = bday;
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
      <FacePicker person={{ ...self, name: name.trim() || self.name }} photo={photo ?? undefined} onChange={setPhoto} />
      <BirthdayPicker month={month} day={day} setMonth={m => setBirthday([m, day])} setDay={d => setBirthday([month, d])} />
      {known && <p className="hint">{a.birthdayKnown}</p>}
      <button className="btn primary" style={{ marginTop: 18 }} disabled={busy} onClick={() => void finish(true)}>{a.done}</button>
      <button className="btn ghost" disabled={busy} onClick={() => void finish(false)}>{a.skip}</button>
      <p className="hint" style={{ textAlign: 'center' }}>{a.later}</p>
    </section>
  );
}

/**
 * First open after signing in: greets the person by name and face (from the roster),
 * asks once for a photo and birthday (About you), then walks them through installing
 * on the device they're actually using. PLAN.md "Invites and getting set up".
 */
export function Welcome({ fam, waiting, onDone }: { fam: Family; waiting: boolean; onDone: (next: 'add' | 'family', name?: string) => void }) {
  const device = useMemo(() => detectDevice(), []);
  const [step, setStep] = useState<Step>(device.standalone ? 'done' : 'hi');
  const asked = useLiveQuery(() => db.prefs.get('prefs').then(p => !!p?.aboutAsked), [], undefined);
  const [after, setAfter] = useState<After | null>(null);
  const goTo = (to: After) => (to === 'family' ? onDone('family', name) : setStep(to));
  /** Leaving the greeting: About you comes first, once per device. */
  const next = (to: After) => {
    if (asked === false) { setAfter(to); setStep('about'); } else goTo(to);
  };
  // Opened from the Home Screen already, so there's no greeting: About you still comes first.
  useEffect(() => { if (step === 'done' && asked === false && !after) { setAfter('done'); setStep('about'); } }, [step, asked, after]);
  const [platform, setPlatform] = useState<Platform>(device.platform);
  const [name, setName] = useState('');
  const [gaveUp, setGaveUp] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  // On an iPhone, the Home Screen app won't share Safari's sign-in: have a code ready for it.
  useEffect(() => {
    if (step === 'install' && platform === 'ios' && device.platform === 'ios' && !device.standalone && !code) void offerPairing(fam.me).then(setCode);
  }, [step, platform]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const timer = setTimeout(() => setGaveUp(true), 10_000); return () => clearTimeout(timer); }, []);

  const self = fam.self;
  const known = fam.people.has(fam.me.pubkey);
  const group = fam.groups.find(g => g.members.length)?.name;
  const others = fam.others.length;

  if (!known && waiting && !gaveUp) return (
    <section className="screen welcome" aria-busy="true"><div className="spinner" /><p>{c.finding}</p></section>
  );

  if (step === 'about') return <AboutYou fam={fam} name={name} onNext={() => goTo(after ?? 'done')} />;

  if (step === 'done') return (
    <section className="screen welcome">
      <div className="mark"><Gift weight="duotone" aria-hidden /></div>
      <h1>{known ? t(c.allSetName, { name: firstName(self.name) }) : c.allSet}</h1>
      <p>{platform !== 'desktop' ? c.doneHomeScreen : device.standalone ? c.doneWindow : c.doneBrowser}</p>
      <button className="btn primary" onClick={() => onDone('add', name)}><Plus weight="bold" aria-hidden /> {c.addFirst}</button>
      <button className="btn ghost" onClick={() => onDone('family', name)}>{c.seeFamily}</button>
    </section>
  );

  if (step === 'install') return (
    <section className="screen setup">
      <button className="iconbtn back" onClick={() => setStep('hi')} aria-label={copy.common.back}><ArrowLeft weight="bold" /></button>
      <h1>{platform === 'desktop' ? c.desktopTitle : c.phoneTitle}</h1>
      <div className="seen">{t(c.showingFor, { device: platform === 'ios' ? c.forIos : platform === 'android' ? c.forAndroid : c.forDesktop })}</div>
      <div className="tabs" role="group" aria-label={copy.devices.label}>
        {(['ios', 'android', 'desktop'] as const).map(p => (
          <button key={p} className="chip" aria-pressed={platform === p} onClick={() => setPlatform(p)}>{copy.devices[p]}</button>
        ))}
      </div>
      {platform === 'desktop' ? <DesktopSetup onInstalled={() => setStep('done')} /> : <InstallSteps platform={platform} onInstalled={() => setStep('done')} />}
      {platform === 'ios' && <div className="note"><HouseLine aria-hidden /><span>{rich(c.iosHome)}{code && <> {rich(c.iosCode, { code: `${code.slice(0, 3)} ${code.slice(3)}` })}</>}</span></div>}
      <button className={`btn ${platform === 'android' ? 'quiet' : 'primary'}`} onClick={() => setStep('done')}>{platform === 'ios' ? c.iDidIt : platform === 'desktop' ? copy.common.done : c.skip}</button>
    </section>
  );

  return (
    <section className="screen welcome">
      <div style={{ marginTop: 10 }}>{known ? <Avatar person={self} size="lg" /> : <div className="mark"><Gift weight="duotone" aria-hidden /></div>}</div>
      <h1>{known ? t(c.hello, { name: firstName(self.name) }) : c.helloAnon}</h1>
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
        <>
          <button className="btn primary" disabled={!known && !fam.isOrganizer && !name.trim()} onClick={() => next('install')}>
            {device.platform === 'desktop'
              ? <><Gift weight="bold" aria-hidden /> {c.chooseDesktop}</>
              : <><DeviceMobile weight="bold" aria-hidden /> {c.putOnPhone}</>}
          </button>
          <button className="btn ghost" disabled={!known && !fam.isOrganizer && !name.trim()} onClick={() => next('family')}>
            {device.platform === 'desktop' ? c.justBrowser : c.notNow}
          </button>
        </>
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
