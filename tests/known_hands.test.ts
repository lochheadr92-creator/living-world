// Rules 178: the candidate's "enough hands already" refusal counts the hands they know of, not every living person's commitment.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { hasKnownHands, knownHands, setKnownHands } from '../src/sim/known_hands';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { helpersOn } from '../src/sim/social';
import type { ConvData } from '../src/sim/social';
import type { Commitment, ConvPurpose, Person, SeenEntity, World } from '../src/sim/types';
import { addPerson, done, pin, site, stage } from './helpers/kit';
import { run } from './helpers/util';

afterEach(() => { setKnownHands(true); });

function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`known-hands-${version}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const owner = addPerson(s, 'Ola', 44, 44, { age: 30, traits: { generosity: 0.9, diligence: 0.9 } });
  const cal = addPerson(s, 'Cal', 45, 44, { age: 30, traits: { generosity: 0.95, diligence: 0.95 } });
  const st = site(s, 'hut', 50, 50, owner.hhId, owner.id);
  const crew = ['Al', 'Bo', 'Cy', 'Di'].map((n, i) => addPerson(s, n, 10 + i, 10, { age: 30 }));
  const w = done(s);
  pin(cal);
  for (const p of crew) { pin(p); p.commitments.push({ status: 'active', siteId: st.id, kind: 'help_build' } as Commitment); }
  relOf(owner, cal.id).affinity = 60; relOf(owner, cal.id).trust = 60;
  relOf(cal, owner.id).affinity = 60; relOf(cal, owner.id).trust = 60;
  return { w, owner, cal, st, crew };
}

function ask(w: World, a: Person, b: Person, siteId: number): string {
  const act = newActivity(w, a, {
    kind: 'socialize', label: `Talking to ${b.name}`, goal: 'a staged conversation', targetId: b.id, targetType: 'person',
    tx: b.x, ty: b.y, spotX: b.x - 1.3, spotY: b.y, utility: 100, minCommit: 4000, maxTicks: 600,
    data: { purpose: 'recruit' as ConvPurpose, conv: { siteId } as ConvData },
  });
  startActivity(w, a, act);
  for (let i = 0; i < 600; i++) {
    run(w, 1);
    if (a.lastInteraction && a.lastInteraction.partner === b.id && !a.convId && a.lastInteraction.tick > act.start) break;
  }
  return JSON.stringify(w.requests[w.requests.length - 1] ?? null);
}

const sight = (id: number, x: number, y: number, act: SeenEntity['act']): SeenEntity => ({
  id, ent: 'person', x, y, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false,
  carrying: [], asleep: false, act, busyTalking: false,
} as SeenEntity);

describe('rules 178: the hands a candidate knows of', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(178);
    expect(SUPPORTED_RULES_VERSIONS).toContain(178);
  });

  it('counts own help, remembered promises and workers in sight at the site, each person once', () => {
    const { w, cal, st, crew } = scene(178);
    cal.seen = [];
    expect(knownHands(w, cal, st.id)).toBe(0);
    cal.commitments.push({ status: 'active', siteId: st.id, kind: 'haul' } as Commitment);
    expect(knownHands(w, cal, st.id)).toBe(1);
    cal.socialMemory = [
      { requestId: 1, otherId: crew[0].id, siteId: st.id, tick: 0, outcome: 'promised', reason: 'heard', role: 'asker' },
      { requestId: 2, otherId: crew[1].id, siteId: st.id, tick: 0, outcome: 'done', reason: 'heard', role: 'asker' },
    ];
    expect(knownHands(w, cal, st.id)).toBe(2);
    cal.seen = [sight(crew[0].id, 49, 50, 'build'), sight(crew[2].id, 51, 51, 'haul')];
    expect(knownHands(w, cal, st.id)).toBe(3);
  });

  it('does not count someone far from the site, someone not at work, or the true commitments of the unseen', () => {
    const { w, cal, st, crew } = scene(178);
    expect(helpersOn(w, st.id)).toBe(4);
    cal.seen = [sight(crew[0].id, 70, 70, 'build'), sight(crew[1].id, 50, 51, 'rest'), sight(crew[2].id, 50, 52, 'wander')];
    expect(knownHands(w, cal, st.id)).toBe(0);
  });

  it('at 177 a candidate who knows of no one is refused on the true count of four', () => {
    const { w, owner, cal, st } = scene(177);
    expect(helpersOn(w, st.id)).toBe(4);
    expect(ask(w, owner, cal, st.id)).toContain('enough hands already');
  });

  it('at 178 the same candidate is not refused for hands they cannot know of', () => {
    const { w, owner, cal, st } = scene(178);
    expect(helpersOn(w, st.id)).toBe(4);
    expect(ask(w, owner, cal, st.id)).not.toContain('enough hands already');
  });

  it('with the switch off the true count still refuses', () => {
    const off = scene(178);
    setKnownHands(false);
    expect(ask(off.w, off.owner, off.cal, off.st.id)).toContain('enough hands already');
  });

  it('applies to rich worlds at 178 or later only', () => {
    expect(hasKnownHands(scene(178).w)).toBe(true);
    expect(hasKnownHands(scene(177).w)).toBe(false);
    expect(hasKnownHands(scene(178, 'authored').w)).toBe(false);
    setKnownHands(false);
    expect(hasKnownHands(scene(178).w)).toBe(false);
  });
});
