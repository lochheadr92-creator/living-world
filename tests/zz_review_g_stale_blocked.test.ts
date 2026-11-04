// REVIEW G (observer truth audit): Activity.blocked text set by a blocked indoor exit is never cleared once the exit
// succeeds, so the card says "What is stopping them? Home exit is blocked." while they are walking outside.
import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { newActivity, startActivity, stepActivity } from '../src/sim/activities';
import { describePerson } from '../src/sim/inspect';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { hasHabitation } from '../src/sim/habitation';
import { isWalkable } from '../src/sim/registry';
import { addPerson, building, done, stage } from './helpers/kit';

const OUT = 'C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/agent_g/stale_blocked.txt';

it('a one-tick blocked doorway leaves "home exit is blocked" on the activity for the whole walk', () => {
  const s = stage('stale-blocked');
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = CURRENT_RULES_VERSION;
  const p = addPerson(s, 'Ada', 40, 40, { age: 35, hunger: 90, thirst: 90, energy: 90 });
  const hut = building(s, 'hut', 38, 44, p.hhId);
  const w = done(s);
  expect(hasHabitation(w)).toBe(true);
  // inside her own hut
  p.indoors = hut.id;
  p.x = hut.x + 0.5;
  p.y = hut.y + 0.5;
  p.px = p.x;
  p.py = p.y;
  const a = newActivity(w, p, { kind: 'wander', label: 'Wandering', goal: 'to see what is about', tx: 52.5, ty: 30.5, spotX: 52.5, spotY: 30.5, maxTicks: 900, data: { where: 'the open ground' } });
  startActivity(w, p, a);
  expect(a.phase).toBe('travel');
  // the doorway is occupied for one tick
  const di = hut.doorY * w.W + hut.doorX;
  const wasSolid = w.solid[di];
  w.solid[di] = 1;
  expect(isWalkable(w, hut.doorX, hut.doorY)).toBe(false);
  stepActivity(w, p);
  expect(a.blocked).toBe('home exit is blocked');
  expect(p.indoors).toBe(hut.id);
  w.solid[di] = wasSolid;
  // the next tick she leaves and walks
  stepActivity(w, p);
  expect(p.indoors).toBeUndefined();
  const lines: string[] = [];
  let walkedTicks = 0;
  for (let n = 0; n < 40 && p.activity === a && a.phase === 'travel'; n++) {
    const before = { x: p.x, y: p.y };
    stepActivity(w, p);
    if (p.x !== before.x || p.y !== before.y) walkedTicks++;
    if (n % 10 === 0) {
      const v = describePerson(w, p.id, { opportunities: false })!;
      lines.push(`after ${n + 2} ticks outside: phase=${a.phase} blocked="${a.blocked}" | card: doing="${v.qa.doing}" stopping="${v.qa.stopping}" historical=${v.qa.stoppingIsHistorical} activity.blocked="${v.activity?.blocked}"`);
    }
  }
  writeFileSync(OUT, lines.join('\n'));
  expect(walkedTicks).toBeGreaterThan(5);
  // the stale text: still "blocked" while moving freely outdoors
  expect(a.blocked).toBe('home exit is blocked');
  const v = describePerson(w, p.id, { opportunities: false })!;
  expect(v.qa.stopping).toBe('Home exit is blocked.');
  expect(v.qa.stoppingIsHistorical).toBe(false);
  expect(v.qa.doing).toMatch(/walking to|tiles to go/);
});
