// Event cards (src/ui/event_cards_model.ts, event_cards_art.ts): which real happenings get a card, what it says, the queue, the
// placement, and observer purity. Every world here except the purity run's is STAGED (occasions are called with the simulation's
// own callOccasion/noteWedding/noteBirth and opened by its own occasionsTick; buildings by its own createBuilding): it checks the
// presentation rule, it is not an example of spontaneous behaviour.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/app/game';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { callOccasion, noteBirth, noteDeath, noteWedding, occasionsTick } from '../src/sim/occasions';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld } from '../src/sim/world';
import { burstFor } from '../src/ui/event_cards_art';
import { EventCards, MAX_OPEN, MAX_WAITING, SHOW_SECONDS, STALE_SECONDS, VENUE_GAP, buildingNotice, cardWidth, occasionNotice, placeCards, placeMarker } from '../src/ui/event_cards_model';
import { addPerson, building, done, stage } from './helpers/kit';
import type { Occasion, World } from '../src/sim/types';

function village(tag: string) {
  const s = stage(`event-cards-${tag}`);
  const w = s.w;
  w.settings.dynamics = 'rich';
  const ada = addPerson(s, 'Ada', 40, 30, { age: 24, sex: 'f' });
  const ben = addPerson(s, 'Ben', 41, 30, { age: 26, sex: 'm' });
  const cal = addPerson(s, 'Cal', 42, 31, { age: 30, sex: 'm' });
  building(s, 'fire', 44, 34);
  done(s);
  return { w, ada, ben, cal };
}
/** run the world's own occasion clock until the occasion has begun (or is over) */
function until(w: World, o: Occasion, status: Occasion['status']) {
  for (let i = 0; i < 4 * DAY && o.status !== status; i++) {
    w.tick++;
    occasionsTick(w);
  }
  expect(o.status).toBe(status);
}

describe('what a card says, from the records', () => {
  it('a wedding: the couple by name and the venue, with the bells look', () => {
    const { w, ada, ben } = village('wedding');
    noteWedding(w, ada, ben);
    const o = w.occasions![0];
    const n = occasionNotice(w, o);
    expect(n.look).toBe('wedding');
    expect(n.title).toBe('A wedding has begun!');
    expect(n.lines).toEqual(['Ada & Ben', 'At the fire']);
    expect(n.ongoing).toBe(true);
    expect([n.x, n.y]).toEqual([o.x, o.y]);
  });

  it('a birth feast says whose birth it is; a funeral is quiet; a remembrance is not called a funeral', () => {
    const { w, ada, ben, cal } = village('birth');
    noteBirth(w, cal, ada); // staged: Cal stands in for the baby; the record is [baby, mother]
    const birth = occasionNotice(w, w.occasions![0]);
    expect(birth.look).toBe('birth');
    expect(birth.title).toBe('A birth feast has begun!');
    expect(birth.lines[0]).toBe('Welcoming Cal, born to Ada');
    noteDeath(w, ben);
    const fun = occasionNotice(w, w.occasions![1]);
    expect(fun.look).toBe('funeral');
    expect(fun.title).toBe('A funeral has begun');
    expect(fun.lines[0]).toBe('For Ben');
    expect(burstFor(fun.key, fun.look)).toEqual([]);
    // a remembrance held as a yearly tradition (traditions.ts) for the same kind of occasion
    const r = { ...w.occasions![1], id: 999, about: [ben.id] };
    w.traditions = [{ id: 1, kind: 'remembrance', name: `the remembrance of Ben`, since: 0, dayOfYear: 0, lastHeld: Math.floor(r.called / DAY), held: 1, skipped: 0, about: ben.id, status: 'kept' }];
    const rem = occasionNotice(w, r);
    expect(rem.title).toBe('A remembrance has begun');
    expect(rem.lines[0]).toBe('Remembering Ben');
  });

  it('a shared building finished is a moment; a household building has no card', () => {
    const { w, ada } = village('civic');
    const g = createBuilding(w, 'granary', 30, 30, 0);
    g.builtBy = [ada.id];
    const n = buildingNotice(w, g);
    expect(n.title).toBe('A granary is finished!');
    expect(n.lines).toEqual(['For everyone to use', 'Built by Ada']);
    expect(n.ongoing).toBe(false);
    const cards = new EventCards();
    cards.step(w, 0);
    createBuilding(w, 'hut', 20, 20, ada.hhId);
    createBuilding(w, 'storehouse', 24, 20, 0);
    cards.step(w, 0.016);
    expect(cards.open().map((e) => e.notice.title)).toEqual(['A storehouse is finished!']);
    cards.step(w, SHOW_SECONDS);
    expect(cards.entries.size, 'a building has no marker').toBe(0);
  });
});

describe('when a card opens, and only once', () => {
  it('a called occasion has no card; it opens when it begins, folds to a marker after six UI seconds and goes when it is over', () => {
    const { w, ada, ben } = village('lifecycle');
    const cards = new EventCards();
    cards.step(w, 0);
    noteWedding(w, ada, ben);
    const o = w.occasions![0];
    cards.step(w, 0.016);
    expect(o.status).toBe('called');
    expect(cards.entries.size, 'called is not begun').toBe(0);
    until(w, o, 'gathering');
    for (let i = 0; i < 100; i++) cards.step(w, 0.016); // many frames, a paused world: one card
    expect(cards.open().length).toBe(1);
    expect(cards.counts.announced).toBe(1);
    cards.step(w, SHOW_SECONDS);
    expect(cards.open().length).toBe(0);
    expect(cards.markers().map((e) => e.notice.key)).toEqual([`occ:${o.id}`]);
    for (let i = 0; i < 50; i++) cards.step(w, 0.5);
    expect(cards.counts.announced, 'never announced twice').toBe(1);
    until(w, o, 'done');
    cards.step(w, 0.016);
    expect(cards.entries.size).toBe(0);
  });

  it('dismiss folds an occasion to its marker at once', () => {
    const { w } = village('dismiss');
    const cards = new EventCards();
    cards.step(w, 0);
    const o = callOccasion(w, 'market', [])!;
    until(w, o, 'gathering');
    cards.step(w, 0.016);
    expect(cards.open()[0].notice.title).toBe('The market is open');
    cards.dismiss(`occ:${o.id}`);
    expect(cards.markers().length).toBe(1);
    cards.step(w, 0.016);
    expect(cards.open().length).toBe(0);
  });

  it('a loaded world or a world first seen is not replayed: what is under way gets its marker only', () => {
    const { w, ada, ben } = village('load');
    noteWedding(w, ada, ben);
    until(w, w.occasions![0], 'gathering');
    createBuilding(w, 'granary', 30, 30, 0);
    const cards = new EventCards();
    cards.step(w, 0.016);
    expect(cards.open().length).toBe(0);
    expect(cards.markers().length).toBe(1);
    expect(cards.counts.announced).toBe(0);
    const loaded = deserializeWorld(serializeWorld(w));
    cards.step(loaded, 0.016);
    expect(cards.open().length).toBe(0);
    expect(cards.markers().length).toBe(1);
    expect(cards.counts.announced).toBe(0);
  });
});

describe('the queue: at most two open, no long backlog', () => {
  it('four occasions beginning together open two at a time; a fifth thing past the backlog loses its card', () => {
    const { w, ada, ben, cal } = village('queue');
    const cards = new EventCards();
    cards.step(w, 0);
    noteWedding(w, ada, ben);
    noteBirth(w, cal, ada);
    callOccasion(w, 'harvest', []);
    callOccasion(w, 'market', []);
    // staged: all four begin on the same tick
    for (const o of w.occasions!) { o.until = w.tick + 1 + (o.until - o.at); o.at = w.tick + 1; }
    w.tick++;
    occasionsTick(w);
    createBuilding(w, 'storehouse', 24, 20, 0);
    cards.step(w, 0.016);
    expect(cards.open().length).toBe(MAX_OPEN);
    expect(cards.waiting().length).toBe(MAX_WAITING);
    expect(cards.counts.skipped).toBe(1);
    // the first to arrive open first
    expect(cards.open().map((e) => e.notice.look)).toEqual(['wedding', 'birth']);
    // the occasion that lost its card still shows its marker
    expect(cards.markers().length).toBe(1);
    cards.step(w, SHOW_SECONDS);
    expect(cards.open().length).toBe(MAX_OPEN);
    expect(cards.open().every((e) => e.notice.look !== 'wedding')).toBe(true);
  });

  it('a card that waits too long goes stale', () => {
    const { w } = village('stale');
    const cards = new EventCards();
    cards.step(w, 0);
    for (let i = 0; i < 3; i++) createBuilding(w, 'storehouse', 20 + 4 * i, 20, 0);
    cards.step(w, 0.016);
    expect(cards.waiting().length).toBe(1);
    // the open two are held open (a long frame would close them); the waiting one stales first
    for (const e of cards.open()) e.age = -100;
    cards.step(w, STALE_SECONDS);
    expect(cards.waiting().length).toBe(0);
    expect(cards.entries.size).toBe(2);
  });
});

describe('placement', () => {
  const view = { w: 1200, h: 800 };
  it('sits above the venue with its pointer down, clear of the people there', () => {
    const [p] = placeCards([{ venue: { x: 600, y: 400 }, w: 240, h: 100 }], view, []);
    expect(p.tail).toBe('down');
    expect(p.y + 100).toBe(400 - VENUE_GAP);
    expect(p.x).toBe(480);
  });
  it('near the top it goes below with its pointer up; it never leaves the view', () => {
    const [p] = placeCards([{ venue: { x: 60, y: 40 }, w: 240, h: 100 }], view, []);
    expect(p.tail).toBe('up');
    expect(p.x).toBeGreaterThanOrEqual(8);
    expect(p.y).toBeGreaterThanOrEqual(40 + VENUE_GAP);
  });
  it('two cards at one venue do not overlap, and a panel is avoided', () => {
    const ps = placeCards([{ venue: { x: 600, y: 400 }, w: 240, h: 100 }, { venue: { x: 610, y: 400 }, w: 240, h: 100 }], view, []);
    const [a, b] = ps;
    const overlapX = Math.min(a.x + 240, b.x + 240) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + 100, b.y + 100) - Math.max(a.y, b.y);
    expect(overlapX <= 0 || overlapY <= 0).toBe(true);
    // the second stacks above the first, off the ground below the venue, and has no pointer through the first
    expect(b.y + 100).toBeLessThanOrEqual(a.y);
    expect([a.tail, b.tail]).toEqual(['down', null]);
    // a wide gathering (zoomed in) is kept clear: the card's bottom edge stays above it
    const [k] = placeCards([{ venue: { x: 600, y: 400 }, w: 240, h: 100, keep: 60 }], view, []);
    expect(k.y + 100).toBeLessThanOrEqual(400 - 60 * 0.6);
    const panel = { x: 400, y: 200, w: 400, h: 180 };
    const [c] = placeCards([{ venue: { x: 600, y: 400 }, w: 240, h: 100 }], view, [panel]);
    const covered = Math.max(0, Math.min(c.x + 240, 800) - Math.max(c.x, 400)) * Math.max(0, Math.min(c.y + 100, 380) - Math.max(c.y, 200));
    expect(covered).toBe(0);
    // a panel right over the venue (an open inspector): the card steps clear of it
    const inspector = { x: 1132 - 400, y: 98, w: 296, h: 532 };
    const [d] = placeCards([{ venue: { x: 880, y: 360 }, w: 244, h: 103 }], view, [inspector]);
    expect(Math.max(0, Math.min(d.x + 244, inspector.x + inspector.w) - Math.max(d.x, inspector.x)) * Math.max(0, Math.min(d.y + 103, inspector.y + inspector.h) - Math.max(d.y, inspector.y))).toBe(0);
  });
  it('a venue off screen puts the card inside the view with no pointer; a narrow screen narrows the card', () => {
    const [p] = placeCards([{ venue: { x: 1600, y: -200 }, w: 240, h: 100 }], view, []);
    expect(p.tail).toBeNull();
    expect(p.x + 240).toBeLessThanOrEqual(view.w);
    expect(p.y).toBeGreaterThanOrEqual(0);
    expect(placeMarker({ x: -50, y: 300 }, view).pinned).toBe(true);
    expect(cardWidth(1200)).toBe(244);
    expect(cardWidth(375)).toBe(244);
    expect(cardWidth(240)).toBe(216);
  });
});

describe('the burst', () => {
  it('is the same every time, short, and only for the glad looks', () => {
    const a = burstFor('occ:7', 'wedding');
    expect(a).toEqual(burstFor('occ:7', 'wedding'));
    expect(a.length).toBeGreaterThan(10);
    expect(a.every((b) => b.delay + b.dur <= 2100)).toBe(true);
    expect(new Set(a.map((b) => b.shape))).toEqual(new Set(['petal', 'blossom']));
    expect(burstFor('occ:7', 'funeral')).toEqual([]);
    expect(burstFor('occ:7', 'market')).toEqual([]);
  });
});

it('observer purity: a seeded run watched by the event cards stays identical to an unwatched twin', () => {
  const settings = currentWorldSettings('normal', 'river', { immigration: true });
  const watched = new Game(settings);
  const twin = new Game(settings);
  const cards = new EventCards();
  const checkpoints = new Set([400, 1200, 2000, 3000]);
  for (let t = 1; t <= 3000; t++) {
    if (t === 5) {
      // staged in BOTH worlds alike, so that the run holds a real wedding to watch: the same two adults are married by the
      // simulation's own noteWedding; the occasion then opens and closes on the world's own clock
      for (const g of [watched, twin]) {
        const adults = g.world.persons.filter((p) => p.alive).sort((a, b) => a.birthTick - b.birthTick || a.id - b.id);
        noteWedding(g.world, adults[0], adults[1]);
      }
    }
    watched.advanceTicks(1);
    twin.advanceTicks(1);
    cards.step(watched.world, 1 / 60);
    for (const e of cards.entries.values()) void e.notice.says;
    for (const o of watched.world.occasions ?? []) void occasionNotice(watched.world, o);
    for (const e of cards.open()) if (t % 7 === 0) cards.dismiss(e.notice.key);
    if (checkpoints.has(t)) {
      expect(hashWorld(watched.world), `fingerprint at tick ${t}`).toBe(hashWorld(twin.world));
      expect(serializeWorld(watched.world), `serialized state at tick ${t}`).toBe(serializeWorld(twin.world));
    }
  }
  expect(cards.counts.announced, 'the watcher really saw the wedding begin').toBeGreaterThanOrEqual(1);
});
