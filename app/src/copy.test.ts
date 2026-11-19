import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { copy } from './copy.ts';
import { Rich, plural, t } from './ui/text.tsx';

/** Every text in copy.ts, with where it lives ("home.wishes.many"). */
function* texts(node: unknown, path = ''): Generator<[string, string]> {
  if (typeof node === 'string') yield [path, node];
  else if (Array.isArray(node)) for (const [i, v] of node.entries()) yield* texts(v, `${path}.${i}`);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) yield* texts(v, path ? `${path}.${k}` : k);
}
const all = [...texts(copy)];
const html = (text: string, vars?: Record<string, string>) => renderToStaticMarkup(createElement(Rich, { text, vars }));

describe('filling in texts', () => {
  it('fills blanks and leaves unknown ones visible', () => {
    expect(t('{name} can\'t see these.', { name: 'Lily' })).toBe('Lily can\'t see these.');
    expect(t('Hi, {name}')).toBe('Hi, {name}');
  });

  it('picks one, many or zero by count', () => {
    expect(plural(copy.home.wishes, 0)).toBe('No wishes yet');
    expect(plural(copy.home.wishes, 1)).toBe('1 wish');
    expect(plural(copy.home.wishes, 4)).toBe('4 wishes');
    expect(plural(copy.shorten.notice, 1)).toBe('One name is very long, the way shops write them.');
  });

  it('makes **bold** and keeps names from turning into formatting', () => {
    expect(html(copy.home.removedWhileGetting, { name: 'Mom', title: '**Socks**' }))
      .toBe('Mom removed <b>**Socks**</b>, which you were getting.');
  });

  it('shows a link label as plain text when the screen gives no link', () => {
    expect(html(copy.desktop.download)).toBe('Download the gift button and unzip it.');
  });
});

describe('the copy file', () => {
  it('has no emoji', () => {
    for (const [path, text] of all) expect([path, /\p{Extended_Pictographic}/u.test(text)]).toEqual([path, false]);
  });

  it('uses American spellings', () => {
    const british = /\b(colour|favourite|organis|realis|recognis|cancell|travell|centre|grey|programme|licence|catalogue|jewellery|mum)\w*/i;
    for (const [path, text] of all) expect([path, british.exec(text)?.[0]]).toEqual([path, undefined]);
  });

  it('closes every **bold** and {blank}', () => {
    for (const [path, text] of all) {
      expect([path, (text.match(/\*\*/g) ?? []).length % 2]).toEqual([path, 0]);
      expect([path, /[{}]/.test(text.replace(/\{\w+\}/g, ''))]).toEqual([path, false]);
    }
  });
});
