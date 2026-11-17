// SCRATCH ONLY (pace experiment, 17 November 2026). This file must not exist outside the scratch worktree under
// C:\dev\_claude_scratch\regime-20261117\. It is not part of any rules version and is never committed.
//
// What it is for: the question of whether the simulated day is too short for the world's physical scale. A day N times longer, with
// needs, work, growth and decay kept in proportion, gives a resident the same time budget as a day of today's length in which
// everything that moves covers N times the ground per tick. This module holds that N for the lab, so a runner can ask the second
// question of the same save without changing the length of the day.
//
// The factor multiplies what moves on foot or hoof: a person's walking speed (activities.ts moveSpeed, which every person move and
// every travel-time estimate goes through) and the speeds of wolves, deer and sheep (wildlife.ts, livestock.ts), so that people and
// animals keep their relative speeds. Carts follow the one who pulls them and need no factor. Needs, work durations, growth and
// decay are not touched.
//
// The factor is never saved or hashed. It is 1 unless a runner calls setPace before the run, and at 1 every product is exact, so
// the world runs bit for bit as it did.
let pace = 1;

/** Set the pace factor (finite and above 0). A runner calls this before the save is loaded. */
export function setPace(f: number): void {
  if (!Number.isFinite(f) || f <= 0) throw new Error('pace must be finite and greater than 0');
  pace = f;
}

/** The current pace factor: 1 unless setPace has been called. */
export const paceFactor = (): number => pace;
