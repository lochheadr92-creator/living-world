// Does a shared field actually influence a choice? A read is not an influence: a field read only to be drawn, logged or copied changes
// nothing the people do. For every field of a type declared in src/sim/types.ts (the same 961 as scripts/state_map.ts) this asks whether
// it can reach the code that ranks and selects what a person does next, directly or through the writes of other systems.
//   npx vite-node scripts/influence.ts -- --out <dir>        (default dir: influence)
// Writes <dir>/report.md and <dir>/influence.json.
//
// METHOD (all by the TypeScript compiler, no text search):
//  1. Units. Every named function-like (function declaration, method, a function or arrow bound to a variable or an object property)
//     is a unit; an anonymous callback belongs to the unit that contains it. A unit also "calls" every unit nested inside it
//     (a closure made here may run later: the option `make` closures hang off the option builders this way).
//  2. Call graph. An edge A -> B for every identifier or property name in A that the checker resolves to B, call or not (a function
//     passed as a value may be called). A call through an interface member (handler.step(...), world.hooks.onX(...)) goes to every
//     function put into that member by an object literal contextually typed by the interface. A call through a bare function type
//     goes to every unit that appears where that function type is expected (type-based dispatch, an over-estimate).
//  3. Per unit: the tracked fields it reads and writes (same read/write rule as state_map.ts, plus object destructuring as a read), and
//     the tracked fields it hands to a helper that mutates that parameter (a parameter-mutation summary solved to a fixed point), which
//     counts as a write by the caller (addItem(p.inv, ...)).
//  4. Decision sink: decide, reviewActivity, urgentInterrupt (what a person does next, free or mid-activity) and the two things stepPerson
//     runs just before them that change what a person is doing: settleIntentions and resumeSuspended. Everything reachable from them
//     over the call graph is "decision-reachable", except trace-only code (the decision ledger, `record`, `because`, probe counters),
//     and except anything in render/ ui/ agent/ app/, which is the display boundary.
//  5. Classes by where a field is read: choice (read by a decision-reachable unit), bookkeeping (read only by other units reachable from
//     stepWorld), display (read only in render/ui/agent/app or inspect and diagnostic files), other (read only by sim code that stepWorld
//     never reaches: setup, save and load), unread.
//  6. Depth. 0 = read by a decision-reachable unit. A field g is depth d+1 when some stepWorld-reachable, non-decision unit reads g
//     (its own reads plus those of the pure callees it calls: no tracked write) and writes a field of depth d. Up to depth 3.
//     "wide" also counts the writes of the unit's direct callees as the unit's (the reads may flow to them as arguments): an upper bound.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { domainOfRel } from './lib/domains';

const args = process.argv.slice(2).filter((a) => a !== '--');
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'influence';
const T0 = Date.now();
const SRC = resolve('src');
const TYPES = resolve('src/sim/types.ts');
const norm = (f: string): string => resolve(f).split('\\').join('/');

const cfgPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')!;
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, process.cwd());
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, noEmit: true });
const checker = program.getTypeChecker();

// ───────────────────────── read / write rule (as in state_map.ts) ─────────────────────────
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

// ───────────────────────── field keys (as in state_map.ts) ─────────────────────────
const keyCache = new Map<ts.Node, string>();
function fieldKeyOfDecl(decl: ts.Declaration, name: string): string | undefined {
  if (!decl.parent || resolve(decl.getSourceFile().fileName) !== TYPES) return undefined;
  const hit = keyCache.get(decl);
  if (hit !== undefined) return hit || undefined;
  let owner = '';
  if (ts.isInterfaceDeclaration(decl.parent) || ts.isClassDeclaration(decl.parent)) owner = decl.parent.name?.text ?? '';
  else if (ts.isTypeLiteralNode(decl.parent)) {
    let q: ts.Node = decl.parent;
    while (q && !ts.isInterfaceDeclaration(q) && !ts.isTypeAliasDeclaration(q)) q = q.parent;
    owner = q && (ts.isInterfaceDeclaration(q) || ts.isTypeAliasDeclaration(q)) ? q.name.text : '';
  }
  const key = owner ? owner + '.' + name : '';
  keyCache.set(decl, key);
  return key || undefined;
}
function fieldKeyOfSymbol(sym: ts.Symbol | undefined, name: string): string | undefined {
  const decl = sym?.declarations?.[0];
  return decl ? fieldKeyOfDecl(decl, name) : undefined;
}

// ───────────────────────── units ─────────────────────────
type FnLike = ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression | ts.ConstructorDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration;
const isFn = (n: ts.Node): n is FnLike =>
  ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n);
const unwrap = (e: ts.Expression): ts.Expression => {
  while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
  return e;
};
/** the function-like a declaration stands for, if it is one */
function fnOfDecl(d: ts.Node): FnLike | undefined {
  if (isFn(d)) return (d as FnLike).body ? (d as FnLike) : undefined;
  if (ts.isVariableDeclaration(d) || ts.isPropertyAssignment(d) || ts.isPropertyDeclaration(d)) {
    const i = d.initializer ? unwrap(d.initializer) : undefined;
    if (i && isFn(i)) return i as FnLike;
  }
  return undefined;
}
/** does this function-like get its own unit? (otherwise it is an anonymous callback of the unit around it) */
function isUnitNode(n: ts.Node): n is FnLike {
  if (!isFn(n)) return false;
  if (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n)) return !!n.body;
  let p: ts.Node = n.parent;
  while (p && (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isTypeAssertionExpression(p) || ts.isSatisfiesExpression(p))) p = p.parent;
  return !!p && (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p));
}

interface Unit {
  id: number;
  name: string;
  file: string; // relative to src
  top: string; // first path segment under src (sim, render, ui, agent, app, main.ts)
  dom: string;
  node: ts.Node;
  reads: Map<string, number>;
  writes: Map<string, number>;
  hand: Map<string, number>; // written through a mutating helper
  calls: Set<Unit>;
  trace: boolean;
  lines: number;
}
const units = new Map<ts.Node, Unit>();
const tops = new Map<string, Unit>();
const allUnits: Unit[] = [];
const srcRel = (sf: ts.SourceFile): string => relative(SRC, resolve(sf.fileName)).split('\\').join('/');
function nameOfFn(n: ts.Node): string {
  const own = (n as { name?: ts.Node }).name;
  if (own && (ts.isIdentifier(own) || ts.isStringLiteral(own) || ts.isPrivateIdentifier(own))) {
    const c = n.parent && ts.isClassLike(n.parent) ? n.parent.name?.text + '.' : '';
    return c + own.text;
  }
  if (ts.isConstructorDeclaration(n)) return 'constructor';
  let p: ts.Node = n.parent;
  while (p && (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isSatisfiesExpression(p))) p = p.parent;
  if (p && (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
    if (ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.parent)) {
      const q = p.parent.parent;
      if (q && ts.isVariableDeclaration(q) && ts.isIdentifier(q.name)) return q.name.text + '.' + p.name.text;
    }
    return p.name.text;
  }
  return '<anon>';
}
const TRACE_NAMES = new Set(['record', 'because', 'whyWander', 'summarize', 'ledgerDecision']);
const TRACE_FILES = /^sim\/(decision_ledger|probe|events|causal_events|final_account|inspect.*|gather_diagnostics|gather_review|cohortcapture)\.ts$/;
function unitFor(node: ts.Node): Unit {
  let u = units.get(node);
  if (u) return u;
  const sf = node.getSourceFile();
  const file = srcRel(sf);
  const name = nameOfFn(node);
  u = {
    id: allUnits.length, name, file, top: file.split('/')[0], dom: domainOfRel(file), node,
    reads: new Map(), writes: new Map(), hand: new Map(), calls: new Set(),
    trace: TRACE_FILES.test(file) || (file === 'sim/decision.ts' && TRACE_NAMES.has(name)),
    lines: sf.getLineAndCharacterOfPosition(node.getEnd()).line - sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
  };
  units.set(node, u);
  allUnits.push(u);
  return u;
}
function topUnit(sf: ts.SourceFile): Unit {
  const f = srcRel(sf);
  let u = tops.get(f);
  if (!u) {
    u = {
      id: allUnits.length, name: '<top-level>', file: f, top: f.split('/')[0], dom: domainOfRel(f), node: sf,
      reads: new Map(), writes: new Map(), hand: new Map(), calls: new Set(), trace: TRACE_FILES.test(f), lines: 0,
    };
    tops.set(f, u);
    allUnits.push(u);
  }
  return u;
}
const label = (u: Unit): string => `${u.file.replace(/^sim\//, '').replace(/\.ts$/, '')}:${u.name}`;

// ───────────────────────── pass 1: accesses, references, call sites ─────────────────────────
// edges that need the whole program to be seen first
const memberCalls: { from: Unit; member: ts.Node }[] = []; // call through an interface/type member declaration
const fnTypeCalls: { from: Unit; sig: ts.Node }[] = []; // call through a bare function type
const implMap = new Map<ts.Node, Set<ts.Node>>(); // interface member declaration -> function-likes put there
const fnTypeMap = new Map<ts.Node, Set<ts.Node>>(); // function type declaration -> function-likes seen where it is expected
const handoffs: { from: Unit; key: string; callee: ts.Node | undefined; idx: number }[] = [];
const paramMut = new Map<ts.Node, Set<number>>(); // function-like -> parameter indexes it mutates
const paramPass: { from: ts.Node; idx: number; callee: ts.Node | undefined; cidx: number }[] = [];
let nCalls = 0, nCallsUnresolved = 0, nBindingReads = 0, nNoDecl = 0, nMemberEmpty = 0, nFnTypeEmpty = 0;
const unresolvedByFile = new Map<string, number>();

const addTo = <K, V>(m: Map<K, Set<V>>, k: K, v: V): void => {
  let s = m.get(k);
  if (!s) m.set(k, (s = new Set()));
  s.add(v);
};
function resolveSym(sym: ts.Symbol | undefined): ts.Symbol | undefined {
  if (sym && sym.flags & ts.SymbolFlags.Alias) {
    try { return checker.getAliasedSymbol(sym); } catch { return sym; }
  }
  return sym;
}
function sigDeclOf(call: ts.CallExpression | ts.NewExpression): ts.Node | undefined {
  try { return checker.getResolvedSignature(call)?.declaration; } catch { return undefined; }
}
const isMemberDecl = (d: ts.Node): boolean => (ts.isPropertySignature(d) || ts.isMethodSignature(d) || ts.isCallSignatureDeclaration(d)) && resolve(d.getSourceFile().fileName).startsWith(SRC);
const isFnTypeDecl = (d: ts.Node): boolean => ts.isFunctionTypeNode(d) && resolve(d.getSourceFile().fileName).startsWith(SRC);
/** register a function-like as something that may be called wherever its contextual function type is expected */
function registerFnPtr(expr: ts.Expression, fn: FnLike): void {
  let ct: ts.Type | undefined;
  try { ct = checker.getContextualType(expr); } catch { return; }
  if (!ct) return;
  for (const t of ct.isUnion() ? ct.types : [ct]) {
    for (const s of t.getCallSignatures()) {
      const d = s.declaration;
      if (d && isFnTypeDecl(d)) addTo(fnTypeMap, d, fn);
    }
  }
}
function rootIdent(e: ts.Expression): ts.Identifier | undefined {
  let n: ts.Expression = e;
  for (;;) {
    if (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n) || ts.isAsExpression(n)) n = n.expression;
    else if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) n = n.expression;
    else break;
  }
  return ts.isIdentifier(n) ? n : undefined;
}
function paramIndex(fn: FnLike, id: ts.Identifier): number {
  const sym = checker.getSymbolAtLocation(id);
  const d = sym?.declarations?.[0];
  if (!d || !ts.isParameter(d) || d.parent !== fn) return -1;
  return fn.parameters.indexOf(d);
}
const isObjectish = (t: ts.Type): boolean => {
  if (t.isUnion()) return t.types.some(isObjectish);
  return !!(t.flags & (ts.TypeFlags.Object | ts.TypeFlags.Any | ts.TypeFlags.Unknown));
};

for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !resolve(sf.fileName).startsWith(SRC)) continue;
  const top = topUnit(sf);
  const visit = (node: ts.Node, cur: Unit, fn: FnLike | undefined): void => {
    if (isUnitNode(node)) {
      const u = unitFor(node);
      if (u !== cur) cur.calls.add(u);
      cur = u;
      fn = node;
      // a function put where a function type is expected
      if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) registerFnPtr(node, node);
    } else if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && fn) {
      // anonymous callback: part of the enclosing unit, but still a candidate for function-type dispatch is not needed (it is inline)
    }

    // object literal put into an interface member: the table of handlers
    if (ts.isObjectLiteralExpression(node)) {
      let ct: ts.Type | undefined;
      try { ct = checker.getContextualType(node); } catch { /* skip */ }
      if (ct) {
        for (const t of ct.isUnion() ? ct.types : [ct]) {
          for (const prop of node.properties) {
            const nm = prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? prop.name.text : undefined;
            if (!nm) continue;
            const msym = t.getProperty(nm);
            const mdecl = msym?.declarations?.find(isMemberDecl);
            if (!mdecl) continue;
            let target: FnLike | undefined;
            if (ts.isMethodDeclaration(prop)) target = prop;
            else if (ts.isPropertyAssignment(prop)) {
              const i = unwrap(prop.initializer);
              if (isFn(i)) target = i as FnLike;
              else if (ts.isIdentifier(i)) { const s = resolveSym(checker.getSymbolAtLocation(i)); target = s?.declarations?.map(fnOfDecl).find(Boolean); }
            } else if (ts.isShorthandPropertyAssignment(prop)) {
              const s = resolveSym(checker.getShorthandAssignmentValueSymbol(prop));
              target = s?.declarations?.map(fnOfDecl).find(Boolean);
            }
            if (target) addTo(implMap, mdecl, target);
          }
        }
      }
    }

    // references to other units
    if (ts.isIdentifier(node)) {
      let sym: ts.Symbol | undefined;
      if (node.parent && ts.isShorthandPropertyAssignment(node.parent) && node.parent.name === node) sym = checker.getShorthandAssignmentValueSymbol(node.parent);
      else sym = checker.getSymbolAtLocation(node);
      sym = resolveSym(sym);
      if (sym?.declarations) {
        let isCallee = false;
        const par = node.parent;
        if (par && (ts.isCallExpression(par) && par.expression === node || ts.isPropertyAccessExpression(par) && par.name === node && par.parent && ts.isCallExpression(par.parent) && par.parent.expression === par)) isCallee = true;
        for (const d of sym.declarations) {
          const f = fnOfDecl(d);
          if (f && isUnitNode(f)) {
            cur.calls.add(unitFor(f));
            if (!isCallee && !(node.parent && ts.isFunctionDeclaration(node.parent))) registerFnPtr(node, f);
          } else if (isMemberDecl(d) && isCallee) memberCalls.push({ from: cur, member: d });
        }
      }
    }

    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      nCalls++;
      const sd = sigDeclOf(node);
      if (!sd) nNoDecl++;
      const f = sd ? (isFn(sd) ? fnOfDecl(sd) : fnOfDecl(sd)) : undefined;
      if (sd && !f && isFnTypeDecl(sd)) fnTypeCalls.push({ from: cur, sig: sd });
      else if (sd && !f && isMemberDecl(sd)) memberCalls.push({ from: cur, member: sd });
      // an unresolved call: no declaration at all, or a declaration that is neither a unit nor a known type; ignore library calls
      if (sd && !f && !isFnTypeDecl(sd) && !isMemberDecl(sd) && resolve(sd.getSourceFile().fileName).startsWith(SRC)) {
        nCallsUnresolved++;
        unresolvedByFile.set(cur.file, (unresolvedByFile.get(cur.file) ?? 0) + 1);
      }
      // arguments: a tracked field handed on, a parameter passed on
      const call = node;
      (call.arguments ?? []).forEach((a, idx) => {
        const ua = unwrap(a);
        if (ts.isPropertyAccessExpression(ua)) {
          const key = fieldKeyOfSymbol(checker.getSymbolAtLocation(ua.name), ua.name.text);
          if (key && isObjectish(checker.getTypeAtLocation(ua))) handoffs.push({ from: cur, key, callee: f, idx });
        }
        if (fn && ts.isIdentifier(ua)) {
          const pi = paramIndex(fn, ua);
          if (pi >= 0) paramPass.push({ from: fn, idx: pi, callee: f, cidx: idx });
        }
      });
    }

    // a write to (a part of) a parameter: the helper mutates it
    if (fn && (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isIdentifier(node)) && writeKind(node) === 'write') {
      const r = rootIdent(node as ts.Expression);
      if (r && !(ts.isIdentifier(node) && ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) {
        const pi = paramIndex(fn, r);
        // a plain reassignment of the parameter itself is not a mutation of the caller's object
        if (pi >= 0 && !(ts.isIdentifier(node) && node === r && ts.isBinaryExpression(node.parent) && node.parent.left === node)) addTo(paramMut, fn, pi);
      }
    }

    // tracked field access
    if (ts.isPropertyAccessExpression(node)) {
      const key = fieldKeyOfSymbol(checker.getSymbolAtLocation(node.name), node.name.text);
      if (key) {
        const m = writeKind(node) === 'write' ? cur.writes : cur.reads;
        m.set(key, (m.get(key) ?? 0) + 1);
      }
    } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      // const { hunger } = p.needs  : a read of the field
      const nm = node.propertyName ?? node.name;
      if (ts.isIdentifier(nm)) {
        let t: ts.Type | undefined;
        try { t = checker.getTypeAtLocation(node.parent); } catch { /* skip */ }
        const sym = t?.getProperty(nm.text) ?? (t && t.isUnion() ? t.types.map((x) => x.getProperty(nm.text)).find(Boolean) : undefined);
        const key = fieldKeyOfSymbol(sym, nm.text);
        if (key) { cur.reads.set(key, (cur.reads.get(key) ?? 0) + 1); nBindingReads++; }
      }
    }
    ts.forEachChild(node, (c) => visit(c, cur, fn));
  };
  visit(sf, top, undefined);
}

// ───────────────────────── resolve deferred edges ─────────────────────────
const fnUnit = (f: ts.Node): Unit | undefined => (isUnitNode(f) ? unitFor(f) : undefined);
let nMemberEdges = 0, nFnTypeEdges = 0;
function addMemberEdges(): void {
  nMemberEmpty = memberCalls.filter((m) => !(implMap.get(m.member)?.size)).length;
  for (const { from, member } of memberCalls) for (const f of implMap.get(member) ?? []) { const u = fnUnit(f); if (u && !from.calls.has(u)) { from.calls.add(u); nMemberEdges++; } }
}
function addFnTypeEdges(): void {
  nFnTypeEmpty = fnTypeCalls.filter((m) => !(fnTypeMap.get(m.sig)?.size)).length;
  for (const { from, sig } of fnTypeCalls) for (const f of fnTypeMap.get(sig) ?? []) { const u = fnUnit(f); if (u && !from.calls.has(u)) { from.calls.add(u); nFnTypeEdges++; } }
}
// edge sets before type-based dispatch, for the sensitivity figure
addMemberEdges();
const callsPrecise = new Map<Unit, Set<Unit>>();
for (const u of allUnits) callsPrecise.set(u, new Set(u.calls));
addFnTypeEdges();

// parameter-mutation fixed point, then hand-offs become writes
let changed = true;
while (changed) {
  changed = false;
  for (const { from, idx, callee, cidx } of paramPass) {
    if (callee && paramMut.get(callee)?.has(cidx) && !paramMut.get(from)?.has(idx)) { addTo(paramMut, from, idx); changed = true; }
  }
}
for (const h of handoffs) if (h.callee && paramMut.get(h.callee)?.has(h.idx)) h.from.hand.set(h.key, (h.from.hand.get(h.key) ?? 0) + 1);

// ───────────────────────── sink, reachability ─────────────────────────
const SINK: [string, string][] = [
  ['sim/decision.ts', 'decide'], ['sim/decision.ts', 'reviewActivity'], ['sim/decision.ts', 'urgentInterrupt'],
  ['sim/intent.ts', 'settleIntentions'], ['sim/activities.ts', 'resumeSuspended'],
];
const find = (file: string, name: string): Unit => {
  const u = allUnits.find((x) => x.file === file && x.name === name);
  if (!u) throw new Error(`not found: ${file}:${name}`);
  return u;
};
const sinkUnits = SINK.map(([f, n]) => find(f, n));
const stepWorld = find('sim/world.ts', 'stepWorld');
const DISPLAY_TOPS = new Set(['render', 'ui', 'agent', 'app', 'main.ts']);
const isDisplayUnit = (u: Unit): boolean => DISPLAY_TOPS.has(u.top) || u.dom === 'inspection and diagnostics' || /^sim\/inspect/.test(u.file);

const parentOf = new Map<Unit, Unit>();
const distOf = new Map<Unit, number>(); // call distance from the sink (first reach() with the decision roots)
function reach(roots: Unit[], edges: (u: Unit) => Iterable<Unit>, stop: (u: Unit) => boolean): Set<Unit> {
  const seen = new Set<Unit>();
  const q = roots.slice();
  if (roots === sinkUnits) for (const r of roots) distOf.set(r, 0);
  for (const r of roots) seen.add(r);
  for (let qi = 0; qi < q.length; qi++) {
    const u = q[qi];
    for (const v of edges(u)) {
      if (seen.has(v) || stop(v)) continue;
      seen.add(v);
      if (!parentOf.has(v)) parentOf.set(v, u);
      if (!distOf.has(v) && roots === sinkUnits) distOf.set(v, (distOf.get(u) ?? 0) + 1);
      q.push(v);
    }
  }
  return seen;
}
// Carrying a choice out is not choosing: launching an activity and the activity handlers (begin, step, onEnd ...) are an execution boundary.
// Reads inside them are bookkeeping that may still reach a decision through what they write (p.activity, claims, inventories).
const EXEC_NAMES = new Set(['startActivity', 'endActivity', 'endSuspended', 'beginWork', 'stepActivity', 'abortActivity', 'cancelCareAcquisition']);
const execUnits = new Set<Unit>(allUnits.filter((u) => u.file === 'sim/activities.ts' && EXEC_NAMES.has(u.name)));
for (const [decl, targets] of implMap) {
  const par = decl.parent;
  if (decl.getSourceFile().fileName.endsWith('sim/activities.ts') && par && ts.isInterfaceDeclaration(par) && par.name.text === 'Handler')
    for (const t of targets) { const u = fnUnit(t); if (u) execUnits.add(u); }
}
const stopDecision = (u: Unit): boolean => DISPLAY_TOPS.has(u.top) || u.trace || execUnits.has(u);
const stopWorld = (u: Unit): boolean => DISPLAY_TOPS.has(u.top);
const wholeCalls = (u: Unit): Iterable<Unit> => u.calls;
const preciseCalls = (u: Unit): Iterable<Unit> => callsPrecise.get(u) ?? [];
const decReach = reach(sinkUnits, wholeCalls, stopDecision);
if (process.env.WHY) for (const w of process.env.WHY.split(',')) {
  const t = allUnits.filter((u) => label(u) === w && decReach.has(u))[0];
  const path: string[] = [];
  for (let u = t; u; u = parentOf.get(u)!) path.push(label(u));
  console.log('WHY ' + w + ': ' + path.join(' <- '));
}
const decReachPrecise = reach(sinkUnits, preciseCalls, stopDecision);
const worldReach = reach([stepWorld], wholeCalls, stopWorld);
const worldReachPrecise = reach([stepWorld], preciseCalls, stopWorld);
// the strict set: the entry points themselves only (no resumeSuspended / settleIntentions)
const decReachStrict = reach(sinkUnits.slice(0, 3), wholeCalls, stopDecision);

// ───────────────────────── fields ─────────────────────────
interface F {
  key: string;
  owner: string;
  reads: number; writes: number; hands: number;
  readUnits: Set<Unit>; writeUnits: Set<Unit>;
  decReads: number; worldReads: number; displayReads: number; otherReads: number;
  decReader?: Unit; worldReader?: Unit; displayReader?: Unit;
  depth: number; // 0..3, or -1
  depthWide: number; depthTight: number;
  via?: string; viaWide?: string; viaLines?: number;
  minDist: number;
  cls: string;
}
const fields = new Map<string, F>();
const fld = (k: string): F => {
  let f = fields.get(k);
  if (!f) fields.set(k, (f = { key: k, owner: k.split('.')[0], reads: 0, writes: 0, hands: 0, readUnits: new Set(), writeUnits: new Set(), decReads: 0, worldReads: 0, displayReads: 0, otherReads: 0, depth: -1, depthWide: -1, depthTight: -1, minDist: 99, cls: '' }));
  return f;
};
for (const u of allUnits) {
  for (const [k, n] of u.reads) {
    const f = fld(k);
    f.reads += n; f.readUnits.add(u);
    if (decReach.has(u)) { f.decReads += n; const du = distOf.get(u) ?? 99; if (du < f.minDist) { f.minDist = du; f.decReader = u; } }
    else if (isDisplayUnit(u)) { f.displayReads += n; f.displayReader ??= u; }
    else if (worldReach.has(u)) { f.worldReads += n; f.worldReader ??= u; }
    else f.otherReads += n;
  }
  for (const [k, n] of u.writes) { const f = fld(k); f.writes += n; f.writeUnits.add(u); }
  for (const [k, n] of u.hand) { const f = fld(k); f.hands += n; f.writeUnits.add(u); }
}

// depth: connectors are stepWorld-reachable units that are not decision-reachable
const pureClosureReads = new Map<Unit, Set<string>>();
const isPure = (u: Unit): boolean => u.writes.size === 0 && u.hand.size === 0;
function effReads(u: Unit): Set<string> {
  let r = pureClosureReads.get(u);
  if (r) return r;
  r = new Set(u.reads.keys());
  const seen = new Set<Unit>([u]);
  const q = [...u.calls];
  while (q.length) {
    const v = q.pop()!;
    if (seen.has(v) || !isPure(v) || v.trace || DISPLAY_TOPS.has(v.top)) continue;
    seen.add(v);
    for (const k of v.reads.keys()) r.add(k);
    for (const w of v.calls) q.push(w);
  }
  pureClosureReads.set(u, r);
  return r;
}
const writeSet = (u: Unit, wide: boolean): Set<string> => {
  const s = new Set<string>([...u.writes.keys(), ...u.hand.keys()]);
  if (wide) for (const v of u.calls) if (!DISPLAY_TOPS.has(v.top)) { for (const k of v.writes.keys()) s.add(k); for (const k of v.hand.keys()) s.add(k); }
  return s;
};
for (const variant of ['direct', 'wide', 'tight'] as const) {
  const wide = variant === 'wide';
  const depth = new Map<string, number>();
  const via = new Map<string, string>();
  for (const u of decReach) for (const k of effReads(u)) if (!depth.has(k)) { depth.set(k, 0); via.set(k, label(u)); }
  const connectors = [...worldReach].filter((u) => !decReach.has(u) && !DISPLAY_TOPS.has(u.top));
  const cw = connectors.filter((u) => variant !== 'tight' || u.lines <= 40).map((u) => ({ u, r: effReads(u), w: writeSet(u, wide) })).filter((c) => c.r.size && c.w.size);
  for (let d = 0; d < 3; d++) {
    const add: [string, string][] = [];
    for (const c of cw) {
      let hit: string | undefined;
      for (const k of c.w) if (depth.get(k) !== undefined && depth.get(k)! <= d) { hit = k; break; }
      if (!hit) continue;
      for (const g of c.r) if (!depth.has(g)) add.push([g, `${label(c.u)} (reads ${g}, writes ${hit})`]);
    }
    for (const [g, v] of add) if (!depth.has(g)) { depth.set(g, d + 1); via.set(g, v); }
  }
  for (const f of fields.values()) {
    const d = depth.get(f.key);
    if (variant === 'wide') { f.depthWide = d ?? -1; f.viaWide = via.get(f.key); }
    else if (variant === 'tight') f.depthTight = d ?? -1;
    else { f.depth = d ?? -1; f.via = via.get(f.key); }
  }
}
for (const f of fields.values()) {
  const anyRead = f.reads > 0;
  f.cls = f.depth === 0 ? 'choice'
    : f.depth > 0 ? 'indirect'
    : !anyRead ? 'unread'
    : f.worldReads > 0 ? 'bookkeeping-no-path'
    : f.displayReads > 0 ? 'display-only'
    : 'other-only';
}

// ───────────────────────── numbers ─────────────────────────
const all = [...fields.values()].sort((a, b) => a.key.localeCompare(b.key));
const N = all.length;
const pct = (a: number, b: number): string => (b ? Math.round((1000 * a) / b) / 10 : 0) + '%';
const countBy = (fn: (f: F) => string): Map<string, number> => {
  const m = new Map<string, number>();
  for (const f of all) m.set(fn(f), (m.get(fn(f)) ?? 0) + 1);
  return m;
};
const byCls = countBy((f) => f.cls);
const byDepth = countBy((f) => (f.depth < 0 ? 'none' : String(f.depth)));
const byDepthWide = countBy((f) => (f.depthWide < 0 ? 'none' : String(f.depthWide)));
const written = (f: F): boolean => f.writes + f.hands > 0;
const totW = (f: F): number => f.writes + f.hands;
const noneCls = (f: F): boolean => f.depth < 0;

// by domain: written state reaching a decision at depth <= 1
const writerDoms = new Map<string, Set<string>>();
for (const f of all) {
  for (const u of f.writeUnits) {
    let s = writerDoms.get(u.dom);
    if (!s) writerDoms.set(u.dom, (s = new Set()));
    s.add(f.key);
  }
}
const domRows = [...writerDoms.entries()].map(([d, ks]) => {
  const fs = [...ks].map((k) => fields.get(k)!);
  const n = fs.length;
  const d0 = fs.filter((f) => f.depth === 0).length;
  const d1 = fs.filter((f) => f.depth >= 0 && f.depth <= 1).length;
  const d1w = fs.filter((f) => f.depthWide >= 0 && f.depthWide <= 1).length;
  const none = fs.filter((f) => f.depth < 0).length;
  const writes = fs.reduce((s, f) => s + [...f.writeUnits].filter((u) => u.dom === d).reduce((t, u) => t + (u.writes.get(f.key) ?? 0) + (u.hand.get(f.key) ?? 0), 0), 0);
  return { d, n, d0, d1, d1w, none, writes };
}).sort((a, b) => b.n - a.n);

// ───────────────────────── old coupling.ts channels ─────────────────────────
const CHANNELS: Record<string, { re: RegExp; keys: RegExp }> = {
  health: { re: /\.health\b/, keys: /^Person\.health$/ },
  'need: hunger': { re: /needs\.hunger|\.hunger\b/, keys: /^Needs\.hunger$/ },
  'need: thirst': { re: /needs\.thirst|\.thirst\b/, keys: /^Needs\.thirst$/ },
  'need: energy': { re: /needs\.energy|\.energy\b/, keys: /^Needs\.energy$/ },
  'need: warmth': { re: /needs\.warmth|\.warmth\b/, keys: /^Needs\.warmth$/ },
  'need: safety': { re: /needs\.safety|\.safety\b/, keys: /^Needs\.safety$/ },
  'need: social': { re: /needs\.social|\.social\b/, keys: /^Needs\.social$/ },
  'relation: affinity': { re: /\.affinity\b/, keys: /^Relation\.affinity$/ },
  'relation: trust': { re: /\.trust\b/, keys: /^Relation\.trust$/ },
  'relation: familiarity': { re: /\.familiarity\b/, keys: /^Relation\.familiarity$/ },
  'relation: debt': { re: /\.debt\b/, keys: /^Relation\.debt$/ },
  'relation: grievance': { re: /grievance/i, keys: /^(Relation\.grievance|Grievance\..*)$/ },
  'relation: avoidUntil': { re: /avoidUntil/, keys: /^Relation\.avoidUntil$/ },
  skills: { re: /\.skills\b/, keys: /^Person\.skills$/ },
  traits: { re: /\.traits\b/, keys: /^(Person\.traits|Traits\..*)$/ },
  beliefs: { re: /\.beliefs\b|bykind|beliefsByKind|countBeliefsOfKind/, keys: /^Person\.beliefs$/ },
  concerns: { re: /\.concerns\b/, keys: /^Person\.concerns$/ },
  commitments: { re: /\.commitments\b/, keys: /^Person\.commitments$/ },
  'failures (past tries)': { re: /\.failures\b/, keys: /^Person\.failures$/ },
  'age / life stage': { re: /stageOf|birthTick/, keys: /^Person\.birthTick$/ },
  weather: { re: /weather/, keys: /^(World\.weather|Weather\..*)$/ },
  'time of day': { re: /chrono|\bfrac\b|\bdark\b/, keys: /^World\.(tick|light)$/ },
  'partner / kin': { re: /partnerId|\.children\b|\.parents\b/, keys: /^Person\.(partnerId|children|parents)$/ },
  household: { re: /hhId|households/, keys: /^(Person\.hhId|World\.households)$/ },
  inventory: { re: /\.inv\b/, keys: /^Person\.inv$/ },
  'memory log': { re: /\.log\b/, keys: /^Person\.log$/ },
  'last result / decision': { re: /lastResult|lastDecision|lastInteraction/, keys: /^Person\.(lastResult|lastDecision|lastInteraction)$/ },
};
const OLD_DECISION = /^(options_.*|decision|optutil|relief|welfare|production|facilities|social)\.ts$/;
const oldFiles = readdirSync('src/sim').filter((f) => f.endsWith('.ts'));
const oldText = new Map(oldFiles.map((f) => [f, readFileSync(join('src/sim', f), 'utf8')]));
function oldVerdict(re: RegExp): { dFiles: number; dLines: number; verdict: string } {
  let dFiles = 0, dLines = 0;
  for (const [f, t] of oldText) {
    if (!OLD_DECISION.test(f)) continue;
    const n = t.split('\n').filter((l) => re.test(l) && !/^\s*(\/\/|\*)/.test(l)).length;
    if (n) { dFiles++; dLines += n; }
  }
  return { dFiles, dLines, verdict: dLines === 0 ? 'NOT READ' : dLines < 6 ? 'barely read' : 'read' };
}
interface Chan { near: number; name: string; old: { dFiles: number; dLines: number; verdict: string }; keys: F[]; decReads: number; decUnits: number; best: number; strictUnits: number; strictReads: number }
const chans: Chan[] = Object.entries(CHANNELS).map(([name, c]) => {
  const keys = all.filter((f) => c.keys.test(f.key));
  const decUnitsSet = new Set<Unit>();
  let strictReads = 0;
  const strictSet = new Set<Unit>();
  for (const f of keys) for (const u of f.readUnits) {
    if (decReach.has(u)) decUnitsSet.add(u);
    if (decReachStrict.has(u)) { strictSet.add(u); strictReads += u.reads.get(f.key) ?? 0; }
  }
  const best = keys.length ? Math.min(...keys.map((f) => (f.depth < 0 ? 99 : f.depth))) : 99;
  return { near: keys.length ? Math.min(...keys.map((f) => f.minDist)) : 99, name, old: oldVerdict(c.re), keys, decReads: keys.reduce((s, f) => s + f.decReads, 0), decUnits: decUnitsSet.size, best, strictUnits: strictSet.size, strictReads };
});

if (process.env.READERS) for (const k of process.env.READERS.split(',')) {
  const f = fields.get(k);
  console.log('READERS ' + k + ': ' + [...(f?.readUnits ?? [])].map((u) => `${label(u)}[${decReach.has(u) ? 'dec@' + distOf.get(u) : worldReach.has(u) ? 'world' : DISPLAY_TOPS.has(u.top) ? 'display' : 'other'}x${u.reads.get(k)}]`).join(' '));
  console.log('WRITERS ' + k + ': ' + [...(f?.writeUnits ?? [])].map(label).join(' '));
}
// ───────────────────────── report ─────────────────────────
mkdirSync(outDir, { recursive: true });
const L: string[] = [];
const ex = (u?: Unit): string => (u ? label(u) : '-');
const stateJson = (() => { try { return JSON.parse(readFileSync('C:/dev/_claude_scratch/map-20261127/inputs/state.json', 'utf8')) as { fields: { key: string }[] }; } catch { return null; } })();
const stateKeys = stateJson ? new Set(stateJson.fields.map((f) => f.key)) : null;
const missing = stateKeys ? [...stateKeys].filter((k) => !fields.has(k)).length : 0;
const extra = stateKeys ? all.filter((f) => !stateKeys.has(f.key)).length : 0;

L.push('# Does a shared field actually influence a choice?', '');
L.push(`${N} fields of types declared in src/sim/types.ts (state_map.ts found ${stateKeys ? stateKeys.size : '?'}; ${missing} of those not seen here, ${extra} seen here and not there: destructuring reads). ${allUnits.length} units (named functions and closures-with-names) in src, ${nCalls} call sites.`, '');
L.push('## The decision sink', '');
L.push('Entry points (what a person does next): ' + sinkUnits.map((u) => '`' + label(u) + '`').join(', ') + '.');
L.push('`decide` generates options (`generateOptions` -> `survivalOptions`, `workOptions`, `socialOptions`, ... in options_*.ts and the production/facilities/relief/welfare/social option builders), reviews plans (`reviewIntentions`, intent.ts) and trade, ranks them (`rankOptions`: utility, mood weight, plan nudge, tilts) and launches the winner. `reviewActivity` and `urgentInterrupt` are the same question put to someone already busy. `settleIntentions` and `resumeSuspended` run just before in `stepPerson` and change what a person is doing without ranking.');
L.push(`Not traversed, because carrying a choice out is not choosing: ${execUnits.size} execution units (startActivity, endActivity, beginWork, stepActivity, abortActivity and every activity handler's begin/step/onEnd). What they read counts as bookkeeping; what they write (the activity itself, claims, stocks) can still reach a decision through the depth rule.`);
L.push('Excluded as trace-only (never traversed): the decision ledger, probe counters, the event feed and personal log writers (events.ts, causal_events.ts), the final-account record (final_account.ts), inspect* files, and `record`, `because`, `whyWander`, `summarize` in decision.ts. Not traversed either: render/, ui/, agent/, app/ (an external controller in agent/ is not counted as a choice).', '');
L.push('| set | units |', '|---|---:|');
L.push(`| all units | ${allUnits.length} |`);
L.push(`| decision-reachable (sink above, call graph) | ${decReach.size} |`);
L.push(`| decision-reachable, three entry points only | ${decReachStrict.size} |`);
L.push(`| decision-reachable, without type-based dispatch (precise edges only) | ${decReachPrecise.size} |`);
L.push(`| reachable from stepWorld | ${worldReach.size} (${worldReachPrecise.size} precise) |`);
L.push(`| stepWorld-reachable and not decision-reachable (the bookkeeping units) | ${[...worldReach].filter((u) => !decReach.has(u)).length} |`);
L.push(`| in render/ ui/ agent/ app/ | ${allUnits.filter((u) => DISPLAY_TOPS.has(u.top)).length} |`);
const decFiles = new Map<string, number>();
for (const u of decReach) decFiles.set(u.file, (decFiles.get(u.file) ?? 0) + 1);
L.push('', `Decision-reachable units sit in ${decFiles.size} of ${new Set(allUnits.filter((u) => u.top === 'sim').map((u) => u.file)).size} src/sim files. Most units: ` + [...decFiles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f, n]) => `${f.replace(/^sim\//, '')} ${n}`).join(', ') + '.', '');

L.push('## Headline', '');
L.push('By where the field is read (a field in the first matching row; "choice" and "indirect" are the influence classes):', '', '| class | fields | share | meaning |', '|---|---:|---:|---|');
const MEAN: Record<string, string> = {
  choice: 'read by a decision-reachable function (depth 0)',
  indirect: 'read only by bookkeeping, but that bookkeeping writes a field of lower depth (1 to 3)',
  'bookkeeping-no-path': 'read by world systems, no write of theirs reaches a decision within three hops',
  'display-only': 'read only by render/ui/agent/app or inspect and diagnostic code',
  'other-only': 'read only by sim code stepWorld does not reach (setup, save/load)',
  unread: 'never read',
};
for (const c of ['choice', 'indirect', 'bookkeeping-no-path', 'display-only', 'other-only', 'unread']) L.push(`| ${c} | ${byCls.get(c) ?? 0} | ${pct(byCls.get(c) ?? 0, N)} | ${MEAN[c]} |`);
L.push('', 'By influence depth (0 = read directly by a decision-reachable function; deeper = through the writes of that many bookkeeping steps), direct writes and handed-off writes only; "wide" also counts the writes of a unit\'s direct callees (an upper bound); "tight" lets only connector functions of 40 lines or fewer link a read to a write (a lower bound: a short function that reads g and writes f is likelier a real dependency than a long one):', '', '| depth | fields | cumulative | wide: fields | wide: cumulative | tight: fields | tight: cumulative |', '|---|---:|---:|---:|---:|---:|---:|');
let cum = 0, cumW = 0, cumT = 0;
const byDepthTight = countBy((f) => (f.depthTight < 0 ? 'none' : String(f.depthTight)));
for (const d of ['0', '1', '2', '3']) {
  cum += byDepth.get(d) ?? 0; cumW += byDepthWide.get(d) ?? 0; cumT += byDepthTight.get(d) ?? 0;
  L.push(`| ${d} | ${byDepth.get(d) ?? 0} | ${cum} (${pct(cum, N)}) | ${byDepthWide.get(d) ?? 0} | ${cumW} (${pct(cumW, N)}) | ${byDepthTight.get(d) ?? 0} | ${cumT} (${pct(cumT, N)}) |`);
}
L.push(`| none found | ${byDepth.get('none') ?? 0} | | ${byDepthWide.get('none') ?? 0} | | ${byDepthTight.get('none') ?? 0} | |`);
const nW = all.filter(written).length;
L.push('', `${nW} fields are written somewhere (directly or through a mutating helper); ${all.filter((f) => written(f) && f.depth >= 0).length} of them reach a decision at some depth, ${all.filter((f) => written(f) && f.depth >= 0 && f.depth <= 1).length} at depth <= 1.`);
L.push(`Where the reads are: ${all.reduce((s, f) => s + f.decReads, 0)} read sites in decision-reachable units, ${all.reduce((s, f) => s + f.worldReads, 0)} in other world systems, ${all.reduce((s, f) => s + f.displayReads, 0)} in display or diagnostic code, ${all.reduce((s, f) => s + f.otherReads, 0)} elsewhere.`, '');

const dh = [1, 2, 3, 4, 5, 6, 8, 10, 99];
L.push('### How near the choice are the readers?', '');
L.push('Call distance from the nearest sink entry point to the closest decision-reachable function that reads the field. Close readers (1 to 4 calls) are the option builders and rankers themselves; far ones are side effects the decision code triggers on the way (a plan adopted, a death learned, a fetch set out).', '', '| nearest reader within | fields (cumulative) | share of the choice fields |', '|---|---:|---:|');
const choiceFs = all.filter((f) => f.depth === 0);
for (const h of dh) { const n = choiceFs.filter((f) => f.minDist <= h).length; L.push(`| ${h === 99 ? 'any distance' : h + ' calls'} | ${n} | ${pct(n, choiceFs.length)} |`); }
L.push('', '## By domain: how much of the state each domain writes reaches a decision', '');
L.push('Fields written by the domain (direct or through a helper), and how many of them are read by a decision (depth 0), reach one within one hop (depth <= 1), or reach none within three hops. "wide" is the upper-bound version of depth <= 1.', '', '| domain | fields written | depth 0 | depth <= 1 | share | wide <= 1 | share (wide) | none | writes |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const r of domRows) L.push(`| ${r.d} | ${r.n} | ${r.d0} | ${r.d1} | ${pct(r.d1, r.n)} | ${r.d1w} | ${pct(r.d1w, r.n)} | ${r.none} | ${r.writes} |`);

L.push('', '## State maintained for nothing: written a lot, invisible to every decision', '');
L.push('Fields with no path to a decision within three hops, most-written first. Writes are direct assignments plus hand-offs to a mutating helper.', '', '| field | writes | class | reads (display / world) | example reader |', '|---|---:|---|---:|---|');
for (const f of all.filter((x) => written(x) && noneCls(x)).sort((a, b) => totW(b) - totW(a)).slice(0, 40))
  L.push(`| ${f.key} | ${totW(f)} | ${f.cls} | ${f.displayReads} / ${f.worldReads} | ${ex(f.displayReader ?? f.worldReader)} |`);
const nfn = all.filter((f) => written(f) && noneCls(f));
L.push('', `In all ${nfn.length} written fields have no path (${nfn.filter((f) => f.cls === 'unread').length} never read, ${nfn.filter((f) => f.cls === 'display-only').length} read only for display or diagnostics, ${nfn.filter((f) => f.cls === 'bookkeeping-no-path').length} read by bookkeeping that leads nowhere, ${nfn.filter((f) => f.cls === 'other-only').length} read only by setup or save/load).`);
const deep = all.filter((f) => written(f) && f.depth >= 2);
L.push('', `Reach a decision only at depth 2 or 3 (a long way round): ${deep.length}. Most-written:`, '', deep.sort((a, b) => totW(b) - totW(a)).slice(0, 15).map((f) => `${f.key} (d${f.depth}, ${totW(f)} writes)`).join(', '));

L.push('', '## Read by decisions, written by nothing', '');
const dnw = all.filter((f) => f.depth === 0 && !written(f));
L.push(`${dnw.length} fields a decision reads that no code in src assigns or mutates (set when the object is created, or by a literal; a floor, since a literal built whole is not seen as a write). Most-read in decisions:`, '', '| field | decision reads | example |', '|---|---:|---|');
for (const f of dnw.sort((a, b) => b.decReads - a.decReads).slice(0, 25)) L.push(`| ${f.key} | ${f.decReads} | ${ex(f.decReader)} |`);

L.push('', '## The old coupling.ts channels, re-run', '');
L.push('Old column: text search of options_*, decision, optutil, relief, welfare, production, facilities and social (its decision layer). New columns: the compiler-resolved fields of that channel; "decision reads" counts read sites in decision-reachable units, "units" how many such units read it, "strict" the same for the three entry points only (decide / reviewActivity / urgentInterrupt). Best depth is the shallowest across the channel\'s fields.', '', '| channel | old files/lines | old verdict | fields | decision reads | units | strict units | nearest reader (calls) | best depth | new verdict |', '|---|---:|---|---:|---:|---:|---:|---:|---:|---|');
const verdicts: string[] = [];
for (const c of chans) {
  const nv = c.keys.length === 0 ? 'no field' : c.decReads === 0 ? (c.best < 99 ? `not read by a choice; reaches one at depth ${c.best}` : 'NOT read by any choice, no path') : c.decReads < 6 ? 'barely read' : 'read';
  const agree = (c.old.verdict === 'NOT READ' && c.decReads === 0) || (c.old.verdict === 'read' && c.decReads >= 6) || (c.old.verdict === 'barely read' && c.decReads > 0 && c.decReads < 6);
  L.push(`| ${c.name} | ${c.old.dFiles}/${c.old.dLines} | ${c.old.verdict} | ${c.keys.length} | ${c.decReads} | ${c.decUnits} | ${c.strictUnits} | ${c.near === 99 ? '-' : c.near} | ${c.best === 99 ? 'none' : c.best} | ${nv}${agree ? '' : ' **(differs)**'} |`);
  verdicts.push(`${c.name}: old ${c.old.verdict}, new ${nv}${agree ? '' : ' [differs]'}`);
}
L.push('', 'Fields of each channel and where they stand:', '', '| channel | field | class | depth | decision reads | example (decision reader or via) |', '|---|---|---|---:|---:|---|');
for (const c of chans) for (const f of c.keys) L.push(`| ${c.name} | ${f.key} | ${f.cls} | ${f.depth < 0 ? '-' : f.depth} | ${f.decReads} | ${f.depth === 0 ? ex(f.decReader) : f.via ?? ex(f.displayReader ?? f.worldReader)} |`);

L.push('', '## Fields read by decisions the most', '', '| field | decision reads | writes | decision units reading |', '|---|---:|---:|---:|');
for (const f of [...all].sort((a, b) => b.decReads - a.decReads).slice(0, 25)) L.push(`| ${f.key} | ${f.decReads} | ${totW(f)} | ${[...f.readUnits].filter((u) => decReach.has(u)).length} |`);

L.push('', '## Limits', '');
L.push(`- Edges: ${nMemberEdges} through interface members (handler tables, hooks), ${nFnTypeEdges} through bare function types (type-based dispatch, an over-estimate). Decision-reachable set without the type-based edges: ${decReachPrecise.size} units, against ${decReach.size} with them.`);
L.push(`- Of ${nCalls} call sites: ${nNoDecl} have no resolved declaration at all (calls through any, or into a library), ${nMemberEmpty} are calls through an interface member that no object literal in src fills (hooks the app or the tests install), ${nFnTypeEmpty} are calls through a function type nothing in src is passed as, ${nCallsUnresolved} resolve to a declaration in src that is neither a unit nor a known type. None of these adds an edge.`);
L.push('- String-key and computed access (p.needs[k], world[key]) is seen as a read of the container field, not of the member; fields reached only through `any` are missed.');
L.push(`- A write through a helper is counted only when the helper's parameter is mutated (summary solved to a fixed point); a write through a local alias (const items = p.inv; items[k]++) is missed. ${all.reduce((s, f) => s + f.hands, 0)} hand-off writes were found.`);
L.push('- Depth is a statement about code that can run, not dataflow: a function that reads g and writes f is taken to let g influence f. It over-states influence inside a large function and under-states it where a value travels as an argument or return value to a helper that does the write (the "wide" figure bounds that).');
L.push(`- Destructured reads (${nBindingReads}) are counted here though state_map.ts does not see them.`);
L.push('- Reads inside agent/ (an external controller) are treated as display, as the brief asks, although an attached controller would make real choices from them.');
L.push(`- Run took ${Math.round((Date.now() - T0) / 100) / 10} s.`);
writeFileSync(join(outDir, 'report.md'), L.join('\n') + '\n');
writeFileSync(
  join(outDir, 'influence.json'),
  JSON.stringify({
    sink: sinkUnits.map(label),
    sets: { units: allUnits.length, decisionReachable: decReach.size, decisionReachableStrict: decReachStrict.size, decisionReachablePrecise: decReachPrecise.size, worldReachable: worldReach.size },
    classes: Object.fromEntries(byCls),
    depths: Object.fromEntries(byDepth),
    depthsWide: Object.fromEntries(byDepthWide),
    domains: domRows,
    channels: chans.map((c) => ({ channel: c.name, oldVerdict: c.old.verdict, oldLines: c.old.dLines, fields: c.keys.map((f) => f.key), decisionReads: c.decReads, bestDepth: c.best === 99 ? null : c.best })),
    fields: all.map((f) => ({
      key: f.key, depth: f.depth < 0 ? null : f.depth, depthWide: f.depthWide < 0 ? null : f.depthWide, class: f.cls,
      reads: f.reads, writes: f.writes, handoffWrites: f.hands, decisionReads: f.decReads, worldReads: f.worldReads, displayReads: f.displayReads, otherReads: f.otherReads,
      exampleReader: f.depth === 0 ? ex(f.decReader) : f.via ?? ex(f.worldReader ?? f.displayReader),
      viaWide: f.depth < 0 && f.depthWide >= 0 ? f.viaWide : undefined,
      depthTight: f.depthTight < 0 ? null : f.depthTight, nearestDecisionReaderDistance: f.minDist === 99 ? null : f.minDist,
    })),
  }),
);
console.log(L.slice(0, 60).join('\n'));
console.log('\n' + verdicts.join('\n'));
console.log(`\nwrote ${outDir}/report.md and influence.json in ${Math.round((Date.now() - T0) / 100) / 10}s`);
