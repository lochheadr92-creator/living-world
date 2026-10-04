// Short-lived messages (save / load results, copy confirmations, errors).
import { h } from './dom';
import { icon, type IconName } from './icons';
import type { Part, ToastKind } from './context';
import type { Slots } from './layout';

const KIND_ICON: Record<ToastKind, IconName> = { info: 'info', good: 'check', warn: 'alert', error: 'alert' };
const MAX_TOASTS = 3;

export interface ToastHost extends Part {
  toast(message: string, kind?: ToastKind, ms?: number): void;
}

export function createToasts(slots: Slots): ToastHost {
  const host = slots.toasts;
  const live = new Set<HTMLElement>();

  const remove = (el: HTMLElement) => {
    if (!live.delete(el)) return;
    el.classList.add('leaving');
    window.setTimeout(() => el.remove(), 200);
  };

  return {
    toast(message, kind = 'info', ms = kind === 'error' ? 6000 : 3200) {
      // an identical message replaces the old one instead of stacking
      for (const el of live) if (el.dataset.msg === message) remove(el);
      const el = h(
        'div',
        { class: `toast glass k-${kind}`, role: kind === 'error' ? 'alert' : undefined, 'data-msg': message },
        icon(KIND_ICON[kind], 16, 'toast-ico'),
        h('span', { class: 'toast-msg' }, message),
      );
      host.appendChild(el);
      live.add(el);
      while (live.size > MAX_TOASTS) remove(live.values().next().value as HTMLElement);
      window.setTimeout(() => remove(el), ms);
    },
    dispose() {
      for (const el of live) el.remove();
      live.clear();
    },
  };
}
