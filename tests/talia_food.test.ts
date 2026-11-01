import {expect,it} from 'vitest';
import {stage,addPerson,building,done} from './helpers/kit';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observe} from '../src/sim/knowledge';
import {startActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {prepareRoutine} from '../src/sim/daily_routines';
import {setChildhood} from '../src/sim/childhood_rules';
import {BUILD_DEF} from '../src/sim/constants';

function child(version=CURRENT_RULES_VERSION){const s=stage('talia-food');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;
 const p=addPerson(s,'Talia',40,40,{age:8,inv:{berries:1,seeds:1,fish:2},hunger:94,thirst:90,energy:93});
 const home=building(s,'hut',45,40,p.hhId);done(s);observe(s.w,p,home);return {w:s.w,p,home};}
it('lets a child physically deliver one food surplus from a nearly full small pack',()=>{
 const {w,p,home}=child();const o=rankOptions(generateOptions(w,p,true)).find(o=>o.key===`deposit:${home.id}:food`);
 expect(o).toBeTruthy();startActivity(w,p,o!.make!()!);
 for(let n=0;n<400&&p.activity;n++)stepWorld(w);
 expect(home.store.items.fish).toBe(1);expect(p.inv.fish).toBe(1);expect(p.inv.berries).toBe(1);expect(p.lastResult?.outcome).toBe('success');expect(conservationReport(w).ok).toBe(true);
});
it('does not donate a promised fish or grant access to another household store',()=>{
 const {w,p,home}=child();p.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',to:999,item:'fish',amount:2,delivered:0,siteId:0,made:w.tick,deadline:w.tick+2400,status:'active',contrib:0});
 expect(generateOptions(w,p).options.some(o=>o.key===`deposit:${home.id}:food`)).toBe(false);
 p.commitments=[];p.beliefs[home.id].hh=999;expect(generateOptions(w,p).options.some(o=>o.key===`deposit:${home.id}:food`)).toBe(false);
});
it('keeps the predecessor food offers unchanged',()=>{const {w,p,home}=child(117);expect(generateOptions(w,p).options.some(o=>o.key===`deposit:${home.id}:food`)).toBe(false);});
it('lets a hungry child eat their own food despite a sibling, with the old rule retained by the lab removal',()=>{
 const s=stage('child-breakfast');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=CURRENT_RULES_VERSION;
 const p=addPerson(s,'Talia',40,40,{age:8,inv:{berries:2},hunger:45});addPerson(s,'Wes',41,40,{age:10,hh:p.hhId});done(s);
 const offered=()=>generateOptions(s.w,p,true).options.find(o=>o.key==='eat:0');expect(offered()).toBeTruthy();
 try{setChildhood(false);expect(offered()).toBeUndefined();}finally{setChildhood(true);}
 startActivity(s.w,p,offered()!.make!()!);for(let n=0;n<100&&p.activity;n++)stepWorld(s.w);
 expect(p.needs.hunger).toBeGreaterThan(45);expect(conservationReport(s.w).ok).toBe(true);
});
it('checks remembered space and actual changed capacity before a home transfer',()=>{
 const {w,p,home}=child();p.beliefs[home.id].items={wood:BUILD_DEF.hut.cap};
 expect(generateOptions(w,p).options.some(o=>o.key===`deposit:${home.id}:food`)).toBe(false);
 p.beliefs[home.id].items={};const o=generateOptions(w,p).options.find(o=>o.key===`deposit:${home.id}:food`)!;
 // A staged late fill: the offer is not authority to exceed the real capacity.
 home.store.items.wood=BUILD_DEF.hut.cap;startActivity(w,p,o.make!()!);
 for(let n=0;n<300&&p.activity;n++)stepWorld(w);
 expect(home.store.items.fish??0).toBe(0);expect(p.inv.fish).toBe(2);
});
it('stores routine measurements identically across the reproduced browser numeric boundary',()=>{
 const {w,p}=child();const o=generateOptions(w,p).options.find(o=>o.kind==='wander')!;const a=o.make!()!;
 p.needs.warmth=71.21084038161287;prepareRoutine(w,p,a,o);const first=JSON.stringify(a.data.dailyRoutine);
 p.needs.warmth=71.21084038161288;prepareRoutine(w,p,a,o);expect(JSON.stringify(a.data.dailyRoutine)).toBe(first);
 expect(a.data.dailyRoutine.warmth).toBe(71.2108);
});
