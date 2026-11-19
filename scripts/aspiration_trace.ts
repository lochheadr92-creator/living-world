import {readFileSync, writeFileSync} from 'node:fs';
import {DAY} from '../src/sim/constants';
import {homeOf, householdOf} from '../src/sim/buildings';
import {conservationReport} from '../src/sim/economy';
import {goalNudge, goalProgress} from '../src/sim/life';
import type {Option} from '../src/sim/optutil';
import type {Activity, Goal, Person, World} from '../src/sim/types';
import {hashWorld, stepWorld} from '../src/sim/world';
import {argsOf, worldFromArgs} from './world_args';

const {opt} = argsOf(process.argv);
const {w, startDay} = worldFromArgs(opt);
if (startDay !== 96 || w.settings.rulesVersion !== 259 || !w.settings.immigration) throw Error('Unexpected winter start');
const start = w.tick;
const initial = hashWorld(w);
const reference = JSON.parse(readFileSync(opt('reference', ''), 'utf8'));
const payoffDay = opt('payoff-day','off') === 'on';
const end = payoffDay ? start + DAY : reference.end;
const expectedEnd = payoffDay ? reference.end : reference.endHash;
if (initial !== (payoffDay ? reference.start : reference.initial) || (!payoffDay && reference.start !== start)) throw Error('Reference start differs');

function newRow(p: Person, g: Goal) {
  return {id:p.id, name:p.name, kind:g.companyHope ? 'company' : g.kind, goal:structuredClone(g),
    entered:w.tick, entry:g.progress, last:g.progress, peak:g.progress, low:g.progress, up:0, down:0, done:g.done,
    decisions:0, offered:0, selected:0, outcomes:{} as Record<string,number>, actions:{} as Record<string,number>,
    liveEnd:null as number|null, checkpoints:[] as [number,number][]};
}
type Row = ReturnType<typeof newRow>;
const rows = new Map<string,Row>();
function observe(p: Person) {
  const g = p.goal;
  if (!g || !p.alive) return;
  const key = [p.id,g.since,g.companyHope?.since ?? 0].join('/');
  let row = rows.get(key);
  if (!row) {row = newRow(p,g); rows.set(key,row);}
  if (g.progress !== row.last) {
    if (g.progress > row.last) row.up++; else row.down++;
    row.checkpoints.push([w.tick,g.progress]);
    row.peak = Math.max(row.peak,g.progress);
    row.low = Math.min(row.low,g.progress);
    row.last = g.progress;
  }
  row.done = g.done;
  return row;
}
function add(counts: Record<string,number>, key:string) { counts[key] = (counts[key] ?? 0)+1; }
type Link = {id:number;actor:number;target:number;action:string;goal:string;homeTarget:boolean;affinityBefore:number|null;affinityAfter?:number|null;progressBefore:number;progressAfter?:number;outcome?:string;mode:string};
const links = new Map<number,Link>();
const aligned = new Map<number,Row>();
const inFlight = new Map<number,{row:Row;before:number;key:string}>();
const payoff:Record<string,Record<string,number>> = {};
const proposals:{tick:number;person:string;target:number;goal:string;end?:number;outcome?:string;detail?:string}[] = [];
const proposalIds = new Map<number,number>();
const contacts = new Map<string,{actor:number;target:number;chosen:number;outcomes:Record<string,number>;firstTrust:number;lastTrust:number;firstAffinity:number;lastAffinity:number}>();
Object.assign(globalThis, {observeGoalChoice(world:World,p:Person,ranked:Option[],chosen:Option|null,act:Activity|null) {
  if (chosen && act && chosen.kind === 'socialize') {
    const target = chosen.targetId;
    const key = [p.id,target].join('/');
    const rel = p.relations[target];
    const pair = contacts.get(key) ?? {actor:p.id,target,chosen:0,outcomes:{},firstTrust:rel?.trust??0,lastTrust:0,firstAffinity:rel?.affinity??0,lastAffinity:0};
    pair.chosen++; pair.lastTrust = rel?.trust??0; pair.lastAffinity = rel?.affinity??0; contacts.set(key,pair);
    if (chosen.tag === 'household' && ['to become a couple','to share a household'].includes(chosen.goal)) {
      proposalIds.set(act.id,proposals.length);
      proposals.push({tick:w.tick,person:p.name,target,goal:chosen.goal});
    }
  }
  if (!p.goal || p.goal.done) return;
  const row = observe(p)!;
  row.decisions++;
  if (payoffDay && chosen && act) {
    const match = goalNudge(world,p,chosen)>0 ? 'aligned' : 'other';
    const key = [row.kind,match,chosen.kind,chosen.tag??''].join('|');
    const before = goalProgress(world,p,row.goal);
    inFlight.set(act.id,{row,before,key});
    if (match==='aligned' && (row.kind==='respected' || row.kind==='stocked')) {
      const target = w.byId.get(act.targetId);
      links.set(act.id,{id:act.id,actor:p.id,target:act.targetId,action:act.kind,goal:row.kind,
        homeTarget:act.targetId===homeOf(w,householdOf(w,p))?.id,
        affinityBefore:target?.ent==='person' ? target.relations[p.id]?.affinity??0 : null,
        progressBefore:before,mode:String(act.data.mode??'')});
    }
  }
  if (ranked.some(o => goalNudge(world,p,o)>0)) row.offered++;
  if (chosen && act && goalNudge(world,p,chosen)>0) {
    row.selected++; add(row.actions,chosen.kind); aligned.set(act.id,row);
  }
}});
w.hooks = {onActivityEnd(p,a,outcome,detail) {
  const tracked = inFlight.get(a.id);
  if (tracked) {
    const delta = goalProgress(w,p,tracked.row.goal)-tracked.before;
    const link = links.get(a.id);
    if (link) {
      const target = w.byId.get(link.target);
      link.affinityAfter = target?.ent==='person' ? target.relations[p.id]?.affinity??0 : null;
      link.progressAfter = goalProgress(w,p,tracked.row.goal);
      link.outcome = outcome;
    }
    const result = payoff[tracked.key] ??= {};
    const direction = delta > 1e-9 ? 'up' : delta < -1e-9 ? 'down' : 'flat';
    add(result,[outcome,direction].join('|'));
    inFlight.delete(a.id);
  }
  const row = aligned.get(a.id);
  if (row) {add(row.outcomes,outcome); aligned.delete(a.id);}
  const i = proposalIds.get(a.id);
  if (i !== undefined) Object.assign(proposals[i],{end:w.tick,outcome,detail});
  if (a.kind === 'socialize') {
    const pair = contacts.get([p.id,a.targetId].join('/'));
    if (pair) add(pair.outcomes,outcome);
  }
}};
for (const p of w.persons) observe(p);
while (w.tick < end) {
  stepWorld(w);
  for (const p of w.persons) observe(p);
  if (w.tick % DAY === 0) console.log('day',w.tick/DAY);
}
for (const row of rows.values()) {
  const p = w.byId.get(row.id);
  if (p?.ent === 'person' && p.alive) row.liveEnd = goalProgress(w,p,row.goal);
}
const endHash = hashWorld(w);
const conservation = conservationReport(w).ok;
writeFileSync(opt('out',''), JSON.stringify({start,initial,end:w.tick,endHash,conservation,rows:[...rows.values()],proposals,payoff,links:[...links.values()],contacts:[...contacts.values()]},null,1));
if (endHash !== expectedEnd || !conservation) throw Error('Winter replay verification failed');
