// STAGED diagnostic: fixed starting supplies, then ordinary unassigned decisions.
import {stage,addPerson,building,done,learn} from '../../tests/helpers/kit';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import {makeWolf} from '../../src/sim/wildlife';
import {makeCarcass} from '../../src/sim/carcass';
import {stepWorld} from '../../src/sim/world';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {conservationReport} from '../../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {writeFileSync} from 'node:fs';
const reports=[];
for(const mode of ['shelf','body','carried']){
 const s=stage('preserved-meat-autonomy'),w=s.w;
 w.settings={...w.settings,dynamics:'rich',rulesVersion:CURRENT_RULES_VERSION,immigration:false};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:90,thirst:100,energy:100,inv:{berries:3,...(mode==='carried'?{meat:2}:{})}});
 const rack=building(s,'food_rack',42,40,p.hhId,{wood:2,...(mode==='shelf'?{meat:4}:{})});
 const home=building(s,'hut',38,36,p.hhId);w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const deer=mode==='body'?makeWolf(w,41.5,40.5,'deer'):undefined;
 done(s);learn(w,p,rack,home);if(deer)makeCarcass(w,deer,p);
 const twin=deserializeWorld(serializeWorld(w));
 const events:unknown[]=[],samples:unknown[]=[];
 w.hooks={onActivityStart(p,a){events.push({tick:w.tick,kind:a.kind,target:a.targetId,goal:a.goal,data:structuredClone(a.data)});},onActivityEnd(p,a,outcome,detail){events.push({tick:w.tick,end:a.kind,outcome,detail});}};
 for(let n=0;n<3600;n++){
  if(n%120===0){const before=serializeWorld(w);const ctx=generateOptions(w,p,true,true);samples.push({tick:w.tick,inv:{...p.inv},needs:{...p.needs},rack:structuredClone(rack.store),job:structuredClone(rack.ops?.job),ranked:rankOptions(ctx).slice(0,5).map(o=>({key:o.key,utility:o.util,goal:o.goal})),preservation:ctx.options.filter(o=>o.preservesFood).map(o=>({key:o.key,utility:o.util,goal:o.goal})),blocked:ctx.blocked.filter(o=>/meat|rack|preserv/.test(o.label+' '+o.goal))});if(serializeWorld(w)!==before)throw Error('Impure preservation observation');}
  stepWorld(w);stepWorld(twin);
 }
 delete w.hooks;if(serializeWorld(w)!==serializeWorld(twin))throw Error('Preservation twin mismatch');
 reports.push({version:CURRENT_RULES_VERSION,exactTwin:true,mode,events,samples,ledger:w.ledger,conservation:conservationReport(w)});
 console.log(JSON.stringify({mode,created:w.ledger.created,consumed:w.ledger.consumed,actions:events.length,conserved:conservationReport(w).ok}));
}
writeFileSync('survival_evidence/continuation-20261104/preservation-final151.json',JSON.stringify(reports,null,2));
