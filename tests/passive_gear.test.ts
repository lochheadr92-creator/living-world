import {gearObserver} from '../scripts/observers/gear';
import {expect,it} from 'vitest';
import {stage,addPerson,done,learn,building} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {mintTool,lendTool,returnLoan,checkoutFromRack} from '../src/sim/tools';
import {gearTick,GEAR_WAIT} from '../src/sim/passive_gear';
import {newActivity,startActivity,stepActivity,endActivity} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
import {killPerson} from '../src/sim/lifecycle';
import {makeWolf} from '../src/sim/wildlife';
import {hashString,hashUnit} from '../src/sim/rng';
import {describeEntity} from '../src/sim/inspect';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {nearbyWaterFraction} from '../src/sim/hydrology';
import {isWalkable} from '../src/sim/registry';
import {stepWorld} from '../src/sim/world';
import {snapshotInitial,conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
function scene(){const s=stage('passive-gear');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:126};const p=addPerson(s,'Ada',40.5,40.5,{hunger:60,thirst:90,energy:90});const fish=makeSource(s.w,'fish_spot',41,40,3);const t=mintTool(s.w,'net',0,p.hhId,p.id,p.inv,p.id,'fixture',false);done(s);learn(s.w,p,fish);return {...s,p,fish,t};}
function finish(w:ReturnType<typeof scene>['w'],p:ReturnType<typeof scene>['p']){for(let n=0;n<500&&p.activity;n++){w.tick++;stepActivity(w,p);}expect(p.activity).toBeNull();}
it('places owned gear with paid work, removes finite unreserved fish once, and collects through offered work',()=>{
 const {w,p,fish,t}=scene();const offer=generateOptions(w,p,true,true).options.find(o=>o.key===`gear:place:${t.id}:${fish.id}`);expect(offer).toBeDefined();
 startActivity(w,p,offer!.make!()!);finish(w,p);const pile=w.piles.find(b=>b.gear)!;expect(p.inv.net??0).toBe(0);expect(t.holder).toBe(pile.id);expect(pile.items.net).toBe(1);
 fish.reserved=2;w.tick=pile.gear!.readyAt;gearTick(w);expect(fish.amount).toBe(2);expect(pile.items.fish).toBe(1);gearTick(w);expect(pile.items.fish).toBe(1);fish.reserved=0;
 const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);learn(w,p,pile);
 const take=generateOptions(w,p,true,true).options.find(o=>o.key===`gear:check:${pile.id}`)!;expect(take).toBeDefined();startActivity(w,p,take.make!()!);finish(w,p);
 expect(p.inv.fish).toBe(1);expect(pile.gear!.checked).toBe(true);expect(conservationReport(w).ok).toBe(true);
 const eat=generateOptions(w,p,true,true).options.find(o=>o.kind==='eat')!;expect(eat).toBeDefined();startActivity(w,p,eat.make!()!);finish(w,p);expect(w.ledger.consumed.fish).toBe(1);expect(p.needs.hunger).toBeGreaterThan(60);
});
it('keeps the saved attempt fixed, expires catches and refuses another household',()=>{
 const s=scene(),{w,p,fish,t}=s;startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:'Set net',goal:'fish later',here:true,targetId:fish.id,targetType:'source',data:{op:'place',toolId:t.id},maxTicks:400}));finish(w,p);const pile=w.piles.find(b=>b.gear)!;
 const copy=deserializeWorld(serializeWorld(w));w.tick=pile.gear!.readyAt;copy.tick=w.tick;gearTick(w);gearTick(copy);expect(serializeWorld(w)).toBe(serializeWorld(copy));
 const q=addPerson(s,'Other',40.5,40.5);snapshotInitial(w);startActivity(w,q,newActivity(w,q,{kind:'gear_work',label:'Take catch',goal:'eat',here:true,targetId:pile.id,targetType:'pile',data:{op:'check'},maxTicks:200}));finish(w,q);expect(q.inv.fish??0).toBe(0);expect(q.lastResult?.detail).toContain('household');
 w.tick+=1201;gearTick(w);expect(pile.items.fish??0).toBe(0);expect(w.ledger.spoiled.fish).toBe(2);expect(conservationReport(w).ok).toBe(true);
});

function act(w:ReturnType<typeof scene>['w'],p:ReturnType<typeof scene>['p'],id:number,op:string,toolId?:number){startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:op,goal:'gear contract',here:true,targetId:id,targetType:op==='place'?'source':'pile',data:{op,toolId},maxTicks:400}));}
it('manufactures, collects and places a net through ordinary offered actions and paid materials',()=>{
 const s=stage('make-net'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:126};const p=addPerson(s,'Ada',40.5,40.5,{hunger:70,thirst:90,energy:90});const yard=building(s,'timber_yard',43,40,p.hhId,{fibre:3,wood:2}),fish=makeSource(w,'fish_spot',41,40,3);done(s);learn(w,p,yard);learn(w,p,fish);
 const make=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${yard.id}:make_net`);expect(make).toBeDefined();startActivity(w,p,make!.make!()!);finish(w,p);learn(w,p,yard);
 const collect=generateOptions(w,p,true,true).options.find(o=>o.key===`collect:${yard.id}:net`);expect(collect).toBeDefined();startActivity(w,p,collect!.make!()!);finish(w,p);
 const t=w.tools.find(t=>t.holder===p.id&&t.kind==='net')!;expect(t).toBeDefined();expect(w.ledger.consumed.fibre).toBe(3);expect(w.ledger.consumed.wood).toBe(2);
 const place=generateOptions(w,p,true,true).options.find(o=>o.key===`gear:place:${t.id}:${fish.id}`)!;startActivity(w,p,place.make!()!);finish(w,p);expect(w.piles.some(b=>b.gear?.toolId===t.id)).toBe(true);expect(conservationReport(w).ok).toBe(true);
});
it('interrupted placement creates no deployed copy and active placement continues exactly after saving',()=>{
 const {w,p,fish,t}=scene();act(w,p,fish.id,'place',t.id);for(let n=0;n<25;n++){w.tick++;stepActivity(w,p);}expect(w.piles.some(b=>b.gear)).toBe(false);
 const saved=serializeWorld(w),copy=deserializeWorld(saved),q=copy.persons.find(q=>q.id===p.id)!;finish(w,p);finish(copy,q);expect(serializeWorld(w)).toBe(serializeWorld(copy));
 const s=scene();act(s.w,s.p,s.fish.id,'place',s.t.id);for(let n=0;n<20;n++){s.w.tick++;stepActivity(s.w,s.p);}endActivity(s.w,s.p,'interrupted','danger');expect(s.p.inv.net).toBe(1);expect(s.w.piles.some(b=>b.gear)).toBe(false);
});
it('two household workers cannot collect the same last fish and the emptied net needs a new paid reset',()=>{
 const s=scene(),{w,p,fish,t}=s,q=addPerson(s,'Bea',40.5,40.5,{hh:p.hhId});fish.amount=1;snapshotInitial(w);act(w,p,fish.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear)!;w.tick=b.gear!.readyAt;gearTick(w);
 act(w,p,b.id,'check');act(w,q,b.id,'check');for(let n=0;n<100&&(p.activity||q.activity);n++){w.tick++;if(p.activity)stepActivity(w,p);if(q.activity)stepActivity(w,q);}expect((p.inv.fish??0)+(q.inv.fish??0)).toBe(1);
 const cycle=b.gear!.cycle;gearTick(w);expect(b.gear!.cycle).toBe(cycle);act(w,p,b.id,'reset');finish(w,p);expect(b.gear!.cycle).toBe(cycle+1);expect(b.gear!.readyAt).toBe(w.tick+GEAR_WAIT);expect(conservationReport(w).ok).toBe(true);
});
it('repairs cost fibre, broken gear refuses reset and a full pack leaves its catch in place',()=>{
 const {w,p,fish,t}=scene();p.inv.fibre=1;snapshotInitial(w);act(w,p,fish.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear)!;w.tick=b.gear!.readyAt;gearTick(w);
 p.inv.stone=30;act(w,p,b.id,'check');finish(w,p);expect(b.items.fish).toBe(2);expect(p.inv.fish??0).toBe(0);delete p.inv.stone;act(w,p,b.id,'check');finish(w,p);
 t.wear=100;b.gear!.state='broken';act(w,p,b.id,'reset');finish(w,p);expect(p.lastResult?.detail).toContain('broken');act(w,p,b.id,'repair');finish(w,p);expect(t.wear).toBe(60);expect(w.ledger.consumed.fibre).toBe(1);expect(conservationReport(w).ok).toBe(true);
});
it('a trap consumes one real nearby deer into one body without telling a distant owner',()=>{
 const s=stage('trap-catch'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:126};const p=addPerson(s,'Ada',40.5,40.5),tree=makeSource(w,'tree',41,40,5),t=mintTool(w,'trap',0,p.hhId,p.id,p.inv,p.id,'fixture',false);done(s);act(w,p,tree.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear)!;
 let deer=makeWolf(w,41,41,'deer');while(hashUnit(hashString(w.seed)^0x79ae,b.id+b.gear!.cycle,deer.id)>=.55){deer=makeWolf(w,41,41,'deer');}
 // Earlier staged deer are moved away; only this actual target is in reach.
 for(const a of w.animals)if(a!==deer){a.x=60;a.y=60;}p.x=10;p.y=10;w.tick=b.gear!.readyAt;gearTick(w);
 const corpse=w.piles.find(b=>b.carcass)!;expect(corpse.carcass!.animalId).toBe(deer.id);expect(w.animals).not.toContain(deer);expect(p.beliefs[corpse.id]).toBeUndefined();expect(p.inv.meat??0).toBe(0);gearTick(w);expect(w.piles.filter(b=>b.carcass)).toHaveLength(1);expect(conservationReport(w).ok).toBe(true);
 const before=serializeWorld(w);describeEntity(w,b.id);generateOptions(w,p,true,true);expect(serializeWorld(w)).toBe(before);
});
it('rejects malformed catch state and premature completion without beneficial defaults',()=>{
 const {w,p,fish,t}=scene();act(w,p,fish.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear)!;b.items.fish=2;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/gear/);delete b.items.fish;b.gear!.catchTick=1;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/gear/);
});

it('abandoned gear and its remaining catch are removed and ledgered once',()=>{
 const {w,p,fish,t}=scene();act(w,p,fish.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear)!;w.tick=b.gear!.readyAt;gearTick(w);w.tick=b.gear!.lastTended+48000;gearTick(w);gearTick(w);
 expect(w.byId.has(b.id)).toBe(false);expect(w.tools).not.toContain(t);expect(w.ledger.consumed.net).toBe(1);expect(w.ledger.spoiled.fish).toBe(2);expect(conservationReport(w).ok).toBe(true);
});

it('rejects an unpaid shortened waiting period on reload',()=>{const {w,p,fish,t}=scene();act(w,p,fish.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear)!;b.gear!.readyAt=w.tick;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/gear/);});

it('flood loss removes deployed equipment and leaves a valid conserved save',()=>{
 const w=createWorld(currentWorldSettings('normal','review-a-flood',{immigration:false})),p=w.persons[0];
 let spot:{x:number;y:number}|undefined;for(let y=2;y<w.H-2&&!spot;y++)for(let x=2;x<w.W-2&&!spot;x++)if(isWalkable(w,x,y)&&(nearbyWaterFraction(w,x,y,2)??0)>=.6)spot={x,y};expect(spot).toBeDefined();
 p.x=spot!.x+.5;p.y=spot!.y+.5;delete p.indoors;const fish=makeSource(w,'fish_spot',spot!.x,spot!.y,0),t=mintTool(w,'net',0,p.hhId,p.id,p.inv,p.id,'staged net');act(w,p,fish.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear?.toolId===t.id)!;
 for(let n=0;n<400;n++){w.weather.storm=1;w.weather.rain=1;w.weather.kind='storm';w.weather.nextChange=w.tick+100000;stepWorld(w);}
 expect(w.byId.has(b.id)).toBe(false);expect(w.tools).not.toContain(t);expect(w.ledger.spoiled.net).toBe(1);expect(conservationReport(w).ok).toBe(true);expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});
it('manufactures an owned trap through the same paid workshop route',()=>{
 const s=stage('make-trap'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:126};const p=addPerson(s,'Ada',40.5,40.5,{hunger:70,thirst:90,energy:90}),yard=building(s,'timber_yard',43,40,p.hhId,{fibre:3,wood:4}),tree=makeSource(w,'tree',41,42,4);done(s);learn(w,p,yard);learn(w,p,tree);
 const make=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${yard.id}:make_trap`)!;expect(make).toBeDefined();startActivity(w,p,make.make!()!);finish(w,p);expect(yard.store.items.trap).toBe(1);expect(w.ledger.consumed.fibre).toBe(3);expect(w.ledger.consumed.wood).toBe(4);expect(conservationReport(w).ok).toBe(true);
});

it('retrieval moves the same equipment record and clears only the retriever’s obsolete deployment memory',()=>{
 const {w,p,fish,t}=scene();act(w,p,fish.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear)!;expect(p.beliefs[b.id]).toBeDefined();act(w,p,b.id,'retrieve');finish(w,p);expect(t.holder).toBe(p.id);expect(p.inv.net).toBe(1);expect(p.beliefs[b.id]).toBeUndefined();
 expect(generateOptions(w,p,true,true).options.some(o=>o.key===`gear:place:${t.id}:${fish.id}`)).toBe(true);expect(conservationReport(w).ok).toBe(true);
});

it('household deployment capacity prevents a second net even when another member carries it',()=>{
 const s=scene(),{w,p,fish,t}=s,q=addPerson(s,'Bea',40.5,40.5,{hh:p.hhId}),other=mintTool(w,'net',0,p.hhId,q.id,q.inv,q.id,'fixture',false);snapshotInitial(w);act(w,p,fish.id,'place',t.id);finish(w,p);act(w,q,fish.id,'place',other.id);finish(w,q);
 expect(w.piles.filter(b=>b.gear?.kind==='net')).toHaveLength(1);expect(q.inv.net).toBe(1);expect(q.lastResult?.detail).toContain('household');expect(conservationReport(w).ok).toBe(true);
});
it('a set trap still acts physically after the setter dies, retaining household ownership',()=>{
 const s=stage('trap-after-death'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:126};const p=addPerson(s,'Ada',40.5,40.5),tree=makeSource(w,'tree',41,40,5),t=mintTool(w,'trap',0,p.hhId,p.id,p.inv,p.id,'fixture',false);done(s);act(w,p,tree.id,'place',t.id);finish(w,p);const b=w.piles.find(b=>b.gear)!;
 let deer=makeWolf(w,41,41,'deer');while(hashUnit(hashString(w.seed)^0x79ae,b.id+b.gear!.cycle,deer.id)>=.55)deer=makeWolf(w,41,41,'deer');for(const a of w.animals)if(a!==deer){a.x=60;a.y=60;}
 killPerson(w,p,'staged death');w.tick=b.gear!.readyAt;gearTick(w);const corpse=w.piles.find(b=>b.carcass)!;expect(corpse.carcass!.hhId).toBe(b.gear!.hhId);expect(corpse.carcass!.animalId).toBe(deer.id);expect(conservationReport(w).ok).toBe(true);
});

it('collects the household record rather than borrowing another household gear from a shared rack',()=>{
 const s=stage('gear-rack-ownership'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:126};
 const p=addPerson(s,'Ada',40.5,40.5),q=addPerson(s,'Bea',40.5,40.5),yard=building(s,'timber_yard',43,40,0,{});
 const other=mintTool(w,'net',0,q.hhId,yard.id,yard.store.items,q.id,'fixture',false);
 const mine=mintTool(w,'net',0,p.hhId,yard.id,yard.store.items,p.id,'fixture',false);
 const fish=makeSource(w,'fish_spot',41,40,3);done(s);learn(w,p,yard);learn(w,p,fish);
 const get=generateOptions(w,p,true,true).options.find(o=>o.key===`collect:${yard.id}:net`)!;expect(get).toBeDefined();startActivity(w,p,get.make!()!);finish(w,p);
 expect(mine.holder).toBe(p.id);expect(mine.loan).toBeNull();expect(other.holder).toBe(yard.id);
 const place=generateOptions(w,p,true,true).options.find(o=>o.key===`gear:place:${mine.id}:${fish.id}`);expect(place).toBeDefined();
});
it('does not plan collection of unusable foreign gear and keeps storage ownership',()=>{
 const s=stage('gear-foreign-stock'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:126};
 const p=addPerson(s,'Ada',40.5,40.5),q=addPerson(s,'Bea',40.5,40.5),yard=building(s,'timber_yard',43,40,0,{});
 mintTool(w,'net',0,q.hhId,yard.id,yard.store.items,q.id,'fixture',false);const mine=mintTool(w,'trap',0,p.hhId,p.id,p.inv,p.id,'fixture',false);
 const fish=makeSource(w,'fish_spot',41,40,3);done(s);learn(w,p,yard);learn(w,p,fish);
 expect(generateOptions(w,p,true,true).options.some(o=>o.key===`collect:${yard.id}:net`)).toBe(false);
 startActivity(w,p,newActivity(w,p,{kind:'deposit',label:'Store trap',goal:'store gear',here:true,targetId:yard.id,data:{items:{trap:1}}}));finish(w,p);
 expect(mine.ownerHh).toBe(p.hhId);expect(conservationReport(w).ok).toBe(true);
});

it('attributes a collected and eaten net fish without changing the saved world',()=>{
 const {w,p,fish,t}=scene(),observer=gearObserver(w);
 const run=()=>{for(let n=0;n<500&&p.activity;n++){observer.tick();w.tick++;stepActivity(w,p);}observer.tick();};
 act(w,p,fish.id,'place',t.id);run();const b=w.piles.find(b=>b.gear)!;w.tick=b.gear!.readyAt;gearTick(w);observer.tick();act(w,p,b.id,'check');run();
 const eat=generateOptions(w,p,true,true).options.find(o=>o.kind==='eat')!;startActivity(w,p,eat.make!()!);run();
 expect(observer.report().counts['direct catch fish eaten']).toBeGreaterThan(0);
 const saved=serializeWorld(w);observer.report();expect(serializeWorld(w)).toBe(saved);expect(conservationReport(w).ok).toBe(true);
});
it('uses dated personal gear stock but revalidates ownership on collection',()=>{
 const s=stage('gear-stock-race'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:126};const p=addPerson(s,'Ada',40.5,40.5),yard=building(s,'timber_yard',43,40,0,{}),fish=makeSource(w,'fish_spot',41,40,3),t=mintTool(w,'net',0,p.hhId,yard.id,yard.store.items,p.id,'fixture',false);done(s);learn(w,p,yard);learn(w,p,fish);
 const key=`collect:${yard.id}:net`;expect(generateOptions(w,p,true,true).options.some(o=>o.key===key)).toBe(true);
 t.ownerHh=999;const saved=serializeWorld(w),offer=generateOptions(w,p,true,true).options.find(o=>o.key===key)!;expect(offer).toBeDefined();expect(serializeWorld(w)).toBe(saved);
 startActivity(w,p,offer.make!()!);finish(w,p);expect(p.inv.net??0).toBe(0);expect(t.holder).toBe(yard.id);
 p.beliefs[yard.id].gearStock!.items.net=-1;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/gear observation/);
});

it('gear loans, rack checkout and returns respect actual receiving capacity',()=>{
 const s=scene(),{w,p,t}=s,q=addPerson(s,'Bea',40.5,40.5);q.inv.stone=30;snapshotInitial(w);
 expect(lendTool(w,t,p,q,w.tick+200)).toBe(false);expect(t.holder).toBe(p.id);
 delete q.inv.stone;expect(lendTool(w,t,p,q,w.tick+200)).toBe(true);p.inv.stone=30;
 expect(returnLoan(w,t,q,p)).toBe(false);expect(t.holder).toBe(q.id);
 const yard=building(s,'timber_yard',43,40,0,{}),net=mintTool(w,'net',0,0,yard.id,yard.store.items,0,'fixture',false);
 expect(checkoutFromRack(w,net,yard.store.items,p)).toBe(false);expect(net.holder).toBe(yard.id);
});
