import { renderSVG } from 'uqr';
import { occasionFromId, type Person } from '@family-registry/core';
import { copy } from '../copy.ts';
import { t } from './text.tsx';

const initial = (name: string) => (name.replace(/^(Aunt|Uncle|Grandma|Grandpa|Nana|Papa) /i, '')[0] ?? '?').toUpperCase();

/** A person's face: their photo when they have one, otherwise their initial on their color. */
export function Avatar({ person, size = '' }: { person: Pick<Person, 'name' | 'color' | 'photo'>; size?: '' | 'sm' | 'lg' | 'xl' }) {
  return (
    <span className={`avatar ${size}${person.photo ? ' photo' : ''}`} style={{ background: person.color ?? '#8A6A3A' }} aria-hidden="true">
      {person.photo ? <img src={person.photo} alt="" draggable={false} /> : initial(person.name)}
    </span>
  );
}

/** A real, scannable QR code (dark on white, which every camera reads). */
export function QR({ text, size = 200, label }: { text: string; size?: number; label: string }) {
  const svg = renderSVG(text, { border: 1, blackColor: '#2A1D17', whiteColor: '#FFFFFF' });
  return <span className="qr" role="img" aria-label={label} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg width="${size - 16}" height="${size - 16}" `) }} />;
}

export const firstName = (name: string) => name.replace(/^(Aunt|Uncle) /, '');

const MONTHS = copy.personSheets.monthsShort;
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

/** The age someone turns on their next birthday (today counts), when their birth year is known. */
export function turning(mmdd?: string, birthYear?: number, today = new Date()): number | undefined {
  const days = daysUntil(mmdd, today);
  if (days === undefined || !birthYear) return undefined;
  const next = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  return next.getFullYear() - birthYear;
}

/** "Christmas", "Lily's birthday" (the year only when it isn't this one or next). */
export function occasionLabel(id: string, name?: string): string {
  const o = occasionFromId(id);
  if (!o) return copy.occasion.unknown;
  const year = Number(o.date.slice(0, 4));
  const thisYear = new Date().getFullYear();
  const suffix = year > thisYear + 1 || year < thisYear ? ` ${year}` : '';
  const c = copy.occasion;
  return o.kind === 'christmas' ? t(c.christmas, { year: suffix }) : name ? t(c.birthday, { name: firstName(name), year: suffix }) : t(c.theirBirthday, { year: suffix });
}
