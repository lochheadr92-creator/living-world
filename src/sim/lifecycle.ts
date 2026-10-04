import { abortActivity, newActivity, startActivity } from './activities';
import { AGE_OLD_DEATH_START, BIRTH_SPACING_TICKS, CONCEPTION_PER_YEAR, PREGNANCY_TICKS, TICKS_PER_YEAR, isHomeType } from './constants';
import { dropNear } from './buildings';
import { unhitch } from './carts';
import { toolsOnDeath } from './tools';
import { socialOnDeath } from './social';
import { foodUnits, ledgerCreate, releaseAllFor } from './economy';
import { addEvent, addLog } from './events';
import { addToHousehold, createHousehold, householdById, membersOf, removeFromHousehold } from './households';
import { BUILD_DEF } from './constants';
import { observe, putBelief } from './knowledge';
import { createPerson, ageYears, blendLook, mixTraits, stageOf, stageOfAge } from './people';
import { findPath } from './pathfinding';
import { gridQuery, isFreeLand, isWalkable, registerGeneric } from './registry';
import { adjustRel, relOf } from './relations';
import { abortConversationFor, personOf } from './social';
import type { Grave, Person, Stage, World } from './types';
import { T } from './types';
import { newId } from './registry';

const STAGE_CODE: Record<Stage, number> = { child: 0, youth: 1, adult: 2, elder: 3 };

/** Register a freshly created person in the world and their household. */
export function spawnPerson(world: World, p: Person, hhId: number): Person {
  world.persons.push(p);
  world.byId.set(p.id, p);
  const hh = householdById(world, hhId);
  if (hh) addToHousehold(world, p, hh);
  return p;
}

// ───────────────────────── life events, checked occasionally ─────────────────────────
export function lifeTick(world: World, p: Person): void {
  const age = ageYears(world, p);
  const stage = stageOfAge(age);
  const code = STAGE_CODE[stage];
  const prev = p.cooldowns.stageCode;
  if (prev === undefined) p.cooldowns.stageCode = code;
  else if (prev !== code) {
    p.cooldowns.stageCode = code;
    if (code === 1) addEvent(world, 'life', `${p.name} is growing up.`, [p.id], p.x, p.y);
    else if (code === 2) addEvent(world, 'life', `${p.name} has come of age and joins the work.`, [p.id], p.x, p.y);
    else if (code === 3) addEvent(world, 'life', `${p.name} is now an elder.`, [p.id], p.x, p.y);
    addLog(world, p, 'life', code === 2 ? 'Became an adult.' : code === 3 ? 'Grew old.' : 'Growing up.');
  }

  // death of old age: the yearly hazard rises with every year past the threshold (this runs once a minute of sim time)
  if (age > AGE_OLD_DEATH_START) {
    const perYear = 0.035 + 0.011 * (age - AGE_OLD_DEATH_START);
    if (world.rng.next() < (perYear * LIFE_CHECK_EVERY) / TICKS_PER_YEAR) {
      killPerson(world, p, 'old age');
      return;
    }
  }
  // birth
  if (p.pregnantUntil > 0 && world.tick >= p.pregnantUntil) giveBirth(world, p);
}

function householdFoodPerHead(world: World, p: Person): number {
  const hh = householdById(world, p.hhId);
  const ms = membersOf(world, hh);
  let food = 0;
  for (const m of ms) food += foodUnits(m.inv);
  if (hh && hh.homeId) {
    const h = world.byId.get(hh.homeId);
    if (h && h.ent === 'building') food += foodUnits(h.store.items);
  }
  return food / Math.max(1, ms.length);
}

/** how often (in ticks) the world calls lifeTick for each person and conceptionTick for everyone; world.ts schedules them */
export const LIFE_CHECK_EVERY = 60;
export const CONCEPTION_CHECK_EVERY = 200;

/** Couples in a settled, fed household may conceive. */
export function conceptionTick(world: World): void {
  const adultsAlive = world.persons.filter((q) => q.alive).length;
  if (adultsAlive > 64) return;
  for (const p of world.persons) {
    if (!p.alive || p.sex !== 'f' || p.partnerId === 0 || p.pregnantUntil > 0) continue;
    const age = ageYears(world, p);
    if (age < 17 || age > 44) continue;
    const partner = personOf(world, p.partnerId);
    if (!partner || partner.hhId !== p.hhId || partner.sex !== 'm') continue;
    const hh = householdById(world, p.hhId);
    if (!hh || !hh.homeId) continue; // a roof first
    const kids = membersOf(world, hh).filter((m) => stageOf(world, m) === 'child').length;
    if (kids >= 3) continue;
    if (world.tick - (p.cooldowns.lastBirth ?? -99999) < BIRTH_SPACING_TICKS) continue; // recover between children
    if (householdFoodPerHead(world, p) < 3) continue;
    if (p.health < 60 || p.needs.hunger < 35) continue;
    const roll = world.rng.next();
    if (roll < (CONCEPTION_PER_YEAR * (world.settings.harsh ? 0.45 : 1) * CONCEPTION_CHECK_EVERY) / TICKS_PER_YEAR) {
      p.pregnantUntil = world.tick + PREGNANCY_TICKS;
      p.pregnantBy = partner.id;
      addEvent(world, 'life', `${p.name} and ${partner.name} are expecting a child.`, [p.id, partner.id], p.x, p.y);
      addLog(world, p, 'life', 'We are expecting a child.');
      addLog(world, partner, 'life', `${p.name} and I are expecting a child.`);
    }
  }
}

/** the ties between a parent and their child, as they start out */
function bondParentChild(parent: Person, child: Person): void {
  const r = relOf(child, parent.id);
  r.kin = 'parent';
  r.affinity = 85;
  r.trust = 85;
  r.familiarity = 40;
  const r2 = relOf(parent, child.id);
  r2.kin = 'child';
  r2.affinity = 90;
  r2.trust = 80;
  r2.familiarity = 40;
}

export function giveBirth(world: World, mother: Person): void {
  const father = personOf(world, mother.pregnantBy);
  mother.pregnantUntil = 0;
  mother.pregnantBy = 0;
  mother.cooldowns.lastBirth = world.tick;
  const rng = world.rng;
  const sex = rng.chance(0.5) ? 'f' : 'm';
  const baby = createPerson(world, rng, {
    age: 0,
    sex,
    hhId: mother.hhId,
    x: mother.x + 0.4,
    y: mother.y + 0.3,
    traits: mixTraits(rng, mother.traits, father ? father.traits : null),
    look: blendLook(rng, mother.look, father ? father.look : null, sex),
    parents: father ? [mother.id, father.id] : [mother.id],
  });
  baby.needs.hunger = 80;
  baby.needs.thirst = 80;
  baby.needs.energy = 85;
  spawnPerson(world, baby, mother.hhId);
  mother.children.push(baby.id);
  if (father) father.children.push(baby.id);
  for (const par of [mother, father]) {
    if (!par) continue;
    bondParentChild(par, baby);
  }
  // siblings
  for (const sibId of mother.children) {
    if (sibId === baby.id) continue;
    const sib = personOf(world, sibId);
    if (!sib) continue;
    const a = relOf(baby, sib.id);
    a.kin = 'sibling';
    a.affinity = 60;
    a.trust = 60;
    const b = relOf(sib, baby.id);
    b.kin = 'sibling';
    b.affinity = 60;
    b.trust = 60;
  }
  addEvent(world, 'life', `${baby.name} was born to ${mother.name}${father ? ' and ' + father.name : ''}.`, [baby.id, mother.id], mother.x, mother.y);
  addLog(world, mother, 'life', `${baby.name} was born.`);
  if (father) addLog(world, father, 'life', `${baby.name} was born.`);
  mother.speech = { text: 'Welcome, little one.', until: world.tick + 90, kind: 'happy' };
  for (const q of world.persons) {
    if (!q.alive || q === mother || q === baby) continue;
    if (Math.hypot(q.x - mother.x, q.y - mother.y) < 10) adjustRel(q, mother.id, world.tick, { aff: 0.8, note: `${baby.name} was born` });
  }
}

// ───────────────────────── death ─────────────────────────
export function killPerson(world: World, p: Person, cause: string): void {
  if (!p.alive) return;
  abortConversationFor(world, p);
  abortActivity(world, p, 'died');
  releaseAllFor(world, p.id);
  p.alive = false;
  p.diedTick = world.tick;
  p.deathCause = cause;
  p.pose = 'stand';
  const age = Math.floor(ageYears(world, p));
  if (p.cartId) unhitch(world, p);
  toolsOnDeath(world, p);
  socialOnDeath(world, p);
  dropNear(world, p.x, p.y, p.inv, `${p.name}'s belongings`, p.id);
  p.inv = {};
  // grave marker on a nearby free tile
  const gx = Math.floor(p.x);
  const gy = Math.floor(p.y);
  let placed = false;
  for (let r = 0; r < 5 && !placed; r++) {
    for (let dy = -r; dy <= r && !placed; dy++) {
      for (let dx = -r; dx <= r && !placed; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (isFreeLand(world, gx + dx, gy + dy) && world.terrain[(gy + dy) * world.W + gx + dx] !== T.SAND) {
          const g: Grave = { ent: 'grave', id: newId(world), x: gx + dx, y: gy + dy, name: p.name, died: world.tick, age };
          registerGeneric(world, g);
          placed = true;
        }
      }
    }
  }
  const idx = world.persons.indexOf(p);
  if (idx >= 0) world.persons.splice(idx, 1);
  world.byId.delete(p.id);
  world.deceased.push({ id: p.id, name: p.name, tick: world.tick, cause, age });
  removeFromHousehold(world, p);
  if (p.partnerId) {
    const partner = personOf(world, p.partnerId);
    if (partner) partner.partnerId = 0;
  }
  addEvent(world, 'life', `${p.name} died${cause === 'old age' ? ' peacefully of old age' : ` (${cause})`}, aged ${age}.`, [p.id], p.x, p.y);
  // those who loved them feel it
  for (const q of world.persons) {
    if (!q.alive) continue;
    const r = q.relations[p.id];
    if (!r) continue;
    if (r.kin || r.affinity >= 45) {
      q.needs.social = Math.max(0, q.needs.social - 24);
      q.needs.safety = Math.max(0, q.needs.safety - 8);
      addLog(world, q, 'life', `${p.name} died (${cause}).`);
      if (Math.hypot(q.x - p.x, q.y - p.y) < 14) q.speech = { text: '…', until: world.tick + 120, kind: 'think' };
    }
  }
}

// ───────────────────────── orphans ─────────────────────────
export function adoptOrphans(world: World): void {
  for (const child of world.persons) {
    if (!child.alive || stageOf(world, child) !== 'child') continue;
    const hh = householdById(world, child.hhId);
    const carers = membersOf(world, hh).filter((m) => m.id !== child.id && stageOf(world, m) !== 'child');
    if (carers.length > 0) continue;
    // the closest generous adult takes the child in
    let best: Person | null = null;
    let bs = -1e9;
    for (const q of world.persons) {
      if (!q.alive || q === child) continue;
      const st = stageOf(world, q);
      if (st === 'child' || st === 'youth') continue;
      const kin = q.relations[child.id]?.kin ? 3 : 0;
      const kids = membersOf(world, householdById(world, q.hhId)).filter((m) => stageOf(world, m) === 'child').length;
      const score = q.traits.generosity * 3 + kin - kids * 0.8 - Math.hypot(q.x - child.x, q.y - child.y) * 0.05;
      if (score > bs) {
        bs = score;
        best = q;
      }
    }
    if (best) {
      const target = householdById(world, best.hhId);
      if (target) {
        addToHousehold(world, child, target);
        const r = relOf(child, best.id);
        r.affinity = Math.max(r.affinity, 40);
        r.trust = Math.max(r.trust, 40);
        const r2 = relOf(best, child.id);
        r2.affinity = Math.max(r2.affinity, 45);
        addEvent(world, 'life', `${best.name} took in ${child.name}, who had no one to look after them.`, [best.id, child.id], best.x, best.y);
        addLog(world, best, 'life', `Took ${child.name} into my household.`);
        addLog(world, child, 'life', `${best.name} took me in.`);
      }
    }
  }
}

// ───────────────────────── newcomers ─────────────────────────
export function immigrationTick(world: World): void {
  if (!world.settings.immigration) return;
  const pop = world.persons.filter((q) => q.alive).length;
  if (pop >= 54 || pop < 4) return;
  if (world.tick < 4800) return; // the settlement has to prove itself first
  if (world.tick - (world.stats.lastArrival ?? -99999) < 6000) return;
  // a settlement that is doing well draws people in
  let food = 0;
  let adults = 0;
  for (const q of world.persons) {
    food += foodUnits(q.inv);
    if (stageOf(world, q) === 'adult') adults++;
  }
  for (const b of world.buildings) if (b.store.cap > 0) food += foodUnits(b.store.items);
  const perHead = food / Math.max(1, pop);
  const roofs = world.buildings.filter((b) => isHomeType(b.type)).length;
  if (perHead < 3.2 || roofs < Math.ceil(pop / 3.2) - 1) return;
  if (world.rng.next() > 0.35) return;

  // arrive from a map edge, away from known wolf dens
  for (let tries = 0; tries < 24; tries++) {
    const edge = world.rng.int(4);
    const t = world.rng.range(6, (edge % 2 === 0 ? world.W : world.H) - 6);
    const x = edge === 0 ? t : edge === 1 ? world.W - 4 : edge === 2 ? t : 3;
    const y = edge === 0 ? 3 : edge === 1 ? t : edge === 2 ? world.H - 4 : t;
    if (!isWalkable(world, Math.floor(x), Math.floor(y)) || world.terrain[Math.floor(y) * world.W + Math.floor(x)] === T.SHALLOW) continue;
    let nearWolf = false;
    for (const a of world.animals) if (Math.hypot(a.x - x, a.y - y) < 14) nearWolf = true;
    if (nearWolf) continue;
    // anywhere reachable near the middle of the camp will do (the exact tile may be built over by now)
    const gx = world.camp.x;
    const gy = world.camp.y + 3;
    const path = findPath(world, x, y, gx, gy, {
      maxNodes: 9000,
      goalFn: (tx, ty) => Math.hypot(tx + 0.5 - gx, ty + 0.5 - gy) <= 3.2 && isFreeLand(world, tx, ty),
    });
    if (!path || path.length < 2) continue;
    // travellers who have heard of the camp would not walk straight past a wolf den to reach it
    let pastADen = false;
    for (let k = 0; k < path.length && !pastADen; k += 2) for (const a of world.animals) if (Math.hypot(a.denX - path[k], a.denY - path[k + 1]) < 12) pastADen = true;
    if (pastADen) continue;
    const arriveX = path[path.length - 2];
    const arriveY = path[path.length - 1];
    // who is arriving: mostly a lone traveller, sometimes a couple or a family drawn by what they have heard
    const rollKind = world.rng.next();
    const kind: 'single' | 'couple' | 'family' = pop + 3 <= 56 && rollKind < 0.18 ? 'family' : pop + 2 <= 56 && rollKind < 0.46 ? 'couple' : 'single';
    const hh = createHousehold(world, world.rng);
    const group: Person[] = [];
    const arrive = (age: number, sex: 'f' | 'm' | undefined, parents: number[] | undefined, dx: number, dy: number): Person => {
      const person = createPerson(world, world.rng, { age, sex, hhId: hh.id, x: x + dx, y: y + dy, parents });
      person.needs.hunger = 52;
      person.needs.thirst = 55;
      person.needs.energy = 66;
      if (age >= 12) {
        person.inv = { berries: 1 };
        ledgerCreate(world, 'berries', 1, 'carried in by a newcomer');
      }
      spawnPerson(world, person, hh.id);
      group.push(person);
      return person;
    };
    if (kind === 'single') {
      // a lone traveller is more likely to be whoever the settlement has fewer of
      let womenToWed = 0;
      let menToWed = 0;
      for (const q of world.persons) {
        if (!q.alive || q.partnerId || stageOf(world, q) === 'child') continue;
        const years = ageYears(world, q);
        if (q.sex === 'f' && years >= 17 && years <= 44) womenToWed++;
        else if (q.sex === 'm' && years >= 17 && years <= 55) menToWed++;
      }
      const sex = world.rng.chance(womenToWed <= menToWed ? 0.7 : 0.3) ? 'f' : 'm';
      arrive(world.rng.range(18, 36), sex, undefined, 0, 0);
    } else {
      const mother = arrive(world.rng.range(20, 34), 'f', undefined, 0, 0);
      const father = arrive(world.rng.range(21, 38), 'm', undefined, 0.8, 0.5);
      mother.partnerId = father.id;
      father.partnerId = mother.id;
      for (const [a, b] of [[mother, father], [father, mother]] as [Person, Person][]) {
        const r = relOf(a, b.id);
        r.kin = 'partner';
        r.affinity = 70;
        r.trust = 60;
        r.familiarity = 40;
      }
      if (kind === 'family') {
        const kid = arrive(world.rng.range(1.5, 8), undefined, [mother.id, father.id], 0.4, 1);
        for (const par of [mother, father]) {
          par.children.push(kid.id);
          bondParentChild(par, kid);
        }
      }
    }
    hh.headId = group[0].id;
    for (const traveller of group) {
      // all they know: the smoke of a camp fire over there
      for (const b of world.buildings) if (b.type === 'fire') observe(world, traveller, b);
      // ...and the nearest stretch of shore, which they passed on the way in
      let bestIdx = -1;
      let bd = 1e9;
      for (let k = 0; k < world.accessCell.length; k++) {
        const t = world.accessCell[k];
        if (t < 0) continue;
        const d = Math.hypot((t % world.W) - world.camp.x, Math.floor(t / world.W) - world.camp.y);
        if (d < bd) {
          bd = d;
          bestIdx = k;
        }
      }
      if (bestIdx >= 0) {
        const t = world.accessCell[bestIdx];
        putBelief(traveller, { id: 1_000_000 + bestIdx, kind: 'water', x: (t % world.W) + 0.5, y: Math.floor(t / world.W) + 0.5, amount: 0, max: 0, seen: world.tick - 60, src: 'seen', from: 0, learned: world.tick });
      }
      const fb = traveller.beliefs[world.buildings.find((b) => b.type === 'fire')?.id ?? -1];
      if (fb) {
        fb.seen = world.tick - 40;
        fb.src = 'seen';
      }
      startActivity(
        world,
        traveller,
        newActivity(world, traveller, {
          kind: 'explore',
          label: 'Arriving at the settlement',
          goal: 'to find the camp whose smoke is rising',
          tx: arriveX,
          ty: arriveY,
          spotX: arriveX,
          spotY: arriveY,
          minCommit: 300,
          maxTicks: 1500,
          data: { where: 'the way to the camp' },
        }),
      );
    }
    world.stats.lastArrival = world.tick;
    world.stats.arrivals = (world.stats.arrivals ?? 0) + 1;
    const ids = group.map((q) => q.id);
    if (kind === 'single') addEvent(world, 'life', `A traveller, ${group[0].name}, arrives at the settlement.`, ids, x, y);
    else if (kind === 'couple') addEvent(world, 'life', `${group[0].name} and ${group[1].name} arrive at the settlement together.`, ids, x, y);
    else addEvent(world, 'life', `A family — ${group[0].name}, ${group[1].name} and little ${group[2].name} — arrives at the settlement.`, ids, x, y);
    return;
  }
  void gridQuery;
  void BUILD_DEF;
}
