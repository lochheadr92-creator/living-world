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
    short: 'The map as the selected person knows it: unexplored ground, remembered places, hearsay, stale and contradicted memories, last known whereabouts.',
    tip: 'Knowledge lens\nThe map as the selected person knows it. Unexplored ground is darkened. Remembered places fade as the memory ages; hollow marks are hearsay; a cross marks a memory the world no longer agrees with (gone, or picked bare); a ringed initial is where they last knew someone to be, with a thread to where that person really is. Diamonds are ore, triangles stone outcrops, squares handcarts. Looking changes nothing for them.',
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
