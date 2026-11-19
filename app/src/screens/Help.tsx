import { useMemo, useState } from 'react';
import { Gift } from '@phosphor-icons/react';
import { detectDevice, type Platform } from '../device.ts';
import { DesktopSetup, InstallSteps, OpenInBrowser } from '../ui/InstallSteps.tsx';

/**
 * The public setup guide at /help. Holds no identity, so it's safe to forward or print.
 * Shows the steps for the device it's opened on first, with tabs for the others.
 */
export function Help() {
  const device = useMemo(() => detectDevice(), []);
  const [platform, setPlatform] = useState<Platform>(device.platform);
  const base = import.meta.env.BASE_URL;
  return (
    <section className="screen help">
      <div className="welcome" style={{ padding: '10px 0 0' }}><div className="mark"><Gift weight="duotone" aria-hidden /></div></div>
      <h1 style={{ margin: '16px 0 6px' }}>Getting set up</h1>
      <p className="seen">First, open the personal link you were sent. {platform === 'desktop' ? 'Then, on a computer:' : 'Then put the app on your phone:'}</p>
      <div className="tabs" role="group" aria-label="Device">
        {(['ios', 'android', 'desktop'] as const).map(p => (
          <button key={p} className="chip" aria-pressed={platform === p} onClick={() => setPlatform(p)}>{p === 'ios' ? 'iPhone or iPad' : p === 'android' ? 'Android' : 'Computer'}</button>
        ))}
      </div>
      {device.inApp && platform === device.platform && <OpenInBrowser platform={platform} />}
      {platform === 'desktop' ? <DesktopSetup /> : <InstallSteps platform={platform} />}

      {platform !== 'desktop' && <>
      <h2 id="helpers" style={{ margin: '28px 0 6px' }}>Adding from shops, faster</h2>
      <p className="hint" style={{ marginBottom: 10 }}>Optional. Each one reads a shop's page so the name, photo and price fill themselves in.</p>
      {platform === 'android' && <div className="card">
        <h3>The Android helper</h3>
        <p>Adds <b>Add to wish list</b> to the Share menu in shop apps and Chrome.</p>
        <ol className="steps-list">
          <li>On the phone, tap <a href={`${base}downloads/wish-list-helper.apk`} download>Download the helper</a>.</li>
          <li>Open the downloaded file. Android asks to allow installing from this source: allow it, then tap <b>Install</b>.</li>
          <li>In a shop, tap <b>Share</b> and choose <b>Add to wish list</b>.</li>
        </ol>
      </div>}
      {platform === 'ios' && <div className="card">
        <h3>The Shortcut</h3>
        <p>Adds <b>Add to wish list</b> to Safari's Share menu. Ask whoever set up the family for the Shortcut link, tap it on your iPhone or iPad, then tap <b>Add Shortcut</b>.</p>
        <p>In another app, use its Share → <b>Copy link</b>, then <b>Paste a link</b> in the wish list.</p>
      </div>}
      </>}

      <details><summary>I got a new phone</summary>
        <p>Open your invite message on the new phone and tap the link again. Can't find it? Ask whoever set up the family to send it again; they keep a copy for everyone.</p></details>
      <details><summary>Adding a tablet or computer</summary>
        <p>On a device you're already using, open <b>Settings</b> and choose <b>Add a device</b>. On the new one, choose <b>I have a code from my other device</b> and type the 6 numbers.</p></details>
      <details><summary>It says I'm someone else</summary>
        <p>Someone else's link was opened on this device. Open your own link and choose to switch. Nothing is lost: everyone's lists are kept safely and come back.</p></details>
      <details><summary>Can the person see what I'm getting them?</summary>
        <p>No. Your own list never shows who's getting what, and secret ideas for you are hidden from you.</p></details>
      <details><summary>Is there a password?</summary>
        <p>No. Your personal link is your way in. Keep it to yourself, and don't forward the invite.</p></details>
    </section>
  );
}
