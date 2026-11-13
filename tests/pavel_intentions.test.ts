import {expect,it} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {DAY,DAYS_PER_YEAR} from '../src/sim/constants';
import {reviewIntentions,freeOf} from '../src/sim/intent';
import {makeCtx} from '../src/sim/optutil';
import {putBelief} from '../src/sim/knowledge';
import {wantedTool} from '../src/sim/options_work';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import type {Intention} from '../src/sim/types';

function scene(){
 const w=createWorld(currentWorldSettings('normal','meadow',{immigration:false}));
 const p=w.persons[0];p.birthTick=-71*DAYS_PER_YEAR*DAY;p.needs={hunger:100,thirst:100,energy:100,warmth:100,safety:100,social:100};
 p.inv={wood:2};p.beliefs={};p.bykind={};p.seen=[];p.stats.gathered=0;p.stats.built=0;p.stats.crafted=0;
 for(let n=1;n<=4;n++)putBelief(p,{id:90000+n,kind:n===4?'rock':'tree',amount:10,max:10,x:p.x+n,y:p.y,seen:w.tick,src:'seen',from:0,learned:w.tick});
 const plan:Intention={id:99991,kind:'tool',goal:'make a pick',since:0,until:2*DAY,status:'active',step:'get stone',stepKind:'get',stepItem:'stone',stepTarget:0,stepKey:null,aboutId:0,wants:{wood:2,stone:2},makes:'pick',sheltered:0,worked:0,blocked:'',reason:'',setAside:0,ended:0};
 p.intentions=[plan];return {w,p,plan};
}
it('reconsiders an impossible elder tool, releases its wood, and does not readopt it',()=>{
 const {w,p,plan}=scene();
 p.commitments.push({id:99992,requestId:0,kind:'deliver',to:w.persons[1].id,item:'wood',amount:1,delivered:0,siteId:0,made:0,deadline:4*DAY,status:'active'});
 const obligations=JSON.stringify(p.commitments);
 expect(freeOf(p,'wood')).toBe(0);
 reviewIntentions(makeCtx(w,p,true,true));
 expect(plan.status).toBe('dropped');expect(plan.reason).toContain('carry');expect(freeOf(p,'wood')).toBe(2);
 for(let n=0;n<4;n++){w.tick++;reviewIntentions(makeCtx(w,p,true,true));}
 expect(p.intentions.some(i=>i.kind==='tool'&&i.makes==='pick'&&i.status==='active')).toBe(false);
 expect(p.inv).toEqual({wood:2});expect(JSON.stringify(p.commitments)).toBe(obligations);
});
it('a real increase in carrying capacity makes the tool eligible again, also after loading',()=>{
 const {w,p}=scene();
 // rules 240 (wooden_spear.ts): every grown person without a spear wants one, at 1.9, ahead of a pick (skill ~0.9). The elder is
 // armed so that the spear does not stand in front of the pick; the test is of the pick and the basket's room.
 p.inv.spear=1;
 reviewIntentions(makeCtx(w,p,true,true));
 p.inv.basket=1;
 expect(wantedTool(makeCtx(w,p,true,true))).toBe('pick');
 w.tick+=DAY;reviewIntentions(makeCtx(w,p,true,true));
 expect(p.intentions.some(i=>i.kind==='tool'&&i.makes==='pick'&&i.status==='active')).toBe(true);
 const copy=deserializeWorld(serializeWorld(w));
 expect(wantedTool(makeCtx(copy,copy.persons.find(q=>q.id===p.id)!,true,true))).toBe('pick');
});
it('preserves the rules-116 impossible intention',()=>{
 const {w,p,plan}=scene();w.settings.rulesVersion=116;
 reviewIntentions(makeCtx(w,p,true,true));expect(plan.status).toBe('active');
});
