// Observation-only Stage 2 B/C baseline. Long runs are launched by the owner from PowerShell per AGENTS.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { DAY, WEIGHT } from '../src/sim/constants';
import { stepWorld } from '../src/sim/world';
import { probe, probeReset, probeSnapshot } from '../src/sim/probe';
import { setGatherDiagnostics } from '../src/sim/gather_diagnostics';
import { TripShape } from './observers/trip_shape';

const arg = (key: string, fallback: string): string => {
  const i = process.argv.indexOf(key);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const out = resolve(arg('--out', 'stage2-trip-probe.json'));
const ticks = Number(arg('--ticks', String(30 * DAY)));
const seeds = arg('--seeds', 'aspen,river,gen-4').split(',').map((s) => s.trim()).filter(Boolean);
if (!Number.isSafeInteger(ticks) || ticks < 1 || !seeds.length) throw new Error('Expected positive --ticks and at least one --seeds value');

const runs: unknown[] = [];
for (const seed of seeds) {
  probeReset();
  probe.on = true;
  setGatherDiagnostics(true);
  const world = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
  const trips = new TripShape();
  const detach = trips.attach(world);
  for (let i = 0; i < ticks; i++) {
    trips.sampleTick(world);
    stepWorld(world);
  }
  trips.finish(world);
  const probeCounters = probeSnapshot();
  probe.on = false;
  setGatherDiagnostics(false);
  detach();
  const rows = trips.tripRows();
  const report = trips.report();
  const tiny = rows.filter((r) => r.tinyGatherPackAudit !== null);
  const candidate = tiny.filter((r) => r.tinyGatherPackAudit!.wantedUnits !== null && r.tinyGatherPackAudit!.wantedUnits > 2);
  const byItem: Record<string, { carried: number; needed: number; reserved: number; errand: number; spare: number }> = {};
  for (const row of tiny) for (const [item, counts] of Object.entries(row.tinyGatherPackAudit!.items)) {
    const total = byItem[item] ??= { carried: 0, needed: 0, reserved: 0, errand: 0, spare: 0 };
    for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += counts[k];
  }
  const putDownItems = new Set(['wood', 'stone', 'clay', 'seeds']);
  const couldFreeRoom = (r: (typeof candidate)[number]): boolean => {
    const audit = r.tinyGatherPackAudit!;
    const spareWeight = Object.entries(audit.items).reduce((s, [item, v]) => s + (putDownItems.has(item) ? v.spare * (WEIGHT[item as keyof typeof WEIGHT] ?? 1) : 0), 0);
    const gatherWeight = WEIGHT[audit.gatheredItem as keyof typeof WEIGHT] ?? 1;
    return audit.wantedUnits !== null && audit.roomUnits + Math.floor((spareWeight + 1e-9) / gatherWeight) >= Math.min(audit.wantedUnits, 3);
  };
  const rescued = candidate.filter(couldFreeRoom);
  const switched = rows.filter((r) => r.outcome === 'switched_mid_walk' && r.stage === '12_and_over');
  const adultWalkingTicks = report.headline.byStage['12_and_over'].counts.walkingTicks;
  const detourTicks = switched.reduce((s, r) => s + (r.detourTicksEstimate ?? 0), 0);
  runs.push({
    seed, ticks, rulesVersion: world.settings.rulesVersion ?? CURRENT_RULES_VERSION,
    counts: { tinyGatherWalks: tiny.length, tinyGatherWithWantedOver2: candidate.length, candidateWithSpareRoomForWantedTrip: rescued.length, shareRescued: candidate.length ? rescued.length / candidate.length : null },
    packItems: byItem,
    walkC: { adultWalkingTicks, interruptedAdultWalks: switched.length, detourTicksEstimate: detourTicks, detourShareOfAdultWalkingTicks: adultWalkingTicks ? detourTicks / adultWalkingTicks : null, reviewProbe: probeCounters },
    rows,
  });
}
probe.on = false;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), method: 'TripShape observation only; rules unchanged', runs }, null, 2) + '\n');
console.log(JSON.stringify({ out, seeds, ticks, rulesVersion: CURRENT_RULES_VERSION, runSummaries: runs.map((r: any) => ({ seed: r.seed, counts: r.counts, walkC: r.walkC })) }, null, 2));
