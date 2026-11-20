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
  private subs: SubCloser[] = [];
  private tags: string[] = [];
  private hidden: string[] = [];
  private flushing = false;
  /** Something was published while a flush was running: go round again. */
  private again = false;
  private timer?: ReturnType<typeof setInterval>;
  status: SyncStatus = navigator.onLine ? 'connecting' : 'offline';
  private listeners = new Set<(s: SyncStatus) => void>();

  onStatus(fn: (s: SyncStatus) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private setStatus(s: SyncStatus) { this.status = s; this.listeners.forEach(fn => fn(s)); }

  /**
   * Starts (or restarts, when groups or people change) listening. `tags` are the groups'
   * tags; `hidden` are the hidden tags of everyone *except* this person, so claims on their
   * items and surprise ideas for them are never even downloaded here.
   */
  listen(tags: string[], hidden: string[] = []) {
    if (tags.join() === this.tags.join() && hidden.join() === this.hidden.join() && this.subs.length) return;
    this.subs.forEach(s => s.close());
    this.subs = [];
    this.tags = tags;
    this.hidden = hidden;
    if (!tags.length) return;
    if (navigator.onLine) this.setStatus('connecting');
    const params = {
      onevent: (ev: Parameters<typeof ingest>[0]) => { void ingest(ev); },
      // The pool also reports "end of stored events" when relays can't be reached, so check the connection.
      oneose: () => this.setStatus(navigator.onLine ? 'synced' : 'offline'),
    };
    this.subs.push(this.pool.subscribeMany(RELAYS, { kinds: [KIND], '#h': tags }, params));
    if (hidden.length) this.subs.push(this.pool.subscribeMany(RELAYS, { kinds: [KIND], '#x': hidden }, { onevent: params.onevent }));
  }

  /** Sends one event straight out, without keeping it here (pairing codes). True if a relay took it. */
  async sendNow(event: Parameters<SimplePool['publish']>[1]): Promise<boolean> {
    try { await Promise.any(this.pool.publish(RELAYS, event)); return true; } catch { return false; }
  }

  /** Asks the relays once for events matching a filter, waiting at most `ms`. */
  fetchOnce(filter: Parameters<SimplePool['querySync']>[1], ms = 6000): Promise<Parameters<typeof ingest>[0][]> {
    return this.pool.querySync(RELAYS, filter, { maxWait: ms });
  }

  /** Whether the pool is connected to a relay right now (its keys are normalized addresses). */
  private reached(url: string) {
    const bare = url.replace(/\/+$/, '');
    return [...this.pool.listConnectionStatus()].some(([u, on]) => on && u.replace(/\/+$/, '') === bare);
  }

  /**
   * Makes sure every relay has what this person wrote. Sending stops once one relay takes an
   * event, so a relay can miss some; a device that can only reach that relay (a school network,
   * parental controls) would then miss them too. Each relay is asked which of these it has, and
   * gets the rest. Relays that can't be reached are skipped.
   */
  async repair(events: Parameters<typeof ingest>[0][]): Promise<number> {
    if (!navigator.onLine || !events.length) return 0;
    let sent = 0;
    await Promise.all(RELAYS.map(async url => {
      const have = new Set<string>();
      for (let i = 0; i < events.length; i += 100) {
        const ids = events.slice(i, i + 100).map(e => e.id);
        const got = await this.pool.querySync([url], { ids }, { maxWait: 6000 }).catch(() => null);
        if (!got || !this.reached(url)) return;
        got.forEach(e => have.add(e.id));
      }
      for (const ev of events) {
        if (have.has(ev.id)) continue;
        try { await Promise.any(this.pool.publish([url], ev)); sent++; } catch { /* that relay said no (an older version, say) */ }
      }
    }));
    return sent;
  }

  /** For the connection check in Settings: each relay, whether it answered, and how many of the family's events it has. */
  async check(tags: string[]): Promise<{ url: string; reached: boolean; events: number }[]> {
    return Promise.all(RELAYS.map(async url => {
      const got = await this.pool.querySync([url], { kinds: [KIND], '#h': tags }, { maxWait: 6000 }).catch(() => [] as unknown[]);
      return { url, reached: this.reached(url), events: got.length };
    }));
  }

  /** What this device asks the relays for (used by the privacy tests). */
  get filters() { return { h: [...this.tags], x: [...this.hidden] }; }

  async flush() {
    if (!navigator.onLine) return;
    if (this.flushing) { this.again = true; return; }
    this.flushing = true;
    this.again = false;
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
      if (this.again) void this.flush();
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
    this.subs.forEach(s => s.close());
    this.subs = [];
    this.tags = [];
    this.hidden = [];
    removeEventListener('online', this.online);
    removeEventListener('offline', this.offline);
    clearInterval(this.timer);
  }

  private online = () => {
    const [tags, hidden] = [this.tags, this.hidden];
    this.tags = [];
    this.listen(tags, hidden);
    void this.flush();
  };
  private offline = () => this.setStatus('offline');
}

export const sync = new SyncEngine();
