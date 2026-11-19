import {writeFileSync,readFileSync} from 'node:fs';
import {argsOf,worldFromArgs} from './world_args';
import {whereIs,type Ctx} from '../src/sim/optutil';
import {hashWorld,stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import type {Activity,Person} from '../src/sim/types';
const {opt}=argsOf(process.argv),{w,startDay}=worldFromArgs(opt);
const ref=JSON.parse(readFileSync('review_evidence/social-reach/'+w.seed+'.json','utf8'));
const state=(p:Person)=>({id:p.id,name:p.name,x:p.x,y:p.y,space:p.indoors??0,activity:p.activity?.kind});
function departure(ctx:Ctx,a:Activity){
 const p=ctx.p,q=w.byId.get(a.targetId);
 if(q?.ent!=='person')throw Error('Missing target');
 const loc=whereIs(ctx,q.id),memory=p.whereabouts[q.id];
 return {id:a.id,tick:w.tick,visitor:state(p),target:state(q),loc,memory:memory?{...memory}:null,
   spot:[a.spotX,a.spotY],purpose:a.goal,seen:ctx.seenPersons.some(s=>s.id===q.id)};
}
const active=new Map<number,ReturnType<typeof departure>>(),rows:object[]=[];
Object.assign(globalThis,{visitChoice(ctx:Ctx,a:Activity){active.set(a.id,departure(ctx,a));}});
w.hooks={onActivityEnd(p,a,result,detail){
 const start=active.get(a.id),q=w.byId.get(a.targetId);
 if(!start||q?.ent!=='person')return;
 rows.push({...start,end:w.tick,result,detail,endVisitor:state(p),endTarget:state(q),endSpot:[a.spotX,a.spotY],phase:a.phase});
 active.delete(a.id);
}};
if(startDay!==96||w.settings.rulesVersion!==259)throw Error('Wrong start');
for(let i=0;i<2400;i++)stepWorld(w);
if(hashWorld(w)!==ref.end||!conservationReport(w).ok)throw Error('Replay mismatch');
writeFileSync(opt('out',''),JSON.stringify({seed:w.seed,endHash:ref.end,rows},null,1));
