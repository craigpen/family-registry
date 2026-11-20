import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Screens and sheets kept in the browser's history, so the phone's back button (and Android's back
 * gesture) closes the open sheet or goes back a screen instead of leaving the app.
 *
 * React state is what's shown; history mirrors it. Each entry holds `{ nav: { screen, sheet, depth } }`,
 * where depth counts the app's own entries below it (0 is the first one), so Back never walks out of the app.
 * The URL is never changed here.
 */
interface Entry<S, H> { screen: S; sheet: H | null; depth: number }

export function useNav<S, H>(initial: S) {
  const [nav, setNavState] = useState<Entry<S, H>>({ screen: initial, sheet: null, depth: 0 });
  const ref = useRef(nav);
  /** While a history.back() is on its way: what to show once it lands (a fresh push, or a replace). */
  const waiting = useRef<null | { then?: (landed: Entry<S, H>) => Entry<S, H> | { push: Entry<S, H> } }>(null);

  const show = (e: Entry<S, H>) => { ref.current = e; setNavState(e); };
  const write = (e: Entry<S, H>, push: boolean) => {
    const state = { ...(history.state ?? {}), nav: e };
    if (push) history.pushState(state, ''); else history.replaceState(state, '');
    show(e);
  };

  useEffect(() => {
    // After a reload, start on the first screen but keep the count, so Back still stops at the app's edge.
    const here = (history.state?.nav as Entry<S, H> | undefined);
    write({ ...ref.current, depth: here?.depth ?? 0 }, false);
    const onPop = (ev: PopStateEvent) => {
      const landed = (ev.state?.nav as Entry<S, H> | undefined) ?? { screen: initial, sheet: null, depth: 0 };
      const w = waiting.current;
      waiting.current = null;
      const next = w?.then?.(landed);
      if (!next) show(landed);
      else if ('push' in next) write(next.push, true);
      else write(next, false);
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Waits for a back already on its way before changing anything else. */
  const after = (fn: (landed: Entry<S, H>) => Entry<S, H> | { push: Entry<S, H> }) => {
    const w = waiting.current!;
    const prev = w.then;
    w.then = landed => {
      const first = prev ? prev(landed) : landed;
      if (!('push' in first)) return fn(first);
      const next = fn(first.push);
      return 'push' in next ? next : { push: next };
    };
  };

  /** Start over on a screen (arriving from a link, finishing setup): replaces the current entry. */
  const reset = useCallback((screen: S) => {
    if (waiting.current) return after(cur => ({ ...cur, screen, sheet: null }));
    write({ screen, sheet: null, depth: ref.current.depth }, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Go forward to a screen. From an open sheet, the sheet's entry becomes the new screen. */
  const go = useCallback((screen: S) => {
    if (waiting.current) return after(cur => ({ push: { screen, sheet: null, depth: cur.depth + 1 } }));
    const cur = ref.current;
    if (cur.sheet) write({ screen, sheet: null, depth: cur.depth }, false);
    else write({ screen, sheet: null, depth: cur.depth + 1 }, true);
    scrollTo(0, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** The on-screen back arrow: the same as the phone's Back, or `fallback` when there's nothing to go back to. */
  const back = useCallback((fallback: S) => {
    if (waiting.current) return after(cur => ({ ...cur, screen: fallback, sheet: null }));
    const cur = ref.current;
    if (cur.depth > 0 && !cur.sheet) history.back();
    else write({ screen: fallback, sheet: null, depth: cur.depth }, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Straight back to the first screen (the Family tab), unwinding everything since. */
  const home = useCallback((screen: S) => {
    const cur = ref.current;
    if (waiting.current) return after(c => ({ ...c, screen, sheet: null, depth: 0 }));
    if (cur.depth === 0) return write({ screen, sheet: null, depth: 0 }, false);
    waiting.current = { then: landed => ({ ...landed, screen, sheet: null }) };
    show({ screen, sheet: null, depth: 0 });
    history.go(-cur.depth);
    scrollTo(0, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Open, swap or close a sheet. Opening adds an entry; closing goes back over it. */
  const setSheet = useCallback((sheet: H | null) => {
    if (waiting.current) {
      return after(cur => sheet ? { push: { ...cur, sheet, depth: cur.depth + 1 } } : cur);
    }
    const cur = ref.current;
    if (sheet && cur.sheet) write({ ...cur, sheet }, false);
    else if (sheet) write({ ...cur, sheet, depth: cur.depth + 1 }, true);
    else if (cur.sheet) {
      if (cur.depth > 0) {
        waiting.current = {};
        show({ ...cur, sheet: null, depth: cur.depth - 1 });
        history.back();
      } else write({ ...cur, sheet: null }, false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => ({ screen: nav.screen, sheet: nav.sheet, go, back, home, reset, setSheet }),
    [nav, go, back, home, reset, setSheet]);
}
