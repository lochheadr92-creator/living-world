// The relay's settings: defaults here, the owner's changes in <home>/relay.config.json (outside the repository, so correcting a
// model name never touches a tracked file). Model names are the part most likely to be wrong: vendors rename and retire them, and
// retired names are rerouted without an error. `doctor --live` lists what each key can reach and checks these against it.
//
// The hosts a key may be sent to are constants in this file. The config can change a base URL's path, never its host; plain http
// is accepted for localhost only (the tests' mock vendor).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProviderName, RelayConfig, RoleName } from './types';

/** the only hosts a provider's key is ever sent to */
export const PINNED_HOSTS: Record<ProviderName, string> = {
  xai: 'api.x.ai',
  deepseek: 'api.deepseek.com',
  openai: 'api.openai.com',
};

export const PROVIDERS: ProviderName[] = ['xai', 'deepseek', 'openai'];
export const ROLES: RoleName[] = ['writer', 'reviewer1', 'reviewer2'];

// Model names below were read from search extracts of the vendors' own pages on 13 November 2026 and were not confirmed against a
// live key. Treat them as a starting guess that `doctor --live` settles.
export const DEFAULT_CONFIG: RelayConfig = {
  providers: {
    xai: { baseUrl: 'https://api.x.ai/v1', keyEnv: 'XAI_API_KEY', tokenParam: 'max_tokens', jsonMode: 'json_object', stream: true, streamUsage: false, requireDone: true, modelsPath: '/models' },
    deepseek: { baseUrl: 'https://api.deepseek.com', keyEnv: 'DEEPSEEK_API_KEY', tokenParam: 'max_tokens', jsonMode: 'json_object', stream: true, streamUsage: true, requireDone: true, modelsPath: '/models' },
    openai: { baseUrl: 'https://api.openai.com/v1', keyEnv: 'OPENAI_API_KEY', tokenParam: 'max_completion_tokens', jsonMode: 'json_object', stream: true, streamUsage: true, requireDone: true, modelsPath: '/models' },
  },
  roles: {
    writer: { provider: 'xai', model: 'grok-4.7', maxOutputTokens: 32_000, maxInputTokens: 180_000, warnInputTokens: 120_000, extraBody: {} },
    reviewer1: { provider: 'deepseek', model: 'deepseek-v4-pro', maxOutputTokens: 32_000, maxInputTokens: 240_000, warnInputTokens: 150_000, extraBody: {} },
    reviewer2: { provider: 'openai', model: 'gpt-6.1-sol', maxOutputTokens: 40_000, maxInputTokens: 250_000, warnInputTokens: 150_000, extraBody: {} },
  },
  reviewers: ['reviewer1', 'reviewer2'],
  clocks: { connectMs: 30_000, firstByteMs: 900_000, idleMs: 900_000, totalMs: 3_600_000 },
  limits: {
    repairTurns: 3,
    gateFixRounds: 2,
    reviewFixRounds: 1,
    maxFindings: 8,
    gateTimeoutMs: 900_000,
    probeTimeoutMs: 300_000,
    gateMaxWorkers: 4,
    attempts: 4,
    backoffMs: [2_000, 10_000, 30_000],
  },
  sparse: ['src', 'tests', 'scripts', 'docs', 'tools'],
  deny: [
    '.git/**',
    'node_modules/**',
    '.claude/**',
    '.github/**',
    '.agents/**',
    'tools/relay/**',
    '**/*.expected.json',
    'tests/golden*',
    'tests/helpers/golden.ts',
    'tests/helpers/v*ref.ts',
    'tests/v*_continuation.test.ts',
    'tests/zz_review_*',
    'tests/fixtures/**',
    'tests/protocol31_32_revision_predecessor.json',
    'scripts/v*_reference.ts',
    'scripts/inhabit/**',
    'scripts/lab.mjs',
    'scripts/lab/guard.ts',
    'src/sim/rng.ts',
    'docs/handoff_*.md',
    'docs/development_policy.md',
    'docs/adversarial_review_*.md',
    'docs/gap_ledger.md',
    'docs/gates*.json',
    'docs/baseline-*.json',
    'docs/candidate-*-continuation.json',
    'docs/model_relay.md',
  ],
  guarded: ['tests/**', 'src/sim/rulesversion.ts', 'scripts/lab/lab.ts', 'docs/rules_ranges.md', 'src/app/save.ts'],
  roots: ['src/', 'tests/', 'scripts/', 'docs/', 'tools/'],
  neverSend: ['**/*.expected.json', '**/*.jsonl', '**/*-save.json', '**/final.json', '**/.env*', '**/*.pem', '**/*.key', 'docs/handoff_*.md', 'docs/claude_autonomy_handoff.md', 'tests/fixtures/**'],
  staleModels: ['^grok-code-fast', '^grok-[23]($|-)', '^grok-4($|-fast)', '^deepseek-(chat|reasoner)$', '^gpt-[45]', '^o[134]($|-)'],
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Deep merge of plain objects; arrays and scalars are replaced whole. `over` wins. */
function merge<T>(base: T, over: unknown, path: string, problems: string[]): T {
  if (!isObject(over)) {
    problems.push(`${path || 'config'}: expected an object`);
    return base;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    const at = path ? `${path}.${k}` : k;
    const freeForm = path.endsWith('.extraBody') || k === 'extraBody';
    if (!(k in out) && !path.endsWith('.extraBody')) {
      problems.push(`${at}: unknown setting`);
      continue;
    }
    const cur = out[k];
    if (isObject(cur) && !freeForm) out[k] = merge(cur, v, at, problems);
    else if (cur !== undefined && !freeForm && typeof cur !== typeof v) problems.push(`${at}: expected ${Array.isArray(cur) ? 'an array' : typeof cur}`);
    else if (Array.isArray(cur) && !Array.isArray(v)) problems.push(`${at}: expected an array`);
    else out[k] = v;
  }
  return out as T;
}

/**
 * Why a provider's key must not be sent to this base URL; empty when it may. The provider client calls this before every request,
 * so a config that slipped past validation still cannot send a key to another host or over plain http.
 */
export function baseUrlProblems(name: ProviderName, baseUrl: string): string[] {
  const problems: string[] = [];
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return [`providers.${name}.baseUrl: not a URL`];
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!local && url.hostname !== PINNED_HOSTS[name]) problems.push(`providers.${name}.baseUrl: the ${name} key is only sent to ${PINNED_HOSTS[name]}, not ${url.hostname}`);
  if (url.protocol === 'http:' && !local) problems.push(`providers.${name}.baseUrl: plain http is accepted for localhost only`);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') problems.push(`providers.${name}.baseUrl: must be http or https`);
  if (url.username || url.password) problems.push(`providers.${name}.baseUrl: must not carry credentials`);
  return problems;
}

/** Everything wrong with a config, in the owner's words. An empty list means it can be used. */
export function configProblems(cfg: RelayConfig): string[] {
  const problems: string[] = [];
  for (const name of PROVIDERS) {
    const p = cfg.providers[name];
    if (!p) {
      problems.push(`providers.${name}: missing`);
      continue;
    }
    problems.push(...baseUrlProblems(name, p.baseUrl));
    if (!/^[A-Z][A-Z0-9_]*$/.test(p.keyEnv)) problems.push(`providers.${name}.keyEnv: not an environment variable name`);
    if (p.tokenParam !== 'max_tokens' && p.tokenParam !== 'max_completion_tokens') problems.push(`providers.${name}.tokenParam: must be max_tokens or max_completion_tokens`);
    if (p.jsonMode !== 'json_object' && p.jsonMode !== 'none') problems.push(`providers.${name}.jsonMode: must be json_object or none`);
    if (!p.modelsPath.startsWith('/')) problems.push(`providers.${name}.modelsPath: must start with /`);
  }
  for (const name of ROLES) {
    const r = cfg.roles[name];
    if (!r) {
      problems.push(`roles.${name}: missing`);
      continue;
    }
    if (!PROVIDERS.includes(r.provider)) problems.push(`roles.${name}.provider: must be one of ${PROVIDERS.join(', ')}`);
    if (!r.model || /\s/.test(r.model)) problems.push(`roles.${name}.model: missing or contains a space`);
    for (const k of ['maxOutputTokens', 'maxInputTokens', 'warnInputTokens'] as const) {
      if (!Number.isInteger(r[k]) || r[k] <= 0) problems.push(`roles.${name}.${k}: must be a positive whole number`);
    }
    if (!isObject(r.extraBody)) problems.push(`roles.${name}.extraBody: must be an object`);
    else for (const k of ['model', 'messages', 'stream']) if (k in r.extraBody) problems.push(`roles.${name}.extraBody.${k}: set by the relay, not here`);
  }
  if (!Array.isArray(cfg.reviewers) || cfg.reviewers.some((r) => r !== 'reviewer1' && r !== 'reviewer2')) problems.push('reviewers: a list of reviewer1 and reviewer2');
  else if (new Set(cfg.reviewers).size !== cfg.reviewers.length) problems.push('reviewers: a reviewer is listed twice');
  for (const [k, v] of Object.entries(cfg.clocks)) if (!Number.isFinite(v) || v <= 0) problems.push(`clocks.${k}: must be a positive number of milliseconds`);
  for (const [k, v] of Object.entries(cfg.limits)) {
    if (k === 'backoffMs') {
      if (!Array.isArray(v) || v.some((n) => !Number.isFinite(n) || n < 0)) problems.push('limits.backoffMs: a list of milliseconds');
    } else if (!Number.isInteger(v) || (v as number) < 0) problems.push(`limits.${k}: must be a whole number, zero or more`);
  }
  if (cfg.limits.attempts < 1) problems.push('limits.attempts: at least 1');
  if (cfg.limits.maxFindings < 1) problems.push('limits.maxFindings: at least 1');
  for (const k of ['sparse', 'deny', 'guarded', 'roots', 'neverSend', 'staleModels'] as const) {
    if (!Array.isArray(cfg[k]) || cfg[k].some((s) => typeof s !== 'string' || !s)) problems.push(`${k}: a list of non-empty strings`);
  }
  for (const s of cfg.staleModels) {
    try {
      new RegExp(s);
    } catch {
      problems.push(`staleModels: "${s}" is not a regular expression`);
    }
  }
  return problems;
}

export interface LoadedConfig {
  config: RelayConfig;
  /** the override file that was read, when there is one */
  file: string | null;
  problems: string[];
}

/** The defaults with <home>/relay.config.json laid over them. Problems are returned, not thrown: doctor prints them. */
export function loadConfig(home: string): LoadedConfig {
  const file = join(home, 'relay.config.json');
  const problems: string[] = [];
  let config: RelayConfig = structuredClone(DEFAULT_CONFIG);
  let used: string | null = null;
  if (existsSync(file)) {
    used = file;
    try {
      config = merge(config, JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, '')), '', problems);
    } catch (e) {
      problems.push(`${file}: not JSON (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  problems.push(...configProblems(config));
  return { config, file: used, problems };
}

/** The model names a retired-name pattern matches, for doctor's warning. */
export function staleRoles(cfg: RelayConfig): string[] {
  const out: string[] = [];
  for (const name of ROLES) {
    const model = cfg.roles[name].model;
    if (cfg.staleModels.some((s) => new RegExp(s, 'i').test(model))) out.push(`${name}: "${model}" looks like a retired name`);
  }
  return out;
}
