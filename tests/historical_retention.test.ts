import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {retainOperationalMemory,setMemoryRetention} from '../src/sim/memory_retention';
import {generateOptions} from '../src/sim/decision';
import {expect,it} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {deceasedById} from '../src/sim/historical_index';
import {killPerson} from '../src/sim/lifecycle';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {makeSource,fellTree} from '../src/sim/sources';
import {stepWorld} from '../src/sim/world';
import {relationshipHistory} from '../src/sim/history';
import {relOf} from '../src/sim/relations';
it('preserves first-match history, appended deaths and full saved state while indexing',()=>{
 const s=stage('history-index'),w=done(s);const first={id:9000,name:'Original',tick:0,cause:'old age',age:80};
 w.deceased.push(first,{...first,name:'Duplicate'});const before=serializeWorld(w);
 expect(deceasedById(w,9000)).toBe(first);expect(deceasedById(w,9999)).toBeUndefined();expect(serializeWorld(w)).toBe(before);
 w.deceased.push({...first,id:9999});expect(deceasedById(w,9999)?.id).toBe(9999);
 const loaded=deserializeWorld(serializeWorld(w));expect(deceasedById(loaded,9000)).toEqual(first);
 w.deceased=[{...first,name:'Replaced'}];expect(deceasedById(w,9000)?.name).toBe('Replaced');
});
it('retains real death identity, kinship, relationship causes and graves after indexing and continuation',()=>{
 const s=stage('retained-family'),a=addPerson(s,'Parent',42,24),b=addPerson(s,'Child',45,24,{hh:a.hhId});const w=done(s);w.settings.dynamics='rich';w.settings.rulesVersion=25;
 const r=relOf(b,a.id);r.kin='parent';r.history.push({tick:0,text:'Recorded shared work'});killPerson(w,a,'staged death');
 const before=serializeWorld(w);expect(relationshipHistory(w,b).join(' ')).toContain('Parent');expect(deceasedById(w,a.id)?.cause).toBe('staged death');expect(serializeWorld(w)).toBe(before);
 const loaded=deserializeWorld(before);for(let i=0;i<90;i++){stepWorld(w);stepWorld(loaded);}expect(serializeWorld(w)).toBe(serializeWorld(loaded));
 expect(w.deceased).toHaveLength(1);expect(w.graves).toHaveLength(1);expect(b.relations[a.id].history[0].text).toBe('Recorded shared work');
});
it('bounds repeated cosmetic felling marks by tile while preserving legacy saves',()=>{
 for(const version of [24,25]){const s=stage('stump-retention'),w=done(s);w.settings.dynamics='rich';w.settings.rulesVersion=version;
  for(let i=0;i<20;i++){w.tick=i;fellTree(w,makeSource(w,'tree',40,30,0));}
  expect(w.stumps).toHaveLength(version===25?1:20);expect(w.stumps.at(-1)).toEqual({x:40,y:30,tick:19});
  const loaded=deserializeWorld(serializeWorld(w));expect(loaded.stumps).toEqual(w.stumps);
 }
});

it('removes only expired pair deadlines without changing offered choices or causal records',()=>{
 const s=stage('timer-retention'),a=addPerson(s,'Ada',42,24),b=addPerson(s,'Bea',44,24);const w=done(s);w.settings.dynamics='rich';w.settings.rulesVersion=25;w.tick=500;
 a.cooldowns={talk900:400,invite901:500,sorry902:300,propose903:0,'making:904':499,talk905:501,contestEvt:3,custom:4};
 const r=relOf(a,b.id);r.kin='sibling';r.history.push({tick:10,text:'actual work'});a.whereabouts[b.id]={x:44,y:24,tick:0};
 const options=()=>JSON.stringify(generateOptions(w,a,true,true).options);
 const before=options(),history=structuredClone(a.relations),where=structuredClone(a.whereabouts);
 retainOperationalMemory(w,a);expect(a.cooldowns).toEqual({talk905:501,contestEvt:3,custom:4});expect(options()).toBe(before);expect(a.relations).toEqual(history);expect(a.whereabouts).toEqual(where);
 w.settings.rulesVersion=24;a.cooldowns.talk900=1;retainOperationalMemory(w,a);expect(a.cooldowns.talk900).toBe(1);
});

it('preserves full natural continuation against the retention ablation apart from expired storage',()=>{
 const a=createWorld(currentWorldSettings('normal','meadow',{immigration:false})),b=deserializeWorld(serializeWorld(a));
 try{for(let i=0;i<1200;i++){setMemoryRetention(true);stepWorld(a);setMemoryRetention(false);stepWorld(b);}}
 finally{setMemoryRetention(true);}
 // Normalize only the deliberately disposable representation, not any causal state.
 for(const w of [a,b]){for(const p of w.persons)retainOperationalMemory(w,p);const marks=new Map(w.stumps.map(s=>[`${s.x},${s.y}`,s]));w.stumps=[...marks.values()];}
 expect(serializeWorld(a)).toBe(serializeWorld(b));
});
