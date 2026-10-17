// What becomes of the private projects people take on in an ordinary autonomous run (rich worlds)? Nobody is scripted here and
// nothing is forced: the world is created as the app creates it, run forward, and every change to every person's own plans is read
// off the records the simulation sets (src/sim/intent.ts). A project is only called finished if the thing itself happened - a tool
// really in the pack, a condition the person's own hands really put back.
//   npx vite-node scripts/projects.ts -- --seed meadow [--profile normal] [--days 12] [--stories 3] [--dynamics rich|authored] [--json out.json]
import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { dayFraction, dayNumber } from '../src/sim/environment';
import { createWorld } from '../src/sim/factory';
import { settingsForProfile } from '../src/sim/profiles';
import type { ProfileName } from '../src/sim/profiles';
import { planHelp, planOfActivity } from '../src/sim/intent';
import { stepWorld } from '../src/sim/world';
import type { Intention, ItemKind, Person, World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'meadow');
const profile = opt('profile', 'normal') as ProfileName;
const days = Number(opt('days', '12'));
const wantStories = Number(opt('stories', '3'));
// authored is here to be shown: an authored world must take on no projects at all, which is the same code path saying nothing
const dynamics = opt('dynamics', 'rich') as 'authored' | 'rich';

/** one project followed from the moment it was adopted to whatever became of it */
interface Life {
  who: string;
  whoId: number;
  planId: number;
  kind: Intention['kind'];
  goal: string;
  since: number;
  /** every change the simulation recorded, in order: what happened and the tick it happened at */
  beats: { tick: number; what: string; tag: 'adopt' | 'step' | 'aside' | 'resume' | 'revise' | 'act' | 'end' | 'help' }[];
  /** activities this person started while the project stood, and how many of them were its current step */
  acts: number;
  stepActs: number;
  setAside: number;
  /** what asking someone for help came to (Stage D1), read off the requests and the promiser's commitment */
  help: string[];
  /** what it was worth in the world: the tool that appeared, the condition put back */
  made: string;
  worked: number;
  condFrom: number;
  condTo: number;
  status: Intention['status'] | 'unfinished';
  reason: string;
}

const world: World = createWorld(settingsForProfile(profile, seed, { immigration: false, dynamics }));
const lives = new Map<string, Life>(); // person id + intention id
const key = (p: Person, i: Intention) => `${p.id}:${i.id}`;
/** the last state we saw of each plan, so only real changes are recorded */
const seen = new Map<string, { step: string; blocked: string; aside: number; status: string; about: number }>();
const toolsHeld = new Map<number, Record<string, number>>();

const at = (tick: number) => `d${dayNumber(tick)} ${String(Math.floor(dayFraction(tick) * 24)).padStart(2, '0')}:${String(Math.floor((dayFraction(tick) * 24 * 60) % 60)).padStart(2, '0')}`;

// Which activity a person starts, and whether it was the step their own plan was pressing for. The activity carries the option key
// it came from, and the plan carries the key that would serve it: the match is the engine's own, not a guess from the wording.
world.hooks = {
  onActivityStart: (p, a) => {
    for (const i of p.intentions) {
      if (i.status !== 'active') continue;
      const L = lives.get(key(p, i));
      if (!L) continue;
      L.acts++;
      // the engine's own verdict, set where the choice was made (decision.ts): this activity was chosen as the plan's step
      const served = planOfActivity(p, a)?.id === i.id;
      if (served) L.stepActs++;
      L.beats.push({ tick: world.tick, what: `${served ? 'took the step' : 'did something else'}: ${a.label}${served ? '' : ` (the step was “${i.step}”)`}`, tag: 'act' });
    }
  },
};

const condOf = (id: number): number => {
  const b = world.buildings.find((x) => x.id === id);
  return b ? Math.round(b.condition) : -1;
};

for (let t = 0; t < days * DAY; t++) {
  stepWorld(world);
  for (const p of world.persons) {
    if (!p.alive || !p.intentions.length) continue;
    for (const i of p.intentions) {
      const k = key(p, i);
      const was = seen.get(k);
      if (!was) {
        // newly adopted: this is the first tick the plan exists
        const L: Life = {
          who: p.name,
          whoId: p.id,
          planId: i.id,
          kind: i.kind,
          goal: i.goal,
          since: world.tick,
          beats: [{ tick: world.tick, what: `means to ${i.goal} — ${i.reason}`, tag: 'adopt' }],
          acts: 0,
          stepActs: 0,
          setAside: 0,
          help: [],
          made: '',
          worked: 0,
          condFrom: i.kind === 'repair' ? condOf(i.aboutId) : -1,
          condTo: -1,
          status: 'unfinished',
          reason: '',
        };
        L.beats.push({ tick: world.tick, what: `first step: ${i.step}`, tag: 'step' });
        lives.set(k, L);
        if (i.kind === 'tool') toolsHeld.set(p.id, { [i.makes]: p.inv[i.makes as ItemKind] ?? 0 });
        seen.set(k, { step: i.step, blocked: i.blocked, aside: i.setAside, status: i.status, about: i.aboutId });
        continue;
      }
      const L = lives.get(k)!;
      if (i.setAside > was.aside) {
        L.setAside += i.setAside - was.aside;
        if (!was.blocked && i.blocked) L.beats.push({ tick: world.tick, what: `set aside: ${i.blocked}`, tag: 'aside' });
      } else if (was.blocked && !i.blocked) {
        L.beats.push({ tick: world.tick, what: `taken up again (${i.step})`, tag: 'resume' });
      } else if (i.blocked && i.blocked !== was.blocked) {
        L.beats.push({ tick: world.tick, what: `held up: ${i.blocked}`, tag: 'aside' });
      }
      // asking someone for a material this project needs, and what became of it
      for (const h of planHelp(world, p, i)) {
        const line = `${h.status}:${h.who}:${h.item}:${h.asked}:${h.delivered}`;
        if (!L.help.includes(line)) {
          const plain =
            h.status === 'pending'
              ? `asked ${h.who} for ${h.asked} ${h.item}`
              : h.status === 'promised'
                ? `${h.who} promised ${h.asked} ${h.item} (${h.delivered} brought so far)`
                : h.status === 'fulfilled'
                  ? `${h.who} brought ${h.delivered} ${h.item}`
                  : `${h.who}: ${h.status}${h.delivered ? ` after bringing ${h.delivered}` : ''}`;
          L.help = L.help.filter((x) => x.split(':')[1] !== h.who || x.split(':')[2] !== h.item);
          L.help.push(line);
          L.beats.push({ tick: world.tick, what: plain, tag: 'help' });
        }
      }
      if (i.aboutId !== was.about && i.status === 'active') L.beats.push({ tick: world.tick, what: `changed what it is about: ${i.reason}`, tag: 'revise' });
      if (i.step !== was.step && i.status === 'active' && i.step) L.beats.push({ tick: world.tick, what: `step now: ${i.step}`, tag: 'step' });
      if (i.status !== was.status) {
        L.status = i.status;
        L.reason = i.reason;
        L.worked = Math.round(i.worked);
        if (i.kind === 'repair') L.condTo = condOf(i.aboutId);
        if (i.kind === 'tool') L.made = `${i.makes} ×${p.inv[i.makes as ItemKind] ?? 0} in the pack (was ${toolsHeld.get(p.id)?.[i.makes] ?? 0})`;
        L.beats.push({ tick: world.tick, what: `${i.status === 'done' ? 'finished' : 'gave it up'}: ${i.reason}`, tag: 'end' });
      }
      seen.set(k, { step: i.step, blocked: i.blocked, aside: i.setAside, status: i.status, about: i.aboutId });
    }
  }
}

// ───────────────────────── what came of them ─────────────────────────
const all = [...lives.values()];
const byKind = (k: Intention['kind']) => all.filter((L) => L.kind === k);
const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);

function summarise(k: Intention['kind']): string {
  const xs = byKind(k);
  if (!xs.length) return `  ${k}: none taken on`;
  const done = xs.filter((L) => L.status === 'done');
  const dropped = xs.filter((L) => L.status === 'dropped');
  const open = xs.filter((L) => L.status === 'unfinished');
  const spanned = xs.map((L) => L.acts);
  const multi = spanned.filter((n) => n >= 2).length;
  const asides = xs.filter((L) => L.setAside > 0).length;
  const lines = [
    `  ${k}: ${xs.length} taken on — ${done.length} finished, ${dropped.length} given up, ${open.length} still open at the end`,
    `    carried across activities: ${multi}/${xs.length} spanned 2 or more (median ${median(spanned)}), of which the plan's own step: ${pct(sum(xs.map((L) => L.stepActs)), sum(spanned))}% of starts`,
    `    set aside for something more pressing at least once: ${asides}/${xs.length}`,
  ];
  if (k === 'tool') {
    const real = done.filter((L) => /×[1-9]/.test(L.made));
    lines.push(`    finished with the tool really in the pack: ${real.length}/${done.length}${real.length ? ` (e.g. ${real[0].who}: ${real[0].made})` : ''}`);
  }
  if (k === 'repair') {
    const real = done.filter((L) => L.worked > 0 && L.condTo > L.condFrom);
    lines.push(`    finished with condition really put back by their own hands: ${real.length}/${done.length}${real.length ? ` (e.g. ${real[0].who}: ${real[0].condFrom}→${real[0].condTo}, ${real[0].worked} of it theirs)` : ''}`);
  }
  const why: Record<string, number> = {};
  for (const L of dropped) why[L.reason.replace(/[0-9]+/g, '#')] = (why[L.reason.replace(/[0-9]+/g, '#')] ?? 0) + 1;
  if (dropped.length) lines.push(`    given up because: ${Object.entries(why).sort((a, b) => b[1] - a[1]).map(([r, n]) => `${r} ×${n}`).join('; ')}`);
  // everything that ever held one of these plans up, and every time one changed what it was about
  const held: Record<string, number> = {};
  let revised = 0;
  for (const L of xs) {
    for (const b of L.beats) {
      const what = b.what.replace(/^[a-z ]+: /, '').replace(/[0-9]+/g, '#');
      if (b.tag === 'aside') held[what] = (held[what] ?? 0) + 1;
      if (b.tag === 'revise') revised++;
    }
  }
  // Stage D1: how often a project led someone to ask a neighbour, and what came of it. Projects and requests are counted
  // separately and said so: one project may ask more than one person, so the outcomes below are per REQUEST.
  const mine = new Set(xs.map((L) => `${L.whoId}:${L.planId}`));
  const reqs = world.requests.filter((r) => r.planId !== undefined && mine.has(`${r.from}:${r.planId}`));
  const projectsThatAsked = new Set(reqs.map((r) => `${r.from}:${r.planId}`)).size;
  if (reqs.length) {
    const states: Record<string, number> = {};
    let brought = 0;
    for (const r of reqs) {
      states[r.status] = (states[r.status] ?? 0) + 1;
      brought += r.delivered ?? 0;
    }
    lines.push(`    asked a neighbour for material: ${projectsThatAsked} of ${xs.length} projects did, making ${reqs.length} requests`);
    lines.push(`      those ${reqs.length} requests: ${Object.entries(states).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}; units actually delivered: ${brought}`);
    // An ask is only made when the asker's own sight and memory say it would probably be answered yes (`Request.likely`, set in
    // options_social.ts). This is the test of that rule: of the asks made under it, how many were in fact answered yes.
    const likely = reqs.filter((r) => r.likely);
    const yes = (rs: typeof reqs) => rs.filter((r) => r.status === 'fulfilled' || r.status === 'partial' || r.status === 'promised').length;
    lines.push(`      made under the "they would probably say yes" rule: ${likely.length} of ${reqs.length}; of those, answered yes: ${yes(likely)} (${pct(yes(likely), likely.length)}%), units delivered ${likely.reduce((n, r) => n + (r.delivered ?? 0), 0)}`);
  } else lines.push(`    asked a neighbour for material: none`);
  if (Object.keys(held).length) lines.push(`    held up by: ${Object.entries(held).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([r, n]) => `${r} ×${n}`).join('; ')}`);
  lines.push(`    taken up again after being set aside: ${xs.reduce((n, L) => n + L.beats.filter((b) => b.tag === 'resume').length, 0)}; revised what it was about: ${revised}`);
  return lines.join('\n');
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** the acceptance case: a project that crossed several activities, was really interrupted, and then ended for a stated reason */
function score(L: Life): number {
  return (L.acts >= 2 ? 10 : 0) + (L.setAside > 0 ? 10 : 0) + (L.status === 'done' ? 8 : L.status === 'dropped' ? 6 : 0) + Math.min(6, L.beats.length / 4) + (L.stepActs > 0 ? 4 : 0);
}

console.log(`seed ${seed} (${profile}, ${dynamics}), ${days} days, ${world.persons.filter((p) => p.alive).length} people alive`);
console.log(`projects taken on: ${all.length} by ${new Set(all.map((L) => L.whoId)).size} people`);
for (const k of ['tool', 'repair', 'night'] as Intention['kind'][]) console.log(summarise(k));
const cons = conservationReport(world);
console.log(`materials account balances: ${cons.ok ? 'yes' : 'NO — ' + JSON.stringify(cons.diffs)}`);

const projects = all.filter((L) => L.kind !== 'night').sort((a, b) => score(b) - score(a));
// one of each kind of ending, so the stories shown are not three of the same thing
const buckets: Life[] = [];
for (const pick of [
  (L: Life) => L.help.length > 0,
  (L: Life) => L.kind === 'tool' && L.status === 'done' && L.setAside > 0,
  (L: Life) => L.kind === 'repair' && L.status === 'done',
  (L: Life) => L.status === 'dropped',
  (L: Life) => L.status === 'unfinished',
]) {
  const found = projects.find((L) => pick(L) && !buckets.includes(L));
  if (found) buckets.push(found);
}
for (const L of [...buckets, ...projects.filter((L) => !buckets.includes(L))].slice(0, wantStories)) {
  console.log(`\n── ${L.who} (${L.kind}): ${L.goal} — ${L.status === 'unfinished' ? 'still at it' : L.status} ──`);
  console.log(`   started ${at(L.since)}; ${L.acts} activities started while it stood, ${L.stepActs} of them its own step; set aside ${L.setAside}×`);
  for (const b of L.beats) console.log(`   ${at(b.tick)}  ${b.what}`);
}

if (opt('json', '')) {
  writeFileSync(
    opt('json', ''),
    JSON.stringify({ seed, profile, days, conservation: cons.ok, lives: all.map((L) => ({ ...L, beats: L.beats.length })) }, null, 1),
  );
}
