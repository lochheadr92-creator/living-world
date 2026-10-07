// A static audit of coupling: which pieces of a person's state does the decision layer read, and which does nothing read?
//   npx vite-node scripts/coupling.ts
// "Decision layer" = the files that rank what a person does next. A channel referenced there can shape choices; a channel referenced only
// elsewhere (written, shown, or used by physics) cannot. This is text search, so it over-counts (a mention is not a use) and under-counts
// (access through a helper); read it as a map for the next question, not a measurement.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/sim';
const DECISION = /^(options_.*|decision|optutil|relief|welfare|production|facilities|social)\.ts$/;
const CHANNELS: Record<string, RegExp> = {
  health: /\.health\b/,
  'need: hunger': /needs\.hunger|\.hunger\b/,
  'need: thirst': /needs\.thirst|\.thirst\b/,
  'need: energy': /needs\.energy|\.energy\b/,
  'need: warmth': /needs\.warmth|\.warmth\b/,
  'need: safety': /needs\.safety|\.safety\b/,
  'need: social': /needs\.social|\.social\b/,
  'relation: affinity': /\.affinity\b/,
  'relation: trust': /\.trust\b/,
  'relation: familiarity': /\.familiarity\b/,
  'relation: debt': /\.debt\b/,
  'relation: grievance': /grievance/i,
  'relation: avoidUntil': /avoidUntil/,
  skills: /\.skills\b/,
  traits: /\.traits\b/,
  beliefs: /\.beliefs\b|bykind|beliefsByKind|countBeliefsOfKind/,
  concerns: /\.concerns\b/,
  commitments: /\.commitments\b/,
  'failures (past tries)': /\.failures\b/,
  'age / life stage': /stageOf|birthTick/,
  weather: /weather/,
  'time of day': /chrono|\bfrac\b|\bdark\b/,
  'partner / kin': /partnerId|\.children\b|\.parents\b/,
  household: /hhId|households/,
  inventory: /\.inv\b/,
  'memory log': /\.log\b/,
  'last result / decision': /lastResult|lastDecision|lastInteraction/,
};
const TRAITS = ['generosity', 'sociability', 'diligence', 'curiosity', 'courage', 'patience', 'temper', 'honesty', 'caution'];

const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'));
const text = new Map(files.map((f) => [f, readFileSync(join(DIR, f), 'utf8')]));
const decision = files.filter((f) => DECISION.test(f));
console.log(`decision layer: ${decision.join(', ')}\n`);
console.log('channel'.padEnd(26) + 'decision files'.padStart(15) + 'decision lines'.padStart(16) + 'elsewhere (files)'.padStart(19) + '   verdict');
for (const [name, re] of Object.entries(CHANNELS)) {
  let dFiles = 0;
  let dLines = 0;
  let oFiles = 0;
  for (const [f, t] of text) {
    const n = t.split('\n').filter((l) => re.test(l) && !/^\s*(\/\/|\*)/.test(l)).length;
    if (!n) continue;
    if (decision.includes(f)) {
      dFiles++;
      dLines += n;
    } else oFiles++;
  }
  const verdict = dLines === 0 ? 'NOT READ by any choice' : dLines < 6 ? 'barely read' : 'read';
  console.log(name.padEnd(26) + String(dFiles).padStart(15) + String(dLines).padStart(16) + String(oFiles).padStart(19) + '   ' + verdict);
}
const traitKeys = (() => {
  const m = /export interface Traits \{([\s\S]*?)\}/.exec(readFileSync(join(DIR, 'types.ts'), 'utf8'));
  return m ? [...m[1].matchAll(/(\w+):/g)].map((x) => x[1]) : TRAITS;
})();
console.log('\ntraits (references in decision files / elsewhere):');
for (const t of traitKeys) {
  const re = new RegExp(`traits\\.${t}\\b|\\b${t}\\b`);
  let d = 0;
  let o = 0;
  for (const [f, tx] of text) {
    const n = tx.split('\n').filter((l) => re.test(l) && !/^\s*(\/\/|\*)/.test(l)).length;
    if (decision.includes(f)) d += n;
    else o += n;
  }
  console.log('  ' + t.padEnd(14) + String(d).padStart(5) + ' / ' + String(o).padStart(4) + (d === 0 ? '   NOT READ by any choice' : ''));
}
