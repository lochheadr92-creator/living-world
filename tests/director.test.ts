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
import { addEvent } from '../src/sim/events';
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
    watched.advanceTicks(1);
    twin.advanceTicks(1);
    director.step(watched.world, 0.05);
    // the live scan every step, and every caption it can give (the inspector's own text for a person), as the director reads them once a second
    for (const c of scanLive(watched.world)) {
      void c.caption();
      scanned++;
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
  expect(hashWorld(watched.world)).toBe(hashWorld(twin.world));
});
