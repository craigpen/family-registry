import { SimplePool } from 'nostr-tools/pool';
import type { SubCloser } from 'nostr-tools/abstract-pool';
import { KIND } from '@family-registry/core';
import { db } from './db.ts';
import { ingest, whenPublished } from './store.ts';

/** Public relays checked in milestone 2 (tools/check-relays.mjs). Builds can override with VITE_RELAYS. */
const DEFAULT_RELAYS = ['wss://nos.lol', 'wss://relay.primal.net', 'wss://offchain.pub', 'wss://nostr.mom'];
export const RELAYS: string[] = (import.meta.env.VITE_RELAYS as string | undefined)?.split(',').map(s => s.trim()).filter(Boolean) ?? DEFAULT_RELAYS;

export type SyncStatus = 'offline' | 'connecting' | 'synced';

/**
 * Keeps this device's copy in step with the relays: listens for the family's events,
 * and sends the outbox whenever there's a connection. Every write goes to all relays;
 * one acceptance is enough to call it sent.
 */
export class SyncEngine {
  private pool = new SimplePool();
  private sub?: SubCloser;
  private tags: string[] = [];
  private flushing = false;
  private timer?: ReturnType<typeof setInterval>;
  status: SyncStatus = navigator.onLine ? 'connecting' : 'offline';
  private listeners = new Set<(s: SyncStatus) => void>();

  onStatus(fn: (s: SyncStatus) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private setStatus(s: SyncStatus) { this.status = s; this.listeners.forEach(fn => fn(s)); }

  /** Starts (or restarts, when groups change) listening to the given group tags. */
  listen(tags: string[]) {
    if (tags.join() === this.tags.join() && this.sub) return;
    this.sub?.close();
    this.tags = tags;
    if (!tags.length) return;
    if (navigator.onLine) this.setStatus('connecting');
    this.sub = this.pool.subscribeMany(RELAYS, { kinds: [KIND], '#h': tags }, {
      onevent: ev => { void ingest(ev); },
      // The pool also reports "end of stored events" when relays can't be reached, so check the connection.
      oneose: () => this.setStatus(navigator.onLine ? 'synced' : 'offline'),
    });
  }

  async flush() {
    if (this.flushing || !navigator.onLine) return;
    this.flushing = true;
    try {
      for (const entry of await db.outbox.orderBy('queuedAt').toArray()) {
        try {
          await Promise.any(this.pool.publish(RELAYS, entry.event));
          await db.outbox.delete(entry.eventId);
        } catch {
          break; // No relay took it; try again later.
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  start() {
    whenPublished(() => void this.flush());
    addEventListener('online', this.online);
    addEventListener('offline', this.offline);
    this.timer = setInterval(() => void this.flush(), 30_000);
    void this.flush();
  }

  stop() {
    this.sub?.close();
    this.sub = undefined;
    this.tags = [];
    removeEventListener('online', this.online);
    removeEventListener('offline', this.offline);
    clearInterval(this.timer);
  }

  private online = () => {
    const tags = this.tags;
    this.tags = [];
    this.listen(tags);
    void this.flush();
  };
  private offline = () => this.setStatus('offline');
}

export const sync = new SyncEngine();
