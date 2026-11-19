import { ArrowLeft, Plus } from '@phosphor-icons/react';
import type { ItemState } from '@family-registry/core';
import type { Family } from '../family.ts';
import { Avatar, daysUntil, formatBirthday } from '../ui/bits.tsx';
import { ItemCard } from '../ui/ItemCard.tsx';
import { Nav } from './FamilyHome.tsx';

/** One person's list. Claiming ("I'll get this") arrives in milestone 3. */
export function PersonList({ fam, pubkey, onBack, onOpen, onAdd, onMine }: {
  fam: Family; pubkey: string; onBack: () => void; onOpen: (it: ItemState) => void; onAdd: (owner?: string) => void; onMine: () => void;
}) {
  const p = fam.people.get(pubkey);
  if (!p) return null;
  const items = fam.itemsOf(pubkey).filter(i => !i.content.gotAt)
    .sort((a, b) => Number(b.content.reallyWant) - Number(a.content.reallyWant) || b.updatedAt - a.updatedAt);
  const days = daysUntil(p.birthday);
  const helper = p.helpers.includes(fam.me.pubkey);

  return (
    <>
      <section className="screen person">
        <button className="iconbtn back" onClick={onBack} aria-label="Back"><ArrowLeft weight="bold" /></button>
        <div className="phead">
          <Avatar person={p} size="lg" />
          <h1>{p.name}</h1>
          {p.birthday && <div className="meta">Birthday {formatBirthday(p.birthday)}{days !== undefined && days <= 60 && <> · <b style={{ color: 'var(--gold)' }}>{days === 0 ? 'today!' : `in ${days} days`}</b></>}</div>}
        </div>
        {items.length === 0
          ? <div className="empty"><p>{p.name} hasn't added any wishes yet.</p></div>
          : <>
            <div className="section-title"><span>{p.name}'s wishes</span><span>{items.length}</span></div>
            <div className="items">{items.map(i => <ItemCard key={i.id} item={i} onOpen={() => onOpen(i)} />)}</div>
          </>}
        {helper && <button className="btn ghost" style={{ marginTop: 18 }} onClick={() => onAdd(pubkey)}><Plus weight="bold" aria-hidden /> Add to {p.name}'s list</button>}
      </section>
      <Nav current="none" onFamily={onBack} onMine={onMine} onAdd={() => onAdd()} />
    </>
  );
}
