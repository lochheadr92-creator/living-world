// WINTER SHELTER PREPARATION (rules version 47): the winter cue, the score boosts and the home-site exemptions.
//
// This pins the MECHANISM, in the convention of tests/household_home.test.ts: that a homeless household is no longer blocked
// from laying its home out by the open-site cap or its own workshop site while the winter window is open, that a fed adult's
// shelter work gets a winter nudge, that a home site is not cancelled for idleness through the winter, and that food still
// comes first. It says nothing about how often any of it happens on its own or how many deaths it prevents - that is an
// aggregate claim for the lab (scripts/death_tally.ts) and the ablation `rich-no-winter-shelter`, not a fixture.
//
// Everything here is STAGED. "A household that still lays out and finishes a shelter before winter" is the measured outcome
// these three mechanisms are meant to produce; here each mechanism is held apart and pinned on its own.
import { afterEach, describe, expect, it } from 'vitest';
import { createSite } from '../src/sim/buildings';
import { SITE_PATIENCE } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { updateEnvironment } from '../src/sim/environment';
import { observe } from '../src/sim/knowledge';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { makeSource } from '../src/sim/sources';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import { WINTER_SHELTER_FROM_VERSION, runsWinterShelter, setWinterShelter, winterCue, winterShelterWindow } from '../src/sim/winter_shelter';
import { settingsFor } from './helpers/util';
import type { Person, World } from '../src/sim/types';

const ctxFor = (w: World, p: Person) => generateOptions(w, p, true);
const hasLeanToOption = (w: World, p: Person) => ctxFor(w, p).options.some((o) => o.key === 'plan_site:lean_to');

interface SceneOpts {
  rulesVersion?: number;
  hunger?: number;
  thirst?: number;
  /** open workshop sites in the settlement (they fill the open-site cap) */
  workshops?: number;
  /** make the first workshop the household's own */
  ownWorkshop?: boolean;
  tick?: number;
}

/** A homeless household (no home at all) with trees it knows, some open workshop sites, and the clock set into winter. */
function scene(seed: string, o: SceneOpts = {}) {
  const w = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: 'rich', rulesVersion: o.rulesVersion ?? CURRENT_RULES_VERSION }));
  const rng = new RNG(31);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: o.hunger ?? 92, thirst: o.thirst ?? 92, energy: 92 });
  const hh = w.households.find((h) => h.id === ada.hhId)!;
  // hh.homeId stays 0: this household has no home at all
  for (let n = 0; n < (o.workshops ?? 0); n++) {
    const own = !!o.ownWorkshop && n === 0;
    const site = createSite(w, 'kiln', 30 + n * 3, 30, own ? hh.id : 0, own ? ada.id : 0);
    if (own) observe(w, ada, site); // she knows of her own workshop, which is the belief that used to block her home
  }
  for (let n = 0; n < 3; n++) {
    const t = makeSource(w, 'tree', 37 + 3 * n, 41, 20);
    observe(w, ada, t);
  }
  testKit.finish(w, 'natural');
  ada.cooldowns.trade = 1e12;
  w.tick = o.tick ?? 15000; // inside the pre-winter window (winter sets in at tick 19200)
  updateEnvironment(w);
  return { w, ada, hh };
}

afterEach(() => {
  setWinterShelter(true);
});

// ───────────────────────── the cue and the window ─────────────────────────

describe('1. the winter cue and window are deterministic and gated', () => {
  it('the cue is the days before winter, and the window carries through winter', () => {
    const { w } = scene('ws-window', { tick: 15000 });
    expect(winterCue(w), 'pre-winter').toBe(true);
    expect(winterShelterWindow(w), 'pre-winter').toBe(true);
    w.tick = 20000; // winter itself
    updateEnvironment(w);
    expect(winterCue(w), 'winter is not the cue').toBe(false);
    expect(winterShelterWindow(w), 'the window carries through winter').toBe(true);
    w.tick = 10000; // high summer
    updateEnvironment(w);
    expect(winterCue(w)).toBe(false);
    expect(winterShelterWindow(w)).toBe(false);
  });

  it('does not run below version 47', () => {
    const { w } = scene('ws-v46', { rulesVersion: 46, workshops: 4, tick: 15000 });
    expect(runsWinterShelter(w)).toBe(false);
    expect(winterCue(w)).toBe(false);
    expect(hasLeanToOption(w, w.persons.find((p) => p.name === 'Ada')!), 'the cap still blocks below 47').toBe(false);
  });

  it('the version constant and the gate agree', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(WINTER_SHELTER_FROM_VERSION);
  });
});

// ───────────────────────── the exemptions: laying a home out ─────────────────────────

describe('2. a homeless household can lay its home out while the window is open', () => {
  it('is not blocked by the open-site cap, and the option carries the winter nudge', () => {
    const { w, ada } = scene('ws-cap', { workshops: 4 });
    expect(w.sites, 'the cap is full of workshops').toHaveLength(4);
    const ctx = ctxFor(w, ada);
    const opt = ctx.options.find((o) => o.key === 'plan_site:lean_to');
    expect(opt, 'the option is on offer despite the cap').toBeTruthy();
    expect(opt!.parts.some(([name]) => name === 'winter is coming'), 'the nudge is named in the decision').toBe(true);
  });

  it('is not blocked by its own workshop site', () => {
    const { w, ada } = scene('ws-own', { workshops: 1, ownWorkshop: true });
    expect(hasLeanToOption(w, ada)).toBe(true);
  });

  it('is blocked again when the switch is off', () => {
    setWinterShelter(false);
    const { w, ada } = scene('ws-cap-off', { workshops: 4 });
    expect(hasLeanToOption(w, ada)).toBe(false);
  });

  it('its own workshop site blocks it again when the switch is off', () => {
    setWinterShelter(false);
    const { w, ada } = scene('ws-own-off', { workshops: 1, ownWorkshop: true });
    expect(hasLeanToOption(w, ada)).toBe(false);
  });
});

// ───────────────────────── food first, always ─────────────────────────

describe('3. food comes before a house, and the winter nudge does not change that', () => {
  it('a hungry household is not pushed to lay a home out, even in the window', () => {
    const { w, ada } = scene('ws-hungry', { workshops: 0, hunger: 40 });
    expect(hasLeanToOption(w, ada), 'too hungry to start a building').toBe(false);
  });
});

// ───────────────────────── the site is not cancelled for idleness ─────────────────────────

describe('4. a household home site is not cancelled for idleness through the window', () => {
  it('survives the stale-site sweep while the window is open', () => {
    const { w, hh } = scene('ws-keep', { tick: 20000 }); // winter itself
    const site = createSite(w, 'lean_to', 5, 20, hh.id, 0); // far away: nobody works on it
    site.createdTick = w.tick - SITE_PATIENCE - 100;
    site.lastWorkTick = site.createdTick;
    for (let i = 0; i < 400; i++) stepWorld(w);
    expect(w.sites.some((s) => s.id === site.id), 'kept through winter').toBe(true);
    expect(conservationReport(w).ok, 'nothing leaked').toBe(true);
  });

  it('is cancelled as before when the switch is off', () => {
    setWinterShelter(false);
    const { w, hh } = scene('ws-drop', { tick: 20000 });
    const site = createSite(w, 'lean_to', 5, 20, hh.id, 0);
    site.createdTick = w.tick - SITE_PATIENCE - 100;
    site.lastWorkTick = site.createdTick;
    for (let i = 0; i < 400; i++) stepWorld(w);
    expect(w.sites.some((s) => s.id === site.id), 'cancelled as it was before').toBe(false);
    expect(conservationReport(w).ok).toBe(true);
  });
});

// ───────────────────────── determinism, resource conservation, save/replay ─────────────────────────

describe('5. determinism, conservation and save/replay hold', () => {
  it('two identical winter windows step to the same fingerprint', () => {
    const a = scene('ws-det', { workshops: 4 });
    const b = scene('ws-det', { workshops: 4 });
    for (let i = 0; i < 120; i++) { stepWorld(a.w); stepWorld(b.w); }
    expect(hashWorld(a.w)).toBe(hashWorld(b.w));
    expect(conservationReport(a.w).ok).toBe(true);
  });

  it('a world saved in the window comes back identical and continues the same', () => {
    const { w, ada } = scene('ws-save', { workshops: 4 });
    for (let i = 0; i < 60; i++) stepWorld(w);
    const back = deserializeWorld(serializeWorld(w));
    expect(serializeWorld(back)).toBe(serializeWorld(w));
    expect(hashWorld(back)).toBe(hashWorld(w));
    for (let i = 0; i < 60; i++) { stepWorld(w); stepWorld(back); }
    expect(hashWorld(back)).toBe(hashWorld(w));
    expect(back.persons.find((p) => p.name === 'Ada')!.alive).toBe(ada.alive);
  });

  it('the nudge and exemptions leave the ledger conserved', () => {
    const { w } = scene('ws-cons', { workshops: 4 });
    for (let i = 0; i < 200; i++) stepWorld(w);
    expect(conservationReport(w).ok).toBe(true);
  });
});
