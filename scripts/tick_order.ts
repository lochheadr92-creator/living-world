// Time and order: what runs when inside one tick, and what that order does to the shared state.
//   npx vite-node scripts/tick_order.ts -- --out <dir>
// Writes <dir>/report.md and <dir>/order.json.
//
// 1. PHASES. stepWorld (src/sim/world.ts) is read with the TypeScript compiler: each call to a function declared in src/sim becomes a
//    phase, in source order. The call to stepPerson is replaced by the phases of stepPerson's own body (they run once per person, in a
//    rotating order). Each phase is resolved to its declaring file and domain, and given a cadence: every tick, or the K and r of the
//    `tick % K === r` schedule that guards it (at the call, or as an early-return guard at the top of the callee).
// 2. FOOTPRINT. Per phase, the fields (of types declared in src/sim/types.ts) it reads and writes, found the same way as
//    scripts/state_map.ts (direct accesses only). Two footprints: 'file' = every function of the callee's file (the broad reading; for
//    callees declared in world.ts itself the function alone), and 'narrow' = the callee plus the functions of its own file it calls,
//    transitively. Calls into other files are not followed, so a phase that mostly hands work to another file looks thin.
// 3. ORDERING DEPENDENCIES. Field F written by phase i, read by phase j: i before j in the tick -> 'same-tick' (j sees this tick's value);
//    j before i -> 'lag' (j sees the previous tick's value; for a slow writer up to K ticks old); same phase -> 'self'.
// 4. ORDER-SENSITIVE: fields written by two or more phases in the same tick (the last writer in tick order wins).
// Limits: a field is attributed per phase, not per person or per object, so 'same-tick' between per-person phases is only true for the
// same person (another person may have run earlier or later in the rotation). Writes through helpers handed the object are not seen.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { domainOfRel } from './lib/domains';

const t0 = Date.now();
const args = process.argv.slice(2).filter((a) => a !== '--');
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'tick_order';
const SRC = resolve('src');
const SIM = resolve('src/sim');
const TYPES = resolve('src/sim/types.ts');
const WORLD = resolve('src/sim/world.ts');

const cfgPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')!;
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, process.cwd());
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, noEmit: true });
const checker = program.getTypeChecker();

const relOf = (f: string): string => relative(SRC, resolve(f)).split('\\').join('/');
const inSim = (f: string): boolean => resolve(f).startsWith(SIM);

// ───────────── field access (same rules as state_map.ts) ─────────────
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
/** 'Owner.field' for a property access on a type declared in types.ts, else null */
function fieldKey(node: ts.PropertyAccessExpression): string | null {
  const decl = checker.getSymbolAtLocation(node.name)?.declarations?.[0];
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
/** reads and writes found anywhere under a node (not descending into nothing: includes nested callbacks) */
function accessesUnder(root: ts.Node, reads: Set<string>, writes: Set<string>): void {
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const k = fieldKey(node);
      if (k) (writeKind(node) === 'write' ? writes : reads).add(k);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
}

// ───────────── functions: their accesses and what they call ─────────────
interface Fn { key: string; name: string; file: string; node: ts.Node; body: ts.Node | undefined; reads: Set<string>; writes: Set<string>; calls: Set<Fn> }
const fnByNode = new Map<ts.Node, Fn>();
const fnsOfFile = new Map<string, Fn[]>();
/** the node standing for a named function: FunctionDeclaration, MethodDeclaration, or the VariableDeclaration holding an arrow/function expression */
function fnNodeOf(n: ts.Node): ts.Node | null {
  if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name) return n;
  if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) return n.parent;
  return null;
}
function nameOfFnNode(n: ts.Node): string {
  if (ts.isVariableDeclaration(n)) return (n.name as ts.Identifier).text;
  const nm = (n as ts.FunctionDeclaration | ts.MethodDeclaration).name;
  return nm ? nm.getText() : '?';
}
function bodyOfFnNode(n: ts.Node): ts.Node | undefined {
  if (ts.isVariableDeclaration(n)) return n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)) ? n.initializer.body : undefined;
  return (n as ts.FunctionDeclaration | ts.MethodDeclaration).body;
}
const simFiles = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile && inSim(sf.fileName));
for (const sf of simFiles) {
  const file = relOf(sf.fileName);
  const list: Fn[] = [];
  fnsOfFile.set(file, list);
  const top: Fn = { key: file + '#<top>', name: '<top>', file, node: sf, body: undefined, reads: new Set(), writes: new Set(), calls: new Set() };
  list.push(top);
  const collect = (node: ts.Node): void => {
    const fnode = fnNodeOf(node);
    if (fnode && !fnByNode.has(fnode)) {
      const name = nameOfFnNode(fnode);
      const f: Fn = { key: file + '#' + name, name, file, node: fnode, body: bodyOfFnNode(fnode), reads: new Set(), writes: new Set(), calls: new Set() };
      fnByNode.set(fnode, f);
      list.push(f);
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);
}
/** nearest enclosing named function of a node (else the file's top level) */
function enclosingFn(node: ts.Node, file: string): Fn {
  for (let n: ts.Node | undefined = node; n; n = n.parent) {
    const fnode = fnNodeOf(n);
    if (fnode) { const f = fnByNode.get(fnode); if (f) return f; }
  }
  return fnsOfFile.get(file)![0];
}
/** the Fn a call expression resolves to, if it is a named function declared in src/sim */
function resolveCall(call: ts.CallExpression): Fn | null {
  let sym = checker.getSymbolAtLocation(call.expression);
  if (!sym && ts.isPropertyAccessExpression(call.expression)) sym = checker.getSymbolAtLocation(call.expression.name);
  if (!sym) return null;
  if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  for (const d of sym.declarations ?? []) {
    const fnode = fnNodeOf(d) ?? (ts.isVariableDeclaration(d) && d.initializer ? fnNodeOf(d.initializer) : null);
    if (fnode) { const f = fnByNode.get(fnode); if (f) return f; }
  }
  return null;
}
for (const sf of simFiles) {
  const file = relOf(sf.fileName);
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const k = fieldKey(node);
      if (k) { const f = enclosingFn(node, file); (writeKind(node) === 'write' ? f.writes : f.reads).add(k); }
    } else if (ts.isCallExpression(node)) {
      const callee = resolveCall(node);
      if (callee) enclosingFn(node, file).calls.add(callee);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
const fnNamed = (file: string, name: string): Fn => {
  const f = fnsOfFile.get(file)?.find((x) => x.name === name);
  if (!f) throw new Error('no function ' + name + ' in ' + file);
  return f;
};

// ───────────── constants and schedules ─────────────
function numVal(e: ts.Expression | undefined, depth = 0): number | undefined {
  if (!e || depth > 6) return undefined;
  if (ts.isNumericLiteral(e)) return Number(e.text);
  if (ts.isParenthesizedExpression(e)) return numVal(e.expression, depth + 1);
  if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken) { const v = numVal(e.operand, depth + 1); return v === undefined ? undefined : -v; }
  if (ts.isBinaryExpression(e)) {
    const a = numVal(e.left, depth + 1), b = numVal(e.right, depth + 1);
    if (a === undefined || b === undefined) return undefined;
    switch (e.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken: return a + b;
      case ts.SyntaxKind.MinusToken: return a - b;
      case ts.SyntaxKind.AsteriskToken: return a * b;
      case ts.SyntaxKind.SlashToken: return a / b;
      default: return undefined;
    }
  }
  if (ts.isIdentifier(e)) {
    let sym = checker.getSymbolAtLocation(e);
    if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
    const d = sym?.declarations?.[0];
    if (d && ts.isVariableDeclaration(d)) return numVal(d.initializer, depth + 1);
  }
  return undefined;
}
interface Sched { K: number; r: number | null; text: string; negated: boolean; partial?: boolean }
/** find a `X % K === r` (or !==) inside a condition; K must be a constant */
function schedOf(cond: ts.Expression): Sched | null {
  let found: Sched | null = null;
  const visit = (n: ts.Node): void => {
    if (found) return;
    if (ts.isBinaryExpression(n) && (n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || n.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken)) {
      for (const [m, other] of [[n.left, n.right], [n.right, n.left]] as const) {
        let mm: ts.Expression = m;
        while (ts.isParenthesizedExpression(mm)) mm = mm.expression;
        if (ts.isBinaryExpression(mm) && mm.operatorToken.kind === ts.SyntaxKind.PercentToken) {
          const K = numVal(mm.right);
          if (K !== undefined && K > 0) {
            found = { K, r: numVal(other) ?? null, text: n.getText().replace(/\s+/g, ' '), negated: n.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken };
            return;
          }
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(cond);
  return found;
}
/** an early-return guard at the top of a function: `if (... tick % K !== r) return;` */
function internalSched(f: Fn): Sched | null {
  const b = f.body;
  if (!b || !ts.isBlock(b)) return null;
  let leading = false;
  for (const st of b.statements.slice(0, 4)) {
    if (!ts.isIfStatement(st)) { if (callsIn(st).some((c) => resolveCall(c))) leading = true; continue; }
    const thenReturns = ts.isReturnStatement(st.thenStatement) || (ts.isBlock(st.thenStatement) && st.thenStatement.statements.length === 1 && ts.isReturnStatement(st.thenStatement.statements[0]));
    if (!thenReturns) continue;
    const s = schedOf(st.expression);
    if (s && s.negated) return { ...s, negated: false, text: 'early-return guard: ' + s.text, partial: leading };
    if (!s && callsIn(st.expression).length === 0 && st.expression.getText().length < 40) continue;
    if (!s) leading = leading || callsIn(st).some((c) => resolveCall(c) !== null);
  }
  return null;
}

// ───────────── phases ─────────────
interface Phase {
  order: number; call: string; file: string; domain: string; scope: 'world' | 'person'; inline: boolean;
  cadence: string; K: number; r: number | null; staggered: boolean; conditional: string | null; internalGuard: string | null;
  fn: Fn | null; readsFile: Set<string>; writesFile: Set<string>; readsNarrow: Set<string>; writesNarrow: Set<string>; children: string[]; grandchildren: string[];
}
const phases: Phase[] = [];
const stepWorldFn = fnNamed('sim/world.ts', 'stepWorld');
const stepPersonFn = fnNamed('sim/world.ts', 'stepPerson');
const ELIDE = new Set(['addEvent']);

function narrowClosure(f: Fn): Fn[] {
  const seen = new Set<Fn>([f]);
  const q = [f];
  while (q.length) {
    const x = q.pop()!;
    for (const c of x.calls) if (c.file === f.file && !seen.has(c)) { seen.add(c); q.push(c); }
  }
  return [...seen];
}
function childrenOf(f: Fn): string[] {
  // callees in source order, one level
  const out: string[] = [];
  const b = f.body;
  if (!b) return out;
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) { const c = resolveCall(n); if (c && !ELIDE.has(c.name) && !out.includes(c.name)) out.push(c.name); }
    ts.forEachChild(n, visit);
  };
  visit(b);
  return out;
}
function addPhase(call: Fn | null, name: string, stmt: ts.Node, conds: { e: ts.Expression; neg: boolean }[], scope: 'world' | 'person', inline: boolean): void {
  let sched: Sched | null = null;
  let cond: string | null = null;
  for (const c of conds) {
    const s = schedOf(c.e);
    if (s && !sched) sched = c.neg ? { ...s, negated: !s.negated } : s;
    else if (!s) cond = (cond ? cond + ' && ' : '') + (c.neg ? '!(' : '(') + c.e.getText().replace(/\s+/g, ' ').slice(0, 70) + ')';
  }
  let internal: Sched | null = null;
  if (call && !sched) internal = internalSched(call);
  const use = sched ?? internal;
  const K = use && !use.negated ? use.K : 1;
  const stagger = !!use && /p\.id/.test(use.text);
  const cadence = use ? (use.negated ? `not (${use.text})` : `every ${K} ticks (${use.text.replace('early-return guard: ', '').replace(/ !== /, ' === ')}${internal && !sched ? ', checked inside' : ''}${internal?.partial ? '; code before the guard runs every tick' : ''}${stagger ? '; staggered by person id' : ''})`) : 'every tick';
  const p: Phase = {
    order: phases.length + 1, call: name, file: call ? call.file : 'sim/world.ts', domain: domainOfRel(call ? call.file : 'sim/world.ts'), scope, inline,
    cadence, K, r: use && !use.negated && !stagger ? use.r : null, staggered: stagger, conditional: cond, internalGuard: internal ? internal.text : null,
    fn: call, readsFile: new Set(), writesFile: new Set(), readsNarrow: new Set(), writesNarrow: new Set(), children: [], grandchildren: [],
  };
  if (call) {
    const fileLevel = call.file === 'sim/world.ts' ? [call] : fnsOfFile.get(call.file)!;
    for (const f of fileLevel) { f.reads.forEach((k) => p.readsFile.add(k)); f.writes.forEach((k) => p.writesFile.add(k)); }
    for (const f of narrowClosure(call)) { f.reads.forEach((k) => p.readsNarrow.add(k)); f.writes.forEach((k) => p.writesNarrow.add(k)); }
    p.children = childrenOf(call);
    if (['decide', 'reviewActivity', 'stepActivity', 'perceive', 'updateNeeds'].includes(name))
      for (const c of p.children) { const cf = fnsOfFile.get(call.file)!.find((x) => x.name === c) ?? [...call.calls].find((x) => x.name === c); if (cf) for (const g of childrenOf(cf).slice(0, 6)) if (!p.grandchildren.includes(c + '>' + g)) p.grandchildren.push(c + '>' + g); }
  } else {
    accessesUnder(stmt, p.readsFile, p.writesFile);
    accessesUnder(stmt, p.readsNarrow, p.writesNarrow);
  }
  phases.push(p);
}
function callsIn(n: ts.Node): ts.CallExpression[] {
  const out: ts.CallExpression[] = [];
  const visit = (x: ts.Node): void => {
    if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) return;
    if (ts.isCallExpression(x)) out.push(x);
    ts.forEachChild(x, visit);
  };
  visit(n);
  return out;
}
let personLoopText = '';
/** walk a statement list, adding a phase for each sim call, in source order */
function walk(st: ts.Node, conds: { e: ts.Expression; neg: boolean }[], scope: 'world' | 'person'): void {
  if (ts.isBlock(st)) { for (const s of st.statements) walk(s, conds, scope); return; }
  if (ts.isIfStatement(st)) {
    walk(st.thenStatement, [...conds, { e: st.expression, neg: false }], scope);
    if (st.elseStatement) walk(st.elseStatement, [...conds, { e: st.expression, neg: true }], scope);
    return;
  }
  if (ts.isForStatement(st) || ts.isForOfStatement(st) || ts.isForInStatement(st)) {
    const calls = callsIn(st.statement).map(resolveCall).filter((c): c is Fn => !!c && !ELIDE.has(c.name));
    if (calls.some((c) => c === stepPersonFn)) {
      personLoopText = st.getText().replace(/\s+/g, ' ');
      for (const s of stepPersonFn.body && ts.isBlock(stepPersonFn.body) ? stepPersonFn.body.statements : []) walk(s, [], 'person');
      return;
    }
    if (calls.length) { walk(st.statement, conds, scope); return; }
    accessesInlineLoop(st, conds, scope);
    return;
  }
  if (ts.isExpressionStatement(st) || ts.isVariableStatement(st) || ts.isReturnStatement(st)) {
    let any = false;
    for (const c of callsIn(st)) {
      const f = resolveCall(c);
      if (!f || ELIDE.has(f.name) || f === stepPersonFn) continue;
      if (c.parent && ts.isCallExpression(c.parent) && c.parent.arguments.includes(c)) continue; // a value handed to another call, not a step of its own
      // only the top call of a chained statement counts once per distinct callee in this statement
      addPhase(f, f.name, st, conds, scope, false);
      any = true;
    }
    if (!any && ts.isExpressionStatement(st)) accessesInlineLoop(st, conds, scope);
    return;
  }
}
function accessesInlineLoop(st: ts.Node, conds: { e: ts.Expression; neg: boolean }[], scope: 'world' | 'person'): void {
  const r = new Set<string>(), w = new Set<string>();
  accessesUnder(st, r, w);
  if (!w.size) return;
  const txt = st.getText().replace(/\s+/g, ' ');
  const label = txt.startsWith('for (const p of world.persons)') ? 'snapshotTransforms (persons: px,py,pheading)' : txt.startsWith('for (const a of world.animals)') ? 'snapshotTransforms (animals)' : txt === 'world.tick++;' ? 'world.tick++' : 'inline: ' + txt.slice(0, 40);
  addPhase(null, label, st, conds, scope, true);
}
for (const s of stepWorldFn.body && ts.isBlock(stepWorldFn.body) ? stepWorldFn.body.statements : []) walk(s, [], 'world');

// duplicate phases (the same callee twice, e.g. killPerson on two branches) stay separate: they are separate sites in the tick.
const N = phases.length;
const personPhases = phases.filter((p) => p.scope === 'person');
const personStart = personPhases.length ? personPhases[0].order : -1;
const personEnd = personPhases.length ? personPhases[personPhases.length - 1].order : -1;

// ───────────── ordering dependencies ─────────────
type Basis = 'file' | 'narrow';
interface Dep { w: number; r: number; kind: 'same-tick' | 'lag' | 'self'; fields: string[] }
function depsFor(basis: Basis): { deps: Map<string, Dep>; writers: Map<string, number[]>; readers: Map<string, number[]> } {
  const writers = new Map<string, number[]>(), readers = new Map<string, number[]>();
  for (const p of phases) {
    for (const k of basis === 'file' ? p.writesFile : p.writesNarrow) (writers.get(k) ?? writers.set(k, []).get(k)!).push(p.order);
    for (const k of basis === 'file' ? p.readsFile : p.readsNarrow) (readers.get(k) ?? readers.set(k, []).get(k)!).push(p.order);
  }
  const deps = new Map<string, Dep>();
  for (const [k, ws] of writers) {
    const rs = readers.get(k);
    if (!rs) continue;
    for (const w of ws) for (const r of rs) {
      const kind = w === r ? 'self' : w < r ? 'same-tick' : 'lag';
      const id = w + '>' + r;
      let d = deps.get(id);
      if (!d) deps.set(id, (d = { w, r, kind, fields: [] }));
      d.fields.push(k);
    }
  }
  return { deps, writers, readers };
}
const D = { file: depsFor('file'), narrow: depsFor('narrow') };
const ph = (o: number): Phase => phases[o - 1];
const count = (b: Basis): { same: number; lag: number; self: number; sameSingle: number; lagSingle: number; pairsSame: number; pairsLag: number } => {
  let same = 0, lag = 0, self = 0, sameSingle = 0, lagSingle = 0, pairsSame = 0, pairsLag = 0;
  for (const d of D[b].deps.values()) {
    const single = d.fields.filter((k) => D[b].writers.get(k)!.length === 1).length;
    if (d.kind === 'same-tick') { same += d.fields.length; sameSingle += single; pairsSame++; }
    else if (d.kind === 'lag') { lag += d.fields.length; lagSingle += single; pairsLag++; }
    else self += d.fields.length;
  }
  return { same, lag, self, sameSingle, lagSingle, pairsSame, pairsLag };
};
const C = { file: count('file'), narrow: count('narrow') };

/** worst-case age of the value when read, and the worst reaction delay including the reader's own cadence */
const ageOf = (d: Dep): number => ph(d.w).K - 1 + (d.kind === 'lag' ? 1 : 0);
const reactOf = (d: Dep): number => ageOf(d) + ph(d.r).K - 1;
const label = (o: number): string => `${String(o).padStart(2, '0')} ${ph(o).call}`;

// per-field extras: the ubiquitous fields (Person.x ...) swamp counts, so note how many phases touch each
const touched = (b: Basis, k: string): number => new Set([...(D[b].writers.get(k) ?? []), ...(D[b].readers.get(k) ?? [])]).size;

// ───────────── contested fields ─────────────
interface Contest { key: string; writersFile: number[]; writersNarrow: number[]; readers: number }
const contested: Contest[] = [];
for (const k of D.file.writers.keys()) {
  const wf = [...new Set(D.file.writers.get(k)!)];
  const wn = [...new Set(D.narrow.writers.get(k) ?? [])];
  if (wf.length >= 2) contested.push({ key: k, writersFile: wf, writersNarrow: wn, readers: new Set(D.file.readers.get(k) ?? []).size });
}
contested.sort((a, b) => b.writersNarrow.length - a.writersNarrow.length || b.writersFile.length - a.writersFile.length || b.readers - a.readers);
const contestedNarrow = contested.filter((c) => c.writersNarrow.length >= 2);

// ───────────── report ─────────────
mkdirSync(outDir, { recursive: true });
const L: string[] = [];
const sorted = <T,>(a: T[], f: (x: T) => number): T[] => [...a].sort((x, y) => f(y) - f(x));
const ex = (fs: string[], n = 5): string => fs.slice(0, n).join(', ') + (fs.length > n ? ` (+${fs.length - n})` : '');
const slowPhases = phases.filter((p) => p.K > 1);
L.push('# Time and order inside one tick', '');
L.push(`Extracted from src/sim/world.ts with the compiler (stepWorld, stepPerson). ${N} phases: ${phases.filter((p) => p.scope === 'world').length} in the world loop, ${personPhases.length} per person; ${slowPhases.length} run on a schedule, ${N - slowPhases.length} every tick (some of those are guarded by a plain condition).`, '');
L.push('## Tick structure', '');
L.push('1. Snapshot of positions for the renderer, then the physical world (environment, flood, hardship, occasions, crews, water, ecology, plots, buildings, facilities, wells, clothing, carcasses, gear, livestock, wildlife, wolves), then the mobile-object grid is rebuilt.');
L.push('2. Persons: `' + personLoopText.slice(0, 140) + '`');
L.push('   - Person order rule: the list is a copy of world.persons; person number i of this tick is list[(i + tick) % n]. The cycle is by array position, and the starting person advances one place each tick, so the person who goes first is a different one every tick and everyone gets every position in turn. (Deaths and births change n and the array, which shifts the rotation.) Dead persons are skipped.');
L.push(`   - Inside one person's step (phases ${personStart} to ${personEnd}): fatal-injury check, needs, mood, illness, life/crowd, intent settling, care and handover review, then fetch/perceive/belief on a per-person staggered schedule (tick + p.id), greetings and bonding, then decide or reviewActivity, then stepActivity. A person who is mid-hand-over stands still and skips the last two.`);
L.push('3. After the persons: carts, conversations, meals (tick % 10 === 3), then slow world processes (life, conception, stale sites, orphans, immigration, praise, welcome, spoilage) on tick % K === r.');
L.push('4. world.tick++ (the last thing). Everything above sees world.tick of this tick; the renderer sees px/py from step 1 and x/y after step 2.', '');
L.push('## ASCII timeline of one tick', '', '```');
const bar = (p: Phase): string => (p.K === 1 ? '[#]' : `[1/${p.K}`.padEnd(3) + ']');
let lastScope = '';
for (const p of phases) {
  if (p.scope === 'person' && lastScope !== 'person') L.push('  +-- for each person, rotating start (i + tick) % n ------------------------------');
  if (p.scope !== 'person' && lastScope === 'person') L.push('  +-- end of persons ------------------------------------------------------------');
  lastScope = p.scope;
  const ind = p.scope === 'person' ? '  |   ' : '  ';
  L.push(`${ind}${String(p.order).padStart(2, '0')} ${bar(p).padEnd(8)} ${p.call.padEnd(38)} ${p.domain.slice(0, 24).padEnd(24)} ${p.K > 1 ? (p.staggered ? 'r=p.id+' : 'r=' + (p.r ?? '?')) : ''}${p.conditional ? (p.K > 1 ? ' ' : '') + 'if ' + p.conditional.slice(0, 50) : ''}`.trimEnd());
}
L.push('  world.tick++', '```', '', '[#] = every tick; [1/K] = once every K ticks; r = the tick % K residue. Lines under the person loop run once per living person per tick.', '');

L.push('## Phases', '', '| # | call | file | domain | cadence | scope | reads/writes (file) | reads/writes (narrow) |', '|---:|---|---|---|---|---|---:|---:|');
for (const p of phases) L.push(`| ${p.order} | ${p.call}${p.conditional ? ' *(if ' + p.conditional.slice(0, 40).replace(/\|/g, '/') + ')*' : ''} | ${p.file} | ${p.domain} | ${p.cadence.replace(/\|/g, '/')} | ${p.scope} | ${p.readsFile.size}/${p.writesFile.size} | ${p.readsNarrow.size}/${p.writesNarrow.size} |`);

L.push('', '## Cadence map', '');
const sched = new Map<string, Phase[]>();
for (const p of phases) { const k = p.K === 1 ? 'every tick' : `every ${p.K} ticks`; (sched.get(k) ?? sched.set(k, []).get(k)!).push(p); }
L.push('| cadence | phases | what they own (domains) |', '|---|---:|---|');
for (const [k, ps] of [...sched].sort((a, b) => (a[1][0].K - b[1][0].K))) {
  const doms = new Map<string, number>();
  for (const p of ps) doms.set(p.domain, (doms.get(p.domain) ?? 0) + 1);
  L.push(`| ${k} | ${ps.length} | ${[...doms].sort((a, b) => b[1] - a[1]).map(([d, n]) => d + ' ' + n).join(', ')} |`);
}
L.push('', '| schedule | phase | residue | owns (callees) |', '|---|---|---|---|');
for (const p of slowPhases) L.push(`| every ${p.K} | ${p.order} ${p.call} (${p.scope}) | ${p.staggered ? 'p.id-staggered' : 'r=' + (p.r ?? '?')} | ${p.children.slice(0, 6).join(', ')} |`);
const sameK = new Map<string, Phase[]>();
for (const p of slowPhases.filter((x) => x.scope === 'world' && x.r !== null)) (sameK.get(p.K + ':' + p.r) ?? sameK.set(p.K + ':' + p.r, []).get(p.K + ':' + p.r)!).push(p);
const coincide = [...sameK].filter(([, ps]) => ps.length > 1);
if (coincide.length) L.push('', 'World-level schedules that fire on the same ticks (same K and r): ' + coincide.map(([k, ps]) => k + ' -> ' + ps.map((x) => x.call).join(', ')).join('; '));
// ticks where many slow phases coincide
const fire = new Map<number, string[]>();
const H = 7200;
for (let t = 0; t < H; t++) for (const p of slowPhases) if (p.scope === 'world' && p.r !== null && t % p.K === p.r) (fire.get(t) ?? fire.set(t, []).get(t)!).push(p.call);
const busiest = [...fire].filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length || a[0] - b[0]).slice(0, 5);
if (busiest.length) L.push('', `Ticks in the first ${H} where several world-level schedules fire together: ` + busiest.map(([t, v]) => `tick ${t}: ${v.join(' + ')}`).join('; '));

L.push('', '## Ordering dependencies', '');
L.push('A dependency is one field written by phase i and read by phase j (distinct phases), classified by their order in the tick. "file" counts every function of the callee\'s file (broad, as asked); "narrow" counts only the callee and the same-file functions it calls (a floor on accesses, closer to what the phase does). The "single-writer" rows leave out fields several phases write, where "who wrote what j sees" is itself ambiguous.', '');
L.push('| measure | file | narrow |', '|---|---:|---:|');
L.push(`| same-tick (writer before reader) field dependencies | ${C.file.same} | ${C.narrow.same} |`);
L.push(`| lagged (reader before writer: previous-tick value) | ${C.file.lag} | ${C.narrow.lag} |`);
L.push(`| self (same phase writes and reads) | ${C.file.self} | ${C.narrow.self} |`);
L.push(`| lagged share of cross-phase | ${Math.round((100 * C.file.lag) / (C.file.lag + C.file.same || 1))}% | ${Math.round((100 * C.narrow.lag) / (C.narrow.lag + C.narrow.same || 1))}% |`);
L.push(`| same-tick, single-writer fields only | ${C.file.sameSingle} | ${C.narrow.sameSingle} |`);
L.push(`| lagged, single-writer fields only | ${C.file.lagSingle} | ${C.narrow.lagSingle} |`);
L.push(`| phase pairs with a same-tick dependency | ${C.file.pairsSame} | ${C.narrow.pairsSame} |`);
L.push(`| phase pairs with a lagged dependency | ${C.file.pairsLag} | ${C.narrow.pairsLag} |`);
// by scope
const scopeTab = new Map<string, number>();
for (const d of D.narrow.deps.values()) if (d.kind !== 'self') { const k = `${ph(d.w).scope}->${ph(d.r).scope} ${d.kind}`; scopeTab.set(k, (scopeTab.get(k) ?? 0) + d.fields.length); }
L.push('', 'Narrow basis by where writer and reader sit (world loop vs per-person):', '', '| writer -> reader | kind | fields |', '|---|---|---:|');
for (const [k, n] of [...scopeTab].sort()) { const [a, kind] = k.split(' '); L.push(`| ${a} | ${kind} | ${n} |`); }
L.push('', 'In person->person rows "same-tick" holds for the same person (their own earlier phase); for another person it depends on the rotation, so the true split there is a mixture.');

const pairRows = (b: Basis, kind: 'same-tick' | 'lag', n: number, filter?: (d: Dep) => boolean): string[] => {
  const rows = sorted([...D[b].deps.values()].filter((d) => d.kind === kind && (!filter || filter(d))), (d) => d.fields.length).slice(0, n);
  return rows.map((d) => `| ${label(d.w)} -> ${label(d.r)} | ${d.fields.length} | ${ageOf(d)} | ${ex(d.fields, 5)} |`);
};
L.push('', '### Strongest same-tick pairs (narrow)', '', '| writer -> reader | fields | max age of value read (ticks) | fields (examples) |', '|---|---:|---:|---|', ...pairRows('narrow', 'same-tick', 15));
L.push('', '### Strongest lagged pairs (narrow): a system reacting to another one a tick late', '', '| writer (runs later) -> reader (runs earlier) | fields | max age of value read (ticks) | fields (examples) |', '|---|---:|---:|---|', ...pairRows('narrow', 'lag', 20));
L.push('', '### Strongest lagged pairs (file basis, broad)', '', '| writer -> reader | fields | max age | fields (examples) |', '|---|---:|---:|---|', ...pairRows('file', 'lag', 15));
const slowLag = sorted([...D.narrow.deps.values()].filter((d) => d.kind !== 'self' && ageOf(d) > 1 && d.fields.length > 0), (d) => reactOf(d) * 1000 + d.fields.length).slice(0, 20);
L.push('', '### Longest delays (narrow): a slow writer, or a slow reader, in the dependency', '', 'Max age = the writer\'s period - 1 (+1 if the reader runs first). Reaction = max age + the reader\'s period - 1: the worst case from the write to the reader acting on it.', '', '| writer -> reader | kind | fields | max age | reaction (ticks) | fields (examples) |', '|---|---|---:|---:|---:|---|');
for (const d of slowLag) L.push(`| ${label(d.w)} (${ph(d.w).K === 1 ? 'tick' : '1/' + ph(d.w).K}) -> ${label(d.r)} (${ph(d.r).K === 1 ? 'tick' : '1/' + ph(d.r).K}) | ${d.kind} | ${d.fields.length} | ${ageOf(d)} | ${reactOf(d)} | ${ex(d.fields, 4)} |`);

// domain matrix
L.push('', '### By domain (narrow): fields written by one domain\'s phases and read by another\'s, split by order', '', '| writer domain -> reader domain | same-tick | lagged |', '|---|---:|---:|');
const dm = new Map<string, { s: number; l: number }>();
for (const d of D.narrow.deps.values()) {
  if (d.kind === 'self') continue;
  const a = ph(d.w).domain, b = ph(d.r).domain;
  if (a === b) continue;
  const c = dm.get(a + ' -> ' + b) ?? { s: 0, l: 0 };
  if (d.kind === 'same-tick') c.s += d.fields.length; else c.l += d.fields.length;
  dm.set(a + ' -> ' + b, c);
}
for (const [k, c] of sorted([...dm], ([, c]) => c.s + c.l).slice(0, 25)) L.push(`| ${k} | ${c.s} | ${c.l} |`);

L.push('', '## Order-sensitive fields: written by more than one phase in a tick', '');
L.push(`The last writer in tick order wins, and a reader between two writers sees a different value from one after both. ${contested.length} fields are written by two or more phases on the file basis; ${contestedNarrow.length} on the narrow basis (the more reliable list). Fields at the top are the ones the order of the calls decides.`, '');
L.push('| field | writers in tick order (narrow) | last writer wins | phases that read it | also in file basis |', '|---|---|---|---:|---:|');
for (const c of contestedNarrow.slice(0, 30)) {
  const ws = [...c.writersNarrow].sort((a, b) => a - b);
  L.push(`| ${c.key} | ${ws.map((o) => label(o)).join(' ; ')} | ${ph(ws[ws.length - 1]).call} | ${new Set(D.narrow.readers.get(c.key) ?? []).size} | ${c.writersFile.length} writers |`);
}
L.push('', 'Fields with the most writer phases on the file basis (broad; includes helper functions the phase may not run):', '', '| field | writer phases | readers |', '|---|---:|---:|');
for (const c of sorted(contested, (x) => x.writersFile.length).slice(0, 12)) L.push(`| ${c.key} | ${c.writersFile.length} | ${c.readers} |`);

L.push('', '## Reading the numbers', '');
L.push('- Same-tick vs lagged is decided only by where two call sites sit in the list; nothing in the code says which was meant. A lagged dependency is not a bug: it is how a system sees the world one tick late.');
L.push('- Person-scope phases read and write fields of every person (a witness reads another person\'s position), so for those the "tick" in the lag is the previous person in the rotation, not the previous tick.');
L.push('- Ubiquitous fields (Person.x, Person.y, World.tick ...) are touched by many phases and inflate the counts; the by-pair tables are the better guide.');
L.push(`- Runtime ${Math.round((Date.now() - t0) / 100) / 10} s.`);
writeFileSync(join(outDir, 'report.md'), L.join('\n') + '\n');

const slim = (p: Phase) => ({
  order: p.order, staggered: p.staggered, call: p.call, file: p.file, domain: p.domain, scope: p.scope, inline: p.inline, cadence: p.cadence, K: p.K, r: p.r, conditional: p.conditional, internalGuard: p.internalGuard,
  children: p.children, grandchildren: p.grandchildren,
  readsFile: p.readsFile.size, writesFile: p.writesFile.size, readsNarrow: p.readsNarrow.size, writesNarrow: p.writesNarrow.size,
});
writeFileSync(
  join(outDir, 'order.json'),
  JSON.stringify(
    {
      personOrderRule: 'list = world.persons.slice(); for i in 0..n-1: p = list[(i + tick) % n]; skip if !p.alive; stepPerson(world, p)',
      personLoop: personLoopText,
      phases: phases.map(slim),
      counts: C,
      pairs: Object.fromEntries((['file', 'narrow'] as const).map((b) => [b, [...D[b].deps.values()].map((d) => ({ writer: d.w, reader: d.r, kind: d.kind, n: d.fields.length, maxAge: ageOf(d), reaction: reactOf(d), fields: d.fields }))])),
      contested: contested.map((c) => ({ key: c.key, writersFile: c.writersFile, writersNarrow: c.writersNarrow, readers: c.readers })),
    },
    null,
    1,
  ),
);
console.log(L.slice(0, 5).join('\n'));
console.log(`phases ${N}; file: same ${C.file.same} lag ${C.file.lag}; narrow: same ${C.narrow.same} lag ${C.narrow.lag}; contested file ${contested.length} narrow ${contestedNarrow.length}`);
console.log(`wrote ${outDir}/report.md and order.json in ${Date.now() - t0} ms`);
void touched;
