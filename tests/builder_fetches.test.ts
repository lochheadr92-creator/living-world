// Rules 232: a builder who runs out goes for materials (src/sim/builder_fetches.ts; read in act_build.ts and options_work.ts
// materialNeeds). The situations are STAGED: one grown woman and her household's hut site with half its wood and none of its
// stone delivered, a tree and a rock she knows. She is set to building; the site lets her work as far as what is there allows.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { BUILDER_FETCHES_PARTS, RAN_OUT_MEMORY, RAN_OUT_WORTH, WAIT_FOR_MATERIALS, WAIT_FOR_MATERIALS_BEFORE, ranOutWorth, setBuilderFetches } from '../src/sim/builder_fetches';
import { generateOptions } from '../src/sim/decision';
import { conservationReport, ledgerCreate } from '../src/sim/economy';
import { observe } from '../src/sim/knowledge';
import { wantedTool } from '../src/sim/options_work';
import { perceive } from '../src/sim/perception';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import { addPerson, building, done, give, pin, site, stage } from './helpers/kit';
import { finishPrerequisite } from './helpers/tool_prerequisite';
import { run } from './helpers/util';

afterEach(() => setBuilderFetches(true));

/** A grown woman, her lean-to, and her household's hut site with four of its eight wood and no stone (staged). */
function fixture(version: number) {
  const s = stage('builder-fetches'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1, generosity: 0.5, sociability: 0.5 }, inv: { bread: 1 } });
  const home = building(s, 'lean_to', 36, 36, p.hhId, { grain: 8 });
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const hut = site(s, 'hut', 44, 40, p.hhId, p.id, { wood: 4 });
  const tree = makeSource(w, 'tree', 38, 46, 8), rock = makeSource(w, 'rock', 34, 44, 8);
  done(s);
  const all = [home, hut, tree, rock];
  // her hand-tool wants are met, so nothing else of hers asks for wood or stone (staged; entered in the ledger)
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
  return { s, w, p, home, hut, tree, rock };
}
type F = ReturnType<typeof fixture>;
/** Set her to building and let the spell run to its own end; returns the finished activity. */
const buildUntilItStops = (f: F) => finishPrerequisite(f.w, f.p, `build:${f.hut.id}`);
const util = (f: F, key: string): number => generateOptions(f.w, f.p, true, true).options.find((o) => o.key === key)?.util ?? 0;

describe('rules 232: a builder who runs out goes for materials', () => {
  it('is a supported version at or below the current one, with its two parts and its numbers', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(232);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(232);
    expect(BUILDER_FETCHES_PARTS).toEqual(['leave', 'fetch']);
    expect([WAIT_FOR_MATERIALS, WAIT_FOR_MATERIALS_BEFORE, RAN_OUT_MEMORY, RAN_OUT_WORTH]).toEqual([10, 80, 600, 10]);
    for (const arm of ['rich-no-builder-fetches', 'rich-no-builder-fetches-leave', 'rich-no-builder-fetches-fetch']) expect(parseIntervention(arm).spec).toBe(arm);
  });

  it('leave: with nothing left to build with she stands 10 ticks and stops; at rules 231 and with the part off, 80', () => {
    const waited = (f: F): number => {
      const act = buildUntilItStops(f);
      expect(f.p.lastResult?.outcome).toBe('partial');
      expect(f.p.lastResult?.detail).toMatch(/^no materials to work with \(/);
      expect(act.cycle).toBeGreaterThan(0); // she built as far as the wood there allowed first
      return Number(act.data.waited);
    };
    expect(waited(fixture(232))).toBe(WAIT_FOR_MATERIALS + 1);
    expect(waited(fixture(231))).toBe(WAIT_FOR_MATERIALS_BEFORE + 1);
    setBuilderFetches(false, 'leave');
    expect(waited(fixture(232))).toBe(WAIT_FOR_MATERIALS_BEFORE + 1);
  });

  it('leave: she goes knowing what the site lacks, and is not offered to build there again until it has it', () => {
    const f = fixture(232);
    buildUntilItStops(f);
    const belief = f.p.beliefs[f.hut.id];
    expect(belief.need?.stone).toBe(4);
    expect(belief.need?.wood).toBe(4);
    const ctx = generateOptions(f.w, f.p, true, true);
    expect(ctx.options.some((o) => o.key === `build:${f.hut.id}`)).toBe(false);
    expect(ctx.blocked.some((o) => o.targetId === f.hut.id && /waiting for materials/.test(o.blocked ?? ''))).toBe(true);
  });

  it('fetch: for 600 ticks the wood and stone that site lacks count for 10 more to her; not at rules 231, with the part off, or afterwards', () => {
    const now = fixture(232), old = fixture(231);
    buildUntilItStops(now);
    buildUntilItStops(old);
    expect(now.p.cooldowns.ranoutSite).toBe(now.hut.id);
    expect(now.p.cooldowns.ranoutUntil).toBeGreaterThan(now.w.tick);
    expect(old.p.cooldowns.ranoutSite).toBeUndefined();
    expect(ranOutWorth(now.w, now.p, now.hut.id)).toBe(RAN_OUT_WORTH);
    expect(ranOutWorth(now.w, now.p, now.hut.id + 1)).toBe(0); // only the site she stopped at
    const withIt = { tree: util(now, `gather:${now.tree.id}`), rock: util(now, `gather:${now.rock.id}`) };
    expect(withIt.tree).toBeGreaterThan(0);
    setBuilderFetches(false, 'fetch');
    const without = { tree: util(now, `gather:${now.tree.id}`), rock: util(now, `gather:${now.rock.id}`) };
    setBuilderFetches(true);
    expect(withIt.tree - without.tree).toBeGreaterThan(8);
    expect(withIt.rock - without.rock).toBeGreaterThan(8);
    // the memory lapses 600 ticks after she stopped (staged: the note's end is brought to now, so the hour of day stays the same)
    expect(now.p.cooldowns.ranoutUntil - now.w.tick).toBeLessThanOrEqual(RAN_OUT_MEMORY);
    now.p.cooldowns.ranoutUntil = now.w.tick;
    expect(ranOutWorth(now.w, now.p, now.hut.id)).toBe(0);
    expect(util(now, `gather:${now.tree.id}`)).toBeCloseTo(without.tree, 6);
  });

  it('the accounts balance, and a world saved and loaded continues the same', () => {
    const f = fixture(232);
    buildUntilItStops(f);
    expect(conservationReport(f.w).ok).toBe(true);
    f.p.cooldowns.pause = 0;
    run(f.w, 200);
    const copy = deserializeWorld(serializeWorld(f.w));
    run(f.w, 300);
    run(copy, 300);
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
  });
});
