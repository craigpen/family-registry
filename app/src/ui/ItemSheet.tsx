import { ArrowCounterClockwise, CaretRight, Confetti, LinkSimple, NotePencil, PencilSimple, Trash } from '@phosphor-icons/react';
import { siteName, type ItemState } from '@family-registry/core';
import { Photo, ReallyWant, whereFrom } from './ItemCard.tsx';
import { Sheet } from './Sheet.tsx';

/** One item. Its owner (and their helpers) can edit it; everyone else just looks, for now. */
export function ItemSheet({ item, canEdit, ownerName, onClose, onEdit, onRemove, onGot }: {
  item?: ItemState; canEdit: boolean; ownerName?: string; onClose: () => void; onEdit: () => void; onRemove: () => void; onGot: (got: boolean) => void;
}) {
  const c = item?.content;
  return (
    <Sheet open={!!item} onClose={onClose} heading={c && <>{c.title} {c.reallyWant && <ReallyWant />}</>} above={item && <Photo item={item} hero />}>
      {item && c ? <>
        <div className="kv">
          {[c.price, whereFrom(item)].filter(Boolean).join(' · ')}
          {c.reallyWant && <> · <b className="heart">{ownerName ? `${ownerName} really wants this` : 'You really want this'}</b></>}
        </div>
        {c.notes && <div className="note"><NotePencil aria-hidden /><span>{c.notes}</span></div>}
        {c.links.map(l => (
          <a key={l} className="link" href={l} target="_blank" rel="noopener noreferrer">
            <LinkSimple aria-hidden /><span>View at {siteName(l) ?? 'the shop'}</span><CaretRight weight="bold" aria-hidden />
          </a>
        ))}
        {canEdit ? <>
          <button className="btn ghost" style={{ marginTop: 10 }} onClick={onEdit}><PencilSimple aria-hidden /> Edit</button>
          {!ownerName && (c.gotAt
            ? <button className="btn ghost" onClick={() => onGot(false)}><ArrowCounterClockwise aria-hidden /> Back on my list</button>
            : <button className="btn ghost" onClick={() => onGot(true)}><Confetti aria-hidden /> I got it</button>)}
          <button className="btn quiet" onClick={onRemove}><Trash aria-hidden /> Remove from {ownerName ? `${ownerName}'s` : 'my'} list</button>
        </> : <button className="btn ghost" style={{ marginTop: 10 }} onClick={onClose}>Close</button>}
      </> : null}
    </Sheet>
  );
}
