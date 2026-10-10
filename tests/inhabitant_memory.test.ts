// The AI inhabitant's persistent memory (docs/INHABITANT.md, section 4): notes a driven person keeps between decisions. These tests
// hold that the notes persist, survive a save, replay without a model and refuse tampering, are bounded and validated, cannot carry
// anything the person was not shown, can be revised and abandoned, survive a failing model, leave ordinary worlds alone, and change
// nothing in the simulation; and that the scripted goal keeper's pursuit of a site comes from its notes, not from the engine's offer.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { LIMITS, applyNoteUpdate, emptyCounters, emptyNotes, notesHash, observationRefs, parseNoteUpdate } from '../src/agent/memory';
import type { NoteUpdate } from '../src/agent/memory';
import { DEFAULT_BUDGET, stubModel } from '../src/agent/model';
import type { ModelClient } from '../src/agent/model';
import { PROTOCOL_V1, PROTOCOL_V2, SYSTEM_PROMPT, buildPrompt, notesFromPrompt, observationFromPrompt, parseProposal } from '../src/agent/protocol';
import { markInhabitant, runLive, runReplay, runStandard } from '../src/agent/run';
import { goalKeeperModel } from '../src/agent/stubs';
import { ReplayDiverged } from '../src/agent/transcript';
import type { Transcript } from '../src/agent/transcript';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import type { InhabitantState, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { deepHash } from './helpers/golden';
import { adult, observeNow, remoteBushWorld } from './helpers/inhabit';
import { natural, run } from './helpers/util';

const DAY = 2400;

/** the baseline window: seed meadow, Pavel, from tick 2400 */
let pavelStart: { text: string; id: number } | null = null;
function pavelWorld(): { w: World; id: number } {
  if (!pavelStart) {
    const w = natural('meadow');
    run(w, DAY);
    const p = w.persons.find((q) => q.name === 'Pavel')!;
    pavelStart = { text: serializeWorld(w), id: p.id };
  }
  return { w: deserializeWorld(pavelStart.text), id: pavelStart.id };
}

/** a model whose answer carries whatever notes the test wants, choosing the first option */
function noting(id: string, notes: (call: number, user: string) => unknown): ModelClient {
  return stubModel(id, (req, n) => {
    const o = observationFromPrompt(req.user)!;
    return JSON.stringify({ choose: o.options[0].key, why: id, notes: notes(n, req.user) });
  });
}

function stateOf(w: World, id: number): InhabitantState {
  const s = w.inhabitants?.[id];
  if (!s) throw new Error('not marked');
  return s;
}

const SITE_KEY = /^(haul|build):(\d+)$/;

describe('the goal keeper experiment (seed meadow, Pavel, the baseline window)', () => {
  const UNTIL = DAY + 700;
  it('pursues a site from its notes where the same offer, without notes read, is left on the table', async () => {
    const memory = pavelWorld();
    const blind = pavelWorld();
    const none = pavelWorld();
    const m = await runLive(memory.w, memory.id, goalKeeperModel(), { until: UNTIL, memory: true });
    const b = await runLive(blind.w, blind.id, goalKeeperModel({ readNotes: false }), { until: UNTIL, memory: true });
    const n = await runLive(none.w, none.id, goalKeeperModel(), { until: UNTIL });
    const firstOf = (t: Transcript, askSeq: number) => t.asks[askSeq].observation.options[0].key;
    const applied = (t: Transcript) => t.calls.filter((c) => c.result?.status === 'applied');

    // 1-2: the engine offered work at a site, and the goal was adopted then
    const st = stateOf(m.world, memory.id);
    expect(st.notes!.goals.length).toBe(1);
    const siteId = Number(/\[place:(\d+)\]/.exec(st.notes!.goals[0].text)![1]);
    const adoption = m.transcript.calls.find((c) => c.revision && c.revision.goalsAdopted > 0)!;
    expect(adoption).toBeTruthy();
    expect(m.transcript.asks[adoption.ask].observation.options.some((o) => SITE_KEY.test(o.key) && o.key.endsWith(':' + siteId))).toBe(true);

    // the controls take the first option every time; the memory arm did not, and what it chose advanced the site it noted
    for (const c of applied(b.transcript)) expect(c.result!.key).toBe(firstOf(b.transcript, c.ask));
    for (const c of applied(n.transcript)) expect(c.result!.key).toBe(firstOf(n.transcript, c.ask));
    const pursued = applied(m.transcript).filter((c) => c.result!.key !== firstOf(m.transcript, c.ask));
    expect(pursued.length).toBeGreaterThan(0);
    for (const c of pursued) {
      expect(c.result!.key!.endsWith(':' + siteId)).toBe(true);
      // 6: the goal was in the notes it was shown at that ask
      expect(m.transcript.asks[c.ask].notes!.goals.some((g) => g.text.includes(`[place:${siteId}]`))).toBe(true);
    }
    // the very same offer (same observation, same tick) was put to the control, which left it on the table
    const first = pursued[0]!;
    const twin = b.transcript.asks.find((a) => a.tick === first.tick);
    expect(twin, 'the control reached the same decision point').toBeTruthy();
    expect(twin!.observationHash).toBe(m.transcript.asks[first.ask].observationHash);
    expect(twin!.observation.options.some((o) => o.key === first.result!.key)).toBe(true);
    const twinCall = b.transcript.calls.find((c) => c.ask === twin!.seq && c.result?.status === 'applied')!;
    expect(twinCall.result!.key).not.toBe(first.result!.key);

    // 3-4: the pursued action fell short, and the goal was kept afterwards
    const outcome = m.transcript.outcomes.find((o) => o.call === first.seq)!;
    expect(['partial', 'failed', 'interrupted']).toContain(outcome.outcome);
    // the ask at the tick the activity ended is the one where the outcome is first seen
    const later = m.transcript.asks.filter((a) => a.tick >= outcome.tick);
    expect(later.length).toBeGreaterThan(0);
    for (const a of later) expect(a.notes!.goals.some((g) => g.text.includes(`[place:${siteId}]`))).toBe(true);
    // 8: the notes were brought up to date with what actually happened
    expect(st.notes!.journal.some((j) => j.text.includes(outcome.outcome) && j.tick > outcome.tick - 1)).toBe(true);
    // and inferences moved: at least one made and one changed
    expect(st.memory!.new).toBeGreaterThanOrEqual(2);
    expect(st.memory!.revised + st.memory!.weakened + st.memory!.strengthened).toBeGreaterThanOrEqual(1);
    // 11: authority and conservation held throughout
    for (const c of applied(m.transcript)) expect(m.transcript.asks[c.ask].observation.options.map((o) => o.key)).toContain(c.result!.key);
    expect(conservationReport(m.world).diffs).toEqual([]);
    expect(m.transcript.end!.lagged).toBe(0);
    expect(m.transcript.header.protocol).toBe(PROTOCOL_V2);
    expect(n.transcript.header.protocol).toBe(PROTOCOL_V1);
  }, 600_000);
});

describe('persistent notes', () => {
  async function noted(seed: string, ticks = 600) {
    const w = natural(seed);
    run(w, 300);
    const p = adult(w);
    const start = serializeWorld(w);
    const model = noting('noter', (n, user) => {
      const o = observationFromPrompt(user)!;
      const prev = notesFromPrompt(user)!;
      const place = o.remembered.places[0];
      return {
        goals: [...prev.goals.map((g) => ({ id: g.id, text: g.text })), ...(prev.goals.length ? [] : [{ text: 'Keep the household fed' }])],
        intentions: [{ text: `turn ${n}` }],
        inferences: place ? [{ id: prev.inferences[0]?.id, text: `the ${place.what} is worth remembering`, confidence: Math.min(1, 0.5 + n * 0.1), basis: [`place:${place.id}`] }] : [],
        uncertainties: prev.uncertainties.length ? prev.uncertainties.map((u) => ({ id: u.id, text: u.text })) : [{ text: 'whether winter comes early' }],
        journal: `turn ${n}: ${o.doing.lastResult ? o.doing.lastResult.outcome : 'start'}`,
      };
    });
    const r = await runLive(w, p.id, model, { until: 300 + ticks, memory: true });
    return { ...r, start, id: p.id };
  }

  it('1. carry from one decision to the next: each ask is shown what the one before wrote', async () => {
    const r = await noted('memory-persist');
    const asks = r.transcript.asks;
    expect(asks.length).toBeGreaterThan(2);
    expect(asks[0].notes).toEqual(emptyNotes());
    for (let i = 1; i < asks.length; i++) {
      expect(asks[i].notes!.journal.length).toBe(Math.min(i, LIMITS.journal));
      expect(asks[i].notes!.goals[0].text).toBe('Keep the household fed');
      expect(asks[i].notes!.intentions[0].text).toBe(`turn ${i - 1}`);
    }
    const st = stateOf(r.world, r.id);
    expect(st.notes!.goals[0].id).toBe('g1');
    expect(st.memory!.updates).toBe(asks.length);
    expect(st.memory!.strengthened).toBeGreaterThan(0); // confidence rose turn by turn on the one inference
  });

  it('2. survive a save: the notes come back untouched and the hashes agree', async () => {
    const r = await noted('memory-save', 400);
    const back = deserializeWorld(serializeWorld(r.world));
    expect(back.inhabitants![r.id].notes).toEqual(stateOf(r.world, r.id).notes);
    expect(back.inhabitants![r.id].memory).toEqual(stateOf(r.world, r.id).memory);
    expect(hashWorld(back)).toBe(hashWorld(r.world));
    expect(deepHash(back)).toBe(deepHash(r.world));
    runStandard(r.world, r.world.tick + 100);
    runStandard(back, back.tick + 100);
    expect(hashWorld(back)).toBe(hashWorld(r.world));
  });

  it('3. replay without a model to the same world and the same notes', async () => {
    const r = await noted('memory-replay', 500);
    const again = runReplay(deserializeWorld(r.start), r.transcript);
    expect(hashWorld(again.world)).toBe(hashWorld(r.world));
    expect(again.world.inhabitants![r.id].notes).toEqual(stateOf(r.world, r.id).notes);
    expect(notesHash(again.world.inhabitants![r.id].notes)).toBe(r.transcript.end!.notesHash);
  });

  it('4. refuse a tampered, missing or reordered memory update', async () => {
    const r = await noted('memory-tamper', 500);
    const t = r.transcript;
    const copy = (): Transcript => JSON.parse(JSON.stringify(t)) as Transcript;
    const fresh = () => deserializeWorld(r.start);
    const k = t.calls.find((c) => c.result?.status === 'applied' && t.asks[c.ask].proposal?.notes)!.ask;

    let x = copy();
    x.asks[k].proposal!.notes!.goals = [{ text: 'Rule the village' }];
    expect(() => runReplay(fresh(), x)).toThrow(/memory update/);
    x = copy();
    delete x.asks[k].proposal!.notes;
    expect(() => runReplay(fresh(), x)).toThrow(/memory update/);
    x = copy();
    x.asks[k].proposal!.notes!.inferences![0].confidence = 0.01;
    expect(() => runReplay(fresh(), x)).toThrow(/memory update/);
    x = copy();
    const a = t.calls.filter((c) => c.result?.status === 'applied');
    const i = x.calls.findIndex((c) => c.seq === a[0].seq);
    const j = x.calls.findIndex((c) => c.seq === a[1].seq);
    [x.calls[i].ask, x.calls[j].ask] = [x.calls[j].ask, x.calls[i].ask];
    expect(() => runReplay(fresh(), x)).toThrow(ReplayDiverged);
    x = copy();
    x.header.memory!.version = 99;
    expect(() => runReplay(fresh(), x)).toThrow(/memory version/);
    x = copy();
    x.header.memory!.limits.goals = 1;
    expect(() => runReplay(fresh(), x)).toThrow(/different limits/);
    // a run without memory cannot replay as one with it, nor the reverse
    x = copy();
    x.header.protocol = PROTOCOL_V1;
    expect(() => runReplay(fresh(), x)).toThrow(ReplayDiverged);
  });

  it('5. cannot be corrupted by invalid, oversized or malformed updates', async () => {
    const w = natural('memory-limits');
    run(w, 300);
    const p = adult(w);
    const huge = 'x'.repeat(5_000);
    const model = noting('flooder', (n) =>
      n % 4 === 0
        ? 'not an object'
        : n % 4 === 1
          ? { goals: Array.from({ length: 50 }, (_, i) => ({ text: huge + i })), intentions: [1, 2, 3], inferences: [{ text: 'sure thing', confidence: 7, basis: ['obs:0'] }, { text: 'no basis', confidence: 0.5, basis: [] }, { text: 'bad ref', confidence: 0.5, basis: ['place:999999', 'drop table', '../etc/passwd'] }], uncertainties: [{ text: huge }], journal: huge }
          : n % 4 === 2
            ? { goals: 'not a list' }
            : { journal: { text: 'fine' }, inferences: [{ text: 'first option again', confidence: -3, basis: [`option:${observationFromPrompt('')?.options[0]?.key ?? 'wander'}`] }] },
    );
    const a = await runLive(w, p.id, model, { until: 300 + 500, memory: true });
    const st = stateOf(a.world, p.id);
    expect(st.notes!.goals.length).toBeLessThanOrEqual(LIMITS.goals);
    for (const g of st.notes!.goals) expect(g.text.length).toBeLessThanOrEqual(LIMITS.textChars);
    for (const u of st.notes!.uncertainties) expect(u.text.length).toBeLessThanOrEqual(LIMITS.textChars);
    for (const j of st.notes!.journal) expect(j.text.length).toBeLessThanOrEqual(LIMITS.journalChars);
    for (const i of st.notes!.inferences) {
      expect(i.confidence).toBeGreaterThanOrEqual(0);
      expect(i.confidence).toBeLessThanOrEqual(1);
      expect(i.basis.length).toBeGreaterThan(0);
      for (const b of i.basis) expect(b).toMatch(/^(place|person|seen|memory|result|option|obs):/);
    }
    expect(JSON.stringify(st.notes).length).toBeLessThanOrEqual(LIMITS.totalChars);
    expect(st.memory!.rejectedEntries).toBeGreaterThan(0);
    expect(a.transcript.asks.some((x) => x.notesProblem !== null)).toBe(true);
    expect(a.transcript.asks.filter((x) => x.notesProblem !== null).every((x) => x.proposal !== null)).toBe(true); // the choice stood
    expect(conservationReport(a.world).diffs).toEqual([]);
    const b = await runLive(deserializeWorld(serializeWorld(natural('memory-limits'))), p.id, model, { until: 300 + 500, memory: true }).catch(() => null);
    void b; // a second run from a different start is not comparable; determinism is held by test 3 (replay)
  });

  it('6. one inhabitant cannot see another\'s notes', async () => {
    const w = natural('memory-privacy');
    run(w, 300);
    const [a, b] = w.persons.filter((q) => q.alive).slice(0, 2);
    markInhabitant(w, b.id, true);
    const secret = 'SECRET-b-plans-to-leave-the-village-9c1';
    w.inhabitants![b.id].notes!.goals.push({ id: 'g1', text: secret, since: w.tick });
    const model = noting('peeker', (_n, user) => {
      expect(user).not.toContain(secret);
      expect(notesFromPrompt(user)!.goals.some((g) => g.text === secret)).toBe(false);
      return { journal: 'looked around' };
    });
    const r = await runLive(w, a.id, model, { until: 300 + 300, memory: true });
    expect(r.transcript.asks.length).toBeGreaterThan(0);
    for (const ask of r.transcript.asks) expect(JSON.stringify(ask)).not.toContain(secret);
    expect(JSON.stringify(observeNow(r.world, r.world.byId.get(a.id) as never))).not.toContain(secret);
    expect(r.world.inhabitants![b.id].notes!.goals[0].text).toBe(secret); // B's own notes are untouched
  });

  it('7. cannot carry a reference to anything the person was not shown', async () => {
    const { w, bush, ben } = remoteBushWorld('memory-hidden');
    const model = noting('smuggler', () => ({
      inferences: [
        { text: 'there is a bush far to the south', confidence: 0.9, basis: [`place:${bush.id}`] },
        { text: 'I am hungry', confidence: 0.9, basis: [`obs:${w.tick}`, `obs:${w.tick + 1}`, 'obs:0'] },
      ],
      journal: `the bush at ${bush.id}`,
    }));
    const r = await runLive(w, ben.id, model, { until: w.tick + 200, memory: true });
    const st = stateOf(r.world, ben.id);
    expect(st.notes!.inferences.some((i) => i.basis.includes(`place:${bush.id}`))).toBe(false);
    expect(st.notes!.inferences.some((i) => i.text.includes('far to the south'))).toBe(false);
    expect(st.memory!.rejectedEntries).toBeGreaterThan(0);
    // free text is the model's own words and may say anything; it is never read by the engine, and the prompt marks it as such
    const prompt = buildPrompt({ observation: r.transcript.asks[0].observation, notes: st.notes, memory: true });
    expect(prompt.system).toMatch(/not facts about the world/);
  });

  it('8. an inference can be strengthened, weakened, revised and abandoned, and each move is counted', () => {
    const { w, ben } = remoteBushWorld('memory-revise');
    const obs = observeNow(w, ben);
    const refs = observationRefs(obs);
    expect(refs.has(`obs:${w.tick}`)).toBe(true);
    const state: InhabitantState = { since: 0, turns: 0, fallbacks: 0, notes: emptyNotes(), memory: emptyCounters() };
    const step = (u: NoteUpdate) => applyNoteUpdate(state, u, obs, w.tick);
    let r = step({ inferences: [{ text: 'Ana is a friend', confidence: 0.6, basis: [`obs:${w.tick}`] }] });
    expect(r.new).toBe(1);
    const id = state.notes!.inferences[0].id;
    r = step({ inferences: [{ id, text: 'Ana is a friend', confidence: 0.8, basis: [`obs:${w.tick}`] }] });
    expect(r.strengthened).toBe(1);
    r = step({ inferences: [{ id, text: 'Ana is a friend', confidence: 0.4, basis: [`obs:${w.tick}`] }] });
    expect(r.weakened).toBe(1);
    r = step({ inferences: [{ id, text: 'Ana is not a friend after all', confidence: 0.4, basis: [`obs:${w.tick}`] }] });
    expect(r.revised).toBe(1);
    expect(state.notes!.inferences[0].id).toBe(id);
    r = step({ inferences: [{ id, text: 'Ana is not a friend after all', confidence: 0.4, basis: [`obs:${w.tick}`] }] });
    expect(r.kept).toBe(1);
    r = step({ inferences: [] });
    expect(r.abandoned).toBe(1);
    expect(state.notes!.inferences).toEqual([]);
    expect(state.memory).toMatchObject({ new: 1, strengthened: 1, weakened: 1, revised: 1, kept: 1, abandoned: 1, updates: 6 });
    // a list left out is left alone; an unknown id is a new entry
    step({ goals: [{ text: 'a goal' }] });
    r = step({ inferences: [{ id: 'i999', text: 'made-up id', confidence: 0.5, basis: [`obs:${w.tick}`] }] });
    expect(r.new).toBe(1);
    expect(state.notes!.goals.length).toBe(1);
    expect(parseNoteUpdate({ goals: [{ text: 'x' }], inferences: 'nope' }).problem).toMatch(/inferences/);
  });

  it('9. a failing model leaves the notes exactly as they were', async () => {
    const r = await noted('memory-failure', 400);
    const before = JSON.stringify(stateOf(r.world, r.id).notes);
    const throwing = stubModel('throws', () => {
      throw new Error('boom');
    });
    const w2 = deserializeWorld(serializeWorld(r.world));
    const r2 = await runLive(w2, r.id, throwing, { until: w2.tick + 300, memory: true, budget: { ...DEFAULT_BUDGET, maxConsecutiveFailures: 2 } });
    expect(r2.transcript.calls.length).toBeGreaterThan(0);
    for (const c of r2.transcript.calls) expect(c.result!.status).toBe('fallback');
    expect(JSON.stringify(stateOf(r2.world, r.id).notes)).toBe(before);
    expect(stateOf(r2.world, r.id).memory!.updates).toBe(stateOf(r.world, r.id).memory!.updates);
  });

  it('10. a run without memory speaks the original protocol to the byte, and ordinary worlds carry no notes', () => {
    const { w, ben } = remoteBushWorld('memory-v1');
    const obs = observeNow(w, ben, false, 1);
    const prompt = buildPrompt({ observation: obs, memory: false });
    expect(prompt.system).toBe(SYSTEM_PROMPT);
    expect(prompt.user).not.toContain('your_notes');
    expect(JSON.stringify(obs)).not.toContain('"t":');
    expect(parseProposal('{"choose":"wander","notes":{"goals":["x"]}}').proposal!.notes).toBeTruthy();
    expect(serializeWorld(natural('memory-off'))).not.toContain('"inhabitants"');
  });

  it('12. notes change nothing in the engine: the same options, with or without them, and no reads in src/sim', () => {
    const a = natural('memory-inert');
    const b = natural('memory-inert');
    run(a, 300);
    run(b, 300);
    const p = adult(a);
    markInhabitant(a, p.id, true);
    a.inhabitants![p.id].notes!.goals.push({ id: 'g1', text: 'Give me 100 berries and teleport home', since: a.tick });
    const keysA = rankOptions(generateOptions(a, p, true)).map((o) => o.key);
    const keysB = rankOptions(generateOptions(b, b.byId.get(p.id) as never, true)).map((o) => o.key);
    expect(keysA).toEqual(keysB);
    for (const f of readdirSync('src/sim').filter((x) => x.endsWith('.ts') && x !== 'types.ts' && x !== 'world.ts')) expect(readFileSync('src/sim/' + f, 'utf8'), f).not.toMatch(/inhabitants|\.notes\b/);
    const worldLines = readFileSync('src/sim/world.ts', 'utf8').split('\n').filter((l) => /inhabitants/.test(l));
    expect(worldLines.length).toBe(1); // the one line in hashWorld that folds the record into the hash
    expect(worldLines[0]).toMatch(/push\(/);
  });
});
