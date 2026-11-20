import { CaretDown, Confetti, EyeSlash, GearSix, Gift, Plus } from '@phosphor-icons/react';
import type { ItemState } from '@family-registry/core';
import { copy } from '../copy.ts';
import { Tip } from '../ui/Tip.tsx';
import type { Family } from '../family.ts';
import { ItemCard } from '../ui/ItemCard.tsx';
import { ClockNote } from '../ui/ClockNote.tsx';
import { SyncNote } from '../ui/SyncNote.tsx';
import { ShortenNote } from '../ui/ShortenNote.tsx';
import { firstName, occasionLabel } from '../ui/bits.tsx';
import { t } from '../ui/text.tsx';
import { Nav } from './FamilyHome.tsx';

const c = copy.myList;

export function MyList({ fam, open, onAdd, onOpen, onSettings, onFamily }: {
  fam: Family; open?: boolean; onAdd: () => void; onOpen: (it: ItemState) => void; onSettings: () => void; onFamily: () => void;
}) {
  const items = fam.itemsOf(fam.me.pubkey);
  const done = (i: ItemState) => !!i.content.gotAt || i.given.length > 0;
  const when = (i: ItemState) => Math.max(i.content.gotAt ?? 0, ...i.given.map(g => g.at));
  const wishes = items.filter(i => !done(i))
    .sort((a, b) => Number(b.content.reallyWant) - Number(a.content.reallyWant) || b.updatedAt - a.updatedAt);
  const received = items.filter(done).sort((a, b) => when(b) - when(a));
  const fromLine = (i: ItemState) => i.given.length
    ? t(c.receivedFrom, {
      names: [...new Set(i.given.map(g => firstName(fam.people.get(g.by)?.name ?? c.receivedFallbackName)))].join(copy.common.and),
      occasion: occasionLabel(i.given[0]!.occasion),
    })
    : c.markedReceived;

  return (
    <>
      <section className="screen">
        <div className="top">
          <div className="grow"><div className="sub">{t(c.hi, { name: firstName(fam.self.name) })}</div><h1>{c.title}</h1></div>
          <button className="iconbtn" onClick={onSettings} aria-label={copy.common.settings}><GearSix weight="duotone" /></button>
        </div>
        <SyncNote />
        <ClockNote fam={fam} />
        <Tip id="myList.secretNote" icon={<EyeSlash aria-hidden />}>{c.secretNote}</Tip>
        <ShortenNote items={wishes} />

        {wishes.length === 0 ? (
          <div className="empty">
            <Gift weight="duotone" aria-hidden />
            <h2>{c.emptyTitle}</h2>
            <p>{c.emptyText}</p>
            <button className="btn primary" onClick={onAdd}><Plus weight="bold" aria-hidden /> {c.addFirst}</button>
          </div>
        ) : (
          <div className="items">{wishes.map(i => <ItemCard key={i.id} item={i} onOpen={() => onOpen(i)} />)}</div>
        )}

        {received.length > 0 && (
          <details className="received" open={open}>
            <summary className="section-title"><span><Confetti aria-hidden />{c.received}</span><span>{received.length} <CaretDown weight="bold" className="caret" aria-hidden /></span></summary>
            <div className="items">{received.map(i => <ItemCard key={i.id} item={i} onOpen={() => onOpen(i)} meta={fromLine(i)} />)}</div>
          </details>
        )}
      </section>
      <Nav current="mine" onFamily={onFamily} onMine={() => {}} onAdd={onAdd} />
    </>
  );
}
