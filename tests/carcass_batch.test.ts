import {expect,it} from 'vitest';
import {stage,addPerson,building,done,learn} from './helpers/kit';
import {makeWolf} from '../src/sim/wildlife';
import {makeCarcass} from '../src/sim/carcass';
import {generateOptions} from '../src/sim/decision';
import {startActivity,stepActivity} from '../src/sim/activities';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
function fixture(version=149){
 const s=stage('needed-carcass-batch'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:version};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:90,thirst:100,energy:100,inv:{berries:3}});
 const rack=building(s,'food_rack',43,40,p.hhId),deer=makeWolf(w,40.5,40.5,'deer');done(s);
 const body=makeCarcass(w,deer,p)!;learn(w,p,rack,body);w.weather.rain=0;p.seen=[];
 return {w,p,body};
}
function offer(s:ReturnType<typeof fixture>){return generateOptions(s.w,s.p,true,true).options.find(o=>o.key===`butcher:${s.body.id}:meat`)!;}
function ticks(s:ReturnType<typeof fixture>,n:number){for(let i=0;i<n;i++){s.w.tick++;stepActivity(s.w,s.p);}}
it('retains a recipe request for two portions and pays separately for each portion',()=>{
 const s=fixture(),o=offer(s),a=o.make!()!;expect(a.amount).toBe(2);startActivity(s.w,s.p,a);
 ticks(s,125);expect(s.p.inv.meat).toBe(1);expect(s.p.activity?.kind).toBe('butcher');
 ticks(s,130);expect(s.p.inv.meat).toBe(2);expect(s.body.carcass!.remaining.meat).toBe(2);
 expect(s.p.lastResult?.outcome).toBe('success');expect(conservationReport(s.w).ok).toBe(true);
});
it('preserves the paid first portion and partial second portion through save/load',()=>{
 const s=fixture();startActivity(s.w,s.p,offer(s).make!()!);ticks(s,150);
 const w=deserializeWorld(serializeWorld(s.w)),copy={w,p:w.persons[0],body:w.piles.find(b=>b.id===s.body.id)!};
 ticks(s,110);ticks(copy,110);expect(serializeWorld(w)).toBe(serializeWorld(s.w));expect(s.p.inv.meat).toBe(2);
});
it('rechecks ownership before recovering the next portion and reports partial work',()=>{
 const s=fixture();startActivity(s.w,s.p,offer(s).make!()!);ticks(s,125);s.body.carcass!.hhId+=999;ticks(s,1);
 expect(s.p.inv.meat).toBe(1);expect(s.p.lastResult?.outcome).toBe('partial');expect(s.body.carcass!.remaining.meat).toBe(3);
});
it('preserves single-portion butchery before rules 149',()=>{
 const s=fixture(148);startActivity(s.w,s.p,offer(s).make!()!);ticks(s,250);expect(s.p.inv.meat).toBe(1);expect(s.body.carcass!.remaining.meat).toBe(3);
});
