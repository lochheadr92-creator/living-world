// The camera and the minimap follow the size of the world being shown (80x80 for the ordinary world, larger for the larger ones).
// For the ordinary world every number here is exactly what it was when the size was a constant.
import { describe, expect, it } from 'vitest';
import type { CameraState } from '../src/app/game';
import { MAX_ZOOM, MIN_ZOOM, clampCamera, minZoomFor } from '../src/render/camera';
import { project } from '../src/render/iso';
import { mapBounds, markScale, supersampling } from '../src/ui/minimapgeom';

const ORDINARY = { W: 80, H: 80 };
const LARGE = { W: 160, H: 160 };
const HUGE = { W: 256, H: 256 };
const cam = (x: number, y: number, zoom = 1): CameraState => ({ x, y, zoom });

describe('the widest view', () => {
  it('is the same for the ordinary world however big the window', () => {
    for (const view of [{ w: 390, h: 800 }, { w: 1440, h: 900 }, { w: 3840, h: 2160 }]) expect(minZoomFor(ORDINARY, view)).toBe(MIN_ZOOM);
  });

  it('shows a larger world no more ground than the ordinary world\'s widest view does', () => {
    const tileArea = 1024; // one tile on the isometric plane at zoom 1: 64 x 32 / 2
    for (const size of [LARGE, HUGE]) {
      for (const view of [{ w: 1440, h: 900 }, { w: 2560, h: 1440 }, { w: 1024, h: 768 }]) {
        const z = minZoomFor(size, view);
        const tiles = (view.w * view.h) / (z * z * tileArea);
        expect(tiles, `${size.W}x${size.H} in ${view.w}x${view.h}`).toBeLessThanOrEqual(6400 * 1.001);
        expect(z).toBeGreaterThanOrEqual(MIN_ZOOM);
      }
    }
    expect(minZoomFor(HUGE, { w: 1440, h: 900 })).toBeCloseTo(0.4447, 3);
    expect(minZoomFor(HUGE, { w: 1440, h: 900 })).toBe(minZoomFor(LARGE, { w: 1440, h: 900 }));
  });

  it('is never wider than the ordinary limit, even on a small screen', () => {
    expect(minZoomFor(HUGE, { w: 390, h: 800 })).toBe(MIN_ZOOM);
  });
});

describe('keeping the camera over the map', () => {
  const view = { w: 1440, h: 900 };

  it('holds the ordinary world to exactly the bounds it always had', () => {
    const c = cam(1e9, 1e9, 0.1);
    clampCamera(c, ORDINARY, view);
    expect(c).toEqual({ x: 2560, y: 2620, zoom: MIN_ZOOM });
    const d = cam(-1e9, -1e9, 99);
    clampCamera(d, ORDINARY, view);
    expect(d).toEqual({ x: -2560, y: -40, zoom: MAX_ZOOM });
  });

  it('holds a larger world to its own bounds', () => {
    const c = cam(1e9, 1e9);
    clampCamera(c, HUGE, view);
    expect(c.x).toBe(256 * 32);
    expect(c.y).toBe(project(256, 256).sy + 60);
    const d = cam(-1e9, -1e9);
    clampCamera(d, HUGE, view);
    expect(d.x).toBe(-256 * 32);
    expect(d.y).toBe(-40);
  });

  it('does not hold a larger world to the ordinary world\'s bounds', () => {
    const c = cam(5000, 5000);
    clampCamera(c, HUGE, view);
    expect(c.x).toBe(5000);
    expect(c.y).toBe(5000);
    const o = cam(5000, 5000);
    clampCamera(o, ORDINARY, view);
    expect(o.x).toBeLessThan(5000);
  });

  it('keeps a larger world\'s zoom out of the range that would draw too much', () => {
    const c = cam(0, 1000, 0.1);
    clampCamera(c, HUGE, view);
    expect(c.zoom).toBeCloseTo(minZoomFor(HUGE, view), 6);
  });

  it('is a non-square world too', () => {
    const c = cam(1e9, 1e9);
    clampCamera(c, { W: 100, H: 60 }, view);
    expect(c.x).toBe(100 * 32);
    expect(c.y).toBe(project(100, 60).sy + 60);
  });
});

describe('the minimap\'s picture of a world', () => {
  it('has the ordinary world\'s numbers for the ordinary world', () => {
    expect(mapBounds(ORDINARY)).toEqual({ sxMin: -2560, sxSpan: 5120, sySpan: 2560 });
    expect(supersampling(ORDINARY)).toBe(2);
    expect(markScale(ORDINARY)).toBe(1);
  });

  it.each([ORDINARY, LARGE, HUGE, { W: 100, H: 60 }])('puts the corners of a $W x $H map on the edges of its picture', (size) => {
    const b = mapBounds(size);
    expect(project(0, 0).sy).toBe(0); // the top corner
    expect(project(size.W, size.H).sy).toBeCloseTo(b.sySpan, 6); // the bottom corner
    expect(project(0, size.H).sx).toBeCloseTo(b.sxMin, 6); // the left corner
    expect(project(size.W, 0).sx).toBeCloseTo(b.sxMin + b.sxSpan, 6); // the right corner
  });

  it('samples a larger map more finely and draws its buildings smaller', () => {
    expect(supersampling(LARGE)).toBe(2);
    expect(supersampling(HUGE)).toBe(4);
    expect(markScale(LARGE)).toBeCloseTo(0.625, 6);
    expect(markScale(HUGE)).toBe(0.5);
  });
});
