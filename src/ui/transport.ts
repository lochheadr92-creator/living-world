// Play / pause / single step / speed buttons, the "paused" indicator, and an honest readout of the speed actually achieved.
import { SPEEDS } from '../app/game';
import type { PlaybackStats } from '../app/game';
import { TPS } from '../sim/constants';
import { Every, h, setAttr, setBool, setHidden, setText, thousands, toggle } from './dom';
import { icon, setIcon } from './icons';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

export const fmtSpeed = (s: number): string => `${s}×`;

/** a measured rate the way a person says it: "4×", "3.8×", "0.5×", "16×" */
export function fmtRate(n: number): string {
  const r = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)}×`;
}

const ticks = (n: number): string => `${thousands(n)} ${n === 1 ? 'tick' : 'ticks'}`;

/** the note under the speed readout: nothing while the clock is keeping up and has never had to skip anything */
export function playbackNote(s: PlaybackStats): string {
  if (s.behind) return s.recentDropped > 0 ? `running behind, ${ticks(s.recentDropped)} skipped` : 'running behind';
  return s.recentDropped > 0 ? `${ticks(s.recentDropped)} skipped` : '';
}

export function createTransport(ctx: UICtx, slots: Slots): Part {
  const { game } = ctx;

  const playIcon = icon('pause', 16);
  const playBtn = h('button', { type: 'button', class: 'tbtn play', 'aria-label': 'Pause', 'data-tip': 'Pause (Space)', onClick: () => game.togglePlay() }, playIcon);
  const stepBtn = h(
    'button',
    {
      type: 'button',
      class: 'tbtn',
      'aria-label': 'Step forward one tick',
      'data-tip': `Step one tick (.)\nPauses and advances ${1 / TPS} s of world time`,
      onClick: () => game.stepOnce(),
    },
    icon('step', 16),
  );
  const speedBtns = SPEEDS.map((s, i) =>
    h(
      'button',
      {
        type: 'button',
        class: 'sbtn num',
        'aria-label': `Speed ${fmtSpeed(s)}`,
        'aria-pressed': 'false',
        'data-tip': `Speed ${fmtSpeed(s)} (key ${i + 1})`,
        onClick: () => game.setSpeed(s),
      },
      fmtSpeed(s),
    ),
  );
  const group = h('div', { class: 'speeds', role: 'group', 'aria-label': 'Simulation speed' }, speedBtns);
  // what the clock is really doing: the speed asked for against the speed achieved (polled, never per tick)
  const rate = h('span', { class: 'pb-rate num' });
  const note = h('span', { class: 'pb-note', hidden: true });
  const playback = h('div', { class: 'playback', hidden: true }, rate, note);
  const row = h('div', { class: 'tx-row' }, playBtn, stepBtn, h('span', { class: 'tdiv' }), group);
  const pill = h('div', { class: 'pill transport glass', role: 'toolbar', 'aria-label': 'Time controls' }, row, playback);
  const paused = h('div', { class: 'paused-tag', role: 'status', hidden: true }, icon('pause', 12), h('span', null, 'Paused'));
  slots.topRight.append(pill, paused);

  const sync = () => {
    const playing = game.playing;
    setIcon(playIcon, playing ? 'pause' : 'play', 16);
    setAttr(playBtn, 'aria-label', playing ? 'Pause' : 'Play');
    setAttr(playBtn, 'data-tip', playing ? 'Pause (Space)' : 'Play (Space)');
    toggle(playBtn, 'is-paused', !playing);
    setHidden(paused, playing);
    SPEEDS.forEach((s, i) => setBool(speedBtns[i], 'aria-pressed', game.speed === s));
  };
  sync();
  const slow = new Every(0.25, false);

  const syncPlayback = () => {
    const s = game.playbackStats();
    // paused: the paused tag says so, and a rate of 0 would only mislead
    setHidden(playback, !s.playing);
    if (!s.playing) return;
    setText(rate, `${fmtSpeed(s.requested)} · achieved ${fmtRate(s.achieved)}`);
    toggle(playback, 'is-behind', s.behind);
    const text = playbackNote(s);
    setText(note, text);
    setHidden(note, text === '');
    const lines = ['Playback speed', `Asked for ${fmtSpeed(s.requested)}; getting ${fmtRate(s.achieved)} over the last couple of seconds.`];
    if (s.dropped > 0) lines.push(`${ticks(s.dropped)} of world time were skipped because the page stalled or could not keep up. The world itself is unaffected: those ticks simply were not played.`);
    setAttr(playback, 'data-tip', lines.join('\n'));
  };
  syncPlayback();
  const stats = new Every(0.5, false);

  return {
    onGame(e) {
      if (e === 'play' || e === 'speed' || e === 'restart') {
        sync();
        syncPlayback();
      }
    },
    update(dt) {
      // everything that changes this goes through game events; the poll only catches direct assignments
      if (slow.step(dt)) sync();
      if (stats.step(dt)) syncPlayback();
    },
    dispose() {
      pill.remove();
      paused.remove();
    },
  };
}
