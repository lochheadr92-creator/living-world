import {expect,it} from 'vitest';
import {stage,addPerson,done,learn} from './helpers/kit';
import {makeSheep} from '../src/sim/livestock';
import {makeCarcass} from '../src/sim/carcass';
import {makeSource} from '../src/sim/sources';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld} from '../src/app/save';
import {delBelief} from '../src/sim/knowledge';
function scene(version=151){
 const s=stage('sheep-food-choice'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:version};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:30,thirst:95,energy:95});
 const ewe=makeSheep(w,41.5,40.5,'f');ewe.sheep!.hhId=p.hhId;ewe.sheep!.tether={x:ewe.x,y:ewe.y,condition:100};
 const grain=makeSource(w,'wild_grain',42,40,12);done(s);learn(w,p,ewe,grain);
 return {w,p,ewe,grain};
}
const slaughter=(s:ReturnType<typeof scene>)=>generateOptions(s.w,s.p,true,true).options.some(o=>o.key===`sheep:slaughter:${s.ewe.id}`);
it('uses a known faster food route before killing owned sheep, without observer mutation',()=>{
 const s=scene(),before=serializeWorld(s.w);expect(slaughter(s)).toBe(false);expect(serializeWorld(s.w)).toBe(before);
});
it('keeps emergency slaughter when no alternative is known or the known food is too far away',()=>{
 const s=scene();delBelief(s.p,s.grain.id);expect(slaughter(s)).toBe(true);
 learn(s.w,s.p,s.grain);s.p.beliefs[s.grain.id].x=200;expect(slaughter(s)).toBe(true);
});
it('does not peek at distant real food or ownership to change remembered choices',()=>{
 const s=scene();s.grain.amount=0;expect(slaughter(s)).toBe(false);
 learn(s.w,s.p,s.grain);expect(slaughter(s)).toBe(true);
});
it('recovers a known existing body before slaughtering another animal',()=>{
 const s=scene();delBelief(s.p,s.grain.id);const other=makeSheep(s.w,40.5,41.5,'m');
 const body=makeCarcass(s.w,other,s.p)!;learn(s.w,s.p,body);expect(slaughter(s)).toBe(false);
 s.p.beliefs[body.id].hh=s.p.hhId+100;expect(slaughter(s)).toBe(true);
});
it('preserves rules150 slaughter decisions',()=>{expect(slaughter(scene(150))).toBe(true);});
