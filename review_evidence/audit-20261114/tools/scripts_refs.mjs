// Lane 7 input: for every file under scripts/, count references to its basename (without extension) in package.json,
// docs, AGENTS.md, CLAUDE.md, other scripts, tests, src, review_evidence text. Read only.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';
const [root, out] = process.argv.slice(2);
const walk = (d, a = []) => { for (const n of readdirSync(d)) { if (n === 'node_modules' || n === '.git') continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p, a); else a.push(p); } return a; };
const texts = walk(root).filter((f) => /\.(ts|tsx|mjs|js|json|md|ps1|html|txt)$/.test(f) && statSync(f).size < 3000000)
  .map((f) => ({ rel: relative(root, f).split('\\').join('/'), t: readFileSync(f, 'utf8') }));
const scripts = texts.filter((x) => x.rel.startsWith('scripts/'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rows = [];
for (const s of scripts) {
  const b = basename(s.rel, extname(s.rel));
  if (b.length < 4) { rows.push([s.rel, b, 'SHORT', 0, 0, 0, 0, 0, 0]); continue; }
  const re = new RegExp('(?<![\\w-])' + esc(b) + '(?![\\w-])', 'g');
  const c = { pkg: 0, docs: 0, scripts: 0, tests: 0, src: 0, evidence: 0 };
  for (const t of texts) {
    if (t.rel === s.rel) continue;
    const n = (t.t.match(re) ?? []).length; if (!n) continue;
    const k = t.rel === 'package.json' ? 'pkg' : (t.rel.startsWith('docs/') || /^(AGENTS|CLAUDE|README)/.test(t.rel)) ? 'docs' : t.rel.startsWith('scripts/') ? 'scripts' : t.rel.startsWith('tests/') ? 'tests' : t.rel.startsWith('src/') ? 'src' : t.rel.startsWith('review_evidence/') ? 'evidence' : null;
    if (k) c[k] += n;
  }
  const total = c.pkg + c.docs + c.scripts + c.tests + c.src + c.evidence;
  rows.push([s.rel, b, total === 0 ? 'UNREFERENCED' : (c.pkg + c.docs + c.tests + c.src + c.scripts === 0 ? 'EVIDENCE_ONLY' : (c.pkg + c.tests + c.src + c.scripts === 0 ? 'DOCS_ONLY' : '')), c.pkg, c.docs, c.scripts, c.tests, c.src, c.evidence]);
}
writeFileSync(out, ['file\tbase\tclass\tpkg\tdocs\tscripts\ttests\tsrc\tevidence', ...rows.map((r) => r.join('\t'))].join('\n') + '\n');
const by = {}; for (const r of rows) by[r[2] || 'referenced'] = (by[r[2] || 'referenced'] ?? 0) + 1;
console.log(rows.length, JSON.stringify(by));
