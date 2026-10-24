import {expect,it,afterEach} from 'vitest';
import {occupiedSiteFixture} from './helpers/access';
import {stepWorld} from '../src/sim/world';
import {isWalkable} from '../src/sim/registry';
it('reproduces v18 private construction occupying a tile beneath a living person',()=>{
 const {w,occupant,begin}=occupiedSiteFixture();begin();for(let i=0;i<80&&!w.sites.length;i++)stepWorld(w);
 expect(w.sites).toHaveLength(1);expect(isWalkable(w,Math.floor(occupant.x),Math.floor(occupant.y))).toBe(false);
});

import {preservesAccess,setConstructionSafety} from '../src/sim/construction_access';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {describePerson} from '../src/sim/inspect';
import {findBuildSpot} from '../src/sim/buildings';
import {building} from './helpers/kit';
import {parseIntervention} from '../scripts/lab/lab';
import {newActivity,startActivity} from '../src/sim/activities';
afterEach(()=>setConstructionSafety(true));
it('current construction refuses the footprint, preserving the occupant and private materials',()=>{
 const {w,builder,occupant,begin}=occupiedSiteFixture(19);const pack={...builder.inv};begin();
 for(let i=0;i<80&&!builder.lastResult;i++)stepWorld(w);
 expect(w.sites).toHaveLength(0);expect(builder.lastResult?.detail).toBe('the footprint would obstruct access');
 expect(isWalkable(w,Math.floor(occupant.x),Math.floor(occupant.y))).toBe(true);expect(builder.inv).toEqual(pack);expect(conservationReport(w).ok).toBe(true);
 const before=serializeWorld(w);expect(describePerson(w,builder.id)!.qa.lastAttempt).toContain('obstruct access');expect(serializeWorld(w)).toBe(before);
});
it('a person entering during layout is checked at the mutation boundary, including mid-layout loading',()=>{
 const {w,builder,occupant,begin}=occupiedSiteFixture(19);occupant.x=50;begin();
 for(let i=0;i<12;i++)stepWorld(w);expect(builder.activity?.kind).toBe('plan_site');occupant.x=43.5;
 const loaded=deserializeWorld(serializeWorld(w));for(let i=0;i<40;i++){stepWorld(w);stepWorld(loaded);}
 expect(w.sites).toHaveLength(0);expect(serializeWorld(w)).toBe(serializeWorld(loaded));
});
it('safe ordinary homes are still laid out, and the ablation restores the historical failure',()=>{
 for(const safe of [true,false]){
  const {w,occupant,begin}=occupiedSiteFixture(19);const restore=!safe?parseIntervention('rich-unsafe-sites').install!():()=>{};
  if(safe)occupant.x=50;
  try{begin();for(let i=0;i<80&&!w.sites.length;i++)stepWorld(w);expect(w.sites).toHaveLength(1);expect(conservationReport(w).ok).toBe(true);}finally{restore();}
 }
});
it('protects a narrow essential corridor and a household exit even when nobody is outdoors',()=>{
 const {w,builder,occupant}=occupiedSiteFixture(19);builder.x=10;occupant.x=11;
 w.solid.fill(1);for(let x=10;x<=60;x++)for(const y of [20,21])w.solid[y*w.W+x]=0;
 expect(preservesAccess(w,30,20,2,2)).toBe(false);
 w.solid.fill(0);const home=building({w,rng:w.rng},'hut',30,30,builder.hhId);occupant.indoors=home.id;
 expect(preservesAccess(w,home.doorX,home.doorY,1,1)).toBe(false);
 expect(preservesAccess(w,45,45,2,2)).toBe(true);
});
it('planner excludes the occupied candidate but finds an ordinary clear plot without observer mutation',()=>{
 const {w,builder}=occupiedSiteFixture(19);const before=serializeWorld(w);
 const spot=findBuildSpot(w,builder,'hut',44,44,0,0,0);expect(spot).toBeNull();
 expect(findBuildSpot(w,builder,'hut',55,55,0,4,2)).not.toBeNull();expect(serializeWorld(w)).toBe(before);
});
it('a same-footprint hut upgrade remains possible with an inhabitant inside',()=>{
 const {w,builder,occupant}=occupiedSiteFixture(19);const home=building({w,rng:w.rng},'hut',40,40,builder.hhId);occupant.indoors=home.id;home.inside=[occupant.id];
 builder.x=40.5;builder.y=42.5;
 startActivity(w,builder,newActivity(w,builder,{kind:'plan_site',label:'Rebuild hut',goal:'staged upgrade',tx:41,ty:41,spotX:40.5,spotY:42.5,minCommit:200,maxTicks:500,utility:100,data:{type:'house',sx:40,sy:40,hh:builder.hhId,upgradeOf:home.id}}));
 for(let i=0;i<80&&!w.sites.length;i++)stepWorld(w);
 expect(w.sites[0]?.upgradeOf).toBe(home.id);expect(home.inside).toContain(occupant.id);expect(isWalkable(w,home.doorX,home.doorY)).toBe(true);
});
