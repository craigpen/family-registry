import { useState } from 'react';
import { Cake, GearSix, Gift, Plus, Trash, UsersThree } from '@phosphor-icons/react';
import type { ItemState } from '@family-registry/core';
import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { isNew, type Seen } from '../seen.ts';
import { Avatar, daysUntil, firstName, turning } from '../ui/bits.tsx';
import { ClockNote } from '../ui/ClockNote.tsx';
import { SyncNote } from '../ui/SyncNote.tsx';
import { plural, rich, t } from '../ui/text.tsx';

const c = copy.home;

/** Items I was getting that their owner has since removed: worth telling me. */
export function removedWhileClaimed(fam: Family, dismissed: string[] = []): ItemState[] {
  return fam.removed.filter(it => !dismissed.includes(it.id) && [it.claims.holder, ...it.claims.others].some(x => x?.author === fam.me.pubkey));
}

/** Faces, not menus: the home screen is the family. Tap a face to see their list. */
export function FamilyHome({ fam, seen, dismissed, onPerson, onPeople, onSettings, onAdd, onMine, onDismiss }: {
  fam: Family; seen: Seen; dismissed: string[]; onPerson: (pk: string) => void; onPeople: () => void; onSettings: () => void;
  onAdd: () => void; onMine: () => void; onDismiss: (it: ItemState) => void;
}) {
  const [group, setGroup] = useState<string | null>(null);
  const shown = fam.others.filter(p => !group || p.groups.includes(group));

  return (
    <>
      <section className="screen">
        <div className="top">
          <div className="grow"><h1>{t(c.hi, { name: firstName(fam.self.name) })}</h1></div>
          {fam.isOrganizer && <button className="iconbtn" onClick={onPeople} aria-label={c.people}><UsersThree weight="duotone" /></button>}
          <button className="iconbtn" onClick={onSettings} aria-label={copy.common.settings}><GearSix weight="duotone" /></button>
        </div>
        <SyncNote />
        <ClockNote fam={fam} />
        {removedWhileClaimed(fam, dismissed).map(it => (
          <div className="notice" key={it.id} role="status">
            <Trash weight="duotone" aria-hidden />
            <span>{rich(c.removedWhileGetting, { name: firstName(fam.people.get(it.owner)?.name ?? copy.common.someone), title: it.content.title })}</span>
            <button onClick={() => onDismiss(it)}>{copy.common.ok}</button>
          </div>
        ))}
        {fam.groups.length > 1 && (
          <div className="chips" role="group" aria-label={c.groupsLabel}>
            <button className="chip" aria-pressed={!group} onClick={() => setGroup(null)}>{c.everyone}</button>
            {fam.groups.map(g => <button key={g.tag} className="chip" aria-pressed={group === g.tag} onClick={() => setGroup(g.tag)}>{g.name}</button>)}
          </div>
        )}
        {shown.length === 0 ? (
          <div className="empty">
            <UsersThree weight="duotone" aria-hidden />
            <h2>{fam.isOrganizer ? c.emptyOrganizerTitle : c.emptyTitle}</h2>
            <p>{fam.isOrganizer ? c.emptyOrganizerText : c.emptyText}</p>
            {fam.isOrganizer && <button className="btn primary" onClick={onPeople}><Plus weight="bold" aria-hidden /> {c.addPeople}</button>}
          </div>
        ) : (
          <div className="faces">
            {shown.map(p => {
              const items = fam.itemsOf(p.pubkey).filter(i => !i.content.gotAt && !i.given.length);
              const n = items.filter(i => !i.content.surprise).length;
              const fresh = items.some(i => isNew(seen, p.pubkey, i, fam.me.pubkey));
              const days = daysUntil(p.birthday);
              return (
                <button key={p.pubkey} className="face" onClick={() => onPerson(p.pubkey)}>
                  {fresh && <span className="dot" title={copy.common.newDot} />}
                  <Avatar person={p} />
                  <div className="name">{p.name}</div>
                  <div className="meta">{plural(c.wishes, n)}</div>
                  {days !== undefined && days <= 60 && <span className="soon"><Cake weight="fill" aria-hidden /> {days === 0 ? c.birthdayToday : plural(c.birthdayIn, days)}{turning(p.birthday, p.birthYear) !== undefined && <> · {t(c.turns, { n: turning(p.birthday, p.birthYear)! })}</>}</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>
      <Nav current="family" onFamily={() => {}} onMine={onMine} onAdd={onAdd} />
    </>
  );
}

export function Nav({ current, onFamily, onMine, onAdd }: { current: 'family' | 'mine' | 'none'; onFamily: () => void; onMine: () => void; onAdd: () => void }) {
  const n = copy.nav;
  return (
    <nav className="nav" aria-label={n.label}>
      <button aria-current={current === 'family' ? 'page' : undefined} onClick={onFamily}><UsersThree weight={current === 'family' ? 'fill' : 'regular'} aria-hidden />{n.family}</button>
      <button className="add" onClick={onAdd} aria-label={n.add}><Plus weight="bold" /><span className="nav-label" aria-hidden>{n.add}</span></button>
      <button aria-current={current === 'mine' ? 'page' : undefined} onClick={onMine}><Gift weight={current === 'mine' ? 'fill' : 'regular'} aria-hidden />{n.mine}</button>
    </nav>
  );
}
