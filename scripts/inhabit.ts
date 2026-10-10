// Let an outside model inhabit one person (docs/INHABITANT.md), replay a recorded run without the model, or run the same window
// with nobody driven from outside. Writes a transcript and a plain report into --out.
//
//   npx vite-node scripts/inhabit.ts -- --mode live --seed meadow --person Mira --from-day 1 --days 1 --model claude-opus-5-5 --out inhabit_out
//   npx vite-node scripts/inhabit.ts -- --mode live --api openai --model gpt-5 --seed meadow --from-day 1 --days 1 --out inhabit_out
//   npx vite-node scripts/inhabit.ts -- --mode live --stub last --seed meadow --from-day 1 --days 0.5 --out inhabit_out     (no key: a scripted model)
//   npx vite-node scripts/inhabit.ts -- --mode replay --transcript inhabit_out/transcript.json --out inhabit_out
//   npx vite-node scripts/inhabit.ts -- --mode standard --seed meadow --person Mira --from-day 1 --days 1 --out inhabit_out
//
// Other flags: --api anthropic|openai (keys: ANTHROPIC_API_KEY / OPENAI_API_KEY)  --effort low|medium|high (OpenAI: only sent when given)
//              --memory (the inhabitant keeps notes between decisions: protocol inhabitant/2)  --stub first|last|cycle|garbage|goal|goal-blind
//              --profile normal|large|huge  --harsh  --dynamics rich  --show-scores  --overwrite (an existing transcript in --out is otherwise kept)
//              --max-calls-per-day N  --timeout-ms N  --max-output-tokens N  --max-failures N  --allow-source-drift
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_BUDGET, stubModel } from '../src/agent/model';
import type { Budget, ModelClient } from '../src/agent/model';
import { observationFromPrompt } from '../src/agent/protocol';
import { runLive, runReplay, runStandard } from '../src/agent/run';
import { goalKeeperModel } from '../src/agent/stubs';
import { ReplayDiverged } from '../src/agent/transcript';
import type { Transcript } from '../src/agent/transcript';
import { DAY } from '../src/sim/constants';
import { clockText } from '../src/sim/environment';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { hashString } from '../src/sim/rng';
import type { Settings, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { anthropicModel } from './inhabit/anthropic';
import { openaiModel } from './inhabit/openai';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const flag = (name: string): boolean => args.includes('--' + name);

const mode = opt('mode', 'standard');
const out = opt('out', 'inhabit_out');
mkdirSync(out, { recursive: true });

/** a fingerprint of the simulation's and the agent's sources, so a transcript says which code made it */
function sourcesFingerprint(): string {
  const files: string[] = [];
  for (const dir of ['src/sim', 'src/agent', 'src/app']) for (const f of readdirSync(dir).sort()) if (f.endsWith('.ts')) files.push(join(dir, f));
  let text = '';
  for (const f of files) text += f + '\n' + readFileSync(f, 'utf8');
  return hashString(text).toString(16).padStart(8, '0');
}

function worldFor(settings: Settings, tick: number): World {
  const w = createWorld(settings);
  while (w.tick < tick) stepWorld(w);
  return w;
}

function pickPerson(w: World, name: string): number {
  if (name) {
    const p = w.persons.find((q) => q.alive && q.name === name);
    if (!p) throw new Error(`no living person called ${name}; try one of: ${w.persons.filter((q) => q.alive).map((q) => q.name).join(', ')}`);
    return p.id;
  }
  const adults = w.persons.filter((q) => q.alive && (w.tick - q.birthTick) / DAY / 12 >= 20);
  if (!adults.length) throw new Error('no adult to inhabit');
  return adults[0].id;
}

function modelFrom(): ModelClient {
  const stub = opt('stub', '');
  if (stub === 'goal') return goalKeeperModel();
  if (stub === 'goal-blind') return goalKeeperModel({ readNotes: false });
  if (stub) {
    const pick = (o: ReturnType<typeof observationFromPrompt>, n: number): string => {
      if (!o || !o.options.length) return 'wander';
      if (stub === 'first') return o.options[0].key;
      if (stub === 'last') return o.options[o.options.length - 1].key;
      if (stub === 'cycle') return o.options[n % o.options.length].key;
      if (stub === 'garbage') return 'teleport:anywhere';
      throw new Error(`unknown stub "${stub}" (first, last, cycle, garbage, goal, goal-blind)`);
    };
    return stubModel(`stub:${stub}`, (req, n) => JSON.stringify({ choose: pick(observationFromPrompt(req.user), n), why: `scripted: ${stub}` }));
  }
  const api = opt('api', 'anthropic');
  if (api === 'openai') {
    const effort = opt('effort', '');
    return openaiModel({ model: opt('model', 'gpt-5'), ...(effort ? { effort: effort as 'low' | 'medium' | 'high' } : {}) });
  }
  if (api !== 'anthropic') throw new Error(`unknown --api "${api}" (anthropic, openai)`);
  return anthropicModel({ model: opt('model', 'claude-opus-5-5'), effort: opt('effort', 'medium') as 'low' | 'medium' | 'high' });
}

function budgetFrom(): Budget {
  return {
    maxCallsPerDay: Number(opt('max-calls-per-day', String(DEFAULT_BUDGET.maxCallsPerDay))),
    maxInputChars: DEFAULT_BUDGET.maxInputChars,
    maxOutputTokens: Number(opt('max-output-tokens', String(DEFAULT_BUDGET.maxOutputTokens))),
    timeoutMs: Number(opt('timeout-ms', String(DEFAULT_BUDGET.timeoutMs))),
    maxConsecutiveFailures: Number(opt('max-failures', String(DEFAULT_BUDGET.maxConsecutiveFailures))),
  };
}

/** the person at the end of a window, the same line for a live and a standard run so the two can be set side by side */
function personSummary(w: World, id: number, name: string): string {
  const p = w.persons.find((q) => q.id === id);
  if (!p || !p.alive) {
    const d = w.deceased.find((x) => x.id === id);
    return `${name}: died${d ? ` at tick ${d.tick} (${d.cause})` : ''}`;
  }
  const needs = (Object.keys(p.needs) as (keyof typeof p.needs)[]).map((k) => `${k} ${Math.round(p.needs[k])}`).join(', ');
  const inv = Object.entries(p.inv)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(', ');
  return `${name}: alive, health ${Math.round(p.health)}; needs ${needs}; carrying ${inv || 'nothing'}; lifetime ${JSON.stringify(p.stats)}; knows ${Object.keys(p.beliefs).length} places; promises ${p.commitments.length}`;
}

function report(t: Transcript, w: World): string {
  const h = t.header;
  const lines: string[] = [];
  lines.push(`${h.mode} run: ${h.personName} (#${h.personId}) in ${h.seed} (${h.settings.profile ?? 'village'}${h.settings.harsh ? ', harsh' : ''}${h.settings.dynamics === 'rich' ? ', rich' : ''}), tick ${h.startTick} to ${t.end?.tick ?? w.tick}`);
  lines.push(`model ${h.model.id} (${h.model.kind}) ${JSON.stringify(h.model.config)}; protocol ${h.protocol}; sim ${h.sim.behaviour}${h.sim.sources ? ' / ' + h.sim.sources : ''}`);
  lines.push(`budget ${JSON.stringify(h.budget)}`);
  if (t.end) lines.push(`end: tick ${t.end.tick} hash ${t.end.hash}${t.end.died ? ' (the person died)' : ''}; calls ${t.end.calls}, applied ${t.end.applied}, refused ${t.end.rejected}, engine chose ${t.end.fallbacks}, lagged ${t.end.lagged}; gate ${JSON.stringify(t.end.gate)}${t.end.notesHash ? `; notes ${t.end.notesHash}` : ''}`);
  lines.push(personSummary(w, h.personId, h.personName));
  const state = w.inhabitants?.[h.personId];
  if (state?.memory) lines.push(`memory: ${JSON.stringify(state.memory)}`);
  lines.push('');
  lines.push('decisions (tick clock | offered | picked -> result | model\'s reason | what came of it)');
  const outcomeOf = new Map(t.outcomes.map((o) => [o.call, o]));
  for (const c of t.calls) {
    const a = t.asks[c.ask];
    const label = c.choice.kind === 'pick' ? `${a.observation.options.find((o) => o.key === (c.choice as { key: string }).key)?.label ?? '(not offered)'} [${c.choice.key}]` : c.choice.kind === 'fallback' ? `engine (${c.choice.reason})` : 'deferred';
    const res = c.result ? (c.result.status === 'applied' ? 'applied' : c.result.status === 'rejected' ? `refused: ${c.result.reason}` : `engine chose ${c.result.label ?? 'nothing'}`) : '-';
    const oc = outcomeOf.get(c.seq);
    lines.push(`t${c.tick} ${clockText(c.tick)} | ${a.observation.options.length} options | ${label} -> ${res} | ${a.proposal?.why ?? a.problem ?? ''} | ${oc ? `${oc.outcome}${oc.detail ? ': ' + oc.detail : ''} (t${oc.tick})` : ''}`);
  }
  for (const c of t.calls) {
    if (!c.revision) continue;
    const r = c.revision;
    const moved = Object.entries({ new: r.new, kept: r.kept, strengthened: r.strengthened, weakened: r.weakened, revised: r.revised, abandoned: r.abandoned, goalsAdopted: r.goalsAdopted, goalsDropped: r.goalsDropped, rejectedEntries: r.rejectedEntries, truncated: r.truncated, trimmed: r.trimmed }).filter(([, n]) => n > 0);
    if (moved.length || r.problems.length) lines.push(`  notes at t${c.tick}: ${moved.map(([k, n]) => `${k} ${n}`).join(', ')}${r.problems.length ? ' | ' + r.problems.join('; ') : ''}`);
  }
  if (state?.notes) {
    lines.push('');
    lines.push('the inhabitant\'s notes at the end (its own words; never read by the simulation):');
    lines.push(JSON.stringify(state.notes, null, 1));
  }
  if (t.overrides.length) {
    lines.push('');
    lines.push('the engine ended the person\'s activity on its own authority:');
    for (const o of t.overrides) lines.push(`t${o.tick} ${clockText(o.tick)} ${o.label}: ${o.why}`);
  }
  if (t.observer.length) {
    lines.push('');
    lines.push('observer: the village\'s record of this person between decisions (never shown to the model)');
    for (const o of t.observer) for (const e of o.events) lines.push(`t${e.tick} [${e.kind}] ${e.text}`);
  }
  return lines.join('\n') + '\n';
}

async function main(): Promise<void> {
  const sources = sourcesFingerprint();
  if (mode === 'replay') {
    const path = opt('transcript', join(out, 'transcript.json'));
    const t = JSON.parse(readFileSync(path, 'utf8')) as Transcript;
    const w = worldFor(t.header.settings, t.header.startTick);
    try {
      const r = runReplay(w, t, { sources, allowSourceDrift: flag('allow-source-drift') });
      const text = `replay of ${path}: OK\nended at tick ${r.world.tick} in state ${hashWorld(r.world)} (recorded ${t.end?.hash}); ${t.calls.length} decisions consumed, ${t.overrides.length} overrides matched\n${r.warnings.map((x) => 'warning: ' + x + '\n').join('')}`;
      writeFileSync(join(out, 'replay.txt'), text);
      console.log(text);
    } catch (e) {
      const text = `replay of ${path}: DIVERGED\n${e instanceof ReplayDiverged ? e.message : String(e)}\n`;
      writeFileSync(join(out, 'replay.txt'), text);
      console.log(text);
      process.exitCode = 1;
    }
    return;
  }

  const profile = opt('profile', 'normal') as ProfileName;
  const settings = settingsForProfile(profile, opt('seed', 'meadow'), { harsh: flag('harsh'), immigration: !flag('no-arrivals'), dynamics: opt('dynamics', 'authored') as 'authored' | 'rich' });
  const from = Math.round(Number(opt('from-day', '1')) * DAY);
  const until = from + Math.round(Number(opt('days', '1')) * DAY);
  const w = worldFor(settings, from);
  const personId = pickPerson(w, opt('person', ''));
  const person = w.persons.find((p) => p.id === personId)!;

  if (mode === 'standard') {
    runStandard(w, until);
    const text = `standard run: ${person.name} (#${personId}) in ${settings.seed}${flag('harsh') ? ' (harsh)' : ''}, tick ${from} to ${until}\nend hash ${hashWorld(w)}\n${personSummary(w, personId, person.name)}\n`;
    writeFileSync(join(out, 'standard.txt'), text);
    console.log(text);
    return;
  }
  if (mode !== 'live') throw new Error(`unknown mode "${mode}" (standard, live, replay)`);

  const transcriptPath = join(out, 'transcript.json');
  if (existsSync(transcriptPath) && !flag('overwrite')) throw new Error(`${transcriptPath} exists; choose another --out or pass --overwrite (a recorded run is kept unless you say so)`);
  const model = modelFrom();
  const budget = budgetFrom();
  console.log(`${person.name} (#${personId}) is driven by ${model.id} from tick ${from} to ${until} (${((until - from) / DAY).toFixed(2)} days)${flag('memory') ? ', keeping notes' : ''}…`);
  let lastSaid = Date.now();
  const r = await runLive(w, personId, model, {
    until,
    budget,
    sources,
    memory: flag('memory'),
    observe: { showScores: flag('show-scores') },
    onTick: (world) => {
      if (Date.now() - lastSaid > 5000) {
        lastSaid = Date.now();
        process.stderr.write(`  tick ${world.tick} (${((world.tick - from) / DAY).toFixed(2)} days)\n`);
      }
    },
  });
  writeFileSync(transcriptPath, JSON.stringify(r.transcript));
  const text = report(r.transcript, r.world);
  writeFileSync(join(out, 'report.txt'), text);
  console.log(text);
  console.log(`transcript saved in ${transcriptPath} (${(readFileSync(transcriptPath).length / 1024).toFixed(0)} KB); report in ${join(out, 'report.txt')}`);
  if (!existsSync(transcriptPath)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exitCode = 1;
});
