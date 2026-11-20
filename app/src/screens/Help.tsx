import { useMemo, useState } from 'react';
import { ArrowLeft, Gift } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { copy } from '../copy.ts';
import { detectDevice, type Platform } from '../device.ts';
import { DesktopSetup, InstallSteps, OpenInBrowser } from '../ui/InstallSteps.tsx';
import { rich } from '../ui/text.tsx';

const c = copy.help;

/**
 * The public setup guide at /help. Holds no identity, so it's safe to forward or print.
 * Shows the steps for the device it's opened on first, with tabs for the others.
 * Someone already set up here gets a way back to the app (an installed app has no browser Back button).
 */
export function Help() {
  const device = useMemo(() => detectDevice(), []);
  const [platform, setPlatform] = useState<Platform>(device.platform);
  const base = import.meta.env.BASE_URL;
  const signedIn = useLiveQuery(async () => !!(await db.identity.get('me')), [], false);
  const faq: [string, string][] = [
    [c.newPhoneQ, c.newPhoneA], [c.addDeviceQ, c.addDeviceA], [c.someoneElseQ, c.someoneElseA], [c.canTheySeeQ, c.canTheySeeA], [c.passwordQ, c.passwordA],
  ];
  return (
    <section className="screen help">
      {signedIn && <div className="top">
        <a className="iconbtn" href={base} aria-label={c.backToApp}><ArrowLeft weight="bold" /></a>
      </div>}
      <div className="welcome" style={{ padding: '10px 0 0' }}><div className="mark"><Gift weight="duotone" aria-hidden /></div></div>
      <h1 style={{ margin: '16px 0 6px' }}>{c.title}</h1>
      <p className="seen">{platform === 'desktop' ? c.firstDesktop : c.firstPhone}</p>
      <div className="tabs" role="group" aria-label={copy.devices.label}>
        {(['ios', 'android', 'desktop'] as const).map(p => (
          <button key={p} className="chip" aria-pressed={platform === p} onClick={() => setPlatform(p)}>{copy.devices[p]}</button>
        ))}
      </div>
      {device.inApp && platform === device.platform && <OpenInBrowser platform={platform} />}
      {platform === 'desktop' ? <DesktopSetup /> : <InstallSteps platform={platform} />}

      {platform !== 'desktop' && <>
      <h2 id="helpers" style={{ margin: '28px 0 6px' }}>{c.helpersTitle}</h2>
      <p className="hint" style={{ marginBottom: 10 }}>{c.helpersText}</p>
      {platform === 'android' && <div className="card">
        <h3>{c.androidTitle}</h3>
        <p>{rich(c.androidText)}</p>
        <ol className="steps-list">
          <li>{rich(c.androidStep1, {}, { apk: label => <a href={`${base}downloads/wish-list-helper.apk`} download>{label}</a> })}</li>
          <li>{rich(c.androidStep2)}</li>
          <li>{rich(c.androidStep3)}</li>
        </ol>
      </div>}
      {platform === 'ios' && <div className="card">
        <h3>{c.iosTitle}</h3>
        <p>{rich(c.iosText)}</p>
        <p>{rich(c.iosOtherApps)}</p>
      </div>}
      </>}

      {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{rich(a)}</p></details>)}
    </section>
  );
}
