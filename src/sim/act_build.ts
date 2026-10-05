import { faceToward, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { BUILD_DEF, FIRE_FUEL_PER_WOOD, FIRE_MAX_FUEL, REPAIR_FALLBACK_GAIN, REPAIR_GAIN, REPAIR_USES, SKILL_MAX, TOOL_RECIPE, WORK, isHomeType, isSolidHome } from './constants';
import { buildingLabel, completeSite, createSite } from './buildings';
import { addItem, claimSlot, consume, invRoom, ledgerCreate } from './economy';
import { addEvent, addFx, addLog } from './events';
import { householdOf } from './buildings';
import { missingMaterials, observe, delBelief } from './knowledge';
import { isFacilityType } from './recipes';
import { isFreeLand } from './registry';
import { mintTool, taskMultiplier, wearFor } from './tools';
import { ageYears, carryCap } from './people';
import { workDrag } from './ageing';
import type { Building, Items, ItemKind, Person, Site, ToolKind, World } from './types';
import { clamp } from './util';
import { itemsToText } from './people';

// ───────────────────────── build ─────────────────────────
function allowedFraction(site: Site): number {
  let f = 1;
  for (const k in site.required) {
    const need = site.required[k as ItemKind] ?? 0;
    if (need <= 0) continue;
    const have = (site.delivered[k as ItemKind] ?? 0) + (site.used[k as ItemKind] ?? 0);
    f = Math.min(f, have / need);
  }
  return clamp(f, 0, 1);
}

function consumeForProgress(world: World, site: Site): void {
  const frac = site.work / site.workTotal;
  for (const k in site.required) {
    const key = k as ItemKind;
    const want = Math.ceil(frac * (site.required[key] ?? 0) - 1e-9);
    const toUse = Math.min(want - (site.used[key] ?? 0), site.delivered[key] ?? 0);
    if (toUse > 0) {
      consume(world, site.delivered, key, toUse, 'construction: ' + site.type.replace('_', ' '));
      addItem(site.used, key, toUse);
    }
  }
}

export function siteStatus(site: Site): string {
  const miss = missingMaterials(site);
  const txt = Object.keys(miss).length ? itemsToText(miss) : '';
  return txt;
}

registerHandler('build', {
  availability: 0.3,
  pose: () => 'build',
  begin(world, p, a) {
    const site = world.byId.get(a.targetId);
    if (!site || site.ent !== 'site') {
      delBelief(p, a.targetId);
      return 'the site is already finished or gone';
    }
    observe(world, p, site);
    const id = claimSlot(world, p.id, site, a.expire - world.tick + 10);
    if (!id) return 'too many people are already working there';
    a.claims.push(id);
    a.tx = site.x + site.w / 2;
    a.ty = site.y + site.h / 2;
    a.data.waited = 0;
  },
  work(world, p, a): WorkResult {
    const site = world.byId.get(a.targetId);
    if (!site || site.ent !== 'site') {
      return a.cycle > 0 ? 'done' : 'fail:the site is gone';
    }
    faceToward(p, a.tx, a.ty);
    const cap = site.workTotal * Math.min(1, 0.06 + allowedFraction(site));
    if (site.work >= cap - 1e-9) {
      const miss = siteStatus(site);
      a.blocked = miss ? `waiting for ${miss}` : 'waiting';
      site.status = a.blocked;
      a.data.waited++;
      if (a.data.waited > 80) return `partial:no materials to work with (${miss})`;
      // standing about is still an honest, visible state
      return 'continue';
    }
    a.data.waited = 0;
    a.blocked = '';
    const rate = (p.skills.build * (p.needs.energy < 25 ? 0.75 : 1) * (1 - 0.1 * world.weather.rain)) / taskMultiplier(world, p, 'build');
    site.work = Math.min(site.workTotal, site.work + rate);
    site.lastWorkTick = world.tick;
    site.status = 'under construction';
    a.progress++;
    a.cycle++;
    wearFor(world, p, 'build', 1);
    if (site.contrib) site.contrib[p.hhId] = (site.contrib[p.hhId] ?? 0) + 1 / 25;
    p.skills.build = Math.min(SKILL_MAX, p.skills.build + 0.0004);
    consumeForProgress(world, site);
    for (const c of p.commitments) if (c.status === 'active' && c.siteId === site.id) c.contrib = (c.contrib ?? 0) + 1;
    if (a.progress % 14 === 7) addFx(world, 'hammer', site.x + site.w / 2, site.y + site.h / 2, 0);
    if (site.work >= site.workTotal - 1e-9) {
      const b = completeSite(world, site, p);
      p.stats.built++;
      addLog(world, p, 'work', `Finished building the ${buildingLabel(b.type)}.`);
      observe(world, p, b);
      delBelief(p, site.id);
      return 'done';
    }
    return 'continue';
  },
  onEnd(world, p, a, outcome, detail) {
    if (a.cycle > 0 && outcome !== 'success') addLog(world, p, 'work', `Worked on the building site for a while (${detail}).`);
  },
});

// ───────────────────────── repair ─────────────────────────
/** Which of their materials a person would mend this building with: the proper one if they have it, else plain wood (poorer work on a finer building). */
export function repairMaterial(b: { type: Building['type'] }, inv: Items): { item: ItemKind; gain: number } | null {
  const pref = REPAIR_USES[b.type];
  if (pref && (inv[pref] ?? 0) > 0) return { item: pref, gain: REPAIR_GAIN };
  if ((inv.wood ?? 0) > 0) return { item: 'wood', gain: pref ? REPAIR_FALLBACK_GAIN : REPAIR_GAIN };
  return null;
}

registerHandler('repair', {
  availability: 0.35,
  pose: () => 'build',
  begin(world, p, a) {
    const b = world.byId.get(a.targetId);
    if (!b || b.ent !== 'building') {
      delBelief(p, a.targetId);
      return 'it is gone';
    }
    observe(world, p, b);
    if (!repairMaterial(b, p.inv)) return 'nothing to patch it with';
    if (b.condition > 90) return 'it is in good shape already';
    a.tx = b.x + b.w / 2;
    a.ty = b.y + b.h / 2;
    a.duration = Math.round((WORK.repair * taskMultiplier(world, p, 'repair') * workDrag(world, p, ageYears(world, p))) / p.skills.build);
  },
  work(world, p, a): WorkResult {
    const b = world.byId.get(a.targetId);
    if (!b || b.ent !== 'building') return 'fail:it is gone';
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress % 14 === 7) addFx(world, 'hammer', a.tx, a.ty, 0);
    if (a.progress < a.duration) return 'continue';
    const mat = repairMaterial(b, p.inv);
    if (!mat) return a.cycle > 0 ? 'partial:ran out of materials' : 'fail:ran out of materials';
    consume(world, p.inv, mat.item, 1, 'repairs');
    b.condition = Math.min(100, b.condition + mat.gain);
    wearFor(world, p, 'repair', a.duration);
    a.cycle++;
    a.progress = 0;
    p.skills.build = Math.min(SKILL_MAX, p.skills.build + 0.003);
    observe(world, p, b);
    if (b.condition >= 92) return 'done';
    if (!repairMaterial(b, p.inv)) return 'partial:ran out of materials';
    return 'continue';
  },
  onEnd(world, p, a) {
    const b = world.byId.get(a.targetId);
    if (a.cycle > 0 && b && b.ent === 'building') {
      for (const c of p.commitments) if (c.status === 'active' && c.kind === 'work' && c.destKind === 'building' && c.destId === b.id) c.contrib = (c.contrib ?? 0) + 40 * a.cycle;
      addLog(world, p, 'work', `Repaired the ${buildingLabel(b.type)} (now ${Math.round(b.condition)}% sound).`);
      if (b.condition >= 92) addEvent(world, 'build', `${p.name} repaired a ${buildingLabel(b.type)}.`, [p.id], b.x, b.y);
    }
  },
});

// ───────────────────────── craft ─────────────────────────
registerHandler('craft', {
  availability: 0.35,
  pose: () => 'craft',
  begin(world, p, a) {
    const tool = a.data.tool as ToolKind;
    const r = TOOL_RECIPE[tool];
    if ((p.inv.wood ?? 0) < r.wood || (p.inv.stone ?? 0) < r.stone) return 'missing materials';
    const b = world.byId.get(a.targetId);
    if (!b || b.ent !== 'building') return 'no workspace';
    a.tx = b.x + b.w / 2;
    a.ty = b.y + b.h / 2;
    a.duration = Math.round((r.work * workDrag(world, p, ageYears(world, p))) / p.skills.craft);
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress % 12 === 6) addFx(world, 'hammer', p.x, p.y, 0);
    if (a.progress < a.duration) return 'continue';
    const tool = a.data.tool as ToolKind;
    const r = TOOL_RECIPE[tool];
    if ((p.inv.wood ?? 0) < r.wood || (p.inv.stone ?? 0) < r.stone) return 'fail:the materials went missing';
    if (invRoom(world, p, tool) < 1) return 'fail:no room to carry it';
    consume(world, p.inv, 'wood', r.wood, 'crafting: ' + tool);
    consume(world, p.inv, 'stone', r.stone, 'crafting: ' + tool);
    mintTool(world, tool, 0, p.hhId, p.id, p.inv, p.id, 'crafted: ' + tool);
    p.stats.crafted++;
    p.skills.craft = Math.min(SKILL_MAX, p.skills.craft + 0.02);
    addLog(world, p, 'work', `Made ${/^[aeiou]/.test(tool) ? 'an' : 'a'} ${tool}.`);
    if (world.tick - (world.stats.lastCraftEvent ?? -9999) > 500) {
      world.stats.lastCraftEvent = world.tick;
      addEvent(world, 'build', `${p.name} made ${/^[aeiou]/.test(tool) ? 'an' : 'a'} ${tool}.`, [p.id], p.x, p.y);
    }
    addFx(world, 'sparkle', p.x, p.y, 0);
    return 'done';
  },
});

// ───────────────────────── lay out a site ─────────────────────────
/** Homes, fires and the storehouse: as many as four at a time, so the roof over a household never waits on a workshop. */
export const MAX_BASIC_SITES = 4;
/** Workshops, halls, granaries and house rebuilds are a settlement's improvement projects; only so many can be carried at once. */
export function projectLimit(world: World): number {
  return world.persons.length >= 55 ? 3 : 2;
}
export const isProjectSite = (s: { type: Building['type']; upgradeOf?: number }): boolean => isFacilityType(s.type) || !!s.upgradeOf;
/** communal projects (workshops, halls, granaries) and household house rebuilds are counted apart: neither crowds out the other */
export function projectsUnderWay(world: World, upgrades = false): number {
  return world.sites.filter((s) => isProjectSite(s) && !!s.upgradeOf === upgrades).length;
}

/** The settlement is only so big: the rules that stop a duplicate or a pile-up of projects. Returns why not, or null. */
export function siteConflict(world: World, type: Building['type'], hh: number, upgradeOf = 0, depositId = 0): string | null {
  if (isFacilityType(type) || upgradeOf) {
    if (projectsUnderWay(world, !!upgradeOf) >= projectLimit(world)) return 'enough improvement projects are under way already';
  } else if (world.sites.filter((s) => !isProjectSite(s)).length >= MAX_BASIC_SITES) return 'too many projects under way already';
  if (upgradeOf) {
    const old = world.byId.get(upgradeOf);
    if (!old || old.ent !== 'building') return 'the home is gone';
    if (old.upgrading) return 'it is already being rebuilt';
    return null;
  }
  if (isFacilityType(type) || type === 'storehouse') {
    // one of each kind of workplace (a second quarry only at a different outcrop)
    for (const b of world.buildings) if (b.type === type && (type !== 'quarry' || (b.ops?.depositId ?? 0) === depositId)) return `there is already a ${BUILD_DEF[type].label}`;
    for (const s of world.sites) if (s.type === type && (type !== 'quarry' || (s.depositId ?? 0) === depositId)) return `a ${BUILD_DEF[type].label} is already being built`;
    return null;
  }
  // homes and fires: one project at a time per household
  if (world.sites.some((s) => s.hhId === hh && (isHomeType(s.type) || s.type === 'fire') && !s.upgradeOf)) return 'someone in the household already started building';
  return null;
}

registerHandler('plan_site', {
  availability: 0.4,
  pose: () => 'build',
  begin(world, p, a) {
    const type = a.data.type as Building['type'];
    const d = BUILD_DEF[type];
    const sx = a.data.sx as number;
    const sy = a.data.sy as number;
    const up = (a.data.upgradeOf as number) ?? 0;
    if (!up) for (let yy = sy; yy < sy + d.h; yy++) for (let xx = sx; xx < sx + d.w; xx++) if (!isFreeLand(world, xx, yy)) return 'the spot is no longer free';
    // someone may have started a project while this person was walking over
    const why = siteConflict(world, type, a.data.hh as number, up, (a.data.depositId as number) ?? 0);
    if (why) return why;
    a.duration = 26;
    a.tx = sx + d.w / 2;
    a.ty = sy + d.h / 2;
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    const type = a.data.type as Building['type'];
    const d = BUILD_DEF[type];
    const sx = a.data.sx as number;
    const sy = a.data.sy as number;
    const up = (a.data.upgradeOf as number) ?? 0;
    if (!up) for (let yy = sy; yy < sy + d.h; yy++) for (let xx = sx; xx < sx + d.w; xx++) if (!isFreeLand(world, xx, yy)) return 'fail:someone built there first';
    const why = siteConflict(world, type, a.data.hh as number, up, (a.data.depositId as number) ?? 0);
    if (why) return `fail:${why}`;
    const site = createSite(world, type, sx, sy, a.data.hh as number, p.id, { upgradeOf: up || undefined, depositId: (a.data.depositId as number) || undefined });
    observe(world, p, site);
    const hh = householdOf(world, p);
    const verb = up ? `marked out the rebuilding of their ${buildingLabel((world.byId.get(up) as Building).type)} as a` : 'marked out a';
    addEvent(world, 'build', `${p.name} ${verb} ${buildingLabel(type)}${hh ? ` for the ${hh.name} household` : ''}.`.replace('a a ', 'a '), [p.id], sx, sy);
    addLog(world, p, 'work', up ? `Marked out the ${buildingLabel(type)} that will replace our home.` : `Marked out a spot for a ${buildingLabel(type)}.`);
    addFx(world, 'built', site.x + site.w / 2, site.y + site.h / 2, 0);
    a.targetId = site.id;
    return 'done';
  },
});

// ───────────────────────── keep a fire going ─────────────────────────
registerHandler('fuel_fire', {
  availability: 0.5,
  pose: () => 'store',
  begin(world, p, a) {
    const f = world.byId.get(a.targetId);
    if (!f || f.ent !== 'building' || f.type !== 'fire') {
      delBelief(p, a.targetId);
      return 'the fire is gone';
    }
    if ((p.inv.wood ?? 0) < 1) return 'no wood to add';
    if (f.fuel >= FIRE_MAX_FUEL * 0.8) {
      observe(world, p, f); // someone has already seen to it
      return 'it is burning well already';
    }
    a.tx = f.x + 0.5;
    a.ty = f.y + 0.5;
    a.duration = 12;
    a.data.wasOut = f.fuel <= 0;
    observe(world, p, f);
  },
  work(world, p, a): WorkResult {
    const f = world.byId.get(a.targetId);
    if (!f || f.ent !== 'building') return 'fail:the fire is gone';
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    if (consume(world, p.inv, 'wood', 1, 'fuel for the fire') < 1) return a.cycle > 0 ? 'done' : 'fail:no wood to add';
    f.fuel = Math.min(FIRE_MAX_FUEL, f.fuel + FIRE_FUEL_PER_WOOD);
    a.cycle++;
    a.progress = 0;
    addFx(world, 'ember', f.x + 0.5, f.y + 0.5, 0);
    observe(world, p, f);
    if (a.cycle >= a.amount || f.fuel >= FIRE_MAX_FUEL * 0.8 || (p.inv.wood ?? 0) < 1) return 'done';
    return 'continue';
  },
  onEnd(world, p, a) {
    const f = world.byId.get(a.targetId);
    if (a.cycle > 0 && f && f.ent === 'building') {
      addLog(world, p, 'work', `Fed the fire with ${a.cycle} log${a.cycle > 1 ? 's' : ''}.`);
      if (a.data.wasOut) addEvent(world, 'survival', `${p.name} relit the fire.`, [p.id], f.x, f.y);
    }
  },
});

// ───────────────────────── move in to an empty house ─────────────────────────
registerHandler('claim_home', {
  availability: 0.4,
  pose: () => 'stand',
  begin(world, p, a) {
    const b = world.byId.get(a.targetId);
    if (!b || b.ent !== 'building') return 'it is gone';
    if (b.hhId !== 0) return 'someone has already moved in';
    a.duration = 16;
    a.tx = b.x + b.w / 2;
    a.ty = b.y + b.h / 2;
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    const b = world.byId.get(a.targetId);
    if (!b || b.ent !== 'building' || b.hhId !== 0) return 'fail:someone has already moved in';
    const hh = householdOf(world, p);
    if (!hh) return 'fail:no household';
    b.hhId = hh.id;
    const cur = hh.homeId ? world.byId.get(hh.homeId) : null;
    if (!cur || (cur.ent === 'building' && (cur.type === 'lean_to' || isSolidHome(b.type)))) hh.homeId = b.id;
    addEvent(world, 'survival', `${p.name} moved into an empty ${buildingLabel(b.type)}.`, [p.id], b.x, b.y);
    observe(world, p, b);
    return 'done';
  },
});

void carryCap;
void ((): Person | null => null);
