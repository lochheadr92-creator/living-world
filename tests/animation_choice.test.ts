// The renderer's choice of animation (src/render/animation.ts): read from a person's own record, never from a new pose.
// These are staged records: they establish which animation a state is DRAWN with, not that the state arises in a world.
import { describe, expect, it } from 'vitest';
import { NO_CONDITION, animationOf, conditionOf, isPose } from '../src/render/animation';
import type { AnimId } from '../src/render/animation';
import type { Conversation, Person, PoseKind, World } from '../src/sim/types';

const TICK = 5000;
const world = (o: Record<string, unknown> = {}): World => ({ tick: TICK, occasions: [], civicProjects: [], byId: new Map(), ...o }) as unknown as World;
const person = (pose: PoseKind, kind: string | null, data: Record<string, unknown> = {}, phase: 'travel' | 'work' = 'work', extra: Record<string, unknown> = {}): Person =>
  ({
    id: 7,
    pose,
    convId: 0,
    speech: null,
    mood: { level: 0, thoughts: [] },
    pregnantUntil: 0,
    activity: kind ? { kind, phase, data, progress: 0, pprogress: 0, duration: 100 } : null,
    ...extra,
  }) as unknown as Person;
const conv = (purpose: string, a: number, b: number, data: Record<string, unknown> = {}): Conversation => ({ id: 1, a, b, purpose, data }) as unknown as Conversation;
const pick = (w: World, p: Person, c?: Conversation): AnimId => animationOf(w, p, p.pose, c);

describe('the animation is chosen from the activity the person is in', () => {
  const cases: [string, PoseKind, string, Record<string, unknown>, 'travel' | 'work', AnimId][] = [
    // B: what was drawn standing
    ['idling', 'stand', 'wander', {}, 'work', 'idle'],
    ['the evening fire', 'stand', 'wander', { evening: 'fire' }, 'work', 'fire_sit'],
    ['walking out, on the way', 'walk', 'wander', { walk: { id: 1 } }, 'travel', 'stroll'],
    ['walking out, arrived', 'stand', 'wander', { walk: { id: 1 } }, 'work', 'walkout'],
    ['running to meet somebody', 'run', 'wander', { reunion: {} }, 'travel', 'greet_run'],
    ['the reunion', 'stand', 'wander', { reunion: {} }, 'work', 'embrace'],
    ['exploring', 'stand', 'explore', {}, 'work', 'lookout'],
    ['searching', 'stand', 'search', {}, 'work', 'search'],
    ['claiming a home', 'stand', 'claim_home', {}, 'work', 'claim'],
    ['paying respects', 'stand', 'pay_respects', {}, 'work', 'respects'],
    ['looking in on somebody', 'stand', 'visit', {}, 'work', 'lookin'],
    ['minding a child', 'stand', 'visit', { watch: true }, 'work', 'mind'],
    ['attending a birth', 'stand', 'visit', { birth: true }, 'work', 'attend_birth'],
    ['a birth helper at an empty door', 'stand', 'visit', { birth: true, emptyDoor: true }, 'work', 'stand'],
    ['a search party walking', 'walk', 'visit', { fetch: {} }, 'travel', 'search_walk'],
    ['a search party calling', 'stand', 'visit', { fetch: {} }, 'work', 'call'],
    ['a search party companion', 'walk', 'visit', { fetchWith: {} }, 'travel', 'search_walk'],
    ['the one fetched home', 'walk', 'visit', { fetchedBy: {} }, 'travel', 'walk'],
    ['dancing, stepping', 'walk', 'attend', { dance: { n: 3, moving: true } }, 'work', 'dance'],
    ['dancing, between steps', 'stand', 'attend', { dance: { n: 3 } }, 'work', 'dance'],
    ['a dance that is over', 'stand', 'attend', { dance: { n: 120, done: true }, occasion: 0 }, 'work', 'stand'],
    ['a trading journey', 'walk', 'exchange_journey', {}, 'travel', 'trek'],
    ['a trading journey, arrived', 'stand', 'exchange_journey', {}, 'work', 'barter'],
    ['moving house', 'walk', 'relocate', {}, 'travel', 'trudge'],
    ['moving house, arrived', 'stand', 'relocate', {}, 'work', 'unpack'],
    // C: what was drawn sitting
    ['resting', 'sit', 'rest', {}, 'work', 'rest'],
    ['warming', 'sit', 'warm', {}, 'work', 'warm'],
    ['time alone', 'sit', 'alone', {}, 'work', 'alone'],
    ['a shared meal', 'sit', 'attend_meal', {}, 'work', 'meal_sit'],
    ['hosting a meal', 'sit', 'host_meal', { laid: true }, 'work', 'meal_sit'],
    ['eating at a shared meal', 'eat', 'attend_meal', { eating: true }, 'work', 'meal_eat'],
    ['a vigil', 'sit', 'rest', { vigil: {} }, 'work', 'vigil'],
    ['lying in', 'sit', 'rest', { lyingIn: 12 }, 'work', 'lyingin'],
    ['sitting with the grieving', 'sit', 'rest', { grief: {} }, 'work', 'comfort'],
    ['settling a child', 'sit', 'rest', { settle: {} }, 'work', 'settle'],
    ['standing up for somebody', 'sit', 'rest', { side: { for: 1, against: 2, since: 0 } }, 'work', 'standup'],
    // D: what was a general work motion
    ['making a tool', 'craft', 'craft', {}, 'work', 'whittle'],
    ['mending a tool', 'craft', 'tool_work', { toolId: 3 }, 'work', 'mend_tool'],
    ['mending a cart', 'craft', 'tool_work', { cartId: 3 }, 'work', 'mend_cart'],
    ['cloth work', 'craft', 'tool_work', { textile: true }, 'work', 'weave'],
    ['butchering', 'craft', 'butcher', {}, 'work', 'butcher'],
    ['feeding livestock', 'craft', 'animal_work', { op: 'feed' }, 'work', 'feed_animal'],
    ['shearing', 'craft', 'animal_work', { op: 'shear' }, 'work', 'shear'],
    ['tethering', 'craft', 'animal_work', { op: 'acquire' }, 'work', 'tether'],
    ['setting a net', 'craft', 'gear_work', { op: 'place' }, 'work', 'setgear'],
    ['hauling a net in', 'craft', 'gear_work', { op: 'retrieve' }, 'work', 'haul_net'],
    ['hanging a wolf skin', 'craft', 'hang_skin', {}, 'work', 'hangskin'],
    ['a workshop with no motion of its own', 'craft', 'operate', {}, 'work', 'workbench'],
    ['a workshop with one', 'saw', 'operate', {}, 'work', 'saw'],
    ['hunting, closing', 'walk', 'hunt', {}, 'travel', 'stalk'],
    ['hunting, the strike', 'pick', 'hunt', {}, 'work', 'strike'],
    ['standing against a wolf', 'pick', 'defend', {}, 'work', 'guard'],
    ['running at a wolf', 'run', 'defend', {}, 'travel', 'charge'],
    ['putting goods in', 'store', 'deposit', {}, 'work', 'putaway'],
    ['taking goods out', 'store', 'withdraw', {}, 'work', 'takeout'],
    ['hauling', 'store', 'haul', {}, 'work', 'heave'],
    ['feeding a fire', 'store', 'fuel_fire', {}, 'work', 'feedfire'],
    ['filling a jar', 'drink', 'fetch_water', {}, 'work', 'filljar'],
    ['mending a building', 'build', 'repair', {}, 'work', 'mend'],
    ['laying out a site', 'build', 'plan_site', {}, 'work', 'survey'],
    // F: children playing alone
    ['a child with stones', 'stand', 'wander', { play: 'stones' }, 'work', 'play_ground'],
    ['a child with sticks', 'stand', 'wander', { play: 'sticks' }, 'work', 'play_sticks'],
    ['a child with a toy', 'stand', 'wander', { play: 'toy' }, 'work', 'play_toy'],
    // what was distinct already stays what it was
    ['picking berries', 'pick', 'gather', {}, 'work', 'pick'],
    ['drinking', 'drink', 'drink', {}, 'work', 'drink'],
    ['building', 'build', 'build', {}, 'work', 'build'],
    ['walking to work', 'walk', 'gather', {}, 'travel', 'walk'],
    ['sleeping', 'sleep', 'sleep', {}, 'work', 'sleep'],
    ['fleeing', 'fear', 'flee', {}, 'work', 'fear'],
  ];
  it.each(cases)('%s', (_name, pose, kind, data, phase, want) => {
    expect(pick(world(), person(pose, kind, data, phase))).toBe(want);
  });

  it('nobody doing nothing is drawn as anything but their pose', () => {
    for (const pose of ['stand', 'walk', 'sit', 'sleep'] as PoseKind[]) expect(pick(world(), person(pose, null))).toBe(pose);
  });

  it('a person standing on the way somewhere is not drawn at the scene yet', () => {
    expect(pick(world(), person('stand', 'explore', {}, 'travel'))).toBe('stand');
    expect(pick(world(), person('stand', 'wander', { evening: 'fire' }, 'travel'))).toBe('stand');
  });
});

describe('an occasion is read from the occasion itself', () => {
  const at = (kind: string, status = 'gathering'): World => world({ occasions: [{ id: 4, kind, status }] });
  const p = person('stand', 'attend', { occasion: 4 });
  it('a feast, a wedding and a harvest feast celebrate; a market trades; a funeral mourns', () => {
    expect(pick(at('feast'), p)).toBe('celebrate');
    expect(pick(at('wedding'), p)).toBe('celebrate');
    expect(pick(at('harvest'), p)).toBe('celebrate');
    expect(pick(at('market'), p)).toBe('market');
    expect(pick(at('funeral'), p)).toBe('funeral');
  });
  it('before it has begun they only stand and wait', () => {
    expect(pick(at('feast', 'called'), p)).toBe('stand');
    expect(pick(world(), p)).toBe('stand');
  });
});

describe('talk is told apart by the conversation', () => {
  const lead = person('talk', 'socialize');
  const other = person('talk', 'converse', {}, 'work', { id: 8 });
  const both = (purpose: string, data: Record<string, unknown> = {}): [AnimId, AnimId] => {
    const c = conv(purpose, 7, 8, data);
    return [pick(world(), lead, c), pick(world(), other, c)];
  };
  it('each purpose with a look of its own', () => {
    expect(both('chat')).toEqual(['talk', 'talk']);
    expect(both('warn')).toEqual(['talk_warn', 'alarmed']);
    expect(both('court')).toEqual(['ask_court', 'demure']);
    expect(both('welcome')).toEqual(['welcome', 'talk']);
    expect(both('recruit')).toEqual(['rally', 'talk']);
    expect(both('mediate')).toEqual(['peace', 'talk']);
    expect(both('teach_technique')).toEqual(['teach', 'learn']);
    expect(both('learn_technique')).toEqual(['learn', 'teach']);
  });
  it("children's games", () => {
    expect(both('play_together', { game: 'chase' })).toEqual(['game_chaser', 'game_runner']);
    expect(both('play_together', { game: 'hide' })).toEqual(['game_count', 'game_hide']);
    expect(both('play_together', { game: 'house' })).toEqual(['game_house', 'game_house']);
    expect(both('play_together', { game: 'guess' })).toEqual(['talk', 'talk']);
  });
  it('talk with no conversation on record is plain talk', () => {
    expect(pick(world(), lead)).toBe('talk');
  });
});

describe('what is said to a company is told from the speaker', () => {
  const sitter = (extra: Record<string, unknown>): Person => person('stand', 'wander', { evening: 'fire' }, 'work', extra);
  it('a story, by the thought dated the tick it began', () => {
    const p = sitter({ speech: { text: 'Listen.', kind: 'say', until: TICK + 60 }, mood: { thoughts: [{ kind: 'told_story', since: TICK - 30 }] } });
    expect(pick(world(), p)).toBe('fire_story');
  });
  it('a song, the same way', () => {
    const p = sitter({ speech: { text: 'Sing it with me.', kind: 'happy', until: TICK + 100 }, mood: { thoughts: [{ kind: 'sang', since: TICK - 20 }] } });
    expect(pick(world(), p)).toBe('fire_sing');
  });
  it('an old song is not sung again by a later remark', () => {
    const p = sitter({ speech: { text: 'It is late.', kind: 'happy', until: TICK + 40 }, mood: { thoughts: [{ kind: 'sang', since: TICK - 900 }] } });
    expect(pick(world(), p)).toBe('fire_sit');
  });
  it('a thanks, by its words', () => {
    expect(pick(world(), sitter({ speech: { text: 'Thank you, Anna, for the hall.', kind: 'say', until: TICK + 60 } }))).toBe('fire_thanks');
  });
  it('speaking for a building, by the project that records the tick', () => {
    const w = world({ civicProjects: [{ spoke: TICK - 60, council: { candidates: [{ personId: 7 }] } }] });
    expect(pick(w, sitter({ speech: { text: 'We need a storehouse.', kind: 'say', until: TICK + 60 } }))).toBe('fire_address');
    expect(pick(world(), sitter({ speech: { text: 'We need a storehouse.', kind: 'say', until: TICK + 60 } }))).toBe('fire_sit');
  });
  it('a listener, by their own thought of the story while it is told', () => {
    expect(pick(world(), sitter({ mood: { thoughts: [{ kind: 'story', since: TICK - 30 }] } }))).toBe('fire_listen');
    expect(pick(world(), sitter({ mood: { thoughts: [{ kind: 'story', since: TICK - 400 }] } }))).toBe('fire_sit');
  });
});

describe('a condition is drawn only when the record holds it', () => {
  it('nothing on the record, nothing drawn', () => {
    expect(conditionOf(world(), person('stand', null))).toBe(NO_CONDITION);
  });
  it('a fever, an injury of each kind, a pregnancy near its time, a bereavement', () => {
    expect(conditionOf(world(), person('stand', null, {}, 'work', { illness: { severity: 40 } })).fever).toBeGreaterThan(0);
    expect(conditionOf(world(), person('stand', null, {}, 'work', { injury: { kind: 'sprain', until: TICK + 10 } })).limp).toBe(true);
    expect(conditionOf(world(), person('stand', null, {}, 'work', { injury: { kind: 'broken', until: TICK + 10 } })).sling).toBe(true);
    expect(conditionOf(world(), person('stand', null, {}, 'work', { injury: { kind: 'cut', until: TICK + 10 } })).cut).toBe(true);
    expect(conditionOf(world(), person('stand', null, {}, 'work', { pregnantUntil: TICK + 500 })).belly).toBeGreaterThan(0);
    expect(conditionOf(world(), person('stand', null, {}, 'work', { lifeEvent: { kind: 'bereaved', until: TICK + 10 } })).mourning).toBe(true);
  });
  it('a healed injury, an early pregnancy and a past bereavement are not drawn', () => {
    expect(conditionOf(world(), person('stand', null, {}, 'work', { injury: { kind: 'sprain', until: TICK - 1 } }))).toBe(NO_CONDITION);
    expect(conditionOf(world(), person('stand', null, {}, 'work', { pregnantUntil: TICK + 30000 })).belly).toBe(0);
    expect(conditionOf(world(), person('stand', null, {}, 'work', { lifeEvent: { kind: 'bereaved', until: TICK - 1 } }))).toBe(NO_CONDITION);
    expect(conditionOf(world(), person('stand', null, {}, 'work', { lifeEvent: { kind: 'moved', until: TICK + 10 } }))).toBe(NO_CONDITION);
  });
});

describe('the pose the simulation set is never changed', () => {
  it('choosing an animation leaves the person as they were', () => {
    const p = person('sit', 'rest', { vigil: {} });
    const before = JSON.stringify(p);
    expect(isPose(pick(world(), p))).toBe(false);
    expect(JSON.stringify(p)).toBe(before);
    expect(p.pose).toBe('sit');
  });
});
