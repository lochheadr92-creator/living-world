export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const sq = (v: number): number => v * v;
/**
 * Math.hypot(a, b), bit for bit, without its cost. V8's builtin makes an array and a boxed number on every call, which in a large world
 * is a third of everything the simulation allocates (scripts/allocs.ts) and so a good part of what the garbage collector then has to
 * do. This is the builtin's own algorithm for two arguments (scale by the larger, sum the squares, take the root, scale back: the
 * Kahan compensation it applies has nothing to correct with two terms), in plain arithmetic that the compiler keeps in registers.
 * tests/hypot.test.ts holds that it gives the same answer as Math.hypot; where it is not sure (NaN, infinity) it asks Math.hypot.
 */
export function hyp(a: number, b: number): number {
  if (a !== a || b !== b || a === Infinity || a === -Infinity || b === Infinity || b === -Infinity) return Math.hypot(a, b);
  const x = a < 0 ? -a : a;
  const y = b < 0 ? -b : b;
  const max = x > y ? x : y;
  if (max === 0) return 0;
  const nx = x / max;
  const ny = y / max;
  return Math.sqrt(nx * nx + ny * ny) * max;
}
export const dist = (ax: number, ay: number, bx: number, by: number): number => hyp(ax - bx, ay - by);
export const dist2 = (ax: number, ay: number, bx: number, by: number): number => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const TAU = Math.PI * 2;

export function normAngle(a: number): number {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  else if (a < -Math.PI) a += TAU;
  return a;
}

export function angleDiff(from: number, to: number): number {
  return normAngle(to - from);
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + angleDiff(a, b) * t;
}

/** Turn `cur` toward `target` by at most `maxStep`. */
export function turnToward(cur: number, target: number, maxStep: number): number {
  const d = angleDiff(cur, target);
  if (Math.abs(d) <= maxStep) return target;
  return normAngle(cur + Math.sign(d) * maxStep);
}

/** Binary min-heap keyed by a numeric priority (used by A*). */
export class MinHeap {
  private ids: number[] = [];
  private pri: number[] = [];
  get size(): number {
    return this.ids.length;
  }
  clear(): void {
    this.ids.length = 0;
    this.pri.length = 0;
  }
  push(id: number, p: number): void {
    const ids = this.ids;
    const pri = this.pri;
    let i = ids.length;
    ids.push(id);
    pri.push(p);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (pri[parent] <= p) break;
      ids[i] = ids[parent];
      pri[i] = pri[parent];
      i = parent;
    }
    ids[i] = id;
    pri[i] = p;
  }
  pop(): number {
    const ids = this.ids;
    const pri = this.pri;
    const top = ids[0];
    const lastId = ids.pop()!;
    const lastP = pri.pop()!;
    const n = ids.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = i * 2 + 1;
        if (c >= n) break;
        if (c + 1 < n && pri[c + 1] < pri[c]) c++;
        if (pri[c] >= lastP) break;
        ids[i] = ids[c];
        pri[i] = pri[c];
        i = c;
      }
      ids[i] = lastId;
      pri[i] = lastP;
    }
    return top;
  }
}

/** Format a count with a unit name, pluralising naively. */
export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : many ?? one + 's'}`;
}

export function capFirst(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
