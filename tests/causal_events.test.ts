// Rules 182: a grievance remembers the event that caused it.
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { linkCause, setCausalEvents } from '../src/sim/causal_events';
import { adjustRel } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { contestLost, startArgument } from '../src/sim/social';
import { addPerson, done, stage } from './helpers/kit';

afterEach(() => { setCausalEvents(true); });

function scene(version: number, dynamics: 'rich' | 'authored' = 'rich') {
  const s = stage(`causal-events-${version}-${dynamics}`);
  s.w.settings.dynamics = dynamics;
  s.w.settings.rulesVersion = version;
  const ann = addPerson(s, 'Ann', 40, 40, { age: 30 });
  const bob = addPerson(s, 'Bob', 41, 40, { age: 30 });
  const w = done(s);
  return { w, ann, bob };
}

const lastEvent = (w: ReturnType<typeof scene>['w'], text: string) => [...w.events].reverse().find((e) => e.text.includes(text));
const soreEntry = (p: ReturnType<typeof scene>['ann'], other: number) => p.relations[other].history.find((h) => h.text.startsWith('sore:'));
const argueEntry = (p: ReturnType<typeof scene>['ann'], other: number) => p.relations[other].history.find((h) => h.text.startsWith('argued over'));

describe('rules 182: a grievance remembers the event that caused it', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(182);
    expect(SUPPORTED_RULES_VERSIONS).toContain(182);
  });

  it('at 181 an argument records the event and the grievances but no id on them', () => {
    const { w, ann, bob } = scene(181);
    startArgument(w, ann, bob, 'the well');
    expect(lastEvent(w, 'argued over the well')).toBeTruthy();
    expect(ann.relations[bob.id].grievance?.eventId).toBeUndefined();
    expect(bob.relations[ann.id].grievance?.eventId).toBeUndefined();
    expect(soreEntry(ann, bob.id)?.eventId).toBeUndefined();
    expect(argueEntry(ann, bob.id)?.eventId).toBeUndefined();
  });

  it('at 182 the same argument gives both grievances and both history notes the id of its event', () => {
    const { w, ann, bob } = scene(182);
    startArgument(w, ann, bob, 'the well');
    const ev = lastEvent(w, 'argued over the well')!;
    expect(ev).toBeTruthy();
    for (const [me, other] of [[ann, bob], [bob, ann]] as const) {
      expect(me.relations[other.id].grievance?.eventId).toBe(ev.id);
      expect(soreEntry(me, other.id)?.eventId).toBe(ev.id);
      expect(argueEntry(me, other.id)?.eventId).toBe(ev.id);
    }
  });

  it('at 182 a contest lost on a feed day is linked, and a quiet one is not', () => {
    const { w, ann, bob } = scene(182);
    ann.needs.hunger = 40;
    contestLost(w, ann, bob.id, { item: 'berries', x: ann.x, y: ann.y });
    const ev = lastEvent(w, 'reached the last berry')!;
    expect(ev).toBeTruthy();
    expect(ann.relations[bob.id].grievance?.eventId).toBe(ev.id);
    expect(soreEntry(ann, bob.id)?.eventId).toBe(ev.id);
    // a second miss soon after makes no feed line, so it leaves the link as it was
    contestLost(w, ann, bob.id, { item: 'berries', x: ann.x, y: ann.y });
    expect(w.events.filter((e) => e.text.includes('reached the last berry')).length).toBe(1);
    expect(ann.relations[bob.id].grievance?.eventId).toBe(ev.id);
  });

  it('linkCause ties only this tick\'s notes with the named text and the grievance with the named detail', () => {
    const { w, ann, bob } = scene(182);
    adjustRel(ann, bob.id, w.tick - 10, { note: 'an older note' });
    adjustRel(ann, bob.id, w.tick, { note: 'the note for this incident' });
    adjustRel(ann, bob.id, w.tick, { note: 'an unrelated note the same tick' });
    linkCause(w, ann, bob.id, 4242, { texts: ['the note for this incident', 'an older note'] });
    const byText = (t: string) => ann.relations[bob.id].history.find((h) => h.text === t)!;
    expect(byText('the note for this incident').eventId).toBe(4242);
    expect(byText('an unrelated note the same tick').eventId).toBeUndefined();
    expect(byText('an older note').eventId).toBeUndefined();
    expect(ann.relations[bob.id].grievance).toBeNull();
  });

  it('the id survives a save and load', () => {
    const { w, ann, bob } = scene(182);
    startArgument(w, ann, bob, 'the well');
    const ev = lastEvent(w, 'argued over the well')!;
    const copy = deserializeWorld(serializeWorld(w));
    const a = copy.persons.find((p) => p.id === ann.id)!;
    expect(a.relations[bob.id].grievance?.eventId).toBe(ev.id);
    expect(soreEntry(a, bob.id)?.eventId).toBe(ev.id);
  });

  it('with the switch off nothing is linked at 182', () => {
    const { w, ann, bob } = scene(182);
    setCausalEvents(false);
    startArgument(w, ann, bob, 'the well');
    expect(ann.relations[bob.id].grievance?.eventId).toBeUndefined();
    expect(soreEntry(ann, bob.id)?.eventId).toBeUndefined();
  });

  it('an authored world links nothing at 182', () => {
    const { w, ann, bob } = scene(182, 'authored');
    startArgument(w, ann, bob, 'the well');
    expect(ann.relations[bob.id].grievance?.eventId).toBeUndefined();
  });
});
