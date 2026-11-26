// Uptake of the rules-261 hearth bundle (helping at a birth, the naming day, keeping vigil) in one ordinary Normal world, arrivals on, the whole bundle on
// (or one part off with --off). Counts what happened, in the bundle's own words and from the world's own record; it changes nothing and draws nothing.
//
//   npx vite-node scripts/hearth_uptake.ts -- --seed gen-4 --days 45 --out C:/dev/lw_labs/hearth261_uptake/gen-4.json
//   --off birth|naming|vigil|all   switch that part (or the whole bundle) off, for a comparison
//   --rules N                      the rules version of the world (default 261)
//
// What is counted, per world:
//   births            every "was born to" line: with a helper there, or the plain line (she was helped by nobody: of those, she lay in, or she did not
//                     lie in and had no home, or had one and did not lie in; whether somebody was asked is read from the asks below)
//   asks              requests of kind attend_birth, by their end: promised then fulfilled, cancelled (born before they came), declined, expired, other;
//                     asked by the mother herself or by a housemate; promises given; helpers who came in time (fulfilled); helpers who waited at an empty
//                     door (told a time, and the woman not in sight: she had not come to lie in, or not yet)
//   naming            birth feasts called, opened, names said (and after the dead), feasts nobody came to, children alive named after the dead
//   vigils            begun, total ticks sat, ended by recovery / half a day / the sitter leaving for a need / the sick person dying / other,
//                     lines written ("sat with", "was with ... when he died"), sitters who caught the fever from the one they sat with
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { argsOf } from './world_args';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { HEARTH_PARTS, setHearthScenes } from '../src/sim/hearth_scenes';
import type { HearthPart } from '../src/sim/hearth_scenes';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import { generateOptions } from '../src/sim/decision';
import { stageOf } from '../src/sim/people';
import { isDark } from '../src/sim/environment';
import { isWalkable } from '../src/sim/registry';
import { looksFeverish } from '../src/sim/fever_sign';
import { WELL_FOR } from '../src/sim/vigil';
import type { Activity, Person } from '../src/sim/types';

const { opt } = argsOf(process.argv);
const seed = opt('seed', 'gen-4');
const days = Number(opt('days', '45'));
const out = opt('out', '');
const off = opt('off', '');
const rules = Number(opt('rules', '261'));
// --probe: while a woman lies in, every twenty ticks note who could have asked for help for her and what stood in the way (reads the world through the
// observer path of generateOptions, which writes nothing; a diagnostic, not a part of the count)
const probe = process.argv.includes('--probe');
const why = { womanTicks: 0, noAdultHousemate: 0, housemateTicks: 0, housemateSees: 0, offered: 0, seesButNotOffered: 0, seesNoNeighbourInSight: 0, seesNeighbourInSightButNotOffered: 0 };
if (off === 'all') setHearthScenes(false);
else if (off) { if (!(HEARTH_PARTS as readonly string[]).includes(off)) throw new Error(`--off ${off}: birth, naming, vigil or all`); setHearthScenes(false, off as HearthPart); }

const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: rules });
const t0 = Date.now();

// ── births ──
interface Mum { hadHome: boolean; lay: boolean }
const expecting = new Map<number, Mum>();
const births = { total: 0, helped: 0, noScene: 0, noSceneNoHome: 0, noSceneHadHome: 0, plainButLay: 0, lyingInBegun: 0 };
// helpers sent to a door (told a time) and what became of them; asks by whom; the mother's own funnel from the probe
const door = { went: 0, waitedAtEmptyDoor: 0, emptyDoorEnded: {} as Record<string, number>, wentEnded: {} as Record<string, number> };
const own = { womanTicks: 0, noHome: 0, noAdultInSight: 0, adultInSight: 0, offered: 0, notOffered: 0 };
// ── naming ──
const naming = { feastsCalled: 0, feastsOpened: 0, namesSaid: 0, namesSaidAfterDead: 0, nobodyCame: 0, plainFeastsCalled: 0 };
// ── vigils ──
const startedLying = new Set<number>();
const birthLines: string[] = [];
// the funnel of a vigil, from the probe: each stretch of somebody looking feverish (0.5 and over) or hurt (health under 60), and how far it got
interface Ep { person: number; start: number; kin: boolean; seen: boolean; seenResting: boolean; offered: boolean; begun: boolean }
const open = new Map<number, Ep>();
const episodes: Ep[] = [];
const lyingFailures: unknown[] = [];
const askLog = new Map<number, { from: number; to: number; dest: number; created: number; history: string[] }>();
const lyingEnded: Record<string, number> = {};
const noScene: { activity: string; indoors: boolean; dark: boolean; startedLyingInThisPregnancy: boolean }[] = [];
const lastState = new Map<number, { activity: string; indoors: boolean; dark: boolean }>();
const vigil = { begun: 0, ticksSat: 0, lines: 0, withThem: 0, ended: {} as Record<string, number>, forFever: 0, forHurt: 0, longest: 0 };
const sat: { sitter: number; sick: string; from: number }[] = [];
const caught = new Set<string>();
let fevers = 0, caughtFevers = 0;
w.hooks = {
  onActivityStart: (_p: Person, a: Activity) => {
    if (a.data.vigil !== undefined && a.kind === 'rest') { const e = open.get((a.data.vigil as { for: number }).for); if (e) e.begun = true; vigil.begun++; if ((a.data.vigil as { kind: string }).kind === 'fever') vigil.forFever++; else vigil.forHurt++; }
    if (a.data.lyingIn !== undefined) { births.lyingInBegun++; startedLying.add(_p.id); }
    if (a.data.birth !== undefined && a.data.told !== undefined) door.went++;
  },
  onActivityEnd: (p: Person, a: Activity, outcome: string, detail: string) => {
    if (a.data.lyingIn !== undefined && outcome === 'failed') lyingFailures.push({ tick: w.tick, who: p.id, at: [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10], spot: [a.spotX, a.spotY], spotWalkable: isWalkable(w, Math.floor(a.spotX), Math.floor(a.spotY)), phase: a.phase, detail, indoors: p.indoors ?? 0 });
    if (a.data.lyingIn !== undefined) { const k = outcome === 'success' ? 'ended with the child' : `${outcome}: ${detail}`; lyingEnded[k] = (lyingEnded[k] ?? 0) + 1; }
    if (a.data.birth !== undefined && a.data.told !== undefined) {
      const k = `${outcome}: ${detail}`;
      door.wentEnded[k] = (door.wentEnded[k] ?? 0) + 1;
      if (a.data.emptyDoor) { door.waitedAtEmptyDoor++; door.emptyDoorEnded[k] = (door.emptyDoorEnded[k] ?? 0) + 1; }
    }
    const v = a.data.vigil as { sat: number; well?: number; for: number; over?: true } | undefined;
    if (!v) return;
    vigil.ticksSat += v.sat;
    vigil.longest = Math.max(vigil.longest, v.sat);
    const how = v.over ? 'the sick person died with the sitter beside them' : detail === 'died' ? 'the sitter died' : (v.well ?? 0) >= WELL_FOR ? 'recovered' : outcome === 'success' ? 'sat the half day' : /see to myself|fever myself/.test(detail) ? 'the sitter left for a need' : /died|gone/.test(detail) ? 'they died (not beside)' : `other: ${detail || outcome}`;
    vigil.ended[how] = (vigil.ended[how] ?? 0) + 1;
    const sick = w.byId.get(v.for);
    if (v.sat > 0 && sick && sick.ent === 'person') sat.push({ sitter: p.id, sick: sick.name, from: w.tick });
  },
} as never;

let lastEvent = 0;
const scan = (): void => {
  for (const e of w.events) {
    if (e.id <= lastEvent) continue;
    lastEvent = e.id;
    const t = e.text;
    if (e.kind === 'life' && / was born to /.test(t)) {
      births.total++;
      birthLines.push(`${e.tick} ${t}`);
      const mumId = e.ids[1];
      const mum = expecting.get(mumId);
      if (/there to help\.$/.test(t)) births.helped++;
      else {
        births.noScene++;
        if (mum && !mum.hadHome) births.noSceneNoHome++; else births.noSceneHadHome++;
        if (mum?.lay) births.plainButLay++;
        const ls = lastState.get(mumId);
        noScene.push({ activity: ls?.activity ?? '?', indoors: ls?.indoors ?? false, dark: ls?.dark ?? false, startedLyingInThisPregnancy: startedLying.has(mumId) });
      }
      expecting.delete(mumId);
    } else if (/^A naming feast for .* is called at/.test(t)) naming.feastsCalled++;
    else if (/^A feast for .* is called at/.test(t) && e.ids.length === 2) naming.plainFeastsCalled++;
    else if (/^The naming feast at .* begins\.$/.test(t)) naming.feastsOpened++;
    else if (/ named (their|her|his) (son|daughter) /.test(t)) { naming.namesSaid++; if (/, after /.test(t)) naming.namesSaidAfterDead++; }
    else if (/^The naming feast at .* is over: nobody came\.$/.test(t)) naming.nobodyCame++;
    else if (/ sat (up through the night )?with /.test(t)) vigil.lines++;
    else if (/ was with .* when (he|she) died\.$/.test(t)) vigil.withThem++;
    else if (/ has come down with a fever/.test(t)) { fevers++; if (/caught from/.test(t)) caughtFevers++; }
  }
};
let tracked = 0;
// requests are cleared out of the world's list when it grows, so each is noted as it stands every twenty ticks, and read at its last standing
const askSeen = new Map<number, string>();
while (w.tick < days * DAY) {
  stepWorld(w);
  if (w.tick % 20 === 0) {
    scan();
    for (const r of w.requests) if (r.kind === 'attend_birth') {
      askSeen.set(r.id, r.status);
      const l = askLog.get(r.id) ?? { from: r.from, to: r.to, dest: r.destId ?? 0, created: r.created, history: [] };
      if (!l.history.length || !l.history[l.history.length - 1].startsWith(r.status + '@')) l.history.push(`${r.status}@${w.tick}${r.note ? ' ' + r.note : ''}`);
      askLog.set(r.id, l);
    }
    // women near term: whether they have a home (so that a birth with no scene can be told apart)
    for (const p of w.persons) if (p.alive && p.sex === 'f' && p.pregnantUntil > 0) {
      const hh = w.households.find((h) => h.id === p.hhId);
      const m = expecting.get(p.id) ?? { hadHome: false, lay: false };
      m.hadHome = !!hh?.homeId;
      lastState.set(p.id, { activity: p.activity ? `${p.activity.kind}:${p.activity.label}` : 'none', indoors: !!p.indoors, dark: isDark(w) });
      if (p.lyingIn !== undefined) m.lay = true;
      expecting.set(p.id, m);
      tracked++;
    }
    // the woman's own ask: from a day before her time until she lies in, with a home, not lying in; sees a grown person who is not of her household
    if (probe) for (const m of w.persons) if (m.alive && m.sex === 'f' && m.pregnantUntil > w.tick && m.pregnantUntil - w.tick <= DAY && m.lyingIn === undefined && m.activity?.data.lyingIn === undefined) {
      own.womanTicks++;
      const hh = w.households.find((h) => h.id === m.hhId);
      if (!hh?.homeId) { own.noHome++; continue; }
      const ctx = generateOptions(w, m, true, true);
      if (ctx.options.some((o) => o.key.endsWith(':request:birth'))) { own.offered++; continue; }
      if (ctx.seenPersons.some((s) => s.id !== m.id && w.byId.get(s.id)?.ent === 'person' && (w.byId.get(s.id) as Person).hhId !== m.hhId && !s.child)) { own.adultInSight++; own.notOffered++; } else own.noAdultInSight++;
    }
    if (probe) for (const m of w.persons) if (m.alive && m.sex === 'f' && m.activity?.data.lyingIn !== undefined) {
      why.womanTicks++;
      const mates = w.persons.filter((q) => q.alive && q !== m && q.hhId === m.hhId && stageOf(w, q) !== 'child');
      if (!mates.length) { why.noAdultHousemate++; continue; }
      why.housemateTicks++;
      let sees = false, offered = false, neighbour = false;
      for (const h of mates) {
        if (!h.seen.some((s) => s.id === m.id && s.lyingIn)) continue;
        sees = true;
        const ctx = generateOptions(w, h, true, true);
        if (ctx.options.some((o) => o.key.endsWith(':request:birth'))) offered = true;
        if (ctx.seenPersons.some((s) => s.id !== m.id && w.byId.get(s.id)?.ent === 'person' && (w.byId.get(s.id) as Person).hhId !== m.hhId && !s.child)) neighbour = true;
      }
      if (sees) why.housemateSees++;
      if (offered) why.offered++;
      else if (sees) { why.seesButNotOffered++; if (neighbour) why.seesNeighbourInSightButNotOffered++; else why.seesNoNeighbourInSight++; }
    }
    if (probe) {
      for (const p of w.persons) {
        const flagged = p.alive && (looksFeverish(p) || p.health < 60);
        const ep = open.get(p.id);
        if (!flagged) { if (ep) { episodes.push(ep); open.delete(p.id); } continue; }
        const e = ep ?? { person: p.id, start: w.tick, kin: false, seen: false, seenResting: false, offered: false, begun: false };
        if (!ep) open.set(p.id, e);
        const mates = w.persons.filter((q) => q.alive && q !== p && stageOf(w, q) !== 'child' && (q.hhId === p.hhId || q.partnerId === p.id || ['partner', 'parent', 'child'].includes(q.relations[p.id]?.kin ?? '') || ['partner', 'parent', 'child'].includes(p.relations[q.id]?.kin ?? '')));
        if (mates.length) e.kin = true;
        for (const q of mates) {
          const s = q.seen.find((x) => x.id === p.id && (x.feverish || x.hurt));
          if (!s) continue;
          e.seen = true;
          if (s.asleep || s.act === 'rest' || s.act === 'sleep' || s.act === 'warm') {
            e.seenResting = true;
            if (!e.offered && generateOptions(w, q, true, true).options.some((o) => o.key === `vigil:${p.id}`)) e.offered = true;
          }
        }
      }
    }
    // sitters who caught the fever from the one they sat with, in the day after
    for (const s of sat) {
      const p = w.byId.get(s.sitter);
      if (p && p.ent === 'person' && p.illness && p.illness.how === `caught from ${s.sick}` && p.illness.since >= s.from - DAY && p.illness.since <= s.from + DAY) caught.add(`${s.sitter}:${s.sick}:${p.illness.since}`);
    }
  }
}
scan();

const asks: Record<string, number> = {};
for (const r of w.requests) if (r.kind === 'attend_birth') askSeen.set(r.id, r.status);
for (const st of askSeen.values()) asks[st] = (asks[st] ?? 0) + 1;
const named = w.persons.filter((p) => p.namedAfter !== undefined).length;
const askLogs = [...askLog.values()];
const asksBy = {
  byMother: askLogs.filter((l) => l.from === l.dest).length,
  byHousemate: askLogs.filter((l) => l.from !== l.dest).length,
  promisesGiven: askLogs.filter((l) => l.history.some((h) => h.startsWith('promised@') || h.startsWith('fulfilled@'))).length,
  promisesGivenToMother: askLogs.filter((l) => l.from === l.dest && l.history.some((h) => h.startsWith('promised@') || h.startsWith('fulfilled@'))).length,
  helpersInTime: askLogs.filter((l) => l.history.some((h) => h.startsWith('fulfilled@'))).length,
  helpersInTimeOfMother: askLogs.filter((l) => l.from === l.dest && l.history.some((h) => h.startsWith('fulfilled@'))).length,
  helpersWhoWaitedAtAnEmptyDoor: door.waitedAtEmptyDoor,
  helpersSentToADoor: door.went,
};
const result = {
  seed, rules, days: Math.round(w.tick / DAY), off: off || 'none',
  population: w.persons.filter((p) => p.alive).length, deaths: w.deceased.length,
  births, lyingEnded, lyingFailures, noScene, asks, asksBy, door, askLog: [...askLog.entries()], naming: { ...naming, childrenAliveNamedAfterTheDead: named },
  vigil: { ...vigil, sittersWhoCaughtTheFever: caught.size, feversInTheWorld: fevers, ofThemCaught: caughtFevers },
  birthLines,
  ...(probe ? { whyNoAsk: why, ownAsk: own, vigilFunnel: (() => { const all = [...episodes, ...open.values()]; return { episodes: all.length, withKinOrHousemate: all.filter((e) => e.kin).length, seenByThem: all.filter((e) => e.seen).length, seenAtRest: all.filter((e) => e.seenResting).length, offered: all.filter((e) => e.offered).length, begun: all.filter((e) => e.begun).length }; })() } : {}),
  conserved: conservationReport(w).ok, seconds: Math.round((Date.now() - t0) / 100) / 10, trackedMotherChecks: tracked,
};
const text = JSON.stringify(result, null, 1);
console.log(text);
if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, text); }
