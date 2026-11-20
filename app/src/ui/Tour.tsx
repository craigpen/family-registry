import { useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CalendarCheck, Check, EyeSlash, Gift, HandHeart, Plus, User } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { Avatar } from './bits.tsx';
import { rich } from './text.tsx';

const c = copy.tour;

/** A small drawn wish card, made of the app's own shapes. */
const Wish = ({ title, children, tone = '' }: { title: string; children?: ReactNode; tone?: string }) => (
  <span className={`tw-card ${tone}`}>
    <span className="tw-pic"><Gift weight="duotone" /></span>
    <span className="tw-lines"><b>{title}</b><i /></span>
    {children}
  </span>
);

/**
 * Once, after setup (finished or not): four quick pictures of how it works, drawn from the
 * app's own pieces (faces, wish cards, the I'll get this button). Skip is always there.
 */
export function Tour({ fam, onDone }: { fam: Family; onDone: (next: 'add' | 'family') => void }) {
  const [i, setI] = useState(0);
  const faces = fam.others.slice(0, 3);
  const slides: { title: string; text: string; art: ReactNode }[] = [
    {
      title: c.yourListTitle, text: c.yourListText,
      art: <span className="tw-stack"><Wish title={c.sampleOne} /><Wish title={c.sampleTwo} /><span className="tw-fab"><Plus weight="bold" /></span></span>,
    },
    {
      title: c.theirListsTitle, text: c.theirListsText,
      art: <span className="tw-faces">
        {faces.map((p, n) => <span key={p.pubkey} className={n === 0 ? 'tw-hot' : ''}><Avatar person={p} size="lg" /></span>)}
        {/* A new family has few faces yet: plain ones fill the picture. */}
        {[0, 1, 2].slice(faces.length).map(n => <span key={n} className={n === 0 ? 'tw-hot' : ''}><span className="avatar lg tw-ghost"><User weight="fill" /></span></span>)}
      </span>,
    },
    {
      title: c.getThisTitle, text: c.getThisText,
      art: <span className="tw-stack"><Wish title={c.sampleThree}><span className="tw-pill"><HandHeart weight="fill" /> {copy.item.claim}</span></Wish>
        <span className="tw-secret"><EyeSlash weight="bold" /> {c.secretBadge}</span></span>,
    },
    {
      title: c.receivedTitle, text: c.receivedText,
      art: <span className="tw-stack"><span className="tw-day"><CalendarCheck weight="duotone" /></span><Wish title={c.sampleThree} tone="got"><span className="tw-check"><Check weight="bold" /></span></Wish></span>,
    },
  ];
  const s = slides[i]!;
  const last = i === slides.length - 1;
  return (
    <section className="screen welcome tour" aria-roledescription="carousel">
      <button className="link-btn tour-skip" onClick={() => onDone('family')}>{c.skip}</button>
      <div className="tour-art" aria-hidden="true">{s.art}</div>
      <h1>{s.title}</h1>
      <p>{rich(s.text)}</p>
      <div className="tour-dots" aria-label={`${i + 1} / ${slides.length}`}>
        {slides.map((_, n) => <span key={n} className={n === i ? 'on' : ''} />)}
      </div>
      {last ? <>
        <button className="btn primary" onClick={() => onDone('add')}><Plus weight="bold" aria-hidden /> {copy.welcome.addFirst}</button>
        <button className="btn ghost" onClick={() => onDone('family')}>{copy.welcome.seeFamily}</button>
      </> : (
        <div className="tour-nav">
          {i > 0 && <button className="btn ghost" onClick={() => setI(i - 1)} aria-label={copy.common.back}><ArrowLeft weight="bold" aria-hidden /></button>}
          <button className="btn primary" onClick={() => setI(i + 1)}>{c.next} <ArrowRight weight="bold" aria-hidden /></button>
        </div>
      )}
    </section>
  );
}
