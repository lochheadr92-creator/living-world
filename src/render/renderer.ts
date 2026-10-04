import type { Game } from '../app/game';
import { senseRadius } from '../sim/perception';
import type { Animal, Building, Cart, Entity, Grave, Person, Pile, Plot, Site, Source, Speech, World } from '../sim/types';
import { clampCamera, updateCamera } from './camera';
import { CartRenderer } from './carts';
import { CharacterRenderer } from './characters';
import { Critters, Effects, ambientColor, drawGlows, drawWeather } from './effects';
import { CanvasInput } from './input';
import { project } from './iso';
import { drawBubble, drawFootprintHighlight, drawGlyphBadge, drawKnowledge, drawLabel, drawPath, drawPerceptionRadius, glyphFor } from './overlays';
import { Scenery } from './scenery';
import { TerrainPainter } from './terrain';

interface Drawable {
  d: number;
  k: number; // 0 source 1 building 2 site 3 plot 4 pile 5 grave 6 stump 7 person 8 animal 9 cart
  o: unknown;
  id: number;
}

/** Draws the world onto a canvas. Reads simulation state, never writes it. */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private w = 1;
  private h = 1;
  private input: CanvasInput;
  private ro: ResizeObserver;
  private terrain: TerrainPainter | null = null;
  private scenery = new Scenery();
  private chars = new CharacterRenderer();
  private carts = new CartRenderer();
  private fx = new Effects();
  private critters = new Critters();
  private worldRef: World | null = null;
  private lastSim = 0;
  private drawables: Drawable[] = [];
  private heads = new Map<number, { x: number; y: number }>();
  /** the followed person's last words, kept up for a moment of real time at high speed (drawing only) */
  private dwell: { id: number; text: string; kind: Speech['kind']; until: number } | null = null;
  /** exposed for the debug readout */
  lastFrameMs = 0;
  drawnCount = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private game: Game,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.input = new CanvasInput(canvas, game, () => ({ w: this.w, h: this.h }));
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  get viewSize(): { w: number; h: number } {
    return { w: this.w, h: this.h };
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, Math.floor(r.width));
    this.h = Math.max(1, Math.floor(r.height));
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    clampCamera(this.game.camera, this.w, this.h);
  }

  destroy(): void {
    this.input.destroy();
    this.ro.disconnect();
  }

  frame(dt: number): void {
    const t0 = performance.now();
    const g = this.game;
    this.input.update(dt);
    let follow: { x: number; y: number } | null = null;
    if (g.following && g.selectedId) {
      const e = g.world.byId.get(g.selectedId);
      if (e && e.ent === 'person') {
        const a = g.renderAlpha;
        const x = e.px + (e.x - e.px) * a;
        const y = e.py + (e.y - e.py) * a;
        const p = project(x, y);
        follow = { x: p.sx, y: p.sy - 14 };
      }
    }
    const done = updateCamera(g.camera, dt, follow, g.fly);
    if (done) g.fly = null;
    clampCamera(g.camera, this.w, this.h);
    this.draw();
    this.lastFrameMs = performance.now() - t0;
  }

  // ───────────────────────── the frame ─────────────────────────
  private visible(cam: { x: number; y: number; zoom: number }, wx: number, wy: number, up: number, side: number): boolean {
    const z = cam.zoom;
    const sx = ((wx - wy) * 32 - cam.x) * z + this.w / 2;
    const sy = ((wx + wy) * 16 - cam.y) * z + this.h / 2;
    return sx > -side * z && sx < this.w + side * z && sy - up * z < this.h && sy + 40 * z > 0;
  }

  private draw(): void {
    const { ctx, game, w, h, dpr } = this;
    const world = game.world;
    if (this.worldRef !== world) {
      this.worldRef = world;
      this.terrain = new TerrainPainter(world);
      this.fx.reset();
      this.heads.clear();
      this.lastSim = game.simTime();
    }
    const terrain = this.terrain!;
    const cam = game.camera;
    const z = cam.zoom;
    const alphaT = game.renderAlpha;
    const simT = game.simTime();
    // how much simulation time passed since the last frame (0 while paused)
    let dSim = simT - this.lastSim;
    if (dSim < 0 || dSim > 1.5) dSim = 0;
    this.lastSim = simT;
    const wind = world.weather.wind;

    // ── background ──
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.1, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    bg.addColorStop(0, '#26475c');
    bg.addColorStop(1, '#0b141c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // ── ground ──
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (w / 2 - cam.x * z), dpr * (h / 2 - cam.y * z));
    terrain.drawBlockEdges(ctx);
    terrain.draw(ctx, cam, { w, h }, simT, wind);

    // ── things standing in the world, back to front ──
    this.chars.updateAll(world, alphaT, simT);
    this.carts.updateAll(world, alphaT);
    const list = this.drawables;
    list.length = 0;
    const push = (d: number, k: number, o: unknown, id: number) => list.push({ d, k, o, id });
    for (const s of world.sources) {
      const up = s.type === 'tree' ? 110 : s.type === 'fruit_tree' ? 90 : 40;
      if (this.visible(cam, s.x + 0.5, s.y + 0.5, up, 50)) push(s.x + s.y + 1, 0, s, s.id);
    }
    for (const b of world.buildings) if (this.visible(cam, b.x + b.w / 2, b.y + b.h / 2, 120, 110)) push(b.x + b.y + b.w + b.h - 1.5, 1, b, b.id);
    for (const s of world.sites) if (this.visible(cam, s.x + s.w / 2, s.y + s.h / 2, 120, 110)) push(s.x + s.y + s.w + s.h - 1.5, 2, s, s.id);
    for (const p of world.plots) if (this.visible(cam, p.x + 0.5, p.y + 0.5, 40, 50)) push(p.x + p.y + 0.9, 3, p, p.id);
    for (const p of world.piles) if (this.visible(cam, p.x + 0.5, p.y + 0.5, 30, 40)) push(p.x + p.y + 1, 4, p, p.id);
    for (const g of world.graves) if (this.visible(cam, g.x + 0.5, g.y + 0.5, 50, 40)) push(g.x + g.y + 1, 5, g, g.id);
    world.stumps.forEach((s, i) => {
      if (this.visible(cam, s.x + 0.5, s.y + 0.5, 30, 40)) push(s.x + s.y + 0.9, 6, s, -i);
    });
    const huts = world.buildings.filter((b) => b.type === 'hut' || b.type === 'house');
    const hidden = new Set<number>();
    for (const p of world.persons) {
      const x = p.px + (p.x - p.px) * alphaT;
      const y = p.py + (p.y - p.py) * alphaT;
      if (p.pose === 'sleep') {
        // asleep indoors: not drawn, the roof shows it instead
        const hut = huts.find((b) => Math.hypot(x - (b.x + b.w / 2), y - (b.y + b.h / 2)) < 2.4);
        if (hut) {
          hidden.add(p.id);
          continue;
        }
      }
      if (this.visible(cam, x, y, 60, 60)) push(x + y, 7, p, p.id);
    }
    for (const a of world.animals) {
      const x = a.px + (a.x - a.px) * alphaT;
      const y = a.py + (a.y - a.py) * alphaT;
      if (this.visible(cam, x, y, 40, 60)) push(x + y, 8, a, a.id);
    }
    for (const c of world.carts) {
      const x = c.px + (c.x - c.px) * alphaT;
      const y = c.py + (c.y - c.py) * alphaT;
      if (this.visible(cam, x, y, 50, 60)) push(x + y, 9, c, c.id);
    }
    list.sort((a, b) => a.d - b.d || a.id - b.id);
    this.drawnCount = list.length;

    this.heads.clear();
    const night = 1 - Math.min(1, world.light * 1.2);
    const hoverId = game.hover?.id ?? 0;
    const sleepersOnRoof = new Map<number, number>();
    for (const it of list) {
      switch (it.k) {
        case 0:
          this.scenery.drawSource(ctx, it.o as Source, simT, wind);
          break;
        case 1:
          this.scenery.drawBuilding(ctx, it.o as Building, simT);
          break;
        case 2:
          this.scenery.drawSite(ctx, it.o as Site, world, simT);
          break;
        case 3:
          this.scenery.drawPlot(ctx, it.o as Plot, world, simT, wind);
          break;
        case 4:
          this.scenery.drawPile(ctx, it.o as Pile);
          break;
        case 5:
          this.scenery.drawGrave(ctx, it.o as Grave);
          break;
        case 6: {
          const s = it.o as { x: number; y: number };
          this.scenery.drawStump(ctx, s.x, s.y, s.x + s.y);
          break;
        }
        case 7: {
          const p = it.o as Person;
          const r = this.chars.draw(ctx, world, p, alphaT, simT, { selected: p.id === game.selectedId, hovered: p.id === hoverId, night });
          this.heads.set(p.id, { x: r.headX, y: r.headY });
          if (p.pose === 'sleep') this.drawZzz(ctx, r.headX, r.headY, simT, p.id);
          break;
        }
        case 9:
          this.carts.draw(ctx, world, it.o as Cart, alphaT, simT, it.id === game.selectedId, it.id === hoverId);
          break;
        case 8: {
          const a = it.o as Animal;
          const r = this.chars.drawWolf(ctx, a, alphaT, simT, a.id === game.selectedId);
          this.heads.set(a.id, { x: r.headX, y: r.headY });
          break;
        }
      }
    }
    // sleepers who are indoors: "z" over the roof
    for (const p of world.persons) {
      if (!hidden.has(p.id)) continue;
      const hut = huts.find((b) => Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h / 2)) < 2.4);
      if (!hut) continue;
      const n = sleepersOnRoof.get(hut.id) ?? 0;
      sleepersOnRoof.set(hut.id, n + 1);
      const hx = (hut.x + hut.w / 2 - (hut.y + hut.h / 2)) * 32 + (n - 0.5) * 14;
      const hy = (hut.x + hut.w / 2 + (hut.y + hut.h / 2)) * 16 - (hut.type === 'house' ? 94 : 70);
      if (this.visible(cam, hut.x + hut.w / 2, hut.y + hut.h / 2, 120, 110)) this.drawZzz(ctx, hx, hy, simT, p.id);
      if (p.id === game.selectedId) this.heads.set(p.id, { x: hx, y: hy - 6 });
    }

    // ── particles, creatures and light ──
    this.fx.consume(world);
    this.fx.emitAmbient(world, simT, cam, { w, h });
    this.fx.update(dSim);
    this.fx.draw(ctx);
    this.critters.draw(ctx, world, simT, cam, { w, h });
    drawGlows(ctx, world, simT);

    // overlays that should sit above the scenery but below the tint? keep them crisp: draw after tint
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawTint(world);
    drawWeather(ctx, world, simT, w, h);

    // ── overlays in world space ──
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (w / 2 - cam.x * z), dpr * (h / 2 - cam.y * z));
    this.drawWorldOverlays(world, alphaT, simT, hoverId);

    // ── overlays in screen space ──
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawScreenOverlays(world, simT, hoverId);
  }

  private drawZzz(ctx: CanvasRenderingContext2D, x: number, y: number, simT: number, id: number): void {
    ctx.save();
    ctx.font = 'bold 9px Inter, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const t = ((simT * 0.5 + i / 3 + id * 0.13) % 1 + 1) % 1;
      ctx.globalAlpha = Math.sin(t * Math.PI) * 0.9;
      ctx.fillStyle = '#e8f0ff';
      ctx.strokeStyle = 'rgba(20,30,60,0.6)';
      ctx.lineWidth = 2.4;
      const gx = x + 6 + t * 9;
      const gy = y - 6 - t * 18;
      ctx.font = `bold ${7 + t * 5}px Inter, "Segoe UI", sans-serif`;
      ctx.strokeText('z', gx, gy);
      ctx.fillText('z', gx, gy);
    }
    ctx.restore();
  }

  private drawTint(world: World): void {
    const { ctx, w, h } = this;
    const [r, g, b] = ambientColor(world);
    if (r < 254 || g < 254 || b < 254) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    // soft vignette
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(4,10,16,0.38)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  private drawWorldOverlays(world: World, alphaT: number, simT: number, hoverId: number): void {
    const { ctx, game } = this;
    const ov = game.overlays;
    const sel = game.selectedId ? world.byId.get(game.selectedId) : undefined;
    const pos = (e: Person) => ({ x: e.px + (e.x - e.px) * alphaT, y: e.py + (e.y - e.py) * alphaT });
    // hovering over scenery
    if (hoverId && hoverId !== game.selectedId) {
      const he = world.byId.get(hoverId);
      if (he && he.ent !== 'person' && he.ent !== 'animal' && he.ent !== 'cart') drawFootprintHighlight(ctx, he as Entity, simT, '255,255,255', false);
    }
    if (sel && sel.ent !== 'person' && sel.ent !== 'animal' && sel.ent !== 'cart') drawFootprintHighlight(ctx, sel, simT);
    if (sel && sel.ent === 'person') {
      const q = pos(sel);
      if (ov.knowledge) {
        this.terrain!.drawUnexplored(ctx, game.camera, { w: this.w, h: this.h }, sel.explored);
        drawKnowledge(ctx, world, sel, simT);
      }
      if (ov.perception) drawPerceptionRadius(ctx, q.x, q.y, senseRadius(world, sel), simT);
    }
    if (ov.paths) {
      for (const p of world.persons) {
        if (!p.activity || p.activity.phase !== 'travel') continue;
        const q = pos(p);
        if (p.id === game.selectedId || this.visible(game.camera, q.x, q.y, 20, 60)) {
          ctx.globalAlpha = p.id === game.selectedId ? 1 : 0.6;
          drawPath(ctx, p, q.x, q.y, simT);
          ctx.globalAlpha = 1;
        }
      }
    } else if (sel && sel.ent === 'person' && sel.activity && sel.activity.phase === 'travel' && ov.intentions) {
      const q = pos(sel);
      drawPath(ctx, sel, q.x, q.y, simT);
    }
  }

  private drawScreenOverlays(world: World, simT: number, hoverId: number): void {
    const { ctx, game, w, h } = this;
    const cam = game.camera;
    const z = cam.zoom;
    const toScreen = (hx: number, hy: number) => ({ x: (hx - cam.x) * z + w / 2, y: (hy - cam.y) * z + h / 2 });
    const ov = game.overlays;
    const tick = world.tick;

    // intention glyphs for everyone
    if (ov.intentions) {
      for (const p of world.persons) {
        const hd = this.heads.get(p.id);
        if (!hd || !p.activity) continue;
        const d = p.activity.data;
        const stype = (d.running ?? d.recipe ?? d.stype) as string | undefined;
        const gl = glyphFor(p.activity.kind, stype);
        if (!gl) continue;
        const s = toScreen(hd.x, hd.y);
        const size = Math.max(7, 9 * Math.min(1.25, z + 0.2));
        drawGlyphBadge(ctx, gl.id, gl.color, s.x, s.y - 12 * Math.min(1, z + 0.3) - size * 0.4, size);
      }
    }

    // name labels
    const labelFor = (id: number, emphasis: boolean) => {
      const hd = this.heads.get(id);
      const e = world.byId.get(id);
      if (!hd || !e || e.ent !== 'person') return;
      const s = toScreen(hd.x, hd.y);
      drawLabel(ctx, e.name, s.x, s.y - 14 * Math.min(1, z + 0.3) - (ov.intentions && e.activity ? 14 : 0), emphasis);
    };
    if (ov.labels && z > 0.5) for (const p of world.persons) if (p.id !== game.selectedId && this.heads.has(p.id)) labelFor(p.id, false);
    if (game.selectedId && this.heads.has(game.selectedId)) labelFor(game.selectedId, true);
    else if (hoverId && this.heads.has(hoverId)) labelFor(hoverId, false);

    // speech bubbles: a handful at a time, selected person first. At 8× and faster a bubble lasts a fraction of a second, so
    // the followed person's last words stay up for a moment of real time after the world has moved on (nothing waits for it)
    const now = performance.now();
    const followed = game.following && game.speed >= 8 ? world.byId.get(game.selectedId) : undefined;
    if (followed && followed.ent === 'person' && followed.speech && followed.speech.until > tick) {
      if (this.dwell?.id !== followed.id || this.dwell.text !== followed.speech.text) this.dwell = { id: followed.id, text: followed.speech.text, kind: followed.speech.kind, until: now + 2500 };
    } else if (!followed || this.dwell?.id !== followed.id) this.dwell = null;
    const speakers: { p: Person; pri: number; text: string; kind: Speech['kind']; alpha: number }[] = [];
    for (const p of world.persons) {
      const live = p.speech && p.speech.until > tick ? p.speech : null;
      const held = this.dwell && this.dwell.id === p.id && now < this.dwell.until ? this.dwell : null;
      if (!live && !held) continue;
      const hd = this.heads.get(p.id);
      if (!hd) continue;
      const say = held ?? live!;
      let pri = 5;
      if (p.id === game.selectedId) pri = 0;
      else if (say.kind === 'warn' || say.kind === 'angry') pri = 1;
      else if (say.kind === 'ask') pri = 2;
      else if (say.kind === 'happy') pri = 3;
      const alpha = Math.max(live ? Math.min(1, (live.until - tick) / 12) : 0, held ? Math.min(1, (held.until - now) / 400) : 0);
      speakers.push({ p, pri, text: say.text, kind: say.kind, alpha });
    }
    speakers.sort((a, b) => a.pri - b.pri || a.p.id - b.p.id);
    const limit = z < 0.5 ? 2 : z < 0.8 ? 4 : 7;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    for (const { p, pri, text, kind, alpha } of speakers.slice(0, limit)) {
      if (z < 0.5 && pri > 1) continue;
      const hd = this.heads.get(p.id)!;
      const s = toScreen(hd.x, hd.y);
      let by = s.y - 8 - (ov.intentions && p.activity ? 16 : 0) - (game.selectedId === p.id ? 18 : 0);
      // nudge up if it would sit on top of another bubble
      for (let tries = 0; tries < 4; tries++) {
        const bw = Math.min(190, text.length * 6.6 + 16);
        const bh = 30;
        const hit = placed.find((q) => Math.abs(q.x - s.x) < (q.w + bw) / 2 && Math.abs(q.y - by) < (q.h + bh) / 2 + 2);
        if (!hit) {
          placed.push({ x: s.x, y: by, w: bw, h: bh });
          break;
        }
        by -= 34;
      }
      drawBubble(ctx, text, s.x, by, kind, alpha);
    }
  }
}
