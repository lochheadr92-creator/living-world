// Whether an existing output directory may be resumed by the run that is about to start.
//
// The lab resumes: a second run of the same command skips the seeds already finished. That is only safe when the rows
// already there were produced under the SAME RULES - not merely the same `dynamics` word. Every rich implementation since
// the first has called itself rich, so "both rich" says nothing about whether two sets of numbers can sit in one table.
// A row therefore carries its rules version, and this compares that.
//
// It checks rules and whether this is a generation comparison. Two runs of the same rules version from different source revisions are still different
// experiments: use a fresh directory after any source change, and record HEAD and the diff. A version number is not
// provenance.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runRulesVersion } from '../../src/sim/profiles';
import type { RunRules } from '../../src/sim/profiles';

/** what a row says it was run under; a row written before either field existed is legacy and says so */
export interface RowRules {
  dynamics: 'authored' | 'rich';
  /** null is an explicit "no rules version": a legacy or deliberately unversioned run */
  rulesVersion: number | null;
}

export const rowRules = (row: { dynamics?: string; rulesVersion?: number | null }): RowRules => ({
  dynamics: row.dynamics === 'rich' ? 'rich' : 'authored',
  rulesVersion: typeof row.rulesVersion === 'number' ? row.rulesVersion : null,
});

export const wantedRules = (rules: RunRules): RowRules => ({
  dynamics: rules === 'authored' ? 'authored' : 'rich',
  rulesVersion: runRulesVersion(rules),
});

const say = (r: RowRules): string => `${r.dynamics}${r.rulesVersion === null ? ', unversioned' : `, rules version ${r.rulesVersion}`}`;

/** Why these rows cannot be mixed with the run about to start, or null if they can. */
export function incompatible(row: RowRules, want: RowRules): string | null {
  if (row.dynamics !== want.dynamics) return `${say(row)} results, requested ${say(want)}`;
  if (row.rulesVersion !== want.rulesVersion) return `${say(row)} results, requested ${say(want)}`;
  return null;
}

/**
 * Check every finished row in `dir` against the run about to start. Returns the complaint to print, or null to go ahead.
 * It reads and nothing else: no file is written, renamed or relabelled, and no worker is started from here.
 */
export function checkResumable(dir: string, seeds: string[], rules: RunRules, generationComparison=false): string | null {
  const want = wantedRules(rules);
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
      let row: { spec?: string; dynamics?: string; rulesVersion?: number | null; generationComparison?:boolean };
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
