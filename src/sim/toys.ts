// Rules 215 (the childhood stream): toys. Phase 4 of docs/CHILDHOOD_AND_PLAY_PLAN.md, on the owner's instruction of 12 November
// 2026 ("do toys then stage 5").
//
// A toy is a real thing: a new kind of owned equipment ('toy'), a Tool record with its maker, the household that owns it and whoever
// is holding it, carried in a pack, passed on with a household's goods when somebody dies, kept or lost like any other tool. Three
// separately switched parts:
//
//   make  A grown person (twelve and over) with nothing pressing and not tired, by day or after dark, holding no toy, whose household
//         has a child under twelve without one, carves a toy: the ordinary craft step (act_build.ts), TOY_WOOD wood and TOY_WORK
//         ticks of work. The wood is a piece of their own not spoken for by a plan (carved at home, a storehouse or the fire), or,
//         with none in hand, a piece from their own home store (carved at home). No more than one every MAKE_GAP for each maker.
//   give  Somebody twelve and over holding a toy hands it to a child under twelve of their household who has none and is within
//         GIVE_REACH: the ordinary give step (social.ts, mode 'toy'), the record moving with the count. The child remembers it (a
//         little more liking and trust for the giver, a note of who it was) and is glad of it; the giver is glad too.
//   play  A child holding a toy, with nothing pressing, by day and with no danger about, plays with it near home once a day: the
//         ordinary spare-time activity with a name, a set length they keep to unless something presses, and a lift of mood when
//         it is finished. The younger the child the
//         more a toy means (toyInterest: full to the age of two, falling to a fifth at eleven, on the owner's instruction): the
//         lift, the pull to play, the gladness at being given one, and who a grown person carves for first. It counts as having
//         been at home lately, as building with sticks does (play.ts).
//
// What a toy is called (a stick doll, a ball, a carved animal) follows from its record, so nothing more is saved. A toy is never a
// working tool: no task asks for one, it does not wear, and nobody wants one for work. Not in this version: a child making their own
// toy, a toy shared between two children, toys bought and sold.
//
// Rich worlds at rules 215 and later only; rules 214 and earlier, authored worlds and a part switched off keep the old behaviour.
import { newActivity, standSpotFor } from './activities';
import { DAY } from './constants';
import { transfer } from './economy';
import { addEvent } from './events';
import { freeOf } from './intent';
import { noteHaunt } from './leisure';
import { think } from './mood';
import { Scorer, addOption, beliefsByKind, eta, pen } from './optutil';
import type { Ctx } from './optutil';
import { ageYears, carryCap, stageOf } from './people';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import { toolsHeldBy } from './toolreg';
import type { Activity, Person, Tool, World } from './types';
import { hyp } from './util';

const on = { make: true, give: true, play: true };
export type ToyPart = keyof typeof on;
export const TOY_PARTS = Object.keys(on) as ToyPart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const toyPartOn = (part: ToyPart): boolean => on[part];
export function setToys(enabled: boolean, part?: ToyPart): void {
  if (part) on[part] = enabled;
  else for (const k of TOY_PARTS) on[k] = enabled;
}
export const hasToys = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 215);
const partOn = (w: World, part: ToyPart): boolean => on[part] && hasToys(w);

/** what a toy costs to make: a piece of wood and a little work */
export const TOY_WOOD = 1;
export const TOY_WORK = 40;
/** a maker carves no more than one toy in this long */
export const MAKE_GAP = 2 * DAY;
/** how near a child must be for a toy to be handed over */
export const GIVE_REACH = 14;
/** how long a child plays with a toy, and the most it lifts their mood by (a toddler's; less as a child grows, see toyInterest) */
export const TOY_TICKS = 100;
export const TOY_LIFT = 6;
export const TOY_BASE = 13;
/** what carving one is worth to a grown person, before the walk */
export const MAKE_BASE = 26;

const NAMES = ['a stick doll', 'a ball', 'a carved animal'] as const;
/** What this toy is: fixed by its record, so nothing more is saved. */
export const toyName = (t: Tool): string => NAMES[t.id % NAMES.length];

/** The toy this person is holding, if any (the first of them by id). */
export function toyHeldBy(w: World, p: Person): Tool | null {
  if ((p.inv.toy ?? 0) <= 0) return null;
  return toolsHeldBy(w, p.id, 'toy').find((t) => !t.loan) ?? null;
}
const childWithoutToy = (w: World, m: Person): boolean => m.alive && stageOf(w, m) === 'child' && (m.inv.toy ?? 0) <= 0;

/** How much a child still cares for a toy (owner, 12 November 2026: "a higher satisfaction level given to a younger person and
 *  gradually lose interest as they get older"): 1 up to the age of two, falling evenly to 0.2 at eleven; nothing from twelve. */
export function toyInterest(w: World, p: Person): number {
  const age = ageYears(w, p);
  if (age >= 12) return 0;
  return Math.max(0.2, Math.min(1, (12 - age) / 10));
}
/** The mood a toy gives this child, now: TOY_LIFT for a toddler, less as they grow. */
export const toyLift = (w: World, p: Person): number => Math.round(TOY_LIFT * toyInterest(w, p) * 10) / 10;

/** A grown person carves a toy for a child of their household. Derivation is pure; the activity is built only if chosen. */
function makeOption(ctx: Ctx): void {
  const { world: w, p } = ctx;
  if (!partOn(w, 'make') || ctx.stage === 'child' || ctx.critical || ctx.dangers.length) return;
  // after dark too, when the day's work is put down: carving by the fire is an evening thing; not when tired
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 40) return;
  if ((p.inv.toy ?? 0) > 0 || (p.cooldowns.toymade ?? 0) > w.tick) return;
  // a toy already carved and waiting in a grown-up's pack is that child's: carve only for children no toy is waiting for
  const without = ctx.members.filter((m) => m.id !== p.id && childWithoutToy(w, m));
  const waiting = ctx.members.filter((m) => m.alive && stageOf(w, m) !== 'child' && (m.inv.toy ?? 0) > 0).reduce((n, m) => n + (m.inv.toy ?? 0), 0);
  if (without.length <= waiting) return;
  // the youngest first: they care for a toy the most
  const child = without.reduce((a, b) => (ageYears(w, b) < ageYears(w, a) ? b : a));
  // the wood: a piece of their own not spoken for by a plan, carved where a hand-made tool is made (home, a storehouse, the fire);
  // or, with none in hand, a piece from their own home store, carved at home
  let best: { id: number; x: number; y: number } | null = null;
  let fromStore = false;
  if (freeOf(p, 'wood') >= TOY_WOOD) {
    let bd = 1e9;
    for (const b of beliefsByKind(p, ['building'])) {
      if (!(b.hh === p.hhId || b.btype === 'storehouse' || b.btype === 'fire')) continue;
      const d = hyp(b.x - p.x, b.y - p.y);
      if (d < bd) { bd = d; best = { id: b.id, x: b.x, y: b.y }; }
    }
  } else if (ctx.home && (ctx.home.store.items.wood ?? 0) >= TOY_WOOD) {
    best = { id: ctx.home.id, x: ctx.home.x, y: ctx.home.y };
    fromStore = true;
  }
  if (!best) return;
  const target = best;
  const walk = eta(ctx, target.x, target.y);
  const kin = p.relations[child.id]?.kin;
  const sc = new Scorer().add(`${child.name} has nothing to play with`, (MAKE_BASE + 4 * p.traits.diligence) * (0.6 + 0.4 * toyInterest(w, child))).add('walking', -pen(walk));
  if (kin === 'child' || kin === 'sibling') sc.add('family', 6);
  if (sc.total < 8) return;
  addOption(ctx, {
    kind: 'craft', label: `Carve a toy for ${child.name}`, goal: `to give ${child.name} something to play with`, need: null, util: sc.total, parts: sc.parts,
    eta: walk + TOY_WORK, key: 'craft:toy', targetId: target.id, tag: 'craft',
    make: () => {
      // a place to stand beside the building, as for any hand-made tool
      const e = w.byId.get(target.id);
      const spot = e ? standSpotFor(w, p, e) : null;
      if (!spot) return null;
      return newActivity(w, p, {
        kind: 'craft', label: `Carving a toy for ${child.name}`, goal: `to give ${child.name} something to play with`, targetId: target.id, targetType: 'building',
        tx: target.x, ty: target.y, spotX: spot.x, spotY: spot.y, utility: sc.total, minCommit: 40, maxTicks: 500, data: { tool: 'toy', toyFor: child.id, ...(fromStore ? { toyWoodFromStore: true } : {}) },
      });
    },
  });
}

/** The craft step begins a toy: if its wood is to come from the home store, take it now. Returns why not, or null. */
export function takeToyWood(w: World, p: Person, a: Activity): string | null {
  if (!a.data.toyWoodFromStore || (p.inv.wood ?? 0) >= TOY_WOOD) return null;
  const b = w.byId.get(a.targetId);
  if (!b || b.ent !== 'building' || b.hhId !== p.hhId) return 'no wood at home';
  const m = transfer(w, b.store.items, p.inv, carryCap(w, p), 'wood', TOY_WOOD, 'building:' + b.id, 'person:' + p.id, 'toy: wood from the home store');
  return m >= TOY_WOOD ? null : 'no wood at home';
}

/** A toy is carved: the maker waits a while before carving another. Called by the craft step when it finishes a toy. */
export function noteToyMade(w: World, p: Person): void {
  p.cooldowns.toymade = w.tick + MAKE_GAP;
}

/** Somebody holding a toy hands it to a child of their household who has none. */
function giveOption(ctx: Ctx): void {
  const { world: w, p } = ctx;
  if (!partOn(w, 'give') || ctx.stage === 'child' || ctx.critical || ctx.dangers.length) return;
  const toy = toyHeldBy(w, p);
  if (!toy) return;
  // a child of the household they can see now, near enough to walk over to
  let child: Person | null = null;
  let at = { x: 0, y: 0 };
  let bd = GIVE_REACH;
  for (const m of ctx.members) {
    if (m.id === p.id || !childWithoutToy(w, m)) continue;
    const seen = ctx.seenPersons.find((s) => s.id === m.id);
    if (!seen) continue;
    // the youngest child in reach first, then the nearest
    const d = hyp(seen.x - p.x, seen.y - p.y);
    if (d <= GIVE_REACH && (!child || ageYears(w, m) < ageYears(w, child) || (ageYears(w, m) === ageYears(w, child) && d < bd))) { bd = d; child = m; at = { x: seen.x, y: seen.y }; }
  }
  if (!child) return;
  const d = child;
  const walk = eta(ctx, at.x, at.y);
  const name = toyName(toy);
  const sc = new Scorer().add(`has ${name} for ${d.name}`, MAKE_BASE + 6).add('walking', -pen(walk));
  addOption(ctx, {
    kind: 'give', label: `Give ${d.name} ${name}`, goal: `to give ${d.name} something to play with`, need: null, util: sc.total, parts: sc.parts,
    eta: walk + 20, key: `give:toy:${d.id}`, targetId: d.id, tag: 'gift',
    make: () => newActivity(w, p, {
      kind: 'give', label: `Giving ${d.name} ${name}`, goal: `to give ${d.name} something to play with`, targetId: d.id, targetType: 'person',
      tx: at.x, ty: at.y, spotX: at.x, spotY: at.y, utility: sc.total, minCommit: 30, maxTicks: 400, data: { items: { toy: 1 }, mode: 'toy', toolId: toy.id },
    }),
  });
}

/** The give step's hand-over of a toy (mode 'toy'): the record moves with the count, and both remember it. */
export function giveToy(w: World, p: Person, t: Person, a: Activity): boolean {
  const toy = toolsHeldBy(w, p.id, 'toy').find((x) => x.id === (a.data.toolId as number) && !x.loan);
  if (!toy || (t.inv.toy ?? 0) > 0) return false;
  const moved = transfer(w, p.inv, t.inv, carryCap(w, t), 'toy', 1, 'person:' + p.id, 'person:' + t.id, 'gift: toy', toy.id);
  if (moved <= 0) return false;
  toy.ownerHh = t.hhId;
  const name = toyName(toy);
  const maker = toy.maker === p.id ? 'made' : 'gave';
  adjustRel(t, p.id, w.tick, { aff: 4, trust: 2, note: `${p.name} ${maker} me ${name}` });
  adjustRel(p, t.id, w.tick, { aff: 1 });
  think(w, t, 'toy', toyLift(w, t), DAY, `${name} from ${p.name}`);
  think(w, p, 'gave_toy', 2, DAY / 2, `gave ${t.name} ${name}`);
  addEvent(w, 'social', `${p.name} gave ${t.name} ${name}.`, [p.id, t.id], t.x, t.y);
  return true;
}

/** A child holding a toy plays with it near home, once a day. */
function playOption(ctx: Ctx): void {
  const { world: w, p } = ctx;
  if (!partOn(w, 'play') || ctx.stage !== 'child' || ctx.critical || ctx.night || ctx.dangers.length) return;
  if (Math.min(p.needs.hunger, p.needs.thirst, p.needs.energy) <= 42) return;
  if ((p.cooldowns['play:toy'] ?? 0) > w.tick) return;
  const toy = toyHeldBy(w, p);
  if (!toy) return;
  const x = ctx.home ? ctx.home.doorX + 0.5 : p.x, y = ctx.home ? ctx.home.doorY + 1.5 : p.y;
  const walk = eta(ctx, x, y);
  const name = toyName(toy);
  const from = w.byId.get(toy.maker);
  const whose = from && from.ent === 'person' && from.id !== p.id ? ` ${from.name} made` : '';
  // a toddler reaches for a toy far more readily than an eleven-year-old
  const sc = new Scorer().add('something of their own to play with', (TOY_BASE + 4 * p.traits.curiosity) * (0.4 + 0.8 * toyInterest(w, p))).add('walking', -pen(walk) * 0.5);
  addOption(ctx, {
    kind: 'wander', label: `Play with ${name}${whose}`, goal: 'to play for a while', need: null, util: sc.total, parts: sc.parts, eta: walk + TOY_TICKS,
    key: 'play:toy', targetId: 0, tag: 'play',
    make: () => {
      const a = newActivity(w, p, { kind: 'wander', label: `Playing with ${name}`, goal: 'to play for a while', spotX: x, spotY: y, tx: x, ty: y, utility: sc.total, minCommit: TOY_TICKS, maxTicks: 400 });
      if (a) a.data.play = 'toy';
      return a;
    },
  });
}

export const isToyPlay = (k: unknown): boolean => k === 'toy';

/** A child finished playing with their toy: had for today, and their mood lifts. */
export function finishToyPlay(w: World, p: Person): void {
  p.cooldowns['play:toy'] = w.tick + DAY;
  think(w, p, 'play:toy', toyLift(w, p), DAY / 2, 'an hour with a toy');
  noteHaunt(w, p, 'home');
}

/** Everything rules 215 offers, in spare time: make, give, play. */
export function toyOptions(ctx: Ctx): void {
  if (!hasToys(ctx.world)) return;
  makeOption(ctx);
  giveOption(ctx);
  playOption(ctx);
}
