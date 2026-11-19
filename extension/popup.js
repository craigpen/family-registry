/*
 * The extension's popup. Reads the page you're on with the shared extract.js, then either
 * opens the wish list's Add sheet filled in (/add#url=…&title=…&image=…), or, on an Amazon
 * list, imports the whole list (/import, handed over with window messages).
 * PLAN.md section 7.
 */
/* global chrome, FamilyRegistryExtract */
'use strict';

const DEFAULT_APP = 'https://craigpen.github.io/family-registry/';
const MAX_THUMB = 30000;
const $main = document.getElementById('main');

const api = typeof browser !== 'undefined' ? browser : chrome; // eslint-disable-line no-undef

async function appUrl() {
  const { app } = await api.storage.sync.get('app');
  return app || DEFAULT_APP;
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
}
const show = (...nodes) => { $main.replaceChildren(...nodes); };
const message = (title, text) => show(el('h1', {}, title), el('p', { class: 'muted' }, text));

/* ---------- Photos: shrink to a small embedded thumbnail, like the app does ---------- */

async function hasPhotoPermission() {
  try { return await api.permissions.contains({ origins: ['https://*/*'] }); } catch { return false; }
}
/** Asked once, from a click: lets the extension save shop photos, which break if only linked. */
async function askPhotoPermission() {
  try { return await api.permissions.request({ origins: ['https://*/*'] }); } catch { return false; }
}

async function thumbnail(url) {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error('photo ' + res.status);
  const bmp = await createImageBitmap(await res.blob());
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  for (let side = 640; side >= 200; side = Math.round(side * 0.8)) {
    const s = Math.min(1, side / Math.max(bmp.width, bmp.height));
    canvas.width = Math.max(1, Math.round(bmp.width * s));
    canvas.height = Math.max(1, Math.round(bmp.height * s));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const q of [0.8, 0.6, 0.45]) {
      const data = canvas.toDataURL('image/webp', q);
      if (data.length <= MAX_THUMB) return data;
    }
  }
  throw new Error('photo too big');
}

/** Thumbnails where we can; the shop's own link where we can't. */
async function photos(urls, max) {
  if (!(await hasPhotoPermission())) return urls.slice(0, max);
  const out = [];
  for (const u of urls.slice(0, max)) {
    try { out.push(await thumbnail(u)); } catch { out.push(u); }
  }
  return out;
}

/* ---------- Reading the page ---------- */

async function run(tabId, func, args = []) {
  const [res] = await api.scripting.executeScript({ target: { tabId }, func, args });
  return res && res.result;
}

const isAmazonList = url => /amazon\.[a-z.]+\/(hz\/wishlist|wishlist|registry\/wishlist|gp\/registry\/wishlist)/.test(url);

/** Runs in the page: scrolls until Amazon has loaded the whole list (or a minute passes), then reads it. */
async function loadWholeList() {
  const read = () => globalThis.FamilyRegistryExtract.readAmazonList(document, location.href);
  let last = -1;
  for (let i = 0, still = 0; i < 60; i++) {
    const r = read();
    if (r.complete) break;
    still = r.items.length === last ? still + 1 : 0;
    if (still >= 4) break;
    last = r.items.length;
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(res => setTimeout(res, 1000));
  }
  window.scrollTo(0, 0);
  return read();
}

async function main() {
  // popup.html?tab=<id> reads a given tab (used by the automated tests, which open the popup as a page).
  const forced = Number(new URLSearchParams(location.search).get('tab'));
  const [tab] = forced ? [await api.tabs.get(forced)] : await api.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https?:/.test(tab.url || '')) return message('Nothing to add here', 'Open a shop’s page for something you’d like, then click the gift again.');
  try {
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['extract.js'] });
  } catch {
    return message('Can’t read this page', 'The browser doesn’t let extensions read this kind of page.');
  }
  if (isAmazonList(tab.url)) return showList(tab);
  const found = await run(tab.id, () => globalThis.FamilyRegistryExtract.extract(document, location.href));
  showProduct(tab, found);
}

/* ---------- One thing ---------- */

function showProduct(tab, found) {
  let chosen = found.images[0] || '';
  const title = el('input', { class: 'field', value: found.title, 'aria-label': 'What is it?' });
  const cands = el('div', { class: 'cands', role: 'group', 'aria-label': 'Pick the right picture' },
    found.images.map(src => el('button', { 'aria-pressed': String(src === chosen), on: { click: e => {
      chosen = src;
      for (const b of cands.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
    } } }, el('img', { src, alt: '', referrerpolicy: 'no-referrer' }))));
  const add = el('button', { class: 'primary', on: { click: async () => {
    add.disabled = true;
    add.textContent = 'Opening…';
    if (!(await hasPhotoPermission())) await askPhotoPermission();
    const images = await photos([chosen, ...found.images.filter(i => i !== chosen)], 3);
    const p = new URLSearchParams();
    p.set('url', found.url);
    if (title.value.trim()) p.set('title', title.value.trim());
    for (const i of images) p.append('image', i);
    if (found.price) p.set('price', found.price);
    if (found.site) p.set('site', found.site);
    await api.tabs.create({ url: new URL('add', await appUrl()).href + '#' + p.toString() });
    window.close();
  } } }, 'Add to my wish list');
  show(
    el('h1', {}, 'Add to my wish list'),
    el('p', { class: 'muted' }, [found.site, found.price].filter(Boolean).join(' · ') || 'Check the details, then add it.'),
    title,
    found.images.length ? cands : null,
    add,
  );
}

/* ---------- A whole Amazon list ---------- */

function showList(tab) {
  const go = el('button', { class: 'primary', on: { click: () => importList(tab) } }, 'Import this list');
  show(
    el('h1', {}, 'Import this Amazon list'),
    el('p', { class: 'muted' }, 'Everything on it comes into your wish list app. You choose whose list it goes on, and untick anything you don’t want.'),
    go,
  );
}

async function importList(tab) {
  if (!(await hasPhotoPermission())) await askPhotoPermission();
  const bar = el('i');
  const status = el('p', { class: 'muted' }, 'Loading the whole list…');
  show(el('h1', {}, 'Importing'), status, el('div', { class: 'bar' }, bar));
  const list = await run(tab.id, loadWholeList);
  if (!list || !list.items.length) return message('No items found', 'Make sure the list has loaded, then try again. If it still doesn’t work, the list page may have changed.');
  const items = [];
  for (const [i, it] of list.items.entries()) {
    const [image] = it.image ? await photos([it.image.replace(/\._[^.]+_\./, '._SL500_.')], 1) : [''];
    items.push({ ...it, image });
    status.textContent = `Saving photos: ${i + 1} of ${list.items.length}`;
    bar.style.width = `${Math.round(((i + 1) / list.items.length) * 100)}%`;
  }
  const payload = { source: 'amazon', name: list.name, url: list.url, items };
  const app = await appUrl();
  const appTab = await api.tabs.create({ url: new URL('import', app).href });
  // Hand the list over once the app page has loaded and said it's ready.
  api.tabs.onUpdated.addListener(function done(id, info) {
    if (id !== appTab.id || info.status !== 'complete') return;
    api.tabs.onUpdated.removeListener(done);
    api.scripting.executeScript({
      target: { tabId: appTab.id },
      args: [payload],
      func: list => {
        const send = () => window.postMessage({ type: 'family-registry/import', list }, location.origin);
        window.addEventListener('message', e => { if (e.source === window && e.data && e.data.type === 'family-registry/import-ready') send(); });
        send();
      },
    }).then(() => window.close());
  });
}

/* ---------- Settings ---------- */

const $app = document.getElementById('app');
appUrl().then(u => { $app.value = u; });
document.getElementById('save-app').addEventListener('click', async () => {
  let u = $app.value.trim();
  if (!u) return;
  if (!u.endsWith('/')) u += '/';
  try {
    const origin = new URL(u).origin + '/*';
    await api.permissions.request({ origins: [origin] });
  } catch { /* the default address is already allowed */ }
  await api.storage.sync.set({ app: u });
});

main().catch(e => message('Something went wrong', String(e && e.message || e)));
