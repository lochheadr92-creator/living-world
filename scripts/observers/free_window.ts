// SCRATCH ONLY (free block experiment, 17 November 2026). Read-only: it reads needs, beliefs, positions, poses and activities and writes
// nothing to the world, draws no random number and changes no order.
//
// WINDOW ACCOUNTING. Call `sampleTick(world)` once a tick, before the step, as TimeBudget does. Two windows are accounted in EVERY run,
// whether or not the gate is on, so a control run is counted exactly as a gated one: D starts at day fraction 0.62 and E at 0.50, and
// each runs until the person's own bedtime (0.8 + p.chrono). For people aged 12 and over (AGE_CHILD), every living person-tick inside the
// window (asleep or awake) is counted, and the gate's own pure function says whether it would hold (src/sim/free_block.ts
// freeBlockDetail: not under a CRITICAL need, and a household with a day of food a head as that person believes it). When it does not,
// the failing condition is recorded: urgent need only, household short only, or both. For the ticks where it holds: the TimeBudget
// category (time_budget.ts timeCategory), the activity kind ('none' with no activity), and whether the person is outdoors with at least
// two others within 3 tiles (the OutdoorCompany definition, below).
//
// Also counted, for people of 12 and over and for under 12 apart, over every WAKING tick (pose is not 'sleep', LifeTally's test):
//   company            outdoors (no `indoors` location) with at least two OTHER living people within COMPANY_RADIUS tiles, any pose
//                      (outdoor_company.ts, the same test)
//   hungryNoFood       hunger under 62, no food in the pack (foodUnits(p.inv) = 0) and no food in the household's home store (live; or no
//                      home): day_shape.ts addHungry's definition. Its two age bands must sum to what DayShape counts, and the company
//                      bands to what OutdoorCompany counts: both are checked in the report.
import { ageYears } from '../../src/sim/people';
import { AGE_CHILD } from '../../src/sim/constants';
import { freeBlockDetail } from '../../src/sim/free_block';
import { foodUnits } from '../../src/sim/economy';
import type { Building, Household, Person, World } from '../../src/sim/types';
import { timeCategory } from './time_budget';

export const COMPANY_RADIUS = 3;
export const HUNGRY_BELOW = 62;
export const WINDOWS = [{ name: 'D', from: 0.62 }, { name: 'E', from: 0.5 }] as const;
type Win = { personTicks: number; holds: number; failUrgentOnly: number; failShortOnly: number; failBoth: number; allByCategory: Record<string, number>; holdByCategory: Record<string, number>; holdByKind: Record<string, number>; holdOutdoorCompany: number; holdAwake: number; safe: number; safeByCategory: Record<string, number>; safeByKind: Record<string, number>; safeOutdoorCompany: number };
const bump = (r: Record<string, number>, k: string, n = 1): void => { r[k] = (r[k] ?? 0) + n; };
const newWin = (): Win => ({ personTicks: 0, holds: 0, failUrgentOnly: 0, failShortOnly: 0, failBoth: 0, allByCategory: {}, holdByCategory: {}, holdByKind: {}, holdOutdoorCompany: 0, holdAwake: 0, safe: 0, safeByCategory: {}, safeByKind: {}, safeOutdoorCompany: 0 });
type Band = { waking: number; company: number; hungry: number; hungryNoFood: number };
const newBand = (): Band => ({ waking: 0, company: 0, hungry: 0, hungryNoFood: 0 });

export class FreeWindow {
  readonly windows: Record<string, Win> = Object.fromEntries(WINDOWS.map((w) => [w.name, newWin()]));
  readonly bands: Record<'12_and_over' | 'under_12', Band> = { '12_and_over': newBand(), under_12: newBand() };
  ticks = 0;
  livingPersonTicks = 0;

  sampleTick(world: World): void {
    this.ticks++;
    const tick = world.tick;
    const live = world.persons.filter((p) => p.alive);
    this.livingPersonTicks += live.length;
    const r2 = COMPANY_RADIUS * COMPANY_RADIUS;
    const company = new Int8Array(live.length).fill(-1);
    const companyOf = (i: number): boolean => {
      if (company[i] >= 0) return company[i] === 1;
      const p = live[i];
      let yes = false;
      if (p.indoors === undefined) {
        let near = 0;
        for (let j = 0; j < live.length; j++) {
          if (j === i) continue;
          const dx = live[j].x - p.x, dy = live[j].y - p.y;
          if (dx * dx + dy * dy <= r2 && ++near >= 2) break;
        }
        yes = near >= 2;
      }
      company[i] = yes ? 1 : 0;
      return yes;
    };
    let hhMap: Map<number, Household> | null = null;
    const homeOf = (p: Person): Building | null => {
      hhMap ??= new Map(world.households.map((h) => [h.id, h]));
      const hh = hhMap.get(p.hhId);
      if (!hh || !hh.homeId) return null;
      const e = world.byId.get(hh.homeId);
      return e && e.ent === 'building' ? e : null;
    };
    for (let i = 0; i < live.length; i++) {
      const p = live[i];
      const grown = ageYears(world, p) >= AGE_CHILD;
      if (p.pose !== 'sleep') {
        const band = this.bands[grown ? '12_and_over' : 'under_12'];
        band.waking++;
        if (companyOf(i)) band.company++;
        if (p.needs.hunger < HUNGRY_BELOW) {
          band.hungry++;
          if (foodUnits(p.inv) === 0) {
            const home = homeOf(p);
            if (!home || foodUnits(home.store.items) === 0) band.hungryNoFood++;
          }
        }
      }
      if (!grown) continue;
      let cat: string | null = null;
      for (const win of WINDOWS) {
        const d = freeBlockDetail(world, p, win.from);
        if (!d.inWindow) continue;
        const row = this.windows[win.name];
        row.personTicks++;
        cat ??= timeCategory(p, tick);
        bump(row.allByCategory, cat);
        // the ticks where the UPPER-BOUND gate (no food condition) is on: nobody under a CRITICAL need, whatever the household is believed to hold
        if (!d.urgent) {
          row.safe++;
          bump(row.safeByCategory, cat);
          bump(row.safeByKind, p.activity ? p.activity.kind : 'none');
          if (companyOf(i)) row.safeOutdoorCompany++;
        }
        if (d.urgent || d.short) {
          if (d.urgent && d.short) row.failBoth++;
          else if (d.urgent) row.failUrgentOnly++;
          else row.failShortOnly++;
          continue;
        }
        row.holds++;
        bump(row.holdByCategory, cat);
        bump(row.holdByKind, p.activity ? p.activity.kind : 'none');
        if (companyOf(i)) row.holdOutdoorCompany++;
        if (p.pose !== 'sleep') row.holdAwake++;
      }
    }
  }

  report() {
    const share = (n: number, d: number): number => (d ? Math.round((n / d) * 10000) / 10000 : 0);
    const sorted = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, ticks: v }));
    const windows: Record<string, unknown> = {};
    for (const win of WINDOWS) {
      const r = this.windows[win.name];
      windows[win.name] = {
        from: win.from,
        personTicks: r.personTicks, holds: r.holds, holdShare: share(r.holds, r.personTicks),
        fail: { urgentOnly: r.failUrgentOnly, shortOnly: r.failShortOnly, both: r.failBoth },
        allByCategory: r.allByCategory, holdByCategory: r.holdByCategory, holdByKind: sorted(r.holdByKind),
        holdOutdoorCompany: r.holdOutdoorCompany, holdOutdoorCompanyShare: share(r.holdOutdoorCompany, r.holds), holdAwake: r.holdAwake,
        safe: r.safe, safeShare: share(r.safe, r.personTicks), safeByCategory: r.safeByCategory, safeByKind: sorted(r.safeByKind), safeOutdoorCompany: r.safeOutdoorCompany, safeOutdoorCompanyShare: share(r.safeOutdoorCompany, r.safe),
      };
    }
    return {
      method: 'Read-only window accounting for people aged 12 and over: every living person-tick inside the window (from the window start until the person\'s own bedtime 0.8 + chrono), asleep or awake, counted with src/sim/free_block.ts freeBlockDetail, in every run, gate on or off. Outdoor company: outdoors (no indoors location) with at least two other living people within 3 tiles, any pose. See the header of scripts/observers/free_window.ts.',
      ticks: this.ticks, livingPersonTicks: this.livingPersonTicks,
      windows,
      bands: this.bands,
    };
  }
}
