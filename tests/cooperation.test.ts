import { describe, expect, it } from 'vitest';
import { BUILD_DEF } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { distToFootprint } from '../src/sim/registry';
import type { ItemKind, Site } from '../src/sim/types';
import { natural, person, run, scene } from './helpers/util';

/** fraction of the recipe that has been supplied (delivered + already worked in) */
function supplied(site: Site): number {
  let f = 1;
  for (const k of Object.keys(site.required) as ItemKind[]) {
    const need = site.required[k] ?? 0;
    if (need > 0) f = Math.min(f, ((site.delivered[k] ?? 0) + (site.used[k] ?? 0)) / need);
  }
  return Math.max(0, Math.min(1, f));
}

describe('cooperation changes the world', () => {
  it('one person builds while another brings materials, and together they finish a hut that neither could alone in that time', () => {
    const w = scene('cooperate');
    const tomas = person(w, 'Tomas');
    const mira = person(w, 'Mira');
    const site = w.sites[0];
    expect(site.type).toBe('hut');
    const seen = new Set<string>();
    let maxGateBreach = 0;
    let deliveredByTomas = false;
    for (let i = 0; i < 900; i++) {
      run(w, 1);
      if (tomas.activity) seen.add('T:' + tomas.activity.kind);
      if (mira.activity) seen.add('M:' + mira.activity.kind);
      if (w.sites.includes(site)) {
        // work can never run ahead of the materials that have actually arrived (plus the small groundwork allowance)
        const cap = site.workTotal * Math.min(1, 0.06 + supplied(site));
        maxGateBreach = Math.max(maxGateBreach, site.work - cap);
        if (tomas.activity?.kind === 'haul') deliveredByTomas = true;
      }
      if (!w.sites.includes(site)) break;
    }
    expect(maxGateBreach).toBeLessThan(1.01);
    expect(deliveredByTomas || seen.has('T:haul')).toBe(true);
    expect(seen.has('M:build') || seen.has('T:build')).toBe(true);
    // the hut exists now and belongs to Mira's household
    expect(w.sites).toHaveLength(0);
    const hut = w.buildings.find((b) => b.type === 'hut');
    expect(hut, 'a hut was built').toBeTruthy();
    expect(hut!.hhId).toBe(mira.hhId);
    expect(w.households.find((h) => h.id === mira.hhId)!.homeId).toBe(hut!.id);
    expect(w.events.some((e) => e.kind === 'build' && /finished a hut/.test(e.text))).toBe(true);
    // both contributed labour or materials
    expect(mira.stats.built + tomas.stats.built).toBeGreaterThan(0);
    expect(w.ledger.reasons['-construction: hut']).toBe(BUILD_DEF.hut.wood + BUILD_DEF.hut.stone);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('without the helper the same hut is much further from done', () => {
    const together = scene('cooperate');
    const alone = scene('cooperate');
    // remove Tomas (and his materials) from the second world
    const t = person(alone, 'Tomas');
    alone.persons.splice(alone.persons.indexOf(t), 1);
    alone.byId.delete(t.id);
    run(together, 330);
    run(alone, 330);
    const progress = (w: typeof together) => {
      const site = w.sites[0];
      return site ? site.work / site.workTotal : 1;
    };
    expect(progress(together)).toBeGreaterThan(progress(alone) + 0.2);
  });

  it('nobody works a site from a distance: every build/haul tick happens within reach of the site', () => {
    const w = scene('cooperate');
    let checked = 0;
    for (let i = 0; i < 700; i++) {
      run(w, 1);
      for (const p of w.persons) {
        const a = p.activity;
        if (!a || a.phase !== 'work') continue;
        if (a.kind !== 'build' && a.kind !== 'haul') continue;
        const e = w.byId.get(a.targetId);
        if (!e) continue;
        checked++;
        expect(distToFootprint(e, p.x, p.y), `${p.name} ${a.kind} at tick ${w.tick}`).toBeLessThan(2.2);
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});

describe('actions happen in space and take time', () => {
  it('nobody teleports during ordinary travel (speed is bounded every single tick)', () => {
    const w = natural('no-teleport');
    const last = new Map<number, [number, number]>();
    let worst = 0;
    for (let i = 0; i < 3000; i++) {
      run(w, 1);
      for (const p of w.persons) {
        const prev = last.get(p.id);
        if (prev) worst = Math.max(worst, Math.hypot(p.x - prev[0], p.y - prev[1]));
        last.set(p.id, [p.x, p.y]);
      }
    }
    expect(worst).toBeLessThan(0.2); // at a full run: 0.13 * 1.42
  });

  it('gathering, drinking and farming are only done at the thing itself', () => {
    const w = natural('in-reach');
    let checked = 0;
    for (let i = 0; i < 2400; i++) {
      run(w, 1);
      for (const p of w.persons) {
        const a = p.activity;
        if (!a || a.phase !== 'work' || !a.targetId) continue;
        if (!['gather', 'till', 'plant', 'tend', 'harvest', 'repair', 'fuel_fire', 'eat_store', 'deposit', 'withdraw', 'craft'].includes(a.kind)) continue;
        const e = w.byId.get(a.targetId);
        if (!e) continue;
        checked++;
        expect(distToFootprint(e, p.x, p.y), `${p.name} ${a.kind}`).toBeLessThan(2.3);
      }
    }
    expect(checked).toBeGreaterThan(300);
  });
});
