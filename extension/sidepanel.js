/*
 * The side panel shows the wish list website itself, so it shares the website's sign-in and
 * is always the latest version. It also passes an imported list to the app's /import page.
 */
/* global chrome */
'use strict';

const api = typeof browser !== 'undefined' ? browser : chrome; // eslint-disable-line no-undef
const DEFAULT_APP = 'https://craigpen.github.io/family-registry/';
const frame = document.getElementById('app');
const view = new URLSearchParams(location.search).get('view');
let appOrigin = '';
let appReady = false;

async function start() {
  const { app } = await api.storage.sync.get('app');
  const url = new URL(view === 'import' ? 'import' : '', app || DEFAULT_APP);
  appOrigin = url.origin;
  frame.src = url.href;
}

/** Hands a waiting list (left by the background worker) to the app, once it's ready for it. */
async function deliverImport() {
  if (!appReady) return;
  const { pendingImport } = await api.storage.session.get('pendingImport');
  if (!pendingImport) return;
  await api.storage.session.remove('pendingImport');
  frame.contentWindow.postMessage({ type: 'family-registry/import', list: pendingImport }, appOrigin);
}

/** The tab beside this panel (sidepanel.html?tab=<id> picks one, for the automated tests). */
async function pageTab() {
  const forced = Number(new URLSearchParams(location.search).get('tab'));
  if (forced) return api.tabs.get(forced);
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * The app's + asks what's open beside the panel. Reading another tab needs permission to read
 * shop pages; if it's not granted yet, the app shows a button that asks for it (allowPages).
 */
async function describePage() {
  const tab = await pageTab();
  if (!tab || !/^https:/.test(tab.url || '')) return { found: null };
  if (!(await hasPhotoPermission())) return { found: null, needsPermission: true };
  try {
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['extract.js'] });
    const [res] = await api.scripting.executeScript({ target: { tabId: tab.id }, func: () => globalThis.FamilyRegistryExtract.extract(document, location.href) });
    const found = res && res.result;
    if (!found || !found.product) return { found: null };
    return { found: { ...found, images: await photos(found.images, 3) } };
  } catch {
    return { found: null };
  }
}

addEventListener('message', async e => {
  if (e.source !== frame.contentWindow || e.origin !== appOrigin || !e.data) return;
  const reply = msg => frame.contentWindow.postMessage({ ...msg, id: e.data.id }, appOrigin);
  if (e.data.type === 'family-registry/import-ready') {
    appReady = true;
    void deliverImport();
  } else if (e.data.type === 'fr/page-request') {
    reply({ type: 'fr/page', ...(await describePage()) });
  } else if (e.data.type === 'fr/allow-pages') {
    // The click was in the app, inside this panel: that click counts for this page too.
    const ok = await askPhotoPermission();
    reply({ type: 'fr/allowed', ok, ...(ok ? await describePage() : {}) });
  }
});

api.runtime.onMessage.addListener(msg => {
  if (msg && msg.type === 'import-waiting') void deliverImport();
  if (msg && msg.type === 'show-view') {
    appReady = false;
    frame.src = new URL(msg.view === 'import' ? 'import' : '', frame.src).href;
  }
});

void start();
