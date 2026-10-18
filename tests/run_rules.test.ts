// What rules a run from the COMMAND LINE actually uses, and what the lab does with that afterwards.
//
// The app stamps the current rules version on a new world. The scripts build their own worlds, and for a while they built
// them through `settingsForProfile`, which is deliberately unversioned - so every "current" lab run, inhabitant run, replay
// check, activity mix and cascade was quietly on the legacy compatibility baseline. Serializing an already-versioned world
// and reading it back does not catch that; only the configuration path does, which is what these tests exercise.
import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorld } from '../src/sim/factory';
import { freshRunSettings, parseRunRules, runRulesVersion, settingsForProfile } from '../src/sim/profiles';
import type { RunRules } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { checkResumable, incompatible, rowRules, wantedRules } from '../scripts/lab/guard';

describe('a fresh run from the command line', () => {
  it.each(['normal', 'large', 'huge', 'town'] as const)('is the current simulation, version and all, for %s', (profile) => {
    const s = freshRunSettings('rich', profile, 'rr-seed', { immigration: false });
    expect(s.dynamics).toBe('rich');
    expect(s.rulesVersion, 'the same version a new world in the app gets').toBe(CURRENT_RULES_VERSION);
    expect(createWorld(s).settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
  });

  it('keeps the seed, profile, harsh and arrivals it was asked for', () => {
    const s = freshRunSettings('rich', 'large', 'rr-keep', { harsh: true, immigration: true });
    expect(s).toMatchObject({ seed: 'rr-keep', profile: 'large', harsh: true, immigration: true, scene: 'natural' });
  });

  it('leaves an explicitly legacy run legacy, in both of its forms', () => {
    const authored = freshRunSettings('authored', 'large', 'rr-authored');
    expect(authored.dynamics).toBe('authored');
    expect(authored.rulesVersion).toBeUndefined();
    // the narrow third case: rich, but on the baseline that existed before rules versions
    const old = freshRunSettings('rich-unversioned', 'large', 'rr-old');
    expect(old.dynamics).toBe('rich');
    expect(old.rulesVersion, 'not every rich world is this generation of the rules').toBeUndefined();
  });

  it('refuses a rules word it does not know, instead of quietly running the default', () => {
    expect(parseRunRules('rich')).toBe('rich');
    expect(parseRunRules(undefined)).toBe('rich');
    expect(() => parseRunRules('richx')).toThrow(/must be one of/);
    expect(() => parseRunRules('')).toThrow(/must be one of/);
  });

  it('does not make the low-level helpers stamp anything: fixtures stay legacy', () => {
    expect(settingsForProfile('large', 'rr-low', { dynamics: 'rich' }).rulesVersion).toBeUndefined();
  });

  it('says which version a run records, with unversioned said explicitly', () => {
    expect(runRulesVersion('rich')).toBe(CURRENT_RULES_VERSION);
    expect(runRulesVersion('authored')).toBeNull();
    expect(runRulesVersion('rich-unversioned')).toBeNull();
  });
});

/** run one of the scripts for real, through vite-node, and read what it printed */
const vite = join('node_modules', 'vite-node', 'dist', 'cli.mjs');
const run = (script: string, args: string[]): string =>
  execFileSync(process.execPath, [vite, script, '--', ...args], { encoding: 'utf8', timeout: 240_000, stdio: ['ignore', 'pipe', 'pipe'] });

describe('the scripts themselves, run as a person would run them', () => {
  it('a default lab seed run records the current rules version on every row', () => {
    const out = run('scripts/lab_seed.ts', ['--seed', 'meadow', '--profile', 'normal', '--fork', '0', '--days', '0', '--branches', 'control']);
    const rows = out.split('\n').filter((l) => l.trim().startsWith('{')).map((l) => JSON.parse(l) as { spec?: string; dynamics?: string; rulesVersion?: number | null });
    const real = rows.filter((r) => r.spec);
    expect(real.length).toBeGreaterThan(0);
    for (const r of real) {
      expect(r.dynamics).toBe('rich');
      expect(r.rulesVersion, JSON.stringify(r)).toBe(CURRENT_RULES_VERSION);
    }
  }, 300_000);

  it('an explicitly legacy lab run records no version, rather than the current one', () => {
    const out = run('scripts/lab_seed.ts', ['--seed', 'meadow', '--profile', 'normal', '--fork', '0', '--days', '0', '--branches', 'control', '--dynamics', 'authored']);
    const real = out.split('\n').filter((l) => l.trim().startsWith('{')).map((l) => JSON.parse(l) as { spec?: string; dynamics?: string; rulesVersion?: number | null }).filter((r) => r.spec);
    expect(real.length).toBeGreaterThan(0);
    for (const r of real) {
      expect(r.dynamics).toBe('authored');
      expect(r.rulesVersion).toBeNull();
    }
  }, 300_000);

  it('the activity mix records the version of the world it actually ran', () => {
    const out = run('scripts/activity_mix.ts', ['--seed', 'meadow', '--profile', 'normal', '--days', '0']);
    expect(out).toMatch(new RegExp(`"rulesVersion":\\s*${CURRENT_RULES_VERSION}`));
  }, 300_000);

  it('the cascade tracer records the rules of the world it traced', () => {
    const out = run('scripts/cascade.ts', ['--seed', 'meadow', '--profile', 'normal', '--days', '0']);
    expect(out).toMatch(new RegExp(`rich, rules version ${CURRENT_RULES_VERSION}`));
  }, 300_000);

  it('the replay check says which rules its fresh world ran', () => {
    const out = run('scripts/replay_check.ts', ['--seed', 'meadow', '--profile', 'normal', '--from-day', '0.1', '--days', '0.05']);
    expect(out).toMatch(new RegExp(`rich, rules version ${CURRENT_RULES_VERSION}`));
  }, 300_000);

  it('an explicitly legacy cascade run says unversioned instead', () => {
    const out = run('scripts/cascade.ts', ['--seed', 'meadow', '--profile', 'normal', '--days', '0', '--dynamics', 'rich-unversioned']);
    expect(out).toMatch(/rich, unversioned/);
  }, 300_000);

  it('every script that makes a fresh world goes through the shared helper', () => {
    // a guard against one of them drifting back to the unversioned helper
    for (const f of ['scripts/lab_seed.ts', 'scripts/inhabit.ts', 'scripts/replay_check.ts', 'scripts/activity_mix.ts', 'scripts/cascade.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src, `${f} should build fresh worlds with freshRunSettings`).toContain('freshRunSettings(');
      expect(src.includes('settingsForProfile('), `${f} should no longer build a fresh world unversioned`).toBe(false);
    }
  });
});

describe('the lab will not mix one generation of rules with another', () => {
  const rows = (dynamics?: string, rulesVersion?: number | null) =>
    JSON.stringify({ seed: 'meadow', spec: 'control', ...(dynamics === undefined ? {} : { dynamics }), ...(rulesVersion === undefined ? {} : { rulesVersion }) }) + '\n' + JSON.stringify({ seed: 'meadow', done: true });

  const dir = (content: string) => {
    const d = mkdtempSync(join(tmpdir(), 'living-world-rules-'));
    writeFileSync(join(d, 'lab_meadow.jsonl'), content);
    return d;
  };

  it('matching dynamics but a different rules version is incompatible', () => {
    expect(incompatible(rowRules({ dynamics: 'rich', rulesVersion: 1 }), wantedRules('rich'))).toBeNull();
    const older = incompatible(rowRules({ dynamics: 'rich', rulesVersion: 0 }), wantedRules('rich'));
    expect(older, 'both rich, different generations').toMatch(/rules version/);
    const unversioned = incompatible(rowRules({ dynamics: 'rich' }), wantedRules('rich'));
    expect(unversioned, 'a rich row with no version is not this generation').toMatch(/unversioned/);
  });

  it('never reads a missing version as the current one', () => {
    expect(rowRules({ dynamics: 'rich' }).rulesVersion).toBeNull();
    expect(rowRules({}).rulesVersion).toBeNull();
    expect(rowRules({}).dynamics, 'and a row from before dynamics was recorded is authored').toBe('authored');
  });

  it('still lets an explicitly legacy run resume its own results', () => {
    const d = dir(rows('authored'));
    try {
      expect(checkResumable(d, ['meadow'], 'authored')).toBeNull();
      expect(checkResumable(d, ['meadow'], 'rich')).toMatch(/Use a new output directory/);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
    const u = dir(rows('rich'));
    try {
      expect(checkResumable(u, ['meadow'], 'rich-unversioned'), 'an unversioned rich directory resumes an unversioned rich run').toBeNull();
    } finally {
      rmSync(u, { recursive: true, force: true });
    }
  });

  it.each([
    ['a legacy rich row', rows('rich')],
    ['a row from an older generation', rows('rich', 0)],
    ['an authored row', rows('authored')],
    ['a row from before any of it was recorded', rows()],
  ])('refuses %s for a current run, before any worker starts or any file is touched', (_name, content) => {
    const d = dir(content);
    try {
      const before = readFileSync(join(d, 'lab_meadow.jsonl'), 'utf8');
      const result = spawnSync(process.execPath, ['scripts/lab.mjs', '--out', d, '--seeds', '1'], { encoding: 'utf8', timeout: 120_000 });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Use a new output directory/);
      expect(readFileSync(join(d, 'lab_meadow.jsonl'), 'utf8'), 'the old results were not rewritten or relabelled').toBe(before);
      expect(readdirSync(d), 'and nothing new was created').toEqual(['lab_meadow.jsonl']);
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  }, 120_000);

  it('accepts a directory whose rows were run under the same rules', () => {
    const d = dir(rows('rich', CURRENT_RULES_VERSION));
    try {
      expect(checkResumable(d, ['meadow'], 'rich')).toBeNull();
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it('says nothing about a directory that does not exist yet', () => {
    expect(checkResumable(join(tmpdir(), 'living-world-no-such-dir-12345'), ['meadow'], 'rich' as RunRules)).toBeNull();
  });
});
