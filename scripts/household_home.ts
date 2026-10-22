// THE HOUSEHOLD-TO-HOME SITUATION, read off the records of an ordinary autonomous run.
//
// Nobody is told what to do here. This is `createWorld` + `stepWorld` with the current rules and nothing else, watching
// the chain through records the simulation already keeps:
//
//   the household's shelter -> the site it laid out -> the plans its members took on -> the material that really arrived
//   -> the work done -> completion and ownership -> who went inside -> and anything that failed on the way
//
// Every figure below is read from state or from a record the simulation wrote: a plan's own `reason`, the site's
// `delivered`/`work`, `hh.homeId`, `p.indoors`. Nothing is inferred and nothing is staged.
//
//   npx vite-node scripts/household_home.ts -- [seed] [days] [--off] [--hh <id>] [--json out.json]
//
// `--off` throws the lab switch (`rich-no-shelter`), which removes the shelter PLAN and nothing else, so the same seed can
// be watched with and without people fetching their own home's materials on purpose. `--hh` follows a named household
// instead of the one chosen below.
//
// Plans are counted AS THEY HAPPEN, never from the records that survive to the end: the per-person list of ended plans is
// trimmed by ordinary housekeeping (intent.ts), so counting at the end would silently undercount.
import { writeFileSync } from 'node:fs';
import { isSolidHome } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { setShelterPlans, shelterPlansOn } from '../src/sim/shelter';
import { hashWorld, stepWorld } from '../src/sim/world';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import type { Building, Items, Site, World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const positional = args.filter((a) => !a.startsWith('--'));
const hhAt = args.indexOf('--hh');
const jsonAt = args.indexOf('--json');
const wantHh = hhAt >= 0 ? Number(args[hhAt + 1]) : 0;
const seed = positional.find((a) => Number.isNaN(Number(a))) ?? 'river';
const days = Number(positional.find((a) => !Number.isNaN(Number(a))) ?? 8);
if (args.includes('--off')) setShelterPlans(false);

const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
const DAY = 2400;

const label = (e: Building | Site | undefined) => (e ? `${e.type} #${e.id}` : 'nothing');
const items = (it: Partial<Items>) =>
  (Object.keys(it) as (keyof Items)[])
    .filter((k) => (it[k] ?? 0) > 0)
    .map((k) => `${Math.round(it[k] ?? 0)} ${k}`)
    .join(', ') || 'nothing';
function remaining(s: Site): Partial<Items> {
  const out: Partial<Items> = {};
  for (const k of Object.keys(s.required) as (keyof Items)[]) {
    const left = (s.required[k] ?? 0) - (s.delivered[k] ?? 0) - (s.used[k] ?? 0);
    if (left > 0) out[k] = left;
  }
  return out;
}

/** one line of the story, tagged with the household it belongs to so nothing has to be read back out of the prose */
interface Line {
  tick: number;
  hh: number;
  what: string;
  text: string;
}
const story: Line[] = [];
const say = (hh: number, what: string, text: string) => story.push({ tick: w.tick, hh, what, text });

/** what a household got up to about its own home, accumulated as it happens */
interface Tally {
  gotSolidHome: number;
  sitesLaid: number;
  sitesFinished: number;
  sitesLost: number;
  plansAdopted: number;
  plansDone: number;
  plansGivenUp: number;
  carried: number;
  entries: number;
}
const tally = new Map<number, Tally>();
const of = (hh: number): Tally =>
  tally.get(hh) ??
  (tally.set(hh, { gotSolidHome: 0, sitesLaid: 0, sitesFinished: 0, sitesLost: 0, plansAdopted: 0, plansDone: 0, plansGivenUp: 0, carried: 0, entries: 0 }), tally.get(hh)!);

const homeWas = new Map<number, number>();
const indoorWas = new Map<number, number>();
const siteWas = new Map<number, { type: string; hh: number; delivered: string; work: number }>();
const planWas = new Map<number, string>();
const planSeen = new Set<number>();
const planEnded = new Set<number>();
const endings: string[] = [];
for (const hh of w.households) homeWas.set(hh.id, hh.homeId);

while (w.tick < days * DAY) {
  stepWorld(w);

  for (const hh of w.households) {
    const prev = homeWas.get(hh.id);
    const b = w.byId.get(hh.homeId);
    const now = b && b.ent === 'building' ? b : undefined;
    if (prev !== undefined && prev !== hh.homeId) {
      say(hh.id, 'home', `${hh.name} household: home ${prev || 'none'} -> ${hh.homeId} (${now ? label(now) : 'none'})`);
      if (now && isSolidHome(now.type)) {
        of(hh.id).gotSolidHome = w.tick;
        say(hh.id, 'housed', `${hh.name} household now calls ${label(now)} home — built by ${now.builtBy?.join(', ') ?? 'unrecorded'}`);
      }
    }
    homeWas.set(hh.id, hh.homeId);
  }

  for (const s of w.sites) {
    const prev = siteWas.get(s.id);
    const isHome = s.type === 'hut' || s.type === 'house' || s.type === 'lean_to';
    if (!prev) {
      const hh = w.households.find((h) => h.id === s.hhId);
      if (isHome) of(s.hhId).sitesLaid++;
      say(s.hhId, 'site', `${hh ? hh.name + ' household' : 'nobody'} laid out ${label(s)} at (${s.x},${s.y}), wanting ${items(s.required)}; by person ${s.creatorId}`);
    } else if (prev.delivered !== items(s.delivered)) {
      say(s.hhId, 'material', `${label(s)} now holds ${items(s.delivered)} (was ${prev.delivered}); still wants ${items(remaining(s))}`);
    } else if (Math.floor(s.work / 130) > Math.floor(prev.work / 130)) {
      say(s.hhId, 'work', `${label(s)} work ${Math.round(s.work)}/${s.workTotal}`);
    }
    siteWas.set(s.id, { type: s.type, hh: s.hhId, delivered: items(s.delivered), work: s.work });
  }
  for (const [id, info] of [...siteWas]) {
    if (w.sites.some((s) => s.id === id)) continue;
    siteWas.delete(id);
    const became = w.buildings.find((b) => b.builtTick >= w.tick - 2 && b.type === info.type);
    const isHome = info.type === 'hut' || info.type === 'house' || info.type === 'lean_to';
    if (isHome) {
      if (became) of(info.hh).sitesFinished++;
      else of(info.hh).sitesLost++;
    }
    say(info.hh, became ? 'built' : 'lost', became ? `${info.type} site #${id} finished as ${label(became)}` : `${info.type} site #${id} is gone without being finished`);
  }

  for (const p of w.persons) {
    for (const i of p.intentions) {
      if (i.kind !== 'shelter') continue;
      const now = `${i.status}|${i.step}|${i.blocked}|${i.reason}`;
      if (planWas.get(i.id) === now) continue;
      const first = !planSeen.has(i.id);
      planWas.set(i.id, now);
      if (first) {
        planSeen.add(i.id);
        of(p.hhId).plansAdopted++;
        say(p.hhId, 'plan', `${p.name} (${p.id}) means to ${i.goal} — because ${i.reason}; about site ${i.aboutId}`);
      } else if (i.status !== 'active') {
        if (!planEnded.has(i.id)) {
          planEnded.add(i.id);
          const t = of(p.hhId);
          if (i.status === 'done') t.plansDone++;
          else t.plansGivenUp++;
          t.carried += i.worked;
          endings.push(`${i.status}: ${i.reason}`);
        }
        say(p.hhId, 'plan-end', `${p.name} (${p.id}): ${i.status === 'done' ? 'DONE' : 'gave up'} — ${i.reason} (carried ${Math.round(i.worked)})`);
      } else if (i.blocked) say(p.hhId, 'plan-hold', `${p.name} (${p.id}) on hold: ${i.blocked} (step: ${i.step})`);
      else say(p.hhId, 'plan-step', `${p.name} (${p.id}) step: ${i.step}`);
    }
  }

  for (const p of w.persons) {
    const prev = indoorWas.get(p.id) ?? 0;
    const now = p.indoors ?? 0;
    if (now !== prev) {
      const b = w.byId.get(now || prev);
      if (now) of(p.hhId).entries++;
      say(p.hhId, now ? 'enter' : 'exit', `${p.name} (${p.id}) ${now ? 'went into' : 'came out of'} ${b && b.ent === 'building' ? label(b) : 'a building'}${now && p.activity ? ` to ${p.activity.kind}` : ''}`);
      indoorWas.set(p.id, now);
    }
  }
}

const housedNow = (world: World, hh: number): Building | null => {
  const h = world.households.find((x) => x.id === hh);
  const b = h ? world.byId.get(h.homeId) : undefined;
  return b && b.ent === 'building' && isSolidHome(b.type) ? b : null;
};

/**
 * The household whose chain is told in full. The best story is the complete one: a household that ended the window in a
 * solid home it had members carry material to, and went inside. Failing that, one that reached a solid home at all;
 * failing that, the one whose home site got furthest, so that a FAILURE is still followable.
 */
function pickHousehold(): number {
  if (wantHh) return wantHh;
  const score = (hh: number): number => {
    const t = of(hh);
    const home = housedNow(w, hh);
    return (home ? 1000 : 0) + (t.entries > 0 ? 500 : 0) + (t.carried > 0 ? 250 : 0) + t.plansDone * 60 + t.plansAdopted * 10 + Math.round(t.carried);
  };
  const ids = w.households.map((h) => h.id).filter((id) => tally.has(id));
  if (!ids.length) return w.households[0]?.id ?? 0;
  const best = ids.slice().sort((a, b) => score(b) - score(a))[0];
  if (score(best) > 0) return best;
  const site = w.sites.filter((s) => s.type === 'hut' || s.type === 'house').sort((a, b) => b.work - a.work)[0];
  return site?.hhId ?? best;
}

const focusId = pickHousehold();
const focus = w.households.find((h) => h.id === focusId);
const focusHome = housedNow(w, focusId);
const t = of(focusId);

const roundTrip = deserializeWorld(serializeWorld(w));
const housedCount = (world: World) => world.households.filter((h) => housedNow(world, h.id) !== null).length;

const report = {
  what: 'the household-to-home chain in an ordinary autonomous run; nothing staged, nobody told what to do',
  source: { rulesVersion: w.settings.rulesVersion, currentRulesVersion: CURRENT_RULES_VERSION, dynamics: w.settings.dynamics, shelterPlans: shelterPlansOn() },
  run: { seed, profile: 'normal', settings: { immigration: false, harsh: false, scene: 'natural' }, fromTick: 0, toTick: w.tick, days },
  world: {
    alive: w.persons.filter((p) => p.alive).length,
    households: w.households.length,
    housedHouseholds: housedCount(w),
    solidHomes: w.buildings.filter((b) => isSolidHome(b.type)).length,
    leanTos: w.buildings.filter((b) => b.type === 'lean_to').length,
    indoorNow: w.persons.filter((p) => p.indoors).length,
  },
  shelterPlansAcrossTheRun: {
    adopted: planSeen.size,
    ended: planEnded.size,
    done: [...tally.values()].reduce((n, x) => n + x.plansDone, 0),
    goneUpOn: [...tally.values()].reduce((n, x) => n + x.plansGivenUp, 0),
    stillLive: planSeen.size - planEnded.size,
    unitsCarriedByPlans: Math.round([...tally.values()].reduce((n, x) => n + x.carried, 0)),
    endings,
  },
  homeSites: {
    laid: [...tally.values()].reduce((n, x) => n + x.sitesLaid, 0),
    finished: [...tally.values()].reduce((n, x) => n + x.sitesFinished, 0),
    lostUnfinished: [...tally.values()].reduce((n, x) => n + x.sitesLost, 0),
    openAtTheEnd: w.sites
      .filter((s) => s.type === 'hut' || s.type === 'house' || s.type === 'lean_to')
      .map((s) => ({ id: s.id, type: s.type, household: s.hhId, status: s.status, work: `${Math.round(s.work)}/${s.workTotal}`, delivered: items(s.delivered), stillWants: items(remaining(s)) })),
  },
  followed: {
    household: focus ? `${focus.name} (${focus.id})` : 'none',
    members: focus?.members ?? [],
    startedIn: 'a lean-to or no shelter of its own (every household begins without a solid home)',
    homeAtTheEnd: focusHome ? label(focusHome) : 'still no solid home',
    builtBy: focusHome?.builtBy ?? [],
    becameTheirHomeAtTick: t.gotSolidHome || null,
    insideItNow: w.persons.filter((p) => p.hhId === focusId && focusHome && p.indoors === focusHome.id).map((p) => `${p.name} (${p.id})`),
    unitsItsMembersCarried: Math.round(t.carried),
    plans: { adopted: t.plansAdopted, done: t.plansDone, goneUpOn: t.plansGivenUp },
    chain: story.filter((l) => l.hh === focusId).map((l) => `${String(l.tick).padStart(5)} [${l.what}] ${l.text}`),
  },
  savedAndReloaded: {
    identical: serializeWorld(roundTrip) === serializeWorld(w),
    hash: hashWorld(w),
    hashAfter: hashWorld(roundTrip),
    housedAfter: housedCount(roundTrip),
  },
  limits:
    'One run of one seed. It shows the chain is possible and that every link is recorded. It is NOT evidence that more households get housed, that anybody survives better, or that this happens in every world. The on/off ablation figures are in docs/HOUSEHOLD_HOME.md.',
};

if (jsonAt >= 0 && args[jsonAt + 1]) {
  writeFileSync(args[jsonAt + 1], JSON.stringify(report, null, 2) + '\n');
  console.log(`written ${args[jsonAt + 1]}`);
} else {
  console.log(JSON.stringify(report, null, 2));
}
