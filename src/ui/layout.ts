// The screen is divided into a few click-through docks; each module appends its panel into the slot it owns,
// so the canvas stays draggable everywhere that has no panel.
import { h } from './dom';

export interface Slots {
  topLeft: HTMLElement;
  topCenter: HTMLElement;
  topRight: HTMLElement;
  /** a ribbon under the top bar (the staged-scene banner) */
  banner: HTMLElement;
  /** bottom-left column: debug panel above the event feed */
  left: HTMLElement;
  /** right column: inspector above the minimap */
  right: HTMLElement;
  bottom: HTMLElement;
  toasts: HTMLElement;
}

export function buildLayout(root: HTMLElement): { slots: Slots; els: HTMLElement[] } {
  const topLeft = h('div', { class: 'col col-left' });
  const topCenter = h('div', { class: 'col col-center' });
  const topRight = h('div', { class: 'col col-right' });
  const top = h('div', { class: 'dock dock-top' }, topLeft, topCenter, topRight);
  const banner = h('div', { class: 'dock dock-banner' });
  const left = h('div', { class: 'dock dock-left' });
  const right = h('div', { class: 'dock dock-right' });
  const bottom = h('div', { class: 'dock dock-bottom' });
  const toasts = h('div', { class: 'dock dock-toasts', role: 'status', 'aria-live': 'polite' });
  const els = [top, banner, left, right, bottom, toasts];
  for (const e of els) root.appendChild(e);
  return { slots: { topLeft, topCenter, topRight, banner, left, right, bottom, toasts }, els };
}
