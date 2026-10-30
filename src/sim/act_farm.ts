import { conditionAt, cultivationPressure, fieldResting, hasEcology, tendCondition } from './ecology';
import { notePractice } from './apprentice';
import { faceToward, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { DAY, WORK } from './constants';
import { claimPlot, consume, harvestPlot } from './economy';
import { noteHarvest } from './occasions';
import { addEvent, addFx, addLog } from './events';
import { createPlot } from './farming';
import { observe } from './knowledge';
import { taskMultiplier, wearFor } from './tools';
import { isFreeLand } from './registry';
import type { Activity, Person, Plot, World } from './types';
import { T } from './types';

function plotOf(world: World, a: { targetId: number }): Plot | null {
  const e = world.byId.get(a.targetId);
  return e && e.ent === 'plot' ? e : null;
}

function claim(world: World, p: Person, plot: Plot, a: { claims: number[]; expire: number }): boolean {
  const id = claimPlot(world, p.id, plot, a.expire - world.tick + 10);
  if (!id) return false;
  a.claims.push(id);
  return true;
}

/** Revalidate the physical plot boundary, including a household/claim change during work. */
function fieldWorkBlocker(w: World, p: Person, pl: Plot, claimed = false): string | undefined {
  if (!hasEcology(w)) return;
  if (p.indoors || Math.hypot(p.x - pl.x - 0.5, p.y - pl.y - 0.5) > 2) return 'not beside the field';
  if (!p.hhId || pl.hhId !== p.hhId) return 'this field belongs to another household';
  if (claimed && (pl.claimedBy !== p.id || ![...w.reservations.values()].some(r => r.kind === 'plot' && r.target === pl.id && r.owner === p.id && r.expires >= w.tick))) return 'no longer holds the field claim';
}
function continuingFieldBlocker(w: World, p: Person, pl: Plot, a: Activity): string | undefined {
  if (!hasEcology(w)) return;
  const blocked = fieldWorkBlocker(w, p, pl, true); if (blocked) return blocked;
  const expected = a.kind === 'till' ? 'tilling' : a.kind === 'plant' || a.data.ecologyRest ? 'tilled' : a.kind === 'harvest' ? 'ripe' : 'growing';
  if (pl.state !== expected) return 'the field changed during work';
  if (a.kind === 'plant' && fieldResting(w, pl)) return 'the field is resting';
}

// ───────────────────────── till ─────────────────────────
registerHandler('till', {
  availability: 0.3,
  pose: () => 'till',
  begin(world, p, a) {
    let plot = plotOf(world, a);
    if (!plot) {
      const x = a.data.px as number;
      const y = a.data.py as number;
      if (hasEcology(world) && (a.data.hh !== p.hhId || !p.hhId || p.indoors || Math.hypot(p.x-x-0.5,p.y-y-0.5)>2)) return 'cannot prepare that household field from here';
      if (!isFreeLand(world, x, y) || world.terrain[y * world.W + x] !== T.GRASS) return 'the ground there is no longer free';
      plot = createPlot(world, x, y, a.data.hh as number);
      a.targetId = plot.id;
      addFx(world, 'dust', x + 0.5, y + 0.5, 0);
    }
    const blocked = fieldWorkBlocker(world, p, plot); if (blocked) return blocked;
    if (plot.state !== 'tilling') return 'the ground is already prepared';
    if (!claim(world, p, plot, a)) return 'someone else is working that plot';
    a.tx = plot.x + 0.5;
    a.ty = plot.y + 0.5;
    a.duration = Math.round((WORK.till * taskMultiplier(world, p, 'till')) / p.skills.farm);
    a.progress = Math.floor(plot.progress * a.duration); // pick up where someone left off
    observe(world, p, plot);
  },
  work(world, p, a): WorkResult {
    const plot = plotOf(world, a);
    if (!plot) return 'fail:the plot is gone';
    const blocked = continuingFieldBlocker(world, p, plot, a); if (blocked) return `fail:${blocked}`;
    faceToward(p, a.tx, a.ty);
    a.progress++;
    plot.progress = Math.min(1, a.progress / a.duration);
    if (a.progress % 16 === 8) addFx(world, 'dust', a.tx, a.ty, 0);
    if (a.progress < a.duration) return 'continue';
    plot.state = 'tilled';
    plot.progress = 0;
    wearFor(world, p, 'till', a.duration);
    p.stats.farmed++;
    p.skills.farm = Math.min(1.8, p.skills.farm + 0.012);
    notePractice(world, p, 'farm', 0.012);
    observe(world, p, plot);
    return 'done';
  },
  onEnd(world, p, a, outcome) {
    const plot = plotOf(world, a);
    if (plot && outcome === 'success') {
      addLog(world, p, 'work', 'Prepared a patch of ground for planting.');
      const hh = world.households.find((h) => h.id === plot.hhId);
      if (hh && world.plots.filter((x) => x.hhId === hh.id).length === 1) addEvent(world, 'farm', `${p.name} broke ground for the first ${hh.name} field.`, [p.id], plot.x, plot.y);
    }
    if (plot && (!hasEcology(world) || (!p.indoors && Math.hypot(p.x-plot.x-0.5,p.y-plot.y-0.5)<=2))) observe(world, p, plot);
  },
});

// ───────────────────────── plant ─────────────────────────
registerHandler('plant', {
  availability: 0.3,
  pose: () => 'plant',
  begin(world, p, a) {
    const plot = plotOf(world, a);
    if (!plot) return 'the plot is gone';
    const blocked = fieldWorkBlocker(world, p, plot); if (blocked) return blocked;
    observe(world, p, plot);
    if (plot.state !== 'tilled') return 'it is not ready for seed';
    if (fieldResting(world, plot)) return 'the field is resting before the next crop';
    if ((p.inv.seeds ?? 0) < 1) return 'no seeds on me';
    if (!claim(world, p, plot, a)) return 'someone else is working that plot';
    a.tx = plot.x + 0.5;
    a.ty = plot.y + 0.5;
    a.duration = Math.round(WORK.plant / p.skills.farm);
  },
  work(world, p, a): WorkResult {
    const plot = plotOf(world, a);
    if (!plot) return 'fail:the plot is gone';
    const blocked = continuingFieldBlocker(world, p, plot, a); if (blocked) return `fail:${blocked}`;
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    if (consume(world, p.inv, 'seeds', 1, 'sown') < 1) return 'fail:no seeds left';
    cultivationPressure(world, plot);
    delete plot.fallowUntil;
    plot.state = 'growing';
    plot.progress = 0;
    plot.care = 0.6;
    plot.careAcc = 0.6;
    plot.sownTick = world.tick;
    plot.lastTended = world.tick;
    p.stats.farmed++;
    p.skills.farm = Math.min(1.8, p.skills.farm + 0.008);
    notePractice(world, p, 'farm', 0.008);
    addFx(world, 'seed', a.tx, a.ty, 0);
    observe(world, p, plot);
    return 'done';
  },
  onEnd(world, p, a, outcome) {
    if (outcome === 'success') addLog(world, p, 'work', 'Sowed a seed.');
  },
});

// ───────────────────────── tend ─────────────────────────
registerHandler('tend', {
  availability: 0.35,
  pose: () => 'tend',
  begin(world, p, a) {
    const plot = plotOf(world, a);
    if (!plot) return 'the plot is gone';
    const blocked = fieldWorkBlocker(world, p, plot); if (blocked) return blocked;
    observe(world, p, plot);
    if (a.data.ecologyRest) {
      if (!hasEcology(world) || plot.state !== 'tilled' || fieldResting(world, plot)) return 'the field is not available to rest';
      if (conditionAt(world, plot.x, plot.y) >= 0.8) return 'the field has already recovered';
    } else if (plot.state !== 'growing') return 'nothing growing there to tend';
    if (!claim(world, p, plot, a)) return 'someone else is working that plot';
    a.tx = plot.x + 0.5;
    a.ty = plot.y + 0.5;
    a.duration = Math.round((WORK.tend * taskMultiplier(world, p, 'tend')) / p.skills.farm);
  },
  work(world, p, a): WorkResult {
    const plot = plotOf(world, a);
    if (!plot) return 'fail:the plot is gone';
    const blocked = continuingFieldBlocker(world, p, plot, a); if (blocked) return `fail:${blocked}`;
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress === Math.floor(a.duration / 2)) addFx(world, !hasEcology(world) || (p.inv.water ?? 0) >= 1 ? 'splash' : 'dust', a.tx, a.ty, 0);
    if (a.progress < a.duration) return 'continue';
    let bonus = 0.5;
    if ((p.inv.water ?? 0) >= 1) {
      consume(world, p.inv, 'water', 1, a.data.ecologyRest ? 'watering rested soil' : 'watering crops');
      bonus = 1;
    }
    tendCondition(world, plot, bonus === 1);
    if (a.data.ecologyRest) {
      plot.fallowUntil = world.tick + 3 * DAY;
      addEvent(world, 'farm', `${p.name} prepared a field for rest before another crop.`, [p.id], plot.x, plot.y);
    } else plot.care = Math.min(1, plot.care + bonus);
    plot.lastTended = world.tick;
    p.cooldowns['tend' + plot.id] = world.tick;
    wearFor(world, p, 'tend', a.duration);
    p.stats.farmed++;
    p.skills.farm = Math.min(1.8, p.skills.farm + 0.005);
    notePractice(world, p, 'farm', 0.005);
    observe(world, p, plot);
    return 'done';
  },
  onEnd(world, p, a, outcome) {
    if (outcome === 'success') addLog(world, p, 'work', a.data.ecologyRest ? 'Prepared the field to rest for three days before another crop.' : 'Tended the crops.');
  },
});

// ───────────────────────── harvest ─────────────────────────
registerHandler('harvest', {
  availability: 0.3,
  pose: () => 'harvest',
  begin(world, p, a) {
    const plot = plotOf(world, a);
    if (!plot) return 'the plot is gone';
    const blocked = fieldWorkBlocker(world, p, plot); if (blocked) return blocked;
    observe(world, p, plot);
    if (plot.state !== 'ripe') return 'it is not ripe';
    if (!claim(world, p, plot, a)) return 'someone else is harvesting it';
    a.tx = plot.x + 0.5;
    a.ty = plot.y + 0.5;
    a.duration = Math.round(WORK.harvest / p.skills.farm);
  },
  work(world, p, a): WorkResult {
    const plot = plotOf(world, a);
    if (!plot) return 'fail:the plot is gone';
    const blocked = continuingFieldBlocker(world, p, plot, a); if (blocked) return `fail:${blocked}`;
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress % 14 === 7) addFx(world, 'pick', a.tx, a.ty, 0);
    if (a.progress < a.duration) return 'continue';
    const got = harvestPlot(world, plot, p);
    a.cycle = got.grain + got.seeds;
    p.stats.farmed++;
    p.skills.farm = Math.min(1.8, p.skills.farm + 0.012);
    if (plot.stock <= 0 && plot.seedStock <= 0) {
      plot.state = 'tilled';
      plot.progress = 0;
      plot.careAcc = 0.5;
    }
    a.data.grain = got.grain;
    a.data.seeds = got.seeds;
    observe(world, p, plot);
    return got.grain + got.seeds > 0 ? 'done' : 'fail:cannot carry any more';
  },
  onEnd(world, p, a, outcome) {
    if (outcome === 'success') {
      addLog(world, p, 'work', `Harvested ${a.data.grain} grain and ${a.data.seeds} seed${a.data.seeds === 1 ? '' : 's'}.`);
      noteHarvest(world, a.data.grain as number);
      if (!world.stats.firstHarvest) {
        world.stats.firstHarvest = 1;
        addEvent(world, 'farm', `${p.name} brought in the first harvest.`, [p.id], p.x, p.y);
      }
    }
  },
});
