// TAKING UP WHAT SOMEBODY LEFT UNFINISHED (rules version 53, rich worlds only).
//
// A private plan died with its maker: the household's house site kept the planks they had carried to it, the clay they had
// gathered for a batch lay in the pile of their belongings, and nobody in the household had any reason to pick up where
// they had stopped beyond the ordinary cues, which may never fire again (the site cue needs the site in sight; the tool
// cue needs the tool to be wanted by the survivor's own work). This module owns the undertaking's continuity and nothing
// else:
//
//   * WHAT IS LEFT. At death, each active plan of the dead that served the household (a shelter plan for its site, a stock
//     plan for its store, a batch for its site, a hand tool) is recorded on the household: who, what, how far they had got,
//     what they had gathered for it, and the pile their belongings fell into. At most UNFINISHED_LIMIT, the newest kept.
//   * WHO MAY TAKE IT UP. An adult of the same household who knows of the death (rules 14: witnessed it, was told, or found
//     the grave; nobody is told by the world), within SUCCESSION_WINDOW of learning, with no live plan of that kind. The
//     undertaking must still stand by the survivor's own knowledge (the site known and open; the store known; a tool still
//     not in the household's hands), or the record lapses with a reason. One successor, by choice: it is a plan like any
//     other, weighed, set aside and given up by the ordinary rules, and nothing is copied into anybody's state but the
//     successor's own plan, which names whom it continues.
//   * WHAT IS PRESERVED. The site's delivered, used and contributed amounts stay as they were and the successor's hauls are
//     credited to the successor; the dead's belongings stay in the pile where they fell, in the household's ownership, and a
//     successor who witnessed the death knows the pile (observes it at adoption) and may collect from it like any heap;
//     promises released at death stay released (nothing is transferred without consent); a record whose undertaking cannot
//     be continued is cancelled with the reason written.
//
// Nothing here changes how a plan is carried out, what a site needs, the cooldowns, or the two-plan cap.
import type { Household, Intention, Items, Person, Pile, World } from './types';
import type { Ctx } from './optutil';
import { DAY } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import { addLog } from './events';
import { householdById } from './households';
import { knowsDeath } from './death_knowledge';
import { beliefsByKind } from './optutil';
import { observe } from './knowledge';
import { toolsHeldBy } from './toolreg';
import { isAdultWorker } from './people';
import {hasContinuityKnowledge,validateContinuityKnowledge} from './continuity_knowledge';

export interface Unfinished {
  id: number;
  planId?: number;
  /** who left it, and their name as the record keeps it after they are gone */
  by: number;
  name: string;
  tick: number;
  kind: 'shelter' | 'tool' | 'stock' | 'batch';
  aboutId: number;
  makes: string;
  recipe?: string;
  forSite?: number;
  worked: number;
  /** what they had gathered for it and still carried, which fell into the pile */
  carried: Items;
  pileId: number;
  /** the goal in their own words */
  goal: string;
}

export const SUCCESSION_WINDOW = DAY * 6;
export const UNFINISHED_LIMIT = 4;

let enabled = true;
export const successionOn = (): boolean => enabled;
/** Lab switch `rich-no-succession`: nothing is recorded at death and nobody takes anything up; no effect below rules 53. */
export function setSuccession(on: boolean): void {
  enabled = on;
}
export const hasSuccession = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, 53);

/** The dead's active plans that served the household, read before they are dropped (lifecycle.ts killPerson). */
export function collectUnfinished(world: World, p: Person): Unfinished[] {
  if (!hasSuccession(world)) return [];
  const out: Unfinished[] = [];
  for (const i of p.intentions) {
    if (i.status !== 'active' || i.kind === 'night' || i.kind === 'repair' || i.kind==='journey') continue;
    // a batch for no site of the household's, or a shelter for no site, serves nobody after them
    if (i.kind === 'batch' && !i.forSite) continue;
    if (i.kind === 'shelter' && !i.aboutId) continue;
    const carried: Items = {};
    for (const k of Object.keys(i.wants) as (keyof Items)[]) if ((p.inv[k] ?? 0) > 0) carried[k] = Math.min(p.inv[k] ?? 0, i.wants[k] ?? 0);
    out.push({ id: world.nextId++, ...(hasContinuityKnowledge(world)?{planId:i.id}:{}), by: p.id, name: p.name, tick: world.tick, kind: i.kind, aboutId: i.aboutId, makes: i.makes, ...(i.recipe ? { recipe: i.recipe } : {}), ...(i.forSite ? { forSite: i.forSite } : {}), worked: i.worked, carried, pileId: 0, goal: i.goal });
  }
  return out;
}

/** Record them on the household with the pile their belongings fell into (lifecycle.ts, after the drop). */
export function recordUnfinished(world: World, p: Person, records: Unfinished[], pile: Pile | null): void {
  if (!records.length) return;
  const hh = householdById(world, p.hhId);
  if (!hh) return;
  const list = (hh.unfinished ??= []);
  for (const r of records) {
    r.pileId = pile?.id ?? 0;
    list.push(r);
  }
  while (list.length > UNFINISHED_LIMIT) list.shift();
}

const describe = (u: Unfinished): string => u.kind === 'tool' ? `the ${u.makes}` : u.kind === 'shelter' ? 'the household home' : u.kind === 'stock' ? 'the household food store' : `the ${u.makes} for the site`;

/**
 * Pure: the record this person could take up now, or null. Reads only their own household's record, their own knowledge of
 * the death, their own plans and beliefs.
 */
export function successionWanted(ctx: Ctx): Unfinished | null {
  const { world, p } = ctx;
  if (!hasSuccession(world) || ctx.stage === 'child' || !isAdultWorker(world, p)) return null;
  const hh = householdById(world, p.hhId);
  if (!hh?.unfinished?.length) return null;
  for (const u of hh.unfinished) {
    if (u.by === p.id || !knowsDeath(p, u.by)) continue;
    const learned = p.relations[u.by]?.deathKnown?.learned ?? u.tick;
    if (world.tick - learned > SUCCESSION_WINDOW) continue;
    if (p.intentions.some((i) => i.status === 'active' && i.kind === u.kind)) continue;
    if(hasContinuityKnowledge(world)){
      const k=p.relations[u.by]?.workHeard?.find(k=>k.planId===u.planId&&k.householdId===p.hhId&&(k.retryAfter??0)<=world.tick);
      if(!k)continue;
      // Only the dated communicated account is available to a successor, never death-time pack/progress.
      return {id:u.id,planId:k.planId,by:k.from,name:k.name,tick:learned,kind:k.kind,aboutId:k.aboutId,makes:k.makes,recipe:k.recipe,forSite:k.forSite,worked:k.worked,goal:k.goal,carried:{},pileId:0};
    }
    return u;
  }
  return null;
}

/** Why the undertaking no longer stands by this person's own knowledge ('' if it does). */
export function successionBlocker(ctx: Ctx, u: Unfinished): string {
  const { world, p } = ctx;
  if (u.kind === 'shelter' || u.kind === 'batch') {
    const siteId = u.kind === 'shelter' ? u.aboutId : u.forSite!;
    const b = beliefsByKind(p, ['site']).find((x) => x.id === siteId);
    if (!b) return 'does not know of the site';
    if (b.hh !== p.hhId) return 'the site is not the household\'s';
    if(!hasContinuityKnowledge(world)){
      const e = world.byId.get(siteId);
      if (!e || e.ent !== 'site') return 'the site is finished or gone';
    }
  }
  if (u.kind === 'tool') {
    if(hasContinuityKnowledge(world)){
      if(toolsHeldBy(world,p.id,u.makes as never).length)return `I already have a ${u.makes}`;
      if(ctx.seenPersons.some(s=>s.carrying.includes(u.makes as never)&&world.persons.some(q=>q.id===s.id&&q.hhId===p.hhId)))return `I see a household member carrying a ${u.makes}`;
      return '';
    }
    const hhMembers = world.persons.filter((q) => q.alive && q.hhId === p.hhId);
    if (hhMembers.some((q) => toolsHeldBy(world, q.id, u.makes as never).length)) return `the household has a ${u.makes} now`;
  }
  if (u.kind === 'stock' && !beliefsByKind(p, ['building']).some((b) => b.id === u.aboutId)) return 'does not know of the store';
  return '';
}

/** The record is taken up (intent.ts): it leaves the household's list, and a witness learns the pile. Returns the plan's continuation note. */
export function takeUp(world: World, p: Person, u: Unfinished, plan: Intention): void {
  const hh = householdById(world, p.hhId);
  if (hh?.unfinished) {
    hh.unfinished = hh.unfinished.filter((x) => x.id !== u.id);
    if (!hh.unfinished.length) delete hh.unfinished;
  }
  plan.succeeding = { from: u.by, name: u.name, worked: u.worked };
  plan.goal = `finish what ${u.name} began: ${plan.goal}`;
  if (!hasContinuityKnowledge(world) && u.pileId && p.relations[u.by]?.deathKnown?.source === 'witness') {
    const pile = world.byId.get(u.pileId);
    if (pile && pile.ent === 'pile') observe(world, p, pile);
  }
  const carried = Object.entries(u.carried).filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => `${n} ${k}`).join(', ');
  addLog(world, p, 'work', `Taking up what ${u.name} left unfinished: ${describe(u)}${carried ? ` (they had gathered ${carried}, left where they fell)` : ''}${u.worked ? `, ${Math.round(u.worked)} of it already their work` : ''}.`);
}

/** A record that cannot be continued is cancelled with the reason (intent.ts, when the survivor looks at it). */
export function cancelUnfinished(world: World, p: Person, u: Unfinished, why: string): void {
  if(hasContinuityKnowledge(world)){
    const k=p.relations[u.by]?.workHeard?.find(k=>k.planId===u.planId);
    if(k){k.retryAfter=world.tick+400;k.obstacle=why.slice(0,240);addLog(world,p,'work',`Cannot yet continue ${u.name}'s undertaking: ${why}. Other people keep their own knowledge.`);}
    return;
  }
  const hh = householdById(world, p.hhId);
  if (hh?.unfinished) {
    hh.unfinished = hh.unfinished.filter((x) => x.id !== u.id);
    if (!hh.unfinished.length) delete hh.unfinished;
  }
  addLog(world, p, 'work', `What ${u.name} left unfinished (${describe(u)}) cannot be taken up: ${why}.`);
}

/** The household card's lines about what stands unfinished. */
export function describeUnfinished(world: World, hh: Household): string[] {
  if (!hasSuccession(world) || !hh.unfinished) return [];
  return hh.unfinished.map((u) => `${u.name} left ${describe(u)} unfinished ${((world.tick - u.tick) / DAY).toFixed(1)} days ago${u.worked ? ` (${Math.round(u.worked)} of it their work)` : ''}.`);
}

export function validateSuccession(world: World): void {
  validateContinuityKnowledge(world);
  for (const hh of world.households) {
    if (!hh.unfinished) continue;
    if (!runsRulesVersion(world, 53) || hh.unfinished.length > UNFINISHED_LIMIT) throw new Error('Invalid unfinished records');
    for (const u of hh.unfinished) if (!Number.isFinite(u.id) || !Number.isFinite(u.by) || !Number.isFinite(u.tick) || !['shelter', 'tool', 'stock', 'batch'].includes(u.kind)) throw new Error('Invalid unfinished record');
    for(const u of hh.unfinished)if(u.planId!==undefined&&(!runsRulesVersion(world,92)||!Number.isSafeInteger(u.planId)||u.planId<=0))throw new Error('Invalid unfinished plan identity');
  }
  for (const p of world.persons) for (const i of p.intentions ?? []) if (i.succeeding && !runsRulesVersion(world, 53)) throw new Error('Invalid succession on a plan');
}
