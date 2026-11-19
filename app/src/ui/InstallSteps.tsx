import { useEffect, useState, type ReactNode } from 'react';
import {
  AppWindow, ArrowSquareOut, BookOpen, CaretLeft, CaretRight, Copy, DotsThree, DotsThreeVertical, DownloadSimple, Export, Gift, Globe, PlusSquare, X,
} from '@phosphor-icons/react';
import { canPromptInstall, onInstallChange, promptInstall, type Platform } from '../device.ts';

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
const IosAdd = () => <Dev><span className="scrimmy" /><span className="ss"><span className="row"><Copy />Copy</span><span className="row"><BookOpen />Add Bookmark</span><span className="row hot"><PlusSquare />Add to Home Screen</span></span></Dev>;
const IosConfirm = () => <Dev page={false}><span className="hdr"><span>Cancel</span><b className="hot">Add</b></span><span className="appicon"><Gift weight="fill" /></span><span className="cap">Wish lists</span></Dev>;
const AndroidDialog = () => <Dev><span className="scrimmy" /><span className="dlg"><b>Install app?</b><span>Wish lists</span><span className="btns"><span>Cancel</span><b className="hot">Install</b></span></span></Dev>;
const DeskInstall = () => <Dev desk><span className="ihdr"><span className="url">{SITE}</span><b className="hot"><DownloadSimple weight="bold" /></b></span></Dev>;
const InAppMenu = ({ ios }: { ios: boolean }) => <Dev><span className="ihdr"><X weight="bold" /><span className="url">{SITE}</span><b className="hot">{ios ? <DotsThree weight="bold" /> : <DotsThreeVertical weight="bold" />}</b></span></Dev>;
const InAppOpen = ({ ios }: { ios: boolean }) => <Dev><span className="ihdr"><X weight="bold" /><span className="url">{SITE}</span>{ios ? <DotsThree weight="bold" /> : <DotsThreeVertical weight="bold" />}</span><span className="menu"><span>Copy link</span><b className="hot">Open in {ios ? 'Safari' : 'Chrome'}</b></span></Dev>;

const Step = ({ n, art, children }: { n: number; art?: ReactNode; children: ReactNode }) => (
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
      <h3><ArrowSquareOut aria-hidden /> First, open this in {browser}</h3>
      <p>This little browser inside another app can't keep the app. Two taps fix it:</p>
      <div className="isteps" style={{ margin: 0 }}>
        <Step n={1} art={<InAppMenu ios={ios} />}>Tap the <b>three dots</b> at the top</Step>
        <Step n={2} art={<InAppOpen ios={ios} />}>Tap <b>Open in {browser}</b><small>The wording differs a little between apps</small></Step>
      </div>
    </div>
  );
}

/** Install steps for one kind of device, with drawn pictures of the buttons. */
export function InstallSteps({ platform, onInstalled }: { platform: Platform; onInstalled?: () => void }) {
  const can = useCanInstall();
  if (platform === 'ios') return (
    <div className="isteps">
      <Step n={1} art={<IosShare />}>Tap the <b>Share</b> button<small>The square with an arrow, at the bottom of Safari (top right on iPad)</small></Step>
      <Step n={2} art={<IosAdd />}>Scroll down and tap <b>Add to Home Screen</b></Step>
      <Step n={3} art={<IosConfirm />}>Tap <b>Add</b>, top right<small>Then open it from your Home Screen</small></Step>
    </div>
  );
  const install = async () => { if (await promptInstall()) onInstalled?.(); };
  return (
    <>
      <div className="isteps">
        {platform === 'android'
          ? <><Step n={1}>Tap <b>Install</b> below</Step><Step n={2} art={<AndroidDialog />}>Tap <b>Install</b> again in the box that pops up</Step></>
          : <Step n={1} art={<DeskInstall />}>Click <b>Install</b> below, or the install icon in the address bar</Step>}
      </div>
      {can
        ? <button className="btn primary" onClick={install}><DownloadSimple weight="bold" aria-hidden /> Install</button>
        : <div className="note"><span>{platform === 'android'
          ? <>No Install button? Open the browser's menu (the three dots) and choose <b>Install app</b> or <b>Add to Home screen</b>.</>
          : <>No Install button? This browser can't install apps (Firefox and Safari on a computer can't). Bookmark this page instead, or open it in Chrome or Edge.</>}</span></div>}
    </>
  );
}

/** Chrome and Edge can load the gift button today; other desktop browsers can't yet. */
const extensionBrowser = (ua = navigator.userAgent) => /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) && !/OPR\//.test(ua) ? 'Chrome' : null;

/**
 * Setting up on a computer: three ways to use it, any or all. Nothing has to be installed;
 * the browser button (the extension) is recommended because it adds things from any shop
 * without leaving the page, and its side panel holds the whole wish list.
 */
export function DesktopSetup({ onInstalled }: { onInstalled?: () => void }) {
  const can = useCanInstall();
  const browser = extensionBrowser();
  const base = import.meta.env.BASE_URL;
  const install = async () => { if (await promptInstall()) onInstalled?.(); };
  return (
    <div className="desk-setup">
      <p className="hint" style={{ margin: '0 4px', textAlign: 'center' }}>Use it whichever way suits you, any or all. It's the same wish list each way.</p>

      <div className="card recommended">
        <span className="badge">Recommended</span>
        <h3><Gift weight="duotone" aria-hidden /> As a button in your browser</h3>
        <p>On any shop's page, click the gift in the toolbar: the name, photo, price, size and color fill themselves in, and it's added right there. Choose who it's for: you, a child whose list you keep, or a secret idea for someone. The button also opens your whole wish list in the browser's side panel, next to whatever you're looking at, and imports Amazon lists.</p>
        {browser ? (
          <ol className="steps-list">
            <li><a href={`${base}downloads/wish-list-extension.zip`} download>Download the gift button</a> and unzip it.</li>
            <li>Open <b>{browser === 'Edge' ? 'edge://extensions' : 'chrome://extensions'}</b> and switch on <b>Developer mode</b>.</li>
            <li>Click <b>Load unpacked</b> and choose the unzipped folder. Then pin the gift to the toolbar.</li>
          </ol>
        ) : (
          <p className="hint" style={{ margin: 0 }}>The gift button works in <b>Chrome</b> and <b>Edge</b> for now. In this browser, use the wish list in a tab, and <b>Paste a link</b> to add things.</p>
        )}
        <p className="hint" style={{ margin: '8px 0 0' }}>Once it's in, you can do everything from the button, and close this tab.</p>
      </div>

      <div className="card plain">
        <h3><Globe aria-hidden /> In a browser tab</h3>
        <p>Nothing to install: it works right here. Bookmark this page so it's easy to come back to.</p>
      </div>

      <div className="card plain">
        <h3><AppWindow aria-hidden /> As its own window</h3>
        <p>Opens like an app, with an icon in your Start menu or Dock.</p>
        {can
          ? <button className="btn ghost" onClick={install}><DownloadSimple aria-hidden /> Install as an app</button>
          : <p className="hint" style={{ margin: 0 }}>{browser ? 'Already installed, or use the install icon at the right of the address bar.' : 'This browser can’t do this. Chrome and Edge can.'}</p>}
      </div>
    </div>
  );
}
