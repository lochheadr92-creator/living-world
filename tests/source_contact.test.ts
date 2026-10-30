import {expect,it} from 'vitest';
import {sourceContactScene} from './helpers/source_contact';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import {conservationReport} from '../src/sim/economy';
import {handlerOf} from '../src/sim/activities';
import {addPerson} from './helpers/kit';
it('retains remembered stock after actual failed travel and explains the uncertainty',()=>{
 const f=sourceContactScene();expect(f.p.lastResult?.detail).toBe('no way to get there');expect(f.departure.phase).toBe('travel');expect(f.p.beliefs[f.tree.id]).toEqual(f.remembered);expect(f.p.payoff.wood?.sources).toBeUndefined();expect(f.p.log.some(l=>l.text.includes('current stock is unknown'))).toBe(true);expect(conservationReport(f.w).ok).toBe(true);
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);describePerson(f.w,f.p.id);observeInhabitant(f.w,f.p,ctx,rankOptions(ctx));expect(serializeWorld(f.w)).toBe(before);const twin=deserializeWorld(before);for(let n=0;n<600;n++){stepWorld(f.w);stepWorld(twin);}expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('does not change the travellers belief based on unseen remaining stock',()=>{
 const empty=sourceContactScene(75,true,true),stocked=sourceContactScene(75,true,false);expect(empty.p.beliefs[empty.tree.id]).toEqual(stocked.p.beliefs[stocked.tree.id]);expect(empty.p.failures[empty.tree.id]).toEqual(stocked.p.failures[stocked.tree.id]);expect(empty.p.payoff).toEqual(stocked.p.payoff);
});
it('still learns real empty stock after physical arrival',()=>{
 const f=sourceContactScene(75,false,true);expect(f.departure.phase).toBe('work');expect(f.p.lastResult?.outcome).toBe('failed');expect(f.p.beliefs[f.tree.id].amount).toBe(0);expect(f.p.beliefs[f.tree.id].seen).toBeGreaterThan(f.remembered.seen);expect(f.p.payoff.wood?.sources?.[0].empty?.count).toBe(1);expect(conservationReport(f.w).ok).toBe(true);
});
it('preserves rules-74 remote-refresh semantics for recorded worlds',()=>{
 const f=sourceContactScene(74);expect(f.p.beliefs[f.tree.id].amount).toBe(0);expect(f.p.beliefs[f.tree.id].seen).toBeGreaterThan(f.remembered.seen);
});
it('does not use an unvisited sources last-taker field to blame a nearby person',()=>{
 // Handler-boundary negative: the contest marker and last-taker metadata are deliberately staged, not an ordinary theft.
 for(const version of [74,75]){const f=sourceContactScene(version),q=addPerson(f.s,'Nearby person',f.p.x+1,f.p.y,{inv:{},age:35});f.tree.lastTaker=q.id;f.tree.lastTakeTick=f.w.tick;f.departure.data.contest=true;
  handlerOf('gather')!.onEnd!(f.w,f.p,f.departure,'failed','no way to get there');expect(!!f.p.relations[q.id]).toBe(version===74);
 }
});
