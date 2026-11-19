import { useEffect, useState } from 'react';
import {
  ArrowCounterClockwise, CaretRight, Check, CheckCircle, Confetti, Gift, HandHeart, LinkSimple, NotePencil, PencilSimple, Trash, Warning,
} from '@phosphor-icons/react';
import { siteName, upcomingOccasions, type ItemState } from '@family-registry/core';
import { copy } from '../copy.ts';
import { occasionLabel } from './bits.tsx';
import { Photo, ReallyWant, whereFrom } from './ItemCard.tsx';
import { Sheet } from './Sheet.tsx';
import { rich, t } from './text.tsx';

const c = copy.item;

export type ClaimAction = { kind: 'claim'; occasion: string } | { kind: 'bought' } | { kind: 'release' } | { kind: 'given' };

/**
 * One item. The owner (and their helpers) can edit it. Anyone else sees who's getting it
 * and can say "I'll get this". The recipient never sees any of the giving part.
 */
export function ItemSheet({ item, viewer, ownerName, ownerBirthday, nameOf, canEdit, onClose, onEdit, onRemove, onGot, onClaim }: {
  item?: ItemState; viewer: string; ownerName?: string; ownerBirthday?: string; nameOf: (pk: string) => string; canEdit: boolean;
  onClose: () => void; onEdit: () => void; onRemove: () => void; onGot: (got: boolean) => void; onClaim: (a: ClaimAction) => void;
}) {
  const content = item?.content;
  const mineToGive = !!item && item.owner !== viewer;
  const occasions = upcomingOccasions(ownerBirthday);
  const [occasion, setOccasion] = useState(occasions[0]!.id);
  useEffect(() => { setOccasion(upcomingOccasions(ownerBirthday)[0]!.id); }, [item?.id, ownerBirthday]);

  let giving = null;
  if (item && mineToGive) {
    const { holder, others, boughtTwice } = item.claims;
    const myClaim = [holder, ...others].find(x => x?.author === viewer);
    if (!holder) {
      giving = <>
        {occasions.length > 1 && (
          <div className="occasions" role="group" aria-label={c.occasionsLabel}>
            {occasions.map(o => <button key={o.id} className="chip" aria-pressed={occasion === o.id} onClick={() => setOccasion(o.id)}>{occasionLabel(o.id, ownerName)}</button>)}
          </div>
        )}
        <button className="btn primary" onClick={() => onClaim({ kind: 'claim', occasion })}><HandHeart weight="fill" aria-hidden /> {c.claim}</button>
      </>;
    } else if (holder.author === viewer) {
      const label = occasionLabel(holder.occasion, ownerName);
      giving = <>
        <div className="claim-status mine">{holder.state === 'bought' ? <CheckCircle weight="fill" aria-hidden /> : <HandHeart weight="fill" aria-hidden />}
          <span>{holder.state === 'bought' ? t(c.youBoughtFor, { occasion: label, name: ownerName ?? c.they }) : t(c.youreGettingFor, { occasion: label, name: ownerName ?? c.They })}</span></div>
        {boughtTwice && <div className="claim-status warn"><Warning weight="fill" aria-hidden /><span>{t(c.boughtToo, { names: others.filter(o => o.state === 'bought').map(o => nameOf(o.author)).join(copy.common.and) })}</span></div>}
        {holder.state === 'getting'
          ? <button className="btn pine" onClick={() => onClaim({ kind: 'bought' })}><Check weight="bold" aria-hidden /> {c.iBoughtIt}</button>
          : !item.given.some(g => g.by === viewer) && <button className="btn ghost" onClick={() => onClaim({ kind: 'given' })}><Gift aria-hidden /> {c.givenAlready}</button>}
        <button className="btn quiet" onClick={() => onClaim({ kind: 'release' })}>{holder.state === 'bought' ? c.didntBuy : c.neverMind}</button>
      </>;
    } else {
      const name = nameOf(holder.author);
      giving = <>
        <div className="claim-status taken">{holder.state === 'bought' ? <CheckCircle weight="fill" aria-hidden /> : <HandHeart weight="fill" aria-hidden />}
          <span>{rich(holder.state === 'bought' ? c.alreadyBought : c.alsoGetting, { name })}</span></div>
        {myClaim && (boughtTwice && myClaim.state === 'bought'
          ? <div className="claim-status warn"><Warning weight="fill" aria-hidden /><span>{t(c.bothBought, { name })}</span></div>
          : <div className="claim-status warn"><Warning weight="fill" aria-hidden /><span>{t(c.gotThereFirst, { name })}</span></div>)}
        {myClaim && <button className="btn ghost" onClick={() => onClaim({ kind: 'release' })}>{c.letGo}</button>}
      </>;
    }
  }

  return (
    <Sheet open={!!item} onClose={onClose} heading={content && <>{content.title} {content.reallyWant && <ReallyWant />}</>} above={item && <Photo item={item} hero />}>
      {item && content ? <>
        <div className="kv">
          {[content.price, whereFrom(item)].filter(Boolean).join(' · ')}
          {content.reallyWant && <> · <b className="heart">{ownerName ? t(c.ownerReallyWants, { name: ownerName }) : c.youReallyWant}</b></>}
        </div>
        {content.surprise && <div className="secret">{item.addedBy === viewer ? t(c.yourIdea, { owner: ownerName ?? '' }) : t(c.ideaFrom, { name: nameOf(item.addedBy), owner: ownerName ?? '' })}</div>}
        {content.notes && <div className="note"><NotePencil aria-hidden /><span>{content.notes}</span></div>}
        {content.links.map(l => (
          <a key={l} className="link" href={l} target="_blank" rel="noopener noreferrer">
            <LinkSimple aria-hidden /><span>{t(c.viewAt, { site: siteName(l) ?? c.theShop })}</span><CaretRight weight="bold" aria-hidden />
          </a>
        ))}
        {giving}
        {canEdit && <>
          <button className="btn ghost" style={{ marginTop: 10 }} onClick={onEdit}><PencilSimple aria-hidden /> {copy.common.edit}</button>
          {!mineToGive && (content.gotAt
            ? <button className="btn ghost" onClick={() => onGot(false)}><ArrowCounterClockwise aria-hidden /> {c.backOnList}</button>
            : <button className="btn ghost" onClick={() => onGot(true)}><Confetti aria-hidden /> {c.gotIt}</button>)}
          <button className="btn quiet" onClick={onRemove}><Trash aria-hidden /> {content.surprise ? c.removeIdea : mineToGive ? t(c.removeTheirs, { name: ownerName ?? '' }) : c.removeMine}</button>
        </>}
      </> : null}
    </Sheet>
  );
}
