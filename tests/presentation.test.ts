import { describe, expect, it } from 'vitest';
import { Game, MAX_FRAME_DT, MAX_STEPS_PER_FRAME } from '../src/app/game';
import { TPS } from '../src/sim/constants';
import { describeEntity, describePerson } from '../src/sim/inspect';
import { describeFacility, interactionViews } from '../src/sim/inspect_work';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { weightOf } from '../src/sim/economy';
import { newActivity, startActivity } from '../src/sim/activities';
import { startJob } from '../src/sim/facilities';
import { RECIPE_BY_ID } from '../src/sim/recipes';
import { hashWorld, runTicks } from '../src/sim/world';
import type { ConvPurpose, ItemKind, World } from '../src/sim/types';
import type { ConvData } from '../src/sim/social';
import { relOf } from '../src/sim/relations';
import { addPerson, building, done, give, site, stage } from './helpers/kit';
import { run } from './helpers/util';

describe('the clock under stalls and overload', () => {
  it('a long gap between frames (a hidden tab, a stalled frame) is a stall, not a debt: the world runs a bounded burst, then carries on normally', () => {
    const g = new Game({ seed: 'stall' });
    g.setSpeed(4);
    g.advance(1 / 60);
    const before = g.world.tick;
    const ran = g.advance(30); // thirty real seconds went by without a frame
    expect(ran).toBeLessThanOrEqual(Math.ceil(MAX_FRAME_DT * 4 * TPS) + 1);
    expect(g.world.tick - before).toBe(ran);
    const stats = g.playbackStats();
    expect(stats.dropped).toBeGreaterThan(30 * 4 * TPS * 0.9); // nearly all of it was given up and counted, not played
    // the very next ordinary frame is ordinary
    expect(g.advance(1 / 60)).toBeLessThanOrEqual(Math.ceil((4 * TPS) / 60) + 1);
  });

  it('a stall is told as recent for a while and then goes quiet, while the running total stays', () => {
    const g = new Game({ seed: 'recent-drop' });
    g.setSpeed(4);
    for (let i = 0; i < 30; i++) g.advance(1 / 60);
    expect(g.playbackStats().recentDropped).toBe(0);
    g.advance(3); // the page was stalled for three seconds
    const s1 = g.playbackStats();
    expect(s1.recentDropped).toBeGreaterThan(100);
    expect(s1.recentDropped).toBe(s1.dropped);
    for (let i = 0; i < 60 * 20; i++) g.advance(1 / 60); // twenty seconds of smooth play afterwards
    const s2 = g.playbackStats();
    expect(s2.recentDropped).toBe(0);
    expect(s2.dropped).toBe(s1.dropped);
    expect(s2.behind).toBe(false);
  });

  it('pausing and resuming never steps the picture backwards: the first frame after resuming carries on from the one that was on screen', () => {
    for (const speed of [0.5, 1, 4, 16]) {
      const g = new Game({ seed: 'resume-' + speed });
      g.setSpeed(speed);
      for (let i = 0; i < 90; i++) g.advance(1 / 60);
      g.setPlaying(false);
      g.advance(1 / 60);
      const shown = g.simTime(); // what the paused picture is drawn at
      g.setPlaying(true);
      g.advance(1 / 60);
      const next = g.simTime();
      expect(next, `speed ${speed}`).toBeGreaterThanOrEqual(shown - 1e-9);
      expect(next - shown, `speed ${speed}`).toBeLessThan((speed * 3) / 60 + 1.5 / TPS);
    }
    // and the same after a single step
    const g = new Game({ seed: 'resume-step' });
    g.stepOnce();
    g.advance(1 / 60);
    g.advance(0.2); // the step's easing finishes
    const shown = g.simTime();
    g.setPlaying(true);
    g.advance(1 / 60);
    expect(g.simTime()).toBeGreaterThanOrEqual(shown - 1e-9);
  });

  it('requested and achieved speed are told apart: keeping up reads as equal, falling behind reads as behind', () => {
    const g = new Game({ seed: 'achieved' });
    g.setSpeed(4);
    for (let i = 0; i < 180; i++) g.advance(1 / 60); // three seconds, a smooth 60 fps
    const ok = g.playbackStats();
    expect(ok.requested).toBe(4);
    expect(ok.achieved).toBeGreaterThan(3.7);
    expect(ok.achieved).toBeLessThan(4.3);
    expect(ok.behind).toBe(false);
    // now frames take half a second each: the clock will not run more than a quarter second's worth in one
    const slow = new Game({ seed: 'achieved-slow' });
    slow.setSpeed(16);
    for (let i = 0; i < 8; i++) slow.advance(0.5);
    const s = slow.playbackStats();
    expect(s.requested).toBe(16);
    expect(s.achieved).toBeLessThan(10);
    expect(s.behind).toBe(true);
    expect(s.dropped).toBeGreaterThan(0);
  });

  it('paused means achieved speed is zero, and nothing about the world or its animation clock moves; the camera is not the clock’s business', () => {
    const g = new Game({ seed: 'paused-stats' });
    g.advance(0.3);
    g.setPlaying(false);
    const st = g.simTime();
    const h = hashWorld(g.world);
    for (let i = 0; i < 100; i++) g.advance(0.016);
    expect(g.playbackStats().achieved).toBe(0);
    expect(g.simTime()).toBe(st);
    expect(hashWorld(g.world)).toBe(h);
    g.flyTo(40, 40); // the camera still answers
    expect(g.fly).not.toBeNull();
  });

  it('stalls and speed changes in the middle of a run do not change what happens: same seed, same tick, same world', () => {
    const reference = createWorld({ ...defaultSettings('presentation-stall') });
    runTicks(reference, 1500);
    const g = new Game({ seed: 'presentation-stall' });
    let i = 0;
    const speeds = [1, 8, 0.5, 16, 2];
    while (g.world.tick < 1500) {
      if (i % 40 === 0) g.setSpeed(speeds[(i / 40) % speeds.length]);
      const remaining = 1500 - g.world.tick;
      const dt = i % 97 === 0 ? 12 : 1 / 30; // now and then a twelve-second stall
      const asked = Math.min(dt, MAX_FRAME_DT);
      g.advance(asked > remaining / (TPS * g.speed) ? remaining / (TPS * g.speed) : dt);
      i++;
      if (g.world.tick > 1500) break;
    }
    // a stall may skip real time, never world time: the world is whatever a plain run of that many ticks gives
    const plain = createWorld({ ...defaultSettings('presentation-stall') });
    runTicks(plain, g.world.tick);
    expect(hashWorld(g.world)).toBe(hashWorld(plain));
    void MAX_STEPS_PER_FRAME;
  });
});

describe('inspectors keep what is happening now apart from what just ended', () => {
  function pair(name: string) {
    const s = stage(name);
    const a = addPerson(s, 'Ana', 44, 26, { hunger: 22 });
    const b = addPerson(s, 'Ben', 46, 26, { sex: 'm', inv: { berries: 4 }, traits: { generosity: 0.9 } });
    const c = addPerson(s, 'Cal', 48, 26, { sex: 'm' });
    s.w.camp = { x: 45.5, y: 26.5 };
    const w = done(s);
    for (const [x, y] of [[a, b], [b, a]] as const) {
      relOf(x, y.id).affinity = 40;
      relOf(x, y.id).trust = 40;
    }
    return { w, a, b, c };
  }
  function start(w: World, from: ReturnType<typeof addPerson>, to: ReturnType<typeof addPerson>, purpose: ConvPurpose, conv: ConvData = {}) {
    const act = newActivity(w, from, { kind: 'socialize', label: 'x', goal: 'y', targetId: to.id, targetType: 'person', tx: to.x, ty: to.y, spotX: to.x - 1.3, spotY: to.y, utility: 100, minCommit: 4000, maxTicks: 600, data: { purpose, conv } });
    startActivity(w, from, act);
    return act;
  }

  it('the partner, purpose and outcome in each view belong to one exchange; the earlier one is not blended into the later', () => {
    const { w, a, b, c } = pair('interactions');
    const first = start(w, a, b, 'request', { reqKind: 'food', amount: 2 });
    let during: ReturnType<typeof interactionViews> | null = null;
    for (let i = 0; i < 400 && !(a.lastInteraction && a.lastInteraction.tick > first.start && !a.convId); i++) {
      run(w, 1);
      if (a.convId && !during) during = interactionViews(w, a);
    }
    expect(during?.current?.partner).toBe('Ben');
    expect(during?.current?.purpose).toMatch(/asking for something/);
    const afterFirst = interactionViews(w, a);
    expect(afterFirst.current).toBeNull();
    expect(afterFirst.previous?.partner).toBe('Ben');
    expect(afterFirst.previous?.purpose).toMatch(/asking for something/);
    expect(afterFirst.previous?.outcome).toMatch(/received|fulfilled|kept/);
    // and from Ben's side it is the same exchange, seen as someone who answered
    const benView = interactionViews(w, b);
    expect(benView.previous?.partner).toBe('Ana');
    expect(benView.previous?.purpose).toMatch(/came to Ben with a request/);
    // a second, different conversation: now Cal is current and Ben stays the previous one only
    a.cooldowns['talk' + c.id] = 0;
    const second = start(w, a, c, 'chat');
    let mid: ReturnType<typeof interactionViews> | null = null;
    for (let i = 0; i < 400 && !(a.lastInteraction && a.lastInteraction.partner === c.id && a.lastInteraction.tick > second.start); i++) {
      run(w, 1);
      if (a.convId && !mid) mid = interactionViews(w, a);
    }
    if (mid?.current) {
      expect(mid.current.partner).toBe('Cal');
      expect(mid.previous?.partner).toBe('Ben');
      expect(mid.current.purpose).not.toMatch(/asking for something/);
    }
  });
});

describe('what is drawn and listed is what is there', () => {
  it('a workshop’s inspector lists exactly the stock it holds and the progress of the batch under way', () => {
    const s = stage('present-stock');
    const p = addPerson(s, 'Mira', 44, 26);
    const b = building(s, 'timber_yard', 50, 28, 0, { wood: 5, planks: 1, handles: 2 });
    give(s.w, p, 'saw');
    const w = done(s);
    startJob(w, b, p, RECIPE_BY_ID.saw_planks, p.id, 'for a test');
    b.ops!.job!.progress = 20;
    const sections = describeFacility(w, b);
    const stock = sections.find((x) => x.title === 'Stock')!;
    const shown: Record<string, number> = {};
    for (const it of stock.items ?? []) shown[it.kind] = it.n;
    for (const k of Object.keys(b.store.items) as ItemKind[]) expect(shown[k] ?? 0).toBe(b.store.items[k] ?? 0);
    const under = sections.find((x) => x.title === 'Under way')!;
    expect(under.bars![0].value).toBe(20);
    expect(under.bars![0].max).toBe(RECIPE_BY_ID.saw_planks.work);
    const e = describeEntity(w, b.id)!;
    expect(e.sections).toBeTruthy();
    expect(e.bars.some((x) => x.label === 'Batch' && x.value === 20)).toBe(true);
  });

  it('a building site shows the materials that have actually arrived and the work that has actually been done', () => {
    const s = stage('present-site');
    const p = addPerson(s, 'Mira', 44, 26);
    const st = site(s, 'house', 50, 28, p.hhId, p.id, { wood: 6, planks: 3 });
    st.work = 120;
    const w = done(s);
    const e = describeEntity(w, st.id)!;
    const mat = e.sections!.find((x) => x.title === 'Materials')!;
    expect(mat.bars!.find((b) => b.label === 'planks supplied')!.value).toBe(3);
    expect(mat.bars!.find((b) => b.label === 'wood supplied')!.value).toBe(6);
    expect(mat.notes!.join(' ')).toMatch(/Still needed: 5 planks, 6 bricks/);
    expect(e.sections!.find((x) => x.title === 'Work')!.bars![0].value).toBe(120);
    expect(weightOf(st.delivered)).toBeGreaterThan(0);
  });

  it('inspecting workshops, sites, carts and people never perturbs the simulation', () => {
    const a = createWorld({ ...defaultSettings('inspect-quiet') });
    const b = createWorld({ ...defaultSettings('inspect-quiet') });
    for (let i = 0; i < 6; i++) {
      runTicks(a, 250);
      runTicks(b, 250);
      for (const e of [...b.buildings, ...b.sites, ...b.carts]) describeEntity(b, e.id);
      for (const p of b.persons) describePerson(b, p.id);
    }
    expect(hashWorld(b)).toBe(hashWorld(a));
  });
});
