import {afterEach,expect,it} from 'vitest';
import {ecologyScene,doEcologyOption} from './helpers/ecology';
import {conditionAt,updateEcology,rememberedConditionCost,setEcology,fieldResting,tendCondition} from '../src/sim/ecology';
import {gatherFromSource,conservationReport,consume,ledgerCreate,releaseClaims,invRoom} from '../src/sim/economy';
import {updateSources,makeSource,fellTree} from '../src/sim/sources';
import {createPlot,updatePlots} from '../src/sim/farming';
import {observe,estimatedAmount} from '../src/sim/knowledge';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describeEntity,describePerson} from '../src/sim/inspect';
import {observeInhabitant} from '../src/agent/observe';
import {stepWorld,hashWorld} from '../src/sim/world';
import {endActivity,stepActivity} from '../src/sim/activities';
import {DAY} from '../src/sim/constants';
import {T} from '../src/sim/types';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
afterEach(()=>setEcology(true));
it.each(['river','forest','meadow'])('preserves valid founder memories from before the world clock began: %s',seed=>{
 const w=createWorld(currentWorldSettings('normal',seed,{immigration:false}));expect(w.persons.some(p=>Object.values(p.beliefs).some(b=>b.ecology!==undefined&&b.seen<0))).toBe(true);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
it('charges only actual biological removal, including equal costs for split transfers; minerals stay finite',()=>{
 const f=ecologyScene(),{w,p,bush,other}=f;consume(w,p.inv,'fruit',4,'staged room');consume(w,p.inv,'water',4,'staged room');
 const twin=deserializeWorld(serializeWorld(w)),q=twin.persons[0],s=twin.sources.find(s=>s.id===bush.id)!;
 expect(gatherFromSource(w,bush,p,6)).toBe(6);for(let i=0;i<6;i++)gatherFromSource(twin,s,q,1);
 expect(conditionAt(w,bush.x,bush.y)).toBe(conditionAt(twin,s.x,s.y));expect(conditionAt(w,bush.x,bush.y)).toBeLessThan(1);
 expect(conditionAt(w,other.x,other.y)).toBe(1);const before=serializeWorld(w);expect(gatherFromSource(w,bush,p,1)).toBe(0);expect(serializeWorld(w)).toBe(before);
 const rock=makeSource(w,'rock',50,50,2);ledgerCreate(w,'stone',2,'staged finite deposit');gatherFromSource(w,rock,p,2);expect(conditionAt(w,50,50)).toBe(1);expect(rock.regrowEvery).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('comparable empty patches diverge after different real pressure and retain their condition across replacement and save',()=>{
 const {w,p,bush,other}=ecologyScene();consume(w,p.inv,'fruit',4,'staged room');consume(w,p.inv,'water',4,'staged room');
 gatherFromSource(w,bush,p,6);consume(w,p.inv,'berries',6,'staged consumption');gatherFromSource(w,other,p,1);
 // Equal current stocks isolates persistent condition from the inventory count; remove the control stock as a declared loss.
 consume(w,{berries:other.amount},'berries',other.amount,'staged control stock loss');other.amount=0;bush.regrowTimer=other.regrowTimer=0;w.weather.rain=0;
 for(let i=0;i<320;i++){w.tick++;updateSources(w);}expect(other.amount).toBe(1);expect(bush.amount).toBe(0);
 const saved=deserializeWorld(serializeWorld(w));expect(saved.ecology).toEqual(w.ecology);expect(conservationReport(w).ok).toBe(true);
 const tree=makeSource(w,'tree',54,54,1);ledgerCreate(w,'wood',1,'staged tree');gatherFromSource(w,tree,p,1);const c=conditionAt(w,54,54);fellTree(w,tree);makeSource(w,'tree',54,54,0,0.02);expect(conditionAt(w,54,54)).toBe(c);
});
it('uses dated coarse signs without seeing remote recovery, and inspector/AI/options are pure',()=>{
 const {w,p,bush}=ecologyScene();w.ecology={[bush.y*w.W+bush.x]:{condition:0.3,lastUse:w.tick}};observe(w,p,bush);const b=p.beliefs[bush.id];expect(b.ecology).toBe('worn');expect(rememberedConditionCost(w,b)).toBe(5);
 w.ecology[bush.y*w.W+bush.x].condition=1;expect(rememberedConditionCost(w,b)).toBe(5);
 const raw=serializeWorld(w),ctx=generateOptions(w,p,true,true);describeEntity(w,bush.id);describePerson(w,p.id);const now=observeInhabitant(w,p,ctx,rankOptions(ctx));expect(now.remembered.places.find(x=>x.id===bush.id)?.ecology).toContain('worn when observed');
 expect(observeInhabitant(w,p,ctx,rankOptions(ctx),{version:12}).remembered.places.find(x=>x.id===bush.id)?.ecology).toBeUndefined();expect(serializeWorld(w)).toBe(raw);
 observe(w,p,bush);expect(p.beliefs[bush.id].ecology).toBe('vigorous');expect(rememberedConditionCost(w,p.beliefs[bush.id])).toBe(0);
});
it('physically sows a real seed, persists soil across crops, and never resets it with crop care',()=>{
 const {w,p,a}=ecologyScene();const seed=p.inv.seeds!;doEcologyOption(w,p,`plant:${a.id}`);expect(a.state).toBe('growing');expect(p.inv.seeds).toBe(seed-1);expect(conditionAt(w,a.x,a.y)).toBe(0.84);expect(conservationReport(w).ok).toBe(true);
 const raw=serializeWorld(w),twin=deserializeWorld(raw);for(let n=0;n<150;n++){stepWorld(w);stepWorld(twin);}expect(serializeWorld(w)).toBe(serializeWorld(twin));
});
it('rest and real watered care recover different amounts under the same weather; drought and cold slow recovery',()=>{
 const {w,p,a,b}=ecologyScene();for(const pl of [a,b])w.ecology??={};for(const pl of [a,b])w.ecology![pl.y*w.W+pl.x]={condition:0.4,lastUse:w.tick};observe(w,p,a);observe(w,p,b);
 const water=p.inv.water!,seed=p.inv.seeds;const work=doEcologyOption(w,p,`tend:${a.id}`);expect(work.data.ecologyRest).toBe(true);expect(fieldResting(w,a)).toBe(true);expect(p.inv.water).toBe(water-1);expect(p.inv.seeds).toBe(seed);expect(conditionAt(w,a.x,a.y)).toBeCloseTo(0.44);
 expect(generateOptions(w,p,true,true).blocked.some(o=>o.targetId===a.id&&o.kind==='plant'&&o.blocked?.includes('rest'))).toBe(true);expect(conservationReport(w).ok).toBe(true);
 // Isolated environmental process comparison with declared stable mild weather, not ordinary-world benefit.
 const dry=deserializeWorld(serializeWorld(w));w.weather.temp=20;w.weather.rain=1;dry.weather.temp=0;dry.weather.rain=0;dry.hardship={kind:'dry',since:dry.tick,until:dry.tick+DAY};
 for(let n=0;n<DAY;n++){w.tick++;dry.tick++;updateEcology(w);updateEcology(dry);}expect(conditionAt(w,a.x,a.y)-0.44).toBeGreaterThan(conditionAt(w,b.x,b.y)-0.4);expect(conditionAt(w,a.x,a.y)).toBeGreaterThan(conditionAt(dry,a.x,a.y));
 const copy=deserializeWorld(serializeWorld(w));expect(copy.ecology).toEqual(w.ecology);expect(copy.plots[0].fallowUntil).toBe(a.fallowUntil);
});
it('interrupted field preparation keeps seed/water and releases the claim without starting a rest period',()=>{
 const {w,p,a}=ecologyScene();w.ecology={[a.y*w.W+a.x]:{condition:0.4,lastUse:w.tick}};observe(w,p,a);const inv={...p.inv};
 doEcologyOption(w,p,`tend:${a.id}`,()=>{for(let n=0;n<300&&p.activity?.phase==='travel';n++){w.tick++;stepActivity(w,p);}endActivity(w,p,'interrupted','staged interruption before finishing');});
 expect(a.fallowUntil).toBeUndefined();expect(p.inv).toEqual(inv);expect(a.claimedBy).toBe(0);expect(conditionAt(w,a.x,a.y)).toBe(0.4);
});
it('revalidates household permission on arrival and claim loss during physical work',()=>{
 const f=ecologyScene();doEcologyOption(f.w,f.p,`plant:${f.a.id}`,()=>{f.a.hhId=999;});expect(f.a.state).toBe('tilled');expect(f.p.lastResult?.detail).toContain('another household');expect(f.p.inv.seeds).toBe(6);
 const g=ecologyScene();doEcologyOption(g.w,g.p,`plant:${g.a.id}`,()=>{for(let n=0;n<300&&g.p.activity?.phase==='travel';n++){g.w.tick++;stepActivity(g.w,g.p);}releaseClaims(g.w,g.p.activity!.claims);});expect(g.a.state).toBe('tilled');expect(g.p.lastResult?.detail).toContain('claim');expect(g.p.inv.seeds).toBe(6);
});
it('does not recover covered ground or active crops; care cannot be double-credited',()=>{
 const {w,a}=ecologyScene();w.ecology={[a.y*w.W+a.x]:{condition:0.4,lastUse:0}};a.state='growing';w.tick=2*DAY;updateEcology(w);expect(conditionAt(w,a.x,a.y)).toBe(0.4);
 tendCondition(w,a,true);const c=conditionAt(w,a.x,a.y);tendCondition(w,a,true);expect(conditionAt(w,a.x,a.y)).toBe(c);expect(c).toBeCloseTo(0.44);
});
it('chooses a remembered healthier source and physically gathers there, while a removal retains the nearer-source choice',()=>{
 const {w,p,bush,other}=ecologyScene();consume(w,p.inv,'fruit',4,'staged hungry farmer without ready food');p.needs.hunger=40;
 w.ecology={[bush.y*w.W+bush.x]:{condition:0.3,lastUse:w.tick}};observe(w,p,bush);observe(w,p,other);
 const chosen=()=>rankOptions(generateOptions(w,p,true,true)).filter(o=>o.kind==='gather'&&o.need==='hunger')[0];
 expect(chosen().targetId).toBe(other.id);setEcology(false);expect(chosen().targetId).toBe(bush.id);setEcology(true);
 const act=doEcologyOption(w,p,chosen().key);expect(act.cycle).toBeGreaterThan(0);expect(conditionAt(w,other.x,other.y)).toBeLessThan(1);expect(p.beliefs[other.id].src).toBe('seen');expect(conservationReport(w).ok).toBe(true);
});
it('charges full-pack eating at a source exactly once per actually consumed unit',()=>{
 const {w,p,bush}=ecologyScene();for(const k of ['seeds','fruit','water'] as const)consume(w,p.inv,k,p.inv[k]??0,'staged full pack');p.inv.wood=6;ledgerCreate(w,'wood',6,'staged full pack');p.needs.hunger=35;
 expect(invRoom(w,p,'berries')).toBe(0);const before=w.ledger.consumed.berries??0;const act=doEcologyOption(w,p,`gather:${bush.id}`),ate=(w.ledger.consumed.berries??0)-before;
 expect(ate).toBeGreaterThan(0);expect(act.cycle).toBe(ate);expect(p.inv.berries).toBeUndefined();expect(conditionAt(w,bush.x,bush.y)).toBeCloseTo(1-Math.min(ate,3)*0.008-Math.max(0,ate-3)*0.035);expect(conservationReport(w).ok).toBe(true);
});
it('runs a whole crop through the physical world, harvests its actual output and resows without restoring soil',()=>{
 const {w,p,a}=ecologyScene();doEcologyOption(w,p,`plant:${a.id}`);p.cooldowns.pause=0;
 // After the declared first sowing, ordinary needs and choices run throughout growth.
 for(let n=0;n<18000&&a.state!=='ripe';n++)stepWorld(w);expect(p.alive).toBe(true);expect(a.state).toBe('ripe');const grown=a.stock;expect(grown).toBeGreaterThan(0);
 const harvest=doEcologyOption(w,p,`harvest:${a.id}`);expect(harvest.data.grain).toBe(grown);expect(a.state).toBe('tilled');const prior=conditionAt(w,a.x,a.y),seeds=p.inv.seeds!;
 doEcologyOption(w,p,`plant:${a.id}`);expect(a.state).toBe('growing');expect(p.inv.seeds).toBe(seeds-1);expect(conditionAt(w,a.x,a.y)).toBeLessThan(prior-0.15);
 // Declared hunger makes the crop's useful consumption test deterministic; it creates no food.
 p.needs.hunger=40;const before=w.ledger.consumed.grain??0;doEcologyOption(w,p,'eat:0');expect(w.ledger.consumed.grain??0).toBeGreaterThan(before);expect(conservationReport(w).ok).toBe(true);
 const twin=deserializeWorld(serializeWorld(w));for(let n=0;n<150;n++){stepWorld(w);stepWorld(twin);}expect(serializeWorld(w)).toBe(serializeWorld(twin));
});
it('does not learn unseen field condition after a failed tilling approach',()=>{
 const {w,p}=ecologyScene(),far=createPlot(w,70,40,p.hhId);observe(w,p,far);expect(p.beliefs[far.id].ecology).toBe('vigorous');w.ecology={[far.y*w.W+far.x]:{condition:0.3,lastUse:w.tick}};
 for(let y=0;y<w.H;y++)w.terrain[y*w.W+54]=T.DEEP;doEcologyOption(w,p,`till:${far.id}`);expect(p.lastResult?.outcome).toBe('failed');expect(p.beliefs[far.id].ecology).toBe('vigorous');expect(far.state).toBe('tilling');
});
it('identical standing crops produce different growth/yield from persistent soil, with accounted biological output',()=>{
 const {w,a,b}=ecologyScene();for(const pl of [a,b]){pl.state='growing';pl.progress=0.99;pl.care=pl.careAcc=0.9;}w.ecology={[a.y*w.W+a.x]:{condition:0.3,lastUse:w.tick}};w.weather.temp=20;w.weather.rain=0;w.light=1;
 let ripeA=0,ripeB=0;for(let n=0;n<300&&(!ripeA||!ripeB);n++){w.tick++;updatePlots(w);if(a.state==='ripe'&&!ripeA)ripeA=w.tick;if(b.state==='ripe'&&!ripeB)ripeB=w.tick;}
 expect(ripeA).toBeGreaterThan(ripeB);expect(a.stock).toBeLessThan(b.stock);expect(a.stock).toBeGreaterThan(0);expect(conservationReport(w).ok).toBe(true);
});
it('keeps previous rules and the isolated removal unchanged',()=>{
 for(const old of [true,false]){const {w,p,bush,a}=ecologyScene(old?85:86);if(!old)setEcology(false);gatherFromSource(w,bush,p,1);doEcologyOption(w,p,`plant:${a.id}`);expect(w.ecology).toBeUndefined();expect(p.beliefs[bush.id].ecology).toBeUndefined();expect(conditionAt(w,a.x,a.y)).toBe(1);}
});
it.each(['condition','future use','outside map','old rules','future rest','invalid sign'])('rejects malformed ecological saves: %s',kind=>{
 const {w,a,p,bush}=ecologyScene();w.ecology={[a.y*w.W+a.x]:{condition:0.4,lastUse:w.tick}};
 if(kind==='condition')w.ecology[a.y*w.W+a.x].condition=-1;if(kind==='future use')w.ecology[a.y*w.W+a.x].lastUse=w.tick+1;if(kind==='outside map')w.ecology[w.W*w.H]={condition:0.5,lastUse:w.tick};if(kind==='old rules')w.settings.rulesVersion=85;if(kind==='future rest')a.fallowUntil=w.tick+4*DAY;if(kind==='invalid sign')p.beliefs[bush.id].ecology='magic' as never;
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/ecological condition/);
});
