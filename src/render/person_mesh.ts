// An orthographic WebGL sprite atlas. The canvas scene still owns world ordering, shadows
// and overlays. One atlas pass depth-tests all the textured, articulated character meshes.
type Vec = readonly [number, number, number];
type Profile = readonly (readonly [height: number, radius: number])[];
type Material = readonly [color: string, texture: number];

export interface PersonModel {
  base: Vec;
  hip: Vec;
  shoulder: Vec;
  head: Vec;
  arms: readonly (readonly [Vec, Vec, Vec])[];
  legs: readonly (readonly [Vec, Vec, Vec])[];
  heading: number;
  scale: number;
  build: number;
  headScale: number;
  lying: boolean;
  child: boolean;
  little: boolean;
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
  accent: string;
  cut: number;
  hairStyle: number;
  hat: number;
  eyes: number;
  mouth: number;
  belly: number;
}

const TILE = 128;
const CLOSE_TILE = 256;
const EXTENT = 64;
const HEADROOM = 44;
const STRIDE = 17;
const Z_UP: Vec = [0, 1, 0];
const CLOTH = 0;
const TRIM = 1;
const LEATHER = 2;
const SKIN = 3;
const HAIR = 4;
const MATERIAL_COUNT = 5;

const oval: Profile = [[-1, 0], [-.86, .52], [-.55, .84], [-.05, 1], [.47, .89], [.81, .57], [1, 0]];
const face: Profile = [[-1, 0], [-.92, .44], [-.71, .68], [-.39, .88], [.08, 1], [.51, .97], [.8, .73], [1, 0]];
const tunic: Profile = [[-1, 0], [-1, .81], [-.85, .92], [-.45, .83], [.04, .91], [.58, 1], [.82, .95], [1, .43], [1, 0]];
const sleeve: Profile = [[-1, 0], [-1, .72], [-.83, .76], [-.48, .77], [.3, .94], [.69, 1], [.94, .78], [1, 0]];
const forearm: Profile = [[-1, 0], [-.91, .62], [-.46, .71], [.06, .89], [.46, 1], [.81, .85], [1, 0]];
const shin: Profile = [[-1, 0], [-.91, .63], [-.56, .74], [.04, .91], [.41, 1], [.75, .87], [1, 0]];
const band: Profile = [[-1, 0], [-1, .95], [-.75, 1], [.75, 1], [1, .95], [1, 0]];
const boot: Profile = [[-1, 0], [-1, .85], [-.66, 1], [.16, .94], [.68, .68], [1, .36], [1, 0]];
const hairCap: Profile = [[-.5, 0], [-.5, .93], [-.25, 1], [.25, .99], [.65, .84], [.9, .54], [1, 0]];
const profiles = [oval, face, tunic, sleeve, band, boot, hairCap, forearm, shin];
const [OVAL, FACE, TUNIC, SLEEVE, BAND, BOOT, HAIR_CAP, FOREARM, SHIN] = profiles.map((_, i) => i);

function add(a: Vec, b: Vec, n = 1): Vec {
  return [a[0] + b[0] * n, a[1] + b[1] * n, a[2] + b[2] * n];
}
function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function unit(a: Vec): Vec {
  const length = Math.hypot(...a);
  return length ? [a[0] / length, a[1] / length, a[2] / length] : Z_UP;
}
function mix(a: Vec, b: Vec, t: number): Vec {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function geometry(profile: Profile, sides: number): { vertices: Float32Array<ArrayBuffer>; indices: Uint16Array<ArrayBuffer> } {
  const vertices: number[] = [];
  const indices: number[] = [];
  const point = (ring: number, slice: number) => {
    const [y, radius] = profile[ring];
    const [beforeY, beforeR] = profile[Math.max(0, ring - 1)];
    const [afterY, afterR] = profile[Math.min(profile.length - 1, ring + 1)];
    const a = slice / sides * Math.PI * 2;
    const x = Math.sin(a);
    const z = Math.cos(a);
    const n = unit([(afterY - beforeY) * x, beforeR - afterR, (afterY - beforeY) * z]);
    vertices.push(x * radius, y, z * radius, ...n, slice / sides, (y + 1) * .5);
  };
  for (let j = 0; j < profile.length; j++)
    for (let i = 0; i <= sides; i++) point(j, i);
  for (let j = 0; j < profile.length - 1; j++) {
    for (let i = 0; i < sides; i++) {
      const lower = j * (sides + 1) + i;
      const upper = lower + sides + 1;
      if (profile[j][1]) indices.push(lower, lower + 1, upper);
      if (profile[j + 1][1]) indices.push(lower + 1, upper + 1, upper);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

const vertexSource = `#version 300 es
layout(location=0) in vec3 point;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=3) in vec3 center;
layout(location=4) in vec3 axisX;
layout(location=5) in vec3 axisY;
layout(location=6) in vec3 axisZ;
layout(location=7) in vec4 material;
layout(location=8) in float tile;
uniform vec2 grid;
out vec2 coord;
out vec2 tilePosition;
out float light;
flat out vec4 paint;
void main() {
  mat3 basis = mat3(axisX, axisY, axisZ);
  vec3 p = center + basis * point;
  vec3 n = normalize(mat3(
    axisX / dot(axisX, axisX), axisY / dot(axisY, axisY), axisZ / dot(axisZ, axisZ)) * normal);
  vec2 local = vec2(p.x + 32.0, p.z * 0.5 - p.y + 44.0) / 64.0;
  vec2 cell = vec2(mod(tile, grid.x), floor(tile / grid.x));
  vec2 clip = (cell + local) / grid;
  gl_Position = vec4(clip.x * 2.0 - 1.0, 1.0 - clip.y * 2.0, -(p.z + p.y * 0.5) / 64.0, 1.0);
  float sun = max(0.0, dot(n, normalize(vec3(-0.55, 0.8, 0.56))));
  float bounce = max(0.0, n.z);
  light = 0.64 + 0.46 * sun + 0.07 * bounce;
  coord = uv;
  tilePosition = local;
  paint = material;
}`;

const fragmentSource = `#version 300 es
precision mediump float;
uniform sampler2D swatches;
in vec2 coord;
in vec2 tilePosition;
in float light;
flat in vec4 paint;
out vec4 result;
void main() {
  // An extreme pose must not draw into a neighboring person's tile.
  if (any(lessThan(tilePosition, vec2(0.0))) || any(greaterThanEqual(tilePosition, vec2(1.0)))) discard;
  float grain = texture(swatches, vec2(coord.x, (paint.a * 32.0 + 0.5 + coord.y * 31.0) / 160.0)).r;
  result = vec4(paint.rgb * (0.38 + grain * 0.84) * light, 1.0);
}`;

/** Small painted material atlas, shared by every villager. */
function materialPixels(): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(32 * 32 * MATERIAL_COUNT);
  for (let m = 0; m < MATERIAL_COUNT; m++) {
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const speck = ((x * 157 + y * 113) ^ (x * y * 47)) % 19 - 9;
        const folds = 11 * Math.cos(x * Math.PI / 4) + 6 * Math.sin((x + y * .43) * Math.PI / 4);
        let value = 188 + speck;
        if (m === CLOTH) value += folds + (x % 2 === y % 2 ? 7 : -7);
        if (m === TRIM) value += y < 4 || y >= 28 ? -48 : (x + (y > 15 ? y : -y) + 32) % 8 < 4 ? 36 : -23;
        if (m === LEATHER) value += speck * 2 + (y === 5 || y === 26 ? (x % 4 < 2 ? 33 : -22) : 0);
        if (m === SKIN) value = 185 + speck * .3 + 9 * Math.sin(y * Math.PI / 32);
        if (m === HAIR) value += folds * 1.5 + (x % 4 === 0 ? -25 : 8);
        out[(m * 32 + y) * 32 + x] = Math.min(255, Math.max(0, value));
      }
    }
  }
  return out;
}

function program(gl: WebGL2RenderingContext): WebGLProgram {
  const result = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Character shader');
    gl.attachShader(result, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(result);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result) ?? 'Character shader link');
  return result;
}

interface MeshBatch {
  vao: WebGLVertexArrayObject;
  instances: WebGLBuffer;
  count: number;
  used: number;
  data: Float32Array<ArrayBuffer>;
}

export class PersonMeshAtlas {
  static create(): PersonMeshAtlas | undefined {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: true });
    return gl ? new PersonMeshAtlas(canvas, gl) : undefined;
  }

  private readonly batches: MeshBatch[];
  private readonly grid: WebGLUniformLocation | null;
  private readonly shader: WebGLProgram;
  private readonly cols: number;
  private readonly maxSurface: number;
  private tileSize = TILE;
  private readonly colors = new Map<string, Vec>();
  private count = 0;
  private tile = 0;
  private contextLost = false;

  private constructor(private readonly canvas: HTMLCanvasElement, private readonly gl: WebGL2RenderingContext) {
    this.canvas.addEventListener('webglcontextlost', () => { this.contextLost = true; });
    const [maxWidth, maxHeight] = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    this.maxSurface = Math.min(maxWidth, maxHeight, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    const maxCells = Math.floor(this.maxSurface / CLOSE_TILE);
    this.cols = Math.min(12, maxCells);
    this.shader = program(gl);
    this.grid = gl.getUniformLocation(this.shader, 'grid');
    this.batches = profiles.map((profile, i) => {
      const data = geometry(profile, i === FACE || i === TUNIC || i === HAIR_CAP ? 12 : 8);
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
      for (const [location, size, offset] of [[0, 3, 0], [1, 3, 3], [2, 2, 6]]) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 32, offset * 4);
      }
      const instances = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      for (const [location, size, offset] of [[3, 3, 0], [4, 3, 3], [5, 3, 6], [6, 3, 9], [7, 4, 12], [8, 1, 16]]) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, STRIDE * 4, offset * 4);
        gl.vertexAttribDivisor(location, 1);
      }
      return { vao, instances, count: data.indices.length, used: 0, data: new Float32Array(STRIDE * 128) };
    });
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 32, 32 * MATERIAL_COUNT, 0, gl.RED, gl.UNSIGNED_BYTE, materialPixels());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  begin(close: boolean): void {
    const size = close ? CLOSE_TILE : TILE;
    if (size !== this.tileSize) {
      this.tileSize = size;
      this.canvas.height = size;
    }
    this.count = 0;
    for (const batch of this.batches) batch.used = 0;
  }

  finish(): void {
    if (!this.count || this.contextLost) return;
    const { canvas, gl } = this;
    // Grow on demand. Avoid reallocating the backing surface when a villager walks offscreen.
    const rows = Math.ceil(this.count / this.cols);
    const size = this.tileSize;
    if (canvas.width !== this.cols * size) canvas.width = this.cols * size;
    if (canvas.height < rows * size) canvas.height = rows * size;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.shader);
    gl.uniform2f(this.grid, this.cols, canvas.height / size);
    for (const batch of this.batches) {
      if (!batch.used) continue;
      gl.bindVertexArray(batch.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.instances);
      gl.bufferData(gl.ARRAY_BUFFER, batch.data.subarray(0, batch.used), gl.DYNAMIC_DRAW);
      gl.drawElementsInstanced(gl.TRIANGLES, batch.count, gl.UNSIGNED_SHORT, 0, batch.used / STRIDE);
    }
  }

  draw(ctx: CanvasRenderingContext2D, tile: number, base: Vec): void {
    const size = this.tileSize;
    ctx.drawImage(this.canvas, tile % this.cols * size, Math.floor(tile / this.cols) * size,
      size, size, base[0] - EXTENT / 2, base[1] - HEADROOM, EXTENT, EXTENT);
  }

  private piece(shape: number, center: Vec, size: Vec, material: Material, up: Vec, forward: Vec): void {
    const right = unit(cross(up, forward));
    const front = cross(right, up);
    let rgb = this.colors.get(material[0]);
    if (!rgb) {
      const color = Number.parseInt(material[0].slice(1), 16);
      rgb = [(color >> 16) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
      this.colors.set(material[0], rgb);
    }
    const batch = this.batches[shape];
    if (batch.used === batch.data.length) {
      const larger = new Float32Array(batch.used * 2);
      larger.set(batch.data);
      batch.data = larger;
    }
    let i = batch.used;
    const data = batch.data;
    for (const value of center) data[i++] = value;
    for (const [axis, scale] of [[right, size[0]], [up, size[1]], [front, size[2]]] as const) {
      data[i++] = axis[0] * scale;
      data[i++] = axis[1] * scale;
      data[i++] = axis[2] * scale;
    }
    for (const value of rgb) data[i++] = value;
    data[i++] = material[1];
    data[i++] = this.tile;
    batch.used = i;
  }

  add(model: PersonModel): number | undefined {
    if (this.contextLost || this.count >= this.cols * Math.min(24, Math.floor(this.maxSurface / this.tileSize))) return;
    this.tile = this.count++;
    this.model(model);
    return this.tile;
  }

  private model(m: PersonModel): void {
    const { scale: s, build, base } = m;
    // Invert the rig's isometric projection to recover depth and vertical position.
    const point = (p: Vec): Vec => {
      const z = (p[2] - base[2]) * 32;
      return [p[0] - base[0], z * .5 - (p[1] - base[1]), z];
    };
    const heading = m.heading + Math.PI / 4;
    const forward: Vec = [Math.cos(heading), 0, Math.sin(heading)];
    const right = cross(Z_UP, forward);
    const shirt: Material = [m.shirt, CLOTH];
    const pants: Material = [m.pants, m.little ? SKIN : CLOTH];
    const accent: Material = [m.accent, TRIM];
    const skin: Material = [m.skin, SKIN];
    const hair: Material = [m.hair, HAIR];
    const leather: Material = ['#513b2d', LEATHER];
    const metal: Material = ['#e4ba71', LEATHER];
    const dark: Material = ['#302725', SKIN];
    const hip = point(m.hip);
    const shoulder = point(m.shoulder);
    const headJoint = point(m.head);
    const neckAxis = unit(add(headJoint, shoulder, -1));
    // Keep the face and neck closer to the shoulders without moving the animated limbs.
    const head = add(headJoint, neckAxis, m.lying ? 0 : -1.02 * s);
    const torsoWidth = 4.65 * build;
    const torsoDepth = 2.78 + m.belly * .56;
    const piece = (shape: number, at: Vec, w: number, h: number, d: number, paint: Material, up = Z_UP, facing = forward) =>
      this.piece(shape, at, [w * s, h * s, d * s], paint, up, facing);
    const segment = (a: Vec, b: Vec, w: number, d: number, paint: Material, shape = OVAL) => {
      const delta = add(a, b, -1);
      const length = Math.hypot(...delta);
      if (length < .01) return;
      const up = unit(delta);
      const along = Math.abs(up[0] * forward[0] + up[2] * forward[2]);
      this.piece(shape, mix(a, b, .5), [w * s, length * .58 + .34 * s, d * s], paint, up, along > .96 ? right : forward);
    };
    for (const [h0, k0, f0] of m.legs) {
      const h = point(h0), k = point(k0), f = point(f0);
      segment(h, k, 1.94 * build, 1.88, pants);
      segment(k, f, 1.56, 1.52, pants, SHIN);
      const toe = add(add(f, forward, .72 * s), Z_UP, .79 * s);
      piece(BOOT, toe, 1.42, .88, 1.87, m.little ? skin : leather);
      if (!m.little && !m.lying) {
        piece(BAND, add(f, Z_UP, 1.66 * s), 1.43, .58, 1.48, leather);
      }
    }
    const hem = add(hip, add(hip, shoulder, -1), m.little ? .28 : m.child ? .18 : .1);
    segment(shoulder, hem, torsoWidth, torsoDepth, shirt, TUNIC);
    if (!m.lying) {
      const waist = mix(hip, shoulder, .16);
      if (!m.little) {
        const beltDepth = torsoDepth * .89;
        piece(BAND, waist, torsoWidth * .93, .51, beltDepth, leather);
        piece(BAND, add(waist, forward, beltDepth * s), .75, .51, .28, metal);
      }
      // Accent cloth reads across the map, while the weave and clasp appear closer in.
      const chest = mix(hip, shoulder, .73);
      const edge = add(add(chest, forward, torsoDepth * .94 * s), right, 1.73 * s);
      if (m.cut % 3 === 0) {
        const end = add(add(waist, forward, torsoDepth * .99 * s), right, -1.52 * s);
        segment(edge, end, .72, .35, accent, BAND);
        const backEdge = add(add(chest, forward, -torsoDepth * .94 * s), right, 1.73 * s);
        const backEnd = add(add(waist, forward, -torsoDepth * .99 * s), right, -1.52 * s);
        segment(backEdge, backEnd, .72, .35, accent, BAND);
      } else {
        piece(BAND, chest, torsoWidth * .97, .68, torsoDepth * 1.04, accent);
        if (m.cut % 3 === 2) {
          const apron = add(mix(hip, hem, .45), forward, torsoDepth * .86 * s);
          piece(TUNIC, apron, 2.5, 1.83, .40, accent);
        }
      }
      const collar = mix(shoulder, head, .13);
      piece(BAND, collar, 2.14, .38, 1.88, accent, neckAxis);
    }
    for (const [a0, b0, c0] of m.arms) {
      const a = point(a0), b = point(b0), c = point(c0);
      const cuff = mix(a, b, .84);
      segment(a, cuff, 1.84 * build, 1.75, shirt, SLEEVE);
      segment(mix(a, b, .67), mix(a, b, .89), 1.45, 1.42, accent, BAND);
      segment(b, c, 1.31, 1.24, skin, FOREARM);
      const handUp = unit(add(b, c, -1));
      const handForward = Math.abs(handUp[0] * forward[0] + handUp[2] * forward[2]) > .96 ? right : forward;
      piece(OVAL, c, 1.11, 1.19, .87, skin, handUp, handForward);
    }
    segment(mix(shoulder, head, .6), shoulder, 1.58, 1.46, skin);
    const h = m.headScale;
    const hw = (3.46 + .12 * (m.cut % 3)) * h, hh = 3.48 * h, hd = 3.06 * h;
    const headUp = m.lying ? forward : Z_UP;
    const headFront = m.lying ? Z_UP : forward;
    const headRight = cross(headUp, headFront);
    const at = (x: number, y: number, z: number) =>
      add(add(add(head, headRight, x * s), headUp, y * s), headFront, z * s);
    const feature = (shape: number, x: number, y: number, z: number, w: number, height: number, d: number, paint: Material) =>
      piece(shape, at(x, y, z), w, height, d, paint, headUp, headFront);
    feature(FACE, 0, 0, 0, hw, hh, hd, skin);
    for (const side of [-1, 1]) {
      feature(OVAL, side * hw * .91, -.38 * h, .12 * h, .53 * h, .77 * h, .57 * h, skin);
      const eye = side * hw * .42;
      const z = hd * .91;
      feature(OVAL, eye, .22 * h, z, .47 * h, (.12 + .30 * m.eyes) * h, .24 * h, dark);
      feature(OVAL, eye, .88 * h, z, .56 * h, .16 * h, .23 * h, hair);
    }
    feature(OVAL, 0, -.44 * h, hd * .98, .51 * h, .61 * h, .6 * h, skin);
    feature(OVAL, 0, -1.43 * h, hd * .83, .68 * h, (.14 + .2 * Math.max(0, m.mouth)) * h, .19 * h, ['#764c40', SKIN]);
    // Cap is pulled back from the forehead. The side locks, tuft and bun change the outline.
    feature(HAIR_CAP, 0, .90 * h, -.39 * h, hw * 1.055, hh * .87, hd * 1.075, hair);
    if (m.hairStyle % 4 === 1) {
      feature(OVAL, -.69 * h, 3.24 * h, .72 * h, 1.82 * h, .95 * h, 1.46 * h, hair);
    } else if (m.hairStyle % 4 === 2) {
      for (const side of [-1, 1]) feature(OVAL, side * hw * .86, -.9 * h, -1.12 * h, .73 * h, 2.43 * h, 1.2 * h, hair);
    } else if (m.hairStyle % 4 === 3) {
      feature(OVAL, .23 * h, 2.79 * h, -2.72 * h, 1.58 * h, 1.42 * h, 1.44 * h, hair);
    }
    if (m.hat) {
      feature(BAND, 0, 2.32 * h, 0, hw * 1.31, .29 * h, hd * 1.36, m.hat === 1 ? leather : accent);
      feature(HAIR_CAP, 0, 2.84 * h, -.21 * h, hw * 1.03, 1.44 * h, hd * 1.04, m.hat === 1 ? leather : shirt);
    }
  }
}
