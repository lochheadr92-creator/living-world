// SCRATCH ONLY (regime experiment, 17 November 2026). Read-only: it reads positions, poses and the indoors field and writes
// nothing to the world.
//
// Per tick, for every living person who is awake (pose is not 'sleep', the same test LifeTally uses for waking time):
//   waking      one tick
//   outdoors    the person has no `indoors` location (types.ts: "absent means outdoors")
//   company     outdoors, with at least two OTHER living people within COMPANY_RADIUS tiles (straight-line distance between
//               positions; the others may be asleep or indoors, as the task words it)
//   companyVisible  the stricter reading, kept beside it: the two others are themselves awake and outdoors
//   hub         `company`, and the person stands within HUB_RADIUS tiles of the nearest settlement centre (settlements.ts nearestHub)
// Split by part of day from environment.ts phaseName: dawn and morning are 'morning', afternoon is 'afternoon', evening and dusk
// are 'evening', night is 'night'.
import { dayFraction, phaseName } from '../../src/sim/environment';
import { nearestHub } from '../../src/sim/settlements';
import type { World } from '../../src/sim/types';

export const COMPANY_RADIUS = 3;
export const HUB_RADIUS = 8;
export const DAY_PARTS = ['morning', 'afternoon', 'evening', 'night'] as const;
export type DayPart = (typeof DAY_PARTS)[number];
type Row = { waking: number; outdoors: number; company: number; companyVisible: number; hub: number; hubVisible: number };
const zero = (): Row => ({ waking: 0, outdoors: 0, company: 0, companyVisible: 0, hub: 0, hubVisible: 0 });

export function dayPart(tick: number): DayPart {
  const n = phaseName(dayFraction(tick));
  return n === 'dawn' || n === 'morning' ? 'morning' : n === 'afternoon' ? 'afternoon' : n === 'evening' || n === 'dusk' ? 'evening' : 'night';
}

export class OutdoorCompany {
  readonly parts: Record<DayPart, Row> = { morning: zero(), afternoon: zero(), evening: zero(), night: zero() };
  ticks = 0;

  sampleTick(world: World): void {
    this.ticks++;
    const row = this.parts[dayPart(world.tick)];
    const live = world.persons.filter((p) => p.alive);
    const r2 = COMPANY_RADIUS * COMPANY_RADIUS;
    const h2 = HUB_RADIUS * HUB_RADIUS;
    for (const p of live) {
      if (p.pose === 'sleep') continue;
      row.waking++;
      if (p.indoors !== undefined) continue;
      row.outdoors++;
      let near = 0;
      let nearVisible = 0;
      for (const q of live) {
        if (q === p) continue;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        if (dx * dx + dy * dy > r2) continue;
        near++;
        if (q.pose !== 'sleep' && q.indoors === undefined) nearVisible++;
      }
      if (near < 2) continue;
      row.company++;
      if (nearVisible >= 2) row.companyVisible++;
      const hub = nearestHub(world, p.x, p.y);
      const hx = hub.x - p.x;
      const hy = hub.y - p.y;
      if (hx * hx + hy * hy <= h2) {
        row.hub++;
        if (nearVisible >= 2) row.hubVisible++;
      }
    }
  }

  report() {
    const total = zero();
    for (const k of DAY_PARTS) for (const f of Object.keys(total) as (keyof Row)[]) total[f] += this.parts[k][f];
    const share = (n: number, d: number): number => (d ? Math.round((n / d) * 10000) / 10000 : 0);
    const shares = (r: Row) => ({ outdoors: share(r.outdoors, r.waking), company: share(r.company, r.waking), companyVisible: share(r.companyVisible, r.waking), hub: share(r.hub, r.waking), hubVisible: share(r.hubVisible, r.waking) });
    return {
      method: `Per tick, awake living people (pose not sleep). company: outdoors (no indoors location) with at least two other living people within ${COMPANY_RADIUS} tiles. hub: company, within ${HUB_RADIUS} tiles of the nearest settlement centre. companyVisible and hubVisible: the two others awake and outdoors too. Shares are of waking person-ticks in that part of the day.`,
      ticks: this.ticks,
      counts: { ...this.parts, all: total },
      shares: { morning: shares(this.parts.morning), afternoon: shares(this.parts.afternoon), evening: shares(this.parts.evening), night: shares(this.parts.night), all: shares(total) },
    };
  }
}
