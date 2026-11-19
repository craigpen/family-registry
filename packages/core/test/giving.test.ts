import { describe, expect, it } from 'vitest';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import {
  buildClaimEvent, buildItemEvent, buildRevealEvent, buildRosterEvent, claimTag, deriveState, fingerprint, groupKeys,
  hiddenTag, newItemId, newItemKey, occasionPassed, randomWords, readEvent, resolveClaims, upcomingOccasions,
  type Claim, type GroupAccess,
} from '../src/index.ts';

const person = () => { const sk = generateSecretKey(); return { sk, pk: getPublicKey(sk) }; };
const dad = person(), mom = person(), lily = person(), ben = person();

async function setup() {
  const keys = await groupKeys(randomWords());
  const group: GroupAccess = { ...keys, organizer: fingerprint(dad.pk) };
  const roster = buildRosterEvent({ v: 1, name: 'Us', members: [
    { pubkey: dad.pk, name: 'Dad', organizer: true }, { pubkey: mom.pk, name: 'Mom' },
    { pubkey: lily.pk, name: 'Lily' }, { pubkey: ben.pk, name: 'Ben' },
  ] }, keys, dad.sk, 100);
  const id = newItemId(), itemKey = newItemKey();
  const item = buildItemEvent({ id, content: { v: 1, title: 'Paints', createdFor: lily.pk }, itemKey, groups: [group], secretKey: lily.sk, createdAt: 200 });
  return { group, roster, item, target: { id, itemKey, owner: lily.pk } };
}

const state = (evs: Parameters<typeof readEvent>[0][], group: GroupAccess, sk = dad.sk) =>
  deriveState(evs.map(e => readEvent(e, [group], sk, { at: 100_000 })), [group]);

describe('who gets it', () => {
  const c = (author: string, createdAt: number, state: Claim['state']) => ({ author, createdAt, claim: { v: 1 as const, item: 'a'.repeat(32), state, occasion: 'christmas-2026' } });

  it('first to say "I\'ll get this" has it', () => {
    const s = resolveClaims([c('mom', 20, 'getting'), c('dad', 10, 'getting')]);
    expect(s.holder?.author).toBe('dad');
    expect(s.others.map(o => o.author)).toEqual(['mom']);
  });

  it('bought beats getting, even if later', () => {
    expect(resolveClaims([c('dad', 10, 'getting'), c('mom', 50, 'bought')]).holder?.author).toBe('mom');
  });

  it('a tie goes to the lower pubkey', () => {
    expect(resolveClaims([c('bbb', 10, 'getting'), c('aaa', 10, 'getting')]).holder?.author).toBe('aaa');
  });

  it('a released claim drops out; each person counts once, by their newest claim', () => {
    const s = resolveClaims([c('dad', 10, 'getting'), c('dad', 30, 'released'), c('mom', 20, 'getting')]);
    expect(s.holder?.author).toBe('mom');
    expect(s.others).toHaveLength(0);
  });

  it('two people buying is flagged, not resolved', () => {
    const s = resolveClaims([c('dad', 10, 'bought'), c('mom', 20, 'bought')]);
    expect(s.boughtTwice).toBe(true);
    expect(s.holder?.author).toBe('dad');
  });
});

describe('claims on the wire', () => {
  it('are matched to their item and resolved', async () => {
    const { group, roster, item, target } = await setup();
    const claim = buildClaimEvent(target, [group], { state: 'getting', occasion: 'christmas-2026' }, mom.sk, 300);
    const s = state([roster, item, claim], group);
    expect(s.items[0]!.claims.holder).toMatchObject({ author: mom.pk, state: 'getting' });
  });

  it("carry the recipient's hidden tag, never the group tag, and a blinded d tag", async () => {
    const { group, target } = await setup();
    const claim = buildClaimEvent(target, [group], { state: 'getting', occasion: 'christmas-2026' }, mom.sk);
    expect(claim.tags).toContainEqual(['x', hiddenTag(group, lily.pk)]);
    expect(claim.tags.some(t => t[0] === 'h')).toBe(false);
    expect(claim.tags.find(t => t[0] === 'd')![1]).toBe(claimTag(target.itemKey));
    expect(claim.tags.flat().join()).not.toContain(target.id);
  });

  it("hidden tags differ per person, so Lily's app can subscribe to everyone's but her own", async () => {
    const { group } = await setup();
    expect(hiddenTag(group, lily.pk)).not.toBe(hiddenTag(group, mom.pk));
  });

  it('the recipient cannot claim their own item', async () => {
    const { group, roster, item, target } = await setup();
    const self = buildClaimEvent(target, [group], { state: 'getting', occasion: 'christmas-2026' }, lily.sk, 300);
    expect(state([roster, item, self], group).items[0]!.claims.holder).toBeUndefined();
  });
});

describe('surprise ideas', () => {
  it("are hidden from the recipient's subscriptions and editable by others, not the recipient", async () => {
    const { group, roster } = await setup();
    const id = newItemId(), itemKey = newItemKey();
    const idea = buildItemEvent({ id, content: { v: 1, title: 'Riding lesson', createdFor: lily.pk, surprise: true }, itemKey, groups: [group], secretKey: mom.sk, createdAt: 300, hiddenFrom: lily.pk });
    expect(idea.tags).toContainEqual(['x', hiddenTag(group, lily.pk)]);
    expect(idea.tags.some(t => t[0] === 'h')).toBe(false);

    const byDad = buildItemEvent({ id, content: { v: 1, title: 'Two riding lessons', createdFor: lily.pk, surprise: true }, itemKey, groups: [group], secretKey: dad.sk, createdAt: 400, hiddenFrom: lily.pk });
    const byLily = buildItemEvent({ id, content: { v: 1, title: 'Lily peeked', createdFor: lily.pk, surprise: true }, itemKey, groups: [group], secretKey: lily.sk, createdAt: 500, hiddenFrom: lily.pk });
    const it = state([roster, idea, byDad, byLily], group).items.find(i => i.id === id)!;
    expect(it.content.title).toBe('Two riding lessons');
    expect(it.addedBy).toBe(mom.pk);
  });
});

describe('removed items', () => {
  it('are remembered as they were, so a claimer can be told', async () => {
    const { group, roster, item, target } = await setup();
    const del = buildItemEvent({ id: target.id, content: { v: 1, deleted: true }, itemKey: target.itemKey, groups: [group], secretKey: lily.sk, createdAt: 400 });
    const claim = buildClaimEvent(target, [group], { state: 'getting', occasion: 'christmas-2026' }, mom.sk, 300);
    const s = state([roster, item, del, claim], group);
    expect(s.items).toHaveLength(0);
    expect(s.removed[0]).toMatchObject({ content: { title: 'Paints' }, claims: { holder: { author: mom.pk } } });
  });
});

describe('reveals', () => {
  it('tell the recipient who gave it', async () => {
    const { group, roster, item, target } = await setup();
    const reveal = buildRevealEvent(target, [group], 'christmas-2026', mom.sk, 500);
    const s = state([roster, item, reveal], group, lily.sk);
    expect(s.items[0]!.given).toEqual([{ by: mom.pk, occasion: 'christmas-2026', at: 500 }]);
  });
});

describe('occasions', () => {
  it('lists the next Christmas and birthday, soonest first', () => {
    expect(upcomingOccasions('11-30', '2026-11-18').map(o => o.id)).toEqual(['birthday-2026-11-30', 'christmas-2026']);
    expect(upcomingOccasions('03-03', '2026-11-18').map(o => o.id)).toEqual(['christmas-2026', 'birthday-2027-03-03']);
    expect(upcomingOccasions(undefined, '2026-12-26').map(o => o.id)).toEqual(['christmas-2027']);
  });

  it('counts as passed from the day after', () => {
    expect(occasionPassed('christmas-2026', '2026-12-25')).toBe(false);
    expect(occasionPassed('christmas-2026', '2026-12-26')).toBe(true);
    expect(occasionPassed('birthday-2026-11-30', '2026-12-01')).toBe(true);
  });
});
