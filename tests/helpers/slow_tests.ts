// Test files left out of `npm run test:quick` (vitest.quick.config.ts). They still run in `npm test`.
// SLOW_FILES names the files that took 30 seconds or more, summed over their tests, in a full run with every core busy on 27 November 2026.
// When a new test file is slow, add it here. Kept continuation pins and zz_review files are found by name and must not be listed.
import { readdirSync } from 'node:fs';
import { pinFiles } from './archived_pins';

const REVIEW = /^zz_review.*\.test\.ts$/;

/** Slow test files as paths from the repository root, sorted. */
export const SLOW_FILES: readonly string[] = [
  'tests/birth_help.test.ts',
  'tests/controller.test.ts',
  'tests/courting.test.ts',
  'tests/day_observers.test.ts',
  'tests/director.test.ts',
  'tests/event_cards.test.ts',
  'tests/finish_job.test.ts',
  'tests/golden.test.ts',
  'tests/growth_room.test.ts',
  'tests/household_preparation.test.ts',
  'tests/inhabit_manual_reliability.test.ts',
  'tests/inhabitant.test.ts',
  'tests/inhabitant_memory.test.ts',
  'tests/inspect_work_purity.test.ts',
  'tests/iron_chain_stall.test.ts',
  'tests/keyed_draws.test.ts',
  'tests/lab_defaults.test.ts',
  'tests/lab_exit_codes.test.ts',
  'tests/lab_from_save.test.ts',
  'tests/lab_no_ask.test.ts',
  'tests/lab_provenance.test.ts',
  'tests/lab_report.test.ts',
  'tests/lab_rows.test.ts',
  'tests/leave_heaviest.test.ts',
  'tests/leisure.test.ts',
  'tests/load_order.test.ts',
  'tests/naming.test.ts',
  'tests/observer_viewer_purity.test.ts',
  'tests/occasions.test.ts',
  'tests/ordinary.test.ts',
  'tests/parent_decides.test.ts',
  'tests/pathfail.test.ts',
  'tests/praise.test.ts',
  'tests/presentation.test.ts',
  'tests/purity.test.ts',
  'tests/regions.test.ts',
  'tests/reputation.test.ts',
  'tests/run_rules.test.ts',
  'tests/save.test.ts',
  'tests/save_storage.test.ts',
  'tests/save_told.test.ts',
  'tests/settlement_record.test.ts',
  'tests/suspended_scan.test.ts',
  'tests/table_eating.test.ts',
  'tests/trip_kept.test.ts',
  'tests/vigil.test.ts',
  'tests/welcome.test.ts',
  'tests/wolf_defence.test.ts',
  'tests/work_tastes.test.ts',
  'tests/world.test.ts',
];

/** Every test file `npm run test:quick` leaves out: the kept pins, the zz_review files and SLOW_FILES. Sorted, no duplicates. */
export function slowFiles(dir = 'tests'): string[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [...SLOW_FILES];
  }
  const reviews = names.filter(name => REVIEW.test(name)).map(name => `${dir}/${name}`);
  return [...new Set([...pinFiles(dir).kept, ...reviews, ...SLOW_FILES])].sort();
}
