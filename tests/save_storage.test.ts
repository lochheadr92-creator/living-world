// Where a save is kept: IndexedDB when there is one, localStorage when there is not or it fails; and what happens to a save made before.
import 'fake-indexeddb/auto';
import {gunzipSync} from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { autosaveGame, autosaveInfo, loadAutosave, loadGame, saveGame, savedGameInfo, hasSavedGame, serializeWorld } from '../src/app/save';
import { nightAuditWorld } from '../scripts/fixtures/night_audit_world';
import type { SaveTarget } from '../src/app/save';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { Settings, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { deepHash, legacySaveText } from './helpers/golden';

/** localStorage with a limit in characters, as browsers have (about 5 million) */
class FakeStorage {
  private m = new Map<string, string>();
  constructor(public quota = Infinity) {}
  get length(): number {
    return this.m.size;
  }
  private used(except?: string): number {
    let n = 0;
    for (const [k, v] of this.m) if (k !== except) n += k.length + v.length;
    return n;
  }
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    if (this.used(k) + k.length + v.length > this.quota) throw new DOMException('quota', 'QuotaExceededError');
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  clear(): void {
    this.m.clear();
  }
  key(i: number): string | null {
    return [...this.m.keys()][i] ?? null;
  }
}

const g = globalThis as unknown as { localStorage?: unknown; indexedDB?: unknown };
const realIndexedDB = g.indexedDB;
let store: FakeStorage;

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function gzipB64(text: string): Promise<string> {
  const cs = new CompressionStream('gzip');
  const w = cs.writable.getWriter();
  void w.write(new TextEncoder().encode(text));
  void w.close();
  return bytesToB64(new Uint8Array(await new Response(cs.readable).arrayBuffer()));
}

function target(world: World, settings: Settings): SaveTarget & { restored: World | null } {
  const t = {
    world,
    settings,
    restored: null as World | null,
    restoreWorld(w: World) {
      t.restored = w;
    },
  };
  return t;
}

async function wipeDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const req = (realIndexedDB as IDBFactory).deleteDatabase('living-world');
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  store = new FakeStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true, writable: true });
  g.indexedDB = realIndexedDB;
  await wipeDb();
});

afterEach(() => {
  g.indexedDB = realIndexedDB;
});

const ordinary = (seed: string, ticks = 300) => {
  const settings = defaultSettings(seed);
  const world = createWorld(settings);
  for (let i = 0; i < ticks; i++) stepWorld(world);
  return { world, settings };
};

it.each([27, 29])('an ambiguous version-%i load preserves the stored original and running world', async (version) => {
  const w=nightAuditWorld(version); const raw=JSON.parse(serializeWorld(w)); delete raw.rulesGeneration;
  const original=JSON.stringify({settings:w.settings,data:await gzipB64(JSON.stringify(raw))});
  store.setItem('living-world:save:v1',original);
  const running=target(w,w.settings), before=serializeWorld(w);
  expect(await loadGame(running)).toBe(false);
  expect(running.restored).toBeNull();
  expect(serializeWorld(running.world)).toBe(before);
  expect(store.getItem('living-world:save:v1')).toBe(original);
});

describe('where a save is kept', () => {
  it('puts the world in IndexedDB and only a short description in localStorage', async () => {
    const { world, settings } = ordinary('store-idb');
    expect(await saveGame(target(world, settings))).toBe(true);
    const info = savedGameInfo()!;
    expect(info.where).toBe('indexeddb');
    expect(info.seed).toBe('store-idb');
    expect(info.bytes).toBeGreaterThan(1000);
    expect(hasSavedGame()).toBe(true);
    expect(store.getItem('living-world:save:v1')).toBeNull(); // the world itself is not in localStorage
    const t = target(createWorld(defaultSettings('other')), defaultSettings('other'));
    expect(await loadGame(t)).toBe(true);
    expect(hashWorld(t.restored!)).toBe(hashWorld(world));
    expect(deepHash(t.restored!)).toBe(deepHash(world));
  });

  it('saves and loads a Huge world that is larger than localStorage would take', async () => {
    store.quota = 200_000; // far less than the 1 MB or more a Huge world needs, even at its start
    const settings = settingsForProfile('huge', 'store-huge', { immigration: false });
    const world = createWorld(settings);
    for (let i = 0; i < 100; i++) stepWorld(world);
    expect(await saveGame(target(world, settings))).toBe(true);
    expect(savedGameInfo()!.where).toBe('indexeddb');
    expect(savedGameInfo()!.bytes).toBeGreaterThan(store.quota * 0.75); // the compressed world alone would not have fitted as base64
    const t = target(createWorld(defaultSettings('x')), defaultSettings('x'));
    expect(await loadGame(t)).toBe(true);
    expect(t.restored!.W).toBe(256);
    expect(hashWorld(t.restored!)).toBe(hashWorld(world));
    expect(deepHash(t.restored!)).toBe(deepHash(world));
  });

  it('hands the settings back with the world', async () => {
    const { world, settings } = ordinary('store-settings', 50);
    const mine = { ...settings, harsh: true };
    await saveGame(target(world, mine));
    let got: Settings | null = null;
    await loadGame({ world, settings, restoreWorld: (_w, s) => (got = s) });
    expect(got).toEqual(mine);
  });

  it('replaces the previous save in place', async () => {
    const a = ordinary('store-a', 100);
    const b = ordinary('store-b', 200);
    await saveGame(target(a.world, a.settings));
    await saveGame(target(b.world, b.settings));
    expect(savedGameInfo()!.seed).toBe('store-b');
    const t = target(a.world, a.settings);
    await loadGame(t);
    expect(hashWorld(t.restored!)).toBe(hashWorld(b.world));
  });
});

describe('a save made before IndexedDB was used', () => {
  async function legacySave(seed: string) {
    const { world, settings } = ordinary(seed, 400);
    // exactly what the previous version wrote: base64 gzip of the version-3 text, in localStorage, with a description that has no `where`
    store.setItem('living-world:save:v1', JSON.stringify({ settings, data: await gzipB64(legacySaveText(world)) }));
    store.setItem('living-world:save-meta:v1', JSON.stringify({ seed, day: 1, tick: world.tick, population: world.persons.length, savedAt: 1, scene: settings.scene }));
    return { world, settings };
  }

  it('still loads', async () => {
    const { world } = await legacySave('legacy-load');
    expect(hasSavedGame()).toBe(true);
    const t = target(createWorld(defaultSettings('y')), defaultSettings('y'));
    expect(await loadGame(t)).toBe(true);
    expect(hashWorld(t.restored!)).toBe(hashWorld(world));
    expect(deepHash(t.restored!)).toBe(deepHash(world));
  });

  it('is replaced by the next save, which frees its space in localStorage', async () => {
    const { settings } = await legacySave('legacy-replace');
    expect(store.getItem('living-world:save:v1')).not.toBeNull();
    const fresh = ordinary('legacy-replace', 600);
    expect(await saveGame(target(fresh.world, settings))).toBe(true);
    expect(store.getItem('living-world:save:v1')).toBeNull();
    expect(savedGameInfo()!.where).toBe('indexeddb');
    const t = target(fresh.world, settings);
    await loadGame(t);
    expect(hashWorld(t.restored!)).toBe(hashWorld(fresh.world));
  });

  it('is replaced by a save even when localStorage is too full to describe the new one until it is removed', async () => {
    const { settings } = await legacySave('legacy-full');
    // full to the brim: the old copy is all there is in it
    store.quota = [...Array(store.length).keys()].reduce((n, i) => n + store.key(i)!.length + store.getItem(store.key(i)!)!.length, 0);
    const fresh = ordinary('legacy-full', 650);
    const bigger = { ...settings, seed: 'a-much-longer-seed-name-than-before-so-the-description-grows-too' };
    expect(await saveGame(target(fresh.world, bigger))).toBe(true);
    expect(savedGameInfo()!.where).toBe('indexeddb');
    expect(store.getItem('living-world:save:v1')).toBeNull();
    const t = target(fresh.world, settings);
    expect(await loadGame(t)).toBe(true);
    expect(hashWorld(t.restored!)).toBe(hashWorld(fresh.world));
  });
});

describe('when IndexedDB does not work', () => {
  it('falls back to localStorage when there is no IndexedDB', async () => {
    g.indexedDB = undefined;
    const { world, settings } = ordinary('fallback-none', 200);
    expect(await saveGame(target(world, settings))).toBe(true);
    expect(savedGameInfo()!.where).toBe('localstorage');
    expect(store.getItem('living-world:save:v1')).not.toBeNull();
    const t = target(world, settings);
    expect(await loadGame(t)).toBe(true);
    expect(hashWorld(t.restored!)).toBe(hashWorld(world));
  });

  it('falls back to localStorage when the write into IndexedDB fails', async () => {
    const proto = (globalThis as unknown as { IDBObjectStore: { prototype: { put: unknown } } }).IDBObjectStore.prototype;
    const real = proto.put;
    proto.put = () => {
      throw new DOMException('no room', 'QuotaExceededError');
    };
    try {
      const { world, settings } = ordinary('fallback-put', 200);
      expect(await saveGame(target(world, settings))).toBe(true);
      expect(savedGameInfo()!.where).toBe('localstorage');
      const t = target(world, settings);
      expect(await loadGame(t)).toBe(true);
      expect(hashWorld(t.restored!)).toBe(hashWorld(world));
    } finally {
      proto.put = real;
    }
  });

  it('returns false, without throwing, when nothing will take the save, and leaves the previous save as it was', async () => {
    const before = ordinary('quota-before', 200);
    expect(await saveGame(target(before.world, before.settings))).toBe(true);
    const metaBefore = store.getItem('living-world:save-meta:v1');

    g.indexedDB = undefined;
    store.quota = 5_000; // far too small for any world
    const after = ordinary('quota-after', 300);
    await expect(saveGame(target(after.world, after.settings))).resolves.toBe(false);
    expect(store.getItem('living-world:save-meta:v1')).toBe(metaBefore);

    g.indexedDB = realIndexedDB; // and the old save, which is in IndexedDB, can still be loaded
    const t = target(before.world, before.settings);
    expect(await loadGame(t)).toBe(true);
    expect(hashWorld(t.restored!)).toBe(hashWorld(before.world));
  });

  it('returns false for a first save that nothing will take', async () => {
    g.indexedDB = undefined;
    store.quota = 100;
    const { world, settings } = ordinary('quota-first', 100);
    await expect(saveGame(target(world, settings))).resolves.toBe(false);
    expect(hasSavedGame()).toBe(false);
  });

  it('loads from localStorage when the description points at IndexedDB but the record is not there', async () => {
    const { world, settings } = ordinary('lost-record', 200);
    g.indexedDB = undefined;
    await saveGame(target(world, settings)); // into localStorage
    g.indexedDB = realIndexedDB;
    store.setItem('living-world:save-meta:v1', JSON.stringify({ ...savedGameInfo()!, where: 'indexeddb' }));
    const t = target(world, settings);
    expect(await loadGame(t)).toBe(true);
    expect(hashWorld(t.restored!)).toBe(hashWorld(world));
  });

  it('returns false when there is no save at all, or it cannot be read', async () => {
    const t = target(createWorld(defaultSettings('none')), defaultSettings('none'));
    expect(await loadGame(t)).toBe(false);
    store.setItem('living-world:save:v1', JSON.stringify({ settings: t.settings, data: 'not a gzip stream' }));
    store.setItem('living-world:save-meta:v1', JSON.stringify({ seed: 's', day: 1, tick: 0, population: 1, savedAt: 1, scene: 'natural' }));
    expect(await loadGame(t)).toBe(false);
    expect(t.restored).toBeNull();
  });
});


describe('a saved world is run for one tick before it replaces the running one', () => {
  it('refuses a save that reads back but cannot run, and keeps the running world', async () => {
    const { world, settings } = ordinary('cannot-run', 100);
    const raw = JSON.parse(serializeWorld(world));
    raw.world.weather = null; // deserialises without complaint, then throws on its first tick
    store.setItem('living-world:save:v1', JSON.stringify({ settings, data: await gzipB64(JSON.stringify(raw)) }));
    store.setItem('living-world:save-meta:v1', JSON.stringify({ seed: settings.seed, day: 1, tick: world.tick, population: world.persons.length, savedAt: 1, scene: 'natural' }));
    const running = ordinary('still-running', 50);
    const t = target(running.world, running.settings);
    const before = serializeWorld(running.world);
    expect(await loadGame(t)).toBe(false);
    expect(t.restored).toBeNull();
    expect(serializeWorld(t.world)).toBe(before);
  });

  it('the world swapped in has not been ticked by the check', async () => {
    const { world, settings } = ordinary('checked-exact', 150);
    expect(await saveGame(target(world, settings))).toBe(true);
    const t = target(createWorld(defaultSettings('other')), defaultSettings('other'));
    expect(await loadGame(t)).toBe(true);
    expect(t.restored!.tick).toBe(world.tick);
    expect(serializeWorld(t.restored!)).toBe(serializeWorld(world));
  });
});

describe('a save never loses the one it replaces', () => {
  const proto = () => (globalThis as unknown as { IDBObjectStore: { prototype: { put: (...a: unknown[]) => unknown } } }).IDBObjectStore.prototype;

  it('describes the world as it was when Save was pressed, not the one started while it was compressed', async () => {
    const { world, settings } = ordinary('save-moment', 120);
    const t = target(world, settings);
    const tick = world.tick;
    const pending = saveGame(t);
    // what New World does to the game while the copy is being compressed
    const fresh = ordinary('new-world-meanwhile', 10);
    t.world = fresh.world;
    t.settings = fresh.settings;
    expect(await pending).toBe(true);
    expect(savedGameInfo()).toMatchObject({ seed: 'save-moment', tick });
    const got: { w?: World; s?: Settings } = {};
    const restoreWorld = (w: World, s: Settings) => {
      got.w = w;
      got.s = s;
    };
    expect(await loadGame({ world: fresh.world, settings: fresh.settings, restoreWorld })).toBe(true);
    expect(got.s?.seed).toBe('save-moment'); // the settings stored with the world are that world's
    expect(got.w?.tick).toBe(tick);
  });

  it('when the description cannot be written after the world is stored, the old save is still there and still described', async () => {
    const a = ordinary('kept-a', 100);
    expect(await saveGame(target(a.world, a.settings))).toBe(true);
    const metaBefore = store.getItem('living-world:save-meta:v1');
    const realSet = store.setItem.bind(store);
    store.setItem = (k: string, v: string) => {
      if (k === 'living-world:save-meta:v1') throw new DOMException('blocked', 'SecurityError');
      realSet(k, v);
    };
    const b = ordinary('lost-b', 200);
    try {
      expect(await saveGame(target(b.world, b.settings))).toBe(false);
    } finally {
      store.setItem = realSet;
    }
    expect(store.getItem('living-world:save-meta:v1')).toBe(metaBefore);
    const t = target(b.world, b.settings);
    expect(await loadGame(t)).toBe(true);
    expect(hashWorld(t.restored!)).toBe(hashWorld(a.world));
  });

  it('a stored copy that does not read back is not described, and the old save stays', async () => {
    const a = ordinary('readback-a', 100);
    expect(await saveGame(target(a.world, a.settings))).toBe(true);
    const metaBefore = store.getItem('living-world:save-meta:v1');
    g.indexedDB = realIndexedDB;
    const p = proto();
    const real = p.put;
    p.put = function (this: unknown, rec: unknown, key: unknown) {
      const r = rec as { gz: Uint8Array };
      const damaged = r.gz.slice();
      damaged[damaged.length >> 1] ^= 0xff; // the database keeps different bytes from those handed to it
      return real.call(this, { ...r, gz: damaged }, key);
    };
    store.quota = 5_000; // and localStorage has no room for a fallback copy
    try {
      expect(await saveGame(target(ordinary('readback-b', 150).world, a.settings))).toBe(false);
    } finally {
      p.put = real;
      store.quota = Infinity;
    }
    expect(store.getItem('living-world:save-meta:v1')).toBe(metaBefore);
    const t = target(a.world, a.settings);
    expect(await loadGame(t)).toBe(true);
    expect(hashWorld(t.restored!)).toBe(hashWorld(a.world));
  });

  it('alternates between two records, so each save leaves the one before it whole', async () => {
    const worlds = [ordinary('alt-1', 60), ordinary('alt-2', 90), ordinary('alt-3', 120)];
    const keys: (string | undefined)[] = [];
    for (const w of worlds) {
      expect(await saveGame(target(w.world, w.settings))).toBe(true);
      keys.push(savedGameInfo()!.key);
      const t = target(w.world, w.settings);
      expect(await loadGame(t)).toBe(true);
      expect(hashWorld(t.restored!)).toBe(hashWorld(w.world));
    }
    expect(keys).toEqual(['current', 'alternate', 'current']);
  });

  it('in localStorage alone, a description that will not fit puts the old copy back', async () => {
    g.indexedDB = undefined;
    const a = ordinary('ls-a', 100);
    expect(await saveGame(target(a.world, a.settings))).toBe(true);
    const copyBefore = store.getItem('living-world:save:v1');
    const metaBefore = store.getItem('living-world:save-meta:v1');
    const realSet = store.setItem.bind(store);
    store.setItem = (k: string, v: string) => {
      if (k === 'living-world:save-meta:v1') throw new DOMException('quota', 'QuotaExceededError');
      realSet(k, v);
    };
    try {
      expect(await saveGame(target(ordinary('ls-b', 150).world, a.settings))).toBe(false);
    } finally {
      store.setItem = realSet;
    }
    expect(store.getItem('living-world:save:v1')).toBe(copyBefore);
    expect(store.getItem('living-world:save-meta:v1')).toBe(metaBefore);
  });

  it('a world whose own clock threw is not saved over a good one', async () => {
    const a = ordinary('faulted-a', 100);
    expect(await saveGame(target(a.world, a.settings))).toBe(true);
    const metaBefore = store.getItem('living-world:save-meta:v1');
    const broken = { ...target(ordinary('faulted-b', 150).world, a.settings), worldFaulted: true };
    expect(await saveGame(broken)).toBe(false);
    expect(store.getItem('living-world:save-meta:v1')).toBe(metaBefore);
  });
});

describe('the autosave', () => {
  it('is its own record: the hand-made save and its description are left alone, and it loads back exactly', async () => {
    const mine = ordinary('hand-made', 100);
    expect(await saveGame(target(mine.world, mine.settings))).toBe(true);
    const metaBefore = store.getItem('living-world:save-meta:v1');
    const later = ordinary('autosaved', 250);
    expect(await autosaveGame(target(later.world, later.settings))).toBe(true);
    expect(store.getItem('living-world:save-meta:v1')).toBe(metaBefore);
    expect(autosaveInfo()).toMatchObject({ seed: 'autosaved', tick: later.world.tick, where: 'indexeddb' });
    const a = target(createWorld(defaultSettings('x')), defaultSettings('x'));
    expect(await loadAutosave(a)).toBe(true);
    expect(deepHash(a.restored!)).toBe(deepHash(later.world));
    const m = target(createWorld(defaultSettings('y')), defaultSettings('y'));
    expect(await loadGame(m)).toBe(true);
    expect(deepHash(m.restored!)).toBe(deepHash(mine.world));
  });

  it('describes the world as it was when asked, not as it is after the copy is compressed', async () => {
    const { world, settings } = ordinary('auto-moment', 100);
    const t = target(world, settings);
    const tick = world.tick;
    const pending = autosaveGame(t);
    t.settings = defaultSettings('switched-meanwhile');
    for (let i = 0; i < 20; i++) stepWorld(world);
    expect(await pending).toBe(true);
    expect(autosaveInfo()).toMatchObject({ seed: 'auto-moment', tick });
  });

  it('is never written to localStorage: without IndexedDB it is simply not kept', async () => {
    g.indexedDB = undefined;
    const { world, settings } = ordinary('auto-none', 50);
    expect(await autosaveGame(target(world, settings))).toBe(false);
    expect(autosaveInfo()).toBeNull();
    expect(store.getItem('living-world:save:v1')).toBeNull();
  });
});

it('the actual product save writes format 5 and restores heterogeneous person fields exactly', async () => {
  const {world,settings}=ordinary('product-format-five',300);
  const p=world.persons[0] as unknown as Record<string,unknown>,stamp=p.stampX;
  delete p.stampX;p.stampX=stamp;
  const before=serializeWorld(world);
  g.indexedDB=undefined; // inspect the real persisted fallback payload, then exercise the same loader
  expect(await saveGame(target(world,settings))).toBe(true);
  const saved=JSON.parse(store.getItem('living-world:save:v1')!);
  const payload=JSON.parse(gunzipSync(Buffer.from(saved.data,'base64')).toString('utf8'));
  expect(payload.version).toBe(5);expect(payload.world.persons.__cols).toBeDefined();
  const restored=target(createWorld(defaultSettings('different')),defaultSettings('different'));
  expect(await loadGame(restored)).toBe(true);
  expect(serializeWorld(restored.restored!)).toBe(before);
});
