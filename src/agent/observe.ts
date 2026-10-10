// The inhabitant's observation: everything an outside controller may know about the person it drives, and nothing else
// (docs/INHABITANT.md, section 2).
//
// PROVENANCE. Every field below is taken from the person's own records (`p.*`), and the comment on each field says which. The
// builder reads the World for three things only:
//   (a) what everyone feels: the tick, the light, the weather;
//   (b) the names of people whom the person's own records refer to by id (a relation, someone in sight, a promise, a worry);
//   (c) the person's own household: its name, who is in it, and their own home.
// It never reads world.events, world.sources / buildings / sites / plots / piles / animals, other people's needs, inventories,
// beliefs or plans, world.stats, the ledger, the dead, or the seed. The options are the engine's own offer to this person
// (decision.ts, after every hard filter); an option's target is described from the person's beliefs or from what is in sight,
// never from the world's index, so a remembered thing that has since vanished reads as remembered, not as gone.
//
// The result is deep-frozen. The prompt builder (protocol.ts) takes this object and nothing else.
import { BUILD_DEF, CRITICAL, NEED_KEYS, TOOL_DEFS } from '../sim/constants';
import { householdOf } from '../sim/buildings';
import { clockText, dayFraction, dayNumber, phaseName, weatherLabel } from '../sim/environment';
import { membersOf } from '../sim/households';
import { agoText, secondsText } from '../sim/inspect';
import { estimatedAmount, isWaterBeliefId } from '../sim/knowledge';
import { ACTIVITY_NOUN, BELIEF_NOUN, compass } from '../sim/labels';
import { isRich, thoughtsOf } from '../sim/mood';
import { ageYears, carryCap, stageOf, traitSummary } from '../sim/people';
import { relLabel } from '../sim/relations';
import { hashString } from '../sim/rng';
import { toolsHeldBy } from '../sim/toolreg';
import { weightOf } from '../sim/economy';
import type { Ctx, Option } from '../sim/optutil';
import type { Belief, BuildingType, ItemKind, Items, NeedKey, Person, World } from '../sim/types';
import { hyp } from '../sim/util';

export const OBSERVATION_VERSION = 1;

export interface ObservedOption {
  /** the key the controller answers with: the engine's own option key */
  key: string;
  kind: string;
  label: string;
  goal: string;
  /** the need it serves, if any */
  need: string | null;
  /** rough time to get there, in words */
  eta: string;
  /** the target as the person knows it; null when the option has no particular target */
  target: string | null;
  /** the engine's own score: only when the operator asks for it (`showScores`) */
  score?: number;
}

export interface ObservedPlace {
  id: number;
  what: string;
  x: number;
  y: number;
  distance: number;
  direction: string;
  /** how long ago it was seen (by whoever saw it) */
  seen: string;
  /** 'seen' or 'told by <name>' (and how many mouths it passed through) */
  source: string;
  /** stale: not seen for a long time */
  stale: boolean;
  /** sources: what was there when seen, and what the person reckons is there now */
  amount?: number;
  estimate?: number;
  owner?: string;
  items?: Items;
  missing?: Items;
  state?: string;
  progress?: number;
  condition?: number;
  fuel?: number;
  tools?: string[];
}

export interface ObservedPerson {
  id: number;
  name: string;
  x: number;
  y: number;
  distance: number;
  direction: string;
  /** what can be seen of their state */
  looks: string[];
  doing: string;
  carrying: ItemKind[];
  talking: boolean;
  relation: string;
}

export interface InhabitantObservation {
  version: number;
  /** (a) world.tick, world.light, world.weather */
  time: { tick: number; day: number; clock: string; phase: string; light: 'dark' | 'dim' | 'daylight'; weather: string; tempC: number };
  /** p.name, p.sex, p.birthTick, p.traits, p.skills, p.health, p.needs, p.inv, toolsHeldBy(p.id), p.cartId, p.x/y, p.mood */
  self: {
    name: string;
    sex: 'f' | 'm';
    stage: string;
    ageYears: number;
    character: string;
    skills: Record<string, number>;
    health: number;
    needs: Record<NeedKey, { value: number; state: 'ok' | 'low' | 'critical' }>;
    carrying: Items;
    load: { used: number; cap: number };
    tools: { kind: string; label: string; wear: number; loan: string | null }[];
    pullingCart: boolean;
    position: { x: number; y: number };
    mood?: number;
    thoughts?: string[];
  };
  /** (c) householdOf(p), membersOf(hh), hh.homeId; p.partnerId, p.parents, p.children */
  household: { name: string; members: { name: string; kin: string }[]; home: string | null; partner: string | null; parents: string[]; children: string[] };
  /** p.activity, p.suspended, p.convId (own conversation), p.lastResult, p.lastDecision */
  doing: {
    activity: { label: string; goal: string; phase: string; progress: number; target: string | null; blocked: string; since: string } | null;
    suspended: string | null;
    conversation: { partner: string; purpose: string } | null;
    lastResult: { label: string; outcome: string; detail: string; when: string } | null;
    lastChoice: { label: string; when: string; trigger: string } | null;
  };
  /** p.seen */
  seen: { people: ObservedPerson[]; wolves: { x: number; y: number; distance: number; direction: string }[] };
  /** p.beliefs (nearest of each kind; `counts` says how many of each kind are known in all) */
  remembered: { places: ObservedPlace[]; water: ObservedPlace[]; dangers: ObservedPlace[]; counts: Record<string, number> };
  /** p.relations, p.whereabouts, p.concerns, world.requests where from/to is p, p.commitments */
  people: {
    relations: { id: number; name: string; label: string; affinity: number; trust: number; familiarity: number; kin: string; lastMet: string; avoiding: boolean; owesMe: number; lastNote: string; grievance: string | null }[];
    whereabouts: { id: number; name: string; x: number; y: number; when: string }[];
    worries: { about: string; kind: string; seen: string; source: string }[];
    requests: { direction: 'I asked' | 'asked of me'; other: string; what: string; status: string; note: string; when: string }[];
    promises: { text: string; status: string; detail: string; due: string }[];
  };
  /** p.log, p.failures */
  recent: { memory: { when: string; text: string; kind: string }[]; failures: { place: string; when: string; reason: string }[] };
  /** the engine's offer to this person now (rankOptions(ctx)), and what it set aside with the person's own reasons (ctx.blocked) */
  options: ObservedOption[];
  setAside: { label: string; reason: string; target: string | null }[];
}

export interface ObserveOptions {
  /** include the engine's own utility scores on the options (off: the controller judges for itself) */
  showScores?: boolean;
}

const NEED_LOW: Record<NeedKey, number> = { hunger: 45, thirst: 45, energy: 32, warmth: 42, safety: 45, social: 35 };
const STALE_AFTER = 1800;
const PLACE_CAPS: Partial<Record<Belief['kind'], number>> = {
  berry_bush: 8,
  fruit_tree: 8,
  wild_grain: 8,
  fish_spot: 6,
  tree: 6,
  rock: 6,
  clay_pit: 4,
  ore_vein: 4,
  outcrop: 4,
  building: 24,
  site: 8,
  plot: 8,
  pile: 6,
  cart: 4,
  grave: 4,
};

/** control characters out, and nothing that could close the observation block in a prompt */
export function cleanText(s: string, max = 300): string {
  let t = '';
  for (let i = 0; i < s.length && t.length < max; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) continue;
    t += s[i];
  }
  return t.replace(/<\/?observation/gi, '[observation]');
}

const r1 = (v: number): number => Math.round(v * 10) / 10;

/** (b) a name for an id taken from the person's own records */
function nameOf(world: World, id: number): string {
  const e = world.byId.get(id);
  if (e && e.ent === 'person') return e.name;
  const d = world.deceased.find((x) => x.id === id);
  return d ? d.name : `someone (#${id})`;
}

function householdName(world: World, id: number): string {
  return world.households.find((h) => h.id === id)?.name ?? 'nobody';
}

function placeNoun(b: Belief): string {
  if (isWaterBeliefId(b.id)) return 'water (shore)';
  if ((b.kind === 'building' || b.kind === 'site') && b.btype) {
    const def = BUILD_DEF[b.btype as BuildingType];
    return def ? `${def.label}${b.kind === 'site' ? ' site' : ''}` : b.kind;
  }
  if (b.kind === 'danger') return 'wolf';
  return BELIEF_NOUN[b.kind] ?? b.kind;
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.freeze(o);
    for (const k of Object.keys(o as object)) deepFreeze((o as Record<string, unknown>)[k]);
  }
  return o;
}

function describePlace(world: World, p: Person, b: Belief): ObservedPlace {
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  const out: ObservedPlace = {
    id: b.id,
    what: placeNoun(b),
    x: r1(b.x),
    y: r1(b.y),
    distance: Math.round(hyp(dx, dy)),
    direction: compass(dx, dy),
    seen: agoText(world, b.seen),
    source: b.src === 'seen' ? 'seen' : `told by ${nameOf(world, b.from)}${(b.hops ?? 1) > 1 ? ` (${b.hops} mouths)` : ''}`,
    stale: world.tick - b.seen > STALE_AFTER,
  };
  const isSource = !isWaterBeliefId(b.id) && !['building', 'site', 'plot', 'pile', 'grave', 'cart', 'danger', 'water'].includes(b.kind);
  if (isSource) {
    out.amount = b.amount;
    const est = estimatedAmount(world, b);
    if (est !== b.amount) out.estimate = est;
  }
  if (b.hh) out.owner = householdName(world, b.hh);
  if (b.items && Object.keys(b.items).length) out.items = { ...b.items };
  if (b.need && Object.keys(b.need).length) out.missing = { ...b.need };
  if (b.state) out.state = b.state;
  if (b.progress !== undefined && (b.kind === 'site' || b.kind === 'plot')) out.progress = Math.round(b.progress * 100) / 100;
  if (b.cond !== undefined && b.kind === 'building') out.condition = Math.round(b.cond);
  if (b.fuel !== undefined && b.btype === 'fire') out.fuel = Math.round(b.fuel);
  if (b.tools && b.tools.length) out.tools = b.tools.slice();
  if (b.kind === 'plot' && b.amount) out.amount = b.amount;
  return out;
}

/** the target of an option or a failure, as the person knows it */
function describeTarget(world: World, p: Person, id: number): string | null {
  if (!id) return null;
  const s = p.seen.find((x) => x.id === id);
  if (s) {
    const d = Math.round(hyp(s.x - p.x, s.y - p.y));
    return s.ent === 'person' ? `${nameOf(world, id)} (in sight, ${d} tiles ${compass(s.x - p.x, s.y - p.y)})` : `wolf (in sight, ${d} tiles away)`;
  }
  const b = p.beliefs[id];
  if (b) return `${placeNoun(b)} ${Math.round(hyp(b.x - p.x, b.y - p.y))} tiles ${compass(b.x - p.x, b.y - p.y)} (seen ${agoText(world, b.seen)})`;
  const wh = p.whereabouts[id];
  if (wh) return `${nameOf(world, id)} (last seen ${agoText(world, wh.tick)})`;
  if (p.relations[id] || p.hhId === (world.byId.get(id) as Person | undefined)?.hhId) return nameOf(world, id);
  return `#${id}`;
}

function commitmentText(world: World, p: Person, c: Person['commitments'][number]): string {
  const to = nameOf(world, c.to);
  const site = c.siteId ? p.beliefs[c.siteId] : undefined;
  const siteText = site ? `the ${placeNoun(site)} ${Math.round(hyp(site.x - p.x, site.y - p.y))} tiles ${compass(site.x - p.x, site.y - p.y)}` : 'their building site';
  switch (c.kind) {
    case 'deliver':
      return `Bring ${c.amount} ${c.item ?? 'goods'} to ${to}`;
    case 'haul':
      return `Haul ${c.amount} ${c.item ?? 'goods'} to ${siteText}, as promised to ${to}`;
    case 'help_build':
      return `Help ${to} build`;
    case 'work':
      return `Do some work for ${to}${c.milestone ? ` (${c.milestone})` : ''}`;
    case 'return_tool':
      return `Return ${to}’s ${c.item ?? 'tool'}`;
    default:
      return `${c.kind} for ${to}`;
  }
}

function describeOption(world: World, p: Person, o: Option, showScores: boolean): ObservedOption {
  const out: ObservedOption = {
    key: o.key,
    kind: o.kind,
    label: cleanText(o.label, 120),
    goal: cleanText(o.goal, 160),
    need: o.need,
    eta: o.eta > 0 ? secondsText(o.eta) : 'now',
    target: describeTarget(world, p, o.targetId),
  };
  if (showScores) out.score = Math.round(o.util * 10) / 10;
  return out;
}

/**
 * Build the observation for a person about to choose. `ranked` is the engine's offer (rankOptions(ctx), best first) and `ctx` the
 * person's own planning context; both come from the same decision the engine is making. Pure: reads, never writes, never draws a
 * random number.
 */
export function observeInhabitant(world: World, p: Person, ctx: Ctx, ranked: Option[], opts: ObserveOptions = {}): InhabitantObservation {
  const showScores = opts.showScores === true;
  const hh = householdOf(world, p);
  const members = membersOf(world, hh).filter((m) => m.id !== p.id);
  const kinOf = (id: number): string => p.relations[id]?.kin || (p.partnerId === id ? 'partner' : p.parents.includes(id) ? 'parent' : p.children.includes(id) ? 'child' : '');
  const home = hh && hh.homeId ? world.byId.get(hh.homeId) : undefined;
  const homeBelief = hh && hh.homeId ? p.beliefs[hh.homeId] : undefined;
  const homeText = homeBelief ? `${placeNoun(homeBelief)} ${Math.round(hyp(homeBelief.x - p.x, homeBelief.y - p.y))} tiles ${compass(homeBelief.x - p.x, homeBelief.y - p.y)}${homeBelief.cond !== undefined ? ` (${Math.round(homeBelief.cond)}% sound when last seen)` : ''}` : home && home.ent === 'building' ? BUILD_DEF[home.type].label : null;

  const needs = {} as InhabitantObservation['self']['needs'];
  for (const k of NEED_KEYS) {
    const v = p.needs[k];
    needs[k] = { value: Math.round(v), state: CRITICAL[k] > 0 && v < CRITICAL[k] ? 'critical' : v < NEED_LOW[k] ? 'low' : 'ok' };
  }
  const skills: Record<string, number> = {};
  for (const k of Object.keys(p.skills) as (keyof Person['skills'])[]) skills[k] = Math.round(p.skills[k] * 100) / 100;
  const light = world.light < 0.3 ? 'dark' : world.light < 0.8 ? 'dim' : 'daylight';

  const self: InhabitantObservation['self'] = {
    name: p.name,
    sex: p.sex,
    stage: stageOf(world, p),
    ageYears: Math.floor(ageYears(world, p)),
    character: traitSummary(p.traits),
    skills,
    health: Math.round(p.health),
    needs,
    carrying: { ...p.inv },
    load: { used: Math.round(weightOf(p.inv) * 10) / 10, cap: carryCap(world, p) },
    tools: toolsHeldBy(world, p.id).map((t) => ({
      kind: t.kind,
      label: `${t.tier === 1 ? 'iron ' : ''}${TOOL_DEFS[t.kind].label}`,
      wear: Math.round(t.wear),
      loan: t.loan ? (t.loan.lender === 0 ? 'taken from a shared rack' : `borrowed from ${nameOf(world, t.loan.lender)}`) : t.ownerHh !== p.hhId ? `belongs to the ${householdName(world, t.ownerHh)} household` : null,
    })),
    pullingCart: p.cartId !== 0,
    position: { x: r1(p.x), y: r1(p.y) },
  };
  if (isRich(world) && p.mood) {
    self.mood = Math.round(p.mood.level);
    self.thoughts = thoughtsOf(world, p).map((t) => `${t.value > 0 ? '+' : ''}${Math.round(t.value)} ${cleanText(t.why, 80)}`);
  }

  const a = p.activity;
  const doing: InhabitantObservation['doing'] = {
    activity: a
      ? {
          label: cleanText(a.label, 120),
          goal: cleanText(a.goal, 160),
          phase: a.phase,
          progress: a.duration > 0 ? Math.round(Math.min(1, a.progress / a.duration) * 100) / 100 : 0,
          target: describeTarget(world, p, a.targetId),
          blocked: cleanText(a.blocked, 120),
          since: agoText(world, a.start),
        }
      : null,
    suspended: p.suspended ? cleanText(p.suspended.label, 120) : null,
    conversation: null,
    lastResult: p.lastResult ? { label: cleanText(p.lastResult.label, 120), outcome: p.lastResult.outcome, detail: cleanText(p.lastResult.detail, 160), when: agoText(world, p.lastResult.tick) } : null,
    lastChoice: p.lastDecision && p.lastDecision.chosen ? { label: cleanText(p.lastDecision.chosen.label, 120), when: agoText(world, p.lastDecision.tick), trigger: p.lastDecision.trigger } : null,
  };
  if (p.convId) {
    const c = world.conversations.find((x) => x.id === p.convId);
    if (c) doing.conversation = { partner: nameOf(world, c.a === p.id ? c.b : c.a), purpose: c.purpose };
  }

  const seenPeople: ObservedPerson[] = [];
  const wolves: InhabitantObservation['seen']['wolves'] = [];
  for (const s of p.seen) {
    const dx = s.x - p.x;
    const dy = s.y - p.y;
    if (s.ent === 'animal') {
      wolves.push({ x: r1(s.x), y: r1(s.y), distance: Math.round(hyp(dx, dy)), direction: compass(dx, dy) });
      continue;
    }
    const looks: string[] = [];
    if (s.child) looks.push('a child');
    if (s.hungry) looks.push('hungry');
    if (s.thirsty) looks.push('thirsty');
    if (s.tired) looks.push('tired');
    if (s.cold) looks.push('cold');
    if (s.hurt) looks.push('hurt');
    if (s.asleep) looks.push('asleep');
    seenPeople.push({
      id: s.id,
      name: nameOf(world, s.id),
      x: r1(s.x),
      y: r1(s.y),
      distance: Math.round(hyp(dx, dy)),
      direction: compass(dx, dy),
      looks,
      doing: s.act ? ACTIVITY_NOUN[s.act] ?? s.act : '',
      carrying: s.carrying.slice(),
      talking: s.busyTalking,
      relation: relLabel(p.relations[s.id]),
    });
  }
  seenPeople.sort((m, n) => m.distance - n.distance);

  const byKind: Partial<Record<Belief['kind'], Belief[]>> = {};
  const counts: Record<string, number> = {};
  for (const k of Object.keys(p.beliefs)) {
    const b = p.beliefs[Number(k)];
    (byKind[b.kind] ??= []).push(b);
    counts[placeNoun({ ...b, btype: undefined })] = (counts[placeNoun({ ...b, btype: undefined })] ?? 0) + 1;
  }
  const nearest = (list: Belief[] | undefined, n: number): Belief[] => (list ? list.slice().sort((m, o) => hyp(m.x - p.x, m.y - p.y) - hyp(o.x - p.x, o.y - p.y)).slice(0, n) : []);
  const places: ObservedPlace[] = [];
  for (const kind of Object.keys(PLACE_CAPS) as Belief['kind'][]) for (const b of nearest(byKind[kind], PLACE_CAPS[kind] ?? 4)) places.push(describePlace(world, p, b));
  places.sort((m, n) => m.distance - n.distance);
  const water = nearest(byKind.water, 4).map((b) => describePlace(world, p, b));
  const dangers = (byKind.danger ?? [])
    .filter((b) => b.amount > 0 && world.tick - b.seen < 700)
    .sort((m, n) => hyp(m.x - p.x, m.y - p.y) - hyp(n.x - p.x, n.y - p.y))
    .slice(0, 6)
    .map((b) => describePlace(world, p, b));

  const relations: InhabitantObservation['people']['relations'] = [];
  for (const k of Object.keys(p.relations)) {
    const id = Number(k);
    const r = p.relations[id];
    if (r.familiarity < 1 && !r.kin) continue;
    relations.push({
      id,
      name: nameOf(world, id),
      label: relLabel(r),
      affinity: Math.round(r.affinity),
      trust: Math.round(r.trust),
      familiarity: Math.round(r.familiarity),
      kin: r.kin,
      lastMet: r.lastMet > 0 ? agoText(world, r.lastMet) : 'never',
      avoiding: r.avoidUntil > world.tick,
      owesMe: Math.round(r.debt),
      lastNote: r.history.length ? cleanText(r.history[r.history.length - 1].text, 120) : '',
      grievance: r.grievance ? `${r.grievance.cause.replace('_', ' ')}: ${cleanText(r.grievance.detail, 100)} (${Math.round(r.grievance.weight)}/100)` : null,
    });
  }
  relations.sort((m, n) => Math.abs(n.affinity) - Math.abs(m.affinity) || n.familiarity - m.familiarity);

  const inSight = new Set(p.seen.map((s) => s.id));
  const whereabouts = Object.keys(p.whereabouts)
    .map((k) => ({ id: Number(k), w: p.whereabouts[Number(k)] }))
    .filter((x) => !inSight.has(x.id) && world.tick - x.w.tick < 2400)
    .sort((m, n) => n.w.tick - m.w.tick)
    .slice(0, 10)
    .map((x) => ({ id: x.id, name: nameOf(world, x.id), x: r1(x.w.x), y: r1(x.w.y), when: agoText(world, x.w.tick) }));

  const worries = p.concerns.map((c) => ({
    about: nameOf(world, c.about),
    kind: c.kind === 'missing' ? 'has not been seen for a while' : `looked ${c.kind}`,
    seen: agoText(world, c.seen),
    source: c.src === 'seen' ? 'saw it myself' : `told by ${nameOf(world, c.from)}`,
  }));

  const requests: InhabitantObservation['people']['requests'] = [];
  for (const r of world.requests) {
    if (r.from !== p.id && r.to !== p.id) continue;
    if (world.tick - (r.resolved || r.created) > 3000) continue;
    const what = r.kind === 'info' ? `where to find ${r.infoKind}` : r.kind === 'help_build' ? 'help with building' : r.kind === 'trade' ? `${r.offer} for ${r.item}` : r.kind === 'care' ? 'food (care)' : `${r.amount} ${r.item ?? r.kind}`;
    requests.push({ direction: r.from === p.id ? 'I asked' : 'asked of me', other: nameOf(world, r.from === p.id ? r.to : r.from), what, status: r.status, note: cleanText(r.note, 120), when: agoText(world, r.created) });
  }
  requests.reverse();

  const active = p.commitments.filter((c) => c.status === 'active');
  const ended = p.commitments.filter((c) => c.status !== 'active').slice(-4).reverse();
  const promises = [...active, ...ended].map((c) => {
    const parts: string[] = [];
    if (c.kind === 'deliver' || c.kind === 'haul') parts.push(`${c.delivered ?? 0} of ${c.amount} delivered`);
    if (c.reason) parts.push(cleanText(c.reason, 100));
    if (c.status === 'active' && c.blocked && c.blockedAt && world.tick - c.blockedAt < 600) parts.push(`held up: ${cleanText(c.blocked, 100)}`);
    const due = c.deadline + (c.grace ?? 0);
    return { text: commitmentText(world, p, c), status: c.status, detail: parts.join(' · '), due: c.status === 'active' ? (due > world.tick ? `in ${secondsText(due - world.tick)}` : 'overdue') : agoText(world, c.made) };
  });

  const failures: InhabitantObservation['recent']['failures'] = [];
  for (const k of Object.keys(p.failures)) {
    const id = Number(k);
    const f = p.failures[id];
    if (world.tick - f.tick > 900) continue;
    failures.push({ place: describeTarget(world, p, id) ?? `#${id}`, when: agoText(world, f.tick), reason: cleanText(f.reason, 100) });
  }
  failures.sort((m, n) => m.when.localeCompare(n.when));

  const obs: InhabitantObservation = {
    version: OBSERVATION_VERSION,
    time: { tick: world.tick, day: dayNumber(world.tick), clock: clockText(world.tick), phase: phaseName(dayFraction(world.tick)), light, weather: weatherLabel(world.weather), tempC: Math.round(world.weather.temp) },
    self,
    household: {
      name: hh ? hh.name : 'none',
      members: members.map((m) => ({ name: m.name, kin: kinOf(m.id) })),
      home: homeText,
      partner: p.partnerId ? nameOf(world, p.partnerId) : null,
      parents: p.parents.map((id) => nameOf(world, id)),
      children: p.children.map((id) => nameOf(world, id)),
    },
    doing,
    seen: { people: seenPeople, wolves },
    remembered: { places, water, dangers, counts },
    people: { relations: relations.slice(0, 14), whereabouts, worries, requests: requests.slice(0, 8), promises },
    recent: {
      memory: p.log
        .slice(-14)
        .reverse()
        .map((l) => ({ when: agoText(world, l.tick), text: cleanText(l.text, 200), kind: l.kind })),
      failures: failures.slice(0, 6),
    },
    options: ranked.slice(0, 30).map((o) => describeOption(world, p, o, showScores)),
    setAside: ctx.blocked.slice(0, 12).map((o) => ({ label: cleanText(o.label, 120), reason: cleanText(o.blocked ?? '', 160), target: describeTarget(world, p, o.targetId) })),
  };
  return deepFreeze(obs);
}

/** a fingerprint of the observation as the controller saw it: the transcript records it and a replay checks it */
export function observationHash(obs: InhabitantObservation): string {
  return hashString(JSON.stringify(obs)).toString(16).padStart(8, '0');
}
