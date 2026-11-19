import { copy } from './copy.ts';
/** Item photos are embedded, so they must stay small: NIP-44 caps content at 64 KB (PLAN.md "Photos"). */
export const MAX_PHOTO_BYTES = 30_000;

const loadImage = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(copy.add.photoUnreadable)); };
    img.src = url;
  });

const toBlob = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>(r => c.toBlob(r, type, q));

const toDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/**
 * Shrinks a photo or screenshot to a data: URL of at most ~30 KB.
 * WebP where the browser can make it (older Safari can't), JPEG otherwise.
 */
export async function shrinkPhoto(file: Blob): Promise<string> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  for (let side = 720; side >= 240; side = Math.round(side * 0.8)) {
    const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.8, 0.65, 0.5, 0.38]) {
      let blob = await toBlob(canvas, 'image/webp', q);
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q);
      if (blob && blob.size * 1.34 <= MAX_PHOTO_BYTES) return toDataUrl(blob);
    }
  }
  throw new Error(copy.add.photoTooDetailed);
}

/** Face photos ride in each person's profile event; small enough to stay quick on every device. */
export const MAX_FACE_BYTES = 12_000;

/**
 * A face photo: the middle square of the picture, about 160 px, as a data: URL of around 8 KB.
 * WebP where the browser can make it, JPEG otherwise.
 */
export async function shrinkFace(file: Blob): Promise<string> {
  const img = await loadImage(file);
  const w = img.naturalWidth, h = img.naturalHeight;
  const crop = Math.min(w, h);
  // Portraits usually have the face in the upper part: lean the square up a little.
  const sx = (w - crop) / 2, sy = h > w ? (h - crop) * 0.3 : 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas');
  for (const side of [160, 128, 96]) {
    canvas.width = canvas.height = Math.min(side, crop);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, crop, crop, 0, 0, canvas.width, canvas.height);
    for (const q of [0.75, 0.6, 0.45]) {
      let blob = await toBlob(canvas, 'image/webp', q);
      if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q);
      if (blob && blob.size * 1.34 <= MAX_FACE_BYTES) return toDataUrl(blob);
    }
  }
  throw new Error(copy.add.photoTooDetailed);
}
