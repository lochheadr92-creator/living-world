// REVIEW G (observer truth audit): how far back the feed, the chronicle and a person's own log reach after two days.
import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';

const OUT = 'C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/agent_g/feed_caps.txt';

it('feed/chronicle/log reach after two river days (immigration on, as the product world runs)', () => {
  const w = createWorld(currentWorldSettings('normal', 'river'));
  const lines: string[] = [];
  let total = 0;
  let lastId = 0;
  const perPerson = new Map<number, number>();
  for (let n = 0; n < 4800; n++) {
    stepWorld(w);
    for (const ev of w.events) {
      if (ev.id <= lastId) continue;
      total++;
      for (const id of ev.ids) perPerson.set(id, (perPerson.get(id) ?? 0) + 1);
    }
    lastId = w.events.length ? w.events[w.events.length - 1].id : lastId;
    if ((n + 1) % 1200 === 0) {
      const logsAtCap = w.persons.filter((p) => p.alive && p.log.length >= 60).length;
      const oldestLog = Math.max(...w.persons.filter((p) => p.alive && p.log.length).map((p) => w.tick - p.log[0].tick));
      lines.push(`tick ${w.tick}: events emitted so far ${total}; kept ${w.events.length} (oldest kept ${w.tick - w.events[0].tick} ticks back); chronicle ${w.chronicle?.length ?? 0}; persons ${w.persons.filter((p) => p.alive).length}; logs at the 60 cap ${logsAtCap}; longest log reach ${oldestLog} ticks`);
    }
  }
  const busiest = [...perPerson.entries()].sort((a, b) => b[1] - a[1])[0];
  if (busiest) {
    const p = w.persons.find((q) => q.id === busiest[0]);
    const kept = w.events.filter((e) => e.ids.includes(busiest[0])).length;
    lines.push(`busiest person ${p?.name ?? busiest[0]}: ${busiest[1]} feed events emitted about them over two days, ${kept} still in the feed, log length ${p?.log.length ?? '-'} (card shows last 14)`);
  }
  writeFileSync(OUT, lines.join('\n'));
  expect(total).toBeGreaterThan(0);
});
