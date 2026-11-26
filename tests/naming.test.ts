// Rules 261 (bundle B, part 5): the naming day (src/sim/naming.ts, the switch in src/sim/hearth_scenes.ts; the name chosen in lifecycle.ts giveBirth, the
// feast in occasions.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The last test runs ordinary
// worlds and PRINTS what happened; it asserts nothing about how much.
import { appendFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { dayFraction } from '../src/sim/environment';
import { createWorld } from '../src/sim/factory';
import { HEARTH_PARTS, hasNaming, hearthPartOn, setHearthScenes } from '../src/sim/hearth_scenes';
import { generateOptions } from '../src/sim/decision';
import { giveBirth, killPerson } from '../src/sim/lifecycle';
import { NAMING_LISTENERS_MIN, isNamingFeast, namesakeFor, nameSex, validateNaming } from '../src/sim/naming';
import { occasionsOf } from '../src/sim/occasions';
import { perceive } from '../src/sim/perception';
import { currentWorldSettings } from '../src/sim/profiles';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import type { Occasion, Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { relationshipHistory } from '../src/sim/history';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, learn, stage } from './helpers/kit';

afterEach(() => setHearthScenes(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const MORNING = at(0.3);

interface Opts {
  tag?: string;
  version?: number;
  /** how many others stand near the fire, and whether the parents are among those who come */
  others?: number;
  /** a grandmother and a grandfather of Mira's who have died (names suit either sex of child) */
  dead?: boolean;
  fatherHome?: boolean;
}

/**
 * Mira (27) and Finn (30), partners, her time has come; Ada, Bo and Cy within a few tiles of the camp fire (each knows it); everybody knows the lake.
 * With `dead`, Mira's mother Zora and father Zeke have died and Mira knows it.
 */
function scene(o: Opts = {}) {
  const s = stage(`naming-${o.version ?? 261}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 261;
  w.tick = MORNING;
  const full = { hunger: 95, thirst: 95, energy: 95 };
  const mira = addPerson(s, 'Mira', 38, 33, { age: 27, sex: 'f', ...full });
  const finn = addPerson(s, 'Finn', 39, 34, { age: 30, sex: 'm', ...full, hh: mira.hhId });
  const kinfolk: Person[] = [];
  const names = ['Ada', 'Bo', 'Cy', 'Di'];
  for (let i = 0; i < (o.others ?? 3); i++) kinfolk.push(addPerson(s, names[i], 41 + i, 36, { age: 30 + i, sex: i % 2 ? 'm' : 'f', ...full }));
  const zora = o.dead ? addPerson(s, 'Zora', 30, 30, { age: 60, sex: 'f', ...full }) : null;
  const zeke = o.dead ? addPerson(s, 'Zeke', 31, 30, { age: 62, sex: 'm', ...full }) : null;
  const fire = createBuilding(w, 'fire', 41, 38, 0, { fuel: 20000 });
  w.camp = { x: 41, y: 36 };
  done(s);
  mira.partnerId = finn.id; finn.partnerId = mira.id;
  Object.assign(relOf(mira, finn.id), { kin: 'partner', affinity: 80, trust: 80, familiarity: 60 });
  Object.assign(relOf(finn, mira.id), { kin: 'partner', affinity: 80, trust: 80, familiarity: 60 });
  for (const q of kinfolk) {
    for (const p of [mira, finn]) { Object.assign(relOf(p, q.id), { familiarity: 20, affinity: 30, trust: 25 }); Object.assign(relOf(q, p.id), { familiarity: 20, affinity: 30, trust: 25 }); }
  }
  for (const p of [mira, finn, ...kinfolk]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; learn(w, p, fire); }
  if (zora && zeke) {
    mira.parents = [zora.id, zeke.id];
    Object.assign(relOf(mira, zora.id), { kin: 'parent', affinity: 80, trust: 80, familiarity: 60 });
    Object.assign(relOf(mira, zeke.id), { kin: 'parent', affinity: 80, trust: 80, familiarity: 60 });
    killPerson(w, zora, 'old age');
    killPerson(w, zeke, 'old age');
    for (const d of [zora, zeke]) relOf(mira, d.id).deathKnown = { learned: w.tick, source: 'told', via: 0 };
  }
  mira.pregnantUntil = w.tick;
  mira.pregnantBy = finn.id;
  rebuildMobileGrid(w);
  for (const p of [mira, finn, ...kinfolk]) perceive(w, p);
  return { s, w, mira, finn, kinfolk, fire };
}
type Fx = ReturnType<typeof scene>;

/** Mira's child is born now (the real giveBirth), and the one feast it called */
function birth(f: Fx): { baby: Person; feast: Occasion } {
  giveBirth(f.w, f.mira);
  const baby = f.w.byId.get(f.mira.children[f.mira.children.length - 1]) as Person;
  const feast = occasionsOf(f.w).filter((o) => o.kind === 'feast').pop()!;
  return { baby, feast };
}
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const untilOpen = (w: World, o: Occasion): void => { for (let i = 0; i < 4000 && w.tick <= o.at + 3; i++) stepWorld(w); };
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));

describe('the name', () => {
  it('nameSex reads the plain names, numeral or not', () => {
    expect([nameSex('Zora'), nameSex('Zeke'), nameSex('Cora II'), nameSex('Cole VII'), nameSex('Nobody')]).toEqual(['f', 'm', 'f', 'm', null]);
  });

  it('a parent who lost a mother is named after her, the child being a girl, if nobody alive bears the name; and the shared stream does not know', () => {
    // two identical worlds; the part on in one, off in the other; whichever sex the child is drawn as, it is the same in both
    const on = scene({ tag: 'dead', dead: true });
    const { baby } = birth(on);
    const stateOn = [on.w.rng.a, on.w.rng.b, on.w.rng.c, on.w.rng.d];
    setHearthScenes(false, 'naming');
    const off = scene({ tag: 'dead', dead: true });
    const { baby: baby2 } = birth(off);
    setHearthScenes(true, 'naming');
    expect(baby.sex).toBe(baby2.sex);
    expect(baby.name, 'the same name before the rule: the drawn name').not.toBe(undefined);
    const zora = baby.sex === 'f';
    expect(baby.name).toBe(zora ? 'Zora' : 'Zeke');
    expect(baby.namedAfter).toBe(on.mira.parents[zora ? 0 : 1]);
    expect(baby2.namedAfter).toBeUndefined();
    expect(on.w.usedNames.has(baby2.name) && baby2.name !== baby.name, 'the name drawn first goes back to the pool').toBe(false);
    expect([on.w.rng.a, on.w.rng.b, on.w.rng.c, on.w.rng.d], 'the shared stream stands where it would').toEqual(stateOn);
    expect([off.w.rng.a, off.w.rng.b, off.w.rng.c, off.w.rng.d]).toEqual(stateOn);
    expect([baby.sex, baby.traits, baby.look]).toEqual([baby2.sex, baby2.traits, baby2.look]);
    expect(relationshipHistory(on.w, baby).some((r) => r.startsWith('Named at birth after '))).toBe(true);
  });

  it('only a name nobody alive bears: a living Zora means no child is named Zora, and a numeral is taken whole', () => {
    const f = scene({ tag: 'bearer', dead: true });
    const baby = { sex: 'f', name: 'Drawn' } as Person;
    const zeke = f.mira.parents[1];
    expect(namesakeFor(f.w, baby, f.mira, f.finn)?.name).toBe('Zora');
    addPerson(f.s, 'Zora', 50, 50, { age: 20, sex: 'f' }); // a living Zora
    expect(namesakeFor(f.w, baby, f.mira, f.finn), 'somebody alive bears it').toBeNull();
    expect(namesakeFor(f.w, { sex: 'm', name: 'Drawn' } as Person, f.mira, f.finn)?.id).toBe(zeke);
    // a numeral is part of the name
    f.w.deceased.find((d) => d.name === 'Zora')!.name = 'Zora II';
    expect(namesakeFor(f.w, baby, f.mira, f.finn)?.name, 'nobody alive is Zora II').toBe('Zora II');
  });

  it('the order is parent, partner, sibling, friend, the mother before the father; the dead person must suit the child and be known dead', () => {
    const f = scene({ tag: 'order', dead: true });
    const girl = { sex: 'f', name: 'Drawn' } as Person;
    // Finn also lost a mother, Zia: Mira's own mother comes first
    const zia = addPerson(f.s, 'Zia', 20, 20, { age: 60, sex: 'f' });
    relOf(f.finn, zia.id).kin = 'parent';
    killPerson(f.w, zia, 'old age');
    relOf(f.finn, zia.id).deathKnown = { learned: f.w.tick, source: 'told', via: 0 };
    expect(namesakeFor(f.w, girl, f.mira, f.finn)?.name).toBe('Zora');
    // Mira does not know her mother is dead (the death was not told to her): Finn's mother is next
    delete relOf(f.mira, f.mira.parents[0]).deathKnown;
    f.mira.heard = [];
    expect(namesakeFor(f.w, girl, f.mira, f.finn)?.name).toBe('Zia');
    // a friend is named only when no kin is there
    const f2 = scene({ tag: 'friend' });
    const eda = addPerson(f2.s, 'Edda', 20, 20, { age: 40, sex: 'f' });
    Object.assign(relOf(f2.mira, eda.id), { affinity: 70, trust: 60, familiarity: 40 });
    killPerson(f2.w, eda, 'a fall');
    relOf(f2.mira, eda.id).deathKnown = { learned: f2.w.tick, source: 'witness', via: 0 };
    expect(namesakeFor(f2.w, girl, f2.mira, f2.finn)).toMatchObject({ name: 'Edda', kind: 'friend' });
    relOf(f2.mira, eda.id).affinity = 59;
    expect(namesakeFor(f2.w, girl, f2.mira, f2.finn), 'not close enough').toBeNull();
    relOf(f2.mira, eda.id).affinity = 70;
    expect(namesakeFor(f2.w, { sex: 'm', name: 'Drawn' } as Person, f2.mira, f2.finn), 'a boy is not named Edda').toBeNull();
  });

  it('nobody dead, nobody named: the child keeps the drawn name; the part off or below 261 changes nothing', () => {
    const f = scene({ tag: 'nobody' });
    const { baby } = birth(f);
    expect(baby.namedAfter).toBeUndefined();
    for (const mode of ['off', 'v260'] as const) {
      if (mode === 'off') setHearthScenes(false, 'naming');
      const g = scene({ tag: 'dead-' + mode, dead: true, version: mode === 'off' ? 261 : 260 });
      const b = birth(g);
      expect(b.baby.namedAfter, mode).toBeUndefined();
      expect(isNamingFeast(b.feast), mode).toBe(false);
      setHearthScenes(true);
    }
  });
});

describe('the feast, named', () => {
  it('a birth with the part on calls a naming feast for the child (and the mother); its lines in the feed say so', () => {
    const f = scene({ tag: 'label' });
    const { baby, feast } = birth(f);
    expect(feast.naming).toEqual([baby.id]);
    expect(feast.about).toEqual([baby.id, f.mira.id]);
    expect(eventsWith(f.w, 'is called at').map((e) => e.text)).toEqual([`A naming feast for ${baby.name} and Mira is called at the fire today.`]);
    expect(() => validateNaming(f.w)).not.toThrow();
  });

  it('with the part off, or at rules 260, the feast is the old one: "feast", no naming record, and the mother does not go', () => {
    for (const mode of ['off', 'v260'] as const) {
      if (mode === 'off') setHearthScenes(false, 'naming');
      const f = scene({ tag: 'old-' + mode, version: mode === 'off' ? 261 : 260 });
      const { baby, feast } = birth(f);
      expect(feast.naming, mode).toBeUndefined();
      expect(eventsWith(f.w, 'is called at').map((e) => e.text), mode).toEqual([`A feast for ${baby.name} and Mira is called at the fire today.`]);
      expect(generateOptions(f.w, f.mira, true, true).options.some((o) => o.key.startsWith('attend:')), `${mode}: she is not offered it`).toBe(false);
      setHearthScenes(true);
    }
  });

  it('the mother goes to the feast for her child, which she was never offered before; worth the same as for kin', () => {
    const f = scene({ tag: 'mother' });
    const { feast } = birth(f);
    f.w.tick = feast.at - 100;
    perceive(f.w, f.mira);
    const o = generateOptions(f.w, f.mira, true, true).options.find((x) => x.key === `attend:${feast.id}`);
    expect(o, 'offered to her').toBeTruthy();
    expect(o!.label).toBe('Go to the naming feast at the fire');
    expect(o!.parts.map(([n]) => n)).toContain('a naming feast for someone of mine');
  });

  it('when it opens with a parent there and others who came, the name is said: one line in the feed, naming the child aloud', () => {
    const f = scene({ tag: 'said' });
    const { baby, feast } = birth(f);
    for (const q of f.kinfolk) q.nextThink = f.w.tick;
    f.finn.nextThink = f.w.tick;
    f.mira.nextThink = f.w.tick;
    untilOpen(f.w, feast);
    const lines = f.w.events.filter((e) => / named (their|his|her) /.test(e.text));
    expect(lines.length).toBe(1);
    expect(lines[0].kind).toBe('social');
    const who = baby.sex === 'f' ? 'daughter' : 'son';
    expect(lines[0].text).toMatch(new RegExp(`^(Mira and Finn named their ${who}|Mira named her ${who}|Finn named his ${who}) ${baby.name} before [1-9] (person|people)\\.$`));
    expect(feast.named).toEqual([baby.id]);
    expect(lines[0].ids[0]).toBe(baby.id);
    // those who come after, and those who were there, come to know the child
    run(f.w, 200);
    const knew = f.kinfolk.filter((q) => (q.relations[baby.id]?.familiarity ?? 0) >= 3);
    expect(knew.length).toBeGreaterThanOrEqual(2);
    expect(() => validateNaming(f.w)).not.toThrow();
    expect(conservationReport(f.w).ok).toBe(true);
  });

  it('a child named after a grandmother: "after Mira\'s mother" is written, and only when it is true', () => {
    // a girl: find a stage where the child is drawn female (the draw is the same for the same scene); try tags until one is
    let f: Fx | null = null;
    for (let i = 0; i < 12 && !f; i++) {
      const g = scene({ tag: 'grand-' + i, dead: true });
      giveBirth(g.w, g.mira);
      const b = g.w.byId.get(g.mira.children[0]) as Person;
      if (b.sex === 'f') f = scene({ tag: 'grand-' + i, dead: true });
    }
    expect(f, 'a scene with a girl was found').toBeTruthy();
    const { baby, feast } = birth(f!);
    expect(baby.name).toBe('Zora');
    for (const q of [...f!.kinfolk, f!.finn, f!.mira]) q.nextThink = f!.w.tick;
    untilOpen(f!.w, feast);
    const line = f!.w.events.find((e) => / named (their|her|his) /.test(e.text))!;
    expect(line.text).toMatch(/^(Mira and Finn named their daughter|Mira named her daughter|Finn named his daughter) Zora before \d (person|people), after Mira's mother\.$/);
    // and a child with no namesake has no such clause
    const g = scene({ tag: 'plain' });
    const b2 = birth(g);
    for (const q of [...g.kinfolk, g.finn, g.mira]) q.nextThink = g.w.tick;
    untilOpen(g.w, b2.feast);
    const l2 = g.w.events.find((e) => / named (their|her|his) /.test(e.text))!;
    expect(l2.text).not.toContain(', after ');
  });

  it('no parent there: nothing is said and nothing is written; the feast goes on as a feast', () => {
    const f = scene({ tag: 'noparent' });
    const { feast } = birth(f);
    // both parents are held where they are, far from the fire, and do not set out
    for (const p of [f.mira, f.finn]) { p.cooldowns.pause = f.w.tick + 5000; p.x = 70; p.y = 60; p.px = 70; p.py = 60; }
    rebuildMobileGrid(f.w);
    for (const q of f.kinfolk) q.nextThink = f.w.tick;
    untilOpen(f.w, feast);
    run(f.w, 100);
    expect(f.w.events.filter((e) => / named (their|her|his) /.test(e.text))).toEqual([]);
    expect(feast.named).toBeUndefined();
    expect(feast.attended.length).toBeGreaterThan(0);
  });

  it(`a parent there with fewer than ${NAMING_LISTENERS_MIN} other: nothing is said`, () => {
    const f = scene({ tag: 'few', others: 0 });
    const { feast } = birth(f);
    for (const p of [f.mira, f.finn, ...f.kinfolk]) p.nextThink = f.w.tick;
    untilOpen(f.w, feast);
    expect(f.w.events.filter((e) => / named (their|her|his) /.test(e.text))).toEqual([]);
    expect(feast.named).toBeUndefined();
  });

  it('nobody came: the old line, "nobody came", and no naming event', () => {
    const f = scene({ tag: 'empty', others: 0 });
    const { baby, feast } = birth(f);
    for (const p of [f.mira, f.finn]) { p.cooldowns.pause = f.w.tick + 9000; p.x = 70; p.y = 60; p.px = 70; p.py = 60; }
    rebuildMobileGrid(f.w);
    for (let i = 0; i < 6000 && feast.status !== 'done'; i++) stepWorld(f.w);
    expect(feast.status).toBe('done');
    expect(feast.end).toBe('nobody came');
    expect(eventsWith(f.w, 'is over').map((e) => e.text)).toEqual(['The naming feast at the fire is over: nobody came.']);
    expect(f.w.events.filter((e) => / named (their|her|his) /.test(e.text))).toEqual([]);
    void baby;
  });

  it('two births before the feast are named at the one feast, at most four', () => {
    const f = scene({ tag: 'two' });
    const { baby, feast } = birth(f);
    const other = addPerson(f.s, 'Eve', 36, 36, { age: 26, sex: 'f' });
    other.pregnantUntil = f.w.tick; other.pregnantBy = 0;
    giveBirth(f.w, other);
    const second = f.w.byId.get(other.children[0]) as Person;
    expect(occasionsOf(f.w).filter((o) => o.kind === 'feast').length).toBe(1);
    expect(feast.naming).toEqual([baby.id, second.id]);
    expect(() => validateNaming(f.w)).not.toThrow();
  });
});

describe('saved state', () => {
  it('a world saved while the naming feast waits loads and goes on to the same end', () => {
    const f = scene({ tag: 'saveload', dead: true });
    const { feast } = birth(f);
    for (const p of [f.mira, f.finn, ...f.kinfolk]) p.nextThink = f.w.tick;
    run(f.w, 60);
    const back = deserializeWorld(serializeWorld(f.w));
    expect(hashWorld(back)).toBe(hashWorld(f.w));
    const ticks = feast.at - f.w.tick + 300;
    run(f.w, ticks);
    run(back, ticks);
    expect(hashWorld(back)).toBe(hashWorld(f.w));
    const line = (w: World) => w.events.filter((e) => / named (their|her|his) /.test(e.text)).map((e) => e.text);
    expect(line(back)).toEqual(line(f.w));
    expect(line(f.w).length).toBe(1);
  });

  it('bad saved state is refused: a namesake who is not on the death record, a feast record with no feast, a named child that is not a naming, any of it below 261', () => {
    const f = scene({ tag: 'validate', dead: true });
    const { baby, feast } = birth(f);
    expect(() => validateNaming(f.w)).not.toThrow();
    baby.namedAfter = f.mira.parents[0];
    expect(() => validateNaming(f.w)).not.toThrow();
    baby.namedAfter = 999999;
    expect(() => validateNaming(f.w)).toThrow(/namesake/i);
    delete baby.namedAfter;
    feast.named = [baby.id];
    expect(() => validateNaming(f.w)).not.toThrow();
    feast.named = [123456];
    expect(() => validateNaming(f.w)).toThrow(/naming record/i);
    delete feast.named;
    feast.naming = [baby.id, baby.id];
    expect(() => validateNaming(f.w)).toThrow(/naming feast/i);
    feast.naming = [baby.id];
    f.w.settings.rulesVersion = 260;
    expect(() => validateNaming(f.w)).toThrow(/naming feast/i);
  });
});

describe('the lab arm', () => {
  it('rich-no-hearth-naming removes the part and only the part', () => {
    const arm = parseIntervention('rich-no-hearth-naming');
    const undo = arm.install!();
    expect([hearthPartOn('birth'), hearthPartOn('naming'), hearthPartOn('vigil')]).toEqual([true, false, true]);
    expect(hasNaming(scene({ tag: 'arm' }).w)).toBe(false);
    undo();
    expect(HEARTH_PARTS.map(hearthPartOn)).toEqual([true, true, true]);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(261);
  });
});

describe('ordinary worlds (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 261 and prints how the births were named: feasts, names said, children named after the dead, feasts nobody came to', () => {
    // NAMING_SEED (default gen-4); NAMING_DAYS: exactly this many days (default 6, a short check); NAMING_OFF=1: the part switched off;
    // NAMING_REPORT=<file>: also append the line there
    const seed = process.env.NAMING_SEED ?? 'gen-4';
    const days = Number(process.env.NAMING_DAYS ?? 6);
    if (process.env.NAMING_OFF) setHearthScenes(false, 'naming');
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 261 });
    let lastEvent = 0, births = 0, said = 0, after = 0, empty = 0, feasts = 0;
    const scan = () => {
      for (const e of w.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        if (e.kind === 'life' && / was born to /.test(e.text)) births++;
        else if (/^A (naming )?feast for .* is called at/.test(e.text)) feasts++;
        else if (/ named (their|her|his) /.test(e.text)) { said++; if (/, after /.test(e.text)) after++; }
        else if (/^The naming feast at .* is over: nobody came\.$/.test(e.text)) empty++;
      }
    };
    while (w.tick < days * DAY) { stepWorld(w); if (w.tick % 20 === 0) scan(); }
    scan();
    const named = w.persons.filter((p) => p.namedAfter !== undefined).length;
    const line = `NAMING ordinary world, seed ${seed}, rules 261${process.env.NAMING_OFF ? ' [part switched off]' : ''}: ${Math.floor(w.tick / DAY)} days, ${w.persons.filter((p) => p.alive).length} alive; births ${births}, birth feasts called ${feasts}, names said ${said} (after the dead ${after}; alive named after the dead ${named}), feasts nobody came to ${empty}`;
    console.log(line);
    if (process.env.NAMING_REPORT) appendFileSync(process.env.NAMING_REPORT, line + '\n');
    expect(conservationReport(w).ok).toBe(true);
    expect(() => validateNaming(w)).not.toThrow();
  }, 400_000);
});
