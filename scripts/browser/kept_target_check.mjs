// Staged initial knowledge/destination. Real movement, discovery, ordinary review and delivery.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';
const [url = 'http://127.0.0.1:5288/', out = 'autonomy_evidence/kept65-rendered'] = process.argv.slice(2);
if (existsSync(out)) throw new Error('Use a fresh output directory');
mkdirSync(out, { recursive: true });
const root = resolve(tmpdir()), profile = resolve(join(root, 'living-world-kept-' + randomUUID()));
if (!profile.startsWith(root + sep) || existsSync(profile)) throw new Error('Unsafe temporary profile');
let occupied = false; try { await fetch('http://127.0.0.1:9367/json/version'); occupied = true; } catch {}
if (occupied) throw new Error('Browser port already in use');
const b = await launch({ port: 9367, width: 1440, height: 1000, profile }), checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };
const shot = async name => {
  await b.evaluate(`(()=>{const f=window.__kept,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:1.8};window.__ui.update(1);})()`);
  await b.sleep(200); await b.shot(out + '/' + name + '.png');
};
try {
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));` });
  await b.send('Page.navigate', { url });
  for (let n = 0; n < 80 && !await b.evaluate('!!window.__game'); n++) await b.sleep(100);
  await b.evaluate(`(async()=>{
    const helpers=await import('/tests/helpers/kept_target.ts'),decision=await import('/src/sim/decision.ts'),{stepWorld}=await import('/src/sim/world.ts'),save=await import('/src/app/save.ts'),econ=await import('/src/sim/economy.ts'),{project}=await import('/src/render/iso.ts'),knowledge=await import('/src/sim/knowledge.ts');
    window.__keptLoad=(kind='source',version=65)=>{const f=kind==='water'?helpers.waterJourney(version):helpers.sourceJourney(version);Object.assign(f,helpers,decision,{stepWorld,save,econ,project,knowledge});window.__kept=f;window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return f;};
  })()`);
  const old = await b.evaluate(`(()=>{const f=window.__keptLoad('source',64),act=f.walkFor(f.w,f.p,f.key);const ctx=f.generateOptions(f.w,f.p,true,true);f.reviewActivity(f.w,f.p);return {position:[f.p.x,f.p.y],offered:ctx.options.some(o=>o.key===f.key),held:f.p.activity?.id===act.id,result:f.p.lastResult};})()`);
  check('predecessor drops a valid running destination after actual discovery', !old.offered && !old.held && old.result.detail === 'something better came up', old); await shot('rules64-switch');
  const kept = await b.evaluate(`(()=>{const f=window.__keptLoad();f.act=f.walkFor(f.w,f.p,f.key);const before=f.save.serializeWorld(f.w),ctx=f.generateOptions(f.w,f.p,true,true),pure=before===f.save.serializeWorld(f.w);f.reviewActivity(f.w,f.p);f.twin=f.save.deserializeWorld(f.save.serializeWorld(f.w));return {key:f.key,position:[f.p.x,f.p.y],known:f.near.map(s=>f.p.beliefs[s.id]?.seen),offers:ctx.options.filter(o=>o.kind==='gather').map(o=>({key:o.key,utility:o.util})),held:f.p.activity?.id===f.act.id,pure};})()`);
  check('current rules score and retain the real destination', kept.held && kept.known.every(n => n > 1000) && kept.offers.some(o => o.key === kept.key && o.utility > 0) && kept.offers.length <= 3 && kept.pure, kept); await shot('rules65-journey');
  const gathering = await b.evaluate(`(()=>{const f=window.__kept;for(let n=0;n<500&&f.p.activity?.id===f.act.id&&f.act.phase==='travel';n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {phase:f.p.activity?.phase,target:f.p.activity?.targetId,expected:f.far.id,position:[f.p.x,f.p.y]};})()`);
  check('walking reaches the chosen tree and starts real work', gathering.phase === 'work' && gathering.target === gathering.expected, gathering); await shot('chopping-at-destination');
  const delivered = await b.evaluate(`(()=>{const f=window.__kept;for(let n=0;n<1500&&!(f.target.delivered.wood>0);n++){f.stepWorld(f.w);f.stepWorld(f.twin);}const before=f.save.serializeWorld(f.w);window.__ui.update(1);return {tick:f.w.tick,delivered:f.target.delivered.wood,source:f.far.amount,inventory:f.p.inv,result:f.p.lastResult,equal:before===f.save.serializeWorld(f.twin),pure:before===f.save.serializeWorld(f.w),conserved:f.econ.conservationReport(f.w).ok};})()`);
  check('gathered wood reaches the household site under ordinary choices and exact saved continuation', delivered.delivered > 0 && delivered.source < 8 && delivered.equal && delivered.pure && delivered.conserved, delivered); await shot('wood-delivered');
  const empty = await b.evaluate(`(()=>{const f=window.__keptLoad(),act=f.walkFor(f.w,f.p,f.key);f.econ.ledgerConsume(f.w,f.far.item,f.far.amount,'staged source loss');f.far.amount=0;f.knowledge.observe(f.w,f.p,f.far);const ctx=f.generateOptions(f.w,f.p,true,true);f.reviewActivity(f.w,f.p);return {offered:ctx.options.some(o=>o.key===f.key),held:f.p.activity?.id===act.id,result:f.p.lastResult,conserved:f.econ.conservationReport(f.w).ok};})()`);
  check('observed depletion removes the destination and permits a different choice', !empty.offered && !empty.held && empty.conserved, empty); await shot('depleted-source');
  const water = await b.evaluate(`(()=>{const f=window.__keptLoad('water');f.w.sceneLabel='STAGED initial shore knowledge and selected journey; real discovery, review and drinking';f.act=f.walkFor(f.w,f.p,f.key,210);f.reviewActivity(f.w,f.p);const held=f.p.activity?.id===f.act.id,thirst=f.p.needs.thirst;for(let n=0;n<500&&f.p.activity?.id===f.act.id&&f.act.phase==='travel';n++)f.stepWorld(f.w);for(let n=0;n<5;n++)f.stepWorld(f.w);return {held,phase:f.p.activity?.phase,kind:f.p.activity?.kind,thirstBefore:thirst,thirst:f.p.needs.thirst,conserved:f.econ.conservationReport(f.w).ok};})()`);
  check('retained shore journey reaches water and quenches real thirst', water.held && water.phase === 'work' && water.kind === 'drink' && water.thirst > water.thirstBefore && water.conserved, water); await shot('drinking-at-destination');
  const errors = b.events.filter(e => e.method === 'Runtime.exceptionThrown'); check('no browser exceptions', errors.length === 0, errors);
  const files = ['src/sim/kept_target.ts','src/sim/options_survival.ts','src/sim/options_work.ts','src/sim/production.ts','src/sim/optutil.ts','src/sim/rulesversion.ts','tests/helpers/kept_target.ts','scripts/browser/kept_target_check.mjs'];
  writeFileSync(out + '/report.json', JSON.stringify({ head: execFileSync('git', ['rev-parse','HEAD'], { encoding:'utf8' }).trim(), rules:65, evidence:'STAGED needs, geometry, initial knowledge and initial selection. Initial controller released after actual walking. Subsequent review, gathering, delivery and drinking are ordinary simulation. No ordinary-adoption or benefit claim.', sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])), checks }, null, 2));
  if (checks.some(c=>!c.ok)) process.exitCode=1;
} finally { await b.close(); }
