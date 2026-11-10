// Derived observer views for the compact resident card and the full character viewer (ui/person.ts): a one-line status, the
// immediate intent and its place on the map, a provenance cue for the thing the person is acting on, the carried goods that
// matter to the current action, the work set aside that can resume, what they know listed item by item with source and age,
// the last known whereabouts of people, and one chronological history merged from the personal log and the decision ledger.
//
// Everything here is a pure read of state the simulation already keeps (types.ts Person: activity, suspended, intentions,
// beliefs, whereabouts, seen, log, decisions, lastResult). Nothing is written, no random number is drawn, and no field is
// invented: where the simulation does not record something, the view says nothing. The "world check" on a belief compares
// the person's belief with the live world for the VIEWER's benefit; it is labelled as such and never reaches the person.
import { DAY, NEED_KEYS } from './constants';
import { clockText, dayNumber } from './environment';
import { describeEntityName } from './inspect';
import { isWaterBeliefId } from './knowledge';
import { describeIllness } from './illness';
import { describeInjury } from './life';
import { BELIEF_NOUN } from './labels';
import { deceasedById } from './historical_index';
import { worldAge } from './time_text';
import type { Activity, Belief, ItemKind, NeedKey, Person, World } from './types';

/** the same threshold the knowledge counts and the hearsay list use for "possibly out of date" */
export const STALE_TICKS = 1800;

export type StatusTone = 'ok' | 'info' | 'warn' | 'danger' | 'good';
export interface StatusView { text: string; tone: StatusTone }
export interface IntentView { text: string; x: number; y: number; kind: 'destination' | 'here' | 'plan' | 'none' }
export interface SuspendedView { label: string; goal: string; progress: number; since: string }
export interface KnowledgeItemView {
  id: number;
  kind: string;
  /** what the person believes is there, in words (the kind's noun, or the building's name when the thing still stands) */
  label: string;
  x: number;
  y: number;
  src: 'seen' | 'told';
  /** who told them (hearsay only; '' when seen first-hand) */
  from: string;
  seenAgo: string;
  learnedAgo: string;
  /** older than STALE_TICKS since the observation it rests on */
  stale: boolean;
  /** the viewer's comparison with the live world, never the person's knowledge: present, gone, empty, or unchecked (water) */
  worldCheck: 'present' | 'gone' | 'empty' | 'unchecked';
  /** believed stock for a source, when the belief carries one */
  amount: number | null;
}
export interface WhereaboutsView {
  id: number;
  name: string;
  x: number;
  y: number;
  when: string;
  tick: number;
  /** who reported it ('' when the person saw them there) */
  from: string;
  /** the room they were told the person is in, when the note says so */
  room: string;
  /** they can see this person right now, so the note is not what they are going by */
  inSight: boolean;
}
export interface TimelineView {
  tick: number;
  /** consistent world time: "Day 12, 07:40" */
  when: string;
  ago: string;
  kind: 'work' | 'social' | 'need' | 'danger' | 'life' | 'info' | 'decision' | 'outcome';
  text: string;
  /** more about the entry, shown on request ('' when there is none) */
  detail: string;
}

const nameOf = (world: World, id: number): string => {
  const e = world.byId.get(id);
  if (e?.ent === 'person') return e.name;
  return deceasedById(world, id)?.name ?? 'someone';
};

/** world time, the same way everywhere in the viewer */
export function worldTimeText(tick: number): string {
  return `Day ${dayNumber(tick)}, ${clockText(tick)}`;
}

const NEED_CRIT: Record<NeedKey, number> = { hunger: 14, thirst: 14, energy: 8, warmth: 14, safety: 20, social: 5 };
const CRIT_WORD: Record<NeedKey, string> = { hunger: 'starving', thirst: 'parched', energy: 'exhausted', warmth: 'dangerously cold', safety: 'in danger', social: 'desperately lonely' };

const HELP_KINDS = new Set<Activity['kind']>(['care', 'give', 'fulfill', 'visit', 'return_tool']);
const REST_KINDS = new Set<Activity['kind']>(['sleep', 'rest', 'warm']);
const TALK_KINDS = new Set<Activity['kind']>(['converse', 'socialize', 'argue', 'attend_meal', 'host_meal', 'attend']);
const FOOD: ReadonlySet<string> = new Set(['berries', 'fruit', 'fish', 'grain', 'bread', 'meat', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat']);

/** One line answering "is anything the matter?", from the most pressing fact down to "no immediate problem". */
export function statusLine(world: World, p: Person): StatusView {
  const crit = NEED_KEYS.filter((k) => p.needs[k] < NEED_CRIT[k]);
  if (crit.length) return { text: `At risk: ${crit.map((k) => CRIT_WORD[k]).join(', ')}`, tone: 'danger' };
  const a = p.activity;
  if (a?.kind === 'flee') return { text: 'Fleeing danger', tone: 'danger' };
  if (a?.kind === 'defend') return { text: 'Standing against a threat', tone: 'danger' };
  if (a?.blocked) return { text: `Blocked: ${a.blocked}`, tone: 'warn' };
  if (a && a.phase === 'travel' && a.stuck > 0) return { text: 'Stuck for the moment, finding another way', tone: 'warn' };
  const ill = describeIllness(world, p);
  if (ill) return { text: `Unwell: ${ill}`, tone: 'warn' };
  const hurt = describeInjury(world, p);
  if (hurt) return { text: `Hurt: ${hurt}`, tone: 'warn' };
  if (p.suspended) return { text: `Interrupted: “${p.suspended.label}” set aside${a ? ` · now ${a.label}` : ''}`, tone: 'warn' };
  if (p.pose === 'sleep' || (a && REST_KINDS.has(a.kind))) return { text: 'Resting', tone: 'info' };
  if (a && HELP_KINDS.has(a.kind)) {
    const who = a.targetId ? world.byId.get(a.targetId) : undefined;
    return { text: who?.ent === 'person' ? `Helping ${who.name}` : 'Helping someone', tone: 'good' };
  }
  if (a && (a.kind === 'deposit' || a.kind === 'haul' || a.kind === 'cart_haul')) {
    const food = Object.keys(p.inv).some((k) => FOOD.has(k) && (p.inv[k as ItemKind] ?? 0) > 0);
    const where = a.targetId ? world.byId.get(a.targetId) : undefined;
    const home = where?.ent === 'building' && where.hhId === p.hhId && where.hhId !== 0;
    return { text: a.kind === 'deposit' && food ? (home ? 'Carrying food home' : 'Carrying food to a store') : `Carrying goods to ${where ? describeEntityName(world, where).toLowerCase() : 'a place'}`, tone: 'info' };
  }
  if (a && TALK_KINDS.has(a.kind)) return { text: 'In company', tone: 'info' };
  return { text: 'No immediate problem', tone: 'ok' };
}

/** Where they are going, or what they are at: the destination or immediate intent, with its place on the map. */
export function intentView(world: World, p: Person): IntentView | null {
  const a = p.activity;
  if (a) {
    const target = a.targetId ? world.byId.get(a.targetId) : undefined;
    const name = target ? describeEntityName(world, target) : a.targetType === 'tile' ? 'the water' : a.targetId ? 'a remembered place' : '';
    if (a.phase === 'travel') {
      const dist = Math.hypot(a.spotX - p.x, a.spotY - p.y);
      return { text: `Heading to ${name || 'a spot'} (${dist.toFixed(0)} tiles to go)`, x: a.spotX, y: a.spotY, kind: 'destination' };
    }
    return { text: name ? `At ${name}` : 'Here', x: a.spotX || p.x, y: a.spotY || p.y, kind: 'here' };
  }
  const plan = p.intentions.find((i) => i.status === 'active' && i.step);
  if (plan) {
    const b = plan.stepTarget ? p.beliefs[plan.stepTarget] : undefined;
    return { text: `Next: ${plan.step}`, x: b ? b.x : p.x, y: b ? b.y : p.y, kind: b ? 'plan' : 'none' };
  }
  if (p.pose === 'sleep') return { text: 'Asleep', x: p.x, y: p.y, kind: 'here' };
  return null;
}

/**
 * A small cue about the knowledge the current action rests on, only when there is something to say: the place is known from
 * someone's report, the memory is old, or the person is going by where someone was last seen. Direct, fresh sight says nothing.
 */
export function provenanceCue(world: World, p: Person): string | null {
  const a = p.activity;
  const plan = p.intentions.find((i) => i.status === 'active');
  const id = a?.targetId || plan?.stepTarget || 0;
  if (!id) return null;
  const target = world.byId.get(id);
  if (target?.ent === 'person') {
    if (p.seen.some((s) => s.id === id)) return null;
    const wh = p.whereabouts[id];
    if (!wh) return null;
    return wh.from ? `Going by where ${nameOf(world, wh.from)} said ${target.name} was (${worldAge(world.tick, wh.tick)})` : `Last known location: saw ${target.name} there ${worldAge(world.tick, wh.tick)}`;
  }
  const b = p.beliefs[id];
  if (!b) return null;
  const stale = world.tick - b.seen > STALE_TICKS;
  if (b.src === 'told') return `Following ${nameOf(world, b.from)}'s report (${worldAge(world.tick, b.learned)})${stale ? ' · possibly stale information' : ''}`;
  if (stale) return `Last seen ${worldAge(world.tick, b.seen)} · possibly stale information`;
  return null;
}

const CARRY_KINDS = new Set<Activity['kind']>(['deposit', 'give', 'fulfill', 'care', 'haul', 'cart_haul', 'build', 'repair', 'craft', 'operate', 'eat', 'drink', 'fuel_fire', 'plant', 'host_meal', 'attend_meal']);

/** Carried goods only when they bear on the current action: the item the action is about, or everything carried for a delivery. */
export function relevantItems(p: Person): { kind: ItemKind; n: number }[] {
  const a = p.activity;
  if (!a) return [];
  const out: { kind: ItemKind; n: number }[] = [];
  if (a.item && (p.inv[a.item] ?? 0) > 0) out.push({ kind: a.item, n: p.inv[a.item] ?? 0 });
  if (CARRY_KINDS.has(a.kind)) {
    for (const k of Object.keys(p.inv) as ItemKind[]) {
      const n = p.inv[k] ?? 0;
      if (n > 0 && k !== a.item && !out.some((o) => o.kind === k)) out.push({ kind: k, n });
    }
  }
  return out.slice(0, 6);
}

/** Work put aside that the person can pick up again when conditions allow (activities.ts suspendActivity / resumeSuspended). */
export function suspendedView(world: World, p: Person): SuspendedView | null {
  const s = p.suspended;
  if (!s) return null;
  return { label: s.label, goal: s.goal, progress: s.duration > 0 ? Math.min(1, s.progress / s.duration) : 0, since: worldAge(world.tick, s.start) };
}

function worldCheck(world: World, b: Belief): KnowledgeItemView['worldCheck'] {
  if (isWaterBeliefId(b.id)) return 'unchecked';
  const e = world.byId.get(b.id);
  if (!e) return 'gone';
  if (e.ent === 'source' && b.amount > 0 && e.amount <= 0) return 'empty';
  return 'present';
}

/**
 * What they know, item by item: the most recently observed first, trees thinned to a handful because there are hundreds. The
 * world check column is the viewer's, not the person's; the UI labels it so.
 */
export function knowledgeItems(world: World, p: Person, limit = 60): KnowledgeItemView[] {
  const all = Object.values(p.beliefs);
  let trees = 0;
  const out: KnowledgeItemView[] = [];
  for (const b of all.sort((x, y) => y.seen - x.seen || x.id - y.id)) {
    if (b.kind === 'tree' && trees++ >= 3) continue;
    const e = world.byId.get(b.id);
    const noun = BELIEF_NOUN[b.kind] ?? b.kind;
    out.push({
      id: b.id,
      kind: b.kind,
      label: e && e.ent !== 'person' && e.ent !== 'animal' ? describeEntityName(world, e) : noun[0].toUpperCase() + noun.slice(1),
      x: b.x,
      y: b.y,
      src: b.src,
      from: b.src === 'told' ? nameOf(world, b.from) : '',
      seenAgo: worldAge(world.tick, b.seen),
      learnedAgo: worldAge(world.tick, b.learned),
      stale: world.tick - b.seen > STALE_TICKS,
      worldCheck: worldCheck(world, b),
      amount: b.max > 0 ? b.amount : null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Where they last knew other people to be, newest first; a note they were told carries who told them. */
export function whereaboutsItems(world: World, p: Person, limit = 20): WhereaboutsView[] {
  const out: WhereaboutsView[] = [];
  for (const k of Object.keys(p.whereabouts)) {
    const id = Number(k);
    const w = p.whereabouts[id];
    if (!w) continue;
    out.push({ id, name: nameOf(world, id), x: w.x, y: w.y, when: worldAge(world.tick, w.tick), tick: w.tick, from: w.from ? nameOf(world, w.from) : '', room: w.room?.name ?? '', inSight: p.seen.some((s) => s.id === id) });
  }
  return out.sort((a, b) => b.tick - a.tick || a.id - b.id).slice(0, limit);
}

/**
 * One chronological history: the personal log (what happened to them) merged with the decision ledger (what they chose and how
 * it ended), newest first, every entry stamped with the same world time. The last result is included once, where the ledger
 * did not already close the same ending.
 */
export function timeline(world: World, p: Person, limit = 40): TimelineView[] {
  const rows: TimelineView[] = [];
  const stamp = (tick: number) => ({ tick, when: worldTimeText(tick), ago: worldAge(world.tick, tick) });
  for (const l of p.log) rows.push({ ...stamp(l.tick), kind: l.kind, text: l.text, detail: '' });
  for (const e of p.decisions ?? []) {
    const over = e.passedOver.length ? `Passed over: ${e.passedOver.join(', ')}.` : '';
    const aside = e.setAside.length ? ` Set aside: ${e.setAside.map((s) => `${s.label}${s.reason ? ` (${s.reason})` : ''}`).join('; ')}.` : '';
    rows.push({ ...stamp(e.tick), kind: 'decision', text: e.chosen ? `Chose “${e.chosen}”${e.forPlan ? ' for a plan' : ''} (${e.trigger})` : `Found nothing to do (${e.trigger})`, detail: (over + aside).trim() });
    if (e.outcome && e.endedAt !== undefined) rows.push({ ...stamp(e.endedAt), kind: 'outcome', text: `${e.chosen || 'That'} → ${e.outcome}${e.detail ? `: ${e.detail}` : ''}`, detail: '' });
  }
  const r = p.lastResult;
  if (r && !(p.decisions ?? []).some((e) => e.endedAt === r.tick && e.outcome === r.outcome)) rows.push({ ...stamp(r.tick), kind: 'outcome', text: `${r.label} → ${r.outcome}${r.detail ? `: ${r.detail}` : ''}`, detail: '' });
  rows.sort((a, b) => b.tick - a.tick);
  return rows.slice(0, limit);
}

/** days since a tick, for compact labels */
export function daysSince(world: World, tick: number): number {
  return Math.floor((world.tick - tick) / DAY);
}
