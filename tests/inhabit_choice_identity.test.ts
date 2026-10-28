import {afterEach,expect,it} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {decide,generateOptions,rankOptions} from '../src/sim/decision';
import {abortActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {observeInhabitant} from '../src/agent/observe';
import {choiceKeys} from '../src/agent/choice_keys';
import {runLive,runReplay} from '../src/agent/run';
import {chooser} from './helpers/inhabit';
import {serializeWorld,deserializeWorld} from '../src/app/save';
afterEach(()=>setExternalController(null));
function fixture(){
 const w=createWorld(currentWorldSettings('town','meadow',{immigration:false}));
 while(w.tick<118)stepWorld(w);
 const p=w.persons.find(p=>p.name==='Odette')!;
 abortActivity(w,p,'STAGED decision boundary');p.nextThink=w.tick;
 return {w,p};
}
it('reproduces differing household/hunger offers and preserves the historical first-match interpretation',()=>{
 const {w,p}=fixture();const c=generateOptions(w,p,true,true),ranked=rankOptions(c);
 const hunger=ranked.find(o=>o.goal==='to ease hunger'&&ranked.filter(q=>q.key===o.key).length>1)!;
 expect(hunger).toBeTruthy();
 const legacy=observeInhabitant(w,p,c,ranked,{version:3});
 expect(legacy.options.filter(o=>o.key===hunger.key)).toHaveLength(2);
 setExternalController({controls:()=>true,choose:()=>({kind:'pick',key:hunger.key})});
 decide(w,p,'test legacy');expect(p.activity?.goal).toBe('to bring food home');
});
it('new public identities select the actual hunger alternative with its own amount and replay exactly',async()=>{
 const {w,p}=fixture();const initial=serializeWorld(w);
 const result=await runLive(w,p.id,chooser('choose-hunger',o=>{
  expect(new Set(o.options.map(o=>o.key)).size).toBe(o.options.length);
  // Fruit is the two-unit contract. Successor trajectories can offer berries
  // (three units) ahead of it; order is not the identity under test.
  const selected=o.options.find(o=>o.goal==='to ease hunger'&&o.label==='Picking fruit'&&o.key.includes('#choice:'))!;
  expect(selected.limits?.find(b=>b.field==='amount')?.max).toBe(2);
  return selected.key;
 }),{until:119});
 const active=result.world.persons.find(q=>q.id===p.id)!.activity!;
 expect(active.goal).toBe('to ease hunger (59/100)');expect(active.amount).toBe(2);
 expect(result.transcript.calls.find(c=>c.result?.status==='applied')!.result!.key).toContain('#choice:');
 expect(serializeWorld(runReplay(deserializeWorld(initial),result.transcript).world)).toBe(serializeWorld(result.world));
});
it('the engine rejects an index/key mismatch rather than selecting another offer',()=>{
 const {w,p}=fixture();let rejected=0;
 setExternalController({controls:()=>true,choose:()=>({kind:'pick',key:'not-offered',offerIndex:0}),notify:(_w,_p,n)=>{if(n.kind==='rejected')rejected++;}});
 decide(w,p,'test mismatch');expect(rejected).toBe(3);
});
it('public duplicate keys cannot collide with an existing generated-looking key',()=>{
 const keys=choiceKeys([{key:'gather:1'},{key:'gather:1'},{key:'gather:1#choice:0'}]);
 expect(new Set(keys).size).toBe(3);
});
