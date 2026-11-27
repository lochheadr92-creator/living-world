// Who raises and who reacts to the simulation's events. "Event" here is every publish/observe style channel found in src:
//   world.events (addEvent: the feed) and world.chronicle (its kept subset), p.log (addLog), p.speech / world.delayed (say, bubbles),
//   world.fx (addFx), p.lastResult (setResult), world.hooks.onX (test/debug callbacks), and the direct-call handlers named onX (onPartnerLost ...).
//   npx vite-node scripts/event_map.ts -- --out <dir> [--state state.json] [--graph graph.json]
// Writes <out>/report.md and <out>/events.json.
//
// Method: the TypeScript checker attributes each call to its declaring function (addEvent etc. in src/sim/events.ts) and each field
// access to its declaring interface in src/sim/types.ts. The kind argument is read as a string literal, or, when it is a variable, as the
// union of literals its type allows (counted once per member, flagged "inferred"). A reaction is a read of the log field outside the
// raising module that is not in the viewer (ui, render, app, agent); the lines of every such read are listed in the report so they can be
// judged by eye, since "reads the log" is not the same as "behaviour depends on it".
// It cannot see: reads through a copied array or an alias the checker loses, text-only dispatch (/was born/.test(e.text)) beyond listing
// the read site, and anything in `any`. The hooks' consumers are counted in scripts/ and tests/ (they are in the tsconfig) as well as src.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { domainOfRel } from './lib/domains';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (n: string, d: string): string => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const outDir = opt('--out', 'event_map');
const statePath = opt('--state', 'C:\\dev\\_claude_scratch\\map-20261127\\inputs\\state.json');
const graphPath = opt('--graph', 'C:\\dev\\_claude_scratch\\map-20261127\\inputs\\graph.json');
const ROOT = resolve('.');
const SRC = resolve('src');
const TYPES = resolve('src/sim/types.ts');
const EVENTS = resolve('src/sim/events.ts');

const cfgPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')!;
const cfg = ts.parseJsonConfigFileContent(ts.readConfigFile(cfgPath, ts.sys.readFile).config, ts.sys, process.cwd());
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, noEmit: true });
const checker = program.getTypeChecker();

const VIEWER = new Set(['ui', 'render', 'app', 'agent']);
const fileOf = (sf: ts.SourceFile): { rel: string; where: 'src' | 'scripts' | 'tests' | 'other'; dom: string } => {
  const abs = resolve(sf.fileName);
  const rel = relative(ROOT, abs).split('\\').join('/');
  if (rel.startsWith('src/')) { const r = rel.slice(4); return { rel, where: 'src', dom: domainOfRel(r) }; }
  if (rel.startsWith('scripts/')) return { rel, where: 'scripts', dom: 'scripts' };
  if (rel.startsWith('tests/')) return { rel, where: 'tests', dom: 'tests' };
  return { rel, where: 'other', dom: 'other' };
};
const isViewer = (dom: string): boolean => VIEWER.has(dom);
const line = (sf: ts.SourceFile, n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
const inc = <K>(m: Map<K, number>, k: K, by = 1): void => void m.set(k, (m.get(k) ?? 0) + by);

// ───────────── raising functions ─────────────
interface Raiser { name: string; arg: number; dflt?: string; what: string }
const RAISERS: Raiser[] = [
  { name: 'addEvent', arg: 1, what: 'feed event kind' },
  { name: 'addLog', arg: 2, what: 'personal log kind' },
  { name: 'addFx', arg: 1, what: 'effect type' },
  { name: 'say', arg: 3, dflt: 'say', what: 'speech kind' },
  { name: 'setResult', arg: 3, what: 'activity outcome' },
];
interface Raise { mech: string; kind: string; file: string; dom: string; inferred: boolean }
const raises: Raise[] = [];
const rawArgSites = new Map<string, number>(); // calls whose kind could not be resolved to literals

const literalsOf = (arg: ts.Expression): { vals: string[]; inferred: boolean } | null => {
  if (ts.isStringLiteralLike(arg)) return { vals: [arg.text], inferred: false };
  const t = checker.getTypeAtLocation(arg);
  const parts = t.isUnion() ? t.types : [t];
  const out: string[] = [];
  for (const p of parts) { if (p.isStringLiteral()) out.push(p.value); else return null; }
  return out.length ? { vals: out, inferred: true } : null;
};

// ───────────── tracked state fields (readers and writers) ─────────────
const TRACK = new Set(['World.events', 'World.chronicle', 'World.fx', 'World.delayed', 'Person.log', 'Person.speech', 'Person.lastResult', 'Grievance.eventId']);
interface Access { fn: string; field: string; file: string; dom: string; line: number; text: string; write: boolean; sf: ts.SourceFile; node: ts.Node }
const accesses: Access[] = [];
const enclosingFn = (n: ts.Node): string => { for (let q: ts.Node | undefined = n.parent; q; q = q.parent) if (ts.isFunctionDeclaration(q) && q.name) return resolve(q.getSourceFile().fileName) + '#' + q.name.text; return ''; };
const callersOf = new Map<string, { file: string; dom: string }[]>();

// ───────────── hooks ─────────────
const hookRaise = new Map<string, Map<string, number>>(); // hook -> file -> n (src)
const hookConsume = new Map<string, Map<string, number>>(); // hook -> 'scripts'|'tests'|'src' file -> n
const hookKindsInHooks = new Map<string, Set<string>>();
const ownerOfHookDecl = (d: ts.Declaration | undefined): string | null => {
  if (!d || resolve(d.getSourceFile().fileName) !== TYPES) return null;
  let q: ts.Node | undefined = d.parent;
  // the member sits in a type literal that is the type of `hooks?:` in interface World
  if (!q || !ts.isTypeLiteralNode(q)) return null;
  const pa = q.parent;
  if (pa && ts.isPropertySignature(pa) && ts.isIdentifier(pa.name) && pa.name.text === 'hooks') return (d as ts.PropertySignature).name.getText();
  return null;
};

// ───────────── on* handlers (direct-call reactions) ─────────────
const handlerDecl = new Map<string, { file: string; dom: string }>();
const handlerCalls: { name: string; file: string; dom: string; line: number }[] = [];

for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile) continue;
  const f = fileOf(sf);
  if (f.where === 'other') continue;
  const visit = (node: ts.Node): void => {
    // raisers
    if (ts.isCallExpression(node)) {
      const sym = checker.getSymbolAtLocation(ts.isIdentifier(node.expression) ? node.expression : ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression);
      const d = sym?.declarations?.[0];
      let decl = d;
      if (sym && (sym.flags & ts.SymbolFlags.Alias)) decl = checker.getAliasedSymbol(sym).declarations?.[0];
      if (decl && resolve(decl.getSourceFile().fileName) === EVENTS && (ts.isFunctionDeclaration(decl)) && decl.name) {
        const r = RAISERS.find((x) => x.name === decl!.name!.text);
        if (r && f.where === 'src' && resolve(sf.fileName) !== EVENTS) {
          const a = node.arguments[r.arg];
          if (!a) raises.push({ mech: r.name, kind: r.dflt ?? '(default)', file: f.rel, dom: f.dom, inferred: false });
          else {
            const L = literalsOf(a);
            if (L) for (const v of L.vals) raises.push({ mech: r.name, kind: v, file: f.rel, dom: f.dom, inferred: L.inferred });
            else { raises.push({ mech: r.name, kind: '(unresolved)', file: f.rel, dom: f.dom, inferred: true }); inc(rawArgSites, r.name + ' ' + f.rel); }
          }
        }
      }
      if (f.where === 'src' && decl && ts.isFunctionDeclaration(decl) && decl.name && resolve(decl.getSourceFile().fileName).startsWith(SRC)) {
        const key = resolve(decl.getSourceFile().fileName) + '#' + decl.name.text;
        const l = callersOf.get(key) ?? []; l.push({ file: f.rel, dom: f.dom }); callersOf.set(key, l);
      }
      // handler calls
      if (f.where === 'src' && f.dom !== 'ui' && ts.isIdentifier(node.expression) && /^on[A-Z]/.test(node.expression.text)) {
        const s2 = checker.getSymbolAtLocation(node.expression);
        let dd = s2?.declarations?.[0];
        if (s2 && (s2.flags & ts.SymbolFlags.Alias)) dd = checker.getAliasedSymbol(s2).declarations?.[0];
        if (dd && ts.isFunctionDeclaration(dd) && resolve(dd.getSourceFile().fileName).startsWith(SRC)) handlerCalls.push({ name: node.expression.text, file: f.rel, dom: f.dom, line: line(sf, node) });
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name && /^on[A-Z]/.test(node.name.text) && f.where === 'src' && f.dom !== 'ui') handlerDecl.set(node.name.text, { file: f.rel, dom: f.dom });

    // tracked fields and hooks, on property access
    if (ts.isPropertyAccessExpression(node)) {
      const sym = checker.getSymbolAtLocation(node.name);
      const decl = sym?.declarations?.[0];
      if (decl && resolve(decl.getSourceFile().fileName) === TYPES && decl.parent) {
        let owner = '';
        if (ts.isInterfaceDeclaration(decl.parent)) owner = decl.parent.name.text;
        else if (ts.isTypeLiteralNode(decl.parent)) { let q: ts.Node = decl.parent; while (q && !ts.isInterfaceDeclaration(q) && !ts.isTypeAliasDeclaration(q)) q = q.parent; owner = q ? (q as ts.InterfaceDeclaration).name.text : ''; }
        const key = owner + '.' + node.name.text;
        if (TRACK.has(key) && f.where === 'src') {
          const p = node.parent;
          const write = !!p && ts.isBinaryExpression(p) && p.left === node && p.operatorToken.kind === ts.SyntaxKind.EqualsToken;
          const mut = !!p && ts.isPropertyAccessExpression(p) && p.expression === node && ['push', 'splice', 'shift', 'unshift', 'pop'].includes(p.name.text);
          accesses.push({ fn: enclosingFn(node), field: key, file: f.rel, dom: f.dom, line: line(sf, node), text: node.parent.getText().replace(/\s+/g, ' ').slice(0, 140), write: write || mut, sf, node });
        }
        const hk = ownerOfHookDecl(decl);
        if (hk) {
          const p = node.parent;
          const assigned = !!p && ts.isBinaryExpression(p) && p.left === node && p.operatorToken.kind === ts.SyntaxKind.EqualsToken;
          if (assigned) { const m = hookConsume.get(hk) ?? new Map(); inc(m, f.rel); hookConsume.set(hk, m); }
          else if (f.where === 'src') { const m = hookRaise.get(hk) ?? new Map(); inc(m, f.rel); hookRaise.set(hk, m); }
        }
      }
    }
    // hooks given as object-literal members: w.hooks = { onX: ... }
    if ((ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node) || ts.isShorthandPropertyAssignment(node)) && ts.isIdentifier(node.name) && /^on[A-Z]/.test(node.name.text) && ts.isObjectLiteralExpression(node.parent)) {
      const ctx = checker.getContextualType(node.parent);
      const sym = ctx ? checker.getPropertyOfType(ctx, node.name.text) ?? (ctx.isUnion() ? ctx.types.map((t) => checker.getPropertyOfType(t, (node.name as ts.Identifier).text)).find(Boolean) : undefined) : undefined;
      const hk = ownerOfHookDecl(sym?.declarations?.[0]);
      if (hk) { const m = hookConsume.get(hk) ?? new Map(); inc(m, f.rel); hookConsume.set(hk, m); }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
// hook kinds raised (onNews kind literals)
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || fileOf(sf).where !== 'src') continue;
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) || ts.isCallExpression(n) && ts.isNonNullExpression(n.expression)) {
      const e = ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) ? n.expression : null;
      if (e && e.name.text === 'onNews' && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
        for (const pr of n.arguments[0].properties) if (ts.isPropertyAssignment(pr) && ts.isIdentifier(pr.name) && pr.name.text === 'kind') { const L = literalsOf(pr.initializer); if (L) { const s = hookKindsInHooks.get('onNews') ?? new Set(); L.vals.forEach((v) => s.add(v)); hookKindsInHooks.set('onNews', s); } }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// ───────────── reactions: comparisons on the kind of a feed event / log entry ─────────────
const reactKinds: { mech: string; kind: string; file: string; dom: string; line: number }[] = [];
const typeName = (n: ts.Node): string => { const t = checker.getTypeAtLocation(n); return t.symbol?.name ?? checker.typeToString(t); };
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile) continue;
  const f = fileOf(sf);
  if (f.where !== 'src' || resolve(sf.fileName) === EVENTS) continue;
  const visit = (n: ts.Node): void => {
    // x.kind === 'lit' / !== / == / !=, and case 'lit' in switch (x.kind)
    const consider = (lhs: ts.Expression, lits: ts.Expression[], at: ts.Node): void => {
      if (!ts.isPropertyAccessExpression(lhs) || lhs.name.text !== 'kind') return;
      const tn = typeName(lhs.expression);
      const mech = tn === 'WorldEvent' ? 'addEvent' : tn === 'LogEntry' ? 'addLog' : tn === 'Speech' ? 'say' : tn === 'FxEvent' ? 'addFx' : '';
      if (!mech) return;
      for (const l of lits) if (ts.isStringLiteralLike(l)) reactKinds.push({ mech, kind: l.text, file: f.rel, dom: f.dom, line: line(sf, at) });
    };
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(n.operatorToken.kind)) {
      consider(n.left, [n.right], n); consider(n.right, [n.left], n);
    }
    if (ts.isSwitchStatement(n)) for (const c of n.caseBlock.clauses) if (ts.isCaseClause(c)) consider(n.expression, [c.expression], c);
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'includes' && ts.isArrayLiteralExpression(n.expression.expression) && n.arguments[0]) consider(n.arguments[0] as ts.Expression, n.expression.expression.elements as unknown as ts.Expression[], n);
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
// the fx 'type' is a string field, not 'kind': a comparison on `.type` of an FxEvent
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile) continue;
  const f = fileOf(sf);
  if (f.where !== 'src') continue;
  const visit = (n: ts.Node): void => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
      for (const [l, r] of [[n.left, n.right], [n.right, n.left]] as [ts.Expression, ts.Expression][])
        if (ts.isPropertyAccessExpression(l) && l.name.text === 'type' && ts.isStringLiteralLike(r) && typeName(l.expression) === 'FxEvent') reactKinds.push({ mech: 'addFx', kind: r.text, file: f.rel, dom: f.dom, line: line(sf, n) });
    }
    if (ts.isSwitchStatement(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'type' && typeName(n.expression.expression) === 'FxEvent')
      for (const c of n.caseBlock.clauses) if (ts.isCaseClause(c) && ts.isStringLiteralLike(c.expression)) reactKinds.push({ mech: 'addFx', kind: c.expression.text, file: f.rel, dom: f.dom, line: line(sf, c) });
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// ───────────── fold ─────────────
const RAISER_FIELD: Record<string, string[]> = { addEvent: ['World.events', 'World.chronicle'], addLog: ['Person.log'], say: ['Person.speech', 'World.delayed'], addFx: ['World.fx'], setResult: ['Person.lastResult'] };
const readFile = (a: Access): boolean => !a.write && a.file !== 'src/sim/events.ts';

interface KindRow { mech: string; kind: string; raiseSites: number; raiseDomains: Record<string, number>; raiseFiles: Record<string, number>; inferredSites: number; reactSimSites: { file: string; dom: string; line: number }[]; reactViewerSites: { file: string; dom: string; line: number }[] }
const kindRows = new Map<string, KindRow>();
const row = (mech: string, kind: string): KindRow => {
  const k = mech + ':' + kind;
  let r = kindRows.get(k);
  if (!r) kindRows.set(k, (r = { mech, kind, raiseSites: 0, raiseDomains: {}, raiseFiles: {}, inferredSites: 0, reactSimSites: [], reactViewerSites: [] }));
  return r;
};
for (const r of raises) { const x = row(r.mech, r.kind); x.raiseSites++; x.raiseDomains[r.dom] = (x.raiseDomains[r.dom] ?? 0) + 1; x.raiseFiles[r.file] = (x.raiseFiles[r.file] ?? 0) + 1; if (r.inferred) x.inferredSites++; }
for (const r of reactKinds) { const x = row(r.mech, r.kind); (isViewer(r.dom) ? x.reactViewerSites : x.reactSimSites).push({ file: r.file, dom: r.dom, line: r.line }); }

// state reads by mechanism
const readsByField = new Map<string, Access[]>();
for (const a of accesses) { const l = readsByField.get(a.field) ?? []; l.push(a); readsByField.set(a.field, l); }
const simReads = (field: string): Access[] => (readsByField.get(field) ?? []).filter((a) => readFile(a) && !isViewer(a.dom));
const viewerReads = (field: string): Access[] => (readsByField.get(field) ?? []).filter((a) => readFile(a) && isViewer(a.dom));

// domain matrices
const domSet = new Set<string>();
const raiseDom = (mech: string): Map<string, number> => { const m = new Map<string, number>(); for (const r of raises) if (r.mech === mech) inc(m, r.dom); return m; };
const MECH_FIELDS = Object.entries(RAISER_FIELD);
// What each sim-side read is, judged by reading it (the script lists every read in the report so this can be re-checked). Anything not
// listed here is shown as 'unclassified' and counted as behavioural, the cautious reading.
type Cls = 'behavioural' | 'diagnostic' | 'display-copy' | 'cosmetic-gate' | 'cosmetic-housekeeping';
const CLASS: Record<string, [Cls, string]> = {
  'src/sim/traditions.ts': ['behavioural', 'pickStory retells chronicle entries; its callers (evening_fire, reputation) change thoughts, relations and rumours'],
  'src/sim/inspect.ts': ['diagnostic', 'inspection snapshot for the viewer / agent; births counter fallback'],
  'src/sim/inspect_observer.ts': ['diagnostic', 'inspection snapshot for the viewer / agent'],
  'src/sim/final_account.ts': ['display-copy', 'copies the last log lines into deceased[].last, shown at the grave'],
  'src/sim/world.ts': ['cosmetic-housekeeping', 'expires a finished bubble'],
  'src/sim/coming_of_age.ts': ['cosmetic-gate', 'skips one more bubble when the speaker is still talking'],
  'src/sim/grief_sit.ts': ['cosmetic-gate', 'skips one more bubble when the speaker is still talking'],
  'src/sim/promise_expectations.ts': ['cosmetic-gate', 'appends a sentence to the bubble just said'],
  'src/sim/social.ts': ['cosmetic-gate', 'delayed bubbles flushed; shows a news bubble only if nobody is speaking'],
};
const classOf = (a: Access): Cls | 'unclassified' => CLASS[a.file]?.[0] ?? 'unclassified';
const behaviouralReads = (field: string): Access[] => simReads(field).filter((a) => { const c = classOf(a); return c === 'behavioural' || c === 'unclassified'; });
// the kinds that can reach the chronicle: always, only with certain wording, or never (events.ts chronicleWorthy)
const CHRON: Record<string, 'always' | 'by wording' | 'never'> = { life: 'always', nature: 'always', conflict: 'always', build: 'by wording', social: 'by wording', work: 'by wording', danger: 'by wording', trade: 'by wording', farm: 'never', survival: 'never' };
// one hop out: a behavioural read inside a helper is a read by the helper's callers
const consumerDomains = (a: Access): Map<string, string[]> => {
  const m = new Map<string, string[]>();
  const cs = a.fn ? callersOf.get(a.fn) : undefined;
  if (cs && cs.length) for (const c of cs) { if (isViewer(c.dom)) continue; const l = m.get(c.dom) ?? []; if (!l.includes(c.file)) l.push(c.file); m.set(c.dom, l); }
  if (!m.size) m.set(a.dom, [a.file]);
  return m;
};
interface EvPair { a: string; b: string; mech: string; raiseSites: number; readSites: number; readExamples: string[] }
const evPairs: EvPair[] = [];
for (const [mech, fields] of MECH_FIELDS) {
  const rd = new Map<string, Set<string>>();
  let readN = 0;
  for (const fld of fields) for (const a of behaviouralReads(fld)) { readN++; for (const [d, files] of consumerDomains(a)) { const st = rd.get(d) ?? new Set<string>(); files.forEach((x) => st.add(x)); rd.set(d, st); } }
  for (const [a, n0] of raiseDom(mech)) for (const [b, files] of rd) {
    // for the feed, only the chronicle is read behaviourally, so only the kinds that can reach it count
    const n = mech === 'addEvent' ? raises.filter((r) => r.mech === 'addEvent' && r.dom === a && CHRON[r.kind] !== 'never').length : n0;
    if (a === b || !n) continue;
    evPairs.push({ a, b, mech, raiseSites: n, readSites: readN, readExamples: [...files].slice(0, 3) });
  }
}
for (const p of evPairs) { domSet.add(p.a); domSet.add(p.b); }

let state: { pairs: { a: string; b: string; n: number }[] } | null = null;
let graph: { domains: string[]; matrix: number[][] } | null = null;
try { state = JSON.parse(readFileSync(statePath, 'utf8')); } catch { /* absent */ }
try { graph = JSON.parse(readFileSync(graphPath, 'utf8')); } catch { /* absent */ }
const stateN = (a: string, b: string): number => state?.pairs.find((p) => p.a === a && p.b === b)?.n ?? 0;
const impN = (a: string, b: string): number => { if (!graph) return 0; const i = graph.domains.indexOf(a), j = graph.domains.indexOf(b); return i < 0 || j < 0 ? 0 : graph.matrix[i][j]; };
const pairKey = (a: string, b: string): string => a + ' -> ' + b;
const onlyEvents = evPairs.filter((p) => impN(p.a, p.b) + impN(p.b, p.a) === 0 && stateN(p.a, p.b) + stateN(p.b, p.a) === 0);
// the same test in the direction of the event only: A raises, B reads; no import A to B and no field A writes that B reads
const onlyEventsDirected = evPairs.filter((p) => impN(p.a, p.b) === 0 && stateN(p.a, p.b) === 0);

// viewer coupling (display) matrix: raising domain -> viewer domain
const viewerPairs = new Map<string, number>();
for (const [mech, fields] of MECH_FIELDS) {
  const rd = new Map<string, number>();
  for (const fld of fields) for (const a of viewerReads(fld)) inc(rd, a.dom);
  for (const [a, n] of raiseDom(mech)) for (const [b] of rd) inc(viewerPairs, pairKey(a, b), n);
}

// hooks table
const hookRows = [...new Set([...hookRaise.keys(), ...hookConsume.keys()])].sort().map((h) => {
  const rs = hookRaise.get(h) ?? new Map<string, number>();
  const cs = hookConsume.get(h) ?? new Map<string, number>();
  const sumM = (m: Map<string, number>): number => [...m.values()].reduce((a, b) => a + b, 0);
  const consumersBy: Record<string, number> = {};
  for (const [file, n] of cs) { const k = file.startsWith('scripts/') ? 'scripts' : file.startsWith('tests/') ? 'tests' : 'src'; consumersBy[k] = (consumersBy[k] ?? 0) + n; }
  const raiseDoms: Record<string, number> = {};
  for (const [file, n] of rs) { const d = domainOfRel(file.slice(4)); raiseDoms[d] = (raiseDoms[d] ?? 0) + n; }
  return { hook: h, raiseSites: sumM(rs), raiseFiles: [...rs.keys()], raiseDoms, consumers: sumM(cs), consumersBy, consumerFilesSrc: [...cs.keys()].filter((x) => x.startsWith('src/')) };
});

// handlers
const handlerRows = [...handlerDecl.entries()].map(([name, d]) => {
  const calls = handlerCalls.filter((c) => c.name === name);
  const byDom: Record<string, number> = {};
  for (const c of calls) byDom[c.dom] = (byDom[c.dom] ?? 0) + 1;
  return { name, definedIn: d.file, domain: d.dom, calls: calls.length, callerDomains: byDom, callerFiles: [...new Set(calls.map((c) => c.file))] };
}).sort((a, b) => b.calls - a.calls);

// ───────────── numbers ─────────────
const kindList = [...kindRows.values()];
const mechKinds = (m: string): KindRow[] => kindList.filter((k) => k.mech === m);
const raisedNeverReactedSim = (m: string): KindRow[] => mechKinds(m).filter((k) => k.raiseSites > 0 && k.reactSimSites.length === 0);
const reactedNeverRaised = kindList.filter((k) => k.raiseSites === 0 && (k.reactSimSites.length || k.reactViewerSites.length));
const raiseTotal = (m: string): number => raises.filter((r) => r.mech === m).length;
const raiseFilesCount = (m: string): number => new Set(raises.filter((r) => r.mech === m).map((r) => r.file)).size;

// ───────────── report ─────────────
const L: string[] = [];
const fmtDoms = (o: Record<string, number>, n = 4): string => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(', ');
L.push('# Events: who raises, who reacts', '');
L.push('## The mechanisms', '');
L.push('| mechanism | raised by | stored in | read by in src (sim domains) | read by viewer (ui, render, app, agent) | does behaviour depend on it? |', '|---|---|---|---:|---:|---|');
const MECH_DESC: [string, string, string, string][] = [
  ['feed events', 'addEvent', 'World.events (ring of 500), World.chronicle (rich, 400)', 'World.events,World.chronicle'],
  ['personal log', 'addLog', 'Person.log (ring of 60)', 'Person.log'],
  ['speech bubbles', 'say', 'Person.speech, World.delayed', 'Person.speech,World.delayed'],
  ['effects', 'addFx', 'World.fx (ring of 400)', 'World.fx'],
  ['activity results', 'setResult', 'Person.lastResult', 'Person.lastResult'],
];
for (const [name, raiser, store, flds] of MECH_DESC) {
  const fl = flds.split(',');
  const sr = fl.flatMap((x) => simReads(x)), vr = fl.flatMap((x) => viewerReads(x));
  L.push(`| ${name} (${raiser}) | ${raiseTotal(raiser)} call sites in ${raiseFilesCount(raiser)} files | ${store} | ${sr.length} | ${vr.length} | see below |`);
}
L.push(`| world.hooks (${hookRows.length} hooks) | ${hookRows.reduce((s, h) => s + h.raiseSites, 0)} call sites | none: calls a function if one was installed | consumers in src: ${hookRows.reduce((s, h) => s + (h.consumersBy.src ?? 0), 0)} | scripts ${hookRows.reduce((s, h) => s + (h.consumersBy.scripts ?? 0), 0)}, tests ${hookRows.reduce((s, h) => s + (h.consumersBy.tests ?? 0), 0)} | typed "never required by the simulation" |`);
L.push(`| direct-call handlers (onX functions) | ${handlerCalls.length} calls to ${handlerDecl.size} handlers | none: a plain call | all (it is the sim reacting to itself) | 0 | yes: these are control flow, not events |`);
L.push('', 'Sim reads below are every read of the log field outside events.ts in a non-viewer domain; each is listed so it can be judged.', '');

for (const [name, , , flds] of MECH_DESC) {
  const sr = flds.split(',').flatMap((x) => simReads(x));
  L.push(`### Sim-side reads of ${name} (${sr.length})`, '');
  if (!sr.length) L.push('none', '');
  else { for (const a of sr.slice(0, 60)) L.push(`- ${a.file}:${a.line} [${a.dom}] **${classOf(a)}**${CLASS[a.file] ? ' (' + CLASS[a.file][1] + ')' : ''} \`${a.text.replace(/`/g, "'")}\``); L.push(''); }
}

L.push('## Event kinds: raising and reacting', '');
for (const m of ['addEvent', 'addLog', 'say', 'addFx', 'setResult']) {
  const rows = mechKinds(m).sort((a, b) => b.raiseSites - a.raiseSites);
  L.push(`### ${m}: ${rows.length} kinds, ${raiseTotal(m)} raise sites`, '');
  L.push('| kind | raise sites | files | main raising domains | inferred sites | sim reacts (comparisons on kind) | viewer reacts |', '|---|---:|---:|---|---:|---:|---:|');
  for (const r of rows) L.push(`| ${r.kind} | ${r.raiseSites} | ${Object.keys(r.raiseFiles).length} | ${fmtDoms(r.raiseDomains, 3)} | ${r.inferredSites} | ${r.reactSimSites.length} | ${r.reactViewerSites.length} |`);
  L.push('');
}
L.push('### Reactions in the sim by kind (every comparison on a kind, outside the viewer)', '');
const simReact = kindList.filter((k) => k.reactSimSites.length);
if (!simReact.length) L.push('none', '');
else for (const k of simReact) L.push(`- ${k.mech}:${k.kind} -> ${k.reactSimSites.map((s) => `${s.file}:${s.line} [${s.dom}]`).join(', ')}`);
L.push('', '### Kinds raised but never reacted to by the sim (display-only or unread)', '');
for (const m of ['addEvent', 'addLog', 'say', 'addFx', 'setResult']) { const r = raisedNeverReactedSim(m); L.push(`- ${m}: ${r.length} of ${mechKinds(m).filter((k) => k.raiseSites).length} kinds: ${r.map((k) => k.kind).join(', ')}`); }
L.push('', '### Kinds compared against but never raised', '');
L.push(reactedNeverRaised.length ? reactedNeverRaised.map((k) => `- ${k.mech}:${k.kind} compared in ${[...k.reactSimSites, ...k.reactViewerSites].map((s) => `${s.file}:${s.line}`).join(', ')}`).join('\n') : 'none');

L.push('', '## Hooks (world.hooks.onX)', '', '| hook | raise sites in src | raising domains | installed in scripts | installed in tests | installed in src |', '|---|---:|---|---:|---:|---:|');
for (const h of hookRows) L.push(`| ${h.hook} | ${h.raiseSites} | ${fmtDoms(h.raiseDoms)} | ${h.consumersBy.scripts ?? 0} | ${h.consumersBy.tests ?? 0} | ${h.consumersBy.src ?? 0} |`);
const nn = hookKindsInHooks.get('onNews');
if (nn) L.push('', `onNews carries its own kind: ${[...nn].join(', ')}.`);

L.push('', '## Direct-call handlers (functions named onX in src)', '', '| handler | defined in | calls | caller domains |', '|---|---|---:|---|');
for (const h of handlerRows) L.push(`| ${h.name} | ${h.definedIn} [${h.domain}] | ${h.calls} | ${fmtDoms(h.callerDomains)} |`);

L.push('', '## Domain matrix: A raises, B reads (sim domains only)', '');
L.push('A pair is listed when domain A raises into a log and domain B (not a viewer, not A) reads it in a way that can change behaviour: reads classed diagnostic, display-copy or cosmetic are left out, and a read inside a helper counts for its callers. For the feed, only the kinds that can reach the chronicle count as raising (farm and survival cannot).', '');
L.push('| A raises | B reads | mechanism | A raise sites | behavioural reads | imports A to B | imports B to A | state fields A writes B reads | example reads |', '|---|---|---|---:|---:|---:|---:|---:|---|');
for (const p of evPairs.sort((x, y) => y.readSites - x.readSites)) L.push(`| ${p.a} | ${p.b} | ${p.mech} | ${p.raiseSites} | ${p.readSites} | ${impN(p.a, p.b)} | ${impN(p.b, p.a)} | ${stateN(p.a, p.b)} | ${p.readExamples.join(', ')} |`);
L.push('', `Pairs joined by events but by no import in either direction and no shared field in either direction: ${onlyEvents.length}`, '');
for (const p of onlyEvents) L.push(`- ${p.a} -> ${p.b} via ${p.mech} (${p.readSites} read sites: ${p.readExamples.join(', ')})`);
L.push('', `Directional test (no import A to B and no field A writes that B reads, whatever runs the other way): ${onlyEventsDirected.length}`, '');
for (const p of onlyEventsDirected) L.push(`- ${p.a} -> ${p.b} via ${p.mech} (imports B to A ${impN(p.b, p.a)}, fields B writes that A reads ${stateN(p.b, p.a)}; reader files ${p.readExamples.join(', ')})`);
L.push('', '### Display coupling: raising domain to viewer domain (sum of raise sites, not behaviour)', '', '| raiser -> viewer | raise-site weight |', '|---|---:|');
for (const [k, v] of [...viewerPairs].sort((a, b) => b[1] - a[1]).slice(0, 25)) L.push(`| ${k} | ${v} |`);

L.push('', '## Domains by how much they raise', '', '| domain | feed events | log entries | speech | effects | results |', '|---|---:|---:|---:|---:|---:|');
const allDoms = [...new Set(raises.map((r) => r.dom))].sort();
for (const d of allDoms) { const c = (m: string): number => raises.filter((r) => r.mech === m && r.dom === d).length; L.push(`| ${d} | ${c('addEvent')} | ${c('addLog')} | ${c('say')} | ${c('addFx')} | ${c('setResult')} |`); }
if (rawArgSites.size) L.push('', `Calls whose kind could not be reduced to literals: ${[...rawArgSites].map(([k, v]) => `${k} (${v})`).join(', ')}`);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'report.md'), L.join('\n') + '\n');
writeFileSync(
  join(outDir, 'events.json'),
  JSON.stringify({
    kinds: kindList,
    hooks: hookRows,
    handlers: handlerRows,
    simReads: Object.fromEntries(Object.keys(RAISER_FIELD).flatMap((m) => RAISER_FIELD[m]).map((f) => [f, simReads(f).map((a) => ({ file: a.file, dom: a.dom, line: a.line, text: a.text }))])),
    viewerReadCounts: Object.fromEntries(Object.keys(RAISER_FIELD).flatMap((m) => RAISER_FIELD[m]).map((f) => [f, viewerReads(f).length])),
    pairs: evPairs,
    onlyEvents,
    onlyEventsDirected,
    viewerPairs: Object.fromEntries(viewerPairs),
  }, null, 1),
);
console.log(`kinds ${kindList.length}, raise sites ${raises.length}, sim reads ${Object.keys(RAISER_FIELD).flatMap((m) => RAISER_FIELD[m]).reduce((s, f) => s + simReads(f).length, 0)}, evPairs ${evPairs.length}, onlyEvents ${onlyEvents.length}`);
console.log(`wrote ${outDir}/report.md and events.json`);
