// Small, clearly labelled, deterministic test scenes. Nothing here is "spontaneous emergence":
// the situations are staged so the rules can be checked and watched in isolation.
import { newCart } from './carts';
import { createBuilding, createSite } from './buildings';
import { DAY, START_FRAC } from './constants';
import { addItem, snapshotInitial } from './economy';
import { addToHousehold, createHousehold } from './households';
import { observe, putBelief } from './knowledge';
import { createPerson } from './people';
import { relOf } from './relations';
import { hashString, RNG } from './rng';
import { makeSource } from './sources';
import { mintTool } from './tools';
import { blankWorld, computeAccessCells, computeWaterDist, lookAround } from './worldgen';
import type { ItemKind, Items, Person, SceneId, Settings, ToolKind, Traits, World } from './types';
import { T } from './types';
import { ACCESS_CELL, waterBeliefId } from './knowledge';

export const SCENE_LABELS: Record<SceneId, string> = {
  natural: '',
  contest: 'TEST SCENE · Contested berry — two hungry people, one berry (staged)',
  help: 'TEST SCENE · Asking for help — one request met by a generous neighbour, one refused by a stingy one (staged)',
  cooperate: 'TEST SCENE · Shared building — one builds while another fetches materials (staged)',
  workshop: 'TEST SCENE · Logs to planks to a house — a timber yard, a saw and a house waiting for planks (staged)',
  meal: 'TEST SCENE · A shared meal at the hall — a host with food, two friends, one table (staged)',
  haul: 'TEST SCENE · A handcart load — bricks and planks far from a house waiting for them (staged)',
  care: 'TEST SCENE · Looking after a frail neighbour — an old man hungry in his lean-to, out of sight (staged)',
};

export const SCENE_INFO: Record<Exclude<SceneId, 'natural'>, string> = {
  contest: 'Ana and Ben are both hungry and both know about the same bush, which holds exactly one berry. Watch who gets it and what the other does about it.',
  help: 'On the left, hungry Ana can ask generous Ben. On the right, hungry Dara can only ask Cole, who is stingy and short of food himself. Watch what each request brings.',
  cooperate: 'Mira is building a hut. Tomas has the wood. Watch materials move to the site and the hut rise as work and supplies come together.',
  workshop: "Hana's hut is being rebuilt as a house and is waiting for planks. There is a timber yard, a saw, and trees; nobody has been told to make anything. Watch who cuts, who saws, what is carried, and where the planks end up.",
  meal: "Hosta has bread and fish, the hall is by the water, and two friends are about as the afternoon winds down. Nobody has been told to hold a meal: whoever has food to spare and company at hand may invite the others. Open the host's card to see the invitation, the table and the servings.",
  care: "Old Kit is frail, hungry and asleep in his lean-to on the far side of the settlement, and knows of no food. Gus passed his door earlier and saw how he looked (that sighting is the staged part). Hilda has food to spare and is Kit's friend. Watch whether the word gets round, who decides to go, and what happens when they find him.",
  haul: 'Bricks and planks are stacked at a distant store; a house is waiting for them; a handcart stands by the house. Watch the cart go out empty, come back loaded, and stop at the site (the load never exceeds the bed).',
};

interface PersonSpec {
  name: string;
  x: number;
  y: number;
  sex?: 'f' | 'm';
  age?: number;
  hunger?: number;
  thirst?: number;
  energy?: number;
  traits?: Partial<Traits>;
  inv?: Items;
  hh?: number;
}

function flatWorld(settings: Settings): World {
  const w = blankWorld({ ...settings, immigration: false });
  const { W, H } = w;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (y < 12) w.terrain[i] = T.DEEP;
      else if (y < 14) w.terrain[i] = T.SHALLOW;
      else if (y < 16) w.terrain[i] = T.SAND;
      else w.terrain[i] = T.GRASS;
    }
  }
  computeWaterDist(w);
  w.camp = { x: 43.5, y: 43.5 }; // where the action is (the camera looks here)
  w.weather.nextChange = 1e9;
  w.weather.kind = 'clear';
  return w;
}

function addPerson(world: World, rng: RNG, spec: PersonSpec): Person {
  const hh = spec.hh ? world.households.find((h) => h.id === spec.hh)! : createHousehold(world, rng);
  const base = createPerson(world, rng, { name: spec.name, sex: spec.sex ?? 'f', age: spec.age ?? 28, hhId: hh.id, x: spec.x, y: spec.y });
  base.traits = { generosity: 0.5, sociability: 0.5, caution: 0.5, diligence: 0.6, curiosity: 0.4, ...(spec.traits ?? {}) };
  base.needs.hunger = spec.hunger ?? 80;
  base.needs.thirst = spec.thirst ?? 85;
  base.needs.energy = spec.energy ?? 90;
  base.needs.social = 70;
  base.inv = { ...(spec.inv ?? {}) };
  world.persons.push(base);
  world.byId.set(base.id, base);
  addToHousehold(world, base, hh);
  return base;
}

function everyoneKnowsTheLake(world: World): void {
  const cw = Math.ceil(world.W / ACCESS_CELL);
  computeAccessCells(world);
  for (const p of world.persons) {
    for (let cy = 0; cy < Math.ceil(world.H / ACCESS_CELL); cy++) {
      for (let cx = 0; cx < cw; cx++) {
        const t = world.accessCell[cy * cw + cx];
        if (t < 0) continue;
        const tx = t % world.W;
        const ty = Math.floor(t / world.W);
        if (Math.hypot(tx - world.camp.x, ty - world.camp.y) < 30) {
          const id = waterBeliefId(cy * cw + cx);
          putBelief(p, { id, kind: 'water', x: tx + 0.5, y: ty + 0.5, amount: 0, max: 0, seen: -10, src: 'seen', from: 0, learned: -10 });
        }
      }
    }
    // they know the open ground around the scene
    for (let y = 0; y < world.H; y++) for (let x = 0; x < world.W; x++) if (Math.hypot(x - world.camp.x, y - world.camp.y) < 20) p.explored[y * world.W + x] = 1;
  }
}

function equip(world: World, p: Person, kind: ToolKind, tier: 0 | 1 = 0): void {
  mintTool(world, kind, tier, p.hhId, p.id, p.inv, p.id, 'starting equipment', false);
}

function knowAll(world: World, people: Person[], things: Parameters<typeof observe>[2][]): void {
  for (const p of people) for (const e of things) observe(world, p, e);
}

function befriend(a: Person, b: Person, affinity: number, trust: number): void {
  for (const [x, y] of [[a, b], [b, a]] as [Person, Person][]) {
    const r = relOf(x, y.id);
    r.affinity = affinity;
    r.trust = trust;
    r.familiarity = 20;
  }
}

function finish(world: World, scene: SceneId): World {
  everyoneKnowsTheLake(world);
  lookAround(world);
  world.sceneLabel = SCENE_LABELS[scene];
  snapshotInitial(world);
  return world;
}

// ───────────────────────── scene 1: a contested berry ─────────────────────────
function contestScene(settings: Settings): World {
  const w = flatWorld(settings);
  const rng = new RNG(hashString(settings.seed + '|scene'));
  createBuilding(w, 'fire', 40, 36, 0, { fuel: 2000 });
  const bush = makeSource(w, 'berry_bush', 40, 42, 1);
  bush.regrowTimer = 0;
  const ana = addPerson(w, rng, { name: 'Ana', x: 34.5, y: 42.5, hunger: 28, traits: { generosity: 0.35, sociability: 0.5 } });
  const ben = addPerson(w, rng, { name: 'Ben', x: 45.5, y: 42.5, sex: 'm', hunger: 28, traits: { generosity: 0.35, sociability: 0.5 } });
  const cole = addPerson(w, rng, { name: 'Cole', x: 40.5, y: 47.5, sex: 'm', hunger: 85, inv: { water: 1 } });
  for (const p of [ana, ben, cole]) {
    observe(w, p, bush);
    p.beliefs[bush.id].seen = -20;
  }
  // nobody knows any other food
  befriend(ana, ben, 4, 15);
  befriend(ana, cole, 20, 30);
  befriend(ben, cole, 20, 30);
  return finish(w, 'contest');
}

// ───────────────────────── scene 2: asking for help ─────────────────────────
export function helpScene(settings: Settings, variant: 'both' | 'generous' | 'stingy' = 'both'): World {
  const w = flatWorld(settings);
  const rng = new RNG(hashString(settings.seed + '|scene'));
  createBuilding(w, 'fire', 40, 36, 0, { fuel: 2000 });
  const left = variant !== 'stingy';
  const right = variant !== 'generous';
  // two small groups on either side of the fire, out of each other's sight
  if (left) {
    const ana = addPerson(w, rng, { name: 'Ana', x: 33.5, y: 43.5, hunger: 20, thirst: 80, traits: { generosity: 0.5, sociability: 0.6 } });
    const ben = addPerson(w, rng, { name: 'Ben', x: 38.5, y: 43.5, sex: 'm', hunger: 98, inv: { berries: 6 }, traits: { generosity: 0.92, sociability: 0.6 } });
    befriend(ana, ben, 38, 40);
  }
  if (right) {
    const dara = addPerson(w, rng, { name: 'Dara', x: variant === 'stingy' ? 33.5 : 49.5, y: 43.5, hunger: 30, thirst: 80, traits: { generosity: 0.5, sociability: 0.6 } });
    const cole = addPerson(w, rng, {
      name: 'Cole',
      x: variant === 'stingy' ? 38.5 : 54.5,
      y: 43.5,
      sex: 'm',
      hunger: 46,
      inv: { berries: 2 },
      traits: { generosity: 0.04, sociability: 0.5 },
    });
    befriend(dara, cole, 3, 12);
  }
  // nobody knows of any food source: the only food is what people carry
  // (a patch of berries does exist far to the south-east, unknown to all, so a refused person can still find a way out by exploring)
  makeSource(w, 'berry_bush', 58, 66, 5);
  makeSource(w, 'berry_bush', 60, 67, 4);
  return finish(w, 'help');
}

// ───────────────────────── scene 3: a shared building ─────────────────────────
function cooperateScene(settings: Settings): World {
  const w = flatWorld(settings);
  const rng = new RNG(hashString(settings.seed + '|scene'));
  createBuilding(w, 'fire', 40, 36, 0, { fuel: 2400 });
  const mira = addPerson(w, rng, { name: 'Mira', x: 38.5, y: 44.5, traits: { diligence: 0.9, generosity: 0.7, sociability: 0.7 }, inv: { berries: 3, wood: 0 } });
  const tomas = addPerson(w, rng, { name: 'Tomas', x: 44.5, y: 44.5, sex: 'm', traits: { diligence: 0.7, generosity: 0.85, sociability: 0.6 }, inv: { berries: 3, wood: 6 } });
  // Tomas already has a roof of his own, so he is free to help a friend who does not
  const lean = createBuilding(w, 'lean_to', 46, 40, tomas.hhId);
  const tomasHh = w.households.find((h) => h.id === tomas.hhId);
  if (tomasHh) tomasHh.homeId = lean.id;
  const site = createSite(w, 'hut', 38, 40, mira.hhId, mira.id);
  // the site has half its stone already; it still needs wood and a little more stone
  addItem(site.delivered, 'stone', 2);
  addItem(site.delivered, 'wood', 2);
  addItem(tomas.inv, 'stone', 2);
  // a few trees and a rock to gather from, known to both
  makeSource(w, 'tree', 47, 46, 5);
  makeSource(w, 'tree', 48, 47, 5);
  makeSource(w, 'tree', 33, 47, 5);
  makeSource(w, 'rock', 50, 44, 8);
  for (const p of [mira, tomas]) {
    observe(w, p, lean);
    observe(w, p, site);
    for (const s of w.sources) observe(w, p, s);
  }
  befriend(mira, tomas, 46, 48);
  return finish(w, 'cooperate');
}

// ───────────────────────── scene 4: logs to planks to a house ─────────────────────────
function workshopScene(settings: Settings): World {
  const w = flatWorld(settings);
  const rng = new RNG(hashString(settings.seed + '|scene'));
  w.camp = { x: 44.5, y: 26.5 }; // the lake is a short walk away
  const fire = createBuilding(w, 'fire', 42, 23, 0, { fuel: 2400 });
  const hana = addPerson(w, rng, { name: 'Hana', x: 44.5, y: 26.5, traits: { diligence: 0.95, generosity: 0.7, curiosity: 0.6 }, inv: { wood: 6, fruit: 10 } });
  const tomas = addPerson(w, rng, { name: 'Tomas', x: 46.5, y: 27.5, sex: 'm', traits: { diligence: 0.8, generosity: 0.7, sociability: 0.6 }, inv: { fruit: 8 } });
  equip(w, hana, 'saw');
  equip(w, hana, 'axe');
  equip(w, tomas, 'hammer');
  const lean = createBuilding(w, 'lean_to', 50, 31, tomas.hhId);
  const tomasHh = w.households.find((h) => h.id === tomas.hhId);
  if (tomasHh) tomasHh.homeId = lean.id;
  const hut = createBuilding(w, 'hut', 40, 26, hana.hhId);
  const hanaHh = w.households.find((h) => h.id === hana.hhId);
  if (hanaHh) hanaHh.homeId = hut.id;
  const yard = createBuilding(w, 'timber_yard', 48, 26, 0);
  const site = createSite(w, 'house', hut.x, hut.y, hana.hhId, hana.id, { upgradeOf: hut.id });
  // the rest of the house is in hand; only the planks are missing, and they have to be made
  addItem(site.delivered, 'wood', 6);
  addItem(site.delivered, 'bricks', 6);
  const trees = [makeSource(w, 'tree', 54, 22, 6), makeSource(w, 'tree', 55, 23, 6), makeSource(w, 'tree', 54, 24, 6), makeSource(w, 'tree', 55, 25, 6), makeSource(w, 'tree', 53, 21, 6)];
  const berries = [makeSource(w, 'berry_bush', 36, 30, 6), makeSource(w, 'berry_bush', 37, 30, 6), makeSource(w, 'berry_bush', 38, 30, 6)];
  knowAll(w, [hana, tomas], [fire, lean, hut, yard, site, ...trees, ...berries]);
  befriend(hana, tomas, 40, 40);
  return finish(w, 'workshop');
}

// ───────────────────────── scene 5: a shared meal ─────────────────────────
function mealScene(settings: Settings): World {
  const w = flatWorld(settings);
  const rng = new RNG(hashString(settings.seed + '|scene'));
  w.camp = { x: 45.5, y: 25.5 };
  createBuilding(w, 'fire', 44, 22, 0, { fuel: 2400 });
  const hall = createBuilding(w, 'hall', 48, 26, 0);
  const hosta = addPerson(w, rng, { name: 'Hosta', x: 42.5, y: 24.5, traits: { sociability: 0.9, generosity: 0.9 }, inv: { bread: 3, fish: 3 } });
  const gus = addPerson(w, rng, { name: 'Gus', x: 44.5, y: 25.5, sex: 'm', hunger: 72, traits: { sociability: 0.95 }, inv: { fruit: 2 } });
  const gwen = addPerson(w, rng, { name: 'Gwen', x: 46, y: 25.5, hunger: 72, traits: { sociability: 0.95 }, inv: { fruit: 2 } });
  w.tick = Math.round(DAY * 0.58 - START_FRAC * DAY); // 58% through the day: late afternoon, the day's work winding down
  // everyone knows where food and wood are to be had, so nobody spends the evening asking around for it
  const about = [makeSource(w, 'berry_bush', 38, 29, 6), makeSource(w, 'berry_bush', 39, 29, 6), makeSource(w, 'berry_bush', 40, 30, 6), makeSource(w, 'tree', 54, 22, 6), makeSource(w, 'tree', 55, 24, 6)];
  knowAll(w, [hosta, gus, gwen], [hall, ...about]);
  befriend(hosta, gus, 45, 45);
  befriend(hosta, gwen, 45, 45);
  befriend(gus, gwen, 30, 30);
  return finish(w, 'meal');
}

// ───────────────────────── scene 6: a handcart load ─────────────────────────
function haulScene(settings: Settings): World {
  const w = flatWorld(settings);
  const rng = new RNG(hashString(settings.seed + '|scene'));
  w.camp = { x: 44.5, y: 28.5 };
  createBuilding(w, 'fire', 42, 24, 0, { fuel: 2400 });
  const hana = addPerson(w, rng, { name: 'Hana', x: 43.5, y: 30.5, traits: { diligence: 0.95, generosity: 0.7 }, inv: { fruit: 2 } });
  const hut = createBuilding(w, 'hut', 40, 27, hana.hhId);
  const hanaHh = w.households.find((h) => h.id === hana.hhId);
  if (hanaHh) hanaHh.homeId = hut.id;
  const site = createSite(w, 'house', hut.x, hut.y, hana.hhId, hana.id, { upgradeOf: hut.id });
  addItem(site.delivered, 'wood', 6);
  const store = createBuilding(w, 'storehouse', 62, 40, 0);
  addItem(store.store.items, 'bricks', 20);
  addItem(store.store.items, 'planks', 12);
  const cart = newCart(w, 44.5, 32.5, hana.hhId);
  const berries = [makeSource(w, 'berry_bush', 36, 32, 6), makeSource(w, 'berry_bush', 37, 33, 6), makeSource(w, 'berry_bush', 38, 32, 6)];
  knowAll(w, [hana], [hut, site, store, cart, ...berries]);
  return finish(w, 'haul');
}

// ───────────────────────── scene 7: looking after a frail neighbour ─────────────────────────
function careScene(settings: Settings): World {
  const w = flatWorld(settings);
  const rng = new RNG(hashString(settings.seed + '|scene'));
  w.camp = { x: 52.5, y: 27.5 };
  const fire = createBuilding(w, 'fire', 46, 24, 0, { fuel: 2400 });
  const hilda = addPerson(w, rng, { name: 'Hilda', x: 41.5, y: 32.5, traits: { generosity: 0.9, sociability: 0.4 }, inv: { fruit: 6, bread: 2 } });
  const gus = addPerson(w, rng, { name: 'Gus', x: 52.5, y: 27.5, sex: 'm', traits: { sociability: 0.4, generosity: 0.7 }, inv: { fruit: 3 } });
  const kit = addPerson(w, rng, { name: 'Kit', x: 66.5, y: 30.5, sex: 'm', age: 70, hunger: 24, energy: 6, traits: { sociability: 0.15, generosity: 0.4, curiosity: 0.1 } });
  kit.health = 64; // frail (an elder in poor health is someone who cannot be expected to manage alone) but not visibly hurt
  const lean = createBuilding(w, 'lean_to', 67, 31, kit.hhId);
  const kitHh = w.households.find((h) => h.id === kit.hhId);
  if (kitHh) kitHh.homeId = lean.id;
  w.tick = Math.round(DAY * 0.62 - START_FRAC * DAY); // mid-afternoon
  const berries = [makeSource(w, 'berry_bush', 40, 30, 6), makeSource(w, 'berry_bush', 41, 31, 6), makeSource(w, 'berry_bush', 42, 30, 6)];
  knowAll(w, [hilda, gus], [fire, lean, ...berries]);
  // Kit knows his own door and the lake, and nothing about food
  knowAll(w, [kit], [lean]);
  // Gus went past Kit's lean-to earlier and saw how hungry he looked: the one staged memory in the scene
  gus.concerns.push({ about: kit.id, kind: 'hungry', seen: w.tick - 150, src: 'seen', from: gus.id, checked: -99999 });
  gus.whereabouts[kit.id] = { x: 66.5, y: 30.5, tick: w.tick - 150 };
  befriend(hilda, gus, 45, 45);
  befriend(hilda, kit, 40, 40);
  befriend(gus, kit, 35, 35);
  return finish(w, 'care');
}

export function createSceneWorld(settings: Settings): World {
  switch (settings.scene) {
    case 'contest':
      return contestScene(settings);
    case 'help':
      return helpScene(settings, 'both');
    case 'cooperate':
      return cooperateScene(settings);
    case 'workshop':
      return workshopScene(settings);
    case 'meal':
      return mealScene(settings);
    case 'haul':
      return haulScene(settings);
    case 'care':
      return careScene(settings);
    default:
      throw new Error('not a staged scene: ' + settings.scene);
  }
}

/** Builders for hand-made situations in tests. */
export const testKit = { flatWorld, addPerson, befriend, finish, everyoneKnowsTheLake };

void ({} as ItemKind);
