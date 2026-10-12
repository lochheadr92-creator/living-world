// The counterfactual re-ask (src/agent/counterfactual.ts): put recorded decisions to the model again, with and without the notes, and
// see whether the choice moves. Nothing runs in the world. Costs model calls: asks x repeats x arms.
//
//   npx vite-node scripts/inhabit_counterfactual.ts -- --transcript experiments/harsh6-tomas-gpt5/transcript.json --asks auto --repeats 3 --api openai --model gpt-5
//   npx vite-node scripts/inhabit_counterfactual.ts -- --transcript experiments/memory-pavel-gpt5 --asks 3,4 --stub last    (no key: a scripted model)
//
// --asks auto takes the candidates attribution finds (words found only in the notes, or a noted goal carried out); --asks all, every
// decision. --no-both skips the with-notes arm (cheaper; then a difference cannot be read against the model's own variance). Writes
// counterfactual.json and counterfactual.txt beside the transcript (--out to put them elsewhere); an existing counterfactual.json is kept
// unless --overwrite. Keys: OPENAI_API_KEY / ANTHROPIC_API_KEY, as for scripts/inhabit.ts.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { candidateAsks } from '../src/agent/attribute';
import { counterfactual, renderCounterfactual } from '../src/agent/counterfactual';
import { DEFAULT_BUDGET } from '../src/agent/model';
import type { ModelClient } from '../src/agent/model';
import { pickerModel } from '../src/agent/stubs';
import type { Transcript } from '../src/agent/transcript';
import { anthropicModel } from './inhabit/anthropic';
import { openaiModel } from './inhabit/openai';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1]! : dflt;
};
const flag = (name: string): boolean => args.includes('--' + name);

const given = opt('transcript', args.find((a) => !a.startsWith('--') && !args.includes('--' + a)) ?? '');
if (!given) throw new Error('name the transcript: --transcript <folder or file>');
const path = existsSync(join(given, 'transcript.json')) ? join(given, 'transcript.json') : given;
if (!existsSync(path)) throw new Error(`no transcript at ${path}`);
const t = JSON.parse(readFileSync(path, 'utf8')) as Transcript;

const which = opt('asks', 'auto');
const seqs =
  which === 'auto'
    ? candidateAsks(t)
    : which === 'all'
      ? t.asks.filter((a) => a.proposal).map((a) => a.seq)
      : which.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n));
if (seqs.length === 0) throw new Error(which === 'auto' ? 'attribution found no candidate asks; name some with --asks' : 'no asks named');

const repeats = Number(opt('repeats', '3'));
const both = !flag('no-both');
const stub = opt('stub', '');
const api = opt('api', 'openai');
const effort = opt('effort', '');
const model: ModelClient = stub
  ? pickerModel(stub as 'first' | 'last' | 'cycle')
  : api === 'anthropic'
    ? anthropicModel({ model: opt('model', 'claude-opus-5-5'), effort: (effort || 'medium') as 'low' | 'medium' | 'high' })
    : openaiModel({ model: opt('model', 'gpt-5'), ...(effort ? { effort: effort as 'low' | 'medium' | 'high' } : {}) });

const out = opt('out', dirname(path));
mkdirSync(out, { recursive: true });
const jsonPath = join(out, 'counterfactual.json');
if (existsSync(jsonPath) && !flag('overwrite')) throw new Error(`${jsonPath} exists; choose another --out or pass --overwrite`);

const arms = both ? 2 : 1;
console.log(`${seqs.length} asks (${seqs.join(', ')}) x ${repeats} repeats x ${arms} arm${arms === 1 ? '' : 's'} = ${seqs.length * repeats * arms} calls to ${model.id}`);
const budget = {
  ...DEFAULT_BUDGET,
  maxCallsPerDay: 100_000,
  timeoutMs: Number(opt('timeout-ms', String(DEFAULT_BUDGET.timeoutMs))),
  maxOutputTokens: Number(opt('max-output-tokens', String(DEFAULT_BUDGET.maxOutputTokens))),
};
void (async () => {
  const c = await counterfactual(t, seqs, model, {
    repeats,
    both,
    budget,
    onCall: (done, total) => process.stdout.write(`\r${done}/${total} calls`),
  });
  process.stdout.write('\n');
  const text = renderCounterfactual(c);
  writeFileSync(jsonPath, JSON.stringify(c));
  writeFileSync(join(out, 'counterfactual.txt'), text + '\n');
  console.log(text);
  console.log(`\n(written to ${jsonPath} and ${join(out, 'counterfactual.txt')})`);
})().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
