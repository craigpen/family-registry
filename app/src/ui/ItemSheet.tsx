import { useEffect, useState } from 'react';
import {
  ArrowCounterClockwise, CaretRight, Check, CheckCircle, Confetti, Gift, HandHeart, LinkSimple, NotePencil, PencilSimple, Trash, Warning,
} from '@phosphor-icons/react';
import { siteName, upcomingOccasions, type ItemState } from '@family-registry/core';
import { occasionLabel } from './bits.tsx';
import { Photo, ReallyWant, whereFrom } from './ItemCard.tsx';
import { Sheet } from './Sheet.tsx';

export type ClaimAction = { kind: 'claim'; occasion: string } | { kind: 'bought' } | { kind: 'release' } | { kind: 'given' };

/**
 * One item. The owner (and their helpers) can edit it. Anyone else sees who's getting it
 * and can say "I'll get this". The recipient never sees any of the giving part.
 */
export function ItemSheet({ item, viewer, ownerName, ownerBirthday, nameOf, canEdit, onClose, onEdit, onRemove, onGot, onClaim }: {
  item?: ItemState; viewer: string; ownerName?: string; ownerBirthday?: string; nameOf: (pk: string) => string; canEdit: boolean;
  onClose: () => void; onEdit: () => void; onRemove: () => void; onGot: (got: boolean) => void; onClaim: (a: ClaimAction) => void;
}) {
  const c = item?.content;
  const mineToGive = !!item && item.owner !== viewer;
  const occasions = upcomingOccasions(ownerBirthday);
  const [occasion, setOccasion] = useState(occasions[0]!.id);
  useEffect(() => { setOccasion(upcomingOccasions(ownerBirthday)[0]!.id); }, [item?.id, ownerBirthday]);

  let giving = null;
  if (item && mineToGive) {
    const { holder, others, boughtTwice } = item.claims;
    const myClaim = [holder, ...others].find(x => x?.author === viewer);
    const who = ownerName ?? 'they';
    if (!holder) {
      giving = <>
        {occasions.length > 1 && (
          <div className="occasions" role="group" aria-label="For which occasion">
            {occasions.map(o => <button key={o.id} className="chip" aria-pressed={occasion === o.id} onClick={() => setOccasion(o.id)}>{occasionLabel(o.id, ownerName)}</button>)}
          </div>
        )}
        <button className="btn primary" onClick={() => onClaim({ kind: 'claim', occasion })}><HandHeart weight="fill" aria-hidden /> I'll get this</button>
      </>;
    } else if (holder.author === viewer) {
      giving = <>
        <div className="claim-status mine">{holder.state === 'bought' ? <CheckCircle weight="fill" aria-hidden /> : <HandHeart weight="fill" aria-hidden />}
          <span>{holder.state === 'bought' ? `You bought this for ${occasionLabel(holder.occasion, ownerName)}. It stays hidden from ${who}.` : `You're getting this for ${occasionLabel(holder.occasion, ownerName)}. ${ownerName ?? 'They'} won't see that.`}</span></div>
        {boughtTwice && <div className="claim-status warn"><Warning weight="fill" aria-hidden /><span>{others.filter(o => o.state === 'bought').map(o => nameOf(o.author)).join(' and ')} bought it too. Best sort it out between you.</span></div>}
        {holder.state === 'getting'
          ? <button className="btn pine" onClick={() => onClaim({ kind: 'bought' })}><Check weight="bold" aria-hidden /> I bought it</button>
          : !item.given.some(g => g.by === viewer) && <button className="btn ghost" onClick={() => onClaim({ kind: 'given' })}><Gift aria-hidden /> I've given it already</button>}
        <button className="btn quiet" onClick={() => onClaim({ kind: 'release' })}>{holder.state === 'bought' ? 'I didn’t buy it after all' : 'Never mind'}</button>
      </>;
    } else {
      giving = <>
        <div className="claim-status taken">{holder.state === 'bought' ? <CheckCircle weight="fill" aria-hidden /> : <HandHeart weight="fill" aria-hidden />}
          <span><b>{nameOf(holder.author)}</b> {holder.state === 'bought' ? 'already bought this.' : 'is getting this.'}</span></div>
        {myClaim && (boughtTwice && myClaim.state === 'bought'
          ? <div className="claim-status warn"><Warning weight="fill" aria-hidden /><span>You and {nameOf(holder.author)} both bought this. Best sort it out between you.</span></div>
          : <div className="claim-status warn"><Warning weight="fill" aria-hidden /><span>{nameOf(holder.author)} got there first.</span></div>)}
        {myClaim && <button className="btn ghost" onClick={() => onClaim({ kind: 'release' })}>OK, let it go</button>}
      </>;
    }
  }

  return (
    <Sheet open={!!item} onClose={onClose} heading={c && <>{c.title} {c.reallyWant && <ReallyWant />}</>} above={item && <Photo item={item} hero />}>
      {item && c ? <>
        <div className="kv">
          {[c.price, whereFrom(item)].filter(Boolean).join(' · ')}
          {c.reallyWant && <> · <b className="heart">{ownerName ? `${ownerName} really wants this` : 'You really want this'}</b></>}
        </div>
        {c.surprise && <div className="secret">{item.addedBy === viewer ? 'Your secret idea' : `Secret idea from ${nameOf(item.addedBy)}`}. {ownerName} can't see it.</div>}
        {c.notes && <div className="note"><NotePencil aria-hidden /><span>{c.notes}</span></div>}
        {c.links.map(l => (
          <a key={l} className="link" href={l} target="_blank" rel="noopener noreferrer">
            <LinkSimple aria-hidden /><span>View at {siteName(l) ?? 'the shop'}</span><CaretRight weight="bold" aria-hidden />
          </a>
        ))}
        {giving}
        {canEdit && <>
          <button className="btn ghost" style={{ marginTop: 10 }} onClick={onEdit}><PencilSimple aria-hidden /> Edit</button>
          {!mineToGive && (c.gotAt
            ? <button className="btn ghost" onClick={() => onGot(false)}><ArrowCounterClockwise aria-hidden /> Back on my list</button>
            : <button className="btn ghost" onClick={() => onGot(true)}><Confetti aria-hidden /> I got it</button>)}
          <button className="btn quiet" onClick={onRemove}><Trash aria-hidden /> {c.surprise ? 'Remove this idea' : `Remove from ${mineToGive ? `${ownerName}'s` : 'my'} list`}</button>
        </>}
      </> : null}
    </Sheet>
  );
}
