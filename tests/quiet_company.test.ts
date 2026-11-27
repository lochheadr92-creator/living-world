// Rules 284 (src/sim/quiet_company.ts): quiet company. STAGED, after the draft's own test of 19 November 2026 with the version moved to 284.
import { afterEach, expect, it } from 'vitest';
import { newActivity } from '../src/sim/activities';
import { drive } from '../src/sim/needs';
import { QUIET_COMPANY_PARTS, QUIET_PER_TICK, quietCompanyStep, setQuietCompany } from '../src/sim/quiet_company';
import { rebuildMobileGrid } from '../src/sim/registry';
import { stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => setQuietCompany(true));
function setup(version = 284, tag = '') {
  const s = stage(`quiet-company-${version}-${tag}`), w = s.w;
  w.settings.dynamics = 'rich'; w.settings.rulesVersion = version;
  const a = addPerson(s, 'Ada', 40, 30, { age: 35 }), b = addPerson(s, 'Bo', 41, 30, { age: 34 });
  done(s);
  for (const p of [a, b]) {
    p.needs.social = 50;
    const act = newActivity(w, p, { kind: 'rest', label: 'Rest', goal: 'rest', here: true, utility: 1, minCommit: 1, maxTicks: 200 })!;
    act.phase = 'work'; p.activity = act; p.pose = 'sit';
  }
  rebuildMobileGrid(w);
  return { w, a, b };
}

it('quiet: two people at rest side by side each have their want of company eased; no relation is written', () => {
  const { w, a, b } = setup();
  const before = JSON.stringify(a.relations);
  quietCompanyStep(w);
  expect(a.needs.social).toBeCloseTo(50 + QUIET_PER_TICK);
  expect(b.needs.social).toBeCloseTo(50 + QUIET_PER_TICK);
  expect(JSON.stringify(a.relations)).toBe(before);
});

it('quiet: not across walls, not at a distance, not with somebody asleep or walking', () => {
  const { w, a, b } = setup(284, 'n');
  b.indoors = 123; quietCompanyStep(w); expect(a.needs.social).toBe(50);
  delete b.indoors; b.x = 50; quietCompanyStep(w); expect(a.needs.social).toBe(50);
  b.x = 41; b.pose = 'sleep'; quietCompanyStep(w); expect(a.needs.social).toBe(50);
  b.pose = 'sit'; b.activity!.phase = 'travel'; quietCompanyStep(w); expect(a.needs.social).toBe(50);
});

it('quiet: nothing at rules 283, with the part off, or in an authored world', () => {
  const x = setup(283, 'o'); quietCompanyStep(x.w); expect(x.a.needs.social).toBe(50);
  const y = setup(284, 'f'); setQuietCompany(false, 'quiet'); quietCompanyStep(y.w); expect(y.a.needs.social).toBe(50);
  setQuietCompany(true);
  const z = setup(284, 'a'); z.w.settings.dynamics = 'authored'; quietCompanyStep(z.w); expect(z.a.needs.social).toBe(50);
});

it('quiet: applied by a world tick', () => {
  const on = setup(284, 't1'), off = setup(284, 't0');
  for (const v of [on, off]) for (const p of [v.a, v.b]) { p.needs.energy = 50; p.nextThink = v.w.tick + 1000; p.activity!.duration = 100; }
  setQuietCompany(false, 'quiet'); stepWorld(off.w); setQuietCompany(true); stepWorld(on.w);
  expect(on.a.needs.social - off.a.needs.social).toBeCloseTo(QUIET_PER_TICK);
});

it('earlier: the want of company draws from 60 at 284; from 48 at 283 and with the part off', () => {
  const { w } = setup(284, 'e');
  expect(drive(55, 'social', w)).toBeGreaterThan(0);
  expect(drive(55, 'hunger', w)).toBe(drive(55, 'hunger'));
  setQuietCompany(false, 'earlier'); expect(drive(55, 'social', w)).toBe(0);
  setQuietCompany(true); w.settings.rulesVersion = 283; expect(drive(55, 'social', w)).toBe(0);
});

it('the lab arms remove both parts or one', () => {
  for (const arm of ['rich-no-quiet-company', ...QUIET_COMPANY_PARTS.map((p) => `rich-no-quiet-company-${p}`)]) {
    const iv = parseIntervention(arm);
    expect(iv.spec).toBe(arm);
    iv.install!()();
  }
});
