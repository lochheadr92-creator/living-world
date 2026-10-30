import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {launch} from './cdp.mjs';
const [url='http://127.0.0.1:5288/',out='autonomy_evidence/project69-rendered']=process.argv.slice(2);
if(existsSync(out))throw new Error('Fresh output required');
const root=resolve(tmpdir()),profile=resolve(join(root,'living-world-project-'+randomUUID()));
if(!profile.startsWith(root+sep)||existsSync(profile))throw new Error('Unsafe temporary profile');
let occupied=false;try{await fetch('http://127.0.0.1:9367/json/version');occupied=true;}catch{}
if(occupied)throw new Error('Browser port already in use');
mkdirSync(out,{recursive:true});const b=await launch({port:9367,width:1440,height:1000,profile}),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);};
const shot=async name=>{await b.evaluate(`(()=>{const f=window.__production,g=window.__game,pt=f.project(f.p.x,f.p.y);g.select(f.p.id);g.fly=null;g.camera={x:pt.sx,y:pt.sy,zoom:2.3};window.__ui.update(1);})()`);await b.sleep(200);await b.shot(out+'/'+name+'.png');};
try{
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('living-world:prefs:v1',JSON.stringify({inspectorOpen:true,feedOpen:true}));localStorage.setItem('living-world:ui:v1',JSON.stringify({hinted:true,sections:{uptoMore:true}}));`});
 await b.send('Page.navigate',{url});for(let n=0;n<80&&!await b.evaluate('!!window.__game');n++)await b.sleep(100);
 const adopted=await b.evaluate(`(async()=>{
  const {projectProductionScene}=await import('/tests/helpers/project_production.ts'),econ=await import('/src/sim/economy.ts'),save=await import('/src/app/save.ts'),{stepWorld}=await import('/src/sim/world.ts'),{project}=await import('/src/render/iso.ts'),{toolsHeldBy}=await import('/src/sim/toolreg.ts');
  const f=projectProductionScene();Object.assign(f,{econ,save,stepWorld,project,toolsHeldBy,events:[]});window.__production=f;
  f.w.hooks={onActivityStart:(p,a)=>f.events.push({tick:f.w.tick,kind:a.kind,recipe:a.data.recipe,wait:a.data.projectWait})};
  stepWorld(f.w);window.__game.setPlaying(false);window.__game.restoreWorld(f.w,f.w.settings);return {plan:f.p.intentions.find(i=>i.project),activity:f.p.activity?.kind};
 })()`);
 check('inhabitant adopts the forged axe prerequisite project',adopted.plan?.makes==='axe'&&adopted.plan.project.nodes.some(n=>n.recipe==='burn_charcoal'),adopted);await shot('adopted-project');
 const explanation=await b.evaluate(`(()=>{const el=document.querySelector('.q-plan');el?.scrollIntoView({block:'center'});return el?.textContent||'';})()`);
 check('inspector explains the saved production chain and uncertain duration',explanation.includes('Planned production:')&&explanation.includes('plus travel and interruptions'),explanation);await b.sleep(150);await b.shot(out+'/project-explanation.png');
 const burning=await b.evaluate(`(()=>{const f=window.__production;for(let n=0;n<1200&&!f.p.beliefs[f.kiln.id]?.ops?.burn;n++)f.stepWorld(f.w);f.twin=f.save.deserializeWorld(f.save.serializeWorld(f.w));return {tick:f.w.tick,kiln:f.p.beliefs[f.kiln.id]?.ops,events:f.events};})()`);
 check('charcoal reaches its paid firing stage',burning.kiln?.burn>0,burning);await shot('charcoal-firing');
 const iron=await b.evaluate(`(()=>{const f=window.__production;for(let n=0;n<2200&&!(f.smithy.store.items.iron>0);n++){f.stepWorld(f.w);f.stepWorld(f.twin);}return {tick:f.w.tick,iron:f.smithy.store.items.iron,events:f.events,equal:f.save.serializeWorld(f.w)===f.save.serializeWorld(f.twin),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('physical transport and smelting produce iron with exact firing-save continuation',iron.iron>0&&iron.equal&&iron.conserved,iron);await shot('iron-smelted');
 const forged=await b.evaluate(`(()=>{const f=window.__production;for(let n=0;n<1800&&!f.toolsHeldBy(f.w,f.p.id,'axe').some(t=>t.tier===1);n++){f.stepWorld(f.w);f.stepWorld(f.twin);}const before=f.save.serializeWorld(f.w);window.__ui.update(1);return {tick:f.w.tick,axes:f.toolsHeldBy(f.w,f.p.id,'axe'),events:f.events,equal:before===f.save.serializeWorld(f.twin),pure:before===f.save.serializeWorld(f.w),conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('forged axe is physically collected',forged.axes.some(t=>t.tier===1)&&forged.equal&&forged.pure&&forged.conserved,forged);await shot('forged-axe');
 const used=await b.evaluate(`(async()=>{const f=window.__production,{site}=await import('/tests/helpers/kit.ts'),{observe}=await import('/src/sim/knowledge.ts'),{selectPrerequisite}=await import('/tests/helpers/tool_prerequisite.ts');const build=site(f.s,'storehouse',58,50,f.p.hhId,f.p.id);observe(f.w,f.p,build);observe(f.w,f.p,f.tree);const axe=f.toolsHeldBy(f.w,f.p.id,'axe').find(t=>t.tier===1),wear=axe.wear,wood=f.p.inv.wood??0;const selected=selectPrerequisite(f.w,f.p,'gather:'+f.tree.id);selected.restore();for(let n=0;n<900&&(f.p.inv.wood??0)<=wood;n++)f.stepWorld(f.w);return {wear:axe.wear,beforeWear:wear,wood:f.p.inv.wood,beforeWood:wood,conserved:f.econ.conservationReport(f.w).ok};})()`);
 check('new axe is used on a separately staged legal wood trip',used.wear>used.beforeWear&&used.wood>used.beforeWood&&used.conserved,used);await shot('axe-in-use');
 const errors=b.events.filter(e=>e.method==='Runtime.exceptionThrown');check('no browser exceptions',errors.length===0,errors);
 const files=['src/sim/project_graph.ts','src/sim/project_compile.ts','src/sim/project_step.ts','src/sim/production.ts','src/sim/batch_plan.ts','src/sim/inspect.ts','tests/helpers/project_production.ts','scripts/browser/project_production_check.mjs'];
 writeFileSync(out+'/report.json',JSON.stringify({rules:69,evidence:'STAGED worn axe, known workshops, procedures and stock. Adoption, charcoal, smelting, forging and collection are autonomous. Subsequent construction need and selection of a legally offered wood trip are explicitly staged.',sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),checks},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
}finally{await b.close();}
