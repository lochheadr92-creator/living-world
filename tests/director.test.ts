// The story director (src/ui/director_model.ts, director_live.ts): how worth watching a real event is (three bands, real wording),
// what the queue and the one shot do with it (the hold, the early cut, the repeat fade, the merge), what is live, and the reel.
// Presentation only. Every world here except the purity run's is STAGED: events are added with the simulation's own addEvent and
// the words it really uses (grep addEvent under src/sim; counts of what an ordinary world says are in the scratchpad's
// review/patterns.json); live things are staged world state read by the real scan, or handed to the director by a stand-in scan so
// that the choice rules can be checked one at a time. It checks the presentation rule, it is not an example of spontaneous
// behaviour. The page (camera, caption, yielding) is checked in the browser: scripts/browser/director_check.mjs.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/app/game';
import { serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { newActivity } from '../src/sim/activities';
import { beginCourtWalk, type WalkData } from '../src/sim/courting';
import { addEvent } from '../src/sim/events';
import { describePerson } from '../src/sim/inspect';
import { noteWedding, occasionsTick } from '../src/sim/occasions';
import { currentWorldSettings } from '../src/sim/profiles';
import { makeWolf } from '../src/sim/wildlife';
import { hashWorld } from '../src/sim/world';
import { occasionNotice } from '../src/ui/event_cards_model';
import { scanLive, wolfSentence, type LiveCandidate, type LiveKind } from '../src/ui/director_live';
import {
  CAPTION_SECONDS,
  Director,
  FILLER_BELOW,
  FILLER_STALE_TICKS,
  LINGER_SECONDS,
  LIVE_COOLDOWN,
  LIVE_SCAN_SECONDS,
  MAX_WAITING,
  MERGE_TICKS,
  MIDDLE_FROM,
  MIN_CUT,
  MIN_HOLD,
  REEL_DAYS,
  REEL_MAX,
  REPEAT_FADE,
  STALE_SECONDS,
  STALE_TICKS,
  TOP_FROM,
  bandOf,
  highlights,
  matchEvent,
  reelOf,
  storyWeight,
} from '../src/ui/director_model';
import { addPerson, building, done, stage } from './helpers/kit';
import type { Conversation, EventKind, World, WorldEvent } from '../src/sim/types';

function village(tag: string) {
  const s = stage(`director-${tag}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  const ada = addPerson(s, 'Ada', 40, 30, { age: 24, sex: 'f' });
  const ben = addPerson(s, 'Ben', 41, 30, { age: 26, sex: 'm' });
  const cal = addPerson(s, 'Cal', 42, 31, { age: 30, sex: 'm' });
  building(s, 'fire', 44, 34);
  done(s);
  return { w, ada, ben, cal };
}

/** the wording the simulation really uses (grep addEvent under src/sim; counts in review/patterns.json) */
const TEXT = {
  death: 'Ada died peacefully of old age, aged 71.',
  wolfDeath: 'Ben died (wolf), aged 31.',
  fatal: 'A wolf bit Ben fatally.',
  bite: 'A wolf bit Talia.',
  birth: 'Cal was born to Ada and Ben.',
  lamb: 'A lamb was born after sustained feeding.',
  couple: 'Ada and Ben became a couple.',
  weddingCalled: 'A wedding feast for Ada and Ben is called at the fire tomorrow.',
  weddingBegins: 'The wedding feast at the fire begins.',
  weddingOver: 'The wedding feast at the fire is over: 8 came.',
  argued: 'Yara and Zeke argued over the last wood.',
  lastBerry: 'Petra reached the last berry a moment before Tomas.',
  injury: 'Zia got a bad cut felling a tree.',
  drove: 'Pavel drove a wolf off with a spear, and wounded it.',
  killed: 'Pavel killed a wolf with a spear; its body needs butchering.',
  traveller: 'A traveller, Rosa, arrives at the settlement.',
  couplesArrive: 'Thea and Basil arrive at the settlement together.',
  family: 'A family — Ana, Ulric and little Lia — arrives at the settlement.',
  expecting: 'Sofia and Ivo are expecting a child.',
  deer: 'Ada and Ben brought down a deer.',
  funeral: 'A funeral for Ada is called at the hall tomorrow.',
  harvestFeast: 'A harvest feast is called at the fire tomorrow.',
  feastBegins: 'The feast at the fire begins.',
  market: 'A market is called at the fire today.',
  hopeFamily: 'Kira has what they hoped for: a family.',
  well: 'Pavel finished a shallow well.',
  storehouse: 'Jax finished a storehouse.',
  yard: 'Kai finished a timber yard for everyone.',
  warned: 'Maren warned Lena about a wolf.',
  goodTerms: 'Ivo and Bea are on good terms again (it faded with time).',
  peace: 'Cora helped Ada and Ben make peace.',
  apprentice: 'Maren has taken Dax on as an apprentice at building.',
  ownRight: 'Alma is a smith hand in their own right (quicker at it than at anything else).',
  hut: 'Bea finished a hut for the Juniper household.',
  leanTo: 'Zeke finished a lean-to for the Fern household.',
  cellar: 'Bea finished a cellar for the Juniper household.',
  hopeHome: 'Ivo has what they hoped for: a solid home of their own.',
  hopeTrade: 'Alma has what they hoped for: a trade of their own.',
  crew: "Jonas, Isla, Eli, Lena have become a crew: Jonas's crew.",
  fed: 'Pia fed Abel.',
  gave: 'Pia gave Abel a stick doll.',
  promised: 'Ivo promised Kai stone.',
  agreed: 'Isla agreed to help Jonas build.',
  marked: 'Ivo marked out a hut for the Brook household.',
  spear: 'Alma made a spear.',
  repaired: 'Sven repaired a lean-to.',
  fireOut: 'The fire has gone out.',
  relit: 'Sven relit the fire.',
  ripening: 'Crops are ripening in the Moss field.',
  story: 'Yan told a story at the fire: how Cole finished a shallow well.',
  rain: 'Rain begins to fall.',
  storm: 'A storm rolls in.',
  decay: 'A hut fell down.',
  sawn: 'Ben finished sawn planks at the timber yard.',
  learned: 'Ada learned splitting from Ben.',
  unnamed: 'Something happened.',
};

const say = (w: World, kind: EventKind, text: string, ids: number[] = [], x = 0, y = 0): WorldEvent => {
  addEvent(w, kind, text, ids, x, y);
  return w.events[w.events.length - 1];
};
const ev = (kind: EventKind, text: string): WorldEvent => ({ id: 1, tick: 0, kind, text, ids: [], x: 0, y: 0 });
/** a director with no live scan: only events */
const quiet = () => new Director(() => []);
const cand = (key: string, score: number, subjectId: number, text = key, kind: LiveKind = 'talk', x = 10, y = 10): LiveCandidate => ({ key, kind, score, subjectId, x, y, caption: () => text });

describe('how worth watching an event is: three bands, real wording', () => {
  it('the bands, and what falls in each', () => {
    expect([TOP_FROM, MIDDLE_FROM, FILLER_BELOW]).toEqual([80, 50, 30]);
    expect([bandOf(100), bandOf(80), bandOf(79), bandOf(50), bandOf(49), bandOf(25), bandOf(0)]).toEqual(['top', 'top', 'middle', 'middle', 'filler', 'filler', 'filler']);
  });

  it('TOP: a death, a bite, a birth, a wolf driven off, a pairing, a wedding and every conflict', () => {
    const top: [EventKind, string, number][] = [
      ['life', TEXT.death, 100],
      ['life', TEXT.wolfDeath, 100],
      ['danger', TEXT.fatal, 95],
      ['life', TEXT.birth, 90],
      ['danger', TEXT.bite, 90],
      ['danger', TEXT.drove, 88],
      ['danger', TEXT.killed, 88],
      ['life', TEXT.couple, 85],
      ['social', TEXT.weddingCalled, 80],
      ['social', TEXT.weddingBegins, 80],
      ['conflict', TEXT.argued, 80],
      ['conflict', TEXT.lastBerry, 80],
    ];
    for (const [kind, text, weight] of top) {
      expect(storyWeight(ev(kind, text)), text).toBe(weight);
      expect(bandOf(storyWeight(ev(kind, text))), text).toBe('top');
    }
  });

  it('MIDDLE: an injury, an arrival, a child expected, a deer, a gathering, a shared building, a warning, peace, a trade of one\'s own', () => {
    const middle: [EventKind, string, number][] = [
      ['danger', TEXT.injury, 65],
      ['life', TEXT.traveller, 60],
      ['life', TEXT.couplesArrive, 60],
      ['life', TEXT.family, 60],
      ['life', TEXT.expecting, 60],
      ['work', TEXT.deer, 55],
      ['social', TEXT.funeral, 60],
      ['social', TEXT.harvestFeast, 58],
      ['social', TEXT.feastBegins, 55],
      ['social', TEXT.market, 55],
      ['life', TEXT.hopeFamily, 55],
      ['build', TEXT.well, 55],
      ['build', TEXT.storehouse, 55],
      ['build', TEXT.yard, 55],
      ['danger', TEXT.warned, 50],
      ['social', TEXT.goodTerms, 50],
      ['social', TEXT.peace, 50],
      ['work', TEXT.apprentice, 50],
      ['work', TEXT.ownRight, 50],
    ];
    for (const [kind, text, weight] of middle) {
      expect(storyWeight(ev(kind, text)), text).toBe(weight);
      expect(bandOf(storyWeight(ev(kind, text))), text).toBe('middle');
    }
  });

  it('FILLER: a household\'s home finished, a hope for a home or a trade, a crew, and the small business of the day', () => {
    const filler: [EventKind, string, number][] = [
      ['build', TEXT.hut, 25],
      ['build', TEXT.leanTo, 25],
      ['build', TEXT.cellar, 25],
      ['life', TEXT.hopeHome, 25],
      ['life', TEXT.hopeTrade, 25],
      ['social', TEXT.crew, 22],
      ['social', TEXT.weddingOver, 20],
      ['social', TEXT.fed, 5],
      ['social', TEXT.gave, 8],
      ['social', TEXT.promised, 8],
      ['social', TEXT.agreed, 10],
      ['build', TEXT.marked, 10],
      ['build', TEXT.spear, 10],
      ['build', TEXT.repaired, 10],
      ['survival', TEXT.fireOut, 8],
      ['survival', TEXT.relit, 8],
      ['farm', TEXT.ripening, 6],
    ];
    for (const [kind, text, weight] of filler) {
      expect(storyWeight(ev(kind, text)), text).toBe(weight);
      expect(bandOf(storyWeight(ev(kind, text))), text).toBe('filler');
    }
  });

  it('a wolf bite outranks a finished hut; a building for everyone outranks a household\'s; a story retold is not the thing retold', () => {
    expect(storyWeight(ev('danger', TEXT.bite))).toBeGreaterThan(storyWeight(ev('build', TEXT.hut)));
    expect(storyWeight(ev('build', TEXT.well))).toBeGreaterThan(storyWeight(ev('build', TEXT.hut)));
    expect(storyWeight(ev('build', TEXT.yard))).toBeGreaterThan(storyWeight(ev('build', TEXT.cellar)));
    expect(storyWeight(ev('social', TEXT.story))).toBeLessThan(FILLER_BELOW);
    expect(storyWeight(ev('life', TEXT.lamb)), 'a lamb is not a person born').toBeLessThan(storyWeight(ev('life', TEXT.birth)));
  });

  it('weather and workshop output weigh nothing; so do other work events', () => {
    for (const [kind, text] of [['nature', TEXT.rain], ['nature', TEXT.storm], ['nature', TEXT.decay], ['work', TEXT.sawn], ['work', TEXT.learned]] as const) {
      expect(storyWeight(ev(kind, text)), text).toBe(0);
    }
    // whatever the wording: every nature and work event but a deer, an apprenticeship and a trade of one's own
    expect(storyWeight(ev('nature', TEXT.death))).toBe(0);
    expect(storyWeight(ev('work', TEXT.birth))).toBe(0);
  });

  it('a wording no rule names weighs by its kind', () => {
    const by: Partial<Record<EventKind, number>> = { conflict: 80, danger: 50, life: 50, social: 12, build: 10, trade: 10, survival: 8, farm: 6, work: 0, nature: 0 };
    for (const kind of Object.keys(by) as EventKind[]) {
      expect(storyWeight(ev(kind, TEXT.unnamed)), kind).toBe(by[kind]);
      // conflict, work and nature have a rule of their own (every one of them, or none of them)
      if (kind !== 'conflict' && kind !== 'work' && kind !== 'nature') expect(matchEvent(ev(kind, TEXT.unnamed)).id, kind).toBe(`default:${kind}`);
    }
  });

  it('is the same for the same event every time and reads nothing but its kind and words', () => {
    const e = ev('life', TEXT.birth);
    expect(storyWeight(e)).toBe(storyWeight({ ...e, id: 99, tick: 12345, ids: [1, 2], x: 3, y: 4 } as WorldEvent));
  });
});

describe('the first look, and a different world', () => {
  it('events already in the world are history: the first step shows no shot', () => {
    const { w, ada } = village('prime');
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    const d = quiet();
    d.step(w, 0.016);
    d.step(w, 0.016);
    expect(d.shot).toBeNull();
    expect(d.waiting().length).toBe(0);
    expect(d.counts).toEqual({ shown: 0, stale: 0, overflow: 0, merged: 0, filler: 0, live: 0 });
  });

  it('a new TOP or MIDDLE event becomes the shot, about the person it is about', () => {
    const { w, ada, ben } = village('shot');
    const d = quiet();
    d.step(w, 0);
    const e = say(w, 'life', TEXT.couple, [ada.id, ben.id], 40, 30);
    d.step(w, 0.016);
    expect(d.shot?.kind).toBe('event');
    expect(d.shot?.ev).toBe(e);
    expect(d.shot?.text).toBe(TEXT.couple);
    expect(d.shot?.tick).toBe(e.tick);
    expect(d.shot?.subjectId).toBe(ada.id);
    expect([d.shot?.x, d.shot?.y]).toEqual([40, 30]);
    expect(d.shot?.weight).toBe(85);
    expect(d.shot?.filler).toBe(false);
    expect(d.shot?.age).toBe(0);
    expect(d.counts.shown).toBe(1);
    for (let i = 0; i < 50; i++) d.step(w, 0.016);
    expect(d.counts.shown, 'the same event is never shown twice').toBe(1);
  });

  it('the subject is the first of the event\'s people who is alive, else the place', () => {
    const { w, ben } = village('subject');
    const d = quiet();
    d.step(w, 0);
    const gone = 987654;
    const born = say(w, 'life', TEXT.birth, [gone, ben.id], 41, 30);
    d.step(w, 0.016);
    expect(d.shot?.ev).toBe(born);
    expect(d.shot?.subjectId).toBe(ben.id);
    d.skip();
    const grave = say(w, 'life', TEXT.death, [gone], 12, 34);
    d.step(w, 0.016);
    expect(d.shot?.ev).toBe(grave);
    expect(d.shot?.subjectId).toBe(0);
    expect([d.shot?.x, d.shot?.y]).toEqual([12, 34]);
  });

  it('an event that weighs nothing is never a shot, and no filler is kept for it', () => {
    const { w, ada } = village('zero');
    const d = quiet();
    d.step(w, 0);
    say(w, 'nature', TEXT.rain);
    say(w, 'work', TEXT.sawn, [ada.id], 40, 30);
    d.step(w, 0.016);
    expect(d.shot).toBeNull();
    expect(d.hasNext()).toBe(false);
  });

  it('a different world resets everything and is primed without showing its history', () => {
    const a = village('world-a');
    const b = village('world-b');
    const d = quiet();
    d.step(a.w, 0);
    say(a.w, 'life', TEXT.death, [a.ada.id], 40, 30);
    d.step(a.w, 0.016);
    expect(d.shot).not.toBeNull();
    say(b.w, 'life', TEXT.birth, [b.ben.id], 41, 30);
    d.step(b.w, 0.016);
    expect(d.shot).toBeNull();
    expect(d.waiting().length).toBe(0);
    expect(d.counts).toEqual({ shown: 0, stale: 0, overflow: 0, merged: 0, filler: 0, live: 0 });
    say(b.w, 'life', TEXT.couple, [b.ada.id], 40, 30);
    d.step(b.w, 0.016);
    expect(d.shot?.text).toBe(TEXT.couple);
  });
});

describe('the hold, and the early cut', () => {
  it('a MIDDLE event waits the whole of MIN_HOLD', () => {
    const { w, ada, ben } = village('hold');
    const d = quiet();
    d.step(w, 0);
    const first = say(w, 'life', TEXT.traveller, [ada.id], 40, 30);
    d.step(w, 0);
    const second = say(w, 'life', TEXT.expecting, [ben.id], 41, 30);
    d.step(w, MIN_HOLD - 0.5);
    expect(d.shot?.ev).toBe(first);
    expect(d.waiting().map((q) => q.ev)).toEqual([second]);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(second);
    expect(d.shot?.age).toBe(0);
    expect(MIN_HOLD).toBe(15);
  });

  it('a TOP event cuts a shot from a lower band after MIN_CUT, not before', () => {
    const { w, ada, ben } = village('cut');
    const d = quiet();
    d.step(w, 0);
    const middle = say(w, 'life', TEXT.traveller, [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(middle);
    const top = say(w, 'life', TEXT.couple, [ben.id], 41, 30);
    d.step(w, MIN_CUT - 0.5);
    expect(d.shot?.ev, 'too soon').toBe(middle);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(top);
    expect(MIN_CUT).toBe(3);
  });

  it('a TOP event does not cut a TOP shot early: it waits for the hold', () => {
    const { w, ada, ben } = village('cut-top');
    const d = quiet();
    d.step(w, 0);
    const death = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const couple = say(w, 'life', TEXT.couple, [ben.id], 41, 30);
    d.step(w, MIN_HOLD - 0.5);
    expect(d.shot?.ev).toBe(death);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(couple);
  });

  it('a MIDDLE event does not cut even a FILLER shot early', () => {
    const { w, ada, ben } = village('cut-filler');
    const d = quiet();
    d.step(w, 0);
    const gift = say(w, 'social', TEXT.gave, [ada.id, ben.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(gift);
    expect(d.shot?.filler).toBe(true);
    const arrival = say(w, 'life', TEXT.traveller, [ben.id], 41, 30);
    d.step(w, MIN_HOLD - 0.5);
    expect(d.shot?.ev).toBe(gift);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(arrival);
  });

  it('with nothing waiting the shot stays, and an event\'s caption fades after CAPTION_SECONDS', () => {
    const { w, ada } = village('caption');
    const d = quiet();
    d.step(w, 0);
    const e = say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.captionFresh()).toBe(true);
    d.step(w, CAPTION_SECONDS - 0.5);
    expect(d.captionFresh()).toBe(true);
    d.step(w, 0.5);
    expect(d.captionFresh()).toBe(false);
    for (let i = 0; i < 20; i++) d.step(w, 10);
    expect(d.shot?.ev, 'the shot is still the shot').toBe(e);
    expect(quiet().captionFresh()).toBe(false);
  });

  it('the best waiting event is the heaviest, the oldest among equals', () => {
    const { w, ada } = village('best');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const arrival = say(w, 'life', TEXT.traveller, [], 20, 20);
    const injury = say(w, 'danger', TEXT.injury, [], 21, 20);
    const expecting = say(w, 'life', TEXT.expecting, [], 22, 20);
    const harvest = say(w, 'social', TEXT.harvestFeast, [], 23, 20);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(injury);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(arrival);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(expecting);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(harvest);
  });
});

describe('the queue: stale events and a full queue', () => {
  it('a waiting event older than a simulated day is dropped as stale', () => {
    const { w, ada } = village('stale-ticks');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    say(w, 'life', TEXT.traveller, [], 20, 20);
    d.step(w, 0);
    expect(d.waiting().length).toBe(1);
    w.tick += STALE_TICKS + 1;
    d.step(w, 0);
    expect(d.waiting().length).toBe(0);
    expect(d.counts.stale).toBe(1);
    say(w, 'life', TEXT.traveller, [], 20, 20);
    d.step(w, 0);
    w.tick += STALE_TICKS;
    d.step(w, 0);
    expect(d.waiting().length, 'a day exactly is not yet stale').toBe(1);
    expect(d.counts.stale).toBe(1);
  });

  it('a waiting event that has waited more than STALE_SECONDS (60) is dropped as stale', () => {
    const { w, ada } = village('stale-secs');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    // six of six different rules (so none fades another), none about a person (so none merges with another)
    say(w, 'danger', TEXT.injury, [], 20, 20);
    say(w, 'life', TEXT.traveller, [], 21, 20);
    say(w, 'life', TEXT.expecting, [], 22, 20);
    say(w, 'social', TEXT.funeral, [], 23, 20);
    say(w, 'social', TEXT.harvestFeast, [], 24, 20);
    say(w, 'social', TEXT.market, [], 25, 20);
    d.step(w, 0);
    expect(d.waiting().length).toBe(MAX_WAITING);
    for (let i = 0; i < 4; i++) d.step(w, MIN_HOLD);
    expect(d.waiting().length).toBe(2);
    expect(d.counts.stale).toBe(0);
    expect(STALE_SECONDS).toBe(60);
    d.step(w, MIN_HOLD);
    expect(d.counts.stale, 'the last two have now waited 75 s').toBe(2);
    expect(d.waiting().length).toBe(0);
  });

  it('a full queue drops the lightest, the oldest among equals', () => {
    const { w, ada } = village('cap');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const deer = [1, 2].map((i) => say(w, 'work', TEXT.deer, [], 20 + i, 20));
    const arrivals = [1, 2, 3].map((i) => say(w, 'life', TEXT.traveller, [], 24 + i, 20));
    const injuries = [1, 2, 3].map((i) => say(w, 'danger', TEXT.injury, [], 30 + i, 20));
    d.step(w, 0);
    expect(d.waiting().length).toBe(MAX_WAITING);
    expect(d.counts.overflow).toBe(2);
    const kept = d.waiting().map((q) => q.ev);
    for (const e of deer) expect(kept).not.toContain(e);
    expect(kept).toEqual([...arrivals, ...injuries]);
    const e2 = village('cap-equal');
    const d2 = quiet();
    d2.step(e2.w, 0);
    say(e2.w, 'life', TEXT.death, [e2.ada.id], 40, 30);
    d2.step(e2.w, 0);
    const same = Array.from({ length: MAX_WAITING + 1 }, (_, i) => say(e2.w, 'life', TEXT.traveller, [], 20 + i, 20));
    d2.step(e2.w, 0);
    expect(d2.waiting().map((q) => q.ev)).toEqual(same.slice(1));
    expect(d2.counts.overflow).toBe(1);
  });
});

describe('repeats fade, and a same-moment pair is one moment', () => {
  it('each showing of a rule in the last day takes REPEAT_FADE off the next of that rule waiting, so another rule goes first', () => {
    const { w, ada, ben } = village('fade');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const a1 = say(w, 'life', TEXT.traveller, [], 20, 20);
    const a2 = say(w, 'life', TEXT.couplesArrive, [], 21, 20);
    const exp = say(w, 'life', TEXT.expecting, [ben.id], 41, 30);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev, 'the oldest of the equals').toBe(a1);
    const second = d.waiting().find((q) => q.ev === a2)!;
    expect(d.effective(second)).toBeCloseTo(60 * REPEAT_FADE, 9);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev, 'the other rule, though it is younger').toBe(exp);
    // the faded arrival (36) is no longer MIDDLE waiting: it is shown when nothing better is, and only once the shot has lingered
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(exp);
    d.step(w, LINGER_SECONDS - MIN_HOLD);
    expect(d.shot?.ev).toBe(a2);
    // a day later the showings no longer count
    const a3 = say(w, 'life', TEXT.traveller, [], 22, 20);
    d.step(w, 0);
    const third = d.waiting().find((q) => q.ev === a3)!;
    expect(d.effective(third)).toBeCloseTo(60 * REPEAT_FADE * REPEAT_FADE, 9);
    w.tick += DAY + 1;
    expect(d.effective(third)).toBe(60);
  });

  it('TOP events are exempt', () => {
    const { w, ada, ben } = village('fade-top');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    d.step(w, 0);
    say(w, 'life', TEXT.couple, [ben.id], 41, 30);
    d.step(w, 0);
    const next = d.waiting()[0];
    d.step(w, MIN_HOLD);
    expect(next.weight).toBe(85);
    const again = say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    w.tick += 10;
    d.step(w, 0);
    const q = d.waiting().find((x) => x.ev === again)!;
    expect(d.effective(q), 'two couples have been shown and the third is still 85').toBe(85);
  });

  it('a faded event still waiting is shown before the filler candidate; the filler waits behind it', () => {
    const { w, ada, ben } = village('fade-filler');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const a1 = say(w, 'life', TEXT.traveller, [], 20, 20);
    const a2 = say(w, 'life', TEXT.couplesArrive, [], 21, 20);
    const gift = say(w, 'social', TEXT.gave, [ben.id], 41, 30);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(a1);
    d.step(w, LINGER_SECONDS);
    expect(d.shot?.ev, 'the faded arrival (36) before the gift (8)').toBe(a2);
    d.step(w, LINGER_SECONDS);
    expect(d.shot?.ev).toBe(gift);
    expect(d.shot?.filler).toBe(true);
  });

  it('two events within MERGE_TICKS about the same first living person are one moment: the heavier is kept', () => {
    const { w, ada, ben } = village('merge');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ben.id], 41, 30);
    d.step(w, 0);
    const t0 = w.tick;
    const hurt = say(w, 'danger', 'Ada got a bad cut felling a tree.', [ada.id], 40, 30);
    w.tick = t0 + MERGE_TICKS;
    const bite = say(w, 'danger', 'A wolf bit Ada.', [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.waiting().map((q) => q.ev)).toEqual([bite]);
    expect(d.counts.merged).toBe(1);
    expect(hurt).not.toBe(bite);
    // the heavier first: the lighter is the one dropped
    const e = village('merge-order');
    const d2 = quiet();
    d2.step(e.w, 0);
    say(e.w, 'life', TEXT.death, [e.ben.id], 41, 30);
    d2.step(e.w, 0);
    const bite2 = say(e.w, 'danger', 'A wolf bit Ada.', [e.ada.id], 40, 30);
    e.w.tick += 2;
    say(e.w, 'danger', 'Ada got a bad cut felling a tree.', [e.ada.id], 40, 30);
    d2.step(e.w, 0);
    expect(d2.waiting().map((q) => q.ev)).toEqual([bite2]);
    expect(d2.counts.merged).toBe(1);
  });

  it('a pair further apart, about different people, or about nobody is not merged', () => {
    const { w, ada, ben } = village('merge-not');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ben.id], 41, 30);
    d.step(w, 0);
    const t0 = w.tick;
    say(w, 'danger', 'Ada got a bad cut felling a tree.', [ada.id], 40, 30);
    w.tick = t0 + MERGE_TICKS + 1;
    say(w, 'danger', 'A wolf bit Ada.', [ada.id], 40, 30);
    say(w, 'life', TEXT.traveller, [ben.id], 41, 30);
    say(w, 'life', TEXT.expecting, [], 20, 20);
    say(w, 'life', TEXT.couplesArrive, [], 20, 21);
    d.step(w, 0);
    expect(d.waiting().length).toBe(5);
    expect(d.counts.merged).toBe(0);
  });

  it('a household\'s home finished and the hope for a home are one moment (the filler candidate is merged too)', () => {
    const { w, ada, ben } = village('merge-filler');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ben.id], 41, 30);
    d.step(w, 0);
    say(w, 'build', 'Ada finished a hut for the Ada household.', [ada.id], 40, 30);
    w.tick += 1;
    say(w, 'life', 'Ada has what they hoped for: a solid home of their own.', [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.counts.merged).toBe(1);
    expect(d.hasNext()).toBe(true);
    // a MIDDLE event about the same person within the window takes over from the filler
    say(w, 'danger', 'Ada got a bad cut felling a tree.', [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.counts.merged).toBe(2);
    expect(d.waiting().map((q) => q.ev.text)).toEqual(['Ada got a bad cut felling a tree.']);
  });
});

describe('the FILLER candidate: shown only when nothing better exists', () => {
  it('with no shot up an ordinary event about a living person is the shot at once, flagged filler', () => {
    const { w, ada, ben } = village('fill-now');
    const d = quiet();
    d.step(w, 0);
    const gift = say(w, 'social', TEXT.gave, [ada.id, ben.id], 40, 30);
    expect(d.hasNext()).toBe(false);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(gift);
    expect(d.shot?.filler).toBe(true);
    expect(d.shot?.subjectId).toBe(ada.id);
    expect(d.counts).toEqual({ shown: 1, stale: 0, overflow: 0, merged: 0, filler: 1, live: 0 });
    expect(d.hasNext(), 'the candidate was used').toBe(false);
  });

  it('with a shot up it waits for the hold, and never while a TOP or MIDDLE event waits', () => {
    const { w, ada, ben } = village('fill-hold');
    const d = quiet();
    d.step(w, 0);
    const death = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const gift = say(w, 'social', TEXT.gave, [ada.id, ben.id], 41, 30);
    const arrival = say(w, 'life', TEXT.traveller, [], 20, 20);
    d.step(w, MIN_HOLD - 0.5);
    expect(d.shot?.ev).toBe(death);
    d.step(w, 0.5);
    expect(d.shot?.ev, 'the MIDDLE event first').toBe(arrival);
    d.step(w, LINGER_SECONDS - 0.5);
    expect(d.shot?.ev, 'the gift is no heavier than the arrival, so it waits until the arrival has lingered').toBe(arrival);
    expect(d.counts.filler).toBe(0);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(gift);
    expect(d.counts.filler).toBe(1);
  });

  it('it needs a living person; the newest is kept, and of those arriving together the heaviest', () => {
    const { w, ada, ben } = village('fill-subject');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    say(w, 'social', TEXT.gave, [], 40, 30);
    say(w, 'social', TEXT.gave, [987654], 40, 30);
    d.step(w, 0);
    expect(d.hasNext()).toBe(false);
    const first = say(w, 'social', TEXT.promised, [ada.id], 40, 30);
    d.step(w, 0);
    const second = say(w, 'social', TEXT.fed, [ben.id], 41, 30);
    d.step(w, 0);
    // together: the heavier (crew, 22) though older, then of two equals the newer
    const crew = say(w, 'social', TEXT.crew, [ada.id], 42, 30);
    say(w, 'social', TEXT.gave, [ben.id], 43, 30);
    d.step(w, 0);
    d.step(w, LINGER_SECONDS);
    expect(d.shot?.ev).toBe(crew);
    expect(first).not.toBe(second);
    expect(d.hasNext()).toBe(false);
  });

  it('it goes when older than FILLER_STALE_TICKS or when its person is gone', () => {
    const { w, ada, ben } = village('fill-stale');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    say(w, 'social', TEXT.gave, [ada.id, ben.id], 40, 30);
    d.step(w, 0);
    expect(d.hasNext()).toBe(true);
    w.tick += FILLER_STALE_TICKS;
    d.step(w, 0);
    expect(d.hasNext(), 'a quarter of a day exactly is not yet stale').toBe(true);
    w.tick += 1;
    d.step(w, 0);
    expect(d.hasNext()).toBe(false);
    const e = village('fill-gone');
    const d2 = quiet();
    d2.step(e.w, 0);
    say(e.w, 'life', TEXT.death, [e.ada.id], 40, 30);
    d2.step(e.w, 0);
    say(e.w, 'social', TEXT.gave, [e.ben.id], 41, 30);
    d2.step(e.w, 0);
    e.ben.alive = false;
    e.w.byId.delete(e.ben.id);
    d2.step(e.w, 0);
    expect(d2.hasNext()).toBe(false);
  });

  it('a filler shot ends when its person goes; a TOP or MIDDLE event shot becomes one of the place', () => {
    const { w, ada, ben } = village('gone');
    const d = quiet();
    d.step(w, 0);
    say(w, 'social', TEXT.gave, [ben.id, ada.id], 41, 30);
    d.step(w, 0);
    expect(d.shot?.filler).toBe(true);
    ben.alive = false;
    w.byId.delete(ben.id);
    d.step(w, 0.016);
    expect(d.shot, 'a filler shot is only ever about a person, so it ends').toBeNull();
    const birth = say(w, 'life', TEXT.birth, [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.subjectId).toBe(ada.id);
    const rev = d.shot!.rev;
    ada.alive = false;
    w.byId.delete(ada.id);
    d.step(w, 0.016);
    expect(d.shot?.ev).toBe(birth);
    expect(d.shot?.subjectId).toBe(0);
    expect([d.shot?.x, d.shot?.y]).toEqual([40, 30]);
    expect(d.shot!.rev, 'the view is told to look at the place').not.toBe(rev);
  });
});

describe('skip and Next', () => {
  it('skip takes the best waiting event, then the best live thing, then the filler candidate, then there is no shot', () => {
    const { w, ada, ben, cal } = village('skip');
    let now: LiveCandidate[] = [];
    const d = new Director(() => now);
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, LIVE_SCAN_SECONDS);
    const arrival = say(w, 'life', TEXT.traveller, [], 20, 20);
    const gift = say(w, 'social', TEXT.gave, [ben.id], 41, 30);
    now = [cand('talk:1', 20, cal.id, 'Talking with Ada.')];
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.hasNext()).toBe(true);
    d.skip();
    expect(d.shot?.ev, 'the waiting event first').toBe(arrival);
    d.skip();
    expect(d.shot?.kind).toBe('live');
    expect(d.shot?.text).toBe('Talking with Ada.');
    d.skip();
    expect(d.shot?.ev, 'then the filler candidate').toBe(gift);
    expect(d.hasNext()).toBe(false);
    d.skip();
    expect(d.shot).toBeNull();
    expect(d.captionFresh()).toBe(false);
  });

  it('skip does not go back to the live thing it dropped, even one too telling for the cooldown', () => {
    const { w, ada, cal } = village('skip-live');
    const d = new Director(() => [cand('wolf:1', 70, cal.id, 'A wolf is stalking near Cal.', 'wolf')]);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.liveKey).toBe('wolf:1');
    expect(d.hasNext()).toBe(false);
    d.skip();
    expect(d.shot).toBeNull();
    expect(ada.alive).toBe(true);
  });
});

describe('what is live: choosing, holding, ending and the cooldown', () => {
  it('with no shot a live thing is the shot at once; with a shot up, only when the hold is up', () => {
    const { w, ada, ben } = village('live-pick');
    let now: LiveCandidate[] = [];
    const d = new Director(() => now);
    d.step(w, 0);
    now = [cand('talk:1', 40, ada.id, 'Talking with Ben.')];
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.kind).toBe('live');
    expect(d.shot?.liveKey).toBe('talk:1');
    expect(d.shot?.text).toBe('Talking with Ben.');
    expect(d.shot?.subjectId).toBe(ada.id);
    expect(d.shot?.tick).toBe(w.tick);
    expect(d.counts).toMatchObject({ shown: 1, live: 1 });
    expect(d.captionFresh()).toBe(true);
    // an event shot is up (an arrival, 60): a live thing scoring more takes it at the hold; one scoring less waits until the shot has lingered
    const e = village('live-pick-2');
    const d2 = new Director(() => [cand('talk:9', 68, e.ben.id, 'A mediation.')]);
    d2.step(e.w, 0);
    say(e.w, 'life', TEXT.traveller, [e.ada.id], 40, 30);
    d2.step(e.w, LIVE_SCAN_SECONDS);
    expect(d2.shot?.kind).toBe('event');
    d2.step(e.w, MIN_HOLD - LIVE_SCAN_SECONDS - 0.5);
    expect(d2.shot?.kind, 'the hold is not up').toBe('event');
    d2.step(e.w, 0.5 + LIVE_SCAN_SECONDS);
    expect(d2.shot?.kind, 'the hold is up and it scores more').toBe('live');
    const f = village('live-pick-3');
    const d3 = new Director(() => [cand('talk:8', 40, f.ben.id, 'Talking.')]);
    d3.step(f.w, 0);
    say(f.w, 'life', TEXT.traveller, [f.ada.id], 40, 30);
    d3.step(f.w, LIVE_SCAN_SECONDS);
    d3.step(f.w, MIN_HOLD);
    expect(d3.shot?.kind, 'the hold is up but it scores less: the shot lingers').toBe('event');
    d3.step(f.w, LINGER_SECONDS - MIN_HOLD - LIVE_SCAN_SECONDS);
    expect(d3.shot?.kind).toBe('event');
    d3.step(f.w, LIVE_SCAN_SECONDS + 0.5);
    expect(d3.shot?.kind, 'after LINGER_SECONDS anything may replace it').toBe('live');
    expect(ben.alive).toBe(true);
  });

  it('a live thing is read from the world at most once a UI second', () => {
    const { w, ada } = village('live-rate');
    let scans = 0;
    const d = new Director(() => {
      scans++;
      return [cand('talk:1', 20, ada.id)];
    });
    d.step(w, 0);
    for (let i = 0; i < 100; i++) d.step(w, 0.05);
    expect(scans, 'five UI seconds').toBeLessThanOrEqual(1 + Math.ceil(5 / LIVE_SCAN_SECONDS));
    expect(scans).toBeGreaterThanOrEqual(5);
  });

  it('a live shot ends when its condition ends: the camera stays with the person, the caption goes, and a MIDDLE event takes over at once', () => {
    const { w, ada, ben } = village('live-end');
    let now: LiveCandidate[] = [cand('talk:1', 50, ada.id, 'Talking with Ben.')];
    const d = new Director(() => now);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.liveKey).toBe('talk:1');
    expect(d.captionFresh()).toBe(true);
    now = [];
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.ended, 'over: the shot is still there, with its person').toBe(true);
    expect(d.shot?.subjectId).toBe(ada.id);
    expect(d.captionFresh(), 'but the caption has gone').toBe(false);
    // a MIDDLE event does not wait for the hold (15 s) of a shot whose thing is over
    const arrival = say(w, 'life', TEXT.traveller, [ben.id], 41, 30);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(arrival);
    expect(d.shot!.age).toBeLessThan(MIN_HOLD);
    // a live candidate waits for the hold, and (scoring less than the one just over) for the linger
    const e = village('live-end-2');
    let n2: LiveCandidate[] = [cand('talk:1', 50, e.ada.id, 'Talking.')];
    const d2 = new Director(() => n2);
    d2.step(e.w, 0);
    d2.step(e.w, LIVE_SCAN_SECONDS);
    n2 = [cand('talk:2', 30, e.ben.id, 'Talking with Cal.')];
    d2.step(e.w, LIVE_SCAN_SECONDS);
    expect(d2.shot?.ended).toBe(true);
    d2.step(e.w, MIN_HOLD);
    expect(d2.shot?.liveKey, 'the hold is up, but 30 is not more than 50').toBe('talk:1');
    d2.step(e.w, LINGER_SECONDS);
    expect(d2.shot?.liveKey).toBe('talk:2');
  });

  it('a live shot whose thing comes back is live again', () => {
    const { w, cal } = village('live-revive');
    let now: LiveCandidate[] = [cand('wolf:1', 70, cal.id, 'A wolf is stalking near Cal.', 'wolf')];
    const d = new Director(() => now);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    now = [];
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.ended).toBe(true);
    now = [cand('wolf:1', 70, cal.id, 'A wolf is attacking near Cal.', 'wolf')];
    const rev = d.shot!.rev;
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.ended).toBe(false);
    expect(d.shot?.text).toBe('A wolf is attacking near Cal.');
    expect(d.shot!.rev, 'the same shot: the camera is not moved').toBe(rev);
    expect(d.counts.live).toBe(1);
  });

  it('a live shot whose thing goes on stays beyond the hold; a higher score takes it at the hold, an equal one does not', () => {
    const { w, ada, ben, cal } = village('live-stay');
    let now: LiveCandidate[] = [cand('talk:1', 40, ada.id, 'Talking with Ben.')];
    const d = new Director(() => now);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.liveKey).toBe('talk:1');
    now = [cand('talk:1', 40, ada.id, 'Talking with Ben.'), cand('talk:2', 40, ben.id, 'Talking with Cal.')];
    for (let i = 0; i < 4; i++) d.step(w, MIN_HOLD);
    expect(d.shot?.liveKey, 'an equal score does not move the camera').toBe('talk:1');
    now = [cand('talk:1', 40, ada.id, 'Talking with Ben.'), cand('talk:3', 55, cal.id, 'Teaching.')];
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.liveKey).toBe('talk:3');
  });

  it('its caption is read again at each scan while it lasts, and stays up past CAPTION_SECONDS', () => {
    const { w, ada } = village('live-caption');
    let text = 'Walking to the well.';
    const d = new Director(() => [{ ...cand('talk:1', 40, ada.id), caption: () => text }]);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.text).toBe('Walking to the well.');
    text = 'Drawing water.';
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.text).toBe('Drawing water.');
    d.step(w, CAPTION_SECONDS + 5);
    expect(d.shot?.kind).toBe('live');
    expect(d.captionFresh()).toBe(true);
  });

  it('the same live thing is not picked again for LIVE_COOLDOWN unless its score is 70 or more', () => {
    const { w, ada, ben } = village('live-cool');
    let now: LiveCandidate[] = [cand('talk:1', 40, ada.id, 'Talking.')];
    const d = new Director(() => now);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.liveKey).toBe('talk:1');
    d.skip();
    expect(d.shot, 'skipped, and nothing else is there').toBeNull();
    // it is still going, a few seconds later: on cooldown, so not picked
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot).toBeNull();
    for (let t = 0; t < LIVE_COOLDOWN - 10; t += LIVE_SCAN_SECONDS) d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot, 'still inside the minute').toBeNull();
    d.step(w, 10);
    expect(d.shot?.liveKey, 'after the minute it may be').toBe('talk:1');
    // a score of 70 or more is not held back
    const e = village('live-cool-top');
    const wolf: LiveCandidate[] = [cand('wolf:1', 70, e.ben.id, 'A wolf is stalking near Ben.', 'wolf')];
    const d2 = new Director(() => wolf);
    d2.step(e.w, 0);
    d2.step(e.w, LIVE_SCAN_SECONDS);
    expect(d2.shot?.liveKey).toBe('wolf:1');
    d2.skip();
    expect(d2.shot).toBeNull();
    d2.step(e.w, LIVE_SCAN_SECONDS);
    expect(d2.shot?.liveKey).toBe('wolf:1');
    expect(ben.alive).toBe(true);
  });

  it('a TOP event cuts a live shot of a lower band after MIN_CUT; a MIDDLE event waits for the hold; a TOP live shot is not cut early', () => {
    const { w, ada, ben, cal } = village('live-cut');
    const d = new Director(() => [cand('talk:1', 40, ada.id, 'Talking.')]);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.kind).toBe('live');
    const middle = say(w, 'life', TEXT.traveller, [], 20, 20);
    d.step(w, MIN_CUT);
    expect(d.shot?.kind, 'a MIDDLE event waits for the hold').toBe('live');
    const top = say(w, 'life', TEXT.couple, [ben.id], 41, 30);
    d.step(w, 0);
    expect(d.shot?.ev, 'a TOP one cuts in').toBe(top);
    expect(middle).not.toBe(top);
    // a wolf attacking (80) is a TOP live shot: another TOP event waits for the hold
    const e = village('live-cut-top');
    const d2 = new Director(() => [cand('wolf:1', 80, e.cal.id, 'A wolf is attacking near Cal.', 'wolf')]);
    d2.step(e.w, 0);
    d2.step(e.w, LIVE_SCAN_SECONDS);
    expect(d2.shot?.liveKey).toBe('wolf:1');
    const couple = say(e.w, 'life', TEXT.couple, [e.ben.id], 41, 30);
    d2.step(e.w, MIN_HOLD - LIVE_SCAN_SECONDS - 0.5);
    expect(d2.shot?.kind).toBe('live');
    d2.step(e.w, 0.5 + LIVE_SCAN_SECONDS);
    expect(d2.shot?.ev).toBe(couple);
    expect(cal.alive).toBe(true);
  });

  it('a live shot ends when its person goes', () => {
    const { w, ben } = village('live-gone');
    const d = new Director(() => [cand('talk:1', 40, ben.id, 'Talking.')]);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.subjectId).toBe(ben.id);
    ben.alive = false;
    w.byId.delete(ben.id);
    d.step(w, 0);
    expect(d.shot).toBeNull();
  });

  it('a gathering is a shot of the place', () => {
    const { w } = village('live-place');
    const d = new Director(() => [cand('occ:1', 70, 0, 'A wedding has begun. At the fire.', 'occasion', 44, 34)]);
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.subjectId).toBe(0);
    expect([d.shot?.x, d.shot?.y]).toEqual([44, 34]);
    expect(d.shot?.text).toBe('A wedding has begun. At the fire.');
  });
});

describe('the live signals, read from staged world state by the real scan', () => {
  it('a gathering under way: the card\'s own sentence, at the place; a wedding and a funeral 70, a feast 60, a market 45', () => {
    const { w, ada, ben } = village('scan-occ');
    expect(scanLive(w).filter((c) => c.kind === 'occasion')).toEqual([]);
    noteWedding(w, ada, ben);
    const o = w.occasions![0];
    expect(o.status, 'only called').toBe('called');
    expect(scanLive(w).filter((c) => c.kind === 'occasion')).toEqual([]);
    for (let i = 0; i < 4 * DAY && o.status !== 'gathering'; i++) {
      w.tick++;
      occasionsTick(w);
    }
    expect(o.status).toBe('gathering');
    const c = scanLive(w).find((x) => x.kind === 'occasion')!;
    expect(c.key).toBe(`occ:${o.id}`);
    expect(c.score).toBe(70);
    expect(c.subjectId).toBe(0);
    expect([c.x, c.y]).toEqual([o.x, o.y]);
    expect(c.caption()).toBe(occasionNotice(w, o).says);
    expect(c.caption()).toContain('Ada & Ben');
    const by: Record<string, number> = { wedding: 70, funeral: 70, feast: 60, harvest: 60, market: 45 };
    for (const kind of Object.keys(by) as (keyof typeof by)[]) {
      o.kind = kind as typeof o.kind;
      expect(scanLive(w).find((x) => x.kind === 'occasion')!.score, kind).toBe(by[kind]);
    }
  });

  it('a wolf stalking or attacking within 8 tiles of a living person: the person it is after, else the nearest; only its recorded state is said', () => {
    const { w, ada, ben } = village('scan-wolf');
    const wolf = makeWolf(w, 40.5 + 3, 30.5);
    expect(scanLive(w).filter((c) => c.kind === 'wolf'), 'roaming is not stalking').toEqual([]);
    wolf.state = 'stalk';
    wolf.targetId = ada.id;
    let c = scanLive(w).find((x) => x.kind === 'wolf')!;
    expect(c.key).toBe(`wolf:${wolf.id}`);
    expect(c.score).toBe(70);
    expect(c.subjectId).toBe(ada.id);
    expect(c.caption()).toBe('A wolf is stalking near Ada.');
    expect(c.caption()).toBe(wolfSentence('stalk', 'Ada'));
    wolf.state = 'attack';
    c = scanLive(w).find((x) => x.kind === 'wolf')!;
    expect(c.score).toBe(80);
    expect(c.caption()).toBe('A wolf is attacking near Ada.');
    // no recorded target: the nearest person within 8 tiles
    wolf.targetId = 0;
    wolf.x = 41.2;
    wolf.y = 30.2;
    c = scanLive(w).find((x) => x.kind === 'wolf')!;
    expect(c.subjectId).toBe(ben.id);
    expect(c.caption()).toBe('A wolf is attacking near Ben.');
    // a target further than 8 tiles is not the one it is near; and nobody within 8 means nothing to see
    wolf.targetId = ada.id;
    wolf.x = 40.5 + 20;
    wolf.y = 30.5;
    expect(scanLive(w).filter((x) => x.kind === 'wolf')).toEqual([]);
    wolf.state = 'retreat';
    wolf.x = 41;
    expect(scanLive(w).filter((x) => x.kind === 'wolf')).toEqual([]);
  });

  it('a conversation under way: scored by what it is for, plain chat least, the person\'s own "what are they doing" line', () => {
    const { w, ada, ben } = village('scan-talk');
    expect(scanLive(w).filter((c) => c.kind === 'talk')).toEqual([]);
    const conv = (purpose: Conversation['purpose'], id: number) => ({ id, a: ada.id, b: ben.id, purpose, start: w.tick, phase: 0, nextAt: w.tick, end: 0, requestId: 0, data: {} }) as unknown as Conversation;
    const scores: Record<string, number> = {};
    for (const [i, p] of (['chat', 'family_time', 'play_together', 'learn_foraging', 'teach_technique', 'mediate'] as const).entries()) {
      w.conversations = [conv(p, 9000 + i)];
      const c = scanLive(w).find((x) => x.kind === 'talk')!;
      expect(c.key).toBe(`talk:${9000 + i}`);
      expect(c.subjectId).toBe(ada.id);
      scores[p] = c.score;
    }
    expect(scores.chat).toBeLessThan(FILLER_BELOW);
    expect(scores.mediate).toBeGreaterThan(scores.teach_technique);
    expect(scores.teach_technique).toBeGreaterThan(scores.play_together);
    expect(scores.play_together).toBeGreaterThan(scores.family_time);
    expect(scores.family_time).toBeGreaterThan(scores.chat);
    expect(scores.mediate).toBeLessThan(70);
    const text = scanLive(w).find((x) => x.kind === 'talk')!.caption();
    expect(text.length).toBeGreaterThan(0);
    expect(w.conversations.length).toBe(1);
  });

  it('a person who speaks angrily (65) or in warning (60): the same caption source', () => {
    const { w, ada, ben } = village('scan-speech');
    ada.speech = { text: 'Stay out of it.', until: w.tick + 50, kind: 'angry' };
    ben.speech = { text: 'Wolf!', until: w.tick + 50, kind: 'warn' };
    const people = scanLive(w).filter((c) => c.kind === 'speech');
    expect(people.map((c) => [c.key, c.score])).toEqual([[`person:${ada.id}`, 65], [`person:${ben.id}`, 60]]);
    expect(people[0].caption().length).toBeGreaterThan(0);
    // a bubble that has run out, and a kind that is not angry or warning, are nothing
    ada.speech = { text: 'Stay out of it.', until: w.tick - 1, kind: 'angry' };
    ben.speech = { text: 'Hello.', until: w.tick + 50, kind: 'say' };
    expect(scanLive(w).filter((c) => c.kind === 'speech')).toEqual([]);
  });

  it('a person in real trouble (the inspector\'s own status line) scores 50; no problem is nothing', () => {
    const { w, ada, ben } = village('scan-trouble');
    expect(scanLive(w).filter((c) => c.kind === 'trouble')).toEqual([]);
    ada.needs.hunger = 3;
    const c = scanLive(w).find((x) => x.kind === 'trouble')!;
    expect(c.key).toBe(`person:${ada.id}`);
    expect(c.score).toBe(50);
    expect(c.subjectId).toBe(ada.id);
    expect(c.caption()).toMatch(/^At risk: /);
    expect(scanLive(w).filter((x) => x.kind === 'trouble').length).toBe(1);
    expect(ben.alive).toBe(true);
  });

  it('the best comes first', () => {
    const { w, ada, ben } = village('scan-order');
    ada.needs.hunger = 3;
    ben.speech = { text: 'Stay out of it.', until: w.tick + 50, kind: 'angry' };
    const wolf = makeWolf(w, 43.5, 30.5);
    wolf.state = 'stalk';
    wolf.targetId = ada.id;
    const scores = scanLive(w).map((c) => c.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores[0]).toBe(70);
  });
});

describe('the social scenes (rules 260): the walk, the welcome, the thanks in company', () => {
  // the words are the code's (src/sim/courting.ts, welcome.ts, praise.ts)
  const SCENE = {
    walkFirst: 'Ada and Ben walked out together for the first time.',
    walk: 'Ada and Ben walked out together.',
    walkCut: 'Ada and Ben set out to walk together and turned back.',
    refused: 'Ada asked Ben to walk out; Ben said not today.',
    welcomeFirst: 'Ada was the first to welcome the newcomers Dee and little Eve and told them where to find water and gave them food.',
    welcomeFirstBare: 'Ada was the first to welcome the newcomer Dee.',
    welcome: 'Cal welcomed the newcomer Dee and told them where to find water and gave them food.',
    welcomeBare: 'Cal welcomed the newcomers Dee and Fay.',
    rescueOff: 'At the fire Quinn thanked Pat before 5 people for driving off a wolf.',
    rescueKilled: 'At the harvest feast Quinn thanked Pat before 3 people for killing a wolf.',
    builders: 'At the fire Dan thanked Abe, Bea and Cal for the new kiln.',
    buildersMore: 'At the market Dan thanked Abe, Bea, Cal and the others who built it for the new storehouse.',
  };

  it('each has its rank: a pair\'s first walk 62, a later walk 45, a walk cut short 35, a refused ask 40', () => {
    const want: [string, string, number][] = [
      [SCENE.walkFirst, 'walk-first', 62],
      [SCENE.walk, 'walk', 45],
      [SCENE.walkCut, 'walk-cut', 35],
      [SCENE.refused, 'walk-refused', 40],
    ];
    for (const [text, id, weight] of want) {
      expect(matchEvent(ev('social', text)), text).toEqual({ id, weight });
    }
    expect(bandOf(62)).toBe('middle');
    expect(bandOf(45), 'a later walk is below MIDDLE').toBe('filler');
  });

  it('a household\'s first welcome 58, a later welcome 40, whatever the newcomers and whatever was given', () => {
    for (const text of [SCENE.welcomeFirst, SCENE.welcomeFirstBare]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'welcome-first', weight: 58 });
    for (const text of [SCENE.welcome, SCENE.welcomeBare]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'welcome', weight: 40 });
  });

  it('a rescue thanked in company 70, builders thanked in company 55, at the fire, an occasion or a feast', () => {
    for (const text of [SCENE.rescueOff, SCENE.rescueKilled]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'rescue-thanked', weight: 70 });
    for (const text of [SCENE.builders, SCENE.buildersMore]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'builders-thanked', weight: 55 });
    expect(bandOf(70)).toBe('middle');
  });

  it('the more specific wording wins, and nothing already named is taken', () => {
    // the first of a pair\'s walks is not the later walk, though its words contain it; the first welcome is not the later one
    expect(storyWeight(ev('social', SCENE.walkFirst))).toBeGreaterThan(storyWeight(ev('social', SCENE.walk)));
    expect(storyWeight(ev('social', SCENE.welcomeFirst))).toBeGreaterThan(storyWeight(ev('social', SCENE.welcome)));
    // a welcome that "gave them food" is a welcome, not a gift (8)
    expect(matchEvent(ev('social', SCENE.welcome)).id).not.toBe('gave');
    expect(storyWeight(ev('social', 'Pia gave Abel a stick doll.')), 'a gift is still a gift').toBe(8);
    // a thanks said at a wedding feast or a harvest feast is a thanks, not the feast: the gathering rules need "is called at" or "begins"
    expect(matchEvent(ev('social', 'At the wedding feast Quinn thanked Pat before 5 people for driving off a wolf.'))).toEqual({ id: 'rescue-thanked', weight: 70 });
    expect(matchEvent(ev('social', 'At the harvest feast Dan thanked Abe for the new kiln.'))).toEqual({ id: 'builders-thanked', weight: 55 });
    // and the gatherings, the arrivals and the like keep what they had
    expect(storyWeight(ev('social', TEXT.weddingCalled))).toBe(80);
    expect(storyWeight(ev('social', TEXT.weddingBegins))).toBe(80);
    expect(storyWeight(ev('social', TEXT.feastBegins))).toBe(55);
    expect(storyWeight(ev('social', TEXT.market))).toBe(55);
    expect(storyWeight(ev('life', TEXT.traveller))).toBe(60);
    expect(storyWeight(ev('social', TEXT.peace))).toBe(50);
    // the same words in another kind are not these (a rescue is a danger event, a walk is never a nature note)
    expect(storyWeight(ev('nature', SCENE.walkFirst))).toBe(0);
    expect(matchEvent(ev('danger', TEXT.drove)).id).toBe('wolf-off');
  });

  it('a story told at the fire that retells one of them keeps the story rank', () => {
    for (const text of Object.values(SCENE)) {
      const told = 'Yan told a story at the fire: how ' + text[0].toLowerCase() + text.slice(1);
      expect(matchEvent(ev('social', told)), told).toEqual({ id: 'story', weight: 10 });
    }
  });

  it('a later walk, a refused ask and a welcome are kept against a lighter newcomer; a heavier one still takes their place', () => {
    const { w, ada, ben, cal } = village('scenes-slot');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [cal.id], 42, 31); // a shot is up, so a candidate waits
    d.step(w, 0);
    const walk = say(w, 'social', SCENE.walk, [ada.id, ben.id], 40, 30);
    d.step(w, 0);
    say(w, 'social', 'Pia fed Abel.', [ben.id], 41, 30);
    say(w, 'social', TEXT.gave, [ben.id], 41, 30);
    d.step(w, 0);
    d.step(w, LINGER_SECONDS);
    expect(d.shot?.ev, 'a lighter newcomer did not displace it').toBe(walk);
    // a lighter one displaces a kept candidate under 30 as before; a heavier one displaces a kept walk
    const e = village('scenes-slot-2');
    const d2 = quiet();
    d2.step(e.w, 0);
    say(e.w, 'life', TEXT.death, [e.cal.id], 42, 31);
    d2.step(e.w, 0);
    say(e.w, 'social', TEXT.gave, [e.ada.id], 40, 30);
    d2.step(e.w, 0);
    const fed = say(e.w, 'social', 'Pia fed Abel.', [e.ben.id], 41, 30);
    d2.step(e.w, 0);
    d2.step(e.w, LINGER_SECONDS);
    expect(d2.shot?.ev, 'the newest, as before').toBe(fed);
    const f = village('scenes-slot-3');
    const d3 = quiet();
    d3.step(f.w, 0);
    say(f.w, 'life', TEXT.death, [f.cal.id], 42, 31);
    d3.step(f.w, 0);
    say(f.w, 'social', SCENE.refused, [f.ben.id, f.ada.id], 40, 30);
    d3.step(f.w, 0);
    const walk3 = say(f.w, 'social', SCENE.walk, [f.ada.id, f.ben.id], 40, 30);
    d3.step(f.w, 0);
    d3.step(f.w, LINGER_SECONDS);
    expect(d3.shot?.ev, 'a later walk (45) over a refused ask (40)').toBe(walk3);
  });

  it('a pair\'s first walk and a household\'s first welcome are MIDDLE: they wait in the queue for the hold like any other', () => {
    const { w, ada, ben, cal } = village('scenes-middle');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [cal.id], 42, 31);
    d.step(w, 0);
    const walk = say(w, 'social', SCENE.walkFirst, [ada.id, ben.id], 40, 30);
    const thanks = say(w, 'social', SCENE.rescueOff, [ben.id], 41, 30);
    d.step(w, 0);
    expect(d.waiting().map((q) => q.ev)).toEqual([walk, thanks]);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev, 'the rescue thanked, 70, before the first walk, 62').toBe(thanks);
  });

  /** a walk out under way, set up as courting.ts sets it up (the leader asked, the other follows), in a staged village */
  function walkOut(tag: string) {
    const f = village(tag);
    beginCourtWalk(f.w, 7001, f.ada, f.ben, { x: 43, y: 31, at: 'water' });
    return f;
  }

  it('a walk out under way is one live candidate for the pair, from the leader\'s side, in the inspector\'s own words', () => {
    const { w, ada, ben } = walkOut('scenes-walk');
    expect((ada.activity?.data.walk as WalkData).role).toBe('a');
    expect((ben.activity?.data.walk as WalkData).role).toBe('b');
    const walks = scanLive(w).filter((c) => c.kind === 'walk');
    expect(walks.length, 'one for the pair, not two').toBe(1);
    expect(walks[0].key).toBe('walk:7001');
    expect(walks[0].score).toBe(66);
    expect(walks[0].subjectId).toBe(ada.id);
    expect([walks[0].x, walks[0].y]).toEqual([ada.x, ada.y]);
    const doing = describePerson(w, ada.id)!.qa.doing;
    expect(walks[0].caption()).toBe(doing);
    expect(doing).toContain('Walking out with Ben');
    // the director takes it: a bare screen, nothing else live
    const d = new Director();
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.kind).toBe('live');
    expect(d.shot?.liveKey).toBe('walk:7001');
    expect(d.shot?.subjectId).toBe(ada.id);
    expect(d.shot?.text).toBe(doing);
  });

  it('two pairs out walking are two candidates; the walk is gone when it ends, and nothing is read from the follower\'s side alone', () => {
    // two pairs, two walks
    const st = stage('director-scenes-two');
    st.w.settings.dynamics = 'rich';
    const [p1, p2, p3, p4] = ['Ada', 'Ben', 'Cal', 'Dee'].map((n, i) => addPerson(st, n, 38 + 2 * i, 30, { age: 25 + i }));
    done(st);
    beginCourtWalk(st.w, 7001, p1, p2, { x: 43, y: 31, at: 'water' });
    beginCourtWalk(st.w, 7002, p3, p4, { x: 45, y: 31, at: 'fire' });
    expect(scanLive(st.w).filter((c) => c.kind === 'walk').map((c) => [c.key, c.subjectId])).toEqual([['walk:7001', p1.id], ['walk:7002', p3.id]]);
    const { w, ada, ben } = walkOut('scenes-walk-2');
    // the walk ends: the leader's activity is no longer a walk
    ada.activity = null;
    expect(scanLive(w).filter((c) => c.kind === 'walk'), 'the follower alone is no candidate').toEqual([]);
    ben.activity = null;
    expect(scanLive(w).filter((c) => c.kind === 'walk')).toEqual([]);
    // settled by the leader (done), while the activity is still being wound up: gone too
    const f = walkOut('scenes-walk-3');
    (f.ada.activity!.data.walk as WalkData).done = true;
    expect(scanLive(f.w).filter((c) => c.kind === 'walk')).toEqual([]);
    // a walk held while they talk is not under way
    const g = walkOut('scenes-walk-4');
    g.ada.suspended = g.ada.activity;
    g.ada.activity = null;
    expect(scanLive(g.w).filter((c) => c.kind === 'walk')).toEqual([]);
  });

  it('a live walk shot ends when the walk does (the camera stays, the caption goes)', () => {
    const { w, ada } = walkOut('scenes-walk-5');
    const d = new Director();
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.liveKey).toBe('walk:7001');
    ada.activity = null;
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.ended).toBe(true);
    expect(d.captionFresh()).toBe(false);
  });
});

describe('the hearth scenes (rules 261): a birth helped, a child named, a vigil kept', () => {
  // the words are the code's (src/sim/birth_help.ts, naming.ts, vigil.ts)
  const HEARTH = {
    bornHelped: 'Cal was born to Ada and Ben, with Dee there to help.',
    bornAlone: 'Cal was born to Ada.',
    namedBoth: "Ada and Ben named their daughter Cal before 6 people, after Ada's mother.",
    namedOne: 'Ada named her son Cal before 1 person.',
    namedHis: 'Ben named his daughter Cal before 3 people.',
    namingCalled: 'A naming feast for Cal and Ada is called at the fire today.',
    namingBegins: 'The naming feast at the fire begins.',
    namingOver: 'The naming feast at the fire is over: nobody came.',
    sitNight: 'Ada sat up through the night with Ben, who has a fever.',
    sitDay: 'Ada sat with Ben, who has a fever.',
    sitHurt: 'Ada sat with Ben, who is hurt.',
    sitHurtNight: 'Ada sat up through the night with Ben, who is hurt.',
    withDeath: 'Ada was with Ben when he died.',
    withDeathHer: 'Ben was with Ada when she died.',
  };

  it('a birth, helped or not, is still a birth (90); the naming feast is a feast (55); a child named aloud is 58, in any of its three forms', () => {
    for (const text of [HEARTH.bornHelped, HEARTH.bornAlone]) expect(matchEvent(ev('life', text)), text).toEqual({ id: 'birth', weight: 90 });
    for (const text of [HEARTH.namingCalled, HEARTH.namingBegins]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'feast', weight: 55 });
    expect(matchEvent(ev('social', HEARTH.namingOver)), 'a gathering over is still filler').toEqual({ id: 'over', weight: 20 });
    for (const text of [HEARTH.namedBoth, HEARTH.namedOne, HEARTH.namedHis]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'named', weight: 58 });
    expect(bandOf(58)).toBe('middle');
  });

  it('a vigil ended is 50 (the floor of what the reel lists), by day or night, a fever or a hurt; "was with B when he died" is TOP, as the death is', () => {
    for (const text of [HEARTH.sitNight, HEARTH.sitDay, HEARTH.sitHurt, HEARTH.sitHurtNight]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'vigil', weight: 50 });
    for (const text of [HEARTH.withDeath, HEARTH.withDeathHer]) expect(matchEvent(ev('life', text)), text).toEqual({ id: 'vigil-death', weight: 100 });
    expect(bandOf(storyWeight(ev('life', HEARTH.withDeath)))).toBe('top');
    expect(storyWeight(ev('life', TEXT.death))).toBe(100);
  });

  it('nothing already named is taken, and the same words in another kind are not these; a story that retells one keeps the story rank', () => {
    expect(storyWeight(ev('nature', HEARTH.namedBoth))).toBe(0);
    expect(storyWeight(ev('work', HEARTH.sitDay))).toBe(0);
    expect(matchEvent(ev('social', 'Ada sat with the others at the fire.')).id, 'not a vigil without who is ill or hurt').not.toBe('vigil');
    expect(matchEvent(ev('social', 'Ada named the new well.')).id).not.toBe('named');
    for (const text of [HEARTH.namedBoth, HEARTH.sitNight]) {
      const told = 'Yan told a story at the fire: how ' + text[0].toLowerCase() + text.slice(1);
      expect(matchEvent(ev('social', told)), told).toEqual({ id: 'story', weight: 10 });
    }
    // a death keeps its own words and its own rank
    expect(matchEvent(ev('life', TEXT.wolfDeath)).id).toBe('death');
  });

  it('"A was with B when he died" and the plain death of B are one top shot: the plain one is taken out, the sitter\'s stands for both (and follows the one who was there)', () => {
    const { w, ada, ben, cal } = village('hearth-death');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [cal.id], 42, 31); // a shot is up, so candidates wait
    d.step(w, 0);
    const died = say(w, 'life', 'Ben died (fever), aged 30.', [ben.id], 41, 30);
    const withHim = say(w, 'life', HEARTH.withDeath, [ada.id, ben.id], 40, 30);
    d.step(w, 0);
    expect(d.waiting().map((q) => q.ev), 'one top shot for the death and the one beside them').toEqual([withHim]);
    expect(d.counts.merged).toBeGreaterThanOrEqual(1);
    expect(d.waiting()[0].subjectId).toBe(ada.id);
    expect(died.text).toContain('died (fever)');
    // with no such sitter, the plain death is as it was
    const g = village('hearth-death-2');
    const d2 = quiet();
    d2.step(g.w, 0);
    say(g.w, 'life', TEXT.death, [g.cal.id], 42, 31);
    d2.step(g.w, 0);
    const lone = say(g.w, 'life', 'Ben died (fever), aged 30.', [g.ben.id], 41, 30);
    d2.step(g.w, 0);
    expect(d2.waiting().map((q) => q.ev)).toEqual([lone]);
  });

  it('a child named aloud (58) waits its turn as a MIDDLE event, after a first walk (62)', () => {
    const { w, ada, ben, cal } = village('hearth-named');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [cal.id], 42, 31);
    d.step(w, 0);
    const named = say(w, 'social', HEARTH.namedBoth, [ada.id, ben.id], 40, 30);
    const walk = say(w, 'social', 'Ada and Ben walked out together for the first time.', [cal.id], 41, 30);
    d.step(w, 0);
    expect(d.waiting().map((q) => q.ev)).toEqual([named, walk]);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev, 'the first walk (62) before the naming (58)').toBe(walk);
  });

  /** Ada lies in by her door and Ben has come to be with her: the helper's visit and the rest are set up as birth_help.ts sets them up */
  function lyingIn(tag: string, helperNear = true, phase: 'work' | 'travel' = 'work') {
    const f = village(tag);
    const { w, ada, ben } = f;
    ada.activity = newActivity(w, ada, { kind: 'rest', label: 'Lying in by her door', goal: 'to wait for the child', here: true, amount: 900, data: { lyingIn: w.tick, sticky: true } });
    ada.lyingIn = w.tick;
    ben.activity = newActivity(w, ben, { kind: 'visit', label: 'Waiting with Ada for her child', goal: 'x', targetId: ada.id, targetType: 'person', here: true, data: { birth: true, commitmentId: 1, items: {}, sticky: true } });
    ben.activity.phase = phase;
    if (!helperNear) { ben.x = ada.x + 12; ben.y = ada.y; }
    return f;
  }
  /** Ada sits up with Ben, as vigil.ts sets it up */
  function sitting(tag: string) {
    const f = village(tag);
    const { w, ada, ben } = f;
    ada.activity = newActivity(w, ada, { kind: 'rest', label: 'Sitting up with Ben', goal: 'to be with Ben', here: true, amount: 900, data: { vigil: { for: ben.id, since: w.tick, sat: 10, kind: 'fever' }, sticky: true } });
    return f;
  }

  it("a woman lying in with a helper beside her is one live candidate, 72, from her side, in the inspector's own words; with nobody beside her, or the helper not yet there, none", () => {
    const { w, ada } = lyingIn('hearth-lying');
    const lying = scanLive(w).filter((c) => c.kind === 'lying');
    expect(lying.length).toBe(1);
    expect(lying[0].key).toBe(`lying:${ada.id}`);
    expect(lying[0].score).toBe(72);
    expect(lying[0].subjectId).toBe(ada.id);
    const doing = describePerson(w, ada.id)!.qa.doing;
    expect(lying[0].caption()).toBe(doing);
    expect(doing).toContain('Lying in by her door');
    // the director takes it
    const d = new Director();
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.kind).toBe('live');
    expect(d.shot?.liveKey).toBe(`lying:${ada.id}`);
    expect(d.shot?.weight).toBe(72);
    // nobody beside her (the helper far off, or still walking): no scene
    expect(scanLive(lyingIn('hearth-lying-far', false).w).filter((c) => c.kind === 'lying')).toEqual([]);
    expect(scanLive(lyingIn('hearth-lying-travel', true, 'travel').w).filter((c) => c.kind === 'lying')).toEqual([]);
    // and a woman who is not lying in is not one
    const g = village('hearth-lying-none');
    expect(scanLive(g.w).filter((c) => c.kind === 'lying')).toEqual([]);
  });

  it("a vigil under way is one live candidate for each person sat with, 66, from the sitter's side; gone when it ends or the sick person has died", () => {
    const { w, ada, ben } = sitting('hearth-vigil');
    const v = scanLive(w).filter((c) => c.kind === 'vigil');
    expect(v.length).toBe(1);
    expect(v[0].key).toBe(`vigil:${ben.id}`);
    expect(v[0].score).toBe(66);
    expect(v[0].subjectId).toBe(ada.id);
    expect(v[0].caption()).toBe(describePerson(w, ada.id)!.qa.doing);
    expect(v[0].caption()).toContain('Sitting up with Ben');
    const d = new Director();
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.liveKey).toBe(`vigil:${ben.id}`);
    // the vigil ends: the shot ends (the camera stays, the caption goes)
    ada.activity = null;
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.ended).toBe(true);
    expect(d.captionFresh()).toBe(false);
    // a death with her beside him writes its own line and the vigil is over: not a live shot any more
    const h = sitting('hearth-vigil-over');
    (h.ada.activity!.data.vigil as { over?: true }).over = true;
    expect(scanLive(h.w).filter((c) => c.kind === 'vigil')).toEqual([]);
    // one not yet at them (travel) is no vigil
    const g = sitting('hearth-vigil-travel');
    g.ada.activity!.phase = 'travel';
    expect(scanLive(g.w).filter((c) => c.kind === 'vigil')).toEqual([]);
  });

  it('a lying-in and a vigil are both live at once, best first: the lying-in (72) before the vigil (66)', () => {
    const f = lyingIn('hearth-all');
    const { w, cal, ben } = f;
    cal.activity = newActivity(w, cal, { kind: 'rest', label: 'Sitting up with Ben', goal: 'x', here: true, amount: 900, data: { vigil: { for: ben.id, since: w.tick, sat: 5, kind: 'hurt' }, sticky: true } });
    const live = scanLive(w).filter((c) => c.kind === 'lying' || c.kind === 'vigil');
    expect(live.map((c) => c.kind)).toEqual(['lying', 'vigil']);
    expect(live.map((c) => c.score)).toEqual([72, 66]);
  });
});

describe('the company scenes (rules 262): a song, a dance, a reunion', () => {
  // the words are the code's (src/sim/song.ts, dance.ts, reunion.ts)
  const COMPANY = {
    song: 'Ada started a song at the fire and 3 joined in.',
    song1: 'Ben started a song at the fire and 1 joined in.',
    dance: 'People danced at the wedding feast for Ada and Ben.',
    danceHarvest: 'People danced at the harvest feast.',
    reunion: 'Cal ran to meet Ada, back after two days.',
    reunionHalf: 'Cal ran to meet Ada, back after a day and a half.',
    reunionHalf2: 'Ada ran to meet Ben, back after two and a half days.',
  };

  it('a reunion is 60 (a MIDDLE event), whatever the gap in days; a song is 30, the bottom of the band under MIDDLE and the filler; the dance line keeps the unnamed social weight', () => {
    for (const text of [COMPANY.reunion, COMPANY.reunionHalf, COMPANY.reunionHalf2]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'reunion', weight: 60 });
    expect(bandOf(60)).toBe('middle');
    for (const text of [COMPANY.song, COMPANY.song1]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'song', weight: 30 });
    expect(bandOf(30)).toBe('filler');
    for (const text of [COMPANY.dance, COMPANY.danceHarvest]) expect(matchEvent(ev('social', text)).id, text).toBe('default:social');
  });

  it('nothing already named is taken, the same words in another kind are not these, and a story retelling one keeps the story rank', () => {
    expect(storyWeight(ev('work', COMPANY.reunion))).toBe(0);
    expect(storyWeight(ev('nature', COMPANY.song))).toBe(0);
    expect(matchEvent(ev('social', 'Cal ran to meet the wolf.')).id, 'a run to meet nobody back after anything').not.toBe('reunion');
    expect(matchEvent(ev('social', 'Ada started a song.')).id).not.toBe('song');
    for (const text of [COMPANY.reunion, COMPANY.song]) {
      const told = 'Yan told a story at the fire: how ' + text[0].toLowerCase() + text.slice(1);
      expect(matchEvent(ev('social', told)), told).toEqual({ id: 'story', weight: 10 });
    }
    // the gathering's own lines and a death keep theirs
    expect(matchEvent(ev('social', TEXT.weddingBegins)).id).toBe('wedding');
    expect(matchEvent(ev('life', TEXT.death)).id).toBe('death');
  });

  it('a reunion (60) is a MIDDLE event that waits its turn: after a first walk (62), before a named child (58)', () => {
    const { w, ada, ben, cal } = village('company-order');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [cal.id], 42, 31);
    d.step(w, 0);
    const named = say(w, 'social', "Ada and Ben named their daughter Cal before 6 people, after Ada's mother.", [ada.id, ben.id], 40, 30);
    const reunion = say(w, 'social', COMPANY.reunion, [cal.id, ada.id], 41, 30);
    const walk = say(w, 'social', 'Ada and Ben walked out together for the first time.', [ben.id], 42, 30);
    d.step(w, 0);
    expect(d.waiting().map((q) => q.ev)).toEqual([named, reunion, walk]);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev, 'the first walk (62) before the reunion (60)').toBe(walk);
    expect([storyWeight(walk), storyWeight(reunion), storyWeight(named)]).toEqual([62, 60, 58]);
  });

  /** an occasion that has begun, with Ada and Ben dancing at it (as dance.ts sets it up) */
  function dancing(tag: string, o: { second?: boolean; over?: boolean } = {}) {
    const f = village(tag);
    const { w, ada, ben } = f;
    noteWedding(w, f.cal, ada);
    const occ = w.occasions![0];
    occ.status = 'gathering';
    occ.at = w.tick - 5;
    occ.until = w.tick + 1000;
    occ.dance = { by: [ada.id, ben.id] };
    const dance = (n: number, done = false) => ({ n, ang: 0, r: 1.5, ...(done ? { done: true as const } : {}) });
    const mk = (p: typeof ada, done = false) => { p.activity = newActivity(w, p, { kind: 'attend', label: 'Dancing at the wedding feast', goal: 'to celebrate', targetId: occ.id, targetType: 'occasion', here: true, data: { occasion: occ.id, dance: dance(30, done) } }); };
    mk(ada, o.over);
    if (o.second !== false) mk(ben, o.over);
    return { ...f, occ };
  }

  it("a dance under way, two or more dancing at an occasion that has begun, is one live candidate for the occasion, 68, from the first dancer's side, in the inspector's own words", () => {
    const { w, ada, occ } = dancing('company-dance');
    const live = scanLive(w).filter((c) => c.kind === 'dance');
    expect(live.length).toBe(1);
    expect(live[0].key).toBe(`dance:${occ.id}`);
    expect(live[0].score).toBe(68);
    expect(live[0].subjectId).toBe(ada.id);
    expect([live[0].x, live[0].y]).toEqual([occ.x, occ.y]);
    const doing = describePerson(w, ada.id)!.qa.doing;
    expect(live[0].caption()).toBe(doing);
    expect(doing).toContain('Dancing at the wedding feast');
    // the gathering's own shot is there too (wedding 70), and the dance (68) after it
    const kinds = scanLive(w).map((c) => c.kind);
    expect(kinds.indexOf('occasion')).toBeLessThan(kinds.indexOf('dance'));
    // the director takes the best live shot; with the wedding's own out of the way (its cooldown) it is the dance
    const d = new Director();
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.kind).toBe('live');
    expect(['occ:' + occ.id, 'dance:' + occ.id]).toContain(d.shot?.liveKey);
  });

  it('one dancer is no dance, a dance that is over is none, and nor is one at a gathering that has not begun or is done', () => {
    expect(scanLive(dancing('company-dance-one', { second: false }).w).filter((c) => c.kind === 'dance')).toEqual([]);
    expect(scanLive(dancing('company-dance-over', { over: true }).w).filter((c) => c.kind === 'dance')).toEqual([]);
    const done = dancing('company-dance-done');
    done.occ.status = 'done';
    expect(scanLive(done.w).filter((c) => c.kind === 'dance')).toEqual([]);
    const plain = village('company-dance-none');
    expect(scanLive(plain.w).filter((c) => c.kind === 'dance')).toEqual([]);
  });
});

describe('the kin scenes (rules 263): sitting with the grieving, coming of age, a child settled for the night', () => {
  // the words are the code's (src/sim/grief_sit.ts, coming_of_age.ts, settle_child.ts)
  const KIN = {
    sat: 'Ben sat with Ada, who has lost her mother.',
    satHim: 'Ada sat with Ben, who has lost his brother.',
    satPartner: 'Cal sat with Ada, who has lost her partner.',
    satParent: 'Cal sat with Ben, who has lost his parent.',
    age: 'Dara came of age before 7 people and hopes for a solid home of their own.',
    ageOne: 'Dara came of age before 1 person and hopes for a family.',
    settled: 'Ada settled little Cal for the night.',
    feastCalled: 'A coming-of-age feast for Dara is called at the fire today.',
    feastBoth: 'A naming and coming-of-age feast for Tia, Mira and Dara is called at the fire today.',
    feastBegins: 'The coming-of-age feast at the fire begins.',
    sixteen: 'Dara has come of age and joins the work.',
  };

  it('a sit with the grieving is 62 and a child coming of age is 60 (both MIDDLE), whoever was lost and however many were there; a child settled is 20, filler', () => {
    for (const text of [KIN.sat, KIN.satHim, KIN.satPartner, KIN.satParent]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'sat-grief', weight: 62 });
    for (const text of [KIN.age, KIN.ageOne]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'came-of-age', weight: 60 });
    expect(matchEvent(ev('social', KIN.settled))).toEqual({ id: 'settled', weight: 20 });
    expect([bandOf(62), bandOf(60), bandOf(20)]).toEqual(['middle', 'middle', 'filler']);
    expect(20).toBeLessThan(FILLER_BELOW);
  });

  it('nothing already named is taken: the vigil, the line at sixteen, the feast\'s own lines, and the same words in another kind or a retelling', () => {
    // a vigil still ends in "who has a fever" or "who is hurt" and is the vigil's
    expect(matchEvent(ev('social', 'Ada sat with Ben, who has a fever.')).id).toBe('vigil');
    expect(matchEvent(ev('social', 'Ada sat up through the night with Ben, who is hurt.')).id).toBe('vigil');
    // the line the world has always written at sixteen keeps the kind's weight, and the feast's own lines are the gathering rule
    expect(matchEvent(ev('life', KIN.sixteen))).toEqual({ id: 'default:life', weight: 50 });
    for (const text of [KIN.feastCalled, KIN.feastBoth, KIN.feastBegins]) expect(matchEvent(ev('social', text)), text).toEqual({ id: 'feast', weight: 55 });
    // the words in another kind, or without what makes them these
    expect(storyWeight(ev('work', KIN.sat))).toBe(0);
    expect(storyWeight(ev('nature', KIN.settled))).toBe(0);
    expect(matchEvent(ev('social', 'Ada sat with the others at the fire.')).id).not.toBe('sat-grief');
    expect(matchEvent(ev('social', 'Dara came of age.')).id).not.toBe('came-of-age');
    expect(matchEvent(ev('social', 'Ada settled the account for the night.')).id).not.toBe('settled');
    for (const text of [KIN.sat, KIN.age, KIN.settled]) {
      const told = 'Yan told a story at the fire: how ' + text[0].toLowerCase() + text.slice(1);
      expect(matchEvent(ev('social', told)), told).toEqual({ id: 'story', weight: 10 });
    }
  });

  it('a coming of age (60) is a MIDDLE event that waits its turn: after a first walk (62), behind the death that holds the shot', () => {
    const { w, ada, ben, cal } = village('kin-order');
    const d = quiet();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [cal.id], 42, 31);
    d.step(w, 0);
    const age = say(w, 'social', KIN.age, [cal.id, ada.id], 41, 30);
    const walk = say(w, 'social', 'Ada and Ben walked out together for the first time.', [ben.id], 42, 30);
    d.step(w, 0);
    expect(d.waiting().map((q) => q.ev)).toEqual([age, walk]);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev, 'the first walk (62) before the coming of age (60)').toBe(walk);
    expect([storyWeight(walk), storyWeight(age)]).toEqual([62, 60]);
  });

  /** Cal sits with Ben, as grief_sit.ts sets it up (sat down and in work) */
  function grieving(tag: string, o: { travel?: boolean; unbegun?: boolean } = {}) {
    const f = village(tag);
    const { w, ada, ben, cal } = f;
    ada.activity = newActivity(w, ada, { kind: 'rest', label: 'Sitting with Ben', goal: 'to sit with Ben, who has lost someone', here: !o.travel, amount: 900, data: { grief: { for: ben.id, since: w.tick, sat: 10, len: 250, ...(o.unbegun ? {} : { began: true as const }) }, sticky: true } });
    return { ...f, cal };
  }

  it("a sit with the grieving under way is one live candidate for each bereaved person, 60, from the visitor's side, in the inspector's own words; gone when it ends, or before they have sat down", () => {
    const { w, ada, ben } = grieving('kin-grief');
    const g = scanLive(w).filter((c) => c.kind === 'grief');
    expect(g.length).toBe(1);
    expect(g[0].key).toBe(`grief:${ben.id}`);
    expect(g[0].score).toBe(60);
    expect(g[0].subjectId).toBe(ada.id);
    expect(g[0].caption()).toBe(describePerson(w, ada.id)!.qa.doing);
    expect(g[0].caption()).toContain('Sitting with Ben');
    const d = new Director();
    d.step(w, 0);
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.kind).toBe('live');
    expect(d.shot?.liveKey).toBe(`grief:${ben.id}`);
    expect(d.shot?.weight).toBe(60);
    // it ends: the shot ends (the camera stays, the caption goes)
    ada.activity = null;
    d.step(w, LIVE_SCAN_SECONDS);
    expect(d.shot?.ended).toBe(true);
    expect(d.captionFresh()).toBe(false);
    // one on the way (travel), or not yet sat down, is no scene; nor is the world with no sit at all
    expect(scanLive(grieving('kin-grief-travel', { travel: true }).w).filter((c) => c.kind === 'grief')).toEqual([]);
    expect(scanLive(grieving('kin-grief-unbegun', { unbegun: true }).w).filter((c) => c.kind === 'grief')).toEqual([]);
    expect(scanLive(village('kin-grief-none').w).filter((c) => c.kind === 'grief')).toEqual([]);
  });
});

describe('the reel: TOP and MIDDLE only', () => {
  it('picks the heaviest events of weight 50 and up in the window, in the order they happened', () => {
    const { w, ada } = village('reel');
    const t0 = w.tick;
    const at = (tick: number, kind: EventKind, text: string) => {
      w.tick = tick;
      return say(w, kind, text, [ada.id], 40, 30);
    };
    const rain = at(t0 + 10, 'nature', TEXT.rain);
    const hut = at(t0 + 20, 'build', TEXT.hut);
    const well = at(t0 + 25, 'build', TEXT.well);
    const death = at(t0 + 30, 'life', TEXT.death);
    const birth = at(t0 + 40, 'life', TEXT.birth);
    const couple = at(t0 + 50, 'life', TEXT.couple);
    const gift = at(t0 + 60, 'social', TEXT.gave);
    const argued = at(t0 + 70, 'conflict', TEXT.argued);
    const bite = at(t0 + 80, 'danger', TEXT.bite);
    w.tick = t0 + 100;
    expect(highlights(w, t0, 50)).toEqual([well, death, birth, couple, argued, bite]);
    expect(highlights(w, t0, 4)).toEqual([death, birth, couple, bite]);
    expect([rain, hut, gift].some((e) => highlights(w, t0, 50).includes(e)), 'weather, a household\'s hut and a gift are not on the reel').toBe(false);
    expect(highlights(w, t0 + 45, 50)).toEqual([couple, argued, bite]);
    expect(highlights(w, t0 + 81, 50)).toEqual([]);
    expect(highlights(w, t0, 0)).toEqual([]);
  });

  it('lists the social scenes of 50 and up (a first walk, a first welcome, a thanks) and not the later ones', () => {
    const { w, ada, ben } = village('reel-scenes');
    w.tick = 100;
    const first = say(w, 'social', 'Ada and Ben walked out together for the first time.', [ada.id, ben.id], 40, 30);
    const later = say(w, 'social', 'Ada and Ben walked out together.', [ada.id, ben.id], 40, 30);
    const welcome = say(w, 'social', 'Ada was the first to welcome the newcomer Dee.', [ada.id], 40, 30);
    const second = say(w, 'social', 'Ben welcomed the newcomer Dee.', [ben.id], 40, 30);
    const thanks = say(w, 'social', 'At the fire Quinn thanked Pat before 5 people for driving off a wolf.', [ada.id], 40, 30);
    const built = say(w, 'social', 'At the fire Dan thanked Abe for the new kiln.', [ada.id], 40, 30);
    const refused = say(w, 'social', 'Ada asked Ben to walk out; Ben said not today.', [ada.id], 40, 30);
    expect(highlights(w, 100, 20)).toEqual([first, welcome, thanks, built]);
    expect([later, second, refused].some((e) => highlights(w, 100, 20).includes(e))).toBe(false);
  });

  it('lists an event once when it is in both the feed and the chronicle, and works for a world with no chronicle', () => {
    const { w, ada } = village('reel-dedupe');
    w.tick = 100;
    const a = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    const b = say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    expect(w.chronicle, 'both are in the chronicle too').toEqual(expect.arrayContaining([a, b]));
    expect(highlights(w, 100, 8)).toEqual([a, b]);
    w.events.splice(w.events.indexOf(a), 1);
    expect(highlights(w, 100, 8)).toEqual([a, b]);
    delete w.chronicle;
    expect(highlights(w, 100, 8)).toEqual([b]);
  });

  it('reads what the chronicle does not keep: a wolf bite is only in the feed', () => {
    const { w, ada } = village('reel-bite');
    w.tick = 100;
    const bite = say(w, 'danger', TEXT.bite, [ada.id], 40, 30);
    expect(w.chronicle ?? []).not.toContain(bite);
    expect(highlights(w, 100, 8)).toEqual([bite]);
  });

  it('is the last REEL_DAYS days, at most REEL_MAX events', () => {
    const { w, ada } = village('reel-window');
    w.tick = 10 * DAY;
    const old = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    w.tick = 10 * DAY + 1;
    const made = Array.from({ length: REEL_MAX + 3 }, () => say(w, 'life', TEXT.couple, [ada.id], 40, 30));
    w.tick = 10 * DAY + 1 + REEL_DAYS * DAY;
    const list = reelOf(w);
    expect(list).not.toContain(old);
    expect(list.length).toBe(REEL_MAX);
    expect(list).toEqual(made.slice(-REEL_MAX));
  });
});

it('observer purity: a seeded run watched by the director, with the live scan run every step, stays identical to an unwatched twin', () => {
  const settings = currentWorldSettings('normal', 'river', { immigration: true });
  const watched = new Game(settings);
  const twin = new Game(settings);
  const director = new Director();
  const checkpoints = new Set([100, 250, 400]);
  let scanned = 0;
  let sawWalk = 0;
  for (let t = 1; t <= 400; t++) {
    if (t === 20 || t === 60 || t === 120 || t === 200) {
      // staged in BOTH worlds alike, so that the run holds real events to watch: the simulation's own addEvent, about people who are there
      for (const g of [watched, twin]) {
        const adults = g.world.persons.filter((p) => p.alive).sort((a, b) => a.birthTick - b.birthTick || a.id - b.id);
        addEvent(g.world, 'life', `${adults[0].name} and ${adults[1].name} became a couple.`, [adults[0].id, adults[1].id], adults[0].x, adults[0].y);
        addEvent(g.world, 'build', `${adults[2].name} finished a storehouse.`, [adults[2].id], adults[2].x, adults[2].y);
        addEvent(g.world, 'social', `${adults[3].name} gave 2 berries to ${adults[4].name}.`, [adults[3].id, adults[4].id], adults[3].x, adults[3].y);
        addEvent(g.world, 'danger', `A wolf bit ${adults[5].name}.`, [adults[5].id], adults[5].x, adults[5].y);
      }
    }
    if (t === 30) {
      // a walk out under way in BOTH worlds alike (the simulation's own beginCourtWalk), for the scan to read
      for (const g of [watched, twin]) {
        // two who are not in a conversation or asleep (a conversation would be torn up by a walk set in its middle)
        const free = g.world.persons.filter((p) => p.alive && p.pose !== 'sleep' && !p.suspended && !g.world.conversations.some((c) => c.a === p.id || c.b === p.id));
        const [a, b] = free.sort((x, y) => x.birthTick - y.birthTick || x.id - y.id).slice(0, 2);
        beginCourtWalk(g.world, 7000001, a, b, { x: Math.round(a.x) + 3, y: Math.round(a.y), at: 'water' });
      }
    }
    watched.advanceTicks(1);
    twin.advanceTicks(1);
    director.step(watched.world, 0.05);
    // the live scan every step, and every caption it can give (the inspector's own text for a person), as the director reads them once a second
    for (const c of scanLive(watched.world)) {
      void c.caption();
      scanned++;
      if (c.kind === 'walk') sawWalk++;
    }
    highlights(watched.world, watched.world.tick - 3 * DAY, 8);
    reelOf(watched.world);
    if (t === 150) director.skip();
    if (checkpoints.has(t)) {
      expect(hashWorld(watched.world), `fingerprint at tick ${t}`).toBe(hashWorld(twin.world));
      expect(serializeWorld(watched.world), `serialized state at tick ${t}`).toBe(serializeWorld(twin.world));
    }
  }
  expect(director.counts.shown, 'the watcher really saw events').toBeGreaterThanOrEqual(2);
  expect(scanned, 'and the scan really ran').toBeGreaterThanOrEqual(0);
  expect(sawWalk, 'and it read a walk out under way, with its caption').toBeGreaterThan(0);
  expect(hashWorld(watched.world)).toBe(hashWorld(twin.world));
});
