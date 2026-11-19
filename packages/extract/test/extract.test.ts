// @vitest-environment jsdom
/*
 * The sample pages in ./pages are hand-written to match how shops mark up their pages
 * (JSON-LD, Open Graph, microdata, Amazon's own markup). Replace them with saved copies of
 * real pages now and then, since shops change: save the page, trim scripts and styles,
 * and keep the parts that matter.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type * as Extract from '../extract.d.ts';

const { extract, readAmazonList, formatPrice } = createRequire(join(import.meta.dirname, 'x.js'))('../extract.js') as typeof Extract;
const page = (name: string) => new DOMParser().parseFromString(readFileSync(join(import.meta.dirname, 'pages', `${name}.html`), 'utf8'), 'text/html');

describe('extract', () => {
  it('prefers JSON-LD Product, inside @graph, with relative images and a price range', () => {
    expect(extract(page('jsonld-graph'), 'https://fancykites.test/kites/rainbow')).toEqual({
      url: 'https://fancykites.test/kites/rainbow',
      title: 'Rainbow Stunt Kite',
      images: ['https://fancykites.test/img/kite-1.jpg', 'https://cdn.fancykites.test/img/kite-2.jpg', 'https://cdn.fancykites.test/og/kite-share.jpg'],
      price: '$34.99',
      currency: 'USD',
      site: 'Fancy Kites',
    });
  });

  it('falls back to Open Graph, skipping insecure and repeated images', () => {
    const r = extract(page('opengraph'), 'https://shop.grannysyarns.co.uk/p/socks');
    expect(r.title).toBe('Hand-knitted wool socks');
    expect(r.images).toEqual(['https://shop.grannysyarns.co.uk/socks-large.jpg']);
    expect(r.price).toBe('£18');
    expect(r.site).toBe('Grannysyarns');
  });

  it("reads Amazon's own markup: the real title, the main photo first, not the ad", () => {
    const r = extract(page('amazon-product'), 'https://www.amazon.com/dp/B08YP7KXQW');
    expect(r.title).toBe('LEGO Icons Bonsai Tree 10281 Building Set for Adults');
    expect(r.images[0]).toBe('https://m.media-amazon.com/images/I/bonsai-hires.jpg');
    expect(r.images).not.toContain('https://images-na.ssl-images-amazon.com/ad-banner.jpg');
    expect(r.price).toBe('$39.99');
  });

  it('reads microdata', () => {
    const r = extract(page('microdata'), 'https://garden.test/kneeler');
    expect(r).toMatchObject({ title: 'Padded garden kneeler and seat', images: ['https://garden.test/images/kneeler.jpg'], price: '$49.50' });
  });

  it('uses the page title, without the shop name, when there is nothing else', () => {
    const r = extract(page('title-only'), 'https://www.lodgecastiron.com/pizza-pan');
    expect(r).toMatchObject({ title: 'Cast-iron pizza pan', images: [], price: '', site: 'Lodgecastiron' });
  });

  it('formats prices', () => {
    expect(formatPrice('39.95', 'USD')).toBe('$39.95');
    expect(formatPrice('40', 'EUR')).toBe('€40');
    expect(formatPrice('1,299.00', 'USD')).toBe('$1299');
    expect(formatPrice('£18.00')).toBe('£18.00');
    expect(formatPrice('12', 'CHF')).toBe('12 CHF');
  });
});

describe('readAmazonList', () => {
  it('reads every item with its product ID, priority, note and quantity', () => {
    const list = readAmazonList(page('amazon-list'), 'https://www.amazon.com/hz/wishlist/ls/LIST1');
    expect(list.name).toBe("Lily's birthday");
    expect(list.complete).toBe(true);
    expect(list.items).toEqual([
      { id: 'I2ABC', asin: 'B0PAINTS01', title: 'Watercolour Paint Set, 36 colours', url: 'https://www.amazon.com/dp/B0PAINTS01',
        image: 'https://m.media-amazon.com/images/I/paints._SS135_.jpg', price: '$24.99', highest: true, notes: 'The one with the metal tin' },
      { id: 'I3DEF', asin: 'B0PLUSH002', title: 'Giant hamster plush', url: 'https://www.amazon.com/dp/B0PLUSH002',
        image: 'https://m.media-amazon.com/images/I/plush._SS135_.jpg', price: '', highest: false, notes: 'Would like 2' },
    ]);
  });
});
