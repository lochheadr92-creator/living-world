// Stage 4, first diagnostic slice: does what people know actually cross a camp boundary, and what chances does it get?
//
// This runs one ordinary world and watches it. It changes nothing: the diagnostics (src/sim/transmission.ts) only record, and
// every cohort, rate and overlap below is computed here, in the runner, from the ids and ticks they recorded. The conventions are
// the ones written down in docs/EMERGENCE.md, "Stage 4", before any run; where a denominator is zero the answer is "not
// estimable", never 0, and a checkpoint the run did not reach is reported as missing, never as a zero.
//
//   npx vite-node scripts/stage4.ts -- --out stage4_out --seed meadow --profile large --days 1
//
// What it writes into <out>: `run.json` (every number, plus the provenance of the run) and `report.txt` (the same, readable).
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { settlementCount } from '../src/sim/settlements';
import { resetTransmissionProbe, setTransmissionProbe, teardownTransmissionProbe, transmissionData } from '../src/sim/transmission';
import { UNKNOWN, contactsReport, extendCohorts, freezeCohorts, knowledgeReport, offersReport } from './stage4/metrics';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (n: string, d: string): string => {
  const i = args.indexOf('--' + n);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : d;
};
const out = opt('out', 'stage4_out');
const seed = opt('seed', 'meadow');
const profile = opt('profile', 'large') as ProfileName;
const days = Number(opt('days', '1'));
/** the plan's checkpoints; any the run does not reach are reported as missing */
const CHECKPOINTS = [0, 4, 8, 12];

// ───────────────────────── the run ─────────────────────────
const head = (() => {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
})();
/**
 * What the source actually was, by content. A list of changed filenames is not provenance: two runs with the same file list and
 * different code would claim the same fingerprint. This hashes the CONTENT of every tracked modification (`git diff HEAD`) and
 * of every untracked file under `src/` and `scripts/`, so a run can be matched to the code that produced it.
 */
const fnv = (text: string, seed = 2166136261): number => {
  let h = seed;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
const dirty = (() => {
  try {
    const diff = execSync('git diff HEAD', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const untracked = execSync('git ls-files --others --exclude-standard -- src scripts', { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
      .sort();
    let h = fnv(diff);
    const parts: { path: string; sha: string }[] = [];
    for (const f of untracked) {
      const body = readFileSync(f, 'utf8');
      const fh = fnv(body).toString(16);
      parts.push({ path: f, sha: fh });
      h = fnv(`${f}:${fh}`, h);
    }
    const changed = execSync('git diff --name-only HEAD', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
    return {
      method: 'fnv1a over `git diff HEAD` content plus every untracked file under src/ and scripts/',
      contentFingerprint: h.toString(16),
      trackedModified: changed.length,
      trackedModifiedFiles: changed,
      untrackedSource: parts,
      diffBytes: diff.length,
      error: undefined as string | undefined,
    };
  } catch (e) {
    return { method: 'unavailable', contentFingerprint: 'unknown', trackedModified: undefined, trackedModifiedFiles: undefined, untrackedSource: undefined, diffBytes: undefined, error: String(e) };
  }
})();

const settings = currentWorldSettings(profile, seed, { immigration: false });
setTransmissionProbe(true);
resetTransmissionProbe();
const world: World = createWorld(settings);
const cohort = freezeCohorts(world);
const camps = settlementCount(world);
const checkpoints: Record<string, unknown> = {};
const reached: number[] = [];
const t0 = Date.now();
for (const day of CHECKPOINTS) {
  if (day > days) break;
  while (world.tick < day * DAY) stepWorld(world);
  extendCohorts(world, cohort);
  checkpoints[`day${day}`] = knowledgeReport(world, cohort, camps);
  reached.push(day);
}
while (world.tick < days * DAY) stepWorld(world);
extendCohorts(world, cohort);
const seconds = (Date.now() - t0) / 1000;

const { offers, contacts, openOffers } = transmissionData();
const windows: [number, number][] = [[0, 4], [4, 8], [8, 12], [0, 8], [0, 12]];
const cohortCounts: Record<string, number> = {};
for (const c of cohort.values()) cohortCounts[c === UNKNOWN ? 'unknown' : `camp${c}`] = (cohortCounts[c === UNKNOWN ? 'unknown' : `camp${c}`] ?? 0) + 1;

const result = {
  provenance: {
    command: `npx vite-node scripts/stage4.ts -- ${args.join(' ')}`,
    head,
    dirty,
    seed,
    profile,
    days,
    settings,
    checkpointsRequested: CHECKPOINTS,
    checkpointsReached: reached,
    checkpointsMissing: CHECKPOINTS.filter((d) => !reached.includes(d)),
    finalTick: world.tick,
    finalHash: hashWorld(world),
    wallSeconds: Math.round(seconds * 10) / 10,
    note: 'Descriptive only. One seed, one run, no ensemble and no claim of effect. Zero cross-camp contacts or transfers is a valid observation and means the mechanism was unexercised in this window, not that transmission is impossible.',
  },
  cohort: { camps, counts: cohortCounts, frozenAtTick: 0, unknownRule: 'no home at the day-0 snapshot, or a later entrant with no cohort parent' },
  contacts: contactsReport(contacts, cohort, windows),
  offers: offersReport(offers, cohort),
  checkpoints,
  diagnostics: { offersRecorded: offers.length, contactsRecorded: contacts.length, unclosedOffers: openOffers },
};
teardownTransmissionProbe();

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'run.json'), JSON.stringify(result, null, 1));
// The records themselves, so that a later reading can recount anything here without re-running the world: every offer with its
// sender, recipient, tick, belief, what the API said, what was actually written and the provenance left behind; every contact
// with its channel, pair and tick; and the frozen cohort each id was assigned.
writeFileSync(join(out, 'offers.jsonl'), offers.map((o) => JSON.stringify(o)).join('\n') + (offers.length ? '\n' : ''));
writeFileSync(join(out, 'contacts.jsonl'), contacts.map((c) => JSON.stringify(c)).join('\n') + (contacts.length ? '\n' : ''));
writeFileSync(
  join(out, 'cohort.json'),
  JSON.stringify({ rule: 'frozen at day 0 from the household home; a birth takes its mother\'s; a later entrant is assigned from its household home, or unknown', unknown: UNKNOWN, byPerson: Object.fromEntries([...cohort].map(([id, c]) => [id, c])) }, null, 1),
);

/** every cross-camp number is only as good as the share of events in which both camps were known: say so, every time */
const cover = (c: number | null): string => (c === null ? ' [no events]' : ` [known-cohort coverage ${Math.round(c * 100)}%]`);
const L: string[] = [];
L.push(`Stage 4 diagnostic slice - ${profile}/${seed}, ${days} day(s), rich, immigration off`);
L.push(`HEAD ${head}, source content fingerprint ${dirty.contentFingerprint} (${dirty.trackedModified ?? '?'} tracked files modified, ${dirty.untrackedSource?.length ?? '?'} untracked source files)`);
L.push(`command: ${result.provenance.command}`);
L.push(`final tick ${world.tick}, state ${result.provenance.finalHash}, ${result.provenance.wallSeconds}s`);
L.push('');
L.push(`cohort (frozen at day 0): ${Object.entries(cohortCounts).map(([k, v]) => `${k} ${v}`).join(', ')} over ${camps} camp(s)`);
L.push('');
const cr = result.contacts;
L.push(`contacts: ${cr.all.total} pair-events (${cr.uniquePairs} unique pairs, ${cr.uniqueCrossPairs} of them cross-camp)`);
L.push(`  within-camp ${cr.all.within}, cross-camp ${cr.all.cross}, pairs with an unknown cohort ${cr.all.unknown}`);
L.push(`  cross fraction of known pair-events: ${cr.crossFractionOfKnown === null ? 'not estimable (no known pairs)' : cr.crossFractionOfKnown}${cover(cr.knownCohortCoverage)}`);
for (const [ch, s] of Object.entries(cr.byChannel)) L.push(`  ${ch.padEnd(13)} ${s.total} (within ${s.within}, cross ${s.cross}, unknown ${s.unknown})`);
L.push('');
const or = result.offers;
L.push(`belief offers: ${or.attempts} (API said yes ${or.apiAccepted}, genuinely new or fresher ${or.genuine}, writes past a refusal ${or.bypassWrites}, provenance-only ${or.provenanceOnly})`);
L.push(`  outcomes: ${Object.entries(or.outcomes).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
L.push(`  accepted rate: ${or.acceptedRate === null ? 'not estimable (no offers)' : or.acceptedRate}`);
for (const [ch, c] of Object.entries(or.byChannel)) L.push(`  ${ch.padEnd(9)} attempts ${c.attempts}, api ${c.api}, genuine ${c.genuine}, bypass ${c.bypass}, ${Object.entries(c.outcomes).map(([k, v]) => `${k} ${v}`).join('/')}`);
L.push(`  cross-camp attempts ${or.crossAttempts.cross} of ${or.crossAttempts.total} (unknown cohort ${or.crossAttempts.unknown})${cover(or.knownCohortCoverage)}`);
L.push(`  cross accepted / cross attempts: ${or.crossAcceptedOfCrossAttempts === null ? 'not estimable' : or.crossAcceptedOfCrossAttempts}${cover(or.knownCohortCoverage)}`);
L.push(`  cross accepted / all accepted with both cohorts known: ${or.crossAcceptedOfKnownAccepted === null ? 'not estimable' : or.crossAcceptedOfKnownAccepted} (over ${or.knownAccepted} accepted offers with both camps known)`);
L.push('');
for (const day of CHECKPOINTS) {
  const k = checkpoints[`day${day}`] as ReturnType<typeof knowledgeReport> | undefined;
  if (!k) {
    L.push(`day ${day}: MISSING (the run stopped at day ${days})`);
    continue;
  }
  L.push(`day ${day}: camps ${k.camps.map((c) => `${c.camp}:${c.livingKnownMembers}p/${c.retained === null ? 'none' : c.retained}b`).join(' ')} [${k.coverage.livingKnown} of ${k.coverage.living} living people have a known camp${k.coverage.share === null ? '' : `, ${Math.round(k.coverage.share * 100)}%`}]`);
  L.push(`  mean Jaccard over ${k.validPairs}/${k.totalPairs} valid pairs: ${k.meanJaccardOverValidPairs === null ? 'not estimable' : k.meanJaccardOverValidPairs}`);
  L.push(`  retained told beliefs ${k.retainedTold}; foreign-origin ${k.foreignOriginCount} of ${k.bothCohortsKnown} with both cohorts known (${k.foreignOriginOfKnown === null ? 'not estimable' : k.foreignOriginOfKnown}), unknown ${k.unknownOriginOrCohort}`);
  L.push(`  hops over ${k.hops.entries} entries: mean ${k.hops.mean ?? 'not estimable'}, max ${k.hops.max ?? 'not estimable'}, missing ${k.hops.missing}`);
}
L.push('');
L.push('Reading: no cross-camp contact means the mechanism was unexercised in this window, not that it cannot happen.');
L.push('Every cross-camp figure above is qualified by its known-cohort coverage: people with no household home at day 0 are');
L.push('excluded from camp-specific denominators, and a low coverage means most of the data could not be classified at all.');
writeFileSync(join(out, 'report.txt'), L.join('\n') + '\n');
console.log(L.join('\n'));
