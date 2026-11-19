import { Fragment, type ReactNode } from 'react';
import type { Plural } from '../copy.ts';

/*
 * Turning the texts in copy.ts into what's on screen: {name} filled in, **bold**, [links](key),
 * and one/many by count.
 */

type Vars = Record<string, string | number>;

/** Fills in {name}-style blanks. Unknown blanks are left as they are, so they're easy to spot. */
export const t = (text: string, vars: Vars = {}): string =>
  text.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? String(vars[k]) : all));

/** "1 wish", "3 wishes" (and `zero` when it has one). {n} is the count. */
export const plural = (forms: Plural, n: number, vars: Vars = {}): string =>
  t(n === 0 && forms.zero !== undefined ? forms.zero : n === 1 ? forms.one : forms.many, { n, ...vars });

type NodeVars = Record<string, ReactNode>;

function fill(text: string, vars: NodeVars, key: string): ReactNode[] {
  return text.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? <Fragment key={`${key}.${i}`}>{part in vars ? vars[part] : `{${part}}`}</Fragment> : part));
}

/**
 * A text with **bold** and [links](key). Blanks are filled after the bold and links are found,
 * so a name or title can never turn into formatting.
 */
export function rich(text: string, vars: NodeVars = {}, links: Record<string, (label: ReactNode) => ReactNode> = {}): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\w+\))/).map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <b key={i}>{fill(bold[1]!, vars, String(i))}</b>;
    const link = /^\[([^\]]+)\]\((\w+)\)$/.exec(part);
    if (link) {
      const label = fill(link[1]!, vars, String(i));
      return <Fragment key={i}>{links[link[2]!] ? links[link[2]!]!(label) : label}</Fragment>;
    }
    return <Fragment key={i}>{fill(part, vars, String(i))}</Fragment>;
  });
}

/** `rich` as a component. */
export function Rich({ text, vars, links }: { text: string; vars?: NodeVars; links?: Record<string, (label: ReactNode) => ReactNode> }) {
  return <>{rich(text, vars, links)}</>;
}
