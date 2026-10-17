// The Stage 4 measures (scripts/stage4/metrics.ts): the cohort rule, and what a rate says when there is nothing to divide by.
//
// These are the conventions written down in docs/EMERGENCE.md before any run, and they are the ones most easily lost by a later
// convenience: a camp someone moved away from is still their camp, somebody with no home at the snapshot is unknown forever
// rather than guessed at from where they stand, death removes them from a denominator but not from the registry, and an empty
// denominator is "not estimable" and never zero.
import { describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { addSettlement } from '../src/sim/settlements';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { UNKNOWN, contactsReport, extendCohorts, freezeCohorts, knowledgeReport, offersReport, rate } from '../scripts/stage4/metrics';
import type { ContactRecord, OfferRecord } from '../src/sim/transmission';
import type { Person, World } from '../src/sim/types';
import { settingsFor } from './helpers/util';

/** two camps, one person housed in each, and a third with no home at all */
function twoCamps() {
  const w: World = testKit.flatWorld(settingsFor('stage4-cohorts', { scene: 'natural', dynamics: 'rich' }));
  const rng = new RNG(3);
  w.camp = { x: 20.5, y: 20.5 };
  addSettlement(w, 60.5, 60.5);
  const north = testKit.addPerson(w, rng, { name: 'Nora', x: 20.5, y: 21.5 });
  const south = testKit.addPerson(w, rng, { name: 'Sam', x: 60.5, y: 61.5 });
  const drifter = testKit.addPerson(w, rng, { name: 'Dru', x: 40.5, y: 40.5 });
  const give = (p: Person, x: number, y: number) => {
    const b = createBuilding(w, 'lean_to', x, y, p.hhId);
    const hh = w.households.find((h) => h.id === p.hhId);
    if (hh) hh.homeId = b.id;
  };
  give(north, 20, 22);
  give(south, 60, 62);
  const hh = w.households.find((h) => h.id === drifter.hhId);
  if (hh) hh.homeId = 0; // no home at the snapshot
  testKit.finish(w, 'natural');
  return { w, north, south, drifter };
}

describe('the cohort is frozen at day 0', () => {
  it('puts everybody in the camp their household home is nearest to', () => {
    const { w, north, south } = twoCamps();
    const cohort = freezeCohorts(w);
    expect(cohort.get(north.id)).toBe(0);
    expect(cohort.get(south.id)).toBe(1);
  });

  it('never re-assigns anybody who moves across the map afterwards', () => {
    const { w, north, south } = twoCamps();
    const cohort = freezeCohorts(w);
    north.x = south.x;
    north.y = south.y; // she walks to the other camp and stays
    const hh = w.households.find((h) => h.id === north.hhId);
    if (hh) hh.homeId = 0; // and her home burns down
    extendCohorts(w, cohort);
    expect(cohort.get(north.id), 'still the camp she started in').toBe(0);
  });

  it('leaves somebody with no home at the snapshot unknown, and never guesses from where they stand', () => {
    const { w, drifter } = twoCamps();
    const cohort = freezeCohorts(w);
    expect(cohort.get(drifter.id)).toBe(UNKNOWN);
    drifter.x = 20.5;
    drifter.y = 20.5; // standing in the middle of camp 0 changes nothing
    extendCohorts(w, cohort);
    expect(cohort.get(drifter.id)).toBe(UNKNOWN);
  });

  it('keeps the dead in the registry, so a belief they observed can still be traced to a camp', () => {
    const { w, north } = twoCamps();
    const cohort = freezeCohorts(w);
    north.alive = false;
    extendCohorts(w, cohort);
    expect(cohort.get(north.id), 'the lookup survives the person').toBe(0);
    const k = knowledgeReport(w, cohort, 2);
    expect(k.camps[0].livingKnownMembers, 'but they are not counted as living').toBe(0);
  });

  it("gives a baby its MOTHER's camp, not its father's", () => {
    // `lifecycle.ts` writes `parents: [mother, father]`. A rule that took "the first parent with a known camp" would give the
    // second baby below its father's, because its mother has none - which is the case that tells the two rules apart.
    const { w, north, south, drifter } = twoCamps();
    const cohort = freezeCohorts(w);
    const rng = new RNG(9);
    const ofTwoCamps = testKit.addPerson(w, rng, { name: 'Bea', x: 20.5, y: 21.5 });
    ofTwoCamps.parents = [south.id, north.id]; // mother in camp 1, father in camp 0
    const ofAnUnknownMother = testKit.addPerson(w, rng, { name: 'Cal', x: 20.5, y: 21.5 });
    ofAnUnknownMother.parents = [drifter.id, north.id]; // mother has no camp, father is in camp 0
    extendCohorts(w, cohort);
    expect(cohort.get(ofTwoCamps.id), 'the mother is parents[0]').toBe(1);
    expect(cohort.get(ofAnUnknownMother.id), 'an unknown mother means an unknown baby, never the father as a fallback').toBe(UNKNOWN);
  });

  it('a birth to an unknown mother stays unknown even when the household has a home', () => {
    // the household-home rule is for ENTRANTS; a birth follows its mother and must not fall back to the roof it was born under
    const { w, north, drifter } = twoCamps();
    const cohort = freezeCohorts(w);
    const baby = testKit.addPerson(w, new RNG(11), { name: 'Dot', x: 20.5, y: 21.5 });
    baby.parents = [drifter.id];
    baby.hhId = north.hhId; // born into a household that does have a home, in camp 0
    extendCohorts(w, cohort);
    expect(cohort.get(baby.id)).toBe(UNKNOWN);
  });

  it('a later entrant with a household home is assigned from it, and one without is unknown', () => {
    // an arrival is not a birth: the plan assigns it by the same first-entry rule, and freezes it there
    const { w } = twoCamps();
    const cohort = freezeCohorts(w);
    const rng = new RNG(13);
    const housed = testKit.addPerson(w, rng, { name: 'Ida', x: 40.5, y: 40.5 });
    const b = createBuilding(w, 'lean_to', 59, 61, housed.hhId); // a roof beside camp 1
    const hh = w.households.find((h) => h.id === housed.hhId);
    if (hh) hh.homeId = b.id;
    const roofless = testKit.addPerson(w, rng, { name: 'Jan', x: 40.5, y: 40.5 });
    const rh = w.households.find((h) => h.id === roofless.hhId);
    if (rh) rh.homeId = 0;
    extendCohorts(w, cohort);
    expect(cohort.get(housed.id), 'assigned from the home they came to, as at day 0').toBe(1);
    expect(cohort.get(roofless.id)).toBe(UNKNOWN);
  });

  it('freezes an entrant once: a later move or a lost roof never re-assigns them', () => {
    const { w } = twoCamps();
    const cohort = freezeCohorts(w);
    const entrant = testKit.addPerson(w, new RNG(17), { name: 'Kit', x: 40.5, y: 40.5 });
    const b = createBuilding(w, 'lean_to', 59, 61, entrant.hhId);
    const hh = w.households.find((h) => h.id === entrant.hhId);
    if (hh) hh.homeId = b.id;
    extendCohorts(w, cohort);
    expect(cohort.get(entrant.id)).toBe(1);
    if (hh) hh.homeId = 0; // the roof goes
    entrant.x = 20.5;
    entrant.y = 20.5; // and they move to the other camp
    extendCohorts(w, cohort);
    expect(cohort.get(entrant.id), 'frozen at first entry').toBe(1);
  });
});

describe('a rate with nothing to divide by is not estimable', () => {
  it('says so rather than reading zero', () => {
    expect(rate(0, 0)).toBeNull();
    expect(rate(3, 0)).toBeNull();
    expect(rate(0, 4)).toBe(0);
    expect(rate(1, 4)).toBe(0.25);
  });

  it('reports no contacts as no contacts, not as a zero cross-camp fraction', () => {
    const cohort = new Map([[1, 0], [2, 1]]);
    const empty = contactsReport([], cohort, [[0, 4]]);
    expect(empty.all.total).toBe(0);
    expect(empty.crossFractionOfKnown, 'no known pair-events: nothing to estimate').toBeNull();
  });

  it('separates cross, within and unknown pairs, and deduplicates unique pairs across channels', () => {
    const cohort = new Map([[1, 0], [2, 1], [3, 0], [9, UNKNOWN]]);
    const contacts: ContactRecord[] = [
      { tick: 10, channel: 'conversation', a: 1, b: 2 }, // cross
      { tick: 10, channel: 'invitation', a: 1, b: 2 }, // the same pair, a nested channel
      { tick: 20, channel: 'meal', a: 1, b: 3 }, // within camp 0
      { tick: 30, channel: 'greeting', a: 1, b: 9 }, // one cohort unknown
    ];
    const r = contactsReport(contacts, cohort, [[0, 4]]);
    expect(r.all).toMatchObject({ total: 4, cross: 2, within: 1, unknown: 1 });
    expect(r.uniquePairs, 'three distinct pairs, though four events').toBe(3);
    expect(r.uniqueCrossPairs).toBe(1);
    expect(r.byChannel.conversation.cross).toBe(1);
    expect(r.byChannel.meal.within).toBe(1);
    expect(r.crossFractionOfKnown, 'unknown pairs are out of the denominator (reported to four places)').toBe(0.6667);
  });

  it('counts offers by what was written, and leaves cross-camp rates unestimable when nothing crossed', () => {
    const cohort = new Map([[1, 0], [2, 0]]);
    const offer = (o: Partial<OfferRecord>): OfferRecord => ({
      tick: 1, channel: 'news', from: 1, to: 2, beliefId: 5, kind: 'berry_bush', offeredSeen: 1, heldSeen: null,
      api: true, outcome: 'inserted', bypass: false, origin: 1, hops: 1, ...o,
    });
    const r = offersReport([offer({}), offer({ outcome: 'rejected', api: false }), offer({ outcome: 'provenance', api: false }), offer({ outcome: 'refreshed', api: false, bypass: true })], cohort);
    expect(r.attempts).toBe(4);
    expect(r.genuine, 'inserted and refreshed only').toBe(2);
    expect(r.provenanceOnly, 'a provenance rewrite is never new knowledge').toBe(1);
    expect(r.bypassWrites, 'the write that happened past an API refusal').toBe(1);
    expect(r.acceptedRate).toBe(0.5);
    expect(r.crossAcceptedOfCrossAttempts, 'nobody offered across a boundary').toBeNull();
    expect(r.crossAcceptedOfKnownAccepted, 'and so none of the accepted ones crossed').toBe(0);
  });
});

describe('camp knowledge and overlap', () => {
  it('is not estimable for a camp with no living known members, and 0 when one side is empty', () => {
    const { w, north, south } = twoCamps();
    const cohort = freezeCohorts(w);
    north.beliefs = {};
    south.beliefs = {};
    const both = knowledgeReport(w, cohort, 2);
    expect(both.pairs[0].j, 'two camps that know nothing: undefined, not identical').toBeNull();
    south.alive = false;
    const gone = knowledgeReport(w, cohort, 2);
    expect(gone.camps[1].retained, 'no living known members').toBeNull();
    expect(gone.pairs[0].j).toBeNull();
    expect(gone.meanJaccardOverValidPairs).toBeNull();
    expect(gone.validPairs).toBe(0);
  });

  it('is the plain Jaccard of what the two camps retain', () => {
    const { w, north, south } = twoCamps();
    const cohort = freezeCohorts(w);
    const b = (id: number) => ({ id, kind: 'berry_bush' as const, x: 0, y: 0, amount: 1, max: 1, seen: 0, src: 'seen' as const, from: 0, learned: 0 });
    north.beliefs = { 1: b(1), 2: b(2), 3: b(3) };
    south.beliefs = { 3: b(3), 4: b(4) };
    const k = knowledgeReport(w, cohort, 2);
    expect(k.pairs[0]).toMatchObject({ inter: 1, union: 4, j: 0.25 });
    expect(k.meanJaccardOverValidPairs).toBe(0.25);
  });

  it('reports foreign-origin lineage only where both cohorts are known, and the rest as unknown', () => {
    const { w, north, south, drifter } = twoCamps();
    const cohort = freezeCohorts(w);
    const told = (id: number, origin: number, hops: number) => ({ id, kind: 'berry_bush' as const, x: 0, y: 0, amount: 1, max: 1, seen: 0, src: 'told' as const, from: origin, learned: 0, origin, hops });
    north.beliefs = {
      1: told(1, south.id, 2), // from the other camp
      2: told(2, north.id, 1), // from home
      3: told(3, drifter.id, 1), // from somebody with no cohort
    };
    south.beliefs = {};
    const k = knowledgeReport(w, cohort, 2);
    expect(k.retainedTold).toBe(3);
    expect(k.bothCohortsKnown).toBe(2);
    expect(k.foreignOriginCount).toBe(1);
    expect(k.foreignOriginOfKnown).toBe(0.5);
    expect(k.unknownOriginOrCohort, 'the one whose observer has no camp').toBe(1);
    expect(k.hops).toMatchObject({ mean: 1.333, max: 2, entries: 3, missing: 0 }); // the mean is reported to three places
  });
});
