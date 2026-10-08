import { DAY } from './constants';
import { inOwnBed, shelterAt } from './needs';
import { isRich, think } from './mood';
import { faceToward, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { addLog } from './events';
import { countBeliefs } from './knowledge';
import { nearLitFire } from './perception';

import { hyp } from './util';
// ───────────────────────── sleep ─────────────────────────
registerHandler('sleep', {
  availability: 0,
  pose: () => 'sleep',
  begin(world, p, a) {
    a.data.energy0 = p.needs.energy;
  },
  work(world, p, a): WorkResult {
    a.progress++;
    const n = p.needs;
    if (n.energy >= 94) {
      a.blocked = 'rested';
      return 'done';
    }
    if (world.light > 0.55 && n.energy >= 62 && a.progress > 120) {
      a.blocked = 'morning came';
      return 'done';
    }
    if (n.thirst < 9) return 'partial:woke up parched';
    if (n.hunger < 7) return 'partial:woke up starving';
    if (n.warmth < 20) {
      if (isRich(world)) p.cooldowns.coldNight = world.tick; // (the household remembers it: a bed is what they will want)
      return 'partial:too cold to sleep';
    }
    return 'continue';
  },
  onEnd(world, p, a, outcome) {
    const gained = Math.round(p.needs.energy - (a.data.energy0 ?? p.needs.energy));
    if (gained > 8) addLog(world, p, 'need', `Slept and recovered ${gained} energy.`);
    if (outcome === 'success' && gained > 20 && inOwnBed(world, p, shelterAt(world, p.x, p.y))) think(world, p, 'bed', 3, DAY / 2, 'slept the night through in a proper bed');
  },
});

// ───────────────────────── rest / warm ─────────────────────────
registerHandler('rest', {
  availability: 0.9,
  pose: () => 'sit',
  begin(world, p, a) {
    a.duration = a.amount > 0 ? a.amount : 150;
  },
  work(world, p, a): WorkResult {
    a.progress++;
    if (a.progress >= a.duration) return 'done';
    // Resting for energy ends once the person is rested. Waiting out the weather in a home (need 'warmth') is also a `rest`, but is not
    // about energy: ending it because the person happens to be rested made them finish after one tick and decide again, every tick.
    if (a.need !== 'warmth' && p.needs.energy >= 98) return 'done';
    return 'continue';
  },
});

registerHandler('warm', {
  availability: 0.95,
  pose: () => 'sit',
  begin(world, p, a) {
    a.duration = a.amount > 0 ? a.amount : 220;
    const f = nearLitFire(world, p.x, p.y, 8);
    if (f) {
      a.tx = f.x + 0.5;
      a.ty = f.y + 0.5;
    }
  },
  work(world, p, a): WorkResult {
    faceToward(p, a.tx, a.ty);
    a.progress++;
    if (a.progress >= a.duration) return 'done';
    if (!nearLitFire(world, p.x, p.y, 6)) return 'partial:the fire went out';
    return 'continue';
  },
});

// ───────────────────────── wander ─────────────────────────
registerHandler('wander', {
  availability: 1,
  pose: () => 'stand',
  begin(world, p, a) {
    a.duration = 18 + Math.floor(((p.id * 31 + world.tick) % 40));
  },
  work(world, p, a): WorkResult {
    a.progress++;
    return a.progress >= a.duration ? 'done' : 'continue';
  },
});

// ───────────────────────── explore ─────────────────────────
registerHandler('explore', {
  availability: 0.5,
  pose: () => 'stand',
  begin(world, p, a) {
    a.duration = 14;
    a.data.known0 = a.data.known0 ?? countBeliefs(p);
  },
  work(world, p, a): WorkResult {
    a.progress++;
    // look around
    p.heading += 0.09;
    return a.progress >= a.duration ? 'done' : 'continue';
  },
  onEnd(world, p, a, outcome) {
    p.lastExploreTick = world.tick;
    const gained = countBeliefs(p) - (a.data.known0 ?? 0);
    if (outcome === 'success' || outcome === 'partial') {
      addLog(world, p, 'info', gained > 0 ? `Explored ${a.data.where ?? 'new ground'} and noticed ${gained} new place${gained > 1 ? 's' : ''}.` : `Explored ${a.data.where ?? 'new ground'}; nothing new turned up.`);
    }
  },
});

// ───────────────────────── flee ─────────────────────────
registerHandler('flee', {
  availability: 0,
  pose: () => 'fear',
  begin(world, p, a) {
    a.duration = 90;
  },
  work(world, p, a): WorkResult {
    a.progress++;
    let threat = false;
    for (const s of p.seen) if (s.ent === 'animal' && hyp(s.x - p.x, s.y - p.y) < 11) threat = true;
    if (!threat && (p.needs.safety > 55 || a.progress > a.duration)) return 'done';
    if (threat) {
      a.progress = Math.max(0, a.progress - 1);
      if (a.progress < 0) a.progress = 0;
    }
    return 'continue';
  },
  onEnd(world, p, a) {
    addLog(world, p, 'danger', 'Made it to safety.');
  },
});

// ───────────────────────── search / visit ─────────────────────────
registerHandler('search', {
  availability: 0.7,
  pose: () => 'stand',
  begin(world, p, a) {
    a.duration = 8;
  },
  work(world, p, a): WorkResult {
    a.progress++;
    p.heading += 0.12;
    return a.progress >= a.duration ? 'done' : 'continue';
  },
});
