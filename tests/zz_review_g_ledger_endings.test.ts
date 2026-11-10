import { reviewReportPath } from './helpers/review_report';
// REVIEW G (observer truth audit): does every decision ledger entry close with the real ending, and does the
// "Why did they choose it?" line describe THIS activity?
import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { decisionHistory } from '../src/sim/history';
import { describePerson } from '../src/sim/inspect';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';

const OUT = reviewReportPath('ledger_endings.txt');
const river = () => createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
const report: string[] = [];

it('natural run: ledger entries whose activity was dropped without endActivity stay open ("ending not recorded"); real endings always close', () => {
  const w = river();
  const ended = new Map<number, string>();
  const started = new Set<number>();
  w.hooks = {
    onActivityStart: (_p, a) => {
      started.add(a.id);
    },
    onActivityEnd: (_p, a, o) => {
      ended.set(a.id, o);
    },
  };
  // also watch suspended activities that vanish without an ending
  let droppedSuspended = 0;
  const seen = new Map<number, number>(); // personId -> suspended activity id
  for (let n = 0; n < 1500; n++) {
    stepWorld(w);
    for (const p of w.persons) {
      const prev = seen.get(p.id);
      if (prev !== undefined && p.suspended?.id !== prev && p.activity?.id !== prev && !ended.has(prev)) droppedSuspended++;
      if (p.suspended) seen.set(p.id, p.suspended.id);
      else seen.delete(p.id);
    }
  }
  delete w.hooks;
  let entries = 0;
  let closed = 0;
  let openCurrent = 0;
  let orphanSilent = 0;
  let orphanEndedNotClosed = 0;
  let orphanNoStart = 0;
  const examples: string[] = [];
  for (const p of w.persons) {
    if (!p.alive) continue;
    for (const e of p.decisions ?? []) {
      if (!e.activityId) continue;
      entries++;
      if (e.outcome) {
        closed++;
        expect(ended.get(e.activityId), `ledger outcome for activity ${e.activityId}`).toBe(e.outcome);
        continue;
      }
      if (p.activity?.id === e.activityId || p.suspended?.id === e.activityId) {
        openCurrent++;
        continue;
      }
      if (ended.has(e.activityId)) {
        orphanEndedNotClosed++;
        continue;
      }
      if (!started.has(e.activityId)) {
        orphanNoStart++;
        continue;
      }
      orphanSilent++;
      if (examples.length < 6) {
        const row = decisionHistory(w, p).find((r) => r.startsWith(`Tick ${e.tick} `));
        const lr = p.lastResult ? `${p.lastResult.label} -> ${p.lastResult.outcome} @${p.lastResult.tick}` : 'none';
        examples.push(`${p.name} (#${p.id}) tick ${e.tick} chose "${e.chosen}" kind=${e.kind} act#${e.activityId}; lastResult now: ${lr}; row: ${row}`);
      }
    }
  }
  report.push(`natural river 1500 ticks: ledger entries with an activity ${entries}; closed ${closed}; still running/suspended ${openCurrent}; ORPHANS: silently dropped (started, never ended by endActivity) ${orphanSilent}; ended but not closed ${orphanEndedNotClosed}; recorded but never started ${orphanNoStart}; suspended activities seen to vanish without an ending ${droppedSuspended}`);
  report.push(...examples.map((e) => '  example: ' + e));
  report.push(`feed: ${w.events.length} events kept; oldest is ${w.tick - w.events[0].tick} ticks old at tick ${w.tick}; chronicle ${w.chronicle?.length ?? 0}`);
  writeFileSync(OUT, report.join('\n'));
  expect(orphanEndedNotClosed, 'an activity that really ended must close its ledger entry').toBe(0);
  expect(orphanNoStart, 'ledger entries must name activities that were started').toBe(0);
  // the finding: silently dropped suspended activities leave their decision open for ever (count in the report)
  expect(orphanSilent).toBeGreaterThanOrEqual(0);
});

// Expired suspended activities are covered by suspended_endings.test.ts, including exact saved continuation.

// Finding REPAIRED on 11 November 2026 (docs/OBSERVER_VIEWER.md): buildQA quotes the last decision's reason only for the activity
// that decision launched (the ledger's activityId) or one carrying its own why. The same scan now counts misattributions, expects
// none, and records that such listeners read "Not a weighed choice" instead. Kept as a review test so a regression shows up by name.
it('the listener in a conversation is no longer shown "Weighed up: <reasons of an unrelated earlier decision>" as why they chose it', () => {
  const w = river();
  let found = 0;
  let listeners = 0;
  let honest = 0;
  const ex: string[] = [];
  for (let n = 0; n < 2400 && found < 5; n++) {
    stepWorld(w);
    for (const p of w.persons) {
      const a = p.activity;
      if (!a || a.kind !== 'converse' || a.data.role !== 'b' || a.data.why || !p.lastDecision?.because) continue;
      const v = describePerson(w, p.id, { opportunities: false })!;
      listeners++;
      if (v.qa.why.startsWith('Not a weighed choice')) honest++;
      if (v.qa.why === `Weighed up: ${p.lastDecision.because}`) {
        found++;
        ex.push(`tick ${w.tick} ${p.name}: doing="${v.qa.doing}" why="${v.qa.why}" (last decision chose "${p.lastDecision.chosen?.label ?? '—'}" at tick ${p.lastDecision.tick})`);
      }
      if (found >= 5) break;
    }
  }
  report.push(`converse listener why-misattribution: ${found} cases in <=2400 ticks (${listeners} listener reads, ${honest} read "Not a weighed choice")`, ...ex.map((e) => '  ' + e));
  writeFileSync(OUT, report.join('\n'));
  expect(listeners).toBeGreaterThan(0);
  expect(found).toBe(0);
  expect(honest).toBe(listeners);
});
