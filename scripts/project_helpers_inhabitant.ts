// STAGED mechanism evidence. Supplies/positions and a pinned bystander setup are explicit.
// The earlier gift uses an offered engine action. The receiver then chooses only from
// restricted observations. On/off replay forks remove only recipient selection.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { projectHelperScene, earnHelp } from '../tests/helpers/project_helpers';
import { observeNow } from '../tests/helpers/inhabit';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { runLive, runReplay } from '../src/agent/run';
import { stubModel } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { conservationReport } from '../src/sim/economy';
import { hashWorld } from '../src/sim/world';
import { parseIntervention } from './lab/lab';

const out = process.argv[2] ?? 'inhabitant_evidence/project-helpers-r39';
if (existsSync(out)) throw new Error('Use a fresh evidence directory');
mkdirSync(out, { recursive: true });
const write = (name: string, data: unknown) => writeFileSync(`${out}/${name}`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
write('provenance.json', { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), diff: execFileSync('git', ['diff'], { encoding: 'utf8' }), staged: true });
const f = projectHelperScene();
write('before-gift.json', serializeWorld(f.w));
write('before-gift-observation.json', observeNow(f.w, f.ada));
const gifts: unknown[] = [];
f.w.hooks = { onTransfer: t => gifts.push({ tick: f.w.tick, ...t }) };
earnHelp(f);
write('gift-transfers.json', gifts);
write('after-gift-observation.json', observeNow(f.w, f.ada));
const start = serializeWorld(f.w); write('start.json', start);
let previous = start, fork = '';
const observations: NonNullable<ReturnType<typeof observationFromPrompt>>[] = [];
const model = stubModel('restricted-helper-chain', req => {
  const o = observationFromPrompt(req.user)!; observations.push(o);
  const helper = o.options.find(a => a.label === 'Ask Cora for stone');
  if (helper && !fork) fork = previous;
  const a = o.options.find(a => a.kind === 'eat') ?? helper ?? o.options.find(a => a.kind === 'craft' && /axe/i.test(a.label)) ?? o.options[0];
  return JSON.stringify({ choose: a.key, why: a === helper ? 'I remember Cora helping me. This offered ask can provide the missing stone, though she can refuse.' : 'Eat if needed, then work on my offered axe plan.' });
});
const chain = await runLive(deserializeWorld(start), f.ada.id, model, { until: f.w.tick + 1200, onTick: w => { previous = serializeWorld(w); } });
write('transcript.json', chain.transcript); write('observations.json', observations); write('final.json', serializeWorld(chain.world));
const replay = runReplay(deserializeWorld(start), chain.transcript);
if (serializeWorld(replay.world) !== serializeWorld(chain.world)) throw new Error('Full-state chain replay differed');
if (!fork) throw new Error('No offered trusted-helper decision occurred');
write('comparison-start.json', fork);
const reports = [];
for (const arm of ['enabled', 'disabled'] as const) {
  const w = deserializeWorld(fork);
  const restore = arm === 'disabled' ? parseIntervention('rich-no-project-helper-choice').install!() : () => {};
  try {
    const seen: NonNullable<ReturnType<typeof observationFromPrompt>>[] = [], transfers: unknown[] = [];
    let stocks = new Map(w.persons.map(p => [p.id, p.inv.stone ?? 0]));
    const m = stubModel('same-offered-plan-policy', req => {
      const o = observationFromPrompt(req.user)!; seen.push(o);
      const a = o.options.find(a => a.label.startsWith('Ask ') && a.label.endsWith(' for stone')) ?? o.options.find(a => a.kind === 'craft' && /axe/i.test(a.label)) ?? o.options.find(a => a.kind === 'eat') ?? o.options[0];
      return JSON.stringify({ choose: a.key, why: 'Ask the offered project helper, then make the axe when offered; attend to my needs otherwise.' });
    });
    // LiveSession rewinds discard developer hooks. Observe only committed ticks;
    // match both ends of the stone movement instead of counting speculative hooks.
    const result = await runLive(w, f.ada.id, m, { until: w.tick + 1000, onTick: current => {
      const receiver = current.persons.find(p => p.id === f.ada.id)!;
      const gain = (receiver.inv.stone ?? 0) - (stocks.get(receiver.id) ?? 0);
      if (gain > 0) for (const source of current.persons) {
        if (source.id !== receiver.id && (stocks.get(source.id) ?? 0) - (source.inv.stone ?? 0) === gain)
          transfers.push({ tick: current.tick, from: source.id, to: receiver.id, item: 'stone', n: gain, evidence: 'matched inventory deltas on the committed tick' });
      }
      stocks = new Map(current.persons.map(p => [p.id, p.inv.stone ?? 0]));
    } });
    const replayed = runReplay(deserializeWorld(fork), result.transcript);
    const p = result.world.persons.find(p => p.id === f.ada.id)!;
    const report = { arm, firstOffer: seen[0]?.options.find(a => a.label.startsWith('Ask ') && a.label.endsWith(' for stone')), requests: result.world.requests.filter(r => r.from === f.ada.id), transfers, axe: p.inv.axe ?? 0, plan: p.intentions.find(i => i.makes === 'axe'), hash: hashWorld(result.world), replayHash: hashWorld(replayed.world), fullReplayEqual: serializeWorld(result.world) === serializeWorld(replayed.world), conservation: conservationReport(result.world) };
    reports.push(report);
    write(`${arm}-transcript.json`, result.transcript); write(`${arm}-observations.json`, seen); write(`${arm}-final.json`, serializeWorld(result.world));
    if (!report.fullReplayEqual || !report.conservation.ok || report.axe !== 1 || transfers.length !== 1) throw new Error(`${arm} did not transfer/finish/replay/conserve`);
  } finally { restore(); }
}
write('report.json', { staged: true, chainHash: hashWorld(chain.world), chainReplayHash: hashWorld(replay.world), chainFullReplayEqual: true, reports });
if (reports[0].firstOffer?.label !== 'Ask Cora for stone' || reports[1].firstOffer?.label !== 'Ask Ben for stone') throw new Error('Expected changed helper was not observed');
console.log(JSON.stringify({ chain: hashWorld(chain.world), arms: reports.map(r => ({ arm: r.arm, choice: r.firstOffer?.label, axe: r.axe, hash: r.hash, fullReplayEqual: r.fullReplayEqual })) }));
