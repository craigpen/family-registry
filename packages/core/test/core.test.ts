import { describe, expect, it } from 'vitest';
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import {
  KIND, WORDS, buildItemEvent, groupKeys, guessFromLink, inviteLink, newItemId, newItemKey, newestVersion,
  parseAddPrefill, parseInvite, parseItem, randomWords, readItemEvent, siteName, splitWords, titleFromUrl,
  validWords, isTombstone,
} from '../src/index.ts';

describe('words', () => {
  it('random words come from the list and vary', () => {
    const a = randomWords();
    expect(a).toHaveLength(6);
    expect(a.every(w => WORDS.includes(w))).toBe(true);
    expect(randomWords().join()).not.toBe(a.join());
  });

  it('accepts words however they are typed or dictated', () => {
    expect(splitWords('  Maple river, GARDEN-pencil\nrabbit.ocean ')).toEqual(['maple', 'river', 'garden', 'pencil', 'rabbit', 'ocean']);
    expect(validWords(['maple', 'river', 'garden', 'pencil', 'rabbit', 'ocean'])).toBe(true);
    expect(validWords(['maple', 'river', 'garden', 'pencil', 'rabbit'])).toBe(false);
    expect(validWords(['maple', 'river', 'garden', 'pencil', 'rabbit', 'zzzz'])).toBe(false);
  });

  it('has no unfriendly words', () => {
    for (const w of ['kill', 'war', 'abuse', 'gun', 'ugly']) expect(WORDS).not.toContain(w);
  });
});

describe('links', () => {
  const inv = { group: randomWords(), member: randomWords(), organizer: randomWords(4) };

  it('round-trips an invite', () => {
    const link = inviteLink('https://example.github.io/family-registry/', inv);
    expect(link).toMatch(/^https:\/\/example\.github\.io\/family-registry\/#g=[a-z-]+&m=[a-z-]+&o=[a-z-]+$/);
    expect(parseInvite(new URL(link).hash)).toEqual(inv);
  });

  it('rejects broken invites', () => {
    expect(parseInvite('#g=maple&m=otter&o=x')).toBeNull();
    expect(parseInvite('')).toBeNull();
  });

  it('reads Add details from a helper fragment, with repeated images', () => {
    expect(parseAddPrefill('#url=https%3A%2F%2Fshop.test%2Fa&title=Kite&image=https%3A%2F%2Fi%2F1&image=https%3A%2F%2Fi%2F2&price=%2412'))
      .toEqual({ url: 'https://shop.test/a', title: 'Kite', images: ['https://i/1', 'https://i/2'], price: '$12', text: undefined, site: undefined });
  });

  it('finds the link inside Android share text', () => {
    const p = parseAddPrefill('?text=Check%20out%20this%20kite%20https%3A%2F%2Fa.co%2Fd%2Fabc');
    expect(p?.url).toBe('https://a.co/d/abc');
    expect(p?.text).toBe('Check out this kite');
  });

  it('returns null when there is nothing to add', () => {
    expect(parseAddPrefill('#')).toBeNull();
  });
});

describe('guessing from a link', () => {
  it('names shops', () => {
    expect(siteName('https://www.amazon.com/dp/B0')).toBe('Amazon');
    expect(siteName('https://www.johnlewis.com/x')).toBe('John Lewis');
    expect(siteName('https://shop.fancykites.co.uk/x')).toBe('Fancykites');
  });

  it('reads a title from the URL path', () => {
    expect(titleFromUrl('https://www.amazon.com/LEGO-Botanical-Bonsai-Tree/dp/B08YP7KXQW')).toBe('LEGO Botanical Bonsai Tree');
    expect(titleFromUrl('https://www.etsy.com/listing/123456789/hand-knitted-wool-socks')).toBe('Hand Knitted Wool Socks');
    expect(titleFromUrl('https://a.co/d/abc')).toBeUndefined();
  });

  it('prefers the URL when the share text says little', () => {
    expect(guessFromLink('https://www.etsy.com/listing/1/rainbow-stunt-kite', 'Check out this kite').title).toBe('Rainbow Stunt Kite');
  });

  it('prefers the share text', () => {
    expect(guessFromLink('https://a.co/d/abc', 'Check out LEGO Botanical Bonsai on Amazon https://a.co/d/abc'))
      .toEqual({ url: 'https://a.co/d/abc', site: 'Amazon', title: 'LEGO Botanical Bonsai' });
  });
});

describe('items', () => {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const base = { v: 1 as const, title: 'Kite', createdFor: pk };

  it('fills defaults and rejects bad content', () => {
    expect(parseItem(base)).toEqual({ ...base, links: [], reallyWant: false, surprise: false });
    expect(parseItem({ ...base, v: 2 })).toBeNull();
    expect(parseItem({ ...base, title: '' })).toBeNull();
    expect(parseItem({ ...base, image: 'javascript:alert(1)' })).toBeNull();
    const t = parseItem({ v: 1, deleted: true });
    expect(t && isTombstone(t)).toBe(true);
  });

  it('only groups holding the key can read an item', async () => {
    const [a, b] = await Promise.all([groupKeys(randomWords()), groupKeys(randomWords())]);
    const ev = buildItemEvent({ id: newItemId(), content: base, itemKey: newItemKey(), groups: [a], secretKey: sk });
    expect(readItemEvent(ev, [b])).toBeNull();
    expect(readItemEvent(ev, [b, a])?.content).toMatchObject({ title: 'Kite' });
  });

  it('one item key is readable by several groups', async () => {
    const [a, b] = await Promise.all([groupKeys(randomWords()), groupKeys(randomWords())]);
    const ev = buildItemEvent({ id: newItemId(), content: base, itemKey: newItemKey(), groups: [a, b], secretKey: sk });
    expect(readItemEvent(ev, [a])?.itemKey).toEqual(readItemEvent(ev, [b])?.itemKey);
  });

  it('ignores tampered and far-future events', async () => {
    const g = await groupKeys(randomWords());
    const ev = buildItemEvent({ id: newItemId(), content: base, itemKey: newItemKey(), groups: [g], secretKey: sk, createdAt: 1000 });
    expect(readItemEvent({ ...ev, content: ev.content.slice(0, -4) + 'AAAA' }, [g], 1000)).toBeNull();
    const future = buildItemEvent({ id: newItemId(), content: base, itemKey: newItemKey(), groups: [g], secretKey: sk, createdAt: 1000 + 3601 });
    expect(readItemEvent(future, [g], 1000)).toBeNull();
    expect(readItemEvent(future, [g], 1001)).not.toBeNull();
  });

  it('ignores events of other kinds', () => {
    const ev = finalizeEvent({ kind: 1, created_at: 1, tags: [['d', 'item:x']], content: '' }, sk);
    expect(ev.kind).not.toBe(KIND);
    expect(readItemEvent(ev, [])).toBeNull();
  });

  it('newest version from an allowed editor wins, ties go to the lower id', () => {
    const v = (author: string, createdAt: number, eventId: string) => ({ author, createdAt, eventId });
    const list = [v('mom', 10, 'b'), v('dad', 12, 'c'), v('mom', 12, 'a'), v('stranger', 99, 'z')];
    expect(newestVersion(list, a => a !== 'stranger')).toEqual(v('mom', 12, 'a'));
    expect(newestVersion(list, a => a === 'mom')).toEqual(v('mom', 12, 'a'));
    expect(newestVersion(list, () => false)).toBeUndefined();
  });
});
