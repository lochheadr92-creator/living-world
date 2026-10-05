import { newActivity, registerHandler } from './activities';
import { DAY, workRules } from './constants';
import { addEvent, addLog } from './events';
import { Scorer, addBlocked, addOption, beliefsByKind, dangerAt, eta, pen, spotNear } from './optutil';
import type { Ctx } from './optutil';

/**
 * Standing at a grave. Someone who has learned of a death (by sight, by finding the grave, or by being told) and was kin to the
 * person, or close to them (an affinity of 45 or more), goes to the grave and stands there for a little while: once. It is
 * what they do with the news, not a chore: it waits while anything presses (hunger, thirst, tiredness, the dark, wolves about),
 * is held back like any other discretionary trip if it would leave them too far from water, and lapses for good five days
 * after they learned of it. Whether they have been is written on the person (`visitedGraves`), so a loaded save knows.
 */
export const GRIEF_WINDOW = DAY * 5;
/** how long they stand there */
export const MOURN_TICKS = 10;
/** a grave further than this many ticks' walk is not gone to */
const MOURN_MAX_ETA = 700;

export function griefOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!workRules(world.settings.scene)) return;
  for (const b of beliefsByKind(p, ['grave'])) {
    if (!b.who) continue;
    if (p.visitedGraves?.[b.who] !== undefined) continue;
    const r = p.relations[b.who];
    if (!r || !(r.kin || r.affinity >= 45)) continue;
    const since = world.tick - b.learned;
    if (since > GRIEF_WINDOW) continue;
    const name = b.name ?? 'them';
    const label = `Stand at ${name}’s grave`;
    if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 45 || ctx.criticals.length) {
      addBlocked(ctx, 'mourn', label, b.id, 'something more pressing', 'grief');
      continue;
    }
    if (ctx.night) {
      addBlocked(ctx, 'mourn', label, b.id, 'it is night', 'grief');
      continue;
    }
    if (dangerAt(ctx, b.x, b.y) > 0.3) {
      addBlocked(ctx, 'mourn', label, b.id, 'wolves have been about there', 'grief');
      continue;
    }
    const e = eta(ctx, b.x, b.y);
    if (e > MOURN_MAX_ETA) {
      addBlocked(ctx, 'mourn', label, b.id, 'too far to go', 'grief');
      continue;
    }
    const spot = spotNear(world, p, b);
    if (!spot) continue;
    // a child, a partner or a close friend feels it most, and it is strongest just after they learned of it
    const closeness = r.kin ? 1 : Math.min(1, 0.6 + (r.affinity - 45) / 80);
    const fresh = Math.max(0.3, 1 - since / GRIEF_WINDOW);
    const sc = new Scorer().add(`${name} has died`, 12 + 16 * closeness * (0.4 + 0.6 * fresh)).add('walking', -pen(e));
    addOption(ctx, {
      kind: 'mourn',
      label,
      goal: `to be where ${name} is buried`,
      need: null,
      util: sc.total,
      parts: sc.parts,
      eta: e + MOURN_TICKS,
      key: `mourn:${b.who}`,
      targetId: b.id,
      tag: 'grief',
      make: () =>
        newActivity(world, p, {
          kind: 'mourn',
          label: `Standing at ${name}’s grave`,
          goal: `to be where ${name} is buried`,
          targetId: b.id,
          targetType: 'grave',
          tx: b.x,
          ty: b.y,
          spotX: spot.x,
          spotY: spot.y,
          utility: sc.total,
          minCommit: 30,
          maxTicks: 900,
          data: { who: b.who, name },
        }),
    });
  }
}

registerHandler('mourn', {
  availability: 0.4,
  pose: () => 'stand',
  begin(world, p, a) {
    if (!world.byId.has(a.targetId)) return 'the grave is gone';
    // (an interrupted visit that is picked up again is the same visit; one already made is not made twice)
    if (p.visitedGraves?.[a.data.who as number] !== undefined) return 'I have already stood there';
    a.duration = MOURN_TICKS;
  },
  work(world, p, a) {
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    const who = a.data.who as number;
    const name = a.data.name as string;
    (p.visitedGraves ??= {})[who] = world.tick;
    p.needs.social = Math.min(100, p.needs.social + 10);
    addLog(world, p, 'life', `Stood at ${name}’s grave for a while.`);
    addEvent(world, 'life', `${p.name} stood at ${name}’s grave.`, [p.id], p.x, p.y);
    a.cycle = 1;
    return 'done';
  },
});
