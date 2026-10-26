// One preselected household in an ordinary world; observation only, no assigned actions.
// npx --no-install vite-node scripts/shelter_journey.ts --out <unused-directory>
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { observeInhabitant } from '../src/agent/observe';
import { DAY, isHomeType, isSolidHome } from '../src/sim/constants';
import { openSitesNear } from '../src/sim/act_build';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { describePerson } from '../src/sim/inspect';
import { stageOf } from '../src/sim/people';
import { settlementAnchor } from '../src/sim/options_work';
import { currentWorldSettings } from '../src/sim/profiles';
import { rulesOf } from '../src/sim/rules';
import { believesHoused, ownHomeBeliefFor, ownHomeSiteBelief } from '../src/sim/shelter';
import { toolReport } from '../src/sim/toolreg';
import type { Person, Site, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { deepEqualState, firstDiffs } from './statediff';

const at = process.argv.indexOf('--out');
const out = at < 0 ? undefined : process.argv[at + 1];
if (!out || out.startsWith('--') || existsSync(out)) throw new Error('Supply an unused --out directory');
mkdirSync(out, { recursive: true });
const settings = currentWorldSettings('normal', 'river', { immigration: false });
const world = createWorld(settings), twin = createWorld(settings);
const homeType = (w: World, id: number) => { const e = w.byId.get(id); return e?.ent === 'building' ? e.type : null; };
// Chosen before stepping: first stable-ID household with two adults and no solid home.
// If none exists, first household. No selection based on eventual progress or success.
const focus = [...world.households].sort((a, b) => a.id - b.id).find(h => {
  const type = homeType(world, h.homeId);
  return (!type || !isSolidHome(type)) && h.members.filter(id => {
    const p = world.persons.find(q => q.id === id); return p?.alive && stageOf(world, p) === 'adult';
  }).length >= 2;
}) ?? world.households[0];
if (!focus) throw new Error('No household');
const hhId = focus.id;
const initial = JSON.parse(JSON.stringify({ household: focus, homeType: homeType(world, focus.homeId), members: world.persons.filter(p => p.hhId === hhId).map(p => ({ id:p.id,name:p.name,stage:stageOf(world,p),inv:p.inv,needs:p.needs })) }));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const story: { tick: number; kind: string; data: unknown }[] = [];
const record = (kind: string, data: unknown) => story.push({tick:world.tick,kind,data:clone(data)});
const transfers: unknown[] = [], activities: unknown[] = [], observations: unknown[] = [];
const trackedSites = new Map<number, Site>();
const snapshots = new Map<string, string>();
const seen = new Map<string, string>();
const checkpoints: unknown[] = [], failures: unknown[] = [];
let restored: World | undefined, restoredAt = -1, looks = 0;
function equal(a: unknown, b: unknown, label: string): boolean {
  const ok = deepEqualState(a,b);
  if (!ok) failures.push({tick:world.tick,label,diffs:firstDiffs(a,b,12)});
  return ok;
}
function changed(key: string, value: unknown, kind: string): void {
  const text=JSON.stringify(value); if(seen.get(key)===text)return;
  seen.set(key,text); record(kind,value);
}
function personal(p: Person) {
  return {id:p.id,name:p.name,household:p.hhId,position:{x:p.x,y:p.y},inv:p.inv,needs:p.needs,
    believesHoused:believesHoused(p),homeBelief:ownHomeBeliefFor(p),siteBelief:ownHomeSiteBelief(p),
    decision:p.lastDecision,activity:p.activity ? {kind:p.activity.kind,label:p.activity.label,goal:p.activity.goal,phase:p.activity.phase,target:p.activity.targetId,data:p.activity.data} : null};
}
world.hooks = {
  onTransfer(info) {
    if (info.item!=='wood' && info.item!=='stone') return;
    const from = world.byId.get(Number(info.from.split(':')[1]));
    const to = world.byId.get(Number(info.to.split(':')[1]));
    const flow={tick:world.tick,...info,fromPosition:from ? {x:from.x,y:from.y,kind:from.ent}:null,toPosition:to ? {x:to.x,y:to.y,kind:to.ent}:null};
    transfers.push(clone(flow));
    if(to?.ent==='site' && to.hhId===hhId && isHomeType(to.type)) record('physical-delivery',flow);
  },
  onActivityStart(p,a) {
    const target=world.byId.get(a.targetId);
    if(p.hhId===hhId || (target?.ent==='site' && target.hhId===hhId && isHomeType(target.type))) {
      activities.push(clone({tick:world.tick,person:personal(p),target:target ? {id:target.id,kind:target.ent,x:target.x,y:target.y}:null}));
    }
  },
};
record('initial', initial);
let previousHome = focus.homeId;
const previousIndoors = new Map(world.persons.map(p=>[p.id,p.indoors??0]));
for(let t=0;t<=4*DAY;t++) {
  const hh=world.households.find(h=>h.id===hhId);
  if(hh && hh.homeId!==previousHome) {
    const b=world.byId.get(hh.homeId);
    record('home-assigned',{household:hh.id,previousHome,home:b}); previousHome=hh.homeId;
  }
  for(const s of world.sites.filter(s=>s.hhId===hhId && isHomeType(s.type))) {
    if(!trackedSites.has(s.id)) {record('site-created',s);if(!snapshots.has('site'))snapshots.set('site',serializeWorld(world));}
    const progress={id:s.id,type:s.type,required:s.required,delivered:s.delivered,used:s.used,workBand:Math.floor(s.work/100),status:s.status};
    changed('site:'+s.id,progress,'site-progress'); trackedSites.set(s.id,clone(s));
  }
  for(const [id,s] of [...trackedSites]) {
    if(world.sites.some(q=>q.id===id)) continue;
    const candidates=world.buildings.filter(b=>b.hhId===s.hhId && b.type===s.type && b.x===s.x && b.y===s.y && b.builtTick>=s.createdTick && (b.built??b.builtTick)>=world.tick-1);
    const b=candidates.length===1?candidates[0]:null;
    record(b?'site-completed':'site-removed-unresolved',{site:s,building:b,matchingBuildings:candidates.length});
    if(b&&!snapshots.has('completed'))snapshots.set('completed',serializeWorld(world));
    trackedSites.delete(id);
  }
  for(const p of world.persons.filter(p=>p.hhId===hhId)) {
    changed('decision:'+p.id,p.lastDecision,'member-decision:'+p.id);
    changed('result:'+p.id,p.lastResult,'member-result:'+p.id);
    if(p.lastResult?.label==='Marking out a hut' && p.lastResult.outcome==='failed' && !snapshots.has('layout-failure')) snapshots.set('layout-failure',serializeWorld(world));
    changed('plans:'+p.id,p.intentions.filter(i=>i.kind==='shelter'),'shelter-plans:'+p.id);
    const indoor=p.indoors??0, prev=previousIndoors.get(p.id)??0;
    if(indoor!==prev) {
      record(indoor?'entered':'exited',{person:p.id,name:p.name,from:prev,to:indoor,homeId:hh?.homeId,activity:p.activity?.kind,position:{x:p.x,y:p.y}});
      if(indoor && isSolidHome(homeType(world,indoor)!)&&!snapshots.has('occupied'))snapshots.set('occupied',serializeWorld(world));
      previousIndoors.set(p.id,indoor);
    }
    if(t%240===0 && p.alive) {
      const before=JSON.parse(serializeWorld(world));
      const ctx=generateOptions(world,p,true);
      const obs=observeInhabitant(world,p,ctx,rankOptions(ctx));
      const view=describePerson(world,p.id,{opportunities:true});
      const anchor=settlementAnchor(ctx), rules=rulesOf(world);
      observations.push(clone({tick:world.tick,id:p.id,observation:obs,plans:view?.plans,
        auditorConstructionContext:{anchor,openSitesNear:openSitesNear(world,anchor),maxOpenSites:rules.maxOpenSites,
          sites:world.sites.map(s=>({id:s.id,type:s.type,hh:s.hhId,x:s.x,y:s.y,status:s.status,required:s.required,delivered:s.delivered,used:s.used}))}}));looks++;
      equal(before,JSON.parse(serializeWorld(world)),'personal inspection purity');
    }
  }
  // Checkpoint while the first home site exists; day one is the fallback if none appears.
  if(!restored && (trackedSites.size>0 || t===DAY)) {
    restored=deserializeWorld(serializeWorld(world));restoredAt=t;
    equal(JSON.parse(serializeWorld(world)),JSON.parse(serializeWorld(restored)),'immediate load');
    record('save-checkpoint',{tick:t,siteIds:[...trackedSites.keys()]});
  }
  if(t%240===0) {
    const state=JSON.parse(serializeWorld(world));
    const exactTwin=equal(state,JSON.parse(serializeWorld(twin)),'unobserved twin');
    const exactContinuation=restored?equal(state,JSON.parse(serializeWorld(restored)),'saved continuation'):null;
    const ledger=conservationReport(world), tools=toolReport(world);
    if(!ledger.ok||!tools.ok)failures.push({tick:t,ledger,tools});
    checkpoints.push({tick:t,exactTwin,exactContinuation,ledger,tools});
  }
  if(t===4*DAY) break;
  stepWorld(world);stepWorld(twin);if(restored)stepWorld(restored);
}
const hh=world.households.find(h=>h.id===hhId);
const home=hh?world.byId.get(hh.homeId):null;
const final={household:hh??null,home:home??null,members:world.persons.filter(p=>p.hhId===hhId).map(p=>({alive:p.alive,indoors:p.indoors??0,...personal(p)})),openSites:world.sites.filter(s=>s.hhId===hhId && isHomeType(s.type))};
record('final',final);
const report={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),settings,selection:'Before stepping: first household by ID with two living adults and no solid home; fallback first household.',initial,final,until:world.tick,restoredAt,looks,checkpoints,failures,
  limits:'One predetermined river seed, four days, Normal profile. No commands, forced choices or staged supplies. Global site/ledger records are auditor evidence; personal observations alone describe inhabitant knowledge. Transfers are actual fungible goods movements; unique per-unit provenance is not asserted. No aggregate-benefit, universal replay or rendered-usability claim.'};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
writeFileSync(`${out}/story.json.gz`,gzipSync(JSON.stringify(story,null,2)));
writeFileSync(`${out}/transfers.json.gz`,gzipSync(JSON.stringify(transfers)));
writeFileSync(`${out}/activities.json.gz`,gzipSync(JSON.stringify(activities)));
writeFileSync(`${out}/observations.json.gz`,gzipSync(JSON.stringify(observations)));
writeFileSync(`${out}/final-world.json.gz`,gzipSync(serializeWorld(world)));
for(const [name,save] of snapshots) writeFileSync(`${out}/${name}.json.gz`,gzipSync(save));
console.log(JSON.stringify({source:report.source,household:initial.household,finalHome:home?.ent==='building'?{id:home.id,type:home.type,built:home.built}:null,storyLines:story.length,transfers:transfers.length,restoredAt,looks,checkpoints:checkpoints.length,failures},null,2));
process.exitCode=failures.length?1:0;
