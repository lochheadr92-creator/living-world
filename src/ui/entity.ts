// The inspector view for everything that is not a person: resources, buildings, workshops, construction sites, field plots,
// piles, graves, handcarts and wolves. Driven by describeEntity() view-models; a construction site is shown as a
// work-in-progress card (progress, each material supplied against required, and who is working), and a workshop as a card
// for the batch under way (progress, its fire, what it will make, who is at it, what is holding it up).
import { BUILD_DEF, GRANARY_TEND_EVERY, ITEM_LABEL } from '../sim/constants';
import type { EntityView } from '../sim/inspect';
import type { Section } from '../sim/inspect_work';
import { agoText, secondsText } from '../sim/inspect';
import { weightOf } from '../sim/economy';
import { RECIPE_BY_ID, recipesAt } from '../sim/recipes';
import type { Building, BuildingType, Cart, Entity, ItemKind, Person, Site, SourceType, World } from '../sim/types';
import { ITEM_COLORS } from '../render/palette';
import { cap, h, KeyedList, legible, round1, setHidden, setText, toggle } from './dom';
import { icon, itemIconName, setIcon, type IconName } from './icons';
import { iconButton, itemChip, makeBar, makeSection, type BarHandle, type ItemChipHandle, type SectionHandle } from './widgets';
import type { UICtx } from './context';

export interface EntityPanel {
  el: HTMLElement;
  update(v: EntityView, world: World): void;
  reset(): void;
}

const TONE: Record<string, string> = {
  ok: 'var(--good)',
  warn: 'var(--warn)',
  bad: 'var(--danger)',
  food: 'var(--accent)',
  mat: '#b98a4f',
  fire: '#f08a4b',
  heat: '#f08a4b',
  work: 'var(--info)',
};

const SOURCE_ICON: Record<SourceType, IconName> = {
  berry_bush: 'berries',
  fruit_tree: 'fruit',
  tree: 'leaf',
  rock: 'stone',
  fish_spot: 'fish',
  wild_grain: 'grain',
  clay_pit: 'clay',
  ore_vein: 'ore',
  outcrop: 'stone',
};

const BUILDING_ICON: Record<BuildingType, IconName> = {
  lean_to: 'home',
  hut: 'home',
  house: 'house',
  storehouse: 'cube',
  fire: 'flame',
  timber_yard: 'saw',
  quarry: 'pick',
  kiln: 'kiln',
  smithy: 'anvil',
  granary: 'granary',
  bakery: 'bread',
  smokehouse: 'smoked_fish',
  hall: 'hall',
  well: 'well',
};

/** a line that says what the thing is for, in plain words (buildings take theirs from the simulation's own table) */
const SOURCE_PURPOSE: Partial<Record<SourceType, string>> = {
  clay_pit: 'Wet clay lies here. It is dug out with a spade or pick and fired into bricks and water jars. A deposit is finite: it does not grow back.',
  ore_vein: 'Dark rock shot through with metal. Dug out and smelted with charcoal into iron for better tools. A deposit is finite.',
  outcrop: 'A great mass of pale stone. Loose rocks are quick to carry but few; a quarry cuts this far faster. A deposit is finite.',
};

const CART_PURPOSE = 'A two-wheeled handcart. It carries three or four times what a person can, and wears a little with every tile it is pulled loaded.';

function iconFor(e: Entity | undefined): IconName {
  if (!e) return 'cube';
  switch (e.ent) {
    case 'source':
      return SOURCE_ICON[e.type] ?? 'leaf';
    case 'building':
      return BUILDING_ICON[e.type] ?? 'home';
    case 'site':
      return 'hammer';
    case 'plot':
      return 'sprout';
    case 'pile':
      return 'basket';
    case 'grave':
      return 'cross';
    case 'animal':
      return 'paw';
    case 'cart':
      return 'cart';
    default:
      return 'cube';
  }
}

/** "1 plank", "4 planks": the simulation's item words are plural, so a lone one loses its s */
function countNoun(kind: string, n: number): string {
  const word = (ITEM_LABEL as Record<string, string>)[kind] ?? kind;
  return `${n} ${n === 1 && /s$/.test(word) ? word.slice(0, -1) : word}`;
}

function purposeOf(e: Entity | undefined): string {
  if (!e) return '';
  switch (e.ent) {
    case 'building':
      return BUILD_DEF[e.type].blurb;
    case 'site':
      return e.upgradeOf ? `Rebuilding a hut in place as a house. ${BUILD_DEF[e.type].blurb}` : `Will be: ${BUILD_DEF[e.type].blurb.charAt(0).toLowerCase()}${BUILD_DEF[e.type].blurb.slice(1)}`;
    case 'source':
      return SOURCE_PURPOSE[e.type] ?? '';
    case 'cart':
      return CART_PURPOSE;
    default:
      return '';
  }
}

/** how a bar's numbers read: percentages for progress-like bars, "a / b" for stock */
function barText(label: string, value: number, max: number): string {
  if (max <= 0) return '—';
  if (max === 1 || max === 100 || /progress|fuel|growth|preparation|care|batch|making|firing|burning|baking|smelting|sawing|forging|milling|cutting|fire|heat|work|condition|wear/i.test(label)) return `${Math.round((value / max) * 100)}%`;
  return `${round1(value)} / ${round1(max)}`;
}

interface BarRow {
  el: HTMLElement;
  label: HTMLElement;
  val: HTMLElement;
  bar: BarHandle;
}

interface RowComp {
  el: HTMLElement;
  k: HTMLElement;
  v: HTMLElement;
}

interface MatRow {
  el: HTMLElement;
  ico: HTMLElement;
  name: HTMLElement;
  val: HTMLElement;
  bar: BarHandle;
}

/** set to false to drop the workshop card once describeEntity() supplies the same things (a 'Making' row or a 'Batch' bar hides it already) */
const SHOW_WORKSHOP_CARD = true;

/** which of the simulation's titled blocks start open; the rest fold away until asked for */
const SECTION_OPEN = new Set(['Under way', 'Idle — what is stopping it', 'Stock', 'The project', 'Materials', 'The cart', 'The outcrop']);

interface SecComp {
  el: HTMLElement;
  handle: SectionHandle;
  update(s: Section): void;
}

export function createEntityPanel(ctx: UICtx, hooks: { onClose(): void; onNavigate(id: number): void }): EntityPanel {
  const { game } = ctx;
  let last: EntityView | null = null;

  // ───────── header ─────────
  const tile = icon('cube', 20, 'e-ico');
  const title = h('h2', { class: 'e-title' });
  const sub = h('div', { class: 'e-sub' });
  const locate = iconButton('pin', 'Show on the map', 'Fly the camera to it', () => {
    if (last) game.flyTo(last.position.x, last.position.y);
  });
  const close = iconButton('close', 'Close inspector', 'Deselect (Esc)', () => hooks.onClose());
  const head = h('header', { class: 'e-head' }, h('span', { class: 'e-tile' }, tile), h('div', { class: 'e-who' }, title, sub), h('div', { class: 'p-actions' }, locate, close));
  const purpose = h('p', { class: 'e-purpose' });

  const workerChip = (n: string) =>
    h(
      'button',
      {
        type: 'button',
        class: 'chip worker',
        'data-tip': 'Look at this person',
        'aria-label': `Look at ${n}`,
        onClick: () => {
          // names are unique within a world, so the chip can find its person
          const p = game.world.persons.find((x) => x.name === n);
          if (p) hooks.onNavigate(p.id);
        },
      },
      icon('person', 13),
      n,
    );

  // ───────── work-in-progress card (construction sites) ─────────
  const siteBarVal = h('span', { class: 'site-pct num' });
  const siteBar = makeBar('site-bar');
  const matBox = h('div', { class: 'mats' });
  const workers = h('div', { class: 'workers' });
  const workersLab = h('span', { class: 'cap' }, 'Working now');
  const siteWait = h('p', { class: 'site-wait', hidden: true });
  const siteCard = h(
    'section',
    { class: 'site-card', 'aria-label': 'Construction progress', hidden: true },
    h('div', { class: 'site-top' }, h('span', { class: 'cap' }, 'Building progress'), siteBarVal),
    siteBar.el,
    siteWait,
    h('div', { class: 'cap site-mh' }, 'Materials supplied'),
    matBox,
    h('div', { class: 'site-w' }, workersLab, workers),
  );
  const matList = new KeyedList<EntityView['bars'][number], MatRow>(
    matBox,
    (b) => {
      const kind = b.label.replace(/ supplied$/, '') as ItemKind;
      const ico = icon(ITEM_LABEL[kind] ? itemIconName(kind) : 'cube', 15, 'mat-ico');
      ico.style.color = legible(ITEM_COLORS[kind] ?? '#b98a4f', 0.28);
      const name = h('span', { class: 'mat-n' }, cap(ITEM_LABEL[kind] ?? kind));
      const val = h('span', { class: 'mat-v num' });
      const bar = makeBar('thin');
      return { el: h('div', { class: 'mat' }, ico, h('div', { class: 'mat-main' }, h('div', { class: 'mat-top' }, name, val), bar.el)), ico, name, val, bar };
    },
    (r, b) => {
      setText(r.val, `${Math.round(b.value)} / ${Math.round(b.max)}`);
      r.bar.set(b.max > 0 ? b.value / b.max : 0, b.value >= b.max ? 'var(--good)' : TONE.mat);
      toggle(r.el, 'is-done', b.value >= b.max);
    },
  );
  const workerList = new KeyedList<string, { el: HTMLElement }>(
    workers,
    (n) => ({ el: workerChip(n) }),
    () => {},
  );

  // ───────── workshop card (the batch under way) ─────────
  const shopState = h('span', { class: 'shop-state' });
  const shopPct = h('span', { class: 'site-pct num shop-pct' });
  const shopBar = makeBar('site-bar');
  const shopNote = h('p', { class: 'shop-note' });
  const yieldChips = h('div', { class: 'inv-chips' });
  const yieldBox = h('div', { class: 'shop-yield' }, h('span', { class: 'cap' }, 'Will make'), yieldChips);
  const yieldList = new KeyedList<{ kind: ItemKind | 'cart'; n: number }, ItemChipHandle | { el: HTMLElement; set(n: number): void }>(
    yieldChips,
    (it) => {
      if (it.kind === 'cart') {
        const count = h('span', { class: 'ic-n num' });
        const el = h('span', { class: 'chip item-chip', 'data-tip': 'a handcart' }, icon('cart', 15), count);
        return { el, set: (n: number) => setText(count, `×${n}`) };
      }
      return itemChip(it.kind, it.n);
    },
    (c, it) => c.set(it.n),
  );
  const shopWorkers = h('div', { class: 'workers' });
  const shopWorkersLab = h('span', { class: 'cap' }, 'At work');
  const shopWorkerList = new KeyedList<string, { el: HTMLElement }>(
    shopWorkers,
    (n) => ({ el: workerChip(n) }),
    () => {},
  );
  const madeChips = h('div', { class: 'inv-chips' });
  const madeBox = h('div', { class: 'shop-made' }, h('span', { class: 'cap' }, 'Made here so far'), madeChips);
  const madeList = new KeyedList<{ kind: ItemKind; n: number }, ItemChipHandle>(
    madeChips,
    (it) => itemChip(it.kind, it.n),
    (c, it) => c.set(it.n),
  );
  const canChips = h('div', { class: 'inv-chips' });
  const canBox = h('div', { class: 'shop-can' }, h('span', { class: 'cap' }, 'Can make here'), canChips);
  const canList = new KeyedList<{ id: string; label: string; tip: string }, { el: HTMLElement }>(
    canChips,
    (r) => ({ el: h('span', { class: 'chip recipe-chip', 'data-tip': `${cap(r.label)}\n${r.tip}` }, r.label) }),
    () => {},
  );
  const shopCard = h(
    'section',
    { class: 'site-card shop-card', 'aria-label': 'Workshop', hidden: true },
    h('div', { class: 'site-top' }, shopState, shopPct),
    shopBar.el,
    shopNote,
    yieldBox,
    h('div', { class: 'site-w' }, shopWorkersLab, shopWorkers),
    madeBox,
    canBox,
  );

  // ───────── generic parts ─────────
  const rowsBox = h('dl', { class: 'e-rows' });
  const rowList = new KeyedList<[string, string], RowComp>(
    rowsBox,
    () => {
      const k = h('dt');
      const v = h('dd');
      return { el: h('div', { class: 'e-row' }, k, v), k, v };
    },
    (c, r) => {
      setText(c.k, r[0]);
      setText(c.v, r[1]);
    },
  );
  const barsBox = h('div', { class: 'e-bars' });
  const barList = new KeyedList<EntityView['bars'][number], BarRow>(
    barsBox,
    () => {
      const label = h('span', { class: 'ebar-l' });
      const val = h('span', { class: 'ebar-v num' });
      const bar = makeBar();
      return { el: h('div', { class: 'ebar' }, h('div', { class: 'ebar-top' }, label, val), bar.el), label, val, bar };
    },
    (r, b) => {
      setText(r.label, cap(b.label));
      setText(r.val, barText(b.label, b.value, b.max));
      r.bar.set(b.max > 0 ? b.value / b.max : 0, TONE[b.tone ?? ''] ?? 'var(--info)');
    },
  );
  const itemsChips = h('div', { class: 'inv-chips' });
  const itemsHead = h('div', { class: 'cap e-items-h' }, 'Contents');
  const itemList = new KeyedList<{ kind: ItemKind; n: number }, ItemChipHandle>(
    itemsChips,
    (it) => itemChip(it.kind, it.n),
    (c, it) => c.set(it.n),
  );
  const itemsWrap = h('div', { class: 'e-items' }, itemsHead, itemsChips);
  const notesBox = h('div', { class: 'e-notes' });
  const noteList = new KeyedList<string, { el: HTMLElement }>(
    notesBox,
    (t) => ({ el: h('p', { class: 'e-note' }, icon('info', 13, 'note-ico'), h('span', null, t)) }),
    () => {},
  );

  // ───────── titled blocks supplied by the simulation (workplaces, sites, carts) ─────────
  const sectionsBox = h('div', { class: 'e-secs' });
  const makeSecComp = (title: string): SecComp => {
    const id = `ent:${title}`;
    const handle = makeSection({
      id,
      title,
      open: ctx.state.sections[id] ?? SECTION_OPEN.has(title),
      onToggle: (open) => {
        ctx.state.sections[id] = open;
        ctx.saveState();
      },
    });
    const rowsEl = h('dl', { class: 'e-rows' });
    const rows = new KeyedList<[string, string], RowComp>(
      rowsEl,
      () => {
        const k = h('dt');
        const v = h('dd');
        return { el: h('div', { class: 'e-row' }, k, v), k, v };
      },
      (c, r) => {
        setText(c.k, r[0]);
        setText(c.v, r[1]);
      },
    );
    const barsEl = h('div', { class: 'e-bars' });
    const bars = new KeyedList<EntityView['bars'][number], BarRow>(
      barsEl,
      () => {
        const label = h('span', { class: 'ebar-l' });
        const val = h('span', { class: 'ebar-v num' });
        const bar = makeBar();
        return { el: h('div', { class: 'ebar' }, h('div', { class: 'ebar-top' }, label, val), bar.el), label, val, bar };
      },
      (r, b) => {
        setText(r.label, cap(b.label));
        setText(r.val, barText(b.label, b.value, b.max));
        r.bar.set(b.max > 0 ? b.value / b.max : 0, TONE[b.tone ?? ''] ?? 'var(--info)');
      },
    );
    const chipsEl = h('div', { class: 'inv-chips' });
    const items = new KeyedList<{ kind: ItemKind; n: number }, ItemChipHandle>(
      chipsEl,
      (it) => itemChip(it.kind, it.n),
      (c, it) => c.set(it.n),
    );
    const notesEl = h('div', { class: 'e-notes' });
    const notes = new KeyedList<string, { el: HTMLElement }>(
      notesEl,
      (t) => ({ el: h('p', { class: 'e-note' }, icon('info', 13, 'note-ico'), h('span', null, t)) }),
      () => {},
    );
    handle.body.append(rowsEl, barsEl, chipsEl, notesEl);
    return {
      el: handle.el,
      handle,
      update(sec) {
        const r = sec.rows ?? [];
        rows.sync(r, (x) => x[0]);
        setHidden(rowsEl, r.length === 0);
        const b = sec.bars ?? [];
        bars.sync(b, (x) => x.label);
        setHidden(barsEl, b.length === 0);
        const it = sec.items ?? [];
        items.sync(it, (x) => x.kind);
        setHidden(chipsEl, it.length === 0);
        const n = sec.notes ?? [];
        notes.sync(n, (x) => x);
        setHidden(notesEl, n.length === 0);
      },
    };
  };
  const secList = new KeyedList<Section, SecComp>(
    sectionsBox,
    (sec) => makeSecComp(sec.title),
    (c, sec) => c.update(sec),
  );

  const body = h('div', { class: 'e-body scroll' }, purpose, siteCard, shopCard, rowsBox, barsBox, itemsWrap, notesBox, sectionsBox);
  const el = h('div', { class: 'insp-entity' }, head, body);

  // ───────── workshop ─────────
  function recentWorkers(world: World, b: Building): string[] {
    const ops = b.ops;
    if (!ops) return [];
    const names: string[] = [];
    for (const k of Object.keys(ops.present)) {
      if (world.tick - ops.present[Number(k)] > 40) continue;
      const e = world.byId.get(Number(k));
      if (e && e.ent === 'person') names.push((e as Person).name);
    }
    return names;
  }

  /** the batch under way, as a card. Returns false when this building has nothing to show (a plain home, a store). */
  function updateShop(b: Building, v: EntityView, world: World): boolean {
    const ops = b.ops;
    if (!SHOW_WORKSHOP_CARD || !ops || b.type === 'well') return false; // a well makes nothing: its card is the one the simulation describes
    if (v.rows.some((r) => r[0] === 'Making')) return false;
    const job = ops.job;
    const r = job ? RECIPE_BY_ID[job.recipe] : undefined;
    const notes: string[] = [];
    let state = 'Idle';
    let frac = 0;
    let pctText = '';
    let barColor = 'var(--muted)';
    if (job && r) {
      state = r.doing;
      if (job.phase === 'work') {
        frac = job.total > 0 ? job.progress / job.total : 0;
        pctText = `${Math.round(frac * 100)}%`;
        barColor = 'var(--good)';
        if (!recentWorkers(world, b).length) notes.push('Nobody is working on it right now.');
        if (r.burn > 0) notes.push(`When the work is done it burns for about ${secondsText(r.burn)} with nobody needed.`);
      } else if (job.phase === 'burn') {
        // the fire does the work now: the bar shows how far it has burned
        frac = job.burnTotal > 0 ? 1 - Math.max(0, job.burnLeft) / job.burnTotal : 1;
        pctText = `${Math.round(frac * 100)}%`;
        barColor = TONE.fire;
        state = `${r.doing} (burning)`;
        notes.push(`The fire is burning on its own; about ${secondsText(Math.max(0, job.burnLeft))} to go. Nobody has to stand there.`);
      } else {
        frac = 1;
        pctText = 'done';
        barColor = 'var(--accent)';
        notes.push(job.blocked || 'Finished, and waiting for room in the store.');
      }
    } else {
      if (ops.lastBlocker) notes.push(`Not running: ${ops.lastBlocker}.`);
      else if (ops.batches > 0) notes.push(`Last used ${agoText(world, ops.lastRun)}.`);
      else notes.push('Nothing has been made here yet.');
    }
    if (b.type === 'granary') {
      const neglected = world.tick - Math.max(ops.tended, b.builtTick) >= GRANARY_TEND_EVERY;
      notes.push(neglected ? 'The bins have not been tended for days: grain here spoils faster than in a store.' : `The bins were last turned and aired ${agoText(world, Math.max(ops.tended, b.builtTick))}.`);
    }
    if (b.type === 'quarry') {
      const dep = ops.depositId ? world.byId.get(ops.depositId) : undefined;
      if (dep && dep.ent === 'source') notes.push(dep.amount > 0 ? `The outcrop beside it still holds ${dep.amount} stone.` : 'The outcrop beside it is worked out.');
    }
    if (b.type === 'hall') {
      const meal = world.meals.find((m) => m.placeId === b.id && m.status !== 'done' && m.status !== 'cancelled');
      if (meal) notes.push(`A shared meal is ${meal.status === 'eating' ? 'being eaten' : meal.status === 'gathering' ? 'gathering' : 'being invited to'}: ${meal.arrived.length} of ${meal.accepted.length || meal.invited.length} have come.`);
      else notes.push('No meal is planned here at the moment.');
    }

    setText(shopState, state);
    setText(shopPct, pctText);
    shopBar.set(frac, barColor);
    setText(shopNote, notes.join(' '));
    setHidden(shopNote, notes.length === 0);

    // what the running batch will make
    const yields: { kind: ItemKind | 'cart'; n: number }[] = [];
    if (r) {
      for (const k of Object.keys(r.outputs) as ItemKind[]) if ((r.outputs[k] ?? 0) > 0) yields.push({ kind: k, n: r.outputs[k] ?? 0 });
      if (r.fromDeposit) yields.push({ kind: r.fromDeposit.item, n: r.fromDeposit.n });
      if (r.toolOut) yields.push({ kind: r.toolOut.kind, n: 1 });
      if (r.cartOut) yields.push({ kind: 'cart', n: 1 });
    }
    yieldList.sync(yields, (y) => y.kind);
    setHidden(yieldBox, yields.length === 0);

    const names = recentWorkers(world, b);
    shopWorkerList.sync(names, (n) => n);
    setHidden(shopWorkers, names.length === 0);
    setText(shopWorkersLab, names.length ? 'At work' : 'Nobody at work');

    const made: { kind: ItemKind; n: number }[] = [];
    for (const k of Object.keys(ops.produced) as ItemKind[]) if ((ops.produced[k] ?? 0) > 0) made.push({ kind: k, n: ops.produced[k] ?? 0 });
    madeList.sync(made, (m) => m.kind);
    setHidden(madeBox, made.length === 0);

    const can = recipesAt(b.type).map((x) => ({ id: x.id, label: x.label, tip: x.benefit }));
    canList.sync(can, (c) => c.id);
    setHidden(canBox, can.length === 0);
    return true;
  }

  function update(v: EntityView, world: World): void {
    last = v;
    const e = world.byId.get(v.id);
    setIcon(tile, iconFor(e), 20);
    el.dataset.kind = v.kind;
    setText(title, v.title);
    setText(sub, v.subtitle);
    const hasWhy = !!(v.sections && v.sections.some((x) => x.title === 'What it is for' || x.title === 'The project'));
    const why = hasWhy ? '' : purposeOf(e);
    setText(purpose, why);
    setHidden(purpose, !why);

    const isSite = v.kind === 'site';
    setHidden(siteCard, !isSite);
    setHidden(barsBox, isSite);

    let rows = v.rows;
    let bars = v.bars;
    let notes = v.notes;
    let shop = false;
    if (e && e.ent === 'building') shop = updateShop(e, v, world);
    setHidden(shopCard, !shop);

    // titled blocks from the simulation: the flat summary above them keeps only what they do not repeat
    let secs: Section[] = v.sections ?? [];
    const withSecs = secs.length > 0;
    if (withSecs) {
      if (e && e.ent === 'site') {
        secs = secs.filter((x) => x.title !== 'Work').map((x) => (x.title === 'Materials' ? { title: x.title, notes: x.notes } : x));
      } else if (e && e.ent === 'building') {
        bars = bars.filter((x) => !/^(batch|fire)$/i.test(x.label));
        // the workshop card above already shows the batch bars; the block keeps its rows and notes
        secs = secs.map((x) => (x.title === 'Under way' && shop ? { ...x, bars: undefined } : x));
      } else if (e && e.ent === 'cart') {
        rows = [];
        bars = [];
      }
    }
    secList.sync(secs, (x) => x.title);
    setHidden(sectionsBox, secs.length === 0);

    if (e && e.ent === 'cart' && !withSecs) {
      // how full and how worn the cart is, read from the cart itself
      const c: Cart = e;
      const extra: EntityView['bars'] = [];
      if (!bars.some((b) => /load/i.test(b.label))) extra.push({ label: 'Load', value: weightOf(c.load), max: c.cap, tone: weightOf(c.load) >= c.cap - 0.5 ? 'warn' : 'work' });
      if (!bars.some((b) => /wear/i.test(b.label))) extra.push({ label: 'Wear', value: c.wear, max: 100, tone: c.wear > 70 ? 'bad' : c.wear > 40 ? 'warn' : 'ok' });
      bars = [...extra, ...bars];
      const owner = world.households.find((x) => x.id === c.ownerHh);
      if (!rows.some((r) => r[0] === 'Owner')) rows = [...rows, ['Owner', owner ? `${owner.name} household` : 'nobody in particular']];
      if (!rows.some((r) => /age|built/i.test(r[0]))) rows = [...rows, ['Built', agoText(world, c.builtTick)]];
      rows = rows.filter((r) => r[0] !== 'Wear');
    }

    if (isSite) {
      const s = e && e.ent === 'site' ? (e as Site) : null;
      const prog = bars[0];
      const mats = bars.slice(1);
      if (prog) {
        const f = prog.max > 0 ? prog.value / prog.max : 0;
        siteBar.set(f, 'var(--good)');
        setText(siteBarVal, `${Math.round(f * 100)}%`);
      }
      // the work stops when it has used up what has been delivered: say so, and what is missing
      const missing = mats.filter((m) => m.value < m.max);
      const capped = s ? s.work >= s.workTotal * Math.min(1, 0.06 + (mats.length ? Math.min(...mats.map((m) => (m.max > 0 ? m.value / m.max : 1))) : 1)) - 1e-6 && s.work < s.workTotal - 1e-6 : false;
      if (capped && missing.length) {
        setText(siteWait, `Work has paused for lack of ${missing.map((m) => countNoun(m.label.replace(/ supplied$/, ''), Math.ceil(m.max - m.value))).join(', ')}.`);
        setHidden(siteWait, false);
      } else setHidden(siteWait, true);
      matList.sync(mats, (b) => b.label);
      const working = v.rows.find((r) => r[0] === 'Working now');
      const names = working && working[1] !== 'nobody' ? working[1].split(', ').filter(Boolean) : [];
      workerList.sync(names, (n) => n);
      setHidden(workers, names.length === 0);
      setText(workersLab, names.length ? 'Working now' : 'Nobody working right now');
      rows = rows.filter((r) => r[0] !== 'Working now');
    } else {
      barList.sync(bars, (b) => b.label);
    }
    rowList.sync(rows, (r) => r[0]);
    setHidden(rowsBox, rows.length === 0);

    const flatItems = withSecs ? [] : v.items;
    itemList.sync(flatItems, (it) => it.kind);
    setText(itemsHead, v.kind === 'site' ? 'Delivered, not yet used' : v.kind === 'pile' ? 'Lying here' : v.kind === 'cart' ? 'On the cart' : v.kind === 'building' && e && e.ent === 'building' && e.ops ? 'In the store' : 'Contents');
    setHidden(itemsWrap, flatItems.length === 0);

    // the simulation's own notes for a building (its blurb, being rebuilt) are said above or in a block when it sends blocks
    if (withSecs && e && (e.ent === 'building' || e.ent === 'site')) notes = [];
    if (!withSecs && e && e.ent === 'building' && e.upgrading) notes = [...notes, 'It is being rebuilt in place as a house: the new walls rise round the old ones.'];
    noteList.sync(notes, (t) => t);
    setHidden(notesBox, notes.length === 0);
  }

  return {
    el,
    update,
    reset() {
      last = null;
      body.scrollTop = 0;
    },
  };
}
