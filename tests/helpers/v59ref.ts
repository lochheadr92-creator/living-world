// Recorded at 78f01c9 (rules 59) before any rules-60 behaviour. Never update expected hashes for a successor.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {settingsForProfile} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
export function v59Continuation(){
 const digest=(world:ReturnType<typeof createWorld>)=>createHash('sha256').update(serializeWorld(world)).digest('hex');
 const out:Record<string,string>={};
 // the seam rules 60 changes is the ordinary review of a running activity, so two ordinary worlds are pinned: river and meadow
 for(const seed of ['river','meadow'] as const){
  const w=createWorld({...settingsForProfile('normal',seed,{dynamics:'rich',immigration:false}),rulesVersion:59});
  while(w.tick<5680)stepWorld(w);
  out[seed+'Saved']=digest(w);const copy=deserializeWorld(serializeWorld(w));
  while(w.tick<9600){stepWorld(w);stepWorld(copy);}
  out[seed+'Uninterrupted']=digest(w);out[seed+'Continued']=digest(copy);
 }
 return out;
}
