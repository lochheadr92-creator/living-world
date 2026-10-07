import type { Game } from '../app/game';
import { MAX_ZOOM, clampCamera, minZoomFor, screenToWorld } from './camera';
import { pickEntity } from './picking';
import { project } from './iso';
import { clamp } from '../sim/util';

/** Pointer, wheel, touch and keyboard camera control plus picking. Never touches the simulation. */
export class CanvasInput {
  private pointers = new Map<number, { x: number; y: number }>();
  private dragging = false;
  private downAt = { x: 0, y: 0 };
  private lastPinch = 0;
  private keys = new Set<string>();
  private dispose: (() => void)[] = [];
  /** screen px the pointer must move before a press becomes a drag */
  private static DRAG = 5;

  constructor(
    private canvas: HTMLCanvasElement,
    private game: Game,
    private view: () => { w: number; h: number },
  ) {
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, ev: string, fn: (e: any) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(ev, fn, opts);
      this.dispose.push(() => el.removeEventListener(ev, fn));
    };
    on(canvas, 'pointerdown', (e: PointerEvent) => this.down(e));
    on(canvas, 'pointermove', (e: PointerEvent) => this.move(e));
    on(canvas, 'pointerup', (e: PointerEvent) => this.up(e));
    on(canvas, 'pointercancel', (e: PointerEvent) => this.up(e));
    on(canvas, 'pointerleave', () => {
      this.game.hover = null;
    });
    on(canvas, 'wheel', (e: WheelEvent) => this.wheel(e), { passive: false });
    on(canvas, 'dblclick', (e: MouseEvent) => this.dbl(e));
    on(canvas, 'contextmenu', (e: Event) => e.preventDefault());
    on(window, 'keydown', (e: KeyboardEvent) => this.keydown(e));
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase()));
    on(window, 'blur', () => this.keys.clear());
  }

  destroy(): void {
    for (const d of this.dispose) d();
  }

  private pos(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.pos(e);
    this.pointers.set(e.pointerId, p);
    this.downAt = p;
    this.dragging = false;
    if (this.pointers.size === 2) this.lastPinch = this.pinchDist();
  }

  private pinchDist(): number {
    const pts = [...this.pointers.values()];
    return pts.length < 2 ? 0 : Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  private move(e: PointerEvent): void {
    const p = this.pos(e);
    const prev = this.pointers.get(e.pointerId);
    const v = this.view();
    if (prev) {
      if (this.pointers.size === 2) {
        this.pointers.set(e.pointerId, p);
        const d = this.pinchDist();
        if (this.lastPinch > 0 && d > 0) this.zoomAt(this.mid().x, this.mid().y, d / this.lastPinch);
        this.lastPinch = d;
        this.dragging = true;
        return;
      }
      if (!this.dragging && Math.hypot(p.x - this.downAt.x, p.y - this.downAt.y) > CanvasInput.DRAG) {
        this.dragging = true;
        this.game.fly = null;
        if (this.game.following) this.game.setFollow(false);
      }
      if (this.dragging) {
        const z = this.game.camera.zoom;
        this.game.camera.x -= (p.x - prev.x) / z;
        this.game.camera.y -= (p.y - prev.y) / z;
        clampCamera(this.game.camera, this.game.world, v);
        this.canvas.style.cursor = 'grabbing';
      }
      this.pointers.set(e.pointerId, p);
    } else {
      // hover
      const id = pickEntity(this.game, v.w, v.h, p.x, p.y);
      this.game.hover = id ? { id, px: p.x, py: p.y } : null;
      this.canvas.style.cursor = id ? 'pointer' : 'grab';
    }
  }

  private mid(): { x: number; y: number } {
    const pts = [...this.pointers.values()];
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }

  private up(e: PointerEvent): void {
    const p = this.pos(e);
    const wasDrag = this.dragging;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.canvas.style.cursor = 'grab';
      if (!wasDrag) {
        const v = this.view();
        const id = pickEntity(this.game, v.w, v.h, p.x, p.y);
        this.game.select(id);
      }
      this.dragging = false;
    }
  }

  private wheel(e: WheelEvent): void {
    e.preventDefault();
    const p = this.pos(e);
    const k = Math.pow(1.0016, -e.deltaY * (e.deltaMode === 1 ? 33 : 1));
    this.zoomAt(p.x, p.y, k);
  }

  private zoomAt(px: number, py: number, k: number): void {
    const v = this.view();
    const cam = this.game.camera;
    const before = screenToWorld(cam, v.w, v.h, px, py);
    cam.zoom = clamp(cam.zoom * k, minZoomFor(this.game.world, v), MAX_ZOOM);
    // keep the world point under the cursor fixed
    const after = project(before.x, before.y);
    cam.x = after.sx - (px - v.w / 2) / cam.zoom;
    cam.y = after.sy - (py - v.h / 2) / cam.zoom;
    this.game.fly = null;
    clampCamera(cam, this.game.world, v);
  }

  private dbl(e: MouseEvent): void {
    const p = this.pos(e);
    const v = this.view();
    const id = pickEntity(this.game, v.w, v.h, p.x, p.y);
    if (id) {
      this.game.select(id);
      this.game.setFollow(this.game.world.byId.get(id)?.ent === 'person');
    } else this.zoomAt(p.x, p.y, 1.6);
  }

  private keydown(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      this.keys.add(k);
      if (k.startsWith('arrow')) e.preventDefault();
    }
    const v = this.view();
    if (k === '+' || k === '=') this.zoomAt(v.w / 2, v.h / 2, 1.2);
    if (k === '-' || k === '_') this.zoomAt(v.w / 2, v.h / 2, 1 / 1.2);
    if (k === 'home' || k === 'c') {
      const w = this.game.world;
      this.game.flyTo(w.camp.x, w.camp.y, 1);
    }
  }

  /** Keyboard panning, applied per frame with real elapsed time. */
  update(dt: number): void {
    if (!this.keys.size) return;
    const v = this.view();
    const cam = this.game.camera;
    const sp = (560 * Math.min(dt, 0.05)) / cam.zoom;
    let dx = 0;
    let dy = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (dx || dy) {
      cam.x += dx * sp;
      cam.y += dy * sp * 0.6;
      this.game.fly = null;
      if (this.game.following) this.game.setFollow(false);
      clampCamera(cam, this.game.world, v);
    }
  }
}
