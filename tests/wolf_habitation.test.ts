import { afterEach, expect, it } from 'vitest';
import { testKit } from '../src/sim/scenes';
import { RNG } from '../src/sim/rng';
import { settingsFor } from './helpers/util';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { createBuilding } from '../src/sim/buildings';
import { enterHome, doorPoint } from '../src/sim/habitation';
import { makeWolf, updateWildlife } from '../src/sim/wildlife';
import { perceive } from '../src/sim/perception';
import { updateEnvironment } from '../src/sim/environment';
import { mintTool, toolOf } from '../src/sim/tools';
import { generateOptions, decide, reviewActivity } from '../src/sim/decision';
import { handlerOf, newActivity, stepActivity, startActivity } from '../src/sim/activities';
import { defenceOptions, facingWolf, defProbe, defReset, defSnapshot } from '../src/sim/defence';
import { makeCtx } from '../src/sim/optutil';
import { stepWorld } from '../src/sim/world';
import { TOOL_RECIPE } from '../src/sim/constants';
import { produce } from '../src/sim/economy';

function fixture(armed = true) {
  const w = testKit.flatWorld(settingsFor('wolf-home', { dynamics: 'rich', rulesVersion: CURRENT_RULES_VERSION, immigration: false }));
  const p = testKit.addPerson(w, new RNG(71), { name: 'Ada', x: 40.5, y: 44.5, age: 25, hunger: 95, thirst: 95, energy: 95, traits: { caution: 0.1 } });
  const b = createBuilding(w, 'hut', 40, 40, p.hhId);
  w.households.find(h => h.id === p.hhId)!.homeId = b.id;
  Object.assign(p, doorPoint(b));
  const wolf = makeWolf(w, p.x + 2, p.y + 1);
  wolf.state = 'stalk'; wolf.targetId = p.id; wolf.until = 9999;
  if (armed) mintTool(w, 'spear', 0, p.hhId, p.id, p.inv, p.id, 'test equipment', false);
  testKit.finish(w, 'natural'); w.tick = 1000; updateEnvironment(w); perceive(w, p);
  return { w, p, b, wolf };
}
afterEach(() => { defProbe.on = false; defReset(); });

it('interrupts spear crafting for a real attack and enters the known home through its door', () => {
  const { w, p, b, wolf } = fixture(false);
  produce(w, p.inv, 99, 'wood', TOOL_RECIPE.spear.wood, 'test material');
  produce(w, p.inv, 99, 'stone', TOOL_RECIPE.spear.stone, 'test material');
  const craft = generateOptions(w, p, true).options.find(o => o.key === 'craft:spear');
  expect(craft).toBeDefined();
  startActivity(w, p, craft!.make!()!);
  reviewActivity(w, p);
  expect(p.lastResult?.outcome).toBe('interrupted');
  expect(p.activity?.kind).toBe('flee');
  for (let n = 0; n < 400 && !p.indoors; n++) stepWorld(w);
  expect(p.indoors).toBe(b.id);
  expect(p.inv.spear ?? 0).toBe(0);
  expect(p.inv.wood).toBe(TOOL_RECIPE.spear.wood);
  const hp = p.health;
  updateWildlife(w);
  expect(p.health).toBe(hp);
  expect(wolf.state).toBe('retreat');
});

it('does not offer defence to an occupant even with a stale outdoor perception', () => {
  const { w, p, b } = fixture();
  const seen = p.seen;
  expect(generateOptions(w, p, true).options.some(o => o.kind === 'defend')).toBe(true);
  expect(enterHome(w, p, b)).toBeNull();
  p.seen = seen; // a cached observation is not physical access
  const ctx = makeCtx(w, p, true); defenceOptions(ctx);
  expect(ctx.options.some(o => o.kind === 'defend')).toBe(false);
});

it('excludes indoor neighbours from the defence companion bonus', () => {
  const { w, p, b } = fixture();
  const q = testKit.addPerson(w, new RNG(5), { name: 'Ben', hh: p.hhId, ...doorPoint(b), age: 25 });
  const score = () => { perceive(w, p); const c = makeCtx(w, p, true); defenceOptions(c); return c.options.find(o => o.kind === 'defend')!.parts; };
  expect(score().some(([why]) => why === 'someone at hand')).toBe(true);
  expect(enterHome(w, q, b)).toBeNull();
  expect(score().some(([why]) => why === 'someone at hand')).toBe(false);
});

it('ends a rescue without credit or wear when its beneficiary reaches home', () => {
  const { w, p, b, wolf } = fixture();
  const q = testKit.addPerson(w, new RNG(5), { name: 'Ben', hh: p.hhId, ...doorPoint(b), age: 25 });
  const a = newActivity(w, p, { kind: 'defend', label: 'Rescue Ben', goal: 'help', targetId: wolf.id, here: true, data: { forWhom: q.id, forName: q.name, tries: 0 } });
  startActivity(w, p, a);
  expect(enterHome(w, q, b)).toBeNull();
  defProbe.on = true; defReset();
  const wear = toolOf(w, p, 'spear')!.wear;
  expect(handlerOf('defend')!.work!(w, p, a)).toBe('partial:they reached shelter');
  expect(toolOf(w, p, 'spear')!.wear).toBe(wear);
  expect(defSnapshot().droveOff + defSnapshot().attempts).toBe(0);
});

it('does not hesitate for a defender who has become unable to stand', () => {
  const { w, p, wolf } = fixture();
  decide(w, p, 'test');
  for (let n = 0; n < 10 && p.activity?.phase !== 'work'; n++) stepWorld(w);
  expect(p.activity?.kind).toBe('defend');
  p.health = 20;
  expect(facingWolf(w, wolf, p)).toBe(false);
});

it('keeps occupants safe even when an old defence activity is still attached', () => {
  const { w, p, b, wolf } = fixture();
  const a = newActivity(w, p, { kind: 'defend', label: 'defend', goal: 'survive', targetId: wolf.id, here: true });
  startActivity(w, p, a);
  expect(enterHome(w, p, b)).toBeNull();
  expect(facingWolf(w, wolf, p)).toBe(false);
  const health = p.health;
  updateWildlife(w);
  expect(p.health).toBe(health);
  expect(wolf.state).toBe('retreat');
  w.solid[b.doorY * w.W + b.doorX] = 1;
  const wear = toolOf(w, p, 'spear')!.wear;
  stepActivity(w, p);
  expect(p.indoors).toBe(b.id);
  expect(toolOf(w, p, 'spear')!.wear).toBe(wear);
});
