import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { copy } from '../copy.ts';

interface ToastMsg { id: number; body: ReactNode; undo?: () => void; action?: { label: string; run: () => void }; sticky?: boolean }
type Show = (body: ReactNode, opts?: { undo?: () => void; action?: ToastMsg['action']; sticky?: boolean }) => void;

const Ctx = createContext<Show>(() => {});
export const useToast = () => useContext(Ctx);

/** Short messages with an optional Undo: the app's answer to "Are you sure?" dialogs. */
export function ToastHost({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback<Show>((body, opts = {}) => {
    clearTimeout(timer.current);
    setMsg({ id: Date.now(), body, ...opts });
  }, []);

  useEffect(() => {
    if (!msg || msg.sticky) return;
    timer.current = setTimeout(() => setMsg(null), msg.undo ? 6000 : 3500);
    return () => clearTimeout(timer.current);
  }, [msg]);

  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status" key={msg.id}>
          <span>{msg.body}</span>
          {msg.undo && <button onClick={() => { msg.undo!(); setMsg(null); }}>{copy.common.undo}</button>}
          {msg.action && <button onClick={() => { msg.action!.run(); setMsg(null); }}>{msg.action.label}</button>}
        </div>
      )}
    </Ctx.Provider>
  );
}
