// Story director: an opt-in way to sit back. While it is on, the camera follows the person a noteworthy real event is about (or flies
// to the place, when nobody in it is alive), a caption says what happened in the simulation's own words, and "What happened" lists
// the recent highlights so any of them can be jumped to. It is off by default: nothing in this interface moves the camera unasked,
// and turning the director on is the asking. The moment the viewer takes the camera (a click, a drag, a key, the minimap, a row
// of the reel) the director turns itself off.
//
// Presentation only: it reads Game.world and writes nothing to it, never draws from the world's random state, and what it drives
// is view state on Game (selection, follow, the camera's fly). Which events count and how much each weighs, the short queue, the
// hold and cut rules and the reel are in director_model.ts.
import { clampCamera } from '../render/camera';
import { project } from '../render/iso';
import { dayNumber } from '../sim/environment';
import { agoText } from '../sim/inspect';
import type { WorldEvent } from '../sim/types';
import { Every, h, KeyedList, setBool, setHidden, setText, setVar, toggle } from './dom';
import { icon } from './icons';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';
import { Director, REEL_DAYS, hasPlace, reelOf, type Shot } from './director_model';

/** what the director is holding the camera with now: a follow of one person, or a fly to a place and then the camera left where it landed */
type Driven =
  | null
  | { kind: 'follow'; id: number }
  | { kind: 'place'; x: number; y: number; fly: UICtx['game']['fly']; held: { x: number; y: number } | null };

/** iso px the camera may differ from where the director put it before the viewer is taken to have moved it */
const CAM_TOL = 6;

const TIP_DIRECTOR = 'Director (T)\nThe camera follows the people noteworthy happenings are about, with a caption. Taking the camera yourself turns it off.';
const TIP_REEL = 'What happened\nThe notable events of the last three days. Click one to look at it (that takes the camera, so the director turns off).';

export function createDirector(ctx: UICtx, slots: Slots): Part & { toggle(): void } {
  const { game, root } = ctx;
  const model = new Director();
  let on = ctx.prefs.director;
  /** set while this part's own calls run, so the game events they raise are not mistaken for the viewer */
  let acting = false;
  /** a world change is under way (beforeWorldChange up to scene): the selection and fly it raises are the game's own */
  let changing = false;
  let lastRev = 0;
  let driven: Driven = null;
  let reelOpen = false;

  // ───────── the controls, with the overlay chips along the bottom edge ─────────
  const toggleBtn = h(
    'button',
    { type: 'button', class: 'ochip dir-toggle', 'aria-pressed': String(on), 'aria-label': 'Director', 'data-tip': TIP_DIRECTOR, onClick: () => setOn(!on, 'button') },
    icon('target', 15),
    h('span', { class: 'ochip-label' }, 'Director'),
  );
  const reelBtn = h(
    'button',
    { type: 'button', class: 'ochip dir-reel-btn', 'aria-expanded': 'false', 'aria-controls': 'lw-dir-reel', 'aria-label': 'What happened', 'data-tip': TIP_REEL, onClick: () => setReel(!reelOpen) },
    icon('clock', 15),
    h('span', { class: 'ochip-label' }, 'What happened'),
  );

  // ───────── the reel ─────────
  interface ReelRow {
    el: HTMLLIElement;
    btn: HTMLButtonElement;
    text: HTMLElement;
    day: HTMLElement;
    ev: WorldEvent | null;
  }
  const reelList = h('ul', { class: 'dir-list scroll', 'aria-label': `Notable events of the last ${REEL_DAYS} days` });
  const reelEmpty = h('p', { class: 'empty dir-empty' }, 'Nothing notable in the last three days.');
  const reelPop = h(
    'section',
    { class: 'dir-reel glass', id: 'lw-dir-reel', 'aria-label': 'What happened', hidden: true },
    h('header', { class: 'dir-reel-head' }, h('span', { class: 'cap' }, 'What happened'), h('span', { class: 'muted' }, 'the last three days')),
    reelList,
    reelEmpty,
  );
  const group = h('div', { class: 'pill ochips glass dir-ctl', role: 'group', 'aria-label': 'Story director' }, toggleBtn, reelBtn, reelPop);
  slots.bottom.appendChild(group);

  /** jump to an event the way a row of the feed does; this is the viewer taking the camera, so the director stands down first */
  const jump = (ev: WorldEvent): void => {
    if (on) setOn(false, 'viewer');
    setReel(false);
    const target = ev.ids.find((id) => game.world.byId.has(id));
    if (target) game.focusEntity(target);
    else if (hasPlace(ev)) game.flyTo(ev.x, ev.y);
  };
  const rows = new KeyedList<WorldEvent, ReelRow>(
    reelList,
    () => {
      const text = h('span', { class: 'dir-row-text' });
      const day = h('span', { class: 'dir-row-day num' });
      const btn = h('button', { type: 'button', class: 'dir-row' }, text, day);
      const row: ReelRow = { el: h('li', null, btn), btn, text, day, ev: null };
      btn.addEventListener('click', () => {
        if (row.ev) jump(row.ev);
      });
      return row;
    },
    (row, ev) => {
      row.ev = ev;
      setText(row.text, ev.text);
      setText(row.day, `Day ${dayNumber(ev.tick)}`);
      row.btn.setAttribute('aria-label', `${ev.text} (day ${dayNumber(ev.tick)}). Look at it.`);
    },
  );
  function refreshReel(): void {
    const events = reelOf(game.world);
    rows.sync(events, (ev) => String(ev.id));
    setHidden(reelEmpty, events.length > 0);
    setHidden(reelList, events.length === 0);
  }
  function setReel(v: boolean): void {
    reelOpen = v;
    setHidden(reelPop, !v);
    setBool(reelBtn, 'aria-expanded', v);
    nextWhat.setAttribute('aria-expanded', String(v));
    if (v) refreshReel();
  }

  // ───────── the caption ─────────
  const live = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const says = h('p', { class: 'dir-says' });
  const when = h('span', { class: 'dir-when num' });
  const nextBtn = h('button', { type: 'button', class: 'btn sm dir-next', 'aria-label': 'Next: go to the next happening', 'data-tip': 'Next\nSkip to the next noteworthy happening, when one is waiting.', onClick: () => model.skip() }, 'Next');
  const nextWhat = h('button', { type: 'button', class: 'btn sm dir-what', 'aria-expanded': 'false', 'aria-controls': 'lw-dir-reel', 'data-tip': TIP_REEL, onClick: () => setReel(!reelOpen) }, 'What happened');
  const caption = h(
    'div',
    { class: 'dir-caption glass', role: 'group', 'aria-label': 'Director caption', hidden: true },
    icon('target', 16, 'dir-ico'),
    h('div', { class: 'dir-body' }, says, when),
    h('div', { class: 'dir-actions' }, nextBtn, nextWhat),
  );
  const layer = h('div', { class: 'dir-layer' }, caption, live);
  root.appendChild(layer);
  const measure = new Every(0.25);
  const slow = new Every(1, false);

  const hideCaption = (): void => {
    setHidden(caption, true);
    toggle(root, 'has-director', false);
    setVar(root, '--dir-h', '0px');
  };

  function sync(): void {
    setBool(toggleBtn, 'aria-pressed', on);
    if (!on) hideCaption();
  }
  sync();

  // ───────── on and off ─────────
  function setOn(v: boolean, by: 'button' | 'key' | 'viewer'): void {
    if (v === on) return;
    on = v;
    ctx.prefs.director = v;
    ctx.savePrefs();
    // turned on, it starts from now: what already happened is history; turned off, it forgets its shot
    resetShots();
    sync();
    ctx.toast(v ? 'Director on. The camera follows noteworthy happenings until you take it.' : by === 'viewer' ? 'Director off. The camera is yours.' : 'Director off.', 'info', 3500);
  }

  function resetShots(): void {
    model.reset();
    lastRev = 0;
    driven = null;
    live.textContent = '';
    hideCaption();
  }

  // ───────── driving the view ─────────
  /** a new shot, or one whose person has gone: put the camera on the person, or on the place */
  function begin(shot: Shot): void {
    acting = true;
    try {
      if (shot.subjectId) {
        // a fly still under way would hold the camera ahead of the follow
        game.fly = null;
        game.select(shot.subjectId);
        game.setFollow(true);
        driven = { kind: 'follow', id: shot.subjectId };
      } else if (hasPlace(shot.ev)) {
        game.select(0);
        game.flyTo(shot.x, shot.y);
        driven = { kind: 'place', x: shot.x, y: shot.y, fly: game.fly, held: null };
      } else if (driven?.kind === 'follow' && !(game.following && game.selectedId === driven.id)) {
        // an event with no place (the winter setting in): the camera stays where it is, as long as it still has its person
        driven = null;
      }
    } finally {
      acting = false;
    }
    live.textContent = shot.ev.text;
  }

  /** The viewer took the camera: a click, a key, the minimap, a drag. Selecting and following say so by themselves; a drag or a turn of the wheel while the camera is not following only clears the fly, so that is read from where the camera is. */
  function viewerTookCamera(): void {
    setOn(false, 'viewer');
  }

  function watch(): void {
    const d = driven;
    if (!d) return;
    if (d.kind === 'follow') {
      // the person is still here but the camera is no longer on them: somebody let go
      if (game.world.byId.has(d.id) && (!game.following || game.selectedId !== d.id)) viewerTookCamera();
      return;
    }
    const cam = game.camera;
    if (d.held) {
      if (Math.hypot(cam.x - d.held.x, cam.y - d.held.y) > CAM_TOL) viewerTookCamera();
      return;
    }
    if (game.fly === d.fly) return; // still on its way
    if (game.fly) {
      viewerTookCamera(); // somebody else's fly
      return;
    }
    // the fly is over: the renderer arrived, or the viewer cleared it (a drag, the wheel, the minimap) before it did
    const p = project(d.x, d.y);
    const aim = { x: p.sx + game.viewInsetRight / 2 / cam.zoom, y: p.sy, zoom: cam.zoom };
    const view = root.getBoundingClientRect();
    clampCamera(aim, game.world, { w: view.width, h: view.height });
    if (Math.hypot(cam.x - aim.x, cam.y - aim.y) <= CAM_TOL) d.held = { x: cam.x, y: cam.y };
    else viewerTookCamera();
  }

  let measuredRev = 0;
  function draw(shot: Shot | null, dt: number): void {
    const fresh = !!shot && model.captionFresh();
    setHidden(caption, !fresh);
    toggle(root, 'has-director', fresh);
    if (!fresh || !shot) {
      setVar(root, '--dir-h', '0px');
      measuredRev = 0;
      return;
    }
    setText(says, shot.ev.text);
    setText(when, `Day ${dayNumber(shot.ev.tick)}, ${agoText(game.world, shot.ev.tick)}`);
    // an ordinary event shown in a quiet stretch reads the same, only quieter
    toggle(caption, 'is-ambient', shot.ambient);
    const none = !model.hasNext();
    if (nextBtn.disabled !== none) nextBtn.disabled = none;
    // the height the caption takes, for the narrow layouts that lift the inspector above it
    if (measure.step(dt) || measuredRev !== shot.rev) {
      measuredRev = shot.rev;
      setVar(root, '--dir-h', `${caption.offsetHeight}px`);
    }
  }

  // a stray press outside the reel closes it; Esc closes it and keeps the selection
  const onOutside = (e: PointerEvent): void => {
    if (!reelOpen) return;
    const t = e.target as Node | null;
    if (t && (group.contains(t) || caption.contains(t))) return;
    setReel(false);
  };
  document.addEventListener('pointerdown', onOutside, true);
  // in the capture phase, before the shortcuts' Esc (which would let go of the selection, and that would end the director)
  const onEscape = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || !reelOpen) return;
    const active = document.activeElement;
    setReel(false);
    if (active && (group.contains(active) || caption.contains(active))) reelBtn.focus();
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener('keydown', onEscape, true);

  // a handle for the automated browser checks, as __game and __eventCards are
  (window as unknown as Record<string, unknown>).__director = model;

  return {
    toggle() {
      setOn(!on, 'key');
    },
    update(dt) {
      changing = false;
      if (reelOpen && slow.step(dt)) refreshReel();
      if (!on) return;
      model.step(game.world, dt);
      const shot = model.shot;
      if (shot && shot.rev !== lastRev) {
        lastRev = shot.rev;
        begin(shot);
      }
      watch();
      if (!on) return;
      draw(model.shot, dt);
    },
    onGame(e) {
      if (e === 'beforeWorldChange') {
        changing = true;
        resetShots();
        return;
      }
      if (e === 'restart') {
        resetShots();
        return;
      }
      if (e === 'scene') {
        changing = false;
        return;
      }
      if (!on || acting || changing) return;
      if (e !== 'select' && e !== 'follow') return;
      const s = model.shot;
      // the game clears the selection itself when the selected person dies: not the viewer. The shot carries on as one of the place.
      if (e === 'select' && game.selectedId === 0 && s && s.subjectId && !game.world.byId.has(s.subjectId)) return;
      viewerTookCamera();
    },
    dispose() {
      document.removeEventListener('pointerdown', onOutside, true);
      window.removeEventListener('keydown', onEscape, true);
      group.remove();
      layer.remove();
      toggle(root, 'has-director', false);
      setVar(root, '--dir-h', '0px');
    },
  };
}
