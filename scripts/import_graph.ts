// The real import graph of the code, grouped into domains: who imports whom, where the hubs are, and how tangled it is.
//   npx vite-node scripts/import_graph.ts [-- --out import_graph]
// Writes <out>/graph.json, <out>/report.md and a self-contained <out>/graph.html (a domain-by-domain matrix and the hubs).
// What it measures: `import` / `export ... from` / dynamic `import()` statements between files under src/ (text search on the
// source, type-only imports counted separately). It does not measure calls or shared fields on the World object, which is how the
// simulation's pieces mostly meet; read it as the map of who is allowed to reach whom, not of what actually influences what.
// The domains are a grouping by file name written by hand below: a guess, listed in full so it can be corrected.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const args = process.argv.slice(2).filter((a) => a !== '--');
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'import_graph';
const SRC = resolve('src');

// ───────────── the domains of src/sim, by file name (first match wins) ─────────────
const DOMAINS: [string, RegExp][] = [
  ['kernel', /^(types|constants|util|rng|keyed_draws|id_ranges|rulesversion|support_floor|rules|profiles|registry|probe|time_text|labels|naming|layout_words|historical_index|history|continuity_knowledge)$/],
  ['world loop and setup', /^(world|factory|worldgen|found_empty|founding_coop|layout_claims|seed_storage|events|causal_events|background|scenes|external)$/],
  ['environment and land', /^(environment|flood|flood_access|hydrology|groundwater|wells|geology|ecology|forestry|tree_regrowth|wild_seed|sources|water_access|water_search|stored_water|stored_water_access|hardship|winter_practice|winter_shelter|lean_years|light_pack|warmth_duty|swap_and_fire)$/],
  ['animals and hunting', /^(wildlife|wolf_fight|wolf_skin|hunting|carcass|carcass_supply|defence|wooden_spear|livestock|livestock_food|herd_value|hand_feeding|farm_species|passive_gear|gear_stock|fishing_rods)$/],
  ['farming and food', /^(farm.*|act_farm|farming|grain_kept|hungry_harvest|bread_feeds|brewing|grow_more|preservation|cellars|oven_load|meals|meal_leftovers|eat_in_hand|tableeating|nourishment|metabolism|food_help|household_supply|provision|plenty|deposit_plenty|bigger_reserve|offcuts)$/],
  ['body, life and family', /^(needs|illness|fever_sign|life|lifecycle|lifechanges|lived_life|childhood|childhood_rules|coming_of_age|birth_help|child_.*|parent_decides|settle_child|people|achievement|memory_retention|family_food|age.*)$/],
  ['perception and knowledge', /^(perception|knowledge|known_.*|seen_.*|visible_need|witness_sight|death_knowledge|meeting_knowledge|promise_knowledge|social_memory|remembered_need|news|empty_news|checked_accounts|teller_confidence|final_account|proposal_belief|heard_helpers|route_learning|source_learning|helper_learning|learning)$/],
  ['decisions and plans', /^(decision|decision_ledger|intent|options_.*|optutil|mood|kept_target|action_scope|proposals|stalled_ask|standing_up|errand_load|leave_heaviest|local_demand|local_giving|picked_up|ring_fallback|trip_kept|night_experience|night_wait|leisure|play|toys|daily_routines|three_ages|occupation|occupation_storage|techniques|skill_coaching|transmission|trade_switch|answer_cause)$/],
  ['activities', /^(activities|act_.*|finish_job|ready_step|suspended_endings|work_handover|workshop_errand|gather_.*|developed|development)$/],
  ['social life', /^(social|relations|grievance|reputation|company|company_scenes|companionship|courting|dance|dialogue|evening_fire|hearth|hearth_scenes|kin_scenes|together_scenes|song|speak_for|praise|welcome|reunion|mediation|misdeeds|meeting|argue_once|temperament|traditions|occasions|occasion_.*|crews|civic_.*|political_alignment|apprentice|market_contact|customers|trade|exchange_journeys|three_ages|marriage|request_cancellation|promise_.*|promised_supply|shared_offer|settlement_economy|closeness|vigil|grief_sit|responsibilities|resident_contact)$/],
  ['economy and production', /^(economy|production|recipes|facilities|workshop|batch_.*|project_.*|shared_.*|material_stock|textile_stock|tools|toolreg|tool_feasibility|carts|cart_priority|transport|delivery_place|own_stores|reserved_goods|pack_materials|open_workplaces|recovered_workshops|smithy_iron|bench_access|picked|communal_stock|taken_from|repair_duty|clothing|carry_more|site_supply)$/],
  ['buildings and housing', /^(buildings|habitation|shelter|home_.*|household_practices|households|hut_before_larder|construction_.*|builder_fetches|retire_lean_to|layout.*|personal_places|pile_access|inspect_home_plan|settlements|townships|township_extent|relocation|growth_room|arrival_.*|immigration|succession|estate|estate_release|grave_site)$/],
  ['care and welfare', /^(care_.*|welfare|relief|resident_care|handover_.*|known_welfare|food_help|journey.*|location_question|pathfinding|fetch_home)$/],
  ['inspection and diagnostics', /^(inspect.*|gather_diagnostics|gather_review|development|cohortcapture|shown|labels|decision_ledger)$/],
];
// everything under src/ that is not src/sim is its own domain by folder
function domainOf(path: string): string {
  const rel = relative(SRC, path).split('\\').join('/');
  const top = rel.split('/')[0];
  if (top !== 'sim') return top === 'main.ts' ? 'app' : top;
  const base = rel.slice('sim/'.length).replace(/\.ts$/, '');
  for (const [name, re] of DOMAINS) if (re.test(base)) return name;
  return 'unsorted (sim)';
}

// ───────────── read every source file and its imports ─────────────
function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n) && !n.endsWith('.d.ts')) out.push(p);
  }
  return out;
}
const files = walk(SRC);
const index = new Map<string, number>();
files.forEach((f, i) => index.set(f, i));
const IMPORT = /(?:^|[\n;])\s*(import|export)\s+(type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
function resolveSpec(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(from), spec);
  for (const c of [base + '.ts', base + '.tsx', join(base, 'index.ts'), base]) if (index.has(c)) return c;
  return null;
}
interface Edge { from: number; to: number; typeOnly: boolean }
const edges = new Map<string, Edge>();
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  let m: RegExpExecArray | null;
  IMPORT.lastIndex = 0;
  while ((m = IMPORT.exec(text))) {
    const spec = m[3] ?? m[4];
    const target = spec ? resolveSpec(f, spec) : null;
    if (!target || target === f) continue;
    const key = index.get(f) + '>' + index.get(target);
    const typeOnly = !!m[2];
    const prev = edges.get(key);
    if (!prev) edges.set(key, { from: index.get(f)!, to: index.get(target)!, typeOnly });
    else if (!typeOnly) prev.typeOnly = false;
  }
}
const E = [...edges.values()];
const name = (i: number): string => relative(SRC, files[i]).split('\\').join('/');
const dom = files.map(domainOf);
const outs = files.map(() => 0);
const ins = files.map(() => 0);
for (const e of E) { outs[e.from]++; ins[e.to]++; }

// ───────────── strongly connected components (Tarjan) over value imports ─────────────
function scc(valueOnly: boolean): number[][] {
  const adj: number[][] = files.map(() => []);
  for (const e of E) if (!valueOnly || !e.typeOnly) adj[e.from].push(e.to);
  let idx = 0;
  const ix: number[] = files.map(() => -1), low: number[] = files.map(() => 0), on: boolean[] = files.map(() => false), st: number[] = [];
  const comps: number[][] = [];
  // iterative to stay clear of the call-stack limit
  for (let s = 0; s < files.length; s++) {
    if (ix[s] !== -1) continue;
    const work: [number, number][] = [[s, 0]];
    while (work.length) {
      const [v, i] = work[work.length - 1];
      if (i === 0) { ix[v] = low[v] = idx++; st.push(v); on[v] = true; }
      if (i < adj[v].length) {
        work[work.length - 1][1]++;
        const w = adj[v][i];
        if (ix[w] === -1) work.push([w, 0]);
        else if (on[w]) low[v] = Math.min(low[v], ix[w]);
      } else {
        if (low[v] === ix[v]) { const c: number[] = []; let w: number; do { w = st.pop()!; on[w] = false; c.push(w); } while (w !== v); comps.push(c); }
        work.pop();
        if (work.length) { const u = work[work.length - 1][0]; low[u] = Math.min(low[u], low[v]); }
      }
    }
  }
  return comps.filter((c) => c.length > 1).sort((a, b) => b.length - a.length);
}
const cyclesAll = scc(false);
const cyclesValue = scc(true);

// ───────────── domain matrix ─────────────
const domains = [...new Set(dom)].sort();
const order = [...DOMAINS.map(([n]) => n), 'unsorted (sim)', 'app', 'agent', 'render', 'ui'].filter((d) => domains.includes(d)).concat(domains.filter((d) => ![...DOMAINS.map(([n]) => n), 'unsorted (sim)', 'app', 'agent', 'render', 'ui'].includes(d)));
const di = new Map(order.map((d, i) => [d, i]));
const M = order.map(() => order.map(() => 0));
for (const e of E) M[di.get(dom[e.from])!][di.get(dom[e.to])!]++;
const filesIn = order.map((d) => dom.filter((x) => x === d).length);
const crossOut = order.map((_, i) => M[i].reduce((s, v, j) => s + (i === j ? 0 : v), 0));
const within = order.map((_, i) => M[i][i]);

// layering: does the simulation import anything from the drawing, the interface or the app?
const violations = E.filter((e) => files[e.from].includes(`${join('src', 'sim')}`) && !files[e.to].includes(join('src', 'sim'))).map((e) => `${name(e.from)} -> ${name(e.to)}`);

const hubsIn = files.map((_, i) => i).sort((a, b) => ins[b] - ins[a]).slice(0, 25);
const hubsOut = files.map((_, i) => i).sort((a, b) => outs[b] - outs[a]).slice(0, 15);
const unsorted = files.map((_, i) => i).filter((i) => dom[i] === 'unsorted (sim)').map(name);
const simFiles = files.filter((f) => relative(SRC, f).startsWith('sim')).length;

const graph = { files: files.map((f, i) => ({ id: i, path: name(i), domain: dom[i], imports: outs[i], importedBy: ins[i] })), edges: E.map((e) => [e.from, e.to, e.typeOnly ? 1 : 0]), domains: order, matrix: M };
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'graph.json'), JSON.stringify(graph));

// ───────────── the report ─────────────
const pct = (a: number, b: number): string => (b ? ((100 * a) / b).toFixed(0) : '0') + '%';
const lines: string[] = [];
lines.push('# Import graph', '');
lines.push(`${files.length} files under src/ (${simFiles} in src/sim), ${E.length} import edges (${E.filter((e) => e.typeOnly).length} type-only). Import statements only; shared use of the World object is not an import and is not counted.`, '');
lines.push('## Tangle', '');
lines.push(`- Cycles over all imports: ${cyclesAll.length ? `${cyclesAll.length} groups; the largest has ${cyclesAll[0].length} files (${pct(cyclesAll[0].length, simFiles)} of src/sim)` : 'none'}.`);
lines.push(`- Cycles over value imports only (type-only imports are erased at run time): ${cyclesValue.length ? `${cyclesValue.length} groups; the largest has ${cyclesValue[0].length} files` : 'none'}.`);
lines.push(`- Layering: ${violations.length ? `${violations.length} imports from src/sim reach outside it` : 'src/sim imports nothing outside src/sim'}.`);
for (const v of violations.slice(0, 12)) lines.push(`  - ${v}`);
lines.push('', '## Domains', '', '| domain | files | imports inside | imports out to other domains | share that leaves |', '|---|---:|---:|---:|---:|');
order.forEach((d, i) => lines.push(`| ${d} | ${filesIn[i]} | ${within[i]} | ${crossOut[i]} | ${pct(crossOut[i], crossOut[i] + within[i])} |`));
lines.push('', '## Most imported files (what everything leans on)', '', '| file | imported by | imports | domain |', '|---|---:|---:|---|');
for (const i of hubsIn) lines.push(`| ${name(i)} | ${ins[i]} | ${outs[i]} | ${dom[i]} |`);
lines.push('', '## Files that import the most (what knows the most about everything else)', '', '| file | imports | imported by | domain |', '|---|---:|---:|---|');
for (const i of hubsOut) lines.push(`| ${name(i)} | ${outs[i]} | ${ins[i]} | ${dom[i]} |`);
if (cyclesValue.length) {
  lines.push('', '## The largest cycle (value imports)', '', cyclesValue[0].map(name).sort().join(', '));
  const byDom: Record<string, number> = {};
  for (const i of cyclesValue[0]) byDom[dom[i]] = (byDom[dom[i]] ?? 0) + 1;
  lines.push('', 'By domain: ' + Object.entries(byDom).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d} ${n}`).join(', '));
}
lines.push('', `## Files the domain rules did not place (${unsorted.length})`, '', unsorted.join(', ') || 'none');
writeFileSync(join(outDir, 'report.md'), lines.join('\n') + '\n');

// ───────────── the page: a matrix, shaded by count ─────────────
const max = Math.max(1, ...M.flatMap((r, i) => r.filter((_, j) => i !== j)));
const cell = (i: number, j: number): string => {
  const v = M[i][j];
  if (!v) return '<td></td>';
  const k = i === j ? 0 : Math.min(1, Math.sqrt(v / max));
  const bg = i === j ? 'rgba(120,130,150,.25)' : `rgba(220,90,40,${(0.12 + 0.78 * k).toFixed(2)})`;
  return `<td style="background:${bg}" title="${order[i]} imports ${order[j]}: ${v}">${v}</td>`;
};
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Import graph</title>
<style>:root{--bg:#fff;--fg:#1c2330;--mut:#667085;--line:#d9dee7}@media(prefers-color-scheme:dark){:root{--bg:#12161d;--fg:#e6e9ef;--mut:#98a2b3;--line:#2a3140}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;max-width:1200px}h1{font-size:20px}h2{font-size:16px;margin-top:28px}
table{border-collapse:collapse;font-size:12px}th,td{border:1px solid var(--line);padding:2px 6px;text-align:right}th.l,td.l{text-align:left}td{min-width:26px}
.wrap{overflow-x:auto}.mut{color:var(--mut)}th.rot{writing-mode:vertical-rl;transform:rotate(180deg);text-align:left;height:150px;white-space:nowrap}</style></head><body>
<h1>Import graph</h1>
<p class="mut">${files.length} files under src/ (${simFiles} in src/sim), ${E.length} import edges. Rows import columns. Import statements only: shared use of the World object is not counted. Domains are a hand-written grouping by file name.</p>
<p><b>Tangle:</b> ${cyclesAll.length ? `the largest import cycle has ${cyclesAll[0].length} files (${pct(cyclesAll[0].length, simFiles)} of src/sim); ${cyclesValue.length ? `${cyclesValue[0].length} when type-only imports are left out` : 'none at run time'}` : 'no import cycles'}. ${violations.length ? `${violations.length} imports from src/sim reach outside it.` : 'src/sim imports nothing outside src/sim.'}</p>
<h2>Which domain imports which</h2><div class="wrap"><table><tr><th class="l">imports →</th>${order.map((d) => `<th class="rot">${d}</th>`).join('')}<th>files</th><th>out</th></tr>
${order.map((d, i) => `<tr><th class="l">${d}</th>${order.map((_, j) => cell(i, j)).join('')}<td>${filesIn[i]}</td><td>${crossOut[i]}</td></tr>`).join('\n')}</table></div>
<h2>Most imported files</h2><div class="wrap"><table><tr><th class="l">file</th><th>imported by</th><th>imports</th><th class="l">domain</th></tr>${hubsIn.map((i) => `<tr><td class="l">${name(i)}</td><td>${ins[i]}</td><td>${outs[i]}</td><td class="l">${dom[i]}</td></tr>`).join('')}</table></div>
<h2>Files that import the most</h2><div class="wrap"><table><tr><th class="l">file</th><th>imports</th><th>imported by</th><th class="l">domain</th></tr>${hubsOut.map((i) => `<tr><td class="l">${name(i)}</td><td>${outs[i]}</td><td>${ins[i]}</td><td class="l">${dom[i]}</td></tr>`).join('')}</table></div>
${unsorted.length ? `<h2>Not placed in a domain (${unsorted.length})</h2><p class="mut">${unsorted.join(', ')}</p>` : ''}
</body></html>`;
writeFileSync(join(outDir, 'graph.html'), html);
// ───────────── the flow chart: domains as boxes in layers, an arrow from the importer to what it imports ─────────────
// Rows run from what presents and drives (top) to what everything stands on (bottom). An arrow that points UP the page is an import
// against that order: a lower domain reaching up into a higher one (drawn red).
const LAYERS: string[][] = [
  ['ui', 'render', 'app', 'agent'],
  ['world loop and setup', 'decisions and plans', 'activities', 'inspection and diagnostics'],
  ['social life', 'economy and production', 'care and welfare'],
  ['buildings and housing', 'farming and food', 'animals and hunting', 'perception and knowledge'],
  ['body, life and family', 'environment and land'],
  ['kernel'],
];
const layerOf = new Map<string, number>();
LAYERS.forEach((row, r) => row.forEach((d) => layerOf.set(d, r)));
const flowNodes = order.filter((d) => layerOf.has(d)).map((d) => ({ name: d, files: filesIn[order.indexOf(d)], layer: layerOf.get(d)!, row: LAYERS[layerOf.get(d)!].indexOf(d), rowSize: LAYERS[layerOf.get(d)!].length }));
const flowEdges: [string, string, number][] = [];
for (let i = 0; i < order.length; i++) for (let j = 0; j < order.length; j++) if (i !== j && M[i][j] && layerOf.has(order[i]) && layerOf.has(order[j])) flowEdges.push([order[i], order[j], M[i][j]]);
const backCount = flowEdges.filter(([a, b]) => layerOf.get(b)! < layerOf.get(a)!).reduce((s, e) => s + e[2], 0);
const allCount = flowEdges.reduce((s, e) => s + e[2], 0);
const flow = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Import flow chart</title>
<style>:root{--bg:#fff;--fg:#1c2330;--mut:#667085;--box:#eef2ff;--boxl:#6366f1;--down:#5b7bb5;--up:#d9342b}
@media(prefers-color-scheme:dark){:root{--bg:#12161d;--fg:#e6e9ef;--mut:#98a2b3;--box:#1d2540;--boxl:#818cf8;--down:#7f9bd0;--up:#ff6b61}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif}h1{font-size:20px;margin:0 0 4px}
.mut{color:var(--mut)}.ctl{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin:10px 0}svg{width:100%;height:auto;max-width:1150px;display:block}
.node rect{fill:var(--box);stroke:var(--boxl);stroke-width:1.5}.node text{fill:var(--fg);font-size:13px;pointer-events:none}.node .n{fill:var(--mut);font-size:11px}
.edge{fill:none;stroke-linecap:round}.down{stroke:var(--down)}.up{stroke:var(--up)}.dim{opacity:.07}.node{cursor:pointer}.rowlab{fill:var(--mut);font-size:11px}
#tip{min-height:20px}</style></head><body>
<h1>How the code imports itself</h1>
<p class="mut">Each box is a group of files. An arrow runs from the group that imports to the group it imports; thicker means more imports. <span style="color:var(--down)">Blue</span> arrows go down the page (the intended direction); <span style="color:var(--up)">red</span> arrows go back up. ${flowEdges.length} links between groups; ${pct(backCount, allCount)} of imports between groups point back up. Click a box to follow only its links; click it again to clear.</p>
<div class="ctl"><label>Show links with at least <b id="tv">20</b> imports <input id="th" type="range" min="1" max="200" value="20"></label><label><input id="hk" type="checkbox" checked> hide arrows into the shared foundations (everything imports them)</label><span id="tip" class="mut"></span></div>
<svg id="s" viewBox="0 0 1150 760"><defs><marker id="ad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--down)"/></marker><marker id="au" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--up)"/></marker></defs><g id="e"></g><g id="n"></g></svg>
<script>
const NODES=${JSON.stringify(flowNodes)},EDGES=${JSON.stringify(flowEdges)},NL=${LAYERS.length};
const W=1150,H=760,BW=190,BH=44,T0=30,gap=(H-2*T0-BH)/(NL-1);const pos={};
for(const n of NODES){const cw=W/n.rowSize;pos[n.name]={x:cw*(n.row+0.5),y:T0+n.layer*gap+BH/2};}
const rl=["shown and driven","orchestrating and choosing","people living together, making things","the places, food and animals they depend on","the body and the land","shared foundations"];
const g=document.getElementById('n'),e=document.getElementById('e'),NS='http://www.w3.org/2000/svg';let sel=null;
const mk=(t,a,p)=>{const x=document.createElementNS(NS,t);for(const k in a)x.setAttribute(k,a[k]);p&&p.appendChild(x);return x};
NL&&rl.forEach((t,i)=>{const y=T0+i*gap+BH/2;const l=mk('text',{x:6,y:y-BH/2-4,class:'rowlab'},g);l.textContent=t});
const nodeEls={};
for(const n of NODES){const p=pos[n.name];const gg=mk('g',{class:'node',transform:'translate('+(p.x-BW/2)+','+(p.y-BH/2)+')'},g);mk('rect',{width:BW,height:BH,rx:8},gg);
const t=mk('text',{x:BW/2,y:19,'text-anchor':'middle'},gg);t.textContent=n.name;const c=mk('text',{x:BW/2,y:35,'text-anchor':'middle',class:'n'},gg);c.textContent=n.files+' files';
gg.onclick=()=>{sel=sel===n.name?null:n.name;draw()};gg.onmouseenter=()=>{document.getElementById('tip').textContent=n.name+': imports '+EDGES.filter(x=>x[0]===n.name).reduce((s,x)=>s+x[2],0)+' times from other groups; imported '+EDGES.filter(x=>x[1]===n.name).reduce((s,x)=>s+x[2],0)+' times by them'};nodeEls[n.name]=gg}
function draw(){e.textContent='';const th=+document.getElementById('th').value;document.getElementById('tv').textContent=th;
for(const k in nodeEls)nodeEls[k].classList.toggle('dim',!!sel&&k!==sel&&!EDGES.some(x=>x[2]>=th&&((x[0]===sel&&x[1]===k)||(x[1]===sel&&x[0]===k))));
const L=new Map(NODES.map(n=>[n.name,n.layer]));
const hk=document.getElementById('hk').checked;for(const [a,b,c] of EDGES){if(c<th)continue;if(hk&&b==='kernel'&&a!==sel)continue;if(sel&&a!==sel&&b!==sel)continue;const up=L.get(b)<L.get(a);const pa=pos[a],pb=pos[b];
const dy=pb.y-pa.y,dx=pb.x-pa.x;const same=Math.abs(dy)<1;const sp=Math.max(-70,Math.min(70,dx/9));let x1=pa.x+(same?0:sp),y1=pa.y,x2=pb.x-(same?0:sp),y2=pb.y;
y1+=same?0:(dy>0?BH/2:-BH/2);y2+=same?0:(dy>0?-BH/2:BH/2);if(same){x1+=dx>0?BW/2:-BW/2;x2+=dx>0?-BW/2:BW/2}
const mx=(x1+x2)/2,my=(y1+y2)/2,len=Math.hypot(x2-x1,y2-y1)||1;const off=(up?-1:1)*Math.min(46,10+len*0.09);const cx=mx+(-(y2-y1)/len)*off,cy=my+((x2-x1)/len)*off;
const p=mk('path',{d:'M'+x1+' '+y1+'Q'+cx+' '+cy+' '+x2+' '+y2,class:'edge '+(up?'up':'down'),'stroke-width':Math.min(9,0.7+Math.sqrt(c)*0.34).toFixed(2),'stroke-opacity':sel?0.85:0.45,'marker-end':'url(#'+(up?'au':'ad')+')'},e);
const tt=mk('title',{},p);tt.textContent=a+' imports '+b+': '+c}}
document.getElementById('th').oninput=draw;document.getElementById('hk').onchange=draw;draw();
</script></body></html>`;
writeFileSync(join(outDir, 'flow.html'), flow);
lines.push('', '## Flow chart', '', `${pct(backCount, allCount)} of the ${allCount} imports between domain groups point back up the layering in flow.html (a lower group importing a higher one).`);
writeFileSync(join(outDir, 'report.md'), lines.join('\n') + '\n');
console.log(lines.slice(0, 14).join('\n'));
console.log(`\nwrote ${outDir}/graph.json, report.md, graph.html`);
