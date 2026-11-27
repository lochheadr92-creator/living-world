import { FIRE_TICKS, eveningFireWork, finishEveningSit, isEveningSit } from './evening_fire';
import { sleepsTillMorning } from './bedtime';
import { finishHallEvening, isHallEvening } from './hall_repair';
import { courtWalkBegin, courtWalkEnd, courtWalkWork, isCourtWalk } from './courting';
import { praiseAtFire } from './praise';
import { songAtFire } from './song';
import { speakAtFire } from './speak_for';
import { isReunion, reunionBegin, reunionWork } from './reunion';
import { lyingInBegin, lyingInWork } from './birth_help';
import { vigilBegin, vigilEnd, vigilWork } from './vigil';
import { griefBegin, griefEnd, griefWork } from './grief_sit';
import { settleBegin, settleEnd, settleWork } from './settle_child';
import { sideBegin, sideWork } from './standing_up';
import { TOY_TICKS, finishToyPlay, isToyPlay } from './toys';
import { isThreat } from './wildlife';
import { isBoundedNightWait } from './night_wait';
import {runsRulesVersion} from './rulesversion';
import { distToFootprint } from './registry';
import { faceToward, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { addLog } from './events';
import { countBeliefs } from './knowledge';
import { noteHaunt } from './leisure';
import { SOLO_TICKS, finishSoloPlay, isSoloPlay } from './play';
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
    // rules 280 (bedtime.ts, part `bed`): a little one asleep sleeps till the morning light, however rested
    if (n.energy >= 94 && !sleepsTillMorning(world, p)) {
      a.blocked = 'rested';
      return 'done';
    }
    if (world.light > 0.55 && n.energy >= 62 && a.progress > 120) {
      a.blocked = 'morning came';
      return 'done';
    }
    if (n.thirst < 9) return 'partial:woke up parched';
    if (n.hunger < 7) return 'partial:woke up starving';
    if (n.warmth < 20) return 'partial:too cold to sleep';
    return 'continue';
  },
  onEnd(world, p, a) {
    const gained = Math.round(p.needs.energy - (a.data.energy0 ?? p.needs.energy));
    if (gained > 8) addLog(world, p, 'need', `Slept and recovered ${gained} energy.`);
  },
});

// ───────────────────────── rest / warm ─────────────────────────
registerHandler('rest', {
  availability: 0.9,
  pose: () => 'sit',
  begin(world, p, a) {
    a.duration = a.amount > 0 ? a.amount : 150;
    // rules 261 (birth_help.ts): a woman near her time lying in by her door
    if (a.data.lyingIn !== undefined) lyingInBegin(world, p, a);
    // rules 261 (vigil.ts): sitting up beside somebody who is ill or hurt
    if (a.data.vigil !== undefined) return vigilBegin(world, p, a);
    // rules 263 (grief_sit.ts, settle_child.ts): sitting with somebody who has lost one of theirs, and settling a small child for the night
    if (a.data.grief !== undefined) return griefBegin(world, p, a);
    if (a.data.settle !== undefined) return settleBegin(world, p, a);
    // rules 264 (standing_up.ts): walking over to speak up for one side of a quarrel
    if (a.data.side !== undefined) return sideBegin(world, p, a);
  },
  work(world, p, a): WorkResult {
    if (a.data.lyingIn !== undefined) return lyingInWork(world, p, a);
    if (a.data.vigil !== undefined) return vigilWork(world, p, a);
    if (a.data.grief !== undefined) return griefWork(world, p, a);
    if (a.data.settle !== undefined) return settleWork(world, p, a);
    if (a.data.side !== undefined) return sideWork(world, p, a);
    if (isBoundedNightWait(world, a)) {
      const shelter = world.byId.get(a.targetId);
      if (!shelter || shelter.ent !== 'building') return 'fail:the shelter is no longer there';
      if (distToFootprint(shelter, p.x, p.y) > 3) return 'partial:no longer at the shelter';
      if (shelter.type === 'fire' && shelter.fuel <= 0) return 'partial:the fire went out';
      if (world.tick >= a.data.daylightAt) { a.blocked = 'daylight arrived'; return 'done'; }
      a.progress++;
      return 'continue';
    }
    if(a.data.projectWait&&runsRulesVersion(world,69)){
      const plan=p.intentions.find(i=>i.id===a.data.forPlan&&i.status==='active'&&i.project);
      if(!plan)return 'partial:the project is no longer active';
      const known=p.beliefs[a.targetId]?.ops;
      if(!known||known.client!==p.id||!known.burn)return 'partial:no longer expecting that batch';
      if(world.tick>=known.readyAt){a.blocked='time to check the batch';return 'done';}
    }
    a.progress++;
    if (a.progress >= a.duration) return 'done';
    // Resting for energy ends once the person is rested. Waiting out the weather in a home (need 'warmth') is also a `rest`, but is not
    // about energy: ending it because the person happens to be rested made them finish after one tick and decide again, every tick.
    if (a.need !== 'warmth' && !(a.data.projectWait&&runsRulesVersion(world,69)) && p.needs.energy >= 98) return 'done';
    return 'continue';
  },
  onEnd(world, p, a, outcome, detail) {
    if (a.data.vigil !== undefined) vigilEnd(world, p, a, outcome, detail); // rules 261 (vigil.ts): one line if it was long enough
    if (a.data.grief !== undefined) griefEnd(world, p, a, outcome, detail); // rules 263 (grief_sit.ts)
    if (a.data.settle !== undefined) settleEnd(world, p, a); // rules 263 (settle_child.ts)
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
    // rules 211 (play.ts): a child playing alone stays at it for a set while
    if (isSoloPlay(a.data.play)) a.duration = SOLO_TICKS;
    // rules 215 (toys.ts): a child playing with a toy stays at it for a set while
    if (isToyPlay(a.data.play)) a.duration = TOY_TICKS;
    // rules 216 (evening_fire.ts): an evening by the fire lasts a set while
    if (isEveningSit(a)) a.duration = FIRE_TICKS;
    // rules 281 (hall_repair.ts, part evening): an evening at the hall lasts as long
    if (isHallEvening(a)) a.duration = FIRE_TICKS;
    // rules 260 (courting.ts): a walk out together stands for a set while
    if (isCourtWalk(a)) courtWalkBegin(a);
    // rules 262 (reunion.ts): they have got to the one they ran to meet: a reunion, or nothing (they were gone)
    if (isReunion(a)) return reunionBegin(world, p, a);
    // version 27: they have arrived at a place they chose for spare time, so it counts as somewhere they have been lately
    if (a.data.haunt) noteHaunt(world, p, a.data.haunt);
  },
  work(world, p, a): WorkResult {
    // rules 260 (courting.ts): a walk out together has its own count, and ends early if the other is called away
    if (isCourtWalk(a)) return courtWalkWork(world, p, a);
    // rules 262 (reunion.ts): standing with them for a little after the meeting
    if (isReunion(a)) return reunionWork(world, p, a);
    a.progress++;
    // rules 260 (praise.ts): halfway through, a thanks owed or due is spoken in place of the story; otherwise (rules 264, speak_for.ts) a candidate for a shared building
    // with nobody to coordinate it may speak for it; otherwise (rules 216) a story may be told; and with none of these done at this sitting (rules 262, song.ts) a song may be started
    if (isEveningSit(a) && !praiseAtFire(world, p, a) && !speakAtFire(world, p, a) && !eveningFireWork(world, p, a)) songAtFire(world, p, a);
    return a.progress >= a.duration ? 'done' : 'continue';
  },
  onEnd(world, p, a, outcome) {
    if (outcome === 'success' && isSoloPlay(a.data.play)) finishSoloPlay(world, p, a.data.play);
    if (outcome === 'success' && isEveningSit(a)) finishEveningSit(world, p, a);
    if (outcome === 'success' && isHallEvening(a)) finishHallEvening(world, p, a);
    if (outcome === 'success' && isToyPlay(a.data.play)) finishToyPlay(world, p);
    // rules 260 (courting.ts): however a walk out ends, it is settled once, by the one who asked
    if (isCourtWalk(a)) courtWalkEnd(world, p, a, outcome);
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
    for (const s of p.seen) if (isThreat(world, s) && hyp(s.x - p.x, s.y - p.y) < 11) threat = true;
    if (!threat && (p.needs.safety > 55 || a.progress > a.duration)) return 'done';
    if (threat) {
      a.progress = Math.max(0, a.progress - 1);
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
