// Tests for the model relay's pre-gate scan (tools/relay/scan.ts): what a simulation rule or its test may and may not contain
// before the gate runs it, with the line each finding is reported on, how a work order's grant silences exactly one name, what
// is deliberately not reported (property names, keys, declarations, types), and that the real bread_feeds files scan clean.
// The scan is a tripwire for accidents, not containment; these tests say nothing about code written to get past it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanSource } from '../tools/relay/scan';

const lines = (...l: string[]): string => l.join('\n');
const whats = (path: string, text: string, allow: string[] = []): string[] => scanSource(path, text, allow).map((i) => `${i.line}: ${i.what}`);
const root = join(__dirname, '..');

describe('files that are scanned and files that are not', () => {
  it('returns nothing for data and documents, whatever they contain', () => {
    const hostile = 'import fs from "node:fs"; process.exit(1); eval("x")';
    expect(scanSource('docs/notes.md', hostile, [])).toEqual([]);
    expect(scanSource('tests/fixtures/data.json', hostile, [])).toEqual([]);
    expect(scanSource('src/sim/readme', hostile, [])).toEqual([]);
  });

  it('scans every script extension, whatever the case', () => {
    const text = 'process.exit(1);';
    for (const ext of ['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs', 'TS']) {
      expect(scanSource(`src/sim/a.${ext}`, text, []), ext).toHaveLength(1);
    }
    expect(scanSource('src\\sim\\a.ts', text, [])).toHaveLength(1);
  });

  it('reports the path it was given on every issue', () => {
    const [i] = scanSource('src/sim/a.ts', 'eval("1");', []);
    expect(i.path).toBe('src/sim/a.ts');
    expect(i.line).toBe(1);
  });
});

describe('clean files', () => {
  it('passes a rule module and a test file of the usual shape', () => {
    const rule = lines(
      '// Rules 999: a worked example.',
      "import { NUTRITION } from './constants';",
      "import { runsRulesVersion } from './rulesversion';",
      "import type { FoodKind, World } from './types';",
      '',
      'export const on: Record<string, boolean> = { feeds: true };',
      'export function nutritionOf(world: World, k: FoodKind): number {',
      "  return k === 'bread' && on.feeds && runsRulesVersion(world, 242) ? 60 : NUTRITION[k];",
      '}',
      "export { NUTRITION as nutrition } from './constants';",
    );
    expect(scanSource('src/sim/example.ts', rule, [])).toEqual([]);
    const test = lines(
      "import { afterEach, describe, expect, it } from 'vitest';",
      "import { parseIntervention } from '../scripts/lab/lab';",
      "import { nutritionOf } from '../src/sim/example';",
      "import { addPerson, stage } from './helpers/kit';",
      '',
      'afterEach(() => undefined);',
      "describe('example', () => {",
      "  it('does a thing', () => {",
      '    const s = stage("x");',
      '    expect(nutritionOf(s.w, "bread")).toBe(60);',
      '  });',
      '});',
    );
    expect(scanSource('tests/example.test.ts', test, [])).toEqual([]);
  });

  it('passes the real src/sim/bread_feeds.ts and tests/bread_feeds.test.ts', () => {
    for (const rel of ['src/sim/bread_feeds.ts', 'tests/bread_feeds.test.ts']) {
      expect(scanSource(rel, readFileSync(join(root, rel), 'utf8'), []), rel).toEqual([]);
    }
  });
});

describe('module specifiers', () => {
  it('reports a Node built-in or a package imported any way, on its own line', () => {
    const text = lines(
      "import fs from 'node:fs';",
      "import type { A } from 'some-package';",
      "export * from 'node:path';",
      "export { x } from 'left-pad';",
      "import cp = require('child_process');",
      "const os = await import('node:os');",
      "const m = require('module');",
      "import 'node:net';",
    );
    const got = whats('src/sim/a.ts', text).filter((w) => w.includes('imports'));
    expect(got).toEqual([
      '1: imports "node:fs" (not relative, not vitest, not granted)',
      '2: imports "some-package" (not relative, not vitest, not granted)',
      '3: imports "node:path" (not relative, not vitest, not granted)',
      '4: imports "left-pad" (not relative, not vitest, not granted)',
      '5: imports "child_process" (not relative, not vitest, not granted)',
      '6: imports "node:os" (not relative, not vitest, not granted)',
      '7: imports "module" (not relative, not vitest, not granted)',
      '8: imports "node:net" (not relative, not vitest, not granted)',
    ]);
  });

  it('allows relative specifiers and exactly "vitest", and refuses lookalikes', () => {
    const text = lines("import a from './a';", "import b from '../b';", "import { it } from 'vitest';", "import c from 'vitest/config';", "import d from '.';", "import e from '..\\\\e';");
    expect(whats('tests/a.test.ts', text).map((w) => w.split(':')[0])).toEqual(['4', '5', '6']);
  });

  it('reports a relative specifier that reaches into node_modules', () => {
    const text = lines("import a from '../node_modules/x/index';", "import b from './Node_Modules/y';");
    expect(whats('src/sim/a.ts', text)).toEqual(['1: imports "../node_modules/x/index" (reaches into node_modules)', '2: imports "./Node_Modules/y" (reaches into node_modules)']);
  });

  it('reports a dynamic import or require whose argument is not a plain string', () => {
    const text = lines('const name = "x";', 'const a = await import(name);', "const b = await import('./' + name);", 'const c = await import(`./${name}`);', 'const d = require(name);', 'const e = await import();');
    const got = whats('src/sim/a.ts', text).filter((w) => w.includes('computed'));
    expect(got).toEqual([
      '2: uses a computed module specifier in import()',
      '3: uses a computed module specifier in import()',
      '4: uses a computed module specifier in import()',
      '5: uses a computed module specifier in require()',
      '6: uses a computed module specifier in import()',
    ]);
  });

  it('is silenced by the exact specifier and by nothing near it', () => {
    const text = lines("import fs from 'node:fs';", "import path from 'node:path';", "import x from '../node_modules/x';");
    expect(whats('tests/a.test.ts', text, ['node:fs'])).toHaveLength(2);
    expect(whats('tests/a.test.ts', text, ['fs'])).toHaveLength(3);
    expect(whats('tests/a.test.ts', text, ['node:fs', 'node:path', '../node_modules/x'])).toEqual([]);
    expect(whats('tests/a.test.ts', 'const a = await import(name);', ['computed module specifier'])).toEqual([]);
  });
});

describe('global names', () => {
  const names = ['process', 'globalThis', 'global', 'eval', 'Function', 'require', 'Worker', 'SharedArrayBuffer', 'WebAssembly', 'Deno', 'Bun', 'fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', '__dirname', '__filename'];

  it('reports each name used as a value, on its own line', () => {
    const text = names.map((n) => `use(${n});`).join('\n');
    expect(whats('src/sim/a.ts', text)).toEqual(names.map((n, i) => `${i + 1}: uses the global "${n}"`).sort((a, b) => parseInt(a) - parseInt(b)));
  });

  it('reports a call, a member read, a new expression, a tagged template, a class heritage and a shorthand value', () => {
    const text = lines('process.exit(1);', "const f = new Function('return 1');", 'Function`x`;', 'class A extends Function {}', 'const o = { process };', 'const p = { [globalThis.k]: 1 };');
    expect(whats('src/sim/a.ts', text)).toEqual([
      '1: uses the global "process"',
      '2: uses the global "Function"',
      '3: uses the global "Function"',
      '4: uses the global "Function"',
      '5: uses the global "process"',
      '6: uses the global "globalThis"',
    ]);
  });

  it('does not report a property being read, a property key, a declared name, a parameter, a label or a type', () => {
    const text = lines(
      'const a = x.process + x?.fetch + x.y.global;',
      'const b = { process: 1, fetch() {}, get global() { return 1; }, eval: 2 };',
      'class C { process = 1; fetch() {} static Worker = 2; }',
      'function f(process: number, fetch: string) { return 1; }',
      'let t: Function = null as unknown as Function;',
      'type Deno = { x: number };',
      'interface Bun { y: number }',
      'type G = typeof globalThis;',
      'const h: Array<Function> = [];',
      'outer: for (;;) { break outer; }',
      "import { process as p2 } from './x';",
      'const { fetch: g, process: k } = x;',
      'enum E { process, fetch }',
      'namespace WebSocket { export const z = 1; }',
    );
    expect(whats('src/sim/a.ts', text)).toEqual([]);
  });

  it('still reports a use of a name a local declaration shadows', () => {
    const text = lines('const process = { env: {} };', 'process.env.x = "1";', 'function f(fetch) { return fetch(1); }');
    expect(whats('src/sim/a.ts', text)).toEqual(['2: uses the global "process"', '3: uses the global "fetch"']);
  });

  it('is silenced by the name, one name at a time', () => {
    const text = lines('process.exit(1);', 'fetch("x");');
    expect(whats('tests/a.test.ts', text, ['process'])).toEqual(['2: uses the global "fetch"']);
    expect(whats('tests/a.test.ts', text, ['process', 'fetch'])).toEqual([]);
  });

  it('reports a granted require call\'s specifier separately from the global', () => {
    const text = "const fs = require('node:fs');";
    expect(whats('tests/a.test.ts', text, ['require'])).toEqual(['1: imports "node:fs" (not relative, not vitest, not granted)']);
    expect(whats('tests/a.test.ts', text, ['require', 'node:fs'])).toEqual([]);
  });
});

describe('import.meta, constructor and with', () => {
  it('reports import.meta, and a grant by that name silences it', () => {
    const text = lines('const here = import.meta.url;', 'const ok = 1;');
    expect(whats('src/sim/a.ts', text)).toEqual(['1: reads import.meta']);
    expect(whats('src/sim/a.ts', text, ['import.meta'])).toEqual([]);
  });

  it('reports a read of constructor by dot, by string index and by destructuring', () => {
    const text = lines(
      '({}).constructor.constructor("return 1")();',
      "const a = x['constructor'];",
      'const b = x?.constructor;',
      'const { constructor: c } = x;',
      'const { constructor } = x;',
      'class K { constructor() {} }',
      'const ok = x.constructors + x["construct"];',
    );
    expect(whats('src/sim/a.ts', text)).toEqual(['1: reads ".constructor"', '2: reads ".constructor"', '3: reads ".constructor"', '4: reads ".constructor"', '5: reads ".constructor"']);
  });

  it('is silenced by the name "constructor"', () => {
    expect(whats('src/sim/a.ts', 'const n = err.constructor.name;', ['constructor'])).toEqual([]);
  });

  it('reports a with statement, and a grant by that name silences it', () => {
    const text = lines('with (obj) {', '  go();', '}');
    expect(whats('src/sim/a.js', text)).toEqual(['1: uses a "with" statement']);
    expect(whats('src/sim/a.js', text, ['with'])).toEqual([]);
  });
});

describe('syntax errors', () => {
  it('reports a file that does not parse, on the line of the error', () => {
    const got = whats('src/sim/a.ts', lines('const ok = 1;', 'const = ;'));
    expect(got.length).toBeGreaterThan(0);
    expect(got[0]).toMatch(/^2: does not parse: /);
  });

  it('reports at most three', () => {
    const text = Array.from({ length: 10 }, () => 'const = ;').join('\n');
    const got = whats('src/sim/a.ts', text).filter((w) => w.includes('does not parse'));
    expect(got).toHaveLength(3);
  });

  it('is not silenced by any grant', () => {
    expect(whats('src/sim/a.ts', 'const = ;', ['does not parse'])).not.toEqual([]);
  });
});

describe('order', () => {
  it('lists issues by line, then by text, and once per line and reason', () => {
    const text = lines("import z from 'zeta';", 'process.exit(process.env.x ? 1 : 0);', "import a from 'alpha'; eval('x'); fetch('y');", 'const a = x.constructor; const b = y.constructor;');
    const got = scanSource('src/sim/a.ts', text, []);
    expect(got.map((i) => [i.line, i.what])).toEqual([
      [1, 'imports "zeta" (not relative, not vitest, not granted)'],
      [2, 'uses the global "process"'],
      [3, 'imports "alpha" (not relative, not vitest, not granted)'],
      [3, 'uses the global "eval"'],
      [3, 'uses the global "fetch"'],
      [4, 'reads ".constructor"'],
    ]);
    expect(scanSource('src/sim/a.ts', text, [])).toEqual(got);
  });
});

describe('module loading through the test runner', () => {
  const forms: Array<[string, string]> = [
    ['importActual', "const fs = await vi.importActual<any>('node:fs');"],
    ['importMock', "const fs = await vi.importMock('node:fs');"],
    ['doMock', "vi.doMock('node:child_process', () => ({}));"],
    ['mock', "vi.mock('some-package');"],
    ['unmock', "vi.unmock('left-pad');"],
    ['doUnmock', "vi.doUnmock('left-pad');"],
    ['bare mock call', "mock('left-pad');"],
  ];

  it.each(forms)('refuses %s with a non-relative specifier', (_name, text) => {
    expect(scanSource('tests/x.test.ts', text, []).length).toBeGreaterThan(0);
  });

  it('accepts the same forms when the specifier is granted for the file', () => {
    expect(whats('tests/x.test.ts', "const fs = await vi.importActual('node:fs'); vi.doMock('node:fs', () => ({}));", ['node:fs'])).toEqual([]);
    expect(whats('tests/x.test.ts', "vi.mock('left-pad'); vi.unmock('left-pad');", ['left-pad'])).toEqual([]);
  });

  it('refuses a computed first argument and accepts a relative one', () => {
    expect(whats('tests/x.test.ts', 'const n = "a"; await vi.importActual(n);')).toEqual(['1: uses a computed module specifier in importActual()']);
    expect(whats('tests/x.test.ts', "vi.mock('../src/sim/x', () => ({}));")).toEqual([]);
    expect(whats('tests/x.test.ts', 'await vi.importActual(`node:${n}`);', ['computed module specifier', 'node:'])).toEqual([]);
  });

  it('refuses the identifiers the runner injects, wherever they appear', () => {
    for (const id of ['__vite_ssr_dynamic_import__', '__vite_ssr_import_meta__', '__vitest_worker__', '__vi_import_0__']) {
      expect(scanSource('tests/x.test.ts', `const m = await ${id}('x');`, []).length, id).toBeGreaterThan(0);
      expect(scanSource('tests/x.test.ts', `const o = { ${id}: 1 }; o.${id};`, []).length, id).toBeGreaterThan(0);
    }
    expect(whats('tests/x.test.ts', 'const __vite_ssr_import_meta__ = 1;', ['__vite_ssr_import_meta__'])).toEqual([]);
  });

  it('refuses a string that names a Node built-in with its prefix anywhere, and a bare name where a loader takes it', () => {
    expect(scanSource('tests/x.test.ts', "const m = 'node:os';", [])).toHaveLength(1);
    expect(scanSource('tests/x.test.ts', 'const m = `node:os`; const n = `node:${x}`;', [])).toHaveLength(2);
    expect(scanSource('tests/x.test.ts', "vi.importActual('child_process');", [])).toHaveLength(1);
    expect(scanSource('tests/x.test.ts', "vi.doMock('fs/promises');", [])).toHaveLength(1);
    expect(whats('tests/x.test.ts', "const m = 'node:os'; vi.importActual('child_process');", ['node:os', 'child_process'])).toEqual([]);
  });

  it('lets a game word that is also a built-in name be passed to an ordinary call', () => {
    // this simulation has a fishing net, a stream and events; a test that hands those words to a helper is ordinary
    expect(whats('tests/x.test.ts', "give(p, 'net'); near(w, 'stream'); log('events'); load('child_process');")).toEqual([]);
  });

  it('lets a bare built-in word stand as a value or a key, and reports one import once', () => {
    expect(whats('tests/x.test.ts', "const w = 'url'; const o = { events: 'process' };")).toEqual([]);
    expect(whats('tests/x.test.ts', "import fs from 'node:fs';")).toEqual(['1: imports "node:fs" (not relative, not vitest, not granted)']);
  });

  it('passes an ordinary test that imports from vitest and a relative module and uses vi', () => {
    const text = lines(
      "import { describe, expect, it, vi } from 'vitest';",
      "import { thing } from '../src/sim/x';",
      "describe('thing', () => {",
      "  it('works', () => {",
      '    const f = vi.fn();',
      "    const s = vi.spyOn(console, 'log');",
      '    vi.useFakeTimers();',
      '    expect(thing(f)).toBe(1);',
      '    s.mockRestore();',
      '  });',
      '});',
    );
    expect(whats('tests/x.test.ts', text)).toEqual([]);
  });
});

describe('a file the scan cannot walk', () => {
  it('returns one issue on line 1 for 5,000 nested brackets and does not throw', () => {
    const text = `const x = ${'['.repeat(5000)}${']'.repeat(5000)};`;
    const got = scanSource('src/sim/a.ts', text, []);
    expect(got).toHaveLength(1);
    expect(got[0].line).toBe(1);
    expect(got[0].what).toMatch(/could not be scanned/);
  });

  it('is not silenced by any grant', () => {
    const text = `${'('.repeat(5000)}1${')'.repeat(5000)};`;
    expect(scanSource('src/sim/a.ts', text, ['could not be scanned']).length).toBe(1);
  });
});
