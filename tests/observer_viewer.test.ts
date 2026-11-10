// The compact resident card and the full character viewer read derived views (src/sim/inspect_observer.ts). Each view must come
// from recorded state and say nothing where the simulation recorded nothing. These are staged contracts for each derivation.
import { expect, it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { newActivity, startActivity, suspendActivity } from '../src/sim/activities';
import { decide } from '../src/sim/decision';
import { describePerson } from '../src/sim/inspect';
import { knowledgeItems, statusLine, timeline, worldTimeText } from '../src/sim/inspect_observer';
import { learn as putBelief } from '../src/sim/knowledge';
import { makeSource } from '../src/sim/sources';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { addPerson, done, learn, pin, stage } from './helpers/kit';
import { run } from './helpers/util';

it('a hungry person acting on a told berry bush shows a provenance cue naming the teller, and the card intent points at the bush', () => {
  const s = stage('observer-told');
  s.w.settings.dynamics = 'rich';
  const ada = addPerson(s, 'Ada', 40, 40, { hunger: 20, thirst: 100, energy: 100 });
  const kai = addPerson(s, 'Kai', 42, 40, { hunger: 90 });
  pin(kai);
  const bush = makeSource(s.w, 'berry_bush', 40, 52, 6);
  const w = done(s);
  w.tick = 500;
  learn(w, kai, bush);
  // Ada has never seen the bush: she holds Kai's report of it
  putBelief(ada, { ...kai.beliefs[bush.id], src: 'told', from: kai.id, learned: w.tick });
  decide(w, ada, 'staged hunger');
  expect(ada.activity?.targetId).toBe(bush.id);
  const before = serializeWorld(w);
  const v = describePerson(w, ada.id)!;
  expect(v.provenance).toMatch(/^Following Kai's report/);
  expect(v.intent?.kind).toBe('destination');
  expect(v.intent?.text).toMatch(/^Heading to Berry bush/);
  expect(Math.hypot(v.intent!.x - bush.x, v.intent!.y - bush.y)).toBeLessThan(3);
  const item = v.knowledgeItems.find((k) => k.id === bush.id)!;
  expect(item.src).toBe('told');
  expect(item.from).toBe('Kai');
  expect(item.worldCheck).toBe('present');
  // a first-hand sight carries no teller and no cue
  const vk = describePerson(w, kai.id)!;
  expect(vk.knowledgeItems.find((k) => k.id === bush.id)!.src).toBe('seen');
  expect(vk.knowledgeItems.find((k) => k.id === bush.id)!.from).toBe('');
  expect(serializeWorld(w)).toBe(before);
});

it('the world check on a belief is the viewer’s comparison: a bush picked bare reads empty and a bush that is gone reads gone; the person’s belief is untouched', () => {
  const s = stage('observer-check');
  s.w.settings.dynamics = 'rich';
  const ada = addPerson(s, 'Ada', 40, 40);
  const bushA = makeSource(s.w, 'berry_bush', 44, 44, 6);
  const bushB = makeSource(s.w, 'berry_bush', 46, 46, 6);
  const w = done(s);
  learn(w, ada, bushA, bushB);
  bushA.amount = 0; // picked bare since Ada saw it
  w.byId.delete(bushB.id); // gone from the register (a felled tree, a used-up rock)
  const items = knowledgeItems(w, ada);
  expect(items.find((k) => k.id === bushA.id)?.worldCheck).toBe('empty');
  expect(items.find((k) => k.id === bushB.id)?.worldCheck).toBe('gone');
  expect(ada.beliefs[bushA.id].amount).toBe(6); // the viewer learned it; Ada did not
  expect(ada.beliefs[bushB.id]).toBeDefined();
});

it('the status line says at risk before anything else, interrupted while work is set aside, and no immediate problem otherwise', () => {
  const s = stage('observer-status');
  const ada = addPerson(s, 'Ada', 40, 40, { hunger: 80, thirst: 90, energy: 90 });
  const w = done(s);
  expect(statusLine(w, ada)).toEqual({ text: 'No immediate problem', tone: 'ok' });
  const a = newActivity(w, ada, { kind: 'rest', label: 'Gathering berries', goal: 'food', here: true, duration: 100 });
  startActivity(w, ada, a);
  suspendActivity(w, ada);
  expect(ada.suspended?.label).toBe('Gathering berries');
  const st = statusLine(w, ada);
  expect(st.tone).toBe('warn');
  expect(st.text).toContain('Interrupted: “Gathering berries” set aside');
  const v = describePerson(w, ada.id)!;
  expect(v.suspended?.label).toBe('Gathering berries');
  ada.needs.hunger = 5;
  expect(statusLine(w, ada)).toEqual({ text: 'At risk: starving', tone: 'danger' });
  ada.needs.hunger = 80;
  ada.suspended = null;
  const b = newActivity(w, ada, { kind: 'rest', label: 'Resting', goal: 'recover', here: true });
  startActivity(w, ada, b);
  b.blocked = 'home exit is blocked';
  expect(statusLine(w, ada)).toEqual({ text: 'Blocked: home exit is blocked', tone: 'warn' });
});

it('an ordinary world’s history merges the log and the decision ledger in one newest-first world-time order, with decisions and their endings', () => {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  run(w, 900);
  const p = w.persons.filter((q) => q.alive && (q.decisions ?? []).some((e) => e.outcome)).sort((a, b) => (b.decisions?.length ?? 0) - (a.decisions?.length ?? 0))[0];
  expect(p).toBeDefined();
  const before = serializeWorld(w);
  const rows = timeline(w, p);
  expect(rows.length).toBeGreaterThan(5);
  for (let i = 1; i < rows.length; i++) expect(rows[i - 1].tick).toBeGreaterThanOrEqual(rows[i].tick);
  for (const r of rows) {
    expect(r.when).toMatch(/^Day \d+, \d\d:\d\d$/);
    expect(r.when).toBe(worldTimeText(r.tick));
  }
  const kinds = new Set(rows.map((r) => r.kind));
  expect(kinds.has('decision')).toBe(true);
  expect(kinds.has('outcome')).toBe(true);
  // every closed ledger entry has its ending in the history at the tick it ended, worded from the recorded outcome
  const closed = (p.decisions ?? []).filter((e) => e.outcome);
  for (const e of closed) {
    const row = rows.find((r) => r.kind === 'outcome' && r.tick === e.endedAt && r.text.includes(e.outcome!));
    if (rows[rows.length - 1].tick <= e.endedAt!) expect(row, `ending of ${e.chosen} at ${e.endedAt}`).toBeDefined();
  }
  // the card view carries the same derived fields and inspecting changes nothing
  const v = describePerson(w, p.id)!;
  expect(v.timeline[0].tick).toBe(rows[0].tick);
  expect(v.status.text.length).toBeGreaterThan(0);
  expect(v.relationships.every((r, i, arr) => i === 0 || Number(arr[i - 1].household) >= Number(r.household))).toBe(true);
  expect(serializeWorld(w)).toBe(before);
});
