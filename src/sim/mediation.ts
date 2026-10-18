// Mediation after conflict (rich worlds only). A friend or kin of two people who have fallen out may step in: they go to the one
// holding the grievance and ask them to make it up. It may work (the grievance eases, or closes, and the other side's with
// it), make things worse (told to stay out of it: the grievance hardens a little and the would-be peacemaker is thought less
// of), or be turned away before it is said (someone who thinks little of the peacemaker will not hear it). The conversation is
// an ordinary one (social.ts, purpose 'mediate'); this module says who may try and what comes of it.
//
// An authored world never offers the option.
import { DAY } from './constants';
import { addEvent, addLog } from './events';
import { easeGrievance } from './grievance';
import { isRich, think } from './mood';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import type { Person, World } from './types';

/** liking this much, or kin, is close enough to step in */
const CLOSE_AT = 25;
/** the quarrel must have cooled this long first; and one try per quarrel per two days */
const COOL_FOR = 400;
export const TRY_AGAIN = 2 * DAY;

export type MediationOutcome = 'peace' | 'eased' | 'worse' | 'turned_away';

const close = (p: Person, q: Person): boolean => !!p.relations[q.id]?.kin || (p.relations[q.id]?.affinity ?? 0) >= CLOSE_AT;

/** the quarrels `p` could step into: the holder `a` sore at `b`, both close to `p`, known to `p` */
export function quarrelsFor(world: World, p: Person): { a: Person; b: Person; weight: number }[] {
  if (!isRich(world)) return [];
  const out: { a: Person; b: Person; weight: number }[] = [];
  for (const a of world.persons) {
    if (!a.alive || a === p || !close(p, a)) continue;
    for (const k in a.relations) {
      const g = a.relations[k as unknown as number].grievance;
      if (!g || world.tick < g.since + COOL_FOR) continue;
      const b = world.byId.get(Number(k));
      if (!b || b.ent !== 'person' || !b.alive || b === p || !close(p, b)) continue;
      // known to p: seen or heard of, or kin to either (family hears of everything)
      const known = !!p.relations[a.id]?.kin || !!p.relations[b.id]?.kin || (p.heard ?? []).some((r) => r.kind === 'quarrelsome' && (r.about === a.id || r.about === b.id) && r.tick >= g.since - DAY);
      if (!known) continue;
      if ((p.cooldowns['mediate' + a.id] ?? 0) > world.tick) continue;
      out.push({ a, b, weight: g.weight });
    }
  }
  return out;
}

/** Will `a` hear `c` out about `b` at all? */
export function hears(c: Person, a: Person): boolean {
  return (a.relations[c.id]?.affinity ?? 0) >= 5;
}

/** What comes of `c`'s word to `a` about `b`. */
export function mediate(world: World, c: Person, a: Person, b: Person): MediationOutcome {
  c.cooldowns['mediate' + a.id] = world.tick + TRY_AGAIN;
  const r = a.relations[b.id];
  const g = r?.grievance;
  if (!g) return 'eased';
  const trust = a.relations[c.id]?.trust ?? 0;
  const sev = Math.min(1, g.weight / 70);
  const p = Math.max(0.1, Math.min(0.9, 0.35 + 0.35 * (trust / 100) + 0.25 * a.traits.generosity - 0.3 * sev + (a.relations[c.id]?.kin ? 0.1 : 0)));
  const roll = hashUnit(a.id * 31 + c.id, b.id, world.tick >> 4);
  if (roll < p) {
    const closed = easeGrievance(world, a, b, 18 + 22 * (1 - sev), `${c.name}'s word`);
    // the other side hears that a is ready to let it go
    easeGrievance(world, b, a, 10, `${c.name} spoke for ${a.name}`);
    adjustRel(a, c.id, world.tick, { aff: 3, trust: 2, note: `${c.name} helped me see sense about ${b.name}` });
    adjustRel(b, c.id, world.tick, { aff: 2, note: `${c.name} spoke for me to ${a.name}` });
    think(world, c, 'peacemaker', 5, DAY, closed ? `made peace between ${a.name} and ${b.name}` : `softened ${a.name} toward ${b.name}`);
    if (closed) {
      addEvent(world, 'social', `${c.name} helped ${a.name} and ${b.name} make peace.`, [c.id, a.id, b.id], a.x, a.y);
      addLog(world, a, 'social', `${c.name} talked me round: ${b.name} and I are square.`);
      return 'peace';
    }
    addEvent(world, 'social', `${c.name} softened ${a.name} toward ${b.name}.`, [c.id, a.id, b.id], a.x, a.y);
    addLog(world, a, 'social', `${c.name} spoke up for ${b.name}. Perhaps.`);
    return 'eased';
  }
  if (roll > 0.82) {
    // told to stay out of it: it hardens, and the peacemaker is thought less of
    g.weight = Math.min(100, g.weight + 8);
    adjustRel(a, c.id, world.tick, { aff: -4, trust: -2, note: `${c.name} meddled between me and ${b.name}` });
    think(world, c, 'rebuffed', -4, DAY, `${a.name} told me to stay out of it`);
    addEvent(world, 'social', `${a.name} told ${c.name} to stay out of it with ${b.name}.`, [a.id, c.id], a.x, a.y);
    addLog(world, a, 'social', `Told ${c.name} to stay out of it between me and ${b.name}.`);
    addLog(world, c, 'social', `${a.name} told me to stay out of it.`);
    return 'worse';
  }
  adjustRel(a, c.id, world.tick, { aff: -1 });
  addLog(world, c, 'social', `Tried to talk ${a.name} round about ${b.name}; they would not have it.`);
  addLog(world, a, 'social', `${c.name} wanted me to make it up with ${b.name}. Not yet.`);
  return 'turned_away';
}
