// Small reusable building blocks shared by several panels.
import { h, setHidden, setText, setWidth, setVar, legible } from './dom';
import { icon, itemIconName, type IconName } from './icons';
import { ITEM_LABEL } from '../sim/constants';
import { ITEM_COLORS } from '../render/palette';
import type { ItemKind } from '../sim/types';

export interface IconButtonOpts {
  pressed?: boolean;
  size?: number;
  cls?: string;
  /** do not use a custom tooltip (the label is still the accessible name) */
  noTip?: boolean;
}

/** An icon-only button with an accessible name and a styled tooltip. */
export function iconButton(name: IconName, label: string, tip: string | null, onClick: (e: MouseEvent) => void, opts: IconButtonOpts = {}): HTMLButtonElement {
  const b = h(
    'button',
    {
      type: 'button',
      class: `iconbtn ${opts.cls ?? ''}`.trim(),
      'aria-label': label,
      'data-tip': opts.noTip ? undefined : (tip ?? label),
      'aria-pressed': opts.pressed === undefined ? undefined : String(opts.pressed),
      onClick,
    },
    icon(name, opts.size ?? 16),
  );
  return b;
}

export interface BarHandle {
  el: HTMLElement;
  fill: HTMLElement;
  set(frac: number, color?: string): void;
}

/** A horizontal progress bar; `frac` is 0..1 */
export function makeBar(cls = ''): BarHandle {
  const fill = h('i');
  const el = h('div', { class: `bar ${cls}`.trim(), role: 'presentation' }, fill);
  return {
    el,
    fill,
    set(frac, color) {
      setWidth(fill, Math.max(0, Math.min(1, frac)) * 100);
      if (color) setVar(fill, '--bar', color);
    },
  };
}

export interface ItemChipHandle {
  el: HTMLElement;
  set(n: number): void;
}

/** icon + count chip for an item kind */
export function itemChip(kind: ItemKind, n: number): ItemChipHandle {
  const count = h('span', { class: 'ic-n num' });
  const el = h('span', { class: 'chip item-chip', 'data-tip': ITEM_LABEL[kind], title: undefined, role: 'img', 'aria-label': `${ITEM_LABEL[kind]}` }, icon(itemIconName(kind), 15), count);
  el.style.setProperty('--ic', legible(ITEM_COLORS[kind] ?? '#cccccc', 0.28));
  const handle: ItemChipHandle = {
    el,
    set(v) {
      setText(count, `×${v}`);
      el.setAttribute('aria-label', `${v} ${ITEM_LABEL[kind]}`);
    },
  };
  handle.set(n);
  return handle;
}

/** A collapsible section whose open state is remembered. The body is only populated while open. */
export interface SectionHandle {
  el: HTMLElement;
  body: HTMLElement;
  countEl: HTMLElement;
  isOpen(): boolean;
  setCount(text: string): void;
  setVisible(v: boolean): void;
}

export function makeSection(opts: {
  id: string;
  title: string;
  hint?: string;
  open: boolean;
  onToggle: (open: boolean) => void;
}): SectionHandle {
  let open = opts.open;
  const countEl = h('span', { class: 'sec-count num' });
  const chev = icon('chevron', 12, 'sec-chev');
  const bodyId = `lw-sec-${opts.id}`;
  const btn = h('button', { type: 'button', class: 'sec-head', 'aria-expanded': String(open), 'aria-controls': bodyId }, chev, h('span', { class: 'sec-title' }, opts.title), countEl);
  const body = h('div', { class: 'sec-body', id: bodyId });
  if (opts.hint) body.appendChild(h('p', { class: 'sec-hint' }, opts.hint));
  const el = h('section', { class: 'sec', 'data-open': String(open) }, btn, body);
  const apply = () => {
    btn.setAttribute('aria-expanded', String(open));
    el.dataset.open = String(open);
    setHidden(body, !open);
  };
  apply();
  btn.addEventListener('click', () => {
    open = !open;
    apply();
    opts.onToggle(open);
  });
  return {
    el,
    body,
    countEl,
    isOpen: () => open,
    setCount: (t) => setText(countEl, t),
    setVisible: (v) => setHidden(el, !v),
  };
}

