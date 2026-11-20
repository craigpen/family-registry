import { useEffect, useState } from 'react';
import { CheckCircle, Copy, Gift, HouseLine } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { myLink } from '../identity.ts';
import { offerPairing } from '../pairing.ts';
import { detectDevice } from '../device.ts';
import { hasGiftButton, markDone, startSetup, STORE_URL, type SetupState } from '../setup.ts';
import { InstallSteps, Step } from './InstallSteps.tsx';
import { rich, t } from './text.tsx';
import { useToast } from './Toast.tsx';

const c = copy.setup;

/** The green check: what's done and where to find it now. */
function Done({ state }: { state: SetupState }) {
  const { path } = state;
  const [title, text] = state.already
    ? (hasGiftButton() && !detectDevice().standalone ? [c.doneButton, path.kind === 'button' ? c.doneButtonText : ''] : [c.doneAlready, ''])
    : path.kind === 'install' ? [c.doneInstall, c.doneInstallAndroid]
    : path.kind === 'ios-home' ? [c.doneIos, c.doneIosText]
    : [t(c.doneOpenIn, { browser: state.browser ?? path.browser }), c.doneOpenInText];
  return (
    <div className="setup-done" role="status">
      <CheckCircle weight="fill" aria-hidden />
      <div><b>{title}</b>{text && <span>{text}</span>}</div>
    </div>
  );
}

/** The 6-digit code the Home Screen app asks for, kept fresh (each lasts 10 minutes). */
function useWaitingCode(fam: Family, on: boolean) {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    if (!on) return;
    let live = true;
    const fetch = () => void offerPairing(fam.me).then(c => { if (live && c) setCode(c); });
    fetch();
    const timer = setInterval(fetch, 9 * 60_000);
    return () => { live = false; clearInterval(timer); };
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  return code;
}

/**
 * The one way to get set up on this device (setup.ts picks it), ending in a green check the
 * app sets itself. Used after About you on first open, and from Settings for anyone who skipped.
 */
export function DeviceSetup({ fam, state }: { fam: Family; state: SetupState }) {
  const toast = useToast();
  const { path, done } = state;
  useEffect(() => { if (!done) void startSetup(); }, [done]);
  const code = useWaitingCode(fam, !done && path.kind === 'ios-home');

  const title = path.kind === 'install' ? c.installAndroidTitle
    : path.kind === 'button' ? c.buttonTitle
    : path.kind === 'ios-home' ? c.iosTitle
    : t(c.openInTitle, { browser: path.browser });
  if (done) return <div className="device-setup">{!state.already && <h2>{title}</h2>}<Done state={state} /></div>;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(myLink(fam.me)); toast(<><Copy weight="fill" /> {copy.settings.linkCopied}</>); }
    catch { /* Nothing to copy to: the link is still in Settings. */ }
  };

  return (
    <div className="device-setup">
      <h2>{title}</h2>
      {path.kind === 'install' && <>
        <p className="hint">{c.installAndroidText}</p>
        <InstallSteps platform={path.platform} onInstalled={() => void markDone()} />
      </>}
      {path.kind === 'button' && <>
        <p className="hint">{c.buttonText}</p>
        {STORE_URL
          ? <a className="btn primary" href={STORE_URL} target="_blank" rel="noreferrer"><Gift weight="bold" aria-hidden /> {t(c.buttonStore, { browser: path.browser })}</a>
          : <div className="isteps">
            <Step n={1}>{rich(c.buttonDownload, {}, { zip: label => <a href={`${import.meta.env.BASE_URL}downloads/wish-list-extension.zip`} download>{label}</a> })}</Step>
            <Step n={2}>{rich(c.buttonDevMode, { page: path.browser === 'Edge' ? 'edge://extensions' : 'chrome://extensions' })}</Step>
            <Step n={3}>{rich(c.buttonLoad)}</Step>
            <Step n={4}>{rich(c.buttonPin)}</Step>
          </div>}
      </>}
      {path.kind === 'ios-home' && <>
        <p className="hint">{c.iosText}</p>
        <InstallSteps platform="ios" />
        <div className="note"><HouseLine aria-hidden /><span>{rich(copy.welcome.iosHome)}{code && <> {rich(copy.welcome.iosCode, { code: `${code.slice(0, 3)} ${code.slice(3)}` })}</>}</span></div>
      </>}
      {path.kind === 'open-in' && <>
        <p className="hint">{path.platform === 'android' ? c.openInAndroid : path.browser === 'Edge' ? c.openInWindows : c.openInDesktop}</p>
        <div className="isteps">
          <Step n={1}>{c.openInCopy}</Step>
          <Step n={2}>{rich(c.openInPaste, { browser: path.browser })}</Step>
        </div>
        <button className="btn primary" onClick={() => void copyLink()}><Copy weight="bold" aria-hidden /> {copy.settings.copyLink}</button>
        {path.mac && <p className="hint">{rich(c.macNoChrome)}</p>}
      </>}
      <p className="hint waiting"><span className="pulse-dot" aria-hidden />{c.waiting}</p>
    </div>
  );
}
