// Rules 33, leave the heaviest left-over (docs/LEAVE_HEAVIEST.md). One real stall is found once in an ordinary world (meadow, no
// immigration: from about tick 10500 someone short of wood or stone has hands full of the other), and each test works on its own copy.
import { createHash } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { abortActivity } from '../src/sim/activities';
import { generateOptions } from '../src/sim/decision';
import { conservationReport, invRoom } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { killPerson } from '../src/sim/lifecycle';
import { LEAVE_HEAVIEST_FROM_VERSION, LEAVE_KINDS, heaviestLeftover, leaveHeaviestOn, setLeaveHeaviest } from '../src/sim/leave_heaviest';
import { settingsForProfile } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION, runsRulesVersion } from '../src/sim/rulesversion';
import type { Activity, Commitment, ItemKind, Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import reference from './v32_continuation.expected.json';

const sha = (w: World) => createHash('sha256').update(serializeWorld(w)).digest('hex');
const RAW: ItemKind[] = ['wood', 'stone', 'clay', 'ore'];

function meadow(version: number | undefined): World {
  return createWorld({ ...settingsForProfile('normal', 'meadow', { dynamics: 'rich', immigration: false }), rulesVersion: version } as never);
}

interface Found {
  /** the world the instant after the leave activity was chosen, as saved text */
  saved: string;
  tick: number;
  personId: number;
  activityId: number;
  items: Record<string, number>;
  where: string;
}
let found: Found;

/**
 * Step a rules-33 meadow until somebody sets out to leave a left-over AND gets there (a trip can be cut short by a more pressing
 * call, which is ordinary), and return the world saved right after the tick the trip began.
 */
function findFirstCompletedLeave(limit = 24000): Found {
  const w = meadow(LEAVE_HEAVIEST_FROM_VERSION);
  let begun: { p: Person; a: Activity }[] = [];
  const open = new Map<number, { p: Person; a: Activity; saved: string; tick: number }>();
  w.hooks = {
    onActivityStart(p, a) {
      if (a.kind === 'deposit' && typeof a.data.leftAt === 'string') begun.push({ p, a });
    },
  };
  while (w.tick < limit) {
    stepWorld(w);
    for (const s of begun) open.set(s.a.id, { ...s, saved: serializeWorld(w), tick: w.tick });
    begun = [];
    for (const [id, o] of open) {
      if (o.p.activity?.id === id) continue;
      open.delete(id);
      if (o.a.cycle > 0) return { saved: o.saved, tick: o.tick, personId: o.p.id, activityId: id, items: { ...o.a.data.items }, where: o.a.data.leftAt };
    }
  }
  throw new Error('no leave-heaviest trip was completed in the fixture world');
}

const restore = (): World => deserializeWorld(found.saved);
const who = (w: World): Person => w.persons.find((p) => p.id === found.personId)!;

beforeAll(() => {
  found = findFirstCompletedLeave();
}, 240000);
afterEach(() => setLeaveHeaviest(true));

describe('rules 33 is the current generation and names its own gate', () => {
  it('is supported and current', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(LEAVE_HEAVIEST_FROM_VERSION);
    expect(runsRulesVersion(meadow(LEAVE_HEAVIEST_FROM_VERSION), LEAVE_HEAVIEST_FROM_VERSION)).toBe(true);
    expect(runsRulesVersion(meadow(LEAVE_HEAVIEST_FROM_VERSION - 1), LEAVE_HEAVIEST_FROM_VERSION)).toBe(false);
    expect(runsRulesVersion(meadow(undefined), LEAVE_HEAVIEST_FROM_VERSION)).toBe(false);
  });
});

describe('heaviestLeftover reads only the person’s own pack, plans, promises and errand', () => {
  const base = (): Person => {
    const p = meadow(33).persons[0];
    p.inv = { wood: 3, stone: 2, berries: 1, axe: 1 };
    p.intentions = [];
    p.commitments = [];
    p.errand = null;
    return p;
  };
  it('picks the heaviest stack by weight and ignores food and tools', () => {
    const p = base();
    expect(heaviestLeftover(p, new Set())).toBe('stone'); // 2 stone = 6 beats 3 wood = 6 on the tie-break order (stone first)
    p.inv = { wood: 4, stone: 1 };
    expect(heaviestLeftover(p, new Set())).toBe('wood');
    p.inv = { berries: 6, axe: 1, clay: 5, planks: 4 };
    expect(heaviestLeftover(p, new Set())).toBeNull(); // only wood and stone are ever left (the measured stalls)
  });
  it('never leaves what an open need names', () => {
    const p = base();
    expect(heaviestLeftover(p, new Set<ItemKind>(['stone']))).toBe('wood');
    expect(heaviestLeftover(p, new Set<ItemKind>(['stone', 'wood']))).toBeNull();
  });
  it('never leaves what a plan, a promise or an errand has spoken for', () => {
    const p = base();
    p.intentions = [{ status: 'active', wants: { stone: 1 } } as never];
    expect(heaviestLeftover(p, new Set())).toBe('wood');
    p.intentions = [];
    p.commitments = [{ status: 'active', item: 'stone' } as Commitment];
    expect(heaviestLeftover(p, new Set())).toBe('wood');
    p.commitments = [{ status: 'done', item: 'stone' } as Commitment];
    expect(heaviestLeftover(p, new Set())).toBe('stone');
    p.commitments = [];
    p.errand = { kind: 'site', targetId: 1, item: 'stone', amount: 1, expires: 1e9, note: '' };
    expect(heaviestLeftover(p, new Set())).toBe('wood');
  });
  it('leaves only the kinds it documents', () => {
    expect([...LEAVE_KINDS]).toEqual(['stone', 'wood']);
  });
});

describe('a real stall in an ordinary world', () => {
  it('is hands too full for something short, and the leave is the heaviest unwanted stack at a place that takes it', () => {
    const w = restore();
    const p = who(w);
    expect(RAW.some((k) => invRoom(w, p, k) < 1), 'the pack has no room for one more of some raw material').toBe(true);
    const [k] = Object.keys(found.items) as ItemKind[];
    expect(LEAVE_KINDS).toContain(k);
    expect(p.inv[k] ?? 0).toBeGreaterThanOrEqual(found.items[k]);
    expect(found.where).toMatch(/^the (storehouse|[a-z ]+)$/);
    const act = p.activity!;
    expect(act.id).toBe(found.activityId);
    expect(act.kind).toBe('deposit');
    expect(act.claims, 'a leave claims nothing, so there is nothing to release').toHaveLength(0);
  });

  it('moves exactly that many units out of the pack and into the place, through the ordinary ledgered deposit', () => {
    const w = restore();
    const p = who(w);
    const [k] = Object.keys(found.items) as ItemKind[];
    const before = p.inv[k] ?? 0;
    const moved: { from: string; to: string; item: string; n: number; reason: string }[] = [];
    w.hooks = { onTransfer: (info) => moved.push(info) };
    for (let i = 0; i < 2400 && p.activity?.id === found.activityId; i++) stepWorld(w);
    expect(p.activity?.id).not.toBe(found.activityId);
    const deposits = moved.filter((m) => m.reason === 'deposit' && m.from === 'person:' + p.id && m.item === k);
    const n = deposits.reduce((s, m) => s + m.n, 0);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(found.items[k]);
    expect(deposits.every((m) => /^building:\d+$/.test(m.to))).toBe(true);
    expect(p.inv[k] ?? 0).toBeLessThanOrEqual(before - n);
    expect(conservationReport(w).ok).toBe(true);
    expect(p.log.some((e) => /to free my hands/.test(e.text))).toBe(true);
  }, 60000);

  it('is offered as an ordinary deposit option, and only to a rich world running 33 with the switch on', () => {
    const offered = (w: World) =>
      generateOptions(w, who(w), true, true).options.some((o) => o.kind === 'deposit' && o.key.startsWith('leave:'));
    const w = restore();
    // the person is already on the way, so the option may no longer be on offer; stage the moment of choice from the saved pack
    const p = who(w);
    p.activity = null;
    expect(offered(w)).toBe(true);
    const old = restore();
    who(old).activity = null;
    old.settings.rulesVersion = LEAVE_HEAVIEST_FROM_VERSION - 1;
    expect(offered(old), 'rules 32').toBe(false);
    const authored = restore();
    who(authored).activity = null;
    authored.settings.dynamics = 'authored';
    expect(offered(authored), 'authored').toBe(false);
    const unversioned = restore();
    who(unversioned).activity = null;
    unversioned.settings.rulesVersion = undefined;
    expect(offered(unversioned), 'unversioned').toBe(false);
    const off = restore();
    who(off).activity = null;
    setLeaveHeaviest(false);
    expect(offered(off), 'lab ablation').toBe(false);
    setLeaveHeaviest(true);
  });

  it('asking what they could do changes nothing', () => {
    const w = restore();
    who(w).activity = null;
    const before = sha(w);
    for (let i = 0; i < 5; i++) generateOptions(w, who(w), true, true);
    expect(sha(w)).toBe(before);
  });

  it('continues identically after a save and load in the middle of the trip', () => {
    const a = restore();
    const b = deserializeWorld(serializeWorld(a));
    expect(sha(b)).toBe(sha(a));
    for (let i = 0; i < 1800; i++) {
      stepWorld(a);
      stepWorld(b);
    }
    expect(sha(b)).toBe(sha(a));
    expect(conservationReport(a).ok).toBe(true);
  }, 120000);

  it('loses nothing if the person dies on the way: what was not put down is still counted', () => {
    const w = restore();
    const p = who(w);
    killPerson(w, p, 'test');
    for (let i = 0; i < 120; i++) stepWorld(w);
    expect(p.alive).toBe(false);
    expect(conservationReport(w).ok).toBe(true);
  }, 60000);

  it('is interrupted without loss when the person turns to something else first', () => {
    const w = restore();
    const p = who(w);
    const k = Object.keys(found.items)[0] as ItemKind;
    const before = p.inv[k] ?? 0;
    abortActivity(w, p, 'interrupted for the test'); // the ordinary path that ends any activity early
    expect(p.activity).toBeNull();
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(conservationReport(w).ok).toBe(true);
    expect(p.inv[k] ?? 0, 'an interrupted trip puts nothing down').toBeGreaterThanOrEqual(0);
    expect(before).toBeGreaterThan(0);
  }, 60000);
});

describe('below rules 33, and with the lab arm, nothing happens', () => {
  const firstLeaveStart = (w: World, until: number): number => {
    let n = 0;
    w.hooks = { onActivityStart: (_p, a) => { if (a.kind === 'deposit' && typeof a.data.leftAt === 'string') n++; } };
    while (w.tick < until) stepWorld(w);
    return n;
  };
  it('a rules-32 world starts none in the span where rules 33 does', () => {
    expect(firstLeaveStart(meadow(32), found.tick + 600)).toBe(0);
  }, 120000);
  it('a rules-33 world with the lab arm installed starts none, and the arm restores the switch', () => {
    const arm = parseIntervention('rich-no-leave-heaviest');
    const restoreSwitch = arm.install!();
    try {
      expect(leaveHeaviestOn()).toBe(false);
      expect(firstLeaveStart(meadow(33), found.tick + 600)).toBe(0);
    } finally {
      restoreSwitch();
    }
    expect(leaveHeaviestOn()).toBe(true);
  }, 120000);
});

describe('what the rule changes is behaviour, not bookkeeping', () => {
  /** the recorded rules-32 world, run again at rules 33 and then given back its 32 stamp, so only behaviour can differ */
  const digestAt33 = (): string => {
    const w = meadow(LEAVE_HEAVIEST_FROM_VERSION);
    while (w.tick < 14400) stepWorld(w);
    w.settings.rulesVersion = LEAVE_HEAVIEST_FROM_VERSION - 1;
    return sha(w);
  };
  it('with the lab arm installed, rules 33 is byte-identical to the recorded rules-32 world apart from its stamp', () => {
    setLeaveHeaviest(false);
    expect(digestAt33()).toBe(reference.uninterrupted);
  }, 120000);
  it('with it on, the same world differs: the recorded reference passes through the situation the rule acts on', () => {
    setLeaveHeaviest(true);
    expect(digestAt33()).not.toBe(reference.uninterrupted);
  }, 120000);
});
