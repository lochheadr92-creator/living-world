// REVIEW-ONLY probe (adversarial review, 2026-11-01). Not a product test. Safe to delete.
// Liveness of the social/activity machinery in ordinary current-rules worlds: dangling conversation ids, long-lived
// conversations, activities suspended for a very long time, people with no activity for long stretches, and activities
// that repeat the same option key many times without a successful ending (initiation without completion).
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

function probe(seed: string, ticks: number) {
  const w: World = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
  const suspendedSince = new Map<number, number>();
  const idleSince = new Map<number, number>();
  let danglingConv = 0, longConv = 0, longSuspended = 0, longIdle = 0;
  const samples: string[] = [];
  const endings = new Map<string, { success: number; failed: number; interrupted: number; partial: number }>();
  const starts = new Map<string, number>();
  const details = new Map<string, number>();
  // count endings through each person's result record (lastResult changes when an activity ends)
  const lastRes = new Map<number, unknown>();
  for (let t = 0; t < ticks; t++) {
    stepWorld(w);
    for (const p of w.persons) {
      if (!p.alive) continue;
      const r = p.lastResult as { tick?: number; outcome?: string; kind?: string; label?: string } | null;
      if (r && lastRes.get(p.id) !== r) {
        lastRes.set(p.id, r);
        const k = String(r.kind ?? r.label ?? '?');
        const e = endings.get(k) ?? { success: 0, failed: 0, interrupted: 0, partial: 0 };
        const o = String(r.outcome ?? '');
        if (o in e) (e as Record<string, number>)[o]++;
        endings.set(k, e);
        if (o === 'failed' || o === 'partial') { const dk = `${k} | ${o} | ${String((r as { detail?: string }).detail ?? '').replace(/\d+/g, '#').slice(0, 70)}`; details.set(dk, (details.get(dk) ?? 0) + 1); }
      }
      if (p.activity) { const k = p.activity.kind; if (p.activity.start === w.tick - 1) starts.set(k, (starts.get(k) ?? 0) + 1); }
    }
    if (t % 100 !== 0) continue;
    for (const p of w.persons) {
      if (!p.alive) continue;
      if (p.convId && !w.conversations.some((c) => c.id === p.convId)) { danglingConv++; samples.push(`t${w.tick} ${p.name} convId ${p.convId} missing`); }
      if (p.suspended) { if (!suspendedSince.has(p.id)) suspendedSince.set(p.id, w.tick); else if (w.tick - suspendedSince.get(p.id)! > 1200) { longSuspended++; if (samples.length < 40) samples.push(`t${w.tick} ${p.name} suspended ${p.suspended.kind} for ${w.tick - suspendedSince.get(p.id)!} ticks; activity ${p.activity?.kind ?? '-'} convId ${p.convId}`); } }
      else suspendedSince.delete(p.id);
      if (!p.activity) { if (!idleSince.has(p.id)) idleSince.set(p.id, w.tick); else if (w.tick - idleSince.get(p.id)! > 600) { longIdle++; if (samples.length < 40) samples.push(`t${w.tick} ${p.name} no activity for ${w.tick - idleSince.get(p.id)!} ticks; nextThink ${p.nextThink} convId ${p.convId} pause ${p.cooldowns.pause ?? 0}`); } }
      else idleSince.delete(p.id);
    }
    for (const c of w.conversations) if (w.tick - (c as unknown as { start: number }).start > 420) longConv++;
  }
  const endingsObj: Record<string, unknown> = {};
  for (const [k, v] of endings) endingsObj[k] = { ...v, starts: starts.get(k) ?? 0 };
  const failDetails = [...details.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
  return { seed, ticks, alive: w.persons.filter((p) => p.alive).length, danglingConv, longConv, longSuspended, longIdle, conversations: w.conversations.length, samples, endings: endingsObj, failDetails };
}

describe('REVIEW: liveness of conversations, suspensions and activity endings', () => {
  for (const seed of ['forest', 'river']) {
    it(`ordinary Normal ${seed}, 12,000 ticks`, () => {
      const s = probe(seed, 12_000);
      writeFileSync(`C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/liveness-${seed}.json`, JSON.stringify(s, null, 1));
      expect(s.alive).toBeGreaterThan(0);
    });
  }
});
