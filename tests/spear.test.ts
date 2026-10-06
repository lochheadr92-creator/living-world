import { describe, expect, it } from 'vitest';
import { startActivity } from '../src/sim/activities';
import { DAY, SPEAR_USE_TICKS, TOOL_DEFS, WEIGHT } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { observe } from '../src/sim/knowledge';
import { toolUrgency, wantedTool } from '../src/sim/options_work';
import { makeCtx } from '../src/sim/optutil';
import { makeSource } from '../src/sim/sources';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import type { Animal, Person, World } from '../src/sim/types';
import { makeWolf, noteScare, safeFromWolf, spearOf, wolfScare } from '../src/sim/wildlife';
import { addPerson, building, done, give, pin, stage } from './helpers/kit';
import { run } from './helpers/util';

/** a wolf that has picked this person out and is coming for them from the east */
function stalking(w: World, p: Person, dist = 8): Animal {
  const wolf = makeWolf(w, p.x + dist, p.y);
  wolf.state = 'stalk';
  wolf.targetId = p.id;
  wolf.until = w.tick + 520;
  return wolf;
}

describe('adding the spear', () => {
  it('is a tool like the others: made by hand from wood alone, weighed, worn, and with no iron version', () => {
    expect(TOOL_DEFS.spear.hand).toEqual({ cost: { wood: 3 }, work: 90 });
    expect(WEIGHT.spear).toBeGreaterThan(WEIGHT.hammer); // it is a burden to carry
    expect(SPEAR_USE_TICKS * TOOL_DEFS.spear.wear).toBeGreaterThan(2); // and a few turned-away wolves wear it out
    expect(SPEAR_USE_TICKS * TOOL_DEFS.spear.wear).toBeLessThan(10);
  });
});

describe('who counts as armed', () => {
  it('a grown person who is awake and carries a sound spear; not a child, not someone asleep, not someone without one', () => {
    const s = stage('spear-armed');
    const grown = addPerson(s, 'Tomas', 44, 44);
    const kid = addPerson(s, 'Kit', 46, 44, { age: 8 });
    const sleeper = addPerson(s, 'Ola', 48, 44);
    const bare = addPerson(s, 'Bare', 50, 44);
    for (const p of [grown, kid, sleeper]) give(s.w, p, 'spear');
    const w = done(s);
    expect(spearOf(w, grown)).not.toBeNull();
    expect(spearOf(w, kid)).toBeNull();
    sleeper.pose = 'sleep';
    expect(spearOf(w, sleeper)).toBeNull(); // asleep, a spear is no help: the old reckoning applies
    expect(spearOf(w, bare)).toBeNull();
  });

  it('a person with a spear is worth two to a wolf: one companion is enough to be safe, where two would be needed without it', () => {
    const s = stage('spear-two');
    const a = addPerson(s, 'Tomas', 44, 44);
    const b = addPerson(s, 'Hana', 46, 44);
    const w = done(s);
    expect(safeFromWolf(w, a)).toBe(false);
    expect(safeFromWolf(w, a, true)).toBe(false); // nobody has a spear yet
    give(w, a, 'spear');
    expect(safeFromWolf(w, a)).toBe(false); // the old rule is untouched
    expect(safeFromWolf(w, a, true)).toBe(true); // armed, and company
    expect(safeFromWolf(w, b, true)).toBe(true); // and so is the one standing beside them
  });
});

describe('a wolf and a spear', () => {
  it('turns away from a lone grown person who carries a spear, and bites the same person without one', () => {
    const outcome = (armed: boolean) => {
      const s = stage('spear-lone-' + armed);
      const p = addPerson(s, 'Tomas', 44, 44);
      pin(p);
      if (armed) give(s.w, p, 'spear');
      const w = done(s);
      const wolf = stalking(w, p);
      run(w, 260);
      return { w, p, wolf };
    };
    const without = outcome(false);
    expect(without.p.health).toBeLessThan(100); // bitten
    const withIt = outcome(true);
    expect(withIt.p.health).toBe(100);
    expect(withIt.wolf.state).toBe('retreat');
    expect(withIt.w.events.some((e) => /turned a wolf away with a spear/.test(e.text))).toBe(true);
    expect(toolsHeldBy(withIt.w, withIt.p.id, 'spear')[0].wear).toBeGreaterThan(0); // and the spear was used
    expect(conservationReport(withIt.w).ok).toBe(true);
    expect(toolReport(withIt.w).ok).toBe(true);
  });

  it('wears the spear a little each time, and a spear turned against enough wolves breaks, entered in the books', () => {
    const s = stage('spear-wear');
    const p = addPerson(s, 'Tomas', 44, 44);
    pin(p);
    give(s.w, p, 'spear');
    const w = done(s);
    const wolf = stalking(w, p);
    let uses = 0;
    for (let i = 0; i < 40 && (p.inv.spear ?? 0) > 0; i++) {
      wolf.state = 'stalk';
      wolf.x = p.x + 8;
      wolf.y = p.y;
      wolf.targetId = p.id;
      wolf.until = w.tick + 520;
      wolf.cooldown = 0;
      wolf.path = [];
      wolf.pi = 0;
      run(w, 70);
      uses++;
    }
    expect(p.inv.spear ?? 0).toBe(0); // it wore out
    expect(uses).toBeGreaterThan(5);
    expect(uses).toBeLessThan(40);
    expect(w.ledger.reasons['-tool worn out']).toBe(1);
    expect(p.health).toBe(100); // never bitten while it lasted (the wolf that finally finds nothing in her hand is another matter)
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });
});

describe('standing one’s ground', () => {
  it('a person with a spear and one companion beside them does not run from a wolf in sight; without the spear they do', () => {
    const flees = (armed: boolean) => {
      const s = stage('spear-flee-' + armed);
      const p = addPerson(s, 'Tomas', 44, 44);
      const q = addPerson(s, 'Hana', 46, 44);
      pin(q);
      if (armed) give(s.w, p, 'spear');
      const w = done(s);
      const wolf = makeWolf(w, 50, 44);
      wolf.state = 'roam';
      run(w, 6); // they look round and see it
      return generateOptions(w, p).options.some((o) => o.kind === 'flee');
    };
    expect(flees(false)).toBe(true);
    expect(flees(true)).toBe(false);
  });
});

describe('wanting a spear', () => {
  const wants = (scare: number, o: { age?: number; has?: boolean; later?: number } = {}) => {
    const s = stage('spear-want');
    const p = addPerson(s, 'Tomas', 44, 44, { age: o.age ?? 28 });
    for (let i = 0; i < 4; i++) makeSource(s.w, 'tree', 47 + i, 50, 6);
    if (o.has) give(s.w, p, 'spear');
    const w = done(s);
    for (const e of w.sources) observe(w, p, e);
    w.tick = DAY * 3;
    if (scare > 0) noteScare(w, p, scare);
    w.tick += o.later ?? 0;
    return wantedTool(makeCtx(w, p, false)) === 'spear';
  };

  it('is wanted by a grown person who has had to run from wolves more than once lately, or has been bitten', () => {
    expect(wants(0)).toBe(false);
    expect(wants(1)).toBe(false); // once is not a habit
    expect(wants(2)).toBe(true); // twice, or bitten (a bite counts double)
  });

  it('is forgotten as the scares fade, and not wanted by a child or by someone who already has one', () => {
    expect(wants(2, { later: DAY * 3 })).toBe(false); // the scare halves each day
    expect(wants(3, { age: 9 })).toBe(false);
    expect(wants(3, { has: true })).toBe(false);
  });

  it('the scare is a memory with a half-life of a day, kept on the person', () => {
    const s = stage('spear-scare');
    const p = addPerson(s, 'Tomas', 44, 44);
    const w = done(s);
    w.tick = 1000;
    noteScare(w, p, 2);
    expect(wolfScare(w, p)).toBeCloseTo(2, 5);
    w.tick += DAY;
    expect(wolfScare(w, p)).toBeCloseTo(1, 5);
    noteScare(w, p, 1);
    expect(wolfScare(w, p)).toBeCloseTo(2, 5);
  });

  it('a chase is one fright however many times the running is begun again, but a bite always counts', () => {
    const s = stage('spear-fright');
    const p = addPerson(s, 'Tomas', 44, 44);
    const w = done(s);
    w.tick = 5000;
    noteScare(w, p);
    w.tick += 40;
    noteScare(w, p); // still the same chase
    w.tick += 120;
    noteScare(w, p);
    expect(wolfScare(w, p)).toBeCloseTo(1, 1);
    w.tick += 200;
    noteScare(w, p, 2); // a bite, a few strides on
    expect(wolfScare(w, p)).toBeCloseTo(2.9, 1);
    w.tick += 400;
    noteScare(w, p); // a new run, well after the last
    expect(wolfScare(w, p)).toBeCloseTo(3.58, 1);
  });

  it('matters more to someone the wolves keep chasing: the urgency of a spear grows with the fright, and no other tool has any', () => {
    const s = stage('spear-urgency');
    const p = addPerson(s, 'Tomas', 44, 44);
    const w = done(s);
    w.tick = 5000;
    const at = (n: number) => {
      p.cooldowns.scare = n;
      p.cooldowns.scareAt = w.tick;
      return toolUrgency(makeCtx(w, p, false), 'spear');
    };
    expect(at(0)).toBe(0);
    expect(at(2)).toBeGreaterThan(0);
    expect(at(8)).toBeGreaterThan(at(2));
    expect(at(1000)).toBeLessThanOrEqual(22); // there is a limit to how much it can outweigh everything else
    expect(toolUrgency(makeCtx(w, p, false), 'axe')).toBe(0);
  });
});

describe('from fearing wolves to carrying a spear', () => {
  it('someone who keeps being frightened, with wood to hand and a place to work, is offered the chance to make one, and does', () => {
    const s = stage('spear-craft');
    const p = addPerson(s, 'Tomas', 44, 44, { inv: { wood: 3, berries: 4 }, traits: { diligence: 0.9 } });
    const hut = building(s, 'hut', 46, 46, p.hhId);
    for (let i = 0; i < 4; i++) makeSource(s.w, 'tree', 47 + i, 50, 6);
    const w = done(s);
    w.households.find((h) => h.id === p.hhId)!.homeId = hut.id;
    for (const e of [...w.sources, ...w.buildings]) observe(w, p, e);
    w.tick = DAY * 3;
    noteScare(w, p, 3);
    const craft = generateOptions(w, p).options.find((o) => o.kind === 'craft' && o.key === 'craft:spear' && o.make);
    expect(craft, 'an option to make a spear').toBeTruthy();
    startActivity(w, p, craft!.make!()!);
    run(w, 400);
    expect(p.inv.spear ?? 0).toBe(1);
    expect(w.ledger.reasons['+crafted: spear']).toBe(1);
    expect(w.ledger.reasons['-crafting: spear']).toBe(3); // the 3 wood it takes
    expect(p.inv.wood ?? 0).toBe(0);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });
});
