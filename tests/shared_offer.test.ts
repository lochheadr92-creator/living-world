// Rules 248: a shared proposal is offered where a workshop is planned (src/sim/shared_offer.ts; called from production.ts
// optPlanFacilities). The public alternative of rules 143 was added to tryPlan, which has planned only homes, wells and storehouses
// since workshops moved to optPlanFacilities, so no shared proposal could be generated; from 248 the workshop planner offers it.
// STAGED: the shared project fixture of rules 143 (a mill, two people with company in sight). The ordinary-world evidence is the paired
// lab, not this file.
// Tests that name a rules-247 contrast fail if the rule is taken out (or the world is 247).
import { afterEach, describe, expect, it } from 'vitest';
import { parseIntervention } from '../scripts/lab/lab';
import { makeCtx } from '../src/sim/optutil';
import { newActivity } from '../src/sim/activities';
import { perceive } from '../src/sim/perception';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { hasSharedOffer, offerShared, setSharedOffer, sharedOfferOn } from '../src/sim/shared_offer';
import { sharedFixture } from './helpers/shared_projects';

afterEach(() => setSharedOffer(true));

/** the planner's private option for a mill, as optPlanFacilities adds it (key plan_site:mill) */
function planned(rulesVersion: number) {
  const f = sharedFixture(false, rulesVersion);
  f.w.civicProjects = [];
  perceive(f.w, f.a);
  const ctx = makeCtx(f.w, f.a, true, true);
  const make = () => newActivity(f.w, f.a, { kind: 'plan_site', label: 'Mill', goal: 'flour', data: { type: 'mill', hh: f.a.hhId } });
  ctx.options.push({ kind: 'plan_site' as const, key: 'plan_site:mill', label: 'Lay out a mill', goal: 'flour', need: null, util: 20, parts: [] as [string, number][], eta: 60, targetId: 0, tag: 'build', make });
  return { f, ctx, make };
}

describe('rules 248: the workshop planner offers the shared alternative', () => {
  it('adds "Propose a shared mill" beside the private layout, with the private action intact', () => {
    const { f, ctx, make } = planned(248);
    expect(hasSharedOffer(f.w)).toBe(true);
    offerShared(ctx, 'mill');
    const keys = ctx.options.map((o) => o.key);
    expect(keys).toContain('plan_site:mill');
    expect(keys).toContain('plan_shared:mill');
    const shared = ctx.options.find((o) => o.key === 'plan_shared:mill')!;
    expect(shared.label).toMatch(/shared/i);
    expect(shared.make?.()?.data.communal).toBe(true);
    expect(make().data.communal).toBeUndefined();
  });
  it('rules 247 offers no shared proposal from the workshop planner (the contrast)', () => {
    const { f, ctx } = planned(247);
    expect(hasSharedOffer(f.w)).toBe(false);
    offerShared(ctx, 'mill');
    expect(ctx.options.map((o) => o.key)).toEqual(['plan_site:mill']);
  });
  it('kept: the people rules 143 turns away are still turned away (no company, an organiser already, a type that cannot be shared)', () => {
    const lone = planned(248);
    lone.f.a.seen = [];
    const alone = makeCtx(lone.f.w, lone.f.a, true, true);
    alone.options.push(lone.ctx.options[0]);
    offerShared(alone, 'mill');
    expect(alone.options.map((o) => o.key)).toEqual(['plan_site:mill']);
    const home = planned(248);
    home.ctx.options[0] = { ...home.ctx.options[0], key: 'plan_site:hut' };
    offerShared(home.ctx, 'hut');
    expect(home.ctx.options.map((o) => o.key)).toEqual(['plan_site:hut']);
  });
  it('the lab arm rich-no-shared-offer removes only the offer and restores the switch', () => {
    const { f, ctx } = planned(248);
    const restore = parseIntervention('rich-no-shared-offer').install!();
    expect(sharedOfferOn()).toBe(false);
    offerShared(ctx, 'mill');
    expect(ctx.options.map((o) => o.key)).toEqual(['plan_site:mill']);
    restore();
    expect(sharedOfferOn()).toBe(true);
    expect(hasSharedOffer(f.w)).toBe(true);
  });
  it('248 is supported and is the current version at this commit', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(248);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(248);
  });
});
