import {expect,it} from 'vitest';
import {stage,addPerson,building,site,done,pin} from './helpers/kit';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {newActivity,startActivity} from '../src/sim/activities';
import {settleIntentions,reviewIntentions} from '../src/sim/intent';
import {observe} from '../src/sim/knowledge';
import {completeSite} from '../src/sim/buildings';
import {finishedSiteHere,observePromiseTarget,targetOutcome} from '../src/sim/promise_targets';
import {updateEnvironment} from '../src/sim/environment';
import {perceive} from '../src/sim/perception';
import {createRequest} from '../src/sim/social';
import {noteCustomer} from '../src/sim/customers';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import type {Intention} from '../src/sim/types';

it('counts actual shelter at a different home once per tick, preserving reload and excluding open ground',()=>{
 const s=stage('pavel-night'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;w.tick=1800;
 const p=addPerson(s,'Pavel',40,40,{age:71}),home=building(s,'lean_to',41,40,p.hhId),fire=building(s,'fire',44,40);
 done(s);
 const plan:Intention={id:w.nextId++,kind:'night',goal:'be sheltered',since:w.tick,until:2500,status:'active',step:'get to fire',stepKind:'goto',stepItem:null,stepTarget:fire.id,stepKey:null,aboutId:fire.id,wants:{},makes:'',sheltered:0,worked:0,blocked:'',reason:'',setAside:0,ended:0};p.intentions=[plan];
 const a=newActivity(w,p,{kind:'sleep',label:'Sleep',goal:'rest',here:true,targetId:home.id,targetType:'building'});expect(a).toBeTruthy();p.activity=a!;a!.phase='work';a!.progress=20;
 settleIntentions(w,p);settleIntentions(w,p);expect(plan.sheltered).toBe(1);
 const copy=deserializeWorld(serializeWorld(w));w.tick++;copy.tick++;
 settleIntentions(w,p);settleIntentions(copy,copy.persons[0]);expect(plan.sheltered).toBe(2);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 p.cooldowns.pause=w.tick+10;w.tick++;settleIntentions(w,p);expect(plan.sheltered).toBe(2);p.cooldowns.pause=0;
 a!.targetId=0;w.tick++;settleIntentions(w,p);expect(plan.sheltered).toBe(2);
});

it('recognises a locally completed site without crediting another builders contribution',()=>{
 const s=stage('pavel-complete'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;
 const p=addPerson(s,'Pavel',40,40,{age:71}),q=addPerson(s,'Builder',40,41),st=site(s,'lean_to',42,40,p.hhId,q.id);
 done(s);observe(w,p,st);const x=st.x+st.w/2,y=st.y+st.h/2;
 p.commitments.push({id:w.nextId++,requestId:0,kind:'help_build',to:q.id,item:null,amount:1,delivered:0,siteId:st.id,made:w.tick,deadline:1000,status:'active',contrib:12});
 completeSite(w,st,q);expect(finishedSiteHere(w,p,st.id,x,y)).toBe(true);
 observePromiseTarget(w,p,st.id,x,y);const c=p.commitments[0];expect(c.targetEvidence?.source).toBe('observed completion');
 expect(targetOutcome(w,c)).toEqual({done:false,reason:expect.stringContaining('12/40')});
 p.x=5;p.y=5;expect(finishedSiteHere(w,p,st.id,x,y)).toBe(false);
});

it('reports a full-pack gift as no receipt through the real conversation, without losing goods',()=>{
 const s=stage('pavel-gift'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;
 const p=addPerson(s,'Pavel',40,40,{inv:{wood:2},age:71}),q=addPerson(s,'Talia',41,40,{inv:{stone:4},age:25});
 done(s);pin(q);p.needs.social=q.needs.social=0;
 const a=newActivity(w,p,{kind:'socialize',label:'Offer wood',goal:'help',here:true,targetId:q.id,targetType:'person',data:{purpose:'offer',conv:{items:{wood:2}}}});startActivity(w,p,a);
 for(let n=0;n<400&&!p.lastInteraction;n++)stepWorld(w);
 expect(p.lastInteraction?.outcome).toBe('nothing received');expect(p.lastInteraction?.detail).toContain('no room');
 expect(p.inv.wood).toBe(2);expect(q.inv.wood??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});

it('prices a seated rest by its work duration, rather than five ticks',()=>{
 const s=stage('pavel-rest'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;
 const p=addPerson(s,'Pavel',40,40,{energy:40});done(s);
 const o=generateOptions(w,p,true,true).options.find(o=>o.key==='rest:here');expect(o).toBeTruthy();expect(o!.eta).toBe(180);expect(o!.make?.()?.amount).toBe(180);
});

it('fresh sight replaces not-found with present availability, then permits an actual delivery',()=>{
 const s=stage('pavel-seen'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;w.tick=1000;
 const p=addPerson(s,'Pavel',40,40,{age:71,inv:{wood:2},hunger:100,thirst:100,energy:100}),q=addPerson(s,'Talia',42,40,{age:30});done(s);updateEnvironment(w);pin(q);
 const req=createRequest(w,q,p,{kind:'wood',item:'wood',amount:2});noteCustomer(w,p,q,req,'making');
 p.intentions=[{id:w.nextId++,kind:'tool',goal:'make a pick',since:1000,until:5000,status:'active',step:'get stone',stepKind:'get',stepItem:'stone',stepTarget:0,stepKey:null,aboutId:0,wants:{wood:2,stone:2},makes:'pick',sheltered:0,worked:0,blocked:'',reason:'',setAside:0,ended:0}];
 reviewIntentions(generateOptions(w,p,true,true));expect(p.intentions[0].status).toBe('dropped');

 p.cooldowns['seek'+q.id]=w.tick+600;q.convId=123;perceive(w,p);
 const busy=generateOptions(w,p,true,true);expect(busy.blocked.some(b=>b.blocked==='they are already talking'),JSON.stringify({blocked:busy.blocked,leads:p.customers,seen:busy.seenPersons,critical:busy.critical,night:busy.night,needs:p.needs})).toBe(true);
 expect(busy.blocked.some(b=>b.blocked?.includes('looked for them lately'))).toBe(false);
 q.convId=0;perceive(w,p);const offered=generateOptions(w,p,true,true).options.find(o=>o.label==='Bring Talia the wood they asked for');expect(offered).toBeTruthy();
 startActivity(w,p,offered!.make!()!);for(let n=0;n<400&&!p.lastInteraction;n++)stepWorld(w);
 expect(q.inv.wood).toBe(2);expect(p.inv.wood??0).toBe(0);expect(p.lastInteraction?.outcome).toBe('received gift');expect(p.customers?.[0].units).toBe(2);expect(conservationReport(w).ok).toBe(true);
});
it('puts a one-unit surplus into its reserve through the ordinary deposit activity',()=>{
 // Pinned to rules 204, on the owner's instruction of 11 November 2026: the scene stages a hungry elder who keeps three of his four fruit, so
 // one is the surplus. From rules 205 (light_pack.ts) a grown person with a home store keeps the ration (two portions from 206) and would take
 // two home. What this case checks, a partial reserve going in through the ordinary deposit, is unchanged.
 const s=stage('pavel-reserve'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=204;w.tick=1000;
 const p=addPerson(s,'Pavel',40,40,{age:71,inv:{fruit:4},hunger:50,thirst:95,energy:95}),home=building(s,'lean_to',41,40,p.hhId);
 w.households.find(h=>h.id===p.hhId)!.homeId=home.id;done(s);observe(w,p,home);
 p.intentions=[{id:w.nextId++,kind:'stock',goal:'put food by',since:1000,until:5000,status:'active',step:'gather',stepKind:'get',stepItem:'fruit',stepTarget:0,stepKey:null,aboutId:home.id,wants:{},makes:'',sheltered:0,worked:0,blocked:'',reason:'',setAside:0,ended:0,reserve:4,cue:'hardship'}];
 reviewIntentions(generateOptions(w,p,true,true));
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`deposit:${home.id}:food`);expect(o).toBeTruthy();expect(o!.make!()!.data.items,JSON.stringify({needs:p.needs,drives:generateOptions(w,p,true,true).drives})).toEqual({fruit:1});
 startActivity(w,p,o!.make!()!);for(let n=0;n<400&&!(home.store.items.fruit??0);n++)stepWorld(w);
 expect(home.store.items.fruit).toBe(1);expect(p.inv.fruit).toBe(3);expect(p.intentions[0].worked).toBe(1);expect(conservationReport(w).ok).toBe(true);
});

it('shelter and fire estimates include their configured paid duration',()=>{
 const s=stage('pavel-estimates'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;
 const p=addPerson(s,'Pavel',40,40),home=building(s,'lean_to',42,40,p.hhId),fire=building(s,'fire',43,42);fire.fuel=1000;done(s);p.needs.warmth=30;
 for(const b of [home,fire])observe(w,p,b);
 const opts=generateOptions(w,p,true,true).options;
 for(const key of [`rest:home:${home.id}`,`warm:${fire.id}`]){const o=opts.find(o=>o.key===key)!;expect(o).toBeTruthy();expect(o.eta).toBeGreaterThanOrEqual(o.make!()!.amount);}
});
