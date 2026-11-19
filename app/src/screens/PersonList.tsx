import { useEffect, useRef } from 'react';
import { ArrowLeft, EyeSlash, Lightbulb, Plus } from '@phosphor-icons/react';
import type { ItemState } from '@family-registry/core';
import type { Family } from '../family.ts';
import { isNew, lastSeen, markSeen, type Seen } from '../seen.ts';
import { Avatar, daysUntil, firstName, formatBirthday } from '../ui/bits.tsx';
import { ItemCard } from '../ui/ItemCard.tsx';
import { Nav } from './FamilyHome.tsx';
import { ShortenNote } from '../ui/ShortenNote.tsx';

const order = (a: ItemState, b: ItemState) => Number(b.content.reallyWant) - Number(a.content.reallyWant) || b.updatedAt - a.updatedAt;

/** One person's list, with who's getting what, and secret ideas for them that they can't see. */
export function PersonList({ fam, pubkey, seen, onBack, onOpen, onAdd, onIdea, onMine }: {
  fam: Family; pubkey: string; seen: Seen; onBack: () => void; onOpen: (it: ItemState) => void;
  onAdd: (owner?: string) => void; onIdea: (recipient: string) => void; onMine: () => void;
}) {
  // Dots show what was new when the list was opened; leaving marks it all as seen.
  const since = useRef(lastSeen(seen, pubkey));
  useEffect(() => () => { void markSeen(pubkey); }, [pubkey]);

  const p = fam.people.get(pubkey);
  if (!p) return null;
  const all = fam.itemsOf(pubkey).filter(i => !i.content.gotAt && !i.given.length);
  const wishes = all.filter(i => !i.content.surprise).sort(order);
  const ideas = all.filter(i => i.content.surprise).sort(order);
  const days = daysUntil(p.birthday);
  const name = firstName(p.name);
  const helper = p.helpers.includes(fam.me.pubkey);
  const nameOf = (pk: string) => (pk === fam.me.pubkey ? 'You' : firstName(fam.people.get(pk)?.name ?? 'Someone'));
  const card = (i: ItemState) => (
    <ItemCard key={i.id} item={i} onOpen={() => onOpen(i)} viewer={fam.me.pubkey} nameOf={nameOf}
      isNew={isNew({ ...seen, at: { ...seen.at, [pubkey]: since.current } }, pubkey, i, fam.me.pubkey)} />
  );

  return (
    <>
      <section className="screen person">
        <button className="iconbtn back" onClick={onBack} aria-label="Back"><ArrowLeft weight="bold" /></button>
        <div className="phead">
          <Avatar person={p} size="lg" />
          <h1>{p.name}</h1>
          {p.birthday && <div className="meta">Birthday {formatBirthday(p.birthday)}{days !== undefined && days <= 60 && <> · <b style={{ color: 'var(--gold)' }}>{days === 0 ? 'today!' : `in ${days} days`}</b></>}</div>}
          {p.managed && <div className="meta">Kept by {p.helpers.map(nameOf).join(' and ') || 'the family'}</div>}
        </div>

        {/* Lists you can change: one you help keep, and the secret ideas (never the recipient's). */}
        <ShortenNote items={[...(helper ? wishes : []), ...ideas]} />
        {wishes.length === 0
          ? <div className="empty" style={{ paddingTop: 10 }}><p>{p.managed ? `Nothing on ${name}'s list yet.` : `${name} hasn't added any wishes yet.`}</p></div>
          : <>
            <div className="section-title"><span>{name}'s wishes</span><span>{wishes.length}</span></div>
            <div className="items">{wishes.map(card)}</div>
          </>}
        {helper && <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => onAdd(pubkey)}><Plus weight="bold" aria-hidden /> Add to {name}'s list</button>}

        {ideas.length > 0 && <>
          <div className="section-title"><span><EyeSlash aria-hidden />Secret ideas for {name}</span><span>{ideas.length}</span></div>
          <div className="note" style={{ marginBottom: 10 }}><span>Added by family. {name} can't see these.</span></div>
          <div className="items">{ideas.map(card)}</div>
        </>}
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => onIdea(pubkey)}><Lightbulb aria-hidden /> Add a secret idea for {name}</button>
      </section>
      <Nav current="none" onFamily={onBack} onMine={onMine} onAdd={() => onAdd()} />
    </>
  );
}
