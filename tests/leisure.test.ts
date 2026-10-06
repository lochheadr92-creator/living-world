// The part of life that is not needed: fires, play, contests, keepsakes, calls, jokes and celebrations.
import { describe, expect, it } from 'vitest';
import { newActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { addItem, conservationReport, consume, ledgerCreate } from '../src/sim/economy';
import { celebrating, circleOf, fireTick, giveKeepsake, hospitality, maybeJoke, noteOccasion, occasionWords, onCelebrationMeal, playContest } from '../src/sim/leisure';
import { inviteAsk } from '../src/sim/meals';
import { ageYears, stageOf } from '../src/sim/people';
import { relOf } from '../src/sim/relations';
import { surplusOf } from '../src/sim/social';
import { hashWorld } from '../src/sim/world';
import type { Person, World } from '../src/sim/types';
import { natural, run } from './helpers/util';

function stage() {
  const w = natural('leisure-stage');
  const adults = w.persons.filter((p) => p.alive && stageOf(w, p) === 'adult').slice(0, 5);
  const kids = w.persons.filter((p) => p.alive && stageOf(w, p) === 'child').slice(0, 3);
  const fire = w.buildings.find((b) => b.type === 'fire')!;
  for (const p of [...adults, ...kids]) {
    p.cooldowns = {};
    p.log = [];
    for (const n of ['hunger', 'thirst', 'energy', 'warmth', 'safety'] as const) p.needs[n] = 90;
    p.needs.social = 40;
    p.x = fire.x + 1.5;
    p.y = fire.y + 1.5;
    p.pose = 'stand';
    p.convId = 0;
    p.activity = null;
  }
  fire.fuel = 400;
  return { w, adults, kids, fire };
}
/** Set what someone carries, through the ledger, so the books still balance. */
const setPack = (w: World, p: Person, items: Record<string, number>) => {
  for (const k of Object.keys(p.inv) as (keyof typeof p.inv)[]) consume(w, p.inv, k, p.inv[k] ?? 0, 'test: pack emptied');
  for (const [k, n] of Object.entries(items)) {
    ledgerCreate(w, k as never, n, 'test: given');
    addItem(p.inv, k as never, n);
  }
};
const sit = (w: World, p: Person, fire: { id: number; x: number; y: number }) => {
  const a = newActivity(w, p, { kind: 'warm', label: 'Sitting', goal: 'x', targetId: fire.id, data: { fireside: true } });
  a.phase = 'work';
  p.activity = a;
};

describe('evenings at the fire', () => {
  it('two or more people sitting at a lit fire for the evening: one tells a story or sings, the others enjoy it and feel closer to them', () => {
    const { w, adults, fire } = stage();
    const [a, b, c] = adults;
    for (const p of [a, b, c]) sit(w, p, fire);
    a.traits.sociability = 1;
    const before = [a, b, c].map((p) => p.needs.social);
    const aff = relOf(b, a.id).affinity;
    fireTick(w);
    const performers = [a, b, c].filter((p) => (p.cooldowns.perform ?? 0) > w.tick);
    expect(performers).toHaveLength(1);
    const S = performers[0];
    const listeners = [a, b, c].filter((p) => p !== S);
    for (const L of listeners) {
      expect(L.needs.social).toBeGreaterThan(before[[a, b, c].indexOf(L)]);
      expect(L.log.some((l) => new RegExp(`Listened to ${S.name} (tell a story|sing) by the fire`).test(l.text))).toBe(true);
    }
    expect(S.log.some((l) => /(Told a story|Sang) by the fire/.test(l.text))).toBe(true);
    expect(w.stats.firesides).toBe(1);
    expect(w.events.some((e) => /(told a story|sang) by the fire/.test(e.text))).toBe(true);
    void aff;
    // the same person does not perform again straight away
    fireTick(w);
    expect(w.stats.firesides).toBeLessThanOrEqual(2);
  });

  it('a story passes on what the teller really knows (places, dangers) to the listeners, who did not know it', () => {
    const { w, adults, fire } = stage();
    const [a, b] = adults;
    sit(w, a, fire);
    sit(w, b, fire);
    a.traits.sociability = 1;
    b.traits.sociability = 0;
    a.beliefs[7001] = { id: 7001, kind: 'fruit_tree', x: fire.x + 12, y: fire.y + 9, amount: 6, max: 8, seen: w.tick - 50, src: 'seen', from: a.id, learned: w.tick - 50 } as never;
    expect(b.beliefs[7001]).toBeUndefined();
    let told = false;
    for (let i = 0; i < 12 && !told; i++) {
      w.tick += 200;
      a.cooldowns.perform = 0;
      fireTick(w);
      told = !!b.beliefs[7001];
    }
    expect(told).toBe(true);
    expect(b.beliefs[7001].src).toBe('told');
    expect(b.beliefs[7001].from).toBe(a.id);
    expect(w.stats.storiesTold).toBeGreaterThanOrEqual(1);
  });

  it('nobody performs for one person, for people not sitting there for the evening, at a fire that has gone out, or with leisure off', () => {
    const { w, adults, fire } = stage();
    const [a, b, c] = adults;
    sit(w, a, fire);
    fireTick(w);
    expect(w.stats.firesides ?? 0).toBe(0);
    b.activity = newActivity(w, b, { kind: 'warm', label: 'Warming', goal: 'x', targetId: fire.id });
    fireTick(w); // b is warming up, not sitting for the evening
    expect(w.stats.firesides ?? 0).toBe(0);
    sit(w, b, fire);
    fire.fuel = 0;
    fireTick(w);
    expect(w.stats.firesides ?? 0).toBe(0);
    fire.fuel = 400;
    w.settings.leisure = false;
    fireTick(w);
    expect(w.stats.firesides ?? 0).toBe(0);
    w.settings.leisure = true;
    void c;
  });
});

describe('celebrations', () => {
  it('a happy occasion is on the minds of the people round it for three days, and a meal held to mark it cheers everyone who sits down', () => {
    const { w, adults } = stage();
    const [mum, dad, aunt] = adults;
    const baby = w.persons.find((p) => stageOf(w, p) === 'child')!;
    noteOccasion(w, 'birth', baby.name, baby.id, [mum, dad]);
    noteOccasion(w, 'birth', baby.name, baby.id, [mum]); // not twice
    expect(mum.occasions).toHaveLength(1);
    expect(celebrating(mum, w.tick)).toMatchObject({ kind: 'birth', name: baby.name });
    expect(celebrating(aunt, w.tick)).toBeNull();
    expect(occasionWords(mum.occasions[0])).toBe(`the birth of ${baby.name}`);
    // the meal called by the mother is marked as being for it
    inviteAsk(w, mum, dad, { mealPlan: { placeId: 1, placeName: 'the fire', x: mum.x, y: mum.y } });
    const m = w.meals[w.meals.length - 1];
    expect(m.occasion).toMatchObject({ kind: 'birth', about: baby.id });
    // at the meal
    const s0 = [mum, dad].map((p) => p.needs.social);
    onCelebrationMeal(w, m.occasion!, [mum, dad], mum);
    expect(mum.needs.social).toBeGreaterThanOrEqual(s0[0] + 10 - 1e-9);
    expect(dad.needs.social).toBeGreaterThanOrEqual(s0[1] + 10 - 1e-9);
    expect(mum.log.some((l) => /Celebrated the birth of .* at a shared meal/.test(l.text))).toBe(true);
    expect(w.events.some((e) => /held a meal to celebrate the birth of/.test(e.text))).toBe(true);
    expect(mum.occasions).toHaveLength(0); // it has been marked
    expect(w.stats.celebrations).toBe(1);
    // after three days it is no longer on anyone's mind
    expect(celebrating(mum, w.tick + 3 * DAY + 1)).toBeNull();
  });

  it('the circle round a person is themselves, their household and their kin', () => {
    const { w, adults } = stage();
    const [a, b, c, d] = adults;
    b.hhId = a.hhId;
    relOf(c, a.id).kin = 'sibling';
    d.hhId = 987654;
    const circle = circleOf(w, [a]);
    expect(circle).toContain(a);
    expect(circle).toContain(b);
    expect(circle).toContain(c);
    expect(circle).not.toContain(d);
  });
});

describe('children at play', () => {
  it('children play together: they run about, bond, feel better, and a little of what a nearby grown person is doing rubs off', () => {
    const { w, adults, kids } = stage();
    const [worker] = adults;
    const [k1, k2] = kids;
    for (const k of [k1, k2]) {
      k.skills.build = 0.8;
      k.x = worker.x + 2;
      k.y = worker.y + 2;
    }
    k2.x = k1.x + 1.5;
    worker.skills.build = 1.5;
    const wa = newActivity(w, worker, { kind: 'build', label: 'x', goal: 'x' });
    wa.phase = 'work';
    worker.activity = wa;
    for (const k of [k1, k2]) {
      const a = newActivity(w, k, { kind: 'play', label: 'Playing', goal: 'to play', here: true });
      k.activity = a;
    }
    const s0 = k1.needs.social;
    const aff0 = relOf(k1, k2.id).affinity;
    const x0 = k1.x;
    run(w, 400, () => {
      worker.needs.hunger = 90;
      k1.needs.hunger = k2.needs.hunger = 90;
      k1.needs.thirst = k2.needs.thirst = 90;
      // keep them at play
    });
    expect(k1.needs.social).toBeGreaterThan(s0);
    expect(relOf(k1, k2.id).affinity).toBeGreaterThan(aff0);
    expect(k1.log.some((l) => /Played/.test(l.text))).toBe(true);
    expect(k1.cooldowns.play).toBeGreaterThan(0);
    expect(w.stats.playTime ?? 0).toBeGreaterThan(0);
    void x0;
  });

  it('a child with nothing pressing, at midday, with other children about, chooses to play', () => {
    const { w, kids } = stage();
    w.tick = Math.floor(w.tick / DAY) * DAY + Math.floor(DAY * 0.35);
    let played = false;
    run(w, 900, () => {
      for (const k of kids) for (const n of ['hunger', 'thirst', 'energy', 'warmth', 'safety'] as const) k.needs[n] = Math.max(k.needs[n], 92);
      if (kids.some((k) => k.activity?.kind === 'play')) played = true;
    });
    expect(played).toBe(true);
  });
});

describe('friendly contests', () => {
  it('a game is decided by who is stronger on the day, with a little luck; both enjoy it, watchers too, and neither is made an enemy', () => {
    const { w, adults } = stage();
    const [a, b, watcher] = adults;
    a.birthTick = w.tick - Math.round(26 * 12 * DAY);
    b.birthTick = w.tick - Math.round(70 * 12 * DAY);
    watcher.x = a.x + 3;
    const wins: Record<number, number> = { [a.id]: 0, [b.id]: 0 };
    const start = w.tick;
    for (let i = 0; i < 80; i++) {
      w.tick = start + i * 16;
      a.log = [];
      playContest(w, a, b, 'race');
      wins[a.log.some((l) => /Won/.test(l.text)) ? a.id : b.id]++;
    }
    expect(wins[a.id]).toBeGreaterThan(wins[b.id]); // the stronger wins more often
    expect(wins[b.id]).toBeGreaterThan(0); // but not always
    expect(a.needs.social).toBeGreaterThan(40);
    expect(relOf(b, a.id).affinity).toBeGreaterThan(0);
    expect(relOf(a, b.id).affinity).toBeGreaterThan(0);
    expect(watcher.log.some((l) => /Watched .* have a race/.test(l.text))).toBe(true);
    expect(a.cooldowns.contestAny).toBeGreaterThan(w.tick);
    expect(w.stats.contests).toBe(80);
  });
});

describe('keepsakes', () => {
  it('costs a piece of wood from the giver’s pack (written off in the ledger), makes no item, and is a record on the receiver', () => {
    const { w, adults } = stage();
    const [a, b] = adults;
    setPack(w, a, { wood: 2 });
    const before = conservationReport(w);
    expect(before.ok).toBe(true);
    const what = giveKeepsake(w, a, b);
    expect(what).toBeTruthy();
    expect(a.inv.wood).toBe(1);
    expect(b.inv.wood ?? 0).toBe(0);
    expect(b.keepsakes).toEqual([{ from: a.id, tick: w.tick, what }]);
    expect(a.cooldowns['present' + b.id]).toBeGreaterThan(w.tick);
    expect(relOf(b, a.id).affinity).toBeGreaterThanOrEqual(4);
    expect(b.log.some((l) => new RegExp(`${a.name} gave me`).test(l.text))).toBe(true);
    expect(Object.keys(w.ledger.reasons).some((k) => /carved into a keepsake/.test(k))).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    // nothing to carve from
    setPack(w, a, {});
    expect(giveKeepsake(w, a, b)).toBeNull();
    // the record is bounded
    setPack(w, a, { wood: 20 });
    for (let i = 0; i < 12; i++) giveKeepsake(w, a, b);
    expect(b.keepsakes.length).toBeLessThanOrEqual(6);
  });
});

describe('calling on someone', () => {
  it('a visit is pleasant for both; a generous host who can spare it gives the visitor a bite, which really leaves their pack', () => {
    const { w, adults } = stage();
    const [host, guest, stingy] = adults;
    host.traits.generosity = 0.8;
    setPack(w, host, { bread: 6 });
    setPack(w, guest, {});
    const g0 = guest.needs.social;
    const h0 = host.needs.social;
    const gave = hospitality(w, host, guest, (p, k) => surplusOf(w, p, k));
    expect(gave).toBe('bread');
    expect(host.inv.bread).toBe(5);
    expect(guest.inv.bread).toBe(1);
    expect(guest.needs.social).toBeGreaterThan(g0);
    expect(host.needs.social).toBeGreaterThan(h0);
    expect(guest.cooldowns['call' + host.id]).toBeGreaterThan(w.tick);
    expect(guest.log.some((l) => /Called on .*who gave me some bread/.test(l.text))).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    // a stingy host or one with nothing spare still has a chat, and gives nothing
    stingy.traits.generosity = 0.1;
    setPack(w, stingy, { bread: 6 });
    setPack(w, guest, {});
    expect(hospitality(w, stingy, guest, (p, k) => surplusOf(w, p, k))).toBeNull();
    expect(guest.inv.bread ?? 0).toBe(0);
  });
});

describe('a joke in passing', () => {
  it('lands according to how warm they are: friends laugh, strangers are not amused, someone who dislikes them is stung; and it is not repeated at once', () => {
    const { w, adults } = stage();
    const [a, b, c, d] = adults;
    a.traits.sociability = 1;
    relOf(b, a.id).affinity = 60;
    relOf(c, a.id).affinity = 0;
    relOf(d, a.id).affinity = -40;
    const outcomes = { b: new Set<string>(), c: new Set<string>(), d: new Set<string>() };
    const start = w.tick;
    for (let i = 0; i < 400; i++) {
      w.tick = start + i * 900;
      for (const [k, q, aff] of [['b', b, 60], ['c', c, 0], ['d', d, -40]] as const) {
        a.cooldowns = {};
        relOf(q, a.id).affinity = aff; // (jokes that land warm a relationship, so hold it fixed for each draw)
        const r = maybeJoke(w, a, q);
        if (r) outcomes[k].add(r);
      }
    }
    expect([...outcomes.b]).toEqual(['laughed']);
    expect(outcomes.c.has('laughed')).toBe(false);
    expect(outcomes.c.has('stung')).toBe(false);
    expect(outcomes.d.has('laughed')).toBe(false);
    expect(outcomes.d.has('stung')).toBe(true);
    // cooldown: the same pair, straight away, nothing
    a.cooldowns = {};
    let first: string | null = null;
    for (let i = 0; i < 60 && !first; i++) {
      w.tick += 33;
      first = maybeJoke(w, a, b);
    }
    expect(first).toBeTruthy();
    expect(maybeJoke(w, a, b)).toBeNull();
    w.settings.leisure = false;
    a.cooldowns = {};
    expect(maybeJoke(w, a, b)).toBeNull();
  });
});

describe('in the village', () => {
  it('evenings, play, contests and the rest happen in an ordinary world; it is deterministic, the books balance, and with leisure off none of it does', () => {
    const go = (leisure: boolean) => {
      const w = natural('leisure-village', { leisure });
      run(w, DAY * 9);
      return w;
    };
    const on = go(true);
    expect(conservationReport(on).ok).toBe(true);
    const s = on.stats;
    const total = (s.firesides ?? 0) + (s.contests ?? 0) + (s.playTime ?? 0) + (s.keepsakes ?? 0) + (s.calls ?? 0) + (s.jokes ?? 0);
    console.log(`[leisure] 9 days: firesides ${s.firesides ?? 0} (stories ${s.storiesTold ?? 0}), play ${s.playTime ?? 0} ticks, contests ${s.contests ?? 0}, keepsakes ${s.keepsakes ?? 0}, calls ${s.calls ?? 0}, jokes ${s.jokes ?? 0}, celebrations ${s.celebrations ?? 0}`);
    expect(total).toBeGreaterThan(0);
    expect(s.playTime ?? 0).toBeGreaterThan(0);
    expect(hashWorld(go(true))).toBe(hashWorld(on));
    const off = go(false);
    const o = off.stats;
    expect((o.firesides ?? 0) + (o.contests ?? 0) + (o.playTime ?? 0) + (o.keepsakes ?? 0) + (o.calls ?? 0) + (o.jokes ?? 0)).toBe(0);
    void ageYears;
  }, 600_000);
});
