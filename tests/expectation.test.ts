import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { conservationReport, ledgerConsume } from '../src/sim/economy';
import { describePerson } from '../src/sim/inspect';
import { tellBelief } from '../src/sim/news';
import { makeSource } from '../src/sim/sources';
import { addPerson, done, learn, pin, stage } from './helpers/kit';
import { run } from './helpers/util';

// STAGED: Ana once saw a berry bush with six berries on it, far from where Ben stands, and tells him about it. A minute later,
// just as Ben gets hungry and sets out for it on her word, somebody else has picked it clean (and it has not had time to regrow).
function toldOfABush(name: string) {
  const s = stage(name);
  const ana = addPerson(s, 'Ana', 44.5, 30.5, { hunger: 95 });
  const ben = addPerson(s, 'Ben', 44.5, 40.5, { sex: 'm', hunger: 95 });
  const bush = makeSource(s.w, 'berry_bush', 62, 46, 6);
  const w = done(s);
  learn(w, ana, bush);
  pin(ana);
  pin(ben);
  tellBelief(w, ana, ben, ana.beliefs[bush.id]);
  run(w, 650); // the news is a minute old
  ledgerConsume(w, 'berries', bush.amount, 'staged: picked by somebody else');
  bush.amount = 0;
  bush.regrowTimer = 0;
  delete ben.cooldowns.pause;
  ben.needs.hunger = 30;
  ben.nextThink = w.tick;
  return { w, ben, bush };
}

const letDown = /^The berry bush Ana had described \(about 6, 1\.\d min old\) was bare when I got close\.$/;

describe('what they expected against what they found', () => {
  it('going on Ana’s word, Ben sees the bush bare as he comes near, and remembers it so — without writing it off as a failure', () => {
    const { w, ben, bush } = toldOfABush('let-down');
    expect(ben.beliefs[bush.id].src).toBe('told');
    let why = '';
    run(w, 600, () => {
      if (!why && ben.activity?.targetId === bush.id) why = ben.lastDecision?.because ?? '';
    });
    expect(why, 'the reason for the trip names whose word it was on').toMatch(/on Ana’s word, seen \d+\.\d min ago/);
    const lines = ben.log.filter((l) => /berry bush/.test(l.text) && /was bare/.test(l.text));
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toMatch(letDown);
    expect(ben.failures[bush.id], 'the simulation’s own record of failures is left alone').toBeUndefined();
    expect(conservationReport(w).ok).toBe(true);
    // a loaded save remembers it the same way
    const copy = deserializeWorld(serializeWorld(w));
    expect(describePerson(copy, ben.id)).toEqual(describePerson(w, ben.id));
  });

  it('a place that empties while it is in view was just seen, not remembered: the line gives no age', () => {
    // STAGED: Ben saw the bush himself, earlier, and sets out for it when hungry; it is picked clean while he can see it
    const s = stage('let-down-in-view');
    const ben = addPerson(s, 'Ben', 44.5, 40.5, { sex: 'm', hunger: 30 });
    const bush = makeSource(s.w, 'berry_bush', 62, 46, 6);
    const w = done(s);
    learn(w, ben, bush);
    let setOut = -1;
    let emptied = false;
    run(w, 600, () => {
      if (emptied || ben.activity?.targetId !== bush.id || ben.activity.phase !== 'travel') return;
      if (setOut < 0) setOut = w.tick;
      if (ben.beliefs[bush.id].seen <= setOut) return; // not yet in view
      ledgerConsume(w, 'berries', bush.amount, 'staged: picked by somebody else');
      bush.amount = 0;
      bush.regrowTimer = 0;
      emptied = true;
    });
    expect(emptied, 'Ben came within sight of the bush on his way').toBe(true);
    const lines = ben.log.filter((l) => /berry bush/.test(l.text) && /was bare/.test(l.text));
    expect(lines.map((l) => l.text)).toEqual(['The berry bush I had just seen (about 6) was bare when I got close.']);
    expect(ben.failures[bush.id]).toBeUndefined();
    expect(conservationReport(w).ok).toBe(true);
  });

  it('it is one more memory: the log keeps its sixty-entry limit', () => {
    const { w, ben } = toldOfABush('let-down-full-log');
    for (let i = 0; i < 60; i++) ben.log.push({ tick: w.tick, text: `filler ${i}`, kind: 'info' });
    run(w, 600);
    expect(ben.log.length).toBe(60);
    expect(ben.log.some((l) => letDown.test(l.text))).toBe(true);
  });
});
