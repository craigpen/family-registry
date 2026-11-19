/*
 * Shop photos, shrunk to small embedded thumbnails (like the app's own photos), because shop
 * image links break and some shops block them. Used by the popup and the side panel.
 * Needs permission to read https pages (asked once, from a click).
 */
/* global chrome */
'use strict';

const thumbsApi = typeof browser !== 'undefined' ? browser : chrome; // eslint-disable-line no-undef
const MAX_THUMB = 30000;

async function hasPhotoPermission() {
  try { return await thumbsApi.permissions.contains({ origins: ['https://*/*'] }); } catch { return false; }
}

/** Must be called straight from a click. */
function askPhotoPermission() {
  try { return thumbsApi.permissions.request({ origins: ['https://*/*'] }); } catch { return Promise.resolve(false); }
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
