/*
 * FIXED TEST VECTORS. These pin down the data format: known words must always give
 * the same keys, tags and event content. If one of these fails, a change has altered
 * how everyone's keys or data are derived. Fix the change, NEVER the expected values
 * (and never run vitest with -u on this file).
 */
import { describe, expect, it } from 'vitest';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { createHash } from 'node:crypto';
import {
  WORDS, buildItemEvent, fingerprint, groupKeys, memberKeys, open, readItemEvent, unwrapKey, wrapKey, seal,
} from '../src/index.ts';

const MEMBER = ['maple', 'river', 'garden', 'pencil', 'rabbit', 'ocean'];
const GROUP = ['violin', 'oak', 'mango', 'sunny', 'meadow', 'castle'];
const fixed = (byte: number) => new Uint8Array(32).fill(byte);

describe('word list', () => {
  it('is unchanged', () => {
    expect(WORDS.length).toBe(1928);
    const hash = createHash('sha256').update(WORDS.join('\n')).digest('hex');
    expect(hash).toMatchInlineSnapshot(`"ec30369915a52ff605a2ed6e2d29cc45df7ca1f818c00f13c30962948e779790"`);
  });

  it('contains the vector words', () => {
    for (const w of [...MEMBER, ...GROUP]) expect(WORDS).toContain(w);
  });
});

describe('key derivation', () => {
  it('member words give a fixed key pair', async () => {
    const k = await memberKeys(MEMBER);
    expect(bytesToHex(k.secretKey)).toMatchInlineSnapshot(`"10a25cf6474c38de4e303cb04c097671282f4a4a5c07ba4b36941d87789e6a69"`);
    expect(k.pubkey).toMatchInlineSnapshot(`"6b2d298aa21e42fda222cf504eb8353aaaa1e6d962394aba3828896dc12c92b3"`);
  });

  it('group words give a fixed tag and key', async () => {
    const g = await groupKeys(GROUP);
    expect(g.tag).toMatchInlineSnapshot(`"1dfea630bec12a016615d9fe4b6c450b"`);
    expect(bytesToHex(g.key)).toMatchInlineSnapshot(`"c133e96e64f09f1ef21cac10982a7bef92608f60a85e0cfa8020ee55dd596844"`);
  });

  it('a public key gives a fixed fingerprint', async () => {
    const { pubkey } = await memberKeys(MEMBER);
    expect(fingerprint(pubkey)).toMatchInlineSnapshot(`
      [
        "jelly",
        "scorpion",
        "regret",
        "doll",
      ]
    `);
  });
});

describe('encryption', () => {
  const itemKey = fixed(7);
  const groupKey = hexToBytes('11'.repeat(32));

  it('sealed content is fixed for a fixed nonce', () => {
    expect(seal({ v: 1, hello: 'world' }, itemKey, fixed(1))).toMatchInlineSnapshot(`"AgEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB3lwUsjAH4heCt8LwR4FtU0OtAw8syEQNiZztiYAKzf+P8mtWKFaTxuM2bwfXQxK1sXEDU1/jUmkEEezSr+u4XBxN"`);
  });

  it('wrapped item keys are fixed for a fixed nonce', () => {
    const w = wrapKey(itemKey, groupKey, fixed(2));
    expect(w).toMatchInlineSnapshot(`"AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICWJvKhcSE98+SlizHpNvPOtKmKKWwn9557QRmpthud3MMBUNb4Q+Wi+vsRVqIP0E8B/DvBMutv4+ZOHcs81TwqXLOJIyAkNmnldNnB1uD4uSCBilvFdGk22hm6fKAxikRmdo="`);
    expect(unwrapKey(w, groupKey)).toEqual(itemKey);
  });
});

describe('item event', () => {
  it('has a fixed id and reads back', async () => {
    const me = await memberKeys(MEMBER);
    const g = await groupKeys(GROUP);
    const content = { v: 1 as const, title: 'LEGO Botanical Bonsai', links: ['https://www.lego.com/bonsai'], reallyWant: true, createdFor: me.pubkey, surprise: false };
    const ev = buildItemEvent({
      id: '00112233445566778899aabbccddeeff', content, itemKey: fixed(7), groups: [g], secretKey: me.secretKey,
      createdAt: 1_790_000_000, nonces: { content: fixed(3), wraps: [fixed(4)] },
    });
    expect(ev.tags).toMatchInlineSnapshot(`
      [
        [
          "d",
          "item:00112233445566778899aabbccddeeff",
        ],
        [
          "h",
          "1dfea630bec12a016615d9fe4b6c450b",
        ],
        [
          "k",
          "1dfea630bec12a016615d9fe4b6c450b",
          "AgQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEx63wjwgAEDoHG1JLGf2u4TjIYYGn8rVc+oq9z3iyANMYV/mNnh/8YxsTyJGu3vd0XES5CG6S25vZ7+V056uiNcx/N069PYgX6/5+v+ouQKNXw6tR12nzcVCvhkPNBdnnMfU=",
        ],
      ]
    `);
    expect(ev.content).toMatchInlineSnapshot(`"AgMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDqAM2s3uxZLblWkiwxW95CxNRju2zGbcCGStcOvU9Xymyr1Dzf+JC/GUqdZA6P/fxW9r7lTnwAshxWysg0gBWzz5qRBtI98NOgB5IApvLeCUbE4NO5JX0IRkKgzJMHGsJWnoU4UfIBGWprapccKJ6WA9P8LGSRiWe0RUux7MtPeSWFsb3dwfUbhHX1Eg2WUW3JL8i09e8Czj69WBUJHBxjdULQPiyAOQ7JADrG11tbsvheJ7bepi3eoA9JcCNHwwF4CU0h52oB1I+/QZHfToGfFiN5rcRWO3MBpIWRi86bNnsPBGjgEVtaq6XlXpcbaiXAe+KSqeW+Nd+diA7m1ntZfIY"`);
    expect(ev.id).toMatchInlineSnapshot(`"d754c757f7a73f14a1407c4c19b69fcae0172955416b6b177d4903ef59b5a4bd"`);

    const read = readItemEvent(ev, [g], 1_790_000_000);
    expect(read?.content).toEqual(content);
    expect(open(ev.content, fixed(7))).toEqual(content);
  });
});
