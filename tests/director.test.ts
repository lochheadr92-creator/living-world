// The story director (src/ui/director_model.ts): which real events weigh anything, what the queue and the one shot do with them, and
// the reel. Presentation only. Every world here except the purity run's is STAGED: events are added with the simulation's own
// addEvent and the words the simulation really uses (grep addEvent under src/sim); it checks the presentation rule, it is not an
// example of spontaneous behaviour. The page itself (camera, caption, yielding) is checked in the browser:
// scripts/browser/director_check.mjs.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/app/game';
import { serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { addEvent } from '../src/sim/events';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld } from '../src/sim/world';
import { AMBIENT_STALE_TICKS, CAPTION_SECONDS, Director, IDLE_SECONDS, MAX_WAITING, MIN_CUT, MIN_HOLD, REEL_DAYS, REEL_MAX, STALE_SECONDS, STALE_TICKS, ambientWeight, highlights, reelOf, storyWeight } from '../src/ui/director_model';
import { addPerson, done, stage } from './helpers/kit';
import type { EventKind, World, WorldEvent } from '../src/sim/types';

function village(tag: string) {
  const s = stage(`director-${tag}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  const ada = addPerson(s, 'Ada', 40, 30, { age: 24, sex: 'f' });
  const ben = addPerson(s, 'Ben', 41, 30, { age: 26, sex: 'm' });
  done(s);
  return { w, ada, ben };
}

/** the wording the simulation really uses for each of these (grep addEvent under src/sim) */
const TEXT = {
  death: 'Ada died peacefully of old age, aged 71.',
  wolfDeath: 'Ben died (wolf), aged 31.',
  fatal: 'A wolf bit Ben fatally.',
  birth: 'Cal was born to Ada and Ben.',
  lamb: 'A lamb was born after sustained feeding.',
  couple: 'Ada and Ben became a couple.',
  wedding: 'A wedding feast for Ada and Ben is called at the fire tomorrow.',
  argued: 'Ada and Ben argued over the last berries.',
  injury: 'Ben got a broken arm from a fall.',
  arrival: 'A traveller, Dee, arrives at the settlement.',
  finished: 'Ada finished a hut for the Ada household.',
  lit: 'Ada lit a fire.',
  winter: 'Winter sets in: the cold deepens and the land gives less.',
  decay: 'A hut fell down.',
  fever: 'Ben has come down with a fever.',
  gift: 'Ada gave 2 berries to Ben.', // social, but not in the settlement's record
  gone: 'The fire has gone out.', // survival
  harvest: 'Ada brought in the first harvest.', // farm
  built: 'Ada made an axe.', // build, but not finished or lit
  sawed: 'Ada finished 4 planks at the timber yard.', // work, not a deer or an apprenticeship
  swap: 'Ada swapped 2 wood for 1 clay with Ben.', // trade, but not at the market
  warned: 'Ada warned Ben about a wolf.', // danger, but not fatal or an injury
  promised: 'Ben promised Ada 2 berries.', // social
  ordinary: 'Something ordinary happened.',
};

const say = (w: World, kind: EventKind, text: string, ids: number[] = [], x = 0, y = 0): WorldEvent => {
  addEvent(w, kind, text, ids, x, y);
  return w.events[w.events.length - 1];
};
const ev = (kind: EventKind, text: string): WorldEvent => ({ id: 1, tick: 0, kind, text, ids: [], x: 0, y: 0 });

describe('how much an event weighs', () => {
  it('a death outweighs a finished building, which outweighs a routine nature note', () => {
    const death = storyWeight(ev('life', TEXT.death));
    const finished = storyWeight(ev('build', TEXT.finished));
    const nature = storyWeight(ev('nature', TEXT.winter));
    expect(death).toBeGreaterThan(finished);
    expect(finished).toBeGreaterThan(nature);
    expect(nature).toBeGreaterThan(0);
    expect(storyWeight(ev('life', TEXT.wolfDeath))).toBe(death);
  });

  it('births, pairings, weddings, fatal injuries and conflicts all outrank a finished building; a lit fire and a lamb do not', () => {
    const finished = storyWeight(ev('build', TEXT.finished));
    for (const [kind, text] of [['life', TEXT.birth], ['life', TEXT.couple], ['social', TEXT.wedding], ['danger', TEXT.fatal], ['conflict', TEXT.argued], ['danger', TEXT.injury]] as const) {
      expect(storyWeight(ev(kind, text)), text).toBeGreaterThan(finished);
    }
    expect(storyWeight(ev('build', TEXT.lit))).toBeLessThan(finished);
    // a lamb is a birth in the record, but not the people's kind of birth
    expect(storyWeight(ev('life', TEXT.lamb))).toBeLessThan(storyWeight(ev('life', TEXT.birth)));
    expect(storyWeight(ev('life', TEXT.fatal))).toBeLessThan(storyWeight(ev('danger', TEXT.fatal)));
  });

  it('what the settlement\'s own record would not keep weighs nothing', () => {
    for (const [kind, text] of [['social', TEXT.gift], ['survival', TEXT.gone], ['farm', TEXT.harvest], ['build', TEXT.built]] as const) {
      expect(storyWeight(ev(kind, text)), text).toBe(0);
    }
  });

  it('is the same for the same event every time and reads nothing but the event', () => {
    const e = ev('life', TEXT.birth);
    expect(storyWeight(e)).toBe(storyWeight({ ...e, id: 99, tick: 12345, ids: [1, 2], x: 3, y: 4 }));
  });
});

describe('the first look, and a different world', () => {
  it('events already in the world are history: the first step shows no shot', () => {
    const { w, ada } = village('prime');
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    const d = new Director();
    d.step(w, 0.016);
    d.step(w, 0.016);
    expect(d.shot).toBeNull();
    expect(d.waiting().length).toBe(0);
    expect(d.counts).toEqual({ shown: 0, stale: 0, overflow: 0, ambient: 0 });
  });

  it('a new worthy event becomes the shot, about the person it is about', () => {
    const { w, ada, ben } = village('shot');
    const d = new Director();
    d.step(w, 0);
    const e = say(w, 'life', TEXT.couple, [ada.id, ben.id], 40, 30);
    d.step(w, 0.016);
    expect(d.shot?.ev).toBe(e);
    expect(d.shot?.subjectId).toBe(ada.id);
    expect([d.shot?.x, d.shot?.y]).toEqual([40, 30]);
    expect(d.shot?.age).toBe(0);
    expect(d.counts.shown).toBe(1);
    // the same event is never shown twice, however many frames pass
    for (let i = 0; i < 50; i++) d.step(w, 0.016);
    expect(d.counts.shown).toBe(1);
  });

  it('an event with no weight of any kind is never a shot; the subject is the first of its people who is alive, else the place', () => {
    const { w, ada, ben } = village('subject');
    const d = new Director();
    d.step(w, 0);
    say(w, 'work', TEXT.sawed, [ada.id, ben.id], 40, 30);
    d.step(w, 0.016);
    expect(d.shot).toBeNull();
    // the first of its people is no longer here (a grave, not a person): the second is the subject
    const gone = 987654;
    const born = say(w, 'life', TEXT.birth, [gone, ben.id], 41, 30);
    d.step(w, 0.016);
    expect(d.shot?.ev).toBe(born);
    expect(d.shot?.subjectId).toBe(ben.id);
    // nobody in it is alive: a shot of the place
    d.skip();
    const grave = say(w, 'life', TEXT.death, [gone], 12, 34);
    d.step(w, 0.016);
    expect(d.shot?.ev).toBe(grave);
    expect(d.shot?.subjectId).toBe(0);
    expect([d.shot?.x, d.shot?.y]).toEqual([12, 34]);
  });

  it('a different world resets everything and is primed without showing its history', () => {
    const a = village('world-a');
    const b = village('world-b');
    const d = new Director();
    d.step(a.w, 0);
    say(a.w, 'life', TEXT.death, [a.ada.id], 40, 30);
    d.step(a.w, 0.016);
    expect(d.shot).not.toBeNull();
    say(b.w, 'life', TEXT.birth, [b.ben.id], 41, 30);
    d.step(b.w, 0.016);
    expect(d.shot).toBeNull();
    expect(d.waiting().length).toBe(0);
    expect(d.counts).toEqual({ shown: 0, stale: 0, overflow: 0, ambient: 0 });
    // and then it watches the new world
    say(b.w, 'life', TEXT.couple, [b.ada.id], 40, 30);
    d.step(b.w, 0.016);
    expect(d.shot?.ev.text).toBe(TEXT.couple);
  });
});

describe('holding a shot, and cutting in', () => {
  it('a shot holds for MIN_HOLD before an event of the same weight may replace it', () => {
    const { w, ada, ben } = village('hold');
    const d = new Director();
    d.step(w, 0);
    const first = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const second = say(w, 'life', TEXT.wolfDeath, [ben.id], 41, 30);
    d.step(w, MIN_HOLD - 0.5);
    expect(d.shot?.ev, 'equal weight does not cut in, even after MIN_CUT').toBe(first);
    expect(d.waiting().map((q) => q.ev)).toEqual([second]);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(second);
    expect(d.shot?.age).toBe(0);
    expect(d.counts.shown).toBe(2);
  });

  it('a lighter event waits the whole of MIN_HOLD, however long it has been waiting', () => {
    const { w, ada, ben } = village('hold-light');
    const d = new Director();
    d.step(w, 0);
    const heavy = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const light = say(w, 'build', TEXT.finished, [ben.id], 41, 30);
    d.step(w, MIN_HOLD - 0.5);
    expect(d.shot?.ev).toBe(heavy);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(light);
  });

  it('a strictly heavier event cuts in after MIN_CUT, not before', () => {
    const { w, ada, ben } = village('cut');
    const d = new Director();
    d.step(w, 0);
    const light = say(w, 'build', TEXT.finished, [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(light);
    const heavy = say(w, 'life', TEXT.death, [ben.id], 41, 30);
    d.step(w, MIN_CUT - 0.5);
    expect(d.shot?.ev, 'too soon').toBe(light);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(heavy);
    expect(MIN_CUT).toBeLessThan(MIN_HOLD);
  });

  it('with nothing waiting the shot stays, and its caption fades after CAPTION_SECONDS', () => {
    const { w, ada } = village('caption');
    const d = new Director();
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
    expect(new Director().captionFresh()).toBe(false);
  });

  it('the best waiting event is taken first: the heaviest, the oldest among equals', () => {
    const { w, ada } = village('best');
    const d = new Director();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const lit = say(w, 'build', TEXT.lit, [], 20, 20);
    const injury = say(w, 'danger', TEXT.injury, [], 21, 20);
    const finishedA = say(w, 'build', TEXT.finished, [], 22, 20);
    const finishedB = say(w, 'build', TEXT.finished, [], 23, 20);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(injury);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(finishedA);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(finishedB);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(lit);
  });
});

describe('the queue: stale events and a full queue', () => {
  it('an event older than a simulated day when its turn would come is dropped as stale', () => {
    const { w, ada } = village('stale-ticks');
    const d = new Director();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    say(w, 'build', TEXT.finished, [], 20, 20);
    d.step(w, 0);
    expect(d.waiting().length).toBe(1);
    w.tick += STALE_TICKS + 1;
    d.step(w, 0);
    expect(d.waiting().length).toBe(0);
    expect(d.counts.stale).toBe(1);
    // a day exactly is not yet stale
    say(w, 'build', TEXT.finished, [], 20, 20);
    d.step(w, 0);
    w.tick += STALE_TICKS;
    d.step(w, 0);
    expect(d.waiting().length).toBe(1);
    expect(d.counts.stale).toBe(1);
  });

  it('an event that has waited more than STALE_SECONDS is dropped as stale', () => {
    const { w, ada } = village('stale-secs');
    const d = new Director();
    d.step(w, 0);
    say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    d.step(w, 0);
    // one shot is up and six more arrive: each shot holds MIN_HOLD, so the last of the six would have to wait five holds and a bit
    for (let i = 0; i < MAX_WAITING; i++) say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.waiting().length).toBe(MAX_WAITING);
    for (let i = 0; i < 5; i++) d.step(w, MIN_HOLD);
    expect(d.waiting().length).toBe(1);
    expect(MIN_HOLD * 5, 'the last has waited exactly STALE_SECONDS').toBe(STALE_SECONDS);
    expect(d.counts.stale).toBe(0);
    d.step(w, 0.5);
    expect(d.counts.stale).toBe(1);
    expect(d.waiting().length).toBe(0);
    expect(d.counts.shown).toBe(6);
  });

  it('a full queue drops the lightest, the oldest among equals', () => {
    const { w, ada } = village('cap');
    const d = new Director();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    // eight arrive together: three finished buildings, three injuries and two nature notes
    const nature1 = say(w, 'nature', TEXT.winter);
    const nature2 = say(w, 'nature', TEXT.decay);
    const built = [1, 2, 3].map((i) => say(w, 'build', TEXT.finished, [], 20 + i, 20));
    const hurt = [1, 2, 3].map((i) => say(w, 'danger', TEXT.injury, [], 30 + i, 20));
    d.step(w, 0);
    expect(d.waiting().length).toBe(MAX_WAITING);
    expect(d.counts.overflow).toBe(2);
    const kept = d.waiting().map((q) => q.ev);
    expect(kept).not.toContain(nature1);
    expect(kept).not.toContain(nature2);
    expect(kept).toEqual([...built, ...hurt]);
    // seven equals: the oldest of them goes
    const e = village('cap-equal');
    const d2 = new Director();
    d2.step(e.w, 0);
    say(e.w, 'life', TEXT.death, [e.ada.id], 40, 30);
    d2.step(e.w, 0);
    const same = Array.from({ length: MAX_WAITING + 1 }, (_, i) => say(e.w, 'build', TEXT.finished, [], 20 + i, 20));
    d2.step(e.w, 0);
    expect(d2.waiting().map((q) => q.ev)).toEqual(same.slice(1));
    expect(d2.counts.overflow).toBe(1);
  });
});

describe('a person who has gone, and skip', () => {
  it('when the subject is no longer a living person the shot becomes one of the place, and the director carries on', () => {
    const { w, ada, ben } = village('gone');
    const d = new Director();
    d.step(w, 0);
    const birth = say(w, 'life', TEXT.birth, [ben.id, ada.id], 41, 30);
    d.step(w, 0);
    expect(d.shot?.subjectId).toBe(ben.id);
    const rev = d.shot!.rev;
    // the person dies: the simulation takes them out of the register
    ben.alive = false;
    w.byId.delete(ben.id);
    d.step(w, 0.016);
    expect(d.shot?.ev).toBe(birth);
    expect(d.shot?.subjectId).toBe(0);
    expect([d.shot?.x, d.shot?.y]).toEqual([41, 30]);
    expect(d.shot!.rev, 'the view is told to look at the place').not.toBe(rev);
    // and a later event still gets its shot
    const next = say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    d.step(w, MIN_HOLD);
    expect(d.shot?.ev).toBe(next);
    expect(d.shot?.subjectId).toBe(ada.id);
  });

  it('skip drops the shot and takes the best waiting event; with nothing waiting there is no shot', () => {
    const { w, ada, ben } = village('skip');
    const d = new Director();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const lit = say(w, 'build', TEXT.lit, [], 20, 20);
    const birth = say(w, 'life', TEXT.birth, [ben.id], 41, 30);
    d.step(w, 0);
    d.skip();
    expect(d.shot?.ev, 'the heavier of the two').toBe(birth);
    expect(d.shot?.age).toBe(0);
    expect(d.counts.shown).toBe(2);
    d.skip();
    expect(d.shot?.ev).toBe(lit);
    d.skip();
    expect(d.shot).toBeNull();
    expect(d.captionFresh()).toBe(false);
    // a later event is still shown
    const last = say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(last);
  });
});

describe('the reel', () => {
  it('picks the heaviest events in the window and lists them in the order they happened', () => {
    const { w, ada } = village('reel');
    const t0 = w.tick;
    const at = (tick: number, kind: EventKind, text: string) => {
      w.tick = tick;
      return say(w, kind, text, [ada.id], 40, 30);
    };
    const nature = at(t0 + 10, 'nature', TEXT.winter);
    const finished = at(t0 + 20, 'build', TEXT.finished);
    const death = at(t0 + 30, 'life', TEXT.death);
    const birth = at(t0 + 40, 'life', TEXT.birth);
    const couple = at(t0 + 50, 'life', TEXT.couple);
    at(t0 + 60, 'social', TEXT.gift); // not worthy
    const argued = at(t0 + 70, 'conflict', TEXT.argued);
    w.tick = t0 + 100;
    expect(highlights(w, t0, 4)).toEqual([death, birth, couple, argued]);
    expect(highlights(w, t0, 5)).toEqual([finished, death, birth, couple, argued]);
    expect(highlights(w, t0, 50)).toEqual([nature, finished, death, birth, couple, argued]);
    // only what is at or after the tick asked for
    expect(highlights(w, t0 + 40, 50)).toEqual([birth, couple, argued]);
    expect(highlights(w, t0 + 71, 50)).toEqual([]);
    expect(highlights(w, t0, 0)).toEqual([]);
  });

  it('lists an event once when it is in both the feed and the chronicle, and works for a world with no chronicle', () => {
    const { w, ada } = village('reel-dedupe');
    w.tick = 100;
    const a = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    const b = say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    expect(w.chronicle, 'both are in the chronicle too').toEqual(expect.arrayContaining([a, b]));
    expect(highlights(w, 100, 8)).toEqual([a, b]);
    // the feed has rolled on and forgotten the first; the chronicle has not
    w.events.splice(w.events.indexOf(a), 1);
    expect(highlights(w, 100, 8)).toEqual([a, b]);
    // an earlier world has no chronicle
    delete w.chronicle;
    expect(highlights(w, 100, 8)).toEqual([b]);
  });

  it('the reel is the last REEL_DAYS days, at most REEL_MAX events', () => {
    const { w, ada } = village('reel-window');
    w.tick = 10 * DAY;
    const old = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    w.tick = 10 * DAY + 1;
    const made = Array.from({ length: REEL_MAX + 3 }, () => say(w, 'life', TEXT.couple, [ada.id], 40, 30));
    // now the death is REEL_DAYS days and one tick back: out. The couples are exactly REEL_DAYS days back: in, the newest eight of them
    w.tick = 10 * DAY + 1 + REEL_DAYS * DAY;
    const list = reelOf(w);
    expect(list).not.toContain(old);
    expect(list.length).toBe(REEL_MAX);
    expect(list).toEqual(made.slice(-REEL_MAX));
  });
});

describe('quiet stretches: the ambient tier', () => {
  const KINDS: EventKind[] = ['survival', 'social', 'build', 'farm', 'life', 'nature', 'danger', 'trade', 'conflict', 'work'];

  it('every ambient weight is below the lightest worthy weight, and workshop output weighs nothing', () => {
    const lightest = storyWeight(ev('nature', TEXT.winter));
    expect(lightest).toBe(20);
    for (const kind of KINDS) {
      const a = ambientWeight(ev(kind, TEXT.ordinary));
      expect(a, kind).toBeLessThan(lightest);
      // never both: an event the record keeps is worthy, not ambient
      if (storyWeight(ev(kind, TEXT.ordinary)) > 0) expect(a, kind).toBe(0);
    }
    expect(ambientWeight(ev('work', TEXT.sawed))).toBe(0);
    expect(ambientWeight(ev('danger', TEXT.warned))).toBe(15);
    expect(ambientWeight(ev('social', TEXT.gift))).toBe(12);
    expect(ambientWeight(ev('build', TEXT.built))).toBe(10);
    expect(ambientWeight(ev('trade', TEXT.swap))).toBe(10);
    expect(ambientWeight(ev('survival', TEXT.gone))).toBe(8);
    expect(ambientWeight(ev('farm', TEXT.harvest))).toBe(6);
    // a worthy event is not ambient
    expect(ambientWeight(ev('life', TEXT.death))).toBe(0);
    expect(ambientWeight(ev('build', TEXT.finished))).toBe(0);
    // and the reel and the weights of the worthy are unchanged by it
    expect(storyWeight(ev('social', TEXT.gift))).toBe(0);
    expect(MIN_CUT).toBeLessThan(IDLE_SECONDS);
    expect(AMBIENT_STALE_TICKS).toBe(DAY / 4);
  });

  it('with an empty queue and no shot up, an ordinary event about a living person is the shot at once', () => {
    const { w, ada, ben } = village('amb-now');
    const d = new Director();
    d.step(w, 0);
    const gift = say(w, 'social', TEXT.gift, [ada.id, ben.id], 40, 30);
    expect(d.hasNext()).toBe(false);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(gift);
    expect(d.shot?.ambient).toBe(true);
    expect(d.shot?.subjectId).toBe(ada.id);
    expect(d.counts).toEqual({ shown: 1, stale: 0, overflow: 0, ambient: 1 });
    expect(d.hasNext(), 'the candidate was used').toBe(false);
    // a worthy shot is not ambient
    const couple = say(w, 'life', TEXT.couple, [ada.id], 40, 30);
    d.step(w, MIN_CUT);
    expect(d.shot?.ev).toBe(couple);
    expect(d.shot?.ambient).toBe(false);
    expect(d.counts.ambient).toBe(1);
  });

  it('it needs a living person: no people, or only the gone, is never a shot', () => {
    const { w, ada } = village('amb-subject');
    const d = new Director();
    d.step(w, 0);
    say(w, 'social', TEXT.gift, [], 40, 30);
    say(w, 'social', TEXT.gift, [987654], 40, 30);
    d.step(w, 0);
    expect(d.shot).toBeNull();
    expect(d.hasNext()).toBe(false);
    for (let i = 0; i < 10; i++) d.step(w, IDLE_SECONDS);
    expect(d.shot).toBeNull();
    // the same wording about someone who is here is a shot
    const gift = say(w, 'social', TEXT.gift, [987654, ada.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(gift);
    expect(d.shot?.subjectId).toBe(ada.id);
  });

  it('with a shot up it waits for IDLE_SECONDS, and never while a worthy event waits', () => {
    const { w, ada, ben } = village('amb-idle');
    const d = new Director();
    d.step(w, 0);
    const death = say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(death);
    const gift = say(w, 'social', TEXT.gift, [ada.id, ben.id], 41, 30);
    const finished = say(w, 'build', TEXT.finished, [ben.id], 42, 30);
    d.step(w, 0);
    expect(d.hasNext()).toBe(true);
    // the worthy one is waiting, so the ambient one is not shown, however long the shot has been up
    d.step(w, MIN_HOLD - 0.5);
    expect(d.shot?.ev).toBe(death);
    expect(d.counts.ambient).toBe(0);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(finished);
    // nothing worthy waits now, but this shot is young: the ambient event waits for it to have been up IDLE_SECONDS
    d.step(w, IDLE_SECONDS - 0.5);
    expect(d.shot?.ev).toBe(finished);
    expect(d.counts.ambient).toBe(0);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(gift);
    expect(d.shot?.ambient).toBe(true);
    expect(d.counts.ambient).toBe(1);
  });

  it('a worthy event cuts an ambient shot after MIN_CUT and does not wait the whole of MIN_HOLD', () => {
    const { w, ada, ben } = village('amb-cut');
    const d = new Director();
    d.step(w, 0);
    say(w, 'social', TEXT.gift, [ada.id, ben.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.ambient).toBe(true);
    // even the lightest worthy event, a nature note with no place, is heavier than an ambient shot
    const winter = say(w, 'nature', TEXT.winter);
    d.step(w, MIN_CUT - 0.5);
    expect(d.shot?.ambient, 'too soon').toBe(true);
    d.step(w, 0.5);
    expect(d.shot?.ev).toBe(winter);
    expect(d.shot?.ambient).toBe(false);
    expect(MIN_CUT).toBeLessThan(MIN_HOLD);
  });

  it('only one candidate is kept: the newest, and of those arriving together the heaviest, then the newest', () => {
    const { w, ada, ben } = village('amb-one');
    const d = new Director();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30); // a shot is up, so candidates are kept rather than shown
    d.step(w, 0);
    const first = say(w, 'social', TEXT.gift, [ada.id], 40, 30);
    d.step(w, 0);
    const second = say(w, 'social', TEXT.promised, [ben.id], 41, 30);
    d.step(w, 0);
    // together: the danger one is heavier (15) even though older; of two equals, the newer
    const warned = say(w, 'danger', TEXT.warned, [ada.id], 42, 30);
    const g1 = say(w, 'social', TEXT.gift, [ada.id], 43, 30);
    const g2 = say(w, 'social', TEXT.gift, [ben.id], 44, 30);
    expect([first, second, g1].length).toBe(3);
    d.step(w, 0);
    d.step(w, IDLE_SECONDS);
    expect(d.shot?.ev, 'the heavier of those that arrived together').toBe(warned);
    expect(d.hasNext()).toBe(false);
    // two equals together: the newer
    d.step(w, IDLE_SECONDS);
    const a1 = say(w, 'social', TEXT.gift, [ada.id], 43, 30);
    const a2 = say(w, 'social', TEXT.promised, [ben.id], 44, 30);
    d.step(w, 0);
    d.step(w, IDLE_SECONDS);
    expect(d.shot?.ev).toBe(a2);
    expect(g2).not.toBe(a2);
    expect(a1).not.toBe(a2);
    expect(d.counts.ambient).toBe(2);
  });

  it('a candidate goes when it is older than AMBIENT_STALE_TICKS or its person is gone', () => {
    const { w, ada, ben } = village('amb-stale');
    const d = new Director();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    say(w, 'social', TEXT.gift, [ada.id, ben.id], 40, 30);
    d.step(w, 0);
    expect(d.hasNext()).toBe(true);
    w.tick += AMBIENT_STALE_TICKS;
    d.step(w, 0);
    expect(d.hasNext(), 'a quarter of a day exactly is not yet stale').toBe(true);
    w.tick += 1;
    d.step(w, 0);
    expect(d.hasNext()).toBe(false);
    d.step(w, IDLE_SECONDS);
    expect(d.shot?.ambient, 'a stale event is never shown').toBe(false);
    expect(d.counts.stale, 'not counted with the queue\'s').toBe(0);
    // the person is gone before the shot gets to it
    const e = village('amb-gone');
    const d2 = new Director();
    d2.step(e.w, 0);
    say(e.w, 'life', TEXT.death, [e.ada.id], 40, 30);
    d2.step(e.w, 0);
    say(e.w, 'social', TEXT.gift, [e.ben.id], 41, 30);
    d2.step(e.w, 0);
    expect(d2.hasNext()).toBe(true);
    e.ben.alive = false;
    e.w.byId.delete(e.ben.id);
    d2.step(e.w, 0);
    expect(d2.hasNext()).toBe(false);
    d2.step(e.w, IDLE_SECONDS);
    expect(d2.shot?.ambient).toBe(false);
  });

  it('an ambient shot is only ever about a person: when the person goes the shot ends, it does not become a place', () => {
    const { w, ada, ben } = village('amb-lost');
    const d = new Director();
    d.step(w, 0);
    say(w, 'social', TEXT.gift, [ben.id, ada.id], 41, 30);
    d.step(w, 0);
    expect(d.shot?.subjectId).toBe(ben.id);
    ben.alive = false;
    w.byId.delete(ben.id);
    d.step(w, 0.016);
    expect(d.shot).toBeNull();
    // and the next ordinary event is shown at once, there being no shot
    const next = say(w, 'social', TEXT.promised, [ada.id], 40, 30);
    d.step(w, 0);
    expect(d.shot?.ev).toBe(next);
  });

  it('skip falls back to the candidate when nothing worthy waits, then to no shot', () => {
    const { w, ada, ben } = village('amb-skip');
    const d = new Director();
    d.step(w, 0);
    say(w, 'life', TEXT.death, [ada.id], 40, 30);
    d.step(w, 0);
    const gift = say(w, 'social', TEXT.gift, [ben.id], 41, 30);
    d.step(w, 0);
    expect(d.hasNext()).toBe(true);
    d.skip();
    expect(d.shot?.ev).toBe(gift);
    expect(d.shot?.ambient).toBe(true);
    expect(d.hasNext()).toBe(false);
    d.skip();
    expect(d.shot).toBeNull();
    // a worthy event waiting goes before the candidate
    const e = village('amb-skip-order');
    const d2 = new Director();
    d2.step(e.w, 0);
    say(e.w, 'life', TEXT.death, [e.ada.id], 40, 30);
    d2.step(e.w, 0);
    const g2 = say(e.w, 'social', TEXT.gift, [e.ben.id], 41, 30);
    const lit = say(e.w, 'build', TEXT.lit, [], 20, 20);
    d2.step(e.w, 0);
    d2.skip();
    expect(d2.shot?.ev).toBe(lit);
    d2.skip();
    expect(d2.shot?.ev).toBe(g2);
  });
});

it('observer purity: a seeded run watched by the director stays identical to an unwatched twin', () => {
  const settings = currentWorldSettings('normal', 'river', { immigration: true });
  const watched = new Game(settings);
  const twin = new Game(settings);
  const director = new Director();
  const checkpoints = new Set([100, 250, 400]);
  for (let t = 1; t <= 400; t++) {
    if (t === 20 || t === 60 || t === 120 || t === 200) {
      // staged in BOTH worlds alike, so that the run holds real events to watch: the simulation's own addEvent, about people who are there
      for (const g of [watched, twin]) {
        const adults = g.world.persons.filter((p) => p.alive).sort((a, b) => a.birthTick - b.birthTick || a.id - b.id);
        addEvent(g.world, 'life', `${adults[0].name} and ${adults[1].name} became a couple.`, [adults[0].id, adults[1].id], adults[0].x, adults[0].y);
        addEvent(g.world, 'build', `${adults[2].name} finished a hut.`, [adults[2].id], adults[2].x, adults[2].y);
        // and an ordinary one the record would not keep, for the ambient tier to read
        addEvent(g.world, 'social', `${adults[3].name} gave 2 berries to ${adults[4].name}.`, [adults[3].id, adults[4].id], adults[3].x, adults[3].y);
      }
    }
    watched.advanceTicks(1);
    twin.advanceTicks(1);
    director.step(watched.world, 0.05);
    highlights(watched.world, watched.world.tick - 3 * DAY, 8);
    reelOf(watched.world);
    if (t === 150) director.skip();
    if (checkpoints.has(t)) {
      expect(hashWorld(watched.world), `fingerprint at tick ${t}`).toBe(hashWorld(twin.world));
      expect(serializeWorld(watched.world), `serialized state at tick ${t}`).toBe(serializeWorld(twin.world));
    }
  }
  expect(director.counts.shown, 'the watcher really saw events').toBeGreaterThanOrEqual(2);
  expect(hashWorld(watched.world)).toBe(hashWorld(twin.world));
});
