// Read-only descriptions of workplaces, building sites, carts, tools, promises and meals for the inspectors.
// Nothing here changes the world or draws random numbers.
import { BUILD_DEF, GRANARY_TEND_EVERY, TOOL_DEFS } from './constants';
import { weightOf } from './economy';
import { opsOf, recipeOf, usableUnits } from './facilities';
import { RECIPES, recipesAt } from './recipes';
import type { Recipe } from './recipes';
import { toolsHeldBy } from './toolreg';
import { mealOf, previousMealOf } from './meals';
import { accountWords } from './reputation';
import { SKILL_WORD } from './teaching';
import type { Building, Cart, Commitment, Items, ItemKind, Meal, Person, Site, World } from './types';

export interface Bar {
  label: string;
  value: number;
  max: number;
  tone?: string;
}
export interface ItemRow {
  kind: ItemKind;
  n: number;
}
export interface Section {
  title: string;
  rows?: [string, string][];
  bars?: Bar[];
  items?: ItemRow[];
  notes?: string[];
}

const label = (k: ItemKind): string => k;
const nameOf = (world: World, id: number): string => {
  const e = world.byId.get(id);
  return e && e.ent === 'person' ? e.name : 'someone';
};
const hhName = (world: World, id: number): string => (id === 0 ? 'everyone' : (world.households.find((h) => h.id === id)?.name ?? 'nobody') + ' household');

export function itemsText(items: Items): string {
  const parts = Object.keys(items)
    .filter((k) => (items[k as ItemKind] ?? 0) > 0)
    .map((k) => `${items[k as ItemKind]} ${label(k as ItemKind)}`);
  return parts.length ? parts.join(', ') : 'nothing';
}

function ago(world: World, tick: number): string {
  const d = world.tick - tick;
  if (d < 40) return 'just now';
  if (d < 600) return `${Math.round(d / 10)}s ago`;
  if (d < 36000) return `${Math.round((d / 600) * 10) / 10} min ago`;
  return `${Math.round(d / 2400)} days ago`;
}

function inFuture(world: World, tick: number): string {
  const d = tick - world.tick;
  if (d <= 0) return 'now';
  if (d < 600) return `in ${Math.round(d / 10)}s`;
  return `in ${Math.round((d / 600) * 10) / 10} min`;
}

// ───────────────────────── workplaces ─────────────────────────
/** What is actually stopping this recipe from being started here and now, in words. Empty = nothing. */
export function recipeBlockers(world: World, b: Building, r: Recipe): string[] {
  const out: string[] = [];
  const ops = b.ops;
  if (!ops) return out;
  if (ops.job) {
    out.push(ops.job.phase === 'burn' ? 'the fire is burning another batch' : ops.job.phase === 'ready' ? 'finished goods are waiting for room in the store' : 'another batch is under way');
    return out;
  }
  if (b.condition < 12) out.push('the building is too run down to use');
  const need: Items = {};
  for (const k of Object.keys(r.inputs) as ItemKind[]) need[k] = (need[k] ?? 0) + (r.inputs[k] ?? 0);
  for (const k of Object.keys(r.fuel) as ItemKind[]) need[k] = (need[k] ?? 0) + (r.fuel[k] ?? 0);
  const lacks: string[] = [];
  for (const k of Object.keys(need) as ItemKind[]) {
    const have = b.store.items[k] ?? 0;
    if (have < (need[k] ?? 0)) lacks.push(`${(need[k] ?? 0) - have} more ${label(k)}`);
  }
  if (lacks.length) out.push(`needs ${lacks.join(' and ')} brought in`);
  if (r.tool?.required) {
    const onRack = (b.store.items[r.tool.kind] ?? 0) > 0;
    out.push(onRack ? `a ${r.tool.kind} is on the rack, but only one person can use it at a time` : `needs a ${r.tool.kind === 'pick' ? 'pickaxe' : r.tool.kind} (none on the rack: whoever works here has to bring one)`);
  }
  if (r.fromDeposit) {
    const dep = ops.depositId ? world.byId.get(ops.depositId) : undefined;
    if (!dep || dep.ent !== 'source') out.push('no outcrop to cut');
    else if (dep.amount < r.fromDeposit.n) out.push('the outcrop is worked out');
  }
  let outW = 0;
  for (const k of Object.keys(r.outputs) as ItemKind[]) outW += (r.outputs[k] ?? 0) * 1.5;
  if (outW > 0 && b.store.cap - weightOf(b.store.items) < outW) out.push('no room in the store for the product');
  return out;
}

function accessText(world: World, b: Building): string {
  const ops = b.ops;
  if (b.hhId === 0) return b.type === 'granary' ? 'Open to everyone; each household keeps its own share in the bins.' : 'Open to everyone.';
  const who = hhName(world, b.hhId);
  const builders = ops ? Object.keys(ops.builders).filter((k) => (ops.builders[Number(k)] ?? 0) >= 0.2 && Number(k) !== b.hhId).map((k) => hhName(world, Number(k))) : [];
  return `Belongs to the ${who}.${builders.length ? ` Also open to ${builders.join(', ')} (they did a fifth or more of the building).` : ''} Others may use it if one of the household counts them a friend; what they make is theirs.`;
}

export function describeFacility(world: World, b: Building): Section[] {
  const ops = opsOf(b);
  if (!ops) return [];
  const sections: Section[] = [];
  const def = BUILD_DEF[b.type];
  const recs = recipesAt(b.type);
  sections.push({ title: 'What it is for', notes: [def.blurb], rows: recs.map((r) => [r.doing, `${itemsText({ ...r.inputs, ...r.fuel })} → ${itemsText({ ...r.outputs, ...(r.fromDeposit ? { [r.fromDeposit.item]: r.fromDeposit.n } : {}) }) || (r.cartOut ? 'a handcart' : r.toolOut ? `an ${r.toolOut.tier ? 'iron ' : ''}${TOOL_DEFS[r.toolOut.kind].label}` : 'nothing')} · ${Math.round(r.work / 10)}s of work${r.burn ? ` + ${Math.round(r.burn / 10)}s burning` : ''}`] as [string, string]) });
  sections.push({ title: 'Who may use it', notes: [accessText(world, b)] });

  const job = ops.job;
  if (job) {
    const r = recipeOf(job);
    const rows: [string, string][] = [
      ['Making', r.label],
      ['Ordered by', job.client ? nameOf(world, job.client) : 'nobody in particular'],
      ['For', job.purpose || '—'],
      ['Stage', job.phase === 'work' ? 'being worked' : job.phase === 'burn' ? `burning (done ${inFuture(world, world.tick + job.burnLeft)})` : 'finished, waiting for room in the store'],
    ];
    const here = Object.keys(ops.present).filter((k) => world.tick - ops.present[Number(k)] < 25).map((k) => nameOf(world, Number(k)));
    rows.push(['Working now', here.length ? here.join(', ') : 'nobody at the moment']);
    const bars: Bar[] = [{ label: 'Work done', value: Math.min(job.progress, job.total), max: job.total, tone: 'ok' }];
    if (job.burnTotal > 0) bars.push({ label: 'Fire', value: job.burnTotal - Math.max(0, job.burnLeft), max: job.burnTotal, tone: 'warm' });
    const notes: string[] = [];
    if (job.blocked) notes.push(job.blocked);
    const contrib = Object.keys(job.workers).map((k) => `${nameOf(world, Number(k))} ${Math.round(job.workers[Number(k)] / 10)}s`);
    if (contrib.length) notes.push(`Worked on by: ${contrib.join(', ')}.`);
    if (Object.keys(job.held).length) notes.push(`Inside the batch: ${itemsText(job.held)}.`);
    sections.push({ title: 'Under way', rows, bars, notes });
  } else {
    const blockers = recs.map((r) => ({ r, why: recipeBlockers(world, b, r) })).filter((x) => x.why.length);
    const notes: string[] = [];
    if (!blockers.length) notes.push('Nothing is stopping a batch from starting: it is simply waiting for someone who wants what it makes.');
    for (const x of blockers) notes.push(`${x.r.doing}: ${x.why.join('; ')}.`);
    if (ops.lastBlocker) notes.push(`Last time someone tried: ${ops.lastBlocker}.`);
    sections.push({ title: 'Idle — what is stopping it', notes });
  }

  const stock: ItemRow[] = [];
  for (const k of Object.keys(b.store.items) as ItemKind[]) if ((b.store.items[k] ?? 0) > 0) stock.push({ kind: k, n: b.store.items[k] ?? 0 });
  const stockNotes: string[] = [`${Math.round(weightOf(b.store.items))}/${b.store.cap} of the store used.`];
  for (const e of ops.earmarks) if (e.until > world.tick && e.n > 0) stockNotes.push(`${e.n} ${label(e.item)} ${e.kind === 'out' ? 'set aside for' : 'brought by'} ${nameOf(world, e.owner)} (${e.reason || '—'}), held ${inFuture(world, e.until)}.`);
  if (b.type === 'granary') {
    for (const hid of Object.keys(ops.shares)) {
      const sh = ops.shares[Number(hid)];
      if (Object.keys(sh).length) stockNotes.push(`${hhName(world, Number(hid))}’s share: ${itemsText(sh)}.`);
    }
    const tended = world.tick - Math.max(ops.tended, b.builtTick);
    stockNotes.push(tended < GRANARY_TEND_EVERY ? `Bins tended ${ago(world, Math.max(ops.tended, b.builtTick))}: grain keeps five times longer than in an ordinary store.` : `The bins have not been tended for ${Math.round(tended / 2400)} days: grain is spoiling faster than in an ordinary store.`);
  }
  sections.push({ title: 'Stock', items: stock, notes: stockNotes });

  const totals: [string, string][] = [['Batches finished', String(ops.batches)]];
  if (Object.keys(ops.produced).length) totals.push(['Made so far', itemsText(ops.produced)]);
  if (Object.keys(ops.consumed).length) totals.push(['Used so far', itemsText(ops.consumed)]);
  for (const k of Object.keys(ops.wasted)) totals.push([`Wasted (${k})`, String(ops.wasted[k])]);
  sections.push({ title: 'Output', rows: totals });

  const people = Object.keys(ops.contributions)
    .map((k) => ({ id: Number(k), n: ops.contributions[Number(k)] }))
    .sort((a, c) => c.n - a.n)
    .slice(0, 6);
  if (people.length) sections.push({ title: 'Hands that have worked here', rows: people.map((x) => [nameOf(world, x.id), `${Math.round(x.n / 10)}s of work`] as [string, string]) });
  if (b.type === 'hall') {
    const mine = world.meals.filter((m) => m.placeId === b.id).slice(-4).reverse();
    sections.push({
      title: 'Meals held here',
      rows: mine.map((m) => [`${nameOf(world, m.host)}’s meal ${m.status === 'done' || m.status === 'cancelled' ? ago(world, m.at) : inFuture(world, m.at)}`, m.status === 'done' ? `${m.ate.length} ate together` : m.status === 'cancelled' ? `called off: ${m.end}` : m.status] as [string, string]),
      notes: mine.length ? [] : ['No one has eaten here yet.'],
    });
  }
  if (b.type === 'quarry' && ops.depositId) {
    const dep = world.byId.get(ops.depositId);
    if (dep && dep.ent === 'source') sections.push({ title: 'The outcrop', bars: [{ label: 'Stone left', value: dep.amount, max: dep.max, tone: 'mat' }] });
  }
  return sections;
}

// ───────────────────────── building sites ─────────────────────────
export function describeSiteSections(world: World, s: Site): Section[] {
  const sections: Section[] = [];
  const rows: [string, string][] = [];
  if (s.upgradeOf) {
    const old = world.byId.get(s.upgradeOf);
    rows.push(['Rebuilding', old && old.ent === 'building' ? `the ${BUILD_DEF[old.type].label} as a ${BUILD_DEF[s.type].label} (it is still lived in)` : 'a home']);
  }
  rows.push(['Why', BUILD_DEF[s.type].blurb]);
  sections.push({ title: 'The project', rows });
  const missing: string[] = [];
  const have: ItemRow[] = [];
  for (const k of Object.keys(s.required) as ItemKind[]) {
    const need = s.required[k] ?? 0;
    const got = (s.delivered[k] ?? 0) + (s.used[k] ?? 0);
    if (s.delivered[k]) have.push({ kind: k, n: s.delivered[k] ?? 0 });
    if (got < need) missing.push(`${need - got} ${label(k)}`);
  }
  const notes: string[] = [];
  if (missing.length) notes.push(`Still needed: ${missing.join(', ')}. Work stops short of the part that needs them.`);
  else notes.push('All the materials are on site.');
  if (world.tick - s.lastWorkTick > 800) notes.push(`Nobody has worked here for ${Math.round((world.tick - s.lastWorkTick) / 2400 * 10) / 10} days; it is given up after a while.`);
  sections.push({
    title: 'Materials',
    bars: Object.keys(s.required).map((k) => ({ label: `${k} supplied`, value: (s.delivered[k as ItemKind] ?? 0) + (s.used[k as ItemKind] ?? 0), max: s.required[k as ItemKind] ?? 0, tone: 'mat' })),
    items: have,
    notes,
  });
  sections.push({ title: 'Work', bars: [{ label: 'Built', value: s.work, max: s.workTotal, tone: 'ok' }] });
  const c = s.contrib ?? {};
  const keys = Object.keys(c).filter((k) => c[Number(k)] > 0.5);
  if (keys.length) {
    const total = keys.reduce((n, k) => n + c[Number(k)], 0);
    sections.push({ title: 'Who has put something in', rows: keys.sort((a, b) => c[Number(b)] - c[Number(a)]).map((k) => [hhName(world, Number(k)), `${Math.round((c[Number(k)] / total) * 100)}% of the effort`] as [string, string]) });
  }
  return sections;
}

// ───────────────────────── carts ─────────────────────────
export function describeCartSections(world: World, c: Cart): Section[] {
  return [
    {
      title: 'The cart',
      rows: [
        ['Belongs to', hhName(world, c.ownerHh)],
        ['Pulled by', c.puller ? nameOf(world, c.puller) : 'nobody (parked)'],
      ],
      bars: [
        { label: 'Load', value: weightOf(c.load), max: c.cap, tone: 'mat' },
        { label: 'Wear', value: c.wear, max: 100, tone: c.wear > 70 ? 'warn' : 'ok' },
      ],
      items: (Object.keys(c.load) as ItemKind[]).filter((k) => (c.load[k] ?? 0) > 0).map((k) => ({ kind: k, n: c.load[k] ?? 0 })),
      notes: ['Wheels need open ground: forest, stony ground and water are barred to a cart.'],
    },
  ];
}

// ───────────────────────── people ─────────────────────────
export interface ToolView {
  id: number;
  kind: string;
  label: string;
  tier: number;
  wear: number;
  loan: string | null;
}

export function toolViews(world: World, p: Person): ToolView[] {
  return toolsHeldBy(world, p.id).map((t) => ({
    id: t.id,
    kind: t.kind,
    label: `${t.tier === 1 ? 'iron ' : ''}${TOOL_DEFS[t.kind].label}`,
    tier: t.tier,
    wear: Math.round(t.wear),
    loan: t.loan ? (t.loan.lender === 0 ? `taken from the shared rack, due back ${inFuture(world, t.loan.due)}` : `borrowed from ${nameOf(world, t.loan.lender)}, due back ${inFuture(world, t.loan.due)}`) : t.ownerHh !== p.hhId ? `belongs to the ${hhName(world, t.ownerHh)}` : null,
  }));
}

export interface CommitmentView {
  id: number;
  text: string;
  status: string;
  detail: string;
  due: string;
}

function commitmentText(world: World, c: Commitment): string {
  const to = nameOf(world, c.to);
  switch (c.kind) {
    case 'deliver':
      return `Bring ${c.amount} ${c.item ?? 'goods'} to ${to}`;
    case 'haul':
      return `Haul ${c.amount} ${c.item ?? 'goods'} to the ${(world.byId.get(c.siteId) as { type?: string } | undefined)?.type?.replace('_', ' ') ?? 'building'} site, as promised to ${to}`;
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

export function commitmentViews(world: World, p: Person): CommitmentView[] {
  const active = p.commitments.filter((c) => c.status === 'active');
  const ended = p.commitments.filter((c) => c.status !== 'active').slice(-5).reverse();
  return [...active, ...ended].map((c) => {
    const parts: string[] = [];
    if (c.kind === 'deliver' || c.kind === 'haul') parts.push(`${c.delivered ?? 0} of ${c.amount} delivered`);
    if (c.kind === 'help_build' || c.kind === 'work') parts.push(`${Math.min(100, Math.round(((c.contrib ?? 0) / 40) * 100))}% of a fair share of work done`);
    if (c.reason) parts.push(c.reason);
    if (c.status === 'active' && c.blocked && c.blockedAt && world.tick - c.blockedAt < 600) parts.push(`held up: ${c.blocked}`);
    if (c.status === 'active' && c.setAside && world.tick - c.setAside < 600) parts.push('put aside while they see to their own needs');
    return { id: c.id, text: commitmentText(world, c), status: c.status, detail: parts.join(' · '), due: c.status === 'active' ? inFuture(world, c.deadline + (c.grace ?? 0)) : ago(world, c.made) };
  });
}

export interface InteractionView {
  partner: string;
  purpose: string;
  step: string;
  outcome: string;
  when: string;
}

const PURPOSE_TEXT: Record<string, string> = {
  chat: 'a chat',
  request: 'asking for something',
  ask_info: 'asking where something can be found',
  warn: 'a warning',
  offer: 'an offer of help',
  apologize: 'making peace',
  mediate: 'talking someone round after a quarrel',
  teach: 'showing someone how to do something',
  recruit: 'asking for help with a building',
  propose: 'a proposal',
  trade: 'a swap',
  invite: 'an invitation to eat together',
  check_in: 'looking in on someone',
  lend: 'lending a tool',
  report: 'passing on news',
  argument: 'an argument',
};

/** the same purposes as they read when the other person was the one who came over: "<name> came to <name> …" */
const PURPOSE_THEIRS: Record<string, string> = {
  chat: 'for a chat',
  request: 'with a request',
  ask_info: 'to ask where something can be found',
  warn: 'with a warning',
  offer: 'with an offer of help',
  apologize: 'to make peace',
  mediate: 'to talk them round after a quarrel',
  teach: 'to show them how to do something',
  recruit: 'to ask for help with a building',
  propose: 'with a proposal',
  trade: 'to propose a swap',
  invite: 'with an invitation to eat together',
  check_in: 'to look in',
  lend: 'about lending a tool',
  report: 'with news',
  argument: 'to have it out',
};

const STEP = ['greeting', 'saying what it is about', 'the answer', 'trading news', 'saying goodbye'];

/** The conversation or quarrel this person is in now, and the last one that ended, kept strictly apart. */
export function interactionViews(world: World, p: Person): { current: InteractionView | null; previous: InteractionView | null } {
  let current: InteractionView | null = null;
  const c = world.conversations.find((x) => x.a === p.id || x.b === p.id);
  if (c) {
    const other = c.a === p.id ? c.b : c.a;
    const mine = c.a === p.id;
    const req = world.requests.find((r) => r.id === c.requestId);
    current = {
      partner: nameOf(world, other),
      purpose: mine ? PURPOSE_TEXT[c.purpose] ?? c.purpose : `${nameOf(world, other)} came over ${PURPOSE_THEIRS[c.purpose] ?? 'to talk'}`,
      step: STEP[Math.min(c.phase, STEP.length - 1)],
      outcome: req ? (req.status === 'pending' ? 'not answered yet' : req.outcome || req.status) : 'under way',
      when: 'now',
    };
  } else if (p.activity && p.activity.kind === 'argue') {
    current = { partner: nameOf(world, p.activity.data.other as number), purpose: PURPOSE_TEXT.argument, step: 'having it out', outcome: 'under way', when: 'now' };
  }
  const li = p.lastInteraction;
  const previous = li && !(current && li.partner === (c ? (c.a === p.id ? c.b : c.a) : 0) && world.tick - li.tick < 5)
    ? { partner: nameOf(world, li.partner), purpose: li.role === 'asked' ? PURPOSE_TEXT[li.purpose] ?? li.purpose : `${nameOf(world, li.partner)} came to ${p.name} ${PURPOSE_THEIRS[li.purpose] ?? 'to talk'}`, step: 'over', outcome: li.detail ? `${li.outcome} (${li.detail})` : li.outcome, when: ago(world, li.tick) }
    : null;
  return { current, previous };
}

export interface MealView {
  place: string;
  host: string;
  status: string;
  at: string;
  guests: { name: string; state: string }[];
  table: string;
  end: string;
}

export function mealView(world: World, m: Meal): MealView {
  const guests = m.invited.map((id) => ({
    name: nameOf(world, id),
    state: m.ate.includes(id) ? 'ate' : m.arrived.includes(id) ? 'there' : m.accepted.includes(id) ? 'coming' : (m.missed[id] ?? 'asked'),
  }));
  return { place: m.placeName, host: nameOf(world, m.host), status: m.status, at: m.status === 'inviting' || m.status === 'gathering' ? inFuture(world, m.at) : ago(world, m.at), guests, table: itemsText(m.table), end: m.end };
}

export function mealViews(world: World, p: Person): { current: MealView | null; previous: MealView | null } {
  const cur = mealOf(world, p);
  const prev = previousMealOf(world, p);
  return { current: cur ? mealView(world, cur) : null, previous: prev ? mealView(world, prev) : null };
}

export interface GrievanceView {
  other: string;
  cause: string;
  detail: string;
  weight: number;
  apologies: number;
  since: string;
}

export function grievanceViews(world: World, p: Person): GrievanceView[] {
  const out: GrievanceView[] = [];
  for (const k of Object.keys(p.relations)) {
    const r = p.relations[Number(k)];
    if (!r.grievance) continue;
    out.push({ other: nameOf(world, Number(k)), cause: r.grievance.cause.replace('_', ' '), detail: r.grievance.detail, weight: Math.round(r.grievance.weight), apologies: r.grievance.apologies, since: ago(world, r.grievance.since) });
  }
  return out;
}

export function concernViews(world: World, p: Person): { about: string; kind: string; seen: string; source: string }[] {
  return p.concerns.map((c) => ({ about: nameOf(world, c.about), kind: c.kind === 'missing' ? 'has not been seen for a while' : `looked ${c.kind}`, seen: ago(world, c.seen), source: c.src === 'seen' ? 'saw it themself' : `told by ${nameOf(world, c.from)}` }));
}

export function learnedViews(world: World, p: Person): { skill: string; from: string; when: string; gain: number; how: string }[] {
  return p.learned
    .slice()
    .reverse()
    .map((l) => ({ skill: SKILL_WORD[l.skill], from: nameOf(world, l.from), when: ago(world, l.tick), gain: Math.round(l.gain * 1000) / 1000, how: l.how === 'shown' ? 'showed them' : 'worked beside them' }));
}

export function illnessView(world: World, p: Person): { how: string; since: string; careful: string } | null {
  const i = p.illness;
  if (!i) return null;
  return {
    how: i.severity >= 0.67 ? 'seriously ill' : i.severity >= 0.45 ? 'ill' : 'under the weather',
    since: ago(world, i.since),
    careful: i.care > 0 ? `looked after ${i.care} time${i.care === 1 ? '' : 's'}` : 'nobody has brought them anything yet',
  };
}

export function griefViews(world: World, p: Person): { about: string; weight: number; since: string; source: string; visited: string }[] {
  return p.grief.map((g) => ({
    about: g.name,
    weight: Math.round(g.weight),
    since: ago(world, g.since),
    source: g.src === 'saw' ? 'was there when it happened' : g.src === 'found' ? 'came upon the grave' : `told by ${nameOf(world, g.from)}`,
    visited: g.visited < 0 ? 'has not been to the grave' : `last at the grave ${ago(world, g.visited)}`,
  }));
}

export function accountViews(world: World, p: Person): { about: string; what: string; seen: string; source: string }[] {
  return p.accounts.map((a) => ({
    about: nameOf(world, a.about),
    what: `${accountWords(a.kind)} (${a.kind === 'quarreled' ? 'with' : 'to'} ${a.toward === p.id ? 'them' : nameOf(world, a.toward)})`,
    seen: ago(world, a.at),
    source: a.src === 'seen' ? (a.toward === p.id ? 'it happened to them' : 'saw it themself') : `told by ${nameOf(world, a.from)}${a.hops > 1 ? ` (passed on ${a.hops} times)` : ''}`,
  }));
}

void RECIPES;
void usableUnits;
