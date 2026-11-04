// Diagnosis: does a save keep an emptied belief-kind list, and does the bykind key order survive a round trip?
import {stage,addPerson,done} from '../../tests/helpers/kit';
import {putBelief,delBelief} from '../../src/sim/knowledge';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
const s=stage('bykind-order');s.w.settings={...s.w.settings,dynamics:'rich'};const p=addPerson(s,'Sofia',40.5,40.5);done(s);
for(const k of Object.keys(p.bykind))delete (p.bykind as Record<string,unknown>)[k];for(const id of Object.keys(p.beliefs))delete p.beliefs[Number(id)];
putBelief(p,{id:900001,kind:'building',x:41,y:41,amount:0,max:0,seen:1,src:'seen',from:0,learned:1} as never);
delBelief(p,900001);
putBelief(p,{id:900002,kind:'clay_pit',x:42,y:41,amount:1,max:1,seen:1,src:'seen',from:0,learned:1} as never);
const live=JSON.stringify(p.bykind);
const copy=deserializeWorld(serializeWorld(s.w)),q=copy.persons.find(x=>x.id===p.id)!;
const loaded=JSON.stringify(q.bykind);
putBelief(p,{id:900003,kind:'building',x:43,y:41,amount:0,max:0,seen:2,src:'seen',from:0,learned:2} as never);
putBelief(q,{id:900003,kind:'building',x:43,y:41,amount:0,max:0,seen:2,src:'seen',from:0,learned:2} as never);
console.log(JSON.stringify({live,loaded,afterLive:Object.keys(p.bykind),afterLoaded:Object.keys(q.bykind),exactEqual:serializeWorld(s.w)===serializeWorld(copy)}));
