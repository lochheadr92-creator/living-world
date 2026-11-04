import {expect,it,vi} from 'vitest';
import {stage,addPerson,done,learn,building} from './helpers/kit';
import {makeWolf} from '../src/sim/wildlife';
import {makeCarcass,carcassTick,CARCASS_LIFETIME,CARCASS_WORK} from '../src/sim/carcass';
import {newActivity,startActivity,stepActivity,endActivity,handlerOf} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
import {conservationReport,totalItems,weightOf,snapshotInitial,transfer,pickFood,foodUnits} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describeEntity,describePerson} from '../src/sim/inspect';
import {startJob,workJob,facilityTick,finishJob} from '../src/sim/facilities';
import {RECIPE_BY_ID} from '../src/sim/recipes';
import {clothingWarmth} from '../src/sim/clothing';
import {isFoodKind} from '../src/sim/provision';
import {hashString,hashUnit} from '../src/sim/rng';
import {updateNeeds} from '../src/sim/needs';
import {stepWorld} from '../src/sim/world';
function fixture(){const s=stage('carcass-contract');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:125};const p=addPerson(s,'Ada',40.5,40.5,{hunger:65,thirst:90,energy:90});const deer=makeWolf(s.w,41.5,40.5,'deer');done(s);return {...s,p,deer};}
function finish(w:ReturnType<typeof fixture>['w'],p:ReturnType<typeof fixture>['p'],n=400){for(let i=0;i<n&&p.activity;i++){w.tick++;stepActivity(w,p);}expect(p.activity).toBeNull();}
function cut(w:ReturnType<typeof fixture>['w'],p:ReturnType<typeof fixture>['p'],id:number,item='meat'){
 startActivity(w,p,newActivity(w,p,{kind:'butcher',label:'Butcher',goal:'recover food',targetId:id,targetType:'pile',tx:41.5,ty:40.5,spotX:41.5,spotY:40.5,data:{part:item},minCommit:20,maxTicks:600}));
}
it('replaces exactly one living deer with a finite body and no instant meat',()=>{
 const {w,p,deer}=fixture(),body=makeCarcass(w,deer,p)!;
 expect(w.animals).not.toContain(deer);expect(p.inv.meat??0).toBe(0);expect(body.carcass!.remaining).toEqual({meat:4,hide:1,fat:1});
 expect(makeCarcass(w,deer,p)).toBeNull();expect(w.piles.filter(x=>x.carcass)).toHaveLength(1);expect(totalItems(w).meat).toBe(4);expect(conservationReport(w).ok).toBe(true);
});
it('offers locally known butchery and preserves paid partial work through interruption and save/load',()=>{
 const {w,p,deer}=fixture(),body=makeCarcass(w,deer,p)!;learn(w,p,body);
 const before=serializeWorld(w);expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='butcher')).toBe(true);describeEntity(w,body.id);expect(serializeWorld(w)).toBe(before);
 cut(w,p,body.id);for(let i=0;i<25;i++){w.tick++;stepActivity(w,p);}expect(body.carcass!.work.meat).toBeGreaterThan(0);
 endActivity(w,p,'interrupted','staged interruption');const paid=body.carcass!.work.meat;expect(paid).toBeLessThan(CARCASS_WORK);
 const copy=deserializeWorld(serializeWorld(w)),q=copy.persons.find(x=>x.id===p.id)!;cut(w,p,body.id);cut(copy,q,body.id);finish(w,p);finish(copy,q);
 expect(p.inv.meat).toBe(1);expect(body.carcass!.remaining.meat).toBe(3);expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(conservationReport(w).ok).toBe(true);
});
it('rejects a full pack and another household without spending the body',()=>{
 const s=fixture(),{w,p,deer}=s,q=addPerson(s,'Other',40.5,41);const body=makeCarcass(w,deer,p)!;
 p.inv.stone=20;cut(w,p,body.id);finish(w,p);expect(p.inv.meat??0).toBe(0);expect(body.carcass!.remaining.meat).toBe(4);
 cut(w,q,body.id);finish(w,q);expect(q.inv.meat??0).toBe(0);expect(q.lastResult?.detail).toContain('household');
 delete p.inv.stone;cut(w,p,body.id);finish(w,p);expect(weightOf(p.inv)).toBeLessThanOrEqual(carryCap(w,p));
});
it('allows only one worker to claim a body at a time and accounts for finite decay and cleanup',()=>{
 const s=fixture(),{w,p,deer}=s,q=addPerson(s,'Bea',40.5,41,{hh:p.hhId});const body=makeCarcass(w,deer,p)!;
 cut(w,p,body.id);cut(w,q,body.id);for(let i=0;i<400&&(p.activity||q.activity);i++){w.tick++;if(p.activity)stepActivity(w,p);if(q.activity)stepActivity(w,q);}expect((p.inv.meat??0)+(q.inv.meat??0)).toBe(1);
 w.tick=body.since+CARCASS_LIFETIME;carcassTick(w);expect(w.ledger.spoiled.meat).toBe(3);expect(w.ledger.spoiled.hide).toBe(1);expect(w.ledger.spoiled.fat).toBe(1);expect(conservationReport(w).ok).toBe(true);
 w.tick+=121;carcassTick(w);expect(w.byId.has(body.id)).toBe(false);expect(w.piles).not.toContain(body);
});
it('rejects malformed carcass totals, future origins and progress that grants unpaid output',()=>{
 const {w,p,deer}=fixture(),body=makeCarcass(w,deer,p)!;body.carcass!.remaining.meat=5;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/carcass/);
 body.carcass!.remaining.meat=4;body.carcass!.work.meat=CARCASS_WORK;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/carcass/);
 body.carcass!.work.meat=0;body.since=w.tick+1;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/carcass/);
});
it('turns recovered hide and fibre into an owned, wearable garment after paid work',()=>{
 const s=fixture(),{w,p,deer}=s,yard=building(s,'timber_yard',43,40,p.hhId,{fibre:1});snapshotInitial(w);
 p.needs.warmth=40;w.weather.temp=0;const body=makeCarcass(w,deer,p)!;cut(w,p,body.id,'hide');finish(w,p);expect(p.inv.hide).toBe(1);
 learn(w,p,yard);const deliver=generateOptions(w,p,true,true).options.find(o=>o.kind==='deposit'&&o.targetId===yard.id&&o.make?.()?.data.items?.hide);
 expect(deliver).toBeDefined();startActivity(w,p,deliver!.make!()!);finish(w,p);learn(w,p,yard);
 const make=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${yard.id}:sew_hide_garment`);expect(make).toBeDefined();
 startActivity(w,p,make!.make!()!);finish(w,p);
 expect(yard.store.items.garment).toBe(1);expect(w.ledger.consumed.hide).toBe(1);expect(w.ledger.consumed.fibre).toBe(1);
 const t=w.tools.find(t=>t.holder===yard.id&&t.kind==='garment')!;expect(t.textile?.material).toBe('hide');
 learn(w,p,yard);const collect=generateOptions(w,p,true,true).options.find(o=>o.key===`collect:${yard.id}:garment`)!;
 expect(collect.label).toContain('1 garment');expect(collect.label).not.toContain('fibre garment');startActivity(w,p,collect.make!()!);finish(w,p);
 const dress=generateOptions(w,p,true,true).options.find(o=>o.key===`dress:${t.id}`)!;startActivity(w,p,dress.make!()!);finish(w,p);
 expect(clothingWarmth(w,p)).toBe(6);expect(describePerson(w,p.id)!.tools.find(x=>x.id===t.id)!.label).toContain('hide garment');expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));expect(conservationReport(w).ok).toBe(true);
});
it('renders recovered raw fat only after work and paid fuel, then carries and eats the output',()=>{
 const s=fixture(),{w,p,deer}=s,rack=building(s,'food_rack',43,40,p.hhId,{wood:1});snapshotInitial(w);
 const body=makeCarcass(w,deer,p)!;cut(w,p,body.id,'fat');finish(w,p);expect(pickFood(p.inv,0)).toBeNull();expect(foodUnits(p.inv)).toBe(0);
 learn(w,p,rack);const deliver=generateOptions(w,p,true,true).options.find(o=>o.kind==='deposit'&&o.targetId===rack.id&&o.make?.()?.data.items?.fat);
 expect(deliver).toBeDefined();startActivity(w,p,deliver!.make!()!);finish(w,p);learn(w,p,rack);
 const make=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${rack.id}:render_fat`);expect(make).toBeDefined();
 startActivity(w,p,make!.make!()!);for(let n=0;n<300&&!rack.ops!.job;n++){w.tick++;stepActivity(w,p);}
 expect(finishJob(w,rack)).toBe(false);finish(w,p);
 expect(w.ledger.consumed.wood).toBe(1);expect(rack.store.items.rendered_fat??0).toBe(0);
 const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
 while(rack.ops!.job){w.tick++;facilityTick(w,rack);}
 expect(rack.store.items.rendered_fat).toBe(1);expect(isFoodKind('rendered_fat')).toBe(true);
 learn(w,p,rack);const collect=generateOptions(w,p,true,true).options.find(o=>o.kind==='withdraw'&&o.targetId===rack.id&&o.make?.()?.data.items?.rendered_fat)!;
 expect(collect).toBeDefined();startActivity(w,p,collect.make!()!);finish(w,p);p.needs.hunger=30;
 const eat=generateOptions(w,p,true,true).options.find(o=>o.kind==='eat')!;expect(eat).toBeDefined();startActivity(w,p,eat.make!()!);finish(w,p);
 expect(p.needs.hunger).toBe(54);expect(p.inv.rendered_fat??0).toBe(0);expect(w.ledger.consumed.fat).toBe(1);expect(w.ledger.consumed.rendered_fat).toBe(1);expect(conservationReport(w).ok).toBe(true);
});
it('rejects new goods and hide recipes under older rules and malformed fat batches',()=>{
 const s=fixture(),{w,p}=s,rack=building(s,'food_rack',43,40,p.hhId,{fat:1,wood:1});snapshotInitial(w);
 expect(startJob(w,rack,p,RECIPE_BY_ID.render_fat,p.id,'render')).toBeNull();const good=serializeWorld(w);
 rack.ops!.job!.total=1;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/preservation/i);
 const copy=deserializeWorld(good);copy.settings.rulesVersion=124;expect(()=>deserializeWorld(serializeWorld(copy))).toThrow();
});
it('the real hunt handler replaces its instant reward with one body after a paid successful strike',()=>{
 const {w,p,deer}=fixture();const h=handlerOf('hunt')!;
 // A declared staged successful roll; the production chance and RNG are unchanged.
 const chance=.22+.1*(p.skills.forage-1);
 while(hashUnit(hashString(w.seed)^0xdee2,p.id*31+deer.id,w.tick+40)>=chance)w.tick++;
 const a=newActivity(w,p,{kind:'hunt',label:'Staged hunt',goal:'hunt',here:true,targetId:deer.id,targetType:'animal',data:{tries:0}});
 expect(h.begin!(w,p,a)).toBeUndefined();for(let n=0;n<39;n++){w.tick++;expect(h.work(w,p,a)).toBe('continue');}
 expect(w.animals).toContain(deer);expect(w.piles.filter(b=>b.carcass)).toHaveLength(0);
 w.tick++;expect(h.work(w,p,a)).toBe('done');expect(a.data.tries).toBe(1);expect(p.inv.meat??0).toBe(0);
 expect(w.piles.filter(b=>b.carcass)).toHaveLength(1);expect(w.ledger.created.meat).toBe(4);expect(conservationReport(w).ok).toBe(true);
});
it('a dated carcass observation never exposes loose food and stale remote knowledge does not refresh itself',()=>{
 const {w,p,deer}=fixture(),body=makeCarcass(w,deer,p)!;const known=JSON.stringify(p.beliefs[body.id]);
 expect(p.beliefs[body.id].items).toEqual({});p.x=20;p.y=20;
 w.tick=CARCASS_LIFETIME;carcassTick(w);const before=serializeWorld(w);generateOptions(w,p,true,true);
 expect(serializeWorld(w)).toBe(before);expect(JSON.stringify(p.beliefs[body.id])).toBe(known);expect(body.carcass!.remaining.meat).toBe(0);
 cut(w,p,body.id);endActivity(w,p,'interrupted','stopped before reaching the body');expect(JSON.stringify(p.beliefs[body.id])).toBe(known);
});
it('charges ordinary heavy-work needs and resumes an active mid-cut save without duplicate output',()=>{
 const {w,p,deer}=fixture(),body=makeCarcass(w,deer,p)!;cut(w,p,body.id);
 for(let i=0;i<25;i++){w.tick++;stepActivity(w,p);}
 const hunger=p.needs.hunger,energy=p.needs.energy;updateNeeds(w,p);
 expect(hunger-p.needs.hunger).toBeCloseTo(.03*1.25);expect(energy-p.needs.energy).toBeCloseTo(.04*1.35);
 const copy=deserializeWorld(serializeWorld(w)),q=copy.persons.find(q=>q.id===p.id)!;
 finish(w,p);finish(copy,q);expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(p.inv.meat).toBe(1);expect(conservationReport(w).ok).toBe(true);
});
it('a hungry full-pack worker eats only their accessible rendered-fat granary share',()=>{
 const s=fixture(),{w,p}=s,g=building(s,'granary',43,40,p.hhId,{rendered_fat:2,berries:4});
 p.inv={stone:4};p.needs.hunger=35;g.ops!.shares={[p.hhId]:{rendered_fat:2}};snapshotInitial(w);learn(w,p,g);
 const eat=generateOptions(w,p,true,true).options.find(o=>o.key===`eat_store:${g.id}`)!;expect(eat).toBeDefined();startActivity(w,p,eat.make!()!);finish(w,p);
 expect(w.ledger.consumed.rendered_fat).toBeGreaterThan(0);expect(g.store.items.berries).toBe(4);expect(conservationReport(w).ok).toBe(true);
});
it('full output storage cannot finish fat and an expired batch loses its paid input once',()=>{
 const s=fixture(),{w,p}=s,b=building(s,'food_rack',43,40,p.hhId,{fat:1,wood:1,stone:1});snapshotInitial(w);
 expect(startJob(w,b,p,RECIPE_BY_ID.render_fat,p.id,'render')).toBeNull();b.store.cap=3;
 while(b.ops!.job!.phase==='work'){w.tick++;workJob(w,b,p);}for(let n=0;n<180;n++){w.tick++;facilityTick(w,b);}
 expect(b.ops!.job!.phase).toBe('ready');expect(w.ledger.created.rendered_fat??0).toBe(0);
 w.tick=b.ops!.job!.started+4800;facilityTick(w,b);facilityTick(w,b);
 expect(w.ledger.spoiled.fat).toBe(1);expect(w.ledger.consumed.wood).toBe(1);expect(b.ops!.job).toBeNull();expect(conservationReport(w).ok).toBe(true);
});
it('recovered raw materials and rendered fat still spoil while carried',()=>{
 const {w,p}=fixture();p.inv={hide:1,fat:1,rendered_fat:1};snapshotInitial(w);w.tick=59;
 const random=vi.spyOn(w.rng,'next').mockReturnValue(0);try{stepWorld(w);}finally{random.mockRestore();}
 for(const k of ['hide','fat','rendered_fat'] as const){expect(p.inv[k]??0).toBe(0);expect(w.ledger.spoiled[k]).toBe(1);}expect(conservationReport(w).ok).toBe(true);
});
it('two workers cannot recover the same final meat portion',()=>{
 const s=fixture(),{w,p,deer}=s,q=addPerson(s,'Bea',40.5,41,{hh:p.hhId}),body=makeCarcass(w,deer,p)!;
 for(let n=0;n<3;n++){cut(w,p,body.id);finish(w,p);}expect(body.carcass!.remaining.meat).toBe(1);
 cut(w,p,body.id);cut(w,q,body.id);
 for(let n=0;n<400&&(p.activity||q.activity);n++){w.tick++;if(p.activity)stepActivity(w,p);if(q.activity)stepActivity(w,q);}
 expect((p.inv.meat??0)+(q.inv.meat??0)).toBe(4);expect(body.carcass!.remaining.meat).toBe(0);expect(body.carcass!.recovered.meat).toBe(4);expect(conservationReport(w).ok).toBe(true);
});

it('refuses ordinary deposits into a body so recovery state cannot become mixed loose storage',()=>{
 const {w,p,deer}=fixture();p.inv.wood=1;snapshotInitial(w);const body=makeCarcass(w,deer,p)!;
 startActivity(w,p,newActivity(w,p,{kind:'deposit',label:'Deposit',goal:'store goods',targetId:body.id,targetType:'pile',tx:41.5,ty:40.5,spotX:41.5,spotY:40.5,data:{items:{wood:1}},maxTicks:300}));finish(w,p);
 expect(p.inv.wood).toBe(1);expect(body.items).toEqual({});expect(p.lastResult?.detail).toContain('body');
 expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));expect(conservationReport(w).ok).toBe(true);
});
