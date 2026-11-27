// The renderer's choice of animation (src/render/animation.ts): read from a person's own record, never from a new pose.
// These are staged records: they establish which animation a state is DRAWN with, not that the state arises in a world.
import { describe, expect, it } from 'vitest';
import { NO_CONDITION, animationOf, conditionOf, isPose, isQuiet, walkToolOf } from '../src/render/animation';
import type { AnimId } from '../src/render/animation';
import type { Conversation, Person, PoseKind, World } from '../src/sim/types';
import { TICKS_PER_YEAR } from '../src/sim/constants'; // walking (G)

const TICK = 5000;
const world = (o: Record<string, unknown> = {}): World => ({ tick: TICK, occasions: [], civicProjects: [], byId: new Map(), ...o }) as unknown as World;
const person = (pose: PoseKind, kind: string | null, data: Record<string, unknown> = {}, phase: 'travel' | 'work' = 'work', extra: Record<string, unknown> = {}): Person =>
  ({
    id: 7,
    pose,
    convId: 0,
    speech: null,
    mood: { level: 0, thoughts: [] },
    // walking (G): a person who is well, thirty and carrying nothing
    needs: { hunger: 80, thirst: 80, energy: 80, warmth: 80, safety: 80, social: 80 },
    inv: {},
    birthTick: TICK - 30 * TICKS_PER_YEAR,
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
    ['milking', 'craft', 'animal_work', { op: 'milk' }, 'work', 'milk'],
    ['collecting eggs', 'craft', 'animal_work', { op: 'egg' }, 'work', 'takeout'],
    ['feeding hay', 'craft', 'animal_work', { op: 'hay_feed' }, 'work', 'feed_animal'],
    ['mixing feed', 'craft', 'animal_work', { op: 'mix_feed' }, 'work', 'workbench'],
    ['mending a pen', 'craft', 'animal_work', { op: 'repair' }, 'work', 'mend_cart'],
    ['housing an animal', 'craft', 'animal_work', { op: 'house' }, 'work', 'tether'],
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
    // G: how a person on foot goes (the ones the activity alone decides; the rest are below)
    ['on the way to bed', 'walk', 'sleep', {}, 'travel', 'walk_tired'],
    ['on the way to a fire', 'walk', 'warm', {}, 'travel', 'walk_cold'],
    ['on the way to talk to somebody', 'walk', 'socialize', {}, 'travel', 'walk_social'],
    ['on the way to answer somebody', 'walk', 'converse', {}, 'travel', 'walk_social'],
    ['on the way to look in on somebody', 'walk', 'visit', {}, 'travel', 'walk_social'],
    ['on the way to hand something over', 'walk', 'give', {}, 'travel', 'walk_social'],
    ['on the way to a meal', 'walk', 'attend_meal', {}, 'travel', 'walk_social'],
    ['on the way to host a meal', 'walk', 'host_meal', {}, 'travel', 'walk_social'],
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

// walking (G): how a person on foot goes, told from their own record (animation.ts walkingOf)
describe('a person on foot is drawn by what the record says of them', () => {
  const WELL = { hunger: 80, thirst: 80, energy: 80, warmth: 80, safety: 80, social: 80 };
  interface Walk {
    data?: Record<string, unknown>;
    need?: string | null;
    needs?: Partial<typeof WELL>;
    inv?: Record<string, number>;
    mood?: number;
    age?: number;
    target?: number;
  }
  /** a person on the way (the travel phase, the walking pose) with the record named */
  const walker = (kind: string | null, o: Walk = {}): Person => {
    const p = person('walk', kind, o.data ?? {}, 'travel', {
      needs: { ...WELL, ...o.needs },
      inv: o.inv ?? {},
      mood: { level: o.mood ?? 0, thoughts: [] },
      birthTick: TICK - (o.age ?? 30) * TICKS_PER_YEAR,
    });
    if (p.activity) Object.assign(p.activity, { need: o.need ?? null, targetId: o.target ?? 0, targetType: '', tx: 0, ty: 0 });
    return p;
  };
  const rich = (sources: Record<number, string> = {}): World =>
    world({ settings: { dynamics: 'rich', rulesVersion: 300 }, byId: new Map(Object.entries(sources).map(([id, type]) => [Number(id), { ent: 'source', type }])) });
  const is = (p: Person, want: AnimId, w: World = world()): void => expect(pick(w, p)).toBe(want);

  it('worn out is drawn tired, wherever they are going; a little tired is not', () => {
    is(walker('gather', { needs: { energy: 20 } }), 'walk_tired');
    is(walker('gather', { needs: { energy: 24 } }), 'walk_tired');
    is(walker('gather', { needs: { energy: 25 } }), 'walk');
    is(walker('gather', { needs: { energy: 40 } }), 'walk');
  });
  it('cold is drawn hunched; a little cool is not', () => {
    is(walker('gather', { needs: { warmth: 30 } }), 'walk_cold');
    is(walker('gather', { needs: { warmth: 35 } }), 'walk');
  });
  it('on the way to food or water, in need of it, is drawn quick', () => {
    is(walker('eat_store', { need: 'hunger', needs: { hunger: 30 } }), 'walk_urgent');
    is(walker('drink', { need: 'thirst', needs: { thirst: 30 } }), 'walk_urgent');
    is(walker('gather', { need: 'hunger', needs: { hunger: 20 } }), 'walk_urgent'); // foraging because hungry
    // not low enough, the other need low, or no need behind the errand: an ordinary walk
    is(walker('eat_store', { need: 'hunger', needs: { hunger: 60 } }), 'walk');
    is(walker('drink', { need: 'thirst', needs: { hunger: 10, thirst: 70 } }), 'walk');
    is(walker('eat_store', { need: null, needs: { hunger: 10 } }), 'walk');
    is(walker('fetch_water', { needs: { thirst: 10 } }), 'walk'); // water for the household or the crops is not for their own thirst
  });
  it('a heavy load on the way to put it down is drawn laden', () => {
    is(walker('haul', { inv: { wood: 5 } }), 'walk_laden'); // 10 of 12
    is(walker('deposit', { inv: { stone: 3, grain: 1 } }), 'walk_laden'); // 10 of 12
    is(walker('give', { inv: { wood: 5 } }), 'walk_laden');
    is(walker('fuel_fire', { inv: { wood: 4 } }), 'walk_laden'); // 8 of 12
    is(walker('haul', { age: 9, inv: { wood: 2 } }), 'walk_laden'); // 4 of a child's 5
  });
  it('a light load, or a load on some other errand, is not', () => {
    is(walker('haul', { inv: { wood: 2 } }), 'walk'); // 4 of 12
    is(walker('deposit', { inv: { grain: 2 } }), 'walk');
    is(walker('gather', { inv: { wood: 5 } }), 'walk'); // a full pack going out to work is the ordinary walk (the lean is drawn on it)
    is(walker('socialize', { inv: { wood: 5 } }), 'walk_social');
  });
  it('an armful or a jar on the head is left to the drawing that already has it', () => {
    is(walker('haul', { inv: { bricks: 3 } }), 'walk');
    is(walker('deposit', { inv: { clay: 3 } }), 'walk');
    is(walker('deposit', { inv: { bread: 10, grain: 2 } }), 'walk');
    is(walker('deposit', { inv: { bread: 10, grain: 4, basket: 1 } }), 'walk_laden'); // bread in a basket is on the hip, not in the arms
    is(walker('haul', { inv: { jar: 1, water: 6, wood: 3 } }), 'walk');
  });
  it('going to work is drawn with the tool only when the pack holds the tool for that work', () => {
    const w = rich({ 501: 'tree', 502: 'rock', 503: 'fish_spot', 504: 'berry_bush', 505: 'ore_vein', 506: 'clay_pit', 507: 'outcrop' });
    is(walker('gather', { target: 501, inv: { axe: 1 } }), 'walk_work', w);
    is(walker('gather', { target: 502, inv: { pick: 1 } }), 'walk_work', w);
    is(walker('gather', { target: 505, inv: { pick: 1 } }), 'walk_work', w);
    is(walker('gather', { target: 506, inv: { pick: 1 } }), 'walk_work', w);
    is(walker('gather', { target: 507, inv: { pick: 1 } }), 'walk_work', w);
    is(walker('gather', { target: 503, inv: { rod: 1 } }), 'walk_work', w);
    is(walker('till', { inv: { hoe: 1 } }), 'walk_work', w);
    is(walker('tend', { inv: { hoe: 1 } }), 'walk_work', w);
    is(walker('build', { inv: { hammer: 1 } }), 'walk_work', w);
    is(walker('repair', { inv: { hammer: 1 } }), 'walk_work', w);
    // the wrong tool, no tool, no such work, or a target that is not there
    is(walker('gather', { target: 501, inv: { pick: 1 } }), 'walk', w);
    is(walker('gather', { target: 501 }), 'walk', w);
    is(walker('gather', { target: 502, inv: { axe: 1 } }), 'walk', w);
    is(walker('gather', { target: 504, inv: { axe: 1, pick: 1, hoe: 1 } }), 'walk', w);
    is(walker('gather', { target: 999, inv: { axe: 1 } }), 'walk', w);
    is(walker('till', { inv: { axe: 1 } }), 'walk', w);
    is(walker('build'), 'walk', w);
    is(walker('craft', { inv: { hammer: 1, axe: 1 } }), 'walk', w);
  });
  it('a rod is carried only where rods exist', () => {
    const withRods = rich({ 503: 'fish_spot' });
    const without = world({ settings: { dynamics: 'rich', rulesVersion: 100 }, byId: withRods.byId });
    const p = walker('gather', { target: 503, inv: { rod: 1 } });
    is(p, 'walk_work', withRods);
    is(p, 'walk', without);
    expect(walkToolOf(withRods, p)).toBe(2);
    expect(walkToolOf(without, p)).toBe(0);
  });
  it('the tool drawn is the kind the work uses', () => {
    const w = rich({ 501: 'tree', 503: 'fish_spot' });
    expect(walkToolOf(w, walker('gather', { target: 501, inv: { axe: 1, hammer: 1 } }))).toBe(1);
    expect(walkToolOf(w, walker('till', { inv: { hoe: 1 } }))).toBe(1);
    expect(walkToolOf(w, walker('build', { inv: { axe: 1, hammer: 1 } }))).toBe(3);
    expect(walkToolOf(w, walker('build'))).toBe(0);
    expect(walkToolOf(w, walker(null))).toBe(0);
  });
  it('on the way to somebody is drawn open; a search for somebody lost, or being fetched home, is not', () => {
    is(walker('visit', { data: {} }), 'walk_social');
    is(walker('visit', { data: { fetch: {} } }), 'search_walk');
    is(walker('visit', { data: { fetchWith: {} } }), 'search_walk');
    is(walker('visit', { data: { fetchedBy: {} } }), 'walk');
    is(walker('explore'), 'walk');
    is(walker('attend', { data: { occasion: 1 } }), 'walk'); // the occasion is not looked up while walking: no search of the world
  });
  it('a child on the way to play, or pottering about, skips; a little one, a grown person, and the evening fire do not', () => {
    is(walker('wander', { age: 9 }), 'skip');
    is(walker('wander', { age: 11 }), 'skip');
    is(walker('socialize', { age: 9, data: { purpose: 'play_together' }, target: 3 }), 'skip');
    is(walker('socialize', { age: 9, data: { purpose: 'chat' } }), 'walk_social');
    is(walker('wander', { age: 9, data: { evening: 'fire' } }), 'walk');
    is(walker('wander', { age: 5 }), 'walk');
    is(walker('wander', { age: 30 }), 'walk');
    is(walker('wander', { age: 14 }), 'walk');
    is(walker('gather', { age: 9 }), 'walk');
  });
  it('by mood where nothing else applies: low, middling, glad', () => {
    is(walker('gather', { mood: -30 }), 'walk_low');
    is(walker('gather', { mood: -12 }), 'walk_low');
    is(walker('gather', { mood: -11.9 }), 'walk');
    is(walker('gather', { mood: 0 }), 'walk');
    is(walker('gather', { mood: 4.9 }), 'walk');
    is(walker('gather', { mood: 5 }), 'walk_glad');
    is(walker('gather', { mood: 40 }), 'walk_glad');
    const p = walker('gather');
    delete (p as { mood?: unknown }).mood; // a world without moods
    is(p, 'walk');
  });
  it('first match wins: tired, then cold, then in need, then laden, then the tool, then somebody, then mood', () => {
    const w = rich({ 501: 'tree' });
    is(walker('sleep', { mood: 40, needs: { warmth: 10 } }), 'walk_tired');
    is(walker('haul', { inv: { wood: 5 }, needs: { energy: 10 } }), 'walk_tired');
    is(walker('warm', { needs: { hunger: 10 }, mood: -40 }), 'walk_cold');
    is(walker('eat_store', { need: 'hunger', needs: { hunger: 10, warmth: 20 } }), 'walk_cold');
    is(walker('eat_store', { need: 'hunger', needs: { hunger: 10 }, inv: { wood: 5 } }), 'walk_urgent');
    is(walker('give', { inv: { wood: 5 }, mood: 40 }), 'walk_laden');
    is(walker('gather', { target: 501, inv: { axe: 1 }, mood: -40 }), 'walk_work', w);
    is(walker('socialize', { mood: -40 }), 'walk_social');
    is(walker('socialize', { age: 9, data: { purpose: 'play_together' }, mood: -40 }), 'skip');
  });
  it('the special walks keep their place, however tired, cold, low or laden the person is', () => {
    const worn = { needs: { energy: 5, warmth: 5 }, mood: -50, inv: { wood: 5 } };
    is(walker('wander', { ...worn, data: { walk: { id: 1 } } }), 'stroll');
    is(walker('exchange_journey', worn), 'trek');
    is(walker('relocate', worn), 'trudge');
    is(walker('visit', { ...worn, data: { fetch: {} } }), 'search_walk');
    is(walker('hunt', worn), 'stalk');
    is(walker('attend', { ...worn, data: { dance: { n: 3, moving: true } } }), 'dance');
  });
  it('running, pulling, fear and fleeing are left alone', () => {
    const worn = { needs: { energy: 5 }, mood: -50 };
    const run = walker('gather', worn);
    run.pose = 'run';
    expect(pick(world(), run)).toBe('run');
    const pull = walker('haul', { ...worn, inv: { wood: 5 } });
    pull.pose = 'pull';
    expect(pick(world(), pull)).toBe('pull');
    const fear = walker('flee', worn);
    fear.pose = 'fear';
    expect(pick(world(), fear)).toBe('fear');
    is(walker('flee', worn), 'walk');
  });
  it('somebody walking with no activity is drawn from their needs and mood alone', () => {
    is(walker(null), 'walk');
    is(walker(null, { needs: { energy: 10 } }), 'walk_tired');
    is(walker(null, { mood: -30 }), 'walk_low');
  });
  it('every walk of these is quiet, so a sling or a bereavement shows in the arms too', () => {
    for (const a of ['walk_tired', 'walk_cold', 'walk_urgent', 'walk_laden', 'walk_work', 'walk_social', 'skip', 'walk_low', 'walk_glad'] as AnimId[]) {
      expect(isPose(a)).toBe(false);
      expect(isQuiet(a)).toBe(true);
    }
  });
  it('choosing one leaves the person as they were', () => {
    const w = rich({ 501: 'tree' });
    for (const p of [walker('sleep'), walker('haul', { inv: { wood: 5 } }), walker('gather', { target: 501, inv: { axe: 1 } }), walker('wander', { age: 9 }), walker('gather', { mood: 30 })]) {
      const before = JSON.stringify(p);
      expect(pick(w, p)).not.toBe('walk');
      expect(JSON.stringify(p)).toBe(before);
      expect(p.pose).toBe('walk');
    }
  });
});
