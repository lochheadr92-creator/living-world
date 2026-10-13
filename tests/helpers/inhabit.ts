// Shared fixtures for the AI inhabitant tests.
import { observeInhabitant } from '../../src/agent/observe';
import type { InhabitantObservation } from '../../src/agent/observe';
import { stubModel } from '../../src/agent/model';
import type { ModelClient } from '../../src/agent/model';
import { observationFromPrompt } from '../../src/agent/protocol';
import type { Transcript } from '../../src/agent/transcript';
import { householdOf } from '../../src/sim/buildings';
import { generateOptions, rankOptions } from '../../src/sim/decision';
import { membersOf } from '../../src/sim/households';
import { RNG } from '../../src/sim/rng';
import { testKit } from '../../src/sim/scenes';
import { makeSource } from '../../src/sim/sources';
import type { Person, World } from '../../src/sim/types';
import { settingsFor } from './util';

/** a hungry person, a second person, and one berry bush well outside anyone's sight (the knowledge tests' fixture) */
export function remoteBushWorld(seed = 'inhabitant-bush') {
  const w = testKit.flatWorld(settingsFor(seed, { scene: 'help' }));
  w.camp = { x: 40.5, y: 36.5 };
  const rng = new RNG(5);
  const ben = testKit.addPerson(w, rng, { name: 'Ben', x: 40.5, y: 44.5, sex: 'm', hunger: 25 });
  const ana = testKit.addPerson(w, rng, { name: 'Ana', x: 42.5, y: 44.5, hunger: 80 });
  const bush = makeSource(w, 'berry_bush', 40, 74, 6);
  testKit.finish(w, 'help');
  return { w, bush, ben, ana };
}

/** the observation the engine would hand a controller for this person right now (pure) */
export function observeNow(w: World, p: Person, showScores = false, version?: number): InhabitantObservation {
  const ctx = generateOptions(w, p, true);
  return observeInhabitant(w, p, ctx, rankOptions(ctx), { showScores, ...(version ? { version } : {}) });
}

/** every id the person's own records refer to */
export function knownIds(w: World, p: Person): Set<number> {
  const known = new Set<number>([p.id]);
  for (const k in p.beliefs) known.add(Number(k));
  for (const s of p.seen) known.add(s.id);
  for (const k in p.whereabouts) known.add(Number(k));
  for (const k in p.relations) known.add(Number(k));
  for (const m of membersOf(w, householdOf(w, p))) known.add(m.id);
  for (const id of [...p.parents, ...p.children, p.partnerId]) if (id) known.add(id);
  for (const c of p.commitments) {
    known.add(c.to);
    if (c.siteId) known.add(c.siteId);
    if (c.destId) known.add(c.destId);
  }
  for (const c of p.concerns) known.add(c.about);
  for (const r of w.requests)
    if (r.from === p.id || r.to === p.id) {
      known.add(r.from);
      known.add(r.to);
      if (r.siteId) known.add(r.siteId);
    }
  return known;
}

/** a scripted model that reads the offered options back out of the prompt */
export function chooser(id: string, pick: (obs: InhabitantObservation, call: number) => string): ModelClient {
  return stubModel(id, (req, n) => {
    const obs = observationFromPrompt(req.user);
    if (!obs) throw new Error('no observation in the prompt');
    return JSON.stringify({ choose: pick(obs, n), why: `test model ${id}` });
  });
}
export const lastOption = chooser('last-option', (o) => o.options[o.options.length - 1].key);
export const firstOption = chooser('first-option', (o) => o.options[0].key);

export function adult(w: World): Person {
  const p = w.persons.find((q) => q.alive && (w.tick - q.birthTick) / 2400 / 12 >= 20);
  if (!p) throw new Error('no adult');
  return p;
}

export function offeredKeys(t: Transcript, askSeq: number): string[] {
  return t.asks[askSeq].observation.options.map((o) => o.key);
}
