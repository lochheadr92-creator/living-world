import {expect,it} from 'vitest';
import {correctedRouteScene} from './helpers/resolved_route';
import {canObtain} from '../src/sim/social';
import {currentFailure,noteFailure,waterBeliefId,learn,forget} from '../src/sim/knowledge';
import {fetchableFood} from '../src/sim/food_help';
import {rankWaterSpots} from '../src/sim/optutil';
import {pickNews} from '../src/sim/news';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';

it.each([76,77])('distinguishes physically corrected route history from material promise availability at rules %s',version=>{
 const {w,p,tree}=correctedRouteScene(version),f=p.failures[tree.id];
 expect(w.tick-f.tick).toBeLessThan(520);expect(f.resolved).toBe(true);expect(f.route?.events.map(e=>e.outcome)).toEqual(['failed','arrived']);
 expect(canObtain(w,p,'wood')).toBe(version===77);expect(conservationReport(w).ok).toBe(true);
 const raw=serializeWorld(w),twin=deserializeWorld(raw);expect(canObtain(twin,twin.persons.find(x=>x.id===p.id)!,'wood')).toBe(version===77);
 const ctx=generateOptions(w,p,true,true);describePerson(w,p.id);observeInhabitant(w,p,ctx,rankOptions(ctx));expect(serializeWorld(w)).toBe(raw);
 for(let n=0;n<800;n++){stepWorld(w);stepWorld(twin);}expect(serializeWorld(w)).toBe(serializeWorld(twin));expect(conservationReport(w).ok).toBe(true);
});

it('retains history but respects a subsequently reported failure and missing source knowledge',()=>{
 const {w,p,tree}=correctedRouteScene();expect(currentFailure(w,p,tree.id)).toBeUndefined();
 const b=p.beliefs[tree.id];delete p.beliefs[tree.id];expect(canObtain(w,p,'wood')).toBe(false);p.beliefs[tree.id]=b;
 noteFailure(w,p,tree.id,'nothing left');expect(currentFailure(w,p,tree.id)?.reason).toBe('nothing left');expect(canObtain(w,p,'wood')).toBe(false);expect(p.failures[tree.id].route).toBeDefined();
});

// Explicit unit boundaries: adapt beliefs/history to isolate each consumer, not additional physical journey evidence.
it.each([76,77])('uses corrected history consistently for food, water and depletion news at rules %s',version=>{
 const {w,p,tree}=correctedRouteScene(version),f=p.failures[tree.id],b={...p.beliefs[tree.id],kind:'berry_bush' as const};
 forget(p,tree.id);learn(p,b);expect(fetchableFood(w,p)).toBe(version===77?'berries':null);
 const water={...b,id:waterBeliefId(0),kind:'water' as const,x:20,y:15};learn(p,water);p.failures[water.id]=structuredClone(f);
 const ctx=generateOptions(w,p,true,true),spots=rankWaterSpots(ctx,100);expect(spots.some(s=>s.trouble>0)).toBe(version===76);
 b.amount=0;b.seen=w.tick;b.learned=w.tick;const listener=structuredClone(p);listener.id+=100;listener.x=60;listener.y=60;
 expect(pickNews(w,p,listener,100).some(x=>x.id===tree.id)).toBe(version===76);
 delete f.resolved;expect(fetchableFood(w,p)).toBe(null);expect(pickNews(w,p,listener,100).some(x=>x.id===tree.id)).toBe(true);
});
