import {expect, it, vi} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {snapshotInitial, conservationReport} from '../src/sim/economy';
import {startJob, workJob, facilityTick, finishJob, shelveJob,joinBlocker} from '../src/sim/facilities';
import {RECIPE_BY_ID, newOps} from '../src/sim/recipes';
import {serializeWorld, deserializeWorld} from '../src/app/save';
import {PRESERVATION_MAX_AGE,stockPreservationOption,setPreservation} from '../src/sim/preservation';
import {addPerson,building,pin} from './helpers/kit';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {startActivity,stepActivity,suspendActivity,resumeSuspended} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {describeEntity,describePerson} from '../src/sim/inspect';
import {recipeBlockers} from '../src/sim/inspect_work';
import {observe} from '../src/sim/knowledge';
import {destroyBuilding} from '../src/sim/buildings';
import {preservationScene} from './helpers/preservation';
import {batchWanted} from '../src/sim/batch_plan';
import {adoptProposedBatch,reviewIntentions} from '../src/sim/intent';

function fixture() {
  const w = createWorld(currentWorldSettings('normal', 'river', {immigration:true}));
  const p = w.persons.find(p=>p.alive)!;
  const b = w.buildings.find(b=>b.hhId===p.hhId)!;
  b.type='food_rack'; b.ops=newOps(); b.store={items:{fish:6, wood:2},cap:30};
  p.needs.hunger=90;
  snapshotInitial(w);
  return {w,p,b};
}

it('pays for a drying batch, pauses in rain, waits for output room and never finishes through observation or reload',()=>{
  const {w,p,b}=fixture();
  expect(startJob(w,b,p,RECIPE_BY_ID.dry_fish,p.id,'keep fish')).toBeNull();
  expect(b.store.items.fish).toBe(4);
  expect(b.ops!.job!.held.fish).toBe(2);
  while(b.ops!.job!.phase==='work') {w.tick++; workJob(w,b,p);}
  expect(w.fx.some(f=>f.type==='smoke')).toBe(false);
  expect(joinBlocker(w,b,p)).toContain('drying');
  const left=b.ops!.job!.burnLeft;
  w.weather.rain=1;
  for(let i=0;i<80;i++){w.tick++;facilityTick(w,b);}
  expect(b.ops!.job!.burnLeft).toBe(left);
  expect(b.ops!.job!.blocked).toContain('rain');
  const saved=serializeWorld(w), restored=deserializeWorld(saved);
  for(let i=0;i<3;i++){
    describeEntity(w,b.id);
    expect(recipeBlockers(w,b,RECIPE_BY_ID.dry_fish)).toContain('another batch is drying');
  }
  expect(serializeWorld(w)).toBe(saved);
  expect(serializeWorld(restored)).toBe(saved);
  expect(finishJob(w,b)).toBe(false);
  w.weather.rain=0; b.store.cap=0;
  for(let i=0;i<left;i++){w.tick++;facilityTick(w,b);}
  expect(b.ops!.job!.phase).toBe('ready');
  expect(w.ledger.created.dried_fish??0).toBe(0);
  b.store.cap=30; expect(finishJob(w,b)).toBe(true);
  expect(b.store.items.dried_fish).toBe(2);
  expect(conservationReport(w).diffs).toEqual([]);
});

it('smoking requires paid fuel and consumes it only once',()=>{
  const {w,p,b}=fixture();
  b.store.items.wood=0; snapshotInitial(w);
  expect(startJob(w,b,p,RECIPE_BY_ID.smoke_fish,p.id,'keep fish')).toContain('wood');
  b.store.items.wood=1; snapshotInitial(w);
  expect(startJob(w,b,p,RECIPE_BY_ID.smoke_fish,p.id,'keep fish')).toBeNull();
  while(b.ops!.job!.phase==='work'){w.tick++;workJob(w,b,p);}
  expect(w.ledger.consumed.wood).toBe(1);
  while(b.ops!.job){w.tick++;facilityTick(w,b);}
  expect(b.store.items.smoked_fish).toBe(2);
  expect(w.ledger.consumed.wood).toBe(1);
  expect(conservationReport(w).diffs).toEqual([]);
});

it('neglected unfinished fish spoils instead of completing or freshening after reload',()=>{
  const {w,p,b}=fixture();
  expect(startJob(w,b,p,RECIPE_BY_ID.dry_fish,p.id,'keep fish')).toBeNull();
  w.tick+=PRESERVATION_MAX_AGE;
  const restored=deserializeWorld(serializeWorld(w));
  const rack=restored.buildings.find(x=>x.id===b.id)!;
  facilityTick(restored,rack);
  expect(rack.ops!.job).toBeNull();
  expect(restored.ledger.spoiled.fish).toBe(2);
  expect(restored.ledger.created.dried_fish??0).toBe(0);
  expect(conservationReport(restored).diffs).toEqual([]);
});

const staged=preservationScene;

it('offered physical work survives interruption and reload, then preserved fish is actually eaten',()=>{
  const {w,p,b}=staged();w.weather.rain=0;
  const offer=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${b.id}:dry_fish`);
  expect(offer).toBeDefined(); startActivity(w,p,offer!.make!()!);
  for(let i=0;i<300&&(!b.ops?.job||b.ops.job.progress<10);i++){w.tick++;stepActivity(w,p);}
  expect(b.ops!.job!.progress).toBeGreaterThanOrEqual(10);
  suspendActivity(w,p);
  const text=serializeWorld(w),copy=deserializeWorld(text);
  expect(serializeWorld(copy)).toBe(text);
  const before=b.ops!.job!.progress;
  expect(resumeSuspended(w,p)).toBe(true);
  while(b.ops?.job?.phase==='work'){w.tick++;stepActivity(w,p);}
  expect(before).toBeGreaterThan(0);
  for(let i=0;i<800&&b.ops!.job;i++){w.tick++;facilityTick(w,b);}
  expect(b.store.items.dried_fish).toBe(2);
  // Keep the raw portions accounted for but unavailable to this eater so the
  // actual eat_store path is specifically tested with the new food.
  const other=addPerson({w,rng:copy.rng},'Ben',50,50,{hh:p.hhId});
  other.inv.fish=b.store.items.fish;delete b.store.items.fish;
  pin(other);p.needs.hunger=35;p.activity=null;observe(w,p,b);
  const eat=generateOptions(w,p,true,true).options.find(o=>o.key===`eat_store:${b.id}`);
  expect(eat).toBeDefined();startActivity(w,p,eat!.make!()!);
  for(let i=0;i<180&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(w.ledger.consumed.dried_fish).toBeGreaterThan(0);
  expect(p.needs.hunger).toBeGreaterThan(35);
  expect(conservationReport(w).diffs).toEqual([]);
});

it('repeated option and inspector reads are pure; twin worlds remain exact',()=>{
  const {w,p,b}=staged();const before=serializeWorld(w);
  for(let i=0;i<3;i++){const ctx=generateOptions(w,p,true,true);rankOptions(ctx);describeEntity(w,b.id);describePerson(w,p.id);}
  expect(serializeWorld(w)).toBe(before);
  const copy=deserializeWorld(before);
  for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
  expect(serializeWorld(w)).toBe(serializeWorld(copy));
});

it('rejects missing batch state and prevents two claimants starting the same batch',()=>{
  const {w,p,b}=staged();
  expect(startJob(w,b,p,RECIPE_BY_ID.dry_fish,0,'unowned')).toContain('identified owner');
  expect(startJob(w,b,p,RECIPE_BY_ID.smoke_fish,p.id,'keep fish')).toBeNull();
  const q=addPerson({w,rng:w.rng},'Ben',40,43,{hh:p.hhId,hunger:90});
  expect(startJob(w,b,q,RECIPE_BY_ID.dry_fish,q.id,'second batch')).not.toBeNull();
  for(const field of ['started','held','total','burnTotal','client','purpose','blocked','destSite','workers'] as const){
    const copy=deserializeWorld(serializeWorld(w));
    delete (copy.buildings.find(x=>x.id===b.id)!.ops!.job as unknown as Record<string,unknown>)[field];
    expect(()=>deserializeWorld(serializeWorld(copy))).toThrow(/preservation/);
  }
  for(const change of [{client:-1},{lastWork:w.tick+1},{burnLeft:0.5},{workers:{[p.id]:-1}}]){
    const copy=deserializeWorld(serializeWorld(w));
    Object.assign(copy.buildings.find(x=>x.id===b.id)!.ops!.job!,change);
    expect(()=>deserializeWorld(serializeWorld(copy))).toThrow(/preservation/);
  }
});

it('collapse settles the held inputs once and cannot leave a free product',()=>{
  const {w,p,b}=staged();
  expect(startJob(w,b,p,RECIPE_BY_ID.smoke_fish,p.id,'keep fish')).toBeNull();
  destroyBuilding(w,b,'test collapse');
  expect(conservationReport(w).diffs).toEqual([]);
  expect(w.ledger.created.smoked_fish??0).toBe(0);
  expect(w.ledger.spoiled.fish).toBe(2);
  expect(w.piles.reduce((n,x)=>n+(x.items.fish??0),0)).toBe(4);
  expect(w.piles.reduce((n,x)=>n+(x.items.wood??0),0)).toBe(2);
});

it('a full pack can eat its preserved granary share even when another food is inaccessible',()=>{
  const {w,p,b}=staged();
  b.type='granary'; b.store.items={berries:6,dried_fish:2};
  b.ops!.shares={[p.hhId]:{dried_fish:2}};
  p.inv={stone:4};p.needs.hunger=35;observe(w,p,b);snapshotInitial(w);
  const offer=generateOptions(w,p,true,true).options.find(o=>o.key===`eat_store:${b.id}`);
  expect(offer).toBeDefined();startActivity(w,p,offer!.make!()!);
  for(let i=0;i<200&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(w.ledger.consumed.dried_fish).toBeGreaterThan(0);
  expect(b.store.items.berries).toBe(6);
  expect(p.inv.stone).toBe(4);
  expect(conservationReport(w).diffs).toEqual([]);
});

it('preserving does not take the last meal or outrank urgent eating',()=>{
  const {w,p,b}=staged();b.store.items={fish:2};p.inv={};
  expect(startJob(w,b,p,RECIPE_BY_ID.dry_fish,p.id,'keep fish')).toContain('two portions');
  b.store.items={fish:6};p.needs.hunger=15;observe(w,p,b);
  expect(startJob(w,b,p,RECIPE_BY_ID.dry_fish,p.id,'keep fish')).toContain('eat before');
  const ctx=generateOptions(w,p,true,true);
  expect(ctx.options.some(o=>o.kind==='operate'&&/Drying|Smoking/.test(o.label))).toBe(false);
  expect(ctx.options.some(o=>o.kind==='eat_store')).toBe(true);
});

it('historical worlds cannot acquire preserved food or a rack by a missing-field migration',()=>{
  const {w,p,b}=staged();w.settings.rulesVersion=121;
  expect(startJob(w,b,p,RECIPE_BY_ID.dry_fish,p.id,'keep fish')).toContain('rules');
  expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/preservation/);
  b.type='hut';delete b.ops;p.inv.dried_fish=1;
  expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/preserved food/);
});

it('cancellation retains paid age and progress; spoiled inputs cannot refund fuel into a full store',()=>{
  const {w,p,b}=staged();
  expect(startJob(w,b,p,RECIPE_BY_ID.smoke_fish,p.id,'keep fish')).toBeNull();
  w.tick++;workJob(w,b,p);
  const job=b.ops!.job!,age=job.started,progress=job.progress;
  shelveJob(w,b,'interrupted');
  expect(b.ops!.job).toBe(job);expect(job.started).toBe(age);expect(job.progress).toBe(progress);
  b.store.cap=0;w.tick=age+PRESERVATION_MAX_AGE;facilityTick(w,b);
  expect(job.held).toEqual({wood:1});expect(w.ledger.spoiled.fish).toBe(2);
  const restored=deserializeWorld(serializeWorld(w)),rack=restored.buildings.find(x=>x.id===b.id)!;
  rack.store.cap=30;facilityTick(restored,rack);facilityTick(restored,rack);
  expect(rack.ops!.job).toBeNull();expect(rack.store.items.wood).toBe(2);
  expect(restored.ledger.spoiled.fish).toBe(2);expect(conservationReport(restored).ok).toBe(true);
});

it('preserved food carried in a pack still spoils through the ordinary world process',()=>{
  const {w,p}=staged();p.inv={dried_fish:2};snapshotInitial(w);
  w.tick=59;
  const draw=vi.spyOn(w.rng,'next').mockReturnValue(0);
  try{stepWorld(w);}finally{draw.mockRestore();}
  expect(p.inv.dried_fish??0).toBe(0);
  expect(w.ledger.spoiled.dried_fish).toBe(2);
  expect(conservationReport(w).ok).toBe(true);
});

it('a batch expiring before the worker tick cannot be reported as successfully finished food',()=>{
  const {w,p,b}=staged();w.weather.rain=0;
  const offer=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${b.id}:dry_fish`)!;
  startActivity(w,p,offer.make!()!);
  for(let i=0;i<300&&(!b.ops?.job||b.ops.job.progress<10);i++){w.tick++;stepActivity(w,p);}
  expect(b.ops!.job!.progress).toBeGreaterThanOrEqual(10);
  w.tick+=PRESERVATION_MAX_AGE;facilityTick(w,b);stepActivity(w,p);
  expect(p.activity).toBeNull();
  expect(p.lastResult?.outcome).not.toBe('success');
  expect(JSON.stringify(p.log)).not.toContain('Finished dried fish');
  expect(w.ledger.created.dried_fish??0).toBe(0);
  expect(conservationReport(w).ok).toBe(true);
});

it('two raw portions can be preserved when other carried food supplies the immediate meals',()=>{
  const {w,p,b}=staged();b.store.items={fish:2};p.inv={grain:2};w.weather.rain=0;
  snapshotInitial(w);observe(w,p,b);
  const offer=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${b.id}:dry_fish`);
  expect(offer).toBeDefined();startActivity(w,p,offer!.make!()!);
  for(let i=0;i<300&&(!b.ops!.job||b.ops!.job.phase==='work');i++){w.tick++;stepActivity(w,p);}
  expect(b.ops!.job!.phase).toBe('burn');expect(p.inv.grain).toBe(2);
  expect(conservationReport(w).ok).toBe(true);
});

it('food reserved to another worker cannot stand in for the preparer\'s immediate meals',()=>{
  const {w,p,b}=staged();b.store.items={fish:4};p.inv={};
  const q=addPerson({w,rng:w.rng},'Ben',45,45,{hh:p.hhId});
  b.ops!.earmarks=[{kind:'in',item:'fish',n:2,owner:q.id,until:w.tick+1000,reason:'Ben brought his own food'}];
  snapshotInitial(w);
  expect(startJob(w,b,p,RECIPE_BY_ID.dry_fish,p.id,'keep fish')).toContain('two portions');
  expect(b.store.items.fish).toBe(4);expect(b.ops!.job).toBeNull();
});

it('granary meal planning does not learn remote stock or share changes before arrival',()=>{
  const {w,p,b}=staged();b.type='granary';b.store.items={dried_fish:2};
  b.ops!.shares={[p.hhId]:{dried_fish:2}};p.needs.hunger=35;observe(w,p,b);
  const meal=()=>generateOptions(w,p,true,true).options.find(o=>o.key===`eat_store:${b.id}`);
  const before=meal();expect(before).toBeDefined();
  b.store.items={};b.ops!.shares={};snapshotInitial(w);
  const after=meal();expect(after?.util).toBe(before!.util);
  startActivity(w,p,after!.make!()!);
  for(let i=0;i<200&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(w.ledger.consumed.dried_fish??0).toBe(0);
  expect(p.lastResult?.outcome).not.toBe('success');
});

it('preservation supply uses fresh remembered stores rather than remotely reading their share book',()=>{
  const s=staged(),{w,p,b}=s;b.store.items={};p.inv={grain:2};observe(w,p,b);
  const g=building(s,'granary',45,40,p.hhId,{fish:4});
  g.ops!.shares={[p.hhId]:{fish:4}};observe(w,p,g);
  const supply=()=>generateOptions(w,p,true,true).options.find(o=>o.key===`collect:${g.id}:fish`);
  const before=supply();expect(before).toBeDefined();
  g.store.items={};g.ops!.shares={};
  expect(supply()?.util).toBe(before!.util);
  w.tick+=2401;
  expect(supply()).toBeUndefined();
});

it('a full pack is not sent repeatedly to collect preserved food it cannot carry',()=>{
  const {w,p,b}=staged();b.store.items={dried_fish:2};p.inv={stone:4};observe(w,p,b);
  const ctx=generateOptions(w,p,true,true);
  expect(ctx.options.some(o=>o.key.startsWith(`collect:${b.id}:`))).toBe(false);
  expect(ctx.blocked.some(o=>o.label==='Collect preserved food'&&o.blocked?.includes('no room'))).toBe(true);
});

it.each(['dry','smoke'] as const)('%s batches continue exactly after saves during labour and passive processing',method=>{
  const {w,p,b}=staged();w.weather.rain=method==='dry'?0:1;
  const offer=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${b.id}:${method}_fish`);
  expect(offer).toBeDefined();startActivity(w,p,offer!.make!()!);
  for(let i=0;i<300&&(!b.ops?.job||b.ops.job.progress<10);i++){w.tick++;stepActivity(w,p);}
  expect(b.ops!.job!.phase).toBe('work');
  let copy=deserializeWorld(serializeWorld(w)),savedPassive=false;
  const advance=(world:typeof w)=>{
    world.tick++;
    const actor=world.persons.find(q=>q.id===p.id)!;
    const rack=world.buildings.find(q=>q.id===b.id)!;
    stepActivity(world,actor);facilityTick(world,rack);
  };
  for(let i=0;i<1200&&b.ops!.job;i++){
    advance(w);advance(copy);
    if(!savedPassive&&b.ops!.job?.phase==='burn'){
      expect(serializeWorld(copy)).toBe(serializeWorld(w));
      copy=deserializeWorld(serializeWorld(w));savedPassive=true;
    }
  }
  expect(savedPassive).toBe(true);expect(b.ops!.job).toBeNull();
  expect(w.ledger.created[method==='dry'?'dried_fish':'smoked_fish']).toBe(2);
  expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(conservationReport(w).ok).toBe(true);expect(conservationReport(copy).ok).toBe(true);
});

it('carries household raw food for preservation while retaining two immediate meals',()=>{
  const s=staged(),{w,p,b}=s;
  b.store.items={};p.inv={};w.weather.rain=0;
  const home=building(s,'hut',45,40,p.hhId,{fish:4});
  observe(w,p,home);observe(w,p,b);snapshotInitial(w);
  const collect=generateOptions(w,p,true,true).options.find(o=>o.key===`collect:${home.id}:fish`);
  expect(collect).toBeDefined();startActivity(w,p,collect!.make!()!);
  for(let i=0;i<400&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(p.inv.fish).toBe(4);
  const bring=generateOptions(w,p,true,true).options.find(o=>o.key===`bring:${b.id}:fish`);
  expect(bring).toBeDefined();startActivity(w,p,bring!.make!()!);
  for(let i=0;i<400&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(p.inv.fish).toBe(2);expect(b.store.items.fish).toBe(2);
  const operate=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${b.id}:dry_fish`);
  expect(operate).toBeDefined();startActivity(w,p,operate!.make!()!);
  for(let i=0;i<400&&b.ops!.job?.phase!=='burn';i++){w.tick++;stepActivity(w,p);}
  expect(b.ops!.job!.held.fish).toBe(2);expect(p.inv.fish).toBe(2);
  expect(conservationReport(w).ok).toBe(true);
});

it('uses the existing bounded batch plan to finish a feasible preservation job and leaves passive drying alone',()=>{
  const {w,p,b}=staged();w.weather.rain=0;
  const ctx=generateOptions(w,p,true,true),want=batchWanted(ctx);
  expect(want?.item).toBe('dried_fish');
  const adopted=adoptProposedBatch(ctx,want!);
  expect(adopted.plan?.project).toBeDefined();
  const offer=generateOptions(w,p,true,true).options.find(o=>o.key===`operate:${b.id}:dry_fish`)!;
  const action=offer.make!()!;expect(action.data.forPlan).toBe(adopted.plan!.id);
  startActivity(w,p,action);
  for(let i=0;i<300&&b.ops!.job?.phase!=='burn';i++){w.tick++;stepActivity(w,p);}
  expect(b.ops!.job!.phase).toBe('burn');
  const saved=serializeWorld(w);
  const after=generateOptions(w,p,true,true);
  expect(after.options.some(o=>o.key.startsWith('project_wait:'))).toBe(false);
  describeEntity(w,b.id);describePerson(w,p.id);
  expect(serializeWorld(w)).toBe(saved);
  expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
  expect(conservationReport(w).ok).toBe(true);
});

it.each(['dry','smoke'] as const)('existing meat follows the %s recipe into actual eating',method=>{
  const {w,p,b}=staged();b.store.items={meat:2,wood:1};p.inv={grain:2};w.weather.rain=0;
  snapshotInitial(w);
  expect(startJob(w,b,p,RECIPE_BY_ID[`${method}_meat`],p.id,'keep existing meat')).toBeNull();
  while(b.ops!.job!.phase==='work'){w.tick++;workJob(w,b,p);}
  for(let i=0;i<800&&b.ops!.job;i++){w.tick++;facilityTick(w,b);}
  const food=method==='dry'?'dried_meat':'smoked_meat';
  expect(b.store.items[food]).toBe(2);
  p.needs.hunger=35;observe(w,p,b);
  const eat=generateOptions(w,p,true,true).options.find(o=>o.key===`eat_store:${b.id}`);
  expect(eat).toBeDefined();startActivity(w,p,eat!.make!()!);
  for(let i=0;i<300&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(w.ledger.consumed[food]).toBeGreaterThan(0);
  expect(p.needs.hunger).toBeGreaterThan(35);expect(conservationReport(w).ok).toBe(true);
});

it('an ordinary food-reserve plan can prepare known spare food without taking a second project',()=>{
  const s=staged(),{w,p,b}=s;w.weather.rain=0;
  const home=building(s,'hut',45,40,p.hhId,{});observe(w,p,home);observe(w,p,b);
  const ctx=generateOptions(w,p,true,true),plan=reviewIntentions(ctx);
  expect(plan?.kind).toBe('stock');
  expect(plan?.stepKey).toBe(`operate:${b.id}:dry_fish`);
  expect(plan?.wants).toEqual({});
  expect(p.intentions.filter(i=>i.status==='active')).toHaveLength(1);
  const before=serializeWorld(w);
  generateOptions(w,p,true,true);describePerson(w,p.id);
  expect(serializeWorld(w)).toBe(before);
  reviewIntentions(generateOptions(w,p,true,true));
  expect(plan?.aboutId).toBe(home.id);
  p.inv.dried_fish=2;
  expect(stockPreservationOption(generateOptions(w,p,true,true))).toBeUndefined();
  reviewIntentions(generateOptions(w,p,true,true));
  expect(plan?.stepKey).toBe(`deposit:${home.id}:food`);
  delete p.inv.dried_fish;
  p.needs.hunger=4;
  const hungry=generateOptions(w,p,true,true);
  expect(stockPreservationOption(hungry)).toBeUndefined();
  expect(rankOptions(hungry)[0]?.need).toBe('hunger');
  p.needs.hunger=90;
  setPreservation(false);
  try {expect(stockPreservationOption(generateOptions(w,p,true,true))).toBeUndefined();}
  finally {setPreservation(true);}
});

it('the batch planner does not substitute stale nearby rack stock for a fresh known food supply',()=>{
  const s=staged(),{w,p,b}=s;w.tick=6000;w.weather.rain=0;
  const stale=building(s,'food_rack',39,44,p.hhId,{fish:6});
  observe(w,p,b);observe(w,p,stale);p.beliefs[stale.id].seen=w.tick-2401;
  expect(batchWanted(generateOptions(w,p,true,true))?.facilityId).toBe(b.id);
});
