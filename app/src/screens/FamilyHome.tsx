import { useState } from 'react';
import { Cake, GearSix, Gift, Plus, UsersThree } from '@phosphor-icons/react';
import type { Family } from '../family.ts';
import { Avatar, daysUntil, firstName } from '../ui/bits.tsx';
import { SyncNote } from '../ui/SyncNote.tsx';

/** Faces, not menus: the home screen is the family. Tap a face to see their list. */
export function FamilyHome({ fam, onPerson, onPeople, onSettings, onAdd, onMine }: {
  fam: Family; onPerson: (pk: string) => void; onPeople: () => void; onSettings: () => void; onAdd: () => void; onMine: () => void;
}) {
  const [group, setGroup] = useState<string | null>(null);
  const shown = fam.others.filter(p => !group || p.groups.includes(group));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <section className="screen">
        <div className="top">
          <div className="grow"><div className="sub">{greeting}</div><h1>Hi, {firstName(fam.self.name)}</h1></div>
          {fam.isOrganizer && <button className="iconbtn" onClick={onPeople} aria-label="People"><UsersThree weight="duotone" /></button>}
          <button className="iconbtn" onClick={onSettings} aria-label="Settings"><GearSix weight="duotone" /></button>
        </div>
        <SyncNote />
        {fam.groups.length > 1 && (
          <div className="chips" role="group" aria-label="Show">
            <button className="chip" aria-pressed={!group} onClick={() => setGroup(null)}>Everyone</button>
            {fam.groups.map(g => <button key={g.tag} className="chip" aria-pressed={group === g.tag} onClick={() => setGroup(g.tag)}>{g.name}</button>)}
          </div>
        )}
        {shown.length === 0 ? (
          <div className="empty">
            <UsersThree weight="duotone" aria-hidden />
            <h2>{fam.isOrganizer ? 'Add your family' : 'Nobody else yet'}</h2>
            <p>{fam.isOrganizer ? 'Add each person, then send them their own link.' : 'Faces appear here as your family joins.'}</p>
            {fam.isOrganizer && <button className="btn primary" onClick={onPeople}><Plus weight="bold" aria-hidden /> Add people</button>}
          </div>
        ) : (
          <div className="faces">
            {shown.map(p => {
              const n = fam.itemsOf(p.pubkey).filter(i => !i.content.gotAt).length;
              const days = daysUntil(p.birthday);
              return (
                <button key={p.pubkey} className="face" onClick={() => onPerson(p.pubkey)}>
                  <Avatar person={p} />
                  <div className="name">{p.name}</div>
                  <div className="meta">{n === 0 ? 'No wishes yet' : `${n} ${n === 1 ? 'wish' : 'wishes'}`}</div>
                  {days !== undefined && days <= 60 && <span className="soon"><Cake weight="fill" aria-hidden /> {days === 0 ? 'Today!' : `in ${days} ${days === 1 ? 'day' : 'days'}`}</span>}
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
  return (
    <nav className="nav" aria-label="Main">
      <button aria-current={current === 'family' ? 'page' : undefined} onClick={onFamily}><UsersThree weight={current === 'family' ? 'fill' : 'regular'} aria-hidden />Family</button>
      <button className="add" onClick={onAdd} aria-label="Add a wish"><Plus weight="bold" /></button>
      <button aria-current={current === 'mine' ? 'page' : undefined} onClick={onMine}><Gift weight={current === 'mine' ? 'fill' : 'regular'} aria-hidden />My list</button>
    </nav>
  );
}
