import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, DownloadSimple, EyeSlash, PuzzlePiece } from '@phosphor-icons/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { copy } from '../copy.ts';
import { db } from '../db.ts';
import type { Family } from '../family.ts';
import { alreadyThere, importItems, listenForList, modeFor, suggestTarget, type ImportedList } from '../importing.ts';
import { Avatar, firstName } from '../ui/bits.tsx';
import { plural, rich, t } from '../ui/text.tsx';

const c = copy.importing;

/**
 * Importing a list. "Whose list is this?" first (a parent may keep one Amazon list per child),
 * then every item with a tick, then one button. PLAN.md "Importing an Amazon list".
 */
export function Import({ fam, onDone, onCancel }: { fam: Family; onDone: (target: string, n: number) => void; onCancel: () => void }) {
  const [list, setList] = useState<ImportedList | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [step, setStep] = useState<'who' | 'review'>('who');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<number | null>(null);
  const prefs = useLiveQuery(() => db.prefs.get('prefs'), []);

  useEffect(() => listenForList(l => setList(cur => cur ?? l)), []);
  useEffect(() => {
    if (list && target === null) setTarget(suggestTarget(fam, list, prefs?.importTargets?.[list.url]));
  }, [list, prefs, fam, target]);

  const dupes = useMemo(() => new Set(list && target ? list.items.map((it, i) => (alreadyThere(fam, target, it) ? i : -1)).filter(i => i >= 0) : []), [list, target, fam]);
  useEffect(() => {
    if (list && step === 'review') setPicked(new Set(list.items.map((_, i) => i).filter(i => !dupes.has(i))));
  }, [step, list, dupes]);

  if (!list) return (
    <section className="screen welcome">
      <div className="mark"><PuzzlePiece weight="duotone" aria-hidden /></div>
      <h1>{c.waitingTitle}</h1>
      <p>{rich(c.waiting)}</p>
      <button className="btn ghost" onClick={onCancel}>{copy.common.cancel}</button>
    </section>
  );

  const people = [fam.self, ...fam.others];
  const who = target ? fam.people.get(target) ?? fam.self : fam.self;
  const mode = target ? modeFor(fam, target) : 'mine';
  const name = firstName(who.name);
  const whose = target === fam.me.pubkey ? c.your : t(c.whose, { name });

  if (progress !== null) return (
    <section className="screen welcome" aria-busy="true"><div className="spinner" /><p>{t(c.adding, { n: progress, total: picked.size })}</p></section>
  );

  if (step === 'review') {
    const go = async () => {
      setProgress(0);
      const n = await importItems(fam, list, target!, list.items.filter((_, i) => picked.has(i)), setProgress);
      onDone(target!, n);
    };
    return (
      <section className="screen setup">
        <button className="iconbtn back" onClick={() => setStep('who')} aria-label={copy.common.back}><ArrowLeft weight="bold" /></button>
        <h1>{list.name}</h1>
        <div className="seen">{mode === 'ideas' ? t(c.asIdeas, { name }) : t(c.onto, { whose })}</div>
        <div className="items">
          {list.items.map((it, i) => {
            const on = picked.has(i);
            return (
              <button key={i} className="check" aria-pressed={on} onClick={() => setPicked(s => { const n = new Set(s); if (on) n.delete(i); else n.add(i); return n; })}>
                <span className="box">{on && <Check weight="bold" />}</span>
                {it.image && <img className="thumb" src={it.image} alt="" referrerPolicy="no-referrer" />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="t">{it.title}</span>
                  <span className="s">{[it.price, dupes.has(i) ? c.alreadyThere : '', it.highest ? c.highest : ''].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button className="btn primary" style={{ marginTop: 16, position: 'sticky', bottom: 16 }} disabled={!picked.size} onClick={go}>
          <DownloadSimple weight="bold" aria-hidden /> {plural(c.importN, picked.size)}
        </button>
      </section>
    );
  }

  return (
    <section className="screen setup">
      <button className="iconbtn back" onClick={onCancel} aria-label={copy.common.cancel}><ArrowLeft weight="bold" /></button>
      <h1>{c.whoseTitle}</h1>
      <div className="seen">{plural(c.summary, list.items.length, { name: list.name })}</div>
      <div className="faces">
        {people.map(p => (
          <button key={p.pubkey} className="face" aria-pressed={target === p.pubkey} onClick={() => setTarget(p.pubkey)}>
            <Avatar person={p} />
            <div className="name">{p.pubkey === fam.me.pubkey ? copy.common.me : p.name}</div>
          </button>
        ))}
      </div>
      <div className="note" style={{ marginTop: 16 }}>
        {mode === 'ideas' && <EyeSlash aria-hidden />}
        <span>{mode === 'mine' ? c.goesMine : mode === 'helper' ? t(c.goesHelper, { whose }) : t(c.goesIdeas, { name })}</span>
      </div>
      <button className="btn primary" onClick={() => setStep('review')}>{copy.common.next}</button>
    </section>
  );
}
