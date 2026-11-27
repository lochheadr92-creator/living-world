// Who reads and who writes the simulation's shared state: every access to a field of a type declared in src/sim/types.ts
// (World, Person, Building, Plot, Needs ...), attributed by the TypeScript compiler to the field's declaring interface, and
// told apart as a read or a write. Files are grouped into the same domains as the import graph (scripts/lib/domains.ts).
//   npx vite-node scripts/state_map.ts [-- --out state_map]
// Writes <out>/state.json and <out>/report.md.
//
// What counts as a WRITE: an assignment (including += and the like) or ++/-- on the field, a delete of it, an assignment to an
// element of it (inv[k] = n), or calling a mutating method on it (push, splice, set, delete ...). Everything else is a read.
// What it cannot see, and so under-counts: writes made through a helper that is handed the object or a part of it (addItem(p.inv, ...)
// writes in the helper's file, on a type with no declared fields), objects built whole as literals, and anything reached through `any`.
// Read the totals as a floor on writes and a good estimate of reads, not as a full ledger.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { domainOfRel } from './lib/domains';

const args = process.argv.slice(2).filter((a) => a !== '--');
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'state_map';
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

interface Use { reads: Map<string, number>; writes: Map<string, number> }
const byFile = new Map<string, Use>();
const use = (file: string): Use => {
  let u = byFile.get(file);
  if (!u) byFile.set(file, (u = { reads: new Map(), writes: new Map() }));
  return u;
};
const skipParens = (n: ts.Node): ts.Node => {
  while (n.parent && (ts.isParenthesizedExpression(n.parent) || ts.isNonNullExpression(n.parent) || ts.isAsExpression(n.parent))) n = n.parent;
  return n;
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

for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !sf.fileName.startsWith(SRC.split('\\').join('/')) && !resolve(sf.fileName).startsWith(SRC)) continue;
  const file = relative(SRC, resolve(sf.fileName)).split('\\').join('/');
  const u = use(file);
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const sym = checker.getSymbolAtLocation(node.name);
      const decl = sym?.declarations?.[0];
      if (decl && resolve(decl.getSourceFile().fileName) === TYPES && decl.parent && (ts.isInterfaceDeclaration(decl.parent) || ts.isTypeLiteralNode(decl.parent) || ts.isClassDeclaration(decl.parent))) {
        let owner = '';
        if (ts.isInterfaceDeclaration(decl.parent) || ts.isClassDeclaration(decl.parent)) owner = decl.parent.name?.text ?? '';
        else {
          // an inline object type inside an interface: name it by the interface and the field that holds it
          let q: ts.Node = decl.parent;
          while (q && !ts.isInterfaceDeclaration(q) && !ts.isTypeAliasDeclaration(q)) q = q.parent;
          owner = q && (ts.isInterfaceDeclaration(q) || ts.isTypeAliasDeclaration(q)) ? q.name.text : '';
        }
        if (owner) {
          const key = owner + '.' + node.name.text;
          const m = writeKind(node) === 'write' ? u.writes : u.reads;
          m.set(key, (m.get(key) ?? 0) + 1);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// ───────────── fold into domains and fields ─────────────
const dom = (f: string): string => domainOfRel(f);
interface Field { key: string; owner: string; readers: Map<string, number>; writers: Map<string, number> }
const fields = new Map<string, Field>();
const fld = (k: string): Field => {
  let f = fields.get(k);
  if (!f) fields.set(k, (f = { key: k, owner: k.split('.')[0], readers: new Map(), writers: new Map() }));
  return f;
};
const filesOfDomain = new Map<string, number>();
for (const [file, u] of byFile) {
  const d = dom(file);
  filesOfDomain.set(d, (filesOfDomain.get(d) ?? 0) + 1);
  for (const [k, n] of u.reads) fld(k).readers.set(d, (fld(k).readers.get(d) ?? 0) + n);
  for (const [k, n] of u.writes) fld(k).writers.set(d, (fld(k).writers.get(d) ?? 0) + n);
}
const domains = [...filesOfDomain.keys()].sort();
const sum = (m: Map<string, number>): number => [...m.values()].reduce((a, b) => a + b, 0);

// state coupling: A writes a field that B reads, A != B. SC[A][B] counts the distinct fields; refs weights by access counts.
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
const totalWrites = all.reduce((s, f) => s + sum(f.writers), 0);
const writtenFields = all.filter((f) => f.writers.size);
const shared = all.filter((f) => f.readers.size + f.writers.size >= 2 && new Set([...f.readers.keys(), ...f.writers.keys()]).size >= 2);
const crossFields = all.filter((f) => {
  const w = [...f.writers.keys()];
  const r = [...f.readers.keys()];
  return w.some((a) => r.some((b) => a !== b));
});

// which domains reach furthest through shared state
const reachOut = new Map<string, number>(), reachIn = new Map<string, number>();
for (const [a, row] of SC) for (const [b, c] of row) { reachOut.set(a, (reachOut.get(a) ?? 0) + c.fields); reachIn.set(b, (reachIn.get(b) ?? 0) + c.fields); }

// compare with imports: read the matrix the import graph wrote, if it is there
let imp: { domains: string[]; matrix: number[][] } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
L.push('# Shared state: who reads and who writes', '');
L.push(`${byFile.size} files, ${all.length} fields of types declared in src/sim/types.ts, ${totalReads} reads and ${totalWrites} writes found. Only direct accesses are seen: writes through a helper handed the object are not counted, so the writes are a floor.`, '');
L.push('## How much state is shared', '');
L.push(`- ${writtenFields.length} of ${all.length} fields are written somewhere; ${all.length - writtenFields.length} are only ever read.`);
L.push(`- ${crossFields.length} fields are written by one group and read by another (${pct(crossFields.length, writtenFields.length)} of the written ones). That is the state coupling.`);
L.push(`- ${all.filter((f) => f.writers.size >= 3).length} fields are written by three or more groups: nobody owns them.`, '');
L.push('## Fields with the widest reach (written by one or more groups, read by the most)', '', '| field | written by | read by (groups) | reads | writes |', '|---|---|---:|---:|---:|');
for (const f of [...crossFields].sort((a, b) => b.readers.size - a.readers.size || sum(b.readers) - sum(a.readers)).slice(0, 30))
  L.push(`| ${f.key} | ${[...f.writers.keys()].sort().join(', ')} | ${f.readers.size} | ${sum(f.readers)} | ${sum(f.writers)} |`);
L.push('', '## Fields written by the most groups (no single owner)', '', '| field | groups that write it | writes | reads |', '|---|---:|---:|---:|');
for (const f of [...all].sort((a, b) => b.writers.size - a.writers.size || sum(b.writers) - sum(a.writers)).slice(0, 25))
  L.push(`| ${f.key} | ${f.writers.size} (${[...f.writers.keys()].sort().join(', ')}) | ${sum(f.writers)} | ${sum(f.readers)} |`);
L.push('', '## Groups by how far their writes reach and how much they read from others', '', '| group | files | fields it writes that another group reads | fields it reads that another group writes |', '|---|---:|---:|---:|');
for (const d of domains.sort((a, b) => (reachOut.get(b) ?? 0) - (reachOut.get(a) ?? 0))) L.push(`| ${d} | ${filesOfDomain.get(d)} | ${reachOut.get(d) ?? 0} | ${reachIn.get(d) ?? 0} |`);
L.push('', '## Pairs joined by shared state', '', imp ? 'Fields A writes that B reads, beside the number of imports from A to B and from B to A in the import graph. A big number with no import either way is a connection the import graph cannot see.' : 'Fields A writes that B reads.', '', '| A writes, B reads | fields | imports A to B | imports B to A | example fields |', '|---|---:|---:|---:|---|');
const pairs: { a: string; b: string; n: number; keys: string[] }[] = [];
for (const [a, row] of SC) for (const [b, c] of row) pairs.push({ a, b, n: c.fields, keys: c.keys });
pairs.sort((x, y) => y.n - x.n);
for (const p of pairs.slice(0, 40)) L.push(`| ${p.a} → ${p.b} | ${p.n} | ${impOf(p.a, p.b) ?? '-'} | ${impOf(p.b, p.a) ?? '-'} | ${p.keys.slice(0, 4).join(', ')} |`);
const hidden = pairs.filter((p) => imp && (impOf(p.a, p.b) ?? 0) + (impOf(p.b, p.a) ?? 0) === 0 && p.n >= 3);
L.push('', `## Pairs joined by shared state with no import either way (3 or more fields): ${hidden.length}`, '');
for (const p of hidden.slice(0, 25)) L.push(`- ${p.a} → ${p.b}: ${p.n} fields (${p.keys.slice(0, 5).join(', ')})`);
L.push('', '## Fields only ever read (never assigned in src)', '', all.filter((f) => !f.writers.size).sort((a, b) => sum(b.readers) - sum(a.readers)).slice(0, 25).map((f) => `${f.key} (${sum(f.readers)})`).join(', '));
L.push('', '## Fields written but never read', '', all.filter((f) => f.writers.size && !f.readers.size).sort((a, b) => sum(b.writers) - sum(a.writers)).slice(0, 25).map((f) => `${f.key} (${sum(f.writers)})`).join(', ') || 'none');
writeFileSync(join(outDir, 'report.md'), L.join('\n') + '\n');
writeFileSync(
  join(outDir, 'state.json'),
  JSON.stringify({
    domains,
    filesOfDomain: Object.fromEntries(filesOfDomain),
    pairs: pairs.map((p) => ({ a: p.a, b: p.b, n: p.n, keys: p.keys })),
    fields: all.map((f) => ({ key: f.key, writers: Object.fromEntries(f.writers), readers: Object.fromEntries(f.readers) })),
  }),
);
console.log(L.slice(0, 12).join('\n'));
console.log(`\nwrote ${outDir}/report.md and state.json`);
