// A trade: the one kind of work a person comes to think of as theirs. Rich worlds only; an authored world has no trades at all.
//
// Stage 3's first piece (learning.ts) asks "what has paid ME", and the answer turned out to be the same for everybody: the whole
// village learns that berries pay and goes picking berries. That is learning without division of labour. A trade is the other
// half: not "what pays" but "what pays ME MORE THAN IT PAYS THE PEOPLE AROUND ME", which is comparative advantage, and it is what
// makes a settlement of a hundred people something other than a hundred copies of one person.
//
// What a person uses to settle on one (and nothing else):
//   * their own skills, measured against their OWN average, so someone able at everything does not claim every trade - what
//     matters is the thing they are comparatively best at;
//   * what they can see other people doing right now (`p.seen`, whose `work` says what kind of work a watcher can plainly see
//     somebody is at), so a trade half the village is already at is worth less than an empty one;
//   * for gathering-aligned trades only, their own estimate of gathering returns (learning.ts `p.payoff`), which can make them give
//     up a trade that has paid badly. Other trades currently have no payoff estimate and can change only through crowding or skill.
// No list of the world's jobs, nobody else's skills, no central allocation. Two neighbours may pick the same trade; nothing
// prevents it, and the crowding term makes it less likely.
//
// What a trade IS NOT: it is not a job, a role or an assignment. It tilts the matching work options by TRADE_NUDGE and no more -
// the same bound as a private plan's step and the payoff estimate - so hunger, thirst, cold and a wolf still win every time, and
// the engine still generates and ranks every option. Somebody whose trade is the kiln still fetches water when they are thirsty.
import { DAY } from './constants';
import { RECIPES } from './recipes';
import { SOURCE_SKILL } from './constants';
import { isRich } from './mood';
import { repeatedDemand,pruneDemand,DEMAND_BONUS,hasLocalDemand } from './local_demand';
import type { Ctx, Option } from './optutil';
import type { ActivityKind, Belief, BuildingType, Person, SkillKey, SourceType, World } from './types';

/**
 * A switch beside the world, like the mood, night-plan and learning switches: module-level, never saved, never hashed, on unless
 * the lab turns it off. `rich-no-trades` is the counterfactual that holds everything else about a rich world steady.
 */
let trades = true;
export function setTrades(on: boolean): void {
  trades = on;
}
export const tradesOn = (): boolean => trades;

/** how much a trade may tilt the work that is it, either way. The same bound as a plan's step and the payoff estimate. */
export const TRADE_NUDGE = 6;
/** how often a person reconsiders their trade (half a day; the first review happens as soon as they think) */
export const TRADE_REVIEW = DAY / 2;
/** how much better than their own average at a thing somebody has to be, after crowding, before they call it their trade */
const ADOPT_MIN = 4;
/** how much better a different trade has to look before they change: a trade is meant to be sticky, not re-chosen every review */
const SWITCH_MARGIN = 6;
/** a trade more than this share of the people visibly working around them share is too crowded to be worth keeping */
const CROWDED_SHARE = 0.5;
/**
 * What a crowd is worth against being good at something. The skill term below spans about 45 points across the whole spread of
 * starting skills, so a trade that every single person in sight is already at has to cost about that much to be able to move
 * somebody off it - otherwise "fewer people are doing it" would never decide anything and a trade would be skill alone.
 */
const CROWD_WEIGHT = 45;
/** what a trade has to have paid, over at least this many outings, to be given up as not worth it */
const POOR_PAY = 0.7;
const POOR_AFTER = 3;

/** what skill a workplace trains, read off the recipe table (the first recipe worked there that names one) */
const AT_SKILL = new Map<BuildingType, SkillKey>();
for (const r of RECIPES) if (r.skill && !AT_SKILL.has(r.at)) AT_SKILL.set(r.at, r.skill);

/** work whose kind is the same whatever it is done to */
const BY_KIND: Partial<Record<ActivityKind, SkillKey>> = {
  build: 'build',
  repair: 'build',
  plan_site: 'build',
  till: 'farm',
  plant: 'farm',
  tend: 'farm',
  harvest: 'farm',
  craft: 'craft',
  tool_work: 'craft',
};

/**
 * The kind of work somebody is visibly at, as a watcher would put it: chopping at a tree is wood, standing at the kiln is the
 * kiln, hoeing a field is farming. Null for everything that is not work (walking, eating, talking, sleeping). This is what
 * perception.ts writes into `SeenEntity.work`, and it reads nothing but the person's own activity and what it is aimed at.
 */
export function visibleWork(world: World, p: Person): SkillKey | null {
  const a = p.activity;
  if (!a) return null;
  if (a.kind === 'gather') {
    const t = a.data.stype as SourceType | undefined;
    return t ? SOURCE_SKILL[t] ?? null : null;
  }
  if (a.kind === 'operate') {
    const b = world.byId.get(a.targetId);
    return b && b.ent === 'building' ? AT_SKILL.get(b.type) ?? null : null;
  }
  return BY_KIND[a.kind] ?? null;
}

/** The kind of work an option would be, from the option itself and the person's own beliefs about what it is aimed at. */
export function workOfOption(p: Person, o: Option): SkillKey | null {
  if (o.kind === 'gather') {
    const b: Belief | undefined = p.beliefs[o.targetId];
    return b ? SOURCE_SKILL[b.kind as SourceType] ?? null : null;
  }
  if (o.kind === 'operate') {
    const b: Belief | undefined = p.beliefs[o.targetId];
    return b?.btype ? AT_SKILL.get(b.btype as BuildingType) ?? null : null;
  }
  return BY_KIND[o.kind] ?? null;
}

/** what they can see other people at, kind by kind, and how many people that is altogether */
function workInSight(p: Person): { at: Map<SkillKey, number>; workers: number } {
  const at = new Map<SkillKey, number>();
  let workers = 0;
  for (const s of p.seen) {
    if (s.ent !== 'person' || !s.work) continue;
    at.set(s.work, (at.get(s.work) ?? 0) + 1);
    workers++;
  }
  return { at, workers };
}

const SKILL_KEYS: SkillKey[] = ['forage', 'fish', 'wood', 'stone', 'build', 'farm', 'craft', 'carpentry', 'kiln', 'smith', 'bake'];

/**
 * How much this person's own standing at a kind of work, measured against their own average at everything, is worth once the
 * people working around them are taken into account. Positive means "I am comparatively good at this and few here do it".
 */
function advantage(p: Person, k: SkillKey, sight: { at: Map<SkillKey, number>; workers: number }): number {
  let mean = 0;
  for (const key of SKILL_KEYS) mean += p.skills[key];
  mean /= SKILL_KEYS.length;
  const own = (p.skills[k] - mean) * 60;
  const crowd = sight.workers > 0 ? (sight.at.get(k) ?? 0) / sight.workers : 0;
  return own - crowd * CROWD_WEIGHT;
}

const WORD: Record<SkillKey, string> = {
  forage: 'foraging',
  fish: 'fishing',
  wood: 'woodcutting',
  stone: 'stonework',
  build: 'building',
  farm: 'farming',
  craft: 'handiwork',
  carpentry: 'carpentry',
  kiln: 'the kiln',
  smith: 'smithing',
  bake: 'baking',
};
export const tradeWord = (k: SkillKey): string => WORD[k];

/**
 * Take up, keep, change or give up a trade. Called once a person has their options in front of them (decision.ts), before
 * anything is ranked, at most every TRADE_REVIEW ticks. Rich worlds only; children have no trade.
 */
export function reviewTrade(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!trades || !isRich(world) || ctx.stage === 'child') return;
  if ((p.cooldowns.trade ?? 0) > world.tick) return;
  p.cooldowns.trade = world.tick + TRADE_REVIEW;
  pruneDemand(world,p);
  const sight = workInSight(p);
  const demand=repeatedDemand(world,p);
  const feasible=new Set(ctx.options.filter(o=>!o.blocked).map(o=>workOfOption(p,o)));
  const bonus=(k:SkillKey)=>demand.has(k)&&feasible.has(k)?DEMAND_BONUS:0;
  const have = p.trade;
  if (have) {
    // A gathering-aligned trade can end if its recorded pay is poor over several outings; any trade can end if so many people
    // working in front of them are at it that it is nobody's trade any more.
    const pay = p.payoff?.[have.key];
    const poorly = !!pay && pay.n >= POOR_AFTER && pay.r < POOR_PAY;
    const crowded = sight.workers >= 3 && (sight.at.get(have.key) ?? 0) / sight.workers > CROWDED_SHARE;
    const pulled=Array.from(demand.keys()).some(k=>k!==have.key&&bonus(k)>0&&advantage(p,k,sight)+bonus(k)>=advantage(p,have.key,sight)+bonus(have.key)+SWITCH_MARGIN);
    if (!poorly && !crowded && !pulled) return;
  }
  let best: SkillKey | null = null;
  let bestScore = -1e9;
  for (const k of SKILL_KEYS) {
    const v = advantage(p, k, sight)+bonus(k);
    if (v > bestScore) {
      bestScore = v;
      best = k;
    }
  }
  if (!best || bestScore < ADOPT_MIN) {
    // nothing stands out: better no trade than a trade they are no good at
    if (have) p.trade = null;
    return;
  }
  if (have) {
    if (best === have.key) {
      // the same work is still the best they can see, even though it has paid badly or is crowded: they keep it and say why
      return;
    }
    if (bestScore < advantage(p, have.key, sight)+bonus(have.key) + SWITCH_MARGIN) return;
  }
  const crowd = sight.workers > 0 ? (sight.at.get(best) ?? 0) / sight.workers : 0;
  p.trade = {
    key: best,
    since: world.tick,
    why: bonus(best)>0 ? `${demand.get(best)!.people} people asked me for ${demand.get(best)!.item}` : have ? `${tradeWord(have.key)} was not paying` : crowd === 0 && sight.workers >= 2 ? 'nobody else here does it' : 'quicker at it than at anything else',
  };
}

/**
 * The bounded tilt a trade gives this option, for the final ranking (decision.ts). Positive for work that is their trade and
 * nothing at all for everything else: it can make their own trade win a close call, never outweigh a need.
 */
export function tradeNudge(world: World, p: Person, o: Option): number {
  if (!trades || !p.trade || !isRich(world)) return 0;
  return workOfOption(p, o) === p.trade.key ? TRADE_NUDGE : 0;
}

/** why the chosen option was tilted, for the decision record ('' when the trade had nothing to do with it) */
export function tradeReason(world: World, p: Person, o: Option): string {
  return tradeNudge(world, p, o) > 0 ? `${tradeWord(p.trade!.key)} is my trade${hasLocalDemand(world)&&/people asked me/.test(p.trade!.why)?`; ${p.trade!.why}`:''}` : '';
}

/** the trade as the person card says it, or '' for somebody who has none */
export function describeTrade(p: Person): string {
  const t = p.trade;
  return t ? `${tradeWord(t.key)} — ${t.why}` : '';
}
