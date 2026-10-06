// People and wolves are drawn procedurally from a tiny rig (hips, shoulders, head, hands, feet) that is
// projected into isometric space. Animation phases come from simulation state (distance walked, progress
// through the current task), so they freeze when the world is paused and never affect the simulation.
import { angleDiff, clamp, smoothstep } from '../sim/util';
import { weightOf } from '../sim/economy';
import { ageYears, carryCap, stageOf } from '../sim/people';
import { hashUnit } from '../sim/rng';
import type { Animal, ItemKind, Person, PoseKind, World } from '../sim/types';
import { HAND_U, HAND_V, HAND_Z } from './carts';
import { orientedBox } from './iso3d';
import { HAIR, HOUSEHOLD_COLORS, PANTS, SHIRT, SKIN } from './palette';
import { shade } from './sprites';

type V3 = readonly [number, number, number];

// rig layout ------------------------------------------------------------------
const R = {
  LEAN: 0, // shoulders forward of hips (tiles)
  CROUCH: 1, // hips lowered (px)
  BOB: 2, // vertical bounce (px)
  HEAD_U: 3, // head forward (tiles)
  HEAD_Z: 4, // head height change (px)
  HLU: 5, HLV: 6, HLZ: 7, // left hand
  HRU: 8, HRV: 9, HRZ: 10, // right hand
  FLU: 11, FLV: 12, FLL: 13, // left foot (lift = height off the ground, px)
  FRU: 14, FRV: 15, FRL: 16, // right foot
  LIE: 17, // 0 standing .. 1 lying down
  SIT: 18, // 0 .. 1 seated
  MOUTH: 19,
  EYES: 20, // 1 open, 0 closed
  TOOL: 21, // tool angle (radians, 0 = pointing forward, +up)
  TOOLON: 22, // 1 if holding a tool in the right hand
  PH: 23, // 0..1 phase of the work cycle (for props that move with it)
  N: 24,
} as const;

type Rig = Float32Array;

const newRig = (): Rig => new Float32Array(R.N);

interface RigState {
  x: number;
  y: number;
  phase: number;
  moved: number;
  pose: PoseKind;
  poseT0: number;
  from: Rig;
  cur: Rig;
  simT: number;
  talkT: number;
  /** eased 0..1: arms full of bricks, clay or bread / a jar balanced on the head */
  carry: number;
  jar: number;
  carryT: number;
}

const ease = (t: number) => t * t * (3 - 2 * t);

/** the tool kind drawn in the right hand for a pose: 1 axe / pick / hoe, 2 rod, 3 hammer, 4 saw, 5 spade, 6 sledge, 7 bread peel */
const TOOL_OF: Partial<Record<PoseKind, number>> = { chop: 1, mine: 1, till: 1, fish: 2, build: 3, craft: 3, hammer: 3, saw: 4, dig: 5, forge: 6, bake: 7 };

function lerpRig(a: Rig, b: Rig, t: number, out: Rig): void {
  for (let i = 0; i < R.N; i++) out[i] = a[i] + (b[i] - a[i]) * t;
}

function setBase(r: Rig): void {
  r.fill(0);
  r[R.HLV] = 0.115;
  r[R.HRV] = -0.115;
  r[R.HLZ] = 11;
  r[R.HRZ] = 11;
  r[R.FLV] = 0.07;
  r[R.FRV] = -0.07;
  r[R.EYES] = 1;
}

/** activity progress 0..1 within the current repeated cycle, smoothly interpolated between ticks */
function cycleOf(p: Person, alphaT: number, cycleTicks: number): number {
  const a = p.activity;
  if (!a) return 0;
  let prog = a.progress;
  if (a.progress >= a.pprogress) prog = a.pprogress + (a.progress - a.pprogress) * alphaT;
  return ((prog / cycleTicks) % 1 + 1) % 1;
}

interface PoseCtx {
  t: number;
  alphaT: number;
  walk: number; // 0..1 walk-cycle phase
  speed: number; // 0..1 how fast they are moving
  p: Person;
  speaking: boolean;
  stage: string;
  /** distance covered since the last frame (tiles) */
  moved: number;
}

function poseRig(pose: PoseKind, c: PoseCtx, r: Rig): void {
  setBase(r);
  const { t, p } = c;
  const pr = (n: number) => cycleOf(p, c.alphaT, n);
  const breathe = Math.sin(t * 2.1 + p.id) * 0.25;
  r[R.BOB] = breathe;
  switch (pose) {
    case 'walk':
    case 'run': {
      const run = pose === 'run';
      const s = Math.sin(c.walk * Math.PI * 2);
      const co = Math.cos(c.walk * Math.PI * 2);
      const stride = run ? 0.3 : 0.2;
      r[R.FLU] = s * stride;
      r[R.FRU] = -s * stride;
      r[R.FLL] = Math.max(0, co) * (run ? 4 : 2.4);
      r[R.FRL] = Math.max(0, -co) * (run ? 4 : 2.4);
      r[R.HLU] = -s * (run ? 0.22 : 0.15);
      r[R.HRU] = s * (run ? 0.22 : 0.15);
      r[R.HLZ] = run ? 15 : 11.5;
      r[R.HRZ] = run ? 15 : 11.5;
      r[R.BOB] = Math.abs(s) * (run ? 1.7 : 0.9);
      r[R.LEAN] = run ? 0.1 : 0.025;
      break;
    }
    case 'pick':
    case 'harvest': {
      const k = pr(pose === 'pick' ? 22 : 28);
      const reach = Math.sin(k * Math.PI * 2);
      r[R.CROUCH] = 3.4;
      r[R.LEAN] = 0.17;
      r[R.HEAD_U] = 0.05;
      r[R.HRU] = 0.3 + reach * 0.06;
      r[R.HRV] = -0.06;
      r[R.HRZ] = 4 + (reach * 0.5 + 0.5) * 7;
      r[R.HLU] = 0.22;
      r[R.HLV] = 0.07;
      r[R.HLZ] = 7 + Math.cos(k * 6.28) * 1.5;
      r[R.FLU] = -0.04;
      r[R.FRU] = 0.06;
      break;
    }
    case 'chop':
    case 'mine':
    case 'till': {
      const k = pr(pose === 'chop' ? 20 : pose === 'mine' ? 24 : 26);
      // wind up, strike, recover
      let up: number;
      let reach: number;
      if (k < 0.5) {
        const a = ease(k / 0.5);
        up = a;
        reach = -0.04 * a;
      } else if (k < 0.62) {
        const a = (k - 0.5) / 0.12;
        up = 1 - a;
        reach = -0.04 + 0.42 * a;
      } else {
        const a = ease((k - 0.62) / 0.38);
        up = 0;
        reach = 0.38 * (1 - a);
      }
      const hz = pose === 'till' ? 4 + up * 24 : 10 + up * 20;
      r[R.LEAN] = 0.06 + (1 - up) * 0.12;
      r[R.CROUCH] = (1 - up) * 1.2;
      r[R.HRU] = 0.08 + reach;
      r[R.HLU] = 0.06 + reach * 0.8;
      r[R.HRV] = -0.06;
      r[R.HLV] = 0.06;
      r[R.HRZ] = hz;
      r[R.HLZ] = hz - 3;
      r[R.FLU] = -0.12;
      r[R.FRU] = 0.12;
      r[R.TOOLON] = 1;
      r[R.TOOL] = (up * 1.5 - 0.35) * (pose === 'till' ? 0.8 : 1);
      break;
    }
    case 'fish': {
      const k = pr(44);
      const sway = Math.sin(k * 6.28 * 2);
      r[R.LEAN] = 0.03;
      r[R.HRU] = 0.22;
      r[R.HRV] = -0.1;
      r[R.HRZ] = 14 + sway * 0.8;
      r[R.HLU] = 0.1;
      r[R.HLV] = 0.08;
      r[R.HLZ] = 11;
      r[R.TOOLON] = 2; // fishing rod
      r[R.TOOL] = 0.9 + Math.sin(k * 6.28) * 0.12 + (k > 0.8 ? -0.35 : 0);
      break;
    }
    case 'drink': {
      const k = pr(30);
      const cup = Math.sin(k * 6.28 * 2) * 0.5 + 0.5;
      r[R.CROUCH] = 7;
      r[R.LEAN] = 0.3;
      r[R.HEAD_U] = 0.1;
      r[R.HRU] = 0.28 - cup * 0.12;
      r[R.HRV] = -0.05;
      r[R.HRZ] = 3 + cup * 12;
      r[R.HLU] = r[R.HRU];
      r[R.HLV] = 0.05;
      r[R.HLZ] = r[R.HRZ];
      r[R.FLU] = 0.06;
      r[R.FRU] = -0.08;
      r[R.MOUTH] = cup;
      break;
    }
    case 'eat': {
      const k = pr(10);
      const lift = Math.sin(k * Math.PI);
      r[R.HRU] = 0.1 + lift * 0.04;
      r[R.HRV] = -0.06;
      r[R.HRZ] = 12 + lift * 13;
      r[R.MOUTH] = lift > 0.7 ? 1 : 0;
      r[R.HEAD_Z] = -lift * 0.4;
      break;
    }
    case 'sleep': {
      r[R.LIE] = 1;
      r[R.EYES] = 0;
      r[R.BOB] = Math.sin(t * 1.3 + p.id) * 0.25;
      break;
    }
    case 'sit': {
      r[R.SIT] = 1;
      r[R.CROUCH] = 6.5;
      r[R.FLU] = 0.3;
      r[R.FRU] = 0.3;
      r[R.FLL] = 0;
      r[R.HLU] = 0.18;
      r[R.HRU] = 0.18;
      r[R.HLZ] = 8;
      r[R.HRZ] = 8;
      r[R.HEAD_U] = Math.sin(t * 0.6 + p.id) * 0.01;
      if (c.speaking) {
        r[R.HRU] = 0.12;
        r[R.HRZ] = 15 + Math.sin(t * 5) * 3;
        r[R.MOUTH] = Math.sin(t * 9) > 0 ? 1 : 0;
      }
      break;
    }
    case 'build':
    case 'craft': {
      const k = pr(pose === 'build' ? 14 : 12);
      const strike = Math.pow(Math.max(0, Math.sin(k * Math.PI * 2)), 2);
      r[R.LEAN] = 0.09;
      r[R.HRU] = 0.2 + strike * 0.12;
      r[R.HRV] = -0.07;
      r[R.HRZ] = 15 + (1 - strike) * 9;
      r[R.HLU] = 0.24;
      r[R.HLV] = 0.07;
      r[R.HLZ] = 14;
      r[R.TOOLON] = 3; // hammer
      r[R.TOOL] = 0.9 - strike * 1.5;
      r[R.FLU] = -0.05;
      r[R.FRU] = 0.07;
      break;
    }
    case 'plant':
    case 'tend': {
      const k = pr(pose === 'plant' ? 24 : 30);
      const dip = Math.sin(k * Math.PI);
      r[R.CROUCH] = 4.5;
      r[R.LEAN] = 0.2;
      r[R.HRU] = 0.3;
      r[R.HRV] = -0.06;
      r[R.HRZ] = pose === 'plant' ? 3 + (1 - dip) * 7 : 11 + dip * 3;
      r[R.HLU] = 0.18;
      r[R.HLZ] = 8;
      r[R.FLU] = 0.05;
      r[R.FRU] = -0.05;
      break;
    }
    case 'talk': {
      const sp = c.speaking;
      const g = Math.sin(t * (sp ? 6.2 : 1.7) + p.id * 1.7);
      r[R.HRU] = 0.12 + (sp ? Math.max(0, g) * 0.14 : 0);
      r[R.HRV] = -0.1;
      r[R.HRZ] = sp ? 15 + g * 4 : 11 + Math.max(0, g) * 2;
      r[R.HLZ] = sp ? 12 + Math.sin(t * 4.3 + 1) * 2 : 11;
      r[R.MOUTH] = sp ? (Math.sin(t * 11 + p.id) > -0.1 ? 1 : 0) : 0;
      r[R.HEAD_Z] = sp ? Math.sin(t * 6.2) * 0.35 : Math.sin(t * 1.1) * 0.25;
      r[R.LEAN] = sp ? 0.03 : 0;
      break;
    }
    case 'give': {
      const k = smoothstep(0, 0.45, p.activity ? p.activity.progress / Math.max(1, p.activity.duration) : 0);
      r[R.HRU] = 0.1 + 0.3 * k;
      r[R.HRV] = -0.05;
      r[R.HRZ] = 12 + 3 * k;
      r[R.HLU] = 0.1 + 0.26 * k;
      r[R.HLV] = 0.05;
      r[R.HLZ] = 12 + 3 * k;
      r[R.LEAN] = 0.05 * k;
      break;
    }
    case 'argue': {
      const j = Math.sin(t * 15 + p.id);
      r[R.HRU] = 0.2;
      r[R.HRV] = -0.14;
      r[R.HRZ] = 23 + j * 3;
      r[R.HLU] = 0.16;
      r[R.HLV] = 0.14;
      r[R.HLZ] = 21 - j * 3;
      r[R.LEAN] = 0.1;
      r[R.MOUTH] = Math.sin(t * 13) > 0 ? 1 : 0;
      r[R.HEAD_Z] = j * 0.4;
      break;
    }
    case 'store': {
      const k = p.activity ? clamp(p.activity.progress / Math.max(1, p.activity.duration), 0, 1) : 0;
      const lower = Math.sin(k * Math.PI);
      r[R.HRU] = 0.2;
      r[R.HLU] = 0.2;
      r[R.HRV] = -0.07;
      r[R.HLV] = 0.07;
      r[R.HRZ] = 13 - lower * 5;
      r[R.HLZ] = 13 - lower * 5;
      r[R.CROUCH] = lower * 3;
      r[R.LEAN] = 0.05 + lower * 0.08;
      break;
    }
    case 'saw': {
      // two hands on a long saw, drawing it back and forth through a log on a trestle
      const k = pr(14);
      const st = Math.sin(k * Math.PI * 2);
      r[R.LEAN] = 0.15 + Math.max(0, st) * 0.02;
      r[R.CROUCH] = 2.6;
      r[R.HEAD_U] = 0.05;
      r[R.HRU] = 0.3 + 0.1 * st;
      r[R.HRV] = -0.05;
      r[R.HRZ] = 12;
      r[R.HLU] = 0.27 + 0.1 * st;
      r[R.HLV] = 0.045;
      r[R.HLZ] = 11.5;
      r[R.FLU] = -0.1;
      r[R.FRU] = 0.1;
      r[R.PH] = k;
      break;
    }
    case 'hammer': {
      // bent over the work, one hand holding the board, the other driving a nail
      const k = pr(12);
      const strike = Math.pow(Math.max(0, Math.sin(k * Math.PI * 2)), 2);
      r[R.LEAN] = 0.17;
      r[R.CROUCH] = 3.4;
      r[R.HEAD_U] = 0.05;
      r[R.HRU] = 0.22 + strike * 0.12;
      r[R.HRV] = -0.06;
      r[R.HRZ] = 21 - strike * 16;
      r[R.HLU] = 0.34;
      r[R.HLV] = 0.06;
      r[R.HLZ] = 6;
      r[R.FLU] = -0.1;
      r[R.FRU] = 0.1;
      r[R.TOOL] = 1.0 - strike * 1.9;
      r[R.PH] = k;
      break;
    }
    case 'forge': {
      // tongs on the anvil, a heavy hammer swung high and brought down hard, then a lighter tap
      const k = pr(16);
      let up: number;
      if (k < 0.55) up = ease(k / 0.55);
      else if (k < 0.64) up = 1 - (k - 0.55) / 0.09;
      else up = 0;
      const rebound = k >= 0.64 && k < 0.8 ? Math.sin(((k - 0.64) / 0.16) * Math.PI) * 0.22 : 0;
      up = Math.max(up, rebound);
      r[R.LEAN] = 0.1 + (1 - up) * 0.1;
      r[R.CROUCH] = 1.2 + (1 - up) * 1.8;
      r[R.HRU] = 0.16 + (1 - up) * 0.2;
      r[R.HRV] = -0.07;
      r[R.HRZ] = 13 + up * 17;
      r[R.HLU] = 0.4;
      r[R.HLV] = 0.07;
      r[R.HLZ] = 11.5;
      r[R.FLU] = -0.12;
      r[R.FRU] = 0.12;
      r[R.TOOL] = up * 1.7 - 0.5;
      r[R.PH] = k;
      break;
    }
    case 'bake': {
      // slide a loaf in on a long peel, leave it, draw out a baked one
      const k = pr(26);
      let t: number;
      if (k < 0.28) t = ease(k / 0.28);
      else if (k < 0.48) t = 1;
      else if (k < 0.72) t = 1 - ease((k - 0.48) / 0.24);
      else t = 0;
      r[R.LEAN] = 0.06 + t * 0.1;
      r[R.CROUCH] = t * 1.5;
      r[R.HRU] = 0.1 + t * 0.2;
      r[R.HRV] = -0.06;
      r[R.HRZ] = 11 + t * 0.5;
      r[R.HLU] = 0.2 + t * 0.16;
      r[R.HLV] = 0.06;
      r[R.HLZ] = 12.5;
      r[R.FLU] = -0.05;
      r[R.FRU] = 0.09;
      r[R.TOOL] = t;
      r[R.PH] = k;
      break;
    }
    case 'dig': {
      // drive a spade in, lever it, lift a clod
      const k = pr(22);
      const down = Math.pow(Math.max(0, Math.sin(k * Math.PI * 2 - 0.4)), 1.5);
      const up = 1 - down;
      r[R.LEAN] = 0.1 + down * 0.14;
      r[R.CROUCH] = 1.5 + down * 3;
      r[R.HEAD_U] = 0.05;
      r[R.HRU] = 0.22 + down * 0.08;
      r[R.HRV] = -0.06;
      r[R.HRZ] = 15 + up * 6 - down * 4;
      r[R.HLU] = 0.2 + down * 0.1;
      r[R.HLV] = 0.07;
      r[R.HLZ] = 8 + up * 4 - down * 2;
      r[R.FLU] = 0.08;
      r[R.FRU] = -0.1;
      r[R.TOOL] = -1.0 - down * 0.25;
      r[R.PH] = down;
      break;
    }
    case 'pull': {
      // leaning into the shafts of a handcart, both hands on them, walking when the cart rolls
      const moving = c.moved > 0.004;
      const sn = Math.sin(c.walk * Math.PI * 2);
      const co = Math.cos(c.walk * Math.PI * 2);
      const mv = moving ? 1 : 0;
      r[R.FLU] = sn * 0.16 * mv;
      r[R.FRU] = -sn * 0.16 * mv;
      r[R.FLL] = Math.max(0, co) * 2.1 * mv;
      r[R.FRL] = Math.max(0, -co) * 2.1 * mv;
      r[R.BOB] = Math.abs(sn) * 0.7 * mv;
      r[R.LEAN] = moving ? 0.17 : 0.06;
      r[R.CROUCH] = moving ? 0.8 : 0;
      r[R.HEAD_U] = 0.04;
      r[R.HLU] = HAND_U;
      r[R.HLV] = HAND_V;
      r[R.HLZ] = HAND_Z;
      r[R.HRU] = HAND_U;
      r[R.HRV] = -HAND_V;
      r[R.HRZ] = HAND_Z;
      break;
    }
    case 'fear': {
      r[R.CROUCH] = 4;
      r[R.LEAN] = -0.04;
      r[R.HRU] = 0.1;
      r[R.HRV] = -0.1;
      r[R.HRZ] = 28 + Math.sin(t * 20) * 0.6;
      r[R.HLU] = 0.1;
      r[R.HLV] = 0.1;
      r[R.HLZ] = 28 + Math.sin(t * 21) * 0.6;
      r[R.MOUTH] = 1;
      break;
    }
    default: {
      // stand
      r[R.HEAD_U] = 0;
      r[R.HEAD_Z] = Math.sin(t * 0.8 + p.id) * 0.2;
    }
  }
  // greeting wave overrides the right arm for a moment
  if (p.wave > 0 && pose !== 'sleep' && pose !== 'build' && pose !== 'give') {
    // handled by caller (needs the tick); see applyWave
  }
}

function applyWave(r: Rig, t: number, strength: number): void {
  const k = strength;
  r[R.HRU] += (0.1 - r[R.HRU]) * k;
  r[R.HRV] += (-0.16 - r[R.HRV]) * k;
  r[R.HRZ] += (26 + Math.sin(t * 13) * 3 - r[R.HRZ]) * k;
}

// ───────────────────────── look-up of appearance ─────────────────────────
function bodyScale(world: World, p: Person): { s: number; head: number; stoop: number } {
  const age = ageYears(world, p);
  const stage = stageOf(world, p);
  if (stage === 'child') {
    const k = clamp(age / 12, 0, 1);
    return { s: 0.5 + 0.28 * k, head: 1.32 - 0.12 * k, stoop: 0 };
  }
  if (stage === 'youth') return { s: 0.86 * p.look.height, head: 1.1, stoop: 0 };
  return { s: p.look.height, head: 1, stoop: stage === 'elder' ? 0.045 : 0 };
}

interface RigResult {
  rig: Rig;
  s: RigState;
  /** the pose actually shown (it can differ from person.pose: pulling a cart, digging clay) */
  pose: PoseKind;
  /** 0..1 how far the change into this pose has got, for fading its props in */
  bt: number;
  /** 0..1 how heavy the load is for this person */
  burden: number;
}

// ───────────────────────── the renderer ─────────────────────────
export class CharacterRenderer {
  private states = new Map<number, RigState>();
  private tmp = newRig();
  private target = newRig();

  /** Advance per-person animation state (walk phase, pose blending) using simulation time only. */
  updateAll(world: World, alphaT: number, simT: number): void {
    for (const p of world.persons) {
      let s = this.states.get(p.id);
      const x = p.px + (p.x - p.px) * alphaT;
      const y = p.py + (p.y - p.py) * alphaT;
      if (!s) {
        s = { x, y, phase: (p.id * 0.37) % 1, moved: 0, pose: p.pose, poseT0: simT - 10, from: newRig(), cur: newRig(), simT, talkT: 0, carry: 0, jar: 0, carryT: simT };
        setBase(s.cur);
        setBase(s.from);
        this.states.set(p.id, s);
      }
      const moved = Math.hypot(x - s.x, y - s.y);
      // stride follows ground covered; clamped so very fast playback does not strobe
      if (moved > 0 && moved < 3) s.phase = (s.phase + Math.min(moved * 1.55, 0.45)) % 1;
      s.moved = moved;
      s.x = x;
      s.y = y;
      s.simT = simT;
    }
    if (this.states.size > world.persons.length + 40) {
      const alive = new Set(world.persons.map((q) => q.id));
      for (const id of this.states.keys()) if (!alive.has(id)) this.states.delete(id);
    }
  }

  private rigFor(world: World, p: Person, simT: number, alphaT: number, walking: boolean, running: boolean): RigResult {
    const s = this.states.get(p.id)!;
    let pose: PoseKind = p.pose;
    const a = p.activity;
    // moving without a travel pose (e.g., just finished): show walking
    if (s.moved > 0.004 && (pose === 'stand' || pose === 'sit')) pose = running ? 'run' : 'walk';
    if (pose === 'walk' && !walking) pose = 'stand';
    // whoever has hold of a handcart is pulling it, whatever the activity says about walking
    const cart = p.cartId ? world.byId.get(p.cartId) : undefined;
    if (cart && cart.ent === 'cart' && (pose === 'walk' || pose === 'run' || pose === 'stand')) pose = 'pull';
    // digging for clay is a spade job, breaking out ore or stone a pick job, wherever the activity's own pose says otherwise
    if (pose === 'pick' && a && a.kind === 'gather') {
      const st = a.data.stype as string | undefined;
      if (st === 'clay_pit') pose = 'dig';
      else if (st === 'ore_vein' || st === 'outcrop') pose = 'mine';
    }
    const speaking = !!(p.speech && p.speech.until > world.tick);
    const pc: PoseCtx = { t: simT, alphaT, walk: s.phase, speed: Math.min(1, s.moved * 6), p, speaking, stage: '', moved: s.moved };
    if (pose !== s.pose) {
      s.from.set(s.cur);
      s.pose = pose;
      s.poseT0 = simT;
    }
    poseRig(pose, pc, this.target);
    const bt = ease(clamp((simT - s.poseT0) / 0.28, 0, 1));
    lerpRig(s.from, this.target, bt, s.cur);
    const out = this.tmp;
    out.set(s.cur);

    // what they are carrying changes how they move and what their arms are doing
    const inv = p.inv;
    const cap = carryCap(world, p);
    const burden = cap > 0 ? clamp(weightOf(inv) / cap, 0, 1) : 0;
    const onFoot = pose === 'walk' || pose === 'run';
    const free = onFoot || pose === 'stand';
    if (burden > 0.06 && free) {
      out[R.LEAN] += 0.05 * burden;
      out[R.CROUCH] += 1.1 * burden;
      if (onFoot) {
        const k = 1 - 0.26 * burden;
        out[R.FLU] *= k;
        out[R.FRU] *= k;
        out[R.HLU] *= k;
        out[R.HRU] *= k;
        out[R.BOB] *= 1 + 0.4 * burden;
      }
    }
    const armful = free && ((inv.bricks ?? 0) > 0 || (inv.clay ?? 0) > 0 || ((inv.bread ?? 0) > 0 && (inv.basket ?? 0) === 0)) ? 1 : 0;
    const jarOn = free && (inv.jar ?? 0) > 0 && (inv.water ?? 0) > 0 ? 1 : 0;
    const dt = Math.min(0.5, Math.max(0, simT - s.carryT));
    s.carryT = simT;
    s.carry += (armful - s.carry) * clamp(dt * 9, 0, 1);
    s.jar += (jarOn - s.jar) * clamp(dt * 9, 0, 1);
    if (s.carry > 0.01) {
      const k = s.carry;
      out[R.HLU] += (0.19 - out[R.HLU]) * k;
      out[R.HRU] += (0.19 - out[R.HRU]) * k;
      out[R.HLV] += (0.075 - out[R.HLV]) * k;
      out[R.HRV] += (-0.075 - out[R.HRV]) * k;
      out[R.HLZ] += (10.2 - out[R.HLZ]) * k;
      out[R.HRZ] += (10.2 - out[R.HRZ]) * k;
    }
    if (s.jar > 0.01) {
      // one hand steadies the jar on the head
      const k = s.jar;
      out[R.HRU] += (0.02 - out[R.HRU]) * k;
      out[R.HRV] += (-0.085 - out[R.HRV]) * k;
      out[R.HRZ] += (27 - out[R.HRZ]) * k;
    }
    if (p.wave > world.tick && pose !== 'sleep') {
      const left = (p.wave - world.tick) / 26;
      applyWave(out, simT, clamp(Math.min(1, left * 3, (1 - left) * 8 + 0.2), 0, 1));
    }
    return { rig: out, s, pose, bt, burden };
  }

  draw(ctx: CanvasRenderingContext2D, world: World, p: Person, alphaT: number, simT: number, opts: { selected: boolean; hovered: boolean; night: number }): { headX: number; headY: number } {
    const x = p.px + (p.x - p.px) * alphaT;
    const y = p.py + (p.y - p.py) * alphaT;
    const heading = p.pheading + angleDiff(p.pheading, p.heading) * alphaT;
    const running = p.pose === 'run';
    const { rig, s, pose, bt, burden } = this.rigFor(world, p, simT, alphaT, p.pose === 'walk', running);
    const bs = bodyScale(world, p);
    const sc = bs.s;
    const look = p.look;
    const stage = stageOf(world, p);
    const hh = world.households.find((h) => h.id === p.hhId);
    const accent = HOUSEHOLD_COLORS[(hh ? hh.color : 0) % HOUSEHOLD_COLORS.length];
    const skin = SKIN[look.skin % SKIN.length];
    const elderly = stage === 'elder' || ageYears(world, p) >= 56;
    const hairC = elderly ? HAIR[5] : HAIR[look.hair % HAIR.length];
    const shirt = SHIRT[look.shirt % SHIRT.length];
    const pants = PANTS[look.pants % PANTS.length];
    const fx = Math.cos(heading);
    const fy = Math.sin(heading);
    const lx = -Math.sin(heading);
    const ly = Math.cos(heading);
    const lie = rig[R.LIE];
    const sit = rig[R.SIT];

    // local (u forward, v lateral, z up) -> iso-plane px, with body scale applied to the vertical and lateral extents
    const S = (u: number, v: number, z: number): V3 => {
      const wx = x + fx * u * sc + lx * v * sc;
      const wy = y + fy * u * sc + ly * v * sc;
      return [(wx - wy) * 32, (wx + wy) * 16 - z * sc, wx + wy];
    };

    const hipZ = 10.2 - rig[R.CROUCH] * (1 - lie) + rig[R.BOB];
    const shZ0 = 20.6 - rig[R.CROUCH] * (1 - lie) * 0.7 + rig[R.BOB];
    // lying: body flat on the ground along the heading
    const hip: V3 = lie > 0.5 ? S(-0.12, 0, 3.4) : S(0, 0, hipZ);
    const lean = rig[R.LEAN] + bs.stoop;
    const shoulderC: V3 = lie > 0.5 ? S(0.2, 0, 4.6) : S(lean, 0, shZ0);
    const headC: V3 = lie > 0.5 ? S(0.45, 0, 5.5) : S(lean + rig[R.HEAD_U] + 0.01, 0, shZ0 + 5.3 * bs.head + rig[R.HEAD_Z]);
    const shL: V3 = lie > 0.5 ? S(0.2, 0.09, 4.2) : S(lean, 0.1 * look.build, shZ0 - 0.6);
    const shR: V3 = lie > 0.5 ? S(0.2, -0.09, 4.2) : S(lean, -0.1 * look.build, shZ0 - 0.6);
    const hipL: V3 = lie > 0.5 ? S(-0.16, 0.05, 3.2) : S(0, 0.055 * look.build, hipZ);
    const hipR: V3 = lie > 0.5 ? S(-0.16, -0.05, 3.2) : S(0, -0.055 * look.build, hipZ);
    const handL: V3 = lie > 0.5 ? S(0.25, 0.12, 3) : S(rig[R.HLU], rig[R.HLV], rig[R.HLZ] - rig[R.CROUCH] * 0.4);
    const handR: V3 = lie > 0.5 ? S(0.25, -0.12, 3) : S(rig[R.HRU], rig[R.HRV], rig[R.HRZ] - rig[R.CROUCH] * 0.4);
    const footL: V3 = lie > 0.5 ? S(-0.4, 0.04, 2) : S(rig[R.FLU], rig[R.FLV], rig[R.FLL]);
    const footR: V3 = lie > 0.5 ? S(-0.4, -0.04, 2) : S(rig[R.FRU], rig[R.FRV], rig[R.FRL]);
    // knees: halfway, nudged forward when crouched / seated
    const kneeBend = (rig[R.CROUCH] > 1 ? 0.07 : 0.015) + sit * 0.05;
    const knee = (h: V3, f: V3): V3 => {
      const mx = (h[0] + f[0]) / 2;
      const my = (h[1] + f[1]) / 2;
      const bx = (fx - fy) * 32 * kneeBend * sc;
      const by = (fx + fy) * 16 * kneeBend * sc;
      return [mx + bx, my + by, (h[2] + f[2]) / 2];
    };
    const kneeL = lie > 0.5 ? footL : knee(hipL, footL);
    const kneeR = lie > 0.5 ? footR : knee(hipR, footR);
    const elbow = (s0: V3, h: V3, down: number): V3 => [(s0[0] + h[0]) / 2, (s0[1] + h[1]) / 2 + down, (s0[2] + h[2]) / 2];
    const elbowL = elbow(shL, handL, 1.6);
    const elbowR = elbow(shR, handR, 1.6);

    // ground shadow
    const base = S(0, 0, 0);
    {
      const rx = 8.5 * sc * (lie > 0.5 ? 1.9 : 1);
      ctx.fillStyle = 'rgba(15,25,15,0.30)';
      ctx.beginPath();
      ctx.ellipse(lie > 0.5 ? S(-0.1, 0, 0)[0] : base[0], base[1] + 1, rx, rx * 0.42, lie > 0.5 ? -0.4 : 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // selection / hover ring
    if (opts.selected || opts.hovered) {
      ctx.strokeStyle = opts.selected ? `rgba(255,214,120,${0.75 + 0.2 * Math.sin(simT * 4)})` : 'rgba(255,255,255,0.55)';
      ctx.lineWidth = opts.selected ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.ellipse(base[0], base[1] + 1, 13, 6.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── gather parts, sort back-to-front, draw ──
    interface Part {
      d: number;
      draw: () => void;
    }
    const parts: Part[] = [];
    const limb = (a: V3, b: V3, w: number, color: string, outline = true) => () => {
      ctx.lineCap = 'round';
      if (outline) {
        ctx.strokeStyle = 'rgba(25,18,12,0.38)';
        ctx.lineWidth = w + 1.1;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    };
    const lw = 3.1 * sc * look.build;
    const aw = 2.5 * sc;

    // legs
    for (const [h, k, f, side] of [[hipL, kneeL, footL, 1], [hipR, kneeR, footR, -1]] as [V3, V3, V3, number][]) {
      const dd = (h[2] + f[2]) / 2 - (side > 0 ? 0 : 0.01);
      parts.push({
        d: dd,
        draw: () => {
          limb(h, k, lw, pants)();
          limb(k, f, lw * 0.95, shade(pants, 0.92))();
          // shoe
          ctx.fillStyle = '#3a2c22';
          ctx.beginPath();
          ctx.ellipse(f[0] + (fx - fy) * 32 * 0.04 * sc, f[1] + 0.6, 2.4 * sc, 1.5 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }

    // torso
    parts.push({
      d: (hip[2] + shoulderC[2]) / 2 + 0.005,
      draw: () => {
        const tw = 7.1 * sc * look.build;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(25,18,12,0.4)';
        ctx.lineWidth = tw + 1.2;
        ctx.beginPath();
        ctx.moveTo(hip[0], hip[1]);
        ctx.lineTo(shoulderC[0], shoulderC[1]);
        ctx.stroke();
        ctx.strokeStyle = shirt;
        ctx.lineWidth = tw;
        ctx.beginPath();
        ctx.moveTo(hip[0], hip[1]);
        ctx.lineTo(shoulderC[0], shoulderC[1]);
        ctx.stroke();
        // light on the left, household sash across the chest
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = tw * 0.32;
        ctx.beginPath();
        ctx.moveTo(hip[0] - tw * 0.2, hip[1]);
        ctx.lineTo(shoulderC[0] - tw * 0.2, shoulderC[1]);
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(1.6, 2.1 * sc);
        ctx.beginPath();
        ctx.moveTo(shL[0], shL[1] + 0.5);
        ctx.lineTo((hip[0] + hipR[0]) / 2, (hip[1] + hipR[1]) / 2 - 0.5);
        ctx.stroke();
        // belt
        ctx.strokeStyle = 'rgba(40,28,18,0.55)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(hip[0] - tw * 0.48, hip[1] - 0.7);
        ctx.lineTo(hip[0] + tw * 0.48, hip[1] - 0.7);
        ctx.stroke();
      },
    });

    // which tool is in hand follows the pose being shown (not the blended rig, which would flicker between kinds)
    const toolKind = TOOL_OF[pose] ?? 0;

    // carried goods on the back / hips
    drawCarried(ctx, p, parts, S, fx, fy, sc, lie, rig, toolKind, s.carry, s.jar, headC, burden, simT);

    // arms
    for (const [s0, e, h, side] of [[shL, elbowL, handL, 1], [shR, elbowR, handR, -1]] as [V3, V3, V3, number][]) {
      parts.push({
        d: (s0[2] + h[2]) / 2 + (side > 0 ? 0.004 : 0.006),
        draw: () => {
          limb(s0, e, aw, shirt)();
          limb(e, h, aw * 0.9, skin)();
          ctx.fillStyle = skin;
          ctx.beginPath();
          ctx.arc(h[0], h[1], 1.55 * sc, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }

    // tool in the right hand, and the things set up in front of the worker (trestle, anvil, board, hole)
    if (toolKind > 0 && lie < 0.5) {
      drawTool(ctx, parts, p, toolKind, rig, handR, handL, fx, fy, sc, simT);
      drawProps(ctx, parts, p, pose, handL, S, fx, fy, sc, bt);
    } else if (p.pose === 'eat' && p.activity) {
      parts.push({
        d: handR[2] + 0.01,
        draw: () => {
          ctx.fillStyle = (p.inv.fish ?? 0) > 0 ? '#9ac1d4' : (p.inv.smoked_fish ?? 0) > 0 ? '#b98a4a' : (p.inv.fruit ?? 0) > 0 ? '#e0723a' : (p.inv.grain ?? 0) > 0 ? '#d9b44a' : '#a8294f';
          ctx.beginPath();
          ctx.arc(handR[0], handR[1] - 1.6, 1.9 * sc, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }

    // head
    const faceDirScreenX = (fx - fy) / Math.SQRT2; // + = facing screen-right
    const faceToward = (fx + fy) / Math.SQRT2; // + = facing the viewer
    const eyeDir = lie > 0.5 ? 0 : faceDirScreenX;
    parts.push({
      d: headC[2] + 0.02,
      draw: () => {
        const hr = 5.1 * sc * bs.head;
        drawHead(ctx, headC[0], headC[1], hr, { skin, hair: hairC, style: look.hairStyle, hat: look.hat, shirt, eyeDir, toward: faceToward, eyes: rig[R.EYES], mouth: rig[R.MOUTH], night: opts.night, elderly, lie: lie > 0.5, child: stage === 'child' });
      },
    });

    parts.sort((a, b) => a.d - b.d);
    for (const pt of parts) pt.draw();

    // zzz over sleepers is drawn by the effects layer; return the head position for labels / bubbles
    return { headX: headC[0], headY: headC[1] - (lie > 0.5 ? 6 : 6.5 * sc) };
  }

  // ── wolves ──
  drawWolf(ctx: CanvasRenderingContext2D, a: Animal, alphaT: number, simT: number, selected: boolean): { headX: number; headY: number } {
    const x = a.px + (a.x - a.px) * alphaT;
    const y = a.py + (a.y - a.py) * alphaT;
    const heading = a.pheading + angleDiff(a.pheading, a.heading) * alphaT;
    const fx = Math.cos(heading);
    const fy = Math.sin(heading);
    const lx = -fy;
    const ly = fx;
    const S = (u: number, v: number, z: number): V3 => {
      const wx = x + fx * u + lx * v;
      const wy = y + fy * u + ly * v;
      return [(wx - wy) * 32, (wx + wy) * 16 - z, wx + wy];
    };
    const moving = a.state !== 'roam' || Math.hypot(a.x - a.px, a.y - a.py) > 0.005;
    const run = a.state === 'stalk' || a.state === 'retreat';
    const ph = simT * (run ? 7 : 4) + a.id;
    const crouch = a.state === 'stalk' ? 2.5 : 0;
    const bodyZ = 11 - crouch;
    const base = S(0, 0, 0);
    ctx.fillStyle = 'rgba(15,25,15,0.3)';
    ctx.beginPath();
    ctx.ellipse(base[0], base[1] + 1, 15, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = 'rgba(255,120,100,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(base[0], base[1] + 1, 17, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    interface P {
      d: number;
      f: () => void;
    }
    const parts: P[] = [];
    const legs: [number, number, number][] = [
      [0.2, 0.07, 0],
      [0.2, -0.07, Math.PI],
      [-0.2, 0.07, Math.PI],
      [-0.2, -0.07, 0],
    ];
    for (const [u, v, off] of legs) {
      const sw = moving ? Math.sin(ph + off) * (run ? 0.17 : 0.1) : 0;
      const lift = moving ? Math.max(0, Math.cos(ph + off)) * (run ? 3.4 : 2) : 0;
      const top = S(u, v, bodyZ - 1);
      const foot = S(u + sw, v, lift);
      parts.push({
        d: (top[2] + foot[2]) / 2,
        f: () => {
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#4a4742';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(top[0], top[1]);
          ctx.lineTo(foot[0], foot[1]);
          ctx.stroke();
        },
      });
    }
    const rear = S(-0.3, 0, bodyZ + 0.4);
    const front = S(0.26, 0, bodyZ + 1.2);
    parts.push({
      d: (rear[2] + front[2]) / 2 + 0.01,
      f: () => {
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(25,20,15,0.45)';
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(rear[0], rear[1]);
        ctx.lineTo(front[0], front[1]);
        ctx.stroke();
        const g = ctx.createLinearGradient(rear[0], rear[1] - 6, rear[0], rear[1] + 5);
        g.addColorStop(0, '#9b978f');
        g.addColorStop(1, '#6f6b65');
        ctx.strokeStyle = g;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(rear[0], rear[1]);
        ctx.lineTo(front[0], front[1]);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(45,42,38,0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rear[0], rear[1] - 3);
        ctx.lineTo(front[0], front[1] - 3);
        ctx.stroke();
      },
    });
    // tail
    const tailBase = S(-0.32, 0, bodyZ + 1);
    const tailTip = S(-0.55, Math.sin(ph * 0.5) * 0.04, bodyZ - 1 + (a.state === 'stalk' ? 0 : 3));
    parts.push({
      d: tailBase[2] - 0.05,
      f: () => {
        ctx.strokeStyle = '#6f6b65';
        ctx.lineCap = 'round';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(tailBase[0], tailBase[1]);
        ctx.quadraticCurveTo((tailBase[0] + tailTip[0]) / 2, (tailBase[1] + tailTip[1]) / 2 + 3, tailTip[0], tailTip[1]);
        ctx.stroke();
      },
    });
    // head and snout
    const lunge = a.state === 'stalk' && a.cooldown > 0 ? 0.04 : 0;
    const neck = S(0.34, 0, bodyZ + 3);
    const head = S(0.46 + lunge, 0, bodyZ + 3 - (a.state === 'stalk' ? 2 : 0));
    const snout = S(0.6 + lunge, 0, bodyZ + 1.6 - (a.state === 'stalk' ? 2 : 0));
    parts.push({
      d: head[2] + 0.02,
      f: () => {
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(25,20,15,0.45)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(neck[0], neck[1]);
        ctx.lineTo(head[0], head[1]);
        ctx.stroke();
        ctx.strokeStyle = '#8b877f';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(neck[0], neck[1]);
        ctx.lineTo(head[0], head[1]);
        ctx.stroke();
        ctx.strokeStyle = '#a7a39a';
        ctx.lineWidth = 4.4;
        ctx.beginPath();
        ctx.moveTo(head[0], head[1]);
        ctx.lineTo(snout[0], snout[1]);
        ctx.stroke();
        ctx.fillStyle = '#1b1612';
        ctx.beginPath();
        ctx.arc(snout[0], snout[1], 1.3, 0, Math.PI * 2);
        ctx.fill();
        // ears
        ctx.fillStyle = '#6d6962';
        ctx.beginPath();
        ctx.moveTo(head[0] - 2.5, head[1] - 3);
        ctx.lineTo(head[0] - 1.5, head[1] - 8);
        ctx.lineTo(head[0] + 0.5, head[1] - 3.4);
        ctx.moveTo(head[0] + 0.8, head[1] - 3.2);
        ctx.lineTo(head[0] + 2.8, head[1] - 7.5);
        ctx.lineTo(head[0] + 3.6, head[1] - 2.6);
        ctx.fill();
        // eye
        ctx.fillStyle = a.state === 'stalk' ? '#ffd23a' : '#e8c24a';
        ctx.beginPath();
        ctx.arc(head[0] + (fx - fy) * 1.2, head[1] - 0.8, 1, 0, Math.PI * 2);
        ctx.fill();
      },
    });
    parts.sort((p1, p2) => p1.d - p2.d);
    for (const p of parts) p.f();
    return { headX: head[0], headY: head[1] - 10 };
  }
}

// ───────────────────────── pieces ─────────────────────────
function drawHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  o: { skin: string; hair: string; style: number; hat: number; shirt: string; eyeDir: number; toward: number; eyes: number; mouth: number; night: number; elderly: boolean; lie: boolean; child: boolean },
): void {
  const back = o.toward < -0.15; // facing away from the viewer: we see the back of the head
  const outline = 'rgba(25,18,12,0.5)';
  // hair behind the head (long styles)
  if (o.style === 1 || o.style === 3) {
    ctx.fillStyle = o.hair;
    ctx.beginPath();
    ctx.ellipse(x - o.eyeDir * 0.8, y + r * 0.45, r * (o.style === 3 ? 1.28 : 1.02), r * (o.style === 3 ? 1.2 : 1.35), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.style === 2) {
    ctx.fillStyle = o.hair;
    ctx.beginPath();
    ctx.arc(x - o.eyeDir * 1.2, y - r * 1.1, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // skull
  ctx.fillStyle = o.skin;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  // hair cap
  ctx.fillStyle = o.hair;
  ctx.beginPath();
  if (back) {
    ctx.arc(x, y, r * 1.02, 0, Math.PI * 2);
  } else {
    ctx.arc(x, y, r * 1.03, Math.PI * 1.05, Math.PI * 1.98);
    ctx.quadraticCurveTo(x + r * 0.7 + o.eyeDir * r * 0.3, y - r * 0.2, x + o.eyeDir * r * 0.15, y - r * 0.28 + (o.toward > 0.4 ? 0.8 : 0));
    ctx.quadraticCurveTo(x - r * 0.7 + o.eyeDir * r * 0.3, y - r * 0.2, x - r * 1.02, y - r * 0.05);
  }
  ctx.closePath();
  ctx.fill();
  if (o.style === 4 && !back) {
    // short crop: thin cap only
    ctx.fillStyle = o.skin;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.2, r * 0.8, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // face
  if (!back) {
    const ex = o.eyeDir * r * 0.5;
    const spread = r * 0.42 * (1 - Math.abs(o.eyeDir) * 0.5);
    const ey = y + r * 0.1;
    if (o.eyes > 0.5) {
      ctx.fillStyle = 'rgba(30,22,18,0.9)';
      ctx.beginPath();
      ctx.arc(x + ex - spread, ey, Math.max(0.7, r * 0.16), 0, Math.PI * 2);
      if (Math.abs(o.eyeDir) < 0.85) ctx.arc(x + ex + spread, ey, Math.max(0.7, r * 0.16), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(30,22,18,0.8)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + ex - spread - 0.9, ey);
      ctx.lineTo(x + ex - spread + 0.9, ey);
      ctx.moveTo(x + ex + spread - 0.9, ey);
      ctx.lineTo(x + ex + spread + 0.9, ey);
      ctx.stroke();
    }
    // mouth
    if (o.toward > -0.1) {
      ctx.fillStyle = o.mouth > 0.5 ? 'rgba(90,30,30,0.85)' : 'rgba(110,50,40,0.55)';
      ctx.beginPath();
      ctx.ellipse(x + ex * 0.9, y + r * 0.58, r * 0.2, o.mouth > 0.5 ? r * 0.22 : r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // rosy cheeks for children
    if (o.child) {
      ctx.fillStyle = 'rgba(230,110,110,0.25)';
      ctx.beginPath();
      ctx.arc(x + ex - spread * 1.3, y + r * 0.4, r * 0.22, 0, Math.PI * 2);
      ctx.arc(x + ex + spread * 1.3, y + r * 0.4, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // hats
  if (o.hat === 1) {
    ctx.fillStyle = '#d9c067';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.55, r * 1.7, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,20,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#e8d283';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.85, r * 0.95, r * 0.7, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = o.shirt;
    ctx.fillRect(x - r * 0.95, y - r * 0.82, r * 1.9, 1.2);
  } else if (o.hat === 2) {
    ctx.fillStyle = shade(o.shirt, 0.78);
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.55, r * 1.04, r * 0.82, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + o.eyeDir * r * 0.6, y - r * 0.45, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.hat === 3) {
    ctx.fillStyle = '#7d6a55';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.05, r * 1.18, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineTo(x + r * 1.1, y + r * 0.7);
    ctx.lineTo(x - r * 1.1, y + r * 0.7);
    ctx.closePath();
    ctx.fill();
    if (!back) {
      ctx.fillStyle = o.skin;
      ctx.beginPath();
      ctx.ellipse(x + o.eyeDir * r * 0.4, y + r * 0.15, r * 0.7, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      // redo the face on top of the hood opening
      const ex = o.eyeDir * r * 0.5;
      ctx.fillStyle = 'rgba(30,22,18,0.9)';
      ctx.beginPath();
      ctx.arc(x + ex - r * 0.3, y + r * 0.1, Math.max(0.7, r * 0.15), 0, Math.PI * 2);
      ctx.arc(x + ex + r * 0.3, y + r * 0.1, Math.max(0.7, r * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (o.night > 0.4 && o.eyes < 0.5 && o.lie) {
    void o.night;
  }
}

type Part = { d: number; draw: () => void };
type SFn = (u: number, v: number, z: number) => V3;

function drawTool(ctx: CanvasRenderingContext2D, parts: Part[], p: Person, kind: number, rig: Rig, hand: V3, handL: V3, fx: number, fy: number, sc: number, simT: number): void {
  const ang = rig[R.TOOL];
  // direction on screen of "forward"
  const fxS = (fx - fy) * 32;
  const fyS = (fx + fy) * 16;
  const flen = Math.hypot(fxS, fyS) || 1;
  const dirx = fxS / flen;
  const diry = fyS / flen;
  const L = (kind === 2 ? 30 : kind === 3 ? 7 : kind === 6 ? 16 : 15) * sc;
  const tipX = hand[0] + dirx * Math.cos(ang) * L * 0.9;
  const tipY = hand[1] + diry * Math.cos(ang) * L * 0.9 - Math.sin(ang) * L;
  const a = p.activity;

  if (kind === 4) {
    // a long saw: handle in both hands, blade pointing into the log
    parts.push({
      d: hand[2] + 0.02,
      draw: () => {
        const len = 23 * sc;
        const bx = hand[0] + dirx * 3 * sc;
        const by = hand[1] + diry * 3 * sc;
        const ex = hand[0] + dirx * len;
        const ey = hand[1] + diry * len + 2.4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#6b4a2c';
        ctx.lineWidth = 3.2 * sc;
        ctx.beginPath();
        ctx.moveTo(hand[0] - dirx * 3.5, hand[1] - diry * 3.5 - 1);
        ctx.lineTo(hand[0] + dirx * 1.5, hand[1] + diry * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by - 2.4 * sc);
        ctx.lineTo(ex, ey - 1.2 * sc);
        ctx.lineTo(ex, ey + 1.6 * sc);
        ctx.lineTo(bx, by + 2.6 * sc);
        ctx.closePath();
        ctx.fillStyle = '#c9ced5';
        ctx.fill();
        ctx.strokeStyle = 'rgba(20,22,28,0.7)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        // teeth
        ctx.strokeStyle = '#6f757d';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const t = i / 9;
          const x = bx + (ex - bx) * t;
          const y = by + (ey - by) * t + (2.6 + (1.6 - 2.6) * t) * sc;
          ctx.moveTo(x, y);
          ctx.lineTo(x + 0.4, y + 1.5);
        }
        ctx.stroke();
        // the other grip
        ctx.fillStyle = '#6b4a2c';
        ctx.fillRect(ex - 1, ey - 5 * sc, 2, 4 * sc);
      },
    });
    return;
  }

  if (kind === 5) {
    // a spade driven into the ground; a clod on it as it comes up
    const lift = rig[R.PH];
    parts.push({
      d: hand[2] + 0.02,
      draw: () => {
        const len = 22 * sc;
        const sx = hand[0] + dirx * Math.cos(ang) * len * 0.8;
        const sy = hand[1] + diry * Math.cos(ang) * len * 0.8 - Math.sin(ang) * len * 0.95;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#7a5434';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(hand[0] - dirx, hand[1] - diry - 1);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        // T grip
        ctx.strokeStyle = '#5a3d26';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(hand[0] - 2.4, hand[1] - 1.4);
        ctx.lineTo(hand[0] + 2.4, hand[1] - 1.4);
        ctx.stroke();
        const bang = Math.atan2(sy - hand[1], sx - hand[0]);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(bang);
        ctx.fillStyle = '#b9bdc3';
        ctx.strokeStyle = 'rgba(25,25,30,0.7)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-1, -2.7 * sc);
        ctx.lineTo(5.4 * sc, -2.2 * sc);
        ctx.quadraticCurveTo(7.8 * sc, 0, 5.4 * sc, 2.2 * sc);
        ctx.lineTo(-1, 2.7 * sc);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (lift < 0.45) {
          const clay = a && a.data.stype === 'clay_pit';
          ctx.fillStyle = clay ? '#c47f4e' : '#6a4a2c';
          ctx.beginPath();
          ctx.ellipse(3.2 * sc, -0.4, 3.6 * sc, 2.5 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = clay ? 'rgba(255,225,190,0.5)' : 'rgba(255,255,255,0.14)';
          ctx.beginPath();
          ctx.ellipse(2.4 * sc, -1.4, 1.6 * sc, 0.9 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },
    });
    return;
  }

  if (kind === 7) {
    // a long baker's peel, with a loaf on it going in and coming out
    const ext = rig[R.TOOL];
    const k = rig[R.PH];
    parts.push({
      d: hand[2] + 0.02,
      draw: () => {
        const len = (17 + 8 * ext) * sc;
        const ex = hand[0] + dirx * len;
        const ey = hand[1] + diry * len + 1.4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#a67c4a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(hand[0] - dirx * 3, hand[1] - diry * 3);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(Math.atan2(diry, dirx));
        ctx.fillStyle = '#d3ad78';
        ctx.strokeStyle = 'rgba(70,45,20,0.7)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(1.5, 0, 5.2 * sc, 3 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (k < 0.3 || (k > 0.5 && k < 0.78)) {
          const baked = k > 0.4;
          const g = ctx.createRadialGradient(0.8, -1.4, 0.5, 1.5, 0, 5);
          g.addColorStop(0, baked ? '#f1c274' : '#f0dcae');
          g.addColorStop(1, baked ? '#b9772f' : '#cfb27a');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(1.5, -1.3, 3.9 * sc, 2.4 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          if (baked) {
            ctx.strokeStyle = 'rgba(110,60,20,0.65)';
            ctx.beginPath();
            ctx.moveTo(-0.6, -2.9);
            ctx.lineTo(0.4, -0.2);
            ctx.moveTo(2.2, -3);
            ctx.lineTo(3.2, -0.4);
            ctx.stroke();
          }
        }
        ctx.restore();
      },
    });
    return;
  }

  parts.push({
    d: hand[2] + 0.02,
    draw: () => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#7a5434';
      ctx.lineWidth = kind === 2 ? 1.3 : kind === 6 ? 2.4 : 1.9;
      ctx.beginPath();
      ctx.moveTo(hand[0] - dirx * 2, hand[1] - diry * 2 + 1);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      if (kind === 1) {
        // axe / pick / hoe head at the end
        const act = a?.kind;
        ctx.fillStyle = act === 'gather' ? '#c8c8c0' : act === 'till' ? '#9a9890' : '#b9b9b1';
        ctx.beginPath();
        ctx.ellipse(tipX, tipY, 4.4 * sc, 2.4 * sc, Math.atan2(tipY - hand[1], tipX - hand[0]) + 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,30,30,0.5)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      } else if (kind === 3) {
        ctx.fillStyle = '#8f8f88';
        ctx.fillRect(tipX - 3 * sc, tipY - 2 * sc, 6 * sc, 4 * sc);
      } else if (kind === 6) {
        // the smith's heavy hammer
        ctx.fillStyle = '#6f747d';
        ctx.strokeStyle = 'rgba(15,15,20,0.7)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.rect(tipX - 4.4 * sc, tipY - 3 * sc, 8.8 * sc, 6 * sc);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(tipX - 3.6 * sc, tipY - 2.4 * sc, 7 * sc, 1.2);
      } else if (kind === 2) {
        // fishing line to the water with a bobber
        if (a) {
          const wx = a.tx + 0.5 - 0.5;
          const wy = a.ty;
          const gx = (wx - wy) * 32;
          const gy = (wx + wy) * 16 + 2;
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.quadraticCurveTo((tipX + gx) / 2, Math.max(tipY, gy) + 6, gx, gy);
          ctx.stroke();
          const bob = Math.sin(simT * 3) * 0.8;
          ctx.fillStyle = '#e8503a';
          ctx.beginPath();
          ctx.arc(gx, gy + bob, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(gx, gy + 1 + bob, 4 + Math.sin(simT * 3) * 1, 1.8, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
  });
}

/**
 * The things a worker has set up in front of them, drawn in the world with the worker so they sort correctly:
 * a log on a trestle for sawing, a plank to nail, the smith's anvil with its glowing bar and sparks, the hole being dug.
 */
function drawProps(ctx: CanvasRenderingContext2D, parts: Part[], p: Person, pose: PoseKind, handL: V3, S: SFn, fx: number, fy: number, sc: number, bt: number): void {
  const a = p.activity;
  const wood = '#8a6038';
  switch (pose) {
    case 'saw': {
      const c = S(0.7, 0, 6);
      const k = a ? (a.progress / 14) % 1 : 0;
      parts.push({
        d: c[2] + 0.01,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.lineCap = 'round';
          for (const v of [-0.2, 0.2]) {
            const a0 = S(0.64, v, 0);
            const a1 = S(0.76, v, 9);
            const b0 = S(0.76, v, 0);
            const b1 = S(0.64, v, 9);
            for (const [from, to] of [[a0, a1], [b0, b1]] as [V3, V3][]) {
              ctx.strokeStyle = 'rgba(25,14,6,0.55)';
              ctx.lineWidth = 3.6;
              ctx.beginPath();
              ctx.moveTo(from[0], from[1]);
              ctx.lineTo(to[0], to[1]);
              ctx.stroke();
              ctx.strokeStyle = wood;
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              ctx.moveTo(from[0], from[1]);
              ctx.lineTo(to[0], to[1]);
              ctx.stroke();
            }
          }
          // the log, lying across the line of the cut
          const l0 = S(0.7, -0.34, 10.6);
          const l1 = S(0.7, 0.34, 10.6);
          ctx.strokeStyle = 'rgba(25,14,6,0.55)';
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(l0[0], l0[1]);
          ctx.lineTo(l1[0], l1[1]);
          ctx.stroke();
          ctx.strokeStyle = '#a2723f';
          ctx.lineWidth = 7.6;
          ctx.beginPath();
          ctx.moveTo(l0[0], l0[1]);
          ctx.lineTo(l1[0], l1[1]);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,230,180,0.3)';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(l0[0], l0[1] - 2.2);
          ctx.lineTo(l1[0], l1[1] - 2.2);
          ctx.stroke();
          for (const e of [l0, l1]) {
            ctx.fillStyle = '#dcb67e';
            ctx.beginPath();
            ctx.ellipse(e[0], e[1], 3.4, 4.1, 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
          // sawdust drifting from the kerf
          for (let i = 0; i < 4; i++) {
            const t = (k * 2 + i * 0.25) % 1;
            const kx = c[0] + (i - 1.5) * 1.8;
            ctx.fillStyle = `rgba(240,222,180,${0.8 * (1 - t)})`;
            ctx.fillRect(kx, c[1] + 6 + t * 7, 1.4, 1.2);
          }
          ctx.globalAlpha = 1;
        },
      });
      break;
    }
    case 'hammer': {
      const c = S(0.4, 0, 2);
      parts.push({
        d: c[2] + 0.01,
        draw: () => {
          ctx.globalAlpha = bt;
          orientedBox(ctx, S, fx, fy, 0.24, 0.56, -0.1, 0.1, 0, 2.4, { top: '#dcb987', lit: '#c29a64', dark: '#9a7544', stroke: 'rgba(60,38,14,0.55)' });
          const n1 = S(0.34, -0.03, 2.5);
          const n2 = S(0.46, 0.04, 2.5);
          ctx.fillStyle = '#2f3238';
          for (const n of [n1, n2]) ctx.fillRect(n[0] - 0.6, n[1] - 0.8, 1.3, 1.3);
          ctx.globalAlpha = 1;
        },
      });
      break;
    }
    case 'forge': {
      const c = S(0.46, 0, 5);
      const k = a ? (a.progress / 16) % 1 : 0;
      const cyc = a ? Math.floor(a.progress / 16) : 0;
      parts.push({
        d: c[2] + 0.01,
        draw: () => {
          ctx.globalAlpha = bt;
          // stump, anvil, glowing bar held in tongs
          const g = S(0.46, 0, 0);
          ctx.fillStyle = '#7a5430';
          ctx.beginPath();
          ctx.ellipse(g[0], g[1] - 3.5, 5.2, 2.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(g[0] - 5.2, g[1] - 7, 10.4, 3.6);
          ctx.fillStyle = '#9b7040';
          ctx.beginPath();
          ctx.ellipse(g[0], g[1] - 7, 5.2, 2.6, 0, 0, Math.PI * 2);
          ctx.fill();
          const iron = { top: '#6b707a', lit: '#4d5058', dark: '#34373e', stroke: 'rgba(10,10,14,0.7)' };
          orientedBox(ctx, S, fx, fy, 0.38, 0.54, -0.08, 0.08, 7, 8.6, iron);
          orientedBox(ctx, S, fx, fy, 0.42, 0.5, -0.045, 0.045, 8.6, 10.2, iron);
          orientedBox(ctx, S, fx, fy, 0.3, 0.62, -0.075, 0.075, 10.2, 12.4, { ...iron, top: '#8a909b' });
          const a0 = S(0.34, 0, 13);
          const a1 = S(0.56, 0, 13);
          const heat = 0.55 + 0.45 * (1 - Math.min(1, Math.abs(k - 0.58) * 2.4));
          const gl = ctx.createRadialGradient(c[0], c[1] - 7, 0.5, c[0], c[1] - 7, 13);
          gl.addColorStop(0, `rgba(255,170,70,${0.55 * heat})`);
          gl.addColorStop(1, 'rgba(255,120,30,0)');
          ctx.fillStyle = gl;
          ctx.fillRect(c[0] - 14, c[1] - 21, 28, 28);
          ctx.lineCap = 'round';
          ctx.strokeStyle = `rgb(255,${Math.round(120 + 90 * heat)},60)`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(a0[0], a0[1]);
          ctx.lineTo(a1[0], a1[1]);
          ctx.stroke();
          ctx.strokeStyle = '#55595f';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(handL[0], handL[1]);
          ctx.lineTo(a0[0], a0[1]);
          ctx.stroke();
          // sparks just after the hammer lands
          const t = (k - 0.6) / 0.25;
          if (t > 0 && t < 1) {
            ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) {
              const ang = hashUnit(cyc, i, 7) * Math.PI * 2;
              const sp = 6 + hashUnit(cyc, i, 8) * 14;
              const r0 = sp * t * 0.5;
              const r1 = sp * t;
              const ox = c[0] + 4 * (hashUnit(cyc, i, 9) - 0.5);
              ctx.strokeStyle = `rgba(255,${200 - Math.round(t * 80)},90,${1 - t})`;
              ctx.beginPath();
              ctx.moveTo(ox + Math.cos(ang) * r0, c[1] - 11 + Math.sin(ang) * r0 * 0.6 + t * t * 8);
              ctx.lineTo(ox + Math.cos(ang) * r1, c[1] - 11 + Math.sin(ang) * r1 * 0.6 + t * t * 10);
              ctx.stroke();
            }
          }
          ctx.globalAlpha = 1;
        },
      });
      break;
    }
    case 'dig': {
      const c = S(0.34, 0, 0);
      const clay = a && a.data.stype === 'clay_pit';
      parts.push({
        d: c[2] - 0.02,
        draw: () => {
          ctx.globalAlpha = bt;
          ctx.fillStyle = clay ? '#7d4a2a' : '#3f2a18';
          ctx.beginPath();
          ctx.ellipse(c[0], c[1], 7 * sc, 3 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          const m = S(0.3, 0.2, 0);
          ctx.fillStyle = clay ? '#c47f4e' : '#6a4a2c';
          ctx.beginPath();
          ctx.ellipse(m[0], m[1] - 1, 5.4 * sc, 2.8 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = clay ? 'rgba(255,225,190,0.4)' : 'rgba(255,255,255,0.1)';
          ctx.beginPath();
          ctx.ellipse(m[0] - 1, m[1] - 2, 2.4 * sc, 1.2 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        },
      });
      break;
    }
    default:
      break;
  }
}

const SACK_TONES: Partial<Record<ItemKind, [string, string, string]>> = {
  flour: ['#f5eddc', '#d9ceb4', '#a89f88'],
  charcoal: ['#4a4641', '#2e2b28', '#171513'],
  clay: ['#d99a68', '#b6764a', '#85502e'],
  ore: ['#6b6a76', '#4a4954', '#2c2b33'],
  stone: ['#c9c8bf', '#9a9a95', '#6e6e6a'],
};

/** Visible carried goods: logs and planks on the shoulder, sacks on the back, armfuls, a basket of food, a jar, tools on the belt and back. */
function drawCarried(
  ctx: CanvasRenderingContext2D,
  p: Person,
  parts: Part[],
  S: SFn,
  fx: number,
  fy: number,
  sc: number,
  lie: number,
  rig: Rig,
  toolKind: number,
  carry: number,
  jar: number,
  headC: V3,
  burden: number,
  simT: number,
): void {
  if (lie > 0.5) return;
  const inv = p.inv;
  const wood = inv.wood ?? 0;
  const planks = inv.planks ?? 0;
  const handles = inv.handles ?? 0;
  const food = (inv.berries ?? 0) + (inv.fruit ?? 0) + (inv.fish ?? 0) + (inv.smoked_fish ?? 0) + (inv.grain ?? 0);
  const bread = inv.bread ?? 0;
  const water = inv.water ?? 0;
  const hasBasket = (inv.basket ?? 0) > 0;
  const lean = rig[R.LEAN];
  const lift = lean * 8;

  // ── on the right shoulder: logs, or planks, or handles (planks go on the left if logs are already there) ──
  if (wood > 0) {
    const n = Math.min(4, Math.ceil(wood / 2));
    for (let i = 0; i < n; i++) {
      const a = S(-0.06, -0.12 + i * 0.045, 21 + i * 1.2 + lift);
      const b = S(-0.42 - i * 0.03, -0.1 + i * 0.045, 14 + i * 1.2 + lift);
      parts.push({
        d: (a[2] + b[2]) / 2 - 0.06,
        draw: () => {
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(25,15,8,0.5)';
          ctx.lineWidth = 3.7 * sc;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.strokeStyle = i % 2 ? '#9a6b3f' : '#b0804c';
          ctx.lineWidth = 2.9 * sc;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.fillStyle = '#d9b27a';
          ctx.beginPath();
          ctx.arc(b[0], b[1], 1.3 * sc, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }
  }
  if (planks > 0) {
    // a bundle of boards laid along the shoulder, a hand steadying it
    const layers = Math.min(4, Math.ceil(planks / 2));
    const side = wood > 0 ? 1 : -1;
    const c = S(-0.18, side * 0.1, 21 + lift);
    parts.push({
      d: c[2] - 0.05,
      draw: () => {
        orientedBox(ctx, S, fx, fy, -0.52, 0.2, side * 0.1 - 0.075, side * 0.1 + 0.075, 19.5 + lift, 19.5 + lift + layers * 2.1, { top: '#ecd2a0', lit: '#d8b680', dark: '#b08a58', stroke: 'rgba(60,38,14,0.55)' });
        ctx.strokeStyle = 'rgba(90,58,24,0.6)';
        ctx.lineWidth = 0.6;
        for (let i = 1; i < layers; i++) {
          const q = S(0.2, side * 0.1, 19.5 + lift + i * 2.1);
          ctx.beginPath();
          ctx.moveTo(q[0] - 3, q[1] + 1.2);
          ctx.lineTo(q[0] + 3, q[1] - 1.2);
          ctx.stroke();
        }
      },
    });
  } else if (handles > 0) {
    const n = Math.min(6, 2 + Math.ceil(handles / 3));
    for (let i = 0; i < n; i++) {
      const a = S(-0.5, 0.06 + (i % 3) * 0.035, 20.5 + Math.floor(i / 3) * 1.8 + lift);
      const b = S(0.12, 0.06 + (i % 3) * 0.035, 22 + Math.floor(i / 3) * 1.8 + lift);
      parts.push({
        d: (a[2] + b[2]) / 2 - 0.04,
        draw: () => {
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(40,25,10,0.45)';
          ctx.lineWidth = 2.3;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.strokeStyle = i % 2 ? '#c89a62' : '#d8ae78';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        },
      });
    }
  }

  // ── on the back: the heaviest of the sacked goods ──
  let sackKind: ItemKind | null = null;
  let sackW = 0;
  for (const k of ['stone', 'ore', 'clay', 'charcoal', 'flour'] as ItemKind[]) {
    const w = (inv[k] ?? 0) * (k === 'charcoal' ? 3 : k === 'flour' ? 2 : 1);
    if (w > sackW) {
      sackW = w;
      sackKind = k;
    }
  }
  if (sackKind && !(sackKind === 'clay' && carry > 0.4)) {
    const kind = sackKind;
    const n = inv[kind] ?? 0;
    // on the upper back: it follows the lean and the crouch of whoever carries it
    const c = S(-0.2 + lean * 0.45, 0, 16 - rig[R.CROUCH] * 0.6);
    const tones = SACK_TONES[kind] ?? SACK_TONES.stone!;
    parts.push({
      d: c[2] - 0.06,
      draw: () => {
        const r = (3.8 + Math.min(n, 5) * 0.85) * sc;
        ctx.fillStyle = 'rgba(25,20,15,0.4)';
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], r + 0.8, r * 0.95 + 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createRadialGradient(c[0] - r * 0.3, c[1] - r * 0.4, 0.5, c[0], c[1], r);
        g.addColorStop(0, tones[0]);
        g.addColorStop(0.65, tones[1]);
        g.addColorStop(1, tones[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], r, r * 0.92, 0, 0, Math.PI * 2);
        ctx.fill();
        if (kind !== 'stone') {
          // tied neck of the sack
          ctx.fillStyle = tones[2];
          ctx.fillRect(c[0] - 2.4, c[1] - r * 0.92 - 1.4, 4.8, 2.4);
        }
        if (kind === 'ore') {
          ctx.fillStyle = '#e0a04a';
          ctx.fillRect(c[0] - 2, c[1] - 1, 1.5, 1.3);
          ctx.fillRect(c[0] + 1, c[1] + 1.6, 1.3, 1.2);
        }
      },
    });
  }

  // ── iron bars tucked under the left arm ──
  if ((inv.iron ?? 0) > 0) {
    const n = Math.min(4, inv.iron ?? 0);
    for (let i = 0; i < n; i++) {
      const a = S(-0.3, 0.115 + i * 0.012, 12.5 + i * 1.4 + lift * 0.4);
      const b = S(0.2, 0.115 + i * 0.012, 11 + i * 1.4 + lift * 0.4);
      parts.push({
        d: (a[2] + b[2]) / 2 + 0.03,
        draw: () => {
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(10,10,16,0.6)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.strokeStyle = i % 2 ? '#8a90a0' : '#a3a9b8';
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        },
      });
    }
  }

  // ── armfuls: bricks, clay, loaves without a basket ──
  if (carry > 0.2) {
    const bricks = inv.bricks ?? 0;
    const clay = inv.clay ?? 0;
    const c = S(0.19, 0, 10);
    if (bricks > 0) {
      const layers = Math.min(3, Math.ceil(bricks / 3));
      parts.push({
        d: c[2] + 0.04,
        draw: () => {
          ctx.globalAlpha = Math.min(1, carry * 1.4);
          orientedBox(ctx, S, fx, fy, 0.1, 0.3, -0.075, 0.075, 8.4, 8.4 + layers * 3.2, { top: '#cf6a4a', lit: '#b4573f', dark: '#8c4130', stroke: 'rgba(50,20,12,0.55)' });
          ctx.globalAlpha = 1;
        },
      });
    } else if (clay > 0) {
      const lumps = Math.min(3, Math.ceil(clay / 2));
      parts.push({
        d: c[2] + 0.04,
        draw: () => {
          ctx.globalAlpha = Math.min(1, carry * 1.4);
          for (let i = 0; i < lumps; i++) {
            const q = S(0.17 + i * 0.05, (i - (lumps - 1) / 2) * 0.07, 10.4 + (i % 2) * 2.2);
            ctx.fillStyle = 'rgba(60,34,20,0.4)';
            ctx.beginPath();
            ctx.ellipse(q[0] + 0.5, q[1] + 1.2, 3.8 * sc, 2.6 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = i % 2 ? '#b97444' : '#c98557';
            ctx.beginPath();
            ctx.ellipse(q[0], q[1], 3.5 * sc, 2.7 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,225,190,0.5)';
            ctx.beginPath();
            ctx.ellipse(q[0] - 1, q[1] - 1, 1.5 * sc, 0.9 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        },
      });
    } else if (bread > 0) {
      const loaves = Math.min(5, bread);
      parts.push({
        d: c[2] + 0.04,
        draw: () => {
          ctx.globalAlpha = Math.min(1, carry * 1.4);
          // a cloth with loaves in it
          const q = S(0.18, 0, 9.4);
          ctx.fillStyle = '#e9e1cf';
          ctx.strokeStyle = 'rgba(80,70,50,0.5)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.ellipse(q[0], q[1], 7 * sc, 3 * sc, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          for (let i = 0; i < loaves; i++) {
            const lx = q[0] + (i - (loaves - 1) / 2) * 3.3 * sc;
            ctx.fillStyle = '#c4863c';
            ctx.beginPath();
            ctx.ellipse(lx, q[1] - 2.4 - (i % 2) * 1.2, 2.9 * sc, 2 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(246,200,130,0.7)';
            ctx.beginPath();
            ctx.ellipse(lx - 0.7, q[1] - 3 - (i % 2) * 1.2, 1.4 * sc, 0.8 * sc, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        },
      });
    }
  }

  // ── basket on the hip, with whatever food is in it ──
  const foodCols = [(inv.berries ?? 0) > 0 ? '#a8294f' : '', (inv.fruit ?? 0) > 0 ? '#e0723a' : '', (inv.grain ?? 0) > 0 ? '#d9b44a' : '', (inv.fish ?? 0) > 0 ? '#9ac1d4' : '', (inv.smoked_fish ?? 0) > 0 ? '#b98a4a' : '', bread > 0 ? '#c4863c' : ''].filter(Boolean);
  const foodN = food + bread;
  if (hasBasket) {
    const c = S(-0.2, 0, 15 + lean * 7);
    parts.push({
      d: c[2] - 0.05,
      draw: () => {
        ctx.fillStyle = '#b98a4f';
        ctx.strokeStyle = 'rgba(70,45,20,0.6)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(c[0] - 4.5 * sc, c[1] - 3 * sc);
        ctx.lineTo(c[0] + 4.5 * sc, c[1] - 3 * sc);
        ctx.lineTo(c[0] + 3.4 * sc, c[1] + 4 * sc);
        ctx.lineTo(c[0] - 3.4 * sc, c[1] + 4 * sc);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(70,45,20,0.45)';
        ctx.beginPath();
        ctx.moveTo(c[0] - 4 * sc, c[1] + 0.5);
        ctx.lineTo(c[0] + 4 * sc, c[1] + 0.5);
        ctx.stroke();
        if (foodN > 0) {
          for (let i = 0; i < Math.min(5, foodN); i++) {
            ctx.fillStyle = foodCols[i % foodCols.length];
            ctx.beginPath();
            if (foodCols[i % foodCols.length] === '#c4863c') ctx.ellipse(c[0] - 3 + i * 1.6, c[1] - 3.6 * sc - (i % 2) * 0.8, 2.1 * sc, 1.5 * sc, 0, 0, Math.PI * 2);
            else ctx.arc(c[0] - 3 + i * 1.6, c[1] - 3.6 * sc - (i % 2) * 0.8, 1.7 * sc, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
    });
  } else if (foodN > 0 && rig[R.HRZ] < 14 && carry < 0.2) {
    // food held in the crook of the arm / apron: a small cluster at the hip
    const c = S(0.12, 0.1, 10);
    parts.push({
      d: c[2] + 0.03,
      draw: () => {
        for (let i = 0; i < Math.min(4, foodN); i++) {
          ctx.fillStyle = foodCols[i % foodCols.length];
          ctx.strokeStyle = 'rgba(30,20,10,0.4)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.arc(c[0] + (i % 2) * 2.4 - 1.2, c[1] - Math.floor(i / 2) * 2.2, 1.6 * sc, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      },
    });
  }

  // ── water: a jar balanced on the head, or a jug at the hip ──
  const hasJar = (inv.jar ?? 0) > 0;
  if (hasJar && jar > 0.05) {
    const hx = headC[0];
    const hy = headC[1];
    parts.push({
      d: headC[2] + 0.04,
      draw: () => {
        ctx.globalAlpha = Math.min(1, jar * 1.5);
        const wobble = Math.sin(simT * 7 + p.id) * 0.4 * burden;
        const top = hy - 6.2 * sc;
        // pad of cloth
        ctx.fillStyle = '#d9cfae';
        ctx.beginPath();
        ctx.ellipse(hx + wobble, top + 0.6, 3.6, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createRadialGradient(hx - 1.5 + wobble, top - 5, 0.5, hx + wobble, top - 3, 6);
        g.addColorStop(0, '#e2a273');
        g.addColorStop(1, '#a8623a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(hx - 2.2 + wobble, top);
        ctx.quadraticCurveTo(hx - 5.4 + wobble, top - 3.5, hx - 3 + wobble, top - 7);
        ctx.lineTo(hx - 1.8 + wobble, top - 9);
        ctx.lineTo(hx + 1.8 + wobble, top - 9);
        ctx.lineTo(hx + 3 + wobble, top - 7);
        ctx.quadraticCurveTo(hx + 5.4 + wobble, top - 3.5, hx + 2.2 + wobble, top);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,35,18,0.65)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = '#6d3f22';
        ctx.beginPath();
        ctx.ellipse(hx + wobble, top - 9, 2.4, 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      },
    });
  } else if (hasJar) {
    const c = S(0.02, -0.19, 9);
    parts.push({
      d: c[2] + 0.03,
      draw: () => {
        ctx.fillStyle = '#b6703f';
        ctx.strokeStyle = 'rgba(70,35,18,0.6)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], 2.8 * sc, 3.5 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#6d3f22';
        ctx.fillRect(c[0] - 1, c[1] - 4.8 * sc, 2, 1.6);
      },
    });
  }
  if (water > 0 && !hasJar) {
    const c = S(0.04, 0.2, 9);
    parts.push({
      d: c[2] + 0.03,
      draw: () => {
        ctx.fillStyle = '#6b8fb3';
        ctx.strokeStyle = 'rgba(30,40,60,0.55)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], 2.6 * sc, 3.4 * sc, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4b6784';
        ctx.fillRect(c[0] - 0.9, c[1] - 4.8 * sc, 1.8, 1.8);
      },
    });
  }

  // ── tools when not in use: strapped on the back, or hung at the belt ──
  if (toolKind === 0) {
    const tools: string[] = [];
    if ((inv.axe ?? 0) > 0) tools.push('axe');
    if ((inv.pick ?? 0) > 0) tools.push('pick');
    if ((inv.hoe ?? 0) > 0) tools.push('hoe');
    tools.forEach((_t, i) => {
      const a = S(-0.14, 0.05 + i * 0.05, 8);
      const b = S(-0.18, 0.05 + i * 0.05, 26);
      parts.push({
        d: (a[2] + b[2]) / 2 - 0.07,
        draw: () => {
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#7a5434';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.fillStyle = '#bcbcb4';
          ctx.fillRect(b[0] - 2.4, b[1] - 1.4, 4.8, 2.6);
        },
      });
    });
    if ((inv.saw ?? 0) > 0) {
      // a long blade slung across the back
      const a = S(-0.2, -0.04, 7);
      const b = S(-0.2, 0.08, 27);
      parts.push({
        d: (a[2] + b[2]) / 2 - 0.08,
        draw: () => {
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#c4c9d0';
          ctx.lineWidth = 2.3;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
          ctx.strokeStyle = '#6f757d';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a[0] + 1.3, a[1]);
          ctx.lineTo(b[0] + 1.3, b[1]);
          ctx.stroke();
          ctx.strokeStyle = '#6b4a2c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(b[0], b[1]);
          ctx.lineTo(b[0] + 0.4, b[1] - 3.4);
          ctx.stroke();
        },
      });
    }
    if ((inv.hammer ?? 0) > 0) {
      const c = S(-0.02, -0.15, 10);
      parts.push({
        d: c[2] + 0.02,
        draw: () => {
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#7a5434';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(c[0], c[1] - 1);
          ctx.lineTo(c[0] - 1, c[1] + 5);
          ctx.stroke();
          ctx.fillStyle = '#8f8f88';
          ctx.fillRect(c[0] - 2.6, c[1] - 3, 5.2, 3);
        },
      });
    }
  }
}
