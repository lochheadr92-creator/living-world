// THE WHOLE HOUSEHOLD LOOP, read off the records of an ordinary autonomous run.
//
// `household_home.ts` follows one half of a household's life: the roof. This follows the rest of it beside the roof, so that
// "can a household get from hungry to fed to housed" is a question with an answer and not a hope:
//
//   hunger -> the food that ended it (pack, store, shared meal) -> what the household keeps in its store
//   -> the roof (site, material, build, ownership, who sleeps inside) -> what members asked of each other and what really
//   arrived -> anyone lost to need -> and, for every household that did NOT get all the way, the first link that is missing
//
// Nothing is staged and nothing is inferred. Every line is read from state or from a record the simulation wrote: a person's
// own hunger and results, a plan's `reason`, a site's `delivered`, a request's `status` and `delivered`, `hh.homeId`,
// `p.indoors`, `world.deceased`. The reporting thresholds below (when a person counts as "hungry", and as "recovered") are
// this script's, not the simulation's, and are printed with the result.
//
// Observer purity. The script steps the real world and reads it between steps; it installs only `world.hooks.onActivityStart`
// (not saved, not hashed). The inspector's card text is read from a ROUND-TRIPPED COPY, never from the live world, and the
// live world's hash is taken first and again at the end of the run and reported.
//
//   npx vite-node scripts/household_life.ts -- [seed] [days] [--profile normal|town|large] [--rules N] [--off] [--hh <id>] [--json out.json]
//
// `--rules 8` runs the same seed under the previous generation. `--off` throws the `rich-no-table-eating` lab switch. Both
// exist so that one seed can be watched with and without eating at a store, on the same code.
import { writeFileSync } from 'node:fs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { CRITICAL, DAY, isSolidHome } from '../src/sim/constants';
import { foodUnits } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { describePerson } from '../src/sim/inspect';
import { currentWorldSettings } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { setTableEating } from '../src/sim/tableeating';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Building, Items, Person, Site, World } from '../src/sim/types';
import { watchStoreMeals } from '../tests/helpers/storewatch';

const args = process.argv.slice(2).filter((a) => a !== '--');
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !['--profile', '--rules', '--hh', '--json'].includes(args[i - 1] ?? ''));
const seed = positional.find((a) => Number.isNaN(Number(a))) ?? 'river';
const days = Number(positional.find((a) => !Number.isNaN(Number(a))) ?? 8);
const profile = (flag('--profile') ?? 'normal') as ProfileName;
const rules = flag('--rules') ? Number(flag('--rules')) : CURRENT_RULES_VERSION;
const wantHh = flag('--hh') ? Number(flag('--hh')) : 0;
const jsonOut = flag('--json');
if (args.includes('--off')) setTableEating(false);

/** reporting thresholds: this script's words for "hungry" and "fed again", not parameters of the simulation */
const HUNGRY = 30;
const RECOVERED = 55;

const w = createWorld({ ...currentWorldSettings(profile, seed, { immigration: false }), rulesVersion: rules });

interface Line {
  tick: number;
  hh: number;
  what: string;
  text: string;
}
const story: Line[] = [];
const say = (hh: number, what: string, text: string) => story.push({ tick: w.tick, hh, what, text });

interface Episode {
  person: string;
  id: number;
  since: number;
  until: number | null;
  lowest: number;
  endedBy: string | null;
}
interface Facts {
  id: number;
  name: string;
  members0: number;
  episodes: Episode[];
  storeMeals: { ok: number; failed: number; packFull: number; empty: number; gone: number; other: number; interrupted: number };
  requests: { made: number; byStatus: Record<string, number>; unitsDelivered: number };
  sites: { laid: number; finished: number; lost: number };
  plans: Record<string, { adopted: number; done: number; dropped: number }>;
  firstSolidHome: number | null;
  entries: number;
  needDeaths: { name: string; cause: string; tick: number }[];
  storeFood: { start: number; lowest: number; end: number };
}
const facts = new Map<number, Facts>();
const homeStoreFood = (hhId: number): number => {
  const hh = w.households.find((h) => h.id === hhId);
  const b = hh ? w.byId.get(hh.homeId) : undefined;
  return b && b.ent === 'building' ? foodUnits(b.store.items) : 0;
};
const of = (hhId: number): Facts => {
  let f = facts.get(hhId);
  if (!f) {
    const hh = w.households.find((h) => h.id === hhId);
    const start = homeStoreFood(hhId);
    f = {
      id: hhId,
      name: hh?.name ?? '?',
      members0: hh?.members.length ?? 0,
      episodes: [],
      storeMeals: { ok: 0, failed: 0, packFull: 0, empty: 0, gone: 0, other: 0, interrupted: 0 },
      requests: { made: 0, byStatus: {}, unitsDelivered: 0 },
      sites: { laid: 0, finished: 0, lost: 0 },
      plans: {},
      firstSolidHome: null,
      entries: 0,
      needDeaths: [],
      storeFood: { start, lowest: start, end: start },
    };
    facts.set(hhId, f);
  }
  return f;
};
for (const h of w.households) of(h.id);

const itemsText = (it: Partial<Items>) =>
  (Object.keys(it) as (keyof Items)[])
    .filter((k) => (it[k] ?? 0) > 0)
    .map((k) => `${Math.round(it[k] ?? 0)} ${k}`)
    .join(', ') || 'nothing';
const remaining = (s: Site): Partial<Items> => {
  const out: Partial<Items> = {};
  for (const k of Object.keys(s.required) as (keyof Items)[]) {
    const left = (s.required[k] ?? 0) - (s.delivered[k] ?? 0) - (s.used[k] ?? 0);
    if (left > 0) out[k] = left;
  }
  return out;
};
const isHomeSite = (t: string) => t === 'hut' || t === 'house' || t === 'lean_to';
const label = (e: Building | Site | undefined) => (e ? `${e.type} #${e.id}` : 'nothing');
const activePlans = (p: Person) => p.intentions.filter((i) => i.status === 'active').map((i) => `${i.kind}: ${i.goal}`);

// ── the watch on store meals: who ate at a store, who could not, and why not ──
const watch = watchStoreMeals((e) => {
  const f = of(e.hhId);
  const p = w.byId.get(e.personId);
  const who = p && p.ent === 'person' ? `${p.name} (${p.id})` : `person ${e.personId}`;
  const sm = f.storeMeals;
  if (e.outcome === 'success') {
    sm.ok++;
    const pack = p && p.ent === 'person' ? itemsText(p.inv) : '?';
    const plans = p && p.ent === 'person' ? activePlans(p) : [];
    say(e.hhId, 'store-meal', `${who} ate at the store #${e.targetId}; hunger now ${e.hunger}/100; pack: ${pack}${plans.length ? `; plans live: ${plans.join(' | ')}` : ''}`);
  } else if (e.outcome === 'interrupted') sm.interrupted++;
  else {
    const why = e.why ?? 'other';
    sm.failed++;
    sm[why]++;
    const reason = why === 'packFull' ? 'the store held food and the pack had no room for it' : why === 'empty' ? 'the store was empty' : why === 'gone' ? 'the store was gone' : 'unexplained';
    say(e.hhId, 'store-fail', `${who} could not eat at store #${e.targetId} (${e.detail}): ${reason}; hunger ${e.hunger}/100`);
  }
});
watch.attach(w);

const hungerWas = new Map<number, number>();
const lastMeal = new Map<number, { tick: number; how: string }>();
const open = new Map<number, Episode>();
const hhOf = new Map<number, number>();
const homeWas = new Map<number, number>();
const siteWas = new Map<number, { type: string; hh: number; complete: boolean }>();
const planSeen = new Set<number>();
const planEnded = new Set<number>();
const indoorWas = new Map<number, number>();
const reqWas = new Map<number, string>();
const reqGot = new Map<number, number>();
let deceasedSeen = 0;
for (const h of w.households) homeWas.set(h.id, h.homeId);

/**
 * What was going on when hunger rose. A bite can be the last act of its activity, which is then gone by the time the tick is
 * read, so the eating activities are remembered from the tick before (`eatingNow`) and used when the activity has just ended.
 * Hunger rises in exactly three places: a bite of an `eat`/`eat_store` activity, eating while gathering (act_resource.ts), and a
 * shared meal (meals.ts).
 */
const eatingNow = new Map<number, { tick: number; how: string }>();
const noteEating = (p: Person): void => {
  const a = p.activity;
  if (a && (a.kind === 'eat' || a.kind === 'eat_store')) {
    eatingNow.set(p.id, { tick: w.tick, how: a.kind === 'eat_store' ? (a.data.table ? 'ate at the store (pack full)' : 'ate from the store, through the pack') : 'ate what they carried' });
  }
};
const how = (p: Person): string => {
  const e = eatingNow.get(p.id);
  if (e && w.tick - e.tick <= 12) return e.how;
  const a = p.activity;
  if (!a) return 'a shared meal, or an activity that had just ended';
  if (a.kind === 'gather') return `ate while gathering (${a.label})`;
  return `${a.kind}: ${a.label}`;
};

while (w.tick < days * DAY) {
  stepWorld(w);
  watch.scan(w);

  // ── people: hunger episodes and what ended them ──
  for (const p of w.persons) {
    hhOf.set(p.id, p.hhId);
    noteEating(p);
    const before = hungerWas.get(p.id) ?? p.needs.hunger;
    if (p.needs.hunger - before >= 5) lastMeal.set(p.id, { tick: w.tick, how: how(p) });
    hungerWas.set(p.id, p.needs.hunger);
    const ep = open.get(p.id);
    if (!ep && p.needs.hunger < HUNGRY) {
      const e: Episode = { person: p.name, id: p.id, since: w.tick, until: null, lowest: p.needs.hunger, endedBy: null };
      open.set(p.id, e);
      of(p.hhId).episodes.push(e);
      say(p.hhId, 'hungry', `${p.name} (${p.id}) is hungry (${Math.round(p.needs.hunger)}/100); pack: ${itemsText(p.inv)}; household store holds ${homeStoreFood(p.hhId)} food`);
    } else if (ep) {
      ep.lowest = Math.min(ep.lowest, p.needs.hunger);
      if (p.needs.hunger >= RECOVERED) {
        ep.until = w.tick;
        ep.endedBy = lastMeal.get(p.id)?.how ?? 'unrecorded';
        open.delete(p.id);
        say(p.hhId, 'fed', `${p.name} (${p.id}) is fed again (${Math.round(p.needs.hunger)}/100) after ${w.tick - ep.since} ticks, lowest ${Math.round(ep.lowest)}: ${ep.endedBy}`);
      }
    }
  }

  // ── the household's store, once a day ──
  if (w.tick % DAY === 0) {
    for (const h of w.households) {
      const f = of(h.id);
      const now = homeStoreFood(h.id);
      f.storeFood.lowest = Math.min(f.storeFood.lowest, now);
      f.storeFood.end = now;
    }
  }

  // ── the roof: homes, sites, plans, who goes inside ──
  for (const h of w.households) {
    const prev = homeWas.get(h.id);
    if (prev !== undefined && prev !== h.homeId) {
      const b = w.byId.get(h.homeId);
      const now = b && b.ent === 'building' ? b : undefined;
      say(h.id, 'home', `${h.name} household: home ${prev || 'none'} -> ${h.homeId} (${now ? label(now) : 'none'})`);
      if (now && isSolidHome(now.type) && of(h.id).firstSolidHome === null) {
        of(h.id).firstSolidHome = w.tick;
        say(h.id, 'housed', `${h.name} household now calls ${label(now)} home, built by ${now.builtBy?.join(', ') ?? 'unrecorded'}`);
      }
    }
    homeWas.set(h.id, h.homeId);
  }
  for (const s of w.sites) {
    if (!isHomeSite(s.type)) continue;
    const prev = siteWas.get(s.id);
    const complete = Object.keys(remaining(s)).length === 0;
    if (!prev) {
      of(s.hhId).sites.laid++;
      say(s.hhId, 'site', `${label(s)} laid out at (${s.x},${s.y}) by person ${s.creatorId}, wanting ${itemsText(s.required)}`);
    } else if (complete && !prev.complete) say(s.hhId, 'material', `${label(s)} now holds everything it wants; it needs building`);
    siteWas.set(s.id, { type: s.type, hh: s.hhId, complete });
  }
  for (const [id, info] of [...siteWas]) {
    if (w.sites.some((s) => s.id === id)) continue;
    siteWas.delete(id);
    const became = w.buildings.find((b) => b.builtTick >= w.tick - 2 && b.type === info.type);
    if (became) {
      of(info.hh).sites.finished++;
      say(info.hh, 'built', `${info.type} site #${id} finished as ${label(became)}`);
    } else {
      of(info.hh).sites.lost++;
      say(info.hh, 'lost', `${info.type} site #${id} is gone without being finished`);
    }
  }
  for (const p of w.persons) {
    for (const i of p.intentions) {
      const t = (of(p.hhId).plans[i.kind] ??= { adopted: 0, done: 0, dropped: 0 });
      if (!planSeen.has(i.id)) {
        planSeen.add(i.id);
        t.adopted++;
        say(p.hhId, 'plan', `${p.name} (${p.id}) means to ${i.goal}, because ${i.reason}`);
      } else if (i.status !== 'active' && !planEnded.has(i.id)) {
        planEnded.add(i.id);
        if (i.status === 'done') t.done++;
        else t.dropped++;
        say(p.hhId, 'plan-end', `${p.name} (${p.id}): ${i.kind} plan ${i.status === 'done' ? 'DONE' : 'given up'}, ${i.reason}`);
      }
    }
    const prevIn = indoorWas.get(p.id) ?? 0;
    const now = p.indoors ?? 0;
    if (now !== prevIn) {
      if (now) {
        of(p.hhId).entries++;
        const b = w.byId.get(now);
        if (of(p.hhId).entries <= 2) say(p.hhId, 'enter', `${p.name} (${p.id}) went into ${b && b.ent === 'building' ? label(b) : 'a building'}`);
      }
      indoorWas.set(p.id, now);
    }
  }

  // ── what members asked of others, and what really arrived ──
  // What arrived is read from where the material really changes hands: `Request.delivered` for a gift made on the spot, and
  // `Commitment.delivered` (or `contrib`, for work) for a promise kept later. A promise that ends "fulfilled" often leaves
  // `Request.delivered` unset, so reading only that would report real deliveries as nothing. The commitment is looked at every
  // tick and the highest figure kept, because a finished commitment is later trimmed from the person's list.
  const commitments = new Map<number, { delivered?: number; contrib?: number }>();
  for (const q of w.persons) for (const c of q.commitments) commitments.set(c.id, c);
  for (const r of w.requests) {
    const hh = hhOf.get(r.from);
    if (hh === undefined) continue;
    const f = of(hh);
    const c = r.commitmentId ? commitments.get(r.commitmentId) : undefined;
    const work = r.kind === 'help_build' || r.kind === 'work';
    const got = Math.max(r.delivered ?? 0, work ? (c?.contrib ?? 0) : (c?.delivered ?? 0));
    reqGot.set(r.id, Math.max(reqGot.get(r.id) ?? 0, got));
    const prev = reqWas.get(r.id);
    if (prev === undefined) {
      f.requests.made++;
      say(hh, 'ask', `person ${r.from} asked person ${r.to} for ${r.amount || ''} ${r.item ?? r.kind}${r.purpose ? ` (${r.purpose})` : ''}`);
    }
    if (prev !== r.status) {
      reqWas.set(r.id, r.status);
      if (prev !== undefined && r.status !== 'pending') {
        const arrived = reqGot.get(r.id) ?? 0;
        f.requests.byStatus[r.status] = (f.requests.byStatus[r.status] ?? 0) + 1;
        if (!work) f.requests.unitsDelivered += arrived;
        say(hh, 'ask-result', `the ask of person ${r.to} for ${r.item ?? r.kind} ended ${r.status}${r.outcome ? ` (${r.outcome})` : ''}; ${arrived} ${work ? 'ticks of work' : `of ${r.amount}`} recorded as handed over`);
      }
    }
  }

  // ── who was lost, and to what ──
  while (deceasedSeen < w.deceased.length) {
    const d = w.deceased[deceasedSeen++];
    const hh = hhOf.get(d.id);
    if (hh === undefined) continue;
    const ep = open.get(d.id);
    if (ep) {
      ep.until = w.tick;
      ep.endedBy = `died (${d.cause})`;
      open.delete(d.id);
    }
    const need = ['hunger', 'thirst', 'exposure'].includes(d.cause);
    if (need) of(hh).needDeaths.push({ name: d.name, cause: d.cause, tick: d.tick });
    say(hh, 'death', `${d.name} (${d.id}) died aged ${d.age} of ${d.cause}${need ? ' (a need went unmet)' : ''}`);
  }
}

// ── the end: the live world is fingerprinted first, and only then is a copy asked what its cards say ──
const liveHash = hashWorld(w);
const rt = deserializeWorld(serializeWorld(w));
const identical = serializeWorld(rt) === serializeWorld(w);
const liveHashAfter = hashWorld(w);

const housedNow = (world: World, hhId: number): Building | null => {
  const h = world.households.find((x) => x.id === hhId);
  const b = h ? world.byId.get(h.homeId) : undefined;
  return b && b.ent === 'building' && isSolidHome(b.type) ? b : null;
};

type Stop = 'complete' | 'housed, nobody seen inside yet' | 'housed, but lost someone to need' | 'solid home under way: a site is waiting' | 'a site was abandoned and not restarted' | 'no solid home started';
interface Row {
  household: string;
  id: number;
  members: number;
  stop: Stop;
  because: string;
  hungerEpisodes: number;
  recovered: number;
  /** still hungry when the window closed: ongoing, not a failure */
  hungryAtTheEnd: number;
  lowestHunger: number;
  storeMeals: Facts['storeMeals'];
  asks: number;
  asksArrived: number;
  needDeaths: number;
  entries: number;
}
const rows: Row[] = [];
for (const h of w.households) {
  const f = of(h.id);
  const home = housedNow(w, h.id);
  const recovered = f.episodes.filter((e) => e.until !== null && !(e.endedBy ?? '').startsWith('died')).length;
  const hungryAtTheEnd = f.episodes.filter((e) => e.until === null).length;
  // trouble means somebody was lost to a need; a person still hungry when the window closes is simply mid-day
  const troubled = f.needDeaths.length > 0;
  const openSite = w.sites.find((s) => s.hhId === h.id && (s.type === 'hut' || s.type === 'house'));
  let stop: Stop;
  let because = '';
  if (home && f.entries > 0 && !troubled) {
    stop = 'complete';
    because = `${home.type} #${home.id}, built by ${home.builtBy?.join(', ') ?? 'unrecorded'}`;
  } else if (home && troubled) {
    stop = 'housed, but lost someone to need';
    because = `lost ${f.needDeaths.map((d) => `${d.name} (${d.cause})`).join(', ')}`;
  } else if (home) {
    stop = 'housed, nobody seen inside yet';
    because = `${home.type} #${home.id}, built by ${home.builtBy?.join(', ') ?? 'unrecorded'}`;
  } else if (openSite) {
    stop = 'solid home under way: a site is waiting';
    because = `${label(openSite)} still wants ${itemsText(remaining(openSite))}`;
  } else if (f.sites.lost > 0 && f.sites.finished === 0) {
    stop = 'a site was abandoned and not restarted';
    because = 'the stale-site rule cleared it';
  } else {
    stop = 'no solid home started';
    // what the household's own card says, read from the COPY
    const card = h.members.map((m) => describePerson(rt, m)).find((c) => c);
    because = card ? card.home : 'nobody left to ask';
  }
  rows.push({
    household: h.name,
    id: h.id,
    members: h.members.length,
    stop,
    because,
    hungerEpisodes: f.episodes.length,
    recovered,
    hungryAtTheEnd,
    lowestHunger: Math.round(f.episodes.reduce((m, e) => Math.min(m, e.lowest), 100)),
    storeMeals: f.storeMeals,
    asks: f.requests.made,
    asksArrived: f.requests.unitsDelivered,
    needDeaths: f.needDeaths.length,
    entries: f.entries,
  });
}
const count = (s: Stop) => rows.filter((r) => r.stop === s).length;
const tally = (pick: (r: Row) => number) => rows.reduce((n, r) => n + pick(r), 0);
const reasons: Record<string, number> = {};
for (const r of rows) if (r.stop === 'no solid home started') reasons[r.because.replace(/^.*?— /, '')] = (reasons[r.because.replace(/^.*?— /, '')] ?? 0) + 1;

/** the household whose whole loop is told: the most complete story, preferring one that fed someone at a store with a full pack */
function pick(): number {
  if (wantHh) return wantHh;
  const score = (r: Row): number => {
    const f = of(r.id);
    const packFullMeals = story.filter((l) => l.hh === r.id && l.what === 'store-meal' && /\(pack full\)|pack: .*(wood|stone)/.test(l.text)).length;
    return (r.stop === 'complete' ? 1000 : 0) + (r.entries > 0 ? 300 : 0) + r.recovered * 80 + Math.min(4, f.storeMeals.ok) * 40 + packFullMeals * 120 + r.asksArrived * 30 + (f.plans.shelter?.done ?? 0) * 60 - r.needDeaths * 500;
  };
  return rows.slice().sort((a, b) => score(b) - score(a))[0]?.id ?? 0;
}
const focusId = pick();
const focus = rows.find((r) => r.id === focusId);
const ff = facts.get(focusId);

const report = {
  what: 'the whole household loop (hunger, food, store, roof, cooperation, loss) in an ordinary autonomous run; nothing staged, nobody told what to do',
  source: { rulesVersion: w.settings.rulesVersion, currentRulesVersion: CURRENT_RULES_VERSION, dynamics: w.settings.dynamics, eatingAtAStore: !args.includes('--off') },
  run: { seed, profile, immigration: false, fromTick: 0, toTick: w.tick, days },
  reportingThresholds: { hungry: `hunger below ${HUNGRY}`, fedAgain: `hunger at or above ${RECOVERED}`, simulationCriticalHunger: CRITICAL.hunger, note: 'the first two are this script\'s words; the third is the simulation\'s' },
  world: { alive: w.persons.length, households: w.households.length, died: w.deceased.length },
  census: {
    households: rows.length,
    complete: count('complete'),
    housedNobodySeenInsideYet: count('housed, nobody seen inside yet'),
    housedButLostSomeoneToNeed: count('housed, but lost someone to need'),
    solidHomeUnderWaySiteWaiting: count('solid home under way: a site is waiting'),
    siteAbandonedNotRestarted: count('a site was abandoned and not restarted'),
    noSolidHomeStarted: count('no solid home started'),
    whyNoSolidHomeWasStarted: reasons,
    hungerEpisodes: tally((r) => r.hungerEpisodes),
    recoveredByEating: tally((r) => r.recovered),
    hungryAtTheEnd: tally((r) => r.hungryAtTheEnd),
    lostToNeed: tally((r) => r.needDeaths),
    storeMeals: {
      fed: tally((r) => r.storeMeals.ok),
      failed: tally((r) => r.storeMeals.failed),
      failedPackFull: tally((r) => r.storeMeals.packFull),
      failedStoreEmpty: tally((r) => r.storeMeals.empty),
      failedOther: tally((r) => r.storeMeals.gone + r.storeMeals.other),
      interrupted: tally((r) => r.storeMeals.interrupted),
    },
    asksMade: tally((r) => r.asks),
    unitsRecordedAsHandedOver: tally((r) => r.asksArrived),
    households_: rows,
  },
  followed: focus && ff
    ? {
        household: `${focus.household} (${focus.id})`,
        outcome: `${focus.stop}: ${focus.because}`,
        facts: {
          hungerEpisodes: ff.episodes.map((e) => ({ person: `${e.person} (${e.id})`, from: e.since, to: e.until, lowest: Math.round(e.lowest), endedBy: e.endedBy })),
          storeMeals: ff.storeMeals,
          storeFood: ff.storeFood,
          roof: ff.sites,
          plans: ff.plans,
          asks: ff.requests,
          insideEntries: ff.entries,
          lostToNeed: ff.needDeaths,
        },
        chain: story.filter((l) => l.hh === focusId).map((l) => `${String(l.tick).padStart(5)} [${l.what}] ${l.text}`),
      }
    : null,
  observerPurity: { liveHashAtTheEnd: liveHash, liveHashAfterTheCardsWereRead: liveHashAfter, unchanged: liveHash === liveHashAfter, savedAndReloadedIdentical: identical },
  limits:
    'One run of one seed. It shows where the loop completes and where it stops, and that every line is a record; it is not evidence that more households complete it under any rule. Comparisons between rules need the paired lab (scripts/lab.mjs) and many seeds.',
};

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n');
  console.log(`written ${jsonOut}`);
} else console.log(JSON.stringify(report, null, 2));
