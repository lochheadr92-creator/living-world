import type { Game } from '../app/game';
import { hasHabitation, indoorHome } from '../sim/habitation';
import { senseRadius } from '../sim/perception';
import type { Animal, Building, Cart, Entity, Grave, Person, Pile, Plot, Site, Source, World } from '../sim/types';
import { clampCamera, updateCamera } from './camera';
import { CartRenderer } from './carts';
import { CharacterRenderer } from './characters';
import { Critters, Effects, ambientColor, drawGlows, drawWeather } from './effects';
import { CanvasInput } from './input';
import { project } from './iso';
import { drawBubble, drawFootprintHighlight, drawGlyphBadge, drawKnowledge, drawLabel, measureLabel, drawPath, drawPerceptionRadius, glyphFor } from './overlays';
import { Scenery } from './scenery';
import { TerrainPainter } from './terrain';
import { speechVisible, type ViewRect } from '../app/viewer';
import { intersects, overlayPolicy, placeBubble, speechDetail, SpeechLayoutCache, type SpeechDetail } from './speech_layout';

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
  /** exposed for the debug readout */
  lastFrameMs = 0;
  drawnCount = 0;
  lastOverlayMs = 0;
  /** Measured visible geometry for diagnostics and browser contracts; never simulation state. */
  lastOverlayLayout: (ViewRect & { id: number; type: 'speech' | 'label' | 'glyph'; detail?: SpeechDetail; truncated?: boolean; fontSize?: number })[] = [];
  private speechCache = new SpeechLayoutCache();
  private speechLevel: SpeechDetail | undefined;
  private speechSlots = new Map<number, { text: string; slot: number }>();

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
    clampCamera(this.game.camera, this.game.world, { w: this.w, h: this.h });
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
    // aim at the middle of the part of the screen the inspector leaves visible, not the middle of the window
    const shift = g.viewInsetRight / 2 / g.camera.zoom;
    if (follow) follow.x += shift;
    if (g.fly && g.viewer.reducedMotion) {
      g.camera.x = g.fly.x + shift; g.camera.y = g.fly.y;
      if (g.fly.zoom !== null) g.camera.zoom = g.fly.zoom;
      g.fly = null;
    }
    const done = updateCamera(g.camera, dt, follow, g.fly && shift ? { ...g.fly, x: g.fly.x + shift } : g.fly);
    if (done) g.fly = null;
    clampCamera(g.camera, g.world, { w: this.w, h: this.h });
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
      this.speechCache.clear();
      this.speechSlots.clear();
      this.speechLevel = undefined;
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
    const residents = new Map<number, Person[]>();
    for (const p of world.persons) {
      const x = p.px + (p.x - p.px) * alphaT;
      const y = p.py + (p.y - p.py) * alphaT;
      const home = indoorHome(world, p);
      if (home) {
        hidden.add(p.id);
        const group = residents.get(home.id) ?? [];
        group.push(p);
        residents.set(home.id, group);
        continue;
      }
      if (!hasHabitation(world) && p.pose === 'sleep') {
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
          this.scenery.drawSource(ctx, it.o as Source, simT, wind, world);
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
      const hut = indoorHome(world, p) ?? huts.find((b) => Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h / 2)) < 2.4);
      if (!hut) continue;
      const n = sleepersOnRoof.get(hut.id) ?? 0;
      sleepersOnRoof.set(hut.id, n + 1);
      const hx = (hut.x + hut.w / 2 - (hut.y + hut.h / 2)) * 32 + (n - 0.5) * 14;
      const hy = (hut.x + hut.w / 2 + (hut.y + hut.h / 2)) * 16 - (hut.type === 'house' ? 94 : 70);
      if (this.visible(cam, hut.x + hut.w / 2, hut.y + hut.h / 2, 120, 110)) {
        if (p.pose === 'sleep') this.drawZzz(ctx, hx, hy, simT, p.id);
        if (hasHabitation(world) && n === 0) {
          const group = residents.get(hut.id) ?? [];
          const selected = group.find(person => person.id === game.selectedId);
          ctx.save();
          ctx.font = 'bold 10px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#203027'; ctx.fillStyle = '#fff6ce';
          const doing = selected?.activity?.kind === 'give' && selected.activity.phase === 'work'
            ? 'Handing over · ' : selected?.pose === 'eat' ? 'Eating · ' : '';
          const label = doing + group.length + ' inside';
          const center = hx - (n - 0.5) * 14;
          ctx.strokeText(label, center, hy); ctx.fillText(label, center, hy);
          ctx.restore();
        }
      }
      if (p.id === game.selectedId) this.heads.set(p.id, { x: hasHabitation(world) ? hx - (n - 0.5) * 14 : hx, y: hy - 14 });
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

  private drawScreenOverlays(world: World, _simT: number, hoverId: number): void {
    const started = performance.now();
    const { ctx, game, w, h } = this;
    const cam = game.camera, z = cam.zoom, ov = game.overlays;
    const large = game.viewer.textSize === 'large';
    const policy = overlayPolicy(z, large);
    const level = this.speechLevel = speechDetail(z, this.speechLevel);
    const bounds = { x: 8, y: 8, w: Math.max(0, w - 16), h: Math.max(0, h - 16) };
    const occupied: ViewRect[] = [...game.viewOcclusions];
    this.lastOverlayLayout = [];
    const people = world.persons.filter(p => p.alive && this.heads.has(p.id)).map(p => {
      const hd = this.heads.get(p.id)!;
      return { p, s: { x: (hd.x - cam.x) * z + w / 2, y: (hd.y - cam.y) * z + h / 2 } };
    }).filter(({s}) => s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= h);
    // Reserve the selected person. Protecting every body in a crowd would suppress even priority speech.
    for (const {p,s} of people) if (p.id === game.selectedId) occupied.push({x:s.x - 6 * z, y:s.y, w:12 * z, h:24 * z});
    const priority = (p: Person) => p.id === game.selectedId ? 0 : p.speech?.kind === 'warn' || p.speech?.kind === 'angry' ? 1 : p.speech?.kind === 'ask' ? 2 : 3;
    people.sort((a,b) => priority(a.p) - priority(b.p) || a.p.id - b.p.id);
    const labelled = new Set<number>();
    const labelFor = ({p,s}: typeof people[number], emphasis: boolean) => {
      const scale = large ? 1.2 : 1;
      const size = measureLabel(ctx,p.name,emphasis,scale);
      const rect = {x:s.x - size.w / 2,y:s.y - size.h - 5,w:size.w,h:size.h};
      if (rect.x < bounds.x || rect.x+rect.w > bounds.x+bounds.w || rect.y < bounds.y || rect.y+rect.h > bounds.y+bounds.h || occupied.some(q => intersects(rect,q,2))) return;
      drawLabel(ctx,p.name,s.x,rect.y+rect.h,emphasis,scale);
      occupied.push(rect); labelled.add(p.id);
      this.lastOverlayLayout.push({...rect,id:p.id,type:'label'});
    };
    const selected = people.find(({p}) => p.id === game.selectedId);
    if (selected) labelFor(selected,true);
    const active = new Set<number>();
    let count = 0;
    for (const {p,s} of people) {
      if (!p.speech || p.speech.until <= world.tick || !speechVisible(game.viewer.speech,p.id === game.selectedId)) continue;
      active.add(p.id);
      if (count >= policy.bubbles) continue;
      const anchor = {x:s.x,y:s.y - (labelled.has(p.id) ? (large ? 23 : 19) + 10 : 5)};
      const previous = this.speechSlots.get(p.id);
      const obstacles = [...occupied,{x:s.x - 6 * z,y:s.y,w:12 * z,h:24 * z}];
      let layout = this.speechCache.get(ctx,p.speech.text,z,level,large,bounds.w);
      let box = placeBubble(layout,anchor,bounds,obstacles,previous?.text === p.speech.text ? previous.slot : undefined);
      if (!box && level !== 'marker') {
        layout = this.speechCache.get(ctx,p.speech.text,z,'marker',large,bounds.w);
        box = placeBubble(layout,anchor,bounds,obstacles);
      }
      if (!box) continue;
      count++;
      this.speechSlots.set(p.id,{text:p.speech.text,slot:box.slot});
      drawBubble(ctx,layout,box,s,p.speech.kind,Math.min(1,(p.speech.until-world.tick)/12),game.viewer.contrast === 'high');
      occupied.push(box);
      this.lastOverlayLayout.push({...box,id:p.id,type:'speech',detail:layout.detail,truncated:layout.truncated,fontSize:layout.fontSize});
    }
    for (const id of this.speechSlots.keys()) if (!active.has(id)) this.speechSlots.delete(id);
    // Ordinary names and icons use what space remains, rather than competing with speech in independent passes.
    let labels = 0, glyphs = 0;
    for (const item of people) {
      const {p,s} = item;
      if (!labelled.has(p.id) && (p.id === hoverId || ov.labels && level !== 'marker' && labels < policy.labels)) {
        labelFor(item,false); if (labelled.has(p.id)) labels++;
      }
      if (!ov.intentions || !p.activity || !(p.id === game.selectedId || level !== 'marker' && glyphs < policy.glyphs)) continue;
      const d = p.activity.data;
      const gl = glyphFor(p.activity.kind,(d.running ?? d.recipe ?? d.stype) as string | undefined);
      if (!gl) continue;
      const size = Math.max(8,Math.min(11,z * 9)) * (large ? 1.2 : 1);
      const y = s.y - size - 5 - (labelled.has(p.id) ? (large ? 23 : 19) + 3 : 0);
      const rect = {x:s.x-size,y:y-size,w:2*size,h:2*size};
      if (rect.x < bounds.x || rect.x+rect.w > bounds.x+bounds.w || rect.y < bounds.y || rect.y+rect.h > bounds.y+bounds.h || occupied.some(q=>intersects(rect,q,3))) continue;
      drawGlyphBadge(ctx,gl.id,gl.color,s.x,y,size);
      occupied.push(rect); glyphs++;
      this.lastOverlayLayout.push({...rect,id:p.id,type:'glyph'});
    }
    this.lastOverlayMs = performance.now() - started;
  }
}
