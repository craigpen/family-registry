import { CheckCircle, Gift, HandHeart, Heart, Lightbulb } from '@phosphor-icons/react';
import { siteName, type ItemState } from '@family-registry/core';

/** A soft colored tile stands in until there's a photo. The hue comes from the item id. */
const hue = (id: string) => parseInt(id.slice(0, 4), 16) % 360;

export function Photo({ item, hero = false }: { item: ItemState; hero?: boolean }) {
  return (
    <span className={`photo${hero ? ' hero' : ''}`} style={{ '--h': hue(item.id) } as React.CSSProperties}>
      {item.content.image ? <img src={item.content.image} alt="" /> : item.content.surprise ? <Lightbulb weight="duotone" aria-hidden /> : <Gift weight="duotone" aria-hidden />}
    </span>
  );
}

export const whereFrom = (it: ItemState) => it.content.seenAt || (it.content.links[0] ? siteName(it.content.links[0]) : undefined);

export function ReallyWant() {
  return <span className="heart" title="Really want"><Heart weight="fill" aria-label="Really want" /></span>;
}

/** What a giver sees about who's getting it. Never shown to the recipient (their app has no claims). */
export function ClaimPill({ item, viewer, nameOf }: { item: ItemState; viewer: string; nameOf: (pk: string) => string }) {
  const h = item.claims.holder;
  if (!h) return <span className="pill free">Up for grabs</span>;
  if (h.author === viewer) return <span className="pill mine">{h.state === 'bought' ? <><CheckCircle weight="fill" aria-hidden />You bought this</> : <><HandHeart weight="fill" aria-hidden />You're getting this</>}</span>;
  return <span className="pill taken">{h.state === 'bought' ? <><CheckCircle weight="fill" aria-hidden />Bought by {nameOf(h.author)}</> : <><HandHeart weight="fill" aria-hidden />{nameOf(h.author)} is getting this</>}</span>;
}

export function ItemCard({ item, onOpen, viewer, nameOf, isNew = false, meta: extra }: {
  item: ItemState; onOpen: () => void;
  /** Set when someone other than the owner is looking: shows who's getting it. */
  viewer?: string; nameOf?: (pk: string) => string; isNew?: boolean; meta?: string;
}) {
  const meta = extra ?? [item.content.price, whereFrom(item)].filter(Boolean).join(' · ');
  const taken = !!viewer && !!item.claims.holder && item.claims.holder.author !== viewer;
  return (
    <button className={`item${taken ? ' dim' : ''}${item.content.surprise ? ' surprise' : ''}`} onClick={onOpen}>
      {isNew && <span className="dot" title="New since your last visit" />}
      <Photo item={item} />
      <span className="body">
        <div className="t">{item.content.title} {item.content.reallyWant && <ReallyWant />}</div>
        {meta && <div className="s">{meta}</div>}
        {viewer && nameOf && <ClaimPill item={item} viewer={viewer} nameOf={nameOf} />}
      </span>
    </button>
  );
}
