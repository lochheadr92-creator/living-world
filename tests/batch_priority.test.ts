import { afterEach, expect, it } from 'vitest';
import { preferBatchStep, setBatchPriority } from '../src/sim/batch_priority';
import { createWorld } from '../src/sim/factory';
import { makeCtx, type Option } from '../src/sim/optutil';
import { currentWorldSettings } from '../src/sim/profiles';
import type { Intention } from '../src/sim/types';

function setup(version = 275) {
  const w = createWorld({...currentWorldSettings('normal', 'forest'), rulesVersion: version});
  const p = w.persons[0];
  const ctx = makeCtx(w, p, false);
  const batch: Intention = {
    kind: 'batch', id: 1, goal: 'fire bricks', since: 0, until: 2400, status: 'active',
    step: 'get clay', stepKind: 'get', stepItem: 'clay', stepKey: null, stepTarget: 0,
    aboutId: 0, wants: {clay: 1}, makes: 'brick', sheltered: 0, worked: 0, blocked: '', reason: '', setAside: 0, ended: 0,
  };
  p.intentions = [batch];
  p.health = 90;
  p.needs.social = p.needs.energy = 60;
  ctx.night = false;
  ctx.criticals = [];
  ctx.drives.hunger = ctx.drives.thirst = ctx.drives.energy = 0;
  return ctx;
}
function offer(key: string, kind: Option['kind'], tag: string): Option {
  return { key, kind, tag, label: key, goal: key, need: null, util: 10, parts: [], eta: 1, targetId: 0 };
}
const chat = offer('socialize:12:chat', 'socialize', 'social');
const rest = offer('rest:here', 'rest', 'rest');
const step: Option = {...offer('gather:9', 'gather', 'site'), yields: 'clay'};
const warmth = offer('rest:home:2', 'rest', 'warmth');
afterEach(() => setBatchPriority(true));

it('takes the eligible step ahead of a casual chat and a mild rest', () => {
  expect(preferBatchStep(setup(), [chat, rest, step, warmth])).toEqual([step, chat, rest, warmth]);
});
it('keeps warmth, a different material, and missing steps in their original order', () => {
  for (const choices of [[chat, warmth, step], [chat, {...step, yields: 'wood' as const}], [chat]])
    expect(preferBatchStep(setup(), choices)).toBe(choices);
});
it('preserves pressing company, night, critical needs and an insufficient production margin', () => {
  const choices = [chat, step];
  for (const change of [
    (c: ReturnType<typeof setup>) => { c.p.needs.social = 25; },
    (c: ReturnType<typeof setup>) => { c.night = true; },
    (c: ReturnType<typeof setup>) => { c.criticals = ['warmth']; },
    (c: ReturnType<typeof setup>) => { c.drives.hunger = 31; },
  ]) {
    const ctx = setup();
    change(ctx);
    expect(preferBatchStep(ctx, choices)).toBe(choices);
  }
});
it('preserves the previous chooser on the older version and removal arm', () => {
  const choices = [rest, step];
  expect(preferBatchStep(setup(274), choices)).toBe(choices);
  setBatchPriority(false);
  expect(preferBatchStep(setup(), choices)).toBe(choices);
});
