import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('current lab defaults cannot silently reuse legacy results', () => {
  it.each([undefined, 'authored'])('rejects existing %s rows before starting workers or touching outputs', (dynamics) => {
    const out = mkdtempSync(join(tmpdir(), 'living-world-lab-default-'));
    try {
      const file = join(out, 'lab_meadow.jsonl');
      const original = JSON.stringify({ seed: 'meadow', spec: 'control', dynamics }) + '\n' + JSON.stringify({ seed: 'meadow', done: true });
      writeFileSync(file, original);
      const result = spawnSync(process.execPath, ['scripts/lab.mjs', '--out', out, '--seeds', '1'], { encoding: 'utf8', timeout: 10_000 });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('requested rich');
      expect(result.stderr).toContain('Use a new output directory');
      expect(readFileSync(file, 'utf8')).toBe(original);
      expect(readdirSync(out)).toEqual(['lab_meadow.jsonl']);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
