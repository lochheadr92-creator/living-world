// Rules 54: relocation by the consenting part of a household, succession, return and the search for a traveller out of contact.
// Every case is STAGED on the rules-20 contract household (tests/helpers/relocation.ts); the choices go through the external
// selection boundary and everything physical (packing, walking, hauling, building) runs live.
import {setExternalController} from '../src/sim/external';
import {afterEach,expect,it} from 'vitest';
import {relocationFixture} from './helpers/relocation';
import {RESCUE_AFTER,currentRelocation,setRelocationExtensions,travellers} from '../src/sim/relocation';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld,hashWorld} from '../src/sim/world';
import {describePerson} from '../src/sim/inspect';
import {conservationReport,ledgerSpoil} from '../src/sim/economy';
import {relOf} from '../src/sim/relations';
import {DAY} from '../src/sim/constants';
import {perceive} from '../src/sim/perception';
import {observe} from '../src/sim/knowledge';
import {killPerson} from '../src/sim/lifecycle';
import {knowsDeath} from '../src/sim/death_knowledge';
import {parseIntervention} from '../scripts/lab/lab';
afterEach(()=>{setRelocationExtensions(true);setExternalController(null);});
const at54=(f:ReturnType<typeof relocationFixture>)=>{f.w.settings.rulesVersion=54;return f;};
const keys=(f:ReturnType<typeof relocationFixture>,p:Parameters<typeof generateOptions>[1])=>rankOptions(generateOptions(f.w,p,true,true)).map(o=>o.key);

it('a proposal is heard by whoever is there; a refusal keeps the agreement, the refuser and their child stay, and the travellers found a new household',()=>{
 const f=at54(relocationFixture(true,true));const {w,a,b,c,hh,home}=f;const original=hh.townshipId;
 c!.parents=[b!.id];
 // Ben out of contact: Ada and Cora alone are enough to hear it
 b!.x=60;b!.y=60;perceive(w,a);
 f.run(a,':propose:');const r=currentRelocation(hh)!;expect(r.phase).toBe('asking');expect(r.members.map(m=>m.response)).toEqual(['accepted','pending','pending']);
 // Ben cannot be asked until he is in contact; Cora can
 expect(keys(f,a).some(k=>k.includes(`:ask:${b!.id}`))).toBe(false);expect(keys(f,a).some(k=>k.includes(`:ask:${c!.id}`))).toBe(true);
 b!.x=41.5;b!.y=40.5;perceive(w,a);relOf(b!,a.id).trust=-40;
 f.run(a,':ask:'+b!.id);expect(r.phase).toBe('asking');expect(r.members[1]).toMatchObject({response:'refused'});expect(r.members[1].reason).toContain('does not trust');
 f.run(a,':ask:'+c!.id);expect(r.members[2]).toMatchObject({response:'stays',reason:'stays with Ben'});
 expect(travellers(w,r).map(m=>m.id)).toEqual([a.id]);
 f.run(a,':prepare:');expect(r.phase).toBe('packing');
 f.run(a,'eat_store:');f.run(a,'relocate-pack:');expect(conservationReport(w).ok).toBe(true);
 f.run(a,':depart:');expect(r.phase).toBe('travelling');expect(hh.members).toContain(b!.id);expect(b!.activity?.kind).not.toBe('relocate');
 f.choose(a,':travel:');for(let i=0;i<1300&&a.activity?.kind==='relocate';i++)stepWorld(w);
 expect(a.y).toBeLessThan(18);perceive(w,a);
 f.run(a,':arrive:');expect(r.phase).toBe('building');
 f.run(a,'relocate-shelter:');const site=w.sites.find(s=>s.hhId===hh.id)!;observe(w,a,site);
 f.run(a,`haul:${site.id}`);f.run(a,`gather:${f.tree.id}`);f.run(a,`gather:${f.tree.id}`);f.run(a,`haul:${site.id}`);f.run(a,`build:${site.id}`);
 f.run(a,':found:');
 expect(r.phase).toBe('settled');expect(r.newHouseholdId).toBeDefined();
 const settled=w.households.find(h=>h.id===r.newHouseholdId)!;
 expect(settled.members).toEqual([a.id]);expect(a.hhId).toBe(settled.id);expect(settled.homeId).not.toBe(home.id);expect(w.byId.get(settled.homeId)).toMatchObject({ent:'building',hhId:settled.id});
 expect(hh.members.sort()).toEqual([b!.id,c!.id].sort());expect(hh.homeId).toBe(home.id);expect(home.hhId).toBe(hh.id);expect(hh.townshipId).toBe(original);
 expect(settled.townshipId).not.toBe(original);expect(w.townships!.find(t=>t.id===settled.townshipId)?.origin).toMatchObject({householdId:settled.id,relocationId:r.id,organiserId:a.id});
 expect(r.outcome).toContain('Ben, Cora stayed');expect(conservationReport(w).ok).toBe(true);
 const before=serializeWorld(w);expect(describePerson(w,b!.id)?.householdHistory.join(' ')).toContain('formed household');expect(serializeWorld(w)).toBe(before);
},40000);

it('a member not found within a day stays; one who withdraws at departure stays and the rest still go',()=>{
 const f=at54(relocationFixture(true,true));const {w,a,b,c,hh}=f;
 b!.x=60;b!.y=60;perceive(w,a);
 f.run(a,':propose:');const r=currentRelocation(hh)!;f.run(a,':ask:'+c!.id);expect(r.members[2].response).toBe('dependent');
 expect(keys(f,a).some(k=>k.includes(':prepare:'))).toBe(false);
 expect(generateOptions(w,a,true,true).blocked.some(x=>x.blocked?.includes('has not yet been asked'))).toBe(true);
 w.tick+=DAY;for(const p of w.persons){p.needs.hunger=Math.max(p.needs.hunger,60);p.needs.thirst=98;p.needs.energy=98;}a.needs.hunger=60;
 f.run(a,':prepare:');expect(r.members[1]).toMatchObject({response:'stays'});expect(r.members[1].reason).toContain('not found');
 expect(travellers(w,r).map(m=>m.id)).toEqual([a.id,c!.id]);
 f.run(a,'eat_store:');f.run(a,'relocate-pack:');
 // a second adult who had accepted turns unfit at departure: she stays, the journey goes on without her
 b!.x=41.5;b!.y=40.5;r.members[1].response='accepted';r.members[1].reason='staged acceptance';b!.health=30;f.run(a,':rally:');perceive(w,a);
 f.run(a,':depart:');expect(r.members[1]).toMatchObject({response:'stays'});expect(r.members[1].reason).toContain('withdrew');expect(r.phase).toBe('travelling');
 expect(travellers(w,r).map(m=>m.id)).toEqual([a.id,c!.id]);expect(hh.members).toContain(b!.id);
});

it('an accepted traveller who knows the organiser died takes the journey over; the dead are no longer waited for',()=>{
 const f=at54(relocationFixture());const {w,a,b,hh}=f;
 f.run(a,':propose:');f.run(a,':ask:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':rally:');f.run(a,':depart:');
 const r=currentRelocation(hh)!;expect(keys(f,b!).some(k=>k.includes(':succeed:'))).toBe(false);
 killPerson(w,a,'injuries');expect(knowsDeath(b!,a.id)).toBe(true);expect(r.organiserId).toBe(a.id);
 f.run(b!,':succeed:');expect(r.organiserId).toBe(b!.id);expect(r.successions).toHaveLength(1);expect(r.successions![0]).toMatchObject({from:a.id,to:b!.id,reason:'died'});
 expect(travellers(w,r).map(m=>m.id)).toEqual([b!.id]);
 f.choose(b!,':travel:');for(let i=0;i<1300&&b!.activity?.kind==='relocate';i++)stepWorld(w);
 expect(b!.y).toBeLessThan(18);perceive(w,b!);f.run(b!,':arrive:');expect(r.phase).toBe('building');
 expect(describePerson(w,b!.id)?.householdHistory.join(' ')).toContain('took over the journey from Ada');
 expect(conservationReport(w).ok).toBe(true);
});

it('an unsuitable arrival turns the travellers back; they return to the old home together and the record says so',()=>{
 const f=at54(relocationFixture(false));const {w,a,hh,home,bush}=f;
 f.run(a,':propose:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':depart:');f.run(a,':travel:');
 ledgerSpoil(w,'berries',bush.amount,'staged: the bush withered before they arrived');bush.amount=0;observe(w,a,bush);f.run(a,':arrive:');const r=hh.relocations![0];
 expect(r.phase).toBe('returning');expect(hh.homeId).toBe(home.id);expect(w.townships).toHaveLength(1);
 expect(keys(f,a).some(k=>k.includes(':returned:'))).toBe(false);
 f.choose(a,':return:');for(let i=0;i<1300&&a.activity?.kind==='relocate';i++)stepWorld(w);
 expect(Math.hypot(a.x-home.x,a.y-home.y)).toBeLessThan(5);
 f.run(a,':returned:');expect(r.phase).toBe('returned');expect(r.ended).toBeDefined();expect(r.outcome).toContain('returned to the old home');
 expect(a.cooldowns['relocation:retry']).toBe(r.ended!+DAY);expect(hh.townshipId).toBe(r.fromTownship);
 expect(generateOptions(w,a,true,true).options.some(o=>o.kind==='relocate')).toBe(false);
 expect(conservationReport(w).ok).toBe(true);
},30000);

it('the organiser looks for a traveller out of contact where they were last seen, finds them or finds nobody, and is blocked without a known place',()=>{
 const f=at54(relocationFixture());const {w,a,b,hh}=f;
 f.run(a,':propose:');f.run(a,':ask:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':rally:');f.run(a,':depart:');
 const r=currentRelocation(hh)!;
 // Ben fell behind out of sight (staged), and Ada last saw him at the departure place half a day ago
 b!.x=52.5;b!.y=52.5;a.seen=a.seen.filter(s=>s.id!==b!.id);delete a.whereabouts[b!.id];
 expect(keys(f,a).some(k=>k.includes(':rescue:'))).toBe(false);
 a.whereabouts[b!.id]={x:52.5,y:52.5,tick:w.tick-RESCUE_AFTER};
 f.run(a,':rescue:'+b!.id);expect(r.rescues).toHaveLength(1);expect(r.rescues![0]).toMatchObject({by:a.id,who:b!.id,found:true,x:52.5,y:52.5});
 expect(Math.hypot(a.x-b!.x,a.y-b!.y)).toBeLessThan(5);
 // gone from where he was last seen: the search finds nobody and the stale whereabouts is forgotten
 b!.x=20.5;b!.y=60.5;a.seen=a.seen.filter(s=>s.id!==b!.id);a.whereabouts[b!.id]={x:56.5,y:56.5,tick:w.tick-RESCUE_AFTER};
 f.run(a,':rescue:'+b!.id);expect(r.rescues![1]).toMatchObject({found:false});expect(a.whereabouts[b!.id]).toBeUndefined();
 // with no place to look, half a day on, the search is blocked rather than guessed
 expect(keys(f,a).some(k=>k.includes(':rescue:'))).toBe(false);
 w.tick+=RESCUE_AFTER;a.seen=a.seen.filter(s=>s.id!==b!.id);
 expect(generateOptions(w,a,true,true).blocked.some(x=>x.blocked?.includes('does not know where Ben is'))).toBe(true);
 expect(describePerson(w,a.id)?.householdHistory.join(' ')).toContain('found nobody');
 expect(conservationReport(w).ok).toBe(true);
},30000);

it('rules 54: switch, exact replay, observer purity, hash coverage, load validation, and rules 53 unchanged',()=>{
 // under rules 53, and under rules 54 with the switch off, a refusal ends the whole-household agreement as rules 20 did
 for(const [version,off] of [[53,false],[54,true]] as const){
  const restore=off?parseIntervention('rich-no-relocation-extensions').install!():()=>{};
  try{
   const f=relocationFixture();f.w.settings.rulesVersion=version;const {w,a,b,hh}=f;
   b!.x=60;b!.y=60;perceive(w,a);expect(generateOptions(w,a,true,true).options.some(o=>o.kind==='relocate')).toBe(false);
   b!.x=41.5;b!.y=40.5;perceive(w,a);f.run(a,':propose:');relOf(b!,a.id).trust=-40;f.run(a,':ask:');
   expect(hh.relocations![0].phase).toBe('failed');expect(hh.relocations![0].members.map(m=>m.response)).toEqual(['accepted','refused']);
  }finally{restore();}
 }
 const f=at54(relocationFixture());const {w,a,b,hh}=f;
 f.run(a,':propose:');f.run(a,':ask:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':rally:');f.run(a,':depart:');
 killPerson(w,a,'injuries');f.run(b!,':succeed:');
 const saved=serializeWorld(w);const hash=hashWorld(w);
 for(let i=0;i<3;i++){generateOptions(w,b!,true,true);describePerson(w,b!.id);}
 expect(serializeWorld(w)).toBe(saved);
 const copy=deserializeWorld(saved);
 for(let i=0;i<300;i++){stepWorld(w);stepWorld(copy);}
 expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const changed=deserializeWorld(saved);changed.households.find(h=>h.id===hh.id)!.relocations![0].successions![0].reason='left the household';
 expect(hashWorld(changed)).not.toBe(hash);
 expect(()=>deserializeWorld(saved.replace('"rulesVersion":54','"rulesVersion":53'))).toThrow('Invalid relocation extension state');
 expect(()=>deserializeWorld(saved.replace('"phase":"travelling"','"phase":"returning"'))).not.toThrow();
});
