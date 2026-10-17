// Apprenticeship (rich worlds only), on top of the trade a person settles on for themselves (trade.ts). A tradesperson who has
// just finished a job alongside someone plainly less skilled at it may offer to take them on; the learner may accept or refuse
// by their own nature and needs, and lets it lapse by not practising, because other things pressed. While it lasts, practice
// within sight of the master teaches half as much again (skill still grows only where work is done; this only changes how much
// one piece of work teaches); when the apprentice's hand is nearly as good as the master's, they have a trade of their own,
// learned from the master, and a bond with them. The lab's `rich-no-trades` (trade.ts setTrades) removes this with the trade.
//
// An authored world never creates `p.apprentice`, so its saves and fingerprints are untouched.
import { DAY, SKILL_MAX } from './constants';
import { addEvent, addLog } from './events';
import { isRich, think } from './mood';
import { stageOf } from './people';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import { tradeWord, tradesOn } from './trade';
import type { Apprenticeship, Person, SkillKey, World } from './types';
import { hyp } from './util';

/** a master must be this good, and this much better than the learner */
const MASTER_AT = 1.2;
const MASTER_LEAD = 0.15;
/** an apprentice who has not practised for this long has let it lapse */
const LAPSE_AFTER = 5 * DAY;
/** within this distance of the master, practice teaches half as much again */
const TEACH_REACH = 10;

const active = (world: World): boolean => tradesOn() && isRich(world);

/** Practice happened: `gain` was just added to the skill. Records it for the apprenticeship, and teaches more within reach of the master. */
export function notePractice(world: World, p: Person, skill: SkillKey, gain: number): void {
  const a = p.apprentice;
  if (!a || a.key !== skill || !active(world)) return;
  a.practised = world.tick;
  const m = world.byId.get(a.master);
  if (!m || m.ent !== 'person' || !m.alive || hyp(m.x - p.x, m.y - p.y) > TEACH_REACH) return;
  p.skills[skill] = Math.min(SKILL_MAX, p.skills[skill] + gain * 0.5);
}

/** Twice a day per apprentice: graduate when nearly as good as the master (or the master is gone), or let it lapse. */
export function apprenticeTick(world: World, p: Person): void {
  const a = p.apprentice;
  if (!a || !active(world) || (world.tick + p.id * 37) % (DAY / 2) !== 0) return;
  const m = world.byId.get(a.master);
  const master = m && m.ent === 'person' && m.alive ? m : null;
  if (!master || p.skills[a.key] >= master.skills[a.key] * 0.9) {
    const why = master ? `as good as ${master.name} now` : 'the master is gone';
    delete p.apprentice;
    if (!p.trade) p.trade = { key: a.key, since: world.tick, why: master ? `learned from ${master.name}` : `learned the ${tradeWord(a.key)}` };
    addEvent(world, 'work', `${p.name} is a ${tradeWord(a.key)} hand in their own right (${why}).`, master ? [p.id, master.id] : [p.id], p.x, p.y);
    if (master) {
      adjustRel(p, master.id, world.tick, { aff: 4, trust: 3, note: `${master.name} taught me ${tradeWord(a.key)}` });
      adjustRel(master, p.id, world.tick, { aff: 3, note: `taught ${p.name} my trade` });
      think(world, p, 'trade', 8, DAY * 2, 'a trade of my own');
    }
    return;
  }
  if (world.tick - a.practised > LAPSE_AFTER) {
    addEvent(world, 'work', `${p.name} has let the apprenticeship with ${master.name} lapse: other things pressed.`, [p.id, master.id], p.x, p.y);
    addLog(world, p, 'work', `Let my apprenticeship with ${master.name} lapse: I had other things to see to.`);
    adjustRel(master, p.id, world.tick, { aff: -2, note: `${p.name} gave up learning from me` });
    delete p.apprentice;
  }
}

/**
 * A job was finished by these people together. A tradesperson among them with no apprentice may offer to take on one who is
 * plainly less skilled; the offer is made or not by the master's nature, taken or not by the learner's, and both are recorded.
 */
export function onSharedWork(world: World, workers: Person[], skill: SkillKey): void {
  if (!active(world) || workers.length < 2) return;
  for (const m of workers) {
    if (!m.trade || m.trade.key !== skill || m.apprentice || m.skills[skill] < MASTER_AT) continue;
    if (world.persons.some((q) => q.alive && q.apprentice?.master === m.id)) continue;
    for (const l of workers) {
      if (l === m || l.apprentice || stageOf(world, l) === 'child' || m.skills[skill] - l.skills[skill] < MASTER_LEAD) continue;
      if ((m.cooldowns['offer_teach'] ?? 0) > world.tick) continue;
      const rel = m.relations[l.id];
      if ((rel?.affinity ?? 0) < -5) continue;
      if (hashUnit(m.id, l.id, world.tick >> 6) > 0.25 + 0.35 * m.traits.generosity) continue;
      m.cooldowns['offer_teach'] = world.tick + DAY;
      const lrel = l.relations[m.id];
      const pressed = l.needs.hunger < 30 || l.needs.thirst < 30 || l.needs.energy < 20;
      const takes = !pressed && (lrel?.affinity ?? 0) >= -5 && hashUnit(l.id, m.id, world.tick >> 6) < 0.45 + 0.4 * l.traits.curiosity;
      const word = tradeWord(skill);
      if (takes) {
        l.apprentice = { master: m.id, key: skill, since: world.tick, practised: world.tick };
        addEvent(world, 'work', `${m.name} has taken ${l.name} on as an apprentice at ${word}.`, [m.id, l.id], l.x, l.y);
        addLog(world, l, 'work', `${m.name} offered to teach me ${word}, and I took it up.`);
        addLog(world, m, 'work', `Took ${l.name} on as an apprentice.`);
        adjustRel(l, m.id, world.tick, { aff: 3, trust: 2, fam: 1, note: `${m.name} took me on as an apprentice` });
        adjustRel(m, l.id, world.tick, { aff: 2, fam: 1, note: `took ${l.name} on` });
        think(world, l, 'trade', 5, DAY, `learning ${word} from ${m.name}`);
      } else {
        const why = pressed ? 'had other things to see to' : 'would rather not';
        addLog(world, l, 'work', `${m.name} offered to teach me ${word}; I ${why}.`);
        addLog(world, m, 'work', `Offered to teach ${l.name}; they ${why}.`);
        adjustRel(m, l.id, world.tick, { note: `${l.name} turned down my offer to teach them` });
      }
      return;
    }
  }
}

/** for the inspector: the apprenticeship in words, or '' */
export function describeApprentice(world: World, p: Person): string {
  const a = p.apprentice;
  if (!a) return '';
  const m = world.byId.get(a.master);
  return `apprentice at ${tradeWord(a.key)}${m && m.ent === 'person' ? ` under ${m.name}` : ''}`;
}

export type { Apprenticeship };
