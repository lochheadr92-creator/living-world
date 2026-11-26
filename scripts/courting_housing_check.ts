// Why does a settlement with courting switched OFF (rules 260, src/sim/meeting.ts) end 25 days later with more people and households
// without a home? A read-only observer: one run per process, from one save, with courting on or off, printing ONE line of JSON.
//
//   npx vite-node scripts/courting_housing_check.ts -- --save C:/dev/lw_saves/rules256/gen-4-day96.save.json --days 25 --courting on  [--out file.json]
//   npx vite-node scripts/courting_housing_check.ts -- --save C:/dev/lw_saves/rules256/gen-4-day96.save.json --days 25 --courting off [--out file.json]
//     [--rules-up 260]   (default 260, the version the lab run raised the saves to)
//
// It starts a run exactly as `scripts/lab_seed.ts --load <save> --rules-up 260 --arm <spec>` does, and the loop is runBranch's
// (scripts/lab/lab.ts runBranch) with a per-tick reading added after each stepWorld:
//   world       worldFromArgs (scripts/world_args.ts): deserialize the save, raise the rules version to 260 (raiseRulesVersion)
//   fork        serializeWorld, then deserializeWorld inside the branch (the lab forks a branch from a serialised copy)
//   arm         `--courting on` = lab arm `control` (nothing changes); `--courting off` = lab arm `rich-no-meeting-courting`
//               (parseIntervention: meeting.ts setMeeting(false, 'courting'), restored afterwards). Welcome and praise stay on.
//   run         stepWorld for `--days` days; the lab's defence counters are reset and switched on as runBranch does
// The reading only looks at the world after each tick; it writes nothing to it and draws nothing from its random state, so `finalHash`
// equals the lab's `finalHash` for the same arm (checked on a one-day run against `lab_seed.ts --arm`).
// The lab's own `outcomeOf` is also called at the end, and `lab.homeless` is compared with this script's own count of the same thing.
//
// Output keys (all counts are over the run, from the save's tick):
//   start / end   alive, homeless (lab definition: the person's household has no homeId that is a standing building), households,
//                 hhOccupied, hhNoHome (households whose homeId is not a standing building), hhNoHomeOccupied, hhNoSolidHome (no hut or house)
//   homelessEndBy who is homeless at the end: from the save's homeless, from the save's housed, arrived after the save, born after the save
//   hh            households at the save that are gone at the end (all members left or died), by whether they had a home; households formed
//   couples       n; sepHh (the two lived in separate households before); byBefore (H housed, L homeless, just before pairing) with n,
//                 housedAfter (both housed the tick it happened), housedEnd (both alive, still partners, both housed at the end);
//                 persons {LtoH,LtoL,HtoH,HtoL} (each member's status just before -> right after); list: one object per couple:
//                 d day of the run, sep, bf/af status before/after as [a,b], end at the end ('D' dead), tog still partners, w walks the two
//                 had made (Relation.courted), mv others moved with them, hh households before/after
//   rescued       people homeless at the save: n, dead, stillHomeless, housed, and housed by route:
//                 a_ownHousehold {builtInRun, existingBuilding}  b_partnerJoin {self, child}  c_other {cause: n}
//   becameHomeless people housed at the save and homeless at the end, by the cause of their last household change (or hhLostHome)
//   events        counts of lines in the feed during the run (the feed is read every tick): walked out together, ..., and the chronicle's
//   conversations court asks (yes/no/unanswered) and proposals asked, by kind
//   byDay         alive, homeless, hhNoHome and couples so far, at each day boundary
import { writeFileSync } from 'node:fs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DAY, isSolidHome } from '../src/sim/constants';
import { courtedCount } from '../src/sim/courting';
import { defProbe, defReset } from '../src/sim/defence';
import type { Person, World, WorldEvent } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { outcomeOf, parseIntervention } from './lab/lab';
import { argsOf, worldFromArgs } from './world_args';

const { opt } = argsOf(process.argv);
const savePath = opt('save', opt('load', ''));
const days = Number(opt('days', '25'));
const courting = opt('courting', '');
const rulesUp = opt('rules-up', '260');
const outPath = opt('out', '');
if (!savePath) throw new Error('--save <path to a .save.json> is required');
if (courting !== 'on' && courting !== 'off') throw new Error('--courting on|off is required');
if (!(days > 0)) throw new Error('--days must be a positive number');
const ARM = courting === 'on' ? 'control' : 'rich-no-meeting-courting';

// ───────────────────────── the world, forked as the lab forks it (lab_seed.ts --load --rules-up --arm) ─────────────────────────
const loaded = worldFromArgs((n, d) => (n === 'load' ? savePath : n === 'rules-up' ? rulesUp : opt(n, d)));
if (!Number.isInteger(loaded.startDay)) throw new Error(`${savePath} is saved part way through day ${loaded.startDay}; the lab forks on a whole day`);
const saved = serializeWorld(loaded.w);

type Hs = 'H' | 'L'; // housed / homeless, as the lab counts it
interface Move { id: number; tick: number; from: number; to: number; cause: string; toHoused: boolean }
interface Couple {
  tick: number; d: number; a: number; b: number; sep: boolean;
  bf: [Hs, Hs]; af: [Hs, Hs]; hh: [number, number, number, number]; w: [number, number]; mv: number;
  end?: [string, string]; tog?: boolean;
}

const standing = (w: World): Set<number> => new Set(w.buildings.map((b) => b.id));
/** the lab's own test (scripts/lab/lab.ts outcomeOf): a person is housed when their household's homeId is a standing building */
const housedHouseholds = (w: World, homeIds: Set<number>): Set<number> => {
  const s = new Set<number>();
  for (const h of w.households) if (h.homeId && homeIds.has(h.homeId)) s.add(h.id);
  return s;
};
const isHomeless = (p: Person, housed: Set<number>): boolean => !housed.has(p.hhId);

function snapshot(w: World): Record<string, number> {
  const homeIds = standing(w);
  const housed = housedHouseholds(w, homeIds);
  let alive = 0;
  let homeless = 0;
  const occupied = new Set<number>();
  for (const p of w.persons) {
    if (!p.alive) continue;
    alive++;
    occupied.add(p.hhId);
    if (isHomeless(p, housed)) homeless++;
  }
  let hhNoHome = 0;
  let hhNoHomeOccupied = 0;
  let hhNoSolidHome = 0;
  for (const h of w.households) {
    const noHome = !housed.has(h.id);
    if (noHome) hhNoHome++;
    if (noHome && occupied.has(h.id)) hhNoHomeOccupied++;
    const home = h.homeId && homeIds.has(h.homeId) ? w.byId.get(h.homeId) : undefined;
    if (!home || home.ent !== 'building' || !isSolidHome(home.type)) hhNoSolidHome++;
  }
  return { alive, homeless, households: w.households.length, hhOccupied: occupied.size, hhNoHome, hhNoHomeOccupied, hhNoSolidHome };
}

const bump = (o: Record<string, number>, k: string, n = 1): void => { o[k] = (o[k] ?? 0) + n; };

// ───────────────────────── one branch, as runBranch (scripts/lab/lab.ts) runs it, with a reading after each tick ─────────────────────────
const iv = parseIntervention(ARM);
const previousDefenceProbe = { ...defProbe };
const restore = iv.install?.();
const t0 = Date.now();
let result: Record<string, unknown>;
try {
  const w = deserializeWorld(saved);
  const from = w.tick;
  const end = from + Math.round(days * DAY);
  iv.apply?.(w);
  defReset();
  defProbe.on = true;

  // ── the state at the save ──
  const startSnap = snapshot(w);
  const homeIds0 = standing(w);
  let prevHoused = housedHouseholds(w, homeIds0);
  const hhOf = new Map<number, number>();
  const partnerOf = new Map<number, number>();
  const startAlive = new Set<number>();
  const homelessAtSave = new Set<number>();
  for (const p of w.persons) {
    hhOf.set(p.id, p.hhId);
    partnerOf.set(p.id, p.partnerId);
    if (p.alive) {
      startAlive.add(p.id);
      if (isHomeless(p, prevHoused)) homelessAtSave.add(p.id);
    }
  }
  const startHh = new Map(w.households.map((h) => [h.id, prevHoused.has(h.id)]));
  const startHomes: Record<string, number> = {};
  for (const b of w.buildings) if (b.type === 'lean_to' || b.type === 'hut' || b.type === 'house') bump(startHomes, b.type);

  // ── what is gathered ──
  const couples: Couple[] = [];
  const moves = new Map<number, Move[]>();
  const movesByCause: Record<string, number> = {};
  const events: Record<string, number> = {};
  const PATTERNS: [string, RegExp][] = [
    ['walkedOut', /walked out together/],
    ['walkedOutFirst', /walked out together for the first time/],
    ['walkCutShort', /set out to walk together and turned back/],
    ['askRefused', /to walk out; .* said not today/],
    ['becameCouple', /became a couple/],
    ['movedInTogether', / moved in together/],
    ['nowShareHome', / now share a home/],
    ['weddingFeast', /wedding/i],
    ['finishedHome', / finished an? (lean-to|hut|house)\b/],
    ['movedIntoEmptyHome', / moved into an empty (lean-to|hut|house)/],
    ['tookIn', / took in .*, who had no one/],
    ['arrivals', /arrives? at the settlement/],
    ['welcomed', /was the first to welcome/],
  ];
  let lastEventId = w.events.length ? w.events[w.events.length - 1].id : -1;
  const convs = new Map<number, { purpose: string; join?: string; yes?: boolean }>();
  let born = 0;
  let arrived = 0;
  let arrivedPaired = 0;
  const byDay: { alive: number[]; homeless: number[]; hhNoHome: number[]; couples: number[] } = { alive: [], homeless: [], hhNoHome: [], couples: [] };

  const text = (e: WorldEvent): string => e.text;
  const observe = (): void => {
    const homeIds = standing(w);
    const housed = housedHouseholds(w, homeIds);

    // the lines the feed gained this tick (ids rise with the order lines are written)
    const evs: WorldEvent[] = [];
    for (let i = w.events.length - 1; i >= 0 && w.events[i].id > lastEventId; i--) evs.push(w.events[i]);
    if (evs.length) {
      evs.reverse();
      lastEventId = evs[evs.length - 1].id;
      for (const e of evs) for (const [k, re] of PATTERNS) if (re.test(text(e))) bump(events, k);
    }
    const partnerIds = new Set<number>();
    const roomIds = new Set<number>();
    for (const e of evs) {
      if (e.text.includes(' moved in together')) for (const i of e.ids) partnerIds.add(i);
      else if (e.text.includes(' now share a home')) for (const i of e.ids) roomIds.add(i);
    }

    // conversations about a walk or a proposal that began during the run
    for (const c of w.conversations) {
      if ((c.purpose !== 'court' && c.purpose !== 'propose') || c.start < from) continue;
      let r = convs.get(c.id);
      if (!r) convs.set(c.id, (r = { purpose: c.purpose, join: c.data.joinKind }));
      if (c.data.courtYes !== undefined) r.yes = !!c.data.courtYes;
    }

    // pass 1: who moved household, who became partnered, who is new (the maps still hold the previous tick)
    const movedNow: Person[] = [];
    const flipped: Person[] = [];
    for (const p of w.persons) {
      const was = hhOf.get(p.id);
      if (was === undefined) {
        hhOf.set(p.id, p.hhId);
        partnerOf.set(p.id, p.partnerId);
        if (p.birthTick >= from) born++;
        else {
          arrived++;
          if (p.partnerId !== 0) arrivedPaired++;
        }
        continue;
      }
      if (!p.alive) continue;
      if (p.hhId !== was) movedNow.push(p);
      if ((partnerOf.get(p.id) ?? 0) === 0 && p.partnerId !== 0) flipped.push(p);
    }

    // pass 2: household moves, with their cause
    for (const m of movedNow) {
      const from0 = hhOf.get(m.id)!;
      const near = evs.filter((e) => e.ids.includes(m.id)).map(text).join(' | ');
      const cause = partnerIds.has(m.id) ? 'partner'
        : roomIds.has(m.id) ? 'roommate'
        : m.parents.some((x) => partnerIds.has(x)) ? 'childOfPartnerMover'
        : m.parents.some((x) => roomIds.has(x)) ? 'childOfRoommateMover'
        : /took in .*who had no one/.test(near) ? 'takenIn'
        : /formed from|established its home/.test(near) ? 'relocation'
        : 'other';
      const mv: Move = { id: m.id, tick: w.tick, from: from0, to: m.hhId, cause, toHoused: housed.has(m.hhId) };
      let list = moves.get(m.id);
      if (!list) moves.set(m.id, (list = []));
      list.push(mv);
      bump(movesByCause, cause);
    }

    // pass 2b: couples formed this tick
    const seen = new Set<string>();
    for (const p of flipped) {
      const q = w.byId.get(p.partnerId);
      if (!q || q.ent !== 'person') continue;
      const [a, b] = p.id < q.id ? [p, q] : [q, p];
      const key = `${a.id}-${b.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ha = hhOf.get(a.id);
      const hb = hhOf.get(b.id);
      if (ha === undefined || hb === undefined) continue;
      const st = (id: number): Hs => (prevHoused.has(id) ? 'H' : 'L');
      couples.push({
        tick: w.tick,
        d: Math.round(((w.tick - from) / DAY) * 100) / 100,
        a: a.id,
        b: b.id,
        sep: ha !== hb,
        bf: [st(ha), st(hb)],
        af: [housed.has(a.hhId) ? 'H' : 'L', housed.has(b.hhId) ? 'H' : 'L'],
        hh: [ha, hb, a.hhId, b.hhId],
        w: [courtedCount(a, b.id), courtedCount(b, a.id)],
        mv: movedNow.filter((m) => m.id !== a.id && m.id !== b.id && (m.parents.includes(a.id) || m.parents.includes(b.id))).length,
      });
    }

    // pass 3: remember this tick for the next
    for (const p of w.persons) {
      if (!p.alive) continue;
      hhOf.set(p.id, p.hhId);
      partnerOf.set(p.id, p.partnerId);
    }
    prevHoused = housed;
  };

  // the run: runBranch's loop, with the reading after each tick
  let nextDay = 1;
  while (w.tick < end) {
    stepWorld(w);
    observe();
    if ((w.tick - from) % DAY === 0) {
      let alive = 0;
      let homeless = 0;
      for (const p of w.persons) if (p.alive) { alive++; if (isHomeless(p, prevHoused)) homeless++; }
      byDay.alive.push(alive);
      byDay.homeless.push(homeless);
      byDay.hhNoHome.push(w.households.filter((h) => !prevHoused.has(h.id)).length);
      byDay.couples.push(couples.length);
      process.stderr.write(`day ${nextDay++}: alive ${alive}, homeless ${homeless}, couples ${couples.length} (${Math.round((Date.now() - t0) / 1000)} s)\n`);
    }
  }

  // ── the state at the end ──
  const endSnap = snapshot(w);
  const homeIds1 = standing(w);
  const housed1 = housedHouseholds(w, homeIds1);
  const person = (id: number): Person | undefined => { const e = w.byId.get(id); return e && e.ent === 'person' ? e : undefined; };
  const statusEnd = (id: number): string => { const p = person(id); return !p || !p.alive ? 'D' : isHomeless(p, housed1) ? 'L' : 'H'; };

  // who is homeless at the end
  const homelessEndBy: Record<string, number> = {};
  for (const p of w.persons) {
    if (!p.alive || !isHomeless(p, housed1)) continue;
    bump(homelessEndBy, startAlive.has(p.id) ? (homelessAtSave.has(p.id) ? 'fromSaveHomeless' : 'fromSaveHoused') : p.birthTick >= from ? 'bornAfterSave' : 'arrivedAfterSave');
  }

  // households
  const hhIdsEnd = new Set(w.households.map((h) => h.id));
  const hhGone = { housedAtSave: 0, homelessAtSave: 0 };
  for (const [id, wasHoused] of startHh) if (!hhIdsEnd.has(id)) hhGone[wasHoused ? 'housedAtSave' : 'homelessAtSave']++;
  const occupiedEnd = new Set<number>();
  for (const p of w.persons) if (p.alive) occupiedEnd.add(p.hhId);
  const hhEnd = { formedAfterSave: 0, formedAfterSaveNoHome: 0, fromSaveNoHome: 0 };
  for (const h of w.households) {
    if (!occupiedEnd.has(h.id)) continue;
    if (h.formed >= from) { hhEnd.formedAfterSave++; if (!housed1.has(h.id)) hhEnd.formedAfterSaveNoHome++; } else if (!housed1.has(h.id)) hhEnd.fromSaveNoHome++;
  }
  const homesEnd: Record<string, number> = {};
  for (const b of w.buildings) if (b.type === 'lean_to' || b.type === 'hut' || b.type === 'house') bump(homesEnd, b.type);

  // couples, at the end
  const byBefore: Record<string, { n: number; housedAfter: number; housedEnd: number }> = {};
  const persons = { LtoH: 0, LtoL: 0, HtoH: 0, HtoL: 0 };
  let sepHh = 0;
  for (const c of couples) {
    const ea = statusEnd(c.a);
    const eb = statusEnd(c.b);
    c.end = [ea, eb];
    const pa = person(c.a);
    const pb = person(c.b);
    c.tog = !!pa && !!pb && pa.partnerId === pb.id && pb.partnerId === pa.id;
    if (c.sep) sepHh++;
    const k = [...c.bf].sort().join('');
    const r = (byBefore[k] ??= { n: 0, housedAfter: 0, housedEnd: 0 });
    r.n++;
    if (c.af[0] === 'H' && c.af[1] === 'H') r.housedAfter++;
    if (c.tog && ea === 'H' && eb === 'H') r.housedEnd++;
    for (const i of [0, 1]) persons[`${c.bf[i]}to${c.af[i]}` as keyof typeof persons]++;
  }

  // people homeless at the save: where they are now, and by which route
  const rescued = { n: homelessAtSave.size, dead: 0, stillHomeless: 0, housed: 0, a_ownHousehold: { builtInRun: 0, existingBuilding: 0 }, b_partnerJoin: { self: 0, child: 0 }, c_other: {} as Record<string, number> };
  for (const id of homelessAtSave) {
    const p = person(id);
    if (!p || !p.alive) { rescued.dead++; continue; }
    if (isHomeless(p, housed1)) { rescued.stillHomeless++; continue; }
    rescued.housed++;
    const list = moves.get(id) ?? [];
    const last = list[list.length - 1];
    if (!last) {
      const hh = w.households.find((h) => h.id === p.hhId);
      const home = hh ? w.byId.get(hh.homeId) : undefined;
      if (home && home.ent === 'building' && home.builtTick >= from) rescued.a_ownHousehold.builtInRun++;
      else rescued.a_ownHousehold.existingBuilding++;
    } else if (last.to !== p.hhId) bump(rescued.c_other, 'movedAgain');
    else if (last.cause === 'partner' && last.toHoused) rescued.b_partnerJoin.self++;
    else if (last.cause === 'childOfPartnerMover' && last.toHoused) rescued.b_partnerJoin.child++;
    else bump(rescued.c_other, last.toHoused ? last.cause : `${last.cause}_intoUnhousedHh_housedLater`);
  }

  // people housed at the save and without a home at the end
  const becameHomeless: Record<string, number> = {};
  for (const id of startAlive) {
    if (homelessAtSave.has(id)) continue;
    const p = person(id);
    if (!p || !p.alive || !isHomeless(p, housed1)) continue;
    const list = moves.get(id) ?? [];
    const last = list[list.length - 1];
    bump(becameHomeless, !last || last.to !== p.hhId ? 'hhLostHome' : `${last.cause}${last.toHoused ? '_intoHousedHh_thenLost' : '_intoUnhousedHh'}`);
  }

  // the lab's own reading, to be sure this script counts what the lab counts
  const lab = outcomeOf(w, from, end).outcome;

  // what the chronicle (kept for good) says of the walks
  const chronicleFirstWalks = (w.chronicle ?? []).filter((e) => e.tick >= from && e.text.includes('walked out together for the first time')).length;
  const courtAsks = [...convs.values()].filter((c) => c.purpose === 'court');
  const proposals = [...convs.values()].filter((c) => c.purpose === 'propose');

  result = {
    tool: 'courting_housing_check',
    save: savePath,
    rulesUp,
    rulesVersion: w.settings.rulesVersion ?? null,
    courting,
    arm: ARM,
    days,
    startTick: from,
    endTick: w.tick,
    finalHash: hashWorld(w),
    elapsedS: Math.round((Date.now() - t0) / 1000),
    start: startSnap,
    end: endSnap,
    lab: { homeless: lab.homeless, people: lab.people, solidHomes: lab.solidHomes, matchesOwnCount: lab.homeless === endSnap.homeless && lab.people === endSnap.alive },
    homesStart: startHomes,
    homesEnd,
    homelessEndBy,
    hh: { goneSinceSave: hhGone, ...hhEnd },
    newPeople: { born, arrived, arrivedAlreadyPartnered: arrivedPaired },
    couples: { n: couples.length, sepHh, byBefore, persons, list: couples.map(({ a, b, d, sep, bf, af, end: e, tog, w: wk, mv, hh }) => ({ a, b, d, sep, bf, af, end: e, tog, w: wk, mv, hh })) },
    rescued,
    becameHomeless,
    moves: movesByCause,
    events: { ...events, chronicleFirstWalks },
    conversations: {
      courtAsks: courtAsks.length,
      courtYes: courtAsks.filter((c) => c.yes === true).length,
      courtNo: courtAsks.filter((c) => c.yes === false).length,
      courtUnanswered: courtAsks.filter((c) => c.yes === undefined).length,
      proposalsPartner: proposals.filter((c) => c.join === 'partner').length,
      proposalsRoommate: proposals.filter((c) => c.join !== 'partner').length,
    },
    byDay,
  };
} finally {
  Object.assign(defProbe, previousDefenceProbe);
  restore?.();
}

const line = JSON.stringify(result);
console.log(line);
if (outPath) writeFileSync(outPath, line + '\n');
