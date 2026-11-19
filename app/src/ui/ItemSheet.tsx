import { ArrowCounterClockwise, CaretRight, Confetti, LinkSimple, NotePencil, PencilSimple, Trash } from '@phosphor-icons/react';
import { siteName } from '@family-registry/core';
import type { LocalItem } from '../db.ts';
import { Photo, ReallyWant, whereFrom } from './ItemCard.tsx';
import { Sheet } from './Sheet.tsx';

export function ItemSheet({ item, onClose, onEdit, onRemove, onReceived }: {
  item?: LocalItem; onClose: () => void; onEdit: () => void; onRemove: () => void; onReceived: (got: boolean) => void;
}) {
  return (
    <Sheet open={!!item} onClose={onClose} heading={item && <>{item.title} {item.reallyWant && <ReallyWant />}</>}
      above={item && <Photo item={item} hero />}>
      {item ? <>
        <div className="kv">
          {[item.price, whereFrom(item)].filter(Boolean).join(' · ')}
          {item.reallyWant && <> · <b className="heart">You really want this</b></>}
        </div>
        {item.notes && <div className="note"><NotePencil aria-hidden /><span>{item.notes}</span></div>}
        {item.links.map(l => (
          <a key={l} className="link" href={l} target="_blank" rel="noopener noreferrer">
            <LinkSimple aria-hidden /><span>View at {siteName(l) ?? 'the shop'}</span><CaretRight weight="bold" aria-hidden />
          </a>
        ))}
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={onEdit}><PencilSimple aria-hidden /> Edit</button>
        {item.receivedAt
          ? <button className="btn ghost" onClick={() => onReceived(false)}><ArrowCounterClockwise aria-hidden /> Back on my list</button>
          : <button className="btn ghost" onClick={() => onReceived(true)}><Confetti aria-hidden /> I got it</button>}
        <button className="btn quiet" onClick={onRemove}><Trash aria-hidden /> Remove from my list</button>
      </> : null}
    </Sheet>
  );
}
