import { DRIVE_BANDS, ENERGY_RATE, HUNGER_RATE, REST_RECOVER, SLEEP_RECOVER, SOCIAL_RATE, THIRST_RATE } from './constants';
import { nearLitFire } from './perception';
import { stageOf } from './people';
import type { NeedKey, Person, World } from './types';
import { clamp } from './util';

/** 0..100 pressure a need puts on decisions (0 = comfortable). */
export function drive(level: number, key: NeedKey): number {
  const [t1, t2] = DRIVE_BANDS[key];
  if (level >= t1) return 0;
  if (level >= t2) return (60 * (t1 - level)) / (t1 - t2);
  return 60 + (40 * (t2 - Math.max(0, level))) / t2;
}

export interface Shelter {
  /** warmth bonus in degrees */
  bonus: number;
  /** 0..1 protection against rain/wind */
  cover: number;
  kind: 'none' | 'lean_to' | 'hut';
}

/** Cover at a position: huts keep rain and cold out, lean-tos help a bit. Poorly kept buildings protect less. */
export function shelterAt(world: World, x: number, y: number): Shelter {
  let bonus = 0;
  let cover = 0;
  let kind: Shelter['kind'] = 'none';
  for (const b of world.buildings) {
    if (b.type === 'hut' || b.type === 'house' || b.type === 'hall') {
      const d = Math.hypot(x - (b.x + b.w / 2), y - (b.y + b.h / 2));
      if (d < (b.type === 'hall' ? 3.2 : 2.4)) {
        const q = b.condition < 30 ? 0.5 : 1;
        const base = b.type === 'house' ? 14 : b.type === 'hall' ? 9 : 10;
        if (base * q > bonus) {
          bonus = base * q;
          cover = (b.type === 'hall' ? 0.85 : 1) * q;
          kind = 'hut';
        }
      }
    } else if (b.type === 'lean_to') {
      const d = Math.hypot(x - (b.x + 0.5), y - (b.y + 0.5));
      if (d < 1.9) {
        const q = b.condition < 30 ? 0.5 : 1;
        if (5 * q > bonus) {
          bonus = 5 * q;
          cover = 0.55 * q;
          kind = 'lean_to';
        }
      }
    }
  }
  return { bonus, cover, kind };
}

export function fireWarmth(world: World, x: number, y: number): number {
  const f = nearLitFire(world, x, y, 4.6);
  if (!f) return 0;
  const d = Math.hypot(f.x + 0.5 - x, f.y + 0.5 - y);
  return 9 * (1 - d / 4.8);
}

function isHeavyWork(kind: string): boolean {
  return kind === 'gather' || kind === 'build' || kind === 'till' || kind === 'harvest' || kind === 'repair' || kind === 'haul' || kind === 'craft';
}

export function updateNeeds(world: World, p: Person): void {
  const n = p.needs;
  const stage = stageOf(world, p);
  const a = p.activity;
  const sleeping = p.pose === 'sleep';
  const resting = p.pose === 'sit' && (!a || a.kind === 'rest' || a.kind === 'warm');
  const heavy = !!a && a.phase === 'work' && isHeavyWork(a.kind);
  const running = p.pose === 'run';
  const w = world.weather;

  // hunger / thirst
  const kidMul = (stage === 'child' ? 0.85 : 1) * (world.settings.harsh ? 1.18 : 1);
  n.hunger -= HUNGER_RATE * kidMul * (sleeping ? 0.55 : heavy ? 1.25 : running ? 1.3 : 1);
  const heat = Math.max(0, w.temp - 19) * 0.04;
  n.thirst -= THIRST_RATE * kidMul * (sleeping ? 0.6 : heavy ? 1.3 : running ? 1.4 : 1) * (1 + heat);

  // warmth
  const sh = shelterAt(world, p.x, p.y);
  const fire = fireWarmth(world, p.x, p.y);
  const wet = w.rain * 3.6 * (1 - sh.cover);
  const eff = w.temp + 2 + sh.bonus + fire - wet;
  const target = clamp(50 + (eff - 10) * 5, 0, 100);
  n.warmth += (target - n.warmth) * 0.006;

  // energy
  if (sleeping) {
    const comfort = 0.72 + 0.28 * sh.cover + (fire > 0 ? 0.08 : 0);
    n.energy += SLEEP_RECOVER * comfort * (0.7 + 0.3 * clamp(n.warmth / 60, 0, 1));
  } else if (resting) {
    n.energy += REST_RECOVER;
  } else {
    n.energy -= ENERGY_RATE * (heavy ? 1.35 : running ? 1.5 : 1) * (stage === 'child' ? 0.8 : stage === 'elder' ? 1.15 : 1);
  }

  // safety
  let safetyTarget = 84;
  const hurtRecently = world.tick - (p.cooldowns.hurt ?? -9999) < 700;
  let nearThreat = 99;
  for (const s of p.seen) if (s.ent === 'animal') nearThreat = Math.min(nearThreat, Math.hypot(s.x - p.x, s.y - p.y));
  if (nearThreat < 14) safetyTarget -= 70 * (1 - nearThreat / 14);
  for (const id of p.bykind.danger ?? []) {
    const b = p.beliefs[id];
    if (b.amount > 0 && world.tick - b.seen < 500) {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < 14) safetyTarget -= 22 * (1 - d / 14) * (0.6 + 0.8 * p.traits.caution);
    }
  }
  if (hurtRecently) safetyTarget -= 22;
  if (world.light < 0.3) {
    let companions = 0;
    for (const s of p.seen) if (s.ent === 'person' && Math.hypot(s.x - p.x, s.y - p.y) < 5) companions++;
    if (!fire && sh.kind !== 'hut') safetyTarget -= (companions >= 2 ? 6 : 18) * (0.6 + 0.8 * p.traits.caution);
  }
  if (w.storm > 0.5 && sh.cover < 0.5) safetyTarget -= 24 * (0.6 + 0.8 * p.traits.caution);
  if (fire > 0) safetyTarget += 8;
  if (sh.kind === 'hut') safetyTarget += 10;
  safetyTarget = clamp(safetyTarget, 0, 100);
  n.safety += (safetyTarget - n.safety) * (safetyTarget < n.safety ? 0.08 : 0.02);

  // social
  n.social -= SOCIAL_RATE * (0.55 + 0.9 * p.traits.sociability) * (sleeping ? 0.3 : 1);
  if (!sleeping) {
    let near = 0;
    for (const s of p.seen) {
      if (s.ent !== 'person') continue;
      if (Math.hypot(s.x - p.x, s.y - p.y) < 4.5) near++;
    }
    if (near > 0) n.social += 0.0035 * Math.min(near, 3);
  }

  n.hunger = clamp(n.hunger, 0, 100);
  n.thirst = clamp(n.thirst, 0, 100);
  n.energy = clamp(n.energy, 0, 100);
  n.warmth = clamp(n.warmth, 0, 100);
  n.safety = clamp(n.safety, 0, 100);
  n.social = clamp(n.social, 0, 100);

  // health
  let dh = 0;
  if (n.hunger <= 0) dh -= 0.022;
  if (n.thirst <= 0) dh -= 0.05;
  if (n.warmth <= 6) dh -= 0.035;
  if (n.energy <= 0) dh -= 0.01;
  if (dh === 0 && n.hunger > 40 && n.thirst > 40 && n.warmth > 35) dh = sleeping ? 0.03 : resting ? 0.02 : 0.009;
  p.health = clamp(p.health + dh, 0, 100);
}

/** Single number for UI: how well is this person doing right now? */
export function moodOf(p: Person): number {
  const n = p.needs;
  const worst = Math.min(n.hunger, n.thirst, n.energy, n.warmth, n.safety);
  const avg = (n.hunger + n.thirst + n.energy + n.warmth + n.safety + n.social) / 6;
  return clamp(avg * 0.6 + worst * 0.4, 0, 100);
}
