// Optional save / load of the whole world into localStorage (compressed JSON).
// The world is plain data (typed arrays, Maps, Sets and the RNG state are the only special cases).
import { hashString, RNG } from '../sim/rng';
import { gridInsert, makeGrid, rebuildMobileGrid } from '../sim/registry';
import type { Settings, World } from '../sim/types';
import type { Game } from './game';

const KEY = 'living-world:save:v1';
const META = 'living-world:save-meta:v1';
// 2: a year of age is now twelve days long (saves from before measured it in single days)
// 3: workshops, tools, carts, shared meals, worries and grievances are part of the world (older saves lack them and are refused)
// 4: people hold accounts of how others have behaved (hearsay) and relationships carry a hearsay total (older saves lack them and are refused)
// 5: people carry grief for those who have died, and the dead are recorded with their household and grave (older saves lack them and are refused)
// 6: people can be ill (a spell of illness with a course and an outcome); older saves lack it and are refused
// 7: people record the skills they learned from others (older saves lack it and are refused)
// 8: the village's proposals for communal buildings are part of the world (older saves lack them and are refused)
// 9: people hold keepsakes they were given and occasions worth celebrating (older saves lack them and are refused)
const VERSION = 9;

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) return { __ta: 'u8', d: bytesToB64(value) };
  if (value instanceof Int32Array) return { __ta: 'i32', d: bytesToB64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  if (value instanceof Float32Array) return { __ta: 'f32', d: bytesToB64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  if (value instanceof Map) return { __map: Array.from(value.entries()) };
  if (value instanceof Set) return { __set: Array.from(value.values()) };
  if (value instanceof RNG) return { __rng: value.getState() };
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object') {
    const v = value as Record<string, any>;
    if (v.__ta) {
      const bytes = b64ToBytes(v.d);
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      if (v.__ta === 'u8') return new Uint8Array(buf);
      if (v.__ta === 'i32') return new Int32Array(buf);
      if (v.__ta === 'f32') return new Float32Array(buf);
    }
    if (v.__map) return new Map(v.__map);
    if (v.__set) return new Set(v.__set);
    if (v.__rng) {
      const r = new RNG(0);
      r.setState(v.__rng);
      return r;
    }
  }
  return value;
}

export function serializeWorld(world: World): string {
  // byId and the spatial grids are derived indexes: rebuilt on load
  const { byId: _b, grid: _g, pgrid: _p, hooks: _h, ...rest } = world as World & Record<string, unknown>;
  void _b;
  void _g;
  void _p;
  void _h;
  return JSON.stringify({ version: VERSION, world: rest }, replacer);
}

export function deserializeWorld(json: string): World {
  const parsed = JSON.parse(json, reviver) as { version: number; world: Omit<World, 'byId' | 'grid' | 'pgrid'> };
  if (parsed.version !== VERSION) throw new Error('unsupported save version');
  const w = parsed.world as World;
  w.byId = new Map();
  w.grid = makeGrid(w.W, w.H);
  w.pgrid = makeGrid(w.W, w.H);
  for (const p of w.persons) w.byId.set(p.id, p);
  for (const a of w.animals) w.byId.set(a.id, a);
  for (const s of w.sources) {
    w.byId.set(s.id, s);
    gridInsert(w.grid, s, s.x + 0.5, s.y + 0.5);
  }
  for (const b of w.buildings) {
    w.byId.set(b.id, b);
    gridInsert(w.grid, b, b.x + b.w / 2, b.y + b.h / 2);
  }
  for (const s of w.sites) {
    w.byId.set(s.id, s);
    gridInsert(w.grid, s, s.x + s.w / 2, s.y + s.h / 2);
  }
  for (const p of w.plots) {
    w.byId.set(p.id, p);
    gridInsert(w.grid, p, p.x + 0.5, p.y + 0.5);
  }
  for (const p of w.piles) {
    w.byId.set(p.id, p);
    gridInsert(w.grid, p, p.x + 0.5, p.y + 0.5);
  }
  for (const g of w.graves) {
    w.byId.set(g.id, g);
    gridInsert(w.grid, g, g.x + 0.5, g.y + 0.5);
  }
  for (const c of w.carts) w.byId.set(c.id, c);
  rebuildMobileGrid(w);
  return w;
}

async function gzip(text: string): Promise<string> {
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  void writer.write(new TextEncoder().encode(text));
  void writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return bytesToB64(new Uint8Array(buf));
}

async function gunzip(b64: string): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  const bytes = b64ToBytes(b64);
  void writer.write(bytes as unknown as BufferSource);
  void writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export interface SaveInfo {
  seed: string;
  day: number;
  tick: number;
  population: number;
  savedAt: number;
  scene: string;
}

export function savedGameInfo(): SaveInfo | null {
  try {
    const raw = localStorage.getItem(META);
    return raw ? (JSON.parse(raw) as SaveInfo) : null;
  } catch {
    return null;
  }
}

export function hasSavedGame(): boolean {
  return savedGameInfo() !== null;
}

/** Save the current world. Resolves false if storage is unavailable or too small. */
export async function saveGame(game: Game): Promise<boolean> {
  try {
    const text = serializeWorld(game.world);
    const packed = await gzip(text);
    localStorage.setItem(KEY, JSON.stringify({ settings: game.settings, data: packed }));
    const info: SaveInfo = {
      seed: game.settings.seed,
      day: Math.floor(game.world.tick / 2400) + 1,
      tick: game.world.tick,
      population: game.world.persons.length,
      savedAt: Date.now(),
      scene: game.settings.scene,
    };
    localStorage.setItem(META, JSON.stringify(info));
    return true;
  } catch {
    return false;
  }
}

/** Replace the running world with the saved one. Resolves false if there is none or it cannot be read. */
export async function loadGame(game: Game): Promise<boolean> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const { settings, data } = JSON.parse(raw) as { settings: Settings; data: string };
    const world = deserializeWorld(await gunzip(data));
    game.restoreWorld(world, settings);
    return true;
  } catch {
    return false;
  }
}

void hashString;
