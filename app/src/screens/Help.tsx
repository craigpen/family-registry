import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Export, Gift } from '@phosphor-icons/react';
import { SHORTCUT_URL } from '../setup.ts';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.ts';
import { copy } from '../copy.ts';
import { detectDevice, type Platform } from '../device.ts';
import { AndroidAppSteps, DesktopSetup, InstallSteps, OpenInBrowser } from '../ui/InstallSteps.tsx';
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
      {platform === 'desktop' ? <DesktopSetup /> : platform === 'android' ? <AndroidAppSteps /> : <InstallSteps platform={platform} />}

      {platform === 'ios' && <>
      <details id="helpers" className="other-ways" open={location.hash === '#helpers' || location.hash === '#build-shortcut'}>
      <summary>{c.helpersTitle}</summary>
      <p className="hint" style={{ marginBottom: 10 }}>{c.helpersText}</p>
      {platform === 'ios' && <div className="card">
        <h3>{c.iosTitle}</h3>
        <p>{rich(c.iosText)}</p>
        <a className="btn ghost" href={SHORTCUT_URL} target="_blank" rel="noopener"><Export aria-hidden /> {copy.setup.shortcutButton}</a>
        <p>{rich(c.iosOtherApps)}</p>
        {location.hash === '#build-shortcut' && <CopyShortcutScript />}
      </div>}
      </details>
      </>}

      {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{rich(a)}</p></details>)}
    </section>
  );
}

/**
 * Only at help#build-shortcut, for whoever (re)builds the iPhone/iPad Shortcut (shortcut/README.md): copies its script in one
 * tap, since Safari on an iPad offers no Select All on a page of code. Fetched ahead, so the copy
 * happens right in the tap (Safari only allows it then).
 */
function CopyShortcutScript() {
  const [script, setScript] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    void fetch(`${import.meta.env.BASE_URL}shortcut.js`).then(r => (r.ok ? r.text() : null)).then(setScript).catch(() => setScript(null));
  }, []);
  if (!script) return null;
  return (
    <>
      <p className="hint" style={{ marginBottom: 6 }}>{c.shortcutBuildHint}</p>
      <button className="btn ghost" onClick={() => void navigator.clipboard.writeText(script).then(() => setCopied(true))}>
        {copied ? <Check weight="bold" aria-hidden /> : <Copy aria-hidden />} {copied ? c.shortcutCopied : c.shortcutCopy}
      </button>
    </>
  );
}
