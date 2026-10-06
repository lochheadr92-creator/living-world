// The person view of the inspector. The "What are they up to?" card is the heart of it; needs and belongings are
// quick glances; everything else lives in the collapsible sections (person_sections.ts), which are only filled in
// while they are open. All content comes from describePerson() view-models; the DOM is built once and updated in place.
import { DAYS_PER_YEAR, ITEM_LABEL, NEED_KEYS, isToolKind } from '../sim/constants';
import type { ItemKind, NeedKey } from '../sim/types';
import type { NeedView, PersonView } from '../sim/inspect';
import type { ToolView } from '../sim/inspect_work';
import { HOUSEHOLD_COLORS, ITEM_COLORS, NEED_COLORS } from '../render/palette';
import { cap, h, KeyedList, legible, round1, setBool, setHidden, setState, setText, setVar, toggle } from './dom';
import { icon, itemIconName, needIconName, type IconName } from './icons';
import { iconButton, itemChip, makeBar, type BarHandle, type ItemChipHandle } from './widgets';
import { createPersonSections } from './person_sections';
import type { UICtx } from './context';

export interface PersonPanel {
  el: HTMLElement;
  update(v: PersonView): void;
  /** the opportunities audit is the costly part of describePerson, so it is only requested while that section is open */
  wantsOpportunities(): boolean;
  syncFollow(): void;
  /** called when a different person is selected: snap bars instead of animating from the previous person */
  reset(): void;
}

export interface PersonHooks {
  onClose(): void;
  /** a section was opened or closed (the shell refreshes immediately so it fills in) */
  onSectionToggle(): void;
  /** the user followed a link inside the panel to another person (the shell keeps a way back) */
  onNavigate(id: number): void;
}

function moodWord(m: number): string {
  if (m < 22) return 'Miserable';
  if (m < 40) return 'Uneasy';
  if (m < 60) return 'Okay';
  if (m < 80) return 'Content';
  return 'Cheerful';
}

function healthTone(v: number): string {
  return v < 35 ? 'var(--danger)' : v < 65 ? 'var(--warn)' : 'var(--good)';
}

function moodTone(v: number): string {
  return v < 30 ? 'var(--danger)' : v < 50 ? 'var(--warn)' : v < 70 ? 'var(--accent)' : 'var(--good)';
}

/** "Nothing in the way." reads as good news, anything else as a snag */
function isClear(stopping: string): boolean {
  return /^(nothing|almost rested)/i.test(stopping);
}

/** colour the "last attempt" line by how it went */
function outcomeTone(last: string): string {
  if (/→ success/.test(last)) return 'ok';
  if (/→ failed/.test(last)) return 'bad';
  if (/→ (interrupted|partial)/.test(last)) return 'meh';
  return 'none';
}

const NEED_LABELS: Record<NeedKey, string> = { hunger: 'Food', thirst: 'Water', energy: 'Energy', warmth: 'Warmth', safety: 'Safety', social: 'Company' };

interface ToolComp {
  el: HTMLElement;
  wear: HTMLElement;
}

function itemIconNameOf(kind: ItemKind): IconName {
  return itemIconName(kind);
}

/** how worn a tool is, in words */
function wearWord(w: number): string {
  return w < 12 ? 'like new' : w < 40 ? 'lightly worn' : w < 70 ? 'well worn' : w < 90 ? 'dull and worn' : 'nearly broken';
}

/** the tooltip for one tool: its name, how worn it is, and where it came from (the simulation words the loan) */
function toolTip(t: ToolView): string {
  const lines = [cap(t.label), `${wearWord(t.wear)} (${Math.round(t.wear)}% worn)`];
  if (t.loan) lines.push(cap(t.loan));
  return lines.join('\n');
}

interface NeedCell {
  el: HTMLElement;
  set(n: NeedView): void;
}

function makeNeedCell(key: NeedKey, label: string): NeedCell {
  const val = h('span', { class: 'need-val num' });
  const bar: BarHandle = makeBar();
  setVar(bar.fill, '--bar', NEED_COLORS[key] ?? '#cccccc');
  const ico = icon(needIconName(key), 14, 'need-ico');
  ico.style.color = NEED_COLORS[key] ?? '#cccccc';
  const el = h(
    'div',
    { class: 'need', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': label },
    h('div', { class: 'need-top' }, ico, h('span', { class: 'need-lab' }, label), val),
    bar.el,
  );
  return {
    el,
    set(n) {
      setText(val, String(Math.round(n.value)));
      bar.set(n.value / 100);
      setState(el, 'is-', n.state);
      el.setAttribute('aria-valuenow', String(Math.round(n.value)));
      el.setAttribute('aria-valuetext', `${n.label} ${Math.round(n.value)} of 100${n.state === 'ok' ? '' : `, ${n.state}`}`);
    },
  };
}

export function createPersonPanel(ctx: UICtx, hooks: PersonHooks): PersonPanel {
  const { game } = ctx;
  let last: PersonView | null = null;
  let snapTimer: number | undefined;

  // ───────── header ─────────
  const avatar = h('div', { class: 'avatar', 'aria-hidden': 'true' });
  const nameEl = h('h2', { class: 'p-name' });
  const expecting = h('span', { class: 'badge t-info', hidden: true }, 'expecting');
  const stageEl = h('span', { class: 'p-stage' });
  const hhDot = h('i', { class: 'hh-dot' });
  const hhName = h('span', { class: 'hh-name' });
  const hhChip = h('span', { class: 'hh-chip', 'data-tip': 'Their household. People of one household share a home and look after each other first.' }, hhDot, hhName);
  const homeEl = h('div', { class: 'p-home' });
  const followLabel = h('span', null, 'Follow');
  const followBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn follow',
      'aria-pressed': 'false',
      'aria-label': 'Follow this person with the camera',
      'data-tip': 'Keep the camera on them (F)',
      onClick: () => game.setFollow(!game.following),
    },
    icon('target', 14),
    followLabel,
  );
  const locateBtn = iconButton('pin', 'Show on the map', 'Fly the camera to them', () => {
    if (last) game.flyTo(last.position.x, last.position.y);
  });
  const closeBtn = iconButton('close', 'Close inspector', 'Deselect (Esc)', () => hooks.onClose());
  const head = h(
    'header',
    { class: 'p-head' },
    avatar,
    h('div', { class: 'p-nameline' }, nameEl, expecting),
    h('div', { class: 'p-actions' }, followBtn, locateBtn, closeBtn),
    h('div', { class: 'p-meta' }, stageEl, hhChip),
    homeEl,
  );

  // ───────── vitals ─────────
  const moodBar = makeBar('thin');
  const healthBar = makeBar('thin');
  const moodTxt = h('span', { class: 'vital-v' });
  const healthTxt = h('span', { class: 'vital-v num' });
  const vitals = h(
    'div',
    { class: 'vitals' },
    h('div', { class: 'vital' }, h('div', { class: 'vital-top' }, h('span', { class: 'cap' }, 'Mood'), moodTxt), moodBar.el),
    h('div', { class: 'vital' }, h('div', { class: 'vital-top' }, h('span', { class: 'cap' }, 'Health'), healthTxt), healthBar.el),
  );

  // ───────── needs ─────────
  const needCells = NEED_KEYS.map((k) => ({ key: k, cell: makeNeedCell(k, NEED_LABELS[k]) }));
  const needsEl = h('div', { class: 'needs', role: 'group', 'aria-label': 'Needs' }, needCells.map((n) => n.cell.el));

  // ───────── inventory ─────────
  const invChips = h('div', { class: 'inv-chips' });
  const invList = new KeyedList<{ kind: ItemKind; n: number }, ItemChipHandle>(
    invChips,
    (it) => itemChip(it.kind, it.n),
    (c, it) => c.set(it.n),
  );
  const invEmpty = h('span', { class: 'inv-empty' }, 'nothing');
  const carryBar = makeBar('thin');
  const carryTxt = h('span', { class: 'carry-txt num' });
  // the equipment they hold: one small icon each, worn ones paler with a thin bar beneath
  const toolChips = h('div', { class: 'tool-chips' });
  const toolsEmpty = h('span', { class: 'inv-empty' }, 'none');
  const toolList = new KeyedList<ToolView, ToolComp>(
    toolChips,
    (t) => {
      const wear = h('i');
      const kind = t.kind as ItemKind;
      const ico = icon(kind in ITEM_LABEL ? itemIconNameOf(kind) : 'hammer', 17, 'tool-ico');
      ico.style.color = legible(ITEM_COLORS[kind] ?? '#c8c8c0', 0.34);
      const el = h('span', { class: 'tool', role: 'img' }, ico, h('span', { class: 'tool-wear' }, wear));
      return { el, wear };
    },
    (c, t) => {
      const w = Math.max(0, Math.min(100, t.wear));
      c.wear.style.width = `${100 - w}%`;
      setVar(c.wear, '--w', w < 40 ? 'var(--good)' : w < 70 ? 'var(--warn)' : 'var(--danger)');
      toggle(c.el, 'is-iron', t.tier === 1);
      toggle(c.el, 'is-dull', w >= 70);
      c.el.style.opacity = String(1 - Math.min(0.45, w / 100 * 0.5));
      c.el.setAttribute('data-tip', toolTip(t));
      c.el.setAttribute('aria-label', `${t.label}, ${Math.round(w)} percent worn`);
    },
  );
  const inv = h(
    'div',
    { class: 'inv' },
    h('div', { class: 'inv-row' }, h('span', { class: 'cap' }, 'Carrying'), invChips, invEmpty),
    h('div', { class: 'carry', 'data-tip': 'How much they can carry. Heavy things like stone count for more.' }, carryBar.el, carryTxt),
    h('div', { class: 'inv-row' }, h('span', { class: 'cap' }, 'Tools'), toolChips, toolsEmpty),
  );

  // ───────── what are they up to? ─────────
  const speechTxt = h('span', { class: 'speech-t' });
  const speech = h('blockquote', { class: 'speech', hidden: true }, icon('thought', 14, 'speech-ico'), speechTxt);

  const makeQA = (name: IconName, question: string, cls: string) => {
    const a = h('dd', { class: 'qa-a' });
    const el = h('div', { class: `qa-row ${cls}` }, h('dt', { class: 'qa-q' }, icon(name, 15, 'qa-ico'), h('span', null, question)), a);
    return { el, a };
  };
  const qDoing = makeQA('q_doing', 'What are they doing?', 'q-doing');
  const qWhy = makeQA('q_why', 'Why did they choose it?', 'q-why');
  const qTrying = makeQA('q_goal', 'What are they trying to achieve?', 'q-trying');
  const qStopping = makeQA('q_block', 'What is stopping them?', 'q-stopping');
  const qLast = makeQA('q_last', 'What happened after their last attempt?', 'q-last');
  const taskBar = makeBar('thin task');
  const taskTxt = h('span', { class: 'task-txt num' });
  const taskRow = h('div', { class: 'task' }, taskBar.el, taskTxt);
  qDoing.el.appendChild(h('dd', { class: 'qa-task' }, taskRow));
  const upto = h(
    'section',
    { class: 'upto', 'aria-labelledby': 'lw-upto-h' },
    h('h3', { class: 'upto-h', id: 'lw-upto-h' }, 'What are they up to?'),
    speech,
    h('dl', { class: 'qa' }, qDoing.el, qWhy.el, qTrying.el, qStopping.el, qLast.el),
  );

  // ───────── collapsible sections ─────────
  const sections = createPersonSections(ctx, hooks);

  // the answer to "what are they up to?" comes first: it is the reason to open the panel. Needs and belongings are context for it.
  const body = h('div', { class: 'p-body scroll' }, vitals, upto, h('div', { class: 'cap blk-h' }, 'Needs'), needsEl, inv, sections.el);
  const el = h('div', { class: 'insp-person' }, head, body);

  // ───────── rendering ─────────
  function update(v: PersonView): void {
    last = v;

    // header
    const hex = HOUSEHOLD_COLORS[v.householdColor % HOUSEHOLD_COLORS.length];
    setText(avatar, v.name.slice(0, 1).toUpperCase());
    setVar(avatar, '--hh', hex);
    setVar(hhDot, '--hh', hex);
    setText(nameEl, v.name);
    setHidden(expecting, !v.pregnant);
    setText(stageEl, `${cap(v.stage)}, ${v.age}`);
    stageEl.title = `Age in years. A year of life takes ${v.daysPerYear ?? DAYS_PER_YEAR} days here.`;
    setText(hhName, v.household === 'none' ? 'no household' : `${v.household} household`);
    setText(homeEl, v.home === 'no home yet' ? 'No home yet' : `Home: ${v.home}`);
    syncFollow();

    // vitals
    setText(moodTxt, moodWord(v.mood));
    moodBar.set(v.mood / 100, moodTone(v.mood));
    setText(healthTxt, String(Math.round(v.health)));
    healthBar.set(v.health / 100, healthTone(v.health));

    // needs
    for (const n of needCells) {
      const nv = v.needs.find((x) => x.key === n.key);
      if (nv) n.cell.set(nv);
    }

    // inventory
    // equipment has its own row below (with its wear); the chips here are goods
    const held = v.tools ?? [];
    const toolsIn = new Map<string, number>();
    for (const t of held) toolsIn.set(t.kind, (toolsIn.get(t.kind) ?? 0) + 1);
    const goods = v.inventory.filter((it) => !(isToolKind(it.kind) && (toolsIn.get(it.kind) ?? 0) >= it.n));
    invList.sync(goods, (it) => it.kind);
    setHidden(invEmpty, goods.length > 0);
    toolList.sync(held, (t) => String(t.id));
    setHidden(toolsEmpty, held.length > 0);
    carryBar.set(v.carry.cap > 0 ? v.carry.used / v.carry.cap : 0, v.carry.used >= v.carry.cap - 0.01 ? 'var(--warn)' : 'var(--accent)');
    setText(carryTxt, `${round1(v.carry.used)} / ${v.carry.cap}`);

    // what are they up to?
    setHidden(speech, !v.speech);
    if (v.speech) setText(speechTxt, v.speech);
    setText(qDoing.a, v.qa.doing);
    setText(qWhy.a, v.qa.why);
    setText(qTrying.a, v.qa.trying);
    setText(qStopping.a, v.qa.stopping);
    setText(qLast.a, v.qa.lastAttempt);
    const clear = isClear(v.qa.stopping);
    toggle(qStopping.el, 'is-clear', clear);
    toggle(qStopping.el, 'is-snag', !clear);
    setState(qLast.el, 'o-', outcomeTone(v.qa.lastAttempt));
    const act = v.activity;
    setHidden(taskRow, !act);
    if (act) {
      const walking = act.moving;
      toggle(taskRow, 'is-walking', walking);
      taskBar.set(walking ? 1 : act.progress);
      setText(taskTxt, walking ? 'on the way' : `${Math.round(act.progress * 100)}%`);
      toggle(taskRow, 'is-blocked', !!act.blocked);
    }

    sections.update(v);
  }

  function syncFollow(): void {
    setBool(followBtn, 'aria-pressed', game.following);
    toggle(followBtn, 'is-on', game.following);
    setText(followLabel, game.following ? 'Following' : 'Follow');
  }

  return {
    el,
    update,
    wantsOpportunities: () => sections.wantsOpportunities(),
    syncFollow,
    reset() {
      last = null;
      sections.reset();
      body.scrollTop = 0;
      el.classList.add('snap');
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => el.classList.remove('snap'), 120);
    },
  };
}
