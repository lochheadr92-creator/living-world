// Rules 205, the materials part (light_pack.ts): wood and stone that nothing of this person's needs is put down in their own home
// store when the pack is three quarters full or more. Derivation is pure; the activity is only built if the option is chosen, and it
// is the ordinary deposit. What a site, tool, repair, fire, plan or promise of theirs still wants stays in the pack: the proper place
// for that is where it is wanted.
import { newActivity } from './activities';
import { BUILD_DEF, WEIGHT } from './constants';
import { invWeight, weightOf } from './economy';
import { recentFailure } from './knowledge';
import { MATERIALS_HOME_BASE, PACK_FULL_FRACTION, hasPackMaterials, packFullWorth } from './light_pack';
import { materialNeeds, nightMult, weatherMult } from './options_work';
import { Scorer, addOption, dangerAt, eta, pen, spotNear, traitMods } from './optutil';
import type { Ctx } from './optutil';
import { carryCap } from './people';
import { homeStoreBelief } from './provision';
import { reservedFor } from './reserved_goods';
import type { BuildingType, Items } from './types';

/** How many of this material the person carries beyond every use of their own: needs, promises, plans and an errand. */
export function spareMaterial(ctx: Ctx, k: 'wood' | 'stone', needs = materialNeeds(ctx)): number {
  const { world: w, p } = ctx;
  if (p.errand?.item === k) return 0;
  const needed = needs.filter((n) => n.item === k).reduce((s, n) => s + n.n, 0);
  return Math.max(0, Math.floor((p.inv[k] ?? 0) - reservedFor(w, p, k) - needed));
}

export function materialsHomeOption(ctx: Ctx): void {
  const { world: w, p } = ctx;
  if (!hasPackMaterials(w) || ctx.stage === 'child' || !p.hhId) return;
  if (ctx.drives.hunger > 35 || ctx.drives.thirst > 35 || ctx.drives.energy > 45) return;
  const cap = carryCap(w, p), used = invWeight(p);
  if (used < cap * PACK_FULL_FRACTION) return;
  if ((p.inv.wood ?? 0) < 1 && (p.inv.stone ?? 0) < 1) return;
  const b = homeStoreBelief(p);
  if (!b || recentFailure(w, p, b.id, 320)) return;
  const needs = materialNeeds(ctx);
  let room = BUILD_DEF[(b.btype ?? 'lean_to') as BuildingType].cap - weightOf(b.items ?? {});
  const items: Items = {};
  let total = 0;
  for (const k of ['stone', 'wood'] as const) {
    const n = Math.max(0, Math.min(spareMaterial(ctx, k, needs), Math.floor((room + 1e-9) / WEIGHT[k])));
    if (n >= 1) { items[k] = n; room -= n * WEIGHT[k]; total += n; }
  }
  if (!total) return;
  const walk = eta(ctx, b.x, b.y);
  const sc = new Scorer().add('building materials nothing of mine needs', MATERIALS_HOME_BASE + Math.min(total, 6)).add('my pack is full', packFullWorth(used, cap)).add('walking', -pen(walk));
  const danger = dangerAt(ctx, b.x, b.y);
  if (danger > 0) sc.add('wolf nearby', -22 * danger * traitMods(p).caution);
  if (sc.total < 8) return;
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  const what = Object.keys(items).join(' and ');
  addOption(ctx, {
    kind: 'deposit', label: `Put the spare ${what} down at home`, goal: 'to empty my pack of what nothing of mine needs', need: null, util, parts: sc.parts, eta: walk + 20,
    key: `pack_materials:${b.id}`, targetId: b.id, tag: 'store',
    make: () => {
      const spot = spotNear(w, p, b);
      if (!spot) return null;
      return newActivity(w, p, { kind: 'deposit', label: `Taking spare ${what} home`, goal: 'to empty my pack of what nothing of mine needs', targetId: b.id, targetType: 'building', tx: b.x, ty: b.y, spotX: spot.x, spotY: spot.y, utility: util, minCommit: 30, maxTicks: 600, data: { items, packMaterials: true } });
    },
  });
}
