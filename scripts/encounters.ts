// A SMALL ENCOUNTER COMPARISON for wolf defence (rules version 4).
//
//   npx vite-node scripts/encounters.ts -- [--n 40] [--ticks 900] [--staged-only] [--out encounters_out]
//
// What this is for, and what it is not. A village-wide ensemble cannot answer whether the defensive action works:
// spears are rare on their own (only somebody who has met a wolf wants one), so an ordinary run produces a handful of
// encounters and nothing is resolvable from them. This instead STAGES the encounter - one armed adult, one wolf that is
// already stalking, nothing else in the way - many times over, and runs each one twice: once with the action on and
// once with it off. Everything inside an encounter is the engine's: the option layer offers, the ranking chooses, the
// activity walks, and defence.ts resolves.
//
// It therefore establishes that the mechanism works and what it costs. It establishes NOTHING about how often this
// happens in a real village, or about anyone's chances of survival; the autonomous rate is reported separately and is
// low. Do not read a number here as a village-wide benefit.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { stageOf } from '../src/sim/people';
import { currentWorldSettings } from '../src/sim/profiles';
import { defProbe, defReset, defSnapshot, setWolfDefence } from '../src/sim/defence';
import { updateEnvironment } from '../src/sim/environment';
import { perceive } from '../src/sim/perception';
import { RNG } from '../src/sim/rng';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { testKit } from '../src/sim/scenes';
import { mintTool } from '../src/sim/tools';
import { makeWolf } from '../src/sim/wildlife';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const N = Number(opt('n', '40'));
const TICKS = Number(opt('ticks', '900'));
const OUT = opt('out', 'encounters_out');

interface Row {
  seed: string;
  armed: boolean;
  defence: boolean;
  /** what became of the encounter */
  droveOff: number;
  failed: number;
  leftOnItsOwn: number;
  setOut: number;
  offered: number;
  /** what became of the PERSON */
  bitten: number;
  endHealth: number;
  alive: boolean;
  /** was the wolf still after them at the end? */
  stillStalking: boolean;
  spearWear: number;
}

/**
 * One encounter. An adult in the open, a hut far enough off not to be a refuge at her elbow, and a wolf three tiles
 * away that is already stalking her. Nothing else: no neighbours to make it think better of it, no fire. The person is
 * bold (caution 0.15) because a timid one simply runs, which is the ranking working and is measured in the village
 * runs, not here.
 */
function encounter(seed: string, armed: boolean, defence: boolean): Row {
  setWolfDefence(defence);
  const w: World = testKit.flatWorld({ ...defaultSettings(seed), scene: 'natural', dynamics: 'rich', rulesVersion: CURRENT_RULES_VERSION });
  const rng = new RNG(1234);
  const p = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92, traits: { caution: 0.15 } });
  const home = createBuilding(w, 'hut', 28, 28, p.hhId);
  const hh = w.households.find((h) => h.id === p.hhId);
  if (hh) hh.homeId = home.id;
  const wolf = makeWolf(w, 43.5, 40.5);
  wolf.state = 'stalk';
  wolf.targetId = p.id;
  if (armed) mintTool(w, 'spear', 0, p.hhId, p.id, p.inv, p.id, 'encounter: armed', false);
  testKit.finish(w, 'natural');
  w.tick = 1000; // midday, so she can see as far as perception allows
  wolf.until = w.tick + TICKS * 2;
  updateEnvironment(w);
  perceive(w, p);

  defReset();
  defProbe.on = true;
  let bitten = 0;
  let lastHurt = p.cooldowns.hurt ?? -1;
  for (let n = 0; n < TICKS; n++) {
    stepWorld(w);
    const h = p.cooldowns.hurt ?? -1;
    if (h > lastHurt) {
      lastHurt = h;
      bitten++;
    }
    if (!p.alive) break;
  }
  const d = defSnapshot();
  const spear = w.tools.find((t) => t.kind === 'spear' && t.holder === p.id);
  return {
    seed,
    armed,
    defence,
    droveOff: d.droveOff,
    failed: d.failed,
    leftOnItsOwn: d.leftOnItsOwn,
    setOut: d.setOut,
    offered: d.offered,
    bitten,
    endHealth: Math.round(p.health),
    alive: p.alive,
    stillStalking: wolf.state === 'stalk',
    spearWear: spear ? Math.round(spear.wear * 10) / 10 : -1,
  };
}

const arms: { name: string; armed: boolean; defence: boolean }[] = [
  { name: 'armed, defence on', armed: true, defence: true },
  { name: 'armed, defence off', armed: true, defence: false },
  { name: 'unarmed', armed: false, defence: true },
];

const rows: Row[] = [];
for (let i = 0; i < N; i++) {
  const seed = `enc-${i}`;
  for (const a of arms) rows.push(encounter(seed, a.armed, a.defence));
}
setWolfDefence(true);

const mean = (xs: number[]): number => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 1000) / 1000 : 0);
const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

const lines: string[] = [];
lines.push(`# ${N} staged encounters, ${TICKS} ticks each, rules version ${CURRENT_RULES_VERSION}`);
lines.push('');
lines.push('One bold adult, one wolf already stalking her from three tiles, nothing else nearby. Three arms per seed.');
lines.push('"armed, defence off" is the `rich-no-defence` ablation: she still has the spear, she just will not use it.');
lines.push('');
lines.push('| arm | drove off | failed | wolf left on its own | set out | bites taken | ended healthy | still stalked at the end | spear wear |');
lines.push('|---|---|---|---|---|---|---|---|---|');
for (const a of arms) {
  const r = rows.filter((x) => x.armed === a.armed && x.defence === a.defence);
  lines.push(
    `| ${a.name} | ${sum(r.map((x) => x.droveOff))} | ${sum(r.map((x) => x.failed))} | ${sum(r.map((x) => x.leftOnItsOwn))} | ${sum(r.map((x) => x.setOut))} | ${mean(r.map((x) => x.bitten))} | ${mean(r.map((x) => x.endHealth))} | ${r.filter((x) => x.stillStalking).length}/${r.length} | ${mean(r.filter((x) => x.spearWear >= 0).map((x) => x.spearWear))} |`,
  );
}
lines.push('');
const on = rows.filter((x) => x.armed && x.defence);
const off = rows.filter((x) => x.armed && !x.defence);
const tried = sum(on.map((x) => x.droveOff + x.failed));
lines.push(`Of ${N} armed encounters with the action on, ${sum(on.map((x) => x.setOut))} set out, ${tried} reached the wolf and tried, ${sum(on.map((x) => x.droveOff))} drove it off.`);
lines.push(`With the action off and the same spear in hand: ${sum(off.map((x) => x.droveOff))} driven off, as it must be.`);
lines.push('');
lines.push('These are staged encounters, not a village or evidence of a survival benefit.');
if (!tried) lines.push('No defence attempt occurred in this window: this run does not establish that the mechanism resolves.');
lines.push('');

if (!args.includes('--staged-only')) {
// ── and what a village actually does, left to itself ──
lines.push('## And in an ordinary village, left to itself');
lines.push('');
lines.push('The same code, nothing staged: a 28-person world, no arrivals, twelve days. Run twice - once as it comes, and');
lines.push('once with every adult handed a spear on day 2, to separate "how often does this happen" from "does it work".');
lines.push('');
lines.push('| village | spears | chances to stand | set out | reached and tried | drove off | wolf left on its own | deaths |');
lines.push('|---|---|---|---|---|---|---|---|');
for (const armEveryone of [false, true]) {
  const w = createWorld(currentWorldSettings('normal', 'meadow', { immigration: false }));
  if (armEveryone) {
    while (w.tick < 2 * DAY) stepWorld(w);
    for (const q of w.persons) if (q.alive && stageOf(w, q) !== 'child') mintTool(w, 'spear', 0, q.hhId, q.id, q.inv, q.id, 'probe: armed', false);
  }
  defReset();
  defProbe.on = true;
  while (w.tick < 12 * DAY) stepWorld(w);
  const d2 = defSnapshot();
  let spears = 0;
  for (const t of w.tools) if (t.kind === 'spear') spears++;
  lines.push(`| ${armEveryone ? 'every adult armed on day 2' : 'as it comes'} | ${spears} | ${d2.offered} | ${d2.setOut} | ${d2.attempts} | ${d2.droveOff} | ${d2.leftOnItsOwn} | ${w.deceased.length} |`);
}
lines.push('');
lines.push('The first row measures autonomous frequency for this source and seed. The armed row is a staged availability probe. Neither establishes village-wide welfare or survival benefit.');

}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'rows.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
writeFileSync(join(OUT, 'report.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
