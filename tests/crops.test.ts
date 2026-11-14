// Rules 245: households farm tomatoes and corn as well as grain (src/sim/crops.ts; read in farming.ts updatePlots,
// act_farm.ts, economy.ts harvestPlot and pickFood).
// STAGED: a flat world, one farmer beside plots of her own household's, set up by hand. The sowing, ripening, harvesting
// and eating are the engine's.
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity, stepActivity } from '../src/sim/activities';
import { perishableOf, nutritionOf } from '../src/sim/bread_feeds';
import { NUTRITION, PERISHABLE } from '../src/sim/constants';
import { CROP_ORDER, chooseCrop, setCrops } from '../src/sim/crops';
import { conservationReport, pickFood } from '../src/sim/economy';
import { createPlot, updatePlots } from '../src/sim/farming';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Person, Plot, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => setCrops(true));

/** A farmer at (40.5, 40.5) with the plots asked, each of her household's in the state given (staged). */
function fixture(version: number, states: { state: Plot['state']; crop?: 'corn' | 'tomatoes' }[] = []) {
  const s = stage('crops'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 40.5, { age: 32, hunger: 100, thirst: 100, energy: 100, inv: { seeds: 4 } });
  const plots = states.map((o, i) => {
    const pl = createPlot(w, 44 + i * 3, 46, p.hhId);
    pl.state = o.state;
    if (o.state === 'ripe' || o.state === 'growing') pl.progress = o.state === 'ripe' ? 1 : 0.5;
    if (o.crop) pl.crop = o.crop;
    return pl;
  });
  done(s);
  return { s, w, p, plots };
}
const run = (w: World, p: Person, kind: 'plant' | 'harvest', pl: Plot): void => {
  p.x = pl.x + 0.5; p.y = pl.y + 1.2;
  const act = newActivity(w, p, { kind, label: kind, goal: kind, targetId: pl.id, targetType: 'plot', tx: pl.x + 0.5, ty: pl.y + 0.5, spotX: p.x, spotY: p.y, here: true, maxTicks: 2000 });
  startActivity(w, p, act);
  for (let n = 0; n < 1500 && p.activity === act; n++) { w.tick++; stepActivity(w, p); }
};

describe('rules 245: tomatoes and corn are farmed beside grain', () => {
  it('is a supported version and a lab arm', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(245);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(245);
    expect(parseIntervention('rich-no-crops').spec).toBe('rich-no-crops');
  });

  it('A: a plot takes the crop its household has fewest of, in the order grain, corn, tomatoes', () => {
    expect(CROP_ORDER).toEqual(['grain', 'corn', 'tomatoes']);
    const pick = (version: number, others: { state: Plot['state']; crop?: 'corn' | 'tomatoes' }[]) => {
      const f = fixture(version, [...others, { state: 'tilled' }]);
      return chooseCrop(f.w, f.plots[f.plots.length - 1]);
    };
    expect(pick(245, [])).toBe('grain');
    expect(pick(245, [{ state: 'growing' }])).toBe('corn');
    expect(pick(245, [{ state: 'growing' }, { state: 'ripe', crop: 'corn' }])).toBe('tomatoes');
    expect(pick(245, [{ state: 'growing' }, { state: 'growing', crop: 'corn' }, { state: 'ripe', crop: 'tomatoes' }])).toBe('grain');
    expect(pick(245, [{ state: 'tilled' }, { state: 'tilling' }]), 'only growing or ripe plots count').toBe('grain');
    expect(pick(244, [{ state: 'growing' }])).toBe('grain');
    setCrops(false);
    expect(pick(245, [{ state: 'growing' }])).toBe('grain');
  });

  it('B: sowing through the plant activity sets the crop at 245 and not at 244', () => {
    for (const [version, want] of [[245, 'corn'], [244, undefined]] as const) {
      const f = fixture(version, [{ state: 'growing' }, { state: 'tilled' }]);
      const pl = f.plots[1];
      run(f.w, f.p, 'plant', pl);
      expect(pl.state).toBe('growing');
      expect(pl.crop).toBe(want);
    }
  });

  it('B2: with the lab switch off, a plot left carrying a crop is sown without it', () => {
    const f = fixture(245, [{ state: 'tilled', crop: 'corn' }]);
    const pl = f.plots[0];
    expect(pl.crop).toBe('corn');
    setCrops(false);
    run(f.w, f.p, 'plant', pl);
    expect(pl.state).toBe('growing');
    expect(pl.crop).toBeUndefined();
  });

  it('C: a tomato plot ripens to half as much again, and the ledger records tomatoes', () => {
    const ripen = (version: number, crop?: 'tomatoes') => {
      const f = fixture(version, [{ state: 'growing', crop }]);
      const pl = f.plots[0];
      pl.progress = 0.9999; pl.care = 1; pl.careAcc = 0.8;
      for (let i = 0; i < 20000 && pl.state === 'growing'; i++) updatePlots(f.w);
      expect(pl.state).toBe('ripe');
      return { f, pl };
    };
    const g = ripen(245).pl.stock;
    const t = ripen(245, 'tomatoes');
    expect(g).toBeGreaterThan(0);
    expect(t.pl.stock).toBe(Math.round(1.5 * g));
    const led = t.f.w.ledger as unknown as { created?: Record<string, number> };
    expect(JSON.stringify(t.f.w.ledger)).toContain('tomatoes');
    expect(led.created!.tomatoes).toBe(t.pl.stock);
    expect(led.created!.grain ?? 0).toBe(0);
  });

  it('D: harvest puts the crop in the pack and names it in the log', () => {
    const f = fixture(245, [{ state: 'ripe', crop: 'corn' }, { state: 'ripe' }]);
    f.plots[0].stock = 5; f.plots[0].seedStock = 1;
    f.plots[1].stock = 4; f.plots[1].seedStock = 1;
    run(f.w, f.p, 'harvest', f.plots[0]);
    expect(f.p.inv.corn).toBe(5);
    expect(f.p.inv.grain ?? 0).toBe(0);
    expect(f.p.log.some((l) => l.text.includes('Harvested 5 corn and'))).toBe(true);
    run(f.w, f.p, 'harvest', f.plots[1]);
    expect(f.p.inv.grain).toBe(4);
    expect(f.p.log.some((l) => l.text.includes('Harvested 4 grain and'))).toBe(true);
  });

  it('E: tomatoes are eaten before grain is, and the new foods have their worth and spoiling', () => {
    const f = fixture(245);
    expect(pickFood({ tomatoes: 2, grain: 2 }, 60, f.w)).toBe('tomatoes');
    expect(nutritionOf(f.w, 'tomatoes')).toBe(14);
    expect(nutritionOf(f.w, 'corn')).toBe(20);
    expect(NUTRITION.tomatoes).toBe(14);
    expect(NUTRITION.corn).toBe(20);
    expect(perishableOf(f.w, 'tomatoes')).toBe(0.9);
    expect(perishableOf(f.w, 'corn')).toBe(0.3);
    expect(PERISHABLE.corn).toBe(0.3);
  });

  it('F: conservation holds after a tomato harvest', () => {
    const f = fixture(245, [{ state: 'growing', crop: 'tomatoes' }]); // ripened by the engine, so the ledger holds what the plot holds
    f.plots[0].progress = 0.9999; f.plots[0].care = 1;
    for (let i = 0; i < 20000 && f.plots[0].state === 'growing'; i++) updatePlots(f.w);
    const grown = f.plots[0].stock;
    run(f.w, f.p, 'harvest', f.plots[0]);
    expect(f.p.inv.tomatoes).toBeGreaterThan(0);
    expect((f.p.inv.tomatoes ?? 0) + f.plots[0].stock, 'what left the plot is in the pack').toBe(grown);
    expect(conservationReport(f.w).ok).toBe(true);
  });

  it('G: a ripe tomato plot is saved and read back with its crop and the same hash', () => {
    const f = fixture(245, [{ state: 'ripe', crop: 'tomatoes' }]);
    f.plots[0].stock = 6; f.plots[0].seedStock = 1;
    const copy = deserializeWorld(serializeWorld(f.w));
    expect((copy.plots[0] as Plot).crop).toBe('tomatoes');
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
  });

  it('H: a save whose plot grows an unknown crop is refused on load', () => {
    const f = fixture(245, [{ state: 'ripe', crop: 'tomatoes' }]);
    f.plots[0].stock = 6; f.plots[0].seedStock = 1;
    (f.w.plots[0] as unknown as { crop: string }).crop = 'turnips';
    expect(() => deserializeWorld(serializeWorld(f.w))).toThrow('invalid save: a plot grows an unknown crop');
  });
});
