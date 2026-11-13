// Rules 235: a standing smithy is a standing want for iron (src/sim/smithy_iron.ts; read in production.ts demandsOf and supply).
// STAGED: one grown woman who knows smelting, a shared smithy, kiln and mine, an ore vein, a tree and a rock, all known to her.
// The ordinary-world evidence is scripts/supply_probe.ts on the iron chain and docs/GROWTH_PLAN.md.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { generateOptions } from '../src/sim/decision';
import { ledgerCreate, weightOf } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { wantedTool } from '../src/sim/options_work';
import { carryCap } from '../src/sim/people';
import { perceive } from '../src/sim/perception';
import { demandsOf } from '../src/sim/production';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { IRON_KEPT, IRON_WANT, IRON_WHY, SMITHY_IRON_PARTS, setSmithyIron } from '../src/sim/smithy_iron';
import { makeSource } from '../src/sim/sources';
import type { Items } from '../src/sim/types';
import { addPerson, building, done, give, pin, stage } from './helpers/kit';
import { run } from './helpers/util';

afterEach(() => setSmithyIron(true));

/** A grown woman who knows smelting, and the workshops and the vein of the iron chain (staged). */
function fixture(version: number, smithyStock: Items = { charcoal: 4 }, inv: Items = {}) {
  const s = stage('smithy-iron'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1, generosity: 0.5, sociability: 0.5 }, inv: { bread: 1, ...inv } });
  p.techniques = { charcoal: { source: 'initial', learned: 0, teacher: 0 }, smelting: { source: 'initial', learned: 0, teacher: 0 } };
  const home = building(s, 'hut', 36, 36, p.hhId, { grain: 8 });
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const smithy = building(s, 'smithy', 50, 36, 0, smithyStock);
  const kiln = building(s, 'kiln', 46, 30, 0);
  const store = building(s, 'storehouse', 54, 36, 0);
  const tree = makeSource(w, 'tree', 38, 46, 8), rock = makeSource(w, 'rock', 34, 44, 8), vein = makeSource(w, 'ore_vein', 44, 47, 20);
  done(s);
  const all = [home, smithy, kiln, store, tree, rock, vein];
  // her hand-tool wants are met, so nothing else asks for wood or stone (staged; entered in the ledger)
  for (let n = 0; n < 8; n++) {
    for (const e of all) observe(w, p, e);
    const tool = wantedTool(generateOptions(w, p, true, true));
    if (!tool) break;
    give(w, p, tool);
    ledgerCreate(w, tool, 1, 'staged equipment');
  }
  for (const e of all) observe(w, p, e);
  perceive(w, p);
  pin(p);
  p.cooldowns.trade = 1e12;
  return { s, w, p, smithy, kiln, store, vein };
}
type F = ReturnType<typeof fixture>;
const wants = (f: F, item: string) => demandsOf(generateOptions(f.w, f.p, true, true)).filter((d) => d.item === item);

describe('rules 235: a standing smithy is a standing want for iron', () => {
  it('is a supported version at or below the current one, with its four parts and its numbers', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(235);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(235);
    expect(SMITHY_IRON_PARTS).toEqual(['want', 'carry', 'count', 'room']);
    expect([IRON_KEPT, IRON_WANT]).toEqual([2, 40]);
    for (const arm of ['rich-no-smithy-iron', 'rich-no-smithy-iron-want', 'rich-no-smithy-iron-carry', 'rich-no-smithy-iron-count', 'rich-no-smithy-iron-room']) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('want: somebody who knows a smithy with no iron wants two bars, at the weight of the charcoal want; not at rules 234 or with the part off', () => {
    const now = fixture(235);
    const iron = wants(now, 'iron');
    expect(iron.length).toBe(1);
    expect(iron[0].qty).toBe(IRON_KEPT);
    expect(iron[0].why).toBe(IRON_WHY);
    expect(iron[0].base).toBeGreaterThanOrEqual(IRON_WANT); // times her diligence
    expect(wants(fixture(234), 'iron')).toEqual([]);
    setSmithyIron(false, 'want');
    expect(wants(now, 'iron')).toEqual([]);
  });

  it('want: one bar lying there leaves one wanted, two leave none; and with ore to be had the first step is offered', () => {
    expect(wants(fixture(235, { charcoal: 4, iron: 1 }), 'iron')[0]?.qty).toBe(1);
    expect(wants(fixture(235, { charcoal: 4, iron: 2 }), 'iron')).toEqual([]);
    const f = fixture(235);
    const step = generateOptions(f.w, f.p, true, true).options.filter((o) => o.goal.startsWith(IRON_WHY) || o.label.includes('smelted iron'));
    expect(step.length).toBeGreaterThan(0);
    expect(step.some((o) => /ore/i.test(o.label))).toBe(true);
    expect(Math.max(...step.map((o) => o.util))).toBeGreaterThan(20);
  });

  it('carry: somebody who does not know smelting is not offered it, but is offered to fetch the ore for the smithy; not with the part off', () => {
    const f = fixture(235);
    delete f.p.techniques!.smelting;
    const look = () => generateOptions(f.w, f.p, true, true);
    expect(look().blocked.some((o) => /has not learned iron smelting/.test(o.blocked ?? ''))).toBe(true);
    expect(look().options.some((o) => o.kind === 'operate' && /Smelting/.test(o.label))).toBe(false);
    const ore = () => look().options.filter((o) => /ore/i.test(o.label) && o.goal.startsWith(IRON_WHY));
    expect(ore().length).toBeGreaterThan(0);
    setSmithyIron(false, 'carry');
    expect(ore()).toEqual([]);
    setSmithyIron(true);
    // carrying ore, she is offered to take it to the smithy
    f.p.inv.ore = 3;
    expect(look().options.some((o) => o.kind === 'deposit' && o.targetId === f.smithy.id && /ore/.test(o.label))).toBe(true);
  });

  it('count: four charcoal at the smithy are four, so no more is wanted; by the glance of rules 169 they were one and three were', () => {
    const now = fixture(235), old = fixture(234);
    expect(now.p.beliefs[now.smithy.id].items?.charcoal).toBe(1); // the glance
    expect(now.p.beliefs[now.smithy.id].ops?.inputs.charcoal).toBe(4); // the workshop's own record
    expect(wants(old, 'charcoal')[0]?.qty).toBe(3);
    expect(wants(now, 'charcoal')).toEqual([]);
    setSmithyIron(false, 'count');
    expect(wants(now, 'charcoal')[0]?.qty).toBe(3);
    setSmithyIron(true);
    expect(wants(fixture(235, { charcoal: 1 }), 'charcoal')[0]?.qty).toBe(3); // really short: wanted at either version
  });

  it('room: with no room for one ore, a left-over of stone may be left first; at rules 234 and with the part off it is only refused', () => {
    const full = (version: number) => {
      const f = fixture(version, { charcoal: 4 }, { stone: 3 });
      while (carryCap(f.w, f.p) - weightOf(f.p.inv) >= 3) f.p.inv.stone = (f.p.inv.stone ?? 0) + 1;
      return f;
    };
    const leave = (f: F) => generateOptions(f.w, f.p, true, true).options.find((o) => !!o.key?.startsWith('leave:'));
    const now = full(235);
    expect(leave(now)?.label).toMatch(/^Leave the stone at /);
    expect(leave(full(234))).toBeUndefined();
    setSmithyIron(false, 'room');
    expect(leave(now)).toBeUndefined();
  });

  it('nothing is saved: a world saved and loaded continues the same', () => {
    const f = fixture(235);
    f.p.cooldowns.pause = 0;
    run(f.w, 300);
    const copy = deserializeWorld(serializeWorld(f.w));
    run(f.w, 300);
    run(copy, 300);
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
  });
});
