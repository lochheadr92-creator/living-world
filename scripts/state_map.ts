// Who reads and who writes the simulation's shared state: every access to a field of a type declared in src/sim/types.ts
// (World, Person, Building, Plot, Needs ...), attributed by the TypeScript compiler to the field's declaring interface, and
// told apart as a read or a write. Files are grouped into the same domains as the import graph (scripts/lib/domains.ts).
//   npx vite-node scripts/state_map.ts [-- --out state_map] [--v1 <earlier state.json>]
// Writes <out>/state.json and <out>/report.md. With --v1 the report compares itself with an earlier state.json.
//
// Four buckets of accesses, kept apart so the report can say where each number comes from:
//   direct    a property access on a declared field (x.f, and x['f'] with a literal key). A WRITE is an assignment (including += and
//             the like), ++/--, a delete, an assignment to an element of it (inv[k] = n), or a mutating method call on it (push, set ...).
//   via       a WRITE made inside a helper. addItem(p.inv, 'wood', 2) mutates its argument in the callee, in the callee's file, on a type
//             with no declared fields, so no direct access shows it. An interprocedural pass summarises every function: "writes through
//             parameter i" (assigns to param.x / param[k], calls a mutator on it or on param.x, deletes, Object.assign, or hands it on
//             to another function that writes through its parameter; a fixpoint, one hop of `const alias = param.x` followed). At each
//             call whose argument is a declared field (x.f, x.f[k]) and whose callee writes through that parameter, the field is
//             written, attributed to the CALLEE's group (where the mutation runs). Callees the checker cannot resolve to a body are
//             counted, not guessed.
//   computed  x.f[k] / needs[k] with a non-literal key on a declared field or declared type, kept as Owner.field[*] / Type[*]
//             (arrays and tuples are skipped: an index is not a key). Reported as its own table, not folded into the field stats.
//   init      an object literal whose contextual type is a types.ts interface (a Person built whole): each listed property is a WRITE.
// Still not seen: anything through `any`, aliases beyond one `const a = x.f` hop, writes inside callbacks stored in data and called
// later, `this`-receiver methods, and values moved through returns (const a = f(x.f); a.push()).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { domainOfRel } from './lib/domains';

const args = process.argv.slice(2).filter((a) => a !== '--');
const argOf = (name: string, dflt: string | null): string | null => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const outDir = argOf('--out', 'state_map')!;
const v1Path = argOf('--v1', null);
const SRC = resolve('src');
const TYPES = resolve('src/sim/types.ts');
const t0 = Date.now();

const cfgPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')!;
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, process.cwd());
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, noEmit: true });
const checker = program.getTypeChecker();

const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'set', 'delete', 'add', 'clear', 'copyWithin']);
const ASSIGN = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken, ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.PercentEqualsToken, ts.SyntaxKind.BarEqualsToken, ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.CaretEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken, ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken, ts.SyntaxKind.LessThanLessThanEqualsToken, ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
]);

type Bucket = Map<string, number>;
interface Use { reads: Bucket; writes: Bucket; via: Bucket; init: Bucket; compR: Bucket; compW: Bucket }
const byFile = new Map<string, Use>();
const use = (file: string): Use => {
  let u = byFile.get(file);
  if (!u) byFile.set(file, (u = { reads: new Map(), writes: new Map(), via: new Map(), init: new Map(), compR: new Map(), compW: new Map() }));
  return u;
};
const bump = (m: Bucket, k: string, n = 1): void => void m.set(k, (m.get(k) ?? 0) + n);

const skipParens = (n: ts.Node): ts.Node => {
  while (n.parent && (ts.isParenthesizedExpression(n.parent) || ts.isNonNullExpression(n.parent) || ts.isAsExpression(n.parent))) n = n.parent;
  return n;
};
/** the expression with parentheses, `!`, `as` and `satisfies` peeled off */
const strip = (e: ts.Expression): ts.Expression => {
  while (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isTypeAssertionExpression(e)) e = e.expression;
  return e;
};
/** is this access the target of a write? (the node itself, or an element of it, or a mutating call on it) */
function writeKind(node: ts.Node): 'write' | 'read' {
  const n = skipParens(node);
  const p = n.parent;
  if (!p) return 'read';
  if (ts.isBinaryExpression(p) && p.left === n && ASSIGN.has(p.operatorToken.kind)) return 'write';
  if ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && (p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken)) return 'write';
  if (ts.isDeleteExpression(p)) return 'write';
  // x.field[k] = v  /  x.field[k]++  /  delete x.field[k]
  if (ts.isElementAccessExpression(p) && p.expression === n) {
    const q = skipParens(p).parent;
    if (q && ts.isBinaryExpression(q) && q.left === skipParens(p) && ASSIGN.has(q.operatorToken.kind)) return 'write';
    if (q && (ts.isPrefixUnaryExpression(q) || ts.isPostfixUnaryExpression(q))) return 'write';
    if (q && ts.isDeleteExpression(q)) return 'write';
  }
  // x.field.push(...)
  if (ts.isPropertyAccessExpression(p) && p.expression === n && MUTATORS.has(p.name.text)) {
    const call = skipParens(p).parent;
    if (call && ts.isCallExpression(call) && call.expression === skipParens(p)) return 'write';
  }
  return 'read';
}

// ───────────── what is a declared field? ─────────────
const ownerOfDecl = (decl: ts.Node): string => {
  if (ts.isInterfaceDeclaration(decl.parent) || ts.isClassDeclaration(decl.parent)) return decl.parent.name?.text ?? '';
  // an inline object type inside an interface: name it by the interface and the field that holds it
  let q: ts.Node = decl.parent;
  while (q && !ts.isInterfaceDeclaration(q) && !ts.isTypeAliasDeclaration(q)) q = q.parent;
  return q && (ts.isInterfaceDeclaration(q) || ts.isTypeAliasDeclaration(q)) ? q.name.text : '';
};
function fieldKey(sym: ts.Symbol | undefined, name: string): string | null {
  const decl = sym?.declarations?.[0];
  if (!decl || resolve(decl.getSourceFile().fileName) !== TYPES || !decl.parent) return null;
  if (!(ts.isInterfaceDeclaration(decl.parent) || ts.isTypeLiteralNode(decl.parent) || ts.isClassDeclaration(decl.parent))) return null;
  const owner = ownerOfDecl(decl);
  return owner ? owner + '.' + name : null;
}
const propKey = (n: ts.PropertyAccessExpression): string | null => fieldKey(checker.getSymbolAtLocation(n.name), n.name.text);
/** the name of a types.ts interface / alias / class a type is declared as, or null */
function typeOwner(t: ts.Type): string | null {
  t = checker.getNonNullableType(t);
  const s = t.aliasSymbol ?? t.getSymbol();
  const d = s?.declarations?.[0];
  if (!d || resolve(d.getSourceFile().fileName) !== TYPES) return null;
  return ts.isInterfaceDeclaration(d) || ts.isTypeAliasDeclaration(d) || ts.isClassDeclaration(d) ? (d.name?.text ?? null) : null;
}
const isListType = (t: ts.Type): boolean => {
  t = checker.getNonNullableType(t);
  return checker.isArrayType(t) || checker.isTupleType(t) || !!(t.flags & ts.TypeFlags.StringLike);
};
const objectish = (t: ts.Type): boolean => {
  if (t.isUnion()) return t.types.some(objectish);
  return !(t.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.ESSymbolLike));
};

// ───────────── pass 1: every file, every node ─────────────
type Callee = { kind: 'fn'; node: ts.SignatureDeclaration } | { kind: 'assign' } | { kind: 'lib' } | { kind: 'unres' };
const callInfo = new Map<ts.CallExpression, { callee: Callee; file: string }>();
const fnFile = new Map<ts.SignatureDeclaration, string>();
const fnNodes: ts.SignatureDeclaration[] = [];
const srcFiles: ts.SourceFile[] = [];
const relOf = (sf: ts.SourceFile): string => relative(SRC, resolve(sf.fileName)).split('\\').join('/');
let literalKey = 0;

function resolveCallee(call: ts.CallExpression): Callee {
  const sig = checker.getResolvedSignature(call);
  let d = sig?.declaration as ts.SignatureDeclaration | undefined;
  if (!d) return { kind: 'unres' };
  const f = resolve(d.getSourceFile().fileName);
  if (d.getSourceFile().isDeclarationFile || !f.startsWith(SRC + sep)) {
    return call.expression.getText() === 'Object.assign' ? { kind: 'assign' } : { kind: 'lib' };
  }
  if (!(d as ts.FunctionLikeDeclaration).body) {
    // an overload: find the implementation that has the body
    const name = (d as ts.FunctionDeclaration).name;
    const impl = name ? checker.getSymbolAtLocation(name)?.declarations?.find((x) => !!(x as ts.FunctionLikeDeclaration).body && ts.isFunctionLike(x)) : undefined;
    if (!impl) return { kind: 'unres' };
    d = impl as ts.SignatureDeclaration;
  }
  return { kind: 'fn', node: d };
}

for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !resolve(sf.fileName).startsWith(SRC + sep)) continue;
  srcFiles.push(sf);
  const file = relOf(sf);
  const u = use(file);
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const key = propKey(node);
      if (key) bump(writeKind(node) === 'write' ? u.writes : u.reads, key);
    } else if (ts.isElementAccessExpression(node)) {
      const arg = node.argumentExpression;
      const container = checker.getTypeAtLocation(node.expression);
      if (ts.isStringLiteralLike(arg)) {
        // needs['hunger'] is an ordinary access to Needs.hunger
        const t = checker.getNonNullableType(container);
        const key = fieldKey(checker.getPropertyOfType(checker.getApparentType(t), arg.text), arg.text);
        if (key) { literalKey++; bump(writeKind(node) === 'write' ? u.writes : u.reads, key); }
      } else if (!isListType(container)) {
        const inner = strip(node.expression);
        let base: string | null = ts.isPropertyAccessExpression(inner) ? propKey(inner) : null;
        if (!base) { const o = typeOwner(container); base = o; }
        if (base) bump(writeKind(node) === 'write' ? u.compW : u.compR, base + '[*]');
      }
    } else if (ts.isObjectLiteralExpression(node)) {
      const ct = checker.getContextualType(node);
      if (ct) {
        const types = ct.isUnion() ? ct.types : [ct];
        for (const prop of node.properties) {
          if (!(ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop) || ts.isMethodDeclaration(prop))) continue;
          if (!(ts.isIdentifier(prop.name) || ts.isStringLiteralLike(prop.name))) continue;
          const name = prop.name.text;
          for (const t of types) {
            const key = fieldKey(checker.getPropertyOfType(t, name), name);
            if (key) { bump(u.init, key); break; }
          }
        }
      }
    } else if (ts.isCallExpression(node)) {
      callInfo.set(node, { callee: resolveCallee(node), file });
    }
    if (ts.isFunctionLike(node) && (node as ts.FunctionLikeDeclaration).body && !ts.isClassStaticBlockDeclaration(node)) {
      fnFile.set(node as ts.SignatureDeclaration, file);
      fnNodes.push(node as ts.SignatureDeclaration);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// ───────────── pass 2: "writes through parameter i", to a fixpoint ─────────────
interface FnInfo { node: ts.SignatureDeclaration; nParams: number; rest: number; direct: Set<number>; wt: Set<number>; edges: { param: number; callee: ts.SignatureDeclaration; arg: number }[] }
const fns = new Map<ts.SignatureDeclaration, FnInfo>();
const rootIdent = (e: ts.Expression): ts.Identifier | undefined => {
  e = strip(e);
  while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) e = strip(e.expression);
  return ts.isIdentifier(e) ? e : undefined;
};
/** hand arg j of a call to the callee's parameter number, or -1 */
const paramFor = (f: FnInfo, j: number): number => (j < f.nParams && j !== f.rest ? j : -1);

for (const node of fnNodes) {
  const body = (node as ts.FunctionLikeDeclaration).body!;
  const info: FnInfo = { node, nParams: node.parameters.length, rest: node.parameters.findIndex((p) => !!p.dotDotDotToken), direct: new Set(), wt: new Set(), edges: [] };
  fns.set(node, info);
  const idx = new Map<ts.Symbol, number>();
  const names = new Set<string>();
  const addSym = (id: ts.Node, i: number): void => {
    const s = checker.getSymbolAtLocation(id);
    if (s) { idx.set(s, i); names.add((id as ts.Identifier).text); }
  };
  node.parameters.forEach((p, i) => {
    if (ts.isIdentifier(p.name)) addSym(p.name, i);
    else if (ts.isObjectBindingPattern(p.name)) for (const el of p.name.elements) if (ts.isIdentifier(el.name)) addSym(el.name, i);
  });
  if (!names.size) continue;
  const indexOfRoot = (e: ts.Expression): number | undefined => {
    const id = rootIdent(e);
    if (!id || !names.has(id.text)) return undefined;
    const s = checker.getSymbolAtLocation(id);
    return s ? idx.get(s) : undefined;
  };
  const scan = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      const r = indexOfRoot(n.initializer);
      if (r !== undefined) addSym(n.name, r);
    }
    if (ts.isIdentifier(n) && names.has(n.text)) {
      const s = checker.getSymbolAtLocation(n);
      const i = s ? idx.get(s) : undefined;
      if (i !== undefined) {
        // climb x, x.a, x.a[k] ...: any write on the way up mutates what the caller handed in. A plain `x = ...` only rebinds.
        let c: ts.Node = n;
        for (;;) {
          if (writeKind(c) === 'write' && (c !== n || ts.isElementAccessExpression(skipParens(n).parent) || ts.isPropertyAccessExpression(skipParens(n).parent))) { info.direct.add(i); break; }
          const sc = skipParens(c);
          const p = sc.parent;
          if (p && ((ts.isPropertyAccessExpression(p) && p.expression === sc) || (ts.isElementAccessExpression(p) && p.expression === sc))) c = p;
          else break;
        }
      }
    }
    if (ts.isCallExpression(n)) {
      const ci = callInfo.get(n);
      n.arguments.forEach((a, j) => {
        const r = indexOfRoot(a);
        if (r === undefined || !ci || ts.isSpreadElement(a) || !objectish(checker.getTypeAtLocation(a))) return;
        if (ci.callee.kind === 'assign' && j === 0) info.direct.add(r);
        else if (ci.callee.kind === 'fn') info.edges.push({ param: r, callee: ci.callee.node, arg: j });
      });
    }
    ts.forEachChild(n, scan);
  };
  ts.forEachChild(body, scan);
  info.wt = new Set(info.direct);
}
let rounds = 0;
for (let changed = true; changed && rounds < 40; rounds++) {
  changed = false;
  for (const f of fns.values())
    for (const e of f.edges) {
      const c = fns.get(e.callee);
      const pi = c ? paramFor(c, e.arg) : -1;
      if (c && pi >= 0 && c.wt.has(pi) && !f.wt.has(e.param)) { f.wt.add(e.param); changed = true; }
    }
}
const writingFns = [...fns.values()].filter((f) => f.wt.size).length;

// ───────────── pass 3: call sites that hand a declared field to a function that writes through it ─────────────
const dom = (f: string): string => domainOfRel(f);
/** what a call argument stands for: a declared field (x.f, x.f[k], or a const alias of one), or a whole declared-type object */
function trackedOfExpr(e: ts.Expression, depth = 0): { key?: string; whole?: string } | null {
  let n = strip(e);
  if (ts.isElementAccessExpression(n)) n = strip(n.expression);
  if (ts.isPropertyAccessExpression(n)) { const key = propKey(n); if (key) return { key }; }
  if (ts.isIdentifier(n) && depth < 2) {
    const d = checker.getSymbolAtLocation(n)?.valueDeclaration;
    if (d && ts.isVariableDeclaration(d) && d.initializer && ts.isIdentifier(d.name)) {
      const r = trackedOfExpr(d.initializer, depth + 1);
      if (r?.key) return r;
    }
  }
  const o = typeOwner(checker.getTypeAtLocation(e));
  return o ? { whole: o } : null;
}
let viaTotal = 0, viaCross = 0, libCalls = 0, unresField = 0, unresWhole = 0, assignWrites = 0;
const unresText = new Map<string, number>();
const wholeVia = new Map<string, number>();
const viaByCallee = new Map<string, number>();
const calleeName = (d: ts.SignatureDeclaration): string => {
  const n = (d as ts.FunctionDeclaration).name ?? (ts.isVariableDeclaration(d.parent) ? d.parent.name : undefined);
  return (n ? n.getText() : '(anonymous)') + ' [' + fnFile.get(d) + ']';
};
for (const [call, ci] of callInfo) {
  call.arguments.forEach((a, j) => {
    if (ts.isSpreadElement(a)) return;
    const t = trackedOfExpr(a);
    if (!t) return;
    const c = ci.callee;
    if (c.kind === 'lib') { libCalls++; return; }
    if (c.kind === 'unres') {
      if (!objectish(checker.getTypeAtLocation(a))) return;
      if (t.key) { unresField++; bump(unresText, call.expression.getText().slice(0, 60)); } else unresWhole++;
      return;
    }
    let where: string | null = null;
    if (c.kind === 'assign') { if (j === 0) where = ci.file; }
    else {
      const f = fns.get(c.node);
      const pi = f ? paramFor(f, j) : -1;
      if (f && pi >= 0 && f.wt.has(pi)) where = fnFile.get(c.node)!;
    }
    if (!where) return;
    if (t.key) {
      bump(use(where).via, t.key);
      viaTotal++;
      if (dom(where) !== dom(ci.file)) viaCross++;
      if (c.kind === 'assign') assignWrites++;
      else bump(viaByCallee, calleeName(c.node));
    } else if (t.whole) bump(wholeVia, t.whole);
  });
}

// ───────────── module-level state in src/sim ─────────────
interface ModVar { file: string; name: string; kind: string; exported: boolean; readers: Map<string, number>; writers: Map<string, number>; fns: Set<string>; files: Set<string> }
const modVars = new Map<ts.Symbol, ModVar>();
const CONTAINERS = new Set(['Map', 'Set', 'WeakMap', 'WeakSet', 'Array']);
for (const sf of srcFiles) {
  const file = relOf(sf);
  if (!file.startsWith('sim/')) continue;
  const fileExports = checker.getSymbolAtLocation(sf)?.exports;
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    const isLet = !(st.declarationList.flags & ts.NodeFlags.Const);
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name)) continue;
      const init = d.initializer ? strip(d.initializer) : undefined;
      const t = checker.getTypeAtLocation(d.name);
      const tn = t.getSymbol()?.name ?? '';
      const empty = !!init && ((ts.isObjectLiteralExpression(init) && !init.properties.length) || (ts.isArrayLiteralExpression(init) && !init.elements.length));
      const cont = CONTAINERS.has(tn) && !!init && (ts.isNewExpression(init) || empty);
      if (!isLet && !cont && !empty) continue;
      const sym = checker.getSymbolAtLocation(d.name);
      if (!sym) continue;
      const exported = !!(ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Export) || !!fileExports?.has(d.name.text as ts.__String);
      modVars.set(sym, { file, name: d.name.text, kind: (isLet ? 'let ' : 'const ') + (CONTAINERS.has(tn) ? tn : checker.typeToString(t).slice(0, 28)), exported, readers: new Map(), writers: new Map(), fns: new Set(), files: new Set() });
    }
  }
}
const modNames = new Set([...modVars.values()].map((m) => m.name));
const enclosingFn = (n: ts.Node): string => {
  for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
    if (ts.isFunctionLike(p)) {
      const nm = (p as ts.FunctionDeclaration).name ?? (p.parent && ts.isVariableDeclaration(p.parent) ? p.parent.name : undefined);
      return nm ? nm.getText() : '(anonymous)';
    }
  }
  return '(module)';
};
for (const sf of srcFiles) {
  const file = relOf(sf);
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && modNames.has(n.text)) {
      let s = checker.getSymbolAtLocation(n);
      if (s && s.flags & ts.SymbolFlags.Alias) s = checker.getAliasedSymbol(s);
      const m = s ? modVars.get(s) : undefined;
      const parent = n.parent;
      const isDecl = ts.isVariableDeclaration(parent) && parent.name === n;
      const isImportExport = ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent) || ts.isImportClause(parent);
      if (m && !isDecl && !isImportExport && !(ts.isPropertyAccessExpression(parent) && parent.name === n)) {
        let write = false;
        let c: ts.Node = n;
        for (;;) {
          if (writeKind(c) === 'write') { write = true; break; }
          const sc = skipParens(c), p = sc.parent;
          if (p && ((ts.isPropertyAccessExpression(p) && p.expression === sc) || (ts.isElementAccessExpression(p) && p.expression === sc))) c = p;
          else break;
        }
        if (!write) {
          const top = skipParens(c);
          const call = top.parent;
          if (call && ts.isCallExpression(call)) {
            const j = call.arguments.indexOf(top as ts.Expression);
            const ci = callInfo.get(call);
            if (j >= 0 && ci) {
              if (ci.callee.kind === 'assign' && j === 0) write = true;
              else if (ci.callee.kind === 'fn') { const f = fns.get(ci.callee.node); const pi = f ? paramFor(f, j) : -1; if (f && pi >= 0 && f.wt.has(pi)) write = true; }
            }
          }
        }
        bump(write ? m.writers : m.readers, dom(file));
        m.fns.add(file + '#' + enclosingFn(n));
        m.files.add(file);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const isFlag = (m: ModVar): boolean => /^let (boolean|number|string|true|false)$/.test(m.kind);
const modAll = [...modVars.values()].filter((m) => m.writers.size > 0 && (m.fns.size >= 2 || m.files.size >= 2));
// on/off switches and counters are summarised in a line; collections and objects (caches, registries) and anything used across files are tabled
const modFlags = modAll.filter((m) => isFlag(m) && m.files.size < 2);
const modRows = modAll.filter((m) => !modFlags.includes(m)).sort((a, b) => b.files.size - a.files.size || b.fns.size - a.fns.size);

// ───────────── fold into domains and fields ─────────────
interface Field { key: string; owner: string; readers: Map<string, number>; writers: Map<string, number>; wDirect: Map<string, number>; wVia: Map<string, number>; wInit: Map<string, number> }
const fields = new Map<string, Field>();
const fld = (k: string): Field => {
  let f = fields.get(k);
  if (!f) fields.set(k, (f = { key: k, owner: k.split('.')[0], readers: new Map(), writers: new Map(), wDirect: new Map(), wVia: new Map(), wInit: new Map() }));
  return f;
};
const comp = new Map<string, { r: Map<string, number>; w: Map<string, number> }>();
const filesOfDomain = new Map<string, number>();
for (const [file, u] of byFile) {
  const d = dom(file);
  filesOfDomain.set(d, (filesOfDomain.get(d) ?? 0) + 1);
  for (const [k, n] of u.reads) bump(fld(k).readers, d, n);
  for (const [k, n] of u.writes) { bump(fld(k).writers, d, n); bump(fld(k).wDirect, d, n); }
  for (const [k, n] of u.via) { bump(fld(k).writers, d, n); bump(fld(k).wVia, d, n); }
  for (const [k, n] of u.init) { bump(fld(k).writers, d, n); bump(fld(k).wInit, d, n); }
  for (const [side, m] of [['r', u.compR], ['w', u.compW]] as const)
    for (const [k, n] of m) {
      let c = comp.get(k);
      if (!c) comp.set(k, (c = { r: new Map(), w: new Map() }));
      bump(c[side], d, n);
    }
}
const domains = [...filesOfDomain.keys()].sort();
const sum = (m: Map<string, number>): number => [...m.values()].reduce((a, b) => a + b, 0);

// state coupling: A writes a field that B reads, A != B. SC[A][B] counts the distinct fields.
const SC = new Map<string, Map<string, { fields: number; keys: string[] }>>();
for (const f of fields.values())
  for (const a of f.writers.keys())
    for (const b of f.readers.keys()) {
      if (a === b) continue;
      let row = SC.get(a);
      if (!row) SC.set(a, (row = new Map()));
      let cell = row.get(b);
      if (!cell) row.set(b, (cell = { fields: 0, keys: [] }));
      cell.fields++;
      cell.keys.push(f.key);
    }

// ───────────── numbers for the report ─────────────
const all = [...fields.values()];
const totalReads = all.reduce((s, f) => s + sum(f.readers), 0);
const wDirect = all.reduce((s, f) => s + sum(f.wDirect), 0);
const wVia = all.reduce((s, f) => s + sum(f.wVia), 0);
const wInit = all.reduce((s, f) => s + sum(f.wInit), 0);
const totalWrites = wDirect + wVia + wInit;
const compR = [...comp.values()].reduce((s, c) => s + sum(c.r), 0);
const compW = [...comp.values()].reduce((s, c) => s + sum(c.w), 0);
const writtenFields = all.filter((f) => f.writers.size);
const crossFields = all.filter((f) => [...f.writers.keys()].some((a) => [...f.readers.keys()].some((b) => a !== b)));
const reachOut = new Map<string, number>(), reachIn = new Map<string, number>();
for (const [a, row] of SC) for (const [b, c] of row) { reachOut.set(a, (reachOut.get(a) ?? 0) + c.fields); reachIn.set(b, (reachIn.get(b) ?? 0) + c.fields); }

// the earlier run, if given
interface V1Field { key: string; writers: Record<string, number>; readers: Record<string, number> }
let v1: { fields: V1Field[]; pairs: { a: string; b: string; n: number }[] } | null = null;
if (v1Path) { try { v1 = JSON.parse(readFileSync(v1Path, 'utf8')); } catch { /* none */ } }
const v1Sum = (o: Record<string, number>): number => Object.values(o).reduce((a, b) => a + b, 0);

// compare with imports: read the matrix the import graph wrote, if it is there
let imp: { domains: string[]; matrix: number[][] } | null = null;
try {
  const g = JSON.parse(ts.sys.readFile(join('import_graph', 'graph.json')) ?? 'null');
  if (g) imp = { domains: g.domains, matrix: g.matrix };
} catch { /* not generated */ }
const impOf = (a: string, b: string): number | null => {
  if (!imp) return null;
  const i = imp.domains.indexOf(a), j = imp.domains.indexOf(b);
  return i < 0 || j < 0 ? 0 : imp.matrix[i][j];
};

mkdirSync(outDir, { recursive: true });
const L: string[] = [];
const pct = (a: number, b: number): string => (b ? Math.round((100 * a) / b) : 0) + '%';
const tick = (s: string): string => s.replace(/\|/g, '\\|');
const onlyRead = all.filter((f) => !f.writers.size);
const three = all.filter((f) => f.writers.size >= 3);
L.push('# Shared state: who reads and who writes', '');
L.push(`${byFile.size} files, ${all.length} fields of types declared in src/sim/types.ts, ${totalReads} reads and ${totalWrites} writes found (${wDirect} direct, ${wVia} through helpers, ${wInit} in object literals built whole). Computed-key accesses are counted apart (${compR} reads, ${compW} writes).`, '');
L.push('## Accesses by bucket', '', '| bucket | reads | writes | what it is |', '|---|---:|---:|---|');
L.push(`| direct | ${totalReads} | ${wDirect} | a property access on a declared field, incl. literal-key x['f'] (${literalKey} of them) |`);
L.push(`| via helper | - | ${wVia} | a declared field handed to a function that writes through that parameter; counted in the callee's group (${viaCross} of them from a different group than the caller) |`);
L.push(`| init | - | ${wInit} | properties listed in an object literal typed as a types.ts interface |`);
L.push(`| computed key | ${compR} | ${compW} | x.f[k] / needs[k] with a non-literal key, as Owner.field[*]; ${comp.size} distinct targets; not in the field statistics |`, '');
L.push(`Call-site accounting: ${writingFns} of ${fns.size} functions write through a parameter (fixpoint after ${rounds} rounds). ${unresField} calls hand a declared field to a callee the checker cannot resolve to a body (callbacks, interface methods); ${unresWhole} more hand a whole declared-type object. ${libCalls} hand a field to a library function (assumed not to mutate it); ${assignWrites} of the via-helper writes are Object.assign targets. ${sum(wholeVia)} calls hand a whole declared-type object to a function that writes through it (the field writes inside are already direct).`, '');
if (unresText.size) L.push('Most common unresolved callees with a declared-field argument: ' + [...unresText].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `\`${tick(k)}\` (${n})`).join(', '), '');
L.push('## How much state is shared', '');
L.push(`- ${writtenFields.length} of ${all.length} fields are written somewhere; ${onlyRead.length} are only ever read.`);
L.push(`- ${crossFields.length} fields are written by one group and read by another (${pct(crossFields.length, writtenFields.length)} of the written ones). That is the state coupling.`);
L.push(`- ${three.length} fields are written by three or more groups: nobody owns them.`);
L.push(`- ${all.filter((f) => f.writers.size && !f.wDirect.size).length} fields are written only through helpers or object literals, never by a direct access.`, '');

if (v1) {
  const v1Map = new Map(v1.fields.map((f) => [f.key, f]));
  const v1Only = v1.fields.filter((f) => !Object.keys(f.writers).length);
  const nowWritten = v1Only.filter((f) => fields.get(f.key)?.writers.size);
  const v1ThreePlus = v1.fields.filter((f) => Object.keys(f.writers).length >= 3).length;
  const v1Cross = v1.fields.filter((f) => Object.keys(f.writers).some((a) => Object.keys(f.readers).some((b) => a !== b))).length;
  const v1Written = v1.fields.filter((f) => Object.keys(f.writers).length).length;
  L.push('## Against the first version of this map (direct accesses only)', '');
  const noInit = (f: Field): number => new Set([...f.wDirect.keys(), ...f.wVia.keys()]).size;
  L.push('| | v1 | now | now, init left out |', '|---|---:|---:|---:|');
  L.push(`| fields | ${v1.fields.length} | ${all.length} | ${all.length} |`);
  L.push(`| reads | ${v1.fields.reduce((s, f) => s + v1Sum(f.readers), 0)} | ${totalReads} | ${totalReads} |`);
  L.push(`| writes | ${v1.fields.reduce((s, f) => s + v1Sum(f.writers), 0)} | ${totalWrites} | ${wDirect + wVia} |`);
  L.push(`| fields written somewhere | ${v1Written} | ${writtenFields.length} | ${all.filter((f) => noInit(f)).length} |`);
  L.push(`| fields only ever read | ${v1Only.length} | ${onlyRead.length} | ${all.filter((f) => !noInit(f)).length} |`);
  L.push(`| fields written by 3+ groups | ${v1ThreePlus} | ${three.length} | ${all.filter((f) => noInit(f) >= 3).length} |`);
  L.push(`| fields written by one group, read by another | ${v1Cross} | ${crossFields.length} | ${all.filter((f) => [...f.wDirect.keys(), ...f.wVia.keys()].some((a) => [...f.readers.keys()].some((b) => a !== b))).length} |`, '');
  L.push(`${nowWritten.length} of the ${v1Only.length} fields v1 called only-ever-read are now written: ${nowWritten.filter((f) => fields.get(f.key)!.wVia.size).length} through a helper, ${nowWritten.filter((f) => fields.get(f.key)!.wInit.size).length} in an object literal (${nowWritten.filter((f) => !fields.get(f.key)!.wVia.size).length} of them ONLY in a literal, i.e. creation and never updated), ${nowWritten.filter((f) => fields.get(f.key)!.wDirect.size).length} directly (literal-key writes).`, '');
  const changes = all.map((f) => {
    const o = v1Map.get(f.key);
    const before = o ? v1Sum(o.writers) : 0, after = sum(f.writers);
    const gb = o ? Object.keys(o.writers).length : 0;
    return { f, before, after, gb, ga: f.writers.size, d: after - before, dg: f.writers.size - gb };
  }).filter((c) => c.d !== 0 || c.dg !== 0);
  L.push('### Fields whose write picture changed most', '', '| field | writes v1 → now | writer groups v1 → now | now: direct / helper / init | groups added |', '|---|---|---|---|---|');
  const rank = (c: (typeof changes)[number]): number => c.dg * 1000 + c.d;
  for (const c of [...changes].sort((a, b) => rank(b) - rank(a)).slice(0, 30)) {
    const v1g = new Set(Object.keys(v1Map.get(c.f.key)?.writers ?? {}));
    L.push(`| ${c.f.key} | ${c.before} → ${c.after} | ${c.gb} → ${c.ga} | ${sum(c.f.wDirect)} / ${sum(c.f.wVia)} / ${sum(c.f.wInit)} | ${[...c.f.writers.keys()].filter((g) => !v1g.has(g)).sort().join(', ') || '-'} |`);
  }
  L.push('', '### Pairs (A writes, B reads) that grew most', '', '| pair | fields v1 → now |', '|---|---|');
  const v1Pair = new Map(v1.pairs.map((p) => [p.a + '→' + p.b, p.n]));
  const pairsNow: { a: string; b: string; n: number }[] = [];
  for (const [a, row] of SC) for (const [b, c] of row) pairsNow.push({ a, b, n: c.fields });
  for (const p of pairsNow.map((p) => ({ ...p, b0: v1Pair.get(p.a + '→' + p.b) ?? 0 })).sort((x, y) => y.n - y.b0 - (x.n - x.b0)).slice(0, 15)) L.push(`| ${p.a} → ${p.b} | ${p.b0} → ${p.n} |`);
  L.push('');
}

L.push('## Fields with the widest reach (written by one or more groups, read by the most)', '', '| field | written by | read by (groups) | reads | writes |', '|---|---|---:|---:|---:|');
for (const f of [...crossFields].sort((a, b) => b.readers.size - a.readers.size || sum(b.readers) - sum(a.readers)).slice(0, 30))
  L.push(`| ${f.key} | ${[...f.writers.keys()].sort().join(', ')} | ${f.readers.size} | ${sum(f.readers)} | ${sum(f.writers)} |`);
L.push('', '## Fields written by the most groups (no single owner)', '', '| field | groups that write it | writes | reads |', '|---|---:|---:|---:|');
for (const f of [...all].sort((a, b) => b.writers.size - a.writers.size || sum(b.writers) - sum(a.writers)).slice(0, 25))
  L.push(`| ${f.key} | ${f.writers.size} (${[...f.writers.keys()].sort().join(', ')}) | ${sum(f.writers)} | ${sum(f.readers)} |`);
L.push('', '## Fields written most through helpers', '', '| field | via helper | direct | groups (callee side) |', '|---|---:|---:|---|');
for (const f of all.filter((x) => x.wVia.size).sort((a, b) => sum(b.wVia) - sum(a.wVia)).slice(0, 20)) L.push(`| ${f.key} | ${sum(f.wVia)} | ${sum(f.wDirect)} | ${[...f.wVia.keys()].sort().join(', ')} |`);
L.push('', '## Helpers that write through a declared field most often', '', [...viaByCallee].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, n]) => `${k} (${n})`).join(', ') || 'none');
L.push('', '## Computed-key access (Owner.field[*])', '', '| target | read by (groups) | reads | written by (groups) | writes |', '|---|---:|---:|---:|---:|');
for (const [k, c] of [...comp].sort((a, b) => sum(b[1].w) + sum(b[1].r) - sum(a[1].w) - sum(a[1].r)).slice(0, 30)) L.push(`| ${k} | ${c.r.size} | ${sum(c.r)} | ${c.w.size} | ${sum(c.w)} |`);
L.push('', '## Groups by how far their writes reach and how much they read from others', '', '| group | files | fields it writes that another group reads | fields it reads that another group writes |', '|---|---:|---:|---:|');
for (const d of [...domains].sort((a, b) => (reachOut.get(b) ?? 0) - (reachOut.get(a) ?? 0))) L.push(`| ${d} | ${filesOfDomain.get(d)} | ${reachOut.get(d) ?? 0} | ${reachIn.get(d) ?? 0} |`);
L.push('', '## Pairs joined by shared state', '', imp ? 'Fields A writes that B reads, beside the number of imports from A to B and from B to A in the import graph. A big number with no import either way is a connection the import graph cannot see.' : 'Fields A writes that B reads.', '', '| A writes, B reads | fields | imports A to B | imports B to A | example fields |', '|---|---:|---:|---:|---|');
const pairs: { a: string; b: string; n: number; keys: string[] }[] = [];
for (const [a, row] of SC) for (const [b, c] of row) pairs.push({ a, b, n: c.fields, keys: c.keys });
pairs.sort((x, y) => y.n - x.n);
for (const p of pairs.slice(0, 40)) L.push(`| ${p.a} → ${p.b} | ${p.n} | ${impOf(p.a, p.b) ?? '-'} | ${impOf(p.b, p.a) ?? '-'} | ${p.keys.slice(0, 4).join(', ')} |`);
const hidden = pairs.filter((p) => imp && (impOf(p.a, p.b) ?? 0) + (impOf(p.b, p.a) ?? 0) === 0 && p.n >= 3);
L.push('', `## Pairs joined by shared state with no import either way (3 or more fields): ${hidden.length}`, '');
for (const p of hidden.slice(0, 25)) L.push(`- ${p.a} → ${p.b}: ${p.n} fields (${p.keys.slice(0, 5).join(', ')})`);
L.push('', '## Fields only ever read (never assigned in src)', '', onlyRead.sort((a, b) => sum(b.readers) - sum(a.readers)).slice(0, 25).map((f) => `${f.key} (${sum(f.readers)})`).join(', '));
L.push('', '## Fields written but never read', '', all.filter((f) => f.writers.size && !f.readers.size).sort((a, b) => sum(b.writers) - sum(a.writers)).slice(0, 25).map((f) => `${f.key} (${sum(f.writers)})`).join(', ') || 'none');
L.push('', `## Module-level state in src/sim: ${modRows.length} tabled (written, used from 2+ functions or files; ${modFlags.length} more are single-file on/off switches and counters, listed in state.json); ${modVars.size} candidates in all`, '', 'Mutable module-scope variables (let/var) and empty or new Map/Set/WeakMap/WeakSet/array/object constants. Separate from the field statistics.', '', '| file | name | kind | exported | written by (groups) | read by (groups) | files | functions |', '|---|---|---|---|---|---|---:|---:|');
const dl = (m: Map<string, number>): string => [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join('; ');
for (const m of modRows.slice(0, 80)) L.push(`| ${m.file} | ${m.name} | ${tick(m.kind)} | ${m.exported ? 'yes' : 'no'} | ${dl(m.writers)} | ${dl(m.readers)} | ${m.files.size} | ${m.fns.size} |`);
if (modRows.length > 80) L.push('', `(${modRows.length - 80} more in state.json)`);
const secs = ((Date.now() - t0) / 1000).toFixed(1);
L.push('', `_Generated in ${secs} s._`);
writeFileSync(join(outDir, 'report.md'), L.join('\n') + '\n');
const obj = (m: Map<string, number>): Record<string, number> => Object.fromEntries(m);
writeFileSync(
  join(outDir, 'state.json'),
  JSON.stringify({
    domains,
    filesOfDomain: Object.fromEntries(filesOfDomain),
    pairs: pairs.map((p) => ({ a: p.a, b: p.b, n: p.n, keys: p.keys })),
    // writers = direct + via helper + init; the three parts are given beside it
    fields: all.map((f) => ({ key: f.key, writers: obj(f.writers), readers: obj(f.readers), writersDirect: obj(f.wDirect), writersVia: obj(f.wVia), writersInit: obj(f.wInit) })),
    buckets: { reads: totalReads, writesDirect: wDirect, writesVia: wVia, writesInit: wInit, computedReads: compR, computedWrites: compW, literalKeyAccesses: literalKey },
    helpers: { functions: fns.size, writingFunctions: writingFns, rounds, unresolvedFieldArgs: unresField, unresolvedWholeArgs: unresWhole, libraryCalls: libCalls, viaFromOtherGroup: viaCross },
    computed: [...comp].map(([k, c]) => ({ key: k, readers: obj(c.r), writers: obj(c.w) })),
    moduleState: [...modRows, ...modFlags].map((m) => ({ file: m.file, name: m.name, kind: m.kind, exported: m.exported, writers: obj(m.writers), readers: obj(m.readers), files: [...m.files], functions: [...m.fns] })),
  }),
);
console.log(L.slice(0, 22).join('\n'));
console.log(`\nwrote ${outDir}/report.md and state.json in ${secs} s`);
