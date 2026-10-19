// Read-only view-models for the UI. Nothing in here mutates the world or consumes random numbers,
// so inspecting a person can never change what happens next.
import { BUILD_DEF, DEPOSIT_TYPES, NUTRITION, TICKS_PER_YEAR, isHomeType } from './constants';
import { generateOptions, rankOptions } from './decision';
import { clockText, dayNumber, phaseName, weatherLabel, dayFraction } from './environment';
import { householdOf } from './buildings';
import { planHelp, planOfActivity } from './intent';
import { describePay } from './learning';
import { describeHeard } from './reputation';
import { describeIllness } from './illness';
import { describeGoal, describeInjury } from './life';
import { describeApprentice } from './apprentice';
import { describeLifeEvent } from './lifechanges';
import { describeCrew } from './crews';
import { describeTrade } from './trade';
import { estimatedAmount, recentFailure } from './knowledge';
import { ACTIVITY_NOUN, BELIEF_NOUN, SOURCE_NOUN } from './labels';
import { moodOf } from './needs';
import { isRich, thoughtsOf } from './mood';
import { ageYears, carryCap, itemsToText, stageOf, traitSummary } from './people';
import { relLabel } from './relations';
import { foodUnits, weightOf } from './economy';
import { membersOf } from './households';
import { commitmentViews, concernViews, describeCartSections, describeFacility, describeSiteSections, grievanceViews, interactionViews, mealViews, toolViews } from './inspect_work';
import type { CommitmentView, InteractionView, MealView, Section, ToolView, GrievanceView } from './inspect_work';
import type { Activity, Entity, Intention, Items, ItemKind, NeedKey, Person, Plot, Source, World } from './types';
import { NEED_KEYS } from './constants';

import { hyp } from './util';
export type Selection = { kind: 'none' } | { kind: 'entity'; id: number };

export function agoText(world: World, tick: number): string {
  const d = world.tick - tick;
  if (d < 0) return 'soon';
  if (d < 40) return 'just now';
  if (d < 600) return `${Math.round(d / 10)}s ago`;
  const mins = d / 600;
  if (mins < 60) return `${Math.round(mins * 10) / 10} min ago`;
  return `${Math.round(d / 2400)} days ago`;
}

/** simulation duration in "seconds at 1x" for display */
export function secondsText(ticks: number): string {
  const s = Math.round(ticks / 10);
  return s < 90 ? `${s}s` : `${Math.round(s / 6) / 10} min`;
}

export interface NeedView {
  key: NeedKey;
  label: string;
  value: number;
  state: 'ok' | 'low' | 'critical';
}
export interface ItemView {
  kind: ItemKind;
  n: number;
}
export interface OpportunityView {
  id: number;
  what: string;
  status: 'chosen' | 'unaware' | 'passed over' | 'blocked' | 'failed before' | 'not needed';
  detail: string;
  distance: number;
  x: number;
  y: number;
}
export interface HeardView {
  about: number;
  name: string;
  text: string;
  via: string;
  /** days ago */
  age: number;
  /** above 0 to the person's credit, below against them, 0 for plain news */
  good: number;
}
export interface RelationView {
  id: number;
  name: string;
  label: string;
  affinity: number;
  trust: number;
  familiarity: number;
  recent: string;
  avoiding: boolean;
}
export interface RequestView {
  id: number;
  direction: 'asked' | 'asked of me';
  other: string;
  text: string;
  status: string;
  note: string;
  age: string;
  /** what the asker wanted it for, in their words (a project of their own, when it was for one) */
  purpose: string;
  /** for something promised: how much has actually been handed over, so a promise is never read as a delivery */
  progress: string;
}
/** one plan as the card shows it. No plan is marked as the leading one: the engine has no such notion. */
export interface PlanView {
  id: number;
  kind: string;
  goal: string;
  step: string;
  /** 'under way' | 'waiting' | 'blocked' | 'done' | 'ended' - read off the records, never guessed */
  state: string;
  detail: string;
  /** what it still lacks, in plain words ('' when nothing) */
  missing: string;
  progress: string;
  due: string;
  outcome: string;
}
export interface PersonView {
  id: number;
  name: string;
  sex: 'f' | 'm';
  age: number;
  stage: string;
  household: string;
  householdColor: number;
  home: string;
  health: number;
  /** the fever they have now, in words (rich only; null when well) */
  illness: string | null;
  mood: number;
  /** rich dynamics only: what is weighing on or lifting them now, strongest first; null in any other world */
  thoughts: { why: string; value: number }[] | null;
  pregnant: boolean;
  partner: string | null;
  traits: { key: string; value: number }[];
  traitSummary: string;
  /** what they hope for, and what hurts them, in words (rich only; null otherwise) */
  goal: string | null;
  injury: string | null;
  /** the change in life they are living through (rich only; null otherwise) */
  lifeEvent: string | null;
  /** the crew they are one of (rich only; null otherwise) */
  crew: string | null;
  skills: { key: string; value: number }[];
  /** what each kind of gathering has paid them, in their own experience (rich only; empty otherwise), best first */
  payoffs: { key: string; ratio: number; n: number }[];
  /** what they have seen and been told of other people (rich only; empty otherwise), freshest first */
  heard: HeardView[];
  /** the trade they have settled on and why, in their own terms (rich only; '' for somebody with none) */
  trade: string;
  needs: NeedView[];
  inventory: ItemView[];
  carry: { used: number; cap: number };
  position: { x: number; y: number };
  activity: { label: string; goal: string; phase: string; progress: number; target: string; blocked: string; kind: string; moving: boolean } | null;
  qa: { doing: string; why: string; trying: string; stopping: string; lastAttempt: string; plan: string };
  /** every plan they are carrying, each on its own terms (rich worlds; empty otherwise) */
  plans: PlanView[];
  /** equipment in hand, with wear and loan status */
  tools: ToolView[];
  /** promises, active first and then the few most recent endings, each with how and why it ended */
  commitments: CommitmentView[];
  /** the exchange going on now and the last one that ended — never mixed */
  interaction: { current: InteractionView | null; previous: InteractionView | null };
  /** a shared meal they are hosting or have agreed to, and the last one they took part in */
  meal: { current: MealView | null; previous: MealView | null };
  concerns: { about: string; kind: string; seen: string; source: string }[];
  grievances: GrievanceView[];
  decision: {
    when: string;
    trigger: string;
    chosen: string;
    because: string;
    alternatives: { label: string; utility: number; parts: [string, number][] }[];
    blocked: { label: string; reason: string }[];
    considered: number;
    knownPlaces: number;
    seenNow: number;
  } | null;
  opportunities: OpportunityView[];
  relationships: RelationView[];
  family: { label: string; names: string[] }[];
  requests: RequestView[];
  memories: { when: string; text: string; kind: string }[];
  knowledge: { places: number; seen: number; hearsay: number; stale: number; byKind: { kind: string; n: number }[] };
  speech: string | null;
}

const NEED_LABEL: Record<NeedKey, string> = { hunger: 'Food', thirst: 'Water', energy: 'Energy', warmth: 'Warmth', safety: 'Safety', social: 'Company' };
const NEED_LOW: Record<NeedKey, number> = { hunger: 45, thirst: 45, energy: 32, warmth: 42, safety: 45, social: 35 };
const NEED_CRIT: Record<NeedKey, number> = { hunger: 14, thirst: 14, energy: 8, warmth: 14, safety: 20, social: 5 };

function nameOf(world: World, id: number): string {
  const e = world.byId.get(id);
  if (e && e.ent === 'person') return e.name;
  const d = world.deceased.find((x) => x.id === id);
  return d ? d.name : `#${id}`;
}

function itemList(items: Items): ItemView[] {
  const out: ItemView[] = [];
  for (const k of Object.keys(items) as ItemKind[]) if ((items[k] ?? 0) > 0) out.push({ kind: k, n: items[k] ?? 0 });
  return out;
}

export function describeEntityName(world: World, e: Entity): string {
  switch (e.ent) {
    case 'person':
      return e.name;
    case 'animal':
      return e.type === 'deer' ? 'Deer' : 'Wolf';
    case 'source':
      return SOURCE_NOUN[e.type][0].toUpperCase() + SOURCE_NOUN[e.type].slice(1);
    case 'building':
      return BUILD_DEF[e.type].label[0].toUpperCase() + BUILD_DEF[e.type].label.slice(1);
    case 'site':
      return `${BUILD_DEF[e.type].label[0].toUpperCase()}${BUILD_DEF[e.type].label.slice(1)} (under construction)`;
    case 'plot':
      return 'Field plot';
    case 'pile':
      return 'Pile of goods';
    case 'grave':
      return `Grave of ${e.name}`;
    case 'cart':
      return 'Handcart';
  }
}

function targetText(world: World, a: Activity): string {
  if (!a.targetId) return a.kind === 'eat' || a.kind === 'rest' ? 'here' : '';
  const e = world.byId.get(a.targetId);
  if (e) return describeEntityName(world, e);
  if (a.targetType === 'tile') return 'the water';
  return 'somewhere remembered';
}

/**
 * What asking for help has come to, for the plan on the card. Each state here is one the records actually hold - asked and
 * unanswered, promised and not yet delivered, part delivered, delivered, refused with the reason the answer gave, or ended - and a
 * promise is never worded as a delivery.
 */
function helpText(world: World, p: Person, plan: Intention): string {
  const hs = planHelp(world, p, plan);
  if (!hs.length) return '';
  const say = hs.slice(-2).map((h) => {
    if (h.status === 'pending') return `Asked ${h.who} for ${h.asked} ${h.item}; no answer yet.`;
    if (h.status === 'declined') return `${h.who} said no${h.note ? ` (${h.note})` : ''}.`;
    if (h.status === 'promised' && h.delivered > 0) return `${h.who} promised ${h.asked} ${h.item}; ${h.delivered} brought so far, ${h.owed} still to come.`;
    if (h.status === 'promised') return `${h.who} promised ${h.owed || h.asked} ${h.item}, not yet delivered.`;
    if (h.status === 'fulfilled') return `${h.who} brought the ${h.item} (${h.delivered}).`;
    if (h.status === 'partial') return `${h.who} brought ${h.delivered} of the ${h.asked} ${h.item} asked for, and owes nothing more.`;
    return `${h.who}: ${h.status}${h.note ? ` (${h.note})` : ''}${h.delivered > 0 ? `, ${h.delivered} ${h.item} brought` : ''}.`;
  });
  return ' ' + say.join(' ');
}

function buildQA(world: World, p: Person): PersonView['qa'] {
  const a = p.activity;
  const lastDec = p.lastDecision;
  let doing = 'Deciding what to do next.';
  let why = lastDec?.because ? `Weighed up: ${lastDec.because}` : 'Nothing is pressing.';
  let trying = '—';
  let stopping = 'Nothing in the way.';
  if (p.pose === 'sleep') {
    doing = 'Asleep.';
    stopping = p.needs.energy >= 90 ? 'Almost rested.' : 'Nothing; sleeping recovers energy and health.';
  }
  if (a) {
    const tgt = targetText(world, a);
    if (a.phase === 'travel') {
      const dist = hyp(a.spotX - p.x, a.spotY - p.y);
      doing = `${a.label}${tgt ? ` — walking to ${tgt}` : ''} (${dist.toFixed(0)} tiles to go).`;
    } else {
      const pct = a.duration > 0 ? Math.round((a.progress / a.duration) * 100) : 0;
      doing = a.duration > 0 ? `${a.label} (${pct}% of this task).` : `${a.label}.`;
    }
    why = a.data.why ? `Weighed up: ${a.data.why}` : lastDec?.because ? `Weighed up: ${lastDec.because}` : a.goal;
    trying = a.goal ? a.goal[0].toUpperCase() + a.goal.slice(1) + (tgt ? ` (${tgt})` : '') + '.' : '—';
    if (a.blocked) stopping = a.blocked[0].toUpperCase() + a.blocked.slice(1) + '.';
    else if (a.phase === 'travel' && hyp(p.x - a.lastX, p.y - a.lastY) < 0.01 && world.tick - a.start > 30) stopping = 'Stuck for the moment, finding another way.';
    else if (p.needs.hunger < 14 || p.needs.thirst < 14) stopping = 'Dangerously weak; everything else will have to wait.';
  } else if (lastDec && lastDec.blocked.length) {
    const b = lastDec.blocked[0];
    stopping = `${b.label}: ${b.blocked}.`;
  }
  if (!a && lastDec && p.pose !== 'sleep') doing = lastDec.chosen ? `Between tasks (last chose “${lastDec.chosen.label}”).` : doing;
  const r = p.lastResult;
  const last = r ? `${r.label} → ${r.outcome}${r.detail ? ': ' + r.detail : ''} (${agoText(world, r.tick)})` : 'Nothing yet.';
  // Every plan they are carrying, each in their own terms. Three different things are kept apart for each one, because they fail in
  // different ways: the step they have SETTLED ON, whether that step is actually UNDER WAY (the activity they are running is that
  // step, which the decision marked when it chose it), and what became of the plan as a whole, which is reported only once it has
  // ended. Somebody may carry a project and a plan for the night at once; both are described, and neither is called the leading one.
  const livePlans = p.intentions.filter((i) => i.status === 'active');
  const toShow = livePlans.length ? livePlans : [...p.intentions].reverse().filter((i) => i.status !== 'active').slice(0, 1);
  const planText = toShow.map((i) => planLine(world, p, i, a)).join(' ');
  return { doing, why, trying, stopping, lastAttempt: last, plan: planText };
}

// ───────────────────────── "why didn't they take that?" ─────────────────────────
/** one plan in a sentence: the goal, the step, how that step stands, and what became of it once it has ended */
function planLine(world: World, p: Person, i: Intention, a: Activity | null): string {
  const cap = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;
  if (i.status !== 'active') return `${cap(i.goal)} — ${i.status === 'done' ? 'done' : 'given up'}: ${i.reason} (${agoText(world, i.since)}).`;
  const underway = a !== null && planOfActivity(p, a)?.id === i.id;
  const state = i.blocked
    ? `on hold: ${i.blocked}`
    : !i.step
      ? 'nothing to do for it just now'
      : underway
        ? `under way (${a!.label})`
        : 'settled on, not started';
  let text = `${cap(i.goal)}. Step: ${i.step || '—'} — ${state}.`;
  // A food reserve is the one live plan whose sentence has to carry two more things, because the whole point of it is that a
  // viewer can follow local evidence to a real consequence: WHAT WAS ACTUALLY PUT BY (not what was meant), and WHY it was taken
  // on, which for this kind is evidence about the household rather than a restatement of the goal. No other kind is touched,
  // and `stock` does not exist below rules version 2.
  if (i.kind === 'stock') {
    const put = Math.round(i.worked);
    text += ` ${put} of ${i.reserve ?? 0} unit${i.reserve === 1 ? '' : 's'} put by so far.`;
    if (i.reason) text += ` Why: ${i.reason}.`;
  }
  if (i.setAside > 0) text += ` Set aside ${i.setAside === 1 ? 'once' : `${i.setAside} times`} so far.`;
  return text + helpText(world, p, i);
}

/**
 * Every plan this person is carrying, each on its own terms. The card lists them; it does not rank them, because the engine has no
 * notion of a leading plan - which one they are actually getting on with shows as the one whose step is `under way`.
 */
export function planViews(world: World, p: Person): PlanView[] {
  const liveOnes = p.intentions.filter((i) => i.status === 'active');
  const shown = liveOnes.length ? liveOnes : [...p.intentions].reverse().filter((i) => i.status !== 'active').slice(0, 1);
  const a = p.activity;
  return shown.map((i) => ({
    id: i.id,
    kind: i.kind,
    goal: i.goal,
    step: i.step,
    state:
      i.status !== 'active'
        ? i.status === 'done'
          ? 'done'
          : 'ended'
        : i.blocked
          ? 'blocked'
          : a !== null && planOfActivity(p, a)?.id === i.id
            ? 'under way'
            : 'waiting',
    detail: planLine(world, p, i, a),
    missing: (Object.keys(i.wants) as ItemKind[])
      .map((k) => ({ item: k, n: (i.wants[k] ?? 0) - (p.inv[k] ?? 0) }))
      .filter((x) => x.n > 0)
      .map((x) => `${x.n} ${x.item}`)
      .join(', '),
    progress:
      i.kind === 'night'
        ? `${i.sheltered} ticks under shelter`
        : i.kind === 'repair'
          ? `${Math.round(i.worked)} of its condition put back`
          : i.kind === 'stock'
            ? `${Math.round(i.worked)} of ${i.reserve ?? 0} units put by${i.cue ? ` (${i.cue === 'season' ? 'winter is coming' : 'the household was short'})` : ''}`
            : i.worked > 0
              ? 'made it themselves'
              : '',
    due: i.status === 'active' ? `by tick ${i.until}` : agoText(world, i.ended || i.since),
    outcome: i.status === 'active' ? '' : i.reason,
  }));
}

export function auditOpportunities(world: World, p: Person): OpportunityView[] {
  const ctx = generateOptions(world, p, true);
  const ranked = rankOptions(ctx);
  const chosenKey = p.activity?.data.optKey as string | undefined;
  const chosenLabel = p.activity ? p.activity.label : ranked[0]?.label;
  const chosenUtil = p.activity ? p.activity.utility : ranked[0]?.util ?? 0;
  const out: OpportunityView[] = [];
  const dist = (x: number, y: number) => hyp(x - p.x, y - p.y);

  const classify = (e: Entity, what: string, x: number, y: number, needed: string): OpportunityView => {
    const b = p.beliefs[e.id];
    const d = dist(x, y);
    if (!b) return { id: e.id, what, status: 'unaware', detail: 'Has never seen it or been told about it.', distance: d, x, y };
    const opt = ctx.options.find((o) => o.targetId === e.id && o.kind !== 'socialize');
    if (opt) {
      if (chosenKey && opt.key === chosenKey) return { id: e.id, what, status: 'chosen', detail: 'This is what they are doing about it.', distance: d, x, y };
      return {
        id: e.id,
        what,
        status: 'passed over',
        detail: `Considered (score ${Math.round(opt.util)}) but preferred “${chosenLabel ?? 'something else'}” (${Math.round(chosenUtil)}).`,
        distance: d,
        x,
        y,
      };
    }
    const blk = ctx.blocked.find((o) => o.targetId === e.id);
    if (blk) return { id: e.id, what, status: 'blocked', detail: `Cannot use it: ${blk.blocked}.`, distance: d, x, y };
    const f = recentFailure(world, p, e.id, 900);
    if (f) return { id: e.id, what, status: 'failed before', detail: `Tried ${agoText(world, f.tick)}: ${f.reason}.`, distance: d, x, y };
    if (b.kind === 'berry_bush' || b.kind === 'fruit_tree' || b.kind === 'wild_grain' || b.kind === 'fish_spot') {
      if (estimatedAmount(world, b) < 1) return { id: e.id, what, status: 'blocked', detail: 'Remembers it as empty; has not seen it recover.', distance: d, x, y };
    }
    return { id: e.id, what, status: 'not needed', detail: needed, distance: d, x, y };
  };

  const hungerNote = p.needs.hunger > 62 ? `Not hungry right now (${Math.round(p.needs.hunger)}/100) and the household has enough.` : 'Other options scored higher.';
  const near = world.sources
    .filter((s) => s.type !== 'tree' && s.amount >= 1 && dist(s.x + 0.5, s.y + 0.5) < 26)
    .sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y))
    .slice(0, 6);
  for (const s of near) out.push(classify(s, `${SOURCE_NOUN[s.type]} (${s.amount} ${s.item})`, s.x + 0.5, s.y + 0.5, s.type === 'rock' ? 'No stone needed at the moment.' : hungerNote));
  const needWood = ctx.options.some((o) => o.tag === 'site' || o.tag === 'repair' || o.tag === 'fire' || o.tag === 'craft');
  if (needWood) {
    const t = world.sources.filter((s) => s.type === 'tree' && s.amount >= 1).sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y))[0];
    if (t) out.push(classify(t, `tree (${t.amount} wood)`, t.x + 0.5, t.y + 0.5, 'No wood needed at the moment.'));
  }
  for (const pl of world.plots.filter((q) => dist(q.x + 0.5, q.y + 0.5) < 22 && (q.state === 'ripe' || q.state === 'tilled')).slice(0, 4)) {
    const own = pl.hhId === p.hhId;
    const r = classify(pl, `${pl.state === 'ripe' ? 'ripe crop' : 'ploughed plot'} (${householdName(world, pl.hhId)} field)`, pl.x + 0.5, pl.y + 0.5, own ? 'Nothing to do with it right now.' : `Belongs to the ${householdName(world, pl.hhId)} household, not theirs.`);
    out.push(r);
  }
  for (const s of world.sites.filter((q) => dist(q.x + q.w / 2, q.y + q.h / 2) < 26).slice(0, 3)) {
    out.push(classify(s, `${BUILD_DEF[s.type].label} site (${householdName(world, s.hhId)})`, s.x + s.w / 2, s.y + s.h / 2, s.hhId === p.hhId ? 'Waiting on materials this person cannot supply.' : 'It belongs to people they hardly know.'));
  }
  for (const pile of world.piles.filter((q) => dist(q.x + 0.5, q.y + 0.5) < 16 && foodUnits(q.items) > 0).slice(0, 2)) {
    out.push(classify(pile, `pile of goods (${itemsToText(pile.items)})`, pile.x + 0.5, pile.y + 0.5, hungerNote));
  }
  const order = { chosen: 0, 'passed over': 1, blocked: 2, 'failed before': 3, unaware: 4, 'not needed': 5 } as const;
  out.sort((a, b) => order[a.status] - order[b.status] || a.distance - b.distance);
  return out.slice(0, 9);
}

function householdName(world: World, id: number): string {
  return world.households.find((h) => h.id === id)?.name ?? 'nobody’s';
}

export function describePerson(world: World, id: number, opts: { opportunities?: boolean } = {}): PersonView | null {
  const e = world.byId.get(id);
  if (!e || e.ent !== 'person') return null;
  const p = e;
  const hh = householdOf(world, p);
  const homeB = hh && hh.homeId ? world.byId.get(hh.homeId) : null;
  const age = ageYears(world, p);
  const stage = stageOf(world, p);
  const needs: NeedView[] = NEED_KEYS.map((k) => ({
    key: k,
    label: NEED_LABEL[k],
    value: p.needs[k],
    state: p.needs[k] < NEED_CRIT[k] ? 'critical' : p.needs[k] < NEED_LOW[k] ? 'low' : 'ok',
  }));
  const a = p.activity;
  const d = p.lastDecision;
  const relationships: RelationView[] = [];
  for (const k of Object.keys(p.relations)) {
    const oid = Number(k);
    const r = p.relations[oid];
    const other = world.byId.get(oid);
    if (!other || other.ent !== 'person') continue;
    if (r.familiarity < 1 && !r.kin) continue;
    relationships.push({
      id: oid,
      name: other.name,
      label: relLabel(r),
      affinity: r.affinity,
      trust: r.trust,
      familiarity: r.familiarity,
      recent: r.history.length ? r.history[r.history.length - 1].text : '',
      avoiding: r.avoidUntil > world.tick,
    });
  }
  relationships.sort((x, y) => Math.abs(y.affinity) - Math.abs(x.affinity));

  const family: PersonView['family'] = [];
  const nm = (ids: number[]) => ids.map((i) => nameOf(world, i));
  if (p.partnerId) family.push({ label: 'Partner', names: [nameOf(world, p.partnerId)] });
  if (p.parents.length) family.push({ label: 'Parents', names: nm(p.parents) });
  if (p.children.length) family.push({ label: 'Children', names: nm(p.children) });

  const requests: RequestView[] = [];
  for (const r of world.requests) {
    if (r.from !== p.id && r.to !== p.id) continue;
    if (world.tick - (r.resolved || r.created) > 3000) continue;
    const text =
      r.kind === 'food' ? 'food' : r.kind === 'water' ? 'water' : r.kind === 'info' ? `where to find ${r.infoKind}` : r.kind === 'help_build' ? 'help with building' : r.kind === 'trade' ? `${r.offer} for ${r.item}` : r.kind === 'care' ? 'food (care)' : r.kind === 'watch' ? 'an eye kept on a child' : r.kind === 'fire' ? 'the fire kept going' : `${r.amount} ${r.item ?? r.kind}`;
    // how far a promise has actually got is the promiser's own commitment, not the request: a promise is not a delivery
    const promiser = world.byId.get(r.to);
    const c = promiser && promiser.ent === 'person' ? promiser.commitments.find((x) => x.id === r.commitmentId) : undefined;
    const quantified = c && (c.kind === 'deliver' || c.kind === 'haul') && c.item;
    requests.push({
      id: r.id,
      direction: r.from === p.id ? 'asked' : 'asked of me',
      other: nameOf(world, r.from === p.id ? r.to : r.from),
      text,
      status: r.status,
      note: r.note,
      age: agoText(world, r.created),
      purpose: r.purpose ?? '',
      // asked for, agreed to, actually brought: three different numbers, and the row never blurs them
      progress: quantified
        ? `${r.delivered ?? c!.delivered ?? 0} of ${c!.amount} ${c!.item} brought${c!.amount < r.amount ? ` (${r.amount} asked for)` : ''}`
        : r.delivered
          ? `${r.delivered} of ${r.amount} ${r.item} brought`
          : r.offered !== undefined && r.offered < r.amount
            ? `${r.offered} of ${r.amount} ${r.item} agreed to`
            : '',
    });
  }
  requests.reverse();

  // what do they know, and how fresh is it?
  const byKind: Record<string, number> = {};
  let seen = 0;
  let hearsay = 0;
  let stale = 0;
  let places = 0;
  for (const k of Object.keys(p.beliefs)) {
    const b = p.beliefs[Number(k)];
    places++;
    byKind[b.kind] = (byKind[b.kind] ?? 0) + 1;
    if (b.src === 'seen') seen++;
    else hearsay++;
    if (world.tick - b.seen > 1800) stale++;
  }

  const view: PersonView = {
    id: p.id,
    name: p.name,
    sex: p.sex,
    age: Math.floor(age),
    stage,
    household: hh ? hh.name : 'none',
    householdColor: hh ? hh.color : 0,
    home: homeB && homeB.ent === 'building' ? `${BUILD_DEF[homeB.type].label} (${Math.round(homeB.condition)}% sound)` : 'no home yet',
    health: p.health,
    illness: describeIllness(world, p),
    // in a rich world the bar shows the mood that counts (needs plus what has happened to them): 70 is the usual, as a level of 0 is
    mood: isRich(world) && p.mood ? Math.max(0, Math.min(100, Math.round(70 + p.mood.level * 0.7))) : moodOf(p),
    thoughts: isRich(world) ? thoughtsOf(world, p) : null,
    pregnant: p.pregnantUntil > 0,
    partner: p.partnerId ? nameOf(world, p.partnerId) : null,
    traits: Object.entries(p.traits).map(([key, value]) => ({ key, value })),
    traitSummary: traitSummary(p.traits),
    goal: describeGoal(world, p),
    injury: describeInjury(world, p),
    lifeEvent: describeLifeEvent(world, p),
    crew: describeCrew(world, p),
    skills: Object.entries(p.skills).map(([key, value]) => ({ key, value })),
    payoffs: describePay(p),
    heard: describeHeard(world, p),
    trade: [describeTrade(p), describeApprentice(world, p)].filter(Boolean).join('; '),
    needs,
    inventory: itemList(p.inv),
    carry: { used: weightOf(p.inv), cap: carryCap(world, p) },
    position: { x: p.x, y: p.y },
    activity: a
      ? {
          label: a.label,
          goal: a.goal,
          phase: a.phase,
          progress: a.duration > 0 ? Math.min(1, a.progress / a.duration) : 0,
          target: targetText(world, a),
          blocked: a.blocked,
          kind: a.kind,
          moving: a.phase === 'travel',
        }
      : null,
    qa: buildQA(world, p),
    plans: planViews(world, p),
    tools: toolViews(world, p),
    commitments: commitmentViews(world, p),
    interaction: interactionViews(world, p),
    meal: mealViews(world, p),
    concerns: concernViews(world, p),
    grievances: grievanceViews(world, p),
    decision: d
      ? {
          when: agoText(world, d.tick),
          trigger: d.trigger,
          chosen: d.chosen ? d.chosen.label : '—',
          because: d.because,
          alternatives: d.alternatives.map((x) => ({ label: x.label, utility: x.utility, parts: x.parts })),
          blocked: d.blocked.map((x) => ({ label: x.label, reason: x.blocked ?? '' })),
          considered: d.considered,
          knownPlaces: d.knownPlaces,
          seenNow: d.seenNow,
        }
      : null,
    opportunities: opts.opportunities === false ? [] : auditOpportunities(world, p),
    relationships: relationships.slice(0, 14),
    family,
    requests: requests.slice(0, 8),
    memories: p.log
      .slice(-14)
      .reverse()
      .map((l) => ({ when: agoText(world, l.tick), text: l.text, kind: l.kind })),
    knowledge: { places, seen, hearsay, stale, byKind: Object.entries(byKind).map(([kind, n]) => ({ kind: BELIEF_NOUN[kind as keyof typeof BELIEF_NOUN] ?? kind, n })).sort((x, y) => y.n - x.n) },
    speech: p.speech && p.speech.until > world.tick ? p.speech.text : null,
  };
  return view;
}

// ───────────────────────── other things in the world ─────────────────────────
export interface EntityView {
  kind: string;
  id: number;
  title: string;
  subtitle: string;
  rows: [string, string][];
  bars: { label: string; value: number; max: number; tone?: string }[];
  items: ItemView[];
  notes: string[];
  position: { x: number; y: number };
  /** richer, titled blocks for workplaces, building sites and carts (the flat rows/bars above stay valid for simple viewers) */
  sections?: Section[];
}

export function describeEntity(world: World, id: number): EntityView | null {
  const e = world.byId.get(id);
  if (!e) return null;
  if (e.ent === 'person') return null;
  const base = { id: e.id, rows: [] as [string, string][], bars: [] as EntityView['bars'], items: [] as ItemView[], notes: [] as string[] };
  switch (e.ent) {
    case 'source': {
      const s: Source = e;
      const rows: [string, string][] = [['Contains', `${s.amount} ${s.item}`]];
      const bars = [{ label: s.item, value: s.amount, max: s.max, tone: 'food' }];
      const notes: string[] = [];
      if (s.type === 'tree') {
        rows.push(['Growth', s.growth >= 1 ? 'full-grown' : `${Math.round(s.growth * 100)}% grown`]);
        notes.push(s.growth < 0.55 ? 'Too young to harvest.' : 'Chopping all the wood fells the tree; saplings grow slowly from mature trees.');
      } else if (s.regrowEvery > 0) {
        rows.push(['Renews', `1 ${s.item} every ${secondsText(s.regrowEvery)}${s.amount < s.max ? ` (next in ${secondsText(Math.max(0, s.regrowEvery - s.regrowTimer))})` : ' (full)'}`]);
      }
      if (DEPOSIT_TYPES.includes(s.type)) notes.push('A finite deposit: whatever is taken out is gone for good.');
      if (s.reserved > 0) rows.push(['Being taken', `${s.reserved} unit${s.reserved > 1 ? 's' : ''} right now`]);
      if (s.lastTaker) rows.push(['Last taken by', `${nameOf(world, s.lastTaker)} (${agoText(world, s.lastTakeTick)})`]);
      return { kind: 'source', ...base, title: describeEntityName(world, e), subtitle: s.type === 'tree' ? 'Timber' : 'Natural resource', rows, bars, notes, position: { x: s.x + 0.5, y: s.y + 0.5 } };
    }
    case 'building': {
      const b = e;
      const hh = world.households.find((h) => h.id === b.hhId);
      const rows: [string, string][] = [['Owner', hh ? `${hh.name} household` : b.hhId === 0 && b.type !== 'fire' && !b.ops ? 'nobody (empty)' : 'everyone']];
      const bars: EntityView['bars'] = [];
      if (b.type !== 'fire') bars.push({ label: 'Condition', value: b.condition, max: 100, tone: b.condition < 40 ? 'warn' : 'ok' });
      else {
        bars.push({ label: 'Fuel', value: b.fuel, max: 2400, tone: b.fuel < 300 ? 'warn' : 'ok' });
        rows.push(['State', b.fuel > 0 ? 'burning' : 'out']);
      }
      if (b.store.cap > 0) rows.push(['Storage', `${Math.round(weightOf(b.store.items))}/${b.store.cap} used`]);
      if (b.builtBy && b.builtBy.length && b.built !== undefined) rows.push(['Built by', `${b.builtBy.map((id) => nameOf(world, id)).join(', ')} (${agoText(world, b.built)})`]);
      const notes: string[] = [];
      if (isHomeType(b.type)) {
        const dwellers = hh ? membersOf(world, hh).map((m) => m.name) : [];
        if (dwellers.length) rows.push(['Household', dwellers.join(', ')]);
      }
      const sections = b.ops ? describeFacility(world, b) : undefined;
      if (b.ops) {
        const job = b.ops.job;
        if (job) {
          bars.push({ label: 'Batch', value: Math.min(job.progress, job.total), max: job.total, tone: 'ok' });
          if (job.burnTotal > 0) bars.push({ label: 'Fire', value: job.burnTotal - Math.max(0, job.burnLeft), max: job.burnTotal, tone: 'warm' });
        }
        notes.push(BUILD_DEF[b.type].blurb);
      }
      if (b.upgrading) notes.push('Being rebuilt as a house: still lived in while the work goes on.');
      return { kind: 'building', ...base, title: describeEntityName(world, e), subtitle: `Built ${agoText(world, b.builtTick)}`, rows, bars, items: itemList(b.store.items), notes, position: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, sections };
    }
    case 'site': {
      const s = e;
      const rows: [string, string][] = [
        ['For', `${householdName(world, s.hhId)} household`],
        ['Started by', nameOf(world, s.creatorId)],
        ['Status', s.status],
      ];
      const bars: EntityView['bars'] = [{ label: 'Building progress', value: s.work, max: s.workTotal, tone: 'ok' }];
      for (const k of Object.keys(s.required) as ItemKind[]) bars.push({ label: `${k} supplied`, value: (s.delivered[k] ?? 0) + (s.used[k] ?? 0), max: s.required[k] ?? 0, tone: 'mat' });
      const workers = [...world.reservations.values()].filter((r) => r.kind === 'slot' && r.target === s.id).map((r) => nameOf(world, r.owner));
      rows.push(['Working now', workers.length ? workers.join(', ') : 'nobody']);
      return { kind: 'site', ...base, title: describeEntityName(world, e), subtitle: `Marked out ${agoText(world, s.createdTick)}`, rows, bars, items: itemList(s.delivered), notes: ['Materials delivered but not yet worked in are shown below.'], position: { x: s.x + s.w / 2, y: s.y + s.h / 2 }, sections: describeSiteSections(world, s) };
    }
    case 'plot': {
      const pl: Plot = e;
      const rows: [string, string][] = [['State', pl.state === 'tilling' ? 'being prepared' : pl.state === 'tilled' ? 'ready for seed' : pl.state === 'growing' ? 'growing' : 'ripe'], ['Owner', `${householdName(world, pl.hhId)} household`]];
      const bars: EntityView['bars'] = [];
      if (pl.state === 'tilling') bars.push({ label: 'Preparation', value: pl.progress, max: 1, tone: 'ok' });
      if (pl.state === 'growing') {
        bars.push({ label: 'Growth', value: pl.progress, max: 1, tone: 'ok' });
        bars.push({ label: 'Care (water & weeding)', value: pl.care, max: 1, tone: pl.care < 0.3 ? 'warn' : 'ok' });
      }
      if (pl.state === 'ripe') rows.push(['Ready to harvest', `${pl.stock} grain, ${pl.seedStock} seed`]);
      return { kind: 'plot', ...base, title: 'Field plot', subtitle: 'Farmland', rows, bars, notes: [], position: { x: pl.x + 0.5, y: pl.y + 0.5 } };
    }
    case 'pile':
      return { kind: 'pile', ...base, title: 'Pile of goods', subtitle: e.note || 'Left lying about', rows: [['Lying here since', agoText(world, e.since)]], bars: [], items: itemList(e.items), notes: ['Perishable food slowly spoils out in the open.'], position: { x: e.x + 0.5, y: e.y + 0.5 } };
    case 'grave':
      return { kind: 'grave', ...base, title: `Grave of ${e.name}`, subtitle: `Died ${agoText(world, e.died)}, aged ${e.age}`, rows: [], bars: [], notes: [], position: { x: e.x + 0.5, y: e.y + 0.5 } };
    case 'animal':
      return {
        kind: 'animal',
        ...base,
        title: e.type === 'deer' ? 'Deer' : 'Wolf',
        subtitle: 'Wild animal',
        rows: [['Behaviour', e.type === 'deer' ? (e.state === 'retreat' ? 'bolting' : 'grazing') : e.state === 'roam' ? 'prowling its territory' : e.state === 'stalk' ? 'stalking someone' : e.state === 'retreat' ? 'slinking away' : 'attacking']],
        bars: [],
        notes: [e.type === 'deer' ? 'Deer bolt from anyone who comes close; a hunting party brings one down more surely than one hunter.' : 'Wolves avoid fires, huts and groups of people.'],
        position: { x: e.x, y: e.y },
      };
    case 'cart':
      return { kind: 'cart', ...base, title: 'Handcart', subtitle: e.puller ? `Being pulled by ${nameOf(world, e.puller)}` : 'Parked', rows: [['Wear', `${Math.round(e.wear)}%`]], bars: [], items: itemList(e.load), notes: [], position: { x: e.x, y: e.y }, sections: describeCartSections(world, e) };
  }
}

// ───────────────────────── whole-world summary ─────────────────────────
export interface WorldSummary {
  day: number;
  clock: string;
  phase: string;
  weather: string;
  temp: number;
  population: number;
  children: number;
  elders: number;
  households: number;
  homes: number;
  buildings: number;
  sites: number;
  plots: number;
  foodHeld: number;
  births: number;
  deaths: number;
  tick: number;
}

export function summarizeWorld(world: World): WorldSummary {
  let children = 0;
  let elders = 0;
  let food = 0;
  for (const p of world.persons) {
    const s = stageOf(world, p);
    if (s === 'child') children++;
    if (s === 'elder') elders++;
    food += foodUnits(p.inv);
  }
  for (const b of world.buildings) food += foodUnits(b.store.items);
  return {
    day: dayNumber(world.tick),
    clock: clockText(world.tick),
    phase: phaseName(dayFraction(world.tick)),
    weather: weatherLabel(world.weather),
    temp: Math.round(world.weather.temp),
    population: world.persons.length,
    children,
    elders,
    households: world.households.length,
    homes: world.buildings.filter((b) => isHomeType(b.type)).length,
    buildings: world.buildings.length,
    sites: world.sites.length,
    plots: world.plots.length,
    foodHeld: food,
    births: world.events.filter((e) => e.kind === 'life' && /was born/.test(e.text)).length,
    deaths: world.deceased.length,
    tick: world.tick,
  };
}

void NUTRITION;
void TICKS_PER_YEAR;
void ACTIVITY_NOUN;
