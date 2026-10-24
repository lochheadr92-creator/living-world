import {expect,it} from 'vitest';
import {economyFixture} from './helpers/settlement_economy';
import {gatherFromSource,transfer,conservationReport,snapshotInitial} from '../src/sim/economy';
import {economicHistory,personTown} from '../src/sim/settlement_economy';
import {startJob,shelveJob} from '../src/sim/facilities';
import {RECIPE_BY_ID} from '../src/sim/recipes';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describePerson} from '../src/sim/inspect';
import {DAY,WEIGHT} from '../src/sim/constants';
it('counts real extraction and completed batches, not raw holdings or an abandoned batch',()=>{
 const {w,a,source,yard,batch}=economyFixture();expect(w.economicObservations).toBeUndefined();
 expect(gatherFromSource(w,source,a,2)).toBe(2);expect(w.economicObservations!.production[0].items.wood).toBe(2);
 expect(startJob(w,yard,a,RECIPE_BY_ID.hew_planks,0,'unfinished')).toBeNull();shelveJob(w,yard,'interrupted');
 expect(w.economicObservations!.production.some(p=>p.kind==='workshop')).toBe(false);batch();
 expect(w.economicObservations!.production.find(p=>p.kind==='workshop')?.items.planks).toBe(1);expect(conservationReport(w).ok).toBe(true);
});
it('separates repeated productive activity from claims of assigned specialisation',()=>{
 const f=economyFixture();f.demonstrate();const town=personTown(f.w,f.a),other=personTown(f.w,f.b);
 expect(economicHistory(f.w,town).join(' ')).toContain('workshop: planks on 3 days');
 expect(economicHistory(f.w,other).join(' ')).toContain('No production recorded');
 expect(conservationReport(f.w).ok).toBe(true);
});
it('records only amounts actually moved across civic affiliations and labels returns as gross flows',()=>{
 const {w,a,b,source}=economyFixture();gatherFromSource(w,source,a,3);
 expect(transfer(w,a.inv,b.inv,1,'wood',3,`person:${a.id}`,`person:${b.id}`,'trade')).toBe(0);
 expect(w.economicObservations!.flows).toHaveLength(0);
 expect(transfer(w,a.inv,b.inv,WEIGHT.wood,'wood',3,`person:${a.id}`,`person:${b.id}`,'trade')).toBe(1);
 const moved=w.economicObservations!.flows[0].amount;
 transfer(w,b.inv,a.inv,100,'wood',moved,`person:${b.id}`,`person:${a.id}`,'trade rollback');
 expect(w.economicObservations!.flows).toHaveLength(2);expect(w.economicObservations!.flows[1].reason).toBe('trade rollback');
 expect(economicHistory(w,personTown(w,a)).join(' ')).toContain('not net trade');expect(conservationReport(w).ok).toBe(true);
});
it('history and inspectors are pure, and saves resume accounting without duplicating earlier output',()=>{
 const f=economyFixture();f.demonstrate();const before=serializeWorld(f.w);describePerson(f.w,f.a.id);economicHistory(f.w,personTown(f.w,f.a));expect(serializeWorld(f.w)).toBe(before);
 const loaded=deserializeWorld(before);expect(loaded.economicObservations).toEqual(f.w.economicObservations);
 const a=loaded.persons.find(p=>p.id===f.a.id)!,source=loaded.sources.find(s=>s.id===f.source.id)!;
 gatherFromSource(loaded,source,a,1);gatherFromSource(f.w,f.source,f.a,1);expect(serializeWorld(loaded)).toBe(serializeWorld(f.w));
});
it('retention bounds observer detail without deleting goods, people, title or founding records',()=>{
 const {w,a,b,source}=economyFixture();gatherFromSource(w,source,a,1);
 for(let i=0;i<150;i++){transfer(w,a.inv,b.inv,100,'wood',1,`person:${a.id}`,`person:${b.id}`,'given');transfer(w,b.inv,a.inv,100,'wood',1,`person:${b.id}`,`person:${a.id}`,'returned');}
 expect(w.economicObservations!.flows).toHaveLength(128);expect(conservationReport(w).ok).toBe(true);
 w.tick=DAY*9;gatherFromSource(w,source,a,1);expect(w.economicObservations!.production).toHaveLength(1);expect(w.persons).toHaveLength(2);expect(w.townships).toHaveLength(2);
});
it('historical rules do not create these observations, and malformed new records are refused',()=>{
 const {w,a,source}=economyFixture();w.settings.rulesVersion=20;gatherFromSource(w,source,a,1);expect(w.economicObservations).toBeUndefined();
 w.settings.rulesVersion=21;gatherFromSource(w,source,a,1);const raw=serializeWorld(w);expect(()=>deserializeWorld(raw.replace('"kind":"gathering"','"kind":"invented"'))).toThrow('Invalid production');
});
it('a capacity-limited harvest records only what left the actual plot',async()=>{
 const {createPlot}=await import('../src/sim/farming');const {harvestPlot}=await import('../src/sim/economy');const {carryCap}=await import('../src/sim/people');
 const {w,a}=economyFixture(),plot=createPlot(w,39,42,a.hhId);plot.state='ripe';plot.stock=20;plot.seedStock=2;snapshotInitial(w);
 const actual=harvestPlot(w,plot,a);expect(actual.grain).toBeLessThan(20);expect(actual.grain).toBeGreaterThan(0);
 expect(w.economicObservations!.production[0].items).toEqual({...actual.grain?{grain:actual.grain}:{},...actual.seeds?{seeds:actual.seeds}:{}});
 expect(plot.stock+actual.grain).toBe(20);expect(conservationReport(w).ok).toBe(true);expect(carryCap(w,a)).toBeGreaterThan(0);
});
it('observations neither alter ordinary choices nor consume RNG',async()=>{
 const {stepWorld}=await import('../src/sim/world');const {w}=economyFixture();const old=deserializeWorld(serializeWorld(w));old.settings.rulesVersion=20;
 for(let i=0;i<300;i++){stepWorld(w);stepWorld(old);}
 const comparable=deserializeWorld(serializeWorld(w));comparable.settings.rulesVersion=20;delete comparable.economicObservations;
 expect(serializeWorld(comparable)).toBe(serializeWorld(old));
});
