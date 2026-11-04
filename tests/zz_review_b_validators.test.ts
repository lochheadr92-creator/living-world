import { reviewReportPath } from './helpers/review_report';
// REVIEW B (read-only audit): do the load-time validators ever reject a world the engine itself produced?
import { describe, expect, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';
const REPORT = reviewReportPath('validators_report.txt');

function soak(w: World, days: number, every: number, label: string): string[] {
  const lines: string[] = [];
  const end = days * 2400;
  while (w.tick < end) {
    for (let i = 0; i < every; i++) stepWorld(w);
    const text = serializeWorld(w);
    try {
      const copy = deserializeWorld(text);
      const again = serializeWorld(copy);
      if (again !== text) lines.push(`${label} tick ${w.tick}: re-serialize differs`);
      if (hashWorld(copy) !== hashWorld(w)) lines.push(`${label} tick ${w.tick}: hash differs after load`);
    } catch (e) {
      lines.push(`${label} tick ${w.tick}: LOAD REJECTED: ${(e as Error).message}`);
    }
  }
  lines.push(`${label}: reached tick ${w.tick}, alive ${w.persons.filter(p=>p.alive).length}/${w.persons.length}, deaths ${w.deceased.length}, buildings ${w.buildings.length}, sites ${w.sites.length}, piles ${w.piles.length}, meals ${w.meals.length}, requests ${w.requests.length}, townships ${w.townships?.length ?? 0}, civic ${w.civicProjects?.length ?? 0}, flood ${w.flood ? 'yes' : 'no'}, water bodies ${w.waterBodies?.length ?? 0}`);
  return lines;
}

describe('REVIEW B: validators against engine-produced current-rules worlds', () => {
  for (const seed of ['river', 'meadow', 'forest']) {
    it(`natural ${seed}, Normal, 8 days, save+load every 1200 ticks`, () => {
      const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
      const lines = soak(w, 8, 1200, `natural:${seed}`);
      appendFileSync(REPORT, lines.join('\n') + '\n');
      expect(lines.filter((l) => l.includes('REJECTED') || l.includes('differs')), lines.join('\n')).toEqual([]);
    }, 600_000);
  }
  for (const scene of ['meal', 'haul', 'care', 'workshop'] as const) {
    it(`scene ${scene} at current rules, 3 days, save+load every 600 ticks`, () => {
      const w = createWorld({ ...currentWorldSettings('normal', 'scene-' + scene, { immigration: false }), scene });
      const lines = [`scene:${scene} rulesVersion=${w.settings.rulesVersion} dynamics=${w.settings.dynamics} persons=${w.persons.length}`, ...soak(w, 3, 600, `scene:${scene}`)];
      appendFileSync(REPORT, lines.join('\n') + '\n');
      expect(lines.filter((l) => l.includes('REJECTED') || l.includes('differs')), lines.join('\n')).toEqual([]);
    }, 600_000);
  }
});
