import { describe, expect, it } from 'vitest';
import { abortActivity, newActivity, resumeSuspended, startActivity, suspendActivity } from '../src/sim/activities';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { describePerson } from '../src/sim/inspect';
import { liveLayoutClaims, LAYOUT_OCCUPANCY_WAIT } from '../src/sim/layout_claims';
import { findBuildSpot } from '../src/sim/buildings';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Person, World } from '../src/sim/types';
import { addPerson, done, pin, stage } from './helpers/kit';
import { occupiedSiteFixture } from './helpers/access';

function pair(sameHousehold = true, version = 30) {
  const s=stage('STAGED: layout claims');
  s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;
  const a=addPerson(s,'Ada',43.5,45.5,{hunger:98,thirst:98});
  const b=addPerson(s,'Ben',50.5,50.5,{hunger:98,thirst:98,...(sameHousehold?{hh:a.hhId}:{})});
  done(s);pin(a);pin(b);
  return {w:s.w,a,b};
}
function layout(w:World,p:Person,x=43,y=43) {
  const a=newActivity(w,p,{kind:'plan_site',label:'Marking out a hut',goal:'STAGED layout contract',tx:x+1,ty:y+1,spotX:x+0.5,spotY:y+2.5,minCommit:300,maxTicks:600,utility:100,data:{type:'hut',sx:x,sy:y,hh:p.hhId}});
  startActivity(w,p,a);return a;
}
function until(w:World,condition:()=>boolean,n=250) {
  for(let i=0;i<n&&!condition();i++)stepWorld(w);
  expect(condition()).toBe(true);
}

describe('pending layout arbitration',()=>{
  it('accepts the first layout and refuses a second household home, even at another footprint',()=>{
    const {w,a,b}=pair();layout(w,a);layout(w,b,60,60);
    expect(a.activity?.kind).toBe('plan_site');expect(b.activity).toBeNull();
    expect(b.lastResult?.detail).toContain('household already has a home layout');
    expect(liveLayoutClaims(w).map(c=>c.owner.id)).toEqual([a.id]);
  });
  it('arbitrates overlapping footprints and their access gap across households, while allowing separated layouts',()=>{
    const {w,a,b}=pair(false);layout(w,a);layout(w,b,45,43);
    expect(b.activity).toBeNull();expect(b.lastResult?.detail).toContain('access gap');
    layout(w,b,46,43);expect(b.activity?.kind).toBe('plan_site');
    expect(liveLayoutClaims(w)).toHaveLength(2);
  });
  for(const release of ['cancel','death','expire','suspend','household-change'] as const) {
    it(`releases without a ghost reservation on ${release}`,()=>{
      const {w,a,b}=pair(false);const first=layout(w,a);
      if(release==='cancel')abortActivity(w,a,'contract cancellation');
      if(release==='death')a.alive=false; // Availability boundary, independent of death cleanup.
      if(release==='expire')w.tick=first.expire+1;
      if(release==='suspend')suspendActivity(w,a);
      if(release==='household-change')a.hhId=b.hhId;
      expect(liveLayoutClaims(w)).toHaveLength(0);
      layout(w,b);expect(b.activity?.kind).toBe('plan_site');
      expect(liveLayoutClaims(w).map(c=>c.owner.id)).toEqual([b.id]);
    });
  }
  it('reacquires on resume, refusing a suspended layout whose footprint has since been claimed',()=>{
    const {w,a,b}=pair(false);layout(w,a);suspendActivity(w,a);layout(w,b);
    const loaded=deserializeWorld(serializeWorld(w));
    for(const q of [w,loaded]) {
      const person=q.persons.find(p=>p.id===a.id)!;
      expect(resumeSuspended(q,person)).toBe(false);
      expect(person.suspended).toBeNull();expect(person.activity).toBeNull();
      expect(person.lastResult?.detail).toContain('reserves this footprint');
    }
    expect(serializeWorld(loaded)).toBe(serializeWorld(w));
  });
  it('does not reveal pending layouts through candidate search, option scoring or mutate state during inspection',()=>{
    const {w,a,b}=pair(false);const beforeSpot=findBuildSpot(w,b,'hut',50,50,3,12,7);
    layout(w,a);const saved=serializeWorld(w);
    expect(findBuildSpot(w,b,'hut',50,50,3,12,7)).toEqual(beforeSpot);
    describePerson(w,b.id,{opportunities:true});liveLayoutClaims(w);
    expect(serializeWorld(w)).toBe(saved);
  });
  it('leaves rules 29 arbitration and state shape unchanged',()=>{
    const {w,a,b}=pair(true,29);layout(w,a);layout(w,b);
    expect(a.activity?.data.layoutClaimed).toBeUndefined();
    expect(b.activity?.kind).toBe('plan_site');expect(liveLayoutClaims(w)).toEqual([]);
  });
  it('revalidates household ownership on arrival, and releases the stale claim',()=>{
    const {w,a,b}=pair(false);layout(w,a);a.hhId=b.hhId;
    delete a.cooldowns.pause;
    until(w,()=>a.lastResult?.outcome==='failed');
    expect(a.lastResult?.detail).toContain('no longer belongs');
    expect(w.sites).toHaveLength(0);expect(liveLayoutClaims(w)).toHaveLength(0);
  });
  it('keeps the same winner and complete state after saving two competing start attempts',()=>{
    const {w,a,b}=pair(false);layout(w,a);
    const loaded=deserializeWorld(serializeWorld(w));
    for(const q of [w,loaded]) {
      layout(q,q.persons.find(p=>p.id===b.id)!);
      expect(liveLayoutClaims(q).map(c=>c.owner.id)).toEqual([a.id]);
    }
    expect(serializeWorld(w)).toBe(serializeWorld(loaded));
  });
  it('fingerprints the saved wait and pending footprint rather than only activity progress',()=>{
    const {w,a}=pair();const act=layout(w,a);const before=hashWorld(w);
    act.data.sx++;expect(hashWorld(w)).not.toBe(before);act.data.sx--;
    act.data.layoutWaitSince=5;expect(hashWorld(w)).not.toBe(before);
    const loaded=deserializeWorld(serializeWorld(w));expect(hashWorld(loaded)).toBe(hashWorld(w));
  });
});

describe('safe recovery after footprint occupancy',()=>{
  it('waits without placing a site, survives a save, then creates exactly one site when the occupant leaves',()=>{
    const {w,builder,occupant,begin}=occupiedSiteFixture(30);const inv={...builder.inv};begin();
    until(w,()=>builder.activity?.data.layoutWaitSince!==undefined);
    expect(w.sites).toHaveLength(0);expect(builder.activity?.blocked).toContain('waiting for someone');
    const beforeView=serializeWorld(w);
    expect(describePerson(w,builder.id)!.activity?.blocked).toContain('waiting for someone');
    expect(serializeWorld(w)).toBe(beforeView);
    expect(liveLayoutClaims(w)).toHaveLength(1);
    const loaded=deserializeWorld(serializeWorld(w));
    for(const q of [w,loaded]) {
      const other=q.persons.find(p=>p.id===occupant.id)!;other.x=50;
      until(q,()=>q.sites.length===1);
      expect(q.sites[0].hhId).toBe(builder.hhId);
      expect(q.persons.find(p=>p.id===builder.id)!.inv).toEqual(inv);
      expect(conservationReport(q).ok).toBe(true);expect(liveLayoutClaims(q)).toHaveLength(0);
    }
    expect(serializeWorld(w)).toBe(serializeWorld(loaded));
  });
  it('bounds the wait, releases the claim and permits a new safe layout without moving the occupant',()=>{
    const {w,builder,occupant,begin}=occupiedSiteFixture(30);begin();
    until(w,()=>builder.activity?.data.layoutWaitSince!==undefined);
    const since=builder.activity!.data.layoutWaitSince;
    until(w,()=>builder.lastResult?.outcome==='failed',LAYOUT_OCCUPANCY_WAIT+5);
    expect(builder.lastResult?.detail).toContain('stayed occupied');
    expect(builder.lastResult!.tick-since).toBe(LAYOUT_OCCUPANCY_WAIT);
    expect(w.sites).toHaveLength(0);expect(liveLayoutClaims(w)).toHaveLength(0);
    const spot=findBuildSpot(w,builder,'hut',44,44,4,16,8)!;expect(spot).not.toBeNull();
    expect(spot.x===43&&spot.y===43).toBe(false);
    layout(w,builder,spot.x,spot.y);
    until(w,()=>w.sites.length===1,400);
    expect(occupant.x).toBe(43.5);expect(occupant.y).toBe(43.5);
    expect(conservationReport(w).ok).toBe(true);
  });
  it('keeps the original activity expiry authoritative during the wait',()=>{
    const {w,builder,begin}=occupiedSiteFixture(30);begin();
    until(w,()=>builder.activity?.data.layoutWaitSince!==undefined);
    builder.activity!.expire=w.tick+2;
    until(w,()=>builder.lastResult?.outcome==='failed',6);
    expect(builder.lastResult?.detail).toBe('took too long');
    expect(w.sites).toHaveLength(0);expect(liveLayoutClaims(w)).toHaveLength(0);
  });
  it('still refuses a permanently obstructed door rather than treating it as a passer-by',()=>{
    const {w,builder,occupant,begin}=occupiedSiteFixture(30);occupant.x=50;
    // Add a building door to the proposed footprint after layout selection.
    begin();w.buildings.push({ent:'building',id:99999,type:'lean_to',x:40,y:40,w:1,h:1,condition:100,hhId:occupant.hhId,store:{items:{},cap:0},fuel:0,builtTick:0,doorX:43,doorY:43,variant:0,inside:[]});
    until(w,()=>builder.lastResult?.outcome==='failed');
    expect(builder.lastResult?.detail).toBe('the footprint would obstruct access');
    expect(w.sites).toHaveLength(0);expect(liveLayoutClaims(w)).toHaveLength(0);
  });
});
