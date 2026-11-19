import { useEffect, useRef } from 'react';
import { ArrowLeft, EyeSlash, Lightbulb, Plus } from '@phosphor-icons/react';
import type { ItemState } from '@family-registry/core';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { isNew, lastSeen, markSeen, type Seen } from '../seen.ts';
import { Avatar, daysUntil, firstName, formatBirthday } from '../ui/bits.tsx';
import { ItemCard } from '../ui/ItemCard.tsx';
import { t } from '../ui/text.tsx';
import { Nav } from './FamilyHome.tsx';
import { ShortenNote } from '../ui/ShortenNote.tsx';

const c = copy.person;

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
  const nameOf = (pk: string) => (pk === fam.me.pubkey ? copy.common.you : firstName(fam.people.get(pk)?.name ?? copy.common.someone));
  const card = (i: ItemState) => (
    <ItemCard key={i.id} item={i} onOpen={() => onOpen(i)} viewer={fam.me.pubkey} nameOf={nameOf}
      isNew={isNew({ ...seen, at: { ...seen.at, [pubkey]: since.current } }, pubkey, i, fam.me.pubkey)} />
  );

  return (
    <>
      <section className="screen person">
        <button className="iconbtn back" onClick={onBack} aria-label={copy.common.back}><ArrowLeft weight="bold" /></button>
        <div className="phead">
          <Avatar person={p} size="lg" />
          <h1>{p.name}</h1>
          {p.birthday && <div className="meta">{t(c.birthday, { date: formatBirthday(p.birthday)! })}{days !== undefined && days <= 60 && <> · <b style={{ color: 'var(--gold)' }}>{days === 0 ? c.birthdayToday : t(c.birthdayIn, { n: days })}</b></>}</div>}
          {p.managed && <div className="meta">{t(c.keptBy, { names: p.helpers.map(nameOf).join(copy.common.and) || c.keptByNobody })}</div>}
        </div>

        {/* Lists you can change: one you help keep, and the secret ideas (never the recipient's). */}
        <ShortenNote items={[...(helper ? wishes : []), ...ideas]} />
        {wishes.length === 0
          ? <div className="empty" style={{ paddingTop: 10 }}><p>{t(p.managed ? c.emptyManaged : c.empty, { name })}</p></div>
          : <>
            <div className="section-title"><span>{t(c.wishes, { name })}</span><span>{wishes.length}</span></div>
            <div className="items">{wishes.map(card)}</div>
          </>}
        {helper && <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => onAdd(pubkey)}><Plus weight="bold" aria-hidden /> {t(c.addTo, { name })}</button>}

        {ideas.length > 0 && <>
          <div className="section-title"><span><EyeSlash aria-hidden />{t(c.ideasTitle, { name })}</span><span>{ideas.length}</span></div>
          <div className="note" style={{ marginBottom: 10 }}><span>{t(c.ideasNote, { name })}</span></div>
          <div className="items">{ideas.map(card)}</div>
        </>}
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => onIdea(pubkey)}><Lightbulb aria-hidden /> {t(c.addIdea, { name })}</button>
      </section>
      <Nav current="none" onFamily={onBack} onMine={onMine} onAdd={() => onAdd()} />
    </>
  );
}
