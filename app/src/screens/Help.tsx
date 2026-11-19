import { useMemo, useState } from 'react';
import { Gift } from '@phosphor-icons/react';
import { detectDevice, type Platform } from '../device.ts';
import { InstallSteps, OpenInBrowser } from '../ui/InstallSteps.tsx';

/**
 * The public setup guide at /help. Holds no identity, so it's safe to forward or print.
 * Shows the steps for the device it's opened on first, with tabs for the others.
 */
export function Help() {
  const device = useMemo(() => detectDevice(), []);
  const [platform, setPlatform] = useState<Platform>(device.platform);
  return (
    <section className="screen help">
      <div className="welcome" style={{ padding: '10px 0 0' }}><div className="mark"><Gift weight="duotone" aria-hidden /></div></div>
      <h1 style={{ margin: '16px 0 6px' }}>Getting set up</h1>
      <p className="seen">First, open the personal link you were sent. Then put the app on your {platform === 'desktop' ? 'computer' : 'phone'}:</p>
      <div className="tabs" role="group" aria-label="Device">
        {(['ios', 'android', 'desktop'] as const).map(p => (
          <button key={p} className="chip" aria-pressed={platform === p} onClick={() => setPlatform(p)}>{p === 'ios' ? 'iPhone or iPad' : p === 'android' ? 'Android' : 'Computer'}</button>
        ))}
      </div>
      {device.inApp && platform === device.platform && <OpenInBrowser platform={platform} />}
      <InstallSteps platform={platform} />

      <details><summary>I got a new phone</summary>
        <p>Open your invite message on the new phone and tap the link again. Can't find it? Ask whoever set up the family to send it again; they keep a copy for everyone.</p></details>
      <details><summary>It says I'm someone else</summary>
        <p>Someone else's link was opened on this device. Open your own link and choose to switch. Nothing is lost: everyone's lists are kept safely and come back.</p></details>
      <details><summary>Can the person see what I'm getting them?</summary>
        <p>No. Your own list never shows who's getting what, and secret ideas for you are hidden from you.</p></details>
      <details><summary>Is there a password?</summary>
        <p>No. Your personal link is your way in. Keep it to yourself, and don't forward the invite.</p></details>
    </section>
  );
}
