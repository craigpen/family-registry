import { useEffect, useMemo, useState } from 'react';
import { offerPairing } from '../pairing.ts';
import { ArrowLeft, DeviceMobile, Gift, HouseLine, Plus } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import { detectDevice, type Platform } from '../device.ts';
import type { Family } from '../family.ts';
import { Avatar, firstName } from '../ui/bits.tsx';
import { DesktopSetup, InstallSteps, OpenInBrowser } from '../ui/InstallSteps.tsx';
import { plural, rich, t } from '../ui/text.tsx';

const c = copy.welcome;

/**
 * First open after signing in: greets the person by name and face (from the roster),
 * then walks them through installing on the device they're actually using.
 * PLAN.md "Invites and getting set up".
 */
export function Welcome({ fam, waiting, onDone }: { fam: Family; waiting: boolean; onDone: (next: 'add' | 'family', name?: string) => void }) {
  const device = useMemo(() => detectDevice(), []);
  const [step, setStep] = useState<'hi' | 'install' | 'done'>(device.standalone ? 'done' : 'hi');
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
          <button className="btn primary" disabled={!known && !fam.isOrganizer && !name.trim()} onClick={() => setStep('install')}>
            {device.platform === 'desktop'
              ? <><Gift weight="bold" aria-hidden /> {c.chooseDesktop}</>
              : <><DeviceMobile weight="bold" aria-hidden /> {c.putOnPhone}</>}
          </button>
          <button className="btn ghost" disabled={!known && !fam.isOrganizer && !name.trim()} onClick={() => onDone('family', name)}>
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
