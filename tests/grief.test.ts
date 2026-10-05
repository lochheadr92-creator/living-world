import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DEATH_RECORDS_KEPT } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { addLog } from '../src/sim/events';
import { describeEntity } from '../src/sim/inspect';
import { generateOptions } from '../src/sim/decision';
import { GRIEF_WINDOW, MOURN_TICKS } from '../src/sim/grief';
import { learn, observe } from '../src/sim/knowledge';
import { killPerson } from '../src/sim/lifecycle';
import { pickNews, tellBelief } from '../src/sim/news';
import { relOf } from '../src/sim/relations';
import type { Belief, Grave, Person, World } from '../src/sim/types';
import { addPerson, done, pin, stage } from './helpers/kit';
import { expectSameWorld, reloaded } from './helpers/resume';
import { person, run, scene } from './helpers/util';

const graveOf = (w: World, personId: number): Grave | undefined => w.graves.find((g) => g.personId === personId);

describe('a death is remembered: the grave says what its person was about at the end', () => {
  it('the grave keeps the cause, the wolf bites they remembered, their pack and their last memories; the feed says it in a clause', () => {
    // STAGED: Ana carries two pieces of wood and remembers two wolf attacks; then she dies of thirst
    const s = stage('death-record');
    const ana = addPerson(s, 'Ana', 44.5, 32.5, { inv: { wood: 2 } });
    addPerson(s, 'Ben', 47.5, 32.5, { sex: 'm' });
    const w = done(s);
    run(w, 60);
    addLog(w, ana, 'danger', 'A wolf attacked me near (44, 32).');
    addLog(w, ana, 'danger', 'A wolf attacked me near (45, 33).');
    killPerson(w, ana, 'thirst');

    const g = graveOf(w, ana.id);
    expect(g, 'a grave that knows whose it is').toBeDefined();
    expect(g!.cause).toBe('thirst');
    const d = w.deceased.find((x) => x.id === ana.id)!;
    expect(d.last?.wolfBites).toBe(2);
    expect(d.last?.pack).toEqual({ wood: 2 });
    expect(Object.keys(d.last?.needs ?? {}).sort()).toEqual(['energy', 'hunger', 'safety', 'social', 'thirst', 'warmth']);
    expect(d.last?.lines?.at(-1)).toBe('A wolf attacked me near (45, 33).');
    expect(w.events.some((e) => e.text === `Ana died (thirst, after 2 wolf bites), aged ${d.age}.`)).toBe(true);

    const card = describeEntity(w, g!.id)!;
    expect(card.rows).toContainEqual(['Cause', 'thirst']);
    expect(card.rows).toContainEqual(['Bitten by wolves', '2 times (that they still remembered)']);
    const end = card.sections?.find((x) => x.title === 'At the end');
    expect(end?.items).toEqual([{ kind: 'wood', n: 2 }]);
    expect(card.sections?.find((x) => x.title === 'Their last memories')?.notes).toEqual(d.last?.lines);
    // what she carried was put down where she fell, through the ledger
    expect(conservationReport(w).ok).toBe(true);
    // a loaded save shows the same card
    expect(describeEntity(deserializeWorld(serializeWorld(w)), g!.id)).toEqual(card);
  });

  it(`only the newest ${DEATH_RECORDS_KEPT} deaths keep their last hours; older graves keep the cause`, () => {
    // STAGED: forty-five people die one after another
    const s = stage('death-records-cap');
    const people = Array.from({ length: DEATH_RECORDS_KEPT + 5 }, (_, i) => addPerson(s, `P${i}`, 20.5 + (i % 15) * 3, 30.5 + Math.floor(i / 15) * 4));
    const w = done(s);
    for (const p of people) killPerson(w, p, 'test');
    const kept = w.deceased.filter((d) => d.last);
    expect(kept).toHaveLength(DEATH_RECORDS_KEPT);
    expect(kept[0].id).toBe(people[5].id);
    const oldest = describeEntity(w, graveOf(w, people[0].id)!.id)!;
    expect(oldest.rows).toContainEqual(['Cause', 'test']);
    expect(oldest.notes).toEqual(['Nothing more is known of how they died.']);
  });
});

const graveBelief = (p: Person, who: number): Belief | undefined => Object.values(p.beliefs).find((b) => b.kind === 'grave' && b.who === who);
const loves = (a: Person, b: Person, kin: '' | 'parent' | 'child' | 'sibling', affinity: number): void => {
  const r = relOf(a, b.id);
  r.kin = kin;
  r.affinity = affinity;
  const q = relOf(b, a.id);
  q.kin = kin === 'parent' ? 'child' : kin === 'child' ? 'parent' : kin;
  q.affinity = affinity;
};

/** STAGED: Ana, an old woman, dies at the middle of a flat field. Her daughter Bea is beside her, a stranger Eli is passing, her friend Cai is far off, her son Dan farther still. */
function aDeath(name: string) {
  const s = stage(name);
  const ana = addPerson(s, 'Ana', 40.5, 40.5, { age: 74 });
  const bea = addPerson(s, 'Bea', 44.5, 40.5, { age: 45 });
  const eli = addPerson(s, 'Eli', 36.5, 43.5, { sex: 'm' });
  const cai = addPerson(s, 'Cai', 40.5, 66.5, { sex: 'm' });
  const dan = addPerson(s, 'Dan', 70.5, 40.5, { sex: 'm' });
  loves(bea, ana, 'parent', 60);
  loves(dan, ana, 'parent', 55);
  loves(cai, ana, '', 62);
  const w = done(s);
  for (const p of [ana, bea, eli, cai, dan]) pin(p);
  return { w, ana, bea, eli, cai, dan };
}

describe('news of a death reaches people the way news does: by sight, or by word', () => {
  it('those who see it happen know at once and the ones who loved Ana feel it; a stranger sees and feels nothing; the rest know nothing', () => {
    const { w, ana, bea, eli, cai, dan } = aDeath('grief-sight');
    const before = Object.fromEntries([bea, eli, cai, dan].map((p) => [p.name, { social: p.needs.social, safety: p.needs.safety, log: p.log.length }]));
    killPerson(w, ana, 'old age');

    // Bea saw it: she knows, and she grieves, in her own words
    expect(graveBelief(bea, ana.id)?.name).toBe('Ana');
    expect(bea.needs.social).toBe(before.Bea.social - 24);
    expect(bea.needs.safety).toBe(before.Bea.safety - 8);
    expect(bea.log.at(-1)?.text).toBe('Ana died (old age).');
    // Eli saw it too, but did not know her
    expect(graveBelief(eli, ana.id)).toBeDefined();
    expect(eli.needs.social).toBe(before.Eli.social);
    expect(eli.log.length).toBe(before.Eli.log);
    // Cai and Dan were not there: nothing has reached them, however fond they were
    for (const far of [cai, dan]) {
      expect(graveBelief(far, ana.id), `${far.name} knows of no grave`).toBeUndefined();
      expect(far.needs.social).toBe(before[far.name].social);
      expect(far.needs.safety).toBe(before[far.name].safety);
      expect(far.log.length).toBe(before[far.name].log);
    }
    // and a long while later, still nothing: they have not seen or heard
    run(w, 800);
    for (const far of [cai, dan]) expect(graveBelief(far, ana.id)).toBeUndefined();
    expect(conservationReport(w).ok).toBe(true);
  });

  it('word of mouth carries it: Bea tells Cai, Cai tells Dan, each hearing it in the teller’s words and feeling it only then', () => {
    const { w, ana, bea, cai, dan } = aDeath('grief-word');
    killPerson(w, ana, 'old age');
    // Bea would tell it to someone who does not know: it is the first thing she has to say
    expect(pickNews(w, bea, cai, 2).some((b) => b.kind === 'grave' && b.who === ana.id)).toBe(true);
    const social = { cai: cai.needs.social, dan: dan.needs.social };
    expect(tellBelief(w, bea, cai, graveBelief(bea, ana.id)!)).toBe(true);
    expect(graveBelief(cai, ana.id)?.src).toBe('told');
    expect(cai.needs.social).toBe(social.cai - 24);
    expect(cai.log.at(-1)?.text).toBe('Bea told me that Ana had died (old age).');
    // told once, it is not told again to the same person
    expect(pickNews(w, bea, cai, 2).some((b) => b.kind === 'grave')).toBe(false);
    // Dan has still heard nothing; then Cai tells him
    expect(graveBelief(dan, ana.id)).toBeUndefined();
    expect(tellBelief(w, cai, dan, graveBelief(cai, ana.id)!)).toBe(true);
    expect(dan.needs.social).toBe(social.dan - 24);
    expect(dan.log.at(-1)?.text).toBe('Cai told me that Ana had died (old age).');
    expect(graveBelief(dan, ana.id)?.hops).toBe(2);
    // hearing it again, or seeing the grave afterwards, is not a second bereavement
    const once = dan.needs.social;
    tellBelief(w, bea, dan, graveBelief(bea, ana.id)!);
    observe(w, dan, w.byId.get(graveBelief(dan, ana.id)!.id)!);
    expect(dan.needs.social).toBe(once);
  });

  it('coming upon the grave later is how someone far away may learn of it; they are not told how she died, because the grave does not say', () => {
    const { w, ana, dan } = aDeath('grief-find');
    killPerson(w, ana, 'thirst');
    run(w, 2000); // long after: nobody who was there is saying anything (they are pinned), so nobody else knows
    const grave = w.graves.find((g) => g.personId === ana.id)!;
    expect(graveBelief(dan, ana.id)).toBeUndefined();
    dan.x = grave.x + 1.5;
    dan.y = grave.y;
    const social = dan.needs.social;
    run(w, 6); // a few ticks: perception picks the grave up
    expect(graveBelief(dan, ana.id)).toBeDefined();
    expect(graveBelief(dan, ana.id)?.cause).toBeUndefined();
    expect(dan.needs.social).toBeLessThan(social);
    expect(dan.log.some((l) => l.text === 'I came upon Ana’s grave: they had died.')).toBe(true);
  });

  it('a death that nobody sees is not known to anyone, and a grave from before this was recorded changes nothing', () => {
    const s = stage('grief-alone');
    const fay = addPerson(s, 'Fay', 10.5, 70.5);
    const gus = addPerson(s, 'Gus', 70.5, 30.5, { sex: 'm' });
    loves(gus, fay, 'sibling', 70);
    const w = done(s);
    pin(gus);
    const social = gus.needs.social;
    killPerson(w, fay, 'exposure');
    run(w, 400);
    expect(w.graves).toHaveLength(1);
    expect(graveBelief(gus, fay.id)).toBeUndefined();
    expect(gus.needs.social).toBeLessThanOrEqual(social); // only the slow loss of company that anyone suffers
    expect(gus.log.some((l) => /Fay/.test(l.text))).toBe(false);
    // an old save's grave belief has no name or person: it is only a grave
    const old: Belief = { id: 9999, kind: 'grave', x: 12, y: 12, amount: 0, max: 0, seen: 0, src: 'seen', from: 0, learned: 0 };
    const before = gus.needs.social;
    learn(gus, old);
    expect(gus.needs.social).toBe(before);
  });
});

/** STAGED: as above, but nearer the lake (so everyone knows where water is), and the people are free to do as they choose (only the ones named are pinned). */
function aDeathWithMourners(name: string, o: { pin?: string[]; beaHunger?: number } = {}) {
  const s = stage(name);
  s.w.camp = { x: 44.5, y: 26.5 };
  const ana = addPerson(s, 'Ana', 40.5, 28.5, { age: 74 });
  const bea = addPerson(s, 'Bea', 44.5, 28.5, { age: 45, hunger: o.beaHunger ?? 90, thirst: 95 });
  const eli = addPerson(s, 'Eli', 36.5, 31.5, { sex: 'm', hunger: 90, thirst: 95 });
  const cai = addPerson(s, 'Cai', 40.5, 50.5, { sex: 'm', hunger: 90, thirst: 95 });
  const dan = addPerson(s, 'Dan', 72.5, 28.5, { sex: 'm', hunger: 90, thirst: 95 });
  loves(bea, ana, 'parent', 60);
  loves(dan, ana, 'parent', 55);
  loves(cai, ana, '', 62);
  const w = done(s);
  for (const p of [ana, bea, eli, cai, dan]) if (o.pin?.includes(p.name)) pin(p);
  return { w, ana, bea, eli, cai, dan };
}

describe('standing at a grave', () => {
  it('whoever knew and was close goes once, a stranger who saw the same never does; it is in the feed and in their own memory', () => {
    const { w, ana, bea, eli } = aDeathWithMourners('grave-visit', { pin: ['Cai', 'Dan'] });
    killPerson(w, ana, 'old age');
    // Bea has the option from the first moment; Eli, who saw it too, has none
    expect(generateOptions(w, bea, true).options.some((o) => o.kind === 'mourn')).toBe(true);
    expect(generateOptions(w, eli, true).options.some((o) => o.kind === 'mourn')).toBe(false);
    const starts: Record<string, number> = { Bea: 0, Eli: 0 };
    let last: Record<string, boolean> = { Bea: false, Eli: false };
    run(w, 4000, () => {
      for (const p of [bea, eli]) {
        const now = p.activity?.kind === 'mourn';
        if (now && !last[p.name]) starts[p.name]++;
        last[p.name] = now;
      }
    });
    expect(starts).toEqual({ Bea: 1, Eli: 0 });
    expect(bea.visitedGraves?.[ana.id]).toBeDefined();
    expect(eli.visitedGraves).toBeUndefined();
    expect(bea.log.filter((l) => l.text === 'Stood at Ana’s grave for a while.')).toHaveLength(1);
    expect(w.events.filter((e) => e.text === 'Bea stood at Ana’s grave.')).toHaveLength(1);
    // she does not go again, however long she lives
    last = { Bea: false, Eli: false };
    run(w, 14000, () => {
      if (bea.activity?.kind === 'mourn') starts.Bea++;
    });
    expect(starts.Bea).toBe(1);
    expect(conservationReport(w).ok).toBe(true);
  }, 120_000);

  it('a friend far away goes only once someone has told him, and then once', () => {
    // (held where he is until then: left alone he would soon walk past the grave on his way to the lake, and find it)
    const { w, ana, bea, cai, dan } = aDeathWithMourners('grave-far', { pin: ['Dan', 'Bea', 'Cai', 'Eli'] });
    killPerson(w, ana, 'old age');
    run(w, 600);
    // until he is told he has no reason to go: no option, no visit, however fond he was
    expect(generateOptions(w, cai, true).options.some((o) => o.kind === 'mourn')).toBe(false);
    expect(cai.visitedGraves).toBeUndefined();
    expect(tellBelief(w, bea, cai, graveBelief(bea, ana.id)!)).toBe(true);
    cai.cooldowns.pause = 0;
    cai.needs.hunger = cai.needs.thirst = 95; // (he has stood about for a while)
    expect(generateOptions(w, cai, true).options.some((o) => o.kind === 'mourn')).toBe(true);
    run(w, 2500);
    // he went, and stood there once: one memory of it, one line in the feed, one mark that he has been
    // (an interrupted walk is picked up again, so the number of times he set out is not the number of visits)
    expect(cai.log.filter((l) => l.text === 'Stood at Ana’s grave for a while.')).toHaveLength(1);
    expect(w.events.filter((e) => e.text === 'Cai stood at Ana’s grave.')).toHaveLength(1);
    expect(cai.visitedGraves?.[ana.id]).toBeDefined();
    run(w, 6000);
    expect(cai.log.filter((l) => l.text === 'Stood at Ana’s grave for a while.')).toHaveLength(1);
    // and Dan, who nobody has told, is where he was
    expect(dan.visitedGraves).toBeUndefined();
    expect(graveBelief(dan, ana.id)).toBeUndefined();
  }, 120_000);

  it('survival comes first: someone hungry does not go until they have eaten, and the reason is on record', () => {
    const { w, ana, bea } = aDeathWithMourners('grave-hungry', { pin: ['Cai', 'Dan', 'Eli'], beaHunger: 20 });
    killPerson(w, ana, 'old age');
    const ctx = generateOptions(w, bea, true);
    expect(ctx.options.some((o) => o.kind === 'mourn')).toBe(false);
    expect(ctx.blocked.some((o) => o.kind === 'mourn' && o.blocked === 'something more pressing')).toBe(true);
  });

  it(`the visit lapses for good ${GRIEF_WINDOW / 2400} days after they learned of it`, () => {
    const { w, ana, bea } = aDeathWithMourners('grave-lapse', { pin: ['Bea', 'Cai', 'Dan', 'Eli'] });
    killPerson(w, ana, 'old age');
    run(w, GRIEF_WINDOW + 50);
    bea.cooldowns.pause = 0;
    expect(generateOptions(w, bea, true).options.some((o) => o.kind === 'mourn')).toBe(false);
  }, 120_000);

  it('a save taken while she stands at the grave, or long after, neither loses the visit nor repeats it', () => {
    const { w, ana, bea } = aDeathWithMourners('grave-save', { pin: ['Cai', 'Dan', 'Eli'] });
    killPerson(w, ana, 'old age');
    for (let i = 0; i < 600 && !(bea.activity?.kind === 'mourn' && bea.activity.phase === 'work'); i++) run(w, 1);
    expect(bea.activity?.kind, 'she is standing at the grave').toBe('mourn');
    expect(bea.visitedGraves).toBeUndefined();
    // saved in the middle of it: the copy finishes the visit exactly as the original does
    const copy = reloaded(w);
    run(w, 3000);
    run(copy, 3000);
    expectSameWorld(w, copy);
    expect(copy.persons.find((p) => p.name === 'Bea')?.visitedGraves?.[ana.id]).toBeDefined();
    // saved long after: still one visit, in both
    const later = reloaded(w);
    let visits = 0;
    run(later, 9000, () => {
      if (later.persons.find((p) => p.name === 'Bea')?.activity?.kind === 'mourn') visits++;
    });
    expect(visits).toBe(0);
    expect(MOURN_TICKS).toBeGreaterThan(0);
  }, 240_000);
});

describe('TEST SCENE · a death in the settlement', () => {
  it('a stranger does not mourn; far loved ones learn only by word or by coming upon the grave; everyone who goes, goes once', () => {
    const w = scene('grief');
    expect(w.sceneLabel).toMatch(/^TEST SCENE/);
    const [ana, bea, eli, cai, dan] = ['Ana', 'Bea', 'Eli', 'Cai', 'Dan'].map((n) => person(w, n));
    expect(ana.alive).toBe(true);
    run(w, 40);
    // she has died, of old age, at the first tick; the feed says so
    expect(w.persons.some((p) => p.name === 'Ana')).toBe(false);
    expect(w.events.some((e) => /^Ana died peacefully of old age/.test(e.text))).toBe(true);
    // Bea was beside her: she knows, in the words of someone who was there
    expect(bea.log.some((l) => l.text === 'Ana died (old age).')).toBe(true);
    // Eli saw it too, and did not know her: he knows of the grave and feels nothing
    expect(Object.values(eli.beliefs).some((b) => b.kind === 'grave')).toBe(true);
    expect(eli.log.some((l) => /Ana/.test(l.text))).toBe(false);
    // Cai and Dan are out of sight: they know nothing yet
    for (const far of [cai, dan]) expect(Object.values(far.beliefs).some((b) => b.kind === 'grave'), `${far.name} knows of no grave`).toBe(false);

    run(w, 9000);
    const lines = (p: Person, re: RegExp): string[] => p.log.filter((l) => re.test(l.text)).map((l) => l.text);
    // whoever far away has learned of it learned it by word or by finding the grave: never as someone who was there
    for (const far of [cai, dan]) {
      expect(lines(far, /^Ana died \(old age\)\.$/), `${far.name} did not see it`).toEqual([]);
      for (const l of lines(far, /Ana/).filter((x) => !/Stood at/.test(x))) expect(l).toMatch(/^(\w+ told me that Ana had died( \(old age\))?\.|I came upon Ana’s grave: they had died\.)$/);
    }
    // the stranger never stood at the grave; nobody stood there twice
    expect(lines(eli, /Stood at Ana/)).toEqual([]);
    for (const p of [bea, eli, cai, dan]) expect(lines(p, /^Stood at Ana’s grave for a while\.$/).length, p.name).toBeLessThanOrEqual(1);
    expect(lines(bea, /^Stood at Ana’s grave for a while\.$/)).toHaveLength(1);
    expect(conservationReport(w).ok).toBe(true);
  }, 240_000);
});
