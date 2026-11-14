// Tests for the model relay's edit handling (tools/relay/edits.ts): parsing a writer's reply into SEARCH/REPLACE blocks, the
// work-order path policy, exact and uniform-indentation matching, all-or-nothing planning, the repair message, and writing with
// rollback. Everything runs in memory or in a temporary directory that each test removes; nothing touches the network.
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WRITER_FORMAT, buildPolicy, diskStore, forbiddenCharacter, parseEdits, planEdits, renderRepair, writePlanned } from '../tools/relay/edits';
import type { BlockFailure, EditBlock, FileStore, PlanResult } from '../tools/relay/types';

// marker lines are built here so this file holds no line that looks like a merge conflict
const S = `${'<'.repeat(7)} SEARCH`;
const D = '='.repeat(7);
const R = `${'>'.repeat(7)} REPLACE`;
const F = '```';

function block(path: string, search: string, replace: string, fenced = true): string {
  const body = [S, ...(search === '' ? [] : search.split('\n')), D, ...(replace === '' ? [] : replace.split('\n')), R];
  return fenced ? [path, `${F}ts`, ...body, F].join('\n') : [path, ...body].join('\n');
}

function reply(blocks: string[], count = blocks.length, notes = 'NOTES\n- changed things'): string {
  return `${blocks.join('\n\n')}\n\n${notes}\nEND-OF-EDITS blocks=${count}\n`;
}

const eb = (index: number, path: string, search: string, replace: string): EditBlock => ({ index, path, search, replace });

function memStore(files: Record<string, string>): FileStore {
  return { read: (p) => (Object.prototype.hasOwnProperty.call(files, p) ? files[p] : null) };
}

function plan(blocks: EditBlock[], files: Record<string, string>, edit: string[], create: string[] = [], locked: string[] = [], unlock: string[] = []): PlanResult {
  return planEdits(blocks, buildPolicy({ edit, create }, locked, unlock), memStore(files));
}

function failuresOf(r: PlanResult): BlockFailure[] {
  if (r.ok) throw new Error('expected the plan to fail');
  return r.failures;
}

function filesOf(r: PlanResult) {
  if (!r.ok) throw new Error(`expected the plan to succeed: ${JSON.stringify(r.failures)}`);
  return r.files;
}

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true });
});
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'relay-edits-'));
  dirs.push(d);
  return d;
}
function listAll(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const rel = prefix ? `${prefix}/${name}` : name;
    out.push(rel);
    if (statSync(join(dir, name)).isDirectory()) out.push(...listAll(join(dir, name), rel));
  }
  return out.sort();
}

describe('parseEdits', () => {
  it('reads a two-file change back into blocks and notes', () => {
    const text = reply([block('src/a.ts', 'const a = 1;\nconst b = 2;', 'const a = 1;\nconst b = 3;'), block('src/new.ts', '', 'export const n = 1;')], 2, 'NOTES\n- changed a\n- added new');
    const r = parseEdits(text);
    expect(r).toEqual({
      ok: true,
      blocks: [
        { path: 'src/a.ts', search: 'const a = 1;\nconst b = 2;', replace: 'const a = 1;\nconst b = 3;', index: 1 },
        { path: 'src/new.ts', search: '', replace: 'export const n = 1;', index: 2 },
      ],
      notes: 'NOTES\n- changed a\n- added new',
      blocked: null,
    });
  });

  it('accepts blocks with the fence present and with it absent', () => {
    const fenced = parseEdits(reply([block('src/a.ts', 'x', 'y', true)]));
    const bare = parseEdits(reply([block('src/a.ts', 'x', 'y', false)]));
    const mixed = parseEdits(reply([block('src/a.ts', 'x', 'y', true), block('src/b.ts', 'p', 'q', false)]));
    for (const r of [fenced, bare]) {
      expect(r.ok && r.blocks).toEqual([{ path: 'src/a.ts', search: 'x', replace: 'y', index: 1 }]);
    }
    expect(mixed.ok && mixed.blocks.map((b) => b.path)).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('does not take the closing fence of one block for the opening fence of the next', () => {
    const r = parseEdits(reply([block('src/a.ts', 'x', 'y'), block('src/b.ts', 'p', 'q')]));
    expect(r.ok && r.blocks.map((b) => b.path)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(r.ok && r.notes).toBe('NOTES\n- changed things');
  });

  it('strips backticks, asterisks, quotes, a trailing colon and backslashes from a path line', () => {
    for (const decorated of ['`src/a.ts`', '**src/a.ts**', '"src/a.ts":', "'src/a.ts'", 'src\\a.ts', '**`src/a.ts`**:', '  src/a.ts  ']) {
      const r = parseEdits(reply([block(decorated, 'x', 'y')]));
      expect(r.ok && r.blocks[0].path, decorated).toBe('src/a.ts');
    }
  });

  it('reads a reply written with CRLF or lone CR line endings and returns bodies with LF', () => {
    const text = reply([block('src/a.ts', 'one\ntwo', 'one\nthree')]);
    for (const eol of ['\r\n', '\r']) {
      const r = parseEdits(text.replace(/\n/g, eol));
      expect(r.ok && r.blocks).toEqual([{ path: 'src/a.ts', search: 'one\ntwo', replace: 'one\nthree', index: 1 }]);
    }
  });

  it('reports a cut-off reply that has no END-OF-EDITS line', () => {
    const whole = reply([block('src/a.ts', 'x', 'y'), block('src/b.ts', 'p', 'q')]);
    const cut = whole.slice(0, whole.indexOf('src/b.ts') + 30);
    const expected = { ok: false, error: 'the answer did not end with END-OF-EDITS blocks=N: it was cut off or the final line was left out' };
    expect(parseEdits(cut)).toEqual(expected);
    expect(parseEdits(whole.replace(/END-OF-EDITS blocks=2\n?$/, ''))).toEqual(expected);
    expect(parseEdits('')).toEqual(expected);
  });

  it('reports a miscounted END-OF-EDITS line with both numbers', () => {
    const r = parseEdits(reply([block('src/a.ts', 'x', 'y'), block('src/b.ts', 'p', 'q')], 3));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/blocks=3.*\b2 blocks/);
  });

  it('catches a reply cut off between two blocks by the count', () => {
    const r = parseEdits(`${block('src/a.ts', 'x', 'y')}\n\nEND-OF-EDITS blocks=2\n`);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('blocks=2');
  });

  it('reads a BLOCKED reply with no blocks', () => {
    const plain = parseEdits('NOTES\nBLOCKED: NEED_FILE: src/sim/x.ts\nEND-OF-EDITS blocks=0\n');
    expect(plain).toEqual({ ok: true, blocks: [], notes: 'NOTES\nBLOCKED: NEED_FILE: src/sim/x.ts', blocked: 'BLOCKED: NEED_FILE: src/sim/x.ts' });
    const dashed = parseEdits('NOTES\n- BLOCKED: the spec names a function that is not in the files\n- more detail\nEND-OF-EDITS blocks=0');
    expect(dashed.ok && dashed.blocked).toBe('- BLOCKED: the spec names a function that is not in the files\n- more detail');
    const noHeading = parseEdits('BLOCKED: NEED_FILE: a.ts\nEND-OF-EDITS blocks=0');
    expect(noHeading.ok && noHeading.blocked).toBe('BLOCKED: NEED_FILE: a.ts');
  });

  it('refuses a reply with no blocks and no BLOCKED line', () => {
    expect(parseEdits('NOTES\n- nothing to do\nEND-OF-EDITS blocks=0\n')).toEqual({ ok: false, error: 'no blocks and no BLOCKED: line' });
  });

  it('does not report BLOCKED when blocks were sent', () => {
    const r = parseEdits(reply([block('src/a.ts', 'x', 'y')], 1, 'NOTES\nBLOCKED: something'));
    expect(r.ok && r.blocked).toBeNull();
  });

  it('treats a marker line inside a body as a parse error naming the line', () => {
    const inReplace = [ 'src/a.ts', S, 'a', D, 'b', D, 'c', R, 'END-OF-EDITS blocks=1'].join('\n');
    const r1 = parseEdits(inReplace);
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      expect(r1.error).toMatch(/^line 6:/);
      expect(r1.error).toContain(JSON.stringify(D));
    }
    const inSearch = ['src/a.ts', S, 'a', S, 'b', D, 'c', R, 'END-OF-EDITS blocks=1'].join('\n');
    const r2 = parseEdits(inSearch);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toMatch(/^line 4:/);
    const replaceInSearch = ['src/a.ts', S, 'a', R, 'b', D, 'c', R, 'END-OF-EDITS blocks=1'].join('\n');
    expect(parseEdits(replaceInSearch).ok).toBe(false);
  });

  it('refuses a divider or REPLACE marker that stands outside any block', () => {
    const r = parseEdits([block('src/a.ts', 'x', 'y'), 'NOTES', D, 'END-OF-EDITS blocks=1'].join('\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^line \d+:/);
  });

  it('refuses a block with no path line and names the line', () => {
    const r = parseEdits([S, 'x', D, 'y', R, 'END-OF-EDITS blocks=1'].join('\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/^line 1: expected a path line/);
      expect(r.error).toContain(JSON.stringify(S));
    }
    const afterBlock = parseEdits([block('src/a.ts', 'x', 'y'), S, 'p', D, 'q', R, 'END-OF-EDITS blocks=2'].join('\n'));
    expect(afterBlock.ok).toBe(false);
  });

  it('refuses a block that is never closed', () => {
    const r = parseEdits(['src/a.ts', S, 'x', D, 'y', 'END-OF-EDITS blocks=1'].join('\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^line 2:.*REPLACE/);
    const noDivider = parseEdits(['src/a.ts', S, 'x', 'END-OF-EDITS blocks=1'].join('\n'));
    expect(noDivider.ok).toBe(false);
  });

  it('quotes at most 200 characters of the offending line', () => {
    const long = 'z'.repeat(500);
    const r = parseEdits(['src/a.ts', S, long, S, D, R, 'END-OF-EDITS blocks=1'].join('\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeLessThan(400);
  });

  it('tolerates trailing spaces on marker lines and trailing blank lines after the last line', () => {
    const text = ['src/a.ts', `${S}  `, 'x', `${D} `, 'y', `${R}\t`, '', 'END-OF-EDITS blocks=1  ', '', ''].join('\n');
    const r = parseEdits(text);
    expect(r.ok && r.blocks[0]).toEqual({ path: 'src/a.ts', search: 'x', replace: 'y', index: 1 });
  });

  it('teaches a format that its own parser reads', () => {
    expect(WRITER_FORMAT.startsWith('HOW TO ANSWER\n')).toBe(true);
    expect(WRITER_FORMAT.endsWith('END-OF-EDITS blocks=<number>')).toBe(true);
    const start = WRITER_FORMAT.indexOf('path/from/repo/root.ts');
    const close = WRITER_FORMAT.indexOf(`${F}\n`, WRITER_FORMAT.indexOf(R));
    const example = `${WRITER_FORMAT.slice(start, close + 3)}\nEND-OF-EDITS blocks=1`;
    const r = parseEdits(example);
    expect(r.ok && r.blocks).toEqual([{ path: 'path/from/repo/root.ts', search: 'lines copied character for character from the current file', replace: 'the lines that replace them', index: 1 }]);
  });
});

describe('buildPolicy', () => {
  it('keys paths by lower-cased canonical form and keeps the work order spelling', () => {
    const p = buildPolicy({ edit: ['src/Sim/World.ts', './tests/x.ts'], create: ['docs\\New.md'] }, ['Tests/A.test.ts', 'tests/b.test.ts'], ['TESTS/b.test.ts']);
    expect([...p.edit]).toEqual([
      ['src/sim/world.ts', 'src/Sim/World.ts'],
      ['tests/x.ts', './tests/x.ts'],
    ]);
    expect([...p.create]).toEqual([['docs/new.md', 'docs\\New.md']]);
    expect([...p.locked]).toEqual(['tests/a.test.ts']);
  });

  it('refuses a work order path the relay cannot handle', () => {
    expect(() => buildPolicy({ edit: ['../x.ts'], create: [] }, [], [])).toThrow(/edit path/);
  });
});

describe('forbiddenCharacter', () => {
  it('finds hidden and control characters with their line, and passes tab, LF and CR', () => {
    expect(forbiddenCharacter('plain\ttext\r\nmore\n')).toBeNull();
    expect(forbiddenCharacter('a\nb\u200Bc')).toEqual({ codePoint: 0x200b, line: 2 });
    expect(forbiddenCharacter('\u0007')).toEqual({ codePoint: 7, line: 1 });
    expect(forbiddenCharacter('x\n\n\u0085')).toEqual({ codePoint: 0x85, line: 3 });
    expect(forbiddenCharacter('x\u007F')).toEqual({ codePoint: 0x7f, line: 1 });
    for (const cp of [0x202a, 0x202e, 0x2066, 0x2069, 0x200f, 0x2060, 0x2064, 0xfeff]) expect(forbiddenCharacter(`a${String.fromCodePoint(cp)}`)?.codePoint).toBe(cp);
    expect(forbiddenCharacter('caf\u00e9 \u4e2d \u{1F600}')).toBeNull();
  });
});

describe('planEdits: paths', () => {
  it('refuses paths outside the work order', () => {
    const files = { 'src/a.ts': 'x\n', 'src/other.ts': 'x\n', '.git/config': 'secret\n' };
    for (const bad of ['../x', 'C:\\x', '/etc/x', '.git/config', 'src/other.ts', 'src/a.ts/../other.ts']) {
      const f = failuresOf(plan([eb(1, bad, 'x', 'y')], files, ['src/a.ts']));
      expect(f, bad).toHaveLength(1);
      expect(f[0].reason, bad).toBe('path_not_allowed');
      expect(f[0].detail, bad).toContain('src/a.ts');
    }
  });

  it('matches a path without regard to case and writes it with the work order spelling', () => {
    const r = plan([eb(1, 'tests/MIXED.ts', 'old', 'new')], { 'tests/Mixed.ts': 'old\n' }, ['tests/Mixed.ts']);
    expect(filesOf(r).map((f) => f.path)).toEqual(['tests/Mixed.ts']);
    const upper = plan([eb(1, 'tests/X.TS', 'old', 'new')], { 'tests/x.ts': 'old\n' }, ['tests/x.ts']);
    expect(filesOf(upper)[0].path).toBe('tests/x.ts');
    const created = plan([eb(1, 'DOCS/NEW.md', '', 'hi')], {}, [], ['docs/New.md']);
    expect(filesOf(created)[0].path).toBe('docs/New.md');
  });

  it('refuses a created path whose SEARCH is not empty', () => {
    const f = failuresOf(plan([eb(1, 'src/n.ts', 'something', 'x')], {}, [], ['src/n.ts']));
    expect(f[0]).toMatchObject({ reason: 'path_not_allowed', detail: 'this path is under create: its SEARCH must be empty' });
  });

  it('creates a file with LF endings and exactly one final newline and no BOM', () => {
    const files = filesOf(plan([eb(1, 'src/n.ts', '  ', 'export const a = 1;\n\nexport const b = 2;\n\n\n')], {}, [], ['src/n.ts']));
    expect(files).toEqual([{ path: 'src/n.ts', created: true, before: null, after: 'export const a = 1;\n\nexport const b = 2;\n', tiers: [0] }]);
  });

  it('refuses to create over an existing file and a second block for a created path', () => {
    const over = failuresOf(plan([eb(1, 'src/n.ts', '', 'x')], { 'src/n.ts': 'already\n' }, [], ['src/n.ts']));
    expect(over[0].reason).toBe('file_exists');
    const twice = failuresOf(plan([eb(1, 'src/n.ts', '', 'x'), eb(2, 'src/n.ts', '', 'y')], {}, [], ['src/n.ts']));
    expect(twice.map((f) => [f.index, f.reason])).toEqual([[2, 'file_exists']]);
  });

  it('refuses an edit of a file that does not exist and an empty SEARCH on an edit path', () => {
    expect(failuresOf(plan([eb(1, 'src/a.ts', 'x', 'y')], {}, ['src/a.ts']))[0].reason).toBe('file_missing');
    const empty = failuresOf(plan([eb(1, 'src/a.ts', '', 'appended')], { 'src/a.ts': 'x\n' }, ['src/a.ts']));
    expect(empty[0].reason).toBe('empty_search_on_edit');
  });

  it('plans files in work order order, edits first and then creations', () => {
    const files = { 'src/a.ts': 'a\n', 'src/b.ts': 'b\n' };
    const r = plan([eb(1, 'src/new.ts', '', 'n'), eb(2, 'src/b.ts', 'b', 'B'), eb(3, 'src/a.ts', 'a', 'A')], files, ['src/a.ts', 'src/b.ts'], ['src/new.ts']);
    expect(filesOf(r).map((f) => f.path)).toEqual(['src/a.ts', 'src/b.ts', 'src/new.ts']);
  });
});

describe('planEdits: matching', () => {
  it('applies an exact unique match', () => {
    const r = plan([eb(1, 'src/a.ts', 'const b = 2;', 'const b = 3;')], { 'src/a.ts': 'const a = 1;\nconst b = 2;\nconst c = 3;\n' }, ['src/a.ts']);
    expect(filesOf(r)).toEqual([{ path: 'src/a.ts', created: false, before: 'const a = 1;\nconst b = 2;\nconst c = 3;\n', after: 'const a = 1;\nconst b = 3;\nconst c = 3;\n', tiers: [0] }]);
  });

  it('refuses a SEARCH that matches in several places and gives the line numbers', () => {
    const r = plan([eb(1, 'src/a.ts', 'x', 'z')], { 'src/a.ts': 'x\ny\nx\ny\nx\n' }, ['src/a.ts']);
    const f = failuresOf(r);
    expect(f[0]).toMatchObject({ reason: 'many_matches', detail: 'matches 3 places (lines 1, 3, 5)' });
    if (!r.ok) expect(r.repairMessage).toContain('This SEARCH matches 3 places in src/a.ts (lines 1, 3, 5). Add surrounding lines until it matches exactly one.');
    const four = failuresOf(plan([eb(1, 'src/a.ts', 'x', 'z')], { 'src/a.ts': 'x\nx\nx\nx\n' }, ['src/a.ts']));
    expect(four[0].detail).toBe('matches 4 places (lines 1, 2, 3 and others)');
  });

  it('counts overlapping occurrences, so a SEARCH that could be read two ways is refused', () => {
    const f = failuresOf(plan([eb(1, 'src/a.ts', 'x\nx', 'z')], { 'src/a.ts': 'x\nx\nx\n' }, ['src/a.ts']));
    expect(f[0].reason).toBe('many_matches');
  });

  it('answers a SEARCH that is not there with the real lines near the first line that does occur', () => {
    const file = ['import a from "a";', '', 'export function run(n: number) {', '  return n + 1;', '}', ''].join('\n');
    const r = plan([eb(1, 'src/a.ts', 'export function run(n: number) {\n  return n + 2;\n}', 'export function run(n: number) {\n  return n + 3;\n}')], { 'src/a.ts': file }, ['src/a.ts']);
    expect(failuresOf(r)[0].reason).toBe('no_match');
    if (r.ok) throw new Error('unreachable');
    const m = r.repairMessage;
    expect(m).toContain('# 1 of 1 blocks could not be applied. Nothing was written.');
    expect(m).toContain('## Block 1: src/a.ts: SEARCH not found in the file');
    expect(m).toContain('This SEARCH does not match the current text of src/a.ts exactly (indentation and comments included).');
    expect(m).toContain('Did you mean these actual lines from src/a.ts?');
    expect(m).toContain('  return n + 1;');
    expect(m).toContain('import a from "a";');
    expect(m).not.toContain('may not be needed');
    expect(m.endsWith('Send ALL your blocks again, corrected, in the same format, ending with END-OF-EDITS blocks=<number>.')).toBe(true);
  });

  it('shows no candidate when the first SEARCH line is nowhere in the file, and says when REPLACE is already there', () => {
    const none = plan([eb(1, 'src/a.ts', 'nothing like it', 'y')], { 'src/a.ts': 'a\nb\n' }, ['src/a.ts']);
    if (none.ok) throw new Error('unreachable');
    expect(none.repairMessage).not.toContain('Did you mean');
    const already = plan([eb(1, 'src/a.ts', 'let x = 1; // old', 'let y = 2;\nlet z = 3;')], { 'src/a.ts': 'let y = 2;\nlet z = 3;\n' }, ['src/a.ts']);
    if (already.ok) throw new Error('unreachable');
    expect(already.repairMessage).toContain('The REPLACE lines are already in src/a.ts: this block may not be needed.');
  });

  it('limits the did-you-mean lines to forty', () => {
    const file = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
    const search = Array.from({ length: 100 }, (_, i) => (i === 0 ? 'line 50' : `different ${i}`)).join('\n');
    const r = plan([eb(1, 'src/a.ts', search, 'x')], { 'src/a.ts': file }, ['src/a.ts']);
    if (r.ok) throw new Error('unreachable');
    const shown = r.repairMessage.slice(r.repairMessage.indexOf('Did you mean')).split('\n').filter((l) => /^line \d+$/.test(l));
    expect(shown).toHaveLength(40);
    expect(shown[0]).toBe('line 48');
  });

  it('never puts file text of files the writer may not edit into the repair message', () => {
    const files = { 'src/a.ts': 'visible\n', 'src/secret.ts': 'TOP_SECRET_TEXT\n' };
    const r = plan([eb(1, 'src/secret.ts', 'TOP_SECRET_TEXT', 'x'), eb(2, 'src/a.ts', 'nope', 'y')], files, ['src/a.ts']);
    if (r.ok) throw new Error('unreachable');
    expect(r.repairMessage).toContain('## Block 1: src/secret.ts: path not allowed');
    expect(r.repairMessage).not.toContain('TOP_SECRET_TEXT\n\n');
    // the block the writer sent is echoed back, but the file's own text appears nowhere else
    expect(r.repairMessage.split('TOP_SECRET_TEXT')).toHaveLength(2);
  });

  it('applies a uniform-indentation match and records tier 1', () => {
    const file = ['function f() {', '    if (x) {', '        go();', '    }', '}', ''].join('\n');
    const r = plan([eb(1, 'src/a.ts', 'if (x) {\n    go();\n}', 'if (x) {\n    go();\n\n    stop();\n}')], { 'src/a.ts': file }, ['src/a.ts']);
    const [f] = filesOf(r);
    expect(f.after).toBe(['function f() {', '    if (x) {', '        go();', '', '        stop();', '    }', '}', ''].join('\n'));
    expect(f.tiers).toEqual([1]);
  });

  it('refuses a uniform-indentation match when two windows fit', () => {
    const file = ['function f() {', '    if (x) {', '        go();', '    }', '}', 'function g() {', '    if (x) {', '        go();', '    }', '}', ''].join('\n');
    const f = failuresOf(plan([eb(1, 'src/a.ts', 'if (x) {\n    go();\n}', 'if (x) {\n    stop();\n}')], { 'src/a.ts': file }, ['src/a.ts']));
    expect(f[0]).toMatchObject({ reason: 'many_matches', detail: 'matches 2 places (lines 2, 7)' });
  });

  it('does not match when the indentation differs between lines, or when the text differs at all', () => {
    const file = '    if (x) {\n        go();\n    }\n';
    expect(failuresOf(plan([eb(1, 'src/a.ts', 'if (x) {\n  go();\n}', 'y')], { 'src/a.ts': file }, ['src/a.ts']))[0].reason).toBe('no_match');
    expect(failuresOf(plan([eb(1, 'src/a.ts', 'if (x) {\n    Go();\n}', 'y')], { 'src/a.ts': file }, ['src/a.ts']))[0].reason).toBe('no_match');
    // trailing whitespace in the file is not forgiven
    expect(failuresOf(plan([eb(1, 'src/a.ts', 'if (x) {\n    go();\n}', 'y')], { 'src/a.ts': '    if (x) {  \n        go();\n    }\n' }, ['src/a.ts']))[0].reason).toBe('no_match');
  });

  it('lets a blank SEARCH line face a whitespace-only line in the file at tier 1', () => {
    const file = '    a();\n      \n    b();\n';
    const [f] = filesOf(plan([eb(1, 'src/a.ts', 'a();\n\nb();', 'a();\n\nc();\nb();')], { 'src/a.ts': file }, ['src/a.ts']));
    expect(f.tiers).toEqual([1]);
    expect(f.after).toBe('    a();\n\n    c();\n    b();\n');
  });

  it('keeps CRLF in a CRLF file and LF in an LF file, and refuses mixed endings', () => {
    const crlf = filesOf(plan([eb(1, 'src/a.ts', 'b\nc', 'B1\nB2\nc')], { 'src/a.ts': 'a\r\nb\r\nc\r\nd\r\n' }, ['src/a.ts']))[0];
    expect(crlf.after).toBe('a\r\nB1\r\nB2\r\nc\r\nd\r\n');
    const lf = filesOf(plan([eb(1, 'src/a.ts', 'b\nc', 'B1\nB2\nc')], { 'src/a.ts': 'a\nb\nc\nd\n' }, ['src/a.ts']))[0];
    expect(lf.after).toBe('a\nB1\nB2\nc\nd\n');
    const crlfTier1 = filesOf(plan([eb(1, 'src/a.ts', 'b\nc', 'B\nc')], { 'src/a.ts': 'a\r\n  b\r\n  c\r\n' }, ['src/a.ts']))[0];
    expect(crlfTier1.after).toBe('a\r\n  B\r\n  c\r\n');
    for (const mixed of ['a\r\nb\nc\r\n', 'a\rb\n']) {
      expect(failuresOf(plan([eb(1, 'src/a.ts', 'a', 'x')], { 'src/a.ts': mixed }, ['src/a.ts']))[0].reason).toBe('mixed_line_endings');
    }
  });

  it('refuses a file that holds a line that looks like a marker', () => {
    for (const line of [S, D, R, `${D}  `]) {
      expect(failuresOf(plan([eb(1, 'src/a.ts', 'a', 'x')], { 'src/a.ts': `a\n${line}\nb\n` }, ['src/a.ts']))[0].reason, line).toBe('marker_in_file');
    }
    expect(plan([eb(1, 'src/a.ts', 'a', 'x')], { 'src/a.ts': `a\n${D}=\n` }, ['src/a.ts']).ok).toBe(true);
  });

  it('keeps a byte order mark as the first character', () => {
    const [f] = filesOf(plan([eb(1, 'src/a.ts', 'const a = 1;', 'const a = 2;')], { 'src/a.ts': '\uFEFFconst a = 1;\nlet z;\n' }, ['src/a.ts']));
    expect(f.before?.charCodeAt(0)).toBe(0xfeff);
    expect(f.after).toBe('\uFEFFconst a = 2;\nlet z;\n');
    const [g] = filesOf(plan([eb(1, 'src/a.ts', 'const', 'let')], { 'src/a.ts': '\uFEFFconst a = 1;\n' }, ['src/a.ts']));
    expect(g.after).toBe('\uFEFFlet a = 1;\n');
  });

  it('keeps the final-newline state of an edited file, with and without', () => {
    expect(filesOf(plan([eb(1, 'src/a.ts', 'y', 'z')], { 'src/a.ts': 'x\ny\n' }, ['src/a.ts']))[0].after).toBe('x\nz\n');
    expect(filesOf(plan([eb(1, 'src/a.ts', 'y', 'z\nw')], { 'src/a.ts': 'x\ny' }, ['src/a.ts']))[0].after).toBe('x\nz\nw');
    expect(filesOf(plan([eb(1, 'src/a.ts', 'y', 'z')], { 'src/a.ts': 'x\ny\n\n\n' }, ['src/a.ts']))[0].after).toBe('x\nz\n\n\n');
  });

  it('matches every block against the original text and applies them together', () => {
    const r = plan([eb(1, 'src/a.ts', 'a', 'b'), eb(2, 'src/a.ts', 'b', 'c')], { 'src/a.ts': 'a\nb\nc\n' }, ['src/a.ts']);
    expect(filesOf(r)[0]).toMatchObject({ after: 'b\nc\nc\n', tiers: [0, 0] });
    const reversed = plan([eb(1, 'src/a.ts', 'c', 'C\nC2'), eb(2, 'src/a.ts', 'a', 'A')], { 'src/a.ts': 'a\nb\nc\n' }, ['src/a.ts']);
    expect(filesOf(reversed)[0]).toMatchObject({ after: 'A\nb\nC\nC2\n', tiers: [0, 0] });
  });

  it('refuses blocks of one file that overlap and blames the later block', () => {
    const f = failuresOf(plan([eb(1, 'src/a.ts', 'a\nb', 'x'), eb(2, 'src/a.ts', 'b\nc', 'y')], { 'src/a.ts': 'a\nb\nc\n' }, ['src/a.ts']));
    expect(f.map((x) => [x.index, x.reason])).toEqual([[2, 'overlap']]);
    expect(f[0].detail).toContain('block 1');
    const later = failuresOf(plan([eb(1, 'src/a.ts', 'b\nc', 'y'), eb(2, 'src/a.ts', 'a\nb', 'x')], { 'src/a.ts': 'a\nb\nc\n' }, ['src/a.ts']));
    expect(later.map((x) => [x.index, x.reason])).toEqual([[2, 'overlap']]);
    const same = failuresOf(plan([eb(1, 'src/a.ts', 'a', 'x'), eb(2, 'src/a.ts', 'a', 'y')], { 'src/a.ts': 'a\nb\n' }, ['src/a.ts']));
    expect(same.map((x) => x.index)).toEqual([2]);
  });

  it('allows blocks that touch end to start', () => {
    const r = plan([eb(1, 'src/a.ts', 'ab', 'X'), eb(2, 'src/a.ts', 'cd', 'Y')], { 'src/a.ts': 'abcd\n' }, ['src/a.ts']);
    expect(filesOf(r)[0].after).toBe('XY\n');
  });

  it('writes dollar sequences in REPLACE literally', () => {
    const [f] = filesOf(plan([eb(1, 'src/a.ts', 'x = 1;', 'x = "$&" + "$1" + "$$" + "$`" + "$\'";')], { 'src/a.ts': 'x = 1;\n' }, ['src/a.ts']));
    expect(f.after).toBe('x = "$&" + "$1" + "$$" + "$`" + "$\'";\n');
  });

  it('allows a block that leaves the file unchanged and records it', () => {
    const [f] = filesOf(plan([eb(1, 'src/a.ts', 'a', 'a')], { 'src/a.ts': 'a\n' }, ['src/a.ts']));
    expect(f.after).toBe(f.before);
    expect(f.tiers).toEqual([0]);
  });
});

describe('planEdits: refusals', () => {
  it('refuses zero-width and bidirectional characters in REPLACE and names code point and line', () => {
    const zw = failuresOf(plan([eb(1, 'src/a.ts', 'a', 'x\ny\u200Bz')], { 'src/a.ts': 'a\n' }, ['src/a.ts']));
    expect(zw[0]).toMatchObject({ reason: 'forbidden_characters' });
    expect(zw[0].detail).toContain('U+200B');
    expect(zw[0].detail).toContain('line 2');
    const bidi = failuresOf(plan([eb(1, 'src/a.ts', 'a', 'if (a) { // \u202E }')], { 'src/a.ts': 'a\n' }, ['src/a.ts']));
    expect(bidi[0].reason).toBe('forbidden_characters');
    expect(bidi[0].detail).toContain('U+202E');
    const ctl = failuresOf(plan([eb(1, 'src/a.ts', 'a', 'x\u0001')], { 'src/a.ts': 'a\n' }, ['src/a.ts']));
    expect(ctl[0].detail).toContain('U+0001');
    const made = failuresOf(plan([eb(1, 'src/n.ts', '', 'a\uFEFFb')], {}, [], ['src/n.ts']));
    expect(made[0].reason).toBe('forbidden_characters');
  });

  it('shows a forbidden character in the repair message as a visible code point, not the character', () => {
    const r = plan([eb(1, 'src/a.ts', 'a', 'x\u202Ey')], { 'src/a.ts': 'a\n' }, ['src/a.ts']);
    if (r.ok) throw new Error('unreachable');
    expect(r.repairMessage).toContain('<U+202E>');
    expect(r.repairMessage).not.toContain('\u202E');
  });

  it('refuses an edit of a locked test file and allows it when unlocked', () => {
    const files = { 'tests/foo.test.ts': 'old\n' };
    const locked = failuresOf(plan([eb(1, 'tests/Foo.test.ts', 'old', 'new')], files, ['tests/foo.test.ts'], [], ['Tests/FOO.test.ts']));
    expect(locked[0]).toMatchObject({ reason: 'locked_test', path: 'tests/foo.test.ts' });
    expect(locked[0].detail).toContain('frozen when the gate first passed');
    const open = plan([eb(1, 'tests/foo.test.ts', 'old', 'new')], files, ['tests/foo.test.ts'], [], ['tests/foo.test.ts'], ['tests/FOO.test.ts']);
    expect(filesOf(open)[0].after).toBe('new\n');
  });

  it('collects every failure and plans nothing when one block of several is bad', () => {
    const files = { 'src/a.ts': 'a\n', 'src/b.ts': 'b\n', 'src/c.ts': 'c\n' };
    const r = plan([eb(1, 'src/a.ts', 'a', 'A'), eb(2, 'src/b.ts', 'zzz', 'B'), eb(3, 'src/other.ts', 'c', 'C'), eb(4, 'src/c.ts', 'c', 'C')], files, ['src/a.ts', 'src/b.ts', 'src/c.ts']);
    expect(failuresOf(r).map((f) => [f.index, f.reason])).toEqual([
      [2, 'no_match'],
      [3, 'path_not_allowed'],
    ]);
    if (r.ok) throw new Error('unreachable');
    expect(r.repairMessage).toContain('# 2 of 4 blocks could not be applied. Nothing was written.');
  });

  it('leaves the disk untouched when one of three blocks is bad', () => {
    const root = tmp();
    mkdirSync(join(root, 'src'));
    for (const n of ['a', 'b', 'c']) writeFileSync(join(root, 'src', `${n}.ts`), `${n}\n`);
    const before = listAll(root).map((p) => p);
    const r = planEdits([eb(1, 'src/a.ts', 'a', 'A'), eb(2, 'src/b.ts', 'nope', 'B'), eb(3, 'src/c.ts', 'c', 'C')], buildPolicy({ edit: ['src/a.ts', 'src/b.ts', 'src/c.ts'], create: [] }, [], []), diskStore(root));
    expect(r.ok).toBe(false);
    expect(listAll(root)).toEqual(before);
    for (const n of ['a', 'b', 'c']) expect(readFileSync(join(root, 'src', `${n}.ts`), 'utf8')).toBe(`${n}\n`);
  });

  it('puts a one-sentence reason in the repair message for each other kind of failure', () => {
    const files = { 'src/a.ts': 'a\n' };
    const r = plan([eb(1, 'src/gone.ts', 'a', 'b'), eb(2, 'src/a.ts', '', 'b')], files, ['src/gone.ts', 'src/a.ts']);
    if (r.ok) throw new Error('unreachable');
    expect(r.repairMessage).toContain('## Block 1: src/gone.ts: file does not exist');
    expect(r.repairMessage).toContain('## Block 2: src/a.ts: empty SEARCH on an existing file');
  });
});

describe('diskStore and writePlanned', () => {
  it('reads text with a BOM kept, returns null for a missing file and throws for a directory or bad UTF-8', () => {
    const root = tmp();
    mkdirSync(join(root, 'dir'));
    writeFileSync(join(root, 'bom.txt'), Buffer.from('\uFEFFhello\n', 'utf8'));
    writeFileSync(join(root, 'bad.txt'), Buffer.from([0x61, 0xff, 0xfe, 0x62]));
    const store = diskStore(root);
    expect(store.read('bom.txt')).toBe('\uFEFFhello\n');
    expect(store.read('missing.txt')).toBeNull();
    expect(store.read('nested/missing.txt')).toBeNull();
    expect(() => store.read('dir')).toThrow();
    expect(() => store.read('bad.txt')).toThrow(/UTF-8/);
    expect(() => store.read('../outside.txt')).toThrow();
  });

  it('plans from disk and writes edits and creations, keeping CRLF and the BOM on disk', () => {
    const root = tmp();
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'a.ts'), Buffer.from('\uFEFFone\r\ntwo\r\nthree\r\n', 'utf8'));
    const r = planEdits([eb(1, 'src/a.ts', 'two', 'TWO\nTWO2'), eb(2, 'src/deep/er/n.ts', '', 'export {};')], buildPolicy({ edit: ['src/a.ts'], create: ['src/deep/er/n.ts'] }, [], []), diskStore(root));
    writePlanned(root, filesOf(r));
    expect(readFileSync(join(root, 'src', 'a.ts')).equals(Buffer.from('\uFEFFone\r\nTWO\r\nTWO2\r\nthree\r\n', 'utf8'))).toBe(true);
    expect(readFileSync(join(root, 'src', 'deep', 'er', 'n.ts'), 'utf8')).toBe('export {};\n');
    expect(listAll(root).filter((p) => p.endsWith('.relay-tmp'))).toEqual([]);
  });

  it('keeps the file mode of an edited file', () => {
    if (process.platform === 'win32') return;
    const root = tmp();
    writeFileSync(join(root, 'run.sh'), 'a\n', { mode: 0o755 });
    const r = planEdits([eb(1, 'run.sh', 'a', 'b')], buildPolicy({ edit: ['run.sh'], create: [] }, [], []), diskStore(root));
    writePlanned(root, filesOf(r));
    expect(statSync(join(root, 'run.sh')).mode & 0o777).toBe(0o755);
  });

  it('rolls back everything when a later file cannot be written', () => {
    const root = tmp();
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'a.ts'), 'one\n');
    writeFileSync(join(root, 'src', 'c.ts'), 'appeared\n');
    const snapshot = listAll(root);
    expect(() =>
      writePlanned(root, [
        { path: 'src/a.ts', created: false, before: 'one\n', after: 'ONE\n', tiers: [0] },
        { path: 'fresh/sub/b.ts', created: true, before: null, after: 'b\n', tiers: [0] },
        { path: 'src/c.ts', created: true, before: null, after: 'c\n', tiers: [0] },
      ]),
    ).toThrow(/appeared since the plan/);
    expect(readFileSync(join(root, 'src', 'a.ts'), 'utf8')).toBe('one\n');
    expect(readFileSync(join(root, 'src', 'c.ts'), 'utf8')).toBe('appeared\n');
    expect(listAll(root)).toEqual(snapshot);
  });

  it('rolls back when a created file cannot be written because its parent is a file', () => {
    const root = tmp();
    writeFileSync(join(root, 'a.txt'), 'one\n');
    writeFileSync(join(root, 'blocker'), 'i am a file\n');
    const snapshot = listAll(root);
    expect(() =>
      writePlanned(root, [
        { path: 'a.txt', created: false, before: 'one\n', after: 'two\n', tiers: [0] },
        { path: 'blocker/inside.ts', created: true, before: null, after: 'x\n', tiers: [0] },
      ]),
    ).toThrow();
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('one\n');
    expect(listAll(root)).toEqual(snapshot);
  });

  it('refuses to overwrite an edited file that changed since the plan was made', () => {
    const root = tmp();
    writeFileSync(join(root, 'a.txt'), 'changed by somebody\n');
    writeFileSync(join(root, 'b.txt'), 'b\n');
    expect(() =>
      writePlanned(root, [
        { path: 'b.txt', created: false, before: 'b\n', after: 'B\n', tiers: [0] },
        { path: 'a.txt', created: false, before: 'one\n', after: 'two\n', tiers: [0] },
      ]),
    ).toThrow(/changed since the plan/);
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('changed by somebody\n');
    expect(readFileSync(join(root, 'b.txt'), 'utf8')).toBe('b\n');
  });

  it('removes a stale temporary left by an earlier crash and leaves none behind', () => {
    const root = tmp();
    writeFileSync(join(root, 'a.txt'), 'one\n');
    writeFileSync(join(root, 'a.txt.relay-tmp'), 'stale\n');
    writePlanned(root, [{ path: 'a.txt', created: false, before: 'one\n', after: 'two\n', tiers: [0] }]);
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('two\n');
    expect(listAll(root)).toEqual(['a.txt']);
  });

  it.skipIf(process.platform === 'win32')('refuses a symlinked directory that leads out of the root, for reading and for writing', () => {
    const root = tmp();
    const outside = tmp();
    writeFileSync(join(outside, 'secret.ts'), 'secret\n');
    symlinkSync(outside, join(root, 'link'), 'dir');
    const store = diskStore(root);
    expect(() => store.read('link/secret.ts')).toThrow(/link/);
    expect(() => store.read('link/new.ts')).toThrow(/link/);
    expect(() => writePlanned(root, [{ path: 'link/new.ts', created: true, before: null, after: 'x\n', tiers: [0] }])).toThrow(/link/);
    expect(() => writePlanned(root, [{ path: 'link/secret.ts', created: false, before: 'secret\n', after: 'changed\n', tiers: [0] }])).toThrow(/link/);
    expect(readFileSync(join(outside, 'secret.ts'), 'utf8')).toBe('secret\n');
    expect(listAll(outside)).toEqual(['secret.ts']);
  });
});

describe('renderRepair', () => {
  it('echoes the failed block in the block format, using a longer fence when the block holds backticks', () => {
    const blocks = [eb(1, 'src/a.ts', 'const s = `x`;\n```\nmore', 'y')];
    const failures: BlockFailure[] = [{ index: 1, path: 'src/a.ts', reason: 'no_match', detail: 'SEARCH text not found' }];
    const m = renderRepair(failures, blocks, memStore({ 'src/a.ts': 'q\n' }), buildPolicy({ edit: ['src/a.ts'], create: [] }, [], []));
    expect(m).toContain('````ts\n' + `${S}\nconst s = \`x\`;\n\`\`\`\nmore\n${D}\ny\n${R}\n` + '````');
    expect(m.startsWith('# 1 of 1 blocks could not be applied. Nothing was written.\n\n## Block 1: src/a.ts: SEARCH not found in the file\n')).toBe(true);
  });
});
