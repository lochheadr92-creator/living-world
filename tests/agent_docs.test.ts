// AGENTS.md is read at the start of every agent session. On 20 November 2026 it was 187 KB of per-version checkpoints and CLAUDE.md
// was a second, drifting copy. The checkpoints live in docs/RULES_LOG.md; these checks keep the two instruction files from growing back.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = (file: string): string => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const AGENTS_BUDGET_BYTES = 32_000;

describe('agent instruction files', () => {
  it('AGENTS.md stays inside its size budget', () => {
    expect(Buffer.byteLength(text('AGENTS.md'), 'utf8')).toBeLessThan(AGENTS_BUDGET_BYTES);
  });

  it('AGENTS.md holds no per-version checkpoint paragraph (those go in docs/RULES_LOG.md)', () => {
    expect(text('AGENTS.md')).not.toMatch(/^\*\*[^*\n]*\bcheckpoint\b[^*\n]*\(\d+ \w+ 20\d\d\)/im);
  });

  it('CLAUDE.md is a pointer to AGENTS.md and nothing else', () => {
    const claude = text('CLAUDE.md');
    expect(claude).toContain('@AGENTS.md');
    expect(Buffer.byteLength(claude, 'utf8')).toBeLessThan(600);
  });

  it('the rules log exists and takes new entries under its first heading', () => {
    expect(text('docs/RULES_LOG.md')).toContain('\n## Checkpoints (newest first)\n');
  });
});
