// STAGED contracts for rules 158: a hunger-serving gather yields to eating food in the pack when that scores higher.
// Ordinary origin: Eli (river, rules 157) fished on from hunger 8 to 0 with a fish in the pack.
import {afterEach,expect,it} from 'vitest';
import {stage,addPerson,done,learn} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {newActivity,startActivity} from '../src/sim/activities';
import {generateOptions,rankOptions,reviewActivity} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {parseIntervention} from '../scripts/lab/lab';
import {EAT_IN_HAND_REASON,setEatInHand} from '../src/sim/eat_in_hand';
afterEach(()=>setEatInHand(true));

function scene(rules:number,needs:{hunger:number;thirst:number}){
 const s=stage('eat-in-hand');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:rules};
 const p=addPerson(s,'Basil',40.5,40.5,{...needs,energy:90,inv:{berries:3}});
 const bush=makeSource(s.w,'berry_bush',52,40,6);done(s);learn(s.w,p,bush);
 const act=newActivity(s.w,p,{kind:'gather',label:'Picking berries',goal:'to ease hunger',need:'hunger',targetId:bush.id,targetType:'source',tx:bush.x,ty:bush.y,spotX:bush.x-0.5,spotY:bush.y+0.5,item:'berries',amount:3,maxTicks:1200});
 act.data.optKey=`gather:${bush.id}`;startActivity(s.w,p,act);
 return {w:s.w,p,bush};
}

it('stops a hunger gather to eat food in the pack, with the reason, conserving goods',()=>{
 const f=scene(158,{hunger:12,thirst:90});
 reviewActivity(f.w,f.p);
 expect(f.p.activity?.kind).toBe('eat');
 expect(f.p.lastResult?.detail).toBe(EAT_IN_HAND_REASON);
 for(let i=0;i<200&&f.p.activity?.kind==='eat';i++)stepWorld(f.w);
 expect(f.p.needs.hunger).toBeGreaterThan(12);expect(f.p.inv.berries??0).toBeLessThan(3);
 expect(conservationReport(f.w).ok).toBe(true);
});

it('leaves the gather alone when it still scores as well, when its option is gone, when thirst is deadlier, under rules 157 and under the lab removal',()=>{
 const calm=scene(158,{hunger:40,thirst:90});const cctx=generateOptions(calm.w,calm.p,false),own=cctx.options.find(o=>o.key===calm.p.activity!.data.optKey),eat=rankOptions(cctx).find(o=>o.kind==='eat');
 reviewActivity(calm.w,calm.p);if(!own||!eat||eat.util<=own.util)expect(calm.p.lastResult?.detail).not.toBe(EAT_IN_HAND_REASON);
 const gone=scene(158,{hunger:12,thirst:90});gone.p.activity!.data.optKey='gather:no-longer-offered';reviewActivity(gone.w,gone.p);expect(gone.p.lastResult?.detail).not.toBe(EAT_IN_HAND_REASON);
 const dry=scene(158,{hunger:12,thirst:8});reviewActivity(dry.w,dry.p);expect(dry.p.activity?.kind).not.toBe('eat');
 const old=scene(157,{hunger:12,thirst:90});reviewActivity(old.w,old.p);expect(old.p.lastResult?.detail).not.toBe(EAT_IN_HAND_REASON);
 const restore=parseIntervention('rich-no-eat-in-hand').install!();
 try{const off=scene(158,{hunger:12,thirst:90});reviewActivity(off.w,off.p);expect(off.p.lastResult?.detail).not.toBe(EAT_IN_HAND_REASON);}finally{restore();}
});

it('continues exactly after saving mid-gather',()=>{
 const f=scene(158,{hunger:30,thirst:90}),copy=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<900;i++){stepWorld(f.w);stepWorld(copy);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
