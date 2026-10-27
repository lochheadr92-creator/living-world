// Writes docs/reference.generated.md from the constants the simulation itself reads and from the score-term call sites in
// src/sim, so the reference cannot drift from the rules. No numeric value is typed by hand here: every figure is imported.
//
// usage: npx vite-node scripts/reference.ts            (write the file)
//        npx vite-node scripts/reference.ts --check    (exit 1 if the file is stale)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  TPS, DAY, START_FRAC, SUNRISE, SUNSET, TWILIGHT,
  HUNGER_RATE, THIRST_RATE, ENERGY_RATE, SOCIAL_RATE, SLEEP_RECOVER, REST_RECOVER,
  DRIVE_BANDS, CRITICAL, NEED_KEYS,
  AGE_CHILD, AGE_ADULT, AGE_ELDER, AGE_OLD_DEATH_START, DAYS_PER_YEAR, TICKS_PER_YEAR, PREGNANCY_TICKS, BIRTH_SPACING_TICKS, CONCEPTION_PER_YEAR,
  CONV_REACH, REQUEST_TTL, PROMISE_TTL, GREET_COOLDOWN, LOAN_TERM,
  REVIEW_EVERY, MIN_COMMIT, SWITCH_MARGIN, SITE_PATIENCE, PROJECT_PATIENCE,
} from '../src/sim/constants';

// ── constants ──
const row = (name: string, value: unknown, meaning: string): string => `| ${name} | ${value} | ${meaning} |`;
const secs = (ticks: number): string => `${Math.round(ticks / TPS)} s`;
const table = (head: string, rows: string[]): string => `${head}\n${rows.join('\n')}\n`;

let out = '# Generated reference\n\n';
out += 'Written by `npx vite-node scripts/reference.ts`. Do not edit by hand; values are read live from `src/sim/constants.ts`.\n\n';

out += '## Time\n\n';
out += table('| Constant | Value | Meaning |\n|---|---|---|', [
  row('TPS', TPS, 'simulation ticks per real second at 1× playback'),
  row('DAY', DAY, `ticks in one simulated day (${secs(DAY)})`),
  row('START_FRAC', START_FRAC, 'fraction of a day the world starts at (0.30 ≈ 07:12)'),
  row('SUNRISE', SUNRISE, 'fraction of a day the sun rises'),
  row('SUNSET', SUNSET, 'fraction of a day the sun sets'),
  row('TWILIGHT', TWILIGHT, 'fraction of a day of twilight after sunset'),
]);

out += '\n## Need rates (lost or gained per tick)\n\n';
out += table('| Constant | Value | Meaning |\n|---|---|---|', [
  row('HUNGER_RATE', HUNGER_RATE, 'hunger lost per tick'),
  row('THIRST_RATE', THIRST_RATE, 'thirst lost per tick'),
  row('ENERGY_RATE', ENERGY_RATE, 'energy lost per tick while awake'),
  row('SOCIAL_RATE', SOCIAL_RATE, 'social need lost per tick'),
  row('SLEEP_RECOVER', SLEEP_RECOVER, 'energy recovered per tick while asleep'),
  row('REST_RECOVER', REST_RECOVER, 'energy recovered per tick while resting'),
]);

out += '\n## Drive bands and critical thresholds (per need)\n\n';
out += table('| Need | Starts to matter | Strongly pressing | Critical |\n|---|---|---|---|', [
  ...NEED_KEYS.map((n) => `| ${n} | ${DRIVE_BANDS[n][0]} | ${DRIVE_BANDS[n][1]} | ${CRITICAL[n]} |`),
]);

out += '\n## Life\n\n';
out += table('| Constant | Value | Meaning |\n|---|---|---|', [
  row('AGE_CHILD', AGE_CHILD, 'a person is a child until this age (years)'),
  row('AGE_ADULT', AGE_ADULT, 'a person is an adult from this age (years)'),
  row('AGE_ELDER', AGE_ELDER, 'a person is an elder from this age (years)'),
  row('AGE_OLD_DEATH_START', AGE_OLD_DEATH_START, 'old-age death becomes possible from this age (years)'),
  row('DAYS_PER_YEAR', DAYS_PER_YEAR, 'simulated days per year of age'),
  row('TICKS_PER_YEAR', TICKS_PER_YEAR, 'ticks per year of age'),
  row('PREGNANCY_TICKS', PREGNANCY_TICKS, `pregnancy length (${secs(PREGNANCY_TICKS)})`),
  row('BIRTH_SPACING_TICKS', BIRTH_SPACING_TICKS, `minimum time between a mother's births (${secs(BIRTH_SPACING_TICKS)})`),
  row('CONCEPTION_PER_YEAR', CONCEPTION_PER_YEAR, 'chance per year a settled, well-fed couple conceives'),
]);

out += '\n## Social timings\n\n';
out += table('| Constant | Value | Meaning |\n|---|---|---|', [
  row('CONV_REACH', CONV_REACH, 'how close two people must be to talk (tiles)'),
  row('REQUEST_TTL', REQUEST_TTL, `how long a request stays open (${secs(REQUEST_TTL)})`),
  row('PROMISE_TTL', PROMISE_TTL, `how long a promise has to be met (${secs(PROMISE_TTL)})`),
  row('GREET_COOLDOWN', GREET_COOLDOWN, `how long before the same pair greets again (${secs(GREET_COOLDOWN)})`),
  row('LOAN_TERM', LOAN_TERM, `how long a loaned tool may be kept (${secs(LOAN_TERM)})`),
]);

out += '\n## Commitment and decision timings\n\n';
out += table('| Constant | Value | Meaning |\n|---|---|---|', [
  row('REVIEW_EVERY', REVIEW_EVERY, 'how often a busy person reviews their options (ticks)'),
  row('MIN_COMMIT', MIN_COMMIT, 'minimum ticks a chosen activity commits to'),
  row('SWITCH_MARGIN', SWITCH_MARGIN, 'how much better a new option must be to make someone switch'),
  row('SITE_PATIENCE', SITE_PATIENCE, `how long an unworked building site waits before being given up (${secs(SITE_PATIENCE)})`),
  row('PROJECT_PATIENCE', PROJECT_PATIENCE, `how long an improvement project waits for its materials (${secs(PROJECT_PATIENCE)})`),
]);

// ── option score terms (extracted text, not evaluated) ──
const simDir = fileURLToPath(new URL('../src/sim', import.meta.url));
const terms: { file: string; line: number; label: string }[] = [];
for (const f of readdirSync(simDir).filter((n) => n.endsWith('.ts')).sort()) {
  const lines = readFileSync(join(simDir, f), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const re = /\.add\(\s*'([^']*)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(lines[i]))) terms.push({ file: `src/sim/${f}`, line: i + 1, label: m[1] });
  }
}
out += `\n## Option score terms (extracted text, not evaluated)\n\n`;
out += `${terms.length} \`sc.add('label', …)\` call sites in \`src/sim\`. The label is the literal text as written at each call site; it is extracted, not evaluated.\n\n`;
out += table('| Site | Label |\n|---|---|', terms.map((t) => `| ${t.file}:${t.line} | ${t.label} |`));

// ── write or check ──
const target = new URL('../docs/reference.generated.md', import.meta.url);
if (process.argv.includes('--check')) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (current !== out) {
    console.error('docs/reference.generated.md is stale: run `npx vite-node scripts/reference.ts`.');
    process.exit(1);
  }
  console.log('docs/reference.generated.md is up to date.');
} else {
  writeFileSync(target, out);
  console.log(`${out.split('\n').length} lines, ${terms.length} score terms written to docs/reference.generated.md`);
}
