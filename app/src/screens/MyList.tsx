import { CaretDown, Confetti, EyeSlash, GearSix, Gift, Plus } from '@phosphor-icons/react';
import type { ItemState } from '@family-registry/core';
import type { Family } from '../family.ts';
import { ItemCard } from '../ui/ItemCard.tsx';
import { SyncNote } from '../ui/SyncNote.tsx';
import { firstName } from '../ui/bits.tsx';
import { Nav } from './FamilyHome.tsx';

export function MyList({ fam, onAdd, onOpen, onSettings, onFamily }: {
  fam: Family; onAdd: () => void; onOpen: (it: ItemState) => void; onSettings: () => void; onFamily: () => void;
}) {
  const items = fam.itemsOf(fam.me.pubkey);
  const wishes = items.filter(i => !i.content.gotAt)
    .sort((a, b) => Number(b.content.reallyWant) - Number(a.content.reallyWant) || b.updatedAt - a.updatedAt);
  const received = items.filter(i => i.content.gotAt).sort((a, b) => b.content.gotAt! - a.content.gotAt!);

  return (
    <>
      <section className="screen">
        <div className="top">
          <div className="grow"><div className="sub">Hi, {firstName(fam.self.name)}</div><h1>My list</h1></div>
          <button className="iconbtn" onClick={onSettings} aria-label="Settings"><GearSix weight="duotone" /></button>
        </div>
        <SyncNote />
        <div className="note"><EyeSlash aria-hidden /><span>You'll never see who's getting what. That's the fun part.</span></div>

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
          <details className="received">
            <summary className="section-title"><span><Confetti aria-hidden />Received</span><span>{received.length} <CaretDown weight="bold" className="caret" aria-hidden /></span></summary>
            <div className="items">{received.map(i => <ItemCard key={i.id} item={i} onOpen={() => onOpen(i)} />)}</div>
          </details>
        )}
      </section>
      <Nav current="mine" onFamily={onFamily} onMine={() => {}} onAdd={onAdd} />
    </>
  );
}
