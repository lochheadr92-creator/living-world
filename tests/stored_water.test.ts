import {afterEach,expect,it} from 'vitest';
import {indoorCareScene} from './helpers/indoor_care';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {perceive} from '../src/sim/perception';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {produce,consume,conservationReport,weightOf} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {setStoredWater} from '../src/sim/stored_water_access';
import {delBelief} from '../src/sim/knowledge';
import {leaveHome,doorPoint} from '../src/sim/habitation';
import {solidChanged} from '../src/sim/registry';
import {abortActivity} from '../src/sim/activities';
afterEach(()=>setStoredWater(true));
function scene(version=67){
 const f=indoorCareScene(version);f.elder.needs.hunger=90;f.elder.needs.thirst=20;
 produce(f.w,f.elder.inv,carryCap(f.w,f.elder),'grain',100,'staged full pack');
 produce(f.w,f.home.store.items,f.home.store.cap,'water',2,'staged stored water');
 perceive(f.w,f.elder);abortActivity(f.w,f.elder,'staged rest ended before drinking choice');return {...f,key:`drink:store:${f.home.id}`};
}
it('drinks actual water from the owned store indoors despite a full pack, with pure observations and exact save continuation',()=>{
 const f=scene(),before=serializeWorld(f.w),ctx=generateOptions(f.w,f.elder,true,true);
 expect(observeInhabitant(f.w,f.elder,ctx,rankOptions(ctx)).options.some(o=>o.key===f.key)).toBe(true);
 expect(serializeWorld(f.w)).toBe(before);
 const load=weightOf(f.elder.inv),thirst=f.elder.needs.thirst;f.elder.nextThink=f.w.tick;stepWorld(f.w);
 expect(f.elder.activity?.data.fromStore).toBe(true);
 const copy=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<30&&f.elder.needs.thirst<thirst+5;n++){stepWorld(f.w);stepWorld(copy);}
 expect(f.elder.indoors).toBe(f.home.id);expect(f.home.store.items.water).toBe(1);
 expect(f.elder.needs.thirst).toBeGreaterThan(thirst+5);expect(f.elder.inv.water??0).toBe(0);
 expect(weightOf(f.elder.inv)).toBe(load);expect(f.w.ledger.reasons['-drunk']).toBe(1);
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['old','disabled','unknown','empty belief','foreign belief'] as const)('does not offer stored drinking for %s',why=>{
 const f=scene(why==='old'?66:67);
 if(why==='disabled')setStoredWater(false);
 if(why==='unknown')delBelief(f.elder,f.home.id);
 if(why==='empty belief')f.elder.beliefs[f.home.id].items!.water=0;
 if(why==='foreign belief')f.elder.beliefs[f.home.id].hh=999;
 const before=serializeWorld(f.w);expect(generateOptions(f.w,f.elder,true,true).options.some(o=>o.key===f.key)).toBe(false);
 expect(serializeWorld(f.w)).toBe(before);
});
it.each(['empty','ownership','interrupt'] as const)('revalidates %s before consuming water, even with new offers disabled',why=>{
 const f=scene(),chosen=selectPrerequisite(f.w,f.elder,f.key);chosen.restore();const thirst=f.elder.needs.thirst;
 if(why==='empty')consume(f.w,f.home.store.items,'water',2,'staged competing use');
 if(why==='ownership')f.home.hhId=999;
 if(why==='interrupt')abortActivity(f.w,f.elder,'staged interruption');
 setStoredWater(false);
 for(let n=0;n<30&&f.elder.activity?.id===chosen.act.id;n++)stepWorld(f.w);
 expect(f.elder.lastResult?.outcome).toBe(why==='interrupt'?'interrupted':'failed');
 if(why==='empty')expect(f.elder.beliefs[f.home.id].items?.water??0).toBe(0);
 expect(f.elder.needs.thirst).toBeLessThanOrEqual(thirst);expect(f.w.ledger.reasons['-drunk']??0).toBe(0);
 expect(conservationReport(f.w).ok).toBe(true);
});
it('uses the real entrance after a legal departure and consumes only after entering',()=>{
 const f=scene();expect(leaveHome(f.w,f.elder)).toBeNull();perceive(f.w,f.elder);
 const chosen=selectPrerequisite(f.w,f.elder,f.key);chosen.restore();
 for(let n=0;n<30&&(f.home.store.items.water??0)===2;n++)stepWorld(f.w);
 expect(f.elder.indoors).toBe(f.home.id);expect(f.home.store.items.water).toBe(1);expect(conservationReport(f.w).ok).toBe(true);
});
it.each([false,true])('walks back to known household water; blocked entrance=%s',blocked=>{
 const f=scene(),p=f.helper;
 // The elder also drinks during departure; provision enough actual water for both journeys.
 produce(f.w,f.home.store.items,f.home.store.cap,'water',4,'staged shared water reserve');
 perceive(f.w,p);expect(leaveHome(f.w,p)).toBeNull();
 const departure=selectPrerequisite(f.w,p,'wander');
 try{for(let n=0;n<50;n++)stepWorld(f.w);}finally{departure.restore();}
 abortActivity(f.w,p,'staged departure completed');
 const door=doorPoint(f.home);expect(Math.hypot(p.x-door.x,p.y-door.y)).toBeGreaterThan(3);
 p.needs.thirst=20; // staged need after actual movement; the following legal offered action is selected explicitly
 const choice=selectPrerequisite(f.w,p,f.key);
 if(blocked){f.w.solid[f.home.doorY*f.w.W+f.home.doorX]=1;solidChanged(f.w);}
 const copy=deserializeWorld(serializeWorld(f.w));
 try{for(let n=0;n<400&&p.activity?.id===choice.act.id;n++){stepWorld(f.w);stepWorld(copy);}}finally{choice.restore();}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 if(blocked){expect(p.lastResult?.detail).toBe('home entrance is blocked');expect(p.indoors??0).toBe(0);}
 else{expect(p.indoors).toBe(f.home.id);expect(p.needs.thirst).toBeGreaterThan(20);}
 expect(conservationReport(f.w).ok).toBe(true);
});
