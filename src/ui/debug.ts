// The optional debug panel: tick, state hash, frame rate and simulation speed, entity counts,
// and the item ledger (created / consumed / spoiled) with its conservation check.
import { ALL_ITEMS, ITEM_LABEL, TPS } from '../sim/constants';
import { conservationReport, totalItems } from '../sim/economy';
import { dayNumber, clockText } from '../sim/environment';
import type { ItemKind } from '../sim/types';
import { Every, h, setHidden, setText, thousands, toggle } from './dom';
import { icon } from './icons';
import { iconButton } from './widgets';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

interface Kv {
  el: HTMLElement;
  v: HTMLElement;
}

function kv(label: string, tip?: string): Kv {
  const v = h('b', { class: 'dbg-v' });
  const el = h('div', { class: 'dbg-kv2', 'data-tip': tip }, h('span', { class: 'dbg-k' }, label), v);
  return { el, v };
}

export function createDebug(ctx: UICtx, slots: Slots): Part {
  const { game } = ctx;

  // frame statistics are always collected (a few additions per frame) so the numbers are warm when the panel opens
  let fps = 60;
  let tps = 0;
  let accTicks = 0;
  let accTime = 0;

  const tick = kv('tick');
  const day = kv('day');
  const hash = kv('state hash', 'A fingerprint of the whole world. The same seed and the same ticks always give the same hash.');
  const rate = kv('frames', 'Measured frames per second drawn by the browser');
  const tps_ = kv('ticks/s', `Simulation ticks actually run per second (one tick is ${1 / TPS} s of world time; 1x speed is ${TPS})`);
  const speed = kv('speed');
  const pop = kv('people');
  const wild = kv('wolves');
  const things = kv('sources');
  const builds = kv('buildings');
  const sites = kv('sites');
  const plots = kv('plots');
  const piles = kv('piles');
  const carts = kv('carts');
  const tools = kv('tools', 'Tool records: each one is also counted in whatever pack, rack or heap holds it');
  const shops = kv('workshops', 'Workplaces, and how many have a batch under way');
  const meals = kv('meals');
  const reqs = kv('requests');
  const convs = kv('conversations');
  const resv = kv('reservations', 'Claims on resources in progress (units being gathered, work slots on sites, plots being worked)');
  const evs = kv('events');

  const ledgerState = h('span', { class: 'ledger-state' });
  const ledgerHead = h('div', { class: 'dbg-ledger-h' }, h('span', { class: 'cap' }, 'Item ledger'), ledgerState);
  const ledgerBody = h('tbody');
  const ledgerTable = h(
    'table',
    { class: 'ledger' },
    h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', null, 'item'),
        h('th', { 'data-tip': 'In the world when it began' }, 'start'),
        h('th', { 'data-tip': 'Created by growing, regrowing and harvesting' }, 'created'),
        h('th', { 'data-tip': 'Used up, for example by eating or building' }, 'consumed'),
        h('th', { 'data-tip': 'Lost to spoilage' }, 'spoiled'),
        h('th', { 'data-tip': 'Counted right now across packs, stores, sites, piles, plants and plots' }, 'now'),
      ),
    ),
    ledgerBody,
  );
  const ledgerDiffs = h('div', { class: 'ledger-diffs', hidden: true });
  const reasons = h('details', { class: 'dbg-reasons' }, h('summary', null, 'Ledger reasons'), h('div', { class: 'reasons-body' }));
  const reasonsBody = reasons.lastElementChild as HTMLElement;

  const closeBtn = iconButton('close', 'Hide the debug panel', 'Hide (Shift+D)', () => game.setDebug(false), { cls: 'sm' });
  const panel = h(
    'section',
    { class: 'debug glass mono scroll', 'aria-label': 'Debug panel', hidden: true },
    h('header', { class: 'dbg-head' }, icon('bug', 14), h('span', { class: 'cap' }, 'Debug'), closeBtn),
    h('div', { class: 'dbg-grid' }, tick.el, day.el, hash.el, speed.el, rate.el, tps_.el, pop.el, wild.el, things.el, builds.el, sites.el, plots.el, piles.el, carts.el, tools.el, shops.el, meals.el, reqs.el, convs.el, resv.el, evs.el),
    ledgerHead,
    ledgerTable,
    ledgerDiffs,
    reasons,
  );
  slots.left.appendChild(panel);

  const fast = new Every(0.25);
  const hashEvery = new Every(1);
  const ledgerEvery = new Every(2);
  let hashLast = -1;

  function renderLedger(): void {
    const world = game.world;
    const L = world.ledger;
    const rep = conservationReport(world);
    const now = totalItems(world);
    setText(ledgerState, rep.ok ? 'balanced' : 'MISMATCH');
    toggle(ledgerState, 'ok', rep.ok);
    toggle(ledgerState, 'bad', !rep.ok);
    const rows: HTMLElement[] = [];
    for (const k of ALL_ITEMS as ItemKind[]) {
      const a = L.initial[k] ?? 0;
      const c = L.created[k] ?? 0;
      const u = L.consumed[k] ?? 0;
      const s = L.spoiled[k] ?? 0;
      const n = now[k] ?? 0;
      if (!a && !c && !u && !s && !n) continue;
      const bad = rep.diffs.some((d) => d.item === k);
      rows.push(h('tr', { class: bad ? 'bad' : '' }, h('td', null, ITEM_LABEL[k]), h('td', null, String(a)), h('td', null, String(c)), h('td', null, String(u)), h('td', null, String(s)), h('td', null, String(n))));
    }
    ledgerBody.replaceChildren(...rows);
    if (rep.diffs.length) {
      setHidden(ledgerDiffs, false);
      ledgerDiffs.textContent = rep.diffs.map((d) => `${d.item}: expected ${d.expected}, found ${d.actual}`).join(' · ');
    } else setHidden(ledgerDiffs, true);

    const entries = Object.entries(L.reasons)
      .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
      .slice(0, 14);
    reasonsBody.replaceChildren(...entries.map(([k, n]) => h('div', { class: 'reason' }, h('span', null, k), h('b', null, thousands(n)))));
  }

  function renderFast(): void {
    const world = game.world;
    setText(tick.v, thousands(world.tick));
    setText(day.v, `${dayNumber(world.tick)} · ${clockText(world.tick)}`);
    setText(rate.v, fps.toFixed(0));
    setText(tps_.v, tps.toFixed(1));
    setText(speed.v, `${game.speed}×${game.playing ? '' : ' (paused)'}`);
    setText(pop.v, String(world.persons.length));
    setText(wild.v, String(world.animals.length));
    setText(things.v, String(world.sources.length));
    setText(builds.v, String(world.buildings.length));
    setText(sites.v, String(world.sites.length));
    setText(plots.v, String(world.plots.length));
    setText(piles.v, String(world.piles.length));
    setText(carts.v, String(world.carts.length));
    setText(tools.v, String(world.tools.length));
    let shopCount = 0;
    let running = 0;
    for (const b of world.buildings) {
      if (!b.ops) continue;
      shopCount++;
      if (b.ops.job) running++;
    }
    setText(shops.v, `${running}/${shopCount} running`);
    setText(meals.v, String(world.meals.length));
    setText(reqs.v, String(world.requests.length));
    setText(convs.v, String(world.conversations.length));
    setText(resv.v, String(world.reservations.size));
    setText(evs.v, String(world.events.length));
  }

  function show(on: boolean): void {
    setHidden(panel, !on);
    if (on) {
      renderFast();
      hashLast = -1;
      hashEvery.force();
      ledgerEvery.force();
    }
  }
  show(game.debug);

  return {
    update(dt) {
      if (dt > 0) fps += (1 / dt - fps) * 0.08;
      accTicks += game.lastFrameTicks;
      accTime += dt;
      if (accTime >= 1) {
        const inst = accTicks / accTime;
        tps = tps === 0 ? inst : tps + (inst - tps) * 0.5;
        accTicks = 0;
        accTime = 0;
      }
      if (!game.debug) return;
      if (fast.step(dt)) renderFast();
      if (hashEvery.step(dt) && game.world.tick !== hashLast) {
        hashLast = game.world.tick;
        setText(hash.v, game.stateHash);
      }
      if (ledgerEvery.step(dt)) renderLedger();
    },
    onGame(e) {
      if (e === 'debug') show(game.debug);
      else if (e === 'restart' && game.debug) show(true);
      else if (e === 'step' && game.debug) {
        renderFast();
        setText(hash.v, game.stateHash);
      }
    },
    dispose() {
      panel.remove();
    },
  };
}
