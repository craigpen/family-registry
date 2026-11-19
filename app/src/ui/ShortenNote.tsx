import { Scissors } from '@phosphor-icons/react';
import { canShorten, shortTitle, type ItemState } from '@family-registry/core';
import { renameItems } from '../items.ts';
import { useToast } from './Toast.tsx';

/** Offers to shorten long shop titles on a list you can edit, all at once, with Undo. */
export function ShortenNote({ items }: { items: ItemState[] }) {
  const toast = useToast();
  const long = items.filter(i => canShorten(i.content.title));
  if (!long.length) return null;
  const go = async () => {
    const undo = await renameItems(long.map(i => ({ id: i.id, title: shortTitle(i.content.title) })));
    toast(<><Scissors weight="fill" /> Shortened {long.length} {long.length === 1 ? 'name' : 'names'}</>, { undo: () => void undo() });
  };
  return (
    <div className="notice">
      <Scissors weight="duotone" aria-hidden />
      <span>{long.length === 1 ? 'One name is' : `${long.length} names are`} very long, the way shops write them.</span>
      <button onClick={go}>Shorten</button>
    </div>
  );
}
