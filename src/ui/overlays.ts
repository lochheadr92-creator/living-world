// The five overlay toggles along the bottom edge.
import type { Overlays } from '../app/game';
import { Every, h, setBool } from './dom';
import { icon, type IconName } from './icons';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

interface OverlayDef {
  key: keyof Overlays;
  label: string;
  icon: IconName;
  /** tooltip: a title line, then the explanation */
  tip: string;
  /** one short line for the help overlay */
  short: string;
}

export const OVERLAY_DEFS: OverlayDef[] = [
  {
    key: 'perception',
    label: 'Perception',
    icon: 'eye',
    short: 'How far the selected person can see and hear.',
    tip: 'Perception\nA ring showing how far the selected person can see and hear. Anything outside it is unknown to them until they walk closer or are told.',
  },
  {
    key: 'paths',
    label: 'Paths',
    icon: 'route',
    short: 'Where people are walking, and the trails worn into the grass.',
    tip: 'Paths\nThe route each person is walking right now, plus the trails that get worn into the grass.',
  },
  {
    key: 'intentions',
    label: 'Intentions',
    icon: 'thought',
    short: 'A small icon above everyone showing what they are doing.',
    tip: 'Intentions\nA small icon above everyone showing what they are doing or about to do.',
  },
  {
    key: 'knowledge',
    label: 'Knowledge',
    icon: 'pin',
    short: 'Places the selected person remembers, fading as they age.',
    tip: 'Knowledge\nThe places the selected person remembers, fading as the memory ages. This is what they believe, which can differ from what is really there. Diamonds are ore, triangles stone outcrops, squares handcarts; hollow marks are things they were only told about.',
  },
  {
    key: 'labels',
    label: 'Labels',
    icon: 'tag',
    short: 'Everyone’s name above them.',
    tip: 'Labels\nShow everyone’s name above them.',
  },
];

export function createOverlays(ctx: UICtx, slots: Slots): Part {
  const { game } = ctx;
  const buttons = OVERLAY_DEFS.map((d) =>
    h(
      'button',
      {
        type: 'button',
        class: 'ochip',
        'aria-pressed': 'false',
        'aria-label': `${d.label} overlay`,
        'data-tip': d.tip,
        onClick: () => game.setOverlay(d.key, !game.overlays[d.key]),
      },
      icon(d.icon, 15),
      h('span', { class: 'ochip-label' }, d.label),
    ),
  );
  const pill = h('div', { class: 'pill ochips glass', role: 'group', 'aria-label': 'Map overlays' }, buttons);
  slots.bottom.appendChild(pill);

  const sync = () => OVERLAY_DEFS.forEach((d, i) => setBool(buttons[i], 'aria-pressed', game.overlays[d.key]));
  sync();
  const slow = new Every(0.5, false);

  return {
    onGame(e) {
      if (e === 'overlay' || e === 'restart') sync();
    },
    update(dt) {
      if (slow.step(dt)) sync();
    },
    dispose() {
      pill.remove();
    },
  };
}
