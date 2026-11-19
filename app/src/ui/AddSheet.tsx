import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, EyeSlash, Heart, Image as ImageIcon, LinkSimple, X } from '@phosphor-icons/react';
import { guessFromLink, looksLikeUrl, normalizeUrl, type AddPrefill, type ItemState } from '@family-registry/core';
import type { ItemDraft } from '../items.ts';
import { shrinkPhoto } from '../photo.ts';
import { Sheet } from './Sheet.tsx';

const empty: ItemDraft = { title: '', links: [], reallyWant: false };

/** Pictures a helper offered: embedded thumbnails, or the shop's own https links. */
const candidatesOf = (p?: AddPrefill | null) => (p?.images ?? []).filter(i => i.startsWith('data:image/') || i.startsWith('https://')).slice(0, 6);

function fromPrefill(p: AddPrefill): ItemDraft {
  const guess = p.url ? guessFromLink(p.url, p.text) : undefined;
  return { ...empty, title: p.title || guess?.title || '', links: p.url ? [p.url] : [], price: p.price, seenAt: p.site, image: candidatesOf(p)[0] };
}

function fromItem(it: ItemState): ItemDraft {
  const { title, links, image, price, notes, reallyWant, seenAt } = it.content;
  return { title, links, image, price, notes, reallyWant, seenAt };
}

/** The one Add sheet every path ends in (PLAN.md section 7). Also edits an existing item. */
export function AddSheet({ open, onClose, onSave, editing, prefill, forName, secret }: {
  open: boolean; onClose: () => void; onSave: (d: ItemDraft) => Promise<void>;
  editing?: ItemState; prefill?: AddPrefill | null;
  /** Set when adding to a list you help keep, or a secret idea for someone. */
  forName?: string;
  secret?: boolean;
}) {
  const [d, setD] = useState<ItemDraft>(empty);
  const [link, setLink] = useState('');
  const [found, setFound] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const cands = editing ? [] : candidatesOf(prefill);

  useEffect(() => {
    if (!open) return;
    const start = editing ? fromItem(editing) : prefill ? fromPrefill(prefill) : empty;
    setD(start);
    setLink(start.links[0] ?? '');
    setFound(prefill?.url && start.title ? 'Filled in from the link. Check it looks right.' : undefined);
    setPhotoError(undefined);
  }, [open, editing, prefill]);

  const set = (patch: Partial<ItemDraft>) => setD(cur => ({ ...cur, ...patch }));

  function applyLink(raw: string) {
    setLink(raw);
    if (!looksLikeUrl(raw)) { set({ links: raw.trim() ? [raw.trim()] : [] }); return; }
    const url = normalizeUrl(raw);
    const g = guessFromLink(url);
    set({ links: [url], ...(d.title.trim() ? {} : { title: g.title ?? '' }) });
    if (!d.title.trim() && g.title) setFound(`Filled in from ${g.site ?? 'the link'}. Check it looks right.`);
  }

  // Pasting a link into "What is it?" moves it to the link field and fills the title.
  function onTitlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    if (looksLikeUrl(text) && !d.title.trim()) {
      e.preventDefault();
      applyLink(text);
    }
  }

  async function onPhoto(file?: File) {
    if (!file) return;
    setPhotoError(undefined);
    try { set({ image: await shrinkPhoto(file) }); } catch (err) { setPhotoError((err as Error).message); }
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) applyLink(text);
    } catch {
      document.getElementById('add-link')?.focus();
    }
  }

  async function save() {
    if (!d.title.trim()) { titleRef.current?.focus(); return; }
    setBusy(true);
    try { await onSave({ ...d, links: d.links.filter(l => l.trim()) }); } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose} heading={editing ? 'Edit' : secret ? `Secret idea for ${forName}` : forName ? `Add to ${forName}'s list` : 'Add to my list'} headingStyle={{ marginBottom: 12 }}>
      {secret && <div className="secret"><EyeSlash weight="duotone" aria-hidden />{forName} won't see this. Everyone else will.</div>}
      <input ref={titleRef} className="field" placeholder="What is it?" aria-label="What is it?" value={d.title} autoComplete="off"
        onChange={e => set({ title: e.target.value })} onPaste={onTitlePaste} onKeyDown={e => e.key === 'Enter' && save()} />
      {found && <div className="found"><CheckCircle weight="fill" aria-hidden />{found}</div>}

      {cands.length > 1 || (cands.length === 1 && !d.image) ? (
        <>
          <div className="hint" style={{ marginTop: 12 }}>Pick the right picture</div>
          <div className="cands" role="group" aria-label="Pictures from the shop">
            {cands.map((c, i) => (
              <button key={c} className="photo cand" style={{ '--h': 30 } as React.CSSProperties} aria-pressed={d.image === c} onClick={() => set({ image: c })} aria-label={`Picture ${i + 1}`}>
                <img src={c} alt="" referrerPolicy="no-referrer" />
              </button>
            ))}
            <label className="cand own"><Camera aria-hidden />My photo<input type="file" accept="image/*" onChange={e => onPhoto(e.target.files?.[0])} /></label>
            {d.image && !cands.includes(d.image) && <span className="photo cand" aria-pressed="true" style={{ '--h': 30 } as React.CSSProperties}><img src={d.image} alt="Your photo" /></span>}
          </div>
        </>
      ) : d.image ? (
        <div className="preview">
          <span className="photo" style={{ '--h': 30 } as React.CSSProperties}><img src={d.image} alt="Photo of the item" /></span>
          <button className="x" onClick={() => set({ image: undefined })} aria-label="Remove photo"><X weight="bold" /></button>
        </div>
      ) : (
        <div className="quick">
          <label>
            <Camera weight="duotone" aria-hidden />Add a photo
            <input type="file" accept="image/*" onChange={e => onPhoto(e.target.files?.[0])} />
          </label>
          <button onClick={paste}><LinkSimple weight="duotone" aria-hidden />Paste a link</button>
        </div>
      )}
      {photoError && <div className="hint" role="alert"><ImageIcon aria-hidden /> {photoError}</div>}

      <label className="label" htmlFor="add-link">Link (optional)</label>
      <input id="add-link" className="field small" inputMode="url" placeholder="https://…" value={link} onChange={e => applyLink(e.target.value)} />
      <div className="two" style={{ marginTop: 10 }}>
        <input className="field small" placeholder="Price" aria-label="Price" value={d.price ?? ''} onChange={e => set({ price: e.target.value })} />
        <input className="field small" placeholder="Where? (optional)" aria-label="Where to get it" value={d.seenAt ?? ''} onChange={e => set({ seenAt: e.target.value })} />
      </div>
      <textarea className="field small" style={{ marginTop: 10 }} placeholder="Notes: size, colour…" aria-label="Notes" value={d.notes ?? ''} onChange={e => set({ notes: e.target.value })} />
      <button className="toggle" aria-pressed={d.reallyWant} onClick={() => set({ reallyWant: !d.reallyWant })}>
        <span>{secret ? 'They’d really love this' : forName ? `${forName} really wants this` : 'I really want this'}</span><span className="heart"><Heart weight="fill" aria-hidden /></span>
      </button>
      <button className="btn primary" style={{ marginTop: 16 }} onClick={save} disabled={busy}>Save</button>
    </Sheet>
  );
}
