// Set two recorded inhabitant runs side by side (docs/INHABITANT.md): did the two inhabitants actually behave differently?
//
//   npx vite-node scripts/inhabit_diff.ts -- experiments/baseline-pavel-gpt5 experiments/memory-pavel-gpt5
//
// The world hash in a transcript's end record cannot answer that question on its own: hashWorld folds the inhabitant's own state
// (its turn and fallback counts, and with --memory the notes it wrote) into the world (`src/sim/world.ts`, the E term), so a memory
// run and a no-memory run that did exactly the same things still end on different hashes. This replays both with no model and hashes
// each end state a second time with world.inhabitants removed: that second number compares the worlds alone. A folder or a
// transcript.json may be named.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runReplay } from '../src/agent/run';
import type { Transcript } from '../src/agent/transcript';
import { createWorld } from '../src/sim/factory';
import { hashWorld, stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';

const args = process.argv.slice(2).filter((a) => a !== '--');
if (args.length !== 2) throw new Error('name two runs: a folder holding transcript.json, or the file itself');

function load(p: string): { path: string; t: Transcript } {
  const path = existsSync(join(p, 'transcript.json')) ? join(p, 'transcript.json') : p;
  if (!existsSync(path)) throw new Error(`no transcript at ${path}`);
  return { path, t: JSON.parse(readFileSync(path, 'utf8')) as Transcript };
}

/** the end state hashed twice: as the transcript records it, and with the inhabitant's own state taken out */
function replayHashes(t: Transcript): { recorded: string; replayed: string; behaviour: string; warnings: string[] } {
  const w = createWorld(t.header.settings);
  while (w.tick < t.header.startTick) stepWorld(w);
  const r = runReplay(w, t, { allowSourceDrift: true });
  const replayed = hashWorld(r.world);
  const keep = r.world.inhabitants;
  delete r.world.inhabitants;
  const behaviour = hashWorld(r.world);
  r.world.inhabitants = keep;
  return { recorded: t.end?.hash ?? '-', replayed, behaviour, warnings: r.warnings };
}

const A = load(args[0]);
const B = load(args[1]);
const out: string[] = [];
const say = (s = '') => out.push(s);

say(`A  ${A.path}`);
say(`B  ${B.path}`);
say();
const row = (label: string, a: string, b: string) => say(`${label.padEnd(16)} ${a.padEnd(30)} ${b}${a === b ? '' : '   <- differ'}`);
row('person', `${A.t.header.personName} (#${A.t.header.personId})`, `${B.t.header.personName} (#${B.t.header.personId})`);
row('protocol', A.t.header.protocol, B.t.header.protocol);
row('model', A.t.header.model.id, B.t.header.model.id);
row('seed', A.t.header.seed, B.t.header.seed);
row('window', `${A.t.header.startTick}..${A.t.end?.tick ?? '?'}`, `${B.t.header.startTick}..${B.t.end?.tick ?? '?'}`);
row('sim behaviour', A.t.header.sim.behaviour, B.t.header.sim.behaviour);

say();
say('decisions (tick | chosen | outcome)');
const n = Math.max(A.t.asks.length, B.t.asks.length);
let firstDiff = -1;
for (let i = 0; i < n; i++) {
  const a = A.t.asks[i];
  const b = B.t.asks[i];
  const oc = (t: Transcript, seq: number): string => {
    const o = t.outcomes.find((x) => x.call === seq);
    return o ? `${o.outcome}${o.detail ? ` (${o.detail})` : ''}` : '-';
  };
  const left = a ? `t${a.tick} ${String(a.proposal?.choose ?? '-').padEnd(14)} ${oc(A.t, a.seq)}` : '-';
  const right = b ? `t${b.tick} ${String(b.proposal?.choose ?? '-').padEnd(14)} ${oc(B.t, b.seq)}` : '-';
  const same = !!a && !!b && a.tick === b.tick && a.proposal?.choose === b.proposal?.choose;
  if (!same && firstDiff < 0) firstDiff = i;
  say(`  ${String(i).padStart(3)}  ${left.padEnd(46)} ${right}${same ? '' : '   <- differ'}`);
}

say();
const ha = replayHashes(A.t);
const hb = replayHashes(B.t);
for (const [name, h] of [['A', ha], ['B', hb]] as const) {
  say(`${name}: recorded ${h.recorded}  replayed ${h.replayed}  ${h.replayed === h.recorded ? 'OK' : 'MISMATCH'}   world without the inhabitant's own state: ${h.behaviour}`);
  for (const w of h.warnings) say(`   warning: ${w}`);
}

say();
if (ha.behaviour === hb.behaviour) {
  say(`VERDICT: the two worlds are the same (${ha.behaviour}). The end hashes ${ha.recorded} and ${hb.recorded} differ only by what the`);
  say('inhabitant itself carries (its counts, and with memory the notes). Nothing the two inhabitants did came out differently.');
} else {
  say(`VERDICT: the worlds really differ (${ha.behaviour} against ${hb.behaviour})`);
  say(firstDiff >= 0 ? `first decision that differs: #${firstDiff}` : 'every decision matched, so the divergence is between decisions');
}

say();
const g = (t: Transcript) => (t.end?.gate ?? {}) as Record<string, number | string | null>;
say(`cost            A                              B`);
for (const k of ['calls', 'inputChars', 'outputTokens', 'failures', 'refused']) row(`  ${k}`, String(g(A.t)[k] ?? '-'), String(g(B.t)[k] ?? '-'));
row('  days', ((((A.t.end?.tick ?? 0) - A.t.header.startTick) / DAY) || 0).toFixed(2), ((((B.t.end?.tick ?? 0) - B.t.header.startTick) / DAY) || 0).toFixed(2));

console.log('\n' + out.join('\n') + '\n');
