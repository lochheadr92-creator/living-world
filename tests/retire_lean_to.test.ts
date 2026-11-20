import { expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { startActivity, stepActivity } from '../src/sim/activities';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { delBelief } from '../src/sim/knowledge';
import { isWalkable } from '../src/sim/registry';
import type { Items, Person, World } from '../src/sim/types';
import { stage, addPerson, building, done, learn } from './helpers/kit';

function scene(stock: Items = {}, version = 266, type: 'hut' | 'house' = 'hut') {
  const s = stage('retiring-shelter'), w = s.w;
  w.settings = { ...w.settings, dynamics: 'rich', rulesVersion: version };
  const p = addPerson(s, 'Ada', 40.5, 40.5, { inv: { wood: 1, berries: 5 } });
  const old = building(s, 'lean_to', 40, 38, p.hhId, stock);
  const home = building(s, type, 46, 38, p.hhId);
  const hh = w.households.find(h => h.id === p.hhId)!;
  hh.homeId = home.id;
  old.condition = 40;
  done(s); learn(w, p, old, home);
  return { w, p, hh, old, home };
}

const options = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const clear = (w: World, p: Person) => options(w, p).find(o => o.key.startsWith('clear-lean-to:'));
function finish(w: World, p: Person) {
  for (let i = 0; i < 1000 && p.activity; i++) { w.tick++; stepActivity(w, p); }
  expect(p.activity).toBeNull();
}
it.each(['hut', 'house'] as const)('physically clears a stocked lean-to after moving into a %s', type => {
  const { w, p, old, home, hh } = scene({ meat: 2 }, 266, type);
  expect(options(w, p).filter(o => o.targetId === old.id).map(o => o.kind)).not.toContain('repair');
  expect(options(w, p).some(o => o.key === `deposit:${old.id}:food`)).toBe(false);
  const a = clear(w, p)!.make!()!;
  startActivity(w, p, a);
  expect(w.byId.has(old.id)).toBe(true);
  const twin = deserializeWorld(serializeWorld(w));
  finish(w, p); finish(twin, twin.persons.find(q => q.id === p.id)!);
  expect(p.inv.meat).toBe(2);
  expect(w.byId.has(old.id)).toBe(false);
  expect(isWalkable(w, old.x, old.y)).toBe(true);
  expect(hh.homeId).toBe(home.id);
  expect(conservationReport(w).ok).toBe(true);
  expect(serializeWorld(twin)).toBe(serializeWorld(w));
});
it('leaves a partly emptied shelter standing when its contents exceed one pack', () => {
  const { w, p, old } = scene({ stone: 7 });
  startActivity(w, p, clear(w,p)!.make!()!); finish(w,p);
  expect(p.inv.stone).toBeGreaterThan(0);
  expect(old.store.items.stone).toBeGreaterThan(0);
  expect(p.inv.stone! + old.store.items.stone!).toBe(7);
  expect(w.byId.has(old.id)).toBe(true);
  expect(conservationReport(w).ok).toBe(true);
});
it('requires personal knowledge, ownership and a replacement, and keeps the earlier rule', () => {
  const { w,p,hh,old,home } = scene();
  delBelief(p,home.id); expect(clear(w,p)).toBeUndefined();
  learn(w,p,home); hh.homeId = old.id; expect(clear(w,p)).toBeUndefined();
  hh.homeId = home.id; old.hhId = 0; learn(w,p,old); expect(clear(w,p)).toBeUndefined();
  const prev = scene({}, 265); expect(clear(prev.w,prev.p)).toBeUndefined();
  expect(options(prev.w,prev.p).some(o => o.key === `repair:${prev.old.id}`)).toBe(true);
});
it.each(['replacement lost','sleeper','upgrade','meal','delivery','blocked door'] as const)('checks again before removing the shelter when conditions change: %s', change => {
  const { w,p,old,hh } = scene({ meat: 1 });
  startActivity(w,p,clear(w,p)!.make!()!);
  while (p.activity?.phase === 'travel') { w.tick++; stepActivity(w,p); }
  if (change === 'replacement lost') hh.homeId = old.id;
  if (change === 'sleeper') old.inside.push(p.id);
  if (change === 'blocked door') {
    const home = w.byId.get(hh.homeId)!;
    if (home.ent === 'building') w.solid[home.doorY * w.W + home.doorX] = 1;
  }
  if (change === 'delivery') p.commitments.push({
    id: w.nextId++, requestId: 0, kind: 'deliver', to: p.id, item: 'wood', amount: 1,
    siteId: 0, made: w.tick, deadline: w.tick + 500, status: 'active', destKind: 'building', destId: old.id,
  });
  if (change === 'meal') w.meals.push({
    id: w.nextId++, host: p.id, placeId: old.id, placeName: 'lean-to', x: old.x, y: old.y,
    created: w.tick, at: w.tick + 200, invited: [], accepted: [], arrived: [], ate: [], missed: {},
    table: {}, servings: 0, reserved: 0, status: 'gathering', end: '',
  });
  if (change === 'upgrade') old.upgrading = 123;
  finish(w,p);
  expect(w.byId.has(old.id)).toBe(true);
  expect(old.store.items.meat).toBe(1);
  expect(conservationReport(w).ok).toBe(true);
});
