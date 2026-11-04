import {expect,it} from 'vitest';
import {stage,addPerson,done,building,learn} from './helpers/kit';
import {mintTool,lendTool,returnLoan,checkoutFromRack} from '../src/sim/tools';
import {clothingWarmth,clothingTick,textileBegin,textileWork} from '../src/sim/clothing';
import {newActivity,startActivity,stepActivity,suspendActivity,resumeSuspended} from '../src/sim/activities';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,snapshotInitial,transfer} from '../src/sim/economy';
import {toolReport} from '../src/sim/toolreg';
import {perceive} from '../src/sim/perception';
import {describePerson} from '../src/sim/inspect';
import {hashWorld} from '../src/sim/world';
import {batchWanted} from '../src/sim/batch_plan';
import {demandsOf} from '../src/sim/production';
import {startBlocker,addEarmark} from '../src/sim/facilities';
import {knownTextileStock} from '../src/sim/textile_stock';
import {RECIPE_BY_ID} from '../src/sim/recipes';
import {killPerson} from '../src/sim/lifecycle';
function fixture(){const s=stage('clothing-contract');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:124};const p=addPerson(s,'Ada',40,40,{hunger:90,thirst:90,energy:90});done(s);return {...s,p};}
it('pays for dressing, bounds each slot, and only uses blankets and bedding while asleep',()=>{
 const {w,p}=fixture();const g=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');
 mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');
 expect(clothingWarmth(w,p)).toBe(0);
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`dress:${g.id}`)!;expect(o).toBeDefined();const a=o.make!()!;
 expect(textileBegin(w,p,a)).toBeUndefined();for(let n=0;n<19;n++)expect(textileWork(w,p,a)).toBe('continue');expect(textileWork(w,p,a)).toBe('done');
 expect(clothingWarmth(w,p)).toBe(6);
 for(const kind of ['blanket','bedding'] as const){const t=mintTool(w,kind,0,p.hhId,p.id,p.inv,p.id,'test');t.textile!.equipped=true;}
 expect(clothingWarmth(w,p)).toBe(6);p.pose='sleep';expect(clothingWarmth(w,p)).toBe(14);
 expect(toolReport(w).ok).toBe(true);expect(conservationReport(w).ok).toBe(true);
});
it('saves wetness, dries over time, wears out, and clears the worn slot on transfer',()=>{
 const s=fixture();const {w,p}=s;const q=addPerson(s,'Bea',41,40);const t=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');t.textile!.equipped=true;w.weather.rain=1;
 for(let n=0;n<200;n++)clothingTick(w);expect(t.textile!.wet).toBeGreaterThan(0);expect(clothingWarmth(w,p)).toBeLessThan(6);
 const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);w.weather.rain=0;copy.weather.rain=0;
 for(let n=0;n<1000;n++){clothingTick(w);clothingTick(copy);}expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(t.textile!.wet).toBe(0);
 transfer(w,p.inv,q.inv,12,'garment',1,`person:${p.id}`,`person:${q.id}`,'test gift');expect(t.textile!.equipped).toBe(false);expect(clothingWarmth(w,q)).toBe(0);
 t.textile!.equipped=true;t.wear=99.999;clothingTick(w);expect(w.tools).not.toContain(t);expect(toolReport(w).ok).toBe(true);
});
it('repairs with fibre only after work and refuses a missing item or malformed free benefit',()=>{
 const {w,p}=fixture();const t=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test',false);t.wear=60;p.inv.fibre=1;snapshotInitial(w);
 const a=newActivity(w,p,{kind:'tool_work',label:'Mend',goal:'repair',here:true,data:{textile:'repair',toolId:t.id}});
 expect(textileBegin(w,p,a)).toBeUndefined();for(let n=0;n<60;n++)textileWork(w,p,a);expect(t.wear).toBe(25);expect(p.inv.fibre??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
 delete t.textile;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile/i);
});
function finish(w:ReturnType<typeof fixture>['w'],p:ReturnType<typeof fixture>['p'],limit=700){for(let n=0;n<limit&&p.activity;n++){w.tick++;stepActivity(w,p);}expect(p.activity).toBeNull();}
it('offers paid fibre and weaving at the actual workshop, collects the output and dresses',()=>{
 const s=fixture(),{w,p}=s;p.needs.warmth=40;w.weather.temp=0;
 const yard=building(s,'timber_yard',42,42,p.hhId,{wood:2});snapshotInitial(w);learn(w,p,yard);
 expect(batchWanted(generateOptions(w,p,true,true))?.item).toBe('garment');
 for(const recipe of ['strip_fibre','weave_garment']){
  const option=generateOptions(w,p,true,true).options.find(o=>o.kind==='operate'&&o.key===`operate:${yard.id}:${recipe}`);
  expect(option,recipe).toBeDefined();startActivity(w,p,option!.make!()!);finish(w,p);learn(w,p,yard);
 }
 expect(yard.store.items.garment).toBe(1);expect(w.ledger.consumed.wood).toBe(1);expect(w.ledger.consumed.fibre).toBe(3);
 const take=generateOptions(w,p,true,true).options.find(o=>o.kind==='withdraw'&&o.make?.()?.data.items && (o.make!()!.data.items as {garment?:number}).garment);
 expect(take).toBeDefined();startActivity(w,p,take!.make!()!);finish(w,p);
 const dress=generateOptions(w,p,true,true).options.find(o=>o.key.startsWith('dress:'))!;startActivity(w,p,dress.make!()!);finish(w,p);
 expect(clothingWarmth(w,p)).toBe(6);expect(conservationReport(w).ok).toBe(true);expect(toolReport(w).ok).toBe(true);
});
it('a carer delivers a spare to a visible cold child who can ready it, without surrendering the worn garment',()=>{
 const s=fixture(),{w,p}=s;const child=addPerson(s,'Child',45,40,{age:6,hh:p.hhId,hunger:90,thirst:90,energy:90});child.needs.warmth=10;done(s);
 const mine=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');mine.textile!.equipped=true;
 perceive(w,p);
 p.needs.warmth=100;w.weather.temp=20;
 const demand=demandsOf(generateOptions(w,p,true,true)).find(d=>d.item==='garment');expect(demand?.qty).toBe(2);
 const spare=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`clothe_child:${child.id}`);expect(o).toBeDefined();
 startActivity(w,p,o!.make!()!);finish(w,p);expect(mine.holder).toBe(p.id);expect(spare.holder).toBe(child.id);expect(spare.textile!.equipped).toBe(false);
 expect(p.x).toBeGreaterThan(41);expect(child.cooldowns.fedUntil??0).toBe(0);
 const childOptions=generateOptions(w,child,true,true),dress=childOptions.options.find(o=>o.key===`dress:${spare.id}`);expect(dress).toBeDefined();expect(rankOptions(childOptions).some(o=>o.key===dress!.key)).toBe(true);startActivity(w,child,dress!.make!()!);finish(w,child);
 expect(clothingWarmth(w,child)).toBe(6);expect(toolReport(w).ok).toBe(true);
});
it('preserves interrupted and saved dressing, pure inspection, and refuses free legacy crafting',()=>{
 const {w,p}=fixture();const t=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`dress:${t.id}`)!;startActivity(w,p,o.make!()!);
 for(let i=0;i<8;i++){w.tick++;stepActivity(w,p);}expect(t.textile!.equipped).toBe(false);
 suspendActivity(w,p);expect(p.activity).toBeNull();expect(t.textile!.equipped).toBe(false);expect(resumeSuspended(w,p)).toBe(true);
 const text=serializeWorld(w),copy=deserializeWorld(text),q=copy.persons.find(x=>x.id===p.id)!;
 finish(w,p);finish(copy,q);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const before=serializeWorld(w),hash=hashWorld(w);for(let i=0;i<10;i++){generateOptions(w,p,true,true);describePerson(w,p.id);}expect(serializeWorld(w)).toBe(before);expect(hashWorld(w)).toBe(hash);
 startActivity(w,p,newActivity(w,p,{kind:'craft',label:'Invalid shortcut',goal:'invalid',here:true,data:{tool:'garment'}}));finish(w,p);expect(p.inv.garment).toBe(1);
 w.settings.rulesVersion=123;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile/);
});
it('rejects a competing repair after the last fibre leaves, duplicate slots and count-only equipment',()=>{
 const {w,p}=fixture();const t=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');t.wear=60;p.inv.fibre=1;
 const a=newActivity(w,p,{kind:'tool_work',label:'Mend',goal:'repair',here:true,data:{textile:'repair',toolId:t.id}});textileBegin(w,p,a);a.progress=59;delete p.inv.fibre;
 expect(textileWork(w,p,a)).toMatch(/^fail:/);expect(t.wear).toBe(60);
 t.textile!.equipped=true;const other=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');other.textile!.equipped=true;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile slot/);
 other.textile!.equipped=false;p.inv.garment=3;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile count/);
});
it('leaves a gift with its owner when the child has a full pack, and never duplicates a lost item during repair',()=>{
 const s=fixture(),{w,p}=s;const child=addPerson(s,'Child',40.5,40,{age:6,hh:p.hhId,inv:{berries:5}});child.needs.warmth=10;done(s);
 const t=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');perceive(w,p);
 const gift=generateOptions(w,p,true,true).options.find(o=>o.key===`clothe_child:${child.id}`)!;expect(gift).toBeDefined();startActivity(w,p,gift.make!()!);finish(w,p);
 expect(t.holder).toBe(p.id);expect(child.inv.garment??0).toBe(0);expect(p.inv.garment).toBe(1);
 expect(generateOptions(w,p,true,true).options.some(o=>o.key===`clothe_child:${child.id}`)).toBe(false);
 p.inv.fibre=1;const a=newActivity(w,p,{kind:'tool_work',label:'Mend',goal:'repair',here:true,data:{textile:'repair',toolId:t.id}});textileBegin(w,p,a);a.progress=59;
 delete child.inv.berries;expect(transfer(w,p.inv,child.inv,5,'garment',1,`person:${p.id}`,`person:${child.id}`,'test transfer')).toBe(1);
 expect(textileWork(w,p,a)).toMatch(/^fail:/);expect(p.inv.fibre).toBe(1);expect(t.wear).toBe(0);expect(toolReport(w).ok).toBe(true);
});
it('allows only one recipient to collect the last garment, and does not exceed a full pack',()=>{
 const s=fixture(),{w,p}=s;const q=addPerson(s,'Bea',41,40);const yard=building(s,'timber_yard',42,42,0,{});done(s);
 const t=mintTool(w,'garment',0,0,yard.id,yard.store.items,0,'test');
 for(const person of [p,q])startActivity(w,person,newActivity(w,person,{kind:'withdraw',label:'Collect garment',goal:'insulation',targetId:yard.id,tx:yard.x,ty:yard.y,data:{items:{garment:1}},minCommit:1,maxTicks:700}));
 for(let i=0;i<700&&(p.activity||q.activity);i++){w.tick++;stepActivity(w,p);stepActivity(w,q);}
 expect((p.inv.garment??0)+(q.inv.garment??0)).toBe(1);expect(yard.store.items.garment??0).toBe(0);expect([p.id,q.id]).toContain(t.holder);expect(toolReport(w).ok).toBe(true);expect(conservationReport(w).ok).toBe(true);
});
it.each(['blanket','bedding'] as const)('makes and readies a %s through actual offered work, protecting only its sleeping holder',kind=>{
 const s=fixture(),{w,p}=s;p.needs.warmth=40;w.weather.temp=0;
 const yard=building(s,'timber_yard',42,42,p.hhId,{fibre:kind==='bedding'?4:3});snapshotInitial(w);learn(w,p,yard);
 const make=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${yard.id}:weave_${kind}`)!;expect(make).toBeDefined();startActivity(w,p,make.make!()!);finish(w,p);learn(w,p,yard);
 const take=generateOptions(w,p,true,true).options.find(o=>o.kind==='withdraw'&&o.key===`collect:${yard.id}:${kind}`)!;expect(take).toBeDefined();startActivity(w,p,take.make!()!);finish(w,p);
 const dress=generateOptions(w,p,true,true).options.find(o=>o.key.startsWith('dress:'))!;startActivity(w,p,dress.make!()!);finish(w,p);
 expect(clothingWarmth(w,p)).toBe(0);p.pose='sleep';expect(clothingWarmth(w,p)).toBe(4);expect(conservationReport(w).ok).toBe(true);expect(toolReport(w).ok).toBe(true);
});
it('rejects shortened saved work and keeps textile recipes out of authored worlds',()=>{
 const s=fixture(),{w,p}=s;const t=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');
 const a=newActivity(w,p,{kind:'tool_work',label:'Ready garment',goal:'warmth',here:true,data:{textile:'dress',toolId:t.id}});startActivity(w,p,a);a.duration=1;
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile work progress/);a.duration=20;
 expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
 const yard=building(s,'timber_yard',42,42,p.hhId,{fibre:3});w.settings.dynamics='authored';expect(startBlocker(w,yard,p,RECIPE_BY_ID.weave_garment)).toContain('not available');
});
it('death leaves one recoverable textile with its condition, but no worn protection on the ground',()=>{
 const s=fixture(),{w,p}=s,q=addPerson(s,'Survivor',41,40,{hh:p.hhId});done(s);
 const t=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');t.textile={wet:.4,equipped:true};t.wear=37;
 killPerson(w,p,'declared staged loss');
 const pile=w.piles.find(x=>x.id===t.holder)!;expect(pile.items.garment).toBe(1);expect(p.inv.garment??0).toBe(0);
 expect(t.textile.equipped).toBe(false);expect(t.wear).toBe(37);expect(t.textile.wet).toBe(.4);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 q.x=pile.x+.5;q.y=pile.y+1.5;
 startActivity(w,q,newActivity(w,q,{kind:'withdraw',label:'Recover garment',goal:'insulation',targetId:pile.id,targetType:'pile',here:true,data:{items:{garment:1}},maxTicks:200}));finish(w,q);
 expect(t.holder).toBe(q.id);expect(q.inv.garment).toBe(1);expect(clothingWarmth(w,q)).toBe(0);expect(t.wear).toBe(37);
 expect(toolReport(w).ok).toBe(true);expect(conservationReport(w).ok).toBe(true);
});
it('makes its own fibre instead of repeatedly trying to weave another person\'s reserved stock',()=>{
 const s=fixture(),{w,p}=s;const q=addPerson(s,'Other maker',41,40);const yard=building(s,'timber_yard',42,42,0,{wood:2,fibre:3});done(s);
 p.needs.warmth=40;w.weather.temp=0;addEarmark(w,yard,{kind:'out',item:'fibre',n:3,owner:q.id,reason:'their completed batch'});learn(w,p,yard);
 let ctx=generateOptions(w,p,true,true);
 expect(knownTextileStock(w,p,p.beliefs[yard.id],'fibre')).toBe(0);
 expect(ctx.options.some(o=>o.key===`operate:${yard.id}:weave_blanket`)).toBe(false);
 const strip=ctx.options.find(o=>o.key===`operate:${yard.id}:strip_fibre`)!;expect(strip).toBeDefined();startActivity(w,p,strip.make!()!);finish(w,p);learn(w,p,yard);
 expect(yard.store.items.fibre).toBe(6);expect(knownTextileStock(w,p,p.beliefs[yard.id],'fibre')).toBe(3);
 const weave=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${yard.id}:weave_blanket`)!;expect(weave).toBeDefined();startActivity(w,p,weave.make!()!);finish(w,p);
 expect(yard.store.items.blanket).toBe(1);expect(yard.store.items.fibre).toBe(3);expect(conservationReport(w).ok).toBe(true);
});
it('keeps access observations dated and personal, including after save/load and hearsay',()=>{
 const s=fixture(),{w,p}=s;const q=addPerson(s,'Other maker',41,40);const yard=building(s,'timber_yard',42,42,0,{fibre:3});done(s);
 addEarmark(w,yard,{kind:'out',item:'fibre',n:3,owner:q.id,reason:'their batch'});learn(w,p,yard);learn(w,q,yard);
 expect(knownTextileStock(w,q,q.beliefs[yard.id],'fibre')).toBe(3);expect(knownTextileStock(w,p,q.beliefs[yard.id],'fibre')).toBe(0);
 yard.ops!.earmarks=[];expect(knownTextileStock(w,p,p.beliefs[yard.id],'fibre')).toBe(0);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);learn(w,p,yard);expect(knownTextileStock(w,p,p.beliefs[yard.id],'fibre')).toBe(3);
 p.beliefs[yard.id].textileStock!.items.fibre=4;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile stock/);
});
it('assembles a bedroll from two paid fibre batches instead of requiring a free four-fibre stock',()=>{
 const s=fixture(),{w,p}=s;const yard=building(s,'timber_yard',42,42,p.hhId,{wood:2});
 for(const kind of ['garment','blanket'] as const)mintTool(w,kind,0,p.hhId,p.id,p.inv,p.id,'fixture',false);
 snapshotInitial(w);p.needs.warmth=40;w.weather.temp=0;learn(w,p,yard);
 expect(batchWanted(generateOptions(w,p,true,true))?.item).toBe('bedding');
 for(const recipe of ['strip_fibre','strip_fibre','weave_bedding']){
  const offer=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${yard.id}:${recipe}`);expect(offer,recipe).toBeDefined();
  startActivity(w,p,offer!.make!()!);finish(w,p);learn(w,p,yard);
 }
 expect(yard.store.items.bedding).toBe(1);expect(yard.store.items.fibre).toBe(2);
 expect(w.ledger.consumed.wood).toBe(2);expect(w.ledger.consumed.fibre).toBe(4);expect(conservationReport(w).ok).toBe(true);
});
it('a carer can prepare a visible unclothed child for observed cold weather before the child is already chilled',()=>{
 const s=fixture(),{w,p}=s,child=addPerson(s,'Child',41,40,{age:6,hh:p.hhId});done(s);
 child.needs.warmth=90;p.needs.warmth=90;w.weather.temp=5;mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test').textile!.equipped=true;perceive(w,p);
 expect(demandsOf(generateOptions(w,p,true,true)).find(d=>d.item==='garment')?.qty).toBe(2);
 mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');
 expect(generateOptions(w,p,true,true).options.some(o=>o.key===`clothe_child:${child.id}`)).toBe(true);
 w.weather.temp=20;expect(generateOptions(w,p,true,true).options.some(o=>o.key===`clothe_child:${child.id}`)).toBe(false);
});
it('does not offer a borrowed garment as a gift to a child',()=>{
 const s=fixture(),{w,p}=s,child=addPerson(s,'Child',41,40,{age:6,hh:p.hhId});done(s);
 child.needs.warmth=20;w.weather.temp=0;
 const borrowed=mintTool(w,'garment',0,0,p.id,p.inv,0,'test');borrowed.loan={lender:0,borrower:p.id,due:w.tick+2400};
 perceive(w,p);
 expect(generateOptions(w,p,true,true).options.some(o=>o.key===`clothe_child:${child.id}`)).toBe(false);
});
it('gives the selected owned spare, retaining a loan and worn garment across a saved hand-over',()=>{
 const s=fixture(),{w,p}=s,child=addPerson(s,'Child',41,40,{age:6,hh:p.hhId});done(s);child.needs.warmth=20;
 const loan=mintTool(w,'garment',0,0,p.id,p.inv,0,'test');loan.loan={lender:999,borrower:p.id,due:w.tick+2400};
 const worn=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');worn.textile!.equipped=true;
 const spare=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');perceive(w,p);
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`clothe_child:${child.id}`)!;startActivity(w,p,o.make!()!);
 for(let n=0;n<6;n++){w.tick++;stepActivity(w,p);}
 const saved=serializeWorld(w),copy=deserializeWorld(saved),cp=copy.persons.find(q=>q.id===p.id)!;finish(w,p);finish(copy,cp);
 expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(spare.holder).toBe(child.id);expect(loan.holder).toBe(p.id);expect(worn.holder).toBe(p.id);expect(worn.textile!.equipped).toBe(true);
 expect(conservationReport(w).ok).toBe(true);expect(toolReport(w).ok).toBe(true);
});
it('reports loss of the chosen spare honestly instead of handing over a different garment',()=>{
 const s=fixture(),{w,p}=s,child=addPerson(s,'Child',41,40,{age:6,hh:p.hhId}),other=addPerson(s,'Other',42,40,{hh:p.hhId});done(s);child.needs.warmth=20;
 const spare=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');const worn=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');worn.textile!.equipped=true;perceive(w,p);
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`clothe_child:${child.id}`)!;startActivity(w,p,o.make!()!);
 expect(transfer(w,p.inv,other.inv,20,'garment',1,`person:${p.id}`,`person:${other.id}`,'staged competing transfer',spare.id)).toBe(1);finish(w,p);
 expect(child.inv.garment??0).toBe(0);expect(worn.holder).toBe(p.id);expect(p.lastResult?.detail).toContain('chosen garment');expect(toolReport(w).ok).toBe(true);
});
it('clears the worn slot and respects pack capacity through direct equipment loan paths',()=>{
 const s=fixture(),{w,p}=s,q=addPerson(s,'Borrower',41,40,{age:6,inv:{berries:5}});done(s);
 const t=mintTool(w,'garment',0,p.hhId,p.id,p.inv,p.id,'test');t.textile!.equipped=true;
 expect(lendTool(w,t,p,q,w.tick+500)).toBe(false);delete q.inv.berries;
 expect(lendTool(w,t,p,q,w.tick+500)).toBe(true);expect(t.textile!.equipped).toBe(false);
 t.textile!.equipped=true;p.inv.stone=20;expect(returnLoan(w,t,q,p)).toBe(false);delete p.inv.stone;
 expect(returnLoan(w,t,q,p)).toBe(true);expect(t.textile!.equipped).toBe(false);
 const yard=building(s,'timber_yard',42,42,0,{});const spare=mintTool(w,'garment',0,0,yard.id,yard.store.items,0,'test');
 q.inv.berries=5;expect(checkoutFromRack(w,spare,yard.store.items,q)).toBe(false);delete q.inv.berries;
 expect(checkoutFromRack(w,spare,yard.store.items,q)).toBe(true);expect(spare.textile!.equipped).toBe(false);expect(toolReport(w).ok).toBe(true);
});
it('rejects unpaid or shortened saved textile batches and invalid fibre counts',()=>{
 const s=fixture(),{w,p}=s;const yard=building(s,'timber_yard',42,42,p.hhId,{wood:1});snapshotInitial(w);learn(w,p,yard);w.weather.temp=0;p.needs.warmth=40;
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${yard.id}:strip_fibre`)!;startActivity(w,p,o.make!()!);
 for(let n=0;n<400&&!yard.ops?.job;n++){w.tick++;stepActivity(w,p);}
 const job=yard.ops!.job!;expect(job).toBeTruthy();expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
 job.total=1;job.progress=0;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile batch/);job.total=60;
 delete job.held.wood;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile batch/);job.held.wood=1;
 p.inv.fibre=-1;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/textile goods/);
});
