import { faceToward, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { WORK } from './constants';
import { claimPlot, consume, harvestPlot } from './economy';
import { addEvent, addFx, addLog } from './events';
import { createPlot } from './farming';
import { observe } from './knowledge';
import { taskMultiplier, wearFor } from './tools';
import { isFreeLand } from './registry';
import type { Person, Plot, World } from './types';
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

// ───────────────────────── till ─────────────────────────
registerHandler('till', {
  availability: 0.3,
  pose: () => 'till',
  begin(world, p, a) {
    let plot = plotOf(world, a);
    if (!plot) {
      const x = a.data.px as number;
      const y = a.data.py as number;
      if (!isFreeLand(world, x, y) || world.terrain[y * world.W + x] !== T.GRASS) return 'the ground there is no longer free';
      plot = createPlot(world, x, y, a.data.hh as number);
      a.targetId = plot.id;
      addFx(world, 'dust', x + 0.5, y + 0.5, 0);
    }
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
    if (plot) observe(world, p, plot);
  },
});

// ───────────────────────── plant ─────────────────────────
registerHandler('plant', {
  availability: 0.3,
  pose: () => 'plant',
  begin(world, p, a) {
    const plot = plotOf(world, a);
    if (!plot) return 'the plot is gone';
    observe(world, p, plot);
    if (plot.state !== 'tilled') return 'it is not ready for seed';
    if ((p.inv.seeds ?? 0) < 1) return 'no seeds on me';
    if (!claim(world, p, plot, a)) return 'someone else is working that plot';
    a.tx = plot.x + 0.5;
    a.ty = plot.y + 0.5;
    a.duration = Math.round(WORK.plant / p.skills.farm);
  },
  work(world, p, a): WorkResult {
    const plot = plotOf(world, a);
    if (!plot) return 'fail:the plot is gone';
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    if (consume(world, p.inv, 'seeds', 1, 'sown') < 1) return 'fail:no seeds left';
    plot.state = 'growing';
    plot.progress = 0;
    plot.care = 0.6;
    plot.careAcc = 0.6;
    plot.sownTick = world.tick;
    plot.lastTended = world.tick;
    p.stats.farmed++;
    p.skills.farm = Math.min(1.8, p.skills.farm + 0.008);
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
    observe(world, p, plot);
    if (plot.state !== 'growing') return 'nothing growing there to tend';
    if (!claim(world, p, plot, a)) return 'someone else is working that plot';
    a.tx = plot.x + 0.5;
    a.ty = plot.y + 0.5;
    a.duration = Math.round((WORK.tend * taskMultiplier(world, p, 'tend')) / p.skills.farm);
  },
  work(world, p, a): WorkResult {
    const plot = plotOf(world, a);
    if (!plot) return 'fail:the plot is gone';
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress === Math.floor(a.duration / 2)) addFx(world, 'splash', a.tx, a.ty, 0);
    if (a.progress < a.duration) return 'continue';
    let bonus = 0.5;
    if ((p.inv.water ?? 0) >= 1) {
      consume(world, p.inv, 'water', 1, 'watering crops');
      bonus = 1;
    }
    plot.care = Math.min(1, plot.care + bonus);
    plot.lastTended = world.tick;
    p.cooldowns['tend' + plot.id] = world.tick;
    wearFor(world, p, 'tend', a.duration);
    p.stats.farmed++;
    p.skills.farm = Math.min(1.8, p.skills.farm + 0.005);
    observe(world, p, plot);
    return 'done';
  },
  onEnd(world, p, a, outcome) {
    if (outcome === 'success') addLog(world, p, 'work', 'Tended the crops.');
  },
});

// ───────────────────────── harvest ─────────────────────────
registerHandler('harvest', {
  availability: 0.3,
  pose: () => 'harvest',
  begin(world, p, a) {
    const plot = plotOf(world, a);
    if (!plot) return 'the plot is gone';
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
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress % 14 === 7) addFx(world, 'pick', a.tx, a.ty, 0);
    if (a.progress < a.duration) return 'continue';
    const had = plot.stock + plot.seedStock;
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
    return got.grain + got.seeds > 0 ? 'done' : had > 0 ? 'fail:my pack is full' : 'fail:there was nothing left to harvest';
  },
  onEnd(world, p, a, outcome) {
    if (outcome === 'success') {
      addLog(world, p, 'work', `Harvested ${a.data.grain} grain and ${a.data.seeds} seed${a.data.seeds === 1 ? '' : 's'}.`);
      if (!world.stats.firstHarvest) {
        world.stats.firstHarvest = 1;
        addEvent(world, 'farm', `${p.name} brought in the first harvest.`, [p.id], p.x, p.y);
      }
    }
  },
});
