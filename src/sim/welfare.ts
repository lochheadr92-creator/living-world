import { faceToward, newActivity, registerHandler } from './activities';
import type { WorkResult } from './activities';
import { DAY, workRules } from './constants';
import { carryCap, isDependent, stageOf } from './people';
import { addEvent, addLog } from './events';
import { transfer } from './economy';
import { Scorer, addBlocked, addOption, eta, pen, traitMods, whereIs } from './optutil';
import type { Ctx } from './optutil';
import { personById } from './registry';
import { onGift, surplusOf } from './social';
import type { Concern, ItemKind, Items, Person, World } from './types';

import { hyp } from './util';
/**
 * Looking after each other.
 *
 * A worry about someone exists only because the worrier saw them in a bad way, or was told by someone who had (with the
 * original sighting's age carried along). Nobody knows about an injury, a hunger or a death they have not seen or been
 * told of. A worry leads to a visit only if the worrier can actually do something (they carry food or water, are not in need
 * themselves, and are close enough to the person to care); the visit looks at how things really are — if help is needed,
 * the supplies change hands; if not, the worry is dropped and nobody checks on that person again for a while.
 */
export const MAX_CONCERNS = 6;
export const CONCERN_LIFE = Math.round(DAY * 0.7);
export const CHECK_COOLDOWN = Math.round(DAY * 0.6);
/** how long a sighting of a grown person who was hungry, thirsty or cold stays worth walking over for: by then they will have seen to it themselves */
export const SELF_FIX_WINDOW = 480;

const KIND_WORD: Record<Concern['kind'], string> = { hungry: 'hungry', thirsty: 'thirsty', cold: 'cold', hurt: 'hurt', tired: 'worn out', missing: 'out of sight' };

/** a worry about someone who can look after themselves, over a need they will have met by now */
function outOfDate(world: World, c: Concern, subject: Person | undefined): boolean {
  if (!subject) return true;
  const age = world.tick - c.seen;
  if (age >= CONCERN_LIFE) return true;
  return c.kind !== 'hurt' && c.kind !== 'missing' && age > SELF_FIX_WINDOW && !isDependent(world, subject);
}

/** Called now and then for each person: note anyone in view who looks to be in a bad way, and let go of worries that are out of date. */
export function noteConcerns(world: World, p: Person): void {
  const tick = world.tick;
  p.concerns = p.concerns.filter((c) => !outOfDate(world, c, personById(world, c.about)));
  for (const s of p.seen) {
    if (s.ent !== 'person') continue;
    const have = p.concerns.find((c) => c.about === s.id);
    const kind: Concern['kind'] | null = s.hurt ? 'hurt' : s.thirsty ? 'thirsty' : s.hungry ? 'hungry' : null;
    if (!kind) {
      // they are fine now: whatever worry there was is settled by what was just seen
      if (have && have.seen < tick) p.concerns = p.concerns.filter((c) => c.about !== s.id);
      continue;
    }
    if (have) {
      have.kind = kind;
      have.seen = tick;
      have.src = 'seen';
      have.from = p.id;
    } else {
      p.concerns.push({ about: s.id, kind, seen: tick, src: 'seen', from: p.id, checked: -99999 });
      if (p.concerns.length > MAX_CONCERNS) p.concerns.sort((a, b) => b.seen - a.seen), (p.concerns.length = MAX_CONCERNS);
    }
  }
}

/** A worry passed on: the listener keeps the original sighting's time and who first saw it. */
export function shareConcerns(world: World, S: Person, L: Person): number {
  let n = 0;
  for (const c of S.concerns) {
    if (c.about === L.id || c.about === S.id) continue;
    if (c.kind === 'missing') continue;
    if (world.tick - c.seen > CONCERN_LIFE * 0.7) continue;
    // worth saying only if the listener would care: family, housemate, or a friend of the person
    const subject = personById(world, c.about);
    if (!subject || outOfDate(world, c, subject)) continue;
    const rel = L.relations[c.about];
    const cares = subject.hhId === L.hhId || !!rel?.kin || (rel?.affinity ?? 0) >= 15;
    if (!cares) continue;
    if (L.concerns.some((x) => x.about === c.about && x.seen >= c.seen)) continue;
    L.concerns = L.concerns.filter((x) => x.about !== c.about);
    L.concerns.push({ about: c.about, kind: c.kind, seen: c.seen, src: 'told', from: S.id, checked: -99999 });
    if (L.concerns.length > MAX_CONCERNS) L.concerns.sort((a, b) => b.seen - a.seen), (L.concerns.length = MAX_CONCERNS);
    addLog(world, L, 'social', `${S.name} told me ${subject.name} looked ${KIND_WORD[c.kind]} not long ago.`);
    n++;
    break;
  }
  return n;
}

function suppliesFor(world: World, p: Person, kind: Concern['kind']): Items | null {
  const items: Items = {};
  if (kind === 'hungry' || kind === 'hurt') {
    for (const k of ['bread', 'fish', 'fruit', 'grain', 'berries', 'smoked'] as ItemKind[]) {
      const sur = surplusOf(world, p, k);
      if (sur >= 1) {
        items[k] = Math.min(sur, 2);
        break;
      }
    }
  }
  if (kind === 'thirsty' || kind === 'hurt') {
    if (surplusOf(world, p, 'water') >= 1) items.water = 1;
  }
  return Object.keys(items).length ? items : null;
}

export function welfareOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.stage === 'child' || !workRules(world.settings.scene)) return;
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 45 || ctx.criticals.length) return;
  const tm = traitMods(p);
  // dependents that nobody has laid eyes on for a good while are worth a look
  for (const d of ctx.dependents) {
    const wh = p.whereabouts[d.id];
    const unseen = !wh || world.tick - wh.tick > 1100;
    const known = p.concerns.some((c) => c.about === d.id);
    if (unseen && !known && (p.cooldowns['check' + d.id] ?? 0) <= world.tick) p.concerns.push({ about: d.id, kind: 'missing', seen: world.tick - 600, src: 'seen', from: p.id, checked: -99999 });
  }
  if (p.concerns.length > MAX_CONCERNS) p.concerns.length = MAX_CONCERNS;
  for (const c of p.concerns) {
    const subject = personById(world, c.about);
    if (!subject || !subject.alive) continue;
    if ((p.cooldowns['check' + c.about] ?? 0) > world.tick) {
      continue;
    }
    if (outOfDate(world, c, subject)) continue;
    // already in sight: the ordinary offering and caring options deal with it
    if (ctx.seenPersons.some((s) => s.id === c.about)) continue;
    const rel = p.relations[c.about];
    const kin = !!rel?.kin || subject.hhId === p.hhId;
    const dependent = isDependent(world, subject);
    const aff = rel?.affinity ?? 0;
    const cares = kin || aff >= 15 || (dependent && p.traits.generosity > 0.6);
    if (!cares) {
      addBlocked(ctx, 'visit', `Check on ${subject.name}`, subject.id, 'they are not close enough to go looking', 'care');
      continue;
    }
    const supplies = c.kind === 'missing' ? null : suppliesFor(world, p, c.kind);
    if (c.kind !== 'missing' && !supplies) {
      addBlocked(ctx, 'visit', `Bring something to ${subject.name}`, subject.id, `has nothing to spare for someone ${KIND_WORD[c.kind]}`, 'care');
      continue;
    }
    const loc = whereIs(ctx, c.about, 0);
    if (!loc) {
      addBlocked(ctx, 'visit', `Check on ${subject.name}`, subject.id, 'does not know where they are', 'care');
      continue;
    }
    const age = world.tick - c.seen;
    const sev = c.kind === 'hurt' ? 1 : c.kind === 'thirsty' ? 0.9 : c.kind === 'hungry' ? 0.75 : c.kind === 'missing' ? 0.45 : 0.4;
    const fresh = Math.max(0.25, 1 - age / CONCERN_LIFE);
    const e = eta(ctx, loc.x, loc.y);
    const sc = new Scorer()
      .add(c.kind === 'missing' ? `has not seen ${subject.name} for a while` : `${subject.name} looked ${KIND_WORD[c.kind]}${c.src === 'told' ? ` (so I was told)` : ''}`, (12 + 26 * sev * fresh) * tm.give)
      .add('walking', -pen(e));
    if (kin) sc.add('family', 7);
    if (dependent) sc.add('someone who cannot manage alone', 6);
    if (ctx.night && !kin) sc.add('night', -8);
    if (sc.total < 8) continue;
    const goal = supplies ? `to bring ${Object.keys(supplies).join(' and ')} to ${subject.name}` : `to see how ${subject.name} is`;
    addOption(ctx, {
      kind: 'visit',
      label: supplies ? `Bring ${Object.keys(supplies).join(' and ')} to ${subject.name}` : `Look in on ${subject.name}`,
      goal,
      need: null,
      util: sc.total,
      parts: sc.parts,
      eta: e + 40,
      key: `visit:${c.about}`,
      targetId: c.about,
      tag: 'care',
      make: () =>
        newActivity(world, p, {
          kind: 'visit',
          label: supplies ? `Taking ${Object.keys(supplies).join(' and ')} to ${subject.name}` : `Looking in on ${subject.name}`,
          goal,
          targetId: c.about,
          targetType: 'person',
          tx: loc.x,
          ty: loc.y,
          spotX: loc.x,
          spotY: loc.y,
          utility: sc.total,
          minCommit: 40,
          maxTicks: 700,
          data: { about: c.about, concern: c.kind, items: supplies ?? {}, since: c.seen, from: c.src, sticky: true }, // seeing them on the way is no reason to turn back: the visit is what looks at how they really are
        }),
    });
  }
}

registerHandler('visit', {
  availability: 0.5,
  pose: () => 'stand',
  begin(world, p, a) {
    const t = personById(world, a.targetId);
    if (!t) return 'they are no longer around';
    a.duration = 12;
    // arrived at where they were expected: look around (the ordinary perception has just refreshed what is in view)
    // standing where they were expected, they can see (or not) who is there: anyone this close is in plain view
    if (hyp(t.x - p.x, t.y - p.y) > 5) {
      // not there: forget the old place, and worry less (not more) each time they cannot be found
      delete p.whereabouts[t.id];
      const c = p.concerns.find((x) => x.about === t.id);
      if (c) {
        c.checked = world.tick;
        if (c.kind === 'missing') p.concerns = p.concerns.filter((x) => x !== c);
      }
      p.cooldowns['check' + t.id] = world.tick + Math.round(CHECK_COOLDOWN * 0.5);
      return `${t.name} was not where I expected`;
    }
    a.tx = t.x;
    a.ty = t.y;
  },
  work(world, p, a): WorkResult {
    const t = personById(world, a.targetId);
    if (!t) return 'fail:they are no longer around';
    faceToward(p, t.x, t.y);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    // how are they, really?
    const needs = { hungry: t.needs.hunger < 48, thirsty: t.needs.thirst < 46, hurt: t.health < 62 };
    const wanted = (a.data.items ?? {}) as Record<string, number>;
    const give: Items = {};
    if (needs.hungry || needs.hurt) for (const k of Object.keys(wanted) as ItemKind[]) if (k !== 'water') give[k] = Math.min(wanted[k], p.inv[k] ?? 0);
    if ((needs.thirsty || needs.hurt) && (wanted.water ?? 0) > 0) give.water = Math.min(wanted.water, p.inv.water ?? 0);
    const concern = p.concerns.find((c) => c.about === t.id);
    // nothing wrong after all: the worry is dropped, and nobody goes to check on them again for a while
    if (!needs.hungry && !needs.thirsty && !needs.hurt) {
      p.concerns = p.concerns.filter((c) => c.about !== t.id);
      p.cooldowns['check' + t.id] = world.tick + CHECK_COOLDOWN * 2;
      addLog(world, p, 'social', `Looked in on ${t.name}: they were fine.`);
      a.data.outcome = 'fine';
      a.cycle = 1;
      return 'done';
    }
    let moved = 0;
    const got: Items = {};
    for (const k of Object.keys(give) as ItemKind[]) {
      const n = give[k] ?? 0;
      if (n <= 0) continue;
      const m = transfer(world, p.inv, t.inv, carryCap(world, t), k, n, 'person:' + p.id, 'person:' + t.id, 'looked after');
      if (m > 0) got[k] = m;
      moved += m;
    }
    if (moved > 0) {
      onGift(world, p, t, got, 'care');
      const what = (Object.keys(got) as ItemKind[]).map((k) => `${got[k]} ${k}`).join(' and ');
      addEvent(world, 'social', `${p.name} looked in on ${t.name}, who had looked ${KIND_WORD[(a.data.concern as Concern['kind'] | undefined) ?? concern?.kind ?? 'hungry']}, and brought ${what}.`, [p.id, t.id], t.x, t.y);
      t.cooldowns.fedUntil = world.tick + 120;
      p.concerns = p.concerns.filter((c) => c.about !== t.id);
      p.cooldowns['check' + t.id] = world.tick + CHECK_COOLDOWN;
      a.data.outcome = 'helped';
      a.cycle = 1;
      return 'done';
    }
    // in need, and nothing to give after all
    if (concern) concern.checked = world.tick;
    p.cooldowns['check' + t.id] = world.tick + Math.round(CHECK_COOLDOWN * 0.7);
    return 'fail:they needed something I did not have on me';
  },
  onEnd(world, p, a, outcome, detail) {
    const t = personById(world, a.targetId);
    if (!t) return;
    if (a.data.outcome === 'helped') addLog(world, p, 'social', `Found ${t.name} in need and helped.`);
    else if (outcome === 'failed') addLog(world, p, 'social', `Went to see ${t.name}: ${detail}.`);
  },
});

void stageOf;
