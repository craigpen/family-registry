import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowSquareOut, BookOpen, CaretLeft, CaretRight, Copy, DotsThree, DotsThreeVertical, DownloadSimple, Export, Gift, PlusSquare, X,
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
