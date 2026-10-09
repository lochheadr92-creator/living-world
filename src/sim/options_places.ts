// Going to the grave of someone they loved (rich dynamics only: only people with a place of grief have the option; see places.ts).
import { registerHandler, newActivity } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { addLog } from './events';
import { think } from './mood';
import { Scorer, addOption, eta, pen } from './optutil';
import type { Ctx } from './optutil';
import { holdOf, placeEffectsOn } from './places';
import { isWalkable } from './registry';
import type { Person, PlaceMemory, World } from './types';

/** how long after a visit before the wish to go again returns */
const VISIT_GAP = DAY;

function graveOf(p: Person, about: number): PlaceMemory | undefined {
  return p.places?.find((m) => m.kind === 'grief' && m.about === about);
}

/** a walkable tile beside the grave to stand on */
function standBy(world: World, x: number, y: number): { x: number; y: number } | null {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    if (isWalkable(world, gx + dx, gy + dy)) return { x: gx + dx + 0.5, y: gy + dy + 0.5 };
  }
  return null;
}

export function placeOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!p.places || !placeEffectsOn() || ctx.critical || ctx.night) return;
  for (const m of p.places) {
    if (m.kind !== 'grief' || (m.visited && world.tick - m.visited < VISIT_GAP)) continue;
    const hold = holdOf(world, m);
    if (hold < 0.15) continue;
    const e = eta(ctx, m.x, m.y);
    const name = m.why.replace(/^where /, '').replace(/ is buried$/, '');
    const sc = new Scorer().add('misses them', 4 + 16 * hold).add('walking', -pen(e));
    if (sc.total <= 0) continue;
    addOption(ctx, {
      kind: 'pay_respects',
      label: `Visit ${name}'s grave`,
      goal: `to remember ${name}`,
      need: null,
      util: sc.total,
      parts: sc.parts,
      eta: e + 50,
      key: `pay_respects:${m.about}`,
      targetId: 0,
      tag: 'social',
      make: () => {
        const spot = standBy(world, m.x, m.y);
        if (!spot) return null;
        const a = newActivity(world, p, { kind: 'pay_respects', label: `Visiting ${name}'s grave`, goal: `to remember ${name}`, tx: m.x, ty: m.y, spotX: spot.x, spotY: spot.y, utility: sc.total, duration: 50, maxTicks: 700 });
        a.data.about = m.about;
        a.data.name = name;
        return a;
      },
    });
  }
}

registerHandler('pay_respects', {
  availability: 0.2,
  pose: () => 'stand',
  work(world, p, a): WorkResult {
    a.progress++;
    return a.progress >= a.duration ? 'done' : 'continue';
  },
  onEnd(world, p, a, outcome) {
    if (outcome !== 'success') return;
    const about = a.data.about ?? 0;
    const m = graveOf(p, about);
    if (m) m.visited = Math.max(1, world.tick); // 0 means never
    // the loss fades sooner for having been faced
    const lost = p.mood?.thoughts.find((t) => t.kind === 'lost:' + about);
    if (lost && lost.until > world.tick) lost.until = world.tick + Math.round((lost.until - world.tick) * 0.7);
    think(world, p, 'respects:' + about, 5, DAY / 2, `paid respects at ${a.data.name}'s grave`);
    addLog(world, p, 'life', `Stood a while at ${a.data.name}'s grave.`);
  },
});
