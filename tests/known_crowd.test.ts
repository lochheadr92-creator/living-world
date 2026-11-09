// Rules 181: a crowd is the people one knows of, not the world's live count.
import { afterEach, describe, expect, it } from 'vitest';
import { CROWD_AT, feelsCrowd, peopleKnownOf, setKnownCrowd } from '../src/sim/known_crowd';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => { setKnownCrowd(true); });

/** A world of `n` living people; the first, Pat, knows `known` of the others. */
function scene(version: number, n: number, known: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`known-crowd-${version}-${n}-${known}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const people = Array.from({ length: n }, (_, i) => addPerson(s, i === 0 ? 'Pat' : `P${i}`, 20 + (i % 10), 20 + Math.floor(i / 10), { age: 30 }));
  const w = done(s);
  for (const p of people) pin(p);
  const pat = people[0];
  pat.relations = {};
  for (const other of people.slice(1, 1 + known)) relOf(pat, other.id);
  return { w, pat, others: people.slice(1) };
}

describe('rules 181: the hall crowd is the people one knows of', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(181);
    expect(SUPPORTED_RULES_VERSIONS).toContain(181);
    expect(CROWD_AT).toBe(24);
  });

  it('at 180 thirty living people are a crowd to someone who has met five of them', () => {
    const { w, pat } = scene(180, 30, 5);
    expect(peopleKnownOf(pat)).toBe(6);
    expect(feelsCrowd(w, pat)).toBe(true);
  });

  it('at 181 the same person who knows six people, themselves included, feels no crowd', () => {
    const { w, pat } = scene(181, 30, 5);
    expect(feelsCrowd(w, pat)).toBe(false);
  });

  it('at 181 someone who knows twenty-three others feels a crowd, and twenty-two is one short', () => {
    const enough = scene(181, 30, 23);
    expect(feelsCrowd(enough.w, enough.pat)).toBe(true);
    const short = scene(181, 30, 22);
    expect(feelsCrowd(short.w, short.pat)).toBe(false);
  });

  it('at 181 the world need not be large for the person to know of two dozen: it is the knowing that counts', () => {
    const { w, pat } = scene(181, 24, 23);
    expect(peopleKnownOf(pat)).toBe(24);
    expect(feelsCrowd(w, pat)).toBe(true);
  });

  it('at 181 a person known to have died is not counted, and one not known to have died still is', () => {
    const { w, pat, others } = scene(181, 30, 23);
    expect(feelsCrowd(w, pat)).toBe(true);
    // Pat learns that one of them died: 23 known becomes 22 others, one short.
    relOf(pat, others[0].id).deathKnown = { learned: w.tick, source: 'told', via: 0 };
    expect(peopleKnownOf(pat)).toBe(23);
    expect(feelsCrowd(w, pat)).toBe(false);
    // Another dies out of Pat's knowledge: the register changes, Pat's count does not.
    others[1].alive = false;
    expect(peopleKnownOf(pat)).toBe(23);
  });

  it('with the switch off the world\'s live count stays at 181', () => {
    const { w, pat } = scene(181, 30, 5);
    setKnownCrowd(false);
    expect(feelsCrowd(w, pat)).toBe(true);
  });

  it('an authored world feels no crowd at either rule', () => {
    const { w, pat } = scene(181, 30, 23, 'authored');
    expect(feelsCrowd(w, pat)).toBe(false);
  });
});
