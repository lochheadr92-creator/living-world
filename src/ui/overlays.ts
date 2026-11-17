// The five map overlays, now the "Lenses" list on the left rail (rail.ts): one row each with its icon, name, a line saying what it shows
// and a switch. A lens with marks to learn (Knowledge) unfolds a small legend under its row while it is on.
import type { Overlays } from '../app/game';
import { Every, h, setBool } from './dom';
import { icon, type IconName } from './icons';
import type { Part, UICtx } from './context';
import type { Rail } from './rail';

interface OverlayDef {
  key: keyof Overlays;
  label: string;
  icon: IconName;
  /** tooltip: a title line, then the explanation */
  tip: string;
  /** one short line for the help overlay and the row */
  short: string;
  /** marks the lens draws, as [mark, meaning]; shown under the row while the lens is on */
  legend?: [string, string][];
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
    legend: [
      ['Darkened ground', 'not explored yet'],
      ['Fading mark', 'a remembered place; it fades as the memory ages'],
      ['Hollow mark', 'hearsay, told and not seen'],
      ['Cross', 'a memory the world no longer agrees with: gone, or picked bare'],
      ['Ringed initial', 'where they last knew someone to be, with a thread to where that person really is'],
      ['Diamond, triangle, square', 'ore, a stone outcrop, a handcart'],
    ],
  },
  {
    key: 'labels',
    label: 'Labels',
    icon: 'tag',
    short: 'Everyone’s name above them.',
    tip: 'Labels\nShow everyone’s name above them.',
  },
];

export function createOverlays(ctx: UICtx, rail: Rail): Part {
  const { game } = ctx;
  const rows = OVERLAY_DEFS.map((d) => {
    const row = h(
      'button',
      {
        type: 'button',
        class: 'lens-row',
        'aria-pressed': 'false',
        'aria-label': `${d.label} overlay`,
        'data-tip': d.tip,
        onClick: () => game.setOverlay(d.key, !game.overlays[d.key]),
      },
      h('span', { class: 'lens-ico' }, icon(d.icon, 18)),
      h('span', { class: 'lens-text' }, h('b', { class: 'lens-name' }, d.label), h('span', { class: 'lens-desc' }, d.short)),
      h('span', { class: 'lens-switch', 'aria-hidden': 'true' }),
    );
    const legend = d.legend
      ? h(
          'dl',
          { class: 'lens-legend', hidden: true, 'aria-label': `${d.label} marks` },
          d.legend.map(([mark, meaning]) => h('div', null, h('dt', null, mark), h('dd', null, meaning))),
        )
      : null;
    return { row, legend, wrap: h('div', { class: 'lens' }, row, legend) };
  });

  const count = h('span', { class: 'lens-count' });
  const allOff = h('button', { type: 'button', class: 'lens-alloff', onClick: () => OVERLAY_DEFS.forEach((d) => game.overlays[d.key] && game.setOverlay(d.key, false)) }, 'Turn all off');
  // `ochips` stays as the container's name: the browser checks look a lens up by `.ochips [aria-label="… overlay"]`
  const list = h('div', { class: 'lens-list ochips', role: 'group', 'aria-label': 'Map overlays' }, rows.map((r) => r.wrap), h('div', { class: 'lens-foot' }, count, allOff));

  const on = (): number => OVERLAY_DEFS.filter((d) => game.overlays[d.key]).length;
  rail.add({
    id: 'lenses',
    label: 'Lenses',
    icon: 'eye',
    title: 'Lenses',
    hint: 'Ways of looking at the world. Looking changes nothing for anyone in it.',
    body: list,
    badge: on,
  });

  const sync = () => {
    OVERLAY_DEFS.forEach((d, i) => {
      const isOn = game.overlays[d.key];
      setBool(rows[i].row, 'aria-pressed', isOn);
      if (rows[i].legend) rows[i].legend!.hidden = !isOn;
    });
    const n = on();
    count.textContent = `${n} of ${OVERLAY_DEFS.length} on`;
    allOff.disabled = n === 0;
  };
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
      list.remove();
    },
  };
}
