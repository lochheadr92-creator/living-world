import { killPerson } from '../src/sim/lifecycle';
import { hashWorld } from '../src/sim/world';
import { preservesAccess } from '../src/sim/construction_access';
import { civicFixture as fixture, civicTalk as talk } from './helpers/civic';
import { setExternalController } from '../src/sim/external';
import { afterEach, expect, it } from 'vitest';
import { addPerson, building, done, stage } from './helpers/kit';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { createSite, cancelSite, completeSite } from '../src/sim/buildings';
import { newActivity, startActivity, handlerOf } from '../src/sim/activities';
import { observe } from '../src/sim/knowledge';
import { makeSource } from '../src/sim/sources';
import { relOf } from '../src/sim/relations';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { describePerson, describeEntity } from '../src/sim/inspect';
import { stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { proposeProject, townshipOf, participation, reviewParticipation, organiserExperience, setTownships, mayWorkProject } from '../src/sim/townships';
import type { Person, World } from '../src/sim/types';
afterEach(() => setTownships(true));
it('assigns every founder to a stable township without using position as membership',()=>{
 const w=createWorld(currentWorldSettings('large','civic-members'));
 expect(w.townships).toHaveLength(4);
 expect(w.households.every(h=>h.townshipId && w.townships?.some(t=>t.id===h.townshipId))).toBe(true);
 const p=w.persons[0], town=townshipOf(w,p)!.id;
 p.x=w.townships![3].x;p.y=w.townships![3].y;
 expect(townshipOf(w,p)!.id).toBe(town);
 expect(deserializeWorld(serializeWorld(w)).households).toEqual(w.households);
});
it('does not stamp township state onto previous generations; lab ablation restores',()=>{
 const w=createWorld({...currentWorldSettings('normal','civic-old'),rulesVersion:11});
 expect(w.townships).toBeUndefined(); expect(w.households.every(h=>h.townshipId===undefined)).toBe(true);
 const restore=parseIntervention('rich-no-townships').install!();
 expect(createWorld(currentWorldSettings('normal','civic-off')).townships).toBeUndefined(); restore();
 expect(createWorld(currentWorldSettings('normal','civic-on')).townships!.length).toBe(1);
});
it('a visible site alone does not enrol anyone or give its organiser their inventory',()=>{
 const {w,a,b,site}=fixture(); const before={...b.inv};observe(w,b,site);
 expect(participation(w,b,site.id)).toBeUndefined();expect(mayWorkProject(w,b,site.id)).toBe(false);
 expect(generateOptions(w,b).options.some(o=>o.targetId===site.id && (o.kind==='haul'||o.kind==='build'))).toBe(false);
 expect(b.inv).toEqual(before);expect(site.hhId).toBe(0);expect(w.civicProjects![0].organiserId).toBe(a.id);
});
it('co-present conversation records voluntary support, a real promise, and told site knowledge',()=>{
 const {w,a,b,site}=fixture();talk(w,a,b,site.id);
 expect(participation(w,b,site.id)?.status).toBe('supporting');
 expect(b.commitments.some(c=>c.siteId===site.id && c.kind==='help_build')).toBe(true);
 expect(b.beliefs[site.id]).toBeDefined();expect(w.civicProjects![0].participants[1].work).toBe(0);
 expect(conservationReport(w)).toEqual({ok:true,diffs:[]});
});
it('records a refusal without a commitment or contribution',()=>{
 const {w,a,b,site}=fixture(false);talk(w,a,b,site.id);
 expect(participation(w,b,site.id)?.status).toBe('refused');expect(b.commitments).toHaveLength(0);
 expect(participation(w,b,site.id)?.materials).toEqual({});
});
it('urgent needs withdraw participation and preserve the actual reason on the promise',()=>{
 const {w,a,b,site}=fixture();talk(w,a,b,site.id);b.needs.thirst=5; reviewParticipation(w,b);
 expect(participation(w,b,site.id)?.status).toBe('withdrawn');
 expect(b.commitments[0].status).toBe('interrupted');
 expect(w.requests.find(r=>r.id===b.commitments[0].requestId)?.note).toMatch(/survival/);
 expect(mayWorkProject(w,b,site.id)).toBe(false);
});
it('observer views leave the complete serialized state unchanged',()=>{
 const {w,a,b,site}=fixture();talk(w,a,b,site.id);const before=serializeWorld(w);
 for(let i=0;i<3;i++){describePerson(w,a.id);describePerson(w,b.id);describeEntity(w,site.id);}
 expect(serializeWorld(w)).toBe(before);
 expect(describePerson(w,a.id)!.civic.lines.join(' ')).toMatch(/Ben: supporting/);
});
it('save/load mid-promise continues with identical full state',()=>{
 const {w,a,b,site}=fixture();talk(w,a,b,site.id);a.cooldowns.pause=0;b.cooldowns.pause=0;
 const copy=deserializeWorld(serializeWorld(w));
 for(let i=0;i<400;i++){stepWorld(w);stepWorld(copy);}
 expect(serializeWorld(copy)).toBe(serializeWorld(w));
});
it('failure persists and only local witnesses learn the organiser outcome',()=>{
 const {w,a,b,site}=fixture();talk(w,a,b,site.id);b.x=70;b.y=70;a.x=42;a.y=44;delete a.indoors;
 cancelSite(w,site,'the site could not be supplied');
 expect(w.civicProjects![0].status).toBe('failed');
 expect(w.civicProjects![0].outcome).toBe('the site could not be supplied');
 expect(organiserExperience(b,a.id)).toBe(0);expect(organiserExperience(a,a.id)).toBeLessThan(0);
 expect(deserializeWorld(serializeWorld(w)).civicProjects).toEqual(w.civicProjects);
});
it('proposes from known homes, not an unseen home elsewhere',()=>{
 const s=stage('civic-propose');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=12;
 const a=addPerson(s,'Ada',40,40,{inv:{berries:8},hunger:98,thirst:98,traits:{generosity:1,sociability:1,diligence:1}});
 const home=building(s,'hut',35,40,a.hhId,{berries:12});s.w.households[0].homeId=home.id;
 for(const [x,y] of [[45,38],[46,38],[47,38]]) observe(s.w,a,makeSource(s.w,'tree',x,y,10));
 observe(s.w,a,makeSource(s.w,'rock',45,46,10));done(s);
 delete a.beliefs[home.id];a.bykind.building=(a.bykind.building??[]).filter(id=>id!==home.id);
 expect(generateOptions(s.w,a).options.some(o=>o.key==='plan_site:storehouse')).toBe(false);
 observe(s.w,a,home);
 const o=generateOptions(s.w,a).options.find(o=>o.key==='plan_site:storehouse');expect(o).toBeDefined();
 const act=o!.make!();expect(act).toBeTruthy();startActivity(s.w,a,act!);
 for(let i=0;i<700 && !s.w.civicProjects?.length;i++)stepWorld(s.w);
 expect(s.w.civicProjects).toHaveLength(1);expect(s.w.civicProjects![0].organiserId).toBe(a.id);
});

it('two volunteers physically supply and finish a public storehouse with conserved goods', () => {
 const {w,a,b,site}=fixture();talk(w,a,b,site.id);
 const restore=setExternalController({controls:()=>true, choose:(_w,_p,_ctx,ranked)=>{
  const o=ranked.find(o=>o.targetId===site.id && (o.kind==='haul'||o.kind==='build'));
  return o ? {kind:'pick',key:o.key} : {kind:'fallback',reason:'no project step offered'};
 }});
 try { for(let i=0;i<5000 && w.civicProjects![0].status==='active';i++)stepWorld(w); } finally { restore(); }
 const project=w.civicProjects![0];
 expect(project.status,JSON.stringify(project)).toBe('completed');
 expect(w.byId.get(project.buildingId!)?.ent).toBe('building');
 expect((w.byId.get(project.buildingId!) as {hhId:number}).hhId).toBe(0);
 expect(project.participants.reduce((n,p)=>n+(p.materials.wood??0),0)).toBe(10);
 expect(project.participants.reduce((n,p)=>n+(p.materials.stone??0),0)).toBe(4);
 expect(project.participants.reduce((n,p)=>n+p.work,0)).toBeCloseTo(640,5);
 expect(project.participants.filter(p=>p.work>0 || Object.keys(p.materials).length>0)).toHaveLength(2);
 expect(conservationReport(w)).toEqual({ok:true,diffs:[]});
 expect(deserializeWorld(serializeWorld(w)).civicProjects).toEqual(w.civicProjects);
});

it('refuses a footprint across an essential corridor and preserves an open site',()=>{
 const {w}=fixture();w.solid.fill(1);
 for(let x=10;x<=30;x++)w.solid[20*w.W+x]=0;
 expect(preservesAccess(w,20,20,2,1)).toBe(false);
 w.solid.fill(0);expect(preservesAccess(w,20,20,2,2)).toBe(true);
});
it('rejects invalid saved membership instead of guessing a settlement',()=>{
 const {w}=fixture();w.households[0].townshipId=999999;
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/Unknown household township/);
});

it('organiser death leaves no inherited office and does not cancel another volunteer',()=>{
 const {w,a,b,site}=fixture();talk(w,a,b,site.id);killPerson(w,a,'test organiser departure');
 expect(w.civicProjects![0].organiserId).toBe(a.id);
 expect(mayWorkProject(w,b,site.id)).toBe(true);
 expect(describePerson(w,b.id)!.civic.lines.join(' ')).toMatch(/no longer present/);
});
it('compact fingerprints include civic membership and contributions',()=>{
 const {w}=fixture();const before=hashWorld(w);w.civicProjects![0].participants[0].work++;
 expect(hashWorld(w)).not.toBe(before);
});
it('saves in the middle of physical hauling and completes identically after loading',()=>{
 const {w,a,b,site}=fixture();talk(w,a,b,site.id);
 const restore=setExternalController({controls:()=>true, choose:(_w,_p,_ctx,ranked)=>{
  const o=ranked.find(o=>o.targetId===site.id&&(o.kind==='haul'||o.kind==='build'));
  return o?{kind:'pick',key:o.key}:{kind:'fallback',reason:'no project step offered'};
 }});
 try {
  for(let i=0;i<1000&&!w.persons.some(p=>p.activity?.kind==='haul');i++)stepWorld(w);
  expect(w.persons.some(p=>p.activity?.kind==='haul')).toBe(true);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<1400;i++){stepWorld(w);stepWorld(copy);}
  expect(w.civicProjects![0].status).toBe('completed');
  expect(serializeWorld(copy)).toBe(serializeWorld(w));
 } finally {restore();}
});
