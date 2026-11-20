import { copy } from '../copy.ts';
import type { Family } from '../family.ts';
import { daysUntil, firstName, turning } from './bits.tsx';
import { HouseScene, seasonOf, type SceneEvents } from './HouseScene.tsx';
import { plural, t } from './text.tsx';

const c = copy.banner;

/** Within this many days, a countdown in days; further off, "next month" or "in March". Christmas counts in days for longer. */
const IN_DAYS = 30;
const CHRISTMAS_IN_DAYS = 60;
/** The house is dressed for a birthday this close, and for Christmas from December 1 (or this close). */
const DRESS_BIRTHDAY = 30;
const DRESS_CHRISTMAS = 45;

/** Something coming up: Christmas, someone's birthday (mine included), or a couple's anniversary. */
export type Upcoming =
  | { kind: 'christmas'; days: number; date: Date }
  | { kind: 'birthday'; pubkey: string; mine: boolean; days: number; date: Date; turns?: number }
  | { kind: 'anniversary'; couple: [string, string]; mine: boolean; days: number; date: Date; years?: number };

const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Everything coming up, soonest first (today counts). Pure, so it can be tested with any date. */
export function upcoming(fam: Family, now = new Date()): Upcoming[] {
  const today = startOf(now);
  let xmas = new Date(today.getFullYear(), 11, 25);
  if (xmas < today) xmas = new Date(today.getFullYear() + 1, 11, 25);
  const xdays = Math.round((xmas.getTime() - today.getTime()) / 86_400_000);
  const list: Upcoming[] = [{ kind: 'christmas', days: xdays, date: xmas }];
  for (const p of [fam.self, ...fam.others]) {
    const days = daysUntil(p.birthday, now);
    if (days === undefined) continue;
    list.push({ kind: 'birthday', pubkey: p.pubkey, mine: p.pubkey === fam.me.pubkey, days, date: addDays(today, days), turns: turning(p.birthday, p.birthYear, now) });
  }
  // Each couple once (both carry the date), from whichever of the two comes first in the list.
  const seen = new Set<string>();
  for (const p of [fam.self, ...fam.others]) {
    if (!p.partner || !p.anniversary || seen.has(p.pubkey)) continue;
    seen.add(p.pubkey); seen.add(p.partner);
    const days = daysUntil(p.anniversary, now)!;
    list.push({
      kind: 'anniversary', couple: [p.pubkey, p.partner], mine: p.pubkey === fam.me.pubkey || p.partner === fam.me.pubkey,
      days, date: addDays(today, days), years: turning(p.anniversary, p.anniversaryYear, now),
    });
  }
  // Ties: birthdays before Christmas, then in roster order.
  return list.sort((a, b) => a.days - b.days || (a.kind === 'christmas' ? 1 : 0) - (b.kind === 'christmas' ? 1 : 0));
}

/** "in 12 days", "tomorrow", "next month", "in March". */
function when(u: Upcoming, now: Date): { days?: number; month?: string } {
  if (u.days <= (u.kind === 'christmas' ? CHRISTMAS_IN_DAYS : IN_DAYS)) return { days: u.days };
  const next = (now.getMonth() + 1) % 12 === u.date.getMonth() && u.date.getFullYear() - now.getFullYear() <= 1;
  return { month: next ? c.nextMonth : t(c.inMonth, { month: c.months[u.date.getMonth()]! }) };
}

/** One sentence about one event. */
export function sentence(fam: Family, u: Upcoming, now = new Date()): string {
  const w = when(u, now);
  if (u.kind === 'christmas') {
    if (u.days === 0) return c.merryChristmas;
    return w.days !== undefined ? plural(c.christmasIn, w.days) : t(c.christmasLater, { when: w.month! });
  }
  if (u.kind === 'anniversary') {
    // "Mom and Dad", or just the other one when it's mine.
    const names = u.couple.filter(pk => !u.mine || pk !== fam.me.pubkey).map(pk => firstName(fam.people.get(pk)?.name ?? '')).filter(Boolean);
    const couple = names.join(copy.common.and);
    const nth = u.years ? ordinal(u.years) : '';
    if (u.days === 0) return u.mine ? c.happyAnniversaryYou : t(c.happyAnniversary, { couple });
    const what = u.mine ? (nth ? t(c.yourNthAnniversary, { nth }) : c.yourAnniversary) : nth ? t(c.theirNthAnniversary, { couple, nth }) : t(c.theirAnniversary, { couple });
    return w.days !== undefined ? plural(c.anniversaryIn, w.days, { what }) : t(c.anniversaryLater, { what, when: w.month! });
  }
  const name = firstName(fam.people.get(u.pubkey)?.name ?? fam.self.name);
  if (u.days === 0) return u.mine ? c.happyBirthdayYou : t(c.happyBirthday, { name });
  if (w.days !== undefined) {
    if (u.mine) return plural(c.yourBirthdayIn, w.days);
    return u.turns ? plural(c.turnsIn, w.days, { name, age: u.turns }) : plural(c.birthdayIn, w.days, { name });
  }
  return u.mine ? t(c.yourBirthdayLater, { when: w.month! }) : t(c.birthdayLater, { name, when: w.month! });
}

/** 1st, 2nd, 3rd, 4th... 11th, 12th, 13th, 21st. */
export function ordinal(n: number): string {
  const tens = n % 100, ones = n % 10;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/** Christmas lights from December 1 to New Year's Eve, and when Christmas is close. */
const christmasTime = (now: Date, next: Upcoming[]) =>
  now.getMonth() === 11 || next.some(u => u.kind === 'christmas' && u.days <= DRESS_CHRISTMAS);

/** Development only: localStorage "banner-date" (YYYY-MM-DD) pretends it's that day, to look at each season and event. */
function devDate(): Date | undefined {
  if (!import.meta.env.DEV) return undefined;
  try { const d = localStorage.getItem('banner-date'); return d ? new Date(`${d}T12:00`) : undefined; } catch { return undefined; }
}

/**
 * The picture at the top of the family screen: a house that changes with the seasons, dressed for
 * whatever's next, with what's coming up beside it: the nearest event, then the one after.
 * When the nearest is someone's birthday, tapping it opens their list.
 */
export function Banner({ fam, now = devDate() ?? new Date(), onPerson, onMine }: {
  fam: Family; now?: Date; onPerson: (pk: string) => void; onMine: () => void;
}) {
  const next = upcoming(fam, now);
  const [first, second] = next;
  const bday = first!.kind === 'birthday' && first!.days <= DRESS_BIRTHDAY ? first : undefined;
  const person = bday?.kind === 'birthday' ? fam.people.get(bday.pubkey) ?? fam.self : undefined;
  const events: SceneEvents = {
    christmas: christmasTime(now, next),
    hearts: first!.kind === 'anniversary' && first!.days <= DRESS_BIRTHDAY,
    birthday: person && bday ? { color: person.color ?? 'var(--accent)', initial: firstName(person.name).slice(0, 1), today: bday.days === 0 } : undefined,
    gifts: first!.days === 0,
  };
  const text = <>
    <span className="headline">{sentence(fam, first!, now)}</span>
    {second && <span className="small">{sentence(fam, second, now)}</span>}
  </>;
  const scene = <HouseScene season={seasonOf(now)} events={events} />;
  const cls = `banner s-${seasonOf(now)}`;
  if (first!.kind === 'birthday') {
    const b = first!;
    return (
      <button className={cls} onClick={() => (b.mine ? onMine() : onPerson(b.pubkey))} aria-label={b.mine ? c.labelMine : c.labelTheirs}>
        {scene}<span className="btext">{text}</span>
      </button>
    );
  }
  return <div className={cls} role="status">{scene}<div className="btext">{text}</div></div>;
}
