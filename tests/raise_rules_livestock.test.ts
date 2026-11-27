// A rules-256 save with an adult sheep raised to 267 or later (scripts/world_args.ts raiseRulesVersion, the lab's --rules-up). Rules 267
// made a sheep mature at FARM_SPECIES.sheep.mature (18,937 ticks) where it had been 8 days (19,200), so the adult's growth was over the
// raised version's maturity and the world failed its own save check on read-back ("invalid sheep state"), which stopped every lab on the
// six saved settlements at current rules (found 27 November 2026 by the rules-278 builder; reproduced on aspen-day48 and river-day48).
// The raise now sets such an animal to the raised maturity (still an adult) and runs the livestock check at the raise.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { maturity } from '../src/sim/farm_species';
import { currentWorldSettings } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { stepWorld } from '../src/sim/world';
import { worldFromArgs } from '../scripts/world_args';

const optOf = (o: Record<string, string>) => (name: string, dflt: string) => o[name] ?? dflt;

function save256WithAdultSheep() {
  const settings = currentWorldSettings('normal', 'river', { immigration: false });
  settings.rulesVersion = 256;
  const w = createWorld(settings);
  const sheep = w.animals.filter((a) => a.sheep);
  expect(sheep.length).toBeGreaterThan(0);
  expect(sheep.every((a) => a.sheep!.origin === 'founder' && a.sheep!.growth === 8 * DAY)).toBe(true);
  const dir = mkdtempSync(join(tmpdir(), 'raise-livestock-'));
  const path = join(dir, 'river-256.save.json');
  writeFileSync(path, serializeWorld(w));
  return path;
}

describe('raising a rules-256 save past the livestock rules (267)', () => {
  it('a bare version change leaves an adult sheep past maturity, and the save check refuses it', () => {
    const path = save256WithAdultSheep();
    const { w } = worldFromArgs(optOf({ load: path }));
    w.settings.rulesVersion = CURRENT_RULES_VERSION; // what --rules-up did before the fit
    expect(() => deserializeWorld(serializeWorld(w))).toThrow('invalid sheep state');
  });

  it('--rules-up sets the sheep to the raised maturity, still adult, and the world reads back and runs', () => {
    const path = save256WithAdultSheep();
    const { w } = worldFromArgs(optOf({ load: path, 'rules-up': String(CURRENT_RULES_VERSION) }));
    expect(w.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
    const sheep = w.animals.filter((a) => a.sheep);
    for (const a of sheep) {
      expect(a.sheep!.growth).toBe(Math.floor(maturity(w, a)));
      expect(a.sheep!.growth).toBeLessThan(8 * DAY);
    }
    const back = deserializeWorld(serializeWorld(w));
    expect(serializeWorld(back)).toBe(serializeWorld(w));
    for (let n = 0; n < 240; n++) stepWorld(back);
    expect(() => deserializeWorld(serializeWorld(back))).not.toThrow();
  });

  it('a raise below 267 changes no animal', () => {
    const path = save256WithAdultSheep();
    const { w } = worldFromArgs(optOf({ load: path, 'rules-up': '266' }));
    expect(w.animals.filter((a) => a.sheep).every((a) => a.sheep!.growth === 8 * DAY)).toBe(true);
  });
});
