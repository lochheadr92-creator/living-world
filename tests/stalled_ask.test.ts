// Rules 201, second part: a household's site that has stood waiting provokes the ask for what it lacks (src/sim/stalled_ask.ts; the
// site-material ask in optRequest, options_social.ts). Every situation here is STAGED: it checks a rule, it is not an example of
// spontaneous behaviour; the ordinary-world origin is docs/MECHANISM_CENSUS_20261111.md (about 11,900 sampled decisions per
// settlement found a site "waiting for materials"). Each check has the rules-200 contrast so the older ask is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { dayFraction } from '../src/sim/environment';
import { relOf } from '../src/sim/relations';
import { makeSource } from '../src/sim/sources';
import { STALL_FROM, STALL_FULL, STALL_LIFTS_SELF_FETCH, STALL_MAX, knownSiteWait, setStalledAsk, stallLiftsSelfFetch, stalledAskWorth } from '../src/sim/stalled_ask';
import { addPerson, done, give, learn, pin, site, stage } from './helpers/kit';
import type { Option } from '../src/sim/optutil';

afterEach(() => setStalledAsk(true));

const WAITING = 'the site has stood waiting';
function world(version: number, dynamics: 'rich' | 'authored' = 'rich', tag = '') {
  const s = stage(`stalled-ask-${version}-${dynamics}-${tag}`);
  s.w.settings = { ...s.w.settings, dynamics, rulesVersion: version };
  return s;
}
function tickAt(frac: number): number {
  for (let t = 6 * DAY; t < 7 * DAY; t++) if (Math.abs(dayFraction(t) - frac) < 0.0005) return t;
  throw new Error('no such time of day');
}
const part = (o: Option | undefined, label: string): number | undefined => o?.parts.find((x) => x[0] === label)?.[1];

describe('the wait a person can know', () => {
  it('is nothing at 200, for hearsay, with the switch off and in an authored world; at 201 it counts from the last work they saw', () => {
    const old = world(200).w, now = world(201).w;
    old.tick = now.tick = 10000;
    expect(knownSiteWait(old, 4000, 9000, true)).toBe(0);
    expect(knownSiteWait(now, 4000, 9000, true)).toBe(6000); // nobody has worked on it since they looked: from the last work
    expect(knownSiteWait(now, 9500, 9000, true)).toBe(1000); // somebody worked on it after they looked: only since their own look
    expect(knownSiteWait(now, 4000, 9000, false)).toBe(0); // told of it, never saw it
    setStalledAsk(false);
    expect(knownSiteWait(now, 4000, 9000, true)).toBe(0);
    setStalledAsk(true);
    const authored = world(201, 'authored').w;
    authored.tick = 10000;
    expect(knownSiteWait(authored, 4000, 9000, true)).toBe(0);
  });

  it('adds nothing under half a day, the whole weight from two days, a straight line between, and lifts the quick-trip bar from a day', () => {
    const old = world(200).w, now = world(201).w;
    expect(stalledAskWorth(now, STALL_FROM - 1)).toBe(0);
    expect(stalledAskWorth(now, STALL_FROM)).toBe(0);
    expect(stalledAskWorth(now, (STALL_FROM + STALL_FULL) / 2)).toBeCloseTo(STALL_MAX / 2, 6);
    expect(stalledAskWorth(now, STALL_FULL)).toBe(STALL_MAX);
    expect(stalledAskWorth(now, 10 * DAY)).toBe(STALL_MAX);
    expect(stalledAskWorth(old, 10 * DAY)).toBe(0);
    expect(stallLiftsSelfFetch(now, STALL_LIFTS_SELF_FETCH - 1)).toBe(false);
    expect(stallLiftsSelfFetch(now, STALL_LIFTS_SELF_FETCH)).toBe(true);
    expect(stallLiftsSelfFetch(old, 10 * DAY)).toBe(false);
  });
});

describe('the ask itself', () => {
  /**
   * Kay's household has a hut laid out with its wood delivered and its stone missing; her friend Lem stands by carrying stone. The site
   * was last worked `waited` ticks ago. Optionally she has a pick and knows a rock two tiles off (a quick trip of her own), has only heard of the
   * site, or last looked at it `lookedAgo` ticks ago.
   */
  function ask(version: number, waited: number, opts: { rock?: boolean; hearsay?: boolean; lookedAgo?: number } = {}): Option | undefined {
    const s = world(version, 'rich', `ask-${waited}-${opts.rock ? 'rock' : 'norock'}-${opts.hearsay ? 'told' : 'seen'}-${opts.lookedAgo ?? 0}`);
    const kay = addPerson(s, 'Kay', 40.5, 44.5, { age: 30, hunger: 98, thirst: 98, energy: 95 });
    const lem = addPerson(s, 'Lem', 42.5, 44.5, { age: 30, hunger: 95, thirst: 95, energy: 95, inv: { stone: 3 } });
    const hut = site(s, 'hut', 40, 40, kay.hhId, kay.id, { wood: 8 });
    const rock = opts.rock ? makeSource(s.w, 'rock', 42, 46, 6) : null;
    if (opts.rock) give(s.w, kay, 'pick'); // with a pick the trip for stone is a quick one (under 260 ticks), which is what held the ask back
    const w = done(s);
    w.tick = tickAt(0.45);
    pin(lem);
    kay.needs.warmth = 95; kay.needs.safety = 95;
    relOf(kay, lem.id).affinity = 30; relOf(kay, lem.id).familiarity = 30;
    hut.createdTick = w.tick - waited - 500;
    hut.lastWorkTick = w.tick - waited;
    learn(w, kay, hut, lem);
    if (rock) learn(w, kay, rock);
    const belief = kay.beliefs[hut.id];
    if (opts.hearsay) belief.src = 'told';
    if (opts.lookedAgo) belief.seen = w.tick - opts.lookedAgo;
    return generateOptions(w, kay, true, true).options.find((o) => o.key === `socialize:${lem.id}:request:stone`);
  }

  it('a site last worked two days ago: the ask is made at both versions, and at 201 it carries the whole weight of the wait', () => {
    const before = ask(200, 2 * DAY), after = ask(201, 2 * DAY);
    expect(before, 'the staging offers the ask at 200').toBeTruthy();
    expect(after).toBeTruthy();
    expect(part(before, WAITING)).toBeUndefined();
    expect(part(after, WAITING)).toBe(STALL_MAX);
    expect(after!.util - before!.util).toBeCloseTo(STALL_MAX, 6);
  });

  it('a site worked a quarter of a day ago gains nothing at 201; one she has only been told of gains nothing however long it has stood', () => {
    expect(part(ask(201, DAY / 4), WAITING)).toBeUndefined();
    expect(part(ask(201, 2 * DAY, { hearsay: true }), WAITING)).toBeUndefined();
  });

  it('worked on a hundred ticks ago, but she last looked a day ago: only the day since her own look counts', () => {
    const o = ask(201, 100, { lookedAgo: DAY });
    expect(o).toBeTruthy();
    expect(part(o, WAITING)).toBeCloseTo(stalledAskWorthAt(DAY), 6);
  });

  it('with a rock she knows close by the ask is not made at 200, nor at 201 for a fresh site; at 201 it is made once the site has stood a day and a half', () => {
    expect(ask(200, 1.5 * DAY, { rock: true })).toBeUndefined();
    expect(ask(201, DAY / 4, { rock: true })).toBeUndefined();
    const o = ask(201, 1.5 * DAY, { rock: true });
    expect(o).toBeTruthy();
    expect(part(o, WAITING)).toBeGreaterThan(0);
  });

  it('with the switch off a rules-201 world asks as at 200', () => {
    setStalledAsk(false);
    expect(part(ask(201, 2 * DAY), WAITING)).toBeUndefined();
    expect(ask(201, 1.5 * DAY, { rock: true })).toBeUndefined();
  });
});

/** the weight for a wait, by the rule's own line (for the one case where the figure is not a round one) */
function stalledAskWorthAt(waited: number): number {
  return STALL_MAX * Math.min(1, (waited - STALL_FROM) / (STALL_FULL - STALL_FROM));
}
