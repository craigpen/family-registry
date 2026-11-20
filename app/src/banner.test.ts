import { describe, expect, it } from 'vitest';
import type { Family } from './family.ts';
import { ordinal, sentence, upcoming } from './ui/Banner.tsx';

const person = (pubkey: string, name: string, birthday?: string, birthYear?: number) =>
  ({ pubkey, name, organizer: false, managed: false, helpers: [], groups: [], birthday, birthYear });

function fam(me: ReturnType<typeof person>, others: ReturnType<typeof person>[]): Family {
  return { me: { pubkey: me.pubkey }, self: me, others, people: new Map([me, ...others].map(p => [p.pubkey, p])) } as unknown as Family;
}
const on = (d: string) => new Date(`${d}T12:00`);
/** The banner's two lines on a given day. */
const lines = (f: Family, d: string) => upcoming(f, on(d)).slice(0, 2).map(u => sentence(f, u, on(d)));

describe('banner', () => {
  const me = person('me', 'Craig', '08-01');
  const amelia = person('amelia', 'Amelia', '12-02');
  const lily = person('lily', 'Lily', '06-10', 2016);

  it('says what is coming up, nearest first, then the next one', () => {
    expect(lines(fam(me, [amelia]), '2026-11-20')).toEqual(['Amelia’s birthday is in 12 days', 'Christmas is in 35 days']);
  });
  it('gives the age when the birth year is known', () => {
    expect(lines(fam(me, [lily]), '2027-06-01')[0]).toBe('Lily turns 11 in 9 days');
  });
  it('uses next month or the month name beyond a month away', () => {
    expect(lines(fam(me, [amelia]), '2026-11-01')).toEqual(['Amelia’s birthday is next month', 'Christmas is in 54 days']);
    expect(lines(fam(me, [amelia]), '2026-10-15')).toEqual(['Amelia’s birthday is in December', 'Christmas is in December']);
    expect(lines(fam(me, []), '2027-03-01')).toEqual(['Your birthday is in August', 'Christmas is in December']);
  });
  it('on the day itself', () => {
    expect(lines(fam(me, [amelia]), '2026-12-02')[0]).toBe('Happy birthday, Amelia!');
    expect(lines(fam(me, []), '2027-08-01')[0]).toBe('Happy birthday!');
    expect(lines(fam(me, []), '2026-12-25')[0]).toBe('Merry Christmas!');
    expect(lines(fam(me, []), '2026-12-24')[0]).toBe('Christmas is tomorrow');
  });

  it('anniversaries: once per couple, with which one when the year is known', () => {
    const mom = { ...person('mom', 'Mom'), partner: 'dad', anniversary: '06-20', anniversaryYear: 1986 };
    const dad = { ...person('dad', 'Dad'), partner: 'mom', anniversary: '06-20', anniversaryYear: 1986 };
    expect(lines(fam(person('kid', 'Lily'), [mom, dad]), '2027-06-10')).toEqual(['Mom and Dad’s 41st anniversary is in 10 days', 'Christmas is in December']);
    expect(lines(fam(mom, [dad]), '2027-06-10')[0]).toBe('Your 41st anniversary is in 10 days');
    expect(lines(fam(mom, [dad]), '2027-06-20')[0]).toBe('Happy anniversary!');
    expect(lines(fam(person('kid', 'Lily'), [mom, dad]), '2027-06-20')[0]).toBe('Happy anniversary, Mom and Dad!');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 41].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '41st']);
  });
});
