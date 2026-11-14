import {validateFinalAccounts} from '../sim/final_account';
import {validateSharedProjects} from '../sim/shared_projects';
import {validateCoaching} from '../sim/skill_coaching';
import {validatePlaces} from '../sim/personal_places';
import {validateRods} from '../sim/fishing_rods';
import {validateBrewing} from '../sim/brewing';
import {validateRecoveredWorkshops} from '../sim/recovered_workshops';
import {validateForestry} from '../sim/forestry';
import {validateCellars} from '../sim/cellars';
import {validateWells} from '../sim/wells';
import {validateWolfFight} from '../sim/wolf_fight';
import {validateWolfSkin} from '../sim/wolf_skin';
import {validateNourishment} from '../sim/nourishment';
import {validateLivestock} from '../sim/livestock';
import {validateGear} from '../sim/passive_gear';
import {validateChildhood} from '../sim/childhood';
import {validateShown} from '../sim/three_ages';
import {validatePreservation} from '../sim/preservation';
import {validateCarcasses} from '../sim/carcass';
import {validateClothing} from '../sim/clothing';
import {validateHearth} from '../sim/hearth';
import {validateCompany} from '../sim/companionship';
import {validateNightExperience} from '../sim/night_experience';
import { validateEcology } from '../sim/ecology';
import { validateDecisionLedger, normaliseDecisionLedger } from '../sim/decision_ledger';
import { validateLocationQuestions } from '../sim/location_question';
import { validateRememberedSigns } from '../sim/remembered_need';
import { validateCheckedAccounts } from '../sim/checked_accounts';
import { validateFlood } from '../sim/flood';
import { validateOffcuts } from '../sim/offcuts';
import { validateMealLeftovers } from '../sim/meal_leftovers';
import {validateEstateCustody} from '../sim/estate';
import {validateWorkHandovers} from '../sim/work_handover';
import {validateCareSupply} from '../sim/care_supply';
import {validateCareHandback} from '../sim/care_handback';
import { validateMeetingKnowledge } from '../sim/meeting_knowledge';
import { validateWater } from '../sim/hydrology';
import {validatePromiseDelays} from '../sim/promise_delays';
import {validateRequestCancellation} from '../sim/request_cancellation';
import {validatePromiseTargets} from '../sim/promise_targets';
import {validatePromiseExpectations} from '../sim/promise_expectations';
import {validatePromiseOutcomes} from '../sim/promise_outcomes';
import {validateEmptyNews} from '../sim/empty_news';
import {validatePromiseKnowledge} from '../sim/promise_knowledge';
import {validateProjectGraphs} from '../sim/project_graph';
import {validateRoutines} from '../sim/daily_routines';
import {validateWorkScopes} from '../sim/action_scope';
import {validateJourneys} from '../sim/journey_state';
import {validateSourceExperience} from '../sim/source_learning';
import {validateRouteExperience} from '../sim/route_learning';
import {validateHelperLearning} from '../sim/helper_learning';
import { validateGoalHistory } from '../sim/life';
import { validateHouseholdPractices } from '../sim/household_practices';
import { validateAlignments } from '../sim/political_alignment';
import { validateExchangeJourneys } from '../sim/exchange_journeys';
import { validateCustomers } from '../sim/customers';
import { validateTechniques } from '../sim/techniques';
import { validateSuccession } from '../sim/succession';
import { validateWinterPractice } from '../sim/winter_practice';
import { validateTransport } from '../sim/transport';
import { validateEconomicObservations } from '../sim/settlement_economy';
import { validateRelocations } from '../sim/relocation';
import { validateTownships } from '../sim/townships';
// Optional save / load of the whole world (compressed JSON): into IndexedDB where the browser has it, which has no 5 MB cap, and
// into localStorage where it does not (or where writing to it fails). A small description of the save, which the menu reads at once,
// always lives in localStorage.
// The world is plain data (typed arrays, Maps, Sets and the RNG state are the only special cases).
import { hashString, RNG } from '../sim/rng';
import { validateRulesVersion, runsRulesVersion, RULES_LINEAGE, validateSaveLineage, saveRulesGeneration } from '../sim/rulesversion';
import { hasHabitation, indoorHome, doorPoint } from '../sim/habitation';
import { gridInsert, makeGrid, rebuildMobileGrid } from '../sim/registry';
import { setExternalController } from '../sim/external';
import { stepWorld } from '../sim/world';
import type { Settings, World } from '../sim/types';
import type { Game } from './game';

const KEY = 'living-world:save:v1'; // localStorage: {settings, data: base64 gzip}; what every save was before IndexedDB, and the fallback
const META = 'living-world:save-meta:v1';
const DB_NAME = 'living-world';
const DB_STORE = 'saves';
const DB_KEY = 'current';
// a save alternates between two records, so the one it replaces is still whole until the description points at the new one
const DB_ALT_KEY = 'alternate';
// the autosave is a second record beside the save, in IndexedDB only, so it never replaces a world saved by hand or takes its room
const AUTO_META = 'living-world:autosave-meta:v1';
const DB_AUTO_KEY = 'autosave';
// 2: a year of age is now twelve days long (saves from before measured it in single days)
// 3: workshops, tools, carts, shared meals, worries and grievances are part of the world (older saves lack them and are refused)
// 4: each person's explored mask is stored as run lengths, not one base64 byte per tile, and the people are stored field by field
//    (all the beliefs together, all the relations together, …) because gzip only sees 32 KB back and similar data compresses far better
//    side by side (version 3 saves are still read)
// 5: heterogeneous person columns retain per-person field presence and key order.
const VERSION = 5;
const READABLE = [3, 4, 5];

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
  /** Format 5 only: distinct field-index orders, and the order belonging to each person. */
  orders?: number[][];
  order?: number[];
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

/** Format 5 keeps columns even when optional fields or insertion order differ between people. */
function packRaggedPersons(persons: World['persons']): PersonColumns | World['persons'] {
  const uniform = packPersons(persons);
  if (!Array.isArray(uniform) || persons.length === 0) return uniform;
  const fields: string[] = [], fieldIndex = new Map<string, number>();
  const orders: number[][] = [], order: number[] = [], orderIndex = new Map<string, number>();
  for (const person of persons) {
    const p = person as unknown as Record<string, unknown>;
    // Match JSON object omission; null remains a real field value.
    const keys = Object.keys(p).filter(k => p[k] !== undefined && typeof p[k] !== 'function' && typeof p[k] !== 'symbol');
    const indices = keys.map(k => {
      let index = fieldIndex.get(k);
      if (index === undefined) { index = fields.length; fields.push(k); fieldIndex.set(k, index); }
      return index;
    });
    const key = JSON.stringify(indices);
    let index = orderIndex.get(key);
    if (index === undefined) { index = orders.length; orders.push(indices); orderIndex.set(key, index); }
    order.push(index);
  }
  const d: Record<string, unknown[]> = {}, shapes: string[][] = [], shapeOf = new Map<string, number>();
  for (const f of fields) {
    d[f] = persons.map(person => {
      const p = person as unknown as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(p, f) || p[f] === undefined || typeof p[f] === 'function' || typeof p[f] === 'symbol') return null;
      const v = p[f];
      if (f === 'explored' && v instanceof Uint8Array) return replacer('explored', v);
      if (f === 'beliefs') return packBeliefs(v as Record<string, Record<string, unknown>>, shapes, shapeOf);
      return v;
    });
  }
  return { __cols: fields, n: persons.length, d, shapes, orders, order };
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
  const ragged = c.orders !== undefined || c.order !== undefined;
  if (ragged) {
    const bad = () => { throw new Error('invalid person columns'); };
    if (!Number.isSafeInteger(c.n) || c.n < 0 || !Array.isArray(c.orders) || !Array.isArray(c.order) || c.order.length !== c.n) bad();
    if (c.__cols.some(f => typeof f !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(f)) || new Set(c.__cols).size !== c.__cols.length) bad();
    if (c.__cols.some(f => !Object.prototype.hasOwnProperty.call(c.d, f) || !Array.isArray(c.d[f]) || c.d[f].length !== c.n)) bad();
    if (c.orders!.some(row => !Array.isArray(row) || new Set(row).size !== row.length || row.some(i => !Number.isInteger(i) || i < 0 || i >= c.__cols.length))) bad();
    if (c.order!.some(i => !Number.isInteger(i) || i < 0 || i >= c.orders!.length)) bad();
  }
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < c.n; i++) {
    const p: Record<string, unknown> = {};
    const fields = ragged ? c.orders![c.order![i]].map(index => c.__cols[index]) : c.__cols;
    for (const f of fields) {
      const v = c.d[f][i];
      p[f] = f === 'beliefs' && v && typeof v === 'object' && Array.isArray((v as { __bel?: unknown }).__bel) ? unpackBeliefs((v as { __bel: unknown[][] }).__bel, c.shapes ?? []) : v;
    }
    out.push(p);
  }
  return out;
}

/** Default 4 is the stable deterministic reference encoding; product saves explicitly use latest format 5. */
export function serializeWorld(world: World, format: 4 | 5 = 4): string {
  if (format !== 4 && format !== 5) throw new Error('unsupported save format');
  const body: Record<string, unknown> = {};
  for (const k of Object.keys(world)) {
    if (NOT_SAVED.has(k)) continue;
    const v = (world as unknown as Record<string, unknown>)[k];
    body[k] = k === 'persons' ? (format === 5 ? packRaggedPersons(world.persons) : packPersons(world.persons)) : v;
  }
  return JSON.stringify({ version: format, rulesLineage: RULES_LINEAGE, rulesGeneration: saveRulesGeneration(world.settings.rulesVersion), world: body }, replacer);
}

export function deserializeWorld(json: string): World {
  const parsed = JSON.parse(json, reviver) as { version: number; rulesLineage?: string; rulesGeneration?: string; world: Omit<World, 'byId' | 'grid' | 'pgrid'> };
  if (!READABLE.includes(parsed.version)) throw new Error('unsupported save version');
  // The RULES version is a separate question from the save format above: these bytes may be perfectly readable and still
  // describe a world whose behaviour this build cannot run. Refuse it here, where nothing has been replaced yet, so that a
  // refused load leaves the running world exactly as it was. An absent version is the legacy case and is kept absent.
  const verdict = validateRulesVersion((parsed.world as World).settings?.rulesVersion);
  if (!verdict.ok) throw new Error(`cannot load this world: ${verdict.reason}`);
  validateSaveLineage(parsed.world.settings?.rulesVersion, parsed.rulesLineage, parsed.rulesGeneration);
  const w = parsed.world as World;
  validateTownships(w);
  validateEconomicObservations(w);
  validateRelocations(w);
  validateExchangeJourneys(w);
  validateCustomers(w);
  validateTechniques(w);
  validateSuccession(w);
  validateWinterPractice(w);
  validateTransport(w);
  validateAlignments(w);
  validateHouseholdPractices(w);
  validateGoalHistory(w);
  validateCompany(w);
  validateChildhood(w);
  validateShown(w);
  validateNightExperience(w);
  validateProjectGraphs(w);
  validateRoutines(w);
  validateWorkScopes(w);
  validateJourneys(w);
  validateSourceExperience(w);
  validateRouteExperience(w);
  validateHelperLearning(w);
  validatePromiseKnowledge(w);
  validateDecisionLedger(w);
  validateLocationQuestions(w);
  validateRememberedSigns(w);
  validateCheckedAccounts(w);
  validatePromiseOutcomes(w);
  validatePromiseExpectations(w);
  validatePromiseTargets(w);
  validateRequestCancellation(w);
  validatePromiseDelays(w);
  validateEcology(w);
  validateWater(w);
  validateWells(w);
  validateWolfFight(w);
  validateWolfSkin(w);
  validateCellars(w);
  validateForestry(w);
  validateRecoveredWorkshops(w);
  validateBrewing(w);
  validateRods(w);
  validatePlaces(w);
  validateCoaching(w);
  validateSharedProjects(w);
  validateFinalAccounts(w);
  validateFlood(w);
  validateOffcuts(w);
  validatePreservation(w);
  validateHearth(w);
  validateClothing(w);
  validateCarcasses(w);
  validateGear(w);
  validateLivestock(w);
  validateNourishment(w);
  validateMealLeftovers(w);
  validateEstateCustody(w);
  validateWorkHandovers(w);
  validateCareSupply(w);
  validateCareHandback(w);
  validateMeetingKnowledge(w);
  validateEmptyNews(w);
  w.byId = new Map();
  w.grid = makeGrid(w.W, w.H);
  w.pgrid = makeGrid(w.W, w.H);
  for (const p of w.persons) {
    // a save made before private plans existed has no such field: an empty list is exactly what it meant
    if (!Array.isArray(p.intentions)) p.intentions = [];
    // likewise a save made before anyone kept an estimate of what pays
    if (!p.payoff || typeof p.payoff !== 'object') p.payoff = {};
    // and one from before anybody had a trade: nobody had one
    if (p.trade === undefined) p.trade = null;
    w.byId.set(p.id, p);
  }
  // rules 103: a world that carries the decision ledger gives every person the fields; older saves gain empty ones on load
  normaliseDecisionLedger(w);
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
    if (p.crop !== undefined && p.crop !== 'tomatoes' && p.crop !== 'corn') throw new Error('invalid save: a plot grows an unknown crop');
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
  // rules 160: a live world's static cells are in ascending id order (ids grow with registration), but the loops above fill them by
  // kind, so a loaded world listed the same things in a different order. Perception walks these cells, so the first sight of two
  // things in one cell created a person's belief-kind index keys in a different order than in the live world: values equal,
  // exact text not (the 30-day Large River twin mismatch, review_evidence/load-order-20261105). Worlds below 160 keep the old order.
  if (runsRulesVersion(w, 160)) for (const cell of w.grid.cells) cell.sort((a, b) => a.id - b.id);
  for (const c of w.carts) w.byId.set(c.id, c);
  // Whatever the rules: the id counter must be beyond every id in use, and no two things may share one (adversarial review
  // AR-02). A save that fails this is refused here, before anything of the running world has been replaced.
  if (w.byId.size !== w.persons.length + w.animals.length + w.sources.length + w.buildings.length + w.sites.length + w.plots.length + w.piles.length + w.graves.length + w.carts.length) throw new Error('invalid save: two things share an id');
  for (const id of w.byId.keys()) if (!Number.isSafeInteger(id) || id >= w.nextId) throw new Error('invalid save: the id counter is not beyond the ids in use');
  rebuildMobileGrid(w);
  for (const p of w.persons) {
    if (p.indoors === undefined) continue;
    const b = indoorHome(w, p);
    if (!hasHabitation(w) || !p.alive || !b || !Number.isInteger(p.indoors)) throw new Error('invalid saved indoor location');
    const d = doorPoint(b);
    if (Math.hypot(p.x - d.x, p.y - d.y) > 0.35) throw new Error('indoor location does not match home entrance');
  }
  return w;
}

async function gzipBytes(text: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  // a failure reaches the caller through the read below; the writer's own promises would only report it a second time, unhandled
  writer.write(new TextEncoder().encode(text)).catch(() => {});
  writer.close().catch(() => {});
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

async function gunzipBytes(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes as unknown as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  const buf = await new Response(ds.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export type SaveWhere = 'indexeddb' | 'localstorage';

export interface SaveInfo {
  seed: string;
  day: number;
  tick: number;
  population: number;
  savedAt: number;
  scene: string;
  /** where the world itself is kept; absent in saves made before IndexedDB was used (those are in localStorage) */
  where?: SaveWhere;
  /** size of the compressed world in bytes */
  bytes?: number;
  /** which IndexedDB record holds the world; absent means 'current', the only one there was before saves alternated between two */
  key?: string;
}

/** what a save is, as far as the code that writes and reads it is concerned */
export interface SaveTarget {
  world: World;
  settings: Settings;
  /** the world's own clock threw (Game.reportFault): it is not saved */
  worldFaulted?: boolean;
  restoreWorld(world: World, settings: Settings): void;
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

// ── IndexedDB: one record holding the settings and the gzip bytes ──
interface DbRecord {
  settings: Settings;
  gz: Uint8Array;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

/** resolves when the transaction has committed (not merely when the request succeeded): only then is the record safely stored */
async function dbPut(rec: DbRecord, key = DB_KEY): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
      tx.objectStore(DB_STORE).put(rec, key);
    });
  } finally {
    db.close();
  }
}

async function dbGet(key = DB_KEY): Promise<DbRecord | null> {
  const db = await openDb();
  try {
    return await new Promise<DbRecord | null>((resolve, reject) => {
      const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as DbRecord | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
    });
  } finally {
    db.close();
  }
}

/** compressed bytes known to read back: decompressed they are the same text, and this build loads that text */
async function verifiedBytes(text: string): Promise<Uint8Array> {
  const bytes = await gzipBytes(text);
  if ((await gunzipBytes(bytes)) !== text) throw new Error('the compressed world does not read back');
  deserializeWorld(text);
  return bytes;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Save the current world. Resolves false (never throws) if neither IndexedDB nor localStorage will take it; the previous save, if any, is then still there
 * and still described. Everything the save records is taken before the first await, so a world started (or changed) while the copy is compressed
 * is not mixed into it, and the bytes are checked to read back and load before anything is stored.
 * The world goes to IndexedDB when that works: into the one of its two records that the description does not point at, read back before it is
 * described, so the save it replaces stays whole until the description moves. If IndexedDB does not work, to localStorage, as every save used to.
 * The description is written last, so a save that did not complete is never described; once it is, the older localStorage copy is dropped.
 */
export async function saveGame(game: SaveTarget): Promise<boolean> {
  try {
    // a world whose own clock threw may be part-way through a tick: it is not put in place of a save that can run
    if (game.worldFaulted) return false;
    const settings = { ...game.settings };
    // never overwrite a good save with a world whose rules version this build would refuse to load back
    const verdict = validateRulesVersion(settings.rulesVersion);
    if (!verdict.ok) return false;
    const text = serializeWorld(game.world, VERSION);
    const tick = game.world.tick;
    const population = game.world.persons.length;
    const bytes = await verifiedBytes(text);
    const previous = savedGameInfo();
    const key = previous?.where === 'indexeddb' && (previous.key ?? DB_KEY) === DB_KEY ? DB_ALT_KEY : DB_KEY;
    let where: SaveWhere | null = null;
    try {
      await dbPut({ settings, gz: bytes }, key);
      const back = await dbGet(key);
      if (!back || !sameBytes(back.gz, bytes)) throw new Error('the stored world does not read back');
      where = 'indexeddb';
    } catch {
      where = null;
    }
    const info: SaveInfo = {
      seed: settings.seed,
      day: Math.floor(tick / 2400) + 1,
      tick,
      population,
      savedAt: Date.now(),
      scene: settings.scene,
      where: where ?? 'localstorage',
      bytes: bytes.length,
    };
    if (where === 'indexeddb') info.key = key;
    const describe = JSON.stringify(info);
    // from here to the description nothing waits, so localStorage is exactly as it was read: an old value put back always fits again
    const oldCopy = localStorage.getItem(KEY);
    const putBack = () => {
      if (oldCopy === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, oldCopy);
    };
    if (!where) localStorage.setItem(KEY, JSON.stringify({ settings, data: bytesToB64(bytes) }));
    try {
      localStorage.setItem(META, describe);
    } catch (e) {
      if (where !== 'indexeddb') {
        // the new world took the room its description needed: the old copy goes back, still described
        putBack();
        throw e;
      }
      // localStorage may be full precisely because an older save still sits in it. The new world is safely in IndexedDB, so that copy is
      // what to give up; if even then the description will not fit, the old copy goes back and is still the save.
      localStorage.removeItem(KEY);
      try {
        localStorage.setItem(META, describe);
      } catch (again) {
        putBack();
        throw again;
      }
    }
    if (where === 'indexeddb') {
      try {
        localStorage.removeItem(KEY);
      } catch {
        // storage is blocked: the description already points at the new copy
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** the settings and world text of whichever copy the description points at, then the other one */
async function readSaved(info: SaveInfo | null): Promise<{ settings: Settings; text: string } | null> {
  const fromDb = async () => {
    const rec = await dbGet(info?.key ?? DB_KEY);
    return rec ? { settings: rec.settings, text: await gunzipBytes(rec.gz) } : null;
  };
  const fromLocal = async () => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { settings, data } = JSON.parse(raw) as { settings: Settings; data: string };
    return { settings, text: await gunzipBytes(b64ToBytes(data)) };
  };
  // a save with no `where` was written before IndexedDB was used, and is in localStorage
  const order = info?.where === 'indexeddb' ? [fromDb, fromLocal] : [fromLocal, fromDb];
  for (const read of order) {
    try {
      const got = await read();
      if (got) return got;
    } catch {
      // try the other copy
    }
  }
  return null;
}

/**
 * A save can read back cleanly and still hold a world the rules cannot run (it then throws on its first tick, after the running world
 * is gone). One tick of a spare copy finds that out first. The spare copy is nobody's to drive, so an outside controller is set aside.
 */
function runsOneTick(text: string): boolean {
  const restore = setExternalController(null);
  try {
    stepWorld(deserializeWorld(text));
    return true;
  } catch {
    return false;
  } finally {
    restore();
  }
}

/** swap in a world read from a save, once it has been checked; false leaves the running world as it was */
function restoreChecked(game: SaveTarget, got: { settings: Settings; text: string }): boolean {
  const world = deserializeWorld(got.text);
  if (!runsOneTick(got.text)) return false;
  game.restoreWorld(world, got.settings);
  return true;
}

/** Replace the running world with the saved one. Resolves false if there is none, it cannot be read, or it cannot run a tick. */
export async function loadGame(game: SaveTarget): Promise<boolean> {
  try {
    const got = await readSaved(savedGameInfo());
    if (!got) return false;
    return restoreChecked(game, got);
  } catch {
    return false;
  }
}

/** the autosave's description, or null when there is none */
export function autosaveInfo(): SaveInfo | null {
  try {
    const raw = localStorage.getItem(AUTO_META);
    return raw ? (JSON.parse(raw) as SaveInfo) : null;
  } catch {
    return null;
  }
}

/**
 * Keep a copy of the running world in the autosave record. Everything it describes is taken before the first await, so a world
 * changed while the copy is compressed is not mixed into it. Resolves false (never throws) when IndexedDB will not take it; the
 * older autosave is then still there. There is no localStorage fallback: that small space is the hand-made save's.
 */
export async function autosaveGame(game: SaveTarget): Promise<boolean> {
  try {
    if (game.worldFaulted) return false;
    const settings = { ...game.settings };
    if (!validateRulesVersion(settings.rulesVersion).ok) return false;
    const text = serializeWorld(game.world, VERSION);
    const info: SaveInfo = {
      seed: settings.seed,
      day: Math.floor(game.world.tick / 2400) + 1,
      tick: game.world.tick,
      population: game.world.persons.length,
      savedAt: Date.now(),
      scene: settings.scene,
      where: 'indexeddb',
      bytes: 0,
    };
    const bytes = await verifiedBytes(text);
    info.bytes = bytes.length;
    try {
      await dbPut({ settings, gz: bytes }, DB_AUTO_KEY);
    } catch {
      return false; // a put that did not commit leaves the older autosave, and its description, as they were
    }
    try {
      localStorage.setItem(AUTO_META, JSON.stringify(info));
      return true;
    } catch {
      try {
        localStorage.removeItem(AUTO_META); // it would describe the copy just replaced
      } catch {
        // storage is blocked: there is no description to correct
      }
      return false;
    }
  } catch {
    return false;
  }
}

/** Replace the running world with the autosaved one, checked the same way as a save. */
export async function loadAutosave(game: SaveTarget): Promise<boolean> {
  try {
    const rec = await dbGet(DB_AUTO_KEY);
    if (!rec) return false;
    return restoreChecked(game, { settings: rec.settings, text: await gunzipBytes(rec.gz) });
  } catch {
    return false;
  }
}

void hashString;
