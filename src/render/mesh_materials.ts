import { hashUnit } from '../sim/rng';

const SIZE = 128;
const TAU = Math.PI * 2;
type Paint = (u: number, v: number, fleck: number) => number;

/** One sampler per renderer, with independently filtered, seamless material layers. */
function upload(gl: WebGL2RenderingContext, layers: readonly Paint[], verticalWrap: number): void {
  const pixels = new Uint8Array(SIZE * SIZE * layers.length);
  layers.forEach((paint, layer) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const value = paint((x + .5) / SIZE, (y + .5) / SIZE, hashUnit(x, y, layer) - .5);
      pixels[(layer * SIZE + y) * SIZE + x] = Math.round(Math.max(0, Math.min(1, value)) * 255);
    }
  });
  const target = gl.TEXTURE_2D_ARRAY;
  gl.bindTexture(target, gl.createTexture());
  gl.texImage3D(target, 0, gl.R8, SIZE, SIZE, layers.length, 0, gl.RED, gl.UNSIGNED_BYTE, pixels);
  gl.generateMipmap(target);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, verticalWrap);
}

const wave = (turns: number): number => Math.sin(turns * TAU);
const fraction = (value: number): number => value - Math.floor(value);
const ridge = (turns: number, sharpness: number): number => (.5 + .5 * wave(turns)) ** sharpness;

export const CLOTH = 0, TRIM = 1, LEATHER = 2, SKIN = 3, HAIR = 4;

export function uploadPersonMaterials(gl: WebGL2RenderingContext): void {
  upload(gl, [
    (u, v, f) => {
      const fold = u + .04 * wave(v * .8 + u);
      const warp = wave(u * 27);
      const weft = wave(v * 23);
      return .74 + .10 * wave(fold * 5) + .046 * wave(fold * 9 - v * .3)
        + .066 * warp * weft - .074 * ridge(u, 16) + .065 * f;
    },
    (u, v, f) => {
      const braid = wave(u * 12 + Math.abs(v - .5) * 2.8);
      const edge = Math.min(v, 1 - v);
      return (edge < .12 ? .53 : .75 + .17 * braid) + .06 * f;
    },
    (u, v, f) => {
      const stitches = Math.min(Math.abs(v - .17), Math.abs(v - .82));
      return .69 + .08 * wave(u * 4 + v) + .07 * wave(u * 11 - v * 2)
        + (stitches < .024 ? .23 * ridge(u * 17, 3) - .06 : 0) + .075 * f;
    },
    (u, v, f) => .747 + .045 * wave(v * .55) + .018 * wave(u * 2 + .2) * wave(v * .7) + .018 * f,
    (u, v, f) => {
      const lock = u + .016 * wave(v * .82 + u * 2);
      return .69 + .12 * wave(lock * 8) + .095 * ridge(lock * 23 + v * .3, 3)
        + .065 * wave(v * .7 + u * 2) + .036 * f;
    },
  ], gl.CLAMP_TO_EDGE);
}

export const GRAIN = 0, THATCH = 1, MASONRY = 2, LEAF = 3, TILE = 4, EARTH = 5, END_GRAIN = 6, ROCK = 7;

function coursed(u: number, v: number, columns: number, rows: number) {
  const y = v * rows;
  const row = Math.floor(y);
  const x = u * columns + (row % 2) * .5;
  const column = Math.floor(x) % columns;
  return { x: fraction(x), y: fraction(y), shade: hashUnit(column, row, rows) - .5 };
}

export function uploadSceneryMaterials(gl: WebGL2RenderingContext): void {
  upload(gl, [
    (u, v, f) => {
      const grain = u + .019 * wave(v * 2 + u * 3) + .012 * wave(v * 4 - u * 2);
      return .79 + .09 * wave(grain * 6) + .036 * wave(grain * 29)
        - .18 * ridge(grain * 11, 7) + .035 * wave(v * 2 - u * 5) + .055 * f;
    },
    (u, v, f) => {
      const course = fraction(v * 6 + .08 * wave(u * 7));
      const reed = u + .013 * wave(v * 2 + u * 5);
      return .78 + .08 * wave(reed * 31) + .049 * wave(reed * 19 + v * 5)
        + .07 * wave(reed * 8) + .07 * course - .20 * Math.max(0, 1 - course * 8) + .065 * f;
    },
    (u, v, f) => {
      const block = coursed(u, v, 4, 6);
      const edge = Math.min(block.x, 1 - block.x, block.y, 1 - block.y);
      const chipped = edge + .026 * wave(u * 11 + v * 9);
      return chipped < .065 ? .53 + .065 * f
        : .77 + .19 * block.shade + .08 * wave(u * 9 - v * 6) + .065 * f
          + (block.y > .82 ? .07 : 0);
    },
    (u, v, f) => {
      const vein = ridge(u * 4 + .18 * wave(v * 2), 12);
      const dapple = wave(u * 5 + v * 3) * wave(u * 3 - v * 4);
      return .77 + .12 * dapple + .07 * vein + .035 * wave(u * 13 - v * 9) + .045 * f;
    },
    (u, v, f) => {
      const tile = coursed(u, v, 5, 6);
      const seam = Math.min(tile.x, 1 - tile.x);
      return tile.y < .095 || seam < .055 ? .49 + .10 * tile.shade
        : .74 + .17 * tile.shade + .10 * wave(tile.x * .5) + .10 * tile.y + .055 * f;
    },
    (u, v, f) => .77 + .078 * wave(u * 3 + v * 4) * wave(u * 5 - v * 2)
      + .037 * wave(u * 17 + v * 11) + .075 * f,
    (u, v, f) => {
      const x = u - .47, y = v - .51;
      const radius = Math.hypot(x * 1.07, y);
      const rings = radius * 11 + .19 * wave(radius * 6 + x * 2) + .16 * y;
      // Caps sample a disc. Fade to a common edge outside it for mip filtering.
      const interior = Math.max(0, Math.min(1, (.53 - radius) * 22));
      return .81 + interior * (.085 * wave(rings) - .25 * ridge(rings, 4) + .055 * f);
    },
    (u, v, f) => {
      const veins = u * 4 + v * 3 + .21 * wave(u * 3 - v * 2);
      return .78 + .075 * wave(u * 3 - v * 4) * wave(u * 2 + v * 3)
        - .13 * ridge(veins, 14) + .045 * wave(u * 14 - v * 11) + .08 * f;
    },
  ], gl.REPEAT);
}
