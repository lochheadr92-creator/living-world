// Bake static, depth-tested meshes into the isometric compositor's sprite cache.
// A shared scratch context is used only on cache misses, including in large worlds.
import { hashUnit } from '../sim/rng';
import { groundShadow, SpriteCache } from './sprites';
import type { Sprite } from './sprites';

type Point = readonly [x: number, y: number, z: number];
type UV = readonly [u: number, v: number];
export const GRAIN = 0, THATCH = 1, MASONRY = 2, LEAF = 3, TILE = 4, EARTH = 5;
export type Finish = readonly [color: number, texture: number];
const MATERIALS = 6;
const RESOLUTION = 3;
const CIRCLE = Math.PI * 2;
const UV_QUAD: UV[] = [[0, 0], [1, 0], [1, 1], [0, 1]];

export class SceneryModel {
  readonly vertices: number[] = [];

  face(points: Point[], finish: Finish, uv = UV_QUAD): void {
    const [a, b, c] = points;
    const bx = (b[0] - a[0]) * 45, by = (b[1] - a[1]) * 45, bz = b[2] - a[2];
    const cx = (c[0] - a[0]) * 45, cy = (c[1] - a[1]) * 45, cz = c[2] - a[2];
    const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
    const magnitude = Math.hypot(nx, ny, nz);
    if (!magnitude) return;
    const sun = (nx * .22 + ny * .52 + nz * .82) / magnitude;
    const shade = .66 + .42 * Math.max(0, sun);
    const [color, texture] = finish;
    const rgb = [(color >> 16) / 255, (color >> 8 & 255) / 255, (color & 255) / 255];
    for (let i = 1; i < points.length - 1; i++) {
      for (const j of [0, i, i + 1]) {
        this.vertices.push(...points[j], ...uv[j], ...rgb, shade, texture);
      }
    }
  }

  box(x: number, y: number, z: number, w: number, d: number, h: number, m: Finish): void {
    const a: Point = [x, y, z], b: Point = [x + w, y, z];
    const c: Point = [x + w, y + d, z], e: Point = [x, y + d, z];
    const lift = ([px, py, pz]: Point): Point => [px, py, pz + h];
    const sides: Point[] = [a, b, c, e];
    this.face(sides.map(lift), m, [[0, 0], [w, 0], [w, d], [0, d]]);
    for (let i = 0; i < 4; i++) {
      const p = sides[i], q = sides[(i + 1) % 4];
      const horizontal = i % 2 ? d : w;
      this.face([p, q, lift(q), lift(p)], m, [[0, 0], [horizontal, 0], [horizontal, h / 38], [0, h / 38]]);
    }
  }

  beam(a: Point, b: Point, radius: number, taper: number, m: Finish, sides = 7, cap = m): void {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = (b[2] - a[2]) / 45;
    const len = Math.hypot(dx, dy, dz);
    const horizontal = Math.hypot(dx, dy);
    const ux = horizontal ? -dy / horizontal : 1, uy = horizontal ? dx / horizontal : 0;
    const vx = -dz * uy / len, vy = dz * ux / len, vz = (dx * uy - dy * ux) / len;
    const ring = (p: Point, r: number): Point[] => Array.from({ length: sides }, (_, i) => {
      const k = CIRCLE * i / sides;
      return [p[0] + r * (ux * Math.cos(k) + vx * Math.sin(k)),
        p[1] + r * (uy * Math.cos(k) + vy * Math.sin(k)), p[2] + 45 * r * vz * Math.sin(k)];
    });
    const low = ring(a, radius), high = ring(b, taper);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      this.face([low[i], low[j], high[j], high[i]], m,
        [[i / sides, 0], [(i + 1) / sides, 0], [(i + 1) / sides, len], [i / sides, len]]);
    }
    const capUV: UV[] = high.map((_, i) => [.5 + .48 * Math.cos(CIRCLE * i / sides), .5 + .48 * Math.sin(CIRCLE * i / sides)]);
    if (taper) this.face(high, cap, capUV);
    this.face(low.reverse(), cap, capUV.reverse());
  }

  stone(center: Point, rx: number, ry: number, rz: number, m: Finish, seed: number): void {
    const [x, y, z] = center;
    const ring = (height: number, radius: number, phase: number): Point[] => Array.from({ length: 7 }, (_, i) => {
      const a = CIRCLE * i / 7 + phase;
      const r = radius * (.82 + hashUnit(seed, i, 12) * .34);
      return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r,
        z + rz * (height + (hashUnit(seed, i, 19) - .5) * .23)];
    });
    const bottom = ring(-.72, .67, 0), middle = ring(-.17, 1, 0), top = ring(.65, .63, .22);
    for (let i = 0; i < 7; i++) {
      const j = (i + 1) % 7;
      this.face([bottom[i], bottom[j], middle[j], middle[i]], m);
      this.face([middle[i], middle[j], top[j]], m);
      this.face([middle[i], top[j], top[i]], m);
      this.face([top[i], top[j], [x - rx * .16, y + ry * .12, z + rz]], m);
    }
  }
}

function materialPixels(): Uint8Array {
  const pixels = new Uint8Array(64 * 64 * MATERIALS);
  for (let m = 0; m < MATERIALS; m++) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const row = y >> 4;
    const stoneX = (x + (row % 2) * 9) % 22;
    const tileX = (x + (row % 2) * 6) % 13;
    const noise = hashUnit(x, y, m) - .5;
    const grain = Math.sin(x * 1.35 + Math.sin(y * .18) * 1.5);
    const patterns = [
      grain * .085 + Math.sin(x * .35 + y * .07) * .075,
      Math.sin(x * 1.8 + y * .43) * .09 - (y % 16 === 0 ? .22 : 0),
      (y % 16 < 2 || stoneX < 2 ? -.28 : .02) + hashUnit((x - stoneX) >> 2, row, 4) * .16,
      Math.sin(x * .63 + y * .91) * Math.cos(x * .34 - y * .42) * .15,
      y % 16 < 2 || tileX === 0 ? -.29 : (hashUnit(x - tileX, row, 9) - .5) * .23 + y % 16 * .01,
      Math.sin(x * .34) * Math.cos(y * .56) * .08,
    ];
    pixels[(m * 64 + y) * 64 + x] = Math.min(255, Math.round((.83 + patterns[m] + .14 * noise) * 255));
  }
  return pixels;
}

const VERTEX = `#version 300 es
layout(location=0) in vec3 p;
layout(location=1) in vec2 uv;
layout(location=2) in vec4 paint;
layout(location=3) in float textureId;
uniform vec4 frame;
out vec2 surface;
out vec3 tint;
flat out float material;
void main() {
  vec2 iso = vec2((p.x-p.y)*32., (p.x+p.y)*16.-p.z);
  vec2 screen = (iso+frame.zw)/frame.xy;
  gl_Position = vec4(screen.x*2.-1., 1.-screen.y*2., -(p.x+p.y+p.z/32.)/16., 1.);
  surface = uv;
  tint = paint.rgb*paint.a;
  material = textureId;
}`;
const FRAGMENT = `#version 300 es
precision highp float;
in vec2 surface;
in vec3 tint;
flat in float material;
uniform sampler2D materials;
out vec4 color;
void main() {
  vec2 texel = fract(surface)*62.+1.;
  float pattern = texture(materials, vec2(texel.x/64., (texel.y+material*64.)/384.)).r;
  color = vec4(tint*(.42+pattern*.74), 1.);
}`;

class MeshBaker {
  private readonly program: WebGLProgram;
  private readonly frame: WebGLUniformLocation;
  private readonly buffer: WebGLBuffer;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly gl: WebGL2RenderingContext) {
    this.program = gl.createProgram()!;
    for (const [kind, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
      const shader = gl.createShader(kind)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(this.program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program) ?? 'Mesh shader failed');
    this.frame = gl.getUniformLocation(this.program, 'frame')!;
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    for (const [location, size, offset] of [[0, 3, 0], [1, 2, 3], [2, 4, 5], [3, 1, 9]]) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 40, offset * 4);
    }
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 64, 64 * MATERIALS, 0, gl.RED, gl.UNSIGNED_BYTE, materialPixels());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.enable(gl.DEPTH_TEST);
  }

  draw(ctx: CanvasRenderingContext2D, model: SceneryModel, w: number, h: number, ax: number, ay: number, origin: Point): void {
    const { canvas, gl } = this;
    if (canvas.width !== w * RESOLUTION) canvas.width = w * RESOLUTION;
    if (canvas.height !== h * RESOLUTION) canvas.height = h * RESOLUTION;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform4f(this.frame, w, h, ax - (origin[0] - origin[1]) * 32, ay - (origin[0] + origin[1]) * 16 + origin[2]);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, model.vertices.length / 10);
    ctx.drawImage(canvas, -ax, -ay, w, h);
  }

  get lost(): boolean { return this.gl.isContextLost(); }
}

let baker: MeshBaker | null | undefined;

export function meshSprite(cache: SpriteCache, key: string, size: readonly [number, number, number, number],
  origin: Point, shadow: readonly [number, number] | null, model: () => SceneryModel): Sprite | undefined {
  if (baker === undefined) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true });
    try {
      baker = gl ? new MeshBaker(canvas, gl) : null;
    } catch (error) {
      console.warn('Using Canvas scenery because the mesh baker failed to initialise', error);
      baker = null;
    }
  }
  const renderer = baker;
  if (!renderer || renderer.lost) return;
  const [w, h, ax, ay] = size;
  return cache.get(`mesh:${key}`, w, h, ax, ay, (ctx) => {
    if (shadow) groundShadow(ctx, ...shadow, .33, 3);
    renderer.draw(ctx, model(), w, h, ax, ay, origin);
  }, RESOLUTION);
}
