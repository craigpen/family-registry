import { useRef, useState } from 'react';
import { Aperture, Camera, Trash } from '@phosphor-icons/react';
import type { Person } from '@family-registry/core';
import { copy } from '../copy.ts';
import { shrinkFace } from '../photo.ts';
import { Avatar } from './bits.tsx';

const c = copy.face;
/** Phones and tablets: the ones with a camera worth pointing at a face. */
const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/**
 * The big round photo button: tap to pick a photo, see it as it will show on your face, and remove it.
 * Phones and tablets also get Take a photo, which opens the camera straight away (the front one for
 * your own face, the back one when it's someone else's). No confirmations: whoever uses this offers Undo.
 */
export function FacePicker({ person, photo, onChange, selfie }: {
  person: Pick<Person, 'name' | 'color'>; photo?: string; onChange: (photo: string | null) => void | Promise<void>;
  /** It's the viewer's own face, so the camera starts facing them. */
  selfie?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true); setError(false);
    try { await onChange(await shrinkFace(file)); }
    catch { setError(true); }
    finally {
      setBusy(false);
      for (const el of [input.current, camera.current]) if (el) el.value = '';
    }
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
      <input ref={camera} type="file" accept="image/*" capture={selfie ? 'user' : 'environment'} hidden tabIndex={-1}
        onChange={e => void pick(e.target.files?.[0])} />
      {error && <p className="hint" role="alert" style={{ textAlign: 'center' }}>{c.unreadable}</p>}
      {!busy && (touch || photo) && (
        <div className="face-actions">
          {touch && <button className="btn quiet" onClick={() => camera.current?.click()}><Aperture aria-hidden /> {c.take}</button>}
          {photo && <button className="btn quiet" onClick={() => void onChange(null)}><Trash aria-hidden /> {c.remove}</button>}
        </div>
      )}
    </div>
  );
}
