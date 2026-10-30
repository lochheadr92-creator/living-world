// Immutable rules-74 ordinary and source-experience snapshots before successor reliability work.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,ledgerCreate} from '../../src/sim/economy';
import {observe} from '../../src/sim/knowledge';
import {journeyRecoveryScene,failJourneySource} from './journey_recovery';
import type {World} from '../../src/sim/types';
export function v74Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-74 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:74});while(w.tick<6000)stepWorld(w);if(!w.persons.some(p=>Object.values(p.payoff??{}).some(e=>e.sources?.length)))throw new Error('Missing ordinary source experience');const ordinary=advance(w,3600);
 const f=journeyRecoveryScene(74);failJourneySource(f);if(!f.p.payoff.wood?.sources?.[0].empty)throw new Error('Missing real empty visit');const empty=advance(deserializeWorld(serializeWorld(f.w)),2800);
 f.tree.amount=4;ledgerCreate(f.w,'wood',4,'staged corrective restock');observe(f.w,f.p,f.tree);if(f.p.payoff.wood.sources[0].empty.corrected===undefined)throw new Error('Missing firsthand correction');const corrected=advance(f.w,2800);
 const g=journeyRecoveryScene(74);failJourneySource(g);while(g.w.tick<4800)stepWorld(g.w);if(!g.p.payoff.wood?.sources?.some(e=>e.n>0)||!g.target.used.wood)throw new Error('Missing productive alternative and useful consumption');const productive=advance(g.w,1200);
 return {ordinary,empty,corrected,productive};
}
