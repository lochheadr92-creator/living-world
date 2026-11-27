// Rules 282 (src/sim/review_repairs.ts): the five simulation repairs of the review of 28 November 2026. STAGED: each checks the rule at 282 and the old
// behaviour at 281; none says how often the defect happened in ordinary worlds.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { bedtimeFilter } from '../src/sim/bedtime';
import { DAY, JAR_WATER_UNITS } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { roomFor, weightOf } from '../src/sim/economy';
import { dayFraction, lightAt } from '../src/sim/environment';
import type { Option } from '../src/sim/optutil';
import { findPath, lastSearchOutOfBudget } from '../src/sim/pathfinding';
import { isWalkable } from '../src/sim/registry';
import { REVIEW_PARTS, setReviewRepairs } from '../src/sim/review_repairs';
import { toolsOnDeath } from '../src/sim/tools';
import type { Commitment, Items } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, give, pin, stage } from './helpers/kit';

afterEach(() => setReviewRepairs(true));
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);

function scene(version: number, tag: string, frac = 0.85) {
  const s = stage(`review-${version}-${tag}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = at(frac);
  w.light = lightAt(dayFraction(w.tick));
  const mira = addPerson(s, 'Mira', 40, 36, { age: 28, sex: 'f', hunger: 95, thirst: 95, energy: 90 });
  const cora = addPerson(s, 'Cora', 41, 37, { age: 5, sex: 'f', hunger: 95, thirst: 95, energy: 90, hh: mira.hhId });
  const finn = addPerson(s, 'Finn', 20, 20, { age: 40, sex: 'm', hunger: 95, thirst: 95, energy: 90, hh: mira.hhId });
  const dov = addPerson(s, 'Dov', 46, 34, { age: 30, sex: 'm', hunger: 95, thirst: 95, energy: 90 });
  done(s);
  return { s, w, mira, cora, finn, dov };
}
const chatWith = (targetId: number, purpose: string): Option => ({ kind: 'socialize', label: 'Talk', goal: 'company', need: 'social', util: 30, parts: [], eta: 5, key: `socialize:${targetId}:${purpose}`, targetId, make: () => null });

describe('review repairs (rules 282)', () => {
  it('chat: after dark a chat offered to a little one as socialize is dropped at 282, an urgent one kept; at 281 both pass', () => {
    const now = scene(282, 'c2');
    const kept = bedtimeFilter(generateOptions(now.w, now.mira), [chatWith(now.cora.id, 'chat'), chatWith(now.cora.id, 'family_time'), chatWith(now.cora.id, 'warn'), chatWith(now.dov.id, 'chat')]);
    expect(kept.map((o) => o.key)).toEqual([`socialize:${now.cora.id}:warn`, `socialize:${now.dov.id}:chat`]);
    const old = scene(281, 'c1');
    expect(bedtimeFilter(generateOptions(old.w, old.mira), [chatWith(old.cora.id, 'chat')]).length).toBe(1);
  });

  it("jar: a full pack with an empty jar has room for the jar's free water at 282, none at 281", () => {
    const items: Items = { jar: 1, wood: 2 };
    const cap = weightOf(items);
    expect(roomFor(items, cap, 'water', scene(282, 'j2').w)).toBe(JAR_WATER_UNITS);
    expect(roomFor(items, cap, 'water', scene(281, 'j1').w)).toBe(0);
    expect(roomFor({ ...items, water: JAR_WATER_UNITS }, cap, 'water', scene(282, 'j3').w)).toBe(0);
  });

  it('loan: when the lender dies the return promise passes to the heir with the loan at 282; at 281 it still names the dead', () => {
    const run = (version: number) => {
      const sc = scene(version, `l${version}`);
      const t = give(sc.w, sc.mira, 'hammer');
      t.ownerHh = sc.mira.hhId; t.holder = sc.dov.id; t.loan = { lender: sc.mira.id, borrower: sc.dov.id, due: sc.w.tick + DAY };
      const c = { id: 9001, requestId: 0, kind: 'return_tool', to: sc.mira.id, toolId: t.id, destKind: 'person', destId: sc.mira.id, item: 'hammer', amount: 1, deadline: sc.w.tick + DAY, status: 'active' } as unknown as Commitment;
      sc.dov.commitments.push(c);
      sc.mira.alive = false;
      toolsOnDeath(sc.w, sc.mira);
      return { lender: t.loan?.lender, to: c.to, heir: sc.finn.id, dead: sc.mira.id };
    };
    const now = run(282), old = run(281);
    expect(now.lender).toBe(now.heir);
    expect(now.to).toBe(now.heir);
    expect(old.lender).toBe(old.heir);
    expect(old.to).toBe(old.dead);
  });

  it.each([[282, false], [281, true]])('route: at rules %i a walker steps onto a tile that became solid on the planned route: %s', (version, expected) => {
    const sc = scene(version, `r${version}`, 0.45);
    pin(sc.mira); pin(sc.cora); pin(sc.finn);
    startActivity(sc.w, sc.dov, newActivity(sc.w, sc.dov, { kind: 'wander', label: 'Walking', goal: 'to walk', spotX: 46.5, spotY: 44.5, tx: 46.5, ty: 44.5, maxTicks: 900, minCommit: 900 }));
    stepWorld(sc.w);
    const a = sc.dov.activity!;
    expect(a.path.length).toBeGreaterThan(1);
    // make a tile on the way to the next waypoint solid, as a site laid out after the route was planned would
    const wx = a.path[a.pi], wy = a.path[a.pi + 1], f = 3 / Math.max(3.5, Math.hypot(wx - sc.dov.x, wy - sc.dov.y));
    const bx = Math.floor(sc.dov.x + (wx - sc.dov.x) * f), by = Math.floor(sc.dov.y + (wy - sc.dov.y) * f);
    sc.w.solid[by * sc.w.W + bx] = 1;
    expect(isWalkable(sc.w, bx, by)).toBe(false);
    let entered = false;
    for (let n = 0; n < 200 && sc.dov.activity; n++) { stepWorld(sc.w); if (Math.floor(sc.dov.x) === bx && Math.floor(sc.dov.y) === by) entered = true; }
    expect(entered).toBe(expected);
  });

  it('wolf: a search that runs out of budget says so, a search with no route does not', () => {
    const { w } = scene(282, 'w2', 0.45);
    expect(findPath(w, 40.5, 30.5, 40.5, 50.5, { maxNodes: 5 })).toBeNull();
    expect(lastSearchOutOfBudget()).toBe(true);
    expect(findPath(w, 40.5, 30.5, 41.5, 30.5, { maxNodes: 50 })).not.toBeNull();
    expect(lastSearchOutOfBudget()).toBe(false);
  });

  it('the lab arms remove all five parts or one', () => {
    for (const arm of ['rich-no-review-repairs', ...REVIEW_PARTS.map((p) => `rich-no-review-repairs-${p}`)]) {
      const iv = parseIntervention(arm);
      expect(iv.spec).toBe(arm);
      iv.install!()();
    }
  });
});
