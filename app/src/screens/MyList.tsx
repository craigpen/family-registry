import { useLiveQuery } from 'dexie-react-hooks';
import { CaretDown, Confetti, EyeSlash, GearSix, Gift, Plus } from '@phosphor-icons/react';
import { db, type Identity, type LocalItem } from '../db.ts';
import { ItemCard } from '../ui/ItemCard.tsx';

export function MyList({ me, onAdd, onOpen, onSettings }: {
  me: Identity; onAdd: () => void; onOpen: (it: LocalItem) => void; onSettings: () => void;
}) {
  const items = useLiveQuery(() => db.items.orderBy('updatedAt').reverse().filter(i => !i.deleted).toArray(), [], undefined);
  if (!items) return null;
  const wishes = items.filter(i => !i.receivedAt).sort((a, b) => Number(b.reallyWant) - Number(a.reallyWant) || b.createdAt - a.createdAt);
  const received = items.filter(i => i.receivedAt).sort((a, b) => b.receivedAt! - a.receivedAt!);

  return (
    <>
      <section className="screen">
        <div className="top">
          <div className="grow"><div className="sub">Hi, {me.name}</div><h1>My list</h1></div>
          <button className="iconbtn" onClick={onSettings} aria-label="Settings"><GearSix weight="duotone" /></button>
        </div>
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
      <nav className="nav" aria-label="Main">
        <button aria-current="page"><Gift weight="fill" aria-hidden />My list</button>
        <button className="add" onClick={onAdd} aria-label="Add a wish"><Plus weight="bold" /></button>
        <button onClick={onSettings}><GearSix aria-hidden />Settings</button>
      </nav>
    </>
  );
}
