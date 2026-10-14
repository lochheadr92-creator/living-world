// Trades and apprenticeship (rich worlds only). A trade is what a person has come to think of as their own work: the skill they
// are clearly best at, once it is good enough, taken up as their calling. It changes what they lean toward (a small, bounded nudge
// to the options that use it) and nothing else: skill still grows only through actual practice. A tradesperson who has worked a
// job alongside someone less skilled may offer to take them on; the learner may accept or refuse, and the apprenticeship lapses
// when they stop practising, because other things pressed. While it lasts, practice within sight of the master teaches more;
// when the apprentice's hand is nearly as good as the master's, they have a trade of their own.
//
// An authored world never creates `p.trade`, so its saves and fingerprints are untouched. The lab's `rich-no-trades` removes
// this and nothing else.
import { DAY, SKILL_MAX } from './constants';
import { addEvent, addLog } from './events';
import { isRich, think } from './mood';
import type { Option } from './optutil';
import { stageOf } from './people';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import type { Person, SkillKey, Trade, World } from './types';
import { hyp } from './util';

let trades = true;
/** An experiment switch (not saved, not hashed): with it off, nobody takes up a trade or an apprentice (the lab's `rich-no-trades`). */
export function setTrades(on: boolean): void {
  trades = on;
}
export const tradesOn = (): boolean => trades;

/** the nudge a trade gives the options that use it */
export const TRADE_NUDGE = 6;
/** good enough to call it a trade, and how far ahead of one's other skills */
const TRADE_AT = 1.12;
const TRADE_MARGIN = 0.08;
/** a master must be this good, and this much better than the learner */
const MASTER_AT = 1.2;
const MASTER_LEAD = 0.15;
/** an apprentice who has not practised for this long has let it lapse */
const LAPSE_AFTER = 5 * DAY;
/** within this distance of the master, practice teaches half as much again */
const TEACH_REACH = 10;

export const TRADE_NAME: Record<SkillKey, string> = {
  forage: 'forager',
  fish: 'fisher',
  wood: 'woodcutter',
  stone: 'mason',
  build: 'builder',
  farm: 'farmer',
  craft: 'toolmaker',
  carpentry: 'carpenter',
  kiln: 'kilnsman',
  smith: 'smith',
  bake: 'baker',
};

const active = (world: World): boolean => trades && isRich(world);

/** which skill an option on offer would practise, when it is plainly one (gathering by its source, building, farming, crafting) */
export function skillOfOption(world: World, o: Option): SkillKey | null {
  switch (o.kind) {
    case 'gather': {
      const s = world.byId.get(o.targetId);
      if (!s || s.ent !== 'source') return null;
      return s.type === 'tree' ? 'wood' : s.type === 'rock' || s.type === 'outcrop' ? 'stone' : s.type === 'fish_spot' ? 'fish' : s.type === 'clay_pit' || s.type === 'ore_vein' ? null : 'forage';
    }
    case 'build':
    case 'repair':
      return 'build';
    case 'till':
    case 'plant':
    case 'tend':
    case 'harvest':
      return 'farm';
    case 'craft':
      return 'craft';
    case 'operate': {
      const b = world.byId.get(o.targetId);
      if (!b || b.ent !== 'building') return null;
      return b.type === 'timber_yard' ? 'carpentry' : b.type === 'kiln' ? 'kiln' : b.type === 'smithy' ? 'smith' : b.type === 'bakery' ? 'bake' : b.type === 'quarry' ? 'stone' : null;
    }
    default:
      return null;
  }
}

/** the trade's pull on an option: TRADE_NUDGE for one that practises it, 0 for the rest (always 0 in an authored world) */
export function tradeNudge(world: World, p: Person, o: Option): number {
  const t = p.trade;
  if (!t || !active(world)) return 0;
  return skillOfOption(world, o) === t.kind ? TRADE_NUDGE : 0;
}

/** Practice happened: `gain` was just added to the skill. Records it for the apprenticeship, and teaches more within reach of the master. */
export function notePractice(world: World, p: Person, skill: SkillKey, gain: number): void {
  const t = p.trade;
  if (!t || t.kind !== skill || !active(world)) return;
  t.practised = world.tick;
  if (!t.master) return;
  const m = world.byId.get(t.master);
  if (!m || m.ent !== 'person' || !m.alive || hyp(m.x - p.x, m.y - p.y) > TEACH_REACH) return;
  p.skills[skill] = Math.min(SKILL_MAX, p.skills[skill] + gain * 0.5);
}

function bestSkill(p: Person): { kind: SkillKey; value: number; margin: number } {
  let best: SkillKey = 'forage';
  let second = -1;
  for (const k of Object.keys(p.skills) as SkillKey[]) {
    if (p.skills[k] > p.skills[best]) {
      second = p.skills[best];
      best = k;
    } else if (p.skills[k] > second) second = p.skills[k];
  }
  return { kind: best, value: p.skills[best], margin: p.skills[best] - second };
}

/** Twice a day per person: take up a trade, graduate from or let lapse an apprenticeship. */
export function tradesTick(world: World, p: Person): void {
  if (!active(world) || (world.tick + p.id * 37) % (DAY / 2) !== 0) return;
  const stage = stageOf(world, p);
  if (stage === 'child') return;
  const t = p.trade;
  if (!t) {
    if (stage === 'youth') return;
    const b = bestSkill(p);
    if (b.value < TRADE_AT || b.margin < TRADE_MARGIN) return;
    p.trade = { kind: b.kind, since: world.tick, master: 0, practised: world.tick, how: 'by their own hand' };
    addEvent(world, 'work', `${p.name} has taken up the ${TRADE_NAME[b.kind]}'s trade.`, [p.id], p.x, p.y);
    addLog(world, p, 'work', `Took up the ${TRADE_NAME[b.kind]}'s trade: it is what I do best.`);
    return;
  }
  if (!t.master) return;
  const m = world.byId.get(t.master);
  const master = m && m.ent === 'person' && m.alive ? m : null;
  if (!master || p.skills[t.kind] >= master.skills[t.kind] * 0.9) {
    const why = master ? `as good as ${master.name} now` : 'the master is gone';
    t.master = 0;
    t.how = master ? `learned from ${master.name}` : t.how;
    addEvent(world, 'work', `${p.name} is a ${TRADE_NAME[t.kind]} in their own right (${why}).`, master ? [p.id, master.id] : [p.id], p.x, p.y);
    if (master) {
      adjustRel(p, master.id, world.tick, { aff: 4, trust: 3, note: `${master.name} taught me the ${TRADE_NAME[t.kind]}'s trade` });
      adjustRel(master, p.id, world.tick, { aff: 3, note: `taught ${p.name} my trade` });
      think(world, p, 'trade', 8, DAY * 2, 'a trade of my own');
    }
    return;
  }
  if (world.tick - t.practised > LAPSE_AFTER) {
    addEvent(world, 'work', `${p.name} has let the apprenticeship with ${master.name} lapse: other things pressed.`, [p.id, master.id], p.x, p.y);
    addLog(world, p, 'work', `Let my apprenticeship with ${master.name} lapse: I had other things to see to.`);
    adjustRel(master, p.id, world.tick, { aff: -2, note: `${p.name} gave up learning from me` });
    delete p.trade;
  }
}

/**
 * A job was finished by these people together. A tradesperson among them with no apprentice may offer to take on one who is
 * plainly less skilled; the offer is made or not by the master's nature, taken or not by the learner's, and both are recorded.
 */
export function onSharedWork(world: World, workers: Person[], skill: SkillKey): void {
  if (!active(world) || workers.length < 2) return;
  for (const m of workers) {
    const t = m.trade;
    if (!t || t.kind !== skill || t.master || m.skills[skill] < MASTER_AT) continue;
    if (world.persons.some((q) => q.alive && q.trade?.master === m.id)) continue;
    for (const l of workers) {
      if (l === m || l.trade || stageOf(world, l) === 'child' || m.skills[skill] - l.skills[skill] < MASTER_LEAD) continue;
      if ((m.cooldowns['offer_teach'] ?? 0) > world.tick) continue;
      const rel = m.relations[l.id];
      if ((rel?.affinity ?? 0) < -5) continue;
      if (hashUnit(m.id, l.id, world.tick >> 6) > 0.25 + 0.35 * m.traits.generosity) continue;
      m.cooldowns['offer_teach'] = world.tick + DAY;
      const lrel = l.relations[m.id];
      const pressed = l.needs.hunger < 30 || l.needs.thirst < 30 || l.needs.energy < 20;
      const takes = !pressed && (lrel?.affinity ?? 0) >= -5 && hashUnit(l.id, m.id, world.tick >> 6) < 0.45 + 0.4 * l.traits.curiosity;
      if (takes) {
        l.trade = { kind: skill, since: world.tick, master: m.id, practised: world.tick, how: `taken on by ${m.name}` };
        addEvent(world, 'work', `${m.name} has taken ${l.name} on as an apprentice ${TRADE_NAME[skill]}.`, [m.id, l.id], l.x, l.y);
        addLog(world, l, 'work', `${m.name} offered to teach me the ${TRADE_NAME[skill]}'s trade, and I took it up.`);
        addLog(world, m, 'work', `Took ${l.name} on as an apprentice.`);
        adjustRel(l, m.id, world.tick, { aff: 3, trust: 2, fam: 1, note: `${m.name} took me on as an apprentice` });
        adjustRel(m, l.id, world.tick, { aff: 2, fam: 1, note: `took ${l.name} on` });
        think(world, l, 'trade', 5, DAY, `learning a trade from ${m.name}`);
      } else {
        const why = pressed ? 'had other things to see to' : 'would rather not';
        addLog(world, l, 'work', `${m.name} offered to teach me the ${TRADE_NAME[skill]}'s trade; I ${why}.`);
        addLog(world, m, 'work', `Offered to teach ${l.name}; they ${why}.`);
        adjustRel(m, l.id, world.tick, { note: `${l.name} turned down my offer to teach them` });
      }
      return;
    }
  }
}

/** for the inspector: their trade in words, or null */
export function describeTrade(world: World, p: Person): string | null {
  const t = p.trade;
  if (!t) return null;
  if (t.master) {
    const m = world.byId.get(t.master);
    return `apprentice ${TRADE_NAME[t.kind]}${m && m.ent === 'person' ? ` under ${m.name}` : ''}`;
  }
  return `${TRADE_NAME[t.kind]} (${t.how})`;
}

export type { Trade };
