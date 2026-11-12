// Rules 229: what a waiting site lacks gets made (src/sim/site_supply.ts; read in production.ts demandsOf, supply and
// productionOptions). Every situation here is STAGED: one grown person, a shared smithy site that has its wood and stone and
// waits for four bricks, a kiln, a timber yard, a storehouse, a clay pit and a tree, all known to her. They check the rule; the
// ordinary-world evidence is the pin (tests/v229_continuation.*) and docs/GROWTH_PLAN.md.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { generateOptions } from '../src/sim/decision';
import { conservationReport, ledgerCreate, weightOf } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { wantedTool } from '../src/sim/options_work';
import { carryCap } from '../src/sim/people';
import { perceive } from '../src/sim/perception';
import { demandsOf } from '../src/sim/production';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { startJob, workJob } from '../src/sim/facilities';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { MADE_FOR_SITE, MADE_FOR_SITE_HALVED, SAW_TO_YARD, SITE_SUPPLY_PARTS, setMadeForSiteDose, setSiteSupply } from '../src/sim/site_supply';
import { makeSource } from '../src/sim/sources';
import { toolsHeldBy } from '../src/sim/toolreg';
import { mintTool } from '../src/sim/tools';
import type { Option } from '../src/sim/optutil';
import type { Items, World } from '../src/sim/types';
import { addPerson, building, done, give, pin, site, stage } from './helpers/kit';
import { finishPrerequisite } from './helpers/tool_prerequisite';
import { run } from './helpers/util';

afterEach(() => { setSiteSupply(true); setMadeForSiteDose(null); });

interface Staged { inv?: Items; saw?: boolean; rackSaw?: boolean; yardStock?: Items; delivered?: Items; granary?: boolean }
/** One grown woman and a shared smithy site that waits for bricks (staged). */
function fixture(version: number, o: Staged = {}) {
  const s = stage('site-supply'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1, generosity: 0.5, sociability: 0.5 }, inv: { bread: 1, ...(o.inv ?? {}) } });
  p.skills.carpentry = 1.2;
  const home = building(s, 'hut', 36, 36, p.hhId, { grain: 8 });
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const yard = building(s, 'timber_yard', 50, 36, 0, o.yardStock ?? {});
  const kiln = building(s, 'kiln', 46, 30, 0);
  const store = building(s, 'storehouse', 54, 36, 0);
  const smithy = site(s, 'smithy', 58, 44, 0, p.id, o.delivered ?? { wood: 6, stone: 8 });
  const granary = o.granary ? site(s, 'granary', 62, 36, 0, p.id, { wood: 6, stone: 4 }) : null; // waits for eight planks
  const tree = makeSource(w, 'tree', 38, 46, 8), pit = makeSource(w, 'clay_pit', 43, 46, 12), rock = makeSource(w, 'rock', 34, 44, 8);
  done(s);
  // equipment handed out after the opening snapshot is entered in the ledger as staged, so the accounts still balance
  if (o.saw) { give(w, p, 'saw'); ledgerCreate(w, 'saw', 1, 'staged equipment'); }
  if (o.rackSaw) { mintTool(w, 'saw', 0, 0, yard.id, yard.store.items, 0, 'test equipment', false); ledgerCreate(w, 'saw', 1, 'staged equipment'); }
  // her other hand-tool wants are met, so nothing else asks for wood or stone (staged)
  for (let n = 0; n < 8; n++) {
    for (const e of [home, yard, kiln, store, smithy, tree, pit, rock, ...(granary ? [granary] : [])]) observe(w, p, e);
    const tool = wantedTool(generateOptions(w, p, true, true));
    if (!tool || tool === 'saw') break;
    give(w, p, tool);
    ledgerCreate(w, tool, 1, 'staged equipment');
  }
  for (const e of [home, yard, kiln, store, smithy, tree, pit, rock, ...(granary ? [granary] : [])]) observe(w, p, e);
  perceive(w, p);
  pin(p);
  p.cooldowns.trade = 1e12;
  return { s, w, p, home, yard, kiln, store, smithy, tree, pit, rock };
}
const options = (w: World, p: ReturnType<typeof fixture>['p']) => generateOptions(w, p, true, true);
const byKey = (w: World, p: ReturnType<typeof fixture>['p'], test: (o: Option) => boolean): Option | undefined => options(w, p).options.find(test);
const bricksWant = (w: World, p: ReturnType<typeof fixture>['p']): number => demandsOf(options(w, p)).find((d) => d.item === 'bricks')?.base ?? 0;

describe('rules 229: what a waiting site lacks gets made', () => {
  it('is a supported version at or below the current one, with its four parts and its two numbers', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(229);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(229);
    expect(SITE_SUPPLY_PARTS).toEqual(['bench', 'worth', 'saw', 'room']);
    expect([MADE_FOR_SITE, SAW_TO_YARD]).toEqual([18, 34]);
    for (const arm of ['rich-no-site-supply', 'rich-no-site-supply-bench', 'rich-no-site-supply-worth', 'rich-no-site-supply-saw', 'rich-no-site-supply-room']) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('bench: three wood lying at the yard are remembered as one by the glance, and counted as three by somebody about to saw', () => {
    const saw = (f: ReturnType<typeof fixture>) => byKey(f.w, f.p, (o) => o.key === `operate:${f.yard.id}:saw_planks`);
    const bring = (f: ReturnType<typeof fixture>) => options(f.w, f.p).options.filter((o) => /sawn planks/.test(o.label) && o.kind === 'gather');
    const now = fixture(229, { rackSaw: true, yardStock: { wood: 3 }, granary: true });
    const belief = now.p.beliefs[now.yard.id];
    expect(belief.items?.wood).toBe(1); // rules 169: the glance
    expect(belief.ops?.inputs.wood).toBe(3); // the workshop's own record, taken at the same sight
    expect(saw(now)?.label).toBe('Sawing planks');
    expect(bring(now)).toEqual([]);
    const old = fixture(228, { rackSaw: true, yardStock: { wood: 3 }, granary: true });
    expect(saw(old)).toBeUndefined(); // two short, as she takes it
    expect(bring(old).length).toBeGreaterThan(0); // so she goes for more wood, whatever lies there
    setSiteSupply(false, 'bench');
    expect(saw(now)).toBeUndefined();
    expect(bring(now).length).toBeGreaterThan(0);
    setSiteSupply(true);
    // one wood really there: two short at either version
    expect(saw(fixture(229, { rackSaw: true, yardStock: { wood: 1 }, granary: true }))).toBeUndefined();
  });

  it('bench: four planks waiting at the yard are collected as many as the pack takes, not one a trip', () => {
    const collect = (f: ReturnType<typeof fixture>) => byKey(f.w, f.p, (o) => o.key === `collect:${f.yard.id}:planks`)?.label;
    const now = fixture(229, { yardStock: { planks: 4 }, granary: true });
    expect(now.p.beliefs[now.yard.id].items?.planks).toBe(1);
    expect(now.p.beliefs[now.yard.id].ops?.output.planks).toBe(4);
    expect(collect(now)).toBe('Collect 4 planks from the timber yard');
    expect(collect(fixture(228, { yardStock: { planks: 4 }, granary: true }))).toBe('Collect 1 planks from the timber yard');
    setSiteSupply(false, 'bench');
    expect(collect(now)).toBe('Collect 1 planks from the timber yard');
  });

  it('worth: the bricks a known site waits for are wanted at 18 more than at rules 228, and the first step toward them with it', () => {
    const old = fixture(228), now = fixture(229);
    const before = bricksWant(old.w, old.p), after = bricksWant(now.w, now.p);
    expect(before).toBeGreaterThan(20);
    expect(after - before).toBeCloseTo(MADE_FOR_SITE, 6);
    const dig = (f: ReturnType<typeof fixture>) => byKey(f.w, f.p, (o) => o.key === `gather:${f.pit.id}`);
    expect(dig(old)?.label).toMatch(/clay/i);
    expect(dig(now)!.util - dig(old)!.util).toBeGreaterThan(12);
    setSiteSupply(false, 'worth');
    expect(bricksWant(now.w, now.p)).toBeCloseTo(before, 6);
    expect(dig(now)!.util).toBeCloseTo(dig(old)!.util, 6);
  });

  it('rules 230: the worth is half, 9 where rules 229 has 18; the lab arm holds it at 18', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(230);
    expect([MADE_FOR_SITE, MADE_FOR_SITE_HALVED]).toEqual([18, 9]);
    const old = fixture(228), was = fixture(229), now = fixture(230);
    const before = bricksWant(old.w, old.p);
    expect(bricksWant(was.w, was.p) - before).toBeCloseTo(18, 6);
    expect(bricksWant(now.w, now.p) - before).toBeCloseTo(9, 6);
    const undo = parseIntervention('rich-site-supply-worth-full').install!();
    expect(bricksWant(now.w, now.p) - before).toBeCloseTo(18, 6);
    undo();
    expect(bricksWant(now.w, now.p) - before).toBeCloseTo(9, 6);
    setSiteSupply(false, 'worth');
    expect(bricksWant(now.w, now.p)).toBeCloseTo(before, 6);
  });

  it('worth: the wood and stone a site waits for are wanted exactly as before', () => {
    const old = fixture(228, { delivered: {} }), now = fixture(229, { delivered: {} });
    const raw = (f: ReturnType<typeof fixture>, id: number) => byKey(f.w, f.p, (o) => o.key === `gather:${id}`)?.util;
    expect(raw(old, old.tree.id)).toBeGreaterThan(0);
    expect(raw(now, now.tree.id)).toBeCloseTo(raw(old, old.tree.id)!, 6);
    expect(raw(now, now.rock.id)).toBeCloseTo(raw(old, old.rock.id)!, 6);
  });

  it('saw: somebody carrying a saw is offered to leave it at a yard with none on its rack; not at rules 228, with the part off, or when one lies there', () => {
    const key = (f: ReturnType<typeof fixture>) => `saw_to_yard:${f.yard.id}`;
    const offered = (f: ReturnType<typeof fixture>) => !!byKey(f.w, f.p, (o) => o.key === key(f));
    const now = fixture(229, { saw: true });
    expect(offered(now)).toBe(true);
    expect(byKey(now.w, now.p, (o) => o.key === key(now))!.label).toBe('Leave the saw at the timber yard');
    expect(offered(fixture(228, { saw: true }))).toBe(false);
    expect(offered(fixture(229))).toBe(false); // no saw to leave
    expect(offered(fixture(229, { saw: true, rackSaw: true }))).toBe(false);
    setSiteSupply(false, 'saw');
    expect(offered(now)).toBe(false);
  });

  it('saw: left at the yard it is the settlement\'s, and she saws there with it without carrying it', () => {
    const f = fixture(229, { saw: true, yardStock: { wood: 3 } });
    finishPrerequisite(f.w, f.p, `saw_to_yard:${f.yard.id}`);
    expect(f.p.inv.saw ?? 0).toBe(0);
    expect(f.yard.store.items.saw).toBe(1);
    const saw = toolsHeldBy(f.w, f.yard.id, 'saw')[0];
    expect(saw.ownerHh).toBe(0);
    expect(byKey(f.w, f.p, (o) => o.key === `saw_to_yard:${f.yard.id}`)).toBeUndefined(); // nothing left to leave
    // the bench (staged: the batch is started and worked directly; the yard holds the three wood)
    expect(startJob(f.w, f.yard, f.p, RECIPE_BY_ID.saw_planks, f.p.id, 'staged')).toBeNull();
    let res = 'continue';
    for (let n = 0; n < 400 && res === 'continue'; n++) res = workJob(f.w, f.yard, f.p);
    expect(res).toBe('worked');
    expect(f.yard.store.items.planks).toBe(2);
    expect(f.p.inv.saw ?? 0).toBe(0);
    expect(f.yard.store.items.saw).toBe(1);
    expect(conservationReport(f.w).ok).toBe(true);
  });

  it('room: with no room for one clay, a left-over of stone may be left first; at rules 228 and with the part off it is only refused', () => {
    const full = (version: number) => {
      const f = fixture(version, { inv: { stone: 3 } });
      // fill the pack to the brim with stone nothing of hers needs (staged)
      while (carryCap(f.w, f.p) - weightOf(f.p.inv) >= 3) f.p.inv.stone = (f.p.inv.stone ?? 0) + 1;
      return f;
    };
    const leave = (f: ReturnType<typeof fixture>) => byKey(f.w, f.p, (o) => !!o.key?.startsWith('leave:'));
    const refused = (f: ReturnType<typeof fixture>) => options(f.w, f.p).blocked.some((o) => o.blocked === 'no room in my pack for one clay');
    const now = full(229), old = full(228);
    expect(carryCap(now.w, now.p) - weightOf(now.p.inv)).toBeLessThan(3);
    expect(refused(old)).toBe(true);
    expect(leave(old)).toBeUndefined();
    expect(refused(now)).toBe(true);
    expect(leave(now)?.label).toMatch(/^Leave the stone at /);
    setSiteSupply(false, 'room');
    expect(leave(now)).toBeUndefined();
  });

  it('nothing is saved: a world saved and loaded continues the same', () => {
    const f = fixture(229, { saw: true });
    f.p.cooldowns.pause = 0;
    run(f.w, 300);
    const copy = deserializeWorld(serializeWorld(f.w));
    run(f.w, 300);
    run(copy, 300);
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
  });
});
