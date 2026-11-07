// What the suite's own green means (adversarial review 2026-11-07, item 4): it must not depend on one machine's folders, every
// recorded continuation must be protected from being re-recorded over, and a pin's provenance must match the version it pins.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { paired, verdict } from '../scripts/lab/stats';

const read = (p: string) => readFileSync(p, 'utf8');
const testFiles = [...readdirSync('tests').filter((f) => f.endsWith('.ts')).map((f) => `tests/${f}`), ...readdirSync('tests/helpers').filter((f) => f.endsWith('.ts')).map((f) => `tests/helpers/${f}`)];

describe('the suite runs on any machine', () => {
  it('no test writes into, or reads from, a user profile folder', () => {
    const found = testFiles.filter((f) => /[A-Za-z]:[\\/]+Users[\\/]|AppData[\\/]|\/home\/[a-z]/.test(read(f)));
    expect(found).toEqual([]);
  });

  it('a test that reads an absolute path (a sibling worktree) checks that it is there first', () => {
    const unguarded = testFiles.filter((f) => {
      const s = read(f);
      return /['"`][A-Za-z]:[\\/]/.test(s) && !/existsSync\(/.test(s);
    });
    expect(unguarded).toEqual([]);
  });
});

describe("the lab's verdicts", () => {
  it('without a noise floor (no nudge moved the metric) nothing is called larger than chance', () => {
    const tiny = paired([0.1, 0.2, 0.1, 0.15, 0.1, 0.2]); // excludes zero, but there is nothing to measure it against
    expect(verdict(tiny, 0, false)).toBe('no noise floor to judge against');
    expect(verdict(tiny, Number.NaN, false)).toBe('no noise floor to judge against');
    expect(verdict(paired([1, -1, 2, -2, 1, -1]), 0, false)).toBe('not distinguishable from chance');
    expect(verdict(tiny, 0.05, false)).toBe('larger than chance'); // with a floor it is judged as before
  });
});

describe('recorded continuations stay as recorded', () => {
  it('every reference script that can record refuses to overwrite what is already recorded', () => {
    const scripts = readdirSync('scripts').filter((f) => /^v\d+(_[a-z_]+)?_reference\.ts$/.test(f));
    expect(scripts.length).toBeGreaterThan(100);
    const open = scripts.filter((f) => {
      const s = read(`scripts/${f}`);
      return s.includes('--write') && !/existsSync\(/.test(s);
    });
    expect(open).toEqual([]);
  });

  it('the golden fingerprints are re-recorded only for a new rules version, or on purpose', () => {
    const s = read('scripts/golden.ts');
    expect(s).toMatch(/CURRENT_RULES_VERSION/);
    expect(s).toMatch(/--force/);
  });

  it("a pin's source block names the rules version the file pins", () => {
    const pins = readdirSync('tests').filter((f) => /^v(\d+)_continuation\.expected\.json$/.test(f));
    const wrong: string[] = [];
    for (const f of pins) {
      const n = Number(/^v(\d+)_/.exec(f)![1]);
      const j = JSON.parse(read(`tests/${f}`)) as { source?: unknown };
      const src = j.source;
      if (src && typeof src === 'object' && 'rules' in src && (src as { rules: unknown }).rules !== n) wrong.push(`${f}: source.rules ${String((src as { rules: unknown }).rules)}`);
      if (src && typeof src === 'object' && 'head' in src && !/^[0-9a-f]{7,40}$/.test(String((src as { head: unknown }).head))) wrong.push(`${f}: source.head is not a commit`);
    }
    expect(wrong).toEqual([]);
  });
});
