// Rules-version gates: where a behaviour change is switched on by the version a world was created under, what each gate guards,
// and which shared state that guarded code touches.
//   npx vite-node scripts/rules_gates.ts -- --out <dir> [--inputs <dir holding state.json and graph.json>]
// Writes <out>/report.md and <out>/gates.json.
//
// How a gate is found (TypeScript compiler API, the same program and field attribution as scripts/state_map.ts):
//   * the only primitive is runsRulesVersion(world, N) (src/sim/rulesversion.ts). Nothing in src compares a version number by hand.
//     N is a literal, a named constant (resolved by the checker), or data (recipe.minRules): those are 'dynamic'.
//   * HELPERS: a function whose whole body is one returned expression with a gate in its && chain (hasBrewing, partOn, runs ...)
//     is a gate helper; its version is the highest in the chain. Helpers of helpers are followed to a fixed point. The calls to a
//     helper are the gate sites; the gate inside the helper is its definition and is not counted again.
//   * LOCAL FLAGS: const allowed = dynamics === 'rich' && runsRulesVersion(w, N); each later use of `allowed` is a gate site.
// Guarded region of a site (the code the gate switches on):
//   if (gate && x) A else B          -> A          (B is the legacy path)
//   if (!gate || x) return;  tail    -> the statements after the if (and the else, if any)
//   if (!gate) A else B              -> B          (A is the legacy path)
//   gate ? A : B                     -> A
//   gate && expr                     -> expr
//   anything else (gate inside other logic) -> the enclosing statement, kind 'statement'
// Field accesses are the direct accesses in the region (no calls followed), so reads and writes are a floor.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { domainOfRel } from './lib/domains';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { RULES_SUPPORT_FLOOR } from '../src/sim/support_floor';

const args = process.argv.slice(2).filter((a) => a !== '--');
const arg = (k: string, d: string): string => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const outDir = arg('--out', 'rules_gates');
const inputsDir = arg('--inputs', 'C:/dev/_claude_scratch/map-20261127/inputs');
const FLOOR = RULES_SUPPORT_FLOOR;
const SRC = resolve('src');
const TYPES = resolve('src/sim/types.ts');
const t0 = Date.now();

const cfgPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')!;
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, process.cwd());
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, noEmit: true });
const checker = program.getTypeChecker();

// ───────────── field access attribution (as state_map.ts) ─────────────
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'set', 'delete', 'add', 'clear', 'copyWithin']);
const ASSIGN = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.PercentEqualsToken, ts.SyntaxKind.BarEqualsToken, ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.CaretEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken, ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken, ts.SyntaxKind.LessThanLessThanEqualsToken, ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
]);
const skipParens = (n: ts.Node): ts.Node => {
  while (n.parent && (ts.isParenthesizedExpression(n.parent) || ts.isNonNullExpression(n.parent) || ts.isAsExpression(n.parent))) n = n.parent;
  return n;
};
function writeKind(node: ts.Node): 'write' | 'read' {
  const n = skipParens(node);
  const p = n.parent;
  if (!p) return 'read';
  if (ts.isBinaryExpression(p) && p.left === n && ASSIGN.has(p.operatorToken.kind)) return 'write';
  if ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && (p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken)) return 'write';
  if (ts.isDeleteExpression(p)) return 'write';
  if (ts.isElementAccessExpression(p) && p.expression === n) {
    const q = skipParens(p).parent;
    if (q && ts.isBinaryExpression(q) && q.left === skipParens(p) && ASSIGN.has(q.operatorToken.kind)) return 'write';
    if (q && (ts.isPrefixUnaryExpression(q) || ts.isPostfixUnaryExpression(q))) return 'write';
    if (q && ts.isDeleteExpression(q)) return 'write';
  }
  if (ts.isPropertyAccessExpression(p) && p.expression === n && MUTATORS.has(p.name.text)) {
    const call = skipParens(p).parent;
    if (call && ts.isCallExpression(call) && call.expression === skipParens(p)) return 'write';
  }
  return 'read';
}
/** the field key ('Person.inv') a property access resolves to, if it is a field of a type in types.ts */
function fieldKey(node: ts.PropertyAccessExpression): string | null {
  const sym = checker.getSymbolAtLocation(node.name);
  const decl = sym?.declarations?.[0];
  if (!decl || resolve(decl.getSourceFile().fileName) !== TYPES || !decl.parent) return null;
  if (!(ts.isInterfaceDeclaration(decl.parent) || ts.isTypeLiteralNode(decl.parent) || ts.isClassDeclaration(decl.parent))) return null;
  let owner = '';
  if (ts.isInterfaceDeclaration(decl.parent) || ts.isClassDeclaration(decl.parent)) owner = decl.parent.name?.text ?? '';
  else {
    let q: ts.Node = decl.parent;
    while (q && !ts.isInterfaceDeclaration(q) && !ts.isTypeAliasDeclaration(q)) q = q.parent;
    owner = q && (ts.isInterfaceDeclaration(q) || ts.isTypeAliasDeclaration(q)) ? q.name.text : '';
  }
  return owner ? owner + '.' + node.name.text : null;
}

// ───────────── source files ─────────────
const srcFiles = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile && resolve(sf.fileName).startsWith(SRC));
const relOf = (sf: ts.SourceFile): string => relative(SRC, resolve(sf.fileName)).split('\\').join('/');
const lineOf = (n: ts.Node): number => n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1;
const endLineOf = (n: ts.Node): number => n.getSourceFile().getLineAndCharacterOfPosition(n.getEnd()).line + 1;
const rulesFile = srcFiles.find((sf) => relOf(sf) === 'sim/rulesversion.ts')!;
let gateSym: ts.Symbol | undefined;
rulesFile.forEachChild((n) => {
  if (ts.isFunctionDeclaration(n) && n.name?.text === 'runsRulesVersion') gateSym = checker.getSymbolAtLocation(n.name);
});
if (!gateSym) throw new Error('runsRulesVersion not found');

const symOfCallee = (e: ts.Expression): ts.Symbol | undefined => {
  let s = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(e) ? e.name : e);
  if (s && s.flags & ts.SymbolFlags.Alias) s = checker.getAliasedSymbol(s);
  return s;
};
const unparen = (e: ts.Node): ts.Node => {
  while (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) e = e.expression;
  return e;
};

// ───────────── version of a direct gate ─────────────
function evalNum(e: ts.Expression, depth = 0): number | null {
  e = unparen(e) as ts.Expression;
  if (ts.isNumericLiteral(e)) return Number(e.text);
  const t = checker.getTypeAtLocation(e);
  if (t.isNumberLiteral()) return t.value;
  if (ts.isIdentifier(e) && depth < 4) {
    const d = checker.getSymbolAtLocation(e)?.valueDeclaration;
    if (d && ts.isVariableDeclaration(d) && d.initializer) return evalNum(d.initializer, depth + 1);
  }
  return null;
}
const isDirectGate = (n: ts.Node): n is ts.CallExpression => ts.isCallExpression(n) && symOfCallee(n.expression) === gateSym;

// ───────────── gate sources: helpers and local flags ─────────────
interface Source { kind: 'helper' | 'flag'; name: string; file: string; line: number; version: number | null; dynamic: boolean; atoms: Set<ts.Node>; uses: number; domain: string }
const sources = new Map<ts.Symbol, Source>();
interface Cand { sym: ts.Symbol; name: string; expr: ts.Expression; kind: 'helper' | 'flag'; file: string; line: number }
const cands: Cand[] = [];
const soleReturn = (b: ts.ConciseBody | undefined): ts.Expression | undefined => {
  if (!b) return undefined;
  if (!ts.isBlock(b)) return b;
  const real = b.statements;
  return real.length === 1 && ts.isReturnStatement(real[0]) && real[0].expression ? real[0].expression : undefined;
};
for (const sf of srcFiles) {
  const file = relOf(sf);
  const visit = (n: ts.Node): void => {
    if (ts.isFunctionDeclaration(n) && n.name) {
      const e = soleReturn(n.body);
      const sym = checker.getSymbolAtLocation(n.name);
      if (e && sym && sym !== gateSym) cands.push({ sym, name: n.name.text, expr: e, kind: 'helper', file, line: lineOf(n) });
    } else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const sym = checker.getSymbolAtLocation(n.name);
      const init = unparen(n.initializer);
      if (sym) {
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          const e = soleReturn(init.body);
          if (e) cands.push({ sym, name: n.name.text, expr: e, kind: 'helper', file, line: lineOf(n) });
        } else cands.push({ sym, name: n.name.text, expr: n.initializer, kind: 'flag', file, line: lineOf(n) });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
/** the leaves of an && chain (through parentheses): the things that must all be true */
function andLeaves(e: ts.Node, out: ts.Node[] = []): ts.Node[] {
  const u = unparen(e);
  if (ts.isBinaryExpression(u) && u.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    andLeaves(u.left, out);
    andLeaves(u.right, out);
  } else out.push(u);
  return out;
}
/** is this node a gate atom: a direct gate, a call to a known helper, or a use of a known flag. Gives its version. */
function atomOf(n: ts.Node): { version: number | null; dynamic: boolean; name: string; idiom: string; src?: Source } | undefined {
  if (isDirectGate(n)) {
    const v = n.arguments[1] ? evalNum(n.arguments[1]) : null;
    const a = n.arguments[1];
    const idiom = v === null ? 'direct, version from data' : a && ts.isNumericLiteral(unparen(a)) ? 'direct, literal' : 'direct, named constant';
    return { version: v, dynamic: v === null, name: 'runsRulesVersion', idiom };
  }
  if (ts.isCallExpression(n)) {
    const s = symOfCallee(n.expression);
    const src = s && sources.get(s);
    if (src && src.kind === 'helper') return { version: src.version, dynamic: src.dynamic, name: src.name, idiom: 'helper call', src };
  }
  if (ts.isIdentifier(n)) {
    const s = checker.getSymbolAtLocation(n);
    const src = s && sources.get(s);
    if (src && src.kind === 'flag') return { version: src.version, dynamic: src.dynamic, name: src.name, idiom: 'local flag', src };
  }
  return undefined;
}
for (let changed = true; changed; ) {
  changed = false;
  for (const c of cands) {
    if (sources.has(c.sym)) continue;
    const atoms = andLeaves(c.expr).filter((l) => atomOf(l));
    if (!atoms.length) continue;
    let version: number | null = null, dynamic = false;
    for (const a of atoms) {
      const at = atomOf(a)!;
      if (at.version === null) dynamic = true;
      else version = Math.max(version ?? 0, at.version);
    }
    sources.set(c.sym, { kind: c.kind, name: c.name, file: c.file, line: c.line, version, dynamic: dynamic && version === null, atoms: new Set(atoms), uses: 0, domain: domainOfRel(c.file) });
    changed = true;
  }
}
const definitionAtoms = new Set<ts.Node>();
for (const s of sources.values()) for (const a of s.atoms) definitionAtoms.add(a);

// ───────────── region of a site ─────────────
type Kind = 'then' | 'else' | 'tail' | 'else+tail' | 'ternary' | 'short-circuit' | 'loop body' | 'statement' | 'legacy only' | 'mixed';
interface Region { kind: Kind; nodes: ts.Node[]; dead: ts.Node[] }
const isExit = (s: ts.Statement): boolean => {
  if (ts.isReturnStatement(s) || ts.isThrowStatement(s) || ts.isContinueStatement(s) || ts.isBreakStatement(s)) return true;
  if (ts.isBlock(s)) return s.statements.length > 0 && isExit(s.statements[s.statements.length - 1]);
  return false;
};
function tailOf(s: ts.Statement): ts.Statement[] {
  const p = s.parent;
  if (ts.isBlock(p) || ts.isSourceFile(p) || ts.isModuleBlock(p) || ts.isCaseClause(p) || ts.isDefaultClause(p)) {
    const i = p.statements.indexOf(s);
    return p.statements.slice(i + 1);
  }
  return [];
}
const enclosingStatement = (n: ts.Node): ts.Statement | undefined => {
  let x: ts.Node | undefined = n;
  while (x && !ts.isStatement(x)) x = x.parent;
  return x as ts.Statement | undefined;
};
function regionOf(site: ts.Node): Region {
  let x: ts.Node = site;
  let T = true, F = false, Tn = false, Fn = true;
  let shortRight: ts.Node | undefined;
  for (;;) {
    const p = x.parent;
    if (!p) break;
    if (ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p) || ts.isAsExpression(p)) { x = p; continue; }
    if (ts.isPrefixUnaryExpression(p) && p.operator === ts.SyntaxKind.ExclamationToken) {
      [T, F] = [F, T];
      [Tn, Fn] = [Fn, Tn];
      x = p;
      continue;
    }
    if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      if (p.left === x && T && !shortRight) shortRight = p.right;
      F = false; Fn = false;
      x = p;
      continue;
    }
    if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      if (p.left === x && F && !shortRight) shortRight = p.right;
      T = false; Tn = false;
      x = p;
      continue;
    }
    break;
  }
  const root = x, p = root.parent;
  if (p && ts.isIfStatement(p) && p.expression === root) {
    const then = [p.thenStatement], els = p.elseStatement ? [p.elseStatement] : [];
    const exits = isExit(p.thenStatement);
    // an if that is itself the else of another if: the tail does not belong to it alone
    const nested = ts.isIfStatement(p.parent) && p.parent.elseStatement === p;
    if (T) return { kind: 'then', nodes: then, dead: els };
    if (F) {
      if (exits && !nested) return { kind: p.elseStatement ? 'else+tail' : 'tail', nodes: [...els, ...tailOf(p)], dead: then };
      if (p.elseStatement) return { kind: 'else', nodes: els, dead: then };
      return { kind: 'legacy only', nodes: [], dead: then };
    }
    if (Tn) return { kind: 'legacy only', nodes: [], dead: then };
    if (Fn) return { kind: 'mixed', nodes: then, dead: els };
    return { kind: 'mixed', nodes: [p.thenStatement, ...els], dead: [] };
  }
  if (p && ts.isConditionalExpression(p) && p.condition === root) {
    if (T) return { kind: 'ternary', nodes: [p.whenTrue], dead: [p.whenFalse] };
    if (F) return { kind: 'ternary', nodes: [p.whenFalse], dead: [p.whenTrue] };
    if (Tn) return { kind: 'legacy only', nodes: [], dead: [p.whenTrue] };
    return { kind: 'mixed', nodes: [p.whenTrue, p.whenFalse], dead: [] };
  }
  if (p && (ts.isWhileStatement(p) || ts.isForStatement(p)) && (ts.isWhileStatement(p) ? p.expression === root : p.condition === root)) return { kind: 'loop body', nodes: [p.statement], dead: [] };
  if (shortRight) return { kind: 'short-circuit', nodes: [shortRight], dead: [] };
  const st = enclosingStatement(root);
  return { kind: 'statement', nodes: st ? [st] : [], dead: [] };
}

// ───────────── gather the sites ─────────────
interface Site {
  file: string; line: number; domain: string; version: number | null; effVersion: number | null; idiom: string; via: string;
  fn: string; kind: Kind; regionLines: number[]; reads: string[]; writes: string[]; deadLines: number;
}
const sites: Site[] = [];
const enclosingFn = (n: ts.Node): string => {
  for (let x: ts.Node | undefined = n; x; x = x.parent) {
    if (ts.isFunctionDeclaration(x) && x.name) return x.name.text;
    if (ts.isMethodDeclaration(x) && ts.isIdentifier(x.name)) return x.name.text;
    if ((ts.isArrowFunction(x) || ts.isFunctionExpression(x)) && ts.isVariableDeclaration(x.parent) && ts.isIdentifier(x.parent.name)) return x.parent.name.text;
  }
  return '(module)';
};
const SUPPORTED = [...SUPPORTED_RULES_VERSIONS];
const effective = (v: number): number => SUPPORTED.find((s) => s >= v) ?? v;
const accessesIn = (nodes: ts.Node[]): { reads: Map<string, number>; writes: Map<string, number> } => {
  const reads = new Map<string, number>(), writes = new Map<string, number>();
  const walk = (n: ts.Node): void => {
    if (ts.isPropertyAccessExpression(n)) {
      const k = fieldKey(n);
      if (k) {
        const m = writeKind(n) === 'write' ? writes : reads;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
    ts.forEachChild(n, walk);
  };
  for (const n of nodes) walk(n);
  return { reads, writes };
};
const span = (nodes: ts.Node[]): number => nodes.reduce((s, n) => s + (endLineOf(n) - lineOf(n) + 1), 0);
let dynamicSites = 0;
for (const sf of srcFiles) {
  const file = relOf(sf);
  if (file === 'sim/rulesversion.ts') continue;
  const domain = domainOfRel(file);
  const visit = (n: ts.Node): void => {
    if ((ts.isCallExpression(n) || ts.isIdentifier(n)) && !definitionAtoms.has(n)) {
      // an identifier that is a flag's own declaration name is not a use
      const isDeclName = ts.isIdentifier(n) && ts.isVariableDeclaration(n.parent) && n.parent.name === n;
      const at = isDeclName ? undefined : atomOf(n);
      if (at) {
        if (at.src) at.src.uses++;
        const r = regionOf(n);
        const a = accessesIn(r.nodes);
        if (at.version === null) dynamicSites++;
        sites.push({
          file, line: lineOf(n), domain, version: at.version, effVersion: at.version === null ? null : effective(at.version), idiom: at.idiom,
          via: at.name, fn: enclosingFn(n), kind: r.kind, regionLines: [r.nodes.length ? lineOf(r.nodes[0]) : 0, r.nodes.length ? endLineOf(r.nodes[r.nodes.length - 1]) : 0],
          reads: [...a.reads.keys()].sort(), writes: [...a.writes.keys()].sort(), deadLines: span(r.dead),
        });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
// a flag declared but never used in a condition would have no site: count those as sites of their own so nothing is lost
for (const s of sources.values()) {
  if (s.kind === 'flag' && s.uses === 0) {
    const first = [...s.atoms][0];
    const r = regionOf(first);
    const a = accessesIn(r.nodes);
    sites.push({ file: s.file, line: s.line, domain: s.domain, version: s.version, effVersion: s.version === null ? null : effective(s.version), idiom: 'local flag (unused)', via: s.name, fn: '(declaration)', kind: r.kind, regionLines: [0, 0], reads: [...a.reads.keys()].sort(), writes: [...a.writes.keys()].sort(), deadLines: 0 });
  }
}

// ───────────── inputs: state ownership and the import matrix ─────────────
const state = JSON.parse(readFileSync(join(inputsDir, 'state.json'), 'utf8')) as { fields: { key: string; writers: Record<string, number>; readers: Record<string, number> }[]; pairs: { a: string; b: string; n: number }[] };
const graph = JSON.parse(readFileSync(join(inputsDir, 'graph.json'), 'utf8')) as { domains: string[]; matrix: number[][] };
const writersOf = new Map<string, Record<string, number>>();
const ownerOf = new Map<string, string>();
for (const f of state.fields) {
  writersOf.set(f.key, f.writers);
  const w = Object.entries(f.writers).sort((x, y) => y[1] - x[1]);
  if (w.length) ownerOf.set(f.key, w[0][0]);
}
const impOf = (a: string, b: string): number => {
  const i = graph.domains.indexOf(a), j = graph.domains.indexOf(b);
  return i < 0 || j < 0 ? 0 : graph.matrix[i][j];
};

// ───────────── per-site derived facts ─────────────
interface Derived { foreignTouch: string[]; foreignWrite: string[]; links: Map<string, string[]> }
const derived = new Map<Site, Derived>();
for (const s of sites) {
  const foreignTouch = [...new Set([...s.reads, ...s.writes])].filter((k) => ownerOf.has(k) && ownerOf.get(k) !== s.domain);
  const foreignWrite = s.writes.filter((k) => ownerOf.has(k) && ownerOf.get(k) !== s.domain);
  const links = new Map<string, string[]>();
  for (const k of s.reads) for (const b of Object.keys(writersOf.get(k) ?? {})) if (b !== s.domain) (links.get(b) ?? links.set(b, []).get(b)!).push(k);
  derived.set(s, { foreignTouch, foreignWrite, links });
}

// ───────────── aggregates ─────────────
const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
interface VStat { v: number; sites: number; direct: number; helper: number; flag: number; domains: Set<string>; files: Set<string>; reads: Set<string>; writes: Set<string>; cross: number; belowFloor: boolean }
const byVersion = new Map<number, VStat>();
const dynamic = sites.filter((s) => s.version === null);
for (const s of sites) {
  if (s.version === null) continue;
  let v = byVersion.get(s.version);
  if (!v) byVersion.set(s.version, (v = { v: s.version, sites: 0, direct: 0, helper: 0, flag: 0, domains: new Set(), files: new Set(), reads: new Set(), writes: new Set(), cross: 0, belowFloor: s.version < FLOOR }));
  v.sites++;
  if (s.idiom.startsWith('direct')) v.direct++;
  else if (s.idiom === 'helper call') v.helper++;
  else v.flag++;
  v.domains.add(s.domain);
  v.files.add(s.file);
  s.reads.forEach((k) => v!.reads.add(k));
  s.writes.forEach((k) => v!.writes.add(k));
  if (derived.get(s)!.foreignTouch.length) v.cross++;
}
const versions = [...byVersion.values()].sort((a, b) => a.v - b.v);
const numeric = sites.filter((s) => s.version !== null);
const title = new Map<number, string>();
{
  // the one-line summaries beside CURRENT_RULES_VERSION, then the headline of a checkpoint entry, then the first mention in the log
  for (const line of readFileSync('src/sim/rulesversion.ts', 'utf8').split(/\r?\n/)) {
    const m = /^\/\/ Version (\d+)[^:.]*[:.]\s*(.{0,110})/.exec(line);
    if (m && !title.has(Number(m[1]))) title.set(Number(m[1]), m[2].trim());
  }
  const log = readFileSync('docs/RULES_LOG.md', 'utf8').split(/\r?\n/);
  for (const line of log) {
    const m = /^\*\*Rules (\d+) checkpoint[^:]*?:\s*(.{0,110})/.exec(line);
    if (m && !title.has(Number(m[1]))) title.set(Number(m[1]), m[2].replace(/\s*\(`.*$/, '').replace(/[*|]/g, '').trim());
  }
  for (const v of SUPPORTED) {
    if (title.has(v)) continue;
    const re = new RegExp(`[Rr]ules[ -]${v}\\b`);
    const hit = log.find((l) => re.test(l));
    if (hit) title.set(v, '~' + hit.slice(hit.search(re), hit.search(re) + 110).replace(/[*|]/g, '').trim());
  }
}
const T = (v: number): string => title.get(v) ?? '';
const pct = (a: number, b: number): string => (b ? Math.round((100 * a) / b) : 0) + '%';

// floor
const atFloor = (s: Site): boolean => s.version !== null && s.version <= FLOOR;
const belowFloor = (s: Site): boolean => s.version !== null && s.version < FLOOR;
const belowSites = numeric.filter(belowFloor), atOrBelow = numeric.filter(atFloor);
const clean = (s: Site): boolean => ['then', 'else', 'tail', 'else+tail', 'ternary', 'short-circuit'].includes(s.kind);
const collapse = atOrBelow.filter(clean);
const legacyOnly = atOrBelow.filter((s) => s.kind === 'legacy only');
const deadLegacyLines = sum(atOrBelow.map((s) => s.deadLines));
const helpersBelow = [...sources.values()].filter((s) => s.kind === 'helper' && s.version !== null && s.version <= FLOOR);
const helpersAll = [...sources.values()].filter((s) => s.kind === 'helper');
const flagsAll = [...sources.values()].filter((s) => s.kind === 'flag');

// contested fields
interface FStat { key: string; versions: Set<number>; sites: number; domains: Set<string>; owner: string }
const contested = new Map<string, FStat>();
const contestedReads = new Map<string, FStat>();
for (const s of numeric) {
  for (const [list, map] of [[s.writes, contested], [s.reads, contestedReads]] as const)
    for (const k of list) {
      let f = map.get(k);
      if (!f) map.set(k, (f = { key: k, versions: new Set(), sites: 0, domains: new Set(), owner: ownerOf.get(k) ?? '-' }));
      f.versions.add(s.version!);
      f.sites++;
      f.domains.add(s.domain);
    }
}
const rangeOf = (set: Set<number>): string => `${Math.min(...set)}-${Math.max(...set)}`;

// cross-domain
const crossSites = sites.filter((s) => derived.get(s)!.foreignTouch.length);
const crossWriteSites = sites.filter((s) => derived.get(s)!.foreignWrite.length);
const regionSites = sites.filter((s) => s.reads.length + s.writes.length);

// files
const byFile = new Map<string, { n: number; versions: Set<number>; domain: string }>();
for (const s of sites) {
  let f = byFile.get(s.file);
  if (!f) byFile.set(s.file, (f = { n: 0, versions: new Set(), domain: s.domain }));
  f.n++;
  if (s.version !== null) f.versions.add(s.version);
}
const byDomain = new Map<string, number>();
for (const s of sites) byDomain.set(s.domain, (byDomain.get(s.domain) ?? 0) + 1);

// coupling matrix
interface Cell { gates: number; fields: Set<string> }
const M = new Map<string, Map<string, Cell>>();
for (const s of sites) {
  for (const [b, keys] of derived.get(s)!.links) {
    let row = M.get(s.domain);
    if (!row) M.set(s.domain, (row = new Map()));
    let c = row.get(b);
    if (!c) row.set(b, (c = { gates: 0, fields: new Set() }));
    c.gates++;
    keys.forEach((k) => c!.fields.add(k));
  }
}
const statePair = new Map<string, number>(); // key 'B>A' : B writes, A reads
for (const p of state.pairs) statePair.set(p.a + '>' + p.b, p.n);
interface Link { a: string; b: string; gates: number; fields: number; state: number; impAB: number; impBA: number }
const links: Link[] = [];
for (const [a, row] of M) for (const [b, c] of row) links.push({ a, b, gates: c.gates, fields: c.fields.size, state: statePair.get(b + '>' + a) ?? 0, impAB: impOf(a, b), impBA: impOf(b, a) });
links.sort((x, y) => y.gates - x.gates);
const noImport = links.filter((l) => l.impAB + l.impBA === 0);
const importOnly = (() => {
  // state pairs with 3+ fields where no gate links them
  const have = new Set(links.map((l) => l.b + '>' + l.a));
  return state.pairs.filter((p) => p.n >= 3 && !have.has(p.a + '>' + p.b));
})();
const totalLinkGates = sum(links.map((l) => l.gates));

// ───────────── report ─────────────
mkdirSync(outDir, { recursive: true });
const L: string[] = [];
const direct = sites.filter((s) => s.idiom.startsWith('direct')), helperCalls = sites.filter((s) => s.idiom === 'helper call'), flagUses = sites.filter((s) => s.idiom.startsWith('local flag'));
const oldest = versions[0], newest = versions[versions.length - 1];
L.push('# Rules-version gates', '');
L.push(`Built from src at rules ${CURRENT_RULES_VERSION}, support floor ${FLOOR}. ${sites.length} gate sites in ${byFile.size} files, ${versions.length} distinct versions (${dynamic.length} sites take their version from data and are kept apart). Reads and writes are the direct field accesses in each guarded region (no calls followed), so they are a floor. Method: see the header of scripts/rules_gates.ts.`, '');
L.push('## 1. How gates are written', '');
L.push('The one primitive is `runsRulesVersion(world, N)`; nothing in src compares `settings.rulesVersion` to a number by hand (the only other reads are saving, loading and the `V<n>` label). Four idioms carry it:', '');
L.push('| idiom | sites | what it looks like |', '|---|---:|---|');
const idiomRows: [string, string][] = [['direct, literal', '`if (runsRulesVersion(w, 71)) ...`'], ['direct, named constant', '`runsRulesVersion(w, KIN_FROM)`, the constant lives next to the feature'], ['direct, version from data', '`runsRulesVersion(w, r.minRules)` (recipes, clothing): the version is a table value'], ['helper call', '`if (hasBrewing(w))`, a one-line predicate `dynamics === \'rich\' && runsRulesVersion(w, 139)`, often also a module on/off switch'], ['local flag', '`const allowed = rich && runsRulesVersion(w, N); if (!allowed) return;`']];
for (const [i, d] of idiomRows) L.push(`| ${i} | ${sites.filter((s) => s.idiom.startsWith(i.split(',')[0] === 'local flag' ? 'local flag' : i)).length} | ${d} |`);
L.push('', `Total ${sites.length} gate sites: ${direct.length} direct, ${helperCalls.length} through ${helpersAll.length} helper functions, ${flagUses.length} through ${flagsAll.length} local flags. The helpers' own gate calls (${[...sources.values()].reduce((s, x) => s + x.atoms.size, 0)} of them) are definitions, not sites. Helper depth: ${helpersAll.filter((h) => [...h.atoms].some((a) => atomOf(a)?.src)).length} helpers are built on other helpers.`, '');
L.push(`Guard shapes of the ${sites.length} sites (what the region is): ` + Object.entries(sites.reduce((m: Record<string, number>, s) => ((m[s.kind] = (m[s.kind] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ') + '.', '');
L.push('"then" is `if (gate) {new}`; "tail"/"else+tail" is an early return (`if (!gate) return;` then everything after); "legacy only" is `if (!gate) {old}` with no else, so the gated code is the absence of that branch and there is nothing to read; "mixed" and "statement" are gates buried in other logic, where the region is the whole branch or statement.', '');

L.push('## 2. Gates by version', '');
L.push(`- Oldest gate: version ${oldest.v} (${oldest.sites} sites); newest: version ${newest.v} (${newest.sites} sites).`);
L.push(`- Versions with at least one gate: ${versions.length} of ${SUPPORTED.length} supported (${pct(versions.length, SUPPORTED.length)}); the rest changed behaviour only through data, saves or tests.`);
const gap = versions.filter((v) => !SUPPORTED.includes(v.v));
L.push(`- ${gap.length} gated versions are not in SUPPORTED_RULES_VERSIONS (${gap.map((v) => v.v).join(', ') || 'none'}): such a gate switches on at the next supported version.`);
const ranges: [number, number][] = [[1, 49], [50, 99], [100, 149], [150, 199], [200, 249], [250, 279]];
L.push('', '| versions | gated versions | sites | helper+flag sites | share of sites |', '|---|---:|---:|---:|---:|');
for (const [a, b] of ranges) {
  const vs = versions.filter((v) => v.v >= a && v.v <= b);
  L.push(`| ${a}-${b} | ${vs.length} | ${sum(vs.map((v) => v.sites))} | ${sum(vs.map((v) => v.helper + v.flag))} | ${pct(sum(vs.map((v) => v.sites)), numeric.length)} |`);
}
L.push('', `### Below the support floor (${FLOOR})`, '');
L.push(`- ${belowSites.length} of ${numeric.length} gate sites (${pct(belowSites.length, numeric.length)}) are at versions below ${FLOOR}, across ${new Set(belowSites.map((s) => s.effVersion)).size} versions and ${new Set(belowSites.map((s) => s.file)).size} files; counting version ${FLOOR} itself (a world at ${FLOOR} passes it too) it is ${atOrBelow.length} (${pct(atOrBelow.length, numeric.length)}).`);
L.push(`- Once no world below ${FLOOR} can load, every one of those ${atOrBelow.length} gates is always true. ${collapse.length} have a clean shape (region identified: ${collapse.length} guarded regions become unconditional; ${pct(collapse.length, atOrBelow.length)}); ${legacyOnly.length} are \`if (!gate) {old}\` with no else (the whole branch is dead code); the other ${atOrBelow.length - collapse.length - legacyOnly.length} sit inside other logic and need a hand edit.`);
L.push(`- Dead legacy code those gates keep alive: about ${deadLegacyLines} source lines in the branches that can never run once the gate is true (else branches, the bodies of early returns, \`if (!gate)\` bodies). Branches nested inside other dead branches are counted twice, and a gate buried in other logic (the "mixed" and "statement" shapes) has no dead branch counted, so treat it as an estimate.`);
L.push(`- Helpers at version <= ${FLOOR}: ${helpersBelow.length} of ${helpersAll.length} (they collapse to the \`dynamics === 'rich'\` / module-switch part of their condition).`);
L.push(`- Gates left at ${FLOOR + 1}-${CURRENT_RULES_VERSION}: ${numeric.length - atOrBelow.length} sites over ${versions.filter((v) => v.v > FLOOR).length} versions. This is the live branching after the floor lands.`, '');

L.push('### Every gated version', '', '| version | sites (direct/helper/flag) | files | domains | fields written | fields read | cross-domain sites | what the log says |', '|---:|---|---:|---:|---:|---:|---:|---|');
for (const v of versions) L.push(`| ${v.v}${v.v < FLOOR ? '*' : ''} | ${v.sites} (${v.direct}/${v.helper}/${v.flag}) | ${v.files.size} | ${v.domains.size} | ${v.writes.size} | ${v.reads.size} | ${v.cross} | ${T(v.v)} |`);
L.push('', '`*` below the support floor.', '');

L.push('## 3. Fields written by the most distinct gated versions (most contested across history)', '', '| field | gated versions that write it | range | sites | domains | primary writer domain |', '|---|---:|---|---:|---:|---|');
for (const f of [...contested.values()].sort((a, b) => b.versions.size - a.versions.size || b.sites - a.sites).slice(0, 30)) L.push(`| ${f.key} | ${f.versions.size} | ${rangeOf(f.versions)} | ${f.sites} | ${f.domains.size} | ${f.owner} |`);
L.push('', 'Fields read by the most gated versions (what changed behaviour depends on most):', '', '| field | gated versions that read it | sites | domains |', '|---|---:|---:|---:|');
for (const f of [...contestedReads.values()].sort((a, b) => b.versions.size - a.versions.size || b.sites - a.sites).slice(0, 15)) L.push(`| ${f.key} | ${f.versions.size} | ${f.sites} | ${f.domains.size} |`);
L.push('');

L.push('## 4. Cross-domain gates', '');
L.push(`- ${crossSites.length} of ${sites.length} sites (${pct(crossSites.length, sites.length)}) guard a region that touches a field whose main writer is a different domain from the file's own; of the ${regionSites.length} sites whose region touches any field, ${pct(crossSites.length, regionSites.length)}.`);
L.push(`- ${crossWriteSites.length} sites (${pct(crossWriteSites.length, sites.length)}) *write* a field owned by another domain.`);
L.push(`- Below the floor: ${crossSites.filter(atFloor).length} cross-domain sites; above it: ${crossSites.filter((s) => !atFloor(s) && s.version !== null).length}.`, '');
L.push('Cross-domain write sites by version (top 12 versions):', '', '| version | cross-write sites | example |', '|---:|---:|---|');
const cw = new Map<number, Site[]>();
for (const s of crossWriteSites) if (s.version !== null) (cw.get(s.version) ?? cw.set(s.version, []).get(s.version)!).push(s);
for (const [v, ss] of [...cw].sort((a, b) => b[1].length - a[1].length).slice(0, 12)) L.push(`| ${v} | ${ss.length} | ${ss[0].file}:${ss[0].line} writes ${derived.get(ss[0])!.foreignWrite.slice(0, 3).join(', ')} |`);
L.push('', 'Sites touching the most foreign fields:', '', '| site | version | domain | foreign fields touched | foreign fields written |', '|---|---:|---|---:|---:|');
for (const s of [...sites].sort((a, b) => derived.get(b)!.foreignTouch.length - derived.get(a)!.foreignTouch.length).slice(0, 12)) L.push(`| ${s.file}:${s.line} (${s.via}) | ${s.version ?? 'data'} | ${s.domain} | ${derived.get(s)!.foreignTouch.length} | ${derived.get(s)!.foreignWrite.length} |`);
L.push('');

L.push('## 5. How gates cluster', '');
L.push('Files with the most gate sites:', '', '| file | sites | distinct versions | domain |', '|---|---:|---:|---|');
for (const [f, x] of [...byFile].sort((a, b) => b[1].n - a[1].n).slice(0, 25)) L.push(`| ${f} | ${x.n} | ${x.versions.size} | ${x.domain} |`);
const top10 = [...byFile.values()].sort((a, b) => b.n - a.n).slice(0, 10);
L.push('', `The ten busiest files hold ${sum(top10.map((x) => x.n))} sites (${pct(sum(top10.map((x) => x.n)), sites.length)}). ${[...byFile.values()].filter((x) => x.n === 1).length} of ${byFile.size} gated files have a single gate.`, '', 'Domains by gate sites:', '', '| domain | sites | share |', '|---|---:|---:|');
for (const [d, n] of [...byDomain].sort((a, b) => b[1] - a[1])) L.push(`| ${d} | ${n} | ${pct(n, sites.length)} |`);
L.push('');

L.push('## 6. Widest footprint: the riskiest versions', '');
L.push('By fields touched (read + written) in gated regions, with domains and sites:', '', '| version | fields touched | written | read | domains | sites | files | what the log says |', '|---:|---:|---:|---:|---:|---:|---:|---|');
const foot = (v: VStat): number => new Set([...v.reads, ...v.writes]).size;
for (const v of [...versions].sort((a, b) => foot(b) - foot(a)).slice(0, 15)) L.push(`| ${v.v} | ${foot(v)} | ${v.writes.size} | ${v.reads.size} | ${v.domains.size} | ${v.sites} | ${v.files.size} | ${T(v.v)} |`);
L.push('', 'By distinct domains touched (the regions of one version span several domains):', '', '| version | domains | list |', '|---:|---:|---|');
for (const v of [...versions].sort((a, b) => b.domains.size - a.domains.size || foot(b) - foot(a)).slice(0, 10)) L.push(`| ${v.v} | ${v.domains.size} | ${[...v.domains].sort().join(', ')} |`);
L.push('');

L.push('## 7. Gated links between domains', '');
L.push(`A gate in domain A is counted against domain B when its guarded region reads a field B writes (state.json writers; B is not A). ${totalLinkGates} gate-to-domain links from ${new Set(links.map((l) => l.a)).size} gating domains. "state" is the number of fields B writes that A reads anywhere (the state-map pair); "imports" are file imports A to B and B to A (the import graph).`, '');
L.push('| gates in A read state written by B | gates | distinct fields | state pair fields (B writes, A reads) | imports A to B | imports B to A |', '|---|---:|---:|---:|---:|---:|');
for (const l of links.slice(0, 40)) L.push(`| ${l.a} <- ${l.b} | ${l.gates} | ${l.fields} | ${l.state} | ${l.impAB} | ${l.impBA} |`);
L.push('', `- ${links.length} domain pairs are linked by at least one gate. ${noImport.length} of them have no import in either direction (${noImport.reduce((s, l) => s + l.gates, 0)} gates); the biggest: ${noImport.slice(0, 6).map((l) => `${l.a} <- ${l.b} (${l.gates})`).join('; ') || 'none'}.`);
L.push(`- The gated links cover ${links.filter((l) => l.state > 0).length} of the ${state.pairs.length} state pairs. State pairs with 3+ fields that no gate links: ${importOnly.length} of ${state.pairs.filter((p) => p.n >= 3).length}.`);
const ratio = links.filter((l) => l.state > 0).map((l) => l.fields / l.state);
L.push(`- On linked pairs a gated region reads on average ${ratio.length ? Math.round((100 * sum(ratio)) / ratio.length) : 0}% of the fields that A reads from B overall: gated code is a ${ratio.length && sum(ratio) / ratio.length < 0.5 ? 'minority slice' : 'large share'} of each state link.`, '');
const doms = [...new Set([...links.map((l) => l.a), ...links.map((l) => l.b)])].sort();
L.push('Matrix of gates (row A gates, column B writes), domain numbers as listed:', '');
L.push(doms.map((d, i) => `${i + 1}=${d}`).join('; '), '');
L.push('| A \\ B | ' + doms.map((_, i) => i + 1).join(' | ') + ' |', '|---|' + doms.map(() => '---:').join('|') + '|');
for (const a of doms) L.push(`| ${doms.indexOf(a) + 1} ${a} | ` + doms.map((b) => M.get(a)?.get(b)?.gates ?? '').join(' | ') + ' |');
L.push('');
L.push('## 8. Data-driven gates', '', `${dynamic.length} sites take their version from data: ${[...new Set(dynamic.map((s) => `${s.file}:${s.line}`))].join(', ')}. Their versions are the \`minRules\` of recipes and clothing rules, so they are not in the per-version numbers above.`, '');
L.push('## 9. Limits', '', '- Field accesses are direct in the region; a region that calls a helper which does the work is under-read. Helpers handed an object and writing to it are invisible, as in the state map.', '- A helper is recognised only when its whole body is one returned expression with the gate in its && chain. A function with a block body that gates itself (`if (!gate) return false;`) is a direct site, and its callers are not traced.', '- A gate nested in another gate\'s region is counted in both regions.', '- Field owner is the domain with the most writes in state.json; "cross-domain" is relative to that.', '- Version numbers are as declared; the effective version is the next supported one (see gaps in section 2).', `- Run in ${Math.round((Date.now() - t0) / 1000)} s.`);
writeFileSync(join(outDir, 'report.md'), L.join('\n') + '\n');
writeFileSync(
  join(outDir, 'gates.json'),
  JSON.stringify({
    meta: { currentRulesVersion: CURRENT_RULES_VERSION, floor: FLOOR, sites: sites.length, generated: new Date().toISOString() },
    helpers: [...sources.values()].map((s) => ({ kind: s.kind, name: s.name, file: s.file, line: s.line, version: s.version, uses: s.uses })),
    sites,
    versions: versions.map((v) => ({ version: v.v, sites: v.sites, direct: v.direct, helper: v.helper, flag: v.flag, files: [...v.files].sort(), domains: [...v.domains].sort(), fieldsWritten: [...v.writes].sort(), fieldsRead: [...v.reads].sort(), crossDomainSites: v.cross, title: T(v.v) })),
    contestedFields: [...contested.values()].map((f) => ({ field: f.key, versions: [...f.versions].sort((a, b) => a - b), sites: f.sites, owner: f.owner })).sort((a, b) => b.versions.length - a.versions.length),
    gatedLinks: { domains: doms, links },
  }),
);
console.log(L.slice(0, 40).join('\n'));
console.log(`\nwrote ${outDir}/report.md and gates.json (${Math.round((Date.now() - t0) / 1000)} s)`);
