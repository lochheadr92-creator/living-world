// Staged saves for the rendered examples of the dependency-chain slices whose lines had no page check (WS13): what a dead
// member left unfinished on the household history (rules 53), a journey taken over and a search where somebody was last seen
// (rules 54), and what a person has carried on the person card (rules 55). Every state is produced by running the staged
// steps through the external selection boundary, as the contract tests do; nothing is written into a record by hand except
// the one staged input the tests also stage (where the organiser last saw the missing traveller).
//   npx vite-node scripts/chains_demo.ts            → chain_evidence/rendered-saves/*.json
//   node scripts/browser/chains_check.mjs "http://127.0.0.1:5182/" chain_evidence/rendered
import { mkdirSync, writeFileSync } from 'node:fs';
import { stage, addPerson, building, site, done, pin } from '../tests/helpers/kit';
import { relocationFixture } from '../tests/helpers/relocation';
import { serializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { observe } from '../src/sim/knowledge';
import { perceive } from '../src/sim/perception';
import { conservationReport, ledgerCreate } from '../src/sim/economy';
import { setExternalController } from '../src/sim/external';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { reviewIntentions } from '../src/sim/intent';
import { killPerson } from '../src/sim/lifecycle';
import { RESCUE_AFTER } from '../src/sim/relocation';
import { HAUL_TRIPS } from '../src/sim/transport';
import type { Person, World } from '../src/sim/types';

mkdirSync('chain_evidence/rendered-saves', { recursive: true });
const save = (name: string, w: World, who: string) => {
  if (!conservationReport(w).ok) throw new Error(`Conservation failed in ${name}`);
  writeFileSync(`chain_evidence/rendered-saves/${name}-save.json`, serializeWorld(w));
  console.log(JSON.stringify({ name, who, rules: w.settings.rulesVersion, tick: w.tick }));
};
function run(w: World, p: Person, keyPart: string, max = 3000) {
  const o = rankOptions(generateOptions(w, p, true, true)).find((o) => o.key.includes(keyPart));
  if (!o?.make) throw new Error(`No offered ${keyPart}`);
  let picked = false;
  setExternalController({ controls: (_w, q) => q.id === p.id, choose: () => { if (picked) return { kind: 'defer' }; picked = true; return { kind: 'pick', key: o.key }; } });
  p.cooldowns.pause = 0; p.nextThink = w.tick; stepWorld(w);
  const act = p.activity; if (!act) throw new Error(`Selection did not start ${keyPart}`);
  for (let i = 0; i < max && p.activity?.id === act.id; i++) stepWorld(w);
  if (p.lastResult?.outcome !== 'success' && p.lastResult?.outcome !== 'partial') throw new Error(`Did not finish ${keyPart}: ${JSON.stringify(p.lastResult)}`);
  pin(p); setExternalController(null);
}

// rules 53: Ada's shelter plan outlives her; Ben, who saw her die, has the record on the household history
{
  const s = stage('rendered-continuity'); const w = s.w; w.settings.dynamics = 'rich'; w.settings.rulesVersion = 55;
  const ada = addPerson(s, 'Ada', 40.5, 40.5, { age: 34, inv: { wood: 3 }, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  const ben = addPerson(s, 'Ben', 42.5, 40.5, { age: 30, hh: ada.hhId, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  const st = site(s, 'hut', 46, 43, ada.hhId, ada.id);
  for (const p of [ada, ben]) { observe(w, p, st); p.needs.warmth = 100; p.needs.safety = 100; pin(p); }
  done(s); for (const p of [ada, ben]) perceive(w, p);
  w.sceneLabel = 'STAGED: a shelter plan outlives its maker (rules 53)';
  reviewIntentions(generateOptions(w, ada, true));
  if (!ada.intentions.some((i) => i.kind === 'shelter' && i.status === 'active')) throw new Error('no shelter plan');
  killPerson(w, ada, 'injuries');
  save('continuity', w, 'Ben');
}

// rules 54: the organiser dies on the way and Ben takes the journey over
{
  const f = relocationFixture(); const { w, a, b } = f; w.settings.rulesVersion = 55;
  f.run(a, ':propose:'); f.run(a, ':ask:'); f.run(a, ':prepare:'); f.run(a, 'eat_store:'); f.run(a, 'relocate-pack:'); f.run(a, ':rally:'); f.run(a, ':depart:');
  killPerson(w, a, 'injuries');
  f.run(b!, ':succeed:');
  w.sceneLabel = 'STAGED: a journey taken over after the organiser died (rules 54)';
  save('succession', w, 'Ben');
  setExternalController(null);
}

// rules 54: Ben fell behind out of sight; Ada looks where she last saw him and finds nobody
{
  const f = relocationFixture(); const { w, a, b } = f; w.settings.rulesVersion = 55;
  f.run(a, ':propose:'); f.run(a, ':ask:'); f.run(a, ':prepare:'); f.run(a, 'eat_store:'); f.run(a, 'relocate-pack:'); f.run(a, ':rally:'); f.run(a, ':depart:');
  b!.x = 20.5; b!.y = 60.5; a.seen = a.seen.filter((s) => s.id !== b!.id); a.whereabouts[b!.id] = { x: 56.5, y: 56.5, tick: w.tick - RESCUE_AFTER };
  f.run(a, ':rescue:' + b!.id);
  w.sceneLabel = 'STAGED: a search where the missing traveller was last seen (rules 54)';
  save('rescue', w, 'Ada');
  setExternalController(null);
}

// rules 55: seven loads of stone carried to the site on foot
{
  const s = stage('rendered-transport'); const w = s.w; w.settings.dynamics = 'rich'; w.settings.rulesVersion = 55; w.tick = 1000;
  const hana = addPerson(s, 'Hana', 40.5, 40.5, { age: 30, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 1 } });
  const hut = building(s, 'hut', 36, 36, hana.hhId, { grain: 10 }); w.households.find((h) => h.id === hana.hhId)!.homeId = hut.id;
  const st = site(s, 'storehouse', 44, 44, hana.hhId, hana.id); st.required.stone = 100;
  const yard = building(s, 'timber_yard', 50, 36, 0, {});
  done(s); for (const e of [hut, st, yard]) observe(w, hana, e); pin(hana);
  hana.skills.build = 0.2; hana.cooldowns.trade = 1e12; perceive(w, hana);
  for (let trip = 0; trip < HAUL_TRIPS + 1; trip++) { hana.inv.stone = (hana.inv.stone ?? 0) + 4; ledgerCreate(w, 'stone', 4, 'staged: a load to carry'); run(w, hana, `haul:${st.id}`); }
  w.sceneLabel = 'STAGED: what she has carried is the ground for wanting a cart (rules 55)';
  save('transport', w, 'Hana');
}
