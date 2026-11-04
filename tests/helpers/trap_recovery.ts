// STAGED real trap, work and deterministic catch; no invented meat or assigned future decisions.
import {stage,addPerson,done,learn} from './kit';
import {makeSource} from '../../src/sim/sources';
import {mintTool} from '../../src/sim/tools';
import {gearTick} from '../../src/sim/passive_gear';
import {startActivity,newActivity,stepActivity} from '../../src/sim/activities';
import {makeWolf} from '../../src/sim/wildlife';
import {hashString,hashUnit} from '../../src/sim/rng';
export function trapRecoveryScene(version:number){
 const s=stage('trap-recovery'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:version};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:80,thirst:100,energy:100,inv:{berries:3}}),tree=makeSource(w,'tree',41,40,5);
 const t=mintTool(w,'trap',0,p.hhId,p.id,p.inv,p.id,'staged initial trap',false);done(s);
 startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:'Set trap',goal:'staged placement',here:true,targetId:tree.id,targetType:'source',data:{op:'place',toolId:t.id},maxTicks:400}));
 for(let n=0;n<400&&p.activity;n++){w.tick++;stepActivity(w,p);}
 const gear=w.piles.find(b=>b.gear)!;if(!gear)throw Error('Trap placement failed');
 let deer=makeWolf(w,41,41,'deer');
 while(hashUnit(hashString(w.seed)^0x79ae,gear.id+gear.gear!.cycle,deer.id)>=.55)deer=makeWolf(w,41,41,'deer');
 for(const a of w.animals)if(a!==deer){a.x=60;a.y=60;}
 w.tick++;gearTick(w);const body=w.piles.find(b=>b.carcass)!;if(!body)throw Error('No staged catch');
 startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:'Check trap',goal:'staged check',here:true,targetId:gear.id,targetType:'pile',data:{op:'check'},maxTicks:400}));
 for(let n=0;n<400&&p.activity;n++){w.tick++;stepActivity(w,p);}
 learn(w,p,gear,body);p.seen=[];return {w,p,gear,body};
}
