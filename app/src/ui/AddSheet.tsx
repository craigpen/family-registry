import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, DownloadSimple, EyeSlash, Heart, Image as ImageIcon, LinkSimple, ListChecks, Scissors, Storefront, X } from '@phosphor-icons/react';
import { canShorten, guessFromLink, isGenericShareText, looksLikeUrl, normalizeUrl, shortTitle, type AddPrefill, type ItemState } from '@family-registry/core';
import type { ItemDraft } from '../items.ts';
import { shrinkPhoto } from '../photo.ts';
import { allowPagesAndRead, importListBesidePanel, inExtensionPanel, pageBesidePanel, type PanelPage } from '../panel.ts';
import { copy } from '../copy.ts';
import { Sheet } from './Sheet.tsx';
import { plural, rich, t } from './text.tsx';
import { detectDevice } from '../device.ts';

const c = copy.add;

const empty: ItemDraft = { title: '', links: [], reallyWant: false };

/**
 * Phones and tablets: offer Take a photo (straight to the camera) beside Choose a photo. Android's
 * photo picker no longer offers the camera itself. Computers keep the one Add a photo.
 */
const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
/**
 * Under the add choices: where a page someone's looking at comes in on this kind of device. iPhone
 * and iPad: Safari's Share (the family's Shortcut). Android: Share (the app). Computers: the extension.
 */
const platform = typeof navigator !== 'undefined' ? detectDevice().platform : 'desktop';

/** Pictures a helper offered: embedded thumbnails, or the shop's own https links. */
const candidatesOf = (p?: AddPrefill | null) => (p?.images ?? []).filter(i => i.startsWith('data:image/') || i.startsWith('https://')).slice(0, 6);

function fromPrefill(p: AddPrefill): ItemDraft {
  const guess = p.url ? guessFromLink(p.url, p.text) : undefined;
  // A shared title like "Check this deal out on Amazon" says nothing: the link's own words do better.
  const title = p.title && !isGenericShareText(p.title, guess?.site) ? p.title : guess?.title;
  return { ...empty, title: shortTitle(title || ''), links: p.url ? [p.url] : [], price: p.price, seenAt: p.site, notes: p.notes, image: candidatesOf(p)[0] };
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
  // In the extension's side panel, + offers the page beside it.
  const [fromPage, setFromPage] = useState<AddPrefill | null>(null);
  const [pageState, setPageState] = useState<'off' | 'checking' | 'found' | 'needs-permission' | 'list'>('off');
  const [pageList, setPageList] = useState<PanelPage['list']>();
  const source = prefill ?? fromPage;
  const cands = editing ? [] : candidatesOf(source);

  useEffect(() => {
    if (!open) return;
    const start = editing ? fromItem(editing) : prefill ? fromPrefill(prefill) : empty;
    setD(start);
    setLink(start.links[0] ?? '');
    setFound(prefill?.url && start.title ? c.filledFromLink : undefined);
    setPhotoError(undefined);
    setFromPage(null);
    setPageState('off');
    if (!editing && !prefill && inExtensionPanel()) {
      setPageState('checking');
      void pageBesidePanel().then(r => (r.list ? (setPageList(r.list), setPageState('list')) : fillFromPage(r.prefill, r.needsPermission)));
    }
  }, [open, editing, prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Fills the sheet from the page beside the panel (unless the person has started typing). */
  function fillFromPage(p: AddPrefill | null, needsPermission = false) {
    if (needsPermission) { setPageState('needs-permission'); return; }
    if (!p) { setPageState('off'); return; }
    setD(cur => (cur.title.trim() ? cur : fromPrefill(p)));
    setLink(cur => cur || p.url || '');
    setFromPage(p);
    setPageState('found');
  }

  function addSomethingElse() {
    setD(empty);
    setLink('');
    setFromPage(null);
    setPageState('off');
    titleRef.current?.focus();
  }

  const set = (patch: Partial<ItemDraft>) => setD(cur => ({ ...cur, ...patch }));

  function applyLink(raw: string) {
    setLink(raw);
    if (!looksLikeUrl(raw)) { set({ links: raw.trim() ? [raw.trim()] : [] }); return; }
    const url = normalizeUrl(raw);
    const g = guessFromLink(url);
    set({ links: [url], ...(d.title.trim() ? {} : { title: shortTitle(g.title ?? '') }) });
    if (!d.title.trim() && g.title) setFound(g.site ? t(c.filledFrom, { site: g.site }) : c.filledFromLink);
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
    <Sheet open={open} onClose={onClose} heading={editing ? c.editTitle : secret ? t(c.secretTitle, { name: forName ?? '' }) : forName ? t(c.helperTitle, { name: forName }) : c.mineTitle} headingStyle={{ marginBottom: 12 }}>
      {secret && <div className="secret"><EyeSlash weight="duotone" aria-hidden />{t(c.secretBanner, { name: forName ?? '' })}</div>}
      <input ref={titleRef} className="field" placeholder={c.what} aria-label={c.what} value={d.title} autoComplete="off"
        onChange={e => set({ title: e.target.value })} onPaste={onTitlePaste} onKeyDown={e => e.key === 'Enter' && save()} />
      {canShorten(d.title) && (
        <button className="shorten" onClick={() => set({ title: shortTitle(d.title) })}>
          <Scissors aria-hidden /> {t(c.shorten, { title: shortTitle(d.title) })}
        </button>
      )}
      {found && <div className="found"><CheckCircle weight="fill" aria-hidden />{found}</div>}
      {pageState === 'checking' && <p className="hint">{c.checkingPage}</p>}
      {pageState === 'found' && fromPage && (
        <div className="found">
          <CheckCircle weight="fill" aria-hidden />
          <span style={{ flex: 1 }}>{fromPage.site ? t(c.fromPageAt, { site: fromPage.site }) : c.fromPage}</span>
          <button className="inline-link" onClick={addSomethingElse}>{c.somethingElse}</button>
        </div>
      )}
      {pageState === 'list' && pageList && (
        <div className="card list-offer">
          <h3><ListChecks aria-hidden /> {c.listTitle}</h3>
          <p>{t(c.listText, { name: pageList.name, count: !pageList.count ? '' : pageList.count >= 10 ? t(c.listCountMore, { n: pageList.count }) : plural(c.listCount, pageList.count) })}</p>
          <button className="btn primary" onClick={() => { importListBesidePanel(); onClose(); }}><DownloadSimple weight="bold" aria-hidden /> {c.importList}</button>
        </div>
      )}
      {pageState === 'needs-permission' && (
        <button className="shorten" onClick={() => { setPageState('checking'); void allowPagesAndRead().then(r => (r.list ? (setPageList(r.list), setPageState('list')) : fillFromPage(r.prefill, false))); }}>
          <Storefront aria-hidden /> {c.fillFromPage}
        </button>
      )}

      {cands.length > 1 || (cands.length === 1 && !d.image) ? (
        <>
          <div className="hint" style={{ marginTop: 12 }}>{c.pickPicture}</div>
          <div className="cands" role="group" aria-label={c.picturesLabel}>
            {cands.map((src, i) => (
              <button key={src} className="photo cand" style={{ '--h': 30 } as React.CSSProperties} aria-pressed={d.image === src} onClick={() => set({ image: src })} aria-label={t(c.picture, { n: i + 1 })}>
                <img src={src} alt="" referrerPolicy="no-referrer" />
              </button>
            ))}
            {touch && <label className="cand own"><Camera aria-hidden />{c.takePhoto}<input type="file" accept="image/*" capture="environment" onChange={e => onPhoto(e.target.files?.[0])} /></label>}
            <label className="cand own"><ImageIcon aria-hidden />{c.myPhoto}<input type="file" accept="image/*" onChange={e => onPhoto(e.target.files?.[0])} /></label>
            {d.image && !cands.includes(d.image) && <span className="photo cand" aria-pressed="true" style={{ '--h': 30 } as React.CSSProperties}><img src={d.image} alt={c.yourPhoto} /></span>}
          </div>
        </>
      ) : d.image ? (
        <div className="preview">
          <span className="photo" style={{ '--h': 30 } as React.CSSProperties}><img src={d.image} alt={c.photoOfItem} /></span>
          <button className="x" onClick={() => set({ image: undefined })} aria-label={c.removePhoto}><X weight="bold" /></button>
        </div>
      ) : (
        <div className="quick">
          {touch && <label>
            <Camera weight="duotone" aria-hidden />{c.takePhoto}
            <input type="file" accept="image/*" capture="environment" onChange={e => onPhoto(e.target.files?.[0])} />
          </label>}
          <label>
            {touch ? <ImageIcon weight="duotone" aria-hidden /> : <Camera weight="duotone" aria-hidden />}{touch ? c.choosePhoto : c.addPhoto}
            <input type="file" accept="image/*" onChange={e => onPhoto(e.target.files?.[0])} />
          </label>
          <button onClick={paste}><LinkSimple weight="duotone" aria-hidden />{c.pasteLink}</button>
        </div>
      )}
      {!d.title && !d.image && !link && !inExtensionPanel() && <p className="hint">{rich(platform === 'ios' ? c.fromSafari : platform === 'android' ? c.fromAndroid : c.fromComputer)}</p>}
      {photoError && <div className="hint" role="alert"><ImageIcon aria-hidden /> {photoError}</div>}

      <label className="label" htmlFor="add-link">{c.link}</label>
      <input id="add-link" className="field small" inputMode="url" placeholder={c.linkPlaceholder} value={link} onChange={e => applyLink(e.target.value)} />
      <div className="two" style={{ marginTop: 10 }}>
        <input className="field small" placeholder={c.price} aria-label={c.price} value={d.price ?? ''} onChange={e => set({ price: e.target.value })} />
        <input className="field small" placeholder={c.where} aria-label={c.whereLabel} value={d.seenAt ?? ''} onChange={e => set({ seenAt: e.target.value })} />
      </div>
      <textarea className="field small" style={{ marginTop: 10 }} placeholder={c.notes} aria-label={c.notesLabel} value={d.notes ?? ''} onChange={e => set({ notes: e.target.value })} />
      <button className="toggle" aria-pressed={d.reallyWant} onClick={() => set({ reallyWant: !d.reallyWant })}>
        <span>{secret ? c.theyDLove : forName ? t(c.theyWant, { name: forName }) : c.iWant}</span><span className="heart"><Heart weight="fill" aria-hidden /></span>
      </button>
      <button className="btn primary" style={{ marginTop: 16 }} onClick={save} disabled={busy}>{copy.common.save}</button>
    </Sheet>
  );
}
