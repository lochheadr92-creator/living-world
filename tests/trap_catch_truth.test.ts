import {expect,it} from 'vitest';
import {stage,addPerson,done,learn} from './helpers/kit';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {makeSource} from '../src/sim/sources';
import {makeWolf} from '../src/sim/wildlife';
import {mintTool} from '../src/sim/tools';
import {startActivity,stepActivity,newActivity} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
import {gearTick} from '../src/sim/passive_gear';
import {carcassTick,CARCASS_LIFETIME} from '../src/sim/carcass';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {describeEntity} from '../src/sim/inspect';
function scene(){
 const s=stage('trap-window'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:CURRENT_RULES_VERSION};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:65,thirst:90,energy:90}),ground=makeSource(w,'tree',41,40,5),deer=makeWolf(w,42.5,41.5,'deer');
 const t=mintTool(w,'trap',0,p.hhId,p.id,p.inv,p.id,'staged initial gear',false);done(s);learn(w,p,ground,deer);
 startActivity(w,p,generateOptions(w,p,true,true).options.find(o=>o.key===`gear:place:${t.id}:${ground.id}`)!.make!()!);
 while(p.activity){w.tick++;stepActivity(w,p);}
 const pile=w.piles.find(b=>b.gear)!;w.tick++;gearTick(w);const body=w.piles.find(b=>b.carcass)!;expect(body).toBeDefined();
 function check(){startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:'Check trap',goal:'inspect catch',here:true,targetId:pile.id,targetType:'pile',data:{op:'check'}}));for(let n=0;n<100&&p.activity;n++){w.tick++;stepActivity(w,p);}expect(p.lastResult?.outcome).toBe('success');}
 return {w,p,pile,body,check};
}
it('reports a lost catch honestly after a paid check, without inventing a remaining body',()=>{
 const {w,p,pile,body,check}=scene();w.tick=body.since+CARCASS_LIFETIME;carcassTick(w);w.tick+=120;carcassTick(w);
 expect(w.byId.has(body.id)).toBe(false);check();
 expect(JSON.stringify(p.log)).toContain('Checked the trap: no recoverable catch remains.');
 expect(pile.gear!.bodyId).toBe(body.id);expect(conservationReport(w).ok).toBe(true);
 expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});
it('does not call an empty carcass awaiting cleanup recoverable in the inspector or check log',()=>{
 const {w,p,pile,body,check}=scene();w.tick=body.since+CARCASS_LIFETIME;carcassTick(w);
 const before=serializeWorld(w),view=describeEntity(w,pile.id)!;
 expect(view.subtitle).not.toContain('awaiting butchery');expect(JSON.stringify(view)).toContain('no recoverable parts');
 expect(describeEntity(w,body.id)!.subtitle).toBe('No recoverable parts remain');
 expect(JSON.stringify(describeEntity(w,body.id))).toContain('No usable parts remain');
 expect(serializeWorld(w)).toBe(before);check();expect(JSON.stringify(p.log)).toContain('no recoverable catch remains');
 expect(conservationReport(w).ok).toBe(true);
});
it('continues to describe a fresh body and preserves rules132 historical check wording',()=>{
 const {w,p,pile,body,check}=scene();check();expect(JSON.stringify(p.log)).toContain('a body needs butchering');
 expect(describeEntity(w,pile.id)!.subtitle).toBe('Body awaiting butchery');
 w.settings.rulesVersion=132;w.tick=body.since+CARCASS_LIFETIME;carcassTick(w);w.tick+=120;carcassTick(w);check();
 expect(p.log.at(-1)?.text).toBe('Checked the trap: a body needs butchering.');
});
it('keeps mid-check continuation exact and changes only the saved explanation relative to rules132',()=>{
 const {w,p,pile,body}=scene();w.tick=body.since+CARCASS_LIFETIME;carcassTick(w);w.tick+=120;carcassTick(w);
 startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:'Check trap',goal:'inspect catch',here:true,targetId:pile.id,targetType:'pile',data:{op:'check'}}));
 for(let n=0;n<20;n++){w.tick++;stepActivity(w,p);}
 const saved=serializeWorld(w),copy=deserializeWorld(saved),old=deserializeWorld(saved);old.settings.rulesVersion=132;
 const q=copy.persons.find(q=>q.id===p.id)!,o=old.persons.find(q=>q.id===p.id)!;
 for(let n=0;n<30;n++){w.tick++;copy.tick++;old.tick++;stepActivity(w,p);stepActivity(copy,q);stepActivity(old,o);}
 expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(p.log.at(-1)?.text).toContain('no recoverable catch');
 expect(o.log.at(-1)?.text).toContain('a body needs butchering');
 old.settings.rulesVersion=w.settings.rulesVersion;o.log.at(-1)!.text=p.log.at(-1)!.text;
 expect(serializeWorld(old)).toBe(serializeWorld(w));expect(conservationReport(w).ok).toBe(true);
});
