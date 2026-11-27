// What the animation contact sheet stages (scripts/browser/animation_sheet.mjs reads this file; it holds data only).
//
// Each spec is one cell of the sheet: one person or a small group, staged in a paused world. The harness sets ONLY what a
// spec names, on people it has placed on open ground, in the page's own world at run time. Nothing here is simulation code
// and a staged cell is evidence of how a state is DRAWN, never that the state arises in an ordinary world.
//
//   id      unique, used in file names and by PAIRS
//   group   'A'..'F' (the groups of the task); one sheet per group
//   label   what the viewer should read from the figure
//   was     the id of the baseline spec this state looked like before the upgrade (for the tell-apart pairs)
//   people  one entry per figure:
//             dx, dy     offset in tiles from the cell's centre
//             heading    radians (0 = +x); or `face: i` to face figure i of this spec
//             pose       the simulation's p.pose (a PoseKind)
//             kind       p.activity.kind; omit for no activity
//             phase      'travel' | 'work' (default 'work')
//             data       p.activity.data
//             duration   p.activity.duration (default 120)
//             age        years (default 30); under 7 is a small child, 7 to 11 a child, 60+ an elder
//             inv        p.inv
//             speech     { text, kind, ticks } shown as speaking: p.speech.until = world.tick + ticks (default 60)
//             moving     tiles per frame of forward movement to fake between frames (walk and run cycles), default 0
//             set        any other fields to assign on the person, deep-assigned
//             conv       { purpose, with: i, data } puts this figure (as `a`) and figure i (as `b`) in a Conversation (p.convId on both)
//   animals optional [{ type: 'wolf' | 'deer' | 'sheep', dx, dy, heading }]
//   after   optional function (world, people, animals) run IN THE PAGE after the figures are staged and before every capture
//           (it is passed by its source text, so it must be self-contained: no closures, no imports). `people` are the
//           staged Person objects in spec order. Use it for state that hangs off the world's clock or other records:
//           an occasion, a thought dated to the tick, a fever, a pregnancy.
//   frames  optional list of activity progress values to capture (default [5, 17]); simulation time advances with them

const SOLO = 0.2; // a three-quarter view, facing the viewer and a little to the right
const one = (o) => ({ dx: 0, dy: 0, heading: SOLO, ...o });
/** two figures side by side on the screen, facing each other */
const facing = (a, b, gap = 0.42) => [
  { dx: -gap, dy: gap, face: 1, ...a },
  { dx: gap, dy: -gap, face: 0, ...b },
];
/** figures in a ring round the cell's centre, facing in */
const ring = (list, r = 0.7, start = 0.5) =>
  list.map((o, i) => {
    const a = (i / list.length) * Math.PI * 2 + start;
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r, heading: a + Math.PI, ...o };
  });
const fire = { pose: 'stand', kind: 'wander', data: { evening: 'fire', fireId: 0 } };
const kid = { age: 8 };
/** a ring with its first figure at the back of the screen, facing the viewer: the speaker, so their bubble covers nobody */
const BACK = -Math.PI * 0.75;
const woman = { set: { sex: 'f' } };

export const SPECS = [
  // ───────────── baselines: what the generic poses look like (the left half of every tell-apart pair) ─────────────
  { id: 'stand', group: 'A', label: 'Standing (generic)', people: [one({ pose: 'stand' })] },
  { id: 'sit', group: 'A', label: 'Sitting (generic)', people: [one({ pose: 'sit', kind: 'gather' })] },
  { id: 'craft', group: 'A', label: 'Craft (generic)', people: [one({ pose: 'craft', kind: 'gather' })] },
  { id: 'pick', group: 'A', label: 'Picking berries', people: [one({ pose: 'pick', kind: 'gather' })] },
  { id: 'store', group: 'A', label: 'Store (generic)', frames: [30, 60, 90], people: [one({ pose: 'store', kind: 'cart_haul', data: { leg: 1 } })] },
  { id: 'drink', group: 'A', label: 'Drinking', people: [one({ pose: 'drink', kind: 'drink' })] },
  { id: 'build', group: 'A', label: 'Building', people: [one({ pose: 'build', kind: 'build' })] },
  { id: 'talk', group: 'A', label: 'Talking (chat)', people: facing({ pose: 'talk', kind: 'converse', speech: { text: 'Hello.', kind: 'say' }, conv: { purpose: 'chat', with: 1 } }, { pose: 'talk', kind: 'converse' }) },
  { id: 'walk', group: 'A', label: 'Walking', people: [one({ pose: 'walk', kind: 'gather', phase: 'travel', moving: 0.05 })] },
  // ───────────── A: already distinct ─────────────
  { id: 'run', group: 'A', label: 'Running', people: [one({ pose: 'run', kind: 'gather', phase: 'travel', moving: 0.09 })] },
  { id: 'sleep', group: 'A', label: 'Sleeping', people: [one({ pose: 'sleep', kind: 'sleep' })] },
  { id: 'eat', group: 'A', label: 'Eating', people: [one({ pose: 'eat', kind: 'eat', inv: { berries: 2 } })] },
  { id: 'chop', group: 'A', label: 'Chopping', people: [one({ pose: 'chop', kind: 'gather' })] },
  { id: 'mine', group: 'A', label: 'Mining', people: [one({ pose: 'mine', kind: 'gather' })] },
  { id: 'fish', group: 'A', label: 'Fishing', people: [one({ pose: 'fish', kind: 'gather' })] },
  { id: 'till', group: 'A', label: 'Tilling', people: [one({ pose: 'till', kind: 'till' })] },
  { id: 'plant', group: 'A', label: 'Planting', people: [one({ pose: 'plant', kind: 'plant' })] },
  { id: 'tend', group: 'A', label: 'Tending', people: [one({ pose: 'tend', kind: 'tend' })] },
  { id: 'harvest', group: 'A', label: 'Harvesting', people: [one({ pose: 'harvest', kind: 'harvest' })] },
  { id: 'saw', group: 'A', label: 'Sawing', people: [one({ pose: 'saw', kind: 'operate' })] },
  { id: 'hammer', group: 'A', label: 'Hammering', people: [one({ pose: 'hammer', kind: 'operate' })] },
  { id: 'forge', group: 'A', label: 'Forging', people: [one({ pose: 'forge', kind: 'operate' })] },
  { id: 'bake', group: 'A', label: 'Baking', people: [one({ pose: 'bake', kind: 'operate' })] },
  { id: 'dig', group: 'A', label: 'Digging', people: [one({ pose: 'dig', kind: 'gather' })] },
  { id: 'give', group: 'A', label: 'Giving', frames: [30, 90], people: facing({ pose: 'give', kind: 'give' }, { pose: 'stand' }) },
  { id: 'argue', group: 'A', label: 'Arguing', people: facing({ pose: 'argue', kind: 'argue' }, { pose: 'argue', kind: 'argue' }) },
  { id: 'pull', group: 'A', label: 'Pulling a cart (cart not staged)', people: [one({ pose: 'pull', kind: 'cart_haul', phase: 'travel', moving: 0.04 })] },
  { id: 'fear', group: 'A', label: 'Fleeing in fear', people: [one({ pose: 'fear', kind: 'flee' })] },
  { id: 'carry', group: 'A', label: 'Carrying a load', people: [one({ pose: 'walk', kind: 'haul', phase: 'travel', moving: 0.05, inv: { wood: 6 } })] },
  { id: 'wave', group: 'A', label: 'Waving', people: [one({ pose: 'stand' })], after: (world, people) => { people[0].wave = world.tick + 13; } },

  // ───────────── B: was generic standing ─────────────
  { id: 'idle', group: 'B', was: 'stand', label: 'Idling', frames: [5, 17, 29], people: [one({ pose: 'stand', kind: 'wander' })] },
  { id: 'fire_sit', group: 'B', was: 'stand', label: 'At the evening fire', people: ring([fire, fire, fire]) },
  { id: 'stroll', group: 'B', was: 'walk', label: 'Walking out together', people: [
    { dx: -0.2, dy: 0.2, heading: SOLO, pose: 'walk', kind: 'wander', phase: 'travel', data: { walk: { id: 1 } }, moving: 0.04 },
    { dx: 0.2, dy: -0.2, heading: SOLO, pose: 'walk', kind: 'wander', phase: 'travel', data: { walk: { id: 1 } }, moving: 0.04 },
  ] },
  { id: 'walkout', group: 'B', was: 'stand', label: 'Walked out: standing together', people: facing({ pose: 'stand', kind: 'wander', data: { walk: { id: 1 } } }, { pose: 'stand', kind: 'wander', data: { walk: { id: 1 } } }, 0.32) },
  { id: 'greet_run', group: 'B', was: 'walk', label: 'Running to meet somebody', people: [one({ pose: 'run', kind: 'wander', phase: 'travel', data: { reunion: { with: 1 }, run: true }, moving: 0.09 })] },
  { id: 'embrace', group: 'B', was: 'stand', label: 'Reunion', people: facing({ pose: 'stand', kind: 'wander', data: { reunion: { with: 1 } } }, { pose: 'stand', kind: 'wander', data: { reunion: { with: 1 } } }, 0.3) },
  { id: 'lookout', group: 'B', was: 'stand', label: 'Exploring', people: [one({ pose: 'stand', kind: 'explore' })] },
  { id: 'search', group: 'B', was: 'stand', label: 'Searching', people: [one({ pose: 'stand', kind: 'search' })] },
  { id: 'claim', group: 'B', was: 'stand', label: 'Claiming a home', people: [one({ pose: 'stand', kind: 'claim_home' })] },
  { id: 'respects', group: 'B', was: 'stand', label: 'Paying respects at a grave', people: [one({ pose: 'stand', kind: 'pay_respects' })] },
  { id: 'lookin', group: 'B', was: 'stand', label: 'Looking in on somebody', people: facing({ pose: 'stand', kind: 'visit', data: {} }, { pose: 'sit', kind: 'rest' }) },
  { id: 'mind', group: 'B', was: 'stand', label: 'Minding a child', frames: [5, 60], people: facing({ pose: 'stand', kind: 'visit', data: { watch: true } }, { pose: 'stand', kind: 'wander', data: { play: 'stones' }, age: 4 }, 0.5) },
  { id: 'attend_birth', group: 'B', was: 'stand', label: 'Attending a birth', people: facing({ pose: 'stand', kind: 'visit', data: { birth: true } }, { pose: 'sit', kind: 'rest', data: { lyingIn: 1 }, ...woman }, 0.5),
    after: (world, people) => { people[1].pregnantUntil = world.tick + 200; } },
  { id: 'search_walk', group: 'B', was: 'walk', label: 'Search party after dark', people: [
    { dx: 0.3, dy: -0.1, heading: SOLO, pose: 'walk', kind: 'visit', phase: 'travel', data: { fetch: { since: 0 } }, moving: 0.05 },
    { dx: -0.3, dy: 0.25, heading: SOLO, pose: 'walk', kind: 'visit', phase: 'travel', data: { fetchWith: { leader: 0 } }, moving: 0.05 },
  ] },
  { id: 'call', group: 'B', was: 'stand', label: 'Search party: calling', people: [
    { dx: 0.3, dy: -0.1, heading: SOLO, pose: 'stand', kind: 'visit', data: { fetch: { since: 0 } } },
    { dx: -0.3, dy: 0.25, heading: SOLO + 1.2, pose: 'stand', kind: 'visit', data: { fetchWith: { leader: 0 } } },
  ] },
  { id: 'celebrate', group: 'B', was: 'stand', label: 'At a feast or wedding', frames: [5, 17, 40], people: ring([
    { pose: 'stand', kind: 'attend', data: { occasion: 9001 } }, { pose: 'stand', kind: 'attend', data: { occasion: 9001 } }, { pose: 'stand', kind: 'attend', data: { occasion: 9001 } },
  ]), after: (world) => { world.occasions = [{ id: 9001, kind: 'feast', status: 'gathering', about: [], attended: [], x: 0, y: 0, placeId: 0, placeName: 'the fire', called: 0, at: 0, until: world.tick + 500 }]; } },
  { id: 'market', group: 'B', was: 'stand', label: 'At a market', people: facing({ pose: 'stand', kind: 'attend', data: { occasion: 9002 } }, { pose: 'stand', kind: 'attend', data: { occasion: 9002 } }),
    after: (world) => { world.occasions = [{ id: 9002, kind: 'market', status: 'gathering', about: [], attended: [], x: 0, y: 0, placeId: 0, placeName: 'the fire', called: 0, at: 0, until: world.tick + 500 }]; } },
  { id: 'funeral', group: 'B', was: 'stand', label: 'At a funeral', people: [
    { dx: -0.35, dy: 0.2, heading: SOLO, pose: 'stand', kind: 'attend', data: { occasion: 9003 } },
    { dx: 0.3, dy: -0.25, heading: SOLO, pose: 'stand', kind: 'attend', data: { occasion: 9003 } },
  ], after: (world) => { world.occasions = [{ id: 9003, kind: 'funeral', status: 'gathering', about: [], attended: [], x: 0, y: 0, placeId: 0, placeName: 'the fire', called: 0, at: 0, until: world.tick + 500 }]; } },
  { id: 'dance', group: 'B', was: 'walk', label: 'Dancing', frames: [5, 11, 17], people: ring([
    { pose: 'walk', kind: 'attend', data: { occasion: 9004, dance: { n: 5, ang: 0, r: 1, moving: true } }, moving: 0.03 },
    { pose: 'stand', kind: 'attend', data: { occasion: 9004, dance: { n: 5, ang: 2, r: 1 } } },
    { pose: 'walk', kind: 'attend', data: { occasion: 9004, dance: { n: 5, ang: 4, r: 1, moving: true } }, moving: 0.03 },
  ]), after: (world) => { world.occasions = [{ id: 9004, kind: 'wedding', status: 'gathering', about: [], attended: [], x: 0, y: 0, placeId: 0, placeName: 'the fire', called: 0, at: 0, until: world.tick + 500 }]; } },
  { id: 'trek', group: 'B', was: 'walk', label: 'On a trading journey', people: [one({ pose: 'walk', kind: 'exchange_journey', phase: 'travel', moving: 0.05, inv: { bread: 3 } })] },
  { id: 'barter', group: 'B', was: 'stand', label: 'Trading journey: at the other end', people: facing({ pose: 'stand', kind: 'exchange_journey' }, { pose: 'stand' }) },
  { id: 'trudge', group: 'B', was: 'walk', label: 'Moving house', people: [one({ pose: 'walk', kind: 'relocate', phase: 'travel', moving: 0.04 })] },
  { id: 'unpack', group: 'B', was: 'stand', label: 'Moving house: setting down', frames: [8, 20, 34], people: [one({ pose: 'stand', kind: 'relocate' })] },

  // ───────────── C: was generic sitting ─────────────
  { id: 'rest', group: 'C', was: 'sit', label: 'Resting', people: [one({ pose: 'sit', kind: 'rest' })] },
  { id: 'warm', group: 'C', was: 'sit', label: 'Warming by a fire', people: [one({ pose: 'sit', kind: 'warm' })] },
  { id: 'alone', group: 'C', was: 'sit', label: 'Time alone', people: [one({ pose: 'sit', kind: 'alone' })] },
  { id: 'meal_sit', group: 'C', was: 'sit', label: 'Sharing a meal (waiting)', people: ring([
    { pose: 'sit', kind: 'host_meal', data: { laid: true } }, { pose: 'sit', kind: 'attend_meal' }, { pose: 'sit', kind: 'attend_meal' },
  ]) },
  { id: 'meal_eat', group: 'C', was: 'sit', label: 'Sharing a meal (eating)', people: ring([
    { pose: 'eat', kind: 'host_meal', data: { eating: true, laid: true }, inv: { bread: 1 } }, { pose: 'eat', kind: 'attend_meal', data: { eating: true }, inv: { bread: 1 } }, { pose: 'eat', kind: 'attend_meal', data: { eating: true }, inv: { bread: 1 } },
  ]) },
  { id: 'vigil', group: 'C', was: 'sit', label: 'Keeping vigil beside the sick', people: facing({ pose: 'sit', kind: 'rest', data: { vigil: { for: 0 } } }, { pose: 'sleep', kind: 'sleep', heading: 2.2 }, 0.5),
    after: (world, people) => { people[1].illness = { since: world.tick - 200, severity: 50, rested: 0, course: 2000, how: 'staged' }; } },
  { id: 'lyingin', group: 'C', was: 'sit', label: 'Lying in before a birth', people: [one({ pose: 'sit', kind: 'rest', data: { lyingIn: 1 }, ...woman })],
    after: (world, people) => { people[0].pregnantUntil = world.tick + 200; } },
  { id: 'comfort', group: 'C', was: 'sit', label: 'Sitting with the grieving', people: [
    { dx: -0.28, dy: 0.28, face: 1, pose: 'sit', kind: 'rest', data: { grief: { with: 0 } } },
    { dx: 0.28, dy: -0.28, heading: SOLO, pose: 'sit', kind: 'rest' },
  ], after: (world, people) => { people[1].lifeEvent = { kind: 'bereaved', about: 0, since: world.tick - 100, until: world.tick + 5000 }; } },
  { id: 'settle', group: 'C', was: 'sit', label: 'Settling a child for the night', people: facing({ pose: 'sit', kind: 'rest', data: { settle: { child: 0 } } }, { pose: 'sleep', kind: 'sleep', age: 4, heading: 2.2 }, 0.45) },
  { id: 'standup', group: 'C', was: 'sit', label: 'Standing up for somebody', people: [
    { dx: -0.75, dy: 0.05, face: 2, pose: 'sit', kind: 'rest', data: { side: { for: 0, against: 0, since: 0 } }, speech: { text: 'Leave them be.', kind: 'say' } },
    { dx: 0.0, dy: 0.7, face: 2, pose: 'argue', kind: 'argue' },
    { dx: 0.6, dy: -0.5, face: 1, pose: 'argue', kind: 'argue' },
  ] },

  // ───────────── D: was a general work motion ─────────────
  { id: 'whittle', group: 'D', was: 'craft', label: 'Making a tool by hand', people: [one({ pose: 'craft', kind: 'craft' })] },
  { id: 'mend_tool', group: 'D', was: 'craft', label: 'Mending a tool', people: [one({ pose: 'craft', kind: 'tool_work', data: { toolId: 1 } })] },
  { id: 'mend_cart', group: 'D', was: 'craft', label: 'Mending a cart', people: [one({ pose: 'craft', kind: 'tool_work', data: { cartId: 1 } })] },
  { id: 'weave', group: 'D', was: 'craft', label: 'Cloth work', people: [one({ pose: 'craft', kind: 'tool_work', data: { textile: true } })] },
  { id: 'butcher', group: 'D', was: 'craft', label: 'Butchering a carcass', people: [one({ pose: 'craft', kind: 'butcher', data: { part: 'meat' } })] },
  { id: 'feed_animal', group: 'D', was: 'craft', label: 'Feeding livestock', people: [one({ pose: 'craft', kind: 'animal_work', data: { op: 'feed' } })], animals: [{ type: 'sheep', dx: 1.0, dy: 0.2, heading: 3.3 }] },
  { id: 'shear', group: 'D', was: 'craft', label: 'Shearing', people: [one({ pose: 'craft', kind: 'animal_work', data: { op: 'shear' } })], animals: [{ type: 'sheep', dx: 0.85, dy: 0.17, heading: 1.8 }] },
  { id: 'tether', group: 'D', was: 'craft', label: 'Tethering a sheep', people: [one({ pose: 'craft', kind: 'animal_work', data: { op: 'acquire' } })], animals: [{ type: 'sheep', dx: 1.0, dy: 0.2, heading: 3.3 }] },
  { id: 'setgear', group: 'D', was: 'craft', label: 'Setting a net or trap', people: [one({ pose: 'craft', kind: 'gear_work', data: { op: 'place' } })] },
  { id: 'haul_net', group: 'D', was: 'craft', label: 'Hauling in a net', people: [one({ pose: 'craft', kind: 'gear_work', data: { op: 'retrieve' } })] },
  { id: 'hangskin', group: 'D', was: 'craft', label: 'Hanging a wolf skin', people: [one({ pose: 'craft', kind: 'hang_skin', set: { wolfSkins: 1 } })] },
  { id: 'workbench', group: 'D', was: 'craft', label: 'Workshop (no special motion)', people: [one({ pose: 'craft', kind: 'operate', data: { recipe: 'none' } })] },
  { id: 'stalk', group: 'D', was: 'walk', label: 'Hunting: closing on a deer', people: [one({ pose: 'walk', kind: 'hunt', phase: 'travel', moving: 0.03, inv: { spear: 1 } })], animals: [{ type: 'deer', dx: 1.5, dy: 0.3, heading: 0.2 }] },
  { id: 'strike', group: 'D', was: 'pick', label: 'Hunting a deer (spear held)', frames: [3, 7, 9], people: [one({ pose: 'pick', kind: 'hunt', inv: { spear: 1 } })], animals: [{ type: 'deer', dx: 1.45, dy: 0.3, heading: 0.2 }] },
  { id: 'strike_bare', group: 'D', was: 'pick', label: 'Hunting a deer (no spear held)', frames: [3, 7, 9], people: [one({ pose: 'pick', kind: 'hunt' })], animals: [{ type: 'deer', dx: 1.1, dy: 0.22, heading: 0.2 }] },
  { id: 'guard', group: 'D', was: 'pick', label: 'Standing against a wolf', frames: [3, 8], people: [one({ pose: 'pick', kind: 'defend', inv: { spear: 1 } })], animals: [{ type: 'wolf', dx: 1.6, dy: 0.32, heading: 3.34 }] },
  { id: 'charge', group: 'D', was: 'walk', label: 'Running at a wolf', people: [one({ pose: 'run', kind: 'defend', phase: 'travel', data: { run: true }, moving: 0.09, inv: { spear: 1 } })] },
  { id: 'putaway', group: 'D', was: 'store', label: 'Putting goods into a store', frames: [20, 60, 100], people: [one({ pose: 'store', kind: 'deposit', inv: { grain: 4 } })] },
  { id: 'takeout', group: 'D', was: 'store', label: 'Taking goods out', frames: [20, 60, 100], people: [one({ pose: 'store', kind: 'withdraw' })] },
  { id: 'heave', group: 'D', was: 'store', label: 'Hauling', frames: [6, 18, 30], people: [one({ pose: 'store', kind: 'haul' })] },
  { id: 'feedfire', group: 'D', was: 'store', label: 'Feeding a fire', frames: [6, 11, 15], people: [one({ pose: 'store', kind: 'fuel_fire', inv: { wood: 2 } })] },
  { id: 'filljar', group: 'D', was: 'drink', label: 'Filling a water jar', frames: [3, 15], people: [one({ pose: 'drink', kind: 'fetch_water', inv: { jar: 1 } })] },
  { id: 'mend', group: 'D', was: 'build', label: 'Mending a building', frames: [3, 8], people: [one({ pose: 'build', kind: 'repair' })] },
  { id: 'survey', group: 'D', was: 'build', label: 'Laying out a building site', people: [one({ pose: 'build', kind: 'plan_site' })] },

  // ───────────── E: talk that all looked alike ─────────────
  { id: 'talk_warn', group: 'E', was: 'talk', label: 'Warning of danger', people: facing({ pose: 'talk', kind: 'socialize', speech: { text: 'A wolf, by the river!', kind: 'warn' }, conv: { purpose: 'warn', with: 1 } }, { pose: 'talk', kind: 'converse' }) },
  { id: 'teach', group: 'E', was: 'talk', label: 'Teaching a child', people: facing({ pose: 'talk', kind: 'converse', speech: { text: 'Like this.', kind: 'say' } }, { pose: 'talk', kind: 'socialize', age: 9, conv: { purpose: 'learn_skill', with: 0, data: { skill: 'forage' } } }) },
  { id: 'ask_court', group: 'E', was: 'talk', label: 'Asking somebody to walk out', people: facing({ pose: 'talk', kind: 'socialize', speech: { text: 'Will you walk out with me?', kind: 'ask' }, conv: { purpose: 'court', with: 1, data: { walk: 1 } } }, { pose: 'talk', kind: 'converse' }) },
  { id: 'welcome', group: 'E', was: 'talk', label: 'Welcoming newcomers', people: facing({ pose: 'talk', kind: 'socialize', speech: { text: 'Welcome.', kind: 'happy' }, conv: { purpose: 'welcome', with: 1 } }, { pose: 'talk', kind: 'converse' }, 0.5) },
  { id: 'rally', group: 'E', was: 'talk', label: 'Asking support for a shared building', people: facing({ pose: 'talk', kind: 'socialize', speech: { text: 'Will you help with the hall?', kind: 'ask' }, conv: { purpose: 'recruit', with: 1, data: { siteId: 1 } } }, { pose: 'talk', kind: 'converse' }) },
  { id: 'peace', group: 'E', was: 'talk', label: 'Making peace between two', people: facing({ pose: 'talk', kind: 'socialize', speech: { text: 'Enough, both of you.', kind: 'say' }, conv: { purpose: 'mediate', with: 1, data: { pair: 0 } } }, { pose: 'talk', kind: 'converse' }, 0.5) },
  { id: 'fire_story', group: 'E', was: 'talk', label: 'Telling a story at the fire', people: ring([
    { ...fire, age: 66, speech: { text: 'Listen.', kind: 'say', ticks: 60 } }, fire, { ...fire, age: 8 },
  ], 0.75, BACK), after: (world, people) => {
    const th = (kind, since) => ({ kind, value: 2, since, until: world.tick + 2000, why: 'staged' });
    people[0].mood.thoughts = [th('told_story', world.tick - 30)];
    people[1].mood.thoughts = [th('story', world.tick - 30)];
    people[2].mood.thoughts = [th('story', world.tick - 30)];
  } },
  { id: 'fire_sing', group: 'E', was: 'talk', label: 'Starting or joining a song', people: ring([
    { ...fire, speech: { text: 'Sing it with me.', kind: 'happy', ticks: 60 } }, { ...fire, speech: { text: 'La la.', kind: 'happy', ticks: 60 } }, { ...fire, speech: { text: 'La la.', kind: 'happy', ticks: 60 } },
  ], 0.8, BACK), after: (world, people) => { for (const p of people) p.mood.thoughts = [{ kind: 'sang', value: 2, since: world.tick - 60, until: world.tick + 2000, why: 'staged' }]; } },
  { id: 'fire_address', group: 'E', was: 'talk', label: 'Speaking for a building before listeners', people: ring([
    { ...fire, speech: { text: 'A storehouse!', kind: 'say', ticks: 60 } }, fire, fire,
  ], 0.75, BACK), after: (world, people) => { world.civicProjects = [{ id: 9101, siteId: 0, status: 'active', spoke: world.tick - 60, council: { candidates: [{ personId: people[0].id }] } }]; } },
  { id: 'fire_thanks', group: 'E', was: 'talk', label: 'Thanking somebody in company', people: ring([
    { ...fire, speech: { text: 'Thank you, Anna, for the hall.', kind: 'say', ticks: 60 } }, fire, fire,
  ], 0.75, BACK) },
  { id: 'stand_address', group: 'E', was: 'talk', label: 'Speaking for a building at a gathering', people: ring([
    { pose: 'stand', kind: 'attend', data: { occasion: 9005 }, speech: { text: 'A storehouse!', kind: 'say', ticks: 60 } },
    { pose: 'stand', kind: 'attend', data: { occasion: 9005 } }, { pose: 'stand', kind: 'attend', data: { occasion: 9005 } },
  ], 0.75, BACK), after: (world, people) => {
    world.occasions = [{ id: 9005, kind: 'feast', status: 'gathering', about: [], attended: [], x: 0, y: 0, placeId: 0, placeName: 'the fire', called: 0, at: 0, until: world.tick + 500 }];
    world.civicProjects = [{ id: 9101, siteId: 0, status: 'active', spoke: world.tick - 60, council: { candidates: [{ personId: people[0].id }] } }];
  } },

  // ───────────── F: states that had no look at all ─────────────
  { id: 'game_chase', group: 'F', was: 'talk', label: 'Children: chase', people: facing({ ...kid, pose: 'talk', kind: 'socialize', conv: { purpose: 'play_together', with: 1, data: { game: 'chase' } } }, { ...kid, pose: 'talk', kind: 'converse' }, 0.5) },
  { id: 'game_hide', group: 'F', was: 'talk', label: 'Children: hide and seek', people: facing({ ...kid, pose: 'talk', kind: 'socialize', conv: { purpose: 'play_together', with: 1, data: { game: 'hide' } } }, { ...kid, pose: 'talk', kind: 'converse' }, 0.55) },
  { id: 'game_house', group: 'F', was: 'talk', label: 'Children: playing house', people: facing({ ...kid, pose: 'talk', kind: 'socialize', conv: { purpose: 'play_together', with: 1, data: { game: 'house' } } }, { ...kid, pose: 'talk', kind: 'converse' }, 0.4) },
  { id: 'play_ground', group: 'F', was: 'stand', label: 'Child playing alone (stones, bugs)', people: [one({ ...kid, pose: 'stand', kind: 'wander', data: { play: 'bugs' } })] },
  { id: 'play_sticks', group: 'F', was: 'stand', label: 'Child playing alone (sticks)', people: [one({ ...kid, pose: 'stand', kind: 'wander', data: { play: 'sticks' } })] },
  { id: 'play_toy', group: 'F', was: 'stand', label: 'Child with a toy', people: [one({ age: 5, pose: 'stand', kind: 'wander', data: { play: 'toy' }, inv: { toy: 1 } })] },
  { id: 'fever', group: 'F', was: 'stand', label: 'A fever (standing, walking)', people: [
    { dx: -0.4, dy: 0.3, heading: SOLO, pose: 'stand' },
    { dx: 0.4, dy: -0.3, heading: SOLO, pose: 'walk', kind: 'gather', phase: 'travel', moving: 0.04 },
  ], after: (world, people) => { for (const p of people) p.illness = { since: world.tick - 200, severity: 50, rested: 0, course: 2000, how: 'staged' }; } },
  { id: 'limp', group: 'F', was: 'walk', label: 'A sprained ankle (limp)', frames: [5, 11, 17], people: [one({ pose: 'walk', kind: 'gather', phase: 'travel', moving: 0.04 })],
    after: (world, people) => { people[0].injury = { kind: 'sprain', since: world.tick - 100, until: world.tick + 2000, how: 'staged' }; } },
  { id: 'sling', group: 'F', was: 'stand', label: 'A broken arm (sling)', people: [
    { dx: -0.4, dy: 0.3, heading: SOLO, pose: 'stand' },
    { dx: 0.4, dy: -0.3, heading: SOLO, pose: 'walk', kind: 'gather', phase: 'travel', moving: 0.04 },
  ], after: (world, people) => { for (const p of people) p.injury = { kind: 'broken', since: world.tick - 100, until: world.tick + 2000, how: 'staged' }; } },
  { id: 'cut', group: 'F', was: 'stand', label: 'A bad cut (bound)', people: [one({ pose: 'stand' })],
    after: (world, people) => { people[0].injury = { kind: 'cut', since: world.tick - 100, until: world.tick + 2000, how: 'staged' }; } },
  { id: 'belly', group: 'F', was: 'stand', label: 'A woman near her time', people: [
    { dx: -0.4, dy: 0.3, heading: SOLO, pose: 'stand', ...woman },
    { dx: 0.4, dy: -0.3, heading: SOLO - 0.9, pose: 'walk', kind: 'gather', phase: 'travel', moving: 0.04, ...woman },
  ], after: (world, people) => { for (const p of people) p.pregnantUntil = world.tick + 600; } },
  { id: 'mourning', group: 'F', was: 'stand', label: 'Mourning', people: [
    { dx: -0.4, dy: 0.3, heading: SOLO, pose: 'stand' },
    { dx: 0.4, dy: -0.3, heading: SOLO, pose: 'walk', kind: 'gather', phase: 'travel', moving: 0.04 },
  ], after: (world, people) => { for (const p of people) p.lifeEvent = { kind: 'bereaved', about: 0, since: world.tick - 100, until: world.tick + 5000 }; } },
];

/** pairs that used to look the same: [id, baseline id] shown side by side at the default zoom */
export const PAIRS = SPECS.filter((s) => s.was && s.was !== s.id).map((s) => [s.was, s.id]);
