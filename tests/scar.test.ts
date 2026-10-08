// A remembered failure demotes the place in a rich world, and the reason is visible. Ordinary worlds stay as they were.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { noteFailure } from '../src/sim/knowledge';
import type { Option } from '../src/sim/optutil';
import { natural } from './helpers/util';

function pair(target: number, other: number, failedUtil = 20, otherUtil = 18): Option[] {
  return [
    { kind: 'gather', label: 'failed patch', goal: 'berries', need: null, util: failedUtil, parts: [['berries', failedUtil]], eta: 10, key: 'g:' + target, targetId: target, make: () => null },
    { kind: 'gather', label: 'other patch', goal: 'berries', need: null, util: otherUtil, parts: [['berries', otherUtil]], eta: 12, key: 'g:' + other, targetId: other, make: () => null },
  ];
}

describe('place scar', () => {
  it('demotes a failed place for about two days in a rich world, and names the reason', () => {
    const w = natural('scar', { dynamics: 'rich' });
    const p = w.persons.find((x) => x.alive)!;
    noteFailure(w, p, 42, 'a wolf came too close');
    const ctx = generateOptions(w, p, true);
    ctx.options.push(...pair(42, 43));
    const ranked = rankOptions(ctx);
    const failed = ranked.find((o) => o.key === 'g:42')!;
    const other = ranked.find((o) => o.key === 'g:43')!;
    expect(failed.util).toBeLessThan(other.util);
    expect(failed.parts.some(([n]) => n === 'a wolf came too close')).toBe(true);
    expect(ranked.findIndex((o) => o.key === 'g:43')).toBeLessThan(ranked.findIndex((o) => o.key === 'g:42'));
  });

  it('does not demote drinking at the same place', () => {
    const w = natural('scar-drink', { dynamics: 'rich' });
    const p = w.persons.find((x) => x.alive)!;
    noteFailure(w, p, 42, 'a wolf came too close');
    const ctx = generateOptions(w, p, true);
    ctx.options.push({ kind: 'drink', label: 'drink', goal: 'water', need: 'thirst', util: 10, parts: [['thirst', 10]], eta: 5, key: 'd:42', targetId: 42, make: () => null });
    const drink = rankOptions(ctx).find((o) => o.key === 'd:42')!;
    expect(drink.util).toBe(10);
    expect(drink.parts.some(([n]) => n === 'a wolf came too close')).toBe(false);
  });

  it('leaves an ordinary world unchanged', () => {
    const w = natural('scar-off');
    const p = w.persons.find((x) => x.alive)!;
    noteFailure(w, p, 42, 'a wolf came too close');
    const ctx = generateOptions(w, p, true);
    ctx.options.push(...pair(42, 43));
    const failed = rankOptions(ctx).find((o) => o.key === 'g:42')!;
    expect(failed.util).toBe(20);
  });

  it('lets caution keep the scar after an average person has forgotten it', () => {
    const w = natural('scar-caution', { dynamics: 'rich' });
    const p = w.persons.find((x) => x.alive)!;
    noteFailure(w, p, 42, 'could not get a foothold there');
    w.tick = 2 * DAY + 10;
    p.traits.caution = 0;
    const calm = generateOptions(w, p, true);
    calm.options.push(...pair(42, 43));
    expect(rankOptions(calm).find((o) => o.key === 'g:42')!.util).toBe(20);
    p.traits.caution = 1;
    const wary = generateOptions(w, p, true);
    wary.options.push(...pair(42, 43));
    expect(rankOptions(wary).find((o) => o.key === 'g:42')!.util).toBeLessThan(20);
  });
});
