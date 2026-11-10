// Rules 188: what was taken, from where, and where salvage for a shared building came from.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { makeHousePile } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { projectHistory } from '../src/sim/history';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { noteSalvageDelivered, noteTaken, placeWords, SALVAGE_WINDOW, setTakenFrom, takenLine } from '../src/sim/taken_from';
import { stepWorld } from '../src/sim/world';
import type { Person, Pile, World } from '../src/sim/types';
import { addPerson, building, done, stage } from './helpers/kit';
import { civicFixture, civicTalk } from './helpers/civic';

afterEach(() => { setTakenFrom(true); });

/** STAGED: Ann stands beside a pile left by an abandoned site and is set to take one stone from it. */
function beside(version: number) {
  const s = stage(`taken-from-${version}`);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = version;
  const ann = addPerson(s, 'Ann', 40.5, 40.5, { age: 30, hunger: 98, thirst: 98 });
  ann.needs.warmth = 95; ann.needs.safety = 95;
  const store = building(s, 'storehouse', 46, 40, 0, { wood: 3 });
  const w = done(s);
  w.tick = 3 * DAY + 10;
  const pile = makeHousePile(w, 41, 40, { stone: 1, wood: 4 }, 'abandoned building materials')!;
  return { w, ann, pile, store };
}
function take(w: World, p: Person, target: Pile, items: Record<string, number>) {
  startActivity(w, p, newActivity(w, p, { kind: 'withdraw', label: 'Take what is there', goal: 'staged taking', targetId: target.id, targetType: 'pile', tx: target.x, ty: target.y, spotX: p.x, spotY: p.y, utility: 100, minCommit: 4000, maxTicks: 400, data: { items } }));
  for (let i = 0; i < 400 && !p.log.some((l) => l.text.startsWith('Took ')); i++) stepWorld(w);
  return p.log.find((l) => l.text.startsWith('Took '))?.text;
}

describe('rules 188: what was taken and from where', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(188);
    expect(SUPPORTED_RULES_VERSIONS).toContain(188);
  });

  it('names a pile by its note and the day it was left, and a building by its kind', () => {
    const { pile, store } = beside(188);
    expect(placeWords(pile)).toBe('a pile of abandoned building materials, there since day 3');
    expect(placeWords(store)).toBe('the storehouse');
    expect(placeWords(undefined)).toBe('storage');
  });

  it('at 187 taking a stone from the pile logs "1 item from storage" and keeps nothing', () => {
    const { w, ann, pile } = beside(187);
    expect(take(w, ann, pile, { stone: 1 })).toBe('Took 1 item from storage.');
    expect(ann.inv.stone).toBe(1);
    expect(ann.lastTaken).toBeUndefined();
  });

  it('at 188 the same taking names the stone and the pile, and the person keeps it', () => {
    const { w, ann, pile } = beside(188);
    expect(take(w, ann, pile, { stone: 1 })).toBe('Took 1 stone from a pile of abandoned building materials, there since day 3.');
    expect(ann.inv.stone).toBe(1);
    expect(ann.lastTaken).toMatchObject({ what: '1 stone', kinds: 'stone', pile: true });
  });

  it('with the switch off the old line stays at 188', () => {
    setTakenFrom(false);
    const { w, ann, pile } = beside(188);
    expect(take(w, ann, pile, { stone: 1 })).toBe('Took 1 item from storage.');
    expect(ann.lastTaken).toBeUndefined();
  });

  it('salvage delivered to a shared project within half a day is put down on the participation record and shown', () => {
    const f = civicFixture();
    civicTalk(f.w, f.a, f.b, f.site.id);
    f.w.settings.rulesVersion = 188;
    const pile = makeHousePile(f.w, 44, 44, { stone: 2 }, 'abandoned building materials')!;
    noteTaken(f.w, f.b, pile, { stone: 1 }, 77);
    expect(takenLine(f.w, f.b, 77)).toContain('Took 1 stone from a pile of abandoned building materials');
    expect(takenLine(f.w, f.b, 78)).toBeUndefined();
    noteSalvageDelivered(f.w, f.b, f.site.id, 'wood', 1); // a different kind: not salvage from that taking
    noteSalvageDelivered(f.w, f.b, f.site.id, 'stone', 1);
    noteSalvageDelivered(f.w, f.b, f.site.id, 'stone', 1); // the same line is kept once
    const ben = f.w.civicProjects![0].participants.find((m) => m.personId === f.b.id)!;
    expect(ben.salvaged).toHaveLength(1);
    expect(ben.salvaged![0]).toMatch(/^stone from a pile of abandoned building materials, there since day \d+$/);
    expect(projectHistory(f.w, f.w.civicProjects![0]).some((l) => l.includes('(stone from a pile of abandoned building materials'))).toBe(true);
  });

  it('a taking from a building, an old taking, and a 187 world leave no salvage line', () => {
    const f = civicFixture();
    civicTalk(f.w, f.a, f.b, f.site.id);
    const ben = () => f.w.civicProjects![0].participants.find((m) => m.personId === f.b.id)!;
    f.w.settings.rulesVersion = 188;
    const hut = f.w.buildings[0];
    noteTaken(f.w, f.b, hut, { stone: 1 }, 1);
    noteSalvageDelivered(f.w, f.b, f.site.id, 'stone', 1);
    expect(ben().salvaged).toBeUndefined();
    const pile = makeHousePile(f.w, 44, 44, { stone: 2 }, 'abandoned building materials')!;
    noteTaken(f.w, f.b, pile, { stone: 1 }, 2);
    f.w.tick += SALVAGE_WINDOW + 1;
    noteSalvageDelivered(f.w, f.b, f.site.id, 'stone', 1);
    expect(ben().salvaged).toBeUndefined();
    f.w.settings.rulesVersion = 187;
    f.b.lastTaken!.tick = f.w.tick;
    noteSalvageDelivered(f.w, f.b, f.site.id, 'stone', 1);
    expect(ben().salvaged).toBeUndefined();
  });
});
