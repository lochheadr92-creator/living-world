// Free-time split (read only). Where waking time goes, by activity kind and label, in three age bands, so "company plus leisure"
// (about 11 to 13% of waking time at 12 and over since rules 256; scripts/observers/time_budget.ts lumps by kind only) can be split into
// chosen talk, called gatherings, evenings at the fire, play, teaching and time alone. Also counted: where children under 8 and of
// 8 to 11 are in the dark, and waking time spent at or going to a hall. The world is only read: nothing is written into it and nothing is
// drawn from its random stream (the check is the hash of a run with and without the watcher, tests/free_time_split.test.ts).
//
//   npx vite-node scripts/free_time_split.ts -- --seed meadow --days 20 --out C:/dev/lw_labs/free_time/fresh-meadow.json
//   npx vite-node scripts/free_time_split.ts -- --load C:/dev/lw_saves/rules256/aspen-day96.save.json --rules-up 279 --days 5 --out ...
//   then: npx vite-node scripts/free_time_report.ts -- a.json b.json ...
//
// Every --sample ticks (default 5) each living person is read once, before the step. Awake = pose not 'sleep' and activity not 'sleep'.
// The label is kept as a template: every capitalised word after the first becomes '@', so "Talking with Brigid" is "Talking with @".
// Dark = world.light < 0.5 (FETCH_DARK, fetch_home.ts, the definition the night count of 26 November used); indoors = Person.indoors.
// At a hall = standing inside a hall's footprint, or the activity aimed at a hall (targetId of a hall building).
import { ageYears } from '../../src/sim/people';
import type { Person, World } from '../../src/sim/types';

export type Band = 'u8' | 'c8_11' | 'a12';
export interface SplitTally {
  samples: number;
  awake: Record<Band, number>;
  asleep: Record<Band, number>;
  /** `${band}|${kind}|${phase}|${label template}` -> sampled person-ticks */
  kinds: Record<string, number>;
  /** `${band}|${asleep|awake}_${in|out}` over dark samples, for children only */
  dark: Record<string, number>;
  /** `${band}|${kind}|${phase}` of awake samples at or going to a hall */
  hall: Record<string, number>;
  halls: number[];
}
const bandOf = (w: World, p: Person): Band => { const y = ageYears(w, p); return y < 8 ? 'u8' : y < 12 ? 'c8_11' : 'a12'; };
const bump = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };
const templates = new Map<string, string>();
export function template(label: string): string {
  let t = templates.get(label);
  if (t === undefined) {
    t = label.replace(/\b[A-Z][a-z']+(?: (?:I|II|III|IV|V|VI|VII|VIII|IX|X))?\b/g, (m, off: number) => (off === 0 ? m : '@'));
    templates.set(label, t);
  }
  return t;
}
export const emptyTally = (): SplitTally => ({ samples: 0, awake: { u8: 0, c8_11: 0, a12: 0 }, asleep: { u8: 0, c8_11: 0, a12: 0 }, kinds: {}, dark: {}, hall: {}, halls: [] });

const inside = (b: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;

/** Read every living person once. Reads only; call before stepWorld. */
export function observeFreeTime(w: World, t: SplitTally): void {
  t.samples++;
  const halls = w.buildings.filter((b) => b.type === 'hall');
  const hallIds = new Set(halls.map((b) => b.id));
  for (const b of halls) if (!t.halls.includes(b.id)) t.halls.push(b.id);
  const dark = w.light < 0.5;
  for (const p of w.persons) {
    if (!p.alive) continue;
    const band = bandOf(w, p);
    const a = p.activity;
    const asleep = p.pose === 'sleep' || a?.kind === 'sleep';
    if (dark && band !== 'a12') bump(t.dark, `${band}|${asleep ? 'asleep' : 'awake'}_${p.indoors ? 'in' : 'out'}`);
    if (asleep) { t.asleep[band]++; continue; }
    t.awake[band]++;
    const key = a ? `${a.kind}|${a.phase}|${template(a.label)}` : 'none|none|';
    bump(t.kinds, `${band}|${key}`);
    if (halls.length && (a && hallIds.has(a.targetId) && a.targetType === 'building' || halls.some((b) => inside(b, p.x, p.y))))
      bump(t.hall, `${band}|${a ? `${a.kind}|${a.phase}` : 'none|none'}`);
  }
}
