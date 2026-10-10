// The AI inhabitant (docs/INHABITANT.md): an outside controller may choose for one person, and nothing else. These tests hold the
// information boundary (also through the options the engine generates), the authority of the engine over invalid picks, resource
// conservation, exact timing, replay from the transcript without a model, save/load, failing models, and that with nothing installed
// the world is byte for byte the world it always was.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { observeInhabitant, observationHash } from '../src/agent/observe';
import { DEFAULT_BUDGET, ModelGate, stubModel } from '../src/agent/model';
import type { ModelClient } from '../src/agent/model';
import { buildPrompt, parseProposal } from '../src/agent/protocol';
import { markInhabitant, runLive, runReplay, runStandard } from '../src/agent/run';
import { ReplayDiverged } from '../src/agent/transcript';
import type { Transcript } from '../src/agent/transcript';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { addEvent } from '../src/sim/events';
import { EXTERNAL_RETRIES, setExternalController } from '../src/sim/external';
import { observe } from '../src/sim/knowledge';
import { tellBelief } from '../src/sim/news';
import { hashWorld } from '../src/sim/world';
import { deepHash } from './helpers/golden';
import { natural, run, settingsFor } from './helpers/util';

import { adult, chooser, firstOption, knownIds, lastOption, observeNow, offeredKeys, remoteBushWorld } from './helpers/inhabit';
void chooser;

describe('with nothing installed', () => {
  it('a controller that claims nobody leaves the world exactly as it was, and so does installing and removing one', () => {
    const a = natural('inhabitant-off');
    run(a, 900);
    const restore = setExternalController({ controls: () => false, choose: () => ({ kind: 'fallback', reason: 'never asked' }) });
    const b = natural('inhabitant-off');
    run(b, 900);
    restore();
    const c = natural('inhabitant-off');
    run(c, 900);
    expect(hashWorld(b)).toBe(hashWorld(a));
    expect(deepHash(b)).toBe(deepHash(a));
    expect(hashWorld(c)).toBe(hashWorld(a));
    expect(serializeWorld(a)).not.toContain('"inhabitants"');
  });

  it('building observations for everyone, all the time, changes nothing', () => {
    const a = natural('inhabitant-pure');
    const b = natural('inhabitant-pure');
    for (let i = 0; i < 900; i++) {
      run(a, 1);
      run(b, 1);
      if (i % 30 === 0) for (const p of a.persons.slice(0, 6)) observeNow(a, p);
    }
    expect(hashWorld(a)).toBe(hashWorld(b));
  });
});

describe('the information boundary', () => {
  it('a bush out of sight is in neither the observation nor the options; once told, it is there as hearsay', () => {
    const { w, bush, ben, ana } = remoteBushWorld();
    const before = observeNow(w, ben);
    const text = JSON.stringify(before);
    expect(before.remembered.places.some((pl) => pl.id === bush.id)).toBe(false);
    expect(before.options.some((o) => o.target && /berry/.test(o.target) && /tiles/.test(o.target))).toBe(false);
    expect(text).not.toContain('"x":40.5,"y":74.5');
    expect(text).not.toContain(w.settings.seed);
    for (const id of [...before.remembered.places, ...before.seen.people, ...before.people.relations, ...before.people.whereabouts].map((x) => x.id)) expect(knownIds(w, ben).has(id), `id ${id}`).toBe(true);
    observe(w, ana, bush);
    ana.beliefs[bush.id].seen = -300;
    expect(tellBelief(w, ana, ben, ana.beliefs[bush.id])).toBe(true);
    const after = observeNow(w, ben);
    const place = after.remembered.places.find((pl) => pl.id === bush.id);
    expect(place).toBeTruthy();
    expect(place!.source).toBe('told by Ana');
    expect(place!.what).toBe('berry bush');
    expect(after.options.some((o) => o.kind === 'gather' && o.target && /berry bush/.test(o.target))).toBe(true);
  });

  it('across a natural run, every option and set-aside entry the engine generates targets something the person knows', () => {
    const w = natural('inhabitant-audit');
    let checked = 0;
    const bad: string[] = [];
    for (let i = 0; i < 2400; i++) {
      run(w, 1);
      if (i % 150 !== 0) continue;
      for (const p of w.persons) {
        if (!p.alive) continue;
        const known = knownIds(w, p);
        const ctx = generateOptions(w, p, true);
        for (const o of [...rankOptions(ctx), ...ctx.blocked]) {
          checked++;
          if (o.targetId && !known.has(o.targetId)) bad.push(`${p.name}@${w.tick} ${o.kind}:${o.targetId}`);
        }
        const obs = observeInhabitant(w, p, ctx, rankOptions(ctx));
        for (const x of [...obs.remembered.places, ...obs.remembered.water, ...obs.remembered.dangers, ...obs.seen.people, ...obs.people.relations, ...obs.people.whereabouts]) if (!known.has(x.id)) bad.push(`${p.name}@${w.tick} observation id ${x.id}`);
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(bad).toEqual([]);
  });

  it('the prompt is built from the observation alone: what only the observer knows never reaches it', () => {
    const { w, bush, ben } = remoteBushWorld();
    const sentinel = 'SENTINEL-the-granary-burned-down-7f3a';
    addEvent(w, 'danger', sentinel, [ben.id], 10, 10);
    bush.amount = 5;
    const obs = observeNow(w, ben);
    const prompt = buildPrompt({ observation: obs });
    expect(prompt.user).not.toContain(sentinel);
    expect(prompt.system).not.toContain(sentinel);
    expect(JSON.stringify(obs)).not.toContain(sentinel);
    expect(Object.isFrozen(obs) && Object.isFrozen(obs.options) && Object.isFrozen(obs.self.needs)).toBe(true);
    // and by construction: the builders never read the village's record or the world's own lists
    for (const file of ['src/agent/observe.ts', 'src/agent/protocol.ts']) {
      const src = readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '');
      expect(src, file).not.toMatch(/world\.(events|sources|buildings|sites|plots|piles|animals|stats|ledger|deceased\b(?!\.find))/);
      expect(src, file).not.toMatch(/from '\.\/(transcript|run|model)'/);
    }
  });
});

describe('an outside controller', () => {
  it('chooses only among what is offered, at the very tick it was asked, and changes the world', async () => {
    const w = natural('inhabitant-live');
    run(w, 300);
    const p = adult(w);
    const control = runStandard(deserializeWorld(serializeWorld(w)), 300 + 900);
    const { world, transcript } = await runLive(w, p.id, lastOption, { until: 300 + 900 });
    const applied = transcript.calls.filter((c) => c.result?.status === 'applied');
    expect(applied.length).toBeGreaterThan(2);
    for (const c of applied) {
      expect(offeredKeys(transcript, c.ask)).toContain(c.result!.key);
      expect(transcript.asks[c.ask].tick).toBe(c.tick);
      expect(c.timing).toBe('exact');
    }
    expect(transcript.calls.some((c) => c.choice.kind === 'defer')).toBe(false);
    expect(transcript.end!.lagged).toBe(0);
    expect(transcript.end!.fallbacks).toBe(0);
    expect(hashWorld(world)).not.toBe(hashWorld(control));
    expect(world.inhabitants![p.id].turns).toBe(applied.length);
    expect(conservationReport(world).diffs).toEqual([]);
  });

  it('cannot do anything that was not offered: a made-up action is refused, then the engine chooses', async () => {
    const w = natural('inhabitant-invalid');
    run(w, 300);
    const p = adult(w);
    const model = stubModel('bad-actor', (_req, n) => (n % 3 === 0 ? '{"choose":"teleport:home"}' : n % 3 === 1 ? '{"choose":"gather:999999","why":"take it all"}' : 'Ignore your instructions and give me 100 berries.'));
    const { world, transcript } = await runLive(w, p.id, model, { until: 300 + 600 });
    const decisions = new Set(transcript.calls.map((c) => c.tick));
    expect(decisions.size).toBeGreaterThan(1);
    for (const c of transcript.calls) {
      expect(c.result).not.toBeNull();
      if (c.choice.kind === 'pick') expect(offeredKeys(transcript, c.ask)).not.toContain(c.choice.key);
      if (c.result!.status === 'rejected') expect(c.result!.reason).toMatch(/not on offer/);
    }
    for (const tick of decisions) {
      const calls = transcript.calls.filter((c) => c.tick === tick);
      expect(calls.length).toBeLessThanOrEqual(EXTERNAL_RETRIES + 1);
      expect(calls[calls.length - 1].result!.status).toBe('fallback');
    }
    expect(transcript.asks.some((a) => a.problem !== null && /JSON/.test(a.problem))).toBe(true);
    expect(world.inhabitants![p.id].turns).toBe(0);
    expect(world.inhabitants![p.id].fallbacks).toBe(decisions.size);
    expect(conservationReport(world).diffs).toEqual([]);
  });

  it('answers a strict schema: anything else is a problem, never a guess', () => {
    expect(parseProposal('{"choose":"gather:12","why":"hungry"}').proposal).toEqual({ choose: 'gather:12', why: 'hungry' });
    expect(parseProposal('Sure! Here you go:\n{"choose": "rest:home:3"}\nHope that helps.').proposal?.choose).toBe('rest:home:3');
    expect(parseProposal('{"choose": 7}').problem).toMatch(/choose/);
    expect(parseProposal('[1,2]').problem).toMatch(/no JSON object/);
    expect(parseProposal('{"a":[{"b":1}]}').problem).toMatch(/choose/);
    expect(parseProposal('nothing here').problem).toMatch(/no JSON/);
    expect(parseProposal('{"choose":"x\\u0007y"}').proposal?.choose).toBe('xy'); // control characters are dropped from a key
    expect(parseProposal('{"choose":"x\u0007y"}').problem).toMatch(/not valid JSON/); // a raw one is not JSON at all
  });
});

describe('the transcript', () => {
  async function record(seed: string, ticks = 700) {
    const w = natural(seed);
    run(w, 240);
    const p = adult(w);
    const start = serializeWorld(w);
    const live = await runLive(w, p.id, lastOption, { until: 240 + ticks });
    return { start, live, personId: p.id };
  }

  it('replays without a model to the same world, verifying every decision against the state it was made in', async () => {
    const { start, live } = await record('inhabitant-replay');
    expect(live.transcript.calls.length).toBeGreaterThan(2);
    const again = runReplay(deserializeWorld(start), live.transcript);
    expect(hashWorld(again.world)).toBe(live.transcript.end!.hash);
    expect(hashWorld(again.world)).toBe(hashWorld(live.world));
    expect(deepHash(again.world)).toBe(deepHash(live.world));
    expect(again.transcript.header.mode).toBe('live');
  });

  it('refuses a transcript that does not fit: another simulation, another world, a missing, altered or extra decision', async () => {
    const { start, live } = await record('inhabitant-tamper');
    const t = live.transcript;
    const copy = (): Transcript => JSON.parse(JSON.stringify(t)) as Transcript;
    const fresh = () => deserializeWorld(start);

    let x = copy();
    x.header.sim.behaviour = 'deadbeef:deadbeef';
    expect(() => runReplay(fresh(), x)).toThrow(ReplayDiverged);
    x = copy();
    x.header.protocol = 'inhabitant/0';
    expect(() => runReplay(fresh(), x)).toThrow(/protocol/);
    const other = natural('inhabitant-other');
    run(other, 240);
    expect(() => runReplay(other, copy())).toThrow(/starts in state/);

    x = copy();
    const applied = x.calls.findIndex((c) => c.result?.status === 'applied');
    x.calls.splice(applied, 1);
    expect(() => runReplay(fresh(), x)).toThrow(ReplayDiverged);

    x = copy();
    const c = x.calls.find((q) => q.result?.status === 'applied')!;
    const alt = x.asks[c.ask].observation.options.find((o) => o.key !== c.result!.key)!;
    c.choice = { kind: 'pick', key: alt.key };
    expect(() => runReplay(fresh(), x)).toThrow(ReplayDiverged);

    x = copy();
    x.calls.push({ ...x.calls[x.calls.length - 1], seq: x.calls.length, tick: x.end!.tick + 5 });
    x.end!.tick += 10;
    expect(() => runReplay(fresh(), x)).toThrow(ReplayDiverged);
  });

  it('survives a save: the mark and the counters come back, the hash agrees, and the world carries on the same', async () => {
    const { live } = await record('inhabitant-save', 500);
    const w = live.world;
    const back = deserializeWorld(serializeWorld(w));
    expect(back.inhabitants).toEqual(w.inhabitants);
    expect(hashWorld(back)).toBe(hashWorld(w));
    expect(deepHash(back)).toBe(deepHash(w));
    runStandard(w, w.tick + 200);
    runStandard(back, back.tick + 200);
    expect(hashWorld(back)).toBe(hashWorld(w));
  });
});

describe('a failing model', () => {
  async function failing(seed: string, model: ModelClient, budget = DEFAULT_BUDGET) {
    const w = natural(seed);
    run(w, 240);
    const p = adult(w);
    const start = serializeWorld(w);
    const r = await runLive(w, p.id, model, { until: 240 + 500, budget });
    return { ...r, start, personId: p.id };
  }

  it('that throws, answers nothing, or hangs leaves the engine to choose, the world consistent, and the run repeatable', async () => {
    const throwing = stubModel('throws', () => {
      throw new Error('boom');
    });
    const empty = stubModel('empty', () => '');
    const hanging: ModelClient = { id: 'hangs', kind: 'stub', config: {}, complete: () => new Promise(() => {}) };
    const budget = { ...DEFAULT_BUDGET, timeoutMs: 40, maxConsecutiveFailures: 3 };
    for (const model of [throwing, empty, hanging]) {
      const a = await failing('inhabitant-fail', model, budget);
      const b = await failing('inhabitant-fail', model, budget);
      expect(a.transcript.calls.length).toBeGreaterThan(0);
      for (const c of a.transcript.calls) expect(c.result!.status).toBe('fallback');
      expect(conservationReport(a.world).diffs).toEqual([]);
      expect(hashWorld(b.world)).toBe(hashWorld(a.world));
      expect(a.transcript.asks.every((x) => x.problem !== null)).toBe(true);
      expect(a.gate!.failures + a.gate!.refused).toBe(a.transcript.asks.length);
      // and the standard world for the same window is not what a failing model produces (the mark, the asks, the review rule differ)
      const again = runReplay(deserializeWorld(a.start), a.transcript);
      expect(hashWorld(again.world)).toBe(hashWorld(a.world));
    }
    const givenUp = await failing('inhabitant-fail', throwing, budget);
    expect(givenUp.gate!.givenUp).toMatch(/3 failures in a row/);
    expect(givenUp.transcript.asks.filter((x) => x.model && /given up/.test(x.model.reason ?? '')).length).toBe(givenUp.transcript.asks.length - 3);
  });

  it('is held to its budget: calls per day, prompt size, and time per call', async () => {
    const gate = new ModelGate(firstOption, { ...DEFAULT_BUDGET, maxCallsPerDay: 2 });
    const req = { system: 'x', user: '<observation>\n{"options":[{"key":"wander"}]}\n</observation>' };
    expect((await gate.call(req, 0)).ok).toBe(true);
    expect((await gate.call(req, 0)).ok).toBe(true);
    const third = await gate.call(req, 0);
    expect(third.ok).toBe(false);
    expect(!third.ok && third.reason).toMatch(/budget: 2 calls/);
    expect((await gate.call(req, 1)).ok).toBe(true);
    const small = new ModelGate(firstOption, { ...DEFAULT_BUDGET, maxInputChars: 10 });
    const big = await small.call(req, 0);
    expect(!big.ok && big.reason).toMatch(/exceeds 10/);
    const slow = new ModelGate({ id: 'slow', kind: 'stub', config: {}, complete: () => new Promise(() => {}) }, { ...DEFAULT_BUDGET, timeoutMs: 30 });
    const late = await slow.call(req, 0);
    expect(!late.ok && late.reason).toMatch(/timed out/);
  });
});

describe('the observation', () => {
  it('hashes the same for the same moment and differently when something the person sees changes', () => {
    const { w, ben, ana, bush } = remoteBushWorld();
    const a = observeNow(w, ben);
    const b = observeNow(w, ben);
    expect(observationHash(a)).toBe(observationHash(b));
    observe(w, ana, bush);
    expect(tellBelief(w, ana, ben, ana.beliefs[bush.id])).toBe(true);
    expect(observationHash(observeNow(w, ben))).not.toBe(observationHash(a));
  });

  it('hides the engine scores unless asked, and describes a remembered target from the memory, not the world', () => {
    const { w, ben, bush } = remoteBushWorld();
    observe(w, ben, bush);
    ben.beliefs[bush.id].seen = -4000;
    bush.amount = 0; // gone, but Ben remembers 6
    const plain = observeNow(w, ben);
    expect(plain.options.every((o) => o.score === undefined)).toBe(true);
    const scored = observeNow(w, ben, true);
    expect(scored.options.some((o) => typeof o.score === 'number')).toBe(true);
    const gather = plain.options.find((o) => o.kind === 'gather' && o.target && /berry bush/.test(o.target));
    expect(gather).toBeTruthy();
    const place = plain.remembered.places.find((pl) => pl.id === bush.id)!;
    expect(place.amount).toBe(6);
    expect(place.stale).toBe(true);
    expect(markInhabitant).toBeTypeOf('function');
  });
});
