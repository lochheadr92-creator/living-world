// Just enough of a browser for the real renderer to run in Node: a canvas context that accepts every
// call and does nothing. Lets tests prove that drawing never changes simulation state.

function fakeContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop() {} };
  const target: Record<string, unknown> = {
    canvas: null,
    measureText: (t: string) => ({ width: String(t).length * 6 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => ({}),
  };
  return new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      return () => undefined;
    },
    set(t, prop: string, v) {
      t[prop] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

export function fakeCanvas(w = 800, h = 450): HTMLCanvasElement {
  const ctx = fakeContext();
  const c = {
    width: w,
    height: h,
    style: {} as Record<string, string>,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0 }),
    addEventListener() {},
    removeEventListener() {},
    setPointerCapture() {},
  };
  return c as unknown as HTMLCanvasElement;
}

/** Install stubs on globalThis. Call once per test file that renders. */
export function installFakeDom(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = { createElement: () => fakeCanvas(64, 64) };
  g.window = { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} };
  g.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  g.Path2D = class {
    moveTo() {}
    lineTo() {}
    quadraticCurveTo() {}
    closePath() {}
  };
}
