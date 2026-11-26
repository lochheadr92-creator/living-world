// The tiny rig people are drawn from (hips, shoulders, head, hands, feet), shared by the pose code in characters.ts and the
// richer animations in anim_rig.ts. Presentation only: nothing here is read by the simulation.
import type { Person } from '../sim/types';

export const R = {
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
  KNEEL: 22, // 0.5 = the right knee on the ground, 1 = both
  PH: 23, // 0..1 phase of the work cycle (for props that move with it)
  SPIN: 24, // the body turned from its heading (radians): a dancer's turn, a child dodging
  KNZ: 25, // knees raised (px): knees drawn up when seated
  ELB: 26, // elbows pushed out sideways (tiles): hands on hips, hands to the face
  N: 27,
} as const;

export type Rig = Float32Array;

export const newRig = (): Rig => new Float32Array(R.N);

export const ease = (t: number): number => t * t * (3 - 2 * t);

export function setBase(r: Rig): void {
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
export function cycleOf(p: Person, alphaT: number, cycleTicks: number): number {
  const a = p.activity;
  if (!a) return 0;
  let prog = a.progress;
  if (a.progress >= a.pprogress) prog = a.pprogress + (a.progress - a.pprogress) * alphaT;
  return ((prog / cycleTicks) % 1 + 1) % 1;
}

export interface PoseCtx {
  t: number;
  alphaT: number;
  walk: number; // 0..1 walk-cycle phase
  p: Person;
  speaking: boolean;
  stage: string;
  /** distance covered since the last frame (tiles) */
  moved: number;
}
