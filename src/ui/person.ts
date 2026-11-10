// The person view of the inspector, at two depths.
//
// The COMPACT CARD is the normal surface: it answers "what are they doing and why?" at a glance: name, life stage and household;
// a one-line status; the current action with its progress; why it was chosen; where they are going or what comes next; the
// knowledge that choice rests on, when that is hearsay or old; the needs that are pressing; the carried goods that matter to the
// action; and how the last attempt ended. Follow, centre and "Full view" are its actions.
//
// The FULL CHARACTER VIEWER opens from the card and is organised into six collapsible sections: Now, Plans and choices, What they
// know, People and relationships, Recent history, Household and character (person_sections.ts builds their blocks). A section's
// body is only filled while it is open, and long lists collapse behind "Show all".
//
// All content comes from describePerson() view-models (sim/inspect.ts, sim/inspect_observer.ts); the DOM is built once and updated
// in place. Nothing here mutates the world.
import { DAYS_PER_YEAR, ITEM_LABEL, NEED_KEYS, isToolKind } from '../sim/constants';
import type { ItemKind, NeedKey } from '../sim/types';
import type { NeedView, PersonView } from '../sim/inspect';
import type { ToolView } from '../sim/inspect_work';
import { HOUSEHOLD_COLORS, ITEM_COLORS, NEED_COLORS } from '../render/palette';
import { cap, h, KeyedList, legible, round1, setBool, setHidden, setState, setText, setVar, toggle } from './dom';
import { icon, itemIconName, needIconName, type IconName } from './icons';
import { iconButton, itemChip, makeBar, makeSection, type BarHandle, type ItemChipHandle, type SectionHandle } from './widgets';
import { createCharacterBlock, createDebugBlock, createHistoryBlock, createKnowledgeBlock, createPeopleBlock, createPlansBlock } from './person_sections';
import { createPersonSocial } from './person_social';
import type { UICtx } from './context';

export type PersonDepth = 'card' | 'full';

export interface PersonPanel {
  el: HTMLElement;
  update(v: PersonView): void;
  /** the opportunities audit is the costly part of describePerson, so it is only requested while that disclosure is open */
  wantsOpportunities(): boolean;
  syncFollow(): void;
  /** called when a different person is selected: snap bars instead of animating from the previous person */
  reset(): void;
  depth(): PersonDepth;
  setDepth(d: PersonDepth): void;
}

export interface PersonHooks {
  onClose(): void;
  /** a section was opened or closed (the shell refreshes immediately so it fills in) */
  onSectionToggle(): void;
  /** the user followed a link inside the panel to another person (the shell keeps a way back) */
  onNavigate(id: number): void;
  /** the depth changed (the shell resizes the inspector) */
  onDepth(depth: PersonDepth): void;
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
    { class: 'need', role: 'meter', tabindex: 0, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': label },
    h('span', { class: 'need-label' }, label),
    h('div', { class: 'need-top' }, ico, val),
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
      // The visible label also works on touch; keyboard focus reveals the detailed state.
      el.setAttribute('data-tip', `${label}: ${Math.round(n.value)} of 100${n.state === 'ok' ? '' : ` (${n.state})`}`);
    },
  };
}

const SECTION_DEFAULT: Record<string, boolean> = { now: true, plans: false, know: false, people: false, history: false, character: false, debug: true };

export function createPersonPanel(ctx: UICtx, hooks: PersonHooks): PersonPanel {
  const { game } = ctx;
  let last: PersonView | null = null;
  let snapTimer: number | undefined;
  let depth: PersonDepth = ctx.state.personDepth === 'full' ? 'full' : 'card';

  // ───────── header ─────────
  const avatar = h('div', { class: 'avatar', 'aria-hidden': 'true' });
  const nameEl = h('h2', { class: 'p-name' });
  const expecting = h('span', { class: 'badge t-info', hidden: true }, 'expecting');
  const stageEl = h('span', { class: 'p-stage' });
  const hhDot = h('i', { class: 'hh-dot' });
  const hhName = h('span', { class: 'hh-name' });
  const hhChip = h('span', { class: 'hh-chip', 'data-tip': 'Their household. People of one household share a home and look after each other first.' }, hhDot, hhName);
  const followLabel = h('span', null, 'Follow');
  const followBtn = h(
    'button',
    { type: 'button', class: 'btn follow', 'aria-pressed': 'false', 'aria-label': 'Follow this person with the camera', 'data-tip': 'Keep the camera on them (F)', onClick: () => game.setFollow(!game.following) },
    icon('target', 14),
    followLabel,
  );
  const locateBtn = iconButton('pin', 'Centre on them', 'Centre the map on them', () => {
    if (last) game.flyTo(last.position.x, last.position.y);
  });
  const depthBtn = iconButton('users', 'Open the full character view', 'Full view: plans, knowledge, people, history', () => setDepth(depth === 'card' ? 'full' : 'card'), { cls: 'depth-btn' });
  const closeBtn = iconButton('close', 'Close inspector', 'Deselect (Esc)', () => hooks.onClose());
  const head = h(
    'header',
    { class: 'p-head' },
    avatar,
    h('div', { class: 'p-nameline' }, nameEl, expecting),
    h('div', { class: 'p-actions' }, followBtn, locateBtn, depthBtn, closeBtn),
    h('div', { class: 'p-meta' }, stageEl, hhChip),
  );

  // ───────── the status line ─────────
  const statusText = h('span', { class: 'status-t' });
  const statusEl = h('div', { class: 'status', role: 'status' }, h('i', { class: 'status-dot' }), statusText);

  // ───────── what are they up to? (one block, shown on the card and inside Now) ─────────
  const speechTxt = h('span', { class: 'speech-t' });
  const speech = h('blockquote', { class: 'speech', hidden: true }, icon('thought', 14, 'speech-ico'), speechTxt);
  const makeQA = (name: IconName, question: string, cls: string) => {
    const a = h('dd', { class: 'qa-a' });
    const q = h('span', null, question);
    const el = h('div', { class: `qa-row ${cls}` }, h('dt', { class: 'qa-q' }, icon(name, 15, 'qa-ico'), q), a);
    return { el, a, q };
  };
  const qDoing = makeQA('q_doing', 'What are they doing?', 'q-doing');
  const qWhy = makeQA('q_why', 'Why did they choose it?', 'q-why');
  const qIntent = makeQA('route', 'Where to, or what next?', 'q-intent');
  const intentCentre = iconButton('pin', 'Centre the map on that place', 'Show the place on the map', () => {
    if (last?.intent) game.flyTo(last.intent.x, last.intent.y);
  }, { size: 13, cls: 'sm intent-centre' });
  qIntent.el.appendChild(h('dd', { class: 'qa-prov' }, intentCentre));
  const provEl = h('dd', { class: 'qa-a prov-cue', hidden: true });
  qIntent.el.appendChild(provEl);
  const qTrying = makeQA('q_goal', 'What are they trying to achieve?', 'q-trying');
  const qStopping = makeQA('q_block', 'What is stopping them?', 'q-stopping');
  const qLast = makeQA('q_last', 'How did the last attempt end?', 'q-last');
  const taskBar = makeBar('thin task');
  const taskTxt = h('span', { class: 'task-txt num' });
  const taskRow = h('div', { class: 'task' }, taskBar.el, taskTxt);
  qDoing.el.appendChild(h('dd', { class: 'qa-task' }, taskRow));
  const uptoH = h('h3', { class: 'upto-h', id: 'lw-upto-h' }, 'What are they up to?');
  const upto = h('section', { class: 'upto', 'aria-labelledby': 'lw-upto-h' }, h('div', { class: 'upto-top' }, uptoH), speech, h('dl', { class: 'qa', id: 'lw-upto-qa' }, qDoing.el, qWhy.el, qIntent.el, qTrying.el, qStopping.el, qLast.el));

  // ───────── the card's own rows: pressing needs, goods that matter ─────────
  const urgentChips = h('div', { class: 'chips urgent-chips' });
  const urgentList = new KeyedList<NeedView, { el: HTMLElement; v: HTMLElement }>(
    urgentChips,
    (n) => {
      const v = h('span', { class: 'num' });
      const ico = icon(needIconName(n.key), 13);
      ico.style.color = NEED_COLORS[n.key] ?? '#ccc';
      return { el: h('span', { class: 'chip need-chip' }, ico, h('span', null, NEED_LABELS[n.key]), v), v };
    },
    (c, n) => { setText(c.v, String(Math.round(n.value))); setState(c.el, 'is-', n.state); c.el.setAttribute('data-tip', `${NEED_LABELS[n.key]} ${Math.round(n.value)} of 100, ${n.state}`); },
  );
  const urgent = h('div', { class: 'card-row', hidden: true }, h('span', { class: 'cap' }, 'Pressing'), urgentChips);
  const relChips = h('div', { class: 'inv-chips' });
  const relList = new KeyedList<{ kind: ItemKind; n: number }, ItemChipHandle>(relChips, (it) => itemChip(it.kind, it.n), (c, it) => c.set(it.n));
  const relevant = h('div', { class: 'card-row', hidden: true }, h('span', { class: 'cap' }, 'Carrying for this'), relChips);
  const openFull = h('button', { type: 'button', class: 'btn block open-full', onClick: () => setDepth('full') }, icon('users', 14), h('span', null, 'Open full character view'));
  const card = h('div', { class: 'p-card' }, statusEl, urgent, relevant, openFull);

  // ───────── Now: vitals, thoughts, needs, belongings ─────────
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
  const thoughtsList = h('div', { class: 'thought-list' });
  const thoughtsEl = h('div', { class: 'thoughts' }, h('div', { class: 'cap blk-h' }, 'On their mind'), thoughtsList);
  let thoughtsSig = '';
  const needCells = NEED_KEYS.map((k) => ({ key: k, cell: makeNeedCell(k, NEED_LABELS[k]) }));
  const needsEl = h('div', { class: 'needs', role: 'group', 'aria-label': 'Needs' }, needCells.map((n) => n.cell.el));
  const nourishmentText = h('span', { class: 'num' });
  const nourishmentBar = makeBar('thin');
  const nourishmentEl = h('div', { class: 'p-home', role: 'meter', 'aria-label': 'Stored nourishment', 'aria-valuemin': '0', title: 'From food already eaten. Pays for brief food shortages and health recovery.' }, h('div', null, 'Stored nourishment ', nourishmentText), nourishmentBar.el);
  const invChips = h('div', { class: 'inv-chips' });
  const invList = new KeyedList<{ kind: ItemKind; n: number }, ItemChipHandle>(invChips, (it) => itemChip(it.kind, it.n), (c, it) => c.set(it.n));
  const invEmpty = h('span', { class: 'inv-empty' }, 'nothing');
  const carryBar = makeBar('thin');
  const carryTxt = h('span', { class: 'carry-txt num' });
  const toolChips = h('div', { class: 'tool-chips' });
  const toolsEmpty = h('span', { class: 'inv-empty' }, 'none');
  const textileLines = h('div', { class: 'p-home', style: 'white-space:pre-line;line-height:1.5' });
  const toolList = new KeyedList<ToolView, ToolComp>(
    toolChips,
    (t) => {
      const wear = h('i');
      const kind = t.kind as ItemKind;
      const ico = icon(kind in ITEM_LABEL ? itemIconName(kind) : 'hammer', 17, 'tool-ico');
      ico.style.color = legible(ITEM_COLORS[kind] ?? '#c8c8c0', 0.34);
      const el = h('span', { class: 'tool', role: 'img', tabindex: 0 }, ico, h('span', { class: 'tool-wear' }, wear));
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
    h('div', { class: 'inv-row' }, h('span', { class: 'cap' }, 'Carrying'), invChips, invEmpty, h('div', { class: 'carry', 'data-tip': 'How much they can carry. Heavy things like stone count for more.' }, carryBar.el, carryTxt)),
    h('div', { class: 'inv-row' }, h('span', { class: 'cap' }, 'Tools'), toolChips, toolsEmpty),
    textileLines,
  );
  const uptoSlotNow = h('div', { class: 'upto-slot' });
  const nowBody = h('div', { class: 'blk' }, uptoSlotNow, vitals, thoughtsEl, h('div', { class: 'cap blk-h' }, 'Needs'), needsEl, nourishmentEl, inv);

  // ───────── the six sections ─────────
  const sectionHooks = { onSectionToggle: () => hooks.onSectionToggle(), onNavigate: (id: number) => hooks.onNavigate(id) };
  const mk = (id: string, title: string, hint: string | undefined, body: HTMLElement): SectionHandle => {
    const sec = makeSection({ id, title, hint, open: ctx.state.sections[id] ?? SECTION_DEFAULT[id] ?? false, onToggle: (open) => { ctx.state.sections[id] = open; ctx.saveState(); hooks.onSectionToggle(); } });
    sec.body.appendChild(body);
    return sec;
  };
  const plans = createPlansBlock(ctx, sectionHooks);
  const know = createKnowledgeBlock(ctx, sectionHooks);
  const social = createPersonSocial({ game, section: (id, title, hint) => makeSection({ id, title, hint, open: ctx.state.sections[id] ?? true, onToggle: (open) => { ctx.state.sections[id] = open; ctx.saveState(); hooks.onSectionToggle(); } }), onNavigate: hooks.onNavigate });
  const people = createPeopleBlock(ctx, sectionHooks, social.els);
  const history = createHistoryBlock(ctx, sectionHooks);
  const character = createCharacterBlock(ctx, sectionHooks);
  const debug = createDebugBlock();
  const secNow = mk('now', 'Now', 'What they are doing, how they are, and what they carry.', nowBody);
  const secPlans = mk('plans', 'Plans and choices', 'Their plans and how each stands, the reason for the current choice, what was passed over, and earlier decisions with their endings.', plans.el);
  const secKnow = mk('know', 'What they know', 'Only what they have seen or been told, with its source and age. It is not the same as what really exists.', know.el);
  const secPeople = mk('people', 'People and relationships', 'The conversation, meal, promises, quarrels and worries they are part of, who they asked and who asked them, and how they feel about people.', people.el);
  const secHistory = mk('history', 'Recent history', 'What happened to them and what they chose, newest first, in world time.', history.el);
  const secCharacter = mk('character', 'Household and character', 'Home, township and household record; traits, skills and the trade they settled on.', character.el);
  const secDebug = mk('debug', 'Debug · raw numbers', undefined, debug.el);
  const full = h('div', { class: 'secs p-full' }, secNow.el, secPlans.el, secKnow.el, secPeople.el, secHistory.el, secCharacter.el, secDebug.el);

  const uptoSlotCard = h('div', { class: 'upto-slot' });
  card.insertBefore(uptoSlotCard, urgent);
  const body = h('div', { class: 'p-body scroll' }, card, full);
  const el = h('div', { class: 'insp-person', 'data-depth': depth }, head, body);

  function syncDepth(): void {
    el.dataset.depth = depth;
    (depth === 'card' ? uptoSlotCard : uptoSlotNow).appendChild(upto);
    setHidden(full, depth !== 'full');
    setHidden(openFull, depth !== 'card');
    setHidden(urgent, depth !== 'card' || !last || !last.needs.some((n) => n.state !== 'ok'));
    setHidden(relevant, depth !== 'card' || !last || last.relevantItems.length === 0);
    depthBtn.setAttribute('aria-label', depth === 'card' ? 'Open the full character view' : 'Back to the compact card');
    depthBtn.setAttribute('data-tip', depth === 'card' ? 'Full view: plans, knowledge, people, history' : 'Back to the compact card');
    setBool(depthBtn, 'aria-pressed', depth === 'full');
    ctx.root.dataset.personDepth = depth;
  }
  function setDepth(d: PersonDepth): void {
    if (d === depth) return;
    depth = d;
    ctx.state.personDepth = d;
    ctx.saveState();
    syncDepth();
    body.scrollTop = 0;
    hooks.onDepth(d);
  }
  syncDepth();

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
    stageEl.title = `Age in years. A year of life takes ${DAYS_PER_YEAR} days here.`;
    setText(hhName, v.household === 'none' ? 'no household' : `${v.household} household`);
    syncFollow();

    // status
    setText(statusText, v.status.text);
    setState(statusEl, 't-', v.status.tone);

    // what are they up to?
    setHidden(speech, !v.speech);
    if (v.speech) setText(speechTxt, v.speech);
    setText(qDoing.a, v.qa.doing);
    setText(qWhy.a, v.qa.why);
    setText(qIntent.a, v.intent ? v.intent.text : v.plans.length ? v.plans.map((pl) => `${pl.detail}${pl.missing ? ` Still needs ${pl.missing}.` : ''}`).join(' · ') : v.qa.plan || 'Nothing settled on.');
    // the pin centres the map on a place worth going to; "here" with nothing named is where they already stand
    setHidden(intentCentre, !v.intent || v.intent.kind === 'none' || (v.intent.kind === 'here' && v.intent.text === 'Here'));
    setHidden(provEl, !v.provenance);
    if (v.provenance) setText(provEl, v.provenance);
    setText(qTrying.a, v.qa.trying);
    setText(qStopping.a, v.qa.stopping);
    setText(qStopping.q, v.qa.stoppingIsHistorical ? 'Last recorded blocker' : 'What is stopping them?');
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

    if (depth === 'card') {
      const pressing = v.needs.filter((n) => n.state !== 'ok').sort((a, b) => a.value - b.value);
      urgentList.sync(pressing, (n) => n.key);
      setHidden(urgent, pressing.length === 0);
      relList.sync(v.relevantItems, (it) => it.kind);
      setHidden(relevant, v.relevantItems.length === 0);
      return;
    }

    // ───── full view ─────
    if (secNow.isOpen()) {
      setText(moodTxt, moodWord(v.mood));
      moodBar.set(v.mood / 100, moodTone(v.mood));
      setHidden(thoughtsEl, v.thoughts === null);
      if (v.thoughts) {
        const sig = v.thoughts.map((t) => `${t.why}|${Math.round(t.value)}`).join(';');
        if (sig !== thoughtsSig) {
          thoughtsSig = sig;
          thoughtsList.replaceChildren(
            ...(v.thoughts.length
              ? v.thoughts.map((t) => h('div', { class: 'thought' }, h('span', { class: `thought-v num ${t.value < 0 ? 'neg' : 'pos'}` }, `${t.value > 0 ? '+' : ''}${Math.round(t.value)}`), h('span', { class: 'thought-why' }, cap(t.why))))
              : [h('div', { class: 'thought none' }, 'Nothing in particular.')]),
          );
        }
      }
      setText(healthTxt, [String(Math.round(v.health)), v.illness, v.injury].filter(Boolean).join(' · '));
      healthBar.set(v.health / 100, healthTone(v.health));
      for (const n of needCells) {
        const nv = v.needs.find((x) => x.key === n.key);
        if (nv) n.cell.set(nv);
      }
      setHidden(nourishmentEl, !v.nourishment);
      if (v.nourishment) {
        const n = v.nourishment;
        setText(nourishmentText, `${n.stored.toFixed(1)} / ${n.capacity}`);
        nourishmentBar.set(n.stored / n.capacity, n.stored > 0 ? 'var(--good)' : 'var(--warn)');
        nourishmentEl.setAttribute('aria-valuenow', String(n.stored));
        nourishmentEl.setAttribute('aria-valuemax', String(n.capacity));
      }
      // equipment has its own row below (with its wear); the chips here are goods
      const held = v.tools ?? [];
      const toolsIn = new Map<string, number>();
      for (const t of held) toolsIn.set(t.kind, (toolsIn.get(t.kind) ?? 0) + 1);
      const goods = v.inventory.filter((it) => !(isToolKind(it.kind) && (toolsIn.get(it.kind) ?? 0) >= it.n));
      invList.sync(goods, (it) => it.kind);
      setHidden(invEmpty, goods.length > 0);
      toolList.sync(held, (t) => String(t.id));
      const textiles = held.filter((t) => ['garment', 'blanket', 'bedding'].includes(t.kind));
      setText(textileLines, textiles.map((t) => `${t.label}; ${100 - t.wear}% condition`).join('\n'));
      setHidden(textileLines, textiles.length === 0);
      setHidden(toolsEmpty, held.length > 0);
      carryBar.set(v.carry.cap > 0 ? v.carry.used / v.carry.cap : 0, v.carry.used >= v.carry.cap - 0.01 ? 'var(--warn)' : 'var(--accent)');
      setText(carryTxt, `${round1(v.carry.used)} / ${v.carry.cap}`);
    }
    secPlans.setCount(v.plans.length ? String(v.plans.length) : v.suspended ? 'set aside' : '');
    if (secPlans.isOpen()) plans.update(v);
    secKnow.setCount(v.knowledge.places ? String(v.knowledge.places) : '');
    if (secKnow.isOpen()) know.update(v);
    const peopleCount = (v.interaction.current ? 1 : 0) + v.commitments.filter((c) => c.status === 'active').length + v.concerns.length + v.grievances.length;
    secPeople.setCount(peopleCount ? String(peopleCount) : v.relationships.length ? String(v.relationships.length) : '');
    if (secPeople.isOpen()) {
      social.update(v);
      people.update(v);
    }
    secHistory.setCount(v.timeline.length ? String(v.timeline.length) : '');
    if (secHistory.isOpen()) history.update(v);
    if (secCharacter.isOpen()) character.update(v);
    secDebug.setVisible(game.debug);
    if (game.debug && secDebug.isOpen()) debug.update(v);
  }

  function syncFollow(): void {
    setBool(followBtn, 'aria-pressed', game.following);
    toggle(followBtn, 'is-on', game.following);
    setText(followLabel, game.following ? 'Following' : 'Follow');
  }

  return {
    el,
    update,
    wantsOpportunities: () => depth === 'full' && secPlans.isOpen() && plans.wantsOpportunities(),
    syncFollow,
    depth: () => depth,
    setDepth,
    reset() {
      last = null;
      debug.reset();
      thoughtsSig = '';
      body.scrollTop = 0;
      el.classList.add('snap');
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => el.classList.remove('snap'), 120);
    },
  };
}
