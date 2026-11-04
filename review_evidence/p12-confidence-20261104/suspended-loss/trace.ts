// Diagnostic: the rules-154 river suspended_scan loss. Reports the lost activity and the person's state around it.
import {createWorld} from '../../../src/sim/factory';
import {currentWorldSettings} from '../../../src/sim/profiles';
import {stepWorld} from '../../../src/sim/world';
import type {Activity} from '../../../src/sim/types';
const w=createWorld(currentWorldSettings('normal','river',{immigration:false}));
const ended=new Set<number>();w.hooks={onActivityEnd:(_p,a)=>ended.add(a.id)};
while(w.tick<11990){
 const before=new Map<number,Activity>();for(const p of w.persons)if(p.suspended)before.set(p.id,structuredClone(p.suspended));
 const tick=w.tick,acts=new Map(w.persons.map(p=>[p.id,p.activity?{id:p.activity.id,kind:p.activity.kind,label:p.activity.label,phase:p.activity.phase}:null]));
 stepWorld(w);
 for(const p of w.persons){const a=before.get(p.id);if(!a||p.activity?.id===a.id||p.suspended?.id===a.id||ended.has(a.id))continue;
  console.log(JSON.stringify({tick,person:p.id,name:p.name,alive:p.alive,lost:{id:a.id,kind:a.kind,label:a.label,phase:a.phase,data:a.data},activityBefore:acts.get(p.id),activityAfter:p.activity?{id:p.activity.id,kind:p.activity.kind,label:p.activity.label}:null,suspendedAfter:p.suspended?{id:p.suspended.id,kind:p.suspended.kind}:null,lastResult:p.lastResult},null,1));}
}
