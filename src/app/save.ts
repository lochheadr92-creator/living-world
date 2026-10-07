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
// 4: each person's explored mask is stored as run lengths, not one base64 byte per tile, and the people are stored field by field
//    (all the beliefs together, all the relations together, …) because gzip only sees 32 KB back and similar data compresses far better
//    side by side (version 3 saves are still read)
const VERSION = 4;
const READABLE = [3, 4];

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

/** 0/1 mask as alternating run lengths, starting with a run of zeros (possibly empty); null if it holds anything but 0 and 1 */
function maskRuns(mask: Uint8Array): number[] | null {
  const runs: number[] = [];
  let cur = 0;
  let len = 0;
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i];
    if (v > 1) return null;
    if (v === cur) len++;
    else {
      runs.push(len);
      cur = v;
      len = 1;
    }
  }
  runs.push(len);
  return runs;
}

export function replacer(key: string, value: unknown): unknown {
  if (value instanceof Uint8Array && key === 'explored') {
    // 65,536 bytes a person on a Huge map, nearly all of it long runs: as base64 it was 64% of the JSON and kept neighbouring people's records out of gzip's window
    const runs = maskRuns(value);
    if (runs) return { __ta: 'u8mask', n: value.length, r: runs };
  }
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
    if (v.__ta === 'u8mask') {
      const out = new Uint8Array(v.n);
      let at = 0;
      let on = 0;
      for (const run of v.r as number[]) {
        if (on) out.fill(1, at, at + run);
        at += run;
        on ^= 1;
      }
      return out;
    }
    if (Array.isArray(v.__cols) && v.d && typeof v.n === 'number') return unpackPersons(v as unknown as PersonColumns);
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

/** world properties that are derived indexes or hooks: not saved, rebuilt (or absent) on load */
const NOT_SAVED = new Set(['byId', 'grid', 'pgrid', 'hooks']);

interface PersonColumns {
  __cols: string[];
  n: number;
  d: Record<string, unknown[]>;
  /** the distinct key lists of the beliefs, each belief being stored as [index into this, the values in that order] */
  shapes?: string[][];
}

/**
 * The people as one array per field instead of one object per person. Only when every person has the same fields in the same
 * order, none of them undefined (JSON would turn those into null in an array): then the order of keys comes back exactly.
 * Anything else is stored the old way, person by person.
 */
function packPersons(persons: World['persons']): PersonColumns | World['persons'] {
  if (persons.length === 0) return persons;
  const fields = Object.keys(persons[0]);
  for (const p of persons) {
    const keys = Object.keys(p);
    if (keys.length !== fields.length) return persons;
    for (let i = 0; i < keys.length; i++) if (keys[i] !== fields[i] || (p as unknown as Record<string, unknown>)[keys[i]] === undefined) return persons;
  }
  const d: Record<string, unknown[]> = {};
  const shapes: string[][] = [];
  const shapeOf = new Map<string, number>();
  for (const f of fields) {
    d[f] = persons.map((p) => {
      const v = (p as unknown as Record<string, unknown>)[f];
      // an explored mask is already a compact object here: the replacer only sees it by array index, not by name
      if (f === 'explored' && v instanceof Uint8Array) return replacer('explored', v);
      if (f === 'beliefs') return packBeliefs(v as Record<string, Record<string, unknown>>, shapes, shapeOf);
      return v;
    });
  }
  return shapes.length > 0 ? { __cols: fields, n: persons.length, d, shapes } : { __cols: fields, n: persons.length, d };
}

/**
 * One person's beliefs as rows [shape, value, value, …]: the key names (the bulk of every record) are written once per shape.
 * Only when each belief's own id is its key and none of its values is undefined; otherwise the record is stored as it is.
 */
function packBeliefs(b: Record<string, Record<string, unknown>>, shapes: string[][], shapeOf: Map<string, number>): unknown {
  const rows: unknown[][] = [];
  for (const key of Object.keys(b)) {
    const v = b[key];
    if (!v || typeof v !== 'object' || String(v.id) !== key) return b;
    const names = Object.keys(v);
    const row: unknown[] = [0];
    for (const n of names) {
      if (v[n] === undefined) return b;
      row.push(v[n]);
    }
    const sk = names.join(',');
    let at = shapeOf.get(sk);
    if (at === undefined) {
      at = shapes.length;
      shapes.push(names);
      shapeOf.set(sk, at);
    }
    row[0] = at;
    rows.push(row);
  }
  return { __bel: rows };
}

function unpackBeliefs(rows: unknown[][], shapes: string[][]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    const names = shapes[row[0] as number];
    const v: Record<string, unknown> = {};
    for (let i = 0; i < names.length; i++) v[names[i]] = row[i + 1];
    out[String(v.id)] = v;
  }
  return out;
}

function unpackPersons(c: PersonColumns): unknown[] {
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < c.n; i++) {
    const p: Record<string, unknown> = {};
    for (const f of c.__cols) {
      const v = c.d[f][i];
      p[f] = f === 'beliefs' && v && typeof v === 'object' && Array.isArray((v as { __bel?: unknown }).__bel) ? unpackBeliefs((v as { __bel: unknown[][] }).__bel, c.shapes ?? []) : v;
    }
    out.push(p);
  }
  return out;
}

export function serializeWorld(world: World): string {
  const body: Record<string, unknown> = {};
  for (const k of Object.keys(world)) {
    if (NOT_SAVED.has(k)) continue;
    const v = (world as unknown as Record<string, unknown>)[k];
    body[k] = k === 'persons' ? packPersons(world.persons) : v;
  }
  return JSON.stringify({ version: VERSION, world: body }, replacer);
}

export function deserializeWorld(json: string): World {
  const parsed = JSON.parse(json, reviver) as { version: number; world: Omit<World, 'byId' | 'grid' | 'pgrid'> };
  if (!READABLE.includes(parsed.version)) throw new Error('unsupported save version');
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
