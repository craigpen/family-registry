import { useRef, useState } from 'react';
import { Camera, Trash } from '@phosphor-icons/react';
import type { Person } from '@family-registry/core';
import { copy } from '../copy.ts';
import { shrinkFace } from '../photo.ts';
import { Avatar } from './bits.tsx';

const c = copy.face;

/**
 * The big round photo button: tap to take or pick a photo (phones offer the camera),
 * see it as it will show on your face, and remove it. No confirmations: whoever uses this offers Undo.
 */
export function FacePicker({ person, photo, onChange }: {
  person: Pick<Person, 'name' | 'color'>; photo?: string; onChange: (photo: string | null) => void | Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError(false);
    try { await onChange(await shrinkFace(file)); }
    catch { setError(true); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div className="face-picker">
      <button className={`face-button${photo ? ' has-photo' : ''}`} onClick={() => input.current?.click()} disabled={busy}
        aria-label={photo ? c.change : c.add} aria-busy={busy}>
        {photo
          ? <Avatar person={{ ...person, photo }} size="xl" />
          : <span className="face-empty"><Camera weight="duotone" aria-hidden /><span>{busy ? c.working : c.add}</span></span>}
        {photo && <span className="face-badge" aria-hidden><Camera weight="fill" /></span>}
      </button>
      <input ref={input} type="file" accept="image/*" hidden tabIndex={-1} onChange={e => void pick(e.target.files?.[0])} />
      {error && <p className="hint" role="alert" style={{ textAlign: 'center' }}>{c.unreadable}</p>}
      {photo && !busy && <button className="btn quiet" onClick={() => void onChange(null)}><Trash aria-hidden /> {c.remove}</button>}
    </div>
  );
}
