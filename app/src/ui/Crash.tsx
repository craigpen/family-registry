import { Component, type ReactNode } from 'react';
import { copy } from '../copy.ts';

/**
 * Starts over cleanly: drops the offline copy of the app (service worker and its caches, never
 * the family's data) and reloads, so the newest version comes down.
 */
export async function reloadFresh() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map(r => r.unregister()));
    const keys = await caches?.keys?.() ?? [];
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch { /* reload anyway */ }
  location.reload();
}

/**
 * Never a blank page: if anything on screen fails, say so, offer Reload (which also fetches a
 * fresh copy of the app), and show the error small, so it can be passed on to whoever helps.
 */
export class Crash extends Component<{ children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  override render() {
    const e = this.state.error;
    if (!e) return this.props.children;
    const c = copy.crash;
    return (
      <main className="app"><section className="screen welcome">
        <h1>{c.title}</h1>
        <p>{c.text}</p>
        <button className="btn primary" onClick={() => void reloadFresh()}>{c.reload}</button>
        <p className="hint" style={{ wordBreak: 'break-word', fontSize: '.75em' }}>{String(e.message || e).slice(0, 300)}</p>
      </section></main>
    );
  }
}
