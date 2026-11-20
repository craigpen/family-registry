import { useEffect, useState, type ReactNode } from 'react';
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
    : path.kind === 'private' ? [c.donePrivate, c.donePrivateText]
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

/** The step's heading, which a sheet can show as its own title. */
export const setupTitle = ({ path, update }: SetupState) => update ? c.updateTitle
  : path.kind === 'install' ? c.installAndroidTitle
  : path.kind === 'button' ? c.buttonTitle
  : path.kind === 'ios-home' ? c.iosTitle
  : path.kind === 'private' ? c.privateTitle
  : t(c.openInTitle, { browser: path.browser });

/**
 * The one way to get set up on this device (setup.ts picks it), ending in a green check the
 * app sets itself. Used after About you on first open, and from Settings for anyone who skipped.
 */
export function DeviceSetup({ fam, state, titled = true }: { fam: Family; state: SetupState; titled?: boolean }) {
  const toast = useToast();
  const { path, done } = state;
  useEffect(() => { if (!done) void startSetup(); }, [done]);
  const code = useWaitingCode(fam, !done && path.kind === 'ios-home');

  const title = titled && <h2>{setupTitle(state)}</h2>;
  const zip = (label: ReactNode) => <a href={`${import.meta.env.BASE_URL}downloads/wish-list-extension.zip`} download>{label}</a>;
  const extensionsPage = path.kind === 'button' && path.browser === 'Edge' ? 'edge://extensions' : 'chrome://extensions';
  if (done) return <div className="device-setup">{!state.already && title}<Done state={state} /></div>;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(myLink(fam.me)); toast(<><Copy weight="fill" /> {copy.settings.linkCopied}</>); }
    catch { /* Nothing to copy to: the link is still in Settings. */ }
  };

  return (
    <div className="device-setup">
      {title}
      {path.kind === 'install' && <>
        <p className="hint">{c.installAndroidText}</p>
        <InstallSteps platform={path.platform} onInstalled={() => void markDone()} />
      </>}
      {path.kind === 'button' && state.update && <>
        <p className="hint">{c.updateText}</p>
        <div className="isteps">
          <Step n={1}>{rich(c.updateDownload, {}, { zip })}</Step>
          <Step n={2}>{rich(c.updateReload, { page: extensionsPage })}</Step>
        </div>
      </>}
      {path.kind === 'button' && !state.update && <>
        <p className="hint">{c.buttonText}</p>
        {STORE_URL
          ? <a className="btn primary" href={STORE_URL} target="_blank" rel="noreferrer"><Gift weight="bold" aria-hidden /> {t(c.buttonStore, { browser: path.browser })}</a>
          : <div className="isteps">
            <Step n={1}>{rich(c.buttonDownload, {}, { zip })}</Step>
            <Step n={2}>{rich(c.buttonDevMode, { page: extensionsPage })}</Step>
            <Step n={3}>{rich(c.buttonLoad)}</Step>
            <Step n={4}>{rich(c.buttonPin)}</Step>
          </div>}
        <p className="hint already">{rich(c.buttonAlready, { page: extensionsPage })}</p>
      </>}
      {path.kind === 'ios-home' && <>
        <p className="hint">{c.iosText}</p>
        <InstallSteps platform="ios" />
        <div className="note"><HouseLine aria-hidden /><span>{rich(copy.welcome.iosHome)}{code && <> {rich(copy.welcome.iosCode, { code: `${code.slice(0, 3)} ${code.slice(3)}` })}</>}</span></div>
      </>}
      {path.kind === 'private' && <>
        <p className="hint">{c.privateText}</p>
        <div className="isteps">
          <Step n={1}>{c.privateCopy}</Step>
          <Step n={2}>{rich(c.privatePaste, { browser: path.browser })}</Step>
        </div>
        <button className="btn primary" onClick={() => void copyLink()}><Copy weight="bold" aria-hidden /> {copy.settings.copyLink}</button>
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
      <p className="hint waiting"><span className="wait-ring" aria-hidden />{c.waiting}</p>
    </div>
  );
}
