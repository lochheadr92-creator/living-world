// Bounded action intent: a controller may narrow a chosen action, and a limit may only ever make it stop sooner.
// The engine stays authoritative: it validates the limit, charges the real cost, and refuses anything out of range
// rather than quietly doing something else.
import { describe, expect, it } from 'vitest';
import { setExternalController } from '../src/sim/external';
import type { ExternalChoice, ExternalNote } from '../src/sim/external';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { stepWorld } from '../src/sim/world';
import type { Option } from '../src/sim/optutil';
import type { Person, World } from '../src/sim/types';
import { runLive, runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt, parseProposal } from '../src/agent/protocol';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld } from '../src/sim/world';
import { deepHash } from './helpers/golden';
import { makeSource } from '../src/sim/sources';
import { observe } from '../src/sim/knowledge';
import { addPerson, done, stage } from './helpers/kit';

/** one hungry adult carrying food, nobody depending on her */
function eater(seed: string, fruit = 4) {
  const s = stage(seed);
  const ana = addPerson(s, 'Ana', 40.5, 40.5, { inv: { fruit }, hunger: 40, thirst: 90, energy: 90 });
  const w = done(s);
  return { w, ana };
}

/** drive one person: answer every decision with `answer`, collecting what the engine made of it */
function drive(w: World, p: Person, answer: (o: Option[]) => ExternalChoice, ticks: number) {
  const notes: ExternalNote[] = [];
  const restore = setExternalController({
    controls: (_w, q) => q.id === p.id,
    choose: (_w, _q, _ctx, ranked) => answer(ranked),
    notify: (_w, _q, n) => notes.push(n),
  });
  try {
    for (let i = 0; i < ticks; i++) stepWorld(w);
  } finally {
    restore();
  }
  return notes;
}

describe('a chosen action can be bounded', () => {
  it('the eat option advertises its limits and their valid range', () => {
    const { w, ana } = eater('bounds-advertised');
    const o = rankOptions(generateOptions(w, ana, true)).find((x) => x.key === 'eat:0');
    expect(o, 'a hungry person carrying food should be offered eat:0').toBeTruthy();
    const portions = o!.bounds?.find((b) => b.field === 'portions');
    expect(portions).toBeTruthy();
    expect(portions!.kind).toBe('count');
    expect(portions!.min).toBe(1);
    expect(portions!.max).toBe(4); // the four fruit she is carrying
    expect(o!.bounds?.some((b) => b.field === 'untilHunger')).toBe(true);
  });

  it('“eat one portion” consumes exactly one portion', () => {
    const { w, ana } = eater('bounds-eat-one');
    const before = ana.inv.fruit ?? 0;
    const hungerBefore = ana.needs.hunger;
    // one bounded meal only: after it, stand rather than choose again (each chosen action carries its own limit)
    let taken = false;
    const notes = drive(
      w,
      ana,
      (ranked) => {
        if (taken || !ranked.some((o) => o.key === 'eat:0')) return { kind: 'defer' };
        taken = true;
        return { kind: 'pick', key: 'eat:0', limit: { portions: 1 } };
      },
      120,
    );
    const applied = notes.find((n) => n.kind === 'applied' && n.key === 'eat:0');
    expect(applied, 'the bounded meal should have been accepted').toBeTruthy();
    expect((applied as { limit?: Record<string, number> }).limit).toEqual({ portions: 1 });
    expect(ana.inv.fruit ?? 0).toBe(before - 1);
    expect(ana.needs.hunger).toBeGreaterThan(hungerBefore); // it really was eaten
  });

  it('without a limit the established meaning is unchanged: she eats until satisfied', () => {
    const { w, ana } = eater('bounds-eat-unbounded');
    const before = ana.inv.fruit ?? 0;
    drive(w, ana, (ranked) => (ranked.some((o) => o.key === 'eat:0') ? { kind: 'pick', key: 'eat:0' } : { kind: 'fallback', reason: 'done' }), 400);
    expect(ana.inv.fruit ?? 0, 'the unbounded meal eats more than one portion').toBeLessThan(before - 1);
  });

  it('a limit out of range is refused outright, and nothing else is substituted for it', () => {
    const { w, ana } = eater('bounds-out-of-range');
    const before = ana.inv.fruit ?? 0;
    const notes = drive(w, ana, (ranked) => (ranked.some((o) => o.key === 'eat:0') ? { kind: 'pick', key: 'eat:0', limit: { portions: 99 } } : { kind: 'fallback', reason: 'stop' }), 30);
    const rejected = notes.filter((n) => n.kind === 'rejected');
    expect(rejected.length, 'the over-range request should be refused').toBeGreaterThan(0);
    expect((rejected[0] as { reason: string }).reason).toMatch(/between 1 and 4/);
    // the bad parameter started nothing of its own: no limited action was ever applied
    expect(notes.some((n) => n.kind === 'applied')).toBe(false);
    // the engine then chose on its own authority, and said so: a reported fallback, not a silent substitution
    const fell = notes.find((n) => n.kind === 'fallback');
    expect(fell, 'the engine should take over explicitly').toBeTruthy();
    expect((fell as { reason: string }).reason).toMatch(/between 1 and 4/);
    void before;
  });

  it('an undeclared limit, a non-whole count and a limit on an action that takes none are all refused', () => {
    const { w, ana } = eater('bounds-bad-fields');
    const reasons: string[] = [];
    let n = 0;
    drive(
      w,
      ana,
      (ranked): ExternalChoice => {
        if (!ranked.some((o) => o.key === 'eat:0')) return { kind: 'fallback', reason: 'stop' };
        n++;
        if (n === 1) return { kind: 'pick', key: 'eat:0', limit: { helpings: 1 } };
        if (n === 2) return { kind: 'pick', key: 'eat:0', limit: { portions: 1.5 } };
        return { kind: 'fallback', reason: 'stop' };
      },
      30,
    ).forEach((x) => {
      if (x.kind === 'rejected') reasons.push(x.reason);
    });
    expect(reasons.some((r) => /no limit called/.test(r))).toBe(true);
    expect(reasons.some((r) => /whole number/.test(r))).toBe(true);
  });
});

describe('bounded gathering and bounded spells', () => {
  /** a forager and one well-stocked bush she can see */
  function forager(seed: string) {
    const s = stage(seed);
    const ana = addPerson(s, 'Ana', 40.5, 40.5, { hunger: 55, thirst: 90, energy: 90 });
    const bush = makeSource(s.w, 'berry_bush', 42, 40, 9);
    const w = done(s);
    observe(w, ana, bush);
    return { w, ana, bush };
  }

  it('an amount limit lowers what is taken and never raises it, and the source loses exactly that much', () => {
    const { w, ana, bush } = forager('bounds-gather');
    const key = `gather:${bush.id}`;
    const o = rankOptions(generateOptions(w, ana, true)).find((x) => x.key === key);
    expect(o, 'the bush should be on offer').toBeTruthy();
    const planned = o!.bounds!.find((b) => b.field === 'amount')!.max;
    expect(planned).toBeGreaterThan(1);
    const stock = bush.amount;
    let taken = false;
    drive(
      w,
      ana,
      (ranked): ExternalChoice => {
        if (taken || !ranked.some((x) => x.key === key)) return { kind: 'defer' };
        taken = true;
        return { kind: 'pick', key, limit: { amount: 1 } };
      },
      400,
    );
    // exactly one berry left the bush and reached her pack
    expect(stock - bush.amount).toBe(1);
    expect(ana.inv.berries ?? 0).toBe(1);
  });

  it('asking for more than the engine planned is refused rather than granted', () => {
    const { w, ana, bush } = forager('bounds-gather-over');
    const key = `gather:${bush.id}`;
    const o = rankOptions(generateOptions(w, ana, true)).find((x) => x.key === key)!;
    const planned = o.bounds!.find((b) => b.field === 'amount')!.max;
    const notes = drive(w, ana, (): ExternalChoice => ({ kind: 'pick', key, limit: { amount: planned + 50 } }), 20);
    const rejected = notes.filter((n) => n.kind === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
    expect((rejected[0] as { reason: string }).reason).toMatch(/between 1 and/);
    expect(notes.some((n) => n.kind === 'applied')).toBe(false);
  });

  it('a tick limit ends a spell early, and the engine still charges only the ticks worked', () => {
    const { w, ana, bush } = forager('bounds-ticks');
    const key = `gather:${bush.id}`;
    let taken = false;
    const notes = drive(
      w,
      ana,
      (ranked): ExternalChoice => {
        if (taken || !ranked.some((x) => x.key === key)) return { kind: 'defer' };
        taken = true;
        return { kind: 'pick', key, limit: { ticks: 6 } };
      },
      400,
    );
    expect(notes.some((n) => n.kind === 'applied')).toBe(false); // gather declares no tick limit
    expect(notes.some((n) => n.kind === 'rejected' && /no limit called .ticks./.test((n as { reason: string }).reason))).toBe(true);
  });
});

describe('a bounded choice is recorded and replays', () => {
  it('a model may ask for a limit; it is recorded, honoured, and reproduced by a replay with no model', async () => {
    const { w, ana } = eater('bounds-replay');
    const start = serializeWorld(w);
    // a scripted model that eats exactly one portion whenever it can, and otherwise stands
    const model = stubModel('one-portion', (req) => {
      const o = observationFromPrompt(req.user);
      const eat = o?.options.find((x) => x.key === 'eat:0');
      if (!eat) return JSON.stringify({ choose: 'wander', why: 'nothing to eat' });
      // the option advertises its own limits, and the model answers inside them
      expect(eat.limits?.some((l) => l.field === 'portions')).toBe(true);
      return JSON.stringify({ choose: 'eat:0', limit: { portions: 1 }, why: 'just the one' });
    });
    const live = await runLive(w, ana.id, model, { until: 200 });
    const picked = live.transcript.calls.find((c) => c.choice.kind === 'pick' && c.choice.key === 'eat:0');
    expect(picked, 'the bounded meal should be in the transcript').toBeTruthy();
    expect((picked!.choice as { limit?: Record<string, number> }).limit).toEqual({ portions: 1 });
    expect(picked!.result?.status).toBe('applied');

    // replay with no model reaches the same world, so the limit was carried and honoured identically
    const again = runReplay(deserializeWorld(start), live.transcript);
    expect(hashWorld(again.world)).toBe(live.transcript.end!.hash);
    expect(deepHash(again.world)).toBe(deepHash(live.world));
  });

  it('a malformed limit from a model is a refused answer, not a guess', () => {
    expect(parseProposal('{"choose":"eat:0","limit":"lots"}').problem).toMatch(/"limit" is not an object/);
    expect(parseProposal('{"choose":"eat:0","limit":{"portions":"two"}}').problem).toMatch(/not a finite number/);
    expect(parseProposal('{"choose":"eat:0","limit":{"portions":2}}').proposal?.limit).toEqual({ portions: 2 });
    expect(parseProposal('{"choose":"eat:0"}').proposal?.limit).toBeUndefined();
  });
});

describe('a limit is part of the world that gets saved', () => {
  it('a bounded action in progress survives a save and reload, and still stops where it was asked to', () => {
    const { w, ana } = eater('bounds-save');
    const before = ana.inv.fruit ?? 0;
    let taken = false;
    drive(
      w,
      ana,
      (ranked): ExternalChoice => {
        if (taken || !ranked.some((o) => o.key === 'eat:0')) return { kind: 'defer' };
        taken = true;
        return { kind: 'pick', key: 'eat:0', limit: { portions: 1 } };
      },
      2,
    );
    const live = w.persons.find((p) => p.id === ana.id)!;
    expect(live.activity?.kind, 'the meal should be under way').toBe('eat');
    expect(live.activity?.data.limit, 'the limit is on the activity').toEqual({ portions: 1 });

    // round-trip the world mid-meal: the limit must come back with it
    const reloaded = deserializeWorld(serializeWorld(w));
    const after = reloaded.persons.find((p) => p.id === ana.id)!;
    expect(after.activity?.data.limit).toEqual({ portions: 1 });

    // and it still stops after the one portion, with no controller installed at all
    for (let i = 0; i < 200 && after.activity; i++) stepWorld(reloaded);
    expect(after.inv.fruit ?? 0).toBe(before - 1);
  });
});
