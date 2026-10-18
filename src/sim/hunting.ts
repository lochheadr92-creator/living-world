// Deer and hunting (rich worlds only). Deer graze at the forest's edge and bolt from anyone who comes near; a hunter who stalks
// one may bring it down for meat, and two or three together far more surely, so a hunt is a reason to go out with others.
// Nothing is created from nothing: meat comes only from a deer that was there, and the herd comes back slowly (wildlife.ts
// spawns a deer now and then up to what the ground holds). Every chance is a hash of the seed, the hunter and the tick.
//
// An authored world has no deer, so no hunt is ever on offer there and its fingerprints are untouched.
import { faceToward, newActivity, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { DAY } from './constants';
import { addItem, ledgerCreate, ledgerSpoil, weightOf } from './economy';
import { addEvent, addFx, addLog } from './events';
import { isRich, think } from './mood';
import { Scorer, addOption, pen } from './optutil';
import type { Ctx } from './optutil';
import { carryCap } from './people';
import { hashString, hashUnit } from './rng';
import { noteDeed } from './reputation';
import type { Animal, Person, World } from './types';
import { hyp } from './util';
import { removeAnimal } from './wildlife';

const key = (world: World): number => hashString(world.seed) ^ 0xdee2;
/** within this distance the hunter tries their luck */
const STRIKE = 2.6;
/** another hunter within this distance is part of the party */
const PARTY_REACH = 9;

/** what a deer yields: meat units for the hunter, one more for each of the party */
const MEAT_PER_DEER = 4;

export function huntOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!isRich(world) || ctx.stage === 'child' || ctx.criticals.length || ctx.dangers.length) return;
  if (p.injury || (p.illness && p.illness.severity > 0.5)) return;
  const food = ctx.food;
  for (const s of p.seen) {
    if (s.ent !== 'animal') continue;
    const a = world.byId.get(s.id);
    if (!a || a.ent !== 'animal' || a.type !== 'deer' || a.health <= 0) continue;
    const d = hyp(s.x - p.x, s.y - p.y);
    if (d > 26) continue;
    if ((p.cooldowns['hunt'] ?? 0) > world.tick) continue;
    let party = 0;
    for (const q of ctx.seenPersons) {
      if (q.child || q.asleep) continue;
      if (hyp(q.x - p.x, q.y - p.y) <= PARTY_REACH) party++;
    }
    const e = (d * 1.18) / Math.max(0.03, ctx.speed);
    const sc = new Scorer();
    sc.add(food < 2 ? 'meat would feed us for days' : 'a deer in sight', Math.max(0, ctx.drives.hunger) * 0.5 + (food < 2 ? 14 : 8));
    sc.add('a good hunter', (p.skills.forage - 1) * 8);
    if (party > 0) sc.add(party > 1 ? 'a hunting party' : 'someone to hunt with', 4 + 3 * Math.min(2, party));
    sc.add('walking', -pen(e) * 0.6);
    if (weightOf(p.inv) + 3 > carryCap(world, p)) sc.add('no room for the meat', -12);
    if (sc.total < 6) continue;
    addOption(ctx, {
      kind: 'hunt',
      label: party > 0 ? 'Hunt the deer with the others' : 'Stalk the deer',
      goal: 'to bring back meat',
      need: 'hunger',
      util: sc.total,
      parts: sc.parts,
      eta: e + 120,
      key: `hunt:${a.id}`,
      targetId: a.id,
      tag: 'food',
      yields: 'meat',
      make: () =>
        newActivity(world, p, {
          kind: 'hunt',
          label: 'Stalking a deer',
          goal: 'to bring back meat',
          need: 'hunger',
          targetId: a.id,
          targetType: 'animal',
          tx: a.x,
          ty: a.y,
          spotX: a.x,
          spotY: a.y,
          utility: sc.total,
          minCommit: 60,
          maxTicks: 900,
          data: { tries: 0 },
        }),
    });
    break; // one deer at a time
  }
}

/** the party: other grown hunters near the hunter at the moment of the strike */
function partyOf(world: World, p: Person): Person[] {
  const out: Person[] = [];
  for (const q of world.persons) {
    if (q === p || !q.alive || q.pose === 'sleep') continue;
    if (hyp(q.x - p.x, q.y - p.y) > PARTY_REACH) continue;
    if (q.activity?.kind === 'hunt' || (q.activity === null && q.needs.energy > 20)) out.push(q);
  }
  return out.slice(0, 3);
}

function strike(world: World, p: Person, a: Animal, act: { data: Record<string, any> }): WorkResult {
  const party = partyOf(world, p);
  const chance = Math.min(0.85, 0.22 + 0.1 * (p.skills.forage - 1) + 0.18 * party.length);
  act.data.tries++;
  if (hashUnit(key(world), p.id * 31 + a.id, world.tick) >= chance) {
    // it bolts; a second try only if it is still close
    a.state = 'retreat';
    a.until = world.tick + 300;
    a.targetId = p.id;
    p.cooldowns['hunt'] = world.tick + 200;
    addFx(world, 'splash', a.x, a.y, 0);
    return 'fail:it got away';
  }
  removeAnimal(world, a);
  p.skills.forage = Math.min(1.8, p.skills.forage + 0.01);
  const names = party.map((q) => q.name);
  const total = MEAT_PER_DEER + party.length;
  const mine = Math.max(1, Math.min(total, Math.floor(carryCap(world, p) - weightOf(p.inv))));
  ledgerCreate(world, 'meat', total, 'hunting');
  addItem(p.inv, 'meat', mine);
  let left = total - mine;
  for (const q of party) {
    if (left <= 0) break;
    const room = Math.floor(carryCap(world, q) - weightOf(q.inv));
    const n = Math.max(0, Math.min(left, room, 2));
    if (n > 0) {
      addItem(q.inv, 'meat', n);
      left -= n;
      addLog(world, q, 'work', `Hunted a deer with ${p.name}: ${n} meat for my share.`);
      think(world, q, 'hunt', 5, DAY, `hunted a deer with ${p.name}`);
      noteDeed(world, q, p, 'generous', `${p.name} shared the deer with ${q.name}`);
    }
  }
  // nobody could carry the rest: lost to the crows, and recorded as such so the ledger still balances
  if (left > 0) ledgerSpoil(world, 'meat', left, 'left on the hunt');
  p.stats.gathered++;
  addEvent(world, 'work', `${p.name}${names.length ? ` and ${names.join(' and ')}` : ''} brought down a deer.`, [p.id, ...party.map((q) => q.id)], a.x, a.y);
  addLog(world, p, 'work', `Brought down a deer${names.length ? ` with ${names.join(' and ')}` : ''}: ${mine} meat.`);
  think(world, p, 'hunt', 8, DAY, 'brought down a deer');
  return 'done';
}

registerHandler('hunt', {
  availability: 0.5,
  pose: () => 'pick',
  begin(world, p, a) {
    const deer = world.byId.get(a.targetId);
    if (!deer || deer.ent !== 'animal' || deer.health <= 0) return 'it is gone';
    a.duration = 40;
  },
  work(world, p, a): WorkResult {
    const deer = world.byId.get(a.targetId);
    if (!deer || deer.ent !== 'animal') return 'fail:it is gone';
    const d = hyp(deer.x - p.x, deer.y - p.y);
    faceToward(p, deer.x, deer.y);
    if (d > STRIKE) {
      // it moved: follow it a little, and give up when it is well away
      if (d > 14 || a.data.tries >= 2) {
        p.cooldowns['hunt'] = world.tick + 400;
        return 'fail:it got away';
      }
      a.tx = deer.x;
      a.ty = deer.y;
      a.spotX = deer.x;
      a.spotY = deer.y;
      a.phase = 'travel';
      a.path = [];
      a.pi = 0;
      return 'continue';
    }
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    a.progress = 0;
    return strike(world, p, deer, a);
  },
});
