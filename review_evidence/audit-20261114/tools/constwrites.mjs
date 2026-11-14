// For each field of the named interfaces: list RHS of every plain assignment `.field = RHS;` in src, and flag fields whose
// every assignment RHS is a reset value (null, undefined, 0, false, '', [], {}), plus fields never assigned at all in src
// (init in object literals only). Read only. node tools/constwrites.mjs <wt> <out.tsv> Iface...
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const [root, out, ...wanted] = process.argv.slice(2);
const walk = (d, a = []) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p, a); else if (/\.(ts|tsx)$/.test(n)) a.push(p); } return a; };
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
const files = walk(join(root, 'src')).map((f) => ({ rel: relative(root, f).replace(/\\/g, '/'), code: strip(readFileSync(f, 'utf8')) }));
const typesCode = files.find((f) => f.rel === 'src/sim/types.ts').code;
const fieldsOf = {};
for (const m of typesCode.matchAll(/^export interface (\w+)[^{]*\{/gm)) {
  let i = m.index + m[0].length, d = 1, buf = '';
  const mem = [];
  while (i < typesCode.length && d > 0) {
    const c = typesCode[i];
    if ('{(<['.includes(c)) d++;
    else if ('})>]'.includes(c)) { d--; if (c === '>' && typesCode[i - 1] === '=') d++; }
    if (d === 1 && (c === ';' || c === '\n')) { if (buf.trim()) mem.push(buf.trim()); buf = ''; } else if (d >= 1) buf += c;
    i++;
  }
  fieldsOf[m[1]] = mem.map((t) => /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/.exec(t)?.[1]).filter(Boolean);
}
const RESET = /^(null|undefined|0|false|''|""|\[\]|\{\}|-1)$/;
const rows = [];
for (const iface of wanted) for (const f of fieldsOf[iface] ?? []) {
  const re = new RegExp('\\.' + f + '(?![\\w$])\\s*(?:\\?\\?|\\|\\||&&|[-+*/%])?=(?!=)\\s*([^;\\n]*)', 'g');
  const rhs = []; let nonReset = 0; const sites = [];
  for (const t of files) {
    let m; re.lastIndex = 0;
    while ((m = re.exec(t.code))) {
      const v = m[1].trim().replace(/,$/, '');
      rhs.push(v); if (!RESET.test(v)) nonReset++;
      if (sites.length < 3) sites.push(t.rel.replace('src/sim/', '') + ':' + t.code.slice(0, m.index).split('\n').length + '=' + v.slice(0, 30));
    }
  }
  const reDel = new RegExp('delete\\s+[\\w$.\\[\\]!?]*\\.' + f + '(?![\\w$])', 'g'); let del = 0; for (const t of files) del += (t.code.match(reDel) ?? []).length;
  const pushy = new RegExp('\\.' + f + '(?![\\w$])(?:\\[[^\\]]*\\])?\\.(?:push|unshift|splice|set|add)\\s*\\(', 'g'); let mut = 0; for (const t of files) mut += (t.code.match(pushy) ?? []).length;
  const idx = new RegExp('\\.' + f + '\\[[^\\]]*\\]\\s*(?:[-+*/|&?]|\\?\\?)?=(?!=)', 'g'); let ix = 0; for (const t of files) ix += (t.code.match(idx) ?? []).length;
  const cls = rhs.length === 0 && mut === 0 && ix === 0 ? 'NEVER_ASSIGNED' : (nonReset === 0 && mut === 0 && ix === 0 ? 'RESET_ONLY' : '');
  rows.push([iface, f, rhs.length, nonReset, mut, ix, del, cls, sites.join(' | ')]);
}
writeFileSync(out, ['iface\tfield\tassigns\tnonReset\tmutCalls\tindexWrites\tdeletes\tclass\tsites', ...rows.map((r) => r.join('\t'))].join('\n') + '\n');
console.log(rows.length, 'fields;', rows.filter((r) => r[7]).length, 'flagged', JSON.stringify(rows.reduce((a, r) => { if (r[7]) a[r[0] + ':' + r[7]] = (a[r[0] + ':' + r[7]] ?? 0) + 1; return a; }, {})));
