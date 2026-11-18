import { readFileSync, writeFileSync } from 'node:fs';

const names = ['aspen-day48', 'aspen-day96', 'river-day48', 'river-day96', 'gen-4-day48', 'gen-4-day96'];
const results = {};
for (const name of names) {
  const d = JSON.parse(readFileSync(new URL(`./runs/${name}.json`, import.meta.url), 'utf8'));
  const adults = d.trips.filter(t => t.stage === '12_and_over');
  const measured = adults.filter(t => !t.leftCensored && t.outcome !== 'censored');
  const ticks = xs => xs.reduce((n,t) => n + t.walkingTicks, 0);
  const walksByOutcome = {};
  for (const t of measured) {
    const b = walksByOutcome[t.outcome] ??= { legs: 0, walkingTicks: 0 };
    b.legs++; b.walkingTicks += t.walkingTicks;
  }
  const gather = measured.filter(t => t.kind === 'gather' && t.outcome === 'arrived_did_job' && t.moved && t.moved.units > 0);
  results[name] = {
    adultLegs: adults.length, leftCensored: adults.filter(t => t.leftCensored).length,
    rightCensored: adults.filter(t => t.outcome === 'censored').length,
    measuredLegs: measured.length, measuredWalkingTicks: ticks(measured), walksByOutcome,
    positiveGatherLegs: gather.length, positiveGatherLegsAtMostTwoUnits: gather.filter(t => t.moved.units <= 2).length,
    selfChecks: d.trip.selfChecks,
    hungryTime: d.day.hungryTime, walking: d.day.walking,
  };
}
writeFileSync(new URL('./TRIP_SUMMARY.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
