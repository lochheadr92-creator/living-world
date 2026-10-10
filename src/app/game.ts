// The app controller: owns the world, the fixed-timestep clock and view state (selection, camera, overlays).
// It knows nothing about canvases or DOM, so it is unit-testable and the simulation can never depend on frame rate.
import { TPS } from '../sim/constants';
import { createWorld, defaultSettings } from '../sim/factory';
import { hashWorld, stepWorld } from '../sim/world';
import { project } from '../render/iso';
import type { SceneId, Settings, World } from '../sim/types';

export const SPEEDS = [0.5, 1, 2, 4, 8, 16] as const;
export const MAX_STEPS_PER_FRAME = 40;
/** the longest stretch of real time one frame may account for; a longer gap (hidden tab, a stalled frame) is a stall, not a debt */
export const MAX_FRAME_DT = 0.25;
/** real seconds over which the achieved playback rate is measured */
export const STATS_WINDOW = 2;
/** real seconds for which a skipped stretch of world time is still reported as recent */
export const RECENT_DROP_WINDOW = 15;

export interface PlaybackStats {
  playing: boolean;
  /** the speed multiplier asked for */
  requested: number;
  /** the multiplier actually achieved over the last couple of seconds of real time (0 while paused) */
  achieved: number;
  /** ticks of world time that real time owed but the clock deliberately gave up on (stalls and overload), in total */
  dropped: number;
  /** the part of that given up within the last RECENT_DROP_WINDOW seconds of playing */
  recentDropped: number;
  /** true when the clock is visibly not keeping up */
  behind: boolean;
  /** ticks run in the most recent frame */
  lastFrameTicks: number;
}

export interface Overlays {
  /** show each person's sensing radius (selected person only unless 'all') */
  perception: boolean;
  /** show walking paths */
  paths: boolean;
  /** show small icons of what everyone is currently doing */
  intentions: boolean;
  /** show the selected person's remembered places, faded by age */
  knowledge: boolean;
  /** show name labels for everyone */
  labels: boolean;
}

export interface CameraState {
  /** centre of the view in isometric screen-space pixels (zoom 1) */
  x: number;
  y: number;
  zoom: number;
}

export type GameEvent = 'restart' | 'play' | 'speed' | 'select' | 'overlay' | 'follow' | 'scene' | 'debug' | 'step';

/** around each tick the clock runs (an outside driver's hooks, src/app/inhabit.ts); `afterTick` returning false ends the frame's stepping */
export interface TickHooks {
  beforeTick?: () => void;
  afterTick?: () => boolean;
}

export class Game {
  world: World;
  settings: Settings;
  playing = true;
  speed = 1;
  /** fractional ticks owed (0..1): the renderer interpolates between the previous and current tick by this much */
  alpha = 0;
  private acc = 0;
  selectedId = 0;
  following = false;
  debug = false;
  overlays: Overlays = { perception: false, paths: false, intentions: false, knowledge: false, labels: false };
  camera: CameraState = { x: 0, y: 0, zoom: 1 };
  /** entity currently under the mouse pointer (set by the canvas input handler) and where on screen */
  hover: { id: number; px: number; py: number } | null = null;
  /** requested smooth camera move (consumed by the renderer) */
  fly: { x: number; y: number; zoom: number | null } | null = null;
  /** screen pixels along the right edge hidden by an open panel (the inspector): the camera aims at the middle of what is left. Presentation only. */
  viewInsetRight = 0;
  /** ticks executed during the most recent frame (for the debug readout) */
  lastFrameTicks = 0;
  /** wall-time driven tween used only to ease a manual single step */
  stepEase = 1;
  /** ticks the clock gave up on (see PlaybackStats.dropped) */
  droppedTicks = 0;
  /** hooks around each tick run by the clock (play and single step); none unless a driver installs them */
  tickHooks: TickHooks | null = null;
  private recent: { dt: number; ticks: number; asked: number }[] = [];
  /** real seconds spent playing, and when (on that clock) ticks were given up, for the "recent" part of the report */
  private playClock = 0;
  private dropLog: { at: number; n: number }[] = [];
  private listeners = new Set<(e: GameEvent) => void>();

  constructor(settings?: Partial<Settings>) {
    this.settings = { ...defaultSettings(), ...settings };
    this.world = createWorld(this.settings);
  }

  // ── time ──
  /** Advance by real elapsed seconds. Returns how many simulation ticks ran. */
  advance(dt: number): number {
    // the eased single-step tween is purely visual and uses wall time
    if (this.stepEase < 1) this.stepEase = Math.min(1, this.stepEase + dt / 0.16);
    if (!this.playing) {
      this.lastFrameTicks = 0;
      this.recent.length = 0;
      return 0;
    }
    const real = Math.max(dt, 0);
    let owed = Math.min(real, MAX_FRAME_DT);
    if (real > MAX_FRAME_DT) {
      // a stall (hidden tab, a long frame): the world does not run to catch up. The time is simply not played, and counted.
      this.giveUp((real - MAX_FRAME_DT) * this.speed * TPS);
      this.acc = 0;
      owed = MAX_FRAME_DT;
    }
    this.playClock += Math.min(real, MAX_FRAME_DT);
    this.acc += owed * this.speed * TPS;
    let n = Math.floor(this.acc);
    if (n > MAX_STEPS_PER_FRAME) {
      this.giveUp(n - MAX_STEPS_PER_FRAME);
      n = MAX_STEPS_PER_FRAME;
      this.acc = this.acc % 1; // too far behind: skip the backlog rather than spiral
    } else this.acc -= n;
    let ran = 0;
    for (let i = 0; i < n; i++) {
      this.tickHooks?.beforeTick?.();
      this.tickOnce();
      ran++;
      if (this.tickHooks?.afterTick && !this.tickHooks.afterTick()) {
        // the driver has taken the clock (it pauses to wait for an answer): the rest of this frame is not played
        this.acc = 0;
        break;
      }
    }
    n = ran;
    this.alpha = this.acc;
    this.lastFrameTicks = n;
    this.recent.push({ dt: real, ticks: n, asked: this.speed });
    let span = 0;
    for (let i = this.recent.length - 1; i >= 0; i--) {
      span += this.recent[i].dt;
      if (span > STATS_WINDOW) {
        this.recent.splice(0, i);
        break;
      }
    }
    return n;
  }

  private giveUp(ticks: number): void {
    this.droppedTicks += ticks;
    this.dropLog.push({ at: this.playClock, n: ticks });
    if (this.dropLog.length > 64) this.dropLog.splice(0, this.dropLog.length - 64);
  }

  /** How playback is going: the speed asked for against the speed achieved over the last couple of seconds. */
  playbackStats(): PlaybackStats {
    let dt = 0;
    let ticks = 0;
    for (const f of this.recent) {
      dt += f.dt;
      ticks += f.ticks;
    }
    const achieved = this.playing && dt > 0.2 ? ticks / dt / TPS : this.playing ? this.speed : 0;
    return {
      playing: this.playing,
      requested: this.speed,
      achieved,
      dropped: Math.round(this.droppedTicks),
      recentDropped: Math.round(this.dropLog.reduce((n, d) => (this.playClock - d.at <= RECENT_DROP_WINDOW ? n + d.n : n), 0)),
      behind: this.playing && dt > 0.5 && achieved < this.speed * 0.85,
      lastFrameTicks: this.lastFrameTicks,
    };
  }

  private tickOnce(): void {
    stepWorld(this.world);
    if (this.selectedId && !this.world.byId.has(this.selectedId)) {
      // the selected person died or the thing was removed
      this.selectedId = 0;
      this.following = false;
      this.emit('select');
    }
  }

  /** Run an exact number of ticks regardless of play state (tests, tools). */
  advanceTicks(n: number): void {
    for (let i = 0; i < n; i++) this.tickOnce();
    this.alpha = 0;
  }

  /** Single step while paused (or running): one tick, with a short visual ease. */
  stepOnce(): void {
    this.playing = false;
    this.acc = 0;
    this.tickHooks?.beforeTick?.();
    this.tickOnce();
    this.tickHooks?.afterTick?.();
    this.alpha = 1;
    this.stepEase = 0;
    this.emit('step');
    this.emit('play');
  }

  /** where the picture should be between the previous and current tick (0..1) */
  get renderAlpha(): number {
    return this.playing ? this.alpha : this.stepEase < 1 ? this.stepEase : 1;
  }

  /** continuous simulation time in seconds, for animation phases; frozen while paused */
  simTime(): number {
    return (this.world.tick + this.renderAlpha) / TPS;
  }

  setPlaying(v: boolean): void {
    if (this.playing === v) return;
    this.playing = v;
    // paused, the picture shows the latest tick in full; carrying on from there (not from "none of the next tick yet") means
    // the first frame after resuming moves on from what was on screen instead of stepping back a little
    if (v) this.acc = 1;
    this.recent.length = 0;
    this.emit('play');
  }

  togglePlay(): void {
    this.setPlaying(!this.playing);
  }

  setSpeed(s: number): void {
    this.speed = s;
    this.recent.length = 0;
    this.emit('speed');
  }

  speedUp(dir: 1 | -1): void {
    const i = SPEEDS.indexOf(this.speed as (typeof SPEEDS)[number]);
    const j = Math.min(SPEEDS.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir));
    this.setSpeed(SPEEDS[j]);
  }

  // ── worlds ──
  restart(opts: Partial<Settings> = {}): void {
    this.settings = { ...this.settings, ...opts };
    this.world = createWorld(this.settings);
    this.acc = 0;
    this.alpha = 0;
    this.stepEase = 1;
    this.selectedId = 0;
    this.following = false;
    this.emit('restart');
    this.emit('select');
    this.emit('scene');
  }

  /** Swap in a world that was loaded from a save. */
  restoreWorld(world: World, settings: Settings): void {
    this.settings = { ...settings };
    this.world = world;
    this.acc = 0;
    this.alpha = 0;
    this.stepEase = 1;
    this.selectedId = 0;
    this.following = false;
    this.emit('restart');
    this.emit('select');
    this.emit('scene');
  }

  loadScene(scene: SceneId): void {
    // staged scenes are small flat worlds run by the ordinary rules, whatever larger world they were started from
    this.restart({ scene, profile: undefined, ruleSet: undefined, settlementFounders: undefined });
  }

  get stateHash(): string {
    return hashWorld(this.world);
  }

  /** Smoothly move the camera to a world position (tiles). */
  flyTo(wx: number, wy: number, zoom: number | null = null): void {
    const p = project(wx, wy);
    this.fly = { x: p.sx, y: p.sy, zoom };
    this.following = false;
    this.emit('follow');
  }

  /** Select something and bring it into view. */
  focusEntity(id: number): void {
    const e = this.world.byId.get(id);
    if (!e) return;
    this.select(id);
    const pos = e.ent === 'building' || e.ent === 'site' ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : { x: (e as { x: number }).x + (e.ent === 'person' || e.ent === 'animal' ? 0 : 0.5), y: (e as { y: number }).y + (e.ent === 'person' || e.ent === 'animal' ? 0 : 0.5) };
    this.flyTo(pos.x, pos.y);
  }

  // ── selection ──
  select(id: number): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    if (!id) this.following = false;
    this.emit('select');
  }

  setFollow(v: boolean): void {
    this.following = v && this.selectedId !== 0;
    this.emit('follow');
  }

  setOverlay(key: keyof Overlays, v: boolean): void {
    this.overlays[key] = v;
    this.emit('overlay');
  }

  setDebug(v: boolean): void {
    this.debug = v;
    this.emit('debug');
  }

  // ── events ──
  subscribe(fn: (e: GameEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: GameEvent): void {
    for (const l of this.listeners) l(e);
  }
}
