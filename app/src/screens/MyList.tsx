import { CaretDown, Confetti, EyeSlash, GearSix, Gift, Plus } from '@phosphor-icons/react';
import type { ItemState } from '@family-registry/core';
import type { Family } from '../family.ts';
import { ItemCard } from '../ui/ItemCard.tsx';
import { SyncNote } from '../ui/SyncNote.tsx';
import { ShortenNote } from '../ui/ShortenNote.tsx';
import { firstName, occasionLabel } from '../ui/bits.tsx';
import { Nav } from './FamilyHome.tsx';

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
    ? `from ${[...new Set(i.given.map(g => firstName(fam.people.get(g.by)?.name ?? 'family')))].join(' and ')} · ${occasionLabel(i.given[0]!.occasion)}`
    : 'You marked this as received';

  return (
    <>
      <section className="screen">
        <div className="top">
          <div className="grow"><div className="sub">Hi, {firstName(fam.self.name)}</div><h1>My list</h1></div>
          <button className="iconbtn" onClick={onSettings} aria-label="Settings"><GearSix weight="duotone" /></button>
        </div>
        <SyncNote />
        <div className="note"><EyeSlash aria-hidden /><span>You'll never see who's getting what. That's the fun part.</span></div>
        <ShortenNote items={wishes} />

        {wishes.length === 0 ? (
          <div className="empty">
            <Gift weight="duotone" aria-hidden />
            <h2>What would you love?</h2>
            <p>Add a few things: a photo, a link, or just a few words.</p>
            <button className="btn primary" onClick={onAdd}><Plus weight="bold" aria-hidden /> Add your first wish</button>
          </div>
        ) : (
          <div className="items">{wishes.map(i => <ItemCard key={i.id} item={i} onOpen={() => onOpen(i)} />)}</div>
        )}

        {received.length > 0 && (
          <details className="received" open={open}>
            <summary className="section-title"><span><Confetti aria-hidden />Received</span><span>{received.length} <CaretDown weight="bold" className="caret" aria-hidden /></span></summary>
            <div className="items">{received.map(i => <ItemCard key={i.id} item={i} onOpen={() => onOpen(i)} meta={fromLine(i)} />)}</div>
          </details>
        )}
      </section>
      <Nav current="mine" onFamily={onFamily} onMine={() => {}} onAdd={onAdd} />
    </>
  );
}
