import { useEffect, useState, type ReactNode } from 'react';
import {
  AppWindow, ArrowSquareOut, BookOpen, CaretLeft, CaretRight, Copy, DotsThree, DotsThreeVertical, DownloadSimple, Export, Gift, Globe, PlusSquare, X,
} from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import { canPromptInstall, onInstallChange, promptInstall, type Platform } from '../device.ts';
import { rich, t } from './text.tsx';

const c = copy.install;
const w = copy.drawings;

const SITE = location.host;

/** Small drawn screens showing which button to tap; `hot` marks it with a pulsing ring. */
function Dev({ children, desk = false, page = true }: { children: ReactNode; desk?: boolean; page?: boolean }) {
  return (
    <span className={`dev${desk ? ' desk' : ''}`} aria-hidden="true">
      {page && <span className="pg"><i /><i /><i className="s" /><i /></span>}
      {children}
    </span>
  );
}

const IosShare = () => <Dev><span className="tb"><CaretLeft weight="bold" /><CaretRight weight="bold" /><b className="hot"><Export weight="bold" /></b><BookOpen weight="bold" /><Copy weight="bold" /></span></Dev>;
const IosAdd = () => <Dev><span className="scrimmy" /><span className="ss"><span className="row"><Copy />{w.copy}</span><span className="row"><BookOpen />{w.addBookmark}</span><span className="row hot"><PlusSquare />{w.addToHomeScreen}</span></span></Dev>;
const IosConfirm = () => <Dev page={false}><span className="hdr"><span>{w.cancel}</span><b className="hot">{w.add}</b></span><span className="appicon"><Gift weight="fill" /></span><span className="cap">{w.appName}</span></Dev>;
const AndroidDialog = () => <Dev><span className="scrimmy" /><span className="dlg"><b>{w.installApp}</b><span>{w.appName}</span><span className="btns"><span>{w.cancel}</span><b className="hot">{w.install}</b></span></span></Dev>;
const DeskInstall = () => <Dev desk><span className="ihdr"><span className="url">{SITE}</span><b className="hot"><DownloadSimple weight="bold" /></b></span></Dev>;
const InAppMenu = ({ ios }: { ios: boolean }) => <Dev><span className="ihdr"><X weight="bold" /><span className="url">{SITE}</span><b className="hot">{ios ? <DotsThree weight="bold" /> : <DotsThreeVertical weight="bold" />}</b></span></Dev>;
const InAppOpen = ({ ios }: { ios: boolean }) => <Dev><span className="ihdr"><X weight="bold" /><span className="url">{SITE}</span>{ios ? <DotsThree weight="bold" /> : <DotsThreeVertical weight="bold" />}</span><span className="menu"><span>{w.copyLink}</span><b className="hot">{t(w.openIn, { browser: ios ? 'Safari' : 'Chrome' })}</b></span></Dev>;

export const Step = ({ n, art, children }: { n: number; art?: ReactNode; children: ReactNode }) => (
  <div className="istep"><span className="n">{n}</span><span className="txt">{children}</span>{art}</div>
);

export function useCanInstall() {
  const [can, setCan] = useState(canPromptInstall());
  useEffect(() => { const off = onInstallChange(() => setCan(canPromptInstall())); return () => { off(); }; }, []);
  return can;
}

/** "First, open this in Safari/Chrome": for links opened inside Gmail, Facebook and the like. */
export function OpenInBrowser({ platform }: { platform: Platform }) {
  const ios = platform === 'ios';
  const browser = ios ? 'Safari' : 'Chrome';
  return (
    <div className="card">
      <h3><ArrowSquareOut aria-hidden /> {t(c.openInTitle, { browser })}</h3>
      <p>{c.openInText}</p>
      <div className="isteps" style={{ margin: 0 }}>
        <Step n={1} art={<InAppMenu ios={ios} />}>{rich(c.tapDots)}</Step>
        <Step n={2} art={<InAppOpen ios={ios} />}>{rich(c.tapOpenIn, { browser })}<small>{c.wordingDiffers}</small></Step>
      </div>
    </div>
  );
}

/** Getting the Android app: the APK from this site. Its icon opens the wish list, and it adds Add to wish list to Share. */
export function AndroidAppSteps() {
  const apk = `${import.meta.env.BASE_URL}downloads/wish-list-helper.apk`;
  return (
    <>
      <div className="isteps">
        <Step n={1}>{rich(c.appDownload, {}, { apk: label => <a href={apk} download>{label}</a> })}</Step>
        <Step n={2} art={<AndroidDialog />}>{rich(c.appInstall)}</Step>
      </div>
      <p className="hint">{rich(c.appShare)}</p>
    </>
  );
}

/** Install steps for one kind of device, with drawn pictures of the buttons. */
export function InstallSteps({ platform, onInstalled }: { platform: Platform; onInstalled?: () => void }) {
  const can = useCanInstall();
  if (platform === 'ios') return (
    <div className="isteps">
      <Step n={1} art={<IosShare />}>{rich(c.iosShare)}<small>{c.iosShareHint}</small></Step>
      <Step n={2} art={<IosAdd />}>{rich(c.iosAdd)}</Step>
      <Step n={3} art={<IosConfirm />}>{rich(c.iosConfirm)}<small>{c.iosConfirmHint}</small></Step>
    </div>
  );
  const install = async () => { if (await promptInstall()) onInstalled?.(); };
  return (
    <>
      <div className="isteps">
        {platform === 'android'
          ? <><Step n={1}>{rich(c.androidTap)}</Step><Step n={2} art={<AndroidDialog />}>{rich(c.androidAgain)}</Step></>
          : <Step n={1} art={<DeskInstall />}>{rich(c.deskInstall)}</Step>}
      </div>
      {can
        ? <button className="btn primary" onClick={install}><DownloadSimple weight="bold" aria-hidden /> {c.install}</button>
        : <div className="note"><span>{platform === 'android'
          ? rich(c.noButtonAndroid)
          : c.noButtonDesktop}</span></div>}
    </>
  );
}

/** Chrome and Edge can load the gift button today; other desktop browsers can't yet. */
const extensionBrowser = (ua = navigator.userAgent) => /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) && !/OPR\//.test(ua) ? 'Chrome' : null;

/**
 * Setting up on a computer, on the help page: the browser button (the extension) first, because
 * it adds things from any shop without leaving the page and its side panel holds the whole
 * wish list; a tab or an installed window under Other ways.
 */
export function DesktopSetup({ onInstalled }: { onInstalled?: () => void }) {
  const can = useCanInstall();
  const browser = extensionBrowser();
  const base = import.meta.env.BASE_URL;
  const install = async () => { if (await promptInstall()) onInstalled?.(); };
  const d = copy.desktop;
  return (
    <div className="desk-setup">
      <div className="card recommended">
        <span className="badge">{d.recommended}</span>
        <h3><Gift weight="duotone" aria-hidden /> {d.buttonTitle}</h3>
        <p>{d.buttonText}</p>
        {browser ? (
          <ol className="steps-list">
            <li>{rich(d.download, {}, { zip: label => <a href={`${base}downloads/wish-list-extension.zip`} download>{label}</a> })}</li>
            <li>{rich(d.openExtensions, { page: browser === 'Edge' ? 'edge://extensions' : 'chrome://extensions' })}</li>
            <li>{rich(d.loadUnpacked)}</li>
          </ol>
        ) : (
          <p className="hint" style={{ margin: 0 }}>{rich(d.noButton)}</p>
        )}
      </div>

      <details className="other-ways">
      <summary>{d.otherWays}</summary>
      <div className="card plain">
        <h3><Globe aria-hidden /> {d.tabTitle}</h3>
        <p>{d.tabText}</p>
      </div>

      <div className="card plain">
        <h3><AppWindow aria-hidden /> {d.windowTitle}</h3>
        <p>{d.windowText}</p>
        {can
          ? <button className="btn ghost" onClick={install}><DownloadSimple aria-hidden /> {d.installApp}</button>
          : !browser && <p className="hint" style={{ margin: 0 }}>{d.cantInstall}</p>}
      </div>
      </details>
    </div>
  );
}
