// Export reference table for the audit (read only). For every exported name in the lane files, count word-boundary occurrences
// by bucket across src, tests, scripts, review_evidence/*.ts and index.html. Name based, so it over-counts common words and
// never under-counts a plain reference; string reach (quoted names, bracket access) is counted separately.
//   node tools/refgraph.mjs <worktree> <out.tsv> <file1.ts> <file2.ts> ...   (files relative to src/sim)
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const [root, out, ...lane] = process.argv.slice(2);
const walk = (dir, acc = []) => {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git' || n === 'dist') continue;
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|mjs|js|html|ps1)$/.test(n)) acc.push(p);
  }
  return acc;
};
const files = [
  ...walk(join(root, 'src')), ...walk(join(root, 'tests')), ...walk(join(root, 'scripts')),
  ...walk(join(root, 'review_evidence')).filter((f) => /\.(ts|mjs|js)$/.test(f)),
  join(root, 'index.html'),
];
const DECISION = new Set(['decision.ts', 'intent.ts', 'optutil.ts', 'relief.ts', 'welfare.ts', 'production.ts', 'facilities.ts', 'social.ts']);
const bucketOf = (f) => {
  const r = relative(root, f).replace(/\\/g, '/');
  if (r.startsWith('tests/')) return 'tests';
  if (r.startsWith('scripts/lab/')) return 'lab';
  if (r.startsWith('scripts/')) return 'scripts';
  if (r.startsWith('review_evidence/')) return 'evidence';
  if (r.startsWith('src/ui/') || r.startsWith('src/render/') || r.startsWith('src/app/') || r === 'src/main.ts' || r === 'index.html') return 'display';
  if (r.startsWith('src/agent/')) return 'agent';
  if (r.startsWith('src/sim/')) {
    const b = r.slice('src/sim/'.length);
    if (/^inspect.*\.ts$/.test(b) || b === 'labels.ts') return 'display';
    if (DECISION.has(b) || /^options_.*\.ts$/.test(b)) return 'decision';
    return 'sim';
  }
  return 'other';
};
const texts = files.map((f) => ({ f, rel: relative(root, f).replace(/\\/g, '/'), bucket: bucketOf(f), text: readFileSync(f, 'utf8') }));
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
for (const t of texts) t.code = stripComments(t.text);

const rows = [];
const BUCKETS = ['self', 'decision', 'sim', 'display', 'agent', 'tests', 'lab', 'scripts', 'evidence'];
for (const lf of lane) {
  const rel = lf.includes('/') ? 'src/' + lf : 'src/sim/' + lf;
  const me = texts.find((t) => t.rel === rel);
  if (!me) { rows.push([lf, 'MISSING FILE']); continue; }
  const names = new Map();
  const reDecl = /^export\s+(?:declare\s+)?(?:async\s+)?(function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = reDecl.exec(me.code))) names.set(m[2], { kind: m[1], line: me.code.slice(0, m.index).split('\n').length });
  const reList = /^export\s*\{([^}]*)\}/gm;
  while ((m = reList.exec(me.code))) for (const part of m[1].split(',')) {
    const nm = part.trim().split(/\s+as\s+/).pop();
    if (nm && !names.has(nm)) names.set(nm, { kind: 'list', line: me.code.slice(0, m.index).split('\n').length });
  }
  // multi-const exports: export const a = 1, b = 2;  (rare; flagged by the reader)
  for (const [name, info] of names) {
    const re = new RegExp('(?<![\\w$])' + name.replace(/\$/g, '\\$') + '(?![\\w$])', 'g');
    const counts = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
    const where = Object.fromEntries(BUCKETS.map((b) => [b, []]));
    let strReach = 0;
    for (const t of texts) {
      const n = (t.code.match(re) ?? []).length;
      const b = t.rel === rel ? 'self' : t.bucket;
      if (n) { counts[b] += n; if (where[b].length < 4) where[b].push(t.rel.replace(/^src\/sim\//, '').replace(/^tests\//, 't/').replace(/^scripts\//, 's/')); }
      // string reach: the name inside quotes or bracket access, anywhere (comments included)
      const sre = new RegExp('[\'"`]' + name.replace(/\$/g, '\\$') + '[\'"`]', 'g');
      strReach += (t.text.match(sre) ?? []).length;
    }
    const outside = BUCKETS.filter((b) => b !== 'self').reduce((s, b) => s + counts[b], 0);
    const prod = counts.decision + counts.sim + counts.display + counts.agent;
    let cls = '';
    if (outside === 0 && counts.self <= 1) cls = 'ZERO_REFS';
    else if (outside === 0) cls = 'SELF_ONLY';
    else if (prod === 0 && counts.lab > 0 && counts.tests + counts.scripts + counts.evidence === 0) cls = 'LAB_ONLY?';
    else if (prod === 0 && counts.lab > 0) cls = 'LAB_AND_TEST_ONLY?';
    else if (prod === 0) cls = 'TEST_OR_SCRIPT_ONLY?';
    rows.push([lf, name, info.kind, info.line, ...BUCKETS.map((b) => counts[b]), strReach, cls, BUCKETS.filter((b) => b !== 'self' && where[b].length).map((b) => b + ':' + where[b].join(',')).join(' ')]);
  }
}
writeFileSync(out, ['file\tname\tkind\tline\t' + BUCKETS.join('\t') + '\tstr\tclass\twhere', ...rows.map((r) => r.join('\t'))].join('\n') + '\n');
const flagged = rows.filter((r) => r[14]);
console.log(`exports ${rows.length}, flagged ${flagged.length}`);
const byCls = {};
for (const r of flagged) byCls[r[14]] = (byCls[r[14]] ?? 0) + 1;
console.log(JSON.stringify(byCls));
