import { useEffect, useMemo, useState } from 'react';
import { offerPairing } from '../pairing.ts';
import { ArrowLeft, DeviceMobile, Gift, HouseLine, Plus } from '@phosphor-icons/react';
import { detectDevice, type Platform } from '../device.ts';
import type { Family } from '../family.ts';
import { Avatar, firstName } from '../ui/bits.tsx';
import { DesktopSetup, InstallSteps, OpenInBrowser } from '../ui/InstallSteps.tsx';

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
  useEffect(() => { const t = setTimeout(() => setGaveUp(true), 10_000); return () => clearTimeout(t); }, []);

  const self = fam.self;
  const known = fam.people.has(fam.me.pubkey);
  const group = fam.groups.find(g => g.members.length)?.name;
  const others = fam.others.length;

  if (!known && waiting && !gaveUp) return (
    <section className="screen welcome" aria-busy="true"><div className="spinner" /><p>Finding your family…</p></section>
  );

  if (step === 'done') return (
    <section className="screen welcome">
      <div className="mark"><Gift weight="duotone" aria-hidden /></div>
      <h1>You're all set{known ? `, ${firstName(self.name)}` : ''}!</h1>
      <p>{platform !== 'desktop'
        ? 'It lives on your Home Screen now. Look for the red gift. You\'re signed in, so there\'s nothing to remember.'
        : device.standalone
          ? 'It\'s in your Start menu or Dock now. You\'re signed in, so there\'s nothing to remember.'
          : 'Bookmark this page so it\'s easy to come back to. You\'re signed in, so there\'s nothing to remember.'}</p>
      <button className="btn primary" onClick={() => onDone('add', name)}><Plus weight="bold" aria-hidden /> Add your first wish</button>
      <button className="btn ghost" onClick={() => onDone('family', name)}>See the family</button>
    </section>
  );

  if (step === 'install') return (
    <section className="screen setup">
      <button className="iconbtn back" onClick={() => setStep('hi')} aria-label="Back"><ArrowLeft weight="bold" /></button>
      <h1>{platform === 'desktop' ? 'How would you like to use it?' : 'Put it on your phone'}</h1>
      <div className="seen">Showing steps for {platform === 'ios' ? 'iPhone and iPad' : platform === 'android' ? 'Android' : 'a computer'}. Not right?</div>
      <div className="tabs" role="group" aria-label="Device">
        {(['ios', 'android', 'desktop'] as const).map(p => (
          <button key={p} className="chip" aria-pressed={platform === p} onClick={() => setPlatform(p)}>{p === 'ios' ? 'iPhone or iPad' : p === 'android' ? 'Android' : 'Computer'}</button>
        ))}
      </div>
      {platform === 'desktop' ? <DesktopSetup onInstalled={() => setStep('done')} /> : <InstallSteps platform={platform} onInstalled={() => setStep('done')} />}
      {platform === 'ios' && <div className="note"><HouseLine aria-hidden /><span>Then open it from your <b>Home Screen</b>, not from here. That's where it lives now.{code && <> If it asks for a code, it's <b>{code.slice(0, 3)}&nbsp;{code.slice(3)}</b>.</>}</span></div>}
      <button className={`btn ${platform === 'android' ? 'quiet' : 'primary'}`} onClick={() => setStep('done')}>{platform === 'ios' ? "I've done it" : platform === 'desktop' ? 'Done' : 'Skip for now'}</button>
    </section>
  );

  return (
    <section className="screen welcome">
      <div style={{ marginTop: 10 }}>{known ? <Avatar person={self} size="lg" /> : <div className="mark"><Gift weight="duotone" aria-hidden /></div>}</div>
      <h1>{known ? `Welcome, ${firstName(self.name)}!` : 'Welcome!'}</h1>
      <p>
        {group && others ? <>You're in <b>{group}</b> with {others} {others === 1 ? 'other' : 'others'}. </> : null}
        See what everyone's wishing for, quietly pick something to get, and keep your own list.
      </p>
      {!known && !fam.isOrganizer && (
        <input className="field" placeholder="Your first name" aria-label="Your first name" value={name} onChange={e => setName(e.target.value)} />
      )}
      {device.inApp ? (
        <OpenInBrowser platform={device.platform} />
      ) : (
        <>
          <button className="btn primary" disabled={!known && !fam.isOrganizer && !name.trim()} onClick={() => setStep('install')}>
            {device.platform === 'desktop'
              ? <><Gift weight="bold" aria-hidden /> Choose how to use it here</>
              : <><DeviceMobile weight="bold" aria-hidden /> Put it on my phone</>}
          </button>
          <button className="btn ghost" disabled={!known && !fam.isOrganizer && !name.trim()} onClick={() => onDone('family', name)}>
            {device.platform === 'desktop' ? 'Just use it in the browser' : 'Not now, just look around'}
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
