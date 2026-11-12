// Rules 228: a child may ask, and the grown person decides (src/sim/parent_decides.ts; read in options_social.ts and
// childhood.ts beginChildTime). The situations in the first group are STAGED: a child and a parent are put side by side, the
// parent's job in hand is made by hand and the ask is answered directly, so they check the rule; the last check is ordinary
// worlds run side by side at rules 227 and 228.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { beginChildTime } from '../src/sim/childhood';
import { DAY } from '../src/sim/constants';
import { ASK_BASE, ASK_DAYS, ASK_GENEROUS, ASK_PER_DAY, ASK_SOCIABLE, PARENT_DECIDES_PARTS, WORK_FIRST, askWeight, childLeavesToWork, jobInHand, setParentDecides, workComesFirst } from '../src/sim/parent_decides';
import { stageOf } from '../src/sim/people';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Activity, ActivityKind, Conversation, Person, SeenEntity, World } from '../src/sim/types';
import { natural, run } from './helpers/util';

afterEach(() => setParentDecides(true));

const world = (seed: string, version: number): World => natural(seed, { dynamics: 'rich', rulesVersion: version });
/** A child and one of their parents, side by side, fed and rested, the parent of middling nature (staged). */
function pair(w: World): { child: Person; parent: Person } {
  const child = w.persons.find((p) => p.alive && stageOf(w, p) === 'child' && p.parents.some((id) => w.persons.some((q) => q.id === id && q.alive)))!;
  const parent = w.persons.find((q) => q.alive && child.parents.includes(q.id))!;
  for (const p of [child, parent]) {
    p.needs.hunger = p.needs.thirst = p.needs.energy = p.needs.warmth = p.needs.safety = 80;
    p.indoors = 0;
    p.pose = 'stand';
    p.suspended = null;
  }
  child.x = parent.x + 1;
  child.y = parent.y;
  parent.traits.sociability = 0.5;
  parent.traits.generosity = 0.5;
  delete child.cooldowns['child:family_time'];
  return { child, parent };
}
/** A job the parent had in hand when spoken to, worth `utility` to them (staged). */
const inHand = (w: World, kind: ActivityKind, utility: number): Activity => ({ kind, label: 'Building the hut', phase: 'travel', start: w.tick, blocked: '', data: {}, progress: 0, duration: 40, utility, claims: [] }) as unknown as Activity;
const ask = (w: World, child: Person, parent: Person): { said: string; c: Conversation } => {
  const c = { id: 999001, a: child.id, b: parent.id, purpose: 'family_time', start: w.tick, phase: 0, nextAt: w.tick, end: 0, requestId: 0, data: {} } as unknown as Conversation;
  return { said: beginChildTime(w, c, child, parent), c };
};
const seen = (extra: Partial<SeenEntity>): SeenEntity => ({ id: 1, ent: 'person', x: 0, y: 0, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false, carrying: [], asleep: false, act: '', busyTalking: false, ...extra });

describe('rules 228: a child may ask, and the grown person decides', () => {
  it('is a supported version at or below the current one', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(228);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(228);
    expect(PARENT_DECIDES_PARTS).toEqual(['ask', 'weigh']);
    expect([ASK_BASE, ASK_SOCIABLE, ASK_GENEROUS, ASK_PER_DAY, ASK_DAYS]).toEqual([20, 10, 6, 4, 3]);
  });

  it('ask: family time may be asked of somebody seen at work; a game still waits; at rules 227 both wait', () => {
    const working = seen({ act: 'gather', work: 'forage' });
    const now = world('parent-ask', 228);
    expect(childLeavesToWork(now, 'family_time', working)).toBe(false);
    expect(childLeavesToWork(now, 'play_together', working)).toBe(true);
    expect(childLeavesToWork(now, 'learn_foraging', working)).toBe(false);
    expect(childLeavesToWork(now, 'family_time', seen({ act: 'rest' }))).toBe(false);
    const old = world('parent-ask', 227);
    expect(childLeavesToWork(old, 'family_time', working)).toBe(true);
    expect(childLeavesToWork(old, 'play_together', working)).toBe(true);
    setParentDecides(false, 'ask');
    expect(childLeavesToWork(now, 'family_time', working)).toBe(true);
  });

  it('weigh: what the child counts for grows with the days since they last had family time, and with the parent\'s nature', () => {
    const w = world('parent-weight', 228);
    w.tick = 10 * DAY;
    const { child, parent } = pair(w);
    const had = (ago: number | null): void => { parent.relations[child.id] = { ...(parent.relations[child.id] ?? { affinity: 40, trust: 40, familiarity: 40 }), ...(ago === null ? { childhood: undefined } : { childhood: [{ kind: 'family_time', last: w.tick - ago, times: 1 }] }) } as Person['relations'][number]; };
    had(null);
    expect(askWeight(w, parent, child)).toBe(20 + 5 + 3 + 12); // never: the most
    had(100);
    expect(askWeight(w, parent, child)).toBe(28);
    had(DAY + 5);
    expect(askWeight(w, parent, child)).toBe(32);
    had(2 * DAY + 5);
    expect(askWeight(w, parent, child)).toBe(36);
    had(9 * DAY);
    expect(askWeight(w, parent, child)).toBe(40);
    parent.traits.sociability = 1;
    parent.traits.generosity = 1;
    expect(askWeight(w, parent, child)).toBe(48);
    parent.traits.sociability = 0;
    parent.traits.generosity = 0;
    expect(askWeight(w, parent, child)).toBe(32);
  });

  it('weigh: a job worth more than the child\'s ask is finished first, and the child is told; a job worth less is put aside', () => {
    const w = world('parent-weigh', 228);
    w.tick = 10 * DAY;
    const { child, parent } = pair(w);
    parent.relations[child.id] = { ...(parent.relations[child.id] ?? { affinity: 40, trust: 40, familiarity: 40 }), childhood: [{ kind: 'family_time', last: w.tick - DAY - 5, times: 1 }] } as Person['relations'][number];
    expect(askWeight(w, parent, child)).toBe(32);
    parent.suspended = inHand(w, 'build', 40);
    expect(jobInHand(parent)).not.toBeNull();
    expect(workComesFirst(w, parent, child)).toBe(`${WORK_FIRST} (building the hut)`);
    const no = ask(w, child, parent);
    expect(no.said).toBe('Not now. I have to finish this first. Ask me again later.');
    expect(no.c.childhood?.outcome).toBe('declined');
    expect(no.c.childhood?.reason).toContain(WORK_FIRST);
    expect(child.cooldowns['child:family_time']).toBe(w.tick + DAY / 4); // may ask again after a quarter of a day
    delete child.cooldowns['child:family_time'];
    parent.suspended = inHand(w, 'craft', 25);
    expect(workComesFirst(w, parent, child)).toBe('');
    const yes = ask(w, child, parent);
    expect(yes.c.childhood?.outcome).toBe('sharing');
    expect(yes.said).toMatch(/^Yes\./);
  });

  it('weigh: nothing in hand, or resting, is no decision; nor is it at rules 227 or with the part switched off', () => {
    const w = world('parent-free', 228);
    const { child, parent } = pair(w);
    parent.suspended = null;
    expect(workComesFirst(w, parent, child)).toBe('');
    parent.suspended = inHand(w, 'rest', 90);
    expect(jobInHand(parent)).toBeNull();
    expect(workComesFirst(w, parent, child)).toBe('');
    parent.suspended = inHand(w, 'build', 90);
    expect(workComesFirst(w, parent, child)).not.toBe('');
    setParentDecides(false, 'weigh');
    expect(workComesFirst(w, parent, child)).toBe('');
    expect(ask(w, child, parent).c.childhood?.outcome).toBe('sharing');
    setParentDecides(true);
    const old = world('parent-free', 227);
    const o = pair(old);
    o.parent.suspended = inHand(old, 'build', 90);
    expect(workComesFirst(old, o.parent, o.child)).toBe('');
    expect(ask(old, o.child, o.parent).c.childhood?.outcome).toBe('sharing');
  });

  it('ordinary worlds: at rules 228 some asks are answered "not now" and some are agreed; at rules 227 none is refused for work', () => {
    const days = (version: number): { refused: number; agreed: number } => {
      const w = world('parent-ordinary', version);
      const seenConv = new Map<number, string>();
      for (let i = 0; i < 4 * DAY; i++) {
        run(w, 1);
        for (const c of w.conversations) if (c.purpose === 'family_time' && c.childhood) seenConv.set(c.id, c.childhood.outcome === 'declined' && c.childhood.reason.startsWith(WORK_FIRST) ? 'work' : c.childhood.outcome === 'declined' ? 'other' : 'agreed');
      }
      const all = [...seenConv.values()];
      return { refused: all.filter((x) => x === 'work').length, agreed: all.filter((x) => x === 'agreed').length };
    };
    const old = days(227);
    const now = days(228);
    expect(old.refused).toBe(0);
    expect(old.agreed).toBeGreaterThan(5);
    expect(now.refused).toBeGreaterThan(0);
    expect(now.agreed).toBeGreaterThan(5);
  }, 240000);

  it('nothing is saved: a world saved and loaded continues the same', () => {
    const w = world('parent-save', 228);
    run(w, 900);
    const copy = deserializeWorld(serializeWorld(w));
    run(w, 300);
    run(copy, 300);
    expect(serializeWorld(copy)).toBe(serializeWorld(w));
  });
});
