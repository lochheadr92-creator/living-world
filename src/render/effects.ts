// Particles, weather, lighting and ambient creatures. All motion is a function of simulation time
// (frozen while paused). Particles are spawned from world.fx, a cosmetic event log the simulation writes to.
import { hashUnit } from '../sim/rng';
import type { Building, FxEvent, World } from '../sim/types';
import { T } from '../sim/types';
import type { CameraState } from '../app/game';
import { lerp } from '../sim/util';
import { STRUCT } from './structures';
import type { BuildKind } from './structures';
import { hallOccupied, homeOccupied, workState } from './workstate';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  color: string;
  g: number;
  kind: 'dot' | 'ring' | 'spark' | 'leaf' | 'smoke' | 'heart' | 'zig' | 'sparkle';
  rot: number;
  vr: number;
}

let seq = 0;
const rnd = (): number => hashUnit(++seq, 91, 5); // cosmetic only: never used by the simulation

export class Effects {
  parts: Particle[] = [];
  private lastTick = -1;
  private world: World | null = null;
  private nextSmoke = new Map<number, number>();

  reset(): void {
    this.parts.length = 0;
    this.lastTick = -1;
    this.nextSmoke.clear();
  }

  /**
   * Pull in the cosmetic events the simulation has logged since the last frame. An event is stamped with the tick being
   * stepped when it happened, and that tick is over once world.tick has moved past it; so a frame takes exactly the events
   * stamped from the world tick of the previous frame up to (not including) the current one. Each event is spawned once,
   * whether one tick, several or none (paused) ran in between.
   */
  consume(world: World): void {
    if (this.world !== world) {
      this.world = world;
      this.lastTick = world.tick;
      this.parts.length = 0;
    }
    const fx = world.fx;
    let end = fx.length;
    while (end > 0 && fx[end - 1].tick >= world.tick) end--; // a tick still to be stepped: its events come next frame
    let start = end;
    while (start > 0 && fx[start - 1].tick >= this.lastTick) start--;
    // after a long jump (a stall, fast play) there can be hundreds: spawn only the most recent ones
    const from = Math.max(start, end - 40);
    for (let i = from; i < end; i++) this.spawn(fx[i]);
    this.lastTick = world.tick;
  }

  private add(p: Partial<Particle> & { x: number; y: number }): void {
    this.parts.push({ z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 2, grow: 0, color: '#fff', g: 0, kind: 'dot', rot: 0, vr: 0, ...p });
    if (this.parts.length > 520) this.parts.splice(0, this.parts.length - 520);
  }

  private spawn(e: FxEvent): void {
    const { x, y } = e;
    const burst = (n: number, o: (i: number) => Partial<Particle>) => {
      for (let i = 0; i < n; i++) this.add({ x, y, ...o(i) });
    };
    switch (e.type) {
      case 'chop':
        burst(6, () => ({ z: 14, vx: (rnd() - 0.5) * 1.4, vy: (rnd() - 0.5) * 1.4, vz: 30 + rnd() * 26, g: 120, max: 0.7, size: 1.8 + rnd(), color: rnd() > 0.5 ? '#c79a62' : '#8a603a', kind: 'dot' }));
        break;
      case 'mine':
        burst(5, () => ({ z: 8, vx: (rnd() - 0.5) * 1.8, vy: (rnd() - 0.5) * 1.8, vz: 26 + rnd() * 30, g: 110, max: 0.5, size: 1.3, color: rnd() > 0.4 ? '#f6f2d8' : '#a9a8a0', kind: 'spark' }));
        burst(3, () => ({ z: 6, vx: (rnd() - 0.5) * 0.7, vy: (rnd() - 0.5) * 0.7, vz: 8, max: 0.9, size: 3, grow: 5, color: 'rgba(190,185,170,0.5)', kind: 'smoke' }));
        break;
      case 'pick':
        burst(4, () => ({ z: 10, vx: (rnd() - 0.5) * 0.9, vy: (rnd() - 0.5) * 0.9, vz: 22 + rnd() * 14, g: 90, max: 0.55, size: 1.5, color: rnd() > 0.5 ? '#79b85a' : '#c8344f', kind: 'dot' }));
        break;
      case 'splash':
        this.add({ x, y, z: 1, max: 1.1, size: 2, grow: 14, color: 'rgba(255,255,255,0.65)', kind: 'ring' });
        burst(5, () => ({ z: 2, vx: (rnd() - 0.5) * 0.6, vy: (rnd() - 0.5) * 0.6, vz: 26 + rnd() * 16, g: 100, max: 0.55, size: 1.4, color: '#bfe6f5', kind: 'dot' }));
        break;
      case 'eat':
        burst(2, () => ({ z: 18, vx: (rnd() - 0.5) * 0.4, vy: (rnd() - 0.5) * 0.4, vz: 8, g: 60, max: 0.5, size: 1.1, color: '#e9d6a8', kind: 'dot' }));
        break;
      case 'hammer':
        burst(4, () => ({ z: 16, vx: (rnd() - 0.5) * 1.6, vy: (rnd() - 0.5) * 1.6, vz: 14 + rnd() * 24, g: 80, max: 0.42, size: 1.2, color: '#ffe9a3', kind: 'spark' }));
        this.add({ x, y, z: 14, max: 0.5, size: 3, grow: 8, color: 'rgba(255,240,200,0.35)', kind: 'smoke' });
        break;
      case 'dust':
        burst(5, () => ({ z: 4, vx: (rnd() - 0.5) * 0.7, vy: (rnd() - 0.5) * 0.7, vz: 6 + rnd() * 5, max: 0.9, size: 3, grow: 6, color: 'rgba(170,140,100,0.45)', kind: 'smoke' }));
        break;
      case 'seed':
        burst(4, () => ({ z: 10, vx: (rnd() - 0.5) * 0.5, vy: (rnd() - 0.5) * 0.5, vz: 6, g: 70, max: 0.45, size: 1.2, color: '#7a5a34', kind: 'dot' }));
        break;
      case 'deliver':
        this.add({ x, y, z: 4, max: 0.9, size: 4, grow: 20, color: 'rgba(255,230,160,0.7)', kind: 'ring' });
        burst(7, () => ({ z: 10, vx: (rnd() - 0.5) * 1.1, vy: (rnd() - 0.5) * 1.1, vz: 18 + rnd() * 22, g: 40, max: 0.9, size: 2.2, color: '#ffe08a', kind: 'sparkle' }));
        break;
      case 'ember':
        burst(7, () => ({ z: 6, vx: (rnd() - 0.5) * 0.6, vy: (rnd() - 0.5) * 0.6, vz: 22 + rnd() * 30, g: -10, max: 1.2, size: 1.5, color: rnd() > 0.5 ? '#ffb347' : '#ff7a2f', kind: 'spark' }));
        break;
      case 'built':
        this.add({ x, y, z: 2, max: 1.4, size: 6, grow: 46, color: 'rgba(255,236,170,0.8)', kind: 'ring' });
        burst(16, () => ({ z: 18, vx: (rnd() - 0.5) * 2.4, vy: (rnd() - 0.5) * 2.4, vz: 30 + rnd() * 50, g: 70, max: 1.5, size: 2.4, color: ['#ffe08a', '#ffffff', '#ffb347', '#9be28a'][Math.floor(rnd() * 4)], kind: 'sparkle' }));
        burst(6, () => ({ z: 4, vx: (rnd() - 0.5) * 1.6, vy: (rnd() - 0.5) * 1.6, vz: 8, max: 1.1, size: 5, grow: 12, color: 'rgba(200,185,150,0.4)', kind: 'smoke' }));
        break;
      case 'collapse':
        burst(16, () => ({ z: 8, vx: (rnd() - 0.5) * 2, vy: (rnd() - 0.5) * 2, vz: 14 + rnd() * 18, max: 1.6, size: 6, grow: 16, color: 'rgba(160,140,110,0.5)', kind: 'smoke' }));
        break;
      case 'fell':
        burst(18, () => ({ z: 40 + rnd() * 30, vx: (rnd() - 0.5) * 1.8, vy: (rnd() - 0.5) * 1.8, vz: 8 + rnd() * 20, g: 22, max: 1.9, size: 2.8, color: ['#79b85a', '#a6dc7a', '#5f9a4e'][Math.floor(rnd() * 3)], kind: 'leaf', rot: rnd() * 6, vr: (rnd() - 0.5) * 8 }));
        break;
      case 'bite':
        burst(8, () => ({ z: 12, vx: (rnd() - 0.5) * 1.5, vy: (rnd() - 0.5) * 1.5, vz: 20 + rnd() * 20, g: 90, max: 0.6, size: 1.6, color: '#d63a3a', kind: 'dot' }));
        break;
      case 'gift':
        burst(3, (i) => ({ z: 24, vx: (i - 1) * 0.25, vy: 0, vz: 20, g: -4, max: 1.3, size: 4, color: '#f06a9a', kind: 'heart' }));
        break;
      case 'anger':
        this.add({ x, y, z: 30, vz: 12, max: 1.2, size: 6, color: '#e5463e', kind: 'zig' });
        break;
      case 'ripe':
        burst(5, () => ({ z: 8, vx: (rnd() - 0.5) * 0.5, vy: (rnd() - 0.5) * 0.5, vz: 12 + rnd() * 12, g: 0, max: 1.1, size: 2, color: '#ffe27a', kind: 'sparkle' }));
        break;
      case 'smoke': {
        // a chimney's puff: the event names the building, so it comes out of the right place
        let b = this.world && e.a ? this.world.byId.get(e.a) : undefined;
        if (!b && this.world) {
          // the event only says where: the nearest chimney within a couple of tiles takes it
          let best = 2.6;
          for (const q of this.world.buildings) {
            if (q.type === 'fire') continue;
            const d = Math.hypot(q.x + q.w / 2 - x, q.y + q.h / 2 - y);
            if (d < best && STRUCT[q.type as BuildKind].chimney) {
              best = d;
              b = q;
            }
          }
        }
        const meta = b && b.ent === 'building' && b.type !== 'fire' ? STRUCT[b.type as BuildKind] : undefined;
        if (b && b.ent === 'building' && meta && meta.chimney) {
          const c = meta.chimney;
          for (let i = 0; i < 4; i++) this.add({ x: b.x + c.x, y: b.y + c.y, z: c.z + i * 2, vx: 0.07 + (this.world ? this.world.weather.wind * 0.35 : 0), vy: -0.04, vz: 10 + rnd() * 6, max: 2.2 + rnd() * 0.6, size: 2.4, grow: 6, color: 'rgba(150,146,142,0.4)', kind: 'smoke' });
        } else {
          burst(3, () => ({ z: 14, vx: (rnd() - 0.5) * 0.3 + 0.08, vy: -0.05, vz: 12 + rnd() * 6, max: 1.8, size: 2.4, grow: 6, color: 'rgba(160,156,150,0.38)', kind: 'smoke' }));
        }
        break;
      }
      case 'sparkle':
        burst(8, () => ({ z: 16, vx: (rnd() - 0.5) * 1.2, vy: (rnd() - 0.5) * 1.2, vz: 14 + rnd() * 24, g: 20, max: 1, size: 2, color: '#fff3b0', kind: 'sparkle' }));
        break;
    }
  }

  /**
   * Emit smoke and sparks from what is really burning: lit fires, workshops with a batch under way, homes whose household is in,
   * a hall with people at it. Uses simulation time so it freezes when paused.
   */
  emitAmbient(world: World, simT: number, cam: CameraState, view: { w: number; h: number }): void {
    const wind = world.weather.wind;
    for (const b of world.buildings) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      if (b.type === 'fire') {
        if (b.fuel <= 0 || !this.onScreen(cam, view, b.x + 0.5, b.y + 0.5, 20)) continue;
        if (this.due(b.id * 8, simT, 0.16, 0.12)) {
          this.add({ x: b.x + 0.5, y: b.y + 0.5, z: 18, vx: 0.05 + wind * 0.35, vy: -0.05, vz: 14 + rnd() * 6, max: 2.4, size: 2.6, grow: 7, color: 'rgba(150,150,150,0.34)', kind: 'smoke' });
          if (rnd() < 0.5) this.add({ x: b.x + 0.5 + (rnd() - 0.5) * 0.2, y: b.y + 0.5 + (rnd() - 0.5) * 0.2, z: 10, vx: (rnd() - 0.5) * 0.3, vy: (rnd() - 0.5) * 0.3, vz: 22 + rnd() * 16, g: -6, max: 0.9, size: 1.3, color: '#ffb347', kind: 'spark' });
        }
        continue;
      }
      const meta = STRUCT[b.type as BuildKind];
      if (!meta || !this.onScreen(cam, view, cx, cy, meta.top)) continue;
      switch (b.type) {
        case 'hut':
        case 'house': {
          // a chimney that smokes while the household is home on a cold evening
          if (b.condition <= 0 || world.light > 0.6 || !meta.chimney) break;
          if (!homeOccupied(world, b)) break;
          if (this.due(b.id * 8, simT, 0.5, 0.4)) this.add({ x: b.x + meta.chimney.x, y: b.y + meta.chimney.y, z: meta.chimney.z, vx: 0.08 + wind * 0.3, vy: -0.04, vz: 10, max: 2.6, size: 2.2, grow: 5, color: 'rgba(170,170,170,0.3)', kind: 'smoke' });
          break;
        }
        case 'kiln':
        case 'smithy':
        case 'bakery': {
          const st = workState(world, b);
          if (!st.job || !(st.burning || st.working) || !meta.chimney) break;
          const c = meta.chimney;
          const dark = b.type === 'smithy' ? 'rgba(86,82,80,0.46)' : b.type === 'kiln' ? 'rgba(128,122,116,0.42)' : 'rgba(228,225,218,0.42)';
          // the fire phase smokes steadily; while only being worked it is a thinner wisp
          if (this.due(b.id * 8, simT, st.burning ? 0.26 : 0.6, 0.14)) {
            this.add({ x: b.x + c.x, y: b.y + c.y, z: c.z, vx: 0.07 + wind * 0.35, vy: -0.04, vz: 13 + rnd() * 6, max: 2.8, size: st.burning ? 2.8 : 2.1, grow: 7, color: dark, kind: 'smoke' });
          }
          const m = meta.mouth;
          if (m && (st.working || (st.burning && b.type !== 'bakery')) && this.due(b.id * 8 + 1, simT, b.type === 'smithy' && st.working ? 0.22 : 0.7, 0.4)) {
            // a spark or two from the fire mouth
            this.add({ x: b.x + m.x + (rnd() - 0.5) * 0.2, y: b.y + m.y, z: m.z + 4, vx: (rnd() - 0.5) * 0.3, vy: 0.1 + rnd() * 0.2, vz: 14 + rnd() * 16, g: 40, max: 0.7, size: 1.2, color: rnd() > 0.5 ? '#ffd27a' : '#ff8a3a', kind: 'spark' });
          }
          break;
        }
        case 'timber_yard': {
          // sawdust flies from the trestle while planks are being sawn
          const st = workState(world, b);
          if (st.working && st.recipe === 'saw_planks' && this.due(b.id * 8, simT, 0.34, 0.2)) {
            this.add({ x: b.x + 1.55 + (rnd() - 0.5) * 0.3, y: b.y + 1.62, z: 24, vx: (rnd() - 0.5) * 0.3, vy: 0.1, vz: 8 + rnd() * 8, g: 26, max: 0.8, size: 1.4, color: rnd() > 0.4 ? '#efd9a8' : '#c9a66a', kind: 'dot' });
          }
          break;
        }
        case 'quarry': {
          const st = workState(world, b);
          if (st.working && this.due(b.id * 8, simT, 0.55, 0.3)) {
            this.add({ x: b.x + 0.7 + rnd() * 0.8, y: b.y + 0.7, z: 10, vx: (rnd() - 0.5) * 0.3, vy: 0.1, vz: 6, max: 1.0, size: 2.8, grow: 6, color: 'rgba(205,200,186,0.45)', kind: 'smoke' });
          }
          break;
        }
        case 'hall': {
          if (!meta.chimney || !hallOccupied(world, b)) break;
          if (this.due(b.id * 8, simT, 0.45, 0.3)) this.add({ x: b.x + meta.chimney.x, y: b.y + meta.chimney.y, z: meta.chimney.z, vx: 0.08 + wind * 0.3, vy: -0.04, vz: 10, max: 2.8, size: 2.4, grow: 6, color: 'rgba(190,188,186,0.34)', kind: 'smoke' });
          break;
        }
        default:
          break;
      }
    }
  }

  /** is a world point (with something standing `up` px above it) inside, or just outside, the view? Cheap enough to ask of every building. */
  private onScreen(cam: CameraState, view: { w: number; h: number }, wx: number, wy: number, up: number): boolean {
    const sx = ((wx - wy) * 32 - cam.x) * cam.zoom + view.w / 2;
    const sy = ((wx + wy) * 16 - cam.y) * cam.zoom + view.h / 2;
    return !(sx < -90 || sx > view.w + 90 || sy < -140 - up * cam.zoom || sy > view.h + 90);
  }

  /** a repeating timer per emitter, in simulation time: true when it is time to emit again */
  private due(key: number, simT: number, every: number, jitter: number): boolean {
    const nx = this.nextSmoke.get(key) ?? simT;
    if (simT < nx) return false;
    this.nextSmoke.set(key, simT + every + rnd() * jitter);
    return true;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.parts.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= p.g * dt;
      p.size += p.grow * dt;
      p.rot += p.vr * dt;
      if (p.kind === 'leaf') {
        p.vx += Math.sin(p.life * 5 + p.rot) * 0.4 * dt;
      }
      if (p.z < 0 && p.kind !== 'ring' && p.kind !== 'smoke') {
        p.z = 0;
        p.vz = 0;
        p.vx *= 0.5;
        p.vy *= 0.5;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.parts) {
      const t = p.life / p.max;
      const sx = (p.x - p.y) * 32;
      const sy = (p.x + p.y) * 16 - p.z;
      const fade = 1 - t * t;
      switch (p.kind) {
        case 'dot':
          ctx.globalAlpha = Math.min(1, fade * 1.4);
          ctx.fillStyle = p.color;
          ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
          break;
        case 'spark':
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'sparkle': {
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.color;
          const s = p.size * (1 - t * 0.4);
          ctx.beginPath();
          ctx.moveTo(sx, sy - s * 1.5);
          ctx.lineTo(sx + s * 0.4, sy - s * 0.4);
          ctx.lineTo(sx + s * 1.5, sy);
          ctx.lineTo(sx + s * 0.4, sy + s * 0.4);
          ctx.lineTo(sx, sy + s * 1.5);
          ctx.lineTo(sx - s * 0.4, sy + s * 0.4);
          ctx.lineTo(sx - s * 1.5, sy);
          ctx.lineTo(sx - s * 0.4, sy - s * 0.4);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'smoke':
          ctx.globalAlpha = fade * 0.9;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'ring':
          ctx.globalAlpha = fade;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.ellipse(sx, sy, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'leaf':
          ctx.globalAlpha = Math.min(1, fade * 1.6);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        case 'heart': {
          ctx.globalAlpha = Math.min(1, fade * 1.5);
          ctx.fillStyle = p.color;
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(sx, sy + s * 0.9);
          ctx.bezierCurveTo(sx - s * 1.8, sy - s * 0.2, sx - s * 0.8, sy - s * 1.4, sx, sy - s * 0.5);
          ctx.bezierCurveTo(sx + s * 0.8, sy - s * 1.4, sx + s * 1.8, sy - s * 0.2, sx, sy + s * 0.9);
          ctx.fill();
          break;
        }
        case 'zig': {
          ctx.globalAlpha = Math.min(1, fade * 1.6);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.8;
          ctx.lineJoin = 'round';
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(sx - s * 0.5, sy - s);
          ctx.lineTo(sx + s * 0.3, sy - s * 0.2);
          ctx.lineTo(sx - s * 0.3, sy + s * 0.1);
          ctx.lineTo(sx + s * 0.5, sy + s);
          ctx.stroke();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ───────────────────────── ambient creatures ─────────────────────────
export class Critters {
  private anchors: { x: number; y: number }[] = [];
  private fireflies: { x: number; y: number }[] = [];
  private world: World | null = null;

  private init(world: World): void {
    this.world = world;
    this.anchors = [];
    this.fireflies = [];
    const cx = world.camp.x;
    const cy = world.camp.y;
    for (let i = 0; i < 160 && this.anchors.length < 22; i++) {
      const a = hashUnit(i, 5, 71) * Math.PI * 2;
      const r = 4 + hashUnit(i, 6, 72) * 30;
      const x = Math.floor(cx + Math.cos(a) * r);
      const y = Math.floor(cy + Math.sin(a) * r);
      if (x < 2 || y < 2 || x >= world.W - 2 || y >= world.H - 2) continue;
      if (world.terrain[y * world.W + x] === T.GRASS) this.anchors.push({ x: x + 0.5, y: y + 0.5 });
    }
    for (let i = 0; i < 400 && this.fireflies.length < 44; i++) {
      const x = Math.floor(3 + hashUnit(i, 7, 73) * (world.W - 6));
      const y = Math.floor(3 + hashUnit(i, 8, 74) * (world.H - 6));
      const t = world.terrain[y * world.W + x];
      const near = world.waterDist[y * world.W + x] <= 5;
      if ((t === T.GRASS || t === T.FOREST || t === T.SAND) && (near || t === T.FOREST) && Math.hypot(x - cx, y - cy) < 34) this.fireflies.push({ x: x + 0.5, y: y + 0.5 });
    }
  }

  draw(ctx: CanvasRenderingContext2D, world: World, simT: number, cam: CameraState, view: { w: number; h: number }): void {
    if (this.world !== world) this.init(world);
    const day = world.light > 0.65 && world.weather.rain < 0.15;
    const night = world.light < 0.28 && world.weather.rain < 0.3;
    const vis = (wx: number, wy: number) => {
      const sx = ((wx - wy) * 32 - cam.x) * cam.zoom + view.w / 2;
      const sy = ((wx + wy) * 16 - cam.y) * cam.zoom + view.h / 2;
      return sx > -40 && sx < view.w + 40 && sy > -80 && sy < view.h + 40;
    };
    if (day) {
      const cols = ['#f4a5c0', '#ffd96a', '#ffffff', '#9ec9ff', '#ffb067'];
      this.anchors.forEach((a, i) => {
        const t = simT * (0.35 + hashUnit(i, 1, 2) * 0.25) + i * 7.1;
        const wx = a.x + Math.sin(t) * 1.7 + Math.sin(t * 2.3) * 0.5;
        const wy = a.y + Math.cos(t * 0.8) * 1.5;
        if (!vis(wx, wy)) return;
        const hz = 14 + Math.sin(t * 3.1) * 6;
        const sx = (wx - wy) * 32;
        const sy = (wx + wy) * 16 - hz;
        const flap = Math.abs(Math.sin(simT * 13 + i)) * 3.2 + 0.6;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.ellipse(sx - 1.4, sy, flap, 2, -0.4, 0, Math.PI * 2);
        ctx.ellipse(sx + 1.4, sy, flap, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a2c22';
        ctx.fillRect(sx - 0.4, sy - 1.5, 0.9, 3);
      });
    }
    if (night) {
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      this.fireflies.forEach((a, i) => {
        const t = simT * 0.25 + i * 5.3;
        const wx = a.x + Math.sin(t * 1.7) * 1.2;
        const wy = a.y + Math.cos(t * 1.3) * 1.2;
        if (!vis(wx, wy)) return;
        const blink = Math.max(0, Math.sin(simT * 1.6 + i * 2.1));
        if (blink < 0.15) return;
        const sx = (wx - wy) * 32;
        const sy = (wx + wy) * 16 - 10 - Math.sin(t * 2) * 5;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7);
        g.addColorStop(0, `rgba(210,255,140,${0.9 * blink})`);
        g.addColorStop(1, 'rgba(210,255,140,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - 7, sy - 7, 14, 14);
      });
      ctx.globalCompositeOperation = prev;
    }
  }
}

// ───────────────────────── lighting & weather ─────────────────────────
export function ambientColor(world: World): [number, number, number] {
  const l = world.light;
  const night: [number, number, number] = [98, 116, 172];
  const dusk: [number, number, number] = [255, 196, 156];
  const day: [number, number, number] = [255, 255, 255];
  let c: [number, number, number];
  if (l >= 0.85) c = day;
  else if (l >= 0.4) {
    const k = (l - 0.4) / 0.45;
    c = [lerp(dusk[0], day[0], k), lerp(dusk[1], day[1], k), lerp(dusk[2], day[2], k)];
  } else {
    const k = l / 0.4;
    c = [lerp(night[0], dusk[0], k * k), lerp(night[1], dusk[1], k * k), lerp(night[2], dusk[2], k * k)];
  }
  const w = world.weather;
  const dim = 1 - 0.14 * w.cloud - 0.12 * w.storm;
  const grey = 0.1 * w.cloud + 0.14 * w.storm;
  const avg = (c[0] + c[1] + c[2]) / 3;
  return [lerp(c[0], avg, grey) * dim, lerp(c[1], avg, grey) * dim, lerp(c[2], avg, grey) * dim];
}

/** Draws in WORLD transform (iso plane): warm pools of light around fires, forge mouths and lit windows. */
export function drawGlows(ctx: CanvasRenderingContext2D, world: World, simT: number): void {
  const dark = 1 - Math.min(1, world.light * 1.15);
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  const window = (wx: number, wy: number, z: number, pane: number): void => {
    const cx = (wx - wy) * 32;
    const cy = (wx + wy) * 16 - z;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 26);
    g.addColorStop(0, `rgba(255,205,120,${0.85 * dark})`);
    g.addColorStop(1, 'rgba(255,170,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 28, cy - 28, 56, 56);
    ctx.fillStyle = `rgba(255,214,130,${0.9 * dark})`;
    ctx.beginPath();
    ctx.moveTo(cx - pane, cy - 4);
    ctx.lineTo(cx + pane - 1, cy - 4 + pane * 0.5);
    ctx.lineTo(cx + pane - 1, cy + 4 + pane * 0.5);
    ctx.lineTo(cx - pane, cy + 4);
    ctx.closePath();
    ctx.fill();
  };
  const mouth = (wx: number, wy: number, z: number, r: number, strength: number, flick: number): void => {
    const cx = (wx - wy) * 32;
    const cy = (wx + wy) * 16 - z;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, `rgba(255,170,70,${strength * flick})`);
    g.addColorStop(0.5, `rgba(255,110,40,${strength * 0.4 * flick})`);
    g.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  for (const b of world.buildings) {
    if (b.type === 'fire' && b.fuel > 0) {
      const flicker = 0.9 + 0.1 * Math.sin(simT * 11 + b.id) + 0.05 * Math.sin(simT * 23);
      const cx = (b.x + 0.5 - (b.y + 0.5)) * 32;
      const cy = (b.x + 0.5 + (b.y + 0.5)) * 16;
      const R = 150 * flicker;
      const strength = 0.12 + 0.55 * dark;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.5);
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
      g.addColorStop(0, `rgba(255,170,70,${strength})`);
      g.addColorStop(0.45, `rgba(255,120,40,${strength * 0.45})`);
      g.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (b.type === 'hut' && dark > 0.25) {
      if (!homeOccupied(world, b)) continue;
      // the window on the left-front face
      window(b.x + 1.425, b.y + 1.88, 17, 5);
    } else if (b.type === 'house' && dark > 0.25) {
      if (!homeOccupied(world, b)) continue;
      window(b.x + 1.19, b.y + 1.9, 29, 4.5);
      window(b.x + 1.66, b.y + 1.9, 29, 4.5);
    } else if (b.type === 'hall' && dark > 0.2) {
      if (!hallOccupied(world, b)) continue;
      window(b.x + 0.48, b.y + 2.9, 31, 4);
      window(b.x + 2.52, b.y + 2.9, 31, 4);
      mouth(b.x + 0.98, b.y + 3.04, 33, 22, 0.5 * dark, 0.9 + 0.1 * Math.sin(simT * 9 + b.id));
      mouth(b.x + 2.02, b.y + 3.04, 33, 22, 0.5 * dark, 0.9 + 0.1 * Math.sin(simT * 9.7 + b.id));
      // the big door standing open on the hearth
      mouth(b.x + 1.5, b.y + 2.95, 20, 34, 0.32 * dark, 0.92 + 0.08 * Math.sin(simT * 6));
    } else if (b.type === 'kiln' || b.type === 'smithy' || b.type === 'bakery') {
      const st = workState(world, b);
      const m = STRUCT[b.type].mouth;
      if (!m || !st.job || !(st.burning || st.working)) continue;
      const flick = 0.82 + 0.18 * Math.sin(simT * 12 + b.id) + 0.08 * Math.sin(simT * 29);
      // a working forge flares with every blow; a burning kiln glows steadily
      const strong = b.type === 'smithy' && st.working ? 1 : st.burning ? 0.85 : 0.6;
      mouth(b.x + m.x, b.y + m.y, m.z + 3, 30 + 24 * dark, (0.2 + 0.5 * dark) * strong, flick);
    }
  }
  ctx.globalCompositeOperation = prev;
}

/** Screen-space rain, flashes of lightning and a soft vignette. */
export function drawWeather(ctx: CanvasRenderingContext2D, world: World, simT: number, w: number, h: number): void {
  const wt = world.weather;
  if (wt.rain > 0.05) {
    const n = Math.floor(260 * wt.rain);
    ctx.strokeStyle = `rgba(190,215,240,${0.18 + 0.32 * wt.rain})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const slant = 0.18 + wt.wind * 0.3;
    for (let i = 0; i < n; i++) {
      const sp = 620 + hashUnit(i, 3, 77) * 380;
      const x0 = hashUnit(i, 1, 75) * (w + 200) - 100;
      const y = ((hashUnit(i, 2, 76) * h + simT * sp) % (h + 40)) - 20;
      const len = 10 + hashUnit(i, 4, 78) * 12;
      const x = x0 - (y / h) * 0;
      ctx.moveTo(x + y * slant * 0.2, y);
      ctx.lineTo(x + y * slant * 0.2 - len * slant, y + len);
    }
    ctx.stroke();
  }
  if (wt.storm > 0.55) {
    const period = 7.3;
    const ph = Math.floor(simT / period);
    const at = ph * period + hashUnit(ph, 9, 79) * (period - 1);
    const d = simT - at;
    if (d > 0 && d < 0.35 && hashUnit(ph, 1, 80) < 0.8) {
      const a = (1 - d / 0.35) * (d < 0.1 ? 0.35 : 0.2 * Math.abs(Math.sin(d * 40)));
      ctx.fillStyle = `rgba(235,240,255,${a})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
