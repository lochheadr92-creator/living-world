import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { destroyBuilding, makeHousePile } from '../src/sim/buildings';
import { DAY, PROJECT_PATIENCE, SITE_PATIENCE, TOOL_REPAIR } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { addItem, conservationReport, totalItems } from '../src/sim/economy';
import { joinBlocker, startJob } from '../src/sim/facilities';
import { observe } from '../src/sim/knowledge';
import { killPerson } from '../src/sim/lifecycle';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { makeSource } from '../src/sim/sources';
import { pickNews, tellBelief } from '../src/sim/social';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import { mintTool } from '../src/sim/tools';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, give, pin, site, stage } from './helpers/kit';
import { run } from './helpers/util';

describe('mending tools', () => {
  function mender(wear: number, inv: Record<string, number>) {
    const s = stage('mend-' + wear + Object.keys(inv).join(''));
    const p = addPerson(s, 'Mira', 44, 26, { inv });
    const t = give(s.w, p, 'axe');
    t.wear = wear;
    s.w.camp = { x: 44.5, y: 26.5 };
    const w = done(s);
    return { w, p, t };
  }
  function mend(w: ReturnType<typeof mender>['w'], p: ReturnType<typeof mender>['p'], toolId: number): void {
    const act = newActivity(w, p, { kind: 'tool_work', label: 'Mending', goal: 'test', here: true, utility: 100, minCommit: 4000, maxTicks: 600, data: { toolId } });
    startActivity(w, p, act);
    for (let i = 0; i < 300 && p.activity === act; i++) run(w, 1);
  }

  it('a fitted handle restores more than a stick of wood, and either uses up what it says it uses', () => {
    const a = mender(70, { handles: 1, wood: 1 });
    mend(a.w, a.p, a.t.id);
    expect(a.t.wear).toBeCloseTo(70 - TOOL_REPAIR.handles.restore, 5);
    expect(a.p.inv.handles ?? 0).toBe(0);
    expect(a.w.ledger.reasons['-repairs: mending equipment']).toBe(1);
    const b = mender(70, { wood: 1 });
    mend(b.w, b.p, b.t.id);
    expect(b.t.wear).toBeCloseTo(70 - TOOL_REPAIR.wood.restore, 5);
    expect(conservationReport(a.w).ok && conservationReport(b.w).ok).toBe(true);
  });

  it('with nothing to mend it with the job fails honestly and the tool is unchanged', () => {
    const { w, p, t } = mender(70, {});
    mend(w, p, t.id);
    expect(t.wear).toBe(70);
    expect(p.lastResult?.outcome).toBe('failed');
    expect(p.lastResult?.detail).toMatch(/nothing to mend/);
  });

  it('a worn tool prompts a mend when the material is to hand, and a want for wood when it is not', () => {
    const { w, p } = mender(75, { handles: 1 });
    const ctx = generateOptions(w, p, true);
    expect(ctx.options.some((o) => o.kind === 'tool_work')).toBe(true);
    const bare = mender(75, {});
    const ctx2 = generateOptions(bare.w, bare.p, true);
    expect(ctx2.options.some((o) => o.kind === 'tool_work')).toBe(false);
  });
});

describe('how many hands can work at once', () => {
  it('a workshop takes only as many workers on one batch as its recipe allows; the next one is told so', () => {
    const s = stage('capacity');
    const ps = ['A', 'B', 'C'].map((n, i) => addPerson(s, n, 44 + i, 26));
    const b = building(s, 'timber_yard', 50, 28, 0, { wood: 3 });
    for (const p of ps) give(s.w, p, 'saw');
    const w = done(s);
    startJob(w, b, ps[0], RECIPE_BY_ID.saw_planks, ps[0].id, 'test');
    b.ops!.present[ps[0].id] = w.tick;
    b.ops!.present[ps[1].id] = w.tick;
    expect(joinBlocker(w, b, ps[2])).toMatch(/as many people as can work/);
    expect(joinBlocker(w, b, ps[1])).toBe('');
  });
});

describe('news of what is out there travels by word of mouth, with its source and its age', () => {
  it('a deposit seen by one person reaches another through talk, and a third through that other, with the original observer and time intact', () => {
    const s = stage('discovery');
    const a = addPerson(s, 'Ana', 44, 26);
    const b = addPerson(s, 'Ben', 46, 26, { sex: 'm' });
    const c = addPerson(s, 'Cal', 48, 26, { sex: 'm' });
    const clay = makeSource(s.w, 'clay_pit', 70, 60, 40);
    const w = done(s);
    expect(a.beliefs[clay.id]).toBeUndefined();
    observe(w, a, clay); // Ana walks past it
    const seenAt = a.beliefs[clay.id].seen;
    w.tick += 3000; // the news is old by the time it is told
    expect(pickNews(w, a, b, 3).some((x) => x.id === clay.id)).toBe(true);
    expect(tellBelief(w, a, b, a.beliefs[clay.id])).toBe(true);
    expect(b.beliefs[clay.id].src).toBe('told');
    expect(b.beliefs[clay.id].from).toBe(a.id);
    expect(b.beliefs[clay.id].origin).toBe(a.id);
    expect(b.beliefs[clay.id].seen).toBe(seenAt); // the age of the sighting is not reset by the telling
    w.tick += 500;
    tellBelief(w, b, c, b.beliefs[clay.id]);
    expect(c.beliefs[clay.id].from).toBe(b.id);
    expect(c.beliefs[clay.id].origin).toBe(a.id); // still credited to the one who saw it
    expect(c.beliefs[clay.id].hops).toBe(2);
    expect(c.beliefs[clay.id].seen).toBe(seenAt);
    // someone who was never told knows nothing
    const d = addPerson(s, 'Dee', 50, 26);
    void d;
    expect(d.beliefs[clay.id]).toBeUndefined();
  });

  it('a workshop site going up is news for everyone, a household’s private rebuild is not', () => {
    const s = stage('site-news');
    const a = addPerson(s, 'Ana', 44, 26); // a household that is not the one rebuilding
    const b = addPerson(s, 'Ben', 46, 26, { sex: 'm' });
    const owner = addPerson(s, 'Ola', 50, 26);
    const kiln = site(s, 'kiln', 52, 30, owner.hhId, owner.id);
    const hut = building(s, 'hut', 40, 30, owner.hhId);
    const up = site(s, 'house', hut.x, hut.y, owner.hhId, owner.id);
    const w = done(s);
    a.beliefs = {};
    a.bykind = {};
    for (const e of [kiln, up]) observe(w, a, e);
    w.tick += 800;
    const told = pickNews(w, a, b, 6).map((x) => x.id);
    expect(told).toContain(kiln.id);
    expect(told).not.toContain(up.id);
  });
});

describe('what is left behind is found and used by ordinary means', () => {
  it('a person who dies leaves belongings, tools and all, in a heap where they fell; the tool records and the counts stay in step; a passer-by with a use for them picks them up', () => {
    const s = stage('salvage-tools');
    const dead = addPerson(s, 'Dora', 44, 26, { inv: { fruit: 2, planks: 3 } });
    const finder = addPerson(s, 'Finn', 47, 26, { sex: 'm', inv: { fruit: 3 }, traits: { diligence: 0.9 } });
    give(s.w, dead, 'hammer');
    s.w.camp = { x: 45.5, y: 26.5 };
    const w = done(s);
    killPerson(w, dead, 'test');
    const pile = w.piles.find((p) => (p.items.hammer ?? 0) === 1);
    expect(pile, 'the hammer is in the heap').toBeTruthy();
    expect(pile!.items.planks).toBe(3);
    expect(toolReport(w).ok).toBe(true);
    const rec = w.tools.find((t) => t.kind === 'hammer')!;
    expect(rec.holder).toBe(pile!.id);
    observe(w, finder, pile!);
    const ctx = generateOptions(w, finder, true);
    const salvage = ctx.options.find((o) => o.kind === 'withdraw' && o.tag === 'salvage');
    expect(salvage, 'collecting what was left behind is an ordinary option').toBeTruthy();
    startActivity(w, finder, salvage!.make!()!);
    for (let i = 0; i < 500 && finder.activity; i++) run(w, 1);
    expect(finder.inv.hammer).toBe(1);
    expect(rec.holder).toBe(finder.id);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a workshop that falls down leaves its stock and its rack in a heap, and nothing is lost', () => {
    const s = stage('collapse-rack');
    const b = building(s, 'smithy', 50, 28, 0, { iron: 2, charcoal: 3 });
    const t = mintTool(s.w, 'hammer', 0, 0, b.id, b.store.items, 0, 'test', false);
    const w = done(s);
    const before = totalItems(w);
    destroyBuilding(w, b, 'collapsed from neglect');
    const after = totalItems(w);
    for (const k of ['iron', 'charcoal', 'hammer'] as const) expect(after[k] ?? 0).toBe(before[k] ?? 0);
    const pile = w.piles.find((p) => (p.items.hammer ?? 0) === 1)!;
    expect(t.holder).toBe(pile.id);
    expect(toolReport(w).ok).toBe(true);
  });

  it('materials delivered to a site that is given up are left in a heap and picked up by the next person who needs them', () => {
    const s = stage('abandon');
    const p = addPerson(s, 'Mira', 44, 26, { inv: { fruit: 4 } });
    const st = site(s, 'hut', 48, 28, p.hhId, p.id, { wood: 4, stone: 2 });
    s.w.camp = { x: 44.5, y: 26.5 };
    const w = done(s);
    pin(p); // nobody is tending it
    st.lastWorkTick = -SITE_PATIENCE - 10;
    st.createdTick = -SITE_PATIENCE - 10;
    w.tick = 301 + 150; // the slow process that clears stale sites runs on this tick
    while (w.tick % 300 !== 151) w.tick++;
    stepWorld(w);
    expect(w.sites).toHaveLength(0);
    expect(w.piles.some((pl) => (pl.items.wood ?? 0) === 4 && (pl.items.stone ?? 0) === 2)).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('improvement projects are given longer to wait for their materials than a hut is', () => {
    expect(PROJECT_PATIENCE).toBeGreaterThan(SITE_PATIENCE);
    expect(PROJECT_PATIENCE).toBeGreaterThanOrEqual(DAY * 6);
  });

  it('food left in the open spoils, and the loss is recorded rather than silent', () => {
    const s = stage('pile-spoil');
    const mira = addPerson(s, 'Mira', 44, 26);
    makeHousePile(s.w, 50, 30, { bread: 30, grain: 30 }, 'left out');
    const w = done(s);
    pin(mira);
    const before = totalItems(w);
    for (let i = 0; i < DAY * 4; i++) stepWorld(w);
    const after = totalItems(w);
    expect((after.bread ?? 0) + (after.grain ?? 0)).toBeLessThan((before.bread ?? 0) + (before.grain ?? 0));
    expect(Object.keys(w.ledger.spoiled).length).toBeGreaterThan(0);
    expect(conservationReport(w).ok).toBe(true);
    void toolsHeldBy;
    void addItem;
    void makeSource;
  });
});
