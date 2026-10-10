// External control of one person's choices (the AI inhabitant, docs/INHABITANT.md).
//
// A switch beside the world, like the option chooser and the probe counters: module-level, never saved, never hashed, off unless
// installed. With nothing installed, decision.ts runs byte for byte as before (the golden fingerprints hold that). With a controller
// installed, a person it claims is asked what to do when they are free, and may only answer with the key of an option the engine has
// already generated and filtered for them (children's limits, the relief guard, critical needs, fleeing, cooldowns all applied before
// the offer). The engine then builds and runs the activity exactly as it would for anyone, so every claim, check and consequence is the
// simulation's own. A controller cannot create, move or change anything; it can only choose, or decline to.
//
// The controller is synchronous: a tick never waits. A controller that has no answer yet returns 'defer', the person stands for one
// tick and asks again; whoever drives the world (a script, later the app) fills the controller in between ticks.
import type { Ctx, Option } from './optutil';
import type { Activity, Person, World } from './types';

export type ExternalChoice =
  /** no answer yet: the person stands this tick and asks again next tick */
  | { kind: 'defer' }
  /** the key of one of the offered options */
  | { kind: 'pick'; key: string }
  /** let the engine choose as it would for anyone, and say why the controller did not */
  | { kind: 'fallback'; reason: string };

export type ExternalNote =
  /** a pick was accepted and the activity started */
  | { kind: 'applied'; key: string; activity: Activity }
  /** a pick could not be used: the key is not on offer now, or the option could not be set up */
  | { kind: 'rejected'; key: string; reason: string }
  /** the engine chose instead (after a 'fallback', or after every retry was refused) */
  | { kind: 'fallback'; reason: string; activity: Activity | null }
  /** the engine ended the person's activity on its own authority (danger, a deadlier need) */
  | { kind: 'override'; why: string; activity: Activity };

export interface ExternalController {
  /** is this person driven from outside? */
  controls(world: World, p: Person): boolean;
  /** asked when a controlled person is free. `ranked` is what the engine offers, best first; `ctx` is the person's own planning context */
  choose(world: World, p: Person, ctx: Ctx, ranked: Option[], trigger: string): ExternalChoice;
  /** what became of a choice, and what the engine did on its own */
  notify?(world: World, p: Person, note: ExternalNote): void;
}

let controller: ExternalController | null = null;

/** Install a controller (null removes it). Returns a function that puts the previous one back. */
export function setExternalController(c: ExternalController | null): () => void {
  const prev = controller;
  controller = c;
  return () => {
    controller = prev;
  };
}

export function externalController(): ExternalController | null {
  return controller;
}

/** how many times a controlled person's pick may be refused before the engine chooses for them, within one decision */
export const EXTERNAL_RETRIES = 2;
