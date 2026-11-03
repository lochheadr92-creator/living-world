// Whether an existing output directory may be resumed by the run that is about to start.
//
// The lab resumes: a second run of the same command skips the seeds already finished. That is only safe when the rows
// already there were produced under the SAME RULES - not merely the same `dynamics` word. Every rich implementation since
// the first has called itself rich, so "both rich" says nothing about whether two sets of numbers can sit in one table.
// A row therefore carries its rules version, and this compares that.
//
// It checks rules, arrivals and whether this is a generation comparison. Two runs of the same rules version from different source revisions are still different
// experiments: use a fresh directory after any source change, and record HEAD and the diff. A version number is not
// provenance.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runRulesVersion } from '../../src/sim/profiles';
import type { RunRules } from '../../src/sim/profiles';
import { CURRENT_RULES_VERSION, validateRulesVersion } from '../../src/sim/rulesversion';

/** what a row says it was run under; a row written before either field existed is legacy and says so */
export interface RowRules {
  dynamics: 'authored' | 'rich';
  /** null is an explicit "no rules version": a legacy or deliberately unversioned run */
  rulesVersion: number | null;
  /** whether new people arrived. The lab forced arrivals off until 3 November 2026, so a row that does not say ran without them */
  arrivals: boolean;
}

export const rowRules = (row: { dynamics?: string; rulesVersion?: number | null; arrivals?: boolean }): RowRules => ({
  dynamics: row.dynamics === 'rich' ? 'rich' : 'authored',
  rulesVersion: typeof row.rulesVersion === 'number' ? row.rulesVersion : null,
  arrivals: row.arrivals === true,
});

/** What a lab run asks for. Arrivals default on, as in a new world in the app; `pinned` is an earlier rules version (`--rules N`). */
export const wantedRules = (rules: RunRules, arrivals = true, pinned?: number): RowRules => ({
  dynamics: rules === 'authored' ? 'authored' : 'rich',
  rulesVersion: pinned ?? runRulesVersion(rules),
  arrivals,
});

const say = (r: RowRules): string => `${r.dynamics}${r.rulesVersion === null ? ', unversioned' : `, rules version ${r.rulesVersion}`}, arrivals ${r.arrivals ? 'on' : 'off'}`;

/** Why these rows cannot be mixed with the run about to start, or null if they can. */
export function incompatible(row: RowRules, want: RowRules): string | null {
  if (row.dynamics !== want.dynamics) return `${say(row)} results, requested ${say(want)}`;
  if (row.rulesVersion !== want.rulesVersion) return `${say(row)} results, requested ${say(want)}`;
  if (row.arrivals !== want.arrivals) return `${say(row)} results, requested ${say(want)}`;
  return null;
}

/** Read `--arrivals`, refusing anything but on or off by name rather than silently defaulting. */
export function parseArrivals(value: string): boolean {
  if (value === 'on') return true;
  if (value === 'off') return false;
  throw new Error(`--arrivals must be on or off, not ${JSON.stringify(value)}`);
}

/**
 * Read `--rules N`: run an earlier generation of the rules on today's code, as a saved world of that version would continue.
 * Only a rich run can be pinned, only to a version this build supports, and the current version is refused, because pinning it
 * would only make a current run look like a pinned one. An empty value means not pinned.
 */
export function parsePinnedRules(value: string, rules: RunRules): number | undefined {
  if (value === '') return undefined;
  if (rules !== 'rich') throw new Error('--rules pins a version of the current rich rules; it cannot be combined with --dynamics ' + rules);
  const n = Number(value);
  const verdict = validateRulesVersion(n);
  if (!verdict.ok || verdict.version === undefined) throw new Error(`--rules ${value}: ${verdict.reason ?? 'not a rules version'}`);
  if (n === CURRENT_RULES_VERSION) throw new Error(`--rules ${value} is the current version; leave --rules out for a current run`);
  return n;
}

/**
 * Check every finished row in `dir` against the run about to start. Returns the complaint to print, or null to go ahead.
 * It reads and nothing else: no file is written, renamed or relabelled, and no worker is started from here.
 */
export function checkResumable(dir: string, seeds: string[], rules: RunRules, generationComparison=false, arrivals=true, pinned?: number): string | null {
  const want = wantedRules(rules, arrivals, pinned);
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    return null; // no directory yet: nothing to be incompatible with
  }
  for (const seed of seeds) {
    const name = `lab_${seed}.jsonl`;
    if (!files.includes(name)) continue;
    const path = join(dir, name);
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let row: { spec?: string; dynamics?: string; rulesVersion?: number | null; arrivals?: boolean; generationComparison?:boolean };
      try {
        row = JSON.parse(line) as typeof row;
      } catch {
        continue;
      }
      if (!row.spec) continue;
      if(!!row.generationComparison!==generationComparison)return `${path} contains a different generation comparison setting. Use a new output directory; old results were not changed.`;
      const why = incompatible(rowRules(row), want);
      if (why) return `${path} contains ${why}. Use a new output directory; old results were not changed.`;
    }
  }
  return null;
}
