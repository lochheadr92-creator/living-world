// The fault ribbon: when a stage of a frame threw (src/app/frameloop.ts), what failed, at which tick, and that the world is paused.
// It reads Game.fault and nothing else; dismissing it hides the words, not the fact (a world fault keeps the autosave off).
import type { FrameFault } from '../app/frameloop';
import { h } from './dom';
import { icon } from './icons';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

/** the ribbon's words for a fault */
export function faultWords(f: FrameFault): { title: string; detail: string } {
  switch (f.stage) {
    case 'world':
      return {
        title: `The world stopped with an error at tick ${f.tick}`,
        detail: `${f.message}. It is paused and may be part-way through that moment, so it is no longer autosaved. Press play to try again, or load a save.`,
      };
    case 'picture':
      return { title: `Drawing the world failed at tick ${f.tick}`, detail: `${f.message}. The world is paused; press play to carry on.` };
    case 'interface':
      return { title: `Part of the interface failed at tick ${f.tick}`, detail: `${f.message}. The world is paused; press play to carry on.` };
  }
}

export function createFaultBanner(ctx: UICtx, slots: Slots): Part {
  const { game } = ctx;
  const title = h('div', { class: 'fault-title' });
  const detail = h('div', { class: 'fault-detail' });
  const dismiss = h('button', { type: 'button', class: 'btn', onClick: () => game.clearFault() }, 'Dismiss');
  const el = h('div', { class: 'fault-banner glass', role: 'alert', hidden: true }, icon('alert', 18, 'fault-ico'), h('div', { class: 'fault-main' }, title, detail), dismiss);
  slots.banner.prepend(el);

  const sync = (): void => {
    const f = game.fault;
    el.hidden = !f;
    if (!f) return;
    const words = faultWords(f);
    title.textContent = words.title;
    detail.textContent = words.detail;
  };
  sync();
  return {
    onGame(e) {
      if (e === 'fault' || e === 'restart') sync();
    },
    dispose() {
      el.remove();
    },
  };
}
