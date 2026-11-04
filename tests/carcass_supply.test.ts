import {expect,it} from 'vitest';
import {stage,addPerson,building,done,learn} from './helpers/kit';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {makeWolf} from '../src/sim/wildlife';
import {makeCarcass} from '../src/sim/carcass';
import {generateOptions,reviewActivity} from '../src/sim/decision';
import {compileProject} from '../src/sim/project_compile';
import {demandsOf} from '../src/sim/production';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {delBelief} from '../src/sim/knowledge';
import {startActivity,stepActivity,newActivity} from '../src/sim/activities';
import {conservationReport,consume} from '../src/sim/economy';
import {clothingWarmth} from '../src/sim/clothing';
import {facilityTick} from '../src/sim/facilities';
import {produce} from '../src/sim/economy';
function scene(){
 const s=stage('known-carcass-supply'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:CURRENT_RULES_VERSION};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:70,thirst:90,energy:90,inv:{fibre:1,berries:3}});
 const yard=building(s,'timber_yard',43,40,0),rack=building(s,'food_rack',43,44,0,{wood:1});
 const deer=makeWolf(w,41.5,40.5,'deer');done(s);const body=makeCarcass(w,deer,p)!;learn(w,p,yard,rack,body);w.weather.temp=0;
 return {...s,p,yard,rack,body};
}
it('can plan a hide garment from a personally known owned body and paid binding',()=>{
 const {w,p}=scene(),before=serializeWorld(w),ctx=generateOptions(w,p,true,true);
 const result=compileProject(ctx,{item:'garment',quantity:1,tier:0});
 expect(result.ok).toBe(true);if(result.ok){expect(result.graph.nodes.some(n=>n.recipe==='sew_hide_garment')).toBe(true);expect(result.graph.nodes.some(n=>n.item==='hide'&&n.method==='supply'&&n.estimatedTicks===120)).toBe(true);expect(result.graph.nodes[0].estimatedTicks).toBe(280);}
 expect(serializeWorld(w)).toBe(before);
});
it('offers recovery of the needed hide for the garment route instead of requiring an already recovered hide',()=>{
 const {w,p,body}=scene(),ctx=generateOptions(w,p,true,true),o=ctx.options.find(o=>o.key===`butcher:${body.id}:hide`);
 expect(o).toBeDefined();expect(o!.goal).toMatch(/insulation|garment/);
});
it('recognises recoverable fat as a possible paid food route at a known rack',()=>{
 const {w,p}=scene();expect(demandsOf(generateOptions(w,p,true,true)).some(d=>d.item==='rendered_fat')).toBe(true);
});
it('does not plan with an unknown, foreign or old body',()=>{
 const {w,p,body}=scene();const plan=()=>{const r=compileProject(generateOptions(w,p,true,true),{item:'garment',quantity:1,tier:0});return r.ok&&r.graph.nodes.some(n=>n.item==='hide'&&n.method==='supply');};
 delBelief(p,body.id);expect(plan()).toBe(false);
 body.carcass!.hhId=p.hhId+999;learn(w,p,body);expect(plan()).toBe(false);
 body.carcass!.hhId=p.hhId;learn(w,p,body);w.tick+=4801;expect(plan()).toBe(false);
});
it('keeps the predecessor planning path unchanged',()=>{
 const {w,p}=scene();w.settings.rulesVersion=129;
 const r=compileProject(generateOptions(w,p,true,true),{item:'garment',quantity:1,tier:0});expect(r.ok&&r.graph.nodes.some(n=>n.recipe==='sew_hide_garment')).toBe(false);
});
function work(w:ReturnType<typeof scene>['w'],p:ReturnType<typeof scene>['p'],key:string){
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===key);expect(o,key).toBeDefined();startActivity(w,p,o!.make!()!);
 for(let n=0;n<1200&&p.activity;n++){w.tick++;stepActivity(w,p);}expect(p.activity).toBeNull();expect(p.lastResult?.outcome).toBe('success');
}
it('uses offered butchery, delivery, sewing, collection and dressing for one finite hide',()=>{
 const {w,p,body,yard}=scene();work(w,p,`butcher:${body.id}:hide`);expect(body.carcass!.recovered.hide).toBe(1);
 const delivery=generateOptions(w,p,true,true).options.find(o=>o.kind==='deposit'&&o.targetId===yard.id&&o.goal.includes('hide'));
 expect(delivery).toBeDefined();work(w,p,delivery!.key);learn(w,p,yard);work(w,p,`operate:${yard.id}:sew_hide_garment`);
 learn(w,p,yard);work(w,p,`collect:${yard.id}:garment`);const garment=w.tools.find(t=>t.kind==='garment'&&t.holder===p.id)!;work(w,p,`dress:${garment.id}`);
 expect(garment.textile?.material).toBe('hide');expect(clothingWarmth(w,p)).toBe(6);expect(w.ledger.consumed.hide).toBe(1);expect(conservationReport(w).ok).toBe(true);
 const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
for(const [part,recipe,output,units] of [['fat','render_fat','rendered_fat',1],['meat','dry_meat','dried_meat',2]] as const)it(`takes known body ${part} through paid ${recipe} to an actual meal`,()=>{
 const {w,p,body,rack}=scene();w.weather.rain=0;
 for(let n=0;n<units&&(p.inv[part]??0)<units;n++)work(w,p,`butcher:${body.id}:${part}`);
 expect(p.inv[part]).toBe(units);
 const delivery=generateOptions(w,p,true,true).options.find(o=>o.kind==='deposit'&&o.targetId===rack.id);
 expect(delivery).toBeDefined();work(w,p,delivery!.key);learn(w,p,rack);work(w,p,`operate:${rack.id}:${recipe}`);
 for(let n=0;n<1000&&rack.ops?.job;n++){w.tick++;facilityTick(w,rack);}expect(rack.store.items[output]).toBe(units);
 learn(w,p,rack);const take=generateOptions(w,p,true,true).options.find(o=>o.kind==='withdraw'&&o.targetId===rack.id);
 expect(take).toBeDefined();work(w,p,take!.key);expect(p.inv[output]).toBe(units);
 consume(w,p.inv,'berries',p.inv.berries??0,'staged immediate meals already used');p.needs.hunger=30;
 startActivity(w,p,newActivity(w,p,{kind:'eat',label:'Eat prepared food',goal:'eat',here:true,data:{food:output,limit:{portions:1}}}));
 for(let n=0;n<100&&p.activity;n++){w.tick++;stepActivity(w,p);}
 expect(w.ledger.consumed[output]).toBe(1);expect(p.needs.hunger).toBeGreaterThan(30);expect(conservationReport(w).ok).toBe(true);
});
it('uses dated knowledge without reading changed hidden ownership and refuses it on arrival',()=>{
 const {w,p,body}=scene();body.carcass!.hhId=p.hhId+999;
 const before=serializeWorld(w),o=generateOptions(w,p,true,true).options.find(o=>o.key===`butcher:${body.id}:hide`)!;
 expect(o.goal).toContain('insulation');expect(serializeWorld(w)).toBe(before);
 startActivity(w,p,o.make!()!);for(let n=0;n<500&&p.activity;n++){w.tick++;stepActivity(w,p);}
 expect(p.lastResult?.outcome).toBe('failed');expect(body.carcass!.remaining.hide).toBe(1);expect(p.inv.hide??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('does not offer an ingredient recovery into a full pack',()=>{
 const {w,p,body}=scene();produce(w,p.inv,999,'stone',30,'staged full pack');
 expect(generateOptions(w,p,true,true).options.some(o=>o.key===`butcher:${body.id}:hide`)).toBe(false);
 expect(body.carcass!.remaining.hide).toBe(1);
});
it('lets critical thirst interrupt ingredient work without granting its uncut output',()=>{
 const {w,p,body}=scene(),o=generateOptions(w,p,true,true).options.find(o=>o.key===`butcher:${body.id}:hide`)!;
 const a=o.make!()!;a.data.optKey=o.key;startActivity(w,p,a);for(let n=0;n<20;n++){w.tick++;stepActivity(w,p);}
 p.needs.thirst=0;reviewActivity(w,p);expect(p.activity?.id).not.toBe(a.id);expect(p.inv.hide??0).toBe(0);expect(body.carcass!.remaining.hide).toBe(1);expect(conservationReport(w).ok).toBe(true);
});
