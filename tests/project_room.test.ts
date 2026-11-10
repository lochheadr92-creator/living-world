// Rules 196: a shared project never takes a thirteenth participant (src/sim/project_room.ts; recordProjectResponse, townships.ts).
// Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour; the ordinary-world origin is
// tests/save_told.test.ts at the rules-195 head (the product world told-beliefs-legacy, arrivals off, thirteen on the first shared
// storehouse at tick 12,031, and the save refused at load). Each check has the rules-195 contrast so the older push is shown to be kept.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { PROJECT_CAP, projectHasRoom, setProjectRoom } from '../src/sim/project_room';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { validateTownships } from '../src/sim/townships';
import type { Participation } from '../src/sim/townships';
import { stepWorld } from '../src/sim/world';
import { civicFixture } from './helpers/civic';
import type { Person, World } from '../src/sim/types';

afterEach(() => setProjectRoom(true));

const fake = (w: World, i: number): Participation => ({ personId: 900000 + i, requestId: 0, since: w.tick, status: i % 3 === 0 ? 'refused' : 'supporting', reason: 'staged', materials: {}, work: 0 });

/**
 * The race, staged: Ada's shared storehouse holds `before` participants when she asks Ben (so the ask passes canInvite), and `landing`
 * more answers land while the conversation runs, before Ben's own answer is recorded.
 */
function race(version: number, before: number, landing: number, dynamics: 'rich' | 'authored' = 'rich') {
  const f = civicFixture(true);
  f.w.settings.dynamics = dynamics;
  f.w.settings.rulesVersion = version;
  const project = f.w.civicProjects![0];
  for (let i = 1; project.participants.length < before; i++) project.participants.push(fake(f.w, i));
  const { w, a, b, site } = f;
  a.cooldowns.pause = 0; b.cooldowns.pause = 0;
  startActivity(w, a, newActivity(w, a, { kind: 'socialize', label: 'Propose shared work', goal: 'staged contract', targetId: b.id, targetType: 'person', tx: b.x, ty: b.y, spotX: b.x - 1.3, spotY: b.y, utility: 100, minCommit: 4000, maxTicks: 600, data: { purpose: 'recruit', conv: { siteId: site.id } } }));
  let landed = false;
  for (let i = 0; i < 600; i++) {
    stepWorld(w);
    const req = w.requests.find((r) => r.siteId === site.id && r.to === b.id);
    if (req && !landed) { for (let k = 0; k < landing; k++) project.participants.push(fake(w, 100 + k)); landed = true; }
    if (req && req.status !== 'pending' && !a.convId) break;
  }
  const req = w.requests.find((r) => r.siteId === site.id && r.to === b.id);
  return { w, a, b, site, project, req, ben: project.participants.find((m) => m.personId === b.id) };
}

describe('rules 196 is registered', () => {
  it('is registered and supported (the current version may be later), and the cap is twelve', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(196);
    expect(SUPPORTED_RULES_VERSIONS).toContain(196);
    expect(PROJECT_CAP).toBe(12);
  });
});

describe('two asks in flight at eleven', () => {
  it('at 195 the second answer makes thirteen and the save can never be loaded; at 196 it is not recorded and the world loads', () => {
    const old = race(195, 11, 1);
    // a refusal is a participant on the record too, so his answer either way is the thirteenth entry
    expect(['promised', 'declined']).toContain(old.req?.status);
    expect(old.ben).toBeTruthy();
    expect(old.project.participants.length).toBe(13);
    expect(() => validateTownships(old.w)).toThrow('Invalid project participants');
    const now = race(196, 11, 1);
    expect(['promised', 'declined']).toContain(now.req?.status);
    expect(now.ben).toBeUndefined();
    expect(now.project.participants.length).toBe(12);
    expect(() => validateTownships(now.w)).not.toThrow();
  });

  it('with room the answer is recorded at 196 as before', () => {
    const f = race(196, 11, 0);
    expect(f.req?.status).toBe('promised');
    expect(f.ben?.status).toBe('supporting');
    expect(f.project.participants.length).toBe(12);
  });

  it('somebody already on the record is still answered for at 196 when the project is full', () => {
    const f = civicFixture(true);
    f.w.settings.rulesVersion = 196;
    const project = f.w.civicProjects![0];
    project.participants.push({ personId: f.b.id, requestId: 0, since: f.w.tick, status: 'refused', reason: 'staged', materials: {}, work: 0 });
    for (let i = 1; project.participants.length < PROJECT_CAP; i++) project.participants.push(fake(f.w, i));
    expect(projectHasRoom(f.w, project, f.b.id)).toBe(true);
    expect(projectHasRoom(f.w, project, 777777)).toBe(false);
  });

  it('with the switch off a rules-196 world takes the thirteenth again, and an authored world keeps the old push too', () => {
    setProjectRoom(false);
    const f = civicFixture(true);
    f.w.settings.rulesVersion = 196;
    const project = f.w.civicProjects![0];
    for (let i = 1; project.participants.length < PROJECT_CAP; i++) project.participants.push(fake(f.w, i));
    expect(projectHasRoom(f.w, project, 777777)).toBe(true);
    setProjectRoom(true);
    expect(projectHasRoom(f.w, project, 777777)).toBe(false);
    f.w.settings.dynamics = 'authored';
    expect(projectHasRoom(f.w, project, 777777)).toBe(true);
  });
});

void ((_p: Person) => _p);
