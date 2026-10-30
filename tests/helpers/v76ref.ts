// Immutable rules-76 ordinary, deferred approach, actual travel and corrected-use snapshots.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {repeatedRouteScene,complementaryRouteScene} from './route_learning';
import type {World} from '../../src/sim/types';
export function v76Continuation(){
 const digest=(w:World)=>createHash('sha256').update(serializeWorld(w)).digest('hex');
 const advance=(w:World,n:number)=>{const saved=digest(w),copy=deserializeWorld(serializeWorld(w));for(let t=0;t<n;t++){stepWorld(w);stepWorld(copy);}const uninterrupted=digest(w),continued=digest(copy);if(uninterrupted!==continued||!conservationReport(w).ok||!conservationReport(copy).ok)throw new Error('Invalid rules-76 reference');return {saved,uninterrupted,continued};};
 const w=createWorld({...currentWorldSettings('normal','meadow',{immigration:false}),rulesVersion:76});while(w.tick<6000)stepWorld(w);const ordinary=advance(w,3600);
 const f=repeatedRouteScene(76);if(f.p.failures[f.tree.id].route?.streak!==2)throw new Error('Missing repeated route failure');const deferred=advance(f.w,1000);
 const g=complementaryRouteScene();for(let n=0;n<6000&&!(g.p.activity?.kind==='gather'&&g.p.activity.targetId===g.tree.id&&g.p.activity.phase==='travel');n++)stepWorld(g.w);if(!g.p.activity?.data.routeAttempt)throw new Error('Missing recovery travel');const travel=advance(g.w,1200);
 while(g.w.tick<12000)stepWorld(g.w);if(!g.p.failures[g.tree.id].route?.corrected||!g.w.ledger.reasons['-crafting: basket']||!g.w.ledger.reasons['-crafting: hammer'])throw new Error('Missing corrected route and paid useful work');const correctedUse=advance(g.w,800);
 return {ordinary,deferred,travel,correctedUse};
}
