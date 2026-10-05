// The social-contract sections of the person card: what they have promised, the conversation they are in (and the last one),
// the shared meal they are part of (and the last one), who they are worried about, and who they are still sore at.
// Every section hides itself when it has nothing to show. A body is only filled in while its section is open.
// Current and previous are always two separate blocks: a finished thing is never folded into a live one.
import type { Game } from '../app/game';
import type { PersonView } from '../sim/inspect';
import type { CommitmentView, GrievanceView, InteractionView, MealView } from '../sim/inspect_work';
import { cap, h, KeyedList, setAttr, setHidden, setState, setText, setVar, setWidth, toggle } from './dom';
import { icon } from './icons';
import type { SectionHandle } from './widgets';

export interface SocialDeps {
  game: Game;
  /** make a collapsible section whose open state is remembered */
  section(id: string, title: string, hint?: string): SectionHandle;
  /** the user followed a name to another person */
  onNavigate(id: number): void;
}

export interface PersonSocial {
  /** the sections, in the order they sit on the card */
  els: HTMLElement[];
  update(v: PersonView): void;
}

// ───────────────────────── how a promise ended ─────────────────────────
/** badge tone and words for each state a promise can be in, with the plain-language meaning as the tooltip */
const PROMISE_BADGE: Record<string, [tone: string, label: string, tip: string]> = {
  active: ['accent', 'Active', 'Still to be done.'],
  done: ['good', 'Done', 'Kept: they did what they promised.'],
  expired: ['muted', 'Expired', 'The time ran out after only part of it was done.'],
  moot: ['info', 'Moot', 'No longer needed: the job was finished or given up, or the other person is gone.'],
  interrupted: ['warn', 'Interrupted', 'Put aside while they saw to their own needs, until it was too late. No blame.'],
  failed: ['danger', 'Failed', 'It turned out to be impossible: nothing to give, or nowhere to get it.'],
  broken: ['violet', 'Broken', 'They were free to do it and did not.'],
  cancelled: ['ghost', 'Cancelled', 'Called off.'],
};

const MEAL_BADGE: Record<string, [tone: string, label: string]> = {
  inviting: ['info', 'Inviting'],
  gathering: ['accent', 'Gathering'],
  eating: ['good', 'Eating'],
  done: ['muted', 'Done'],
  cancelled: ['warn', 'Called off'],
};

/** what each state of a guest is called, and its colour; anything else is the reason they missed it */
const GUEST_STATE: Record<string, string> = { ate: 'good', there: 'info', coming: 'accent', asked: 'muted' };

const GRIEVANCE_TONE: Record<string, string> = { competition: 'info', scarcity: 'accent', refusal: 'warn', 'broken promise': 'violet', harm: 'danger' };

/** a conversation or meal line reads "Ben came to me for a chat": when the text starts with the name, the name is the link */
function afterName(name: string, text: string): { joined: boolean; rest: string } {
  if (name && text.startsWith(`${name} `)) return { joined: true, rest: text.slice(name.length + 1) };
  return { joined: false, rest: text };
}

// ───────────────────────── a person's name as a link ─────────────────────────
interface NameLink {
  el: HTMLButtonElement;
  set(name: string): void;
}

function makeNameLink(deps: SocialDeps): NameLink {
  let who = '';
  const el = h('button', { type: 'button', class: 'rel-name sx-name', 'data-tip': 'Look at this person' });
  el.addEventListener('click', () => {
    // names are unique within a world, so the link can find its person
    const p = deps.game.world.persons.find((q) => q.name === who);
    if (p) deps.onNavigate(p.id);
  });
  return {
    el,
    set(name) {
      who = name;
      setText(el, name);
      setAttr(el, 'aria-label', `Look at ${name}`);
      el.disabled = name === 'someone';
    },
  };
}

// ───────────────────────── promises ─────────────────────────
interface PromiseRow {
  el: HTMLElement;
  badge: HTMLElement;
  when: HTMLElement;
  text: HTMLElement;
  detail: HTMLElement;
}

function makePromiseRow(): PromiseRow {
  const badge = h('span', { class: 'badge' });
  const when = h('span', { class: 'sx-when num' });
  const text = h('div', { class: 'sx-text' });
  const detail = h('div', { class: 'sx-detail' });
  return { el: h('div', { class: 'row sx-row' }, h('div', { class: 'sx-top' }, badge, when), text, detail), badge, when, text, detail };
}

function updatePromiseRow(r: PromiseRow, c: CommitmentView): void {
  const [tone, label, tip] = PROMISE_BADGE[c.status] ?? ['muted', cap(c.status), ''];
  setText(r.badge, label);
  setState(r.badge, 't-', tone);
  setAttr(r.badge, 'data-tip', tip || null);
  // `due` is when it falls due while the promise is open, and how long ago it was made once it has ended
  const open = c.status === 'active';
  setText(r.when, open ? (c.due === 'now' ? 'due now' : `due ${c.due}`) : `made ${c.due}`);
  toggle(r.when, 'is-late', open && c.due === 'now');
  setText(r.text, c.text);
  setText(r.detail, c.detail ? cap(c.detail) : '');
  setHidden(r.detail, !c.detail);
}

// ───────────────────────── conversation ─────────────────────────
interface TalkBlock {
  el: HTMLElement;
  set(i: InteractionView | null): void;
}

function makeTalkBlock(label: string, live: boolean, deps: SocialDeps): TalkBlock {
  const when = h('span', { class: 'sx-when num' });
  const who = makeNameLink(deps);
  const purpose = h('span', { class: 'sx-purpose' });
  const stepV = h('dd');
  const outV = h('dd');
  const stepRow = h('div', { class: 'sx-kv' }, h('dt', null, 'Step'), stepV);
  const outRow = h('div', { class: 'sx-kv' }, h('dt', null, 'Outcome'), outV);
  const el = h(
    'div',
    { class: `sx-blk${live ? ' is-live' : ''}`, role: 'group', 'aria-label': label },
    h('div', { class: 'sx-top' }, h('span', { class: 'cap' }, label), when),
    h('div', { class: 'sx-who' }, who.el, purpose),
    h('dl', { class: 'sx-kvs' }, stepRow, outRow),
  );
  return {
    el,
    set(i) {
      setHidden(el, !i);
      if (!i) return;
      setText(when, i.when);
      who.set(i.partner);
      const { joined, rest } = afterName(i.partner, i.purpose);
      setText(purpose, rest ? (joined ? rest : `· ${rest}`) : '');
      // a finished conversation has no "step" left to show
      const step = i.step && i.step !== 'over' ? cap(i.step) : '';
      setText(stepV, step);
      setHidden(stepRow, !step);
      setText(outV, i.outcome ? cap(i.outcome) : '');
      setHidden(outRow, !i.outcome);
    },
  };
}

// ───────────────────────── meal ─────────────────────────
interface GuestRow {
  el: HTMLElement;
  dot: HTMLElement;
  who: NameLink;
  state: HTMLElement;
}

interface MealBlock {
  el: HTMLElement;
  set(m: MealView | null): void;
}

function makeMealBlock(label: string, live: boolean, deps: SocialDeps): MealBlock {
  const status = h('span', { class: 'badge' });
  const when = h('span', { class: 'sx-when num' });
  const place = h('span', { class: 'sx-place' });
  const host = makeNameLink(deps);
  const guestsHead = h('div', { class: 'cap sx-sub' }, 'Guests');
  const guestsBox = h('ul', { class: 'sx-guests' });
  const tableV = h('dd');
  const tableRow = h('div', { class: 'sx-kv' }, h('dt', null, 'On the table'), tableV);
  const endV = h('dd');
  const endRow = h('div', { class: 'sx-kv' }, h('dt', null, 'How it ended'), endV);
  const guests = new KeyedList<MealView['guests'][number], GuestRow>(
    guestsBox,
    () => {
      const dot = h('i', { class: 'sx-dot' });
      const who = makeNameLink(deps);
      const state = h('span', { class: 'sx-state' });
      return { el: h('li', { class: 'sx-guest' }, dot, who.el, state), dot, who, state };
    },
    (r, g) => {
      r.who.set(g.name);
      setText(r.state, g.state);
      setVar(r.dot, '--c', `var(--${GUEST_STATE[g.state] ?? 'warn'})`);
      // a reason for missing the meal is written out; the four ordinary states are short words
      toggle(r.el, 'is-missed', !(g.state in GUEST_STATE));
    },
  );
  const el = h(
    'div',
    { class: `sx-blk${live ? ' is-live' : ''}`, role: 'group', 'aria-label': label },
    h('div', { class: 'sx-top' }, h('span', { class: 'cap' }, label), status, when),
    h('div', { class: 'sx-who' }, h('span', { class: 'sx-at' }, 'At'), place, h('span', { class: 'sx-at' }, '· hosted by'), host.el),
    guestsHead,
    guestsBox,
    h('dl', { class: 'sx-kvs' }, tableRow, endRow),
  );
  return {
    el,
    set(m) {
      setHidden(el, !m);
      if (!m) return;
      const [tone, word] = MEAL_BADGE[m.status] ?? ['muted', cap(m.status)];
      setText(status, word);
      setState(status, 't-', tone);
      // `at` reads "in 3.5 min" before the meal and "3.5 min ago" after
      setText(when, m.status === 'inviting' || m.status === 'gathering' ? (m.at === 'now' ? 'starts now' : `starts ${m.at}`) : m.at);
      setText(place, m.place);
      host.set(m.host);
      guests.sync(m.guests, (g) => g.name);
      setHidden(guestsHead, m.guests.length === 0);
      setHidden(guestsBox, m.guests.length === 0);
      // a meal that is over has nothing left on its table to report
      const table = m.table && m.table !== 'nothing' ? m.table : '';
      const over = m.status === 'done' || m.status === 'cancelled';
      setText(tableV, table || 'nothing yet');
      setHidden(tableRow, over && !table);
      setText(endV, m.end ? cap(m.end) : '');
      setHidden(endRow, !m.end);
    },
  };
}

// ───────────────────────── worries ─────────────────────────
interface WorryRow {
  el: HTMLElement;
  who: NameLink;
  what: HTMLElement;
  meta: HTMLElement;
}

// ───────────────────────── quarrels ─────────────────────────
const MAX_APOLOGIES = 3;

interface QuarrelRow {
  el: HTMLElement;
  who: NameLink;
  cause: HTMLElement;
  since: HTMLElement;
  detail: HTMLElement;
  bar: HTMLElement;
  weight: HTMLElement;
  barBox: HTMLElement;
  dots: HTMLElement[];
  apologies: HTMLElement;
}

function makeQuarrelRow(deps: SocialDeps): QuarrelRow {
  const who = makeNameLink(deps);
  const cause = h('span', { class: 'badge' });
  const since = h('span', { class: 'sx-when num' });
  const detail = h('div', { class: 'sx-detail sx-detail-lead' });
  const bar = h('i');
  const weight = h('span', { class: 'sx-num num' });
  const barBox = h('div', { class: 'sx-bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': 'Soreness' }, bar);
  const dots = Array.from({ length: MAX_APOLOGIES }, () => h('i', { class: 'sx-pip' }));
  const apologies = h('span', { class: 'sx-num num' });
  const el = h(
    'div',
    { class: 'row sx-row' },
    h('div', { class: 'sx-top' }, who.el, cause, since),
    detail,
    h(
      'div',
      { class: 'sx-gauges' },
      h('div', { class: 'sx-gauge', 'data-tip': 'How sore they still are, from 0 to 100. It eases with time, apologies, gifts and working side by side.' }, h('span', { class: 'sx-glab' }, 'Sore'), barBox, weight),
      h('div', { class: 'sx-gauge sx-gauge-ap', 'data-tip': `How many times they have tried to make peace. After ${MAX_APOLOGIES} they give up.` }, h('span', { class: 'sx-glab' }, 'Apologies'), h('span', { class: 'sx-pips', role: 'presentation' }, dots), apologies),
    ),
  );
  return { el, who, cause, since, detail, bar, weight, barBox, dots, apologies };
}

function updateQuarrelRow(r: QuarrelRow, g: GrievanceView): void {
  r.who.set(g.other);
  const cause = cap(g.cause);
  setText(r.cause, cause);
  setState(r.cause, 't-', GRIEVANCE_TONE[g.cause] ?? 'muted');
  setText(r.since, `started ${g.since}`);
  setText(r.detail, g.detail ? cap(g.detail) : '');
  setHidden(r.detail, !g.detail);
  const w = Math.max(0, Math.min(100, g.weight));
  setWidth(r.bar, w);
  setVar(r.bar, '--bar', w < 35 ? 'var(--accent)' : w < 70 ? 'var(--warn)' : 'var(--danger)');
  setText(r.weight, String(Math.round(w)));
  setAttr(r.barBox, 'aria-valuenow', Math.round(w));
  r.dots.forEach((d, i) => toggle(d, 'is-on', i < g.apologies));
  setText(r.apologies, `${Math.min(g.apologies, MAX_APOLOGIES)} of ${MAX_APOLOGIES}`);
}

// ───────────────────────── assembly ─────────────────────────
export function createPersonSocial(deps: SocialDeps): PersonSocial {
  // conversation
  const talkSec = deps.section('talk', 'Conversation', 'What they are saying to someone right now, and the last conversation they had.');
  const talkNow = makeTalkBlock('Talking now', true, deps);
  const talkPrev = makeTalkBlock('Last conversation', false, deps);
  talkSec.body.append(talkNow.el, talkPrev.el);

  // shared meal
  const mealSec = deps.section('meal', 'Shared meal', 'A meal they are hosting or have agreed to share, and the last one they took part in.');
  const mealNow = makeMealBlock('This meal', true, deps);
  const mealPrev = makeMealBlock('Last meal', false, deps);
  mealSec.body.append(mealNow.el, mealPrev.el);

  // promises
  const promSec = deps.section('commit', 'Promises', 'What they have promised to do for others, and how the latest ones ended.');
  const promBox = h('div', { class: 'list' });
  promSec.body.append(promBox);
  const promList = new KeyedList<CommitmentView, PromiseRow>(promBox, () => makePromiseRow(), (r, c) => updatePromiseRow(r, c));

  // worries
  const worrySec = deps.section('worry', 'Worries', 'People they are worried about, and how they came to know.');
  const worryBox = h('div', { class: 'list' });
  worrySec.body.append(worryBox);
  const worryList = new KeyedList<PersonView['concerns'][number], WorryRow>(
    worryBox,
    () => {
      const who = makeNameLink(deps);
      const what = h('span', { class: 'sx-what' });
      const meta = h('div', { class: 'sx-detail' });
      return { el: h('div', { class: 'row sx-row sx-worry' }, h('div', { class: 'sx-who' }, icon('alert', 13, 'sx-ico'), who.el, what), meta), who, what, meta };
    },
    (r, c) => {
      r.who.set(c.about);
      setText(r.what, ` ${c.kind}`);
      setText(r.meta, `Seen ${c.seen} · ${c.source}`);
    },
  );

  // word about others
  const wordSec = deps.section('word', 'Word about others', 'What they know of how other people have behaved, and how they came to know it. Hearsay moves their opinion only a little.');
  const wordBox = h('div', { class: 'list' });
  wordSec.body.append(wordBox);
  const wordList = new KeyedList<PersonView['accounts'][number], WorryRow>(
    wordBox,
    () => {
      const who = makeNameLink(deps);
      const what = h('span', { class: 'sx-what' });
      const meta = h('div', { class: 'sx-detail' });
      return { el: h('div', { class: 'row sx-row sx-worry' }, h('div', { class: 'sx-who' }, icon('n_social', 13, 'sx-ico'), who.el, what), meta), who, what, meta };
    },
    (r, a) => {
      r.who.set(a.about);
      setText(r.what, ` ${a.what}`);
      setText(r.meta, `${a.seen} · ${a.source}`);
    },
  );

  // illness
  const illSec = deps.section('illness', 'Illness', 'A spell of illness they are going through. Others can help by bringing food and water; it ends in recovery or, sometimes, death.');
  const illText = h('div', { class: 'sx-detail' });
  illSec.body.append(illText);

  // grief
  const griefSec = deps.section('grief', 'Grief', 'Who they are mourning. It eases with time, at the grave, over a meal in memory, and among others who mourn the same person.');
  const griefBox = h('div', { class: 'list' });
  griefSec.body.append(griefBox);
  const griefList = new KeyedList<PersonView['grief'][number], WorryRow>(
    griefBox,
    () => {
      const who = makeNameLink(deps);
      const what = h('span', { class: 'sx-what' });
      const meta = h('div', { class: 'sx-detail' });
      return { el: h('div', { class: 'row sx-row sx-worry' }, h('div', { class: 'sx-who' }, icon('n_social', 13, 'sx-ico'), who.el, what), meta), who, what, meta };
    },
    (r, g) => {
      r.who.set(g.about);
      setText(r.what, ` weighs ${g.weight}/100`);
      setText(r.meta, `Learned ${g.since} · ${g.source} · ${g.visited}`);
    },
  );

  // quarrels
  const soreSec = deps.section('sore', 'Quarrels', 'Who they are still sore at, and why. A quarrel drops off this list once it is settled.');
  const soreBox = h('div', { class: 'list' });
  soreSec.body.append(soreBox);
  const soreList = new KeyedList<GrievanceView, QuarrelRow>(soreBox, () => makeQuarrelRow(deps), (r, g) => updateQuarrelRow(r, g));

  return {
    els: [illSec.el, talkSec.el, mealSec.el, promSec.el, soreSec.el, worrySec.el, wordSec.el, griefSec.el],
    update(v) {
      const talk = v.interaction ?? { current: null, previous: null };
      const hasTalk = !!(talk.current || talk.previous);
      talkSec.setVisible(hasTalk);
      talkSec.setCount(talk.current ? 'now' : '');
      if (hasTalk && talkSec.isOpen()) {
        talkNow.set(talk.current);
        talkPrev.set(talk.previous);
      }

      const meal = v.meal ?? { current: null, previous: null };
      const hasMeal = !!(meal.current || meal.previous);
      mealSec.setVisible(hasMeal);
      mealSec.setCount(meal.current ? meal.current.status : '');
      if (hasMeal && mealSec.isOpen()) {
        mealNow.set(meal.current);
        mealPrev.set(meal.previous);
      }

      const proms = v.commitments ?? [];
      promSec.setVisible(proms.length > 0);
      promSec.setCount(proms.length ? String(proms.length) : '');
      if (proms.length && promSec.isOpen()) promList.sync(proms, (c) => String(c.id));

      const sore = v.grievances ?? [];
      soreSec.setVisible(sore.length > 0);
      soreSec.setCount(sore.length ? String(sore.length) : '');
      if (sore.length && soreSec.isOpen()) soreList.sync(sore, (g) => `${g.other}|${g.cause}`);

      const worries = v.concerns ?? [];
      worrySec.setVisible(worries.length > 0);
      worrySec.setCount(worries.length ? String(worries.length) : '');
      if (worries.length && worrySec.isOpen()) worryList.sync(worries, (c) => `${c.about}|${c.kind}`);

      const ill = v.illness ?? null;
      illSec.setVisible(!!ill);
      if (ill) setText(illText, `${cap(ill.how)} since ${ill.since} · ${ill.careful}`);

      const griefs = (v.grief ?? []).filter((g) => g.weight > 0);
      griefSec.setVisible(griefs.length > 0);
      griefSec.setCount(griefs.length ? String(griefs.length) : '');
      if (griefs.length && griefSec.isOpen()) griefList.sync(griefs, (g) => g.about);

      const words = v.accounts ?? [];
      wordSec.setVisible(words.length > 0);
      wordSec.setCount(words.length ? String(words.length) : '');
      if (words.length && wordSec.isOpen()) wordList.sync(words, (a) => `${a.about}|${a.what}|${a.source}`);
    },
  };
}
