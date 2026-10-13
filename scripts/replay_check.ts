// Does a recorded run really replay to the same world? The strict replay in scripts/inhabit.ts compares hashWorld, which is a
// summary: it carries the tick, the random state, every person's position, needs, inventory and current activity, the sources,
// buildings, sites, plots, piles, animals, tools, carts, meals, the ledger, and the inhabitant's own state — but only the COUNT of
// a person's beliefs and commitments, and only the SUM of their relationships. So a matching hash is strong evidence, not proof.
//
// This runs the same window twice (live with a scripted model, then replayed with no model at all) and compares the complete saved
// state as well. Saves are compared as RECONSTRUCTED worlds, not as strings: optional fields that are absent in one encoding and
// undefined in the other make the text differ where the world does not.
//
//   npx vite-node scripts/replay_check.ts -- --seed meadow --person Pavel --from-day 1 --days 0.5
//   npx vite-node scripts/replay_check.ts -- --seed meadow --days 0.5 --memory
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { runLive, runReplay } from '../src/agent/run';
import { goalKeeperModel } from '../src/agent/stubs';
import { notesHash } from '../src/agent/memory';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import type { World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { sourcesFingerprint } from './inhabit/sources';
import { deepEqualState, firstDiffs } from './statediff';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (n: string, d: string): string => {
  const i = args.indexOf('--' + n);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : d;
};
const flag = (n: string): boolean => args.includes('--' + n);

/** a world as it comes back from its own save, so two worlds are compared on the same footing */
const roundTrip = (w: World): unknown => JSON.parse(JSON.stringify(deserializeWorld(serializeWorld(w))));

async function main(): Promise<void> {
  const profile = opt('profile', 'normal') as ProfileName;
  const settings = settingsForProfile(profile, opt('seed', 'meadow'), { harsh: flag('harsh'), immigration: !flag('no-arrivals'), dynamics: opt('dynamics', 'authored') as 'authored' | 'rich' });
  const from = Math.round(Number(opt('from-day', '1')) * DAY);
  const until = from + Math.round(Number(opt('days', '0.5')) * DAY);

  const w = createWorld(settings);
  while (w.tick < from) stepWorld(w);
  const name = opt('person', '');
  const person = name ? w.persons.find((p) => p.alive && p.name === name) : w.persons.find((p) => p.alive && (w.tick - p.birthTick) / DAY / 12 >= 20);
  if (!person) throw new Error(name ? `nobody alive is called ${name}` : 'no adult to inhabit');

  const sources = sourcesFingerprint();
  const startSave = serializeWorld(w);
  const live = await runLive(w, person.id, goalKeeperModel(), { until, sources, memory: flag('memory') });

  // strict: no source-drift allowance, and the recorded sources must match the ones running now
  const replayed = runReplay(deserializeWorld(startSave), live.transcript, { sources });

  const lines: string[] = [];
  const ok: boolean[] = [];
  const check = (label: string, good: boolean, note: string): void => {
    ok.push(good);
    lines.push(`${good ? 'PASS' : 'FAIL'}  ${label}${note ? `  — ${note}` : ''}`);
  };

  check('strict replay accepted the transcript', replayed.warnings.length === 0, replayed.warnings.join('; ') || `sources ${sources}`);
  check('the summary fingerprint matches', hashWorld(replayed.world) === live.transcript.end!.hash, `${hashWorld(replayed.world)} vs recorded ${live.transcript.end!.hash}`);
  if (flag('memory')) {
    const a = notesHash(replayed.world.inhabitants?.[person.id]?.notes);
    check('the notes match', a === live.transcript.end!.notesHash, `${a} vs ${live.transcript.end!.notesHash}`);
  }

  // The part a fingerprint does not prove: every saved field of every entity. The decision is exhaustive (statediff.ts); the
  // printed list below is only a sample of it.
  const liveState = roundTrip(live.world);
  const replayedState = roundTrip(replayed.world);
  const same = deepEqualState(liveState, replayedState);
  const diffs = same ? [] : firstDiffs(liveState, replayedState, 12);
  check('the complete saved state matches, field by field', same, same ? 'reconstructed worlds are deeply equal (exhaustive)' : `differs; first ${diffs.length} shown`);
  for (const d of diffs) lines.push(`        ${d}`);

  // This is a SAVED-STATE property only: the inhabitant's own recorded state came back identically. Runtime control cleanup
  // (a pending request, the driver, the tick hooks, a late completion) belongs to the app and is checked in its own tests.
  const a = live.world.inhabitants?.[person.id];
  const b = replayed.world.inhabitants?.[person.id];
  check("the inhabitant's own saved state replayed identically", deepEqualState(a as never, b as never), b ? `turns ${b.turns}, engine ${b.fallbacks}` : 'none recorded');

  const decisions = live.transcript.calls.filter((c) => c.result?.status === 'applied').length;
  console.log(`\n${person.name} (#${person.id}) in ${settings.seed}, tick ${from}..${until}, ${decisions} decisions applied, sources ${sources}`);
  console.log(lines.join('\n'));
  const bad = ok.filter((x) => !x).length;
  console.log(`\n${ok.length - bad}/${ok.length} checks passed`);
  process.exitCode = bad ? 1 : 0;
}

await main();
