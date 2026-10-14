// Stage D1's attribution branch. `rich-no-ask` must remove exactly one thing - the ask for a project's missing material - and
// nothing else: the plans are still taken on, the other kinds of request are still made, and the world is the control's own until
// the tick on which the control's first project ask is made. An authored world, which asks for nothing of the kind, is untouched.
import { describe, expect, it } from 'vitest';
import { parseIntervention, runLab } from '../scripts/lab/lab';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { projectAsksOn } from '../src/sim/intent';
import { settingsForProfile } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';

const SEED = 'meadow';
const DAYS = 2;

interface Trace {
  /** the state hash after every tick */
  hashes: string[];
  /** tick on which someone first set off to ask for a project's material (the request itself is made on arrival); -1 if never */
  firstAsk: number;
  /** requests made that name a plan, and the tick of the first (-1 if none) */
  planAsks: number;
  firstRequest: number;
  otherRequests: number;
  /** tool and repair plans adopted (night plans are not projects and ask for nothing) */
  projects: number;
}

function trace(dynamics: 'authored' | 'rich', asks: boolean, days: number): Trace {
  const restore = asks ? undefined : parseIntervention('rich-no-ask').install!();
  try {
    const w = createWorld(settingsForProfile('normal', SEED, { immigration: false, dynamics }));
    const t: Trace = { hashes: [], firstAsk: -1, planAsks: 0, firstRequest: -1, otherRequests: 0, projects: 0 };
    const requests = new Set<number>();
    const plans = new Set<string>();
    w.hooks = {
      onActivityStart: (_p, a) => {
        if (a.kind === 'socialize' && a.data.purpose === 'request' && a.data.conv?.planId !== undefined && t.firstAsk < 0) t.firstAsk = w.tick;
      },
    };
    for (let i = 0; i < days * DAY; i++) {
      stepWorld(w);
      t.hashes.push(hashWorld(w));
      for (const r of w.requests) {
        if (requests.has(r.id)) continue;
        requests.add(r.id);
        if (r.planId === undefined) t.otherRequests++;
        else {
          t.planAsks++;
          if (t.firstRequest < 0) t.firstRequest = w.tick;
        }
      }
      for (const p of w.persons)
        for (const pl of p.intentions) {
          const k = p.id + ':' + pl.id;
          if (pl.kind !== 'night' && !plans.has(k)) {
            plans.add(k);
            t.projects++;
          }
        }
    }
    return t;
  } finally {
    restore?.();
  }
}

describe('the rich-no-ask branch removes the project ask and nothing else', () => {
  const control = trace('rich', true, DAYS);
  const noAsk = trace('rich', false, DAYS);

  it('the control asks for project material, the branch never does', () => {
    expect(control.planAsks).toBeGreaterThan(0);
    expect(control.firstAsk).toBeGreaterThan(0);
    expect(noAsk.planAsks).toBe(0);
    expect(noAsk.firstAsk).toBe(-1);
    expect(noAsk.firstRequest).toBe(-1);
  });

  it('projects are still taken on, and the other kinds of request are still made', () => {
    expect(noAsk.projects).toBeGreaterThan(0);
    expect(noAsk.otherRequests).toBeGreaterThan(0);
  });

  it('the world is the control\'s own until the control first chooses to ask, and has parted by the time that ask is made', () => {
    // hashes[i] is the state after tick i+1. Nothing may differ before the tick on which the control's asker sets off; by the tick
    // the request is made (the hash counts requests) the two worlds must differ. Between the two the hash may or may not see the
    // difference: a walk towards the same person for another reason looks the same to it.
    let parted = -1;
    for (let i = 0; i < control.hashes.length; i++)
      if (control.hashes[i] !== noAsk.hashes[i]) {
        parted = i + 1;
        break;
      }
    expect(parted).toBeGreaterThanOrEqual(control.firstAsk);
    expect(parted).toBeLessThanOrEqual(control.firstRequest);
  });

  it('the switch is back on after the branch', () => {
    expect(projectAsksOn()).toBe(true);
  });

  it('the lab\'s project tallies agree with this independent count, and the branch\'s asks and deliveries are zero', () => {
    const w = createWorld(settingsForProfile('normal', SEED, { immigration: false, dynamics: 'rich' }));
    const [ctl, branch] = runLab(w, 0, DAYS, ['rich-no-ask'], 120);
    expect(ctl.outcome.projectAsks).toBe(control.planAsks);
    expect(ctl.outcome.projectsAdopted).toBe(control.projects);
    expect(ctl.outcome.projectsDone).toBeGreaterThan(0);
    expect(ctl.outcome.projectsDone).toBeLessThanOrEqual(ctl.outcome.projectsAdopted);
    expect(branch.outcome.projectAsks).toBe(0);
    expect(branch.outcome.askUnitsDelivered).toBe(0);
    expect(branch.outcome.projectsAdopted).toBe(noAsk.projects);
    expect(branch.divergedAfterTicks).not.toBeNull();
  });

  it('an authored world, which makes no such ask, is untouched by the switch', () => {
    const on = trace('authored', true, 1);
    const off = trace('authored', false, 1);
    expect(on.planAsks).toBe(0);
    expect(off.hashes).toEqual(on.hashes);
  });
});
