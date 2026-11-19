import { Scissors } from '@phosphor-icons/react';
import { canShorten, shortTitle, type ItemState } from '@family-registry/core';
import { renameItems } from '../items.ts';
import { copy } from '../copy.ts';
import { useToast } from './Toast.tsx';
import { plural } from './text.tsx';

const c = copy.shorten;

/** Offers to shorten long shop titles on a list you can edit, all at once, with Undo. */
export function ShortenNote({ items }: { items: ItemState[] }) {
  const toast = useToast();
  const long = items.filter(i => canShorten(i.content.title));
  if (!long.length) return null;
  const go = async () => {
    const undo = await renameItems(long.map(i => ({ id: i.id, title: shortTitle(i.content.title) })));
    toast(<><Scissors weight="fill" /> {plural(c.done, long.length)}</>, { undo: () => void undo() });
  };
  return (
    <div className="notice">
      <Scissors weight="duotone" aria-hidden />
      <span>{plural(c.notice, long.length)}</span>
      <button onClick={go}>{c.button}</button>
    </div>
  );
}
