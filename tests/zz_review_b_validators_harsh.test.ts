import { reviewReportPath } from './helpers/review_report';
// REVIEW B (read-only audit): validators against harsher engine-produced current-rules worlds (deaths, winter, estates).
import { describe, expect, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';
const REPORT = reviewReportPath('validators_harsh_report.txt');

function soak(w: World, days: number, every: number, label: string): string[] {
  const lines: string[] = [];
  const end = days * 2400;
  while (w.tick < end) {
    for (let i = 0; i < every; i++) stepWorld(w);
    const text = serializeWorld(w);
    try {
      const copy = deserializeWorld(text);
      if (serializeWorld(copy) !== text) lines.push(`${label} tick ${w.tick}: re-serialize differs`);
      if (hashWorld(copy) !== hashWorld(w)) lines.push(`${label} tick ${w.tick}: hash differs after load`);
    } catch (e) {
      lines.push(`${label} tick ${w.tick}: LOAD REJECTED: ${(e as Error).message}`);
    }
  }
  const estates = w.piles.filter((p) => p.estate).length, leftovers = w.piles.filter((p) => p.mealFood).length;
  lines.push(`${label}: tick ${w.tick}, alive ${w.persons.filter(p=>p.alive).length}/${w.persons.length}, deaths ${w.deceased.length}, graves ${w.graves.length}, estates ${estates}, leftovers ${leftovers}, buildings ${w.buildings.length}, sites ${w.sites.length}, piles ${w.piles.length}, meals ${w.meals.length}, requests ${w.requests.length}, civic ${w.civicProjects?.length ?? 0}, flood ${w.flood ? 'yes' : 'no'}, hardship ${w.hardship?.kind ?? '-'}, relocations ${w.households.filter(h=>h.relocations?.length).length}, carts ${w.carts.length}, journeys ${w.persons.reduce((n,p)=>n+p.intentions.filter(i=>i.journey).length,0)}, socialMemory ${w.persons.reduce((n,p)=>n+(p.socialMemory?.length??0),0)}`);
  return lines;
}

describe('REVIEW B: validators, harsher worlds', () => {
  for (const seed of ['river', 'forest']) {
    it(`harsh ${seed}, Normal, 10 days, save+load every 1200 ticks`, () => {
      const w = createWorld(currentWorldSettings('normal', seed, { immigration: false, harsh: true }));
      const lines = soak(w, 10, 1200, `harsh:${seed}`);
      appendFileSync(REPORT, lines.join('\n') + '\n');
      expect(lines.filter((l) => l.includes('REJECTED') || l.includes('differs')), lines.join('\n')).toEqual([]);
    }, 600_000);
  }
  it('meadow, Normal, 16 days through winter, save+load every 1200 ticks', () => {
    const w = createWorld(currentWorldSettings('normal', 'meadow', { immigration: false }));
    const lines = soak(w, 16, 1200, 'winter:meadow');
    appendFileSync(REPORT, lines.join('\n') + '\n');
    expect(lines.filter((l) => l.includes('REJECTED') || l.includes('differs')), lines.join('\n')).toEqual([]);
  }, 600_000);
});
