// Is the hand-written grouping of src/sim (scripts/lib/domains.ts) right? Cluster the sim files from the data, compare, and propose moves.
//   npx vite-node scripts/domain_check.ts -- --out <dir> [--graph <graph.json>]
// Graph over the src/sim files (render, ui, agent, app left out): import edges (weight 1, type-only 0.5, both directions summed),
// shared-state edges (per FILE, from the TypeScript checker the way scripts/state_map.ts does it), and a small filename-prefix affinity.
// Clustering: Louvain modularity optimisation written here, fixed node order (sorted by path), no randomness, several resolutions.
// Writes <out>/report.md, clusters.json, moves.json. It never edits scripts/lib/domains.ts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { domainOfRel } from './lib/domains';

const args = process.argv.slice(2).filter((a) => a !== '--');
const arg = (k: string, d: string): string => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const outDir = arg('--out', 'domain_check');
const graphPath = arg('--graph', 'C:/dev/_claude_scratch/map-20261127/inputs/graph.json');
const T0 = Date.now();

// ───────────── nodes and import edges ─────────────
interface GFile { id: number; path: string }
const g = JSON.parse(readFileSync(graphPath, 'utf8')) as { files: GFile[]; edges: [number, number, boolean | number][] };
const simFiles = g.files.filter((f) => f.path.startsWith('sim/')).sort((a, b) => (a.path < b.path ? -1 : 1));
const N = simFiles.length;
const idx = new Map<string, number>(); // path (relative to src) -> node
simFiles.forEach((f, i) => idx.set(f.path, i));
const nodeOfId = new Map<number, number>();
simFiles.forEach((f, i) => nodeOfId.set(f.id, i));
const hand = simFiles.map((f) => domainOfRel(f.path));
const base = simFiles.map((f) => f.path.slice(4).replace(/\.ts$/, ''));

type W = Map<number, number>[];
const mk = (): W => Array.from({ length: N }, () => new Map<number, number>());
const add = (w: W, a: number, b: number, x: number): void => {
  if (a === b || !x) return;
  w[a].set(b, (w[a].get(b) ?? 0) + x);
  w[b].set(a, (w[b].get(a) ?? 0) + x);
};
const impW = mk();
let simEdges = 0;
// hubs (types, constants, util ... are imported by hundreds of files) would tie everything to everything: an import of a file that
// n sim files import counts 1/(1+ln n) (n=1 -> 1, n=10 -> 0.30, n=368 -> 0.14). --no-damp turns that off.
const DAMP = !args.includes('--no-damp');
const indeg = new Array<number>(N).fill(0);
for (const [f, t] of g.edges) {
  const a = nodeOfId.get(f), b = nodeOfId.get(t);
  if (a !== undefined && b !== undefined) indeg[b]++;
}
for (const [f, t, to] of g.edges) {
  const a = nodeOfId.get(f), b = nodeOfId.get(t);
  if (a === undefined || b === undefined) continue;
  simEdges++;
  add(impW, a, b, (to ? 0.5 : 1) * (DAMP ? 1 / (1 + Math.log(Math.max(1, indeg[b]))) : 1));
}

// ───────────── shared state per file (as scripts/state_map.ts) ─────────────
const SRC = resolve('src');
const TYPES = resolve('src/sim/types.ts');
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
// field key -> { writers: node set, readers: node set }
const fieldUse = new Map<string, { w: Set<number>; r: Set<number> }>();
for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile) continue;
  const rel = relative(SRC, resolve(sf.fileName)).split('\\').join('/');
  const me = idx.get(rel);
  if (me === undefined) continue;
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const decl = checker.getSymbolAtLocation(node.name)?.declarations?.[0];
      if (decl && resolve(decl.getSourceFile().fileName) === TYPES && decl.parent && (ts.isInterfaceDeclaration(decl.parent) || ts.isTypeLiteralNode(decl.parent) || ts.isClassDeclaration(decl.parent))) {
        let owner = '';
        if (ts.isInterfaceDeclaration(decl.parent) || ts.isClassDeclaration(decl.parent)) owner = decl.parent.name?.text ?? '';
        else {
          let q: ts.Node = decl.parent;
          while (q && !ts.isInterfaceDeclaration(q) && !ts.isTypeAliasDeclaration(q)) q = q.parent;
          owner = q && (ts.isInterfaceDeclaration(q) || ts.isTypeAliasDeclaration(q)) ? q.name.text : '';
        }
        if (owner) {
          const key = owner + '.' + node.name.text;
          let u = fieldUse.get(key);
          if (!u) fieldUse.set(key, (u = { w: new Set(), r: new Set() }));
          (writeKind(node) === 'write' ? u.w : u.r).add(me);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
// A field touched by n files gives each writer-involving pair 1/(n-1), reader-reader pairs a quarter of that: a field everybody reads
// (World.people) then barely links anyone, a field two files share links them fully.
const stW = mk();
let stFields = 0;
for (const u of fieldUse.values()) {
  const acc = new Set([...u.w, ...u.r]);
  if (acc.size < 2) continue;
  stFields++;
  const list = [...acc].sort((a, b) => a - b);
  const unit = 1 / (list.length - 1);
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const involvesWriter = u.w.has(a) || u.w.has(b);
      add(stW, a, b, unit * (involvesWriter ? 1 : 0.25));
    }
}

// ───────────── filename-prefix affinity ─────────────
const tok = base.map((b) => b.split('_')[0]);
const byTok = new Map<string, number[]>();
tok.forEach((t, i) => {
  if (!base[i].includes('_')) return; // only names with a prefix, not a lone word
  if (!byTok.has(t)) byTok.set(t, []);
  byTok.get(t)!.push(i);
});
const pfW = mk();
const prefixes: string[] = [];
for (const [t, list] of byTok) {
  if (list.length < 2 || list.length > 14 || t.length < 3) continue;
  prefixes.push(`${t}_ (${list.length})`);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) add(pfW, list[i], list[j], 1);
}
const total = (w: W): number => w.reduce((s, m) => s + [...m.values()].reduce((a, b) => a + b, 0), 0) / 2;
// mix: imports as they are; state scaled to 60% of the import mass; prefix scaled to 8% (kept small: the hand grouping itself leans on names)
const tImp = total(impW), tSt = total(stW), tPf = total(pfW);
const kSt = tSt ? (0.6 * tImp) / tSt : 0, kPf = tPf ? (0.08 * tImp) / tPf : 0;
const comb = mk();
for (let i = 0; i < N; i++) {
  for (const [j, x] of impW[i]) comb[i].set(j, (comb[i].get(j) ?? 0) + x);
  for (const [j, x] of stW[i]) comb[i].set(j, (comb[i].get(j) ?? 0) + x * kSt);
  for (const [j, x] of pfW[i]) comb[i].set(j, (comb[i].get(j) ?? 0) + x * kPf);
}

// ───────────── Louvain ─────────────
function modularity(w: W, lab: number[], gamma = 1): number {
  const k = w.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
  const m2 = k.reduce((a, b) => a + b, 0);
  if (!m2) return 0;
  const inn = new Map<number, number>(), tot = new Map<number, number>();
  for (let i = 0; i < w.length; i++) {
    tot.set(lab[i], (tot.get(lab[i]) ?? 0) + k[i]);
    for (const [j, x] of w[i]) if (lab[j] === lab[i]) inn.set(lab[i], (inn.get(lab[i]) ?? 0) + x);
  }
  let q = 0;
  for (const [c, t] of tot) q += (inn.get(c) ?? 0) / m2 - gamma * (t / m2) ** 2;
  return q;
}
function louvain(w0: W, gamma: number): number[] {
  let w = w0.map((m) => new Map(m));
  let member = Array.from({ length: w.length }, (_, i) => i); // original node -> current super-node
  for (let level = 0; level < 20; level++) {
    const n = w.length;
    // degree: row sum, with a self-loop (stored once) counted twice
    const k = w.map((m, i) => [...m.values()].reduce((a, b) => a + b, 0) + (m.get(i) ?? 0));
    const m2 = k.reduce((a, b) => a + b, 0);
    if (!m2) break;
    const comm = Array.from({ length: n }, (_, i) => i);
    const tot = k.slice();
    let moved = true, improvedAny = false;
    for (let pass = 0; moved && pass < 100; pass++) {
      moved = false;
      for (let i = 0; i < n; i++) {
        const to = new Map<number, number>();
        for (const [j, x] of w[i]) if (j !== i) to.set(comm[j], (to.get(comm[j]) ?? 0) + x);
        const old = comm[i];
        tot[old] -= k[i];
        let best = old, bestGain = (to.get(old) ?? 0) - (gamma * tot[old] * k[i]) / m2;
        for (const c of [...to.keys()].sort((a, b) => a - b)) {
          const gain = (to.get(c) ?? 0) - (gamma * tot[c] * k[i]) / m2;
          if (gain > bestGain + 1e-12) { bestGain = gain; best = c; }
        }
        tot[best] += k[i];
        if (best !== old) { comm[i] = best; moved = true; improvedAny = true; }
      }
    }
    if (!improvedAny) break;
    const ren = new Map<number, number>();
    for (let i = 0; i < n; i++) if (!ren.has(comm[i])) ren.set(comm[i], ren.size);
    const nw: W = Array.from({ length: ren.size }, () => new Map<number, number>());
    for (let i = 0; i < n; i++)
      for (const [j, x] of w[i]) {
        const a = ren.get(comm[i])!, b = ren.get(comm[j])!;
        // an edge i-j (i != j) sits in both rows; between two super-nodes each row gets it once, inside one super-node the
        // self-loop collects half from each row so it is stored once; an existing self-loop (i == j) is carried over whole
        nw[a].set(b, (nw[a].get(b) ?? 0) + (a === b && i !== j ? x / 2 : x));
      }
    member = member.map((s) => ren.get(comm[s])!);
    w = nw;
    if (ren.size === n) break;
  }
  return member;
}
const relabel = (lab: number[]): number[] => {
  const r = new Map<number, number>();
  return lab.map((c) => (r.has(c) ? r.get(c)! : (r.set(c, r.size), r.size - 1)));
};

const gammas: number[] = [];
for (let x = 0.5; x <= 4.01; x += 0.25) gammas.push(Math.round(x * 100) / 100);
interface Run { gamma: number; lab: number[]; k: number; q1: number }
const runs: Run[] = gammas.map((gm) => {
  const lab = relabel(louvain(comb, gm));
  return { gamma: gm, lab, k: new Set(lab).size, q1: modularity(comb, lab, 1) };
});
const dist = (k: number): number => (k < 14 ? 14 - k : k > 20 ? k - 20 : 0);
// closest to 14..20 clusters; among equals the higher modularity at gamma 1
const chosen = [...runs].sort((a, b) => dist(a.k) - dist(b.k) || b.q1 - a.q1 || a.gamma - b.gamma)[0];
const lab = chosen.lab;
const K = chosen.k;

// ───────────── comparison measures ─────────────
const handIdx = [...new Set(hand)].sort();
const hl = hand.map((h) => handIdx.indexOf(h));
function contingency(a: number[], b: number[]): { t: Map<string, number>; ra: Map<number, number>; rb: Map<number, number> } {
  const t = new Map<string, number>(), ra = new Map<number, number>(), rb = new Map<number, number>();
  a.forEach((x, i) => {
    const y = b[i];
    t.set(x + ',' + y, (t.get(x + ',' + y) ?? 0) + 1);
    ra.set(x, (ra.get(x) ?? 0) + 1);
    rb.set(y, (rb.get(y) ?? 0) + 1);
  });
  return { t, ra, rb };
}
const c2 = (x: number): number => (x * (x - 1)) / 2;
function ari(a: number[], b: number[]): number {
  const { t, ra, rb } = contingency(a, b);
  const sij = [...t.values()].reduce((s, x) => s + c2(x), 0);
  const sa = [...ra.values()].reduce((s, x) => s + c2(x), 0), sb = [...rb.values()].reduce((s, x) => s + c2(x), 0);
  const exp = (sa * sb) / c2(a.length), mx = (sa + sb) / 2;
  return (sij - exp) / (mx - exp);
}
function nmi(a: number[], b: number[]): number {
  const { t, ra, rb } = contingency(a, b), n = a.length;
  let I = 0;
  for (const [key, x] of t) {
    const [p, q] = key.split(',').map(Number);
    I += (x / n) * Math.log((x * n) / (ra.get(p)! * rb.get(q)!));
  }
  const H = (m: Map<number, number>): number => -[...m.values()].reduce((s, x) => s + (x / n) * Math.log(x / n), 0);
  return (2 * I) / (H(ra) + H(rb));
}
const ARI = ari(hl, lab), NMI = nmi(hl, lab);
// robustness: hand vs a clustering of the import edges alone, same resolution
const impOnly = relabel(louvain(impW, chosen.gamma));
const ARI_imp = ari(hl, impOnly), NMI_imp = nmi(hl, impOnly);
const Qhand = modularity(comb, hl), Qdata = modularity(comb, lab);
const QhandImp = modularity(impW, hl), QdataImp = modularity(impW, lab), QhandSt = modularity(stW, hl), QdataSt = modularity(stW, lab);

const members = (labels: number[], c: number): number[] => labels.flatMap((x, i) => (x === c ? [i] : []));
const handPurity = handIdx.map((h, hi) => {
  const m = members(hl, hi);
  const cnt = new Map<number, number>();
  m.forEach((i) => cnt.set(lab[i], (cnt.get(lab[i]) ?? 0) + 1));
  const [bc, bn] = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return { domain: h, files: m.length, purity: bn / m.length, bestCluster: bc, spread: cnt.size, top: [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4) };
});

// ───────────── clusters: name, centre, mix ─────────────
const strength = comb.map((m) => [...m.values()].reduce((a, b) => a + b, 0));
interface Cl { id: number; name: string; size: number; mix: [string, number][]; centre: string[]; purity: number }
const clusters: Cl[] = [];
for (let c = 0; c < K; c++) {
  const m = members(lab, c);
  const mix = new Map<string, number>();
  m.forEach((i) => mix.set(hand[i], (mix.get(hand[i]) ?? 0) + 1));
  const sorted = [...mix.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  // nearest the centre: most edge weight kept inside the cluster
  const inner = (i: number): number => [...comb[i]].filter(([j]) => lab[j] === c).reduce((s, [, x]) => s + x, 0);
  const centre = [...m].sort((a, b) => inner(b) - inner(a) || a - b).slice(0, 6).map((i) => base[i]);
  clusters.push({ id: c, name: sorted[0][0], size: m.length, mix: sorted, centre, purity: sorted[0][1] / m.length });
}
// repeated names (a hand domain that fills several clusters): '#1', '#2' by size
const nameCount = new Map<string, number>();
clusters.forEach((c) => nameCount.set(c.name, (nameCount.get(c.name) ?? 0) + 1));
const seen = new Map<string, number>();
for (const c of [...clusters].sort((a, b) => b.size - a.size || a.id - b.id)) {
  if ((nameCount.get(c.name) ?? 0) > 1) { const s = (seen.get(c.name) ?? 0) + 1; seen.set(c.name, s); c.name = `${c.name} #${s}`; }
}

// ───────────── per-file edge shares and misplaced files ─────────────
interface Row { file: string; hand: string; deg: number; own: number; bestHand: string; bestHandShare: number; bestCluster: string; bestClusterShare: number; ownCluster: string; ownClusterShare: number; imp: number; st: number }
const rows: Row[] = [];
for (let i = 0; i < N; i++) {
  const deg = strength[i];
  const h: Record<string, number> = {}, c: Record<string, number> = {};
  for (const [j, x] of comb[i]) {
    h[hand[j]] = (h[hand[j]] ?? 0) + x;
    c[clusters[lab[j]].name] = (c[clusters[lab[j]].name] ?? 0) + x;
  }
  const sh = (o: Record<string, number>): Record<string, number> => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deg ? v / deg : 0]));
  const hs = sh(h), cs = sh(c);
  const other = Object.entries(hs).filter(([k]) => k !== hand[i]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] ?? ['-', 0];
  const bc = Object.entries(cs).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] ?? ['-', 0];
  rows.push({
    file: base[i], hand: hand[i], deg, own: hs[hand[i]] ?? 0,
    bestHand: other[0], bestHandShare: other[1], bestCluster: bc[0], bestClusterShare: bc[1],
    ownCluster: clusters[lab[i]].name, ownClusterShare: cs[clusters[lab[i]].name] ?? 0,
    imp: [...impW[i].values()].reduce((a, b) => a + b, 0), st: [...stW[i].values()].reduce((a, b) => a + b, 0),
  });
}
// strong move: >=60% of the file's weighted edges go to ONE other hand domain, more than to its own, and the file has some evidence (weight >= 2)
const strong = rows.filter((r) => r.bestHandShare >= 0.6 && r.bestHandShare > r.own && r.deg >= 2).sort((a, b) => b.bestHandShare * Math.log(1 + b.deg) - a.bestHandShare * Math.log(1 + a.deg));
const moves = strong.map((r) => ({ file: `src/sim/${r.file}.ts`, from: r.hand, to: r.bestHand, shareToTarget: +r.bestHandShare.toFixed(3), shareToOwn: +r.own.toFixed(3), weight: +r.deg.toFixed(1), importWeight: +r.imp.toFixed(1), stateWeight: +r.st.toFixed(1) }));
// softer list: more tied to another hand domain than to its own, but under 60%
const weak = rows.filter((r) => !strong.includes(r) && r.bestHandShare > r.own && r.bestHandShare >= 0.4 && r.deg >= 2);

// ───────────── headline numbers before / after the moves ─────────────
const after = hand.slice();
for (const mv of moves) after[idx.get(mv.file.replace('src/', ''))!] = mv.to;
function leaving(assign: string[]): { n: number; leave: number; w: number; wLeave: number } {
  let n = 0, leave = 0, w = 0, wLeave = 0;
  for (const [f, t, to] of g.edges) {
    const a = nodeOfId.get(f), b = nodeOfId.get(t);
    if (a === undefined || b === undefined) continue;
    const x = to ? 0.5 : 1;
    n++; w += x;
    if (assign[a] !== assign[b]) { leave++; wLeave += x; }
  }
  return { n, leave, w, wLeave };
}
const labNames = lab.map((c) => clusters[c].name);
const L0 = leaving(hand), L1 = leaving(after), LD = leaving(labNames);
const ndom = (a: string[]): number => new Set(a).size;
const crossState = (assign: string[]): { fields: number; cross: number } => {
  let cross = 0, fields = 0;
  for (const u of fieldUse.values()) {
    if (!u.w.size) continue;
    fields++;
    const wd = new Set([...u.w].map((i) => assign[i])), rd = new Set([...u.r].map((i) => assign[i]));
    if ([...wd].some((a) => [...rd].some((b) => a !== b))) cross++;
  }
  return { fields, cross };
};
const S0 = crossState(hand), S1 = crossState(after), SD = crossState(labNames);
function perDomain(assign: string[]): Map<string, { out: number; tot: number }> {
  const m = new Map<string, { out: number; tot: number }>();
  for (const [f, t] of g.edges) {
    const a = nodeOfId.get(f), b = nodeOfId.get(t);
    if (a === undefined || b === undefined) continue;
    let e = m.get(assign[a]);
    if (!e) m.set(assign[a], (e = { out: 0, tot: 0 }));
    e.tot++;
    if (assign[a] !== assign[b]) e.out++;
  }
  return m;
}
const PD0 = perDomain(hand), PD1 = perDomain(after);
const Qafter = modularity(comb, after.map((a) => handIdx.indexOf(a)));

// ───────────── report ─────────────
const p = (x: number, d = 0): string => (100 * x).toFixed(d) + '%';
const f3 = (x: number): string => x.toFixed(3);
const R: string[] = [];
R.push('# Is the hand grouping right? A data-driven check of the src/sim domains', '');
R.push(`${N} files of src/sim (render, ui, agent, app left out); ${handIdx.length} hand domains. Inputs: ${simEdges} import edges between them, ${stFields} state fields touched by two or more files, ${prefixes.length} filename prefixes.`, '');
R.push('## Method', '');
R.push('- Graph: import edges (1, type-only 0.5, hub-damped: an import of a file that n sim files import counts 1/(1+ln n)'+(DAMP?'':' [DAMPING OFF]')+', both directions summed into one undirected weight) + shared-state edges (every field of a types.ts interface touched by n files links each pair of them by 1/(n-1), a quarter of that for two readers) rescaled to 60% of the import weight + filename-prefix affinity (files sharing a first token before an underscore, token 3+ letters, group of 2-14 files) rescaled to 8% of the import weight.');
R.push(`- Louvain modularity optimisation implemented in this script: nodes in path order, ties go to the lowest community id, no randomness, so a re-run is identical. Resolutions tried: ${gammas.join(', ')}. Chosen: the count closest to 14-20 clusters, then highest modularity at resolution 1.`);
R.push('', '| resolution | clusters | modularity (res 1) | chosen |', '|---:|---:|---:|---|');
for (const r of runs) R.push(`| ${r.gamma} | ${r.k} | ${f3(r.q1)} | ${r === chosen ? 'yes' : ''} |`);
R.push('', `Chosen resolution ${chosen.gamma}: ${K} clusters.`, '');
R.push('## Agreement with the hand grouping', '');
R.push('| measure | value |', '|---|---:|');
R.push(`| adjusted Rand index (hand vs data) | ${f3(ARI)} |`, `| normalised mutual information (hand vs data) | ${f3(NMI)} |`);
R.push(`| ARI / NMI vs a clustering of the import edges alone (same resolution) | ${f3(ARI_imp)} / ${f3(NMI_imp)} |`);
R.push(`| modularity of the hand grouping, combined graph | ${f3(Qhand)} |`, `| modularity of the data clusters, combined graph | ${f3(Qdata)} |`);
R.push(`| modularity hand / data, import edges only | ${f3(QhandImp)} / ${f3(QdataImp)} |`, `| modularity hand / data, state edges only | ${f3(QhandSt)} / ${f3(QdataSt)} |`);
R.push('', 'The data clusters are optimised for modularity on this very graph, so they are a ceiling for any grouping; the question is how far the hand grouping sits below it. ARI 0 is chance agreement, 1 is identical.', '');
R.push('### Purity of each hand domain (share of its files in its single biggest data cluster)', '', '| hand domain | files | purity | in how many clusters | where its files went (cluster: files) |', '|---|---:|---:|---:|---|');
for (const h of [...handPurity].sort((a, b) => a.purity - b.purity))
  R.push(`| ${h.domain} | ${h.files} | ${p(h.purity)} | ${h.spread} | ${h.top.map(([c, n]) => `${clusters[c].name}: ${n}`).join('; ')} |`);
R.push('', `Mean purity ${p(handPurity.reduce((s, h) => s + h.purity, 0) / handPurity.length)}; file-weighted ${p(handPurity.reduce((s, h) => s + h.purity * h.files, 0) / N)}.`, '');
R.push('## The data clusters', '', 'Named by the most common hand domain; "centre" is the 6 files with the most edge weight kept inside the cluster. A cluster whose largest hand domain is under 60% of it merges several hand domains.', '');
for (const c of [...clusters].sort((a, b) => b.size - a.size)) {
  R.push(`### ${c.name} - ${c.size} files, ${p(c.purity)} ${c.mix[0][0]}`, '');
  R.push(`- mix: ${c.mix.map(([d, n]) => `${d} ${n}`).join('; ')}`);
  R.push(`- centre: ${c.centre.join(', ')}`);
  R.push('');
}
const merges = clusters.filter((c) => c.purity < 0.6 && c.size >= 6);
R.push('### Clusters that merge several hand domains', '');
R.push(merges.length ? merges.map((c) => `- ${c.name} (${c.size}): ${c.mix.slice(0, 4).map(([d, n]) => `${d} ${n}`).join(', ')}`).join('\n') : 'none (every cluster of 6+ files is at least 60% one hand domain)');
R.push('', '### Hand domains that split across clusters', '');
const splits = handPurity.filter((h) => h.purity < 0.6 && h.files >= 6);
R.push(splits.length ? splits.map((h) => `- ${h.domain} (${h.files}): ${h.top.map(([c, n]) => `${clusters[c].name} ${n}`).join(', ')}`).join('\n') : 'none (every hand domain of 6+ files keeps at least 60% in one cluster)');
R.push('', '## Files the data says belong elsewhere', '');
R.push(`${strong.length} files have at least 60% of their weighted edges going to one other hand domain (more than to their own) and weight of 2 or more: the strong moves. ${weak.length} more lean that way at 40-60%.`, '');
R.push('| file | hand domain | share to own | best other hand domain (share) | best data cluster (share) | its own data cluster (share) | weight |', '|---|---|---:|---|---|---|---:|');
for (const r of [...strong, ...weak.sort((a, b) => b.bestHandShare - a.bestHandShare)].slice(0, 90))
  R.push(`| ${r.file} | ${r.hand} | ${p(r.own)} | ${r.bestHand} (${p(r.bestHandShare)}) | ${r.bestCluster} (${p(r.bestClusterShare)}) | ${r.ownCluster} (${p(r.ownClusterShare)}) | ${r.deg.toFixed(1)} |`);
R.push('', '## Proposed corrections (strong evidence only; not applied)', '', 'Diff-style, in domains.ts terms: take the file out of its current group and add it to the target. Also in moves.json.', '', '```diff');
for (const mv of moves) R.push(`- [${mv.from}] ${mv.file.replace('src/sim/', '').replace(/\.ts$/, '')}`, `+ [${mv.to}] ${mv.file.replace('src/sim/', '').replace(/\.ts$/, '')}   (${p(mv.shareToTarget)} of weight ${mv.weight}; own ${p(mv.shareToOwn)})`);
R.push('```', '');
const flows = new Map<string, number>();
moves.forEach((m) => flows.set(`${m.from} -> ${m.to}`, (flows.get(`${m.from} -> ${m.to}`) ?? 0) + 1));
R.push('Moves by direction: ' + ([...flows.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join('; ') || 'none') + '.', '');
R.push('## Effect of the moves on the headline numbers', '');
R.push('Imports among the sim files only (render, ui, agent, app edges excluded).', '');
R.push('| | hand grouping | with the moves | data clusters |', '|---|---:|---:|---:|');
R.push(`| groups | ${ndom(hand)} | ${ndom(after)} | ${K} |`);
R.push(`| imports leaving their group | ${L0.leave} of ${L0.n} (${p(L0.leave / L0.n, 1)}) | ${L1.leave} of ${L1.n} (${p(L1.leave / L1.n, 1)}) | ${LD.leave} (${p(LD.leave / LD.n, 1)}) |`);
R.push(`| same, type-only imports at half weight | ${p(L0.wLeave / L0.w, 1)} | ${p(L1.wLeave / L1.w, 1)} | ${p(LD.wLeave / LD.w, 1)} |`);
R.push(`| written fields written by one group and read by another | ${S0.cross} of ${S0.fields} (${p(S0.cross / S0.fields, 1)}) | ${S1.cross} of ${S1.fields} (${p(S1.cross / S1.fields, 1)}) | ${SD.cross} (${p(SD.cross / SD.fields, 1)}) |`);
R.push(`| modularity, combined graph | ${f3(Qhand)} | ${f3(Qafter)} | ${f3(Qdata)} |`, '');
R.push("Share of each group's import edges that leave the group, before and after the moves:", '', '| group | before | after |', '|---|---:|---:|');
for (const d of handIdx) { const a = PD0.get(d), b = PD1.get(d); R.push(`| ${d} | ${a ? p(a.out / a.tot) : '-'} | ${b ? p(b.out / b.tot) : '-'} |`); }
R.push('', '## Limits', '');
R.push('- The state edges are only as good as state_map: direct field accesses on types declared in types.ts; writes through helpers are not seen. The mix weights (60% state, 8% prefix) are choices; the prefix term biases toward name-based groups, as does the hand grouping, so agreement on prefix groups is partly built in.');
R.push('- Louvain finds a good local optimum, not the best; different resolutions give different group counts, and boundary files can flip. Treat moves with a share near 60% as candidates, those near 100% as errors in the regexes.');
R.push('- A file with little edge weight (under 2) is never moved: not enough evidence. Kernel files are imported by everybody, so their edges are dominated by hubs and they rarely qualify.');
R.push(`- Runtime ${((Date.now() - T0) / 1000).toFixed(0)} s.`);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'report.md'), R.join('\n') + '\n');
writeFileSync(join(outDir, 'clusters.json'), JSON.stringify({ resolution: chosen.gamma, k: K, ari: ARI, nmi: NMI, modularityHand: Qhand, modularityData: Qdata, runs: runs.map((r) => ({ gamma: r.gamma, k: r.k, q: r.q1 })), clusters: clusters.map((c) => ({ ...c, files: members(lab, c.id).map((i) => base[i]) })), handPurity }, null, 1));
writeFileSync(join(outDir, 'moves.json'), JSON.stringify({ rule: "at least 60% of a file's weighted edges (imports + shared state + prefix) go to one other hand domain, more than to its own; weight >= 2", moves, borderline: weak.map((r) => ({ file: `src/sim/${r.file}.ts`, from: r.hand, to: r.bestHand, shareToTarget: +r.bestHandShare.toFixed(3), shareToOwn: +r.own.toFixed(3) })) }, null, 1));
console.log(R.slice(0, 60).join('\n'));
console.log(`\nK=${K} ARI=${f3(ARI)} NMI=${f3(NMI)} moves=${moves.length} in ${((Date.now() - T0) / 1000).toFixed(0)}s -> ${outDir}`);
