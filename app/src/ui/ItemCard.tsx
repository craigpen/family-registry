import { Gift, Heart } from '@phosphor-icons/react';
import type { LocalItem } from '../db.ts';
import { siteName } from '@family-registry/core';

/** A soft coloured tile stands in until there's a photo. The hue comes from the item id. */
const hue = (id: string) => parseInt(id.slice(0, 4), 16) % 360;

export function Photo({ item, hero = false }: { item: LocalItem; hero?: boolean }) {
  return (
    <span className={`photo${hero ? ' hero' : ''}`} style={{ '--h': hue(item.id) } as React.CSSProperties}>
      {item.image ? <img src={item.image} alt="" /> : <Gift weight="duotone" aria-hidden />}
    </span>
  );
}

export const whereFrom = (it: LocalItem) => it.seenAt || (it.links[0] ? siteName(it.links[0]) : undefined);

export function ReallyWant() {
  return <span className="heart" title="Really want"><Heart weight="fill" aria-label="Really want" /></span>;
}

export function ItemCard({ item, onOpen }: { item: LocalItem; onOpen: () => void }) {
  const meta = [item.price, whereFrom(item)].filter(Boolean).join(' · ');
  return (
    <button className="item" onClick={onOpen}>
      <Photo item={item} />
      <span className="body">
        <div className="t">{item.title} {item.reallyWant && <ReallyWant />}</div>
        {meta && <div className="s">{meta}</div>}
      </span>
    </button>
  );
}
