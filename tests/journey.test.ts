import {afterEach,expect,it} from 'vitest';
import {journeyScene} from './helpers/journey';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {journeyCredit,setJourneys} from '../src/sim/journey_supplies';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {selectPrerequisite,finishPrerequisite} from './helpers/tool_prerequisite';
import {conservationReport,ledgerConsume,produce} from '../src/sim/economy';
import {describePerson} from '../src/sim/inspect';
import {observeInhabitant} from '../src/agent/observe';
import {journeyOutcome,recordJourney} from '../src/sim/journey_state';
import {delBelief} from '../src/sim/knowledge';
afterEach(()=>setJourneys(true));
it('offers real water preparation for the personally known work blocked at the predecessor, without observer mutation',()=>{
 const old=journeyScene(71);expect(generateOptions(old.w,old.p,true,true).options.some(o=>o.journeyFor)).toBe(false);
 const f=journeyScene(),raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);rankOptions(ctx);
 expect(ctx.options.some(o=>o.journeyFor?.key===f.key)).toBe(true);expect(serializeWorld(f.w)).toBe(raw);expect(f.p.intentions).toHaveLength(0);
 setJourneys(false);expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.journeyFor)).toBe(false);
});
it('collects real provisions with saved intention and an exact preparation continuation',()=>{
 const f=journeyScene(),o=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor)!;
 const chosen=selectPrerequisite(f.w,f.p,o.key);
 try{const i=f.p.intentions.find(i=>i.journey)!;expect(i.journey!.key).toBe(f.key);const twin=deserializeWorld(serializeWorld(f.w));
  for(let t=0;t<700&&f.p.activity?.id===chosen.act.id;t++){stepWorld(f.w);stepWorld(twin);}
  expect(chosen.act.cycle).toBeGreaterThan(0);expect(f.p.inv.water).toBe(chosen.act.cycle);expect(f.p.needs.thirst).toBeLessThan(70);expect(i.journey!.history[0].activity).toBe(chosen.act.id);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
 }finally{chosen.restore();}
});
it('retains the purpose through autonomous drinking, physical collection and useful construction, saving during the break and travel',()=>{
 const f=journeyScene(),prep=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor)!;
 finishPrerequisite(f.w,f.p,prep.key);f.p.nextThink=f.w.tick;f.p.cooldowns.pause=0;
 let twin=deserializeWorld(serializeWorld(f.w)),drink=0,travel=0;
 for(let t=0;t<1450;t++){
  if(f.p.activity?.kind==='drink'&&f.p.activity.data.optKey==='drink:inv'&&!drink){drink=f.w.tick;twin=deserializeWorld(serializeWorld(f.w));expect(f.p.intentions.some(i=>i.journey&&i.status==='active')).toBe(true);}
  if(f.p.activity?.data.optKey===f.key&&f.p.activity.phase==='travel'&&!travel){travel=f.w.tick;twin=deserializeWorld(serializeWorld(f.w));}
  if(t%60===0){const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);observeInhabitant(f.w,f.p,ctx,rankOptions(ctx));describePerson(f.w,f.p.id);expect(serializeWorld(f.w)).toBe(before);}
  stepWorld(f.w);stepWorld(twin);
 }
 expect(drink).toBeGreaterThan(0);expect(travel).toBeGreaterThan(drink);expect(f.p.intentions.find(i=>i.journey)?.status).toBe('done');expect(f.target.used.wood).toBeGreaterThan(0);expect(f.p.inv.water??0).toBe(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('credits only bounded unpromised portable portions without changing needs or goods',()=>{
 const f=journeyScene();produce(f.w,f.p.inv,100,'water',4,'staged provisions');const before=serializeWorld(f.w);expect(journeyCredit(f.w,f.p).water).toBeCloseTo(57.6);expect(serializeWorld(f.w)).toBe(before);
 f.p.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:999,item:'water',amount:4,siteId:0,made:0,deadline:1000,status:'active'});
 expect(journeyCredit(f.w,f.p).water).toBe(0);expect(conservationReport(f.w).ok).toBe(true);
});
it('does not create a preparation for an unknown work source or an already full pack',()=>{
 const f=journeyScene();delBelief(f.p,f.tree.id);expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.journeyFor?.key===f.key)).toBe(false);
 const g=journeyScene();produce(g.w,g.p.inv,100,'stone',20,'staged full load');expect(generateOptions(g.w,g.p,true,true).options.some(o=>o.journeyFor)).toBe(false);
});
it('physically withdraws known food for a trip and rechecks depleted stock at arrival',()=>{
 const prepare=()=>{const f=journeyScene();ledgerConsume(f.w,'bread',1,'staged absent portable food');delete f.p.inv.bread;f.p.needs.hunger=60;f.p.needs.thirst=100;return f;};
 for(const depleted of [false,true]){
  const f=prepare(),o=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor&&o.kind==='withdraw');expect(o).toBeDefined();
  const selected=selectPrerequisite(f.w,f.p,o!.key),before=f.p.needs.hunger;
  if(depleted){ledgerConsume(f.w,'grain',f.home.store.items.grain!,'staged depleted food');delete f.home.store.items.grain;}
  try{const twin=deserializeWorld(serializeWorld(f.w));for(let t=0;t<700&&f.p.activity?.id===selected.act.id;t++){stepWorld(f.w);stepWorld(twin);}
   expect(f.p.inv.grain??0)[depleted?'toBe':'toBeGreaterThan'](0);expect(f.p.needs.hunger).toBeLessThan(before);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
  }finally{selected.restore();}
 }
});
it('retains actual failures, bounds retries and drops a forgotten destination',()=>{
 const f=journeyScene(),o=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor)!;const selected=selectPrerequisite(f.w,f.p,o.key);selected.restore();const i=f.p.intentions.find(i=>i.journey)!;
 for(let n=0;n<3;n++)recordJourney(f.w,f.p,{...selected.act,id:f.w.nextId++,data:{journeyId:i.id}},'failed','staged failure evidence');
 expect(i.journey!.tries).toBe(3);expect(journeyOutcome(f.w,f.p,i)?.reason).toContain('3 failed');
 i.journey!.tries=0;delBelief(f.p,f.tree.id);expect(journeyOutcome(f.w,f.p,i)?.reason).toContain('no longer personally known');
});
it('releases private claims when the bounded preparation deadline passes',()=>{
 const f=journeyScene(),o=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor)!;const selected=selectPrerequisite(f.w,f.p,o.key);
 try{const i=f.p.intentions.find(i=>i.journey)!;i.until=f.w.tick;stepWorld(f.w);stepWorld(f.w);expect(i.status).toBe('dropped');expect(i.reason).toContain('deadline');expect(i.wants).toEqual({});expect(conservationReport(f.w).ok).toBe(true);}finally{selected.restore();}
});
it('does not learn hidden store changes from pure trip planning',()=>{
 const f=journeyScene();ledgerConsume(f.w,'bread',1,'staged absent food');delete f.p.inv.bread;f.p.needs.hunger=60;f.p.needs.thirst=100;
 const offers=()=>generateOptions(f.w,f.p,true,true).options.filter(o=>o.journeyFor).map(o=>({key:o.key,util:o.util,label:o.label}));const before=offers();
 ledgerConsume(f.w,'grain',f.home.store.items.grain!,'staged unobserved depletion');delete f.home.store.items.grain;expect(offers()).toEqual(before);expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['deadline','count','item','duplicate evidence','predecessor'] as const)('rejects malformed saved journey: %s',kind=>{
 const f=journeyScene(),o=generateOptions(f.w,f.p,true,true).options.find(o=>o.journeyFor)!;const selected=selectPrerequisite(f.w,f.p,o.key);selected.restore();const i=f.p.intentions.find(i=>i.journey)!;
 if(kind==='deadline')i.until=Infinity;if(kind==='count')i.journey!.water=3;if(kind==='item')i.journey!.item='bad' as any;if(kind==='predecessor')f.w.settings.rulesVersion=71;
 if(kind==='duplicate evidence'){const h={activity:1,tick:0,kind:'fetch_water' as const,outcome:'failed',detail:'staged'};i.journey!.history=[h,h];}
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/journey/i);
});
