import {expect,it} from 'vitest';
import {stage,addPerson,building,done,learn} from './helpers/kit';
import {startActivity,stepActivity,newActivity,abortActivity} from '../src/sim/activities';
import {conservationReport,produce} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
function scene(){const s=stage('nourishment-access'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:132};const p=addPerson(s,'Ada',40.5,40.5,{hunger:50}),q=addPerson(s,'Ben',40.5,40.5,{hunger:50}),store=building(s,'storehouse',41,40,0,{berries:1});done(s);learn(w,p,store);learn(w,q,store);return {w,p,q,store};}
it('only the person consuming the contested last portion gains nourishment',()=>{
 const {w,p,q,store}=scene();for(const person of [p,q])startActivity(w,person,newActivity(w,person,{kind:'eat_store',label:'Eat last portion',goal:'eat',here:true,targetId:store.id,targetType:'building',data:{limit:{portions:1}}}));
 for(let n=0;n<100&&(p.activity||q.activity);n++){w.tick++;if(p.activity)stepActivity(w,p);if(q.activity)stepActivity(w,q);}
 expect(w.ledger.consumed.berries).toBe(1);expect(p.nourishment!+q.nourishment!).toBeCloseTo(2.4,10);expect([p.nourishment,q.nourishment].filter(n=>n===0)).toHaveLength(1);expect(conservationReport(w).ok).toBe(true);
 const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
it('an interrupted bite gives no nutrition and leaves its unpaid portion in place',()=>{
 const {w,p,store}=scene();produce(w,p.inv,999,'stone',30,'staged full pack forces eating at store');startActivity(w,p,newActivity(w,p,{kind:'eat_store',label:'Eat',goal:'eat',here:true,targetId:store.id,targetType:'building',data:{limit:{portions:1}}}));
 w.tick++;stepActivity(w,p);expect(p.activity).not.toBeNull();expect(p.activity!.progress).toBeLessThan(p.activity!.duration);abortActivity(w,p,'staged danger interrupts eating');
 expect(p.nourishment).toBe(0);expect(p.needs.hunger).toBe(50);expect(store.store.items.berries).toBe(1);expect(w.ledger.consumed.berries??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
