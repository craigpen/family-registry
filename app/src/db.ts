import Dexie, { type EntityTable } from 'dexie';
import type { Event } from 'nostr-tools/pure';

/** This device's identity. Secrets stay on the device (and in the person's link). */
export interface Identity {
  id: 'me';
  name: string;
  memberWords: string[];
  groupWords: string[];
  organizerWords: string[];
  /** Hex. Kept so the slow key derivation runs only once. */
  secretKey: string;
  pubkey: string;
  groupTag: string;
  groupKey: string;
  isOrganizer: boolean;
  welcomed: boolean;
}

/** One item on the person's own list, as this device last saved it. */
export interface LocalItem {
  id: string;
  title: string;
  links: string[];
  image?: string;
  price?: string;
  notes?: string;
  reallyWant: boolean;
  seenAt?: string;
  /** Hex item key K; edits reuse it so everyone who could read the item still can. */
  itemKey: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
  /** Set when the person marks it "Got it" (milestone 3 adds the giver's reveal). */
  receivedAt?: number;
}

/** Signed events waiting to go to the relays (sent once sync arrives in milestone 2). */
export interface OutboxEntry {
  eventId: string;
  dTag: string;
  event: Event;
  queuedAt: number;
}

export interface Prefs {
  id: 'prefs';
  largeText: boolean;
}

export class RegistryDB extends Dexie {
  identity!: EntityTable<Identity, 'id'>;
  items!: EntityTable<LocalItem, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'eventId'>;
  prefs!: EntityTable<Prefs, 'id'>;

  constructor(name = 'family-registry') {
    super(name);
    this.version(1).stores({
      identity: 'id',
      items: 'id, updatedAt',
      outbox: 'eventId, dTag, queuedAt',
      prefs: 'id',
    });
  }
}

export let db = new RegistryDB();

/** Tests use a fresh database each time. */
export function useDatabase(next: RegistryDB) {
  db = next;
}
