/*
 * The extension's popup: quick-add without leaving the page you're on.
 *
 * It reads the page with the shared extract.js. When this browser is signed in to the wish
 * list, it adds the item itself, through the site's hidden /embed page (which has the site's
 * sign-in), to your list, a list you help keep, or as a secret idea; then says "Added". If it
 * isn't signed in (or can't tell), it falls back to opening the Add sheet in a tab.
 *
 * "Open my wish list" opens the whole app in the side panel. On an Amazon list, the import
 * runs in background.js and the review happens in the side panel.
 */
/* global chrome */
'use strict';

const DEFAULT_APP = 'https://craigpen.github.io/family-registry/';
const $main = document.getElementById('main');
const api = typeof browser !== 'undefined' ? browser : chrome; // eslint-disable-line no-undef
const hasPanel = !!(api.sidePanel && api.sidePanel.open);

let APP = DEFAULT_APP;
let TAB = null;

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else if (k === 'style') e.style.cssText = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
  return e;
}
// Leaves out empty slots (an optional part that isn't there), which would otherwise print as "null".
const show = (...nodes) => { $main.replaceChildren(...nodes.filter(n => n != null && n !== false)); };
const message = (title, text, ...more) => show(el('h1', {}, title), el('p', { class: 'muted' }, text), ...more);

/* ---------- Opening the wish list: side panel where there is one, otherwise a tab ---------- */

/** Must be called straight from a click (the browser requires that for the side panel). */
function openWishList(view = '') {
  if (hasPanel && TAB) {
    // An import is labeled with the list's tab, so only the panel beside it collects the list.
    api.sidePanel.setOptions({ tabId: TAB.id, path: `sidepanel.html${view ? `?view=${view}&for=${TAB.id}` : ''}`, enabled: true });
    api.sidePanel.open({ tabId: TAB.id });
    api.runtime.sendMessage({ type: 'show-view', view, forTab: view === 'import' ? TAB.id : 0 }).catch(() => {});
    return true;
  }
  api.tabs.create({ url: new URL(view, APP).href });
  return false;
}
const openButton = (label = 'Open my wish list') =>
  el('button', { class: 'ghost', on: { click: () => { openWishList(); window.close(); } } }, label);

/* ---------- Talking to the site, out of sight ---------- */

let bridge = null;
let bridgeReady = null;
let seq = 0;

/** Loads the site's /embed page in a hidden frame. Resolves once it says hello, or after a few seconds. */
function startBridge() {
  bridge = el('iframe', { src: new URL('embed', APP).href, style: 'display:none', title: 'wish list' });
  document.body.append(bridge);
  bridgeReady = new Promise(resolve => {
    const t = setTimeout(() => resolve(false), 6000);
    addEventListener('message', function ready(e) {
      if (e.source === bridge.contentWindow && e.data && e.data.type === 'fr/ready') {
        removeEventListener('message', ready);
        clearTimeout(t);
        resolve(true);
      }
    });
  });
}

/** Asks the site something and waits for its answer. */
async function ask(msg, ms = 8000) {
  if (!(await bridgeReady)) return null;
  const id = String(++seq);
  const origin = new URL(APP).origin;
  return new Promise(resolve => {
    const t = setTimeout(() => { removeEventListener('message', on); resolve(null); }, ms);
    function on(e) {
      if (e.source !== bridge.contentWindow || !e.data || e.data.id !== id) return;
      clearTimeout(t);
      removeEventListener('message', on);
      resolve(e.data);
    }
    addEventListener('message', on);
    bridge.contentWindow.postMessage({ ...msg, id }, origin);
  });
}

/* Photos: thumbs.js (hasPhotoPermission, askPhotoPermission, photos). */

/* ---------- Reading the page ---------- */

async function run(tabId, func, args = []) {
  const [res] = await api.scripting.executeScript({ target: { tabId }, func, args });
  return res && res.result;
}

const isAmazonList = url => /amazon\.[a-z.]+\/(hz\/wishlist|wishlist|registry\/wishlist|gp\/registry\/wishlist)/.test(url);

async function main() {
  const { app } = await api.storage.sync.get('app');
  APP = app || DEFAULT_APP;
  startBridge();
  // popup.html?tab=<id> reads a given tab (used by the automated tests, which open the popup as a page).
  const forced = Number(new URLSearchParams(location.search).get('tab'));
  const [tab] = forced ? [await api.tabs.get(forced)] : await api.tabs.query({ active: true, currentWindow: true });
  TAB = tab;
  if (!tab || !/^https?:/.test(tab.url || '')) return message('Your wish list', 'To add something, open a shop’s page for it and click the gift.', openButton());
  try {
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['extract.js'] });
  } catch {
    return message('Your wish list', 'The browser doesn’t let extensions read this page.', openButton());
  }
  if (isAmazonList(tab.url)) return showList(tab);
  const found = await run(tab.id, () => globalThis.FamilyRegistryExtract.extract(document, location.href));
  if (found.product) showProduct(found);
  else showNotAProduct(found);
}

/* ---------- Not a product (a cart, a search, a home page) ---------- */

function showNotAProduct(found) {
  const cart = /cart|basket|bag|checkout/i.test(found.url + ' ' + found.title);
  show(
    el('h1', {}, cart ? 'This is your cart' : 'This isn’t a single product'),
    el('p', { class: 'muted' }, cart
      ? 'Open the product’s own page (click its name in the cart), then click the gift again.'
      : 'Open the page for the one thing you’d like, then click the gift again.'),
    el('button', { class: 'ghost', on: { click: () => showProduct({ ...found, title: '', price: '', images: [], notes: '' }) } }, 'Add this page anyway'),
    openButton(),
  );
}

/* ---------- One thing ---------- */

const PERSON_COLORS = ['#5B7FD6', '#CF4339', '#E58A3A', '#2F8F6B', '#A05BC9'];

async function showProduct(found) {
  let chosen = found.images[0] || '';
  const title = el('input', { class: 'field', value: found.title, placeholder: 'What is it?', 'aria-label': 'What is it?' });
  // The size, color and so on chosen on the page, ready to check or change.
  const notes = el('input', { class: 'field', value: found.notes || '', placeholder: 'Notes: size, color…', 'aria-label': 'Notes' });
  const cands = el('div', { class: 'cands', role: 'group', 'aria-label': 'Pick the right picture' },
    found.images.map(src => el('button', { 'aria-pressed': String(src === chosen), on: { click: e => {
      chosen = src;
      for (const b of cands.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
    } } }, el('img', { src, alt: '', referrerpolicy: 'no-referrer' }))));
  const forRow = el('div', { class: 'for', role: 'group', 'aria-label': 'Who is it for' });
  const forHint = el('p', { class: 'hint' }, 'Checking your wish list…');
  const add = el('button', { class: 'primary' }, 'Add to my wish list');
  show(
    el('h1', {}, 'Add to a wish list'),
    el('p', { class: 'muted' }, [found.site, found.price].filter(Boolean).join(' · ') || 'Check the details, then add it.'),
    title, notes,
    found.images.length ? cands : null,
    forRow, forHint, add,
    el('button', { class: 'link', on: { click: () => { openWishList(); window.close(); } } }, 'Open my wish list'),
  );

  // Signed in here? Then add in place, and offer whose list it's for.
  const state = await ask({ type: 'fr/hello' });
  const signedIn = !!(state && state.signedIn);
  let owner = '';
  if (signedIn) {
    const people = state.people;
    owner = people[0].pubkey;
    const describe = p => p.mode === 'mine' ? 'Goes on your list.' : p.mode === 'helper' ? `Goes on ${p.name}'s list, which you help keep.` : `A secret idea for ${p.name}: everyone but ${p.name} sees it.`;
    forHint.textContent = describe(people[0]);
    people.forEach((p, i) => forRow.append(el('button', {
      'aria-pressed': String(i === 0),
      on: { click: e => {
        owner = p.pubkey;
        for (const b of forRow.children) b.setAttribute('aria-pressed', String(b === e.currentTarget));
        forHint.textContent = describe(p);
        add.textContent = p.mode === 'ideas' ? `Add as a secret idea for ${p.name}` : p.mode === 'mine' ? 'Add to my list' : `Add to ${p.name}'s list`;
      } },
    }, el('span', { class: 'dot', style: `background:${p.color || PERSON_COLORS[i % PERSON_COLORS.length]}` }, p.name.slice(0, 1)), p.name)));
    add.textContent = 'Add to my list';
  } else {
    forHint.textContent = state
      ? 'Not signed in on this computer yet: this opens the wish list to finish.'
      : 'Couldn’t reach your wish list from here: this opens it to finish.';
  }

  add.addEventListener('click', async () => {
    const asked = hasPhotoPermission().then(ok => ok || askPhotoPermission());
    add.disabled = true;
    add.textContent = 'Adding…';
    await asked;
    const images = await photos([chosen, ...found.images.filter(i => i !== chosen)], signedIn ? 1 : 3);
    if (signedIn) {
      const draft = {
        title: title.value.trim() || found.title || 'Something nice', links: [found.url], image: images[0] || undefined,
        price: found.price || undefined, notes: notes.value.trim() || undefined, seenAt: found.site || undefined, reallyWant: false,
      };
      const res = await ask({ type: 'fr/add', draft, owner }, 15000);
      if (res && res.ok) {
        const who = state.people.find(p => p.pubkey === owner);
        return message(
          who.mode === 'ideas' ? `Added as a secret idea for ${who.name}` : who.mode === 'mine' ? 'Added to your list' : `Added to ${who.name}'s list`,
          res.sent ? 'The family will see it.' : 'Saved. It goes out to the family next time you’re online.',
          el('button', { class: 'primary', on: { click: () => window.close() } }, 'Done'),
          openButton(),
        );
      }
    }
    // Not signed in here (or the site didn't answer): finish in the Add sheet.
    const p = new URLSearchParams();
    p.set('url', found.url);
    if (title.value.trim()) p.set('title', title.value.trim());
    for (const i of images) p.append('image', i);
    if (found.price) p.set('price', found.price);
    if (found.site) p.set('site', found.site);
    if (notes.value.trim()) p.set('notes', notes.value.trim());
    await api.tabs.create({ url: new URL('add', APP).href + '#' + p.toString() });
    window.close();
  });
}

/* ---------- A whole Amazon list: loaded in the background, reviewed in the side panel ---------- */

function showList(tab) {
  const go = el('button', { class: 'primary', on: { click: () => {
    // The side panel has to be opened straight from the click.
    const inPanel = hasPanel;
    if (inPanel) openWishList('import');
    // Hand over first: the popup may close as soon as the side panel opens.
    api.runtime.sendMessage({ type: 'import-list', tabId: tab.id, toPanel: inPanel }).catch(() => {});
    hasPhotoPermission().then(ok => ok || askPhotoPermission());
    message('Importing', inPanel
      ? 'Loading the whole list and saving its photos. It opens in the side panel for you to check; the gift icon shows how far along it is.'
      : 'Loading the whole list and saving its photos. The wish list opens by itself when it’s ready.');
    if (!inPanel) setTimeout(() => window.close(), 1500);
  } } }, 'Import this list');
  show(
    el('h1', {}, 'Import this Amazon list'),
    el('p', { class: 'muted' }, 'Everything on it comes into your wish list. You choose whose list it goes on, and untick anything you don’t want.'),
    go,
    openButton(),
  );
}

/* ---------- Settings ---------- */

const $app = document.getElementById('app');
api.storage.sync.get('app').then(({ app }) => { $app.value = app || DEFAULT_APP; });
document.getElementById('save-app').addEventListener('click', async () => {
  let u = $app.value.trim();
  if (!u) return;
  if (!u.endsWith('/')) u += '/';
  try { await api.permissions.request({ origins: [new URL(u).origin + '/*'] }); } catch { /* the default address is already allowed */ }
  await api.storage.sync.set({ app: u });
});

main().catch(e => message('Something went wrong', String(e && e.message || e)));
