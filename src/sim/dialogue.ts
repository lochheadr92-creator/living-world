import { hashUnit } from './rng';
import { compass } from './labels';
import { BELIEF_NOUN } from './labels';
import { dayFraction } from './environment';
import type { Belief, ItemKind, World } from './types';

/** deterministic pick from a list; never touches the shared random stream */
export function pickLine(list: readonly string[], a: number, b: number, c: number): string {
  return list[Math.floor(hashUnit(a, b, c) * list.length) % list.length];
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export function saying(list: readonly string[], a: number, b: number, c: number, vars: Record<string, string | number> = {}): string {
  return fill(pickLine(list, a, b, c), vars);
}

export const GREET_MORNING = ['Morning, {n}!', 'Good morning, {n}.', 'Early start, {n}?'];
export const GREET_DAY = ['Hello, {n}.', 'Hi, {n}!', 'Hey, {n}.'];
export const GREET_EVENING = ['Evening, {n}.', 'Long day, {n}?'];
export const GREET_NIGHT = ['Still up, {n}?', 'Quiet night, {n}.'];
export const GREET_FRIEND = ['Good to see you, {n}!', '{n}! There you are.', 'Ah, {n}, my friend.'];

export function greeting(world: World, name: string, friendly: boolean, a: number, b: number): string {
  const f = dayFraction(world.tick);
  const vars = { n: name };
  if (friendly && hashUnit(a, b, 91) < 0.6) return saying(GREET_FRIEND, a, b, 1, vars);
  if (world.light < 0.3) return saying(GREET_NIGHT, a, b, 2, vars);
  if (f < 0.42) return saying(GREET_MORNING, a, b, 3, vars);
  if (f > 0.64) return saying(GREET_EVENING, a, b, 4, vars);
  return saying(GREET_DAY, a, b, 5, vars);
}

const SMALL_RAIN = ['Rain again.', 'Wet one today.', 'Hope this clears up.'];
const SMALL_STORM = ['That storm is wild!', 'Stay close to shelter.'];
const SMALL_CLEAR = ['Lovely day.', 'Good weather for work.', 'Not a cloud about.'];
const SMALL_CLOUD = ['Looks like rain later.', 'Grey sky today.'];
const SMALL_COLD = ['Bitter tonight.', 'Cold out, isn’t it?'];
const SMALL_FIRE = ['Nice to sit by the fire.', 'The fire’s good tonight.'];
const SMALL_FOOD = ['Food’s been scarce lately.', 'Good fishing today, I heard.', 'The berries are thinning out.'];
const SMALL_KIDS = ['The little ones are growing fast.', 'Kids are full of energy today.'];

export function smallTalk(world: World, a: number, b: number, atFire: boolean, coldish: boolean, hardTimes: boolean): string {
  const w = world.weather;
  const k = Math.floor(world.tick / 80);
  if (w.storm > 0.5) return saying(SMALL_STORM, a, b, k);
  if (w.rain > 0.4) return saying(SMALL_RAIN, a, b, k);
  if (coldish && world.light < 0.35) return saying(SMALL_COLD, a, b, k);
  if (hardTimes) return saying(SMALL_FOOD, a, b, k);
  if (atFire) return saying(SMALL_FIRE, a, b, k);
  if (hashUnit(a, b, k + 5) < 0.2) return saying(SMALL_KIDS, a, b, k);
  if (w.cloud > 0.4) return saying(SMALL_CLOUD, a, b, k);
  return saying(SMALL_CLEAR, a, b, k);
}

export const ITEM_PHRASE: Record<ItemKind, string> = {
  berries: 'berries',
  fruit: 'fruit',
  fish: 'fish',
  grain: 'grain',
  bread: 'bread',
  seeds: 'seed',
  water: 'water',
  wood: 'wood',
  stone: 'stone',
  clay: 'clay',
  ore: 'ore',
  planks: 'planks',
  handles: 'handles',
  bricks: 'bricks',
  charcoal: 'charcoal',
  iron: 'iron',
  flour: 'flour',
  axe: 'an axe',
  pick: 'a pickaxe',
  hoe: 'a hoe',
  basket: 'a basket',
  hammer: 'a hammer',
  saw: 'a saw',
  jar: 'a water jar',
};

export function requestLine(kind: string, a: number, b: number, vars: Record<string, string | number> = {}): string {
  const lists: Record<string, readonly string[]> = {
    food: ['Could you spare some food?', 'I’m starving — any food to spare?', 'Do you have something to eat?'],
    water: ['Any water to spare?', 'I’m parched — could I have some water?'],
    wood: ['Could you bring me some wood?', 'I need wood for the {building}. Can you spare any?'],
    stone: ['Do you have any stone to spare?', 'I need stone for the {building}.'],
    seeds: ['Could you spare some seed?'],
    tool: ['May I borrow your {tool}?'],
    help_build: ['Could you help build the {building}?', 'Care to lend a hand with the {building}?'],
    info: ['Do you know where I can find {thing}?', 'Have you seen any {thing} around?'],
    trade: ['I’ll swap you {offer} for {want}?', 'Trade {offer} for {want}?'],
    care: ['I’m hungry!', 'Can I have something to eat?', 'Please, I’m so hungry.'],
  };
  return saying(lists[kind] ?? ['Could you help me?'], a, b, 17, vars);
}

export const RESP_GIVE = ['Here, take {what}.', 'Of course — have {what}.', 'Take it, you need it more.'];
export const RESP_PROMISE_ITEM = ['I can bring {what}.', 'I’ll bring you {what} soon.', 'Give me a little while — I’ll fetch {what}.'];
export const RESP_PROMISE_HELP = ['I’ll come and help.', 'Count me in — I’ll be there.', 'I can lend a hand soon.'];
export const RESP_NO_ITEM = ['I don’t have any.', 'Nothing on me, sorry.'];
export const RESP_OWN_NEED = ['Sorry, I need it myself.', 'I’ve barely enough for me.', 'Not this time — we’re running low.'];
export const RESP_UNWILLING = ['Not now.', 'Ask someone else.', 'I can’t help you today.'];
export const RESP_DISLIKED = ['No.', 'After last time? No.', 'I don’t think so.'];
export const THANKS = ['Thank you!', 'Bless you, {n}.', 'I owe you one, {n}.', 'That helps a lot.'];
export const SHRUG = ['Oh. Alright.', 'Never mind.', 'I’ll manage.'];
export const WARN_LINES = ['Wolf near the {dir} woods!', 'Careful — I saw a wolf to the {dir}.', 'Keep away from the {dir}; wolves about.'];
export const GOSSIP_BROKE = ['{n} didn’t keep their word, you know.', 'I wouldn’t count on {n} to follow through.', 'Careful with {n} — a promise went unkept.'];
export const GOSSIP_KEPT = ['{n} does what they say.', 'You can rely on {n}; they kept their word.'];
export const GOSSIP_GAVE = ['{n} was good to someone in need the other day.', 'Kind of {n}, giving what they had.'];
export const GOSSIP_QUARREL = ['{n} had words with someone the other day.', 'Mind {n}; there was an argument.'];
export const MEDIATE_ASK = ['Is it worth staying angry with {c}, {n}?', 'I know things went wrong with {c}. Talk to them?', '{n}, {c} is not the worst. Think it over?'];
export const MEDIATE_YES = ['You’re right. I’ll think it over.', 'Maybe I was too hard on {c}.', 'Thanks for saying so.'];
export const MEDIATE_NO = ['Not now.', 'I’m not ready to hear it.', 'Leave it, please.'];
export const APOLOGY = ['Sorry about earlier.', 'I was wrong to shout. Sorry.', 'Let’s not stay angry, {n}.'];
export const FORGIVE = ['It’s forgotten.', 'Thanks. Let’s move on.', 'All right. No hard feelings.'];
export const NOT_YET = ['Not yet.', 'I’m still angry.', 'Give me time.'];
export const ARGUE_A = ['That was mine!', 'I was here first!', 'You always take the best!', 'Hey, that was the last one!'];
export const ARGUE_B = ['I got there first!', 'Take it up with the berries.', 'Calm down!', 'There’s no need to shout.'];
export const PROPOSE_PARTNER = ['Would you move in with me?', 'Come live with me, {n}?'];
export const PROPOSE_PARTNER_HOME = ['{n}… I’d like us to be together.', 'Stay with me — as more than housemates, {n}?'];
export const PROPOSE_ROOMMATE = ['Share my home, {n}? There’s room.', 'Stay with us — there’s space.'];
export const ACCEPT_PROPOSE = ['Yes. I’d like that.', 'Gladly.'];
export const NO_ROOM = ['I’d say yes — but there isn’t room under my roof yet.', 'Not until there’s more space, {n}.'];
export const DECLINE_PROPOSE = ['I’m not ready.', 'Not yet.'];
export const OFFER_LINES = ['You look hungry, {n}. Take this.', 'Here, {n} — you need this more than I do.', 'Have some {what}, {n}.'];
export const CARE_LINES = ['Eat up, {n}.', 'Here you go, {n}.', 'You must be hungry, {n}.'];
export const TRADE_OK = ['Deal.', 'Fair enough.', 'Done.'];
export const TRADE_NO = ['No, I need mine.', 'That’s not worth it to me.'];
export const BUILD_DONE = ['Home at last!', 'It’s finished!', 'Well, that’s that.'];
export const NEWBORN = ['Welcome, little one.', 'She’s here!', 'He’s here!'];

function agoText(world: World, seen: number): string {
  const d = world.tick - seen;
  if (d < 500) return 'just now';
  if (d < 1500) return 'earlier today';
  if (d < 3200) return 'a day ago';
  return 'a while back';
}

/** Where is this place, in words a person could say? Relative to the camp and the water. */
export function placeWords(world: World, b: Belief): string {
  const dx = b.x - world.camp.x;
  const dy = b.y - world.camp.y;
  const d = Math.hypot(dx, dy);
  const ti = Math.floor(b.y) * world.W + Math.floor(b.x);
  const wd = world.waterDist[Math.max(0, Math.min(world.waterDist.length - 1, ti))];
  if (d < 9) return 'near camp';
  const dir = compass(dx, dy);
  const dist = d < 16 ? 'a short walk' : d < 28 ? 'a fair way' : 'a long way';
  if (wd <= 3 && b.kind !== 'water') return `by the water, ${dist} ${dir} of camp`;
  return `${dist} ${dir} of camp`;
}

export function infoLine(world: World, b: Belief, a: number, c: number): string {
  if (b.amount <= 0 && (b.kind === 'berry_bush' || b.kind === 'fruit_tree' || b.kind === 'wild_grain' || b.kind === 'fish_spot')) {
    const what = b.kind === 'berry_bush' ? 'berry bushes' : b.kind === 'fruit_tree' ? 'fruit trees' : b.kind === 'wild_grain' ? 'wild grain' : 'fishing spot';
    return saying(['Don’t bother with the {thing} {where}: picked clean.', 'The {thing} {where} are bare now.', 'Nothing left at the {thing} {where}.'], a, c, 29, { thing: what, where: placeWords(world, b) });
  }
  const noun = b.kind === 'berry_bush' ? 'berry bushes' : b.kind === 'fruit_tree' ? 'fruit trees' : b.kind === 'wild_grain' ? 'wild grain' : b.kind === 'fish_spot' ? 'good fishing' : b.kind === 'rock' ? 'stone' : b.kind === 'tree' ? 'good timber' : BELIEF_NOUN[b.kind];
  const lists = ['There’s {thing} {where}.', 'I saw {thing} {where}, {ago}.', 'Try {where} — {thing}, {ago}.'];
  return saying(lists, a, c, 23, { thing: noun, where: placeWords(world, b), ago: agoText(world, b.seen) });
}

export function dangerWords(world: World, b: Belief): string {
  return compass(b.x - world.camp.x, b.y - world.camp.y);
}

export { fill };

