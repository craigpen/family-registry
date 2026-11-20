import Dexie, { type EntityTable } from 'dexie';
import type { Event } from 'nostr-tools/pure';

/** A group this device belongs to. Words are kept so the person's link can be rebuilt. */
export interface MyGroup {
  words: string[];
  organizer: string[];
  tag: string;
  /** Hex group key. */
  key: string;
}

/** This device's identity. Secrets stay on the device (and in the person's link). */
export interface Identity {
  id: 'me';
  /** Shown before the roster arrives; the roster's name wins once it does. */
  name: string;
  memberWords: string[];
  /** Hex. Kept so the slow key derivation runs only once. */
  secretKey: string;
  pubkey: string;
  groups: MyGroup[];
  welcomed: boolean;
}

/** Every event we hold, newest per replaceable slot. The family's state is worked out from these. */
export interface StoredEvent {
  id: string;
  /** author:kind:d */
  slot: string;
  createdAt: number;
  event: Event;
  /** Made on this device, so its signature needn't be checked again. */
  mine?: boolean;
}

/** Signed events waiting to reach the relays. */
export interface OutboxEntry {
  eventId: string;
  slot: string;
  event: Event;
  queuedAt: number;
}

export interface Prefs {
  id: 'prefs';
  largeText: boolean;
  /** A random id for this device, used in "joined" markers. */
  device?: string;
  /** Last time this device said it's still in use (unix seconds). */
  joinedAt?: number;
  /** What kind of device it said it was then (JSON), so a change (installed, gift button added) is said again. */
  joinedKind?: string;
  /** Getting set up on this device (setup.ts): when the step was first shown, and when it was finished. */
  setup?: { startedAt?: number; doneAt?: number };
  /** The one-time how-to after setup was seen or skipped. */
  tourSeen?: boolean;
  /** When this person first opened the app here: things before it don't count as "new". */
  since?: number;
  /** pubkey -> when their list was last opened here. */
  seen?: Record<string, number>;
  /** Removal notices already dismissed (item ids). */
  dismissed?: string[];
  /** The first-time "About you" step was finished or skipped here: it never shows again. */
  aboutAsked?: boolean;
  /** Tips already dismissed with Got it (copy ids, like "myList.secretNote"). */
  tips?: string[];
  /** Imported list URL -> the person it went to, so the next import goes straight there. */
  importTargets?: Record<string, string>;
}

export class RegistryDB extends Dexie {
  identity!: EntityTable<Identity, 'id'>;
  events!: EntityTable<StoredEvent, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'eventId'>;
  prefs!: EntityTable<Prefs, 'id'>;

  constructor(name = 'family-registry') {
    super(name);
    this.version(1).stores({ identity: 'id', items: 'id, updatedAt', outbox: 'eventId, dTag, queuedAt', prefs: 'id' });
    this.version(2).stores({
      identity: 'id',
      items: null,
      events: 'id, &slot, createdAt',
      outbox: 'eventId, &slot, queuedAt',
      prefs: 'id',
    }).upgrade(async tx => {
      // Milestone 1 kept one group's details flat on the identity, and items in their own table.
      // The outbox already holds the newest signed event for every item, so those become the events.
      await tx.table('identity').toCollection().modify((id: Record<string, unknown>) => {
        id.groups = [{ words: id.groupWords, organizer: id.organizerWords, tag: id.groupTag, key: id.groupKey }];
        for (const k of ['groupWords', 'organizerWords', 'groupTag', 'groupKey', 'isOrganizer']) delete id[k];
      });
      const old = await tx.table('outbox').toArray() as { event: Event }[];
      await tx.table('outbox').clear();
      for (const { event } of old) {
        const slot = `${event.pubkey}:${event.kind}:${event.tags.find(t => t[0] === 'd')?.[1] ?? ''}`;
        await tx.table('events').put({ id: event.id, slot, createdAt: event.created_at, event, mine: true });
        await tx.table('outbox').put({ eventId: event.id, slot, event, queuedAt: Date.now() });
      }
    });
  }
}

export let db = new RegistryDB();

/** Tests use a fresh database each time. */
export function useDatabase(next: RegistryDB) {
  db = next;
}
