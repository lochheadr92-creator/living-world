// Rules 172: the recruit cap's count is what the asker undertook and what they were promised, not the register.
import { afterEach, describe, expect, it } from 'vitest';
import { createSite } from '../src/sim/buildings';
import { generateOptions } from '../src/sim/decision';
import { heardHelpers, setHeardHelpers } from '../src/sim/heard_helpers';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Commitment } from '../src/sim/types';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => { setHeardHelpers(true); });

function asker() {
  const s = stage('heard-helpers');
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = 172;
  const ada = addPerson(s, 'Ada', 10, 10, { age: 30 });
  done(s);
  return { w: s.w, ada };
}

function promised(otherId: number, siteId: number, deadline = 1e9) {
  return {
    requestId: otherId, otherId, siteId, tick: 0, outcome: 'promised', reason: 'heard', role: 'asker' as const,
    expectation: { commitmentId: otherId, conversationId: 1, made: 0, deadline, amount: 1, item: null, planId: 0, destId: siteId, otherName: 'helper', received: 0 },
  };
}

describe('heard helper count', () => {
  it('counts the asker once and each distinct promised helper once', () => {
    const { w, ada } = asker();
    ada.commitments.push({ status: 'active', siteId: 4, kind: 'help_build' } as Commitment);
    ada.socialMemory = [promised(11, 4), promised(11, 4), promised(12, 4), promised(13, 9)];
    expect(heardHelpers(w, ada, 4)).toBe(3);
  });

  it('a row with no expectation counts only while its outcome is still promised', () => {
    const { w, ada } = asker();
    ada.socialMemory = [
      { requestId: 1, otherId: 11, siteId: 4, tick: 0, outcome: 'promised', reason: 'heard', role: 'asker' },
      { requestId: 2, otherId: 12, siteId: 4, tick: 0, outcome: 'done', reason: 'heard', role: 'asker' },
    ];
    expect(heardHelpers(w, ada, 4)).toBe(1);
  });

  it('an expectation past its deadline is not still promised', () => {
    const { w, ada } = asker();
    w.tick = 50;
    ada.socialMemory = [promised(11, 4, 10)];
    expect(heardHelpers(w, ada, 4)).toBe(0);
  });
});

function crew(version: number) {
  const s = stage(`recruit-cap-${version}`);
  s.w.settings.dynamics = 'rich';
  s.w.settings.rulesVersion = version;
  const ada = addPerson(s, 'Ada', 40, 40, { age: 30, hunger: 95, thirst: 95, energy: 95 });
  const ben = addPerson(s, 'Ben', 42, 40, { age: 30, hunger: 95, thirst: 95, energy: 95 });
  const cora = addPerson(s, 'Cora', 80, 80, { age: 30 });
  const dee = addPerson(s, 'Dee', 82, 80, { age: 30 });
  const site = createSite(s.w, 'hut', 44, 44, ada.hhId, ada.id);
  observe(s.w, ada, site);
  done(s);
  for (const p of [ada, ben, cora, dee]) { pin(p); p.needs.hunger = 95; p.needs.thirst = 95; p.needs.energy = 95; p.needs.warmth = 100; p.needs.safety = 100; }
  ada.cooldowns.pause = 0;
  relOf(ada, ben.id).affinity = 40;
  rebuildMobileGrid(s.w);
  perceive(s.w, ada);
  return { w: s.w, ada, ben, cora, dee, site };
}

function offered(scene: ReturnType<typeof crew>) {
  return generateOptions(scene.w, scene.ada, true, true).options.some((o) => o.tag === 'recruit');
}

describe('rules 172: recruiting uses the help the asker has heard of', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(172);
    expect(SUPPORTED_RULES_VERSIONS).toContain(172);
  });

  it('two other people truly committed block the ask at 171 and do not block it at 172', () => {
    const old = crew(171);
    const next = crew(172);
    for (const { cora, dee, site } of [old, next]) {
      cora.commitments.push({ status: 'active', siteId: site.id, kind: 'help_build' } as Commitment);
      dee.commitments.push({ status: 'active', siteId: site.id, kind: 'haul' } as Commitment);
    }
    expect(offered(old)).toBe(false);
    expect(offered(next)).toBe(true);
  });

  it('two remembered promises still fill the cap at 172', () => {
    const old = crew(171);
    const next = crew(172);
    for (const { ada, cora, dee, site } of [old, next]) {
      ada.socialMemory = [promised(cora.id, site.id), promised(dee.id, site.id)];
    }
    expect(offered(old)).toBe(true);
    expect(offered(next)).toBe(false);
  });

  it('the switch keeps the global count', () => {
    const scene = crew(172);
    setHeardHelpers(false);
    scene.cora.commitments.push({ status: 'active', siteId: scene.site.id, kind: 'help_build' } as Commitment);
    scene.dee.commitments.push({ status: 'active', siteId: scene.site.id, kind: 'work' } as Commitment);
    expect(offered(scene)).toBe(false);
  });
});
