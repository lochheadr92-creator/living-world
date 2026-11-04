// STAGED contract for rules 155: a paused care acquisition cancelled because its purpose ended reaches the common ending
// (rules 116). Ordinary origin: the rules-154 river suspended_scan lost a suspended well-water fetch at tick 11,988.
import {it,expect} from 'vitest';
import {careSupplyScene} from './helpers/care_supply';
import {newActivity,cancelCareAcquisition} from '../src/sim/activities';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';

function paused(version:number){
 const f=careSupplyScene(version);const {w,helper,elder,grain}=f;
 helper.suspended=newActivity(w,helper,{kind:'gather',label:'Gathering grain for Eli',goal:'to obtain food for Eli',targetId:grain.id,targetType:'source',tx:grain.x,ty:grain.y,spotX:grain.x,spotY:grain.y,item:'grain',amount:1,data:{stype:'wild_grain',careSupply:{to:elder.id,seen:w.tick}}});
 const ended:{id:number;outcome:string;detail:string}[]=[];
 w.hooks={onActivityEnd:(_p,a,outcome,detail)=>ended.push({id:a.id,outcome,detail})};
 return {...f,held:helper.suspended,ended};
}

it('ends a paused care acquisition through the common path when its purpose ends',()=>{
 const f=paused(155);const seen=f.held.data.careSupply.seen;
 cancelCareAcquisition(f.w,f.helper,f.elder.id,seen,'Eli no longer needs it');
 expect(f.helper.suspended).toBeNull();
 expect(f.ended).toEqual([{id:f.held.id,outcome:'interrupted',detail:'Eli no longer needs it'}]);
 expect(conservationReport(f.w).ok).toBe(true);
});

it('leaves unrelated paused work alone, keeps rules 154 unchanged, and continues exactly after saving',()=>{
 const other=paused(155);other.held.data.careSupply={to:other.elder.id,seen:-1};
 cancelCareAcquisition(other.w,other.helper,other.elder.id,other.w.tick,'not this one');
 expect(other.helper.suspended?.id).toBe(other.held.id);expect(other.ended).toEqual([]);
 const old=paused(154);cancelCareAcquisition(old.w,old.helper,old.elder.id,old.held.data.careSupply.seen,'Eli no longer needs it');
 expect(old.helper.suspended).toBeNull();expect(old.ended).toEqual([]);
 const f=paused(155);delete f.w.hooks;const copy=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<300;i++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
});
