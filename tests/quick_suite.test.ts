// The quick test suite (vitest.quick.config.ts): the slow-file list in tests/helpers/slow_tests.ts is well formed. No simulation here.
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pinFiles, pinVersion } from './helpers/archived_pins';
import { SLOW_FILES, slowFiles } from './helpers/slow_tests';

describe('quick test suite', () => {
  it('lists only files that exist', () => {
    for (const f of SLOW_FILES) expect(existsSync(f), f).toBe(true);
  });

  it('keeps the slow list sorted and without duplicates', () => {
    expect([...SLOW_FILES]).toEqual([...SLOW_FILES].sort());
    expect(new Set(SLOW_FILES).size).toBe(SLOW_FILES.length);
  });

  it('does not list a continuation pin or a zz_review file, which are found by name', () => {
    for (const f of SLOW_FILES) {
      expect(pinVersion(basename(f)), f).toBeNull();
      expect(f.startsWith('tests/zz_review'), f).toBe(false);
    }
  });

  it('leaves out every kept pin and every slow file', () => {
    const left = slowFiles();
    for (const f of pinFiles().kept) expect(left, f).toContain(f);
    for (const f of SLOW_FILES) expect(left, f).toContain(f);
  });
});
