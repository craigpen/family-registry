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

addEventListener('message', e => {
  if (e.source !== frame.contentWindow || e.origin !== appOrigin) return;
  if (e.data && e.data.type === 'family-registry/import-ready') {
    appReady = true;
    void deliverImport();
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
