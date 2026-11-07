// Rules 163: what a household left behind does not stay locked to a household that no longer exists (src/sim/estate_release.ts).
// Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. Each contrast runs the same scene at
// rules 162 (the parcel stays stamped for the dissolved household, so nobody may take it) and at 163.
import {describe,expect,it} from 'vitest';
import {stage,addPerson,done,give,pin} from './helpers/kit';
import {killPerson,adoptOrphans} from '../src/sim/lifecycle';
import {householdById} from '../src/sim/households';
import {startActivity,newActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {setExternalController} from '../src/sim/external';
import {observe} from '../src/sim/knowledge';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describeEntity} from '../src/sim/inspect';
import {toolReport} from '../src/sim/toolreg';
import {CURRENT_RULES_VERSION,SUPPORTED_RULES_VERSIONS} from '../src/sim/rulesversion';
import {parseIntervention} from '../scripts/lab/lab';
import type {World,Person,Pile,Items} from '../src/sim/types';

/** Ada (and, when asked, her child Tam) in one household; Oren, a generous neighbour, and Pia, a distant stranger, each in their own. */
function scene(version:number,withChild=false){
 const s=stage('staged-estate-release');s.w.settings.rulesVersion=version;s.w.settings.dynamics='rich';
 const ada=addPerson(s,'Ada',40.5,40.5,{age:34,inv:{wood:3,bread:1},hunger:100,thirst:100,energy:100});
 const tam=withChild?addPerson(s,'Tam',41.5,40.5,{age:6,hh:ada.hhId,hunger:100,thirst:100,energy:100}):null;
 const oren=addPerson(s,'Oren',44.5,40.5,{age:30,traits:{generosity:1},hunger:100,thirst:100,energy:100});
 const pia=addPerson(s,'Pia',60.5,60.5,{age:30,traits:{generosity:0},hunger:100,thirst:100,energy:100});
 const axe=give(s.w,ada,'axe');
 done(s);for(const p of [ada,tam,oren,pia])if(p){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 snapshotInitial(s.w);
 return {w:s.w,ada,tam,oren,pia,axe};
}
function collect(w:World,p:Person,pile:Pile,items:Items){p.x=pile.x+.5;p.y=pile.y+1.5;p.cooldowns.pause=0;p.nextThink=w.tick+1000;const a=newActivity(w,p,{kind:'withdraw',label:'Staged estate collection',goal:'recover belongings physically',targetId:pile.id,targetType:'pile',here:true,utility:100,minCommit:100,maxTicks:200,data:{items}});startActivity(w,p,a);return a;}
function advance(w:World,n=40){const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let k=0;k<n;k++)stepWorld(w);}finally{release();}}
const parcelOf=(w:World)=>w.piles.find(p=>p.estate)!;
function sound(w:World){expect(conservationReport(w).ok).toBe(true);expect(toolReport(w).ok).toBe(true);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);}

describe('rules 163 is registered',()=>{
 it('is the current version and a supported one',()=>{expect(CURRENT_RULES_VERSION).toBe(163);expect(SUPPORTED_RULES_VERSIONS).toContain(163);});
});

describe('the last member of a household dies',()=>{
 it('rules 163 makes the parcel shared property, tools included, and a neighbour can collect it; rules 162 leaves it locked to a household nobody belongs to',()=>{
  for(const version of [162,163]){
   const f=scene(version),hhA=f.ada.hhId;killPerson(f.w,f.ada,'declared staged loss');
   expect(householdById(f.w,hhA),'the household is gone').toBeUndefined();
   const pile=parcelOf(f.w);expect(pile.items).toMatchObject({wood:3,bread:1,axe:1});
   expect(pile.estate!.hhId,`owner at rules ${version}`).toBe(version>=163?0:hhA);
   expect(f.axe.holder).toBe(pile.id);expect(f.axe.ownerHh,`axe owner at rules ${version}`).toBe(version>=163?0:hhA);
   collect(f.w,f.oren,pile,{wood:2});advance(f.w);
   expect((f.oren.inv.wood??0)>0,`collected at rules ${version}`).toBe(version>=163);
   expect(pile.items.wood,`left in place at rules ${version}`).toBe(version>=163?3-(f.oren.inv.wood??0):3);
   sound(f.w);
  }
 });
 it('a neighbour who sees the released parcel is offered it; at rules 162 nobody is',()=>{
  for(const version of [162,163]){
   const f=scene(version);killPerson(f.w,f.ada,'declared staged loss');const pile=parcelOf(f.w);observe(f.w,f.oren,pile);
   const offered=generateOptions(f.w,f.oren,true,true).options.some(o=>o.kind==='withdraw'&&o.targetId===pile.id);
   expect(offered,`offered at rules ${version}`).toBe(version>=163);
  }
 });
 it('the inspector and the feed say what became of the belongings',()=>{
  const f=scene(163);killPerson(f.w,f.ada,'declared staged loss');const pile=parcelOf(f.w);
  expect(describeEntity(f.w,pile.id)!.rows).toContainEqual(['Belongs to','Shared property']);
  expect(f.w.events.some(e=>e.kind==='life'&&e.text.includes("anyone's to take"))).toBe(true);
  const g=scene(162);killPerson(g.w,g.ada,'declared staged loss');
  expect(g.w.events.some(e=>e.text.includes("anyone's to take"))).toBe(false);
 });
});

describe('the last member of a household is taken into another',()=>{
 it('rules 163 passes the parcel to the household that took the child in; rules 162 locks the child and the carers out of it',()=>{
  for(const version of [162,163]){
   const f=scene(version,true),hhA=f.ada.hhId;killPerson(f.w,f.ada,'declared staged loss');
   const pile=parcelOf(f.w);expect(pile.estate!.hhId,'the child keeps the household alive').toBe(hhA);expect(householdById(f.w,hhA)).toBeDefined();
   adoptOrphans(f.w);
   expect(f.tam!.hhId,'Oren took Tam in').toBe(f.oren.hhId);expect(householdById(f.w,hhA),'the old household is gone').toBeUndefined();
   expect(pile.estate!.hhId,`owner at rules ${version}`).toBe(version>=163?f.oren.hhId:hhA);
   expect(f.axe.ownerHh,`axe owner at rules ${version}`).toBe(version>=163?f.oren.hhId:hhA);
   collect(f.w,f.oren,pile,{wood:2});advance(f.w);
   expect((f.oren.inv.wood??0)>0,`the carer collects at rules ${version}`).toBe(version>=163);
   collect(f.w,f.pia,pile,{bread:1});advance(f.w);
   expect(f.pia.inv.bread??0,'a stranger never may').toBe(0);expect(pile.items.bread).toBe(1);
   if(version>=163){
    expect(describeEntity(f.w,pile.id)!.rows).toContainEqual(['Belongs to',householdById(f.w,f.oren.hhId)!.name]);
    expect(f.w.events.some(e=>e.kind==='life'&&e.text.includes('passed to')&&e.ids.includes(f.tam!.id))).toBe(true);
   }
   sound(f.w);
  }
 });
});

describe('the lab removal',()=>{
 it('restores the rules-162 behaviour inside a rules-163 world and nothing else',async()=>{
  const {setEstateRelease,estateReleaseOn}=await import('../src/sim/estate_release');
  expect(estateReleaseOn()).toBe(true);setEstateRelease(false);
  try{
   const f=scene(163),hhA=f.ada.hhId;killPerson(f.w,f.ada,'declared staged loss');const pile=parcelOf(f.w);
   expect(pile.estate!.hhId).toBe(hhA);expect(f.axe.ownerHh).toBe(hhA);
   collect(f.w,f.oren,pile,{wood:2});advance(f.w);expect(f.oren.inv.wood??0).toBe(0);sound(f.w);
  }finally{setEstateRelease(true);}
  expect(estateReleaseOn()).toBe(true);
 });
 it('is registered as the lab branch rich-no-estate-release, which installs and uninstalls the switch',async()=>{
  const {estateReleaseOn}=await import('../src/sim/estate_release');
  const off=parseIntervention('rich-no-estate-release').install!();
  try{expect(estateReleaseOn()).toBe(false);const f=scene(163),hhA=f.ada.hhId;killPerson(f.w,f.ada,'declared staged loss');expect(parcelOf(f.w).estate!.hhId).toBe(hhA);}
  finally{off();}
  expect(estateReleaseOn()).toBe(true);
 });
});
