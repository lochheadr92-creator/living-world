// The event feed (bottom-left): what has just happened, newest first, with category filters.
// Rebuilt only when a new event arrives or the filter changes; the relative times tick over every couple of seconds.
import { agoText } from '../sim/inspect';
import type { EventKind, WorldEvent } from '../sim/types';
import { EVENT_COLORS } from '../render/palette';
import { Every, h, KeyedList, setBool, setHidden, setText, setVar, toggle } from './dom';
import { icon } from './icons';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

interface Category {
  id: string;
  label: string;
  kinds: EventKind[] | null;
  tip: string;
}

export const FEED_CATEGORIES: Category[] = [
  { id: 'all', label: 'All', kinds: null, tip: 'Everything that happens' },
  { id: 'life', label: 'Life', kinds: ['life', 'survival'], tip: 'Births, deaths, growing up, couples, new arrivals, hearth and home' },
  { id: 'social', label: 'Social', kinds: ['social', 'trade'], tip: 'Gifts, promises, help, making peace, swaps' },
  { id: 'build', label: 'Build & farm', kinds: ['build', 'farm'], tip: 'Buildings going up, tools made, fields and harvests' },
  { id: 'work', label: 'Workshops', kinds: ['work'], tip: 'Planks sawn, bricks fired, bread baked, fish smoked, tools and handcarts made. In the full list only the latest few of these appear, repeats rolled into one line.' },
  { id: 'danger', label: 'Danger & conflict', kinds: ['danger', 'conflict'], tip: 'Wolves, warnings, arguments, refusals and broken promises' },
  { id: 'nature', label: 'Nature', kinds: ['nature'], tip: 'Weathering and decay of the things people built' },
];

const MAX_ROWS = 30;
/** in the full list, workshop output is frequent: at most this many distinct lines of it, so it cannot drown out the rest */
const WORK_LINES_IN_ALL = 3;

interface FeedRow {
  ev: WorldEvent;
  /** how many events of this kind (same thing made again) the line stands for */
  count: number;
  key: string;
}

/** "Mira finished sawn planks at the timber yard." and "Tom and Ana finished sawn planks at the timber yard." are one line */
function workKey(text: string): string {
  const m = /^.*? finished (.+)$/.exec(text);
  return m ? `fin:${m[1]}` : text;
}

interface EvRow {
  el: HTMLLIElement;
  btn: HTMLButtonElement;
  dot: HTMLElement;
  text: HTMLElement;
  time: HTMLElement;
  ico: HTMLElement;
  ev: WorldEvent | null;
}

export function createFeed(ctx: UICtx, slots: Slots): Part {
  const { game } = ctx;
  // on small windows the feed folds away by itself (it can still be opened); the saved preference is left alone
  const narrow = window.matchMedia('(max-width: 900px), (max-height: 600px)');
  let open = ctx.prefs.feedOpen && !(window.innerWidth > 0 && narrow.matches);
  // the filter lasts for the visit only: coming back to a feed that silently shows one category would confuse
  let filter = 'all';
  let lastWorld = game.world;
  let lastId = -1;
  let lastFilter = '';
  let unread = 0;
  let seenId = 0;

  // ───────── DOM ─────────
  const title = h('span', { class: 'feed-title' }, 'Happenings');
  const badge = h('span', { class: 'badge t-accent feed-new num', hidden: true });
  const ticker = h('span', { class: 'feed-ticker' });
  const chev = icon('chevron', 12, 'feed-chev');
  const toggleBtn = h(
    'button',
    {
      type: 'button',
      class: 'feed-toggle',
      'aria-expanded': String(open),
      'aria-controls': 'lw-feed-body',
      'aria-label': 'Happenings',
      'data-tip': 'Show or hide the happenings feed',
      onClick: () => {
        open = !open;
        ctx.prefs.feedOpen = open;
        ctx.savePrefs();
        apply();
        if (open) {
          unread = 0;
          seenId = lastId;
          refresh(true);
        }
      },
    },
    chev,
    icon('clock', 16, 'feed-ico'),
    title,
    badge,
    ticker,
  );

  const chips = FEED_CATEGORIES.map((c) =>
    h(
      'button',
      {
        type: 'button',
        class: 'fchip',
        'aria-pressed': String(c.id === filter),
        'data-tip': c.tip,
        'data-cat': c.id,
        onClick: () => {
          filter = c.id;
          chips.forEach((b) => setBool(b, 'aria-pressed', b.dataset.cat === filter));
          refresh(true);
        },
      },
      c.label,
    ),
  );
  const filters = h('div', { class: 'feed-filters', role: 'group', 'aria-label': 'Filter happenings by kind' }, chips);
  const listEl = h('ul', { class: 'feed-list scroll', role: 'log', 'aria-label': 'Recent happenings', 'aria-live': 'off' });
  const emptyEl = h('p', { class: 'empty feed-empty' }, 'Nothing has happened yet.');
  const body = h('div', { class: 'feed-body', id: 'lw-feed-body' }, filters, listEl, emptyEl);
  const panel = h('section', { class: 'feed glass', 'aria-label': 'Happenings feed', 'data-open': String(open) }, h('header', { class: 'feed-head' }, toggleBtn), body);
  slots.left.appendChild(panel);

  /** only rows that arrive while the feed is already showing get the brief highlight */
  let flashNext = false;
  const list = new KeyedList<FeedRow, EvRow>(
    listEl,
    () => {
      const dot = h('i', { class: 'ev-dot' });
      const ico = icon('cog', 12, 'ev-ico');
      ico.hidden = true;
      const text = h('span', { class: 'ev-text' });
      const time = h('span', { class: 'ev-time num' });
      const btn = h('button', { type: 'button', class: 'ev-btn' }, h('span', { class: 'ev-mark' }, dot, ico), text, time);
      const row: EvRow = { el: h('li', { class: flashNext ? 'ev fresh' : 'ev' }, btn), btn, dot, ico, text, time, ev: null };
      if (flashNext) window.setTimeout(() => row.el.classList.remove('fresh'), 1300);
      btn.addEventListener('click', () => {
        const ev = row.ev;
        if (!ev) return;
        const world = game.world;
        const target = ev.ids.find((id) => world.byId.has(id));
        if (target) game.focusEntity(target);
        else if (ev.x || ev.y) game.flyTo(ev.x, ev.y);
      });
      return row;
    },
    (r, row) => {
      const ev = row.ev;
      r.ev = ev;
      const work = ev.kind === 'work';
      toggle(r.el, 'work', work);
      setHidden(r.dot, work);
      setHidden(r.ico, !work);
      const col = EVENT_COLORS[ev.kind] ?? '#8fa8b8';
      setVar(r.dot, '--c', col);
      r.ico.style.color = col;
      const text = row.count > 1 ? `${ev.text.replace(/.$/, '')} ×${row.count}` : ev.text;
      setText(r.text, text);
      setText(r.time, agoText(game.world, ev.tick));
      r.btn.setAttribute('aria-label', `${text} (${agoText(game.world, ev.tick)}). Show where.`);
    },
  );

  function apply(): void {
    panel.dataset.open = String(open);
    setBool(toggleBtn, 'aria-expanded', open);
    setHidden(body, !open);
  }

  const matches = (ev: WorldEvent): boolean => {
    const cat = FEED_CATEGORIES.find((c) => c.id === filter);
    return !cat || !cat.kinds || cat.kinds.includes(ev.kind);
  };

  function refresh(force = false): void {
    const world = game.world;
    const events = world.events;
    const newest = events.length ? events[events.length - 1].id : 0;

    if (world !== lastWorld) {
      // a different world: forget everything about the old one
      lastWorld = world;
      lastId = -1;
      list.clear();
      unread = 0;
      seenId = 0;
    }
    // workshop output does not count as news: it would keep the badge lit all day
    if (newest !== lastId && lastId >= 0 && !open) unread += events.filter((e) => e.id > Math.max(lastId, seenId) && e.kind !== 'work').length;
    const changed = newest !== lastId || filter !== lastFilter || force;
    lastId = newest;

    if (!open) {
      let latest = events.length ? events[events.length - 1] : null;
      // the one-line summary prefers real news to the routine of the workshops
      for (let i = events.length - 1; i >= 0 && i > events.length - 12; i--) {
        if (events[i].kind !== 'work') {
          latest = events[i];
          break;
        }
      }
      setText(ticker, latest ? latest.text : '');
      setText(badge, unread > 99 ? '99+' : String(unread));
      setHidden(badge, unread === 0);
      return;
    }
    setText(ticker, '');
    setHidden(badge, true);
    if (!changed) return;
    flashNext = list.size > 0 && filter === lastFilter && !force;
    lastFilter = filter;

    const rows: FeedRow[] = [];
    const seenWork = new Map<string, FeedRow>();
    let workLines = 0;
    for (let i = events.length - 1; i >= 0 && rows.length < MAX_ROWS; i--) {
      const ev = events[i];
      if (!matches(ev)) continue;
      if (ev.kind === 'work') {
        const k = workKey(ev.text);
        const prev = seenWork.get(k);
        if (prev) {
          prev.count++;
          continue;
        }
        if (filter === 'all' && workLines >= WORK_LINES_IN_ALL) continue;
        const row: FeedRow = { ev, count: 1, key: `w:${k}` };
        seenWork.set(k, row);
        rows.push(row);
        workLines++;
        continue;
      }
      rows.push({ ev, count: 1, key: String(ev.id) });
    }
    const hadScroll = listEl.scrollTop > 4;
    const before = listEl.scrollHeight;
    list.sync(rows, (r) => r.key);
    if (hadScroll) listEl.scrollTop += listEl.scrollHeight - before;
    setHidden(emptyEl, rows.length > 0);
    setText(emptyEl, events.length === 0 ? 'Nothing has happened yet. Give it a moment.' : 'Nothing of this kind yet.');
    toggle(listEl, 'is-empty', rows.length === 0);
  }

  const onNarrowChange = () => {
    const want = ctx.prefs.feedOpen && !narrow.matches;
    if (want !== open) {
      open = want;
      apply();
      refresh(true);
    }
  };
  narrow.addEventListener('change', onNarrowChange);

  apply();
  refresh(true);
  const fast = new Every(0.25);
  const slow = new Every(2, false);

  return {
    update(dt) {
      if (fast.step(dt)) refresh();
      if (slow.step(dt) && open) {
        // update relative times in place
        const world = game.world;
        list.each((r) => {
          if (r.ev) setText(r.time, agoText(world, r.ev.tick));
        });
      }
    },
    onGame(e) {
      if (e === 'restart') {
        lastId = -1;
        refresh(true);
      }
    },
    dispose() {
      narrow.removeEventListener('change', onNarrowChange);
      panel.remove();
    },
  };
}
