import { newActivity } from './activities';
import { BUILD_DEF } from './constants';
import { pickFood } from './economy';
import { Scorer, addBlocked, addOption, beliefsByKind, countBeliefsOfKind, eta, pen, sourceUsable, traitMods } from './optutil';
import type { Ctx, Option } from './optutil';
import { fractionAvailable, hhState } from './options_work';
import { isDependent, stageOf } from './people';
import { MAX_ACTIVE_COMMITMENTS, activeCommitments, helpersOn, outstandingFor, surplusOf, valueOf, isFood } from './social';
import { wantsAmends } from './grievance';
import { ACCOUNT_LIFE } from './reputation';
import { mournOptions } from './grief';
import { mealOptions } from './meals';
import { welfareOptions } from './welfare';
import { toolsHeldBy } from './toolreg';
import type { ConvData } from './social';
import { hashUnit } from './rng';
import { spark } from './relations';
import { yearTicks } from './ageing';
import type { Belief, ConvPurpose, ItemKind, Items, Person, SeenEntity } from './types';
import { clamp } from './util';

interface Cand {
  s: SeenEntity;
  q: Person;
  aff: number;
  fam: number;
  d: number;
}

function candidates(ctx: Ctx, includeAvoided = false): Cand[] {
  const { world, p } = ctx;
  const out: Cand[] = [];
  for (const s of ctx.seenPersons) {
    if (s.asleep || s.busyTalking) continue;
    if (s.act === 'flee' || s.act === 'argue' || s.act === 'converse') continue;
    const e = world.byId.get(s.id);
    if (!e || e.ent !== 'person' || !e.alive) continue;
    const rel = p.relations[s.id];
    if (!includeAvoided && rel && rel.avoidUntil > world.tick) continue;
    if ((p.cooldowns['talk' + s.id] ?? 0) > world.tick) continue;
    out.push({ s, q: e, aff: rel?.affinity ?? 0, fam: rel?.familiarity ?? 0, d: Math.hypot(s.x - p.x, s.y - p.y) });
  }
  return out;
}

function mkSocial(ctx: Ctx, c: Cand, purpose: ConvPurpose, conv: ConvData, label: string, goal: string, need: Option['need'], sc: Scorer, tag: string, keySuffix = ''): void {
  const { world, p } = ctx;
  const q = c.q;
  const e = (c.d * 1.18) / Math.max(0.03, ctx.speed);
  addOption(ctx, {
    kind: 'socialize',
    label,
    goal,
    need,
    util: sc.total,
    parts: sc.parts,
    eta: e + 70,
    key: `socialize:${q.id}:${purpose}${keySuffix}`,
    targetId: q.id,
    tag,
    make: () => {
      const dx = p.x - c.s.x;
      const dy = p.y - c.s.y;
      const d = Math.hypot(dx, dy) || 1;
      const sx = c.s.x + (dx / d) * 1.35;
      const sy = c.s.y + (dy / d) * 1.35;
      return newActivity(world, p, {
        kind: 'socialize',
        label,
        goal,
        need,
        targetId: q.id,
        targetType: 'person',
        tx: c.s.x,
        ty: c.s.y,
        spotX: sx,
        spotY: sy,
        utility: sc.total,
        minCommit: 40,
        maxTicks: 420,
        data: { purpose, conv },
      });
    },
  });
}

// ───────────────────────── chat ─────────────────────────
function optChat(ctx: Ctx): void {
  const { p } = ctx;
  if (ctx.stage === 'child' && ctx.dependents.length === 0 && false) return;
  const tm = traitMods(p);
  const sd = ctx.drives.social;
  const cands = candidates(ctx).filter((c) => (c.s.hungry || c.s.thirsty ? false : true) || c.aff > 20);
  const scored: { c: Cand; sc: Scorer }[] = [];
  for (const c of cands) {
    if (c.d > 13) continue;
    const sc = new Scorer();
    sc.add('wants company', sd * tm.social * 0.85);
    // a relaxed chat when nothing presses, mostly in the evening around the fire
    if (sd <= 0 && ctx.night) sc.add('evening company', 3.4 * (p.traits.sociability - 0.15));
    sc.add(c.aff >= 20 ? 'a friend' : c.fam < 4 ? 'someone new' : 'a neighbour', sd > 0 ? c.aff * 0.12 + (c.fam < 4 ? 3 * p.traits.curiosity : 0) : 0);
    // two unattached adults who are drawn to each other seek out one another's company
    if (!p.partnerId && !c.q.partnerId && ctx.stage !== 'child' && ctx.stage !== 'youth' && stageOf(ctx.world, c.q) !== 'child' && stageOf(ctx.world, c.q) !== 'youth' && !p.relations[c.q.id]?.kin && spark(p, c.q, yearTicks(ctx.world)) && c.aff > -5) {
      sc.add('drawn to each other', (ctx.night ? 9 : 4.5) + Math.max(0, c.aff) * 0.05);
    }
    sc.add('close by', sd > 0 ? Math.max(0, 6 - c.d) * 0.6 : 0);
    sc.add('walking', -pen((c.d * 1.18) / Math.max(0.03, ctx.speed)));
    if (sc.total > 6) scored.push({ c, sc });
  }
  scored.sort((a, b) => b.sc.total - a.sc.total);
  for (const { c, sc } of scored.slice(0, 2)) {
    mkSocial(ctx, c, 'chat', {}, `Chat with ${c.q.name}`, 'to catch up and share news', 'social', sc, 'social');
  }
}

// ───────────────────────── asking for help ─────────────────────────
function optRequest(ctx: Ctx): void {
  const { world, p } = ctx;
  const cands = candidates(ctx);
  if (!cands.length) return;
  const bestSelf = (need: 'hunger' | 'thirst'): number => {
    let best = 0;
    // only options that actually put food or water in hand count as solving it alone (searching does not)
    for (const o of ctx.options) if (o.need === need && o.util > best && (o.tag === 'food' || o.tag === 'water')) best = o.util;
    return best;
  };
  const tryNeed = (need: 'hunger' | 'thirst', reqKind: 'food' | 'water', itemCheck: (s: SeenEntity) => boolean, label: string) => {
    const dr = ctx.drives[need];
    if (dr < 26) return;
    const self = bestSelf(need);
    // only ask when there is no good way to solve it alone
    if (self > dr * 0.62) return;
    for (const c of cands) {
      if (c.d > 14) continue;
      if ((p.asked[c.q.id] ?? -9999) > world.tick - 650) {
        addBlocked(ctx, 'socialize', `Ask ${c.q.name} for ${label}`, c.q.id, 'asked them recently', 'request');
        continue;
      }
      let plaus = 0.18;
      if (itemCheck(c.s)) plaus = 1;
      else if (c.q.hhId === p.hhId) plaus = 0.7;
      else if (c.aff >= 25) plaus = 0.5;
      else if (dr >= 70) plaus = 0.32;
      if (plaus < 0.3) continue;
      const sc = new Scorer();
      sc.add(need === 'hunger' ? 'hungry' : 'thirsty', dr * 0.72 * plaus);
      sc.add(itemCheck(c.s) ? 'they are carrying some' : c.q.hhId === p.hhId ? 'family' : c.aff >= 25 ? 'a friend' : 'worth a try', plaus * 4);
      sc.add('walking', -pen((c.d * 1.18) / Math.max(0.03, ctx.speed)) * 0.6);
      const kind = stageOf(world, p) === 'child' ? 'care' : reqKind;
      mkSocial(ctx, c, 'request', { reqKind: kind as ConvData['reqKind'], item: reqKind === 'water' ? 'water' : null, amount: 2 }, `Ask ${c.q.name} for ${label}`, `to get ${label}`, need, sc, 'request', ':' + reqKind);
    }
  };
  tryNeed('hunger', 'food', (s) => s.carrying.some((k) => isFood(k)), 'food');
  tryNeed('thirst', 'water', (s) => s.carrying.includes('water'), 'water');

  // a home that is failing, with nobody in the household able to mend it: ask a neighbour who can
  const homeB = ctx.home ? p.beliefs[ctx.home.id] : undefined;
  const nobodyAble = ctx.members.every((m) => stageOf(world, m) === 'child' || stageOf(world, m) === 'elder');
  if (homeB && nobodyAble && (homeB.cond ?? 100) < 55 && (p.inv.wood ?? 0) < 1 && (p.inv.planks ?? 0) < 1 && (p.cooldowns.askRepair ?? 0) <= world.tick && ctx.stage !== 'child') {
    for (const c of cands) {
      if (c.d > 12 || c.s.child) continue;
      const q = c.q;
      if (stageOf(world, q) === 'child') continue;
      if ((p.asked[q.id] ?? -9999) > world.tick - 900) continue;
      const rel = p.relations[q.id];
      if (!rel?.kin && c.aff < 5) continue;
      const sc = new Scorer().add('the roof is failing and there is no one here who can mend it', 22).add('walking', -pen(c.d * 6));
      mkSocial(ctx, c, 'request', { reqKind: 'repair', item: 'wood', amount: 1, destKind: 'building', destId: homeB.id, purpose: 'the roof is failing', milestone: 'sound again' } as ConvData, `Ask ${q.name} to mend the roof`, 'to keep a roof over our heads', null, sc, 'request', ':repair');
      p.cooldowns.askRepair = world.tick + 600;
      break;
    }
  }

  // a tool that stands between me and the work I have in mind: ask to borrow one from someone seen carrying it
  const tw = ctx.toolWanted;
  if (tw && (p.cooldowns['askTool' + tw.kind] ?? 0) <= world.tick && activeCommitments(p).length < MAX_ACTIVE_COMMITMENTS) {
    for (const c of cands) {
      if (c.d > 12 || !c.s.carrying.includes(tw.kind)) continue;
      if ((p.asked[c.q.id] ?? -9999) > world.tick - 650) continue;
      const trust = p.relations[c.q.id]?.trust ?? 10;
      if (trust < 12 && c.aff < 10) continue;
      const sc = new Scorer().add(`need a ${tw.kind} to ${tw.for}`, 20 * traitMods(p).work).add('they are carrying one', 4).add('walking', -pen(c.d * 6));
      mkSocial(ctx, c, 'request', { reqKind: 'tool', toolKind: tw.kind, item: tw.kind, amount: 1, purpose: tw.for }, `Ask ${c.q.name} to lend a ${tw.kind}`, `to ${tw.for}`, null, sc, 'request', ':tool:' + tw.kind);
      p.cooldowns['askTool' + tw.kind] = world.tick + 300;
    }
  }

  // building materials for a site I am working on (only worth asking when I cannot easily fetch them myself)
  if ((p.cooldowns.askMaterials ?? 0) > world.tick) return;
  if (activeCommitments(p).length >= MAX_ACTIVE_COMMITMENTS + 2) return;
  for (const b of beliefsByKind(p, ['site'])) {
    if (b.hh !== p.hhId) continue;
    for (const item of Object.keys(b.need ?? {}) as ItemKind[]) {
      const miss = b.need?.[item] ?? 0;
      if (miss <= 0 || (p.inv[item] ?? 0) >= miss) continue;
      // what other people have already promised to bring is not asked for again
      const already = outstandingFor(world, p.id, item, b.id);
      if (already >= miss - (p.inv[item] ?? 0)) continue;
      const selfFetch = ctx.options.some((o) => (o.kind === 'gather' || o.kind === 'operate' || o.kind === 'withdraw') && o.tag === 'site' && o.eta < 260);
      if (selfFetch) continue;
      for (const c of cands) {
        if (c.d > 12 || !c.s.carrying.includes(item)) continue;
        if ((p.asked[c.q.id] ?? -9999) > world.tick - 650) continue;
        const raw = item === 'wood' || item === 'stone';
        const sc = new Scorer().add(`the building needs ${item}`, 24 * traitMods(p).work).add('they are carrying some', 4).add('walking', -pen(c.d * 6));
        mkSocial(
          ctx,
          c,
          'request',
          { reqKind: raw ? item : 'goods', item, amount: Math.max(1, Math.min(miss - already, 4)), siteId: b.id, purpose: `for the ${(b.btype ?? 'building').replace('_', '-')}`, destKind: 'site', destId: b.id },
          `Ask ${c.q.name} for ${item}`,
          `to finish the ${(b.btype ?? 'building').replace('_', '-')}`,
          null,
          sc,
          'request',
          ':' + item,
        );
      }
    }
  }
}

// ───────────────────────── asking what people know ─────────────────────────
function optAskInfo(ctx: Ctx): void {
  const { world, p } = ctx;
  const cands = candidates(ctx);
  if (!cands.length) return;
  // what do I need but not know how to find?
  const wants: { kind: 'food' | 'wood' | 'stone' | 'water'; drive: number }[] = [];
  // do they actually lack any idea where food could be found? (a source they remember with food left counts)
  const foodBeliefs = beliefsByKind(p, ['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot']);
  const leads1 = foodBeliefs.filter((b) => sourceUsable(ctx, b, 1).ok).length;
  const leads2 = foodBeliefs.filter((b) => sourceUsable(ctx, b, 2).ok).length;
  const hs = hhState(ctx);
  // hungry now: any lead at all is enough to act on; merely worried about stocks: they want a couple of good ones
  if ((ctx.drives.hunger > 20 && leads1 < 1) || (ctx.drives.hunger <= 20 && hs.shortage > 0.45 && leads2 < 2)) wants.push({ kind: 'food', drive: Math.max(ctx.drives.hunger, 18 + 30 * hs.shortage) });
  if (ctx.drives.thirst > 18 && ctx.water < 1 && countBeliefsOfKind(p, 'water') === 0) wants.push({ kind: 'water', drive: Math.max(30, ctx.drives.thirst) });
  const needsWood = beliefsByKind(p, ['site']).some((b) => b.hh === p.hhId && (b.need?.wood ?? 0) > 0) || (!ctx.home && ctx.stage !== 'child');
  if (needsWood && countBeliefsOfKind(p, 'tree') < 2) wants.push({ kind: 'wood', drive: 22 });
  const needsStone = beliefsByKind(p, ['site']).some((b) => b.hh === p.hhId && (b.need?.stone ?? 0) > 0);
  if (needsStone && countBeliefsOfKind(p, 'rock') < 1) wants.push({ kind: 'stone', drive: 22 });
  for (const w of wants) {
    for (const c of cands) {
      if (c.d > 14) continue;
      if ((p.asked[c.q.id] ?? -9999) > world.tick - 500) continue;
      const sc = new Scorer().add(`does not know where to find ${w.kind}`, w.drive * 0.62).add(c.aff >= 20 ? 'a friend' : 'someone to ask', 2 + c.aff * 0.05).add('walking', -pen((c.d * 1.18) / Math.max(0.03, ctx.speed)) * 0.6);
      mkSocial(ctx, c, 'ask_info', { infoKind: w.kind }, `Ask ${c.q.name} where to find ${w.kind}`, `to learn where ${w.kind} can be found`, null, sc, 'info', ':' + w.kind);
    }
  }
  void world;
}

// ───────────────────────── warning others ─────────────────────────
function optWarn(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!ctx.dangers.length) return;
  // only first-hand sightings are worth running over to announce; hearsay spreads through ordinary chat
  const fresh = ctx.dangers.filter((b) => world.tick - b.seen < 600 && b.src === 'seen');
  if (!fresh.length) return;
  const tm = traitMods(p);
  for (const c of candidates(ctx, true)) {
    if (c.d > 11) continue;
    // do not repeat the warning
    const told = fresh.every((b) => p.told[c.q.id * 1_000_000 + b.id] !== undefined && world.tick - p.told[c.q.id * 1_000_000 + b.id] < 3500);
    if (told) continue;
    const sc = new Scorer().add('saw a wolf recently', 26 * tm.give * (0.8 + 0.4 * p.traits.caution)).add('walking', -pen((c.d * 1.18) / Math.max(0.03, ctx.speed)) * 0.5);
    if (c.s.child) sc.add('a child', 6);
    mkSocial(ctx, c, 'warn', {}, `Warn ${c.q.name} about the wolf`, 'to keep them safe', null, sc, 'warn');
  }
}

// ───────────────────────── spontaneous generosity ─────────────────────────
function optOffer(ctx: Ctx): void {
  const { world, p } = ctx;
  const tm = traitMods(p);
  for (const c of candidates(ctx, true)) {
    if (c.d > 12) continue;
    const q = c.q;
    const kin = p.relations[q.id]?.kin;
    const needFood = c.s.hungry;
    const needWater = c.s.thirsty;
    if (!needFood && !needWater) continue;
    if (c.s.carrying.some((k) => k === 'berries' || k === 'fruit' || k === 'fish' || k === 'grain') && !c.s.child && !c.s.hurt) {
      // they have food of their own; they just have not eaten yet
      if (needFood && !needWater) continue;
    }
    const items: Items = {};
    let label = '';
    if (needFood) {
      const k = pickFood(p.inv, q.needs.hunger) as ItemKind | null;
      if (k && surplusOf(world, p, k) >= 1) {
        items[k] = Math.min(surplusOf(world, p, k), q.needs.hunger < 25 ? 3 : 2);
        label = k;
      }
    }
    if (needWater && surplusOf(world, p, 'water') >= 1) {
      items.water = 1;
      label = label ? label + ' and water' : 'water';
    }
    if (!label) continue;
    const rel = p.relations[q.id];
    const angry = rel && rel.avoidUntil > world.tick;
    if (angry && p.traits.generosity < 0.55) continue; // only the big-hearted offer to someone they have quarrelled with
    const sev = needFood ? clamp((50 - q.needs.hunger) / 50, 0, 1) : clamp((50 - q.needs.thirst) / 50, 0, 1);
    const sc = new Scorer().add(`${q.name} looks ${needFood ? 'hungry' : 'thirsty'}`, (14 + 26 * sev) * tm.give);
    if (c.s.child) sc.add('a child', 10);
    if (kin) sc.add('family', 7);
    sc.add('friendship', Math.max(0, c.aff) * 0.12);
    if (angry) sc.add('making peace', 4);
    sc.add('walking', -pen((c.d * 1.18) / Math.max(0.03, ctx.speed)) * 0.6);
    mkSocial(ctx, c, 'offer', { items }, `Offer ${label} to ${q.name}`, `to help ${q.name}`, null, sc, 'offer');
  }
  void isDependent;
}

// ───────────────────────── making peace ─────────────────────────
/**
 * Amends are only attempted while there is an open grievance with a cause, and only a few times (see grievance.ts). Once it is
 * settled there is nothing to apologise for until something new happens.
 */
function optReconcile(ctx: Ctx): void {
  const { world, p } = ctx;
  for (const c of candidates(ctx, true)) {
    const rel = p.relations[c.q.id];
    if (!rel || rel.kin) continue;
    if (!wantsAmends(world, p, c.q)) continue;
    // the quarrel has to have cooled a little first
    if (world.tick < rel.grievance!.since + 260) continue;
    if (c.d > 11) continue;
    const gentle = 0.35 + 0.65 * p.traits.generosity;
    const g = rel.grievance!;
    const sc = new Scorer().add(g.cause === 'broken_promise' ? 'wants to put right a broken promise' : 'wants to patch things up', (10 + 0.12 * g.weight) * gentle * 1.4).add('walking', -pen(c.d * 6));
    if (p.traits.sociability > 0.5) sc.add('misses the company', 3);
    if (sc.total < 7) continue;
    mkSocial(ctx, c, 'apologize', {}, `Make peace with ${c.q.name}`, `to settle things: ${g.detail}`, null, sc, 'peace');
  }
}

// ───────────────────────── stepping in ─────────────────────────
/**
 * Someone who knows two people have fallen out (they saw it, or were told, and it is recent but no longer raw), likes them both and
 * is not sore at either may go and talk one of them round. Only what the mediator holds as an account is used to find the quarrel;
 * whether it is still live is for the other person to say.
 */
function optMediate(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.stage === 'child') return;
  if (p.traits.sociability < 0.35) return;
  if (!p.accounts.length) return;
  for (const c of candidates(ctx)) {
    if (c.aff < 8) continue;
    if (p.relations[c.q.id]?.grievance) continue;
    for (const a of p.accounts) {
      if (a.kind !== 'quarreled' && a.kind !== 'broke') continue;
      const age = world.tick - a.at;
      if (age < 40 || age > ACCOUNT_LIFE) continue;
      const otherId = a.about === c.q.id ? a.toward : a.toward === c.q.id ? a.about : 0;
      if (!otherId || otherId === p.id) continue;
      const other = world.byId.get(otherId);
      if (!other || other.ent !== 'person' || !other.alive) continue;
      const rel = p.relations[otherId];
      if ((rel?.affinity ?? 0) < 0 || rel?.grievance) continue;
      if ((p.cooldowns['mediate' + c.q.id + ':' + otherId] ?? 0) > world.tick) continue;
      const sc = new Scorer()
        .add(`cares about ${c.q.name} and ${other.name}, who have fallen out`, 7 + 5 * p.traits.generosity + 3 * p.traits.sociability)
        .add('friendship', (c.aff + (rel?.affinity ?? 0)) * 0.04)
        // most quarrels fade by themselves within a day or so, so the time to step in is soon after it has cooled
        .add('before it sets', 12 * clamp(1 - (age - 40) / 1900, 0, 1))
        .add('walking', -pen(c.d * 6));
      if (sc.total < 9) continue;
      world.stats.medOffered = (world.stats.medOffered ?? 0) + 1;
      mkSocial(ctx, c, 'mediate', { otherId }, `Talk ${c.q.name} round about ${other.name}`, `to help ${c.q.name} and ${other.name} make up`, null, sc, 'peace', ':' + otherId);
      break;
    }
  }
}

// ───────────────────────── recruiting help ─────────────────────────
function optRecruit(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.stage === 'child') return; // asking grown-ups to help with the building is for grown-ups
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30) return;
  const sites = beliefsByKind(p, ['site']).filter((b) => b.hh === p.hhId);
  if (!sites.length) return;
  const site = sites[0] as Belief;
  const siteEnt = world.byId.get(site.id);
  // no use asking for hands where there is nothing to do with them yet: the site is waiting on materials
  if ((site.progress ?? 0) >= Math.min(1, 0.06 + fractionAvailable(site)) - 0.02) return;
  const cap = (siteEnt && siteEnt.ent === 'site' ? siteEnt.maxWorkers : 3) + 1;
  const committedNow = helpersOn(world, site.id);
  if (committedNow >= Math.min(2, cap)) return;
  for (const c of candidates(ctx)) {
    if (c.d > 12 || c.s.child) continue;
    if (c.q.commitments.some((cm) => cm.status === 'active' && cm.siteId === site.id)) continue;
    if (activeCommitments(c.q).length >= MAX_ACTIVE_COMMITMENTS) continue;
    if ((p.asked[c.q.id] ?? -9999) > world.tick - 900) continue;
    if (c.aff < 8 && c.q.hhId !== p.hhId) continue;
    const sc = new Scorer().add('could use a hand with the building', 15 * traitMods(p).work + 0.1 * c.aff).add('walking', -pen(c.d * 6));
    mkSocial(ctx, c, 'recruit', { siteId: site.id }, `Ask ${c.q.name} to help with the ${(site.btype ?? 'building').replace('_', '-')}`, 'to share the building work', null, sc, 'recruit');
  }
}

// ───────────────────────── moving in together ─────────────────────────
function optPropose(ctx: Ctx): void {
  const { world, p } = ctx;
  if (world.settings.scene !== 'natural') return; // staged test scenes stay focused on what they are testing
  if (ctx.stage !== 'adult' && ctx.stage !== 'elder') return;
  if (ctx.drives.hunger > 25 || ctx.drives.thirst > 25) return;
  for (const c of candidates(ctx)) {
    const q = c.q;
    if (c.d > 10) continue;
    if (stageOf(world, q) === 'child' || stageOf(world, q) === 'youth') continue;
    if ((p.cooldowns['propose' + q.id] ?? 0) > world.tick) continue;
    const rel = p.relations[q.id];
    if (!rel || rel.familiarity < 10) continue;
    // housemates who are not family can still become a couple
    const sameHome = q.hhId === p.hhId;
    if (sameHome && (rel.kin || p.partnerId !== 0 || q.partnerId !== 0)) continue;
    const back = q.relations[p.id];
    if (!back) continue;
    let kind: 'partner' | 'roommate' | null = null;
    if (p.partnerId === 0 && q.partnerId === 0 && rel.affinity >= 30 && rel.trust >= 20 && back.affinity >= 26 && spark(p, q, yearTicks(world)) && !rel.kin) kind = 'partner';
    else if (sameHome) continue;
    else if (rel.affinity >= 38 && rel.trust >= 26 && back.affinity >= 32) {
      // roommates: one of us has no real home and the other has room
      const hhP = ctx.members.length;
      const homeless = !ctx.home;
      const qHome = world.households.find((h) => h.id === q.hhId)?.homeId;
      const room = qHome ? (world.byId.get(qHome) as { type?: keyof typeof BUILD_DEF } | undefined) : undefined;
      if (homeless && room?.type && BUILD_DEF[room.type].sleepers > 0 && hhP <= 2) kind = 'roommate';
    }
    if (!kind) continue;
    const sc = new Scorer().add(kind === 'partner' ? 'wants to share a life' : 'could share a home', (kind === 'partner' ? 26 + (rel.affinity - 30) * 0.4 + (ctx.night ? 8 : 0) : 15 + (rel.affinity - 40) * 0.15)).add('walking', -pen(c.d * 6));
    mkSocial(ctx, c, 'propose', { joinKind: kind }, kind === 'partner' ? (sameHome ? `Tell ${q.name} they mean a lot` : `Ask ${q.name} to move in together`) : `Ask ${q.name} about sharing a home`, kind === 'partner' ? (sameHome ? 'to become a couple' : 'to share a household') : 'to find shelter together', null, sc, 'household');
  }
}

// ───────────────────────── swapping goods ─────────────────────────
function optTrade(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.drives.hunger > 55 || ctx.drives.thirst > 55) return;
  // what do I most want that I lack?
  let want: { item: ItemKind; n: number } | null = null;
  if (ctx.food < 2 && hhState(ctx).shortage > 0.3) want = { item: 'fish', n: 1 };
  for (const b of beliefsByKind(p, ['site'])) {
    if (b.hh !== p.hhId) continue;
    for (const k of ['wood', 'stone'] as const) {
      const miss = (b.need?.[k] ?? 0) - (p.inv[k] ?? 0);
      if (miss > 0) want = { item: k, n: Math.min(2, miss) };
    }
  }
  if (!want) return;
  // what can I spare?
  const spare: { item: ItemKind; n: number }[] = [];
  for (const k of ['berries', 'fruit', 'fish', 'grain', 'wood', 'stone', 'water'] as ItemKind[]) {
    if (k === want.item) continue;
    const s = surplusOf(world, p, k);
    if (s >= 2) spare.push({ item: k, n: s });
  }
  if (!spare.length) return;
  spare.sort((a, b) => valueOf(world, p, a.item) * 0 + b.n - a.n);
  const offer = spare[0];
  for (const c of candidates(ctx)) {
    if (c.d > 11) continue;
    const hasWant = want.item === 'fish' ? c.s.carrying.some((k) => isFood(k)) : c.s.carrying.includes(want.item);
    if (!hasWant) continue;
    if ((p.asked[c.q.id] ?? -9999) > world.tick - 700) continue;
    const askItem: ItemKind = want.item === 'fish' ? (c.s.carrying.find((k) => isFood(k)) as ItemKind) : want.item;
    const sc = new Scorer().add('a swap could give me what I lack', 14 + 0.05 * c.aff).add('walking', -pen(c.d * 6));
    mkSocial(ctx, c, 'trade', { item: askItem, amount: want.n, offer: offer.item, offerAmount: Math.min(offer.n, want.n + 1) }, `Offer ${c.q.name} a swap: ${offer.item} for ${askItem}`, `to get ${askItem}`, null, sc, 'trade', ':' + askItem);
  }
  void hashUnit;
}

export function socialOptions(ctx: Ctx): void {
  mealOptions(ctx);
  welfareOptions(ctx);
  optRequest(ctx);
  optAskInfo(ctx);
  optWarn(ctx);
  optOffer(ctx);
  optReconcile(ctx);
  optMediate(ctx);
  mournOptions(ctx);
  optRecruit(ctx);
  optPropose(ctx);
  optTrade(ctx);
  optChat(ctx);
  void eta;
}

void toolsHeldBy;
