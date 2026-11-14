// Field read/write table for the audit (read only). For each field of the named interfaces in src/sim/types.ts, count
// `.field` accesses by bucket, split into writes (assignment, compound assignment, ++/--, push/unshift/splice/set/add/delete/
// clear/pop/shift/sort/fill on the field, delete x.field) and reads (everything else). Name based: a field name shared by
// several interfaces is counted for all of them (column `shared` lists the other interfaces declaring the same name), so
// rows with shared names need a reader. Object-literal initialisers (`field: value` / shorthand) are counted as `init`.
//   node tools/fieldtable.mjs <worktree> <out.tsv> Person Household World Relation ...
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const [root, out, ...wanted] = process.argv.slice(2);
const walk = (dir, acc = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|mjs)$/.test(n)) acc.push(p);
  }
  return acc;
};
const DECISION = new Set(['decision.ts', 'intent.ts', 'optutil.ts', 'relief.ts', 'welfare.ts', 'production.ts', 'facilities.ts', 'social.ts']);
const bucketOf = (r) => {
  if (r.startsWith('tests/')) return 'tests';
  if (r.startsWith('scripts/')) return 'scripts';
  if (r.startsWith('src/ui/') || r.startsWith('src/render/')) return 'display';
  if (r.startsWith('src/app/')) return 'app';
  if (r.startsWith('src/agent/')) return 'agent';
  if (r.startsWith('src/sim/')) {
    const b = r.slice('src/sim/'.length);
    if (/^inspect.*\.ts$/.test(b) || b === 'labels.ts') return 'display';
    if (DECISION.has(b) || /^options_.*\.ts$/.test(b)) return 'decision';
    return 'sim';
  }
  return 'other';
};
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
const files = [...walk(join(root, 'src')), ...walk(join(root, 'tests')), ...walk(join(root, 'scripts'))]
  .map((f) => { const rel = relative(root, f).replace(/\\/g, '/'); return { rel, bucket: bucketOf(rel), code: stripComments(readFileSync(f, 'utf8')) }; });

// interface fields from types.ts (top-level members only, by brace depth)
const types = stripComments(readFileSync(join(root, 'src/sim/types.ts'), 'utf8'));
const typesRaw = readFileSync(join(root, 'src/sim/types.ts'), 'utf8').split('\n');
const fieldsOf = {};
const allIfaces = [...types.matchAll(/^export interface (\w+)[^{]*\{/gm)];
for (const m of allIfaces) {
  const name = m[1];
  let i = m.index + m[0].length, depth = 1, start = i;
  const members = [];
  let buf = '', bufStart = i;
  while (i < types.length && depth > 0) {
    const c = types[i];
    if (c === '{' || c === '(' || c === '[' || c === '<') depth++;
    else if (c === '}' || c === ')' || c === ']' || c === '>') { depth--; if (c === '>' && types[i - 1] === '=') depth++; }
    if (depth === 1 && (c === ';' || c === '\n')) { if (buf.trim()) members.push({ text: buf.trim(), at: bufStart }); buf = ''; bufStart = i + 1; }
    else if (depth >= 1) buf += c;
    i++;
  }
  if (buf.trim()) members.push({ text: buf.trim(), at: bufStart });
  fieldsOf[name] = [];
  for (const mem of members) {
    const fm = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/.exec(mem.text);
    if (fm) fieldsOf[name].push({ field: fm[1], line: types.slice(0, mem.at + mem.text.length ? mem.at : 0).split('\n').length + (types.slice(mem.at).match(/^\s*\n/) ? 1 : 0) });
  }
}
const declaredBy = {};
for (const [iface, fs] of Object.entries(fieldsOf)) for (const f of fs) (declaredBy[f.field] ??= []).push(iface);

const B = ['decision', 'sim', 'display', 'app', 'agent', 'tests', 'scripts'];
const WRITE_AFTER = /^\s*(?:(?:\[[^\]]*\]|\.[\w$]+)*\s*(?:[-+*/%|&^]|\*\*|<<|>>|\?\?|\|\||&&)?=(?!=)|\+\+|--|(?:\[[^\]]*\])?\.(?:push|unshift|splice|set|add|delete|clear|pop|shift|sort|fill|reverse)\s*\()/;
const rows = [];
for (const iface of wanted) {
  if (!fieldsOf[iface]) { rows.push([iface, 'MISSING INTERFACE']); continue; }
  for (const { field, line } of fieldsOf[iface]) {
    const re = new RegExp('(\\+\\+|--|delete\\s+[\\w$.\\[\\]!?]*)?\\??\\.' + field + '(?![\\w$])', 'g');
    const reInit = new RegExp('(?<![\\w$.])' + field + '\\s*[:,}]', 'g');
    const rd = Object.fromEntries(B.map((b) => [b, 0])), wr = Object.fromEntries(B.map((b) => [b, 0]));
    const rdFiles = Object.fromEntries(B.map((b) => [b, new Set()])), wrFiles = Object.fromEntries(B.map((b) => [b, new Set()]));
    let init = 0;
    for (const t of files) {
      if (!B.includes(t.bucket)) continue;
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(t.code))) {
        const after = t.code.slice(m.index + m[0].length, m.index + m[0].length + 80);
        const isWrite = !!m[1] || WRITE_AFTER.test(after);
        const short = t.rel.replace(/^src\/sim\//, '').replace(/^src\//, '').replace(/^tests\//, 't/').replace(/^scripts\//, 's/');
        if (isWrite) { wr[t.bucket]++; wrFiles[t.bucket].add(short); } else { rd[t.bucket]++; rdFiles[t.bucket].add(short); }
      }
      if (t.rel.startsWith('src/')) init += (t.code.match(reInit) ?? []).length;
    }
    const shared = (declaredBy[field] ?? []).filter((x) => x !== iface);
    const simReads = rd.decision + rd.sim + rd.agent + rd.app;
    let cls = '';
    if (rd.decision + rd.sim + rd.display + rd.app + rd.agent === 0) cls = 'NO_SRC_READS';
    else if (simReads === 0) cls = 'DISPLAY_ONLY_READS';
    else if (rd.decision === 0) cls = 'NO_DECISION_READS';
    const top = (s) => [...s].slice(0, 5).join(',');
    rows.push([iface, field, line, shared.length, ...B.map((b) => rd[b]), ...['decision', 'sim', 'display', 'app'].map((b) => wr[b]), init, cls,
      'R:' + ['decision', 'sim', 'display', 'app', 'agent'].filter((b) => rdFiles[b].size).map((b) => b + '=' + top(rdFiles[b])).join(' ') +
      ' W:' + ['decision', 'sim', 'app'].filter((b) => wrFiles[b].size).map((b) => b + '=' + top(wrFiles[b])).join(' '), shared.slice(0, 6).join(',')]);
  }
}
writeFileSync(out, ['iface\tfield\tline\tsharedN\t' + B.map((b) => 'r_' + b).join('\t') + '\tw_decision\tw_sim\tw_display\tw_app\tinit\tclass\tfiles\tsharedWith',
  ...rows.map((r) => r.join('\t'))].join('\n') + '\n');
const byCls = {};
for (const r of rows) if (r[16]) byCls[r[0] + ':' + r[16]] = (byCls[r[0] + ':' + r[16]] ?? 0) + 1;
console.log(`fields ${rows.length}`); console.log(JSON.stringify(byCls, null, 0));
