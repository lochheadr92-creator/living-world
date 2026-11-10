// The blocks of the full character viewer (ui/person.ts): plans and choices, what they know, people and relationships, recent
// history, household and character, and the debug raw numbers. Each block builds its DOM once and updates in place from the
// describePerson() view-model; the viewer only calls update on a block whose section is open, so a closed section costs nothing.
// Nothing in here mutates the world: clicking a place flies the camera, clicking a name selects a person.
import type { HeardView, OpportunityView, PersonView, RelationView, RequestView } from '../sim/inspect';
import type { KnowledgeItemView, TimelineView, WhereaboutsView } from '../sim/inspect_observer';
import { cap, h, KeyedList, setBool, setHidden, setState, setText, setVar, setWidth, signed, toggle } from './dom';
import { icon, setIcon } from './icons';
import { makeBar, type BarHandle } from './widgets';
import type { UICtx } from './context';

export interface BlockHooks {
  /** something opened or closed (the shell refreshes immediately so it fills in) */
  onSectionToggle(): void;
  /** the user followed a link inside the panel to another person (the shell keeps a way back) */
  onNavigate(id: number): void;
}

export interface Block {
  el: HTMLElement;
  update(v: PersonView): void;
}

const OPP_BADGE: Record<OpportunityView['status'], [tone: string, label: string]> = {
  chosen: ['good', 'Chosen'],
  unaware: ['info', 'Unaware'],
  'passed over': ['accent', 'Passed over'],
  blocked: ['warn', 'Blocked'],
  'failed before': ['danger', 'Failed before'],
  'not needed': ['muted', 'Not needed'],
};

const REQ_TONE: Record<string, string> = {
  pending: 'info',
  promised: 'accent',
  fulfilled: 'good',
  partial: 'accent',
  declined: 'warn',
  expired: 'muted',
  failed: 'danger',
  broken: 'danger',
};

const PLAN_TONE: Record<string, string> = { 'under way': 'good', waiting: 'info', paused: 'warn', blocked: 'warn', done: 'muted', ended: 'muted', 'settled on': 'accent' };

const MEMORY_COLOR: Record<string, string> = {
  work: '#7fb069',
  social: '#e07bb0',
  need: '#e9a23b',
  danger: '#e5645c',
  life: '#8ec5ff',
  info: '#8fa8b8',
  decision: '#f3b95f',
  outcome: '#c9c9c9',
};

const TRAIT_LABEL: Record<string, [name: string, low: string, high: string]> = {
  generosity: ['Generosity', 'frugal', 'generous'],
  sociability: ['Sociability', 'reserved', 'sociable'],
  caution: ['Caution', 'bold', 'cautious'],
  diligence: ['Diligence', 'easygoing', 'diligent'],
  curiosity: ['Curiosity', 'homebody', 'curious'],
};

const SKILL_LABEL: Record<string, string> = {
  forage: 'Foraging',
  fish: 'Fishing',
  wood: 'Woodcutting',
  stone: 'Stonework',
  build: 'Building',
  farm: 'Farming',
  craft: 'Crafting',
  carpentry: 'Carpentry',
  kiln: 'Kiln work',
  smith: 'Smithing',
  bake: 'Baking',
};

const emptyNote = (text: string) => h('p', { class: 'empty' }, text);

/** a `<details>` whose open state is remembered in the UI state under `id` */
function disclosure(ctx: UICtx, id: string, title: string, hooks: BlockHooks, cls = 'civic-panel', fallback = false): { el: HTMLDetailsElement; body: HTMLElement; summary: HTMLElement; count: HTMLElement } {
  const count = h('span', { class: 'sec-count num' });
  const summary = h('summary', null, title, count);
  const body = h('div', { class: 'disc-body' });
  const el = h('details', { class: cls, open: ctx.state.sections[id] ?? fallback }, summary, body);
  el.addEventListener('toggle', () => {
    ctx.state.sections[id] = el.open;
    ctx.saveState();
    hooks.onSectionToggle();
  });
  return { el, body, summary, count };
}

/** lines of text replaced only when they change */
function textLines(parent: HTMLElement, lines: string[]): void {
  const key = lines.join('\n');
  if (parent.dataset.text === key) return;
  parent.dataset.text = key;
  parent.replaceChildren(...lines.map((line) => h('p', null, line)));
}

/** a "show all N" control for a long list: `limit` rows by default */
function makeMore(label: (n: number) => string): { el: HTMLButtonElement; open(): boolean; sync(total: number, limit: number): void } {
  let open = false;
  const el = h('button', { type: 'button', class: 'btn sm more-btn', hidden: true, onClick: () => { open = !open; el.dispatchEvent(new CustomEvent('more')); } });
  return {
    el,
    open: () => open,
    sync(total, limit) {
      setHidden(el, total <= limit);
      setText(el, open ? 'Show fewer' : label(total));
    },
  };
}

// ───────────────────────── plans and choices ─────────────────────────
interface OppRow { el: HTMLButtonElement; badge: HTMLElement; what: HTMLElement; dist: HTMLElement; detail: HTMLElement; item: OpportunityView | null }
interface PlanRow { el: HTMLElement; badge: HTMLElement; goal: HTMLElement; detail: HTMLElement }

export function createPlansBlock(ctx: UICtx, hooks: BlockHooks): Block & { wantsOpportunities(): boolean } {
  const { game } = ctx;

  // work set aside that can resume
  const susLabel = h('b');
  const susMeta = h('span', { class: 'muted' });
  const susBar = makeBar('thin');
  const suspended = h('div', { class: 'row plan-row is-suspended', hidden: true }, h('div', { class: 'row-top' }, h('span', { class: 'badge t-warn' }, 'Set aside'), susLabel), h('div', { class: 'plan-detail' }, susMeta), susBar.el);

  // every plan they carry
  const planHead = h('div', { class: 'sub-h cap' }, 'Plans');
  const planBox = h('div', { class: 'list' });
  const planEmpty = emptyNote('No plan of their own at the moment.');
  const planList = new KeyedList<PersonView['plans'][number], PlanRow>(
    planBox,
    () => {
      const badge = h('span', { class: 'badge' });
      const goal = h('span', { class: 'opp-what plan-goal' });
      const detail = h('div', { class: 'plan-detail' });
      return { el: h('div', { class: 'row plan-row' }, h('div', { class: 'row-top' }, badge, goal), detail), badge, goal, detail };
    },
    (r, pl) => {
      setText(r.badge, cap(pl.state));
      setState(r.badge, 't-', PLAN_TONE[pl.state] ?? 'muted');
      setText(r.goal, cap(pl.goal));
      setText(r.detail, `${pl.detail}${pl.missing ? ` Still needs ${pl.missing}.` : ''}${pl.outcome ? ` ${cap(pl.outcome)}` : ''}`);
    },
  );

  // the decision: the reason first, then what was passed over and what was set aside, in words
  const decHead = h('div', { class: 'sub-h cap' }, 'The current choice');
  const decWhen = h('p', { class: 'muted dec-when' });
  const decWhy = h('p', { class: 'dec-why' });
  const altHead = h('div', { class: 'sub-h cap' }, 'Also considered, not chosen');
  const altList = h('ul', { class: 'dec-list' });
  const blkHead = h('div', { class: 'sub-h cap' }, 'Set aside, and why');
  const blkList = h('ul', { class: 'dec-list' });
  // the technical layer: scores and their parts, only on request, each part signed so its direction is never in doubt
  let tech = ctx.state.techDetail;
  const techBtn = h('button', { type: 'button', class: 'btn sm', 'aria-pressed': String(tech), 'data-tip': 'The scores behind the choice: each line adds to or takes from an option. Higher wins.', onClick: () => { tech = !tech; ctx.state.techDetail = tech; ctx.saveState(); syncTech(); hooks.onSectionToggle(); } }, 'Technical detail');
  const techBox = h('div', { class: 'dbg tech-box', hidden: !tech });
  let techSig = '';
  const syncTech = () => { setBool(techBtn, 'aria-pressed', tech); setHidden(techBox, !tech); };
  let decSig = '';

  // what the ledger kept of earlier decisions (rules 103), as before
  const ledger = disclosure(ctx, 'decisions', 'Recent decisions', hooks, 'civic-panel decision-history');

  // what was nearby that they did or did not use; costly to compute, so only while open
  const opp = disclosure(ctx, 'opp', 'Opportunities nearby', hooks);
  const oppBox = h('div', { class: 'list' });
  const oppEmpty = emptyNote('Nothing nearby that they could use right now.');
  opp.body.append(h('p', { class: 'muted hint'}, 'Things nearby that could have helped, and why they did or did not take them. Click one to see where it is.'), oppBox, oppEmpty);
  const oppList = new KeyedList<OpportunityView, OppRow>(
    oppBox,
    () => {
      const badge = h('span', { class: 'badge' });
      const what = h('span', { class: 'opp-what' });
      const dist = h('span', { class: 'opp-dist num' });
      const detail = h('div', { class: 'opp-detail' });
      const row: OppRow = { el: h('button', { type: 'button', class: 'row opp' }, h('div', { class: 'row-top' }, badge, what, dist), detail), badge, what, dist, detail, item: null };
      row.el.addEventListener('click', () => { if (row.item) game.flyTo(row.item.x, row.item.y); });
      return row;
    },
    (r, o) => {
      r.item = o;
      const [tone, label] = OPP_BADGE[o.status];
      setText(r.badge, label);
      setState(r.badge, 't-', tone);
      setText(r.what, cap(o.what));
      setText(r.dist, `${Math.round(o.distance)} tiles`);
      setText(r.detail, o.detail);
      r.el.setAttribute('data-tip', `${cap(o.what)}: ${o.detail}\nClick to show it on the map.`);
      r.el.setAttribute('aria-label', `${label}: ${o.what}. ${o.detail} Show on the map.`);
    },
  );

  const el = h('div', { class: 'blk' }, suspended, planHead, planBox, planEmpty, decHead, decWhen, decWhy, altHead, altList, blkHead, blkList, techBtn, techBox, ledger.el, opp.el);

  return {
    el,
    wantsOpportunities: () => opp.el.open,
    update(v) {
      const s = v.suspended;
      setHidden(suspended, !s);
      if (s) {
        setText(susLabel, s.label);
        setText(susMeta, `${cap(s.goal)}. Put aside ${s.since}; can resume when conditions allow.`);
        susBar.set(s.progress);
      }
      planList.sync(v.plans, (pl) => String(pl.id));
      setHidden(planEmpty, v.plans.length > 0);

      const d = v.decision;
      const sig = JSON.stringify([d, v.qa.why]);
      if (sig !== decSig) {
        decSig = sig;
        setText(decWhen, d ? `${cap(d.trigger)}, ${d.when}: chose “${d.chosen}” from ${d.considered} options, knowing ${d.knownPlaces} places and seeing ${d.seenNow} ${d.seenNow === 1 ? 'thing' : 'things'}.` : 'No decision recorded yet.');
        setText(decWhy, d ? cap(d.because || v.qa.why) : '');
        altList.replaceChildren(...(d?.alternatives.length ? d.alternatives.map((a) => h('li', null, a.label)) : [h('li', { class: 'muted' }, 'nothing else')]));
        blkList.replaceChildren(...(d?.blocked.length ? d.blocked.map((b) => h('li', null, h('span', null, b.label), h('span', { class: 'muted' }, b.reason ? `: ${b.reason}` : ''))) : [h('li', { class: 'muted' }, 'nothing')]));
        setHidden(altHead, !d); setHidden(altList, !d); setHidden(blkHead, !d); setHidden(blkList, !d); setHidden(techBtn, !d);
      }
      if (tech && d) {
        const ts = JSON.stringify(d.alternatives);
        if (ts !== techSig) {
          techSig = ts;
          techBox.replaceChildren(
            h('div', { class: 'sub-h cap' }, 'Scores (the chosen option scored highest; each part adds + or takes −)'),
            ...d.alternatives.map((a) =>
              h('div', { class: 'dbg-alt' }, h('div', { class: 'dbg-alt-top' }, h('span', null, a.label), h('b', { class: 'num' }, a.utility.toFixed(1))), h('div', { class: 'dbg-parts' }, a.parts.map(([k, val]) => h('span', { class: `part ${val < 0 ? 'neg' : 'pos'}` }, `${k} ${val >= 0 ? '+' : '−'}${Math.abs(val).toFixed(1)}`)))),
            ),
          );
        }
      }
      ledger.count.textContent = v.decisionHistory.length > 1 ? String(v.decisionHistory.length) : '';
      if (ledger.el.open) textLines(ledger.body, v.decisionHistory);
      if (opp.el.open) {
        oppList.sync(v.opportunities, (o) => String(o.id));
        setHidden(oppEmpty, v.opportunities.length > 0);
        opp.count.textContent = v.opportunities.length ? String(v.opportunities.length) : '';
      } else opp.count.textContent = '';
    },
  };
}

// ───────────────────────── what they know ─────────────────────────
interface KnowRow { el: HTMLButtonElement; src: HTMLElement; check: HTMLElement; label: HTMLElement; meta: HTMLElement; item: KnowledgeItemView | null }
interface WhereRow { el: HTMLButtonElement; name: HTMLElement; meta: HTMLElement; badge: HTMLElement; item: WhereaboutsView | null }

const CHECK_BADGE: Record<KnowledgeItemView['worldCheck'], [tone: string, label: string, tip: string] | null> = {
  present: null,
  gone: ['danger', 'No longer there', 'World check: the thing they remember is gone. They do not know this yet.'],
  empty: ['warn', 'Now empty', 'World check: the place is bare, though they remember it stocked. They do not know this yet.'],
  unchecked: null,
};

export function createKnowledgeBlock(ctx: UICtx, hooks: BlockHooks): Block {
  const { game } = ctx;
  const sum = h('p', { class: 'know-sum' });
  const seen = h('i', { class: 'seen' });
  const told = h('i', { class: 'told' });
  const split = h('div', { class: 'split', role: 'presentation' }, seen, told);
  const legend = h('div', { class: 'know-legend' });
  const kinds = h('div', { class: 'chips' });
  const kindList = new KeyedList<{ kind: string; n: number }, { el: HTMLElement }>(
    kinds,
    () => ({ el: h('span', { class: 'chip' }, h('span', { class: 'k-n num' }), h('span', { class: 'k-l' })) }),
    (c, k) => { setText(c.el.firstElementChild as HTMLElement, String(k.n)); setText(c.el.lastElementChild as HTMLElement, k.kind); },
  );
  const lensBtn = h('button', { type: 'button', class: 'btn sm', 'aria-pressed': 'false', 'data-tip': 'Draw the map as this person knows it: unexplored ground darkened, remembered places marked (hollow for hearsay, crossed where the world no longer agrees), and where they last knew people to be.', onClick: () => game.setOverlay('knowledge', !game.overlays.knowledge) }, icon('pin', 14), h('span', null, 'Knowledge lens on the map'));
  const note = h('p', { class: 'muted hint' }, 'Only what they have seen first-hand or been told; it can be out of date. The world check column is yours, not theirs: it compares their memory with what is really there now.');

  const itemHead = h('div', { class: 'sub-h cap' }, 'Places and things they remember');
  const itemBox = h('div', { class: 'list know-items' });
  const itemEmpty = emptyNote('They do not remember any places yet.');
  const itemMore = makeMore((n) => `Show all ${n}`);
  const ITEM_LIMIT = 12;
  const itemList = new KeyedList<KnowledgeItemView, KnowRow>(
    itemBox,
    () => {
      const src = h('span', { class: 'badge' });
      const check = h('span', { class: 'badge', hidden: true });
      const label = h('span', { class: 'opp-what' });
      const meta = h('div', { class: 'opp-detail know-meta' });
      const row: KnowRow = { el: h('button', { type: 'button', class: 'row know-row' }, h('div', { class: 'row-top' }, src, label, check), meta), src, check, label, meta, item: null };
      row.el.addEventListener('click', () => { if (row.item) game.flyTo(row.item.x, row.item.y); });
      return row;
    },
    (r, k) => {
      r.item = k;
      const stale = k.stale;
      setText(r.src, k.src === 'told' ? (stale ? 'Hearsay, old' : 'Hearsay') : stale ? 'Seen, old' : 'Seen');
      setState(r.src, 't-', k.src === 'told' ? (stale ? 'muted' : 'accent') : stale ? 'muted' : 'info');
      r.src.setAttribute('data-tip', k.src === 'told' ? `Told by ${k.from} ${k.learnedAgo}; the account was of ${k.seenAgo}.` : `Seen themselves ${k.seenAgo}.`);
      setText(r.label, k.label + (k.amount !== null ? ` · believed ${k.amount}` : ''));
      const cb = CHECK_BADGE[k.worldCheck];
      setHidden(r.check, !cb);
      if (cb) { setText(r.check, cb[1]); setState(r.check, 't-', cb[0]); r.check.setAttribute('data-tip', cb[2]); }
      setText(r.meta, `${k.src === 'told' ? `told by ${k.from} ${k.learnedAgo}` : `seen ${k.seenAgo}`}${stale ? ' · possibly out of date' : ''} · at ${k.x.toFixed(0)}, ${k.y.toFixed(0)}`);
      toggle(r.el, 'is-stale', stale);
      toggle(r.el, 'is-wrong', k.worldCheck === 'gone' || k.worldCheck === 'empty');
      r.el.setAttribute('aria-label', `${k.label}. ${r.meta.textContent}. Show on the map.`);
    },
  );
  itemMore.el.addEventListener('more', () => hooks.onSectionToggle());

  const whereHead = h('div', { class: 'sub-h cap' }, 'Where they last knew people to be');
  const whereBox = h('div', { class: 'list' });
  const whereList = new KeyedList<WhereaboutsView, WhereRow>(
    whereBox,
    () => {
      const name = h('span', { class: 'opp-what' });
      const badge = h('span', { class: 'badge' });
      const meta = h('div', { class: 'opp-detail know-meta' });
      const row: WhereRow = { el: h('button', { type: 'button', class: 'row know-row' }, h('div', { class: 'row-top' }, badge, name), meta), name, meta, badge, item: null };
      row.el.addEventListener('click', () => { if (row.item) game.flyTo(row.item.x, row.item.y); });
      return row;
    },
    (r, w) => {
      r.item = w;
      setText(r.name, w.name);
      setText(r.badge, w.inSight ? 'In sight' : w.from ? 'Told' : 'Last seen');
      setState(r.badge, 't-', w.inSight ? 'good' : w.from ? 'accent' : 'info');
      setText(r.meta, `${w.from ? `${w.from} said they were` : 'saw them'} ${w.room ? `in ${w.room}` : `at ${w.x.toFixed(0)}, ${w.y.toFixed(0)}`} · ${w.when}${w.inSight ? ' · can see them now' : ''}`);
      r.el.setAttribute('aria-label', `${w.name}: ${r.meta.textContent}. Show that place on the map.`);
    },
  );

  const hearsayHead = h('div', { class: 'sub-h cap' }, 'Where recent hearsay came from');
  const hearsay = h('ul', { class: 'know-told', 'aria-label': 'Where recent hearsay came from' });
  const toldList = new KeyedList<PersonView['knowledge']['told'][number], { el: HTMLElement }>(
    hearsay,
    () => ({ el: h('li', { class: 'know-told-row' }) }),
    (c, k) => { setText(c.el, k.text); c.el.classList.toggle('doubt', k.doubt); },
  );

  const el = h('div', { class: 'blk' }, sum, split, legend, kinds, lensBtn, note, itemHead, itemBox, itemEmpty, itemMore.el, whereHead, whereBox, hearsayHead, hearsay);
  return {
    el,
    update(v) {
      const k = v.knowledge;
      setText(sum, k.places ? `${k.places} places and things remembered.` : 'They do not remember any places yet.');
      const total = Math.max(1, k.seen + k.hearsay);
      setWidth(seen, (k.seen / total) * 100);
      setWidth(told, (k.hearsay / total) * 100);
      setHidden(split, k.places === 0);
      setText(legend, k.places ? `${k.seen} seen first-hand · ${k.hearsay} heard from others · ${k.stale} possibly out of date` : '');
      kindList.sync(k.byKind, (x) => x.kind);
      setBool(lensBtn, 'aria-pressed', game.overlays.knowledge);
      const items = itemMore.open() ? v.knowledgeItems : v.knowledgeItems.slice(0, ITEM_LIMIT);
      itemList.sync(items, (x) => String(x.id));
      setHidden(itemEmpty, v.knowledgeItems.length > 0);
      itemMore.sync(v.knowledgeItems.length, ITEM_LIMIT);
      whereList.sync(v.whereabouts, (x) => String(x.id));
      setHidden(whereHead, v.whereabouts.length === 0);
      setHidden(whereBox, v.whereabouts.length === 0);
      toldList.sync(k.told, (x) => x.key);
      setHidden(hearsayHead, k.told.length === 0);
      setHidden(hearsay, k.told.length === 0);
    },
  };
}

// ───────────────────────── people and relationships ─────────────────────────
interface RelRow { el: HTMLElement; name: HTMLButtonElement; label: HTMLElement; hh: HTMLElement; avoid: HTMLElement; neg: HTMLElement; pos: HTMLElement; aff: HTMLElement; recent: HTMLElement; item: RelationView | null }
interface ReqRow { el: HTMLElement; dir: HTMLElement; text: HTMLElement; badge: HTMLElement; note: HTMLElement }

/** what an affinity figure means, in a word, so the number never stands alone */
function affinityWord(a: number): string {
  return a >= 60 ? 'devoted' : a >= 32 ? 'fond' : a >= 10 ? 'warm' : a > -12 ? 'neutral' : a > -38 ? 'cool' : 'hostile';
}

export function createPeopleBlock(ctx: UICtx, hooks: BlockHooks, socialEls: HTMLElement[]): Block {
  const reqHead = h('div', { class: 'sub-h cap' }, 'Requests');
  const reqBox = h('div', { class: 'list' });
  const reqList = new KeyedList<RequestView, ReqRow>(
    reqBox,
    () => {
      const dir = h('span', { class: 'req-dir ico' });
      const text = h('span', { class: 'req-text' });
      const badge = h('span', { class: 'badge' });
      const note = h('div', { class: 'req-note' });
      return { el: h('div', { class: 'row req' }, h('div', { class: 'row-top' }, dir, text, badge), note), dir, text, badge, note };
    },
    (r, q) => {
      const asked = q.direction === 'asked';
      setIcon(r.dir, asked ? 'arrowUpRight' : 'arrowDownLeft', 13);
      setText(r.text, (asked ? `Asked ${q.other} for ${q.text}` : `${q.other} asked them for ${q.text}`) + (q.purpose ? ` — ${q.purpose}` : ''));
      setText(r.badge, q.status);
      setState(r.badge, 't-', REQ_TONE[q.status] ?? 'muted');
      setText(r.note, [q.progress, q.note ? cap(q.note) : '', q.age].filter(Boolean).join(' · '));
    },
  );

  const relHead = h('div', { class: 'sub-h cap' }, 'Relationships');
  const relHint = h('p', { class: 'muted hint' }, 'Household first, then the people they feel most strongly about. The bar runs from dislike (left) to affection (right); the word says what the figure means.');
  const relBox = h('div', { class: 'list' });
  const relEmpty = emptyNote('They have not got to know anyone yet.');
  const relMore = makeMore((n) => `Show all ${n}`);
  const REL_LIMIT = 6;
  const relList = new KeyedList<RelationView, RelRow>(
    relBox,
    () => {
      const name = h('button', { type: 'button', class: 'rel-name', 'data-tip': 'Look at this person' });
      const label = h('span', { class: 'chip rel-label' });
      const hh = h('span', { class: 'badge t-info', hidden: true, 'data-tip': 'Same household' }, 'household');
      const avoid = h('span', { class: 'badge t-warn', 'data-tip': 'They had a falling out and are keeping their distance for now.', hidden: true }, 'avoiding');
      const neg = h('i', { class: 'neg' });
      const pos = h('i', { class: 'pos' });
      const aff = h('span', { class: 'aff-val num' });
      const recent = h('div', { class: 'rel-recent' });
      const row: RelRow = { el: h('div', { class: 'row rel' }, h('div', { class: 'row-top' }, name, label, hh, avoid, h('div', { class: 'aff' }, h('span', { class: 'aff-track', role: 'presentation' }, neg, pos, h('b', { class: 'mid' })), aff)), recent), name, label, hh, avoid, neg, pos, aff, recent, item: null };
      name.addEventListener('click', () => { if (row.item) hooks.onNavigate(row.item.id); });
      return row;
    },
    (r, v) => {
      r.item = v;
      setText(r.name, v.name);
      r.name.setAttribute('aria-label', `Look at ${v.name}`);
      setText(r.label, v.label);
      setHidden(r.hh, !v.household);
      setHidden(r.avoid, !v.avoiding);
      const a = Math.max(-100, Math.min(100, v.affinity));
      r.el.setAttribute('data-tip', `${v.name}: ${v.label.toLowerCase()}. Affection ${signed(Math.round(a))} (${affinityWord(a)}), trust ${Math.round(v.trust)} of 100.`);
      setWidth(r.neg, a < 0 ? (-a / 100) * 50 : 0);
      setWidth(r.pos, a > 0 ? (a / 100) * 50 : 0);
      setText(r.aff, affinityWord(a));
      toggle(r.aff, 'neg', a < -0.5);
      toggle(r.aff, 'pos', a > 0.5);
      setText(r.recent, v.recent ? cap(v.recent) : '');
      setHidden(r.recent, !v.recent);
    },
  );
  relMore.el.addEventListener('more', () => hooks.onSectionToggle());

  const heardHead = h('div', { class: 'sub-h cap' }, 'What they have heard of people');
  const heardBox = h('div', { class: 'list heard' });
  const heardList = new KeyedList<HeardView, { el: HTMLElement; text: HTMLElement; via: HTMLElement }>(
    heardBox,
    () => {
      const text = h('span', { class: 'thought-why' });
      const via = h('span', { class: 'rel-recent' });
      return { el: h('div', { class: 'thought' }, text, via), text, via };
    },
    (c, r) => {
      setText(c.text, cap(r.text) + '.');
      setText(c.via, `${r.via}, ${r.age === 0 ? 'today' : r.age === 1 ? 'yesterday' : `${r.age} days ago`}`);
      c.el.classList.toggle('neg', r.good < 0);
      c.el.classList.toggle('pos', r.good > 0);
    },
  );

  const famHead = h('div', { class: 'sub-h cap' }, 'Family');
  const famBox = h('dl', { class: 'fam' });
  const famEmpty = emptyNote('No family nearby that they know of.');
  const famList = new KeyedList<{ label: string; names: string[] }, { el: HTMLElement }>(
    famBox,
    () => ({ el: h('div', { class: 'fam-row' }, h('dt', { class: 'cap' }), h('dd')) }),
    (c, f) => { setText(c.el.firstElementChild as HTMLElement, f.label); setText(c.el.lastElementChild as HTMLElement, f.names.join(', ')); },
  );

  const el = h('div', { class: 'blk' }, ...socialEls, reqHead, reqBox, relHead, relHint, relBox, relEmpty, relMore.el, heardHead, heardBox, famHead, famBox, famEmpty);
  return {
    el,
    update(v) {
      reqList.sync(v.requests, (r) => String(r.id));
      setHidden(reqHead, v.requests.length === 0);
      setHidden(reqBox, v.requests.length === 0);
      const rels = relMore.open() ? v.relationships : v.relationships.slice(0, REL_LIMIT);
      relList.sync(rels, (r) => String(r.id));
      setHidden(relEmpty, v.relationships.length > 0);
      relMore.sync(v.relationships.length, REL_LIMIT);
      heardList.sync(v.heard, (r) => `${r.about}:${r.text}`);
      setHidden(heardHead, v.heard.length === 0);
      setHidden(heardBox, v.heard.length === 0);
      famList.sync(v.family, (f) => f.label);
      setHidden(famEmpty, v.family.length > 0);
    },
  };
}

// ───────────────────────── recent history ─────────────────────────
interface TimeRow { el: HTMLElement; dot: HTMLElement; text: HTMLElement; when: HTMLElement; detail: HTMLElement }

export function createHistoryBlock(ctx: UICtx, hooks: BlockHooks): Block {
  const hint = h('p', { class: 'muted hint' }, 'What happened to them, what they chose and how it ended, newest first, in world time. Click an entry with more to it.');
  const box = h('div', { class: 'list mem-list timeline' });
  const empty = emptyNote('Nothing much has happened yet.');
  const more = makeMore((n) => `Show all ${n}`);
  const LIMIT = 14;
  const list = new KeyedList<TimelineView, TimeRow>(
    box,
    () => {
      const dot = h('i', { class: 'dot' });
      const text = h('span', { class: 'mem-t' });
      const when = h('span', { class: 'mem-when num' });
      const detail = h('div', { class: 'mem-detail', hidden: true });
      const el = h('div', { class: 'mem tl-row' }, dot, text, when, detail);
      el.addEventListener('click', () => { if (detail.textContent) { detail.hidden = !detail.hidden; el.classList.toggle('is-open', !detail.hidden); } });
      return { el, dot, text, when, detail };
    },
    (r, m) => {
      setVar(r.dot, '--dot', MEMORY_COLOR[m.kind] ?? MEMORY_COLOR.info);
      setText(r.text, m.text);
      setText(r.when, m.when);
      r.when.setAttribute('data-tip', m.ago);
      setText(r.detail, m.detail);
      toggle(r.el, 'has-more', !!m.detail);
      toggle(r.el, 'is-decision', m.kind === 'decision');
      toggle(r.el, 'is-outcome', m.kind === 'outcome');
    },
  );
  more.el.addEventListener('more', () => hooks.onSectionToggle());
  const el = h('div', { class: 'blk' }, hint, box, empty, more.el);
  return {
    el,
    update(v) {
      const rows = more.open() ? v.timeline : v.timeline.slice(0, LIMIT);
      list.sync(rows, (m) => `${m.tick}|${m.kind}|${m.text}`);
      setHidden(empty, v.timeline.length > 0);
      more.sync(v.timeline.length, LIMIT);
    },
  };
}

// ───────────────────────── household and character ─────────────────────────
export function createCharacterBlock(ctx: UICtx, hooks: BlockHooks): Block {
  const homeEl = h('p', { class: 'p-home' });
  const townEl = h('p', { class: 'p-township' });
  const civic = disclosure(ctx, 'civic', 'Township & shared work', hooks);
  const household = disclosure(ctx, 'household', 'Household history', hooks);
  const relHist = disclosure(ctx, 'relhist', 'Relationship history', hooks, 'civic-panel relationship-history');

  const traitHead = h('div', { class: 'sub-h cap' }, 'Character');
  const traitSummary = h('p', { class: 'trait-sum' });
  const traitBox = h('div', { class: 'traits' });
  const traitList = new KeyedList<{ key: string; value: number }, { el: HTMLElement; dot: HTMLElement }>(
    traitBox,
    (t) => {
      const [name, low, high] = TRAIT_LABEL[t.key] ?? [cap(t.key), 'low', 'high'];
      const dot = h('i', { class: 'trait-dot' });
      return { el: h('div', { class: 'trait', 'aria-label': name }, h('span', { class: 'trait-l' }, low), h('span', { class: 'trait-track', role: 'presentation' }, dot), h('span', { class: 'trait-h' }, high)), dot };
    },
    (c, t) => {
      c.dot.style.left = `${Math.max(0, Math.min(1, t.value)) * 100}%`;
      c.el.setAttribute('aria-label', `${(TRAIT_LABEL[t.key] ?? [t.key])[0]}: ${Math.round(t.value * 100)} out of 100`);
    },
  );
  const skillHead = h('div', { class: 'sub-h cap' }, 'Skills');
  const skillExplanation = h('p', { class: 'trait-sum skill-explanation' });
  const skillBox = h('div', { class: 'skills' });
  const skillList = new KeyedList<{ key: string; value: number }, { el: HTMLElement; bar: BarHandle; v: HTMLElement }>(
    skillBox,
    (s) => {
      const bar = makeBar('thin');
      const v = h('span', { class: 'skill-v num' });
      return { el: h('div', { class: 'skill' }, h('span', { class: 'skill-l' }, SKILL_LABEL[s.key] ?? cap(s.key)), bar.el, v), bar, v };
    },
    (c, s) => { c.bar.set(s.value / 1.8, 'var(--info)'); setText(c.v, `×${s.value.toFixed(2)}`); },
  );
  const lines = h('div', { class: 'char-lines' });
  const payHead = h('div', { class: 'sub-h cap' }, 'What has paid them');
  const payBox = h('div', { class: 'skills' });
  const payList = new KeyedList<{ key: string; ratio: number; n: number }, { el: HTMLElement; bar: BarHandle; v: HTMLElement }>(
    payBox,
    (s) => {
      const bar = makeBar('thin');
      const v = h('span', { class: 'skill-v num' });
      return { el: h('div', { class: 'skill' }, h('span', { class: 'skill-l' }, SKILL_LABEL[s.key] ?? cap(s.key)), bar.el, v), bar, v };
    },
    (c, s) => {
      c.bar.set(0.5 + Math.log2(Math.max(0.25, Math.min(4, s.ratio))) / 4, s.ratio >= 1 ? 'var(--good)' : 'var(--warn)');
      setText(c.v, `${s.ratio.toFixed(1)}× · ${s.n}`);
      c.el.setAttribute('aria-label', `${SKILL_LABEL[s.key] ?? cap(s.key)}: paid ${s.ratio.toFixed(1)} times what was expected, over ${s.n} ${s.n === 1 ? 'outing' : 'outings'}`);
    },
  );
  const customerHead = h('div', { class: 'sub-h cap' }, 'Their customers');
  const customerBox = h('div', { class: 'list customers' });
  const footnote = h('p', { class: 'muted hint' }, 'Everything shown is simulation state that the person acts on: traits weigh their choices, skills set their pace, the rest is recorded as it happened. Nothing here is display-only flavour.');

  const el = h('div', { class: 'blk' }, homeEl, townEl, civic.el, household.el, relHist.el, traitHead, traitSummary, traitBox, skillHead, skillExplanation, skillBox, lines, payHead, payBox, customerHead, customerBox, footnote);
  return {
    el,
    update(v) {
      setText(homeEl, v.home === 'no home yet' ? 'No home yet' : `Home: ${v.home}`);
      setText(townEl, v.civic.township ? `Township: ${v.civic.township}` : 'No township.');
      setHidden(civic.el, !v.civic.township);
      if (civic.el.open) textLines(civic.body, v.civic.lines);
      if (household.el.open) textLines(household.body, v.householdHistory);
      if (relHist.el.open) textLines(relHist.body, v.relationshipHistory);
      setText(traitSummary, (v.traitSummary ? cap(v.traitSummary) + '.' : '') + (v.goal ? ` ${cap(v.goal)}.` : '') + (v.lifeEvent ? ` ${cap(v.lifeEvent)}.` : '') + (v.crew ? ` ${cap(v.crew)}.` : ''));
      traitList.sync(v.traits, (t) => t.key);
      skillList.sync(v.skills, (s) => s.key);
      setText(skillExplanation, v.skillExplanation);
      const extra = [
        ...v.techniques,
        v.trade ? `Their trade: ${v.trade}.` : '',
        ...v.winterPractice,
        ...v.dailyRoutines,
        ...v.hauling,
        ...(v.sourceExperience ?? []),
        ...(v.routeExperience ?? []),
        ...(v.personalPlaces ?? []),
        ...(v.skillExperience ?? []),
      ].filter(Boolean);
      textLines(lines, extra);
      setHidden(payHead, v.payoffs.length === 0);
      payList.sync(v.payoffs, (s) => s.key);
      setHidden(customerHead, v.customers.length === 0);
      setHidden(customerBox, v.customers.length === 0);
      textLines(customerBox, v.customers);
    },
  };
}

// ───────────────────────── debug raw numbers ─────────────────────────
export function createDebugBlock(): Block & { reset(): void } {
  const body = h('div', { class: 'dbg' });
  let sig = '';
  return {
    el: body,
    reset() { sig = ''; },
    update(v) {
      const raw = `#${v.id} @ ${v.position.x.toFixed(1)}, ${v.position.y.toFixed(1)} · health ${v.health.toFixed(1)} · mood ${v.mood.toFixed(1)} · ` + v.needs.map((n) => `${n.key} ${n.value.toFixed(1)}`).join(' · ');
      if (raw === sig) return;
      sig = raw;
      body.replaceChildren(h('div', { class: 'sub-h cap' }, 'Raw numbers'), h('div', { class: 'dbg-raw mono' }, raw));
    },
  };
}
