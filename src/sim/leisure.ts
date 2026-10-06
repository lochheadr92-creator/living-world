import { faceToward, newActivity, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { transfer, consume } from './economy';
import { dayFraction } from './environment';
import { addEvent, addFx, addLog } from './events';
import { pickNews, tellBelief } from './news';
import { Scorer, addOption, beliefsByKind, eta, pen, spotNear } from './optutil';
import type { Ctx } from './optutil';
import { carryCap, stageOf } from './people';
import { isWalkable } from './registry';
import { adjustRel, peekRel } from './relations';
import { hearAccount, pickAccount } from './reputation';
import { hashUnit } from './rng';
import { skillOfActivity } from './teaching';
import type { Building, ItemKind, Keepsake, Occasion, OccasionKind, Person, World } from './types';
import { vigourOf } from './ageing';
import { clamp } from './util';

/**
 * The part of life that is not needed: evenings round the fire with stories and song, children at play, a bit of rivalry between
 * friends, a carved keepsake for someone, calling on a friend (and being given a bite), a joke in passing, and a meal to mark a birth,
 * a coming of age, a new partnership or a recovery. None of it is needed to live, so each thing is only taken up when nothing presses
 * (nobody is hungry, thirsty or worn out, nothing is wrong), and is an ordinary option that loses to anything that matters. Everything
 * rests on something that really happened: the fire is lit, the story is something the teller knows, the keepsake costs a piece of
 * wood from their pack (written off in the ledger), the bite is food that really changes hands, the occasion really occurred.
 * `settings.leisure = false` turns it all off.
 */

export const leisureOn = (world: World): boolean => world.settings.leisure !== false;
export const calm = (ctx: Ctx): boolean => ctx.criticals.length === 0 && ctx.drives.hunger <= 24 && ctx.drives.thirst <= 24 && ctx.drives.energy <= 40;
const evening = (tick: number): boolean => {
  const f = dayFraction(tick);
  return f >= 0.6 && f < 0.84;
};
const daytime = (tick: number): boolean => {
  const f = dayFraction(tick);
  return f >= 0.2 && f < 0.78;
};

// ───────────────────────── evenings at the fire ─────────────────────────
/** Someone who has nothing pressing may spend the evening at a fire they know to be lit, among whoever is there. */
export function optFireside(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!leisureOn(world) || !evening(world.tick) || !calm(ctx) || (p.cooldowns.fireside ?? 0) > world.tick) return;
  if (p.illness) return;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype !== 'fire') continue;
    const lit = (b.fuel ?? 0) - (world.tick - b.seen) * 0.85 > 60;
    if (!lit) continue;
    const e = eta(ctx, b.x, b.y);
    if (e > 900) continue;
    // company: people who can be seen at or near that fire right now
    const near = ctx.seenPersons.filter((s) => Math.hypot(s.x - (b.x + 0.5), s.y - (b.y + 0.5)) < 5 && !s.asleep).length;
    const sc = new Scorer()
      .add('an evening with the others at the fire', 5 + 9 * p.traits.sociability + (ctx.stage === 'child' ? 3 : 0) + (ctx.stage === 'elder' ? 2 : 0))
      .add('others are there', Math.min(near, 3) * 2.2)
      .add('walking', -pen(e));
    if (sc.total < 10) continue;
    addOption(ctx, {
      kind: 'warm',
      label: 'Spend the evening at the fire',
      goal: 'to sit with the others',
      need: 'social',
      util: sc.total,
      parts: sc.parts,
      eta: e,
      key: `warm:fireside:${b.id}`,
      targetId: b.id,
      tag: 'social',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, {
          kind: 'warm',
          label: 'Sitting at the fire with the others',
          goal: 'to sit with the others',
          need: 'social',
          targetId: b.id,
          targetType: 'building',
          tx: b.x,
          ty: b.y,
          spotX: spot.x,
          spotY: spot.y,
          amount: 520,
          utility: sc.total,
          minCommit: 160,
          maxTicks: 1000,
          data: { fireside: true },
        });
      },
    });
  }
}

const STORY_LINES = ['Did I tell you about {x}?', 'Listen, this is how it was with {x}.', 'You will like this one, about {x}.'];
const SONG_LINES = ['♪ …a song they all know…', '♪ …something soft, from long ago…', '♪ …and they join in on the chorus…'];

/**
 * Called every couple of minutes of simulated time. At each lit fire where two or more people are sitting for the evening, someone
 * who has not performed lately tells what they know or sings: those who listen have a pleasant evening and feel closer to them,
 * and a story is not just entertainment: whatever the teller knows of places and dangers, and of how people have behaved, passes to
 * the listeners the same way it does in any conversation.
 */
export function fireTick(world: World): void {
  if (!leisureOn(world)) return;
  for (const fire of world.buildings) {
    if (fire.type !== 'fire' || fire.fuel <= 0) continue;
    const here = world.persons.filter((p) => p.alive && p.activity?.kind === 'warm' && p.activity.data.fireside && Math.hypot(p.x - (fire.x + 0.5), p.y - (fire.y + 0.5)) < 4.2);
    if (here.length < 2) continue;
    const ready = here.filter((p) => (p.cooldowns.perform ?? 0) <= world.tick && stageOf(world, p) !== 'child');
    if (!ready.length) continue;
    let S = ready[0];
    let best = -1;
    for (const p of ready) {
      const st = stageOf(world, p);
      const score = p.traits.sociability * 0.6 + (st === 'elder' ? 0.3 : st === 'adult' ? 0.1 : 0) + hashUnit(p.id, world.tick >> 7, 41) * 0.3;
      if (score > best) {
        best = score;
        S = p;
      }
    }
    perform(world, S, here.filter((p) => p !== S), fire);
  }
}

function perform(world: World, S: Person, listeners: Person[], fire: Building): void {
  S.cooldowns.perform = world.tick + Math.round(DAY / 3);
  let told = 0;
  for (const L of listeners) {
    const news = pickNews(world, S, L, 1);
    for (const b of news) if (tellBelief(world, S, L, b)) told++;
    const acc = pickAccount(world, S, L);
    if (acc && hearAccount(world, S, L, acc)) told++;
  }
  const story = told > 0 || (S.traits.curiosity > 0.5 && hashUnit(S.id, world.tick >> 7, 43) < 0.6);
  const lines = story ? STORY_LINES : SONG_LINES;
  const line = lines[Math.floor(hashUnit(S.id, world.tick >> 6, 47) * lines.length)];
  const subject = story ? (told > 0 ? 'what happened' : 'old times') : '';
  S.speech = { text: line.replace('{x}', subject), until: world.tick + 90, kind: story ? 'say' : 'happy' };
  for (const L of listeners) {
    L.needs.social = Math.min(100, L.needs.social + (story ? 3 : 4));
    adjustRel(L, S.id, world.tick, { aff: 0.6, fam: 0.3, note: story ? `${S.name} told a story at the fire` : `${S.name} sang at the fire` });
    adjustRel(S, L.id, world.tick, { aff: 0.3, fam: 0.2 });
    addLog(world, L, 'social', story ? `Listened to ${S.name} tell a story by the fire.` : `Listened to ${S.name} sing by the fire.`);
  }
  S.needs.social = Math.min(100, S.needs.social + 5);
  addLog(world, S, 'social', story ? 'Told a story by the fire.' : 'Sang by the fire.');
  world.stats.firesides = (world.stats.firesides ?? 0) + 1;
  if (told > 0) world.stats.storiesTold = (world.stats.storiesTold ?? 0) + told;
  if (world.tick - (world.stats.lastFireEvt ?? -9999) > 900) {
    world.stats.lastFireEvt = world.tick;
    addEvent(world, 'social', `${S.name} ${story ? 'told a story' : 'sang'} by the fire, with ${listeners.length} listening.`, [S.id, ...listeners.map((x) => x.id)].slice(0, 4), fire.x, fire.y);
  }
  addFx(world, 'sparkle', S.x, S.y, 0);
}

// ───────────────────────── occasions, and meals to mark them ─────────────────────────
/** Something happy has happened: everyone in the circle around it may want to mark it. */
export function noteOccasion(world: World, kind: OccasionKind, name: string, about: number, circle: Person[]): void {
  if (!leisureOn(world)) return;
  for (const p of circle) {
    if (!p.alive || p.occasions.some((o) => o.kind === kind && o.about === about)) continue;
    p.occasions.push({ kind, about, name, tick: world.tick });
    if (p.occasions.length > 4) p.occasions.shift();
  }
}

/** The people close round these people: themselves, their household and their kin who are still alive. */
export function circleOf(world: World, people: Person[]): Person[] {
  const out = new Set<Person>();
  for (const p of people) {
    out.add(p);
    for (const q of world.persons) if (q.alive && q.id !== p.id && (q.hhId === p.hhId || q.relations[p.id]?.kin || p.relations[q.id]?.kin)) out.add(q);
  }
  return [...out];
}

/** The freshest happy occasion in someone's circle, within three days. */
export function celebrating(p: Person, tick: number): Occasion | null {
  let best: Occasion | null = null;
  for (const o of p.occasions) if (tick - o.tick < DAY * 3 && (!best || o.tick > best.tick)) best = o;
  return best;
}

const OCCASION_WORDS: Record<OccasionKind, (name: string) => string> = {
  birth: (n) => `the birth of ${n}`,
  coming_of_age: (n) => `${n} coming of age`,
  partnership: (n) => `${n} becoming a couple`,
  recovery: (n) => `${n} getting well`,
};
export const occasionWords = (o: { kind: OccasionKind; name: string }): string => OCCASION_WORDS[o.kind](o.name);

/** A meal held to mark an occasion has been eaten: everyone at it is cheered, and the village hears of it. */
export function onCelebrationMeal(world: World, occ: { kind: OccasionKind; about: number; name: string }, diners: Person[], host: Person): void {
  for (const d of diners) {
    d.needs.social = Math.min(100, d.needs.social + 10);
    addLog(world, d, 'social', `Celebrated ${occasionWords(occ)} at a shared meal.`);
    const mine = d.occasions.findIndex((o) => o.kind === occ.kind && o.about === occ.about);
    if (mine >= 0) d.occasions.splice(mine, 1); // it has been marked
  }
  addEvent(world, 'social', `${host.name} held a meal to celebrate ${occasionWords(occ)}; ${diners.length} sat down together.`, diners.map((x) => x.id).slice(0, 4), host.x, host.y);
  world.stats.celebrations = (world.stats.celebrations ?? 0) + 1;
}

// ───────────────────────── children at play ─────────────────────────
/** A child with nothing pressing goes and plays, with other children if there are any about. */
export function optPlay(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!leisureOn(world) || ctx.stage !== 'child' || !daytime(world.tick) || !calm(ctx) || (p.cooldowns.play ?? 0) > world.tick) return;
  if (p.illness) return;
  const mates = ctx.seenPersons.filter((s) => s.child && !s.asleep && s.id !== p.id && Math.hypot(s.x - p.x, s.y - p.y) < 12);
  const sc = new Scorer().add('wants to play', 6 + 8 * p.traits.sociability + 0.1 * (100 - p.needs.social)).add('other children about', Math.min(mates.length, 3) * 2.5);
  if (!mates.length) sc.add('on their own', -3);
  if (sc.total < 9) return;
  const target = mates.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  addOption(ctx, {
    kind: 'play',
    label: target ? 'Play with the other children' : 'Play',
    goal: 'to play',
    need: 'social',
    util: sc.total,
    parts: sc.parts,
    eta: target ? eta(ctx, target.x, target.y) : 0,
    key: 'play',
    targetId: 0,
    tag: 'social',
    make: () =>
      newActivity(world, p, {
        kind: 'play',
        label: 'Playing',
        goal: 'to play',
        need: 'social',
        here: !target,
        tx: target ? target.x : p.x,
        ty: target ? target.y : p.y,
        spotX: target ? target.x : p.x,
        spotY: target ? target.y : p.y,
        utility: sc.total,
        minCommit: 120,
        maxTicks: 600,
        data: {},
      }),
  });
}

registerHandler('play', {
  availability: 0.8,
  pose: () => 'run',
  begin(world, p, a) {
    a.duration = 240 + Math.floor(hashUnit(p.id, world.tick >> 5, 51) * 160);
    // the circle they run round passes through where they stand, so the first step is a small one
    const ang0 = p.id;
    a.data.ax = p.x - Math.cos(ang0) * 1.1;
    a.data.ay = p.y - Math.sin(ang0) * 1.1;
  },
  work(world, p, a): WorkResult {
    a.progress++;
    // run about in a small circle round where they began, as long as the ground is open
    const ang = a.progress * 0.12 + p.id;
    const gx = (a.data.ax as number) + Math.cos(ang) * 1.1;
    const gy = (a.data.ay as number) + Math.sin(ang) * 1.1;
    // never more than an ordinary walking step at a time, and only onto open ground
    const dx = gx - p.x;
    const dy = gy - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 1e-6) {
      const step = Math.min(0.13, d);
      const nx = p.x + (dx / d) * step;
      const ny = p.y + (dy / d) * step;
      if (isWalkable(world, Math.floor(nx), Math.floor(ny))) {
        faceToward(p, gx, gy);
        p.x = nx;
        p.y = ny;
      }
    }
    if (a.progress % 80 === 0) {
      p.needs.social = Math.min(100, p.needs.social + 2.5);
      p.needs.energy = Math.max(0, p.needs.energy - 0.6);
      for (const q of world.persons) {
        if (q === p || !q.alive || q.activity?.kind !== 'play' || Math.hypot(q.x - p.x, q.y - p.y) > 4.5) continue;
        adjustRel(p, q.id, world.tick, { aff: 0.5, fam: 0.4, note: `played with ${q.name}` });
        a.data.mate = q.id;
      }
      // grown people at work nearby are copied in make-believe: a little of what they do rubs off
      for (const q of world.persons) {
        if (q === p || !q.alive || !q.activity || q.activity.phase !== 'work' || Math.hypot(q.x - p.x, q.y - p.y) > 6) continue;
        const k = skillOfActivity(world, q.activity);
        if (k && q.skills[k] > p.skills[k] + 0.15 && stageOf(world, q) !== 'child') {
          p.skills[k] = Math.min(1.8, p.skills[k] + 0.002);
          world.stats.playGain = (world.stats.playGain ?? 0) + 0.002;
          break;
        }
      }
    }
    return a.progress >= a.duration ? 'done' : 'continue';
  },
  onEnd(world, p, a, outcome) {
    p.cooldowns.play = world.tick + 700;
    if (outcome !== 'success') return;
    const mate = world.byId.get((a.data.mate as number) ?? 0);
    addLog(world, p, 'social', mate && mate.ent === 'person' ? `Played with ${mate.name}.` : 'Played for a while.');
    world.stats.playTime = (world.stats.playTime ?? 0) + a.progress;
  },
});

// ───────────────────────── friendly contests ─────────────────────────
export const GAME_WORDS = { race: 'a race', wrestle: 'a wrestling match', throw: 'a throwing contest' } as const;
export type Game = keyof typeof GAME_WORDS;

/** How well someone does at a game today: strength and stamina, with a hash of the moment for luck. */
function form(world: World, p: Person, game: Game, other: Person): number {
  const age = (world.tick - p.birthTick) / (world.settings.daysPerYear ?? 12) / DAY;
  const v = vigourOf(world, p, age);
  const skill = game === 'throw' ? 0.1 * (p.skills.stone - 1) : 0;
  return v * (0.8 + 0.4 * hashUnit(p.id, other.id, (world.tick >> 3) + 11)) + skill;
}

/** The game is played (during a conversation, as it were) and decided. Spectators nearby enjoy it. */
export function playContest(world: World, A: Person, B: Person, game: Game): void {
  const fa = form(world, A, game, B);
  const fb = form(world, B, game, A);
  const [W, L] = fa >= fb ? [A, B] : [B, A];
  const close = Math.abs(fa - fb) < 0.08;
  for (const p of [A, B]) {
    p.needs.social = Math.min(100, p.needs.social + 4);
    p.needs.energy = Math.max(0, p.needs.energy - 1.5);
  }
  adjustRel(L, W.id, world.tick, { aff: close ? 0.6 : 0.3, fam: 0.5, note: `lost ${GAME_WORDS[game]} to ${W.name}${close ? ' by a hair' : ''}` });
  adjustRel(W, L.id, world.tick, { aff: 0.6, fam: 0.5, note: `won ${GAME_WORDS[game]} against ${L.name}` });
  addLog(world, W, 'social', `Won ${GAME_WORDS[game]} against ${L.name}.`);
  addLog(world, L, 'social', `Lost ${GAME_WORDS[game]} to ${W.name}${close ? ' by a hair' : ''}.`);
  let watchers = 0;
  for (const s of world.persons) {
    if (!s.alive || s === A || s === B || s.pose === 'sleep' || s.convId || Math.hypot(s.x - A.x, s.y - A.y) > 7) continue;
    s.needs.social = Math.min(100, s.needs.social + 3);
    adjustRel(s, W.id, world.tick, { aff: 0.3, note: `watched ${W.name} win ${GAME_WORDS[game]}` });
    addLog(world, s, 'social', `Watched ${A.name} and ${B.name} have ${GAME_WORDS[game]}: ${W.name} won.`);
    watchers++;
  }
  A.cooldowns.contestAny = world.tick + Math.round(DAY * 0.6);
  B.cooldowns.contestAny = world.tick + Math.round(DAY * 0.6);
  world.stats.contests = (world.stats.contests ?? 0) + 1;
  if (world.tick - (world.stats.lastContestFeed ?? -9999) > 600) {
    world.stats.lastContestFeed = world.tick;
    addEvent(world, 'social', `${W.name} beat ${L.name} at ${GAME_WORDS[game].replace(/^a /, '')}${watchers ? `, with ${watchers} watching` : ''}.`, [W.id, L.id], W.x, W.y);
  }
}

// ───────────────────────── keepsakes ─────────────────────────
const TOYS = ['a little carved horse', 'a wooden whistle', 'a small carved bird', 'a toy boat'];
const KEEPSAKES = ['a carved spoon', 'a small carved bird', 'a polished walking stick', 'a wooden comb'];
export function keepsakeFor(world: World, giver: Person, receiver: Person): string {
  const list = stageOf(world, receiver) === 'child' ? TOYS : KEEPSAKES;
  return list[Math.floor(hashUnit(giver.id, receiver.id, world.tick >> 9) * list.length)];
}

/** Carved from a piece of wood out of the giver's pack (written off in the ledger); the receiver keeps a record of it, not an item. */
export function giveKeepsake(world: World, A: Person, B: Person): string | null {
  if ((A.inv.wood ?? 0) < 1) return null;
  consume(world, A.inv, 'wood', 1, 'carved into a keepsake');
  const what = keepsakeFor(world, A, B);
  const k: Keepsake = { from: A.id, tick: world.tick, what };
  B.keepsakes.push(k);
  if (B.keepsakes.length > 6) B.keepsakes.shift();
  adjustRel(B, A.id, world.tick, { aff: 4, trust: 2, fam: 1, note: `${A.name} gave me ${what}` });
  adjustRel(A, B.id, world.tick, { aff: 1, fam: 0.5 });
  B.needs.social = Math.min(100, B.needs.social + 5);
  A.needs.social = Math.min(100, A.needs.social + 3);
  A.cooldowns['present' + B.id] = world.tick + DAY * 3;
  addLog(world, A, 'social', `Gave ${B.name} ${what} I had carved.`);
  addLog(world, B, 'social', `${A.name} gave me ${what}.`);
  world.stats.keepsakes = (world.stats.keepsakes ?? 0) + 1;
  if (world.tick - (world.stats.lastKeepsakeFeed ?? -9999) > 600) {
    world.stats.lastKeepsakeFeed = world.tick;
    addEvent(world, 'social', `${A.name} gave ${B.name} ${what}.`, [A.id, B.id], B.x, B.y);
  }
  return what;
}

// ───────────────────────── calling on someone ─────────────────────────
const BITES: ItemKind[] = ['bread', 'fruit', 'berries', 'fish', 'grain'];

/**
 * The person called on offers the caller a seat and, if they can spare it, a bite: food that really moves from their pack. Either
 * way it is a pleasant visit for both.
 */
export function hospitality(world: World, host: Person, guest: Person, surplus: (p: Person, k: ItemKind) => number): ItemKind | null {
  guest.cooldowns['call' + host.id] = world.tick + DAY;
  guest.needs.social = Math.min(100, guest.needs.social + 6);
  host.needs.social = Math.min(100, host.needs.social + 3);
  adjustRel(guest, host.id, world.tick, { aff: 1.4, fam: 1, trust: 0.4, note: `called on ${host.name}` });
  adjustRel(host, guest.id, world.tick, { aff: 1.2, fam: 1, note: `${guest.name} called on me` });
  let gave: ItemKind | null = null;
  if (host.traits.generosity >= 0.4 || host.relations[guest.id]?.kin) {
    for (const k of BITES) {
      if (surplus(host, k) >= 1 && transfer(world, host.inv, guest.inv, carryCap(world, guest), k, 1, 'person:' + host.id, 'person:' + guest.id, 'a bite offered to a visitor') > 0) {
        gave = k;
        break;
      }
    }
  }
  addLog(world, guest, 'social', gave ? `Called on ${host.name}, who gave me ${gave === 'bread' ? 'some bread' : `some ${gave}`}.` : `Called on ${host.name} for a chat.`);
  addLog(world, host, 'social', gave ? `${guest.name} called; I gave them a bite to eat.` : `${guest.name} called for a chat.`);
  world.stats.calls = (world.stats.calls ?? 0) + 1;
  if (gave) world.stats.bitesOffered = (world.stats.bitesOffered ?? 0) + 1;
  return gave;
}

// ───────────────────────── a joke in passing ─────────────────────────
export type JokeResult = 'laughed' | 'smiled' | 'flat' | 'stung' | null;

/** Now and then, in a chat, one of them says something funny, or teases. How it lands depends on how warm they are with each other. */
export function maybeJoke(world: World, A: Person, B: Person): JokeResult {
  if (!leisureOn(world)) return null;
  if ((A.cooldowns['joke' + B.id] ?? 0) > world.tick) return null;
  if (hashUnit(A.id, B.id, (world.tick >> 5) + 3) >= 0.1 + 0.3 * A.traits.sociability) return null;
  A.cooldowns['joke' + B.id] = world.tick + 800;
  const aff = peekRel(B, A.id)?.affinity ?? 0;
  const roll = hashUnit(B.id, A.id, (world.tick >> 4) + 5);
  // friends laugh; people in between are mildly amused or not; only someone who already dislikes them is stung
  let r: JokeResult;
  if (aff >= 18) r = 'laughed';
  else if (aff >= 5) r = roll < 0.5 ? 'laughed' : roll < 0.8 ? 'smiled' : 'flat';
  else if (aff >= -5) r = roll < 0.4 ? 'smiled' : 'flat';
  else r = roll < 0.5 ? 'flat' : 'stung';
  if (r === 'laughed') {
    A.needs.social = Math.min(100, A.needs.social + 2.5);
    B.needs.social = Math.min(100, B.needs.social + 3);
    adjustRel(B, A.id, world.tick, { aff: 0.5, note: `${A.name} made me laugh` });
    adjustRel(A, B.id, world.tick, { aff: 0.3 });
  } else if (r === 'smiled') adjustRel(B, A.id, world.tick, { aff: 0.1 });
  else if (r === 'stung') adjustRel(B, A.id, world.tick, { aff: -0.5, trust: -0.3, note: `${A.name} teased me and it was not funny` });
  world.stats.jokes = (world.stats.jokes ?? 0) + 1;
  return r;
}

void clamp;
