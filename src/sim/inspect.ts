// Read-only view-models for the UI. Nothing in here mutates the world or consumes random numbers,
// so inspecting a person can never change what happens next.
import { WELL_CAP, WELL_MIN_CONDITION, WELL_REFILL } from './water';
import { BUILD_DEF, DEPOSIT_TYPES, NUTRITION, TICKS_PER_YEAR, isHomeType } from './constants';
import { generateOptions, rankOptions } from './decision';
import { clockText, dayNumber, phaseName, weatherLabel, dayFraction } from './environment';
import { householdOf } from './buildings';
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
import type { Activity, Entity, Items, ItemKind, NeedKey, Person, Plot, Source, World } from './types';
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
  mood: number;
  /** rich dynamics only: what is weighing on or lifting them now, strongest first; null in any other world */
  thoughts: { why: string; value: number }[] | null;
  pregnant: boolean;
  partner: string | null;
  traits: { key: string; value: number }[];
  traitSummary: string;
  skills: { key: string; value: number }[];
  needs: NeedView[];
  inventory: ItemView[];
  carry: { used: number; cap: number };
  position: { x: number; y: number };
  activity: { label: string; goal: string; phase: string; progress: number; target: string; blocked: string; kind: string; moving: boolean } | null;
  qa: { doing: string; why: string; trying: string; stopping: string; lastAttempt: string };
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
      return 'Wolf';
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
  return { doing, why, trying, stopping, lastAttempt: last };
}

// ───────────────────────── "why didn't they take that?" ─────────────────────────
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
      r.kind === 'food' ? 'food' : r.kind === 'water' ? 'water' : r.kind === 'info' ? `where to find ${r.infoKind}` : r.kind === 'help_build' ? 'help with building' : r.kind === 'trade' ? `${r.offer} for ${r.item}` : r.kind === 'care' ? 'food (care)' : `${r.amount} ${r.item ?? r.kind}`;
    requests.push({
      id: r.id,
      direction: r.from === p.id ? 'asked' : 'asked of me',
      other: nameOf(world, r.from === p.id ? r.to : r.from),
      text,
      status: r.status,
      note: r.note,
      age: agoText(world, r.created),
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
    // in a rich world the bar shows the mood that counts (needs plus what has happened to them): 70 is the usual, as a level of 0 is
    mood: isRich(world) && p.mood ? Math.max(0, Math.min(100, Math.round(70 + p.mood.level * 0.7))) : moodOf(p),
    thoughts: isRich(world) ? thoughtsOf(world, p) : null,
    pregnant: p.pregnantUntil > 0,
    partner: p.partnerId ? nameOf(world, p.partnerId) : null,
    traits: Object.entries(p.traits).map(([key, value]) => ({ key, value })),
    traitSummary: traitSummary(p.traits),
    skills: Object.entries(p.skills).map(([key, value]) => ({ key, value })),
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
      const rows: [string, string][] = [['Owner', hh ? `${hh.name} household` : b.hhId === 0 && b.type !== 'fire' && b.type !== 'well' && !b.ops ? 'nobody (empty)' : 'everyone']];
      const bars: EntityView['bars'] = [];
      if (b.type !== 'fire') bars.push({ label: 'Condition', value: b.condition, max: 100, tone: b.condition < 40 ? 'warn' : 'ok' });
      else {
        bars.push({ label: 'Fuel', value: b.fuel, max: 2400, tone: b.fuel < 300 ? 'warn' : 'ok' });
        rows.push(['State', b.fuel > 0 ? 'burning' : 'out']);
      }
      if (b.store.cap > 0) rows.push(['Storage', `${Math.round(weightOf(b.store.items))}/${b.store.cap} used`]);
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
      if (b.type === 'well') {
        const water = b.store.items.water ?? 0;
        bars.push({ label: 'Water in the well', value: water, max: WELL_CAP, tone: water < 2 ? 'warn' : 'ok' });
        rows.push(['Seeps in', `1 unit every ${secondsText(WELL_REFILL)}${water >= WELL_CAP ? ' (full)' : b.condition < WELL_MIN_CONDITION ? ' (silted up: needs mending)' : ''}`]);
        notes.push(BUILD_DEF.well.blurb);
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
        title: 'Wolf',
        subtitle: 'Wild animal',
        rows: [['Behaviour', e.state === 'roam' ? 'prowling its territory' : e.state === 'stalk' ? 'stalking someone' : e.state === 'retreat' ? 'slinking away' : 'attacking']],
        bars: [],
        notes: ['Wolves avoid fires, huts and groups of people.'],
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
