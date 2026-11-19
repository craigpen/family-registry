import { renderSVG } from 'uqr';
import type { Person } from '@family-registry/core';

const initial = (name: string) => (name.replace(/^(Aunt|Uncle|Grandma|Grandpa|Nana|Papa) /i, '')[0] ?? '?').toUpperCase();

export function Avatar({ person, size = '' }: { person: Pick<Person, 'name' | 'color'>; size?: '' | 'sm' | 'lg' }) {
  return <span className={`avatar ${size}`} style={{ background: person.color ?? '#8A6A3A' }} aria-hidden="true">{initial(person.name)}</span>;
}

/** A real, scannable QR code (dark on white, which every camera reads). */
export function QR({ text, size = 200, label }: { text: string; size?: number; label: string }) {
  const svg = renderSVG(text, { border: 1, blackColor: '#2A1D17', whiteColor: '#FFFFFF' });
  return <span className="qr" role="img" aria-label={label} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg width="${size - 16}" height="${size - 16}" `) }} />;
}

export const firstName = (name: string) => name.replace(/^(Aunt|Uncle) /, '');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatBirthday = (mmdd?: string) => {
  if (!mmdd) return undefined;
  const [m, d] = mmdd.split('-').map(Number);
  return `${MONTHS[m! - 1]} ${d}`;
};

/** Days until the next birthday (0 = today). */
export function daysUntil(mmdd?: string, today = new Date()): number | undefined {
  if (!mmdd) return undefined;
  const [m, d] = mmdd.split('-').map(Number);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), m! - 1, d!);
  if (next < start) next = new Date(today.getFullYear() + 1, m! - 1, d!);
  return Math.round((next.getTime() - start.getTime()) / 86_400_000);
}
