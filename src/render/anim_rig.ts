// The rig for each animation that is not one of the simulation's own poses (animation.ts chooses which). Presentation only.
//
// Figures are small on screen, so each one is told apart by the outline: seated, kneeling, bowed, reaching up, arms wide.
// Motion is slow and driven by simulation time (`c.t`) or the activity's own progress (`pr`), never the wall clock, so it
// freezes when the world is paused and repeats exactly on a replay.
import { clamp, smoothstep } from '../sim/util';
import type { PoseKind } from '../sim/types';
import type { AnimId, Condition } from './animation';
import { R, cycleOf, ease, setBase } from './rig';
import type { PoseCtx, Rig } from './rig';
import { isWorkAnim, workRig } from './anim_work'; // work (H)

const TAU = Math.PI * 2;
/** 0 outside [a, b], a smooth rise and fall inside it */
const bump = (k: number, a: number, b: number): number => (k <= a || k >= b ? 0 : Math.sin(((k - a) / (b - a)) * Math.PI));
const frac = (x: number): number => x - Math.floor(x);

export function animRig(anim: AnimId, pose: PoseKind, c: PoseCtx, r: Rig, base: (pose: PoseKind) => void): void {
  const { t, p } = c;
  const id = p.id;
  const sp = c.speaking;
  const pr = (n: number): number => cycleOf(p, c.alphaT, n);
  /** both hands: forward, sideways, height (left then right) */
  const H = (lu: number, lv: number, lz: number, ru: number, rv: number, rz: number): void => {
    r[R.HLU] = lu;
    r[R.HLV] = lv;
    r[R.HLZ] = lz;
    r[R.HRU] = ru;
    r[R.HRV] = rv;
    r[R.HRZ] = rz;
  };
  /** a hand height above the ground, whatever the crouch (set the crouch first) */
  const Z = (z: number): number => z + r[R.CROUCH] * 0.4;
  const fresh = (): void => {
    setBase(r);
    r[R.BOB] = Math.sin(t * 2.1 + id) * 0.25;
  };
  const mouth = (rate = 11): void => {
    r[R.MOUTH] = sp ? (Math.sin(t * rate + id) > -0.1 ? 1 : 0) : 0;
  };
  /** seated on the ground: hips down, feet out in front, knees drawn up by `knz` */
  const seat = (crouch: number, feetU: number, knz: number, lean: number): void => {
    fresh();
    r[R.SIT] = 1;
    r[R.CROUCH] = crouch;
    r[R.FLU] = feetU;
    r[R.FRU] = feetU;
    r[R.KNZ] = knz;
    r[R.LEAN] = lean;
  };
  const crossLegged = (lean: number): void => {
    seat(6.5, 0.15, 1.2, lean);
    r[R.FLU] = 0.17;
    r[R.FRU] = 0.13;
    r[R.FLV] = 0.16;
    r[R.FRV] = -0.16;
  };
  /** on both knees, or on the right knee with the left foot planted */
  const kneel = (both: boolean, crouch: number, lean: number): void => {
    fresh();
    r[R.KNEEL] = both ? 1 : 0.5;
    r[R.CROUCH] = crouch;
    r[R.LEAN] = lean;
    r[R.FRU] = -0.2;
    r[R.FLU] = both ? -0.2 : 0.13;
    if (!both) r[R.KNZ] = 3.2;
  };
  /** arms for somebody speaking to a company, seated or standing (`sh` = shoulder height) */
  const speakingArms = (kind: 'story' | 'sing' | 'thanks' | 'address'): void => {
    const sh = 20.6 - 0.7 * r[R.CROUCH];
    const lean = r[R.LEAN];
    if (kind === 'story') {
      const g = Math.sin(t * 2.4 + id);
      r[R.LEAN] = lean + 0.07;
      H(0.2, 0.17 + 0.05 * g, Z(sh + 1 + 4.5 * g), 0.22, -0.17 + 0.05 * g, Z(sh + 1 - 4.5 * g));
      mouth();
    } else if (kind === 'sing') {
      const g = Math.sin(t * 3 + id);
      r[R.HEAD_Z] = 0.9;
      r[R.HEAD_U] = -0.03;
      r[R.BOB] += Math.abs(g) * 0.8;
      H(0.06, 0.25, Z(sh - 3 + 2.6 * g), 0.06, -0.25, Z(sh - 3 - 2.6 * g));
      r[R.MOUTH] = Math.sin(t * 3 + id) > -0.5 ? 1 : 0;
    } else if (kind === 'thanks') {
      const bow = Math.max(0, Math.sin(t * 2.2 + id));
      r[R.LEAN] = lean + 0.04 + bow * 0.04;
      r[R.HEAD_Z] = -0.5 - bow * 0.7;
      H(0.27, 0.11, Z(sh - 5), lean + 0.08, -0.02, Z(sh - 3));
      mouth();
    } else {
      r[R.LEAN] = lean + 0.05;
      H(0.25, 0.09 + 0.08 * Math.sin(t * 2 + id), Z(sh - 4), 0.17, -0.12, Z(sh + 8.5 + 1.5 * Math.sin(t * 4 + id)));
      mouth();
    }
  };

  // work (H): the main work motions live in anim_work.ts
  if (isWorkAnim(anim)) {
    workRig(anim, c, r);
    return;
  }

  switch (anim) {
    // ───────────────────────── B: standing about ─────────────────────────
    case 'idle': {
      // hands on hips, shifting weight; now and then a stretch
      fresh();
      const k = frac(t * 0.16 + id * 0.37);
      const sway = Math.sin(t * 0.9 + id);
      const st = bump(k, 0.72, 0.96);
      r[R.ELB] = 0.13 * (1 - st);
      H(-0.01, 0.12 + st * 0.07, 12.2 + st * 16.5, -0.01, -0.12 - st * 0.07, 12.2 + st * 16.5);
      r[R.LEAN] = -0.02 * st;
      r[R.HEAD_Z] = st * 0.7 + sway * 0.15;
      r[R.BOB] += sway * 0.25 + st * 0.6;
      r[R.FLU] = 0.03 * sway;
      r[R.FRU] = -0.03 * sway;
      break;
    }
    case 'fire_sit':
    case 'fire_story':
    case 'fire_sing':
    case 'fire_listen':
    case 'fire_thanks':
    case 'fire_address': {
      seat(6.6, 0.3, 2.2, -0.04);
      r[R.FRU] = 0.24;
      const sway = Math.sin(t * 0.7 + id);
      r[R.HEAD_U] = sway * 0.012;
      if (anim === 'fire_sit') {
        // leaning back on one hand, the other on a knee
        H(-0.21, 0.13, Z(1.2), 0.2, -0.06, Z(7.6));
        r[R.HEAD_Z] = sway * 0.2;
      } else if (anim === 'fire_listen') {
        // leaning in, chin in the hands
        r[R.LEAN] = 0.1;
        r[R.HEAD_U] = 0.05;
        r[R.ELB] = 0.03;
        H(0.16, 0.03, Z(16.6), 0.16, -0.03, Z(16.6));
      } else speakingArms(anim === 'fire_story' ? 'story' : anim === 'fire_sing' ? 'sing' : anim === 'fire_thanks' ? 'thanks' : 'address');
      break;
    }
    case 'stand_thanks':
    case 'stand_address': {
      fresh();
      speakingArms(anim === 'stand_thanks' ? 'thanks' : 'address');
      break;
    }
    case 'stroll': {
      // walking out together: an easy pace, one arm crooked for the other, a hand behind the back
      base(pose);
      r[R.FLU] *= 0.82;
      r[R.FRU] *= 0.82;
      r[R.BOB] *= 0.7;
      r[R.ELB] = 0.05;
      H(-0.08, 0.04, 11.6, 0.11, -0.1, 14.6);
      r[R.HEAD_Z] = 0.3;
      break;
    }
    case 'walkout': {
      // standing close, a hand held out to the other's
      fresh();
      const s = Math.sin(t * 1.3 + id);
      r[R.LEAN] = 0.05 + 0.012 * s;
      r[R.HEAD_U] = 0.02;
      r[R.BOB] += 0.3 * s;
      H(0.12, 0.05, 15.6, 0.28, -0.03, 12.6 + 0.5 * s);
      mouth();
      break;
    }
    case 'greet_run': {
      // running to meet somebody, arms flung wide
      base('run');
      const s = Math.sin(c.walk * TAU);
      r[R.LEAN] = 0.12;
      r[R.MOUTH] = 1;
      H(0.1, 0.25, 22 + s * 1.5, 0.1, -0.25, 22 - s * 1.5);
      break;
    }
    case 'embrace': {
      fresh();
      r[R.LEAN] = 0.11;
      r[R.HEAD_U] = 0.03;
      r[R.BOB] += Math.sin(t * 2.2 + id) * 0.5;
      r[R.FLU] = 0.06;
      r[R.FRU] = -0.04;
      H(0.3, 0.07, 17.6, 0.3, -0.07, 16.6);
      mouth();
      break;
    }
    case 'lookout': {
      // a hand shading the eyes, the other on the hip, up on the toes now and then (the simulation turns them round)
      fresh();
      const rise = bump(frac(t * 0.2 + id * 0.31), 0.5, 0.9);
      r[R.ELB] = 0.075;
      r[R.LEAN] = 0.04;
      r[R.HEAD_U] = 0.03;
      r[R.HEAD_Z] = 0.3 + rise * 0.4;
      r[R.BOB] += rise * 0.9;
      H(-0.01, 0.12, 12.2, 0.12, -0.03, 26.6);
      break;
    }
    case 'search': {
      // stooped, parting the grass with both hands
      fresh();
      const s = Math.sin(t * 2.2 + id);
      r[R.CROUCH] = 2.6;
      r[R.LEAN] = 0.2;
      r[R.HEAD_U] = 0.07;
      r[R.HEAD_Z] = -0.5;
      r[R.FLU] = 0.05 * s;
      r[R.FRU] = -0.05 * s;
      H(0.27, 0.13 + 0.07 * s, Z(6.5), 0.27, -0.13 + 0.07 * s, Z(6.5));
      break;
    }
    case 'claim': {
      // a hand flat on the doorpost, looking the place up and down
      fresh();
      const pat = Math.max(0, Math.sin(t * 3 + id));
      r[R.ELB] = 0.075;
      r[R.LEAN] = -0.01;
      r[R.HEAD_U] = -0.02;
      r[R.HEAD_Z] = 0.5 + 0.3 * Math.sin(t * 0.8 + id);
      H(-0.01, 0.12, 12.2, 0.34, -0.05, 19.5 + pat * 0.8);
      break;
    }
    case 'respects': {
      // down on one knee at the grave, head bowed, a hand to the ground
      kneel(false, 4.8, 0.12);
      r[R.HEAD_U] = 0.06;
      r[R.HEAD_Z] = -1.6;
      r[R.EYES] = 0;
      H(0.15, 0.08, Z(8.6), 0.3, -0.05, Z(1.8));
      break;
    }
    case 'funeral': {
      // standing with the head bowed and the hands clasped; a hand to the eyes now and then
      fresh();
      const wipe = bump(frac(t * 0.11 + id * 0.53), 0.8, 0.95);
      r[R.LEAN] = 0.05;
      r[R.HEAD_U] = 0.06;
      r[R.HEAD_Z] = -1.5;
      r[R.EYES] = Math.sin(t * 0.4 + id) > 0 ? 0 : 1;
      H(0.09, 0.02, 10.2, 0.09 + wipe * 0.03, -0.02, 10.2 + wipe * 14.5);
      break;
    }
    case 'lookin': {
      // bending to somebody, a hand out to them, the other on the knee
      fresh();
      const pat = Math.max(0, Math.sin(t * 2 + id));
      r[R.CROUCH] = 1.6;
      r[R.LEAN] = 0.12;
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -0.2 - pat * 0.3;
      H(0.13, 0.07, Z(8.6), 0.29, -0.04, Z(13.5 + pat));
      mouth();
      break;
    }
    case 'mind': {
      // minding a child: arms folded, watching; then down to the child's height with the arms open
      fresh();
      const k = frac(t * 0.11 + id * 0.29);
      const down = ease(clamp((k - 0.5) / 0.08, 0, 1)) - ease(clamp((k - 0.9) / 0.08, 0, 1));
      const up = 1 - down;
      r[R.CROUCH] = 5.5 * down;
      r[R.LEAN] = 0.02 + 0.1 * down;
      r[R.ELB] = 0.055 * up;
      r[R.KNZ] = 2 * down;
      H(0.09 * up + 0.27 * down, 0.03 * up + 0.13 * down, Z(16.6 * up + 9 * down), 0.09 * up + 0.27 * down, -0.03 * up - 0.13 * down, Z(16 * up + 9 * down));
      r[R.HEAD_Z] = 0.2 * Math.sin(t * 0.8 + id);
      break;
    }
    case 'attend_birth': {
      // on both knees beside her, both hands busy
      kneel(true, 5.2, 0.14);
      const s = Math.sin(t * 1.8 + id);
      r[R.HEAD_U] = 0.05;
      H(0.3, 0.06, Z(5 + s), 0.3, -0.06, Z(5 - s));
      break;
    }
    case 'search_walk': {
      // out after dark looking for somebody: walking with a hand to the brow
      base(pose);
      r[R.LEAN] += 0.03;
      r[R.ELB] = 0.06;
      r[R.HRU] = 0.12;
      r[R.HRV] = -0.03;
      r[R.HRZ] = 26.6;
      break;
    }
    case 'call': {
      // both hands cupped to the mouth, calling
      fresh();
      const pulse = Math.max(0, Math.sin(t * 2.6 + id));
      r[R.LEAN] = -0.04 - pulse * 0.02;
      r[R.ELB] = 0.09;
      r[R.HEAD_Z] = 0.4 + pulse * 0.3;
      r[R.BOB] += pulse * 0.5;
      r[R.MOUTH] = pulse > 0.2 ? 1 : 0;
      H(0.12, 0.04, 24.4, 0.12, -0.04, 24.4);
      break;
    }
    case 'celebrate': {
      // clapping, and now and then both arms up with a hop
      fresh();
      const apart = Math.abs(Math.sin((t * 1.1 + id * 0.2) * Math.PI));
      const ch = bump(frac(t * 0.23 + id * 0.41), 0.68, 0.96);
      r[R.BOB] += ch * 1.8 + 0.3 * apart;
      r[R.HEAD_Z] = ch * 0.5;
      r[R.MOUTH] = ch > 0.3 ? 1 : sp && Math.sin(t * 11 + id) > -0.1 ? 1 : 0;
      H(0.16, 0.02 + apart * 0.09 + ch * 0.13, 18 + ch * 10.5, 0.16, -0.02 - apart * 0.09 - ch * 0.13, 18 + ch * 10.5);
      break;
    }
    case 'market': {
      // weighing one thing against another, a hand up and a hand down
      fresh();
      const s = Math.sin(t * 1.9 + id);
      r[R.LEAN] = 0.07;
      r[R.HEAD_Z] = -0.2 + 0.25 * Math.sin(t * 3.1 + id);
      H(0.24, 0.08, 14 + 2.6 * s, 0.24, -0.08, 14 - 2.6 * s);
      mouth();
      break;
    }
    case 'dance': {
      // arms up, hopping from foot to foot, turning; stepping round the ring when the simulation says they step
      const stepping = pose === 'walk';
      base(stepping ? 'walk' : 'stand');
      const f = t * 5.2 + id;
      const s = Math.sin(f);
      const kk = frac(t * 0.19 + id * 0.3);
      r[R.SPIN] = Math.sin(t * 1.3 + id * 0.7) * 0.8 + (kk > 0.8 ? ((kk - 0.8) / 0.2) * TAU : 0);
      r[R.ELB] = 0.04;
      r[R.BOB] = Math.abs(s) * 2.2;
      r[R.HEAD_Z] = 0.4;
      r[R.LEAN] = 0.02;
      H(0.04, 0.21, 24.5 + 3.6 * s, 0.04, -0.21, 24.5 - 3.6 * s);
      if (!stepping) {
        r[R.FLL] = Math.max(0, s) * 3.2;
        r[R.FRL] = Math.max(0, -s) * 3.2;
        r[R.FLU] = 0.07 * s;
        r[R.FRU] = -0.07 * s;
      }
      break;
    }
    case 'trek': {
      // a long road: a steady walk, a hand up on the pack strap
      base(pose);
      r[R.LEAN] += 0.04;
      r[R.ELB] = 0.03;
      r[R.HRU] = 0.06;
      r[R.HRV] = -0.09;
      r[R.HRZ] = 19.4;
      r[R.HEAD_Z] = 0.2;
      break;
    }
    case 'barter': {
      // both hands held out with what is offered
      fresh();
      r[R.LEAN] = 0.06;
      r[R.HEAD_Z] = -0.2 + 0.25 * Math.sin(t * 2.4 + id);
      H(0.28, 0.07, 14.2 + 1.2 * Math.sin(t * 1.6 + id), 0.28, -0.07, 14.2 + 1.2 * Math.sin(t * 1.6 + id + 1.6));
      mouth();
      break;
    }
    case 'trudge': {
      // moving house: bowed forward, both hands up at the shoulders, shorter steps
      base(pose);
      r[R.LEAN] += 0.1;
      r[R.CROUCH] += 1;
      r[R.HEAD_Z] = -0.6;
      r[R.HEAD_U] = 0.03;
      r[R.FLU] *= 0.82;
      r[R.FRU] *= 0.82;
      H(0.03, 0.09, Z(19.6), 0.03, -0.09, Z(19.6));
      break;
    }
    case 'unpack': {
      // setting things down at the new place: bend, put down, straighten, turn to the next
      fresh();
      const k = pr(44);
      const low = Math.pow(bump(k, 0, 0.6), 0.8);
      const side = bump(k, 0.6, 1);
      r[R.CROUCH] = 4.2 * low;
      r[R.LEAN] = 0.06 + 0.16 * low;
      r[R.HEAD_U] = 0.04 * low;
      H(0.22, 0.08 + 0.1 * side, Z(14 - 9.5 * low), 0.22, -0.08 + 0.1 * side, Z(14 - 9.5 * low));
      break;
    }

    // ───────────────────────── C: seated ─────────────────────────
    case 'rest': {
      // slumped forward, forearms on the knees; a hand across the brow now and then
      seat(6.5, 0.3, 1.6, 0.13);
      const w = bump(frac(t * 0.09 + id * 0.47), 0.82, 0.95);
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -1 + 0.15 * Math.sin(t * 0.7 + id) + w * 0.6;
      H(0.27, 0.04, Z(6.2), 0.27 - w * 0.12, -0.04, Z(6.2 + w * 15.8));
      break;
    }
    case 'warm': {
      // hunched to the fire with both palms out, shivering; the hands rubbed together now and then
      seat(6.5, 0.24, 3.2, 0.17);
      const rub = bump(frac(t * 0.2 + id * 0.3), 0.6, 0.95);
      const ru = Math.sin(t * 14) * 0.02 * rub;
      r[R.BOB] += Math.sin(t * 23 + id) * 0.3;
      r[R.HEAD_U] = 0.04;
      r[R.HEAD_Z] = -0.4;
      H(0.37 - rub * 0.12 + ru, 0.075 - rub * 0.055, Z(11.5 - rub * 1.5), 0.37 - rub * 0.12 - ru, -0.075 + rub * 0.055, Z(11.5 - rub * 1.5));
      break;
    }
    case 'alone': {
      // knees drawn up and held, the head down on them
      seat(6.8, 0.15, 6, 0.1);
      r[R.LEAN] += Math.sin(t * 0.8 + id) * 0.012;
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -2.1;
      H(0.2, 0.035, Z(8.8), 0.2, -0.035, Z(8.2));
      break;
    }
    case 'meal_sit': {
      // cross-legged at the meal, hands in the lap; a reach to the table now and then
      crossLegged(0.02);
      const rc = bump(frac(t * 0.13 + id * 0.37), 0.7, 0.9);
      r[R.LEAN] += rc * 0.08;
      r[R.HEAD_U] = Math.sin(t * 0.6 + id) * 0.01;
      H(0.13, 0.05, Z(8.6), 0.13 + rc * 0.22, -0.05, Z(8.6 + rc));
      if (sp) {
        r[R.HRZ] = Z(13 + Math.sin(t * 5) * 2.5);
        mouth(9);
      }
      break;
    }
    case 'meal_eat': {
      // eating seated with the others: a bowl in the lap, the hand to the mouth
      crossLegged(0.03);
      const lift = Math.sin(pr(10) * Math.PI);
      r[R.MOUTH] = lift > 0.7 ? 1 : 0;
      r[R.HEAD_Z] = -lift * 0.4;
      H(0.17, 0.04, Z(9.2), 0.1 + lift * 0.05, -0.05, Z(9 + lift * 11.5));
      break;
    }
    case 'vigil': {
      // on the knees beside the sick, a hand on them; the head nodding as the night goes on
      kneel(true, 5, 0.1);
      const nod = Math.max(0, Math.sin(t * 0.5 + id));
      const dab = bump(frac(t * 0.12 + id * 0.21), 0.6, 0.85);
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -0.8 - nod * 0.7;
      H(0.1, 0.05, Z(8), 0.34, -0.04, Z(6 + dab * 3.5));
      break;
    }
    case 'lyingin': {
      // lying back propped on an arm, a hand on the belly, the knees up
      seat(8.6, 0.36, 3.6, -0.4);
      r[R.FRU] = 0.3;
      r[R.HEAD_U] = 0.03;
      r[R.HEAD_Z] = 0.2;
      r[R.BOB] = Math.sin(t * 1.6 + id) * 0.4;
      H(-0.56, 0.12, Z(1), -0.1, -0.03, Z(9.6));
      break;
    }
    case 'comfort': {
      // sitting with the grieving: leaning to them, an arm out round their shoulder
      seat(6.5, 0.28, 1.8, 0.07);
      const pat = Math.max(0, Math.sin(t * 1.7 + id));
      r[R.HEAD_U] = 0.04;
      r[R.HEAD_Z] = -0.5;
      H(0.2, 0.06, Z(7.5), 0.3, -0.11, Z(15 + pat));
      mouth();
      break;
    }
    case 'settle': {
      // bent low over a small child, patting them down for the night
      kneel(true, 6, 0.25);
      const s = Math.sin(t * 1.5 + id);
      r[R.HEAD_U] = 0.08;
      r[R.HEAD_Z] = -1.2;
      H(0.33, 0.07, Z(3 + Math.max(0, s) * 2), 0.33, -0.07, Z(3 + Math.max(0, -s) * 2));
      break;
    }
    case 'standup': {
      // standing up for somebody: feet planted, a palm thrust out at the other side; arms folded once it is said
      fresh();
      r[R.FLU] = -0.08;
      r[R.FRU] = 0.11;
      r[R.FLV] = 0.1;
      r[R.FRV] = -0.1;
      r[R.LEAN] = 0.05;
      const said = !!(p.activity?.data.side as { said?: true } | undefined)?.said && !sp;
      if (!said) {
        const push = Math.max(0, Math.sin(t * 4 + id));
        r[R.ELB] = 0.075;
        H(-0.01, 0.12, 12.2, 0.32 + push * 0.05, -0.06, 19.6);
        mouth(13);
      } else {
        r[R.ELB] = 0.055;
        r[R.HEAD_Z] = 0.4;
        H(0.1, 0.035, 16.6, 0.1, -0.035, 16);
      }
      break;
    }

    // ───────────────────────── D: work ─────────────────────────
    case 'whittle': {
      // making a thing by hand: seated, the piece held in the lap, short strokes along it
      crossLegged(0.1);
      const k = pr(8);
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -0.6;
      r[R.PH] = k;
      H(0.22, 0.03, Z(9.5), 0.2 + 0.09 * Math.sin(k * TAU), -0.04, Z(10.5));
      break;
    }
    case 'mend_tool': {
      // a tool across the knees, binding it round and round
      crossLegged(0.1);
      const k = pr(12);
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -0.6;
      r[R.PH] = k;
      H(0.2, 0.05, Z(9.2), 0.24 + 0.035 * Math.cos(k * TAU), -0.03, Z(10.2 + 2.2 * Math.sin(k * TAU)));
      break;
    }
    case 'mend_cart': {
      // down on a knee at the cart, hammering low
      kneel(false, 4.6, 0.16);
      const k = pr(12);
      const strike = Math.pow(Math.max(0, Math.sin(k * TAU)), 2);
      r[R.HEAD_U] = 0.05;
      r[R.TOOL] = 1 - strike * 1.9;
      r[R.PH] = k;
      H(0.33, 0.06, Z(5), 0.22 + strike * 0.12, -0.06, Z(16 - strike * 11));
      break;
    }
    case 'weave': {
      // seated at cloth work, the hands passing across and drawing up
      crossLegged(0.08);
      const s = Math.sin(pr(16) * TAU);
      r[R.HEAD_Z] = -0.4;
      H(0.22, 0.09 - 0.07 * s, Z(10 + Math.abs(s) * 2), 0.22, -0.09 - 0.07 * s, Z(10 + Math.abs(s) * 2));
      break;
    }
    case 'butcher': {
      // on both knees over the body, one hand holding, the other cutting
      kneel(true, 5.6, 0.22);
      const st = Math.sin(pr(10) * TAU);
      r[R.HEAD_U] = 0.07;
      r[R.HEAD_Z] = -0.8;
      H(0.31, 0.06, Z(3), 0.26 + 0.09 * st, -0.05, Z(3.4 + Math.max(0, st) * 1.6));
      break;
    }
    case 'feed_animal': {
      // bent with a hand held out low to the animal
      fresh();
      const sh = bump(pr(15), 0.2, 0.6);
      r[R.CROUCH] = 2;
      r[R.LEAN] = 0.14;
      r[R.HEAD_U] = 0.04;
      H(0.1, 0.05, Z(14), 0.34 + sh * 0.03, -0.05, Z(8 + sh * 2.5));
      break;
    }
    case 'shear': {
      // down on a knee, one hand holding the fleece, the other clipping along it
      kneel(false, 4.6, 0.18);
      const k = pr(20);
      const tri = 1 - Math.abs(2 * k - 1);
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -0.5;
      H(0.3, 0.07, Z(8), 0.18 + 0.14 * tri, -0.04, Z(8.6 + Math.sin(k * 3 * TAU) * 0.9));
      break;
    }
    case 'milk': {
      // down on a knee beside the animal, both hands low and forward, pulling down in turn
      kneel(false, 4.6, 0.16);
      const k = pr(10) * TAU;
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -0.6;
      H(0.3, 0.06, Z(6.2 + 1.3 * Math.sin(k)), 0.3, -0.06, Z(6.2 - 1.3 * Math.sin(k)));
      break;
    }
    case 'tether': {
      // down on a knee tying at the ground
      kneel(false, 4.6, 0.17);
      const k = pr(14) * TAU;
      r[R.HEAD_U] = 0.06;
      r[R.HEAD_Z] = -0.8;
      H(0.28 + 0.03 * Math.cos(k), 0.035, Z(2.6 + 1.2 * Math.sin(k)), 0.28 - 0.03 * Math.cos(k), -0.035, Z(2.6 - 1.2 * Math.sin(k)));
      break;
    }
    case 'setgear': {
      // on both knees, the hands wide and low, spreading and pegging
      kneel(true, 5.6, 0.2);
      const s = Math.sin(pr(20) * TAU);
      r[R.HEAD_U] = 0.06;
      r[R.HEAD_Z] = -0.7;
      H(0.3 + 0.05 * s, 0.15, Z(2.6 + Math.max(0, s)), 0.3 - 0.05 * s, -0.15, Z(2.6 + Math.max(0, -s)));
      break;
    }
    case 'haul_net': {
      // braced and leaning back, drawing it in hand over hand
      fresh();
      const k = pr(12);
      const pull = (a: number): number => (a < 0.7 ? a / 0.7 : 1 - (a - 0.7) / 0.3);
      const a1 = pull(frac(k));
      const a2 = pull(frac(k + 0.5));
      r[R.CROUCH] = 2.2;
      r[R.LEAN] = -0.06;
      r[R.FLU] = -0.1;
      r[R.FRU] = 0.13;
      H(0.32 - 0.2 * a1, 0.05, Z(9 + 2 * a1), 0.32 - 0.2 * a2, -0.05, Z(9 + 2 * a2));
      break;
    }
    case 'hangskin': {
      // stretched up on the toes, both hands high
      fresh();
      const s = Math.sin(t * 1.6 + id);
      r[R.LEAN] = 0.03;
      r[R.BOB] += 1;
      r[R.HEAD_Z] = 0.6;
      r[R.HEAD_U] = -0.02;
      H(0.24, 0.09, 31 + s * 0.7, 0.24, -0.09, 31 - s * 0.7);
      break;
    }
    case 'workbench': {
      // both hands working at bench height, one forward as the other comes back
      fresh();
      const s = Math.sin(pr(14) * TAU);
      r[R.CROUCH] = 0.8;
      r[R.LEAN] = 0.1;
      r[R.HEAD_U] = 0.04;
      r[R.HEAD_Z] = -0.3;
      H(0.23 + 0.07 * s, 0.06, Z(13 + Math.abs(s) * 1.2), 0.23 - 0.07 * s, -0.06, Z(13 + Math.abs(s) * 1.2));
      break;
    }
    case 'stalk': {
      // closing on a deer: low, slow, the hands held ready
      base(pose);
      r[R.CROUCH] += 3;
      r[R.LEAN] += 0.12;
      r[R.HEAD_U] = 0.05;
      r[R.FLU] *= 0.8;
      r[R.FRU] *= 0.8;
      r[R.BOB] *= 0.5;
      r[R.TOOL] = 0.1;
      H(0.2, 0.07, Z(9.5), 0.14, -0.08, Z(10.5));
      break;
    }
    case 'strike': {
      // the strike at the deer: drawn back, then a long lunge
      fresh();
      const k = pr(14);
      let w = 0;
      let th = 0;
      if (k < 0.45) w = ease(k / 0.45);
      else if (k < 0.6) {
        th = (k - 0.45) / 0.15;
        w = 1 - th;
      } else th = 1 - ease((k - 0.6) / 0.4);
      r[R.CROUCH] = 2.5;
      r[R.LEAN] = 0.12 + 0.12 * th - 0.04 * w;
      r[R.HEAD_U] = 0.04;
      r[R.FLU] = -0.16;
      r[R.FRU] = 0.1 + 0.12 * th;
      r[R.TOOL] = -0.1;
      H(0.27, 0.06, Z(15), 0.1 - 0.14 * w + 0.3 * th, -0.06, Z(13.5 + 5 * w));
      break;
    }
    case 'guard': {
      // standing against a wolf: feet wide, both hands on the levelled shaft, a jab forward
      fresh();
      const jab = bump(pr(12), 0.5, 0.8);
      r[R.CROUCH] = 2;
      r[R.LEAN] = 0.1 + 0.05 * jab;
      r[R.HEAD_U] = 0.03;
      r[R.FLU] = -0.14;
      r[R.FRU] = 0.14 + 0.04 * jab;
      r[R.FLV] = 0.09;
      r[R.FRV] = -0.09;
      r[R.TOOL] = -0.12;
      r[R.MOUTH] = jab > 0.2 ? 1 : 0;
      H(0.31 + 0.1 * jab, 0.035, Z(14), 0.1 + 0.1 * jab, -0.07, Z(13.4));
      break;
    }
    case 'charge': {
      // running at the wolf, the right hand low and forward
      base(pose);
      r[R.HRU] = 0.16;
      r[R.HRV] = -0.08;
      r[R.HRZ] = 14.5;
      r[R.TOOL] = 0.1;
      break;
    }
    case 'putaway': {
      // putting goods into a store: from the chest down and in, and left there
      fresh();
      const a = p.activity;
      const k = a ? clamp(a.progress / Math.max(1, a.duration), 0, 1) : 0;
      const low = smoothstep(0.1, 0.6, k);
      const push = bump(k, 0.5, 0.95);
      r[R.CROUCH] = 4.6 * low;
      r[R.LEAN] = 0.05 + 0.15 * low;
      r[R.HEAD_U] = 0.04 * low;
      H(0.2 + 0.14 * push, 0.07, Z(15 - 10.5 * low), 0.2 + 0.14 * push, -0.07, Z(15 - 10.5 * low));
      break;
    }
    case 'takeout': {
      // taking goods out: reaching down and in, then up to the chest
      fresh();
      const a = p.activity;
      const k = a ? clamp(a.progress / Math.max(1, a.duration), 0, 1) : 0;
      const up = smoothstep(0.4, 0.9, k);
      r[R.CROUCH] = 4.6 * (1 - up);
      r[R.LEAN] = 0.2 - 0.15 * up;
      r[R.HEAD_U] = 0.04 * (1 - up);
      H(0.34 - 0.16 * up, 0.07, Z(4.5 + 11 * up), 0.34 - 0.16 * up, -0.07, Z(4.5 + 11 * up));
      break;
    }
    case 'heave': {
      // hauling: a deep squat, the load up to the chest, then onto the shoulder
      fresh();
      const k = pr(36);
      let h = 0;
      let squat = 0;
      if (k < 0.3) squat = ease(k / 0.3);
      else if (k < 0.65) {
        h = ease((k - 0.3) / 0.35);
        squat = 1 - h;
      } else h = 1 + ease(clamp((k - 0.65) / 0.2, 0, 1));
      const over = Math.max(0, h - 1);
      r[R.CROUCH] = 6 * squat;
      r[R.LEAN] = 0.06 + 0.14 * squat;
      r[R.FLV] = 0.1;
      r[R.FRV] = -0.1;
      H(0.26 - 0.2 * over, 0.12 - 0.03 * h, Z(3.5 + 11 * Math.min(h, 1) + 6 * over), 0.26 - 0.2 * over, -0.12 + 0.03 * h, Z(3.5 + 11 * Math.min(h, 1) + 6 * over));
      break;
    }
    case 'feedfire': {
      // down on a knee at the fire: an arm up against the heat, the other throwing a piece on
      kneel(false, 4.6, 0.12);
      const k = pr(20);
      const w = k < 0.5 ? ease(k / 0.5) : k < 0.65 ? 1 - (k - 0.5) / 0.15 : 0;
      const f = k < 0.5 ? 0 : k < 0.65 ? (k - 0.5) / 0.15 : 1 - ease((k - 0.65) / 0.35);
      r[R.ELB] = 0.05;
      r[R.LEAN] = 0.12 + 0.05 * f;
      r[R.HEAD_U] = -0.01;
      r[R.PH] = k;
      H(0.13, 0.05, Z(22.5), 0.1 - 0.08 * w + 0.28 * f, -0.06, Z(9 + 3 * w - 2 * f));
      break;
    }
    case 'filljar': {
      // on both knees at the water, both hands lowering the jar in and lifting it out
      kneel(true, 5.6, 0.22);
      const dip = Math.pow(Math.sin(pr(30) * Math.PI), 0.6);
      r[R.LEAN] = 0.2 + 0.05 * dip;
      r[R.HEAD_U] = 0.06;
      r[R.HEAD_Z] = -0.6;
      r[R.PH] = dip;
      H(0.33, 0.055, Z(8.5 - 6.5 * dip), 0.33, -0.055, Z(8.5 - 6.5 * dip));
      break;
    }
    case 'mend': {
      // mending a building: reaching up, one hand holding a board in place, the other nailing above the head
      fresh();
      const k = pr(14);
      const strike = Math.pow(Math.max(0, Math.sin(k * TAU)), 2);
      r[R.LEAN] = 0.04;
      r[R.BOB] += 0.6;
      r[R.HEAD_Z] = 0.5;
      r[R.HEAD_U] = -0.01;
      r[R.FLU] = -0.05;
      r[R.FRU] = 0.07;
      r[R.TOOL] = 1.3 - strike * 1.6;
      r[R.PH] = k;
      H(0.25, 0.07, 27, 0.2 + strike * 0.1, -0.07, 28.5 - strike * 6);
      break;
    }
    case 'survey': {
      // laying out a site: standing on the line, an arm out sighting along it, a hand at the chin; then down to mark a corner
      fresh();
      const k = pr(60);
      const down = ease(clamp((k - 0.6) / 0.1, 0, 1)) - ease(clamp((k - 0.9) / 0.1, 0, 1));
      const up = 1 - down;
      r[R.CROUCH] = 5 * down;
      r[R.LEAN] = 0.03 + 0.14 * down;
      r[R.KNZ] = 2.5 * down;
      r[R.ELB] = 0.05 * up;
      r[R.HEAD_U] = 0.05 * down;
      H(0.1 * up + 0.2 * down, 0.03 + 0.05 * down, Z(21.8 * up + 7 * down), 0.36 * up + 0.3 * down, (-0.06 + 0.1 * Math.sin(t * 0.9 + id)) * up - 0.04 * down, Z(19.6 * up + 2 * down));
      break;
    }

    // ───────────────────────── E: talk ─────────────────────────
    case 'talk_warn': {
      // a warning: leaning in, one arm flung out to where the danger is, the other hand urging
      base('talk');
      const jab = Math.max(0, Math.sin(t * 7 + id));
      r[R.LEAN] = 0.1;
      r[R.BOB] += jab * 0.5;
      H(0.3 + 0.04 * jab, 0.07, 17.5, -0.02, -0.3, 20 + jab * 1.5);
      break;
    }
    case 'alarmed': {
      // hearing a warning: rearing back, both hands up
      base('talk');
      r[R.LEAN] = -0.06;
      r[R.ELB] = 0.04;
      r[R.HEAD_Z] = 0.3;
      r[R.BOB] += Math.sin(t * 9 + id) * 0.2;
      H(0.13, 0.09, 19.5, 0.13, -0.09, 19.5);
      break;
    }
    case 'teach': {
      // showing how: down to the learner's height, a finger on the thing
      fresh();
      const tap = Math.max(0, Math.sin(t * 3.2 + id));
      r[R.CROUCH] = 3.2;
      r[R.LEAN] = 0.14;
      r[R.HEAD_U] = 0.04;
      r[R.HEAD_Z] = -0.3;
      H(0.17, 0.1, Z(12.5), 0.33, -0.04, Z(6.5 + tap * 1.6));
      mouth();
      break;
    }
    case 'learn': {
      // being shown: bent to look, hands on the knees, trying it now and then
      fresh();
      const tr = bump(frac(t * 0.17 + id * 0.3), 0.6, 0.9);
      r[R.CROUCH] = 1.6;
      r[R.LEAN] = 0.12;
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -0.6;
      H(0.13, 0.07, Z(8.6), 0.13 + tr * 0.18, -0.07, Z(8.6 - tr * 1.5));
      mouth();
      break;
    }
    case 'ask_court': {
      // asking somebody to walk out: a small bow, a hand offered, the other behind the back
      fresh();
      const s = Math.sin(t * 1.5 + id);
      r[R.LEAN] = 0.08;
      r[R.HEAD_Z] = -0.4;
      r[R.FRU] = 0.04 * s;
      H(-0.1, 0.03, 11.6, 0.3, -0.04, 13 + 0.4 * s);
      mouth();
      break;
    }
    case 'demure': {
      // being asked: hands clasped in front, turning a little from side to side
      fresh();
      r[R.SPIN] = Math.sin(t * 1.4 + id) * 0.14;
      r[R.HEAD_Z] = -0.3;
      H(0.09, 0.02, 12, 0.09, -0.02, 12);
      mouth();
      break;
    }
    case 'welcome': {
      // welcoming newcomers: both arms wide, then one beckoning in
      fresh();
      const beck = bump(frac(t * 0.3 + id * 0.3), 0.6, 0.95);
      const o = Math.sin(t * 2 + id);
      r[R.LEAN] = 0.04;
      r[R.HEAD_Z] = 0.3;
      H(0.2, 0.2, 25.5 + o, 0.2 + beck * 0.1, -0.2 + beck * 0.12, 25.5 - o - beck * 6);
      mouth();
      break;
    }
    case 'rally': {
      // asking for hands for a building: one arm sweeping "come along", the other marking the point
      fresh();
      const g = t * 3 + id;
      r[R.LEAN] = 0.06;
      H(0.21, 0.07, 15 + Math.sin(t * 2 + id), 0.12 + 0.2 * Math.cos(g), -0.17, 18 + 6 * Math.sin(g));
      mouth();
      break;
    }
    case 'peace': {
      // making peace between two: both arms out wide and low, pressing the air down
      fresh();
      const press = Math.sin(t * 1.6 + id);
      r[R.HEAD_Z] = -0.1;
      r[R.LEAN] = 0.03;
      H(0.24, 0.24, 16.5 + 2.2 * press, 0.24, -0.24, 16.5 + 2.2 * press);
      mouth();
      break;
    }

    // ───────────────────────── F: children's games ─────────────────────────
    case 'game_chaser': {
      // chase, the one who catches: crouched and ready, arms spread, a lunge to tag now and then. The game is played where
      // they stand (the simulation does not move them), so nobody is drawn running on the spot.
      fresh();
      const k = frac(t * 0.45 + id * 0.3);
      const lunge = bump(k, 0.55, 0.85);
      const sway = Math.sin(t * 2.6 + id);
      r[R.CROUCH] = 2.6 - lunge * 0.8;
      r[R.LEAN] = 0.12 + lunge * 0.12;
      r[R.FLV] = 0.11;
      r[R.FRV] = -0.11;
      r[R.FLU] = -0.05;
      r[R.FRU] = 0.05 + lunge * 0.12;
      r[R.BOB] += Math.abs(sway) * 0.5;
      r[R.MOUTH] = sp ? 1 : 0;
      H(0.2 + lunge * 0.14, 0.2 - lunge * 0.1, Z(15 + sway), 0.2 + lunge * 0.18, -0.2 + lunge * 0.12, Z(15 - sway + lunge * 2));
      break;
    }
    case 'game_runner': {
      // chase, the one who is caught at: up on the toes, hands up, twisting away from side to side with a small two-footed hop
      fresh();
      const hop = Math.max(0, Math.sin(t * 3.4 + id));
      r[R.SPIN] = Math.sin(t * 1.7 + id) * 0.55;
      r[R.LEAN] = -0.05;
      r[R.BOB] += hop * 1.6;
      r[R.FLL] = hop * 1.4;
      r[R.FRL] = hop * 1.4;
      r[R.ELB] = 0.05;
      r[R.MOUTH] = sp ? 1 : 0;
      H(0.1, 0.15, 19 + hop * 2, 0.1, -0.15, 19 + hop * 2);
      break;
    }
    case 'game_count': {
      // hide and seek: the one counting, both hands over the eyes
      fresh();
      r[R.LEAN] = 0.06;
      r[R.HEAD_Z] = -0.7;
      r[R.HEAD_U] = 0.03;
      r[R.ELB] = 0.09;
      r[R.EYES] = 0;
      r[R.MOUTH] = Math.sin(t * 3 + id) > 0.3 ? 1 : 0;
      H(0.12, 0.03, 26.2, 0.12, -0.03, 26.2);
      break;
    }
    case 'game_hide': {
      // hide and seek: the one hiding, crouched small with the hands over the head, peeping up now and then
      fresh();
      const peek = Math.max(0, Math.sin(t * 0.9 + id) - 0.6) * 2.5;
      r[R.CROUCH] = 7 - peek * 1.5;
      r[R.LEAN] = 0.14;
      r[R.KNZ] = 3;
      r[R.FLU] = 0.1;
      r[R.FRU] = 0.06;
      r[R.ELB] = 0.08;
      r[R.HEAD_Z] = -0.8 + peek * 0.8;
      H(0.1, 0.07, Z(25), 0.1, -0.07, Z(25));
      break;
    }
    case 'game_house': {
      // playing house: on the knees, setting things out on the ground
      kneel(true, 5.6, 0.16);
      const s = Math.sin(t * 2.2 + id);
      r[R.HEAD_U] = 0.05;
      r[R.HEAD_Z] = -0.5;
      H(0.3, 0.09, Z(2.6 + 2.5 * Math.max(0, s)), 0.3, -0.09, Z(2.6 + 2.5 * Math.max(0, -s)));
      mouth();
      break;
    }
    case 'play_ground': {
      // playing alone with stones or bugs: squatting, poking at the ground
      fresh();
      const tap = Math.max(0, Math.sin(t * 3.4 + id));
      r[R.CROUCH] = 6.6;
      r[R.LEAN] = 0.17;
      r[R.KNZ] = 3;
      r[R.FLV] = 0.11;
      r[R.FRV] = -0.11;
      r[R.FLU] = 0.08;
      r[R.FRU] = 0.08;
      r[R.HEAD_U] = 0.07;
      r[R.HEAD_Z] = -0.9;
      H(0.16, 0.1, Z(7), 0.29, -0.03, Z(1.6 + tap * 2));
      break;
    }
    case 'play_sticks': {
      // playing alone with sticks: swishing one about
      fresh();
      const g = t * 4 + id;
      r[R.BOB] += Math.abs(Math.sin(g)) * 1.2;
      r[R.FLU] = 0.06 * Math.sin(g);
      r[R.FRU] = -0.06 * Math.sin(g);
      r[R.TOOL] = 0.3 + Math.sin(g) * 0.9;
      H(0.08, 0.13, 13, 0.2 + 0.12 * Math.cos(g), -0.1, 19 + 7 * Math.sin(g));
      break;
    }
    case 'play_toy': {
      // sitting with a toy held up in both hands
      crossLegged(0.04);
      const b = Math.sin(t * 3 + id);
      r[R.HEAD_Z] = -0.3;
      H(0.2, 0.045, Z(11.5 + b * 1.2), 0.2, -0.045, Z(11.5 + b * 1.2));
      break;
    }
    default:
      base(pose);
  }
}

/** how the anim's posture takes a condition: `quiet` = nothing in the hands to do, so the arms may show it too */
export function applyCondition(r: Rig, cond: Condition, c: PoseCtx, quiet: boolean, onFoot: boolean): void {
  if (r[R.LIE] > 0.5) return;
  const { t, p } = c;
  const Z = (z: number): number => z + r[R.CROUCH] * 0.4;
  if (cond.fever > 0) {
    // a fever: hunched and shivering, the arms hugged in
    const f = cond.fever;
    r[R.LEAN] += 0.05 * f;
    r[R.HEAD_Z] -= 0.8 * f;
    r[R.HEAD_U] += 0.02 * f;
    r[R.BOB] += Math.sin(t * 21 + p.id) * 0.32 * f;
    if (quiet && !onFoot && r[R.SIT] < 0.5) {
      const k = 0.85 * f;
      r[R.HLU] += (0.1 - r[R.HLU]) * k;
      r[R.HLV] += (0.01 - r[R.HLV]) * k;
      r[R.HLZ] += (Z(16.2) - r[R.HLZ]) * k;
      r[R.HRU] += (0.1 - r[R.HRU]) * k;
      r[R.HRV] += (-0.01 - r[R.HRV]) * k;
      r[R.HRZ] += (Z(15.2) - r[R.HRZ]) * k;
      r[R.ELB] *= 1 - k;
    }
  }
  if (cond.limp && onFoot) {
    // a sprained ankle: the right leg takes a short careful step and the body dips onto it
    const co = Math.cos(c.walk * Math.PI * 2);
    r[R.FRU] *= 0.4;
    r[R.FRL] *= 0.35;
    r[R.BOB] -= Math.max(0, co) * 1.6;
    r[R.LEAN] += 0.04;
  }
  if (cond.sling && quiet) {
    // a broken arm: the left forearm held across the chest
    r[R.HLU] = r[R.LEAN] + 0.1;
    r[R.HLV] = -0.01;
    r[R.HLZ] = Z(15.6);
  }
  if (cond.belly > 0) {
    // near her time: leaning back against the weight, a hand to the small of the back, a shorter step
    const b = cond.belly;
    if (r[R.SIT] < 0.5 && r[R.KNEEL] < 0.25) r[R.LEAN] -= 0.035 * b;
    if (onFoot) {
      r[R.FLU] *= 1 - 0.14 * b;
      r[R.FRU] *= 1 - 0.14 * b;
    } else if (quiet && r[R.SIT] < 0.5 && !cond.sling && cond.fever === 0) {
      r[R.HLU] = -0.07;
      r[R.HLV] = 0.07;
      r[R.HLZ] = Z(12.4);
    }
  }
  if (cond.mourning && quiet) {
    // bereaved: the head down, the shoulders in, the arms still
    r[R.HEAD_Z] -= 0.9;
    r[R.HEAD_U] += 0.03;
    r[R.LEAN] += 0.03;
    if (onFoot) {
      r[R.HLU] *= 0.5;
      r[R.HRU] *= 0.5;
      r[R.BOB] *= 0.8;
    }
  }
}
