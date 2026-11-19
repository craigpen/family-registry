/*
 * Background worker: does the parts that must outlive the popup. A popup closes the moment
 * it loses focus (opening the app's tab is enough), so a list import runs here: load the whole
 * Amazon list, save its photos, open the app's /import page, and hand the list over.
 * Progress shows on the toolbar icon's badge.
 */
/* global chrome */
'use strict';

const api = typeof browser !== 'undefined' ? browser : chrome; // eslint-disable-line no-undef
const DEFAULT_APP = 'https://craigpen.github.io/family-registry/';
const MAX_THUMB = 30000;

async function appUrl() {
  const { app } = await api.storage.sync.get('app');
  return app || DEFAULT_APP;
}

const badge = text => {
  api.action.setBadgeBackgroundColor({ color: '#CF4339' });
  api.action.setBadgeText({ text });
};

/* ---------- Photos: shrink to a small embedded thumbnail ---------- */

async function hasPhotoPermission() {
  try { return await api.permissions.contains({ origins: ['https://*/*'] }); } catch { return false; }
}

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function thumbnail(url) {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error('photo ' + res.status);
  const bmp = await createImageBitmap(await res.blob());
  for (let side = 640; side >= 200; side = Math.round(side * 0.8)) {
    const s = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bmp.width * s)), Math.max(1, Math.round(bmp.height * s)));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.6, 0.45]) {
      let blob = await canvas.convertToBlob({ type: 'image/webp', quality });
      if (blob.type !== 'image/webp') blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      const data = `data:${blob.type};base64,${toBase64(new Uint8Array(await blob.arrayBuffer()))}`;
      if (data.length <= MAX_THUMB) return data;
    }
  }
  throw new Error('photo too big');
}

/* ---------- Importing a list ---------- */

/** Runs in the list's page: scrolls until Amazon has loaded the whole list (or a minute passes), then reads it. */
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

/** Runs in the app's /import page: hands the list over once the page says it's ready. */
function deliver(list) {
  const send = () => window.postMessage({ type: 'family-registry/import', list }, location.origin);
  window.addEventListener('message', e => { if (e.source === window && e.data && e.data.type === 'family-registry/import-ready') send(); });
  send();
}

const waitForLoad = tabId => new Promise(resolve => {
  const done = (id, info) => {
    if (id !== tabId || info.status !== 'complete') return;
    api.tabs.onUpdated.removeListener(done);
    resolve();
  };
  api.tabs.onUpdated.addListener(done);
});

async function importList(tabId, toPanel) {
  badge('…');
  await api.scripting.executeScript({ target: { tabId }, files: ['extract.js'] });
  const [res] = await api.scripting.executeScript({ target: { tabId }, func: loadWholeList });
  const list = res && res.result;
  if (!list || !list.items.length) { badge('!'); return { ok: false, reason: 'empty' }; }

  const items = [];
  for (const [i, it] of list.items.entries()) {
    let image = it.image || '';
    // Checked each time: the person may allow photos while the list is loading.
    if (image && (await hasPhotoPermission())) {
      try { image = await thumbnail(image.replace(/\._[^.]+_\./, '._SL500_.')); } catch { /* keep the shop's link */ }
    }
    items.push({ ...it, image });
    badge(`${i + 1}/${list.items.length}`.slice(-4));
  }

  const list2 = { source: 'amazon', name: list.name, url: list.url, items };
  if (toPanel) {
    // The side panel is showing the app's /import page: leave the list for it to collect.
    await api.storage.session.set({ pendingImport: list2 });
    api.runtime.sendMessage({ type: 'import-waiting' }).catch(() => {});
    badge('');
    return { ok: true, count: items.length };
  }
  const appTab = await api.tabs.create({ url: new URL('import', await appUrl()).href });
  await waitForLoad(appTab.id);
  await api.scripting.executeScript({
    target: { tabId: appTab.id },
    args: [list2],
    func: deliver,
  });
  badge('');
  return { ok: true, count: items.length };
}

api.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === 'import-list') {
    importList(msg.tabId, !!msg.toPanel).then(reply, e => { badge('!'); reply({ ok: false, reason: String(e && e.message || e) }); });
    return true; // reply comes later
  }
  return false;
});
