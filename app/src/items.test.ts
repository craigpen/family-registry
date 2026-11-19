import { beforeEach, describe, expect, it } from 'vitest';
import { hexToBytes } from '@noble/hashes/utils.js';
import { fingerprint, isTombstone, memberKeys, randomWords, readItemEvent } from '@family-registry/core';
import { RegistryDB, db, useDatabase } from './db.ts';
import { signIn } from './identity.ts';
import { addItem, markReceived, removeItem, updateItem } from './items.ts';

let n = 0;
beforeEach(async () => {
  useDatabase(new RegistryDB(`test-${++n}`));
  const member = randomWords();
  const { pubkey } = await memberKeys(member);
  await signIn({ group: randomWords(), member, organizer: fingerprint(pubkey) }, 'Dad');
});

async function latestEvent() {
  const me = (await db.identity.get('me'))!;
  const [entry] = await db.outbox.toArray();
  return readItemEvent(entry!.event, [{ tag: me.groupTag, key: hexToBytes(me.groupKey) }]);
}

describe('signing in', () => {
  it('knows when you are the organizer', async () => {
    const me = (await db.identity.get('me'))!;
    expect(me.isOrganizer).toBe(true);
    expect(me.name).toBe('Dad');
  });
});

describe('my list', () => {
  it('adding an item saves it and queues a signed event the group can read', async () => {
    const it = await addItem({ title: '  Kite ', links: ['https://shop.test/kite'], reallyWant: true, price: '$20' });
    expect((await db.items.get(it.id))?.title).toBe('Kite');
    const ev = await latestEvent();
    expect(ev?.id).toBe(it.id);
    expect(ev?.content).toMatchObject({ title: 'Kite', reallyWant: true, price: '$20', links: ['https://shop.test/kite'] });
  });

  it('an edit replaces the unsent event and keeps the same item key', async () => {
    const it = await addItem({ title: 'Kite', links: [], reallyWant: false });
    await updateItem(it.id, { title: 'Red kite', notes: '' });
    expect(await db.outbox.count()).toBe(1);
    const ev = await latestEvent();
    expect(ev?.content).toMatchObject({ title: 'Red kite' });
    expect(ev?.content).not.toHaveProperty('notes', '');
    expect(Buffer.from(ev!.itemKey).toString('hex')).toBe(it.itemKey);
  });

  it('removing publishes a tombstone, and undo brings the item back', async () => {
    const it = await addItem({ title: 'Kite', links: [], reallyWant: false });
    const undo = await removeItem(it.id);
    expect((await db.items.get(it.id))?.deleted).toBe(true);
    const gone = await latestEvent();
    expect(gone && isTombstone(gone.content)).toBe(true);
    await undo();
    expect((await db.items.get(it.id))?.deleted).toBe(false);
    expect((await latestEvent())?.content).toMatchObject({ title: 'Kite' });
  });

  it('later edits are always dated after earlier ones', async () => {
    const it = await addItem({ title: 'Kite', links: [], reallyWant: false });
    await updateItem(it.id, { title: 'A' });
    const a = (await db.items.get(it.id))!.updatedAt;
    await updateItem(it.id, { title: 'B' });
    expect((await db.items.get(it.id))!.updatedAt).toBeGreaterThanOrEqual(a + 1000);
  });

  it('marks an item received and back', async () => {
    const it = await addItem({ title: 'Kite', links: [], reallyWant: false });
    await markReceived(it.id, true);
    expect((await db.items.get(it.id))?.receivedAt).toBeTypeOf('number');
    await markReceived(it.id, false);
    expect((await db.items.get(it.id))?.receivedAt).toBeUndefined();
  });
});
