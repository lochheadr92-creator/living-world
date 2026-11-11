import {expect,it} from 'vitest';
import {stage,addPerson,done,pin} from './helpers/kit';
import {DAY} from '../src/sim/constants';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {newRelation} from '../src/sim/relations';
import {perceive} from '../src/sim/perception';
import {generateOptions} from '../src/sim/decision';
import {startActivity,endActivity,newActivity} from '../src/sim/activities';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {relationshipHistory} from '../src/sim/history';
import {setChildhood} from '../src/sim/childhood_rules';
import {updateConversations} from '../src/sim/social';
import {makeCtx} from '../src/sim/optutil';
import {socialOptions} from '../src/sim/options_social';
import {think} from '../src/sim/mood';
import {agoText} from '../src/sim/inspect';
import {observedAge} from '../src/agent/time_text';
import {interactionViews} from '../src/sim/inspect_work';
import type {ChildTime} from '../src/sim/childhood';

function scene(kind:ChildTime='play_together',kin=true){
 const s=stage('childhood'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;w.tick=DAY;
 const p=addPerson(s,'Talia',40,40,{age:8,traits:{sociability:0.9,curiosity:0.9}});
 const q=addPerson(s,kind==='play_together'?'Wes':'Yara',41.5,40,{age:kind==='play_together'?10:35,traits:{sociability:0.9}});
 done(s);for(const x of [p,q])x.needs={hunger:95,thirst:95,energy:95,warmth:95,safety:95,social:90};
 p.skills.forage=0.9;q.skills.forage=1.2;
 p.relations[q.id]={...newRelation(),affinity:60,trust:40,familiarity:5,kin:kin?(kind==='play_together'?'sibling':'parent'):''};
 q.relations[p.id]={...newRelation(),affinity:60,trust:40,familiarity:5,kin:kin?(kind==='play_together'?'sibling':'child'):''};
 pin(q);perceive(w,p);
 const offer=()=>generateOptions(w,p,true,true).options.find(o=>o.key===`socialize:${q.id}:${kind}`);
 const reach=()=>{const o=offer();expect(o).toBeTruthy();startActivity(w,p,o!.make!()!);for(let i=0;i<200&&!w.conversations[0]?.childhood;i++)stepWorld(w);return w.conversations[0];};
 return {w,p,q,offer,reach};
}
it.each(['family_time','play_together','learn_foraging'] as ChildTime[])('pays shared time, remembers %s and continues exactly through save/load',kind=>{
 const {w,p,q,reach}=scene(kind);const c=reach();expect(c?.childhood?.outcome).toBe('sharing');
 expect(p.relations[q.id].childhood).toBeUndefined();expect(p.skills.forage).toBe(0.9);
 const copy=deserializeWorld(serializeWorld(w));expect(serializeWorld(copy)).toBe(serializeWorld(w));
 for(let n=0;n<200&&p.convId;n++){stepWorld(w);stepWorld(copy);}
 expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(hashWorld(copy)).toBe(hashWorld(w));
 expect(p.relations[q.id].childhood).toEqual([{kind,last:c.childhood!.until,times:1}]);
 expect(p.lastInteraction?.outcome).toContain('completed');expect(p.lastResult?.detail).toContain('completed');
 expect(p.skills.forage).toBe(kind==='learn_foraging'?0.925:0.9);
 expect(relationshipHistory(w,p).join(' ')).toContain('remembered occasion');
 expect(generateOptions(w,p).options.some(o=>o.key.endsWith(':'+kind))).toBe(false);
 expect(conservationReport(w).ok).toBe(true);
});
it('offers play with a child outside the family, without revealing remote people or skills',()=>{
 const {w,p,q,offer}=scene('play_together',false);expect(offer()).toBeTruthy();
 q.x=80;perceive(w,p);expect(offer()).toBeUndefined();
 // This lesson is pinned to rules 208: it stages a grown person who forages worse than the child and is expected to decline. From rules 210
 // (shown.ts) such a teacher shows fishing or farming instead, where they know more; tests/shown.test.ts holds that case and its contrast.
 const lesson=scene('learn_foraging');lesson.w.settings.rulesVersion=208;lesson.q.skills.forage=0.7;expect(lesson.offer()).toBeTruthy();
 lesson.reach();for(let n=0;n<60&&lesson.p.convId;n++)stepWorld(lesson.w);
 expect(lesson.p.lastInteraction?.outcome).toBe('invitation declined');expect(lesson.p.skills.forage).toBe(0.9);
 expect(lesson.p.relations[lesson.q.id].childhood).toBeUndefined();
});
it('completes paid play with a child outside the family and remembers that relationship',()=>{
 const {w,p,q,reach}=scene('play_together',false);reach();
 for(let n=0;n<200&&p.convId;n++)stepWorld(w);
 expect(p.relations[q.id].kin).toBe('');expect(p.relations[q.id].childhood?.[0].kind).toBe('play_together');
 expect(p.lastInteraction?.outcome).toBe('A guessing game completed');expect(conservationReport(w).ok).toBe(true);
});
it.each(['separation','urgent need','interrupted'] as const)('does not award a lesson interrupted by %s',why=>{
 const {w,p,q,reach}=scene('learn_foraging');reach();for(let i=0;i<30;i++)stepWorld(w);
 if(why==='separation')q.x=80;else if(why==='urgent need')q.needs.thirst=1;else endActivity(w,p,'interrupted','needed to leave');
 updateConversations(w);expect(p.skills.forage).toBe(0.9);expect(p.relations[q.id].childhood).toBeUndefined();expect(p.lastInteraction?.outcome).toBe('time together unfinished');
});
it('keeps observer calls pure, old rules and the lab removal unchanged, and urgent relief first',()=>{
 const {w,p,offer}=scene();const before=serializeWorld(w);for(let i=0;i<3;i++)offer();expect(serializeWorld(w)).toBe(before);
 w.settings.rulesVersion=119;expect(offer()).toBeUndefined();w.settings.rulesVersion=CURRENT_RULES_VERSION;
 try{setChildhood(false);expect(offer()).toBeUndefined();}finally{setChildhood(true);}
 p.needs.thirst=2;expect(offer()).toBeUndefined();
});
it('rejects malformed or predecessor childhood evidence and fingerprints paid progress',()=>{
 const {w,p,q,reach}=scene();const c=reach(),h=hashWorld(w);c.childhood!.until++;expect(hashWorld(w)).not.toBe(h);
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow('Invalid childhood session');c.childhood!.until--;
 p.relations[q.id].childhood=[{kind:'play_together',times:1,last:w.tick+1}];expect(()=>deserializeWorld(serializeWorld(w))).toThrow('Invalid childhood experience');
});
it('does not treat a distant remembered danger as danger at the play place',()=>{
 const {w,p}=scene();const ctx=makeCtx(w,p,true,true);
 // The options see personal knowledge only; the wolf need not still exist there.
 ctx.dangers=[{id:999,kind:'wolf',x:80,y:80,seen:w.tick,source:'seen'} as any];
 socialOptions(ctx);expect(ctx.options.some(o=>o.key.endsWith(':play_together'))).toBe(true);
 ctx.options=[];ctx.dangers[0].x=p.x+3;ctx.dangers[0].y=p.y;socialOptions(ctx);
 expect(ctx.options.some(o=>o.key.endsWith(':play_together'))).toBe(false);
});
it('lets another child decline repeated play at actual contact without credit',()=>{
 const {w,p,q,reach}=scene();q.cooldowns['child:play_together']=w.tick+DAY;
 const c=reach();expect(c.childhood?.outcome).toBe('declined');
 for(let i=0;i<70&&p.convId;i++)stepWorld(w);
 expect(p.lastInteraction?.detail).toContain('already had that time');expect(p.relations[q.id].childhood).toBeUndefined();
});
it('offers a crowded child a local quiet place and honours their boundary on casual talk',()=>{
 const {w,p,q}=scene();p.traits.sociability=0.1;p.crowd=450;think(w,p,'crowded',-6,DAY/2,'has had too much company');
 const o=generateOptions(w,p,true,true).options.find(o=>o.key==='alone');expect(o).toBeTruthy();
 const a=o!.make!()!;expect(Math.hypot(a.tx-p.x,a.ty-p.y)).toBeLessThan(12);expect(p.explored[Math.floor(a.ty)*w.W+Math.floor(a.tx)]).toBe(1);
 think(w,p,'quiet',6,DAY/2,'had some time alone');expect(generateOptions(w,p).options.some(o=>o.key==='alone')).toBe(false);
 // Contact at the start of chosen quiet; no forced movement to manufacture a quiet ending.
 startActivity(w,p,newActivity(w,p,{kind:'alone',label:'Quiet time',goal:'some quiet',here:true}));
 delete q.cooldowns.pause;
 startActivity(w,q,newActivity(w,q,{kind:'socialize',label:'Chat',goal:'chat',here:true,targetId:p.id,targetType:'person',data:{purpose:'chat'}}));
 for(let i=0;i<10&&!q.lastResult;i++)stepWorld(w);expect(q.lastResult?.detail).toContain('wanted to finish some quiet time');expect(p.activity?.kind).toBe('alone');
 startActivity(w,q,newActivity(w,q,{kind:'socialize',label:'Warning',goal:'warn',here:true,targetId:p.id,targetType:'person',data:{purpose:'warn'}}));stepWorld(w);
 expect(q.lastResult?.label==='Warning'?q.lastResult.detail:'').not.toContain('quiet');
});
it('uses world-clock ages in both inspector paths while preserving old controller wording',()=>{
 const {w,p,q}=scene();w.tick=5000;p.lastInteraction={tick:4800,partner:q.id,purpose:'family_time',role:'asked',outcome:'completed',detail:''};
 const before=serializeWorld(w);expect(agoText(w,4800)).toBe('2 world h ago');expect(interactionViews(w,p).previous?.when).toBe('2 world h ago');
 expect(observedAge(w,5,4950)).toBe('5s ago');expect(serializeWorld(w)).toBe(before);
 w.settings.rulesVersion=119;expect(agoText(w,4800)).toBe('20s ago');
});
