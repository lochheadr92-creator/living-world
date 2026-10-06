import { addEvent, addFx, addLog } from './events';
import { DAY, SPEAR_USE_TICKS, isSolidHome } from './constants';
import { nearLitFire } from './perception';
import { isWalkable, newId, personById, registerGeneric } from './registry';
import { findPath } from './pathfinding';
import { stageOf } from './people';
import { toolOf, wearTool } from './tools';
import type { Animal, Person, Tool, World } from './types';
import { T } from './types';
import { turnToward } from './util';

export function makeWolf(world: World, x: number, y: number): Animal {
  const a: Animal = {
    ent: 'animal',
    id: newId(world),
    type: 'wolf',
    x,
    y,
    px: x,
    py: y,
    heading: 0,
    pheading: 0,
    state: 'roam',
    targetId: 0,
    denX: x,
    denY: y,
    cooldown: 0,
    until: 0,
    wanderX: x,
    wanderY: y,
    health: 100,
    stuck: 0,
    lastX: x,
    lastY: y,
    path: [],
    pi: 0,
    pathAt: -999,
    pathGoalX: x,
    pathGoalY: y,
  };
  registerGeneric(world, a);
  return a;
}

function wolfWalkable(world: World, x: number, y: number): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (!isWalkable(world, tx, ty)) return false;
  return world.terrain[ty * world.W + tx] !== T.SHALLOW;
}

/** Walk toward a point along an A* route (wolves must get through woodland like anyone else). */
function moveWolf(world: World, a: Animal, tx: number, ty: number, speed: number): void {
  const far = Math.hypot(tx - a.x, ty - a.y);
  if (far < 1.2) {
    steer(world, a, tx, ty, speed);
    return;
  }
  const goalMoved = Math.hypot(a.pathGoalX - tx, a.pathGoalY - ty) > 2.2;
  if (a.pi >= a.path.length || goalMoved || world.tick - a.pathAt > 90) {
    a.pathAt = world.tick;
    a.pathGoalX = tx;
    a.pathGoalY = ty;
    const path = findPath(world, a.x, a.y, tx, ty, { maxNodes: 2600 });
    a.path = path ?? [];
    a.pi = 0;
    if (!path) {
      steer(world, a, tx, ty, speed);
      return;
    }
  }
  let remaining = speed;
  while (remaining > 1e-6 && a.pi < a.path.length) {
    const wx = a.path[a.pi];
    const wy = a.path[a.pi + 1];
    const dx = wx - a.x;
    const dy = wy - a.y;
    const d = Math.hypot(dx, dy);
    if (d > 1e-6) a.heading = turnToward(a.heading, Math.atan2(dy, dx), 0.3);
    if (d <= remaining) {
      a.x = wx;
      a.y = wy;
      remaining -= d;
      a.pi += 2;
    } else {
      a.x += (dx / d) * remaining;
      a.y += (dy / d) * remaining;
      remaining = 0;
    }
  }
}

function steer(world: World, a: Animal, tx: number, ty: number, speed: number): void {
  const want = Math.atan2(ty - a.y, tx - a.x);
  const offs = [0, 0.55, -0.55, 1.1, -1.1, 1.75, -1.75];
  for (const o of offs) {
    const h = want + o;
    const nx = a.x + Math.cos(h) * speed;
    const ny = a.y + Math.sin(h) * speed;
    if (wolfWalkable(world, nx, ny)) {
      a.heading = turnToward(a.heading, h, 0.3);
      a.x = nx;
      a.y = ny;
      return;
    }
  }
}

/**
 * The spear a grown person is carrying and could use now: they are awake, not a child or an elder, and it is sound.
 * To a wolf such a person counts as two (wolves keep away from groups, and a spear is worth a second pair of hands).
 * Nothing about this draws a random number, so a world in which nobody has a spear plays out exactly as it did.
 */
export function spearOf(world: World, p: Person): Tool | null {
  if (!p.alive || p.pose === 'sleep' || (p.inv.spear ?? 0) < 1 || stageOf(world, p) !== 'adult') return null;
  return toolOf(world, p, 'spear');
}

/** How much a person has had to run from wolves lately (halving each day; a bite counts double): two frights in a day or so is enough to want a spear. */
export function wolfScare(world: World, p: Person): number {
  const at = p.cooldowns.scareAt;
  if (at === undefined) return 0;
  return (p.cooldowns.scare ?? 0) * Math.pow(0.5, (world.tick - at) / DAY);
}

/** a run from a wolf that goes on, or is begun again a moment later, is one fright and not several */
const FRIGHT_GAP = 300;

export function noteScare(world: World, p: Person, amount = 1): void {
  if (amount < 2 && world.tick - (p.cooldowns.scareAt ?? -1e9) < FRIGHT_GAP) return;
  p.cooldowns.scare = wolfScare(world, p) + amount;
  p.cooldowns.scareAt = world.tick;
}

export function safeFromWolf(world: World, t: Person, spears = false): boolean {
  let others = 0;
  for (const q of world.persons) {
    if (!q.alive || Math.hypot(q.x - t.x, q.y - t.y) >= 5) continue;
    if (q !== t) others++;
    if (spears && spearOf(world, q)) others++;
  }
  if (others >= 2) return true;
  if (nearLitFire(world, t.x, t.y, 6)) return true;
  for (const b of world.buildings) {
    if (isSolidHome(b.type) && Math.hypot(t.x - (b.x + b.w / 2), t.y - (b.y + b.h / 2)) < 2.8) return true;
  }
  return false;
}

function pickPrey(world: World, a: Animal, night: boolean): Person | null {
  const range = night ? 17 : 9;
  const chance = night ? 0.22 : 0.03;
  if (world.rng.next() > chance) return null;
  let best: Person | null = null;
  let bd = range;
  for (const p of world.persons) {
    if (!p.alive) continue;
    const d = Math.hypot(p.x - a.x, p.y - a.y);
    if (d >= bd) continue;
    if (safeFromWolf(world, p, true)) continue;
    bd = d;
    best = p;
  }
  return best;
}

function scared(world: World, a: Animal, spears = false): boolean {
  let n = 0;
  for (const p of world.persons) if (p.alive && Math.hypot(p.x - a.x, p.y - a.y) < 4.5) n += spears && spearOf(world, p) ? 2 : 1;
  return n >= 2;
}

/** The wolf backed off because of a spear (it would have come on otherwise): the spear is worn a little, and the feed says so. */
function creditSpear(world: World, a: Animal): void {
  let best: Person | null = null;
  let bd = 6;
  for (const q of world.persons) {
    if (!spearOf(world, q)) continue;
    const d = Math.hypot(q.x - a.x, q.y - a.y);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  if (!best) return;
  const spear = spearOf(world, best);
  addEvent(world, 'danger', `${best.name} turned a wolf away with a spear.`, [best.id], best.x, best.y);
  addLog(world, best, 'danger', `A wolf came for us and backed off from my spear near (${Math.round(best.x)}, ${Math.round(best.y)}).`);
  addFx(world, 'sparkle', best.x, best.y, 0);
  wearTool(world, spear, SPEAR_USE_TICKS);
}

function newWander(world: World, a: Animal): void {
  // after dark wolves range farther, toward the edge of the settlement (never into the firelight)
  const night = world.light < 0.3;
  const prowl = night && world.rng.next() < 0.5;
  for (let i = 0; i < 8; i++) {
    let x: number;
    let y: number;
    if (prowl) {
      const dx = world.camp.x - a.denX;
      const dy = world.camp.y - a.denY;
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.max(0, d - 17 - world.rng.next() * 5);
      const k = reach / d;
      x = a.denX + dx * k + (world.rng.next() - 0.5) * 8;
      y = a.denY + dy * k + (world.rng.next() - 0.5) * 8;
    } else {
      const ang = world.rng.next() * Math.PI * 2;
      const r = 2 + world.rng.next() * 8;
      x = a.denX + Math.cos(ang) * r;
      y = a.denY + Math.sin(ang) * r;
    }
    if (wolfWalkable(world, x, y)) {
      a.wanderX = x;
      a.wanderY = y;
      break;
    }
  }
  a.until = world.tick + 100 + world.rng.int(180);
}

function bite(world: World, a: Animal, t: Person): void {
  let dmg = 7 + world.rng.int(8);
  if (stageOf(world, t) === 'child') dmg *= 1.4;
  if (t.pose === 'sleep') dmg *= 1.2;
  t.health = Math.max(0, t.health - dmg);
  t.needs.safety = Math.max(0, t.needs.safety - 50);
  t.cooldowns.hurt = world.tick;
  noteScare(world, t, 2);
  t.nextThink = world.tick;
  a.cooldown = 32;
  addFx(world, 'bite', t.x, t.y, 0);
  addEvent(world, 'danger', `A wolf bit ${t.name}${t.health <= 0 ? ' fatally' : ''}.`, [t.id], t.x, t.y);
  addLog(world, t, 'danger', `A wolf attacked me near (${Math.round(t.x)}, ${Math.round(t.y)}).`);
  if (t.health <= 0) {
    t.deathCause = 'wolf attack';
  }
}

export function updateWildlife(world: World): void {
  const night = world.light < 0.3;
  for (const a of world.animals) {
    if (a.cooldown > 0) a.cooldown--;
    // stuck detection
    if ((world.tick + a.id) % 20 === 0) {
      if (Math.hypot(a.x - a.lastX, a.y - a.lastY) < 0.25) a.stuck++;
      else a.stuck = 0;
      a.lastX = a.x;
      a.lastY = a.y;
      const homeAlready = a.state === 'retreat' && Math.hypot(a.denX - a.x, a.denY - a.y) < 3;
      if (homeAlready) a.stuck = 0;
      if (a.stuck >= 3) {
        a.stuck = 0;
        a.path = [];
        a.pi = 0;
        if (a.state === 'roam') newWander(world, a); // blocked: choose somewhere else to go
        else if (a.state === 'stalk') {
          a.state = 'retreat';
          a.until = world.tick + 80;
        }
      }
    }
    switch (a.state) {
      case 'roam': {
        if (world.tick >= a.until || Math.hypot(a.wanderX - a.x, a.wanderY - a.y) < 0.6) newWander(world, a);
        moveWolf(world, a, a.wanderX, a.wanderY, 0.045);
        if ((world.tick + a.id) % 8 === 0) {
          const prey = pickPrey(world, a, night);
          if (prey) {
            a.state = 'stalk';
            a.targetId = prey.id;
            a.until = world.tick + 520;
          }
        }
        break;
      }
      case 'stalk': {
        const t = personById(world, a.targetId);
        if (!t || !t.alive) {
          a.state = 'retreat';
          a.until = world.tick + 150;
          break;
        }
        const d = Math.hypot(t.x - a.x, t.y - a.y);
        if ((world.tick + a.id) % 8 === 0) {
          const spooked = scared(world, a) || safeFromWolf(world, t);
          // a spear in the company may be what tips it: then it gets the credit (and the wear)
          const speared = !spooked && (scared(world, a, true) || safeFromWolf(world, t, true));
          if (spooked || speared) {
            if (speared) creditSpear(world, a);
            a.state = 'retreat';
            a.until = world.tick + 240;
            break;
          }
        }
        if (d > 19 || world.tick > a.until) {
          a.state = 'retreat';
          a.until = world.tick + 200;
          break;
        }
        moveWolf(world, a, t.x, t.y, d < 6 ? 0.15 : 0.1);
        if (d <= 1.2 && a.cooldown === 0) {
          bite(world, a, t);
          if (t.health > 0 && t.health < 40 && !safeFromWolf(world, t) && t.pose !== 'run') {
            a.cooldown = 30; // keep at it while the target is helpless
          } else {
            a.state = 'retreat';
            a.until = world.tick + 160 + world.rng.int(120);
          }
        }
        break;
      }
      case 'retreat': {
        moveWolf(world, a, a.denX, a.denY, 0.12);
        if (world.tick >= a.until && Math.hypot(a.denX - a.x, a.denY - a.y) < 3) {
          a.state = 'roam';
          newWander(world, a);
        }
        if (world.tick >= a.until + 400) {
          a.state = 'roam';
          newWander(world, a);
        }
        break;
      }
      default:
        a.state = 'roam';
    }
  }
}
