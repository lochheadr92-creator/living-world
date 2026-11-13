// Rules 245: a household knows its own stores (src/sim/own_stores.ts; written in knowledge.ts observe, passed on in news.ts
// tellBelief). A sight of a building the person's own household owns is remembered as the exact contents; everything else keeps the
// glance of rules 169 (src/sim/seen_stock.ts).
// STAGED: a flat world, two households and a shared storehouse standing by one another, and two people far off who hold no belief of
// any of it. One test at the end reads an ordinary world (aspen, arrivals on) as well. The measured evidence is
// scripts/home_stock_probe.ts and docs/GROWTH_PLAN.md "What a household thinks it holds at home".
// Every test that names a rules-244 contrast fails if the rule is taken out (or the world is 244); the ones marked "kept" guard what
// 245 must NOT change and pass at both versions by design.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { isSolidHome } from '../src/sim/constants';
import { cloneItems, conservationReport, weightOf } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { seesInside } from '../src/sim/home_interior';
import { delBelief, observe } from '../src/sim/knowledge';
import { tellBelief } from '../src/sim/news';
import { hhState } from '../src/sim/options_work';
import { makeCtx } from '../src/sim/optutil';
import { hasOwnStores, isOwnBuilding, ownStoresOn, setOwnStores } from '../src/sim/own_stores';
import { currentWorldSettings } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Building, Items, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(() => setOwnStores(true));

/** nine grain and four fish: well under any store's cap, so the glance is one of each and never "full" */
const GRAIN_FISH: Items = { grain: 9, fish: 4 };
/** what an exact memory of that store is */
const OWN_EXACT: Items = GRAIN_FISH;
/** what the glance of rules 169 remembers of it */
const GLANCE: Items = { grain: 1, fish: 1 };

/**
 * Hana's household (a hut, a cellar, a smithy of its own) and Brannoc's (a cellar of its own) stand beside a shared storehouse. Hana
 * and Brannoc both stand at the door of Hana's hut, so the sight of its inside is not what the test is about (rules 184 is). Kin
 * (Hana's household) and Stranger (a third) stand 40 tiles off with no belief of any of it.
 */
function fixture(version: number, o: { home?: Items; cellar?: Items; smithy?: Items; shared?: Items; theirs?: Items } = {}) {
  const s = stage('own-stores'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const her = addPerson(s, 'Hana', 20.5, 62.5, { sex: 'f', age: 28, hunger: 100, thirst: 100, energy: 100 });
  const him = addPerson(s, 'Brannoc', 22.5, 62.5, { sex: 'm', age: 40, hunger: 100, thirst: 100, energy: 100 });
  const kin = addPerson(s, 'Kin', 70.5, 30.5, { sex: 'm', age: 30, hh: her.hhId, hunger: 100, thirst: 100, energy: 100 });
  const stranger = addPerson(s, 'Stranger', 70.5, 32.5, { sex: 'm', age: 35, hunger: 100, thirst: 100, energy: 100 });
  const home = building(s, 'hut', 20, 60, her.hhId, o.home ?? {});
  w.households.find((h) => h.id === her.hhId)!.homeId = home.id;
  const cellar = building(s, 'cellar', 24, 60, her.hhId, o.cellar ?? {});
  const smithy = building(s, 'smithy', 16, 60, her.hhId, o.smithy ?? {});
  const theirs = building(s, 'cellar', 24, 64, him.hhId, o.theirs ?? {});
  const shared = building(s, 'storehouse', 18, 66, 0, o.shared ?? {});
  done(s);
  return { s, w, her, him, kin, stranger, home, cellar, smithy, theirs, shared };
}

describe('rules 245: a household knows its own stores', () => {
  it('is a supported version, and its removal is a lab arm', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(245);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(245);
    const arm = parseIntervention('rich-no-own-stores');
    expect(arm.spec).toBe('rich-no-own-stores');
    const put = arm.install!();
    expect(ownStoresOn()).toBe(false);
    put();
    expect(ownStoresOn()).toBe(true);
  });

  it('remembers the exact contents of the household\'s own home at 245, and one of each kind at 244', () => {
    const now = fixture(245, { home: GRAIN_FISH });
    expect(now.home.store.items).toEqual(GRAIN_FISH);
    expect(now.her.beliefs[now.home.id].items).toEqual(OWN_EXACT);

    const before = fixture(244, { home: GRAIN_FISH });
    expect(before.home.store.items).toEqual(GRAIN_FISH);
    expect(before.her.beliefs[before.home.id].items).toEqual(GLANCE);
  });

  it('remembers a full own store as it is, where 244 gives a stand-in for the split', () => {
    const full: Items = { grain: 10, wood: 15 }; // the hut's cap exactly (rules 169's own test uses the same store)
    const now = fixture(245, { home: full });
    expect(weightOf(now.home.store.items)).toBe(now.home.store.cap);
    expect(now.her.beliefs[now.home.id].items).toEqual(full);

    const before = fixture(244, { home: full });
    expect(before.her.beliefs[before.home.id].items).not.toEqual(full);
    expect(before.her.beliefs[before.home.id].items?.wood).toBe(1);
  });

  it('every member of the household remembers it exactly, not only the one who stocked it', () => {
    const { w, kin, home } = fixture(245, { home: GRAIN_FISH });
    kin.x = 20.5;
    kin.y = 62.5; // at the door
    observe(w, kin, home);
    expect(kin.beliefs[home.id].items).toEqual(OWN_EXACT);
    const before = fixture(244, { home: GRAIN_FISH });
    before.kin.x = 20.5;
    before.kin.y = 62.5;
    observe(before.w, before.kin, before.home);
    expect(before.kin.beliefs[before.home.id].items).toEqual(GLANCE);
  });

  it('kept: gives a person of another household the glance of that same home, at 245 and at 244', () => {
    for (const version of [245, 244]) {
      const { him, home } = fixture(version, { home: GRAIN_FISH });
      expect(him.beliefs[home.id].items, `rules ${version}`).toEqual(GLANCE);
    }
  });

  it('kept: the glance for a shared storehouse (hhId 0) at 245 and at 244, whoever looks, and nobody owns it', () => {
    for (const version of [245, 244]) {
      const { her, him, shared } = fixture(version, { shared: GRAIN_FISH });
      expect(shared.hhId).toBe(0);
      expect(her.beliefs[shared.id].items, `rules ${version}`).toEqual(GLANCE);
      expect(him.beliefs[shared.id].items, `rules ${version}`).toEqual(GLANCE);
      expect(isOwnBuilding(her, shared)).toBe(false);
    }
    // "and not 0": somebody who has no household is not at home in a building that has none
    const { her, shared } = fixture(245, { shared: GRAIN_FISH });
    const homeless = { ...her, hhId: 0 };
    expect(isOwnBuilding(homeless, shared)).toBe(false);
  });

  it('remembers the household\'s own cellar and its own workshop exactly at 245, and another household\'s cellar by the glance', () => {
    const now = fixture(245, { cellar: { grain: 12, fish: 3 }, smithy: { charcoal: 5, iron: 3 }, theirs: { grain: 7, fish: 2 } });
    expect(now.her.beliefs[now.cellar.id].items).toEqual({ grain: 12, fish: 3 });
    expect(now.her.beliefs[now.smithy.id].items).toEqual({ charcoal: 5, iron: 3 });
    expect(now.her.beliefs[now.theirs.id].items).toEqual({ grain: 1, fish: 1 }); // Brannoc's, not hers
    expect(now.him.beliefs[now.theirs.id].items).toEqual({ grain: 7, fish: 2 }); // his own
    expect(now.him.beliefs[now.cellar.id].items).toEqual({ grain: 1, fish: 1 }); // Hana's, not his

    const before = fixture(244, { cellar: { grain: 12, fish: 3 }, smithy: { charcoal: 5, iron: 3 }, theirs: { grain: 7, fish: 2 } });
    expect(before.her.beliefs[before.cellar.id].items).toEqual({ grain: 1, fish: 1 });
    expect(before.her.beliefs[before.smithy.id].items).toEqual({ charcoal: 1, iron: 1 });
    expect(before.him.beliefs[before.theirs.id].items).toEqual({ grain: 1, fish: 1 });
  });

  it('with the switch off, a rules-245 world remembers as rules 244 does', () => {
    const stock = { home: GRAIN_FISH, cellar: { grain: 12, fish: 3 }, smithy: { charcoal: 5, iron: 3 }, shared: GRAIN_FISH, theirs: { grain: 7, fish: 2 } };
    setOwnStores(false);
    const off = fixture(245, stock);
    expect(hasOwnStores(off.w)).toBe(false);
    setOwnStores(true);
    const earlier = fixture(244, stock);
    expect(hasOwnStores(earlier.w)).toBe(false);
    for (const [a, b] of [[off.home, earlier.home], [off.cellar, earlier.cellar], [off.smithy, earlier.smithy], [off.shared, earlier.shared], [off.theirs, earlier.theirs]]) {
      expect(off.her.beliefs[a.id].items).toEqual(earlier.her.beliefs[b.id].items);
      expect(off.him.beliefs[a.id].items).toEqual(earlier.him.beliefs[b.id].items);
    }
    // and the same world with the switch on is not the same
    const on = fixture(245, stock);
    expect(hasOwnStores(on.w)).toBe(true);
    expect(on.her.beliefs[on.home.id].items).not.toEqual(off.her.beliefs[off.home.id].items);
  });

  it('is for rich worlds only', () => {
    const { w } = fixture(245, { home: GRAIN_FISH });
    expect(hasOwnStores(w)).toBe(true);
    w.settings.dynamics = 'authored';
    expect(hasOwnStores(w)).toBe(false);
  });

  it('does not change when a home\'s inside can be seen: from outside the door the old belief is kept (rules 184), at the door it is renewed', () => {
    const { w, her, home } = fixture(245, { home: GRAIN_FISH });
    expect(her.beliefs[home.id].items).toEqual(OWN_EXACT);
    home.store.items.grain = 2;
    her.x = 20.5;
    her.y = 72.5; // ten tiles from the door
    observe(w, her, home);
    expect(her.beliefs[home.id].items).toEqual(OWN_EXACT);
    her.y = 62.5;
    observe(w, her, home);
    expect(her.beliefs[home.id].items).toEqual({ grain: 2, fish: 4 });
  });

  describe('what is told on', () => {
    it('gives a listener of another household the glance of a household\'s own store, and a listener of the same household the count', () => {
      const { w, her, kin, stranger, home, smithy } = fixture(245, { home: GRAIN_FISH, smithy: { charcoal: 5, iron: 3 } });
      expect(her.beliefs[home.id].items).toEqual(OWN_EXACT);
      expect(her.beliefs[smithy.id].items).toEqual({ charcoal: 5, iron: 3 });
      expect(kin.beliefs[home.id]).toBeUndefined();
      expect(stranger.beliefs[home.id]).toBeUndefined();

      expect(tellBelief(w, her, stranger, her.beliefs[home.id])).toBe(true);
      expect(tellBelief(w, her, stranger, her.beliefs[smithy.id])).toBe(true);
      expect(stranger.beliefs[home.id].src).toBe('told');
      expect(stranger.beliefs[home.id].items).toEqual(GLANCE);
      expect(stranger.beliefs[smithy.id].items).toEqual({ charcoal: 1, iron: 1 });

      expect(tellBelief(w, her, kin, her.beliefs[home.id])).toBe(true);
      expect(tellBelief(w, her, kin, her.beliefs[smithy.id])).toBe(true);
      expect(kin.beliefs[home.id].items).toEqual(OWN_EXACT);
      expect(kin.beliefs[smithy.id].items).toEqual({ charcoal: 5, iron: 3 });

      // what Hana holds is not changed by telling it
      expect(her.beliefs[home.id].items).toEqual(OWN_EXACT);
    });

    it('tells another household a full own store as a full one, and not as its true split', () => {
      const full: Items = { grain: 10, wood: 15 };
      const { w, her, stranger, home } = fixture(245, { home: full });
      expect(her.beliefs[home.id].items).toEqual(full);
      expect(tellBelief(w, her, stranger, her.beliefs[home.id])).toBe(true);
      const told = stranger.beliefs[home.id].items ?? {};
      expect(told).not.toEqual(full);
      expect(weightOf(told)).toBeGreaterThanOrEqual(home.store.cap);
    });

    it('passes a glance on as it was, and tells a third household the glance of Brannoc\'s own cellar', () => {
      const { w, her, him, stranger, theirs, shared } = fixture(245, { theirs: GRAIN_FISH, shared: GRAIN_FISH });
      // Hana's beliefs of Brannoc's cellar and of the shared storehouse are glances already; telling them changes nothing
      expect(her.beliefs[theirs.id].items).toEqual(GLANCE);
      expect(her.beliefs[shared.id].items).toEqual(GLANCE);
      expect(tellBelief(w, her, stranger, her.beliefs[theirs.id])).toBe(true);
      expect(tellBelief(w, her, stranger, her.beliefs[shared.id])).toBe(true);
      expect(stranger.beliefs[theirs.id].items).toEqual(GLANCE);
      expect(stranger.beliefs[shared.id].items).toEqual(GLANCE);
      // Brannoc holds his own cellar exactly, and what he tells a stranger of it is the glance
      expect(him.beliefs[theirs.id].items).toEqual(GRAIN_FISH);
      delBelief(stranger, theirs.id);
      expect(tellBelief(w, him, stranger, him.beliefs[theirs.id])).toBe(true);
      expect(stranger.beliefs[theirs.id].items).toEqual(GLANCE);
    });

    it('copies the count as it always did where the rule does not run (rules 244, a switch thrown)', () => {
      const earlier = fixture(244, { home: GRAIN_FISH });
      earlier.her.beliefs[earlier.home.id].items = { ...OWN_EXACT }; // as if she held it exactly
      tellBelief(earlier.w, earlier.her, earlier.stranger, earlier.her.beliefs[earlier.home.id]);
      expect(earlier.stranger.beliefs[earlier.home.id].items).toEqual(OWN_EXACT);

      setOwnStores(false);
      const off = fixture(245, { home: GRAIN_FISH });
      off.her.beliefs[off.home.id].items = { ...OWN_EXACT };
      tellBelief(off.w, off.her, off.stranger, off.her.beliefs[off.home.id]);
      expect(off.stranger.beliefs[off.home.id].items).toEqual(OWN_EXACT);
    });
  });

  it('lowers the shortage a household counts for itself where its home truly holds plenty', () => {
    const shortageAt = (version: number): number => {
      const { w, her } = fixture(version, { home: GRAIN_FISH });
      return hhState(makeCtx(w, her, false, true)).shortage;
    };
    const at244 = shortageAt(244), at245 = shortageAt(245);
    expect(at244).toBeGreaterThan(0.4); // the gate the plan measured: one of each kind remembered, 2 of the 13 there
    expect(at245).toBeLessThan(at244);
    expect(at245).toBeLessThanOrEqual(0.4);
  });

  it('moves and saves nothing: stock is conserved, and a saved world reloads with the same beliefs and goes on the same', () => {
    const { w, home, cellar, her } = fixture(245, { home: GRAIN_FISH, cellar: { grain: 12 } });
    const saved = serializeWorld(w);
    expect(home.store.items).toEqual(GRAIN_FISH);
    expect(conservationReport(w).ok).toBe(true);
    const copy = deserializeWorld(saved);
    expect(serializeWorld(copy)).toBe(saved);
    const hers = copy.persons.find((p) => p.name === 'Hana')!;
    expect(hers.beliefs[home.id].items).toEqual(OWN_EXACT);
    expect(hers.beliefs[cellar.id].items).toEqual({ grain: 12 });
    expect(copy.settings.rulesVersion).toBe(245);
    for (let i = 0; i < 40; i++) { stepWorld(w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(w));
    expect(conservationReport(copy).ok).toBe(true);
    // she is still at the door of her own home, so what she remembers is what is there
    const nowHome = (w.byId.get(home.id) as Building).store.items;
    expect(her.beliefs[home.id].items).toEqual(cloneItems(nowHome));
  });

  it('an ordinary world: what a household remembers of its own buildings is what is there; at 244 it is mostly not; another household\'s stays a glance', () => {
    type Seen = { own: number; ownApart: number; other: number; otherApart: number };
    const survey = (w: World): Seen => {
      const t: Seen = { own: 0, ownApart: 0, other: 0, otherApart: 0 };
      for (const p of w.persons) {
        if (!p.alive || !p.hhId) continue;
        for (const k in p.beliefs) {
          const b = p.beliefs[k as unknown as number];
          const e = w.byId.get(b.id) as Building | undefined;
          if (b.kind !== 'building' || w.tick - b.seen > 2 || !e || e.ent !== 'building' || e.hhId === 0) continue;
          if (isSolidHome(e.type) && !seesInside(p, e)) continue; // a home seen from the yard keeps the old figure (rules 184)
          const exact = JSON.stringify(cloneItems(e.store.items)) === JSON.stringify(b.items ?? {});
          const several = Object.values(e.store.items).some((n) => (n ?? 0) > 1);
          if (e.hhId === p.hhId) { t.own++; if (!exact) t.ownApart++; }
          else if (several) { t.other++; if (!exact) t.otherApart++; }
        }
      }
      return t;
    };
    const at = (version: number): { w: World; seen: Seen } => {
      const w = createWorld({ ...currentWorldSettings('normal', 'aspen', { immigration: true }), rulesVersion: version });
      while (w.tick < 1200) stepWorld(w);
      return { w, seen: survey(w) };
    };
    const now = at(245), before = at(244);
    expect(now.seen.own).toBeGreaterThan(0);
    expect(now.seen.ownApart, 'every fresh sight of a household\'s own building is exact').toBe(0);
    expect(now.seen.other).toBeGreaterThan(0);
    expect(now.seen.otherApart, 'another household\'s store with several of a kind is still a glance').toBe(now.seen.other);
    expect(before.seen.ownApart, 'at 244 it was a glance').toBeGreaterThan(0);
    expect(before.seen.otherApart).toBe(before.seen.other);
    // the same ordinary world, saved and reloaded at 245, goes on as the live one does
    const copy = deserializeWorld(serializeWorld(now.w));
    for (let i = 0; i < 30; i++) { stepWorld(now.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(now.w));
    expect(conservationReport(now.w).ok).toBe(true);
  }, 120000);
});
