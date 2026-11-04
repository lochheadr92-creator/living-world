import {trapRecoveryScene} from '../../tests/helpers/trap_recovery';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {writeFileSync} from 'node:fs';
const reports=[];
for(const version of [151]){
 const {w,p,gear,body}=trapRecoveryScene(version),twin=deserializeWorld(serializeWorld(w));
 const events:unknown[]=[];let meals=0;
 w.hooks={onActivityStart(p,a){events.push({tick:w.tick,kind:a.kind,goal:a.goal,target:a.targetId,amount:a.amount});},onActivityEnd(p,a,outcome,detail){if(['butcher','gear_work'].includes(a.kind))events.push({tick:w.tick,end:a.kind,op:a.data.op,outcome,detail,cycles:a.cycle});},onNourishment(p,e){if(e.kind==='meal'&&p.activity?.kind==='eat'&&p.activity.data.food==='meat')meals++;}};
 for(let n=0;n<2400;n++){stepWorld(w);stepWorld(twin);}
 delete w.hooks;if(serializeWorld(w)!==serializeWorld(twin)||!conservationReport(w).ok)throw Error('Observer or conservation failure');
 reports.push({version,staged:true,autonomousAfterStart:true,meals,body:body.carcass,gear:gear.gear,events,ledger:w.ledger,exactTwin:true});
 console.log(JSON.stringify({version,meals,recovered:body.carcass!.recovered,cycles:gear.gear!.cycle}));
}
writeFileSync('survival_evidence/continuation-20261104/trap-final151.json',JSON.stringify(reports,null,2));
