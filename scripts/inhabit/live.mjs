// The player's side of scripts/inhabit/manual.ts. One call per decision.
//   node scripts/inhabit/live.mjs <dir> next            show the pending ask (the system prompt only with --system, or on the first ask)
//   node scripts/inhabit/live.mjs <dir> say  < answer   write the answer (stdin) to the pending ask, then show the next one
// <dir> is the folder the run was started with (--manual <dir>). When the run has ended it prints the end of report.txt instead.
// By default the observation is shown in a compact form (every section, but places cut to the nearest few of each kind and long lists
// to their first entries, with counts); the options, set-aside list, plans and notes are shown in full. --raw shows the ask unchanged.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, cmd = 'next', ...rest] = process.argv.slice(2);
if (!dir) throw new Error('usage: live.mjs <dir> next|say [--system] [--raw] [--wait seconds]');
const flag = (f) => rest.includes(f);
const wait = Number((rest[rest.indexOf('--wait') + 1]) || 90) * 1000;
const nums = (prefix, suffix) => readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(suffix)).map((f) => Number(f.slice(prefix.length, -suffix.length))).filter(Number.isFinite);
const pending = () => {
  const asked = new Set(nums('ask-', '.json'));
  const answered = new Set(nums('answer-', '.txt'));
  const open = [...asked].filter((n) => !answered.has(n)).sort((a, b) => a - b);
  return open.length ? open[0] : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = (x) => JSON.stringify(x);

function compact(user) {
  const m = /<observation>\s*([\s\S]*?)\s*<\/observation>\s*<your_notes>\s*([\s\S]*?)\s*<\/your_notes>/.exec(user);
  if (!m) return user;
  let o, notes;
  try { o = JSON.parse(m[1]); notes = JSON.parse(m[2]); } catch { return user; }
  const L = [];
  const t = o.time, s = o.self;
  L.push(`TIME  tick ${t.tick}, day ${t.day} ${t.clock} ${t.phase}, ${t.light}, ${t.weather}, ${t.tempC}C`);
  const needs = Object.entries(s.needs).map(([k, v]) => `${k} ${v.value} ${v.state}`).join(', ');
  L.push(`SELF  ${s.name} (${s.sex}), ${s.stage} ${s.ageYears}, ${s.character}. health ${s.health}; ${needs}; nourishment ${j(s.nourishment)}`);
  L.push(`      aspiration: ${s.aspiration}; carrying ${j(s.carrying)}; load ${s.load.used}/${s.load.cap}; spokenFor ${j(s.spokenFor)}; tools ${j(s.tools)}; cart ${s.pullingCart}; at (${s.position.x}, ${s.position.y}); mood ${s.mood}; thoughts ${j(s.thoughts)}`);
  L.push(`      trade ${j(s.trade)}; techniques ${j(s.techniques)}; skills ${Object.entries(s.skills).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  L.push(`HOUSEHOLD  ${j(o.household)}`);
  L.push(`DOING  ${j(o.doing)}`);
  const sp = o.seen.people.map((p) => `#${p.id} ${p.name} ${p.distance} ${p.direction}${p.looks.length ? ' [' + p.looks.join('/') + ']' : ''}, ${p.doing}${p.talking ? ' (talking)' : ''}, carrying ${p.carrying.join('/') || 'nothing'}, ${p.relation}`);
  L.push(`IN SIGHT  ${sp.length} people${sp.length ? ':\n  ' + sp.join('\n  ') : ''}${o.seen.wolves.length ? `\n  WOLVES: ${j(o.seen.wolves)}` : ''}`);
  const strip = (p) => {
    const q = { ...p };
    delete q.x; delete q.y; delete q.source; delete q.stale;
    if (q.seen === 'just now') delete q.seen;
    if (q.ecology) q.ecology = q.ecology.startsWith('strained') ? 'strained' : q.ecology.startsWith('vigorous') ? 'vigorous' : q.ecology;
    return q;
  };
  const byKind = new Map();
  for (const p of o.remembered.places) { if (!byKind.has(p.what)) byKind.set(p.what, []); byKind.get(p.what).push(p); }
  L.push(`KNOWN PLACES (${o.remembered.places.length}; nearest 3 of each kind, [n] = how many of that kind I know; the options hold every one I could act on)`);
  for (const [k, ps] of byKind) L.push(`  ${k} [${ps.length}]: ${ps.slice(0, 3).map((p) => j(strip(p))).join(' ')}`);
  L.push(`WATER  ${o.remembered.water.slice(0, 3).map((p) => j(strip(p))).join(' ')} (${o.remembered.water.length} known)`);
  L.push(`DANGERS ${j(o.remembered.dangers)}  FLOODS ${j(o.remembered.floods)}  COUNTS ${j(o.remembered.counts)}`);
  const pe = o.people;
  L.push(`RELATIONS (${pe.relations.length}; first 8)\n  ${pe.relations.slice(0, 8).map((r) => `#${r.id} ${r.name}: ${r.label} aff ${r.affinity} trust ${r.trust} met ${r.lastMet}${r.kin ? ' kin ' + r.kin : ''}${r.owesMe ? ' owes ' + r.owesMe : ''}${r.avoiding ? ' AVOIDING' : ''}${r.grievance ? ' grievance ' + j(r.grievance) : ''}${r.lastNote ? ' (' + r.lastNote + ')' : ''}`).join('\n  ')}`);
  L.push(`WHEREABOUTS ${pe.whereabouts.slice(0, 5).map((w) => `${w.name} at (${w.x}, ${w.y}) ${w.when}`).join('; ')}`);
  L.push(`WORRIES ${j(pe.worries)}  REQUESTS ${j(pe.requests)}  PROMISES ${j(pe.promises)}  MEETINGS ${j(pe.meetings)}`);
  L.push(`RECENT MEMORY (${o.recent.memory.length}; first 8)\n  ${o.recent.memory.slice(0, 8).map((r) => `[t${r.t}] ${r.when}: ${r.text}`).join('\n  ')}`);
  L.push(`RECENT FAILURES ${j(o.recent.failures)}`);
  L.push(`OPTIONS\n  ${o.options.map(j).join('\n  ')}`);
  L.push(`SET ASIDE ${o.setAside.map((a) => `${a.label} (${a.reason}; ${a.target ?? 'no target'})`).join('; ') || 'nothing'}`);
  L.push(`PLANS ${j(o.plans)}`);
  if (o.canPropose && o.canPropose.items.length) L.push(`CAN PROPOSE ${j(o.canPropose)}   CAN REVISE ${j(o.canRevise)}`);
  L.push(`YOUR NOTES ${j(notes)}`);
  // anything the world says after the notes (a refused pick, why) comes before the standing "propose a project" paragraph
  const tail = user.slice(user.indexOf('</your_notes>') + '</your_notes>'.length).split('Instead of picking an option')[0].trim();
  if (tail) L.push(`THE WORLD SAYS ${tail}`);
  return L.join('\n');
}

if (cmd === 'say') {
  const n = pending();
  if (n === null) throw new Error('no ask is waiting');
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  if (!text.trim()) throw new Error('empty answer');
  writeFileSync(join(dir, `answer-${n}.txt`), text);
  console.log(`(answer to ask ${n} recorded)`);
}

const t0 = Date.now();
for (;;) {
  const ended = join(dir, '..', 'report.txt');
  const n = pending();
  if (n !== null) {
    // a file may be mid-write for a moment
    let ask;
    try { ask = JSON.parse(readFileSync(join(dir, `ask-${n}.json`), 'utf8')); } catch { await sleep(200); continue; }
    if (n === 0 || flag('--system')) console.log(`=== SYSTEM PROMPT ===\n${ask.system}\n`);
    console.log(`=== ASK ${n} ===\n${flag('--raw') ? ask.user : compact(ask.user)}`);
    break;
  }
  if (existsSync(ended)) {
    console.log('=== THE RUN HAS ENDED ===');
    console.log(readFileSync(ended, 'utf8').split('\n').slice(0, 12).join('\n'));
    break;
  }
  if (Date.now() - t0 > wait) { console.log('(nothing yet: the world is still stepping; run the same command again)'); break; }
  await sleep(300);
}
