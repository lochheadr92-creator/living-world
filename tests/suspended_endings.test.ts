// LW-01 (review 2), rules 116: an ordinary activity that is paused for a conversation and cannot be taken up again (its time ran
// out, or its target is gone) must end through the common ending path, exactly as the same activity would while active: one
// ending, claims released, the handler's own onEnd, lastResult, the decision closed, and a failed attempt on the promise it served
// (building can serve a help_build promise; gathering serves none).
// Rules 115 and earlier keep the historical silent discard.
import { afterEach, describe, expect, it } from 'vitest';
import { endActivity, handlerOf, newActivity, resumeSuspended, startActivity, stepActivity, suspendActivity } from '../src/sim/activities';
import { cancelSite, createSite } from '../src/sim/buildings';
import { claimSlot, claimUnits, conservationReport, gatherFromSource } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { isFreeLand } from '../src/sim/registry';
import { fellTree } from '../src/sim/sources';
import { stageOf } from '../src/sim/people';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { setSuspendedEndings } from '../src/sim/suspended_endings';
import type { Activity, Commitment, Person, Site, Source, World } from '../src/sim/types';

afterEach(() => setSuspendedEndings(true));

type Kind = 'gather' | 'build';
interface Stage { w: World; p: Person; a: Activity; c: Commitment | null; target: Source | Site; endings: string[]; onEnds: number; restore: () => void }

function freeSpot(w: World, nx: number, ny: number, bw: number, bh: number): { x: number; y: number } {
  for (let r = 3; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = Math.floor(nx) + dx, y = Math.floor(ny) + dy;
    let ok = x > 2 && y > 2 && x + bw < w.W - 2 && y + bh + 1 < w.H - 2;
    for (let yy = y - 1; ok && yy <= y + bh; yy++) for (let xx = x - 1; ok && xx <= x + bw; xx++) if (!isFreeLand(w, xx, yy)) ok = false;
    if (ok) return { x, y };
  }
  throw new Error('no free spot');
}

/** STAGED: one adult, a real wood source or building site, a real claim on it, a recorded decision and a promise the work serves. */
function stage(kind: Kind, version: number, maxTicks: number): Stage {
  const w = createWorld({ ...currentWorldSettings('normal', 'lw01-' + kind, { immigration: false }), rulesVersion: version });
  const p = w.persons.find((q) => stageOf(w, q) === 'adult')!;
  const other = w.persons.find((q) => q.id !== p.id && stageOf(w, q) === 'adult')!;
  let target: Source | Site;
  if (kind === 'gather') target = w.sources.filter((s) => s.type === 'tree' && s.amount > 0).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  else { const at = freeSpot(w, p.x, p.y, 2, 2); target = createSite(w, 'lean_to', at.x, at.y, p.hhId, p.id); }
  // gathering serves no promise in the product (the attempt validator admits only promise-serving kinds); building serves help_build
  const c = kind === 'build' ? ({ id: w.nextId++, requestId: 0, kind: 'help_build', to: other.id, item: null, amount: 1, siteId: target.id, made: w.tick, deadline: w.tick + 5000, status: 'active' } as Commitment) : null;
  if (c) p.commitments.push(c);
  const a = newActivity(w, p, {
    kind, label: kind === 'gather' ? 'Chopping wood' : 'Building the lean-to', goal: 'staged LW-01 work', targetId: target.id, targetType: target.ent,
    tx: target.x + 0.5, ty: target.y + 0.5, spotX: target.x + 0.5, spotY: target.y + 0.5, maxTicks, data: { ...(c ? { commitmentId: c.id } : {}), optKey: 'lw01-' + kind, ...(kind === 'gather' ? { stype: 'tree' } : {}) },
  });
  p.decisions = [{ tick: w.tick, trigger: 'staged LW-01', key: 'lw01-' + kind, chosen: a.label, kind: a.kind, targetId: a.targetId, forPlan: 0, activityId: a.id, passedOver: [], setAside: [] }];
  p.decisionsDropped = 0;
  startActivity(w, p, a);
  const claim = kind === 'gather' ? claimUnits(w, p.id, target as Source, 1, 500) : claimSlot(w, p.id, target as Site, 500);
  expect(claim).toBeGreaterThan(0);
  a.claims.push(claim);
  if (kind === 'build') a.cycle = 1; // some work already done on the site, so the build handler's own ending note applies
  const s: Stage = { w, p, a, c, target, endings: [], onEnds: 0, restore: () => {} };
  w.hooks = { onActivityEnd: (_q, ended, outcome, detail) => { if (ended.id === a.id) s.endings.push(`${outcome}:${detail}`); } };
  const h = handlerOf(kind)!, orig = h.onEnd;
  h.onEnd = (...args) => { if (args[2].id === a.id) s.onEnds++; orig?.(...args); };
  s.restore = () => { h.onEnd = orig; };
  return s;
}

/** The target goes away by the product's own paths: the tree is cut out (its wood carried off first) and felled; the site is called off. */
function loseTarget(s: Stage): void {
  if (s.target.ent === 'source') {
    const tree = s.target;
    const q = s.w.persons.find((x) => x.id !== s.p.id && x.alive)!;
    while (tree.amount > 0) if (gatherFromSource(s.w, tree, q, 1) < 1) throw new Error('could not empty the tree');
    fellTree(s.w, tree);
  } else cancelSite(s.w, s.target, 'staged: the household gave the site up');
  expect(s.w.byId.has(s.target.id)).toBe(false);
}

function closed(s: Stage) {
  return {
    endings: s.endings,
    onEnds: s.onEnds,
    claimsHeld: s.a.claims.filter((id) => s.w.reservations.has(id)).length,
    lastResult: s.p.lastResult?.outcome ?? null,
    decision: s.p.decisions?.find((d) => d.activityId === s.a.id)?.outcome ?? null,
    attempt: s.c ? !!s.c.attempt && s.c.attempt.activityId === s.a.id : null,
    activity: s.p.activity?.id ?? null,
    suspended: s.p.suspended?.id ?? null,
  };
}

function continuesExactly(s: Stage): void {
  const copy = deserializeWorld(serializeWorld(s.w));
  for (let n = 0; n < 240; n++) { stepWorld(s.w); stepWorld(copy); }
  expect(serializeWorld(copy)).toBe(serializeWorld(s.w));
  expect(conservationReport(s.w).ok).toBe(true);
  expect(s.endings).toHaveLength(1);
}

const cases: [Kind, 'expiry' | 'target loss'][] = [['gather', 'expiry'], ['gather', 'target loss'], ['build', 'expiry'], ['build', 'target loss']];

describe('LW-01: a paused ordinary activity that cannot resume reaches the common ending (rules 116)', () => {
  for (const [kind, how] of cases) {
    it(`${kind}, ${how}: the active control ends with every record`, () => {
      const s = stage(kind, 116, how === 'expiry' ? 10 : 3000);
      try {
        if (how === 'expiry') { s.w.tick = s.a.expire + 1; stepActivity(s.w, s.p); }
        else { loseTarget(s); for (let n = 0; n < 3000 && s.p.activity?.id === s.a.id; n++) { s.w.tick++; stepActivity(s.w, s.p); } }
        const o = closed(s);
        expect(o.activity).toBeNull();
        expect(o.endings).toHaveLength(1);
        expect(o.onEnds).toBe(1);
        expect(o.claimsHeld).toBe(0);
        expect(o.lastResult).toMatch(/failed|partial/);
        expect(o.decision).toBe(o.lastResult);
        expect(o.attempt).toBe(kind === 'build' ? true : null);
      } finally { s.restore(); }
    });

    it(`${kind}, ${how}: the same activity paused for a conversation ends the same way and continues exactly from a save`, () => {
      const s = stage(kind, 116, how === 'expiry' ? 10 : 3000);
      try {
        suspendActivity(s.w, s.p);
        expect(s.p.suspended?.id).toBe(s.a.id);
        if (how === 'expiry') s.w.tick = s.a.expire + 1; else loseTarget(s);
        expect(resumeSuspended(s.w, s.p)).toBe(false);
        const o = closed(s);
        expect(o.activity).toBeNull();
        expect(o.suspended).toBeNull();
        expect(o.endings).toHaveLength(1);
        expect(o.endings[0]).toMatch(how === 'expiry' ? /^(failed|partial):took too long$/ : /^(failed|partial):the (source|site) it was for was gone when the conversation ended$/);
        expect(o.onEnds).toBe(1);
        expect(o.claimsHeld).toBe(0);
        expect(o.lastResult).toMatch(/failed|partial/);
        expect(o.decision).toBe(o.lastResult);
        expect(o.attempt).toBe(kind === 'build' ? true : null);
        continuesExactly(s);
      } finally { s.restore(); }
    });

    it(`${kind}, ${how}: rules 115 keeps the historical silent discard`, () => {
      const s = stage(kind, 115, how === 'expiry' ? 10 : 3000);
      try {
        suspendActivity(s.w, s.p);
        if (how === 'expiry') s.w.tick = s.a.expire + 1; else loseTarget(s);
        expect(resumeSuspended(s.w, s.p)).toBe(false);
        const o = closed(s);
        expect(o.endings).toEqual([]);
        expect(o.onEnds).toBe(0);
        expect(o.lastResult).toBeNull();
        expect(o.decision).toBeNull();
        expect(o.attempt).toBe(kind === 'build' ? false : null);
      } finally { s.restore(); }
    });
  }

  it('the lab switch restores the historical discard at rules 116', () => {
    setSuspendedEndings(false);
    const s = stage('gather', 116, 10);
    try {
      suspendActivity(s.w, s.p);
      s.w.tick = s.a.expire + 1;
      expect(resumeSuspended(s.w, s.p)).toBe(false);
      expect(closed(s).endings).toEqual([]);
    } finally { s.restore(); }
  });

  it('a paused activity that is still valid resumes as before, with no ending', () => {
    const s = stage('gather', 116, 3000);
    try {
      suspendActivity(s.w, s.p);
      expect(resumeSuspended(s.w, s.p)).toBe(true);
      expect(s.p.activity?.id).toBe(s.a.id);
      expect(s.endings).toEqual([]);
      endActivity(s.w, s.p, 'interrupted', 'test cleanup');
    } finally { s.restore(); }
  });
});
