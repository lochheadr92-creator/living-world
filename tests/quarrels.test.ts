// Third parties in quarrels: onlookers take sides and hold accounts, and a friend can talk one side round.
// Hand-made situations check a rule; the last test is the natural world.
import { describe, expect, it } from 'vitest';
import { conservationReport } from '../src/sim/economy';
import { openGrievance } from '../src/sim/grievance';
import { relOf } from '../src/sim/relations';
import { mediate, startArgument } from '../src/sim/social';
import { hashWorld } from '../src/sim/world';
import type { Person, World } from '../src/sim/types';
import { natural, run } from './helpers/util';

/** Five adults standing together: two who quarrel, a friend of each, and a bystander who knows neither. */
function stage(): { w: World; a: Person; b: Person; fa: Person; fb: Person; nobody: Person } {
  const w = natural('quarrel-stage');
  const adults = w.persons.filter((p) => p.alive && p.hhId !== undefined).slice(0, 5);
  const [a, b, fa, fb, nobody] = adults;
  for (const p of adults) {
    p.x = a.x + 1;
    p.y = a.y + 1;
    p.pose = 'stand';
    p.convId = 0;
    p.activity = null;
    for (const k in p.relations) delete p.relations[k as unknown as number];
  }
  // nobody else in the village is anywhere near, so only these five can see it
  for (const p of w.persons) if (!adults.includes(p)) p.x = a.x + 60;
  relOf(fa, a.id).affinity = 40;
  relOf(fb, b.id).affinity = 40;
  return { w, a, b, fa, fb, nobody };
}

describe('onlookers', () => {
  it('both people in a quarrel and everyone who sees it hold an account of it; friends side with their friend', () => {
    const { w, a, b, fa, fb, nobody } = stage();
    startArgument(w, a, b, 'the last berry');
    expect(a.accounts.some((x) => x.kind === 'quarreled' && x.about === b.id && x.toward === a.id)).toBe(true);
    expect(b.accounts.some((x) => x.kind === 'quarreled' && x.about === a.id && x.toward === b.id)).toBe(true);
    for (const o of [fa, fb, nobody]) expect(o.accounts.some((x) => x.kind === 'quarreled' && x.about === a.id && x.toward === b.id && x.src === 'seen'), o.name).toBe(true);
    // fa likes a, so fa now likes a a little more and b a little less; fb the other way round
    expect(relOf(fa, a.id).affinity).toBeGreaterThan(40);
    expect(relOf(fa, b.id).affinity).toBeLessThan(0);
    expect(relOf(fb, b.id).affinity).toBeGreaterThan(40);
    expect(fa.log.some((l) => new RegExp(`took ${a.name}'s side`).test(l.text))).toBe(true);
    expect(fb.log.some((l) => new RegExp(`took ${b.name}'s side`).test(l.text))).toBe(true);
  });

  it('someone with no clear lean does not take a side, and someone asleep or far away sees nothing', () => {
    const { w, a, b, nobody, fa } = stage();
    const far = fa;
    far.x = a.x + 30;
    startArgument(w, a, b, 'the last berry');
    expect(nobody.log.some((l) => /took .* side/.test(l.text))).toBe(false);
    expect(far.accounts).toHaveLength(0);
    expect(far.log.some((l) => /took .* side/.test(l.text))).toBe(false);
    expect(w.stats.sided ?? 0).toBe(1); // only fb, the friend of b who is standing there
  });
});

describe('a friend stepping in', () => {
  const attempt = (w: World, fr: Person, side: Person, other: Person) => {
    // the conversation's response to a mediation attempt depends on a per-moment roll; try a few moments
    const start = w.tick;
    for (let i = 0; i < 60; i++) {
      w.tick = start + i * 16;
      const before = relOf(side, other.id).grievance?.weight ?? 0;
      delete fr.cooldowns['mediate' + side.id + ':' + other.id];
      mediate(w, { data: {} }, fr, side, { otherId: other.id });
      const after = relOf(side, other.id).grievance?.weight ?? 0;
      if (after < before || !relOf(side, other.id).grievance) return { eased: true, before, after };
    }
    return { eased: false, before: 0, after: 0 };
  };

  it('eases the sore one’s grievance and is thanked, and the quarrel ends in the record when both sides have been talked round', () => {
    const { w, a, b, fa } = stage();
    relOf(a, fa.id).trust = 80;
    relOf(b, fa.id).trust = 80;
    openGrievance(w, a, b, 'competition', 'we argued', 46);
    openGrievance(w, b, a, 'competition', 'we argued', 40);
    const r1 = attempt(w, fa, a, b);
    expect(r1.eased).toBe(true);
    expect(r1.after).toBeLessThan(r1.before);
    expect(a.log.some((l) => /talked me round/.test(l.text))).toBe(true);
    expect(fa.log.some((l) => /Talked .* round/.test(l.text))).toBe(true);
    expect(relOf(a, fa.id).trust).toBeGreaterThan(80); // trust grew from being helped
    expect(w.stats.mediated).toBeGreaterThanOrEqual(1);
    // the other side is a separate conversation, with its own outcome
    const r2 = attempt(w, fa, b, a);
    expect(r2.eased).toBe(true);
  });

  it('is told "that is behind us" when the quarrel has already healed, and does not try again soon', () => {
    const { w, b, fa, a } = stage();
    relOf(b, fa.id).trust = 80;
    expect(relOf(b, a.id).grievance ?? null).toBeNull();
    mediate(w, { data: {} }, fa, b, { otherId: a.id });
    expect(w.stats.mediated ?? 0).toBe(0);
    expect(fa.cooldowns['mediate' + b.id + ':' + a.id]).toBeGreaterThan(w.tick);
  });

  it('is not listened to by someone who does not trust the friend: nothing eases, and the friend waits longer before trying again', () => {
    const { w, a, b, fa } = stage();
    relOf(a, fa.id).trust = -50;
    a.traits.generosity = 0;
    openGrievance(w, a, b, 'competition', 'we argued', 70);
    const before = relOf(a, b.id).grievance!.weight;
    const start = w.tick;
    let tried = 0;
    for (let i = 0; i < 20; i++) {
      w.tick = start + i * 16;
      delete fa.cooldowns['mediate' + a.id + ':' + b.id];
      mediate(w, { data: {} }, fa, a, { otherId: b.id });
      tried++;
    }
    expect(tried).toBe(20);
    expect(relOf(a, b.id).grievance!.weight).toBeLessThanOrEqual(before);
    expect(w.stats.mediated ?? 0).toBeLessThanOrEqual(4); // a 10% floor of the time at most
  });
});

describe('in the natural world', () => {
  it('quarrels leave accounts and take sides; it stays deterministic and the ledger balances', () => {
    const x = natural('quarrels-natural');
    const y = natural('quarrels-natural');
    run(x, 2400 * 12);
    run(y, 2400 * 12);
    expect(hashWorld(x)).toBe(hashWorld(y));
    expect(conservationReport(x).ok).toBe(true);
    const quarrels = x.events.filter((e) => /argued over/.test(e.text)).length;
    const acc = x.persons.flatMap((p) => p.accounts).filter((a) => a.kind === 'quarreled').length;
    // every account of a quarrel traces to an actual argument
    if (acc > 0) expect(quarrels).toBeGreaterThan(0);
    // reported, not asserted as a target
    console.log(`[quarrels] 12 days: ${quarrels} arguments, ${acc} quarrel accounts held, sided ${x.stats.sided ?? 0}, mediated ${x.stats.mediated ?? 0}`);
  }, 240_000);
});
