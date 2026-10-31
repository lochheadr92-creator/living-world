// STAGED: a hungry person with no food knowledge asks an empty-handed neighbour who personally knows a food source.
// Checks the food-help contract (rules 45); it is not an example of spontaneous behaviour.
import { addPerson, done, pin, stage } from './kit';
import { observe } from '../../src/sim/knowledge';
import { perceive } from '../../src/sim/perception';
import { relOf } from '../../src/sim/relations';
import { makeSource } from '../../src/sim/sources';
import { generateOptions, rankOptions } from '../../src/sim/decision';
import { endActivity, newActivity, startActivity } from '../../src/sim/activities';
import { stepWorld } from '../../src/sim/world';
import type { Person, Source, SourceType, World } from '../../src/sim/types';

export interface FoodHelpScene {
  s: ReturnType<typeof stage>;
  w: World;
  ada: Person;
  ben: Person;
  source: Source | null;
  /** Ada walks over and asks Ben for food; returns once the request is answered (or 600 ticks pass). */
  ask: () => void;
  /** let Ben act on his own */
  release: () => void;
}

export function foodHelpScene(o: { version?: number; source?: SourceType | null; amount?: number; benInv?: Record<string, number>; sourceAt?: [number, number] } = {}): FoodHelpScene {
  const s = stage('food-help');
  const w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 45;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 30, hunger: 40, thirst: 100, energy: 100, traits: { generosity: 0.8, sociability: 1 } });
  const ben = addPerson(s, 'Ben', 42, 40.5, { age: 30, inv: o.benInv ?? {}, hunger: 100, thirst: 100, energy: 100, traits: { generosity: 1, diligence: 1, sociability: 1 } });
  const kind = o.source === undefined ? 'fish_spot' : o.source;
  const source = kind ? makeSource(w, kind, o.sourceAt?.[0] ?? 64, o.sourceAt?.[1] ?? 38, o.amount ?? 8) : null;
  if (source) observe(w, ben, source);
  for (const p of [ada, ben]) {
    pin(p);
    p.cooldowns.trade = 1e12;
    p.needs.warmth = 100;
    p.needs.safety = 100;
  }
  relOf(ada, ben.id).affinity = 70;
  relOf(ben, ada.id).affinity = 70;
  done(s);
  w.sceneLabel = 'STAGED: a hungry neighbour asks an empty-handed helper for food';
  for (const p of [ada, ben]) perceive(w, p);
  const ask = () => {
    perceive(w, ada);
    const o2 = rankOptions(generateOptions(w, ada, true, true)).find((x) => x.label === 'Ask Ben for food');
    if (!o2?.make) throw new Error('No offered food request: ' + generateOptions(w, ada, true, true).options.map((x) => x.label).join('|'));
    const after = w.nextId;
    ada.cooldowns.pause = 0;
    startActivity(w, ada, o2.make()!);
    for (let i = 0; i < 600; i++) {
      stepWorld(w);
      if (w.requests.some((r) => r.id >= after && r.from === ada.id && r.to === ben.id && r.status !== 'pending') && !ada.convId) break;
    }
    // Ada stays put to receive (a staged rest; a pinned person cannot be handed anything, which is the give handler's own rule)
    ada.cooldowns.pause = 0;
    if (ada.activity) endActivity(w, ada, 'interrupted', 'staged');
    startActivity(w, ada, newActivity(w, ada, { kind: 'rest', label: 'Resting (staged)', goal: 'staged: waiting where the helper saw me', need: 'warmth', targetId: 0, here: true, amount: 3000, utility: 100, minCommit: 3000, maxTicks: 3200, data: { sticky: true } }));
  };
  const release = () => {
    ben.cooldowns.pause = 0;
    perceive(w, ben);
  };
  return { s, w, ada, ben, source, ask, release };
}
