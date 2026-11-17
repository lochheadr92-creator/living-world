// The left rail: a short column of category buttons. A click opens that category's list beside the rail (the flyout);
// a second click on the same button, the close button or Esc folds it away. Each category registers itself with add(),
// so overlays.ts (the lenses) and viewer.ts (the view settings) own their own content and this module owns only the shell.
//
// Every category's panel stays in the document while the flyout is closed (the flyout itself is hidden), so the panels keep
// their state and anything that looks one up by id or label still finds it. Nothing in here touches the world.
import { Every, h, setBool, setText } from './dom';
import { icon, type IconName } from './icons';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

export interface RailSection {
  /** short, stable id: the button carries it as data-section */
  id: string;
  /** the word under the rail icon */
  label: string;
  icon: IconName;
  /** the heading of the list that opens, and one line under it */
  title: string;
  hint: string;
  /** the list itself; the rail shows and hides it */
  body: HTMLElement;
  /** a small number on the button (the lenses switched on); nothing is shown for 0 */
  badge?: () => number;
}

export interface Rail extends Part {
  add(section: RailSection): void;
  /** open a category's list, or fold the flyout away with null */
  open(id: string | null): void;
  openId(): string | null;
}

interface Entry {
  def: RailSection;
  btn: HTMLButtonElement;
  badge: HTMLElement;
  panel: HTMLElement;
}

export function createRail(_ctx: UICtx, slots: Slots): Rail {
  const entries: Entry[] = [];
  let current: string | null = null;

  const nav = h('nav', { class: 'rail glass', 'aria-label': 'Viewer lists' });
  const title = h('h2', { class: 'fly-title' });
  const hint = h('p', { class: 'fly-hint' });
  const closeBtn = h('button', { type: 'button', class: 'iconbtn fly-close', 'aria-label': 'Close this list', 'data-tip': 'Close (Esc)', onClick: () => open(null) }, icon('close', 16));
  const body = h('div', { class: 'fly-body scroll' });
  const fly = h('section', { class: 'fly glass', id: 'rail-fly', hidden: true, 'aria-label': 'Viewer list' }, h('header', { class: 'fly-head' }, h('div', { class: 'fly-heads' }, title, hint), closeBtn), body);
  slots.rail.append(nav, fly);

  function open(id: string | null): void {
    const next = id !== null && entries.some((e) => e.def.id === id) ? id : null;
    current = next;
    fly.hidden = next === null;
    for (const e of entries) {
      const on = e.def.id === next;
      e.panel.hidden = !on;
      setBool(e.btn, 'aria-expanded', on);
      if (on) {
        setText(title, e.def.title);
        setText(hint, e.def.hint);
      }
    }
  }

  function refresh(): void {
    for (const e of entries) {
      const n = e.def.badge?.() ?? 0;
      e.badge.hidden = n <= 0;
      setText(e.badge, n > 0 ? String(n) : '');
    }
  }

  // Esc inside the rail or its list folds the list away and puts focus back on the button that opened it
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Escape' || current === null) return;
    const e = entries.find((x) => x.def.id === current);
    open(null);
    e?.btn.focus();
    ev.stopPropagation();
  };
  slots.rail.addEventListener('keydown', onKey);

  const slow = new Every(0.5, false);

  return {
    add(def) {
      const badge = h('span', { class: 'rail-badge', 'aria-hidden': 'true', hidden: true });
      const btn = h(
        'button',
        {
          type: 'button',
          class: 'rail-btn',
          'data-section': def.id,
          'aria-expanded': 'false',
          'aria-controls': 'rail-fly',
          'aria-label': def.title,
          onClick: () => open(current === def.id ? null : def.id),
        },
        icon(def.icon, 20),
        h('span', { class: 'rail-label' }, def.label),
        badge,
      );
      const panel = h('div', { class: 'fly-panel', 'data-section': def.id, hidden: true }, def.body);
      nav.appendChild(btn);
      body.appendChild(panel);
      entries.push({ def, btn, badge, panel });
      refresh();
    },
    open,
    openId: () => current,
    onGame(e) {
      if (e === 'overlay' || e === 'restart') refresh();
    },
    update(dt) {
      if (slow.step(dt)) refresh();
    },
    dispose() {
      slots.rail.removeEventListener('keydown', onKey);
      nav.remove();
      fly.remove();
    },
  };
}
