// Follows one child, one adult and one elder of an ordinary world for N days and writes what the simulation recorded of each life:
// every activity begun (when, what, why, where), every line of their personal log, and a needs and mood reading each day. It reads the
// world; it changes nothing. usage: npx vite-node scripts/life_trace.ts -- <seed> <days> <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { worldTimeText } from '../src/sim/inspect_observer';
import { describePerson } from '../src/sim/inspect';
import type { Person } from '../src/sim/types';

const [seed = 'aspen', daysArg = '25', outDir = 'life_trace_out'] = process.argv.slice(2).filter((a) => a !== '--');
const days = Number(daysArg);
mkdirSync(outDir, { recursive: true });
const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }) });

const stageOf = (p: Person) => describePerson(w, p.id)?.stage ?? '?';
const alive = w.persons.filter((p) => p.alive);
const withStage = alive.map((p) => ({ p, stage: stageOf(p), age: describePerson(w, p.id)?.age ?? 0 }));
const pick = (stage: string, want: (a: number) => number) =>
  withStage.filter((x) => x.stage === stage).sort((a, b) => want(a.age) - want(b.age))[0];
const child = pick('child', (a) => Math.abs(a - 9));
const adult = pick('adult', (a) => Math.abs(a - 34));
const elder = pick('elder', (a) => -a);
const chosen = [child, adult, elder].filter(Boolean);

interface Row { tick: number; text: string }
const rows = new Map<number, Row[]>();
const lastLabel = new Map<number, string>();
const seenLog = new Map<number, number>();
const daily = new Map<number, string[]>();
for (const c of chosen) { rows.set(c.p.id, []); daily.set(c.p.id, []); seenLog.set(c.p.id, c.p.log.length ? c.p.log[c.p.log.length - 1].tick : -1); }

const where = (p: Person) => `(${Math.round(p.x)},${Math.round(p.y)})`;
const needsText = (id: number) => {
  const v = describePerson(w, id);
  return v ? v.needs.map((n) => `${n.key} ${Math.round(n.value)}`).join(', ') : '';
};

while (w.tick < days * DAY) {
  stepWorld(w);
  for (const c of chosen) {
    const p = c.p;
    const r = rows.get(p.id)!;
    if (!p.alive) {
      if (lastLabel.get(p.id) !== 'DEAD') { lastLabel.set(p.id, 'DEAD'); r.push({ tick: w.tick, text: 'DIED' }); }
      continue;
    }
    const a = p.activity;
    const label = a ? `${a.label}` : '(deciding)';
    if (label !== lastLabel.get(p.id)) {
      lastLabel.set(p.id, label);
      r.push({ tick: w.tick, text: `${label}${a?.goal ? ` | because: ${a.goal}` : ''} ${where(p)}` });
    }
    for (const l of p.log) {
      if (l.tick > (seenLog.get(p.id) ?? -1)) { r.push({ tick: l.tick, text: `LOG[${l.kind}] ${l.text}` }); seenLog.set(p.id, l.tick); }
    }
    if (w.tick % DAY === 1200) {
      const v = describePerson(w, p.id);
      daily.get(p.id)!.push(`day ${Math.floor(w.tick / DAY) + 1} midday: mood ${v ? Math.round(v.mood) : '?'}, ${needsText(p.id)}; thoughts: ${(v?.thoughts ?? []).slice(0, 3).map((t) => `${t.why} (${Math.round(t.value)})`).join('; ')}`);
    }
  }
}

for (const c of chosen) {
  const v = describePerson(w, c.p.id);
  const head = [
    `# ${v?.name ?? c.p.id}, ${c.stage}, age ${c.age} at the start`,
    `household: ${v?.household}; home: ${v?.home}; partner: ${v?.partner ?? 'none'}; goal: ${v?.goal ?? 'none'}; traits: ${v?.traitSummary}`,
    `at the end: alive ${c.p.alive}; mood ${v ? Math.round(v.mood) : '?'}; ${needsText(c.p.id)}`,
    '',
    '## each midday',
    ...(daily.get(c.p.id) ?? []),
    '',
    '## what happened, in order',
    ...rows.get(c.p.id)!.map((r) => `${worldTimeText(r.tick)} | ${r.text}`),
  ];
  writeFileSync(`${outDir}/${(v?.name ?? 'person' + c.p.id).replace(/\W+/g, '_')}_${c.stage}.md`, head.join('\n'));
}
console.log(JSON.stringify({ seed, days, followed: chosen.map((c) => ({ id: c.p.id, stage: c.stage, age: c.age })), people: w.persons.filter((p) => p.alive).length }));
