// What becomes of every building site, and where the made materials go. Read-only measurement: one ordinary world; each site
// followed from the day it is laid out to the day it is finished or abandoned, with what it needed and what had arrived; every
// trip to carry to a site or to build at one, and how it ended; what the workshops made; and where planks, bricks and stone are
// at the end.
//
//   npx vite-node scripts/build_trace.ts -- --seed aspen --days 72 [--arrivals on|off] [--rules N] [--out build.json]
import { writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import type { Items, Site, World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
const seed = opt('seed', 'aspen');
const days = Number(opt('days', '72'));
const out = opt('out', '');
const settings = freshRunSettings(parseRunRules('rich'), 'normal', seed, { immigration: opt('arrivals', 'on') === 'on' });
const pinned = opt('rules', '');
if (pinned) settings.rulesVersion = Number(pinned);
const w: World = deserializeWorld(serializeWorld(createWorld(settings)));

interface Life { id: number; type: string; hh: number; laid: number; ended: number; outcome: 'open' | 'finished' | 'abandoned'; required: Items; delivered: Items; work: number; workTotal: number; lastWorkDay: number; status: string; upgrade: boolean; hauls: number; builds: number; x: number; y: number }
const lives = new Map<number, Life>();
const snap = (s: Site, l: Life): void => { l.required = { ...s.required }; l.delivered = { ...s.delivered }; l.work = Math.round(s.work); l.workTotal = Math.round(s.workTotal); l.lastWorkDay = Math.round((Math.max(s.lastWorkTick, s.createdTick) / DAY) * 10) / 10; l.status = s.status; };
// trips to a site: carrying to it (haul) and working at it (build), by the site's type and how the trip ended
const trips: Record<string, Record<string, number>> = {};
const made: Record<string, number> = {};
w.hooks = {
  onActivityEnd: (_p, a, outcome, detail) => {
    if (a.kind === 'haul' || a.kind === 'build') {
      const l = lives.get(a.targetId);
      if (!l) return;
      if (a.kind === 'haul') l.hauls++; else l.builds++;
      const key = `${l.type} ${a.kind}`;
      const how = outcome === 'success' ? 'done' : outcome === 'partial' ? 'partial' : `${outcome}: ${detail.replace(/\d+(\.\d+)?/g, 'N').slice(0, 50)}`;
      (trips[key] ??= {})[how] = ((trips[key] ??= {})[how] ?? 0) + 1;
    } else if ((a.kind === 'operate' || a.kind === 'craft') && outcome === 'success') made[a.label] = (made[a.label] ?? 0) + 1;
  },
};
const missing = (l: Life): string => Object.entries(l.required).map(([k, n]) => [k, (n ?? 0) - ((l.delivered as Record<string, number>)[k] ?? 0)] as const).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(', ') || 'nothing';
const daily: Record<string, unknown>[] = [];
for (let i = 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (i % 200 !== 0) continue; // a site lives for days: a twelfth of a day is fine enough
  const day = Math.round((i / DAY) * 100) / 100;
  const open = new Set<number>();
  for (const s of w.sites) {
    open.add(s.id);
    let l = lives.get(s.id);
    if (!l) lives.set(s.id, (l = { id: s.id, type: s.type, hh: s.hhId, laid: Math.round((s.createdTick / DAY) * 10) / 10, ended: 0, outcome: 'open', required: {}, delivered: {}, work: 0, workTotal: 0, lastWorkDay: 0, status: '', upgrade: !!s.upgradeOf, hauls: 0, builds: 0, x: s.x, y: s.y }));
    snap(s, l);
  }
  for (const l of lives.values()) {
    if (l.outcome !== 'open' || open.has(l.id)) continue;
    l.ended = day;
    l.outcome = w.buildings.some((b) => b.type === l.type && b.x === l.x && b.y === l.y) ? 'finished' : 'abandoned';
  }
  if (i % DAY === 0 && (i / DAY) % 12 === 0) {
    const alive = w.persons.filter((p) => p.alive);
    const held = (k: string): number => alive.reduce((n, p) => n + ((p.inv as Record<string, number>)[k] ?? 0), 0);
    const stored = (k: string): number => w.buildings.reduce((n, b) => n + ((b.store.items as Record<string, number>)[k] ?? 0), 0);
    const piled = (k: string): number => w.piles.reduce((n, pl) => n + ((pl.items as Record<string, number>)[k] ?? 0), 0);
    const onSites = (k: string): number => w.sites.reduce((n, s) => n + ((s.delivered as Record<string, number>)[k] ?? 0), 0);
    daily.push({ day: i / DAY, alive: alive.length, where: Object.fromEntries(['planks', 'bricks', 'stone', 'wood', 'clay', 'charcoal', 'ore', 'iron'].map((k) => [k, { packs: held(k), stores: stored(k), piles: piled(k), sites: onSites(k) }])), stoneInGround: Math.round(w.sources.filter((s) => s.type === 'rock' || s.type === 'outcrop').reduce((n, s) => n + s.amount, 0)), clayInGround: Math.round(w.sources.filter((s) => s.type === 'clay_pit').reduce((n, s) => n + s.amount, 0)) });
  }
}
const all = [...lives.values()];
const byType: Record<string, { laid: number; finished: number; abandoned: number; open: number; daysToFinish: number; daysToAbandon: number; missingAtEnd: Record<string, number>; workDoneAtAbandon: number; neverTouched: number }> = {};
for (const l of all) {
  const key = l.upgrade ? l.type + ' (rebuild)' : l.type;
  const t = (byType[key] ??= { laid: 0, finished: 0, abandoned: 0, open: 0, daysToFinish: 0, daysToAbandon: 0, missingAtEnd: {}, workDoneAtAbandon: 0, neverTouched: 0 });
  t.laid++;
  t[l.outcome]++;
  if (l.outcome === 'finished') t.daysToFinish += l.ended - l.laid;
  if (l.outcome === 'abandoned') {
    t.daysToAbandon += l.ended - l.laid;
    const m = missing(l);
    t.missingAtEnd[m] = (t.missingAtEnd[m] ?? 0) + 1;
    t.workDoneAtAbandon += l.workTotal > 0 ? l.work / l.workTotal : 0;
    if (l.hauls + l.builds === 0) t.neverTouched++;
  }
}
const reasons = Object.fromEntries(Object.entries(w.ledger.reasons).filter(([k]) => /plank|brick|charcoal|iron|quarr|outcrop|rock|stone|clay|ore|saw|kiln|smelt|forge/i.test(k)).sort((a, b) => b[1] - a[1]));
const result = { seed, days, rulesVersion: w.settings.rulesVersion, alive: w.persons.filter((p) => p.alive).length, byType, trips, made, reasons, created: Object.fromEntries(['planks', 'bricks', 'charcoal', 'iron', 'stone', 'wood', 'clay', 'ore'].map((k) => [k, (w.ledger.created as Record<string, number>)[k] ?? 0])), consumed: Object.fromEntries(['planks', 'bricks', 'charcoal', 'iron', 'stone', 'wood', 'clay', 'ore'].map((k) => [k, (w.ledger.consumed as Record<string, number>)[k] ?? 0])), daily, sites: all };
if (out) writeFileSync(out, JSON.stringify(result));
const pad = (s: unknown, n: number): string => String(s).padStart(n);
console.log(`${seed}: ${days} days, rules ${result.rulesVersion}, ${result.alive} alive`);
console.log(pad('site', 22) + pad('laid', 6) + pad('done', 6) + pad('aband', 7) + pad('open', 6) + pad('days', 7) + pad('idle', 7) + '  (days to finish; of the abandoned: never worked or carried to) what the abandoned still lacked');
for (const [k, t] of Object.entries(byType).sort((a, b) => b[1].laid - a[1].laid)) console.log(pad(k, 22) + pad(t.laid, 6) + pad(t.finished, 6) + pad(t.abandoned, 7) + pad(t.open, 6) + pad(t.finished ? (t.daysToFinish / t.finished).toFixed(1) : '-', 7) + pad(t.neverTouched, 7) + '  ' + Object.entries(t.missingAtEnd).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m, n]) => `${n}x [${m}]`).join(' '));
console.log('made at workshops and by hand: ' + Object.entries(made).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => `${k} ${n}`).join('; '));
console.log('created: ' + JSON.stringify(result.created) + ' consumed: ' + JSON.stringify(result.consumed));
console.log('trips: ' + Object.entries(trips).map(([k, v]) => `${k}: ` + Object.entries(v).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, n]) => `${h} ${n}`).join(', ')).join(' | '));
console.log('at the end: ' + JSON.stringify(daily[daily.length - 1]));
