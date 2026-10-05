// The world menu: seed, new world, random seed, difficulty toggles, test scenes, save and load.
import { hasSavedGame, loadGame, saveGame, savedGameInfo } from '../app/save';
import { SCENE_LABELS } from '../sim/scenes';
import type { SceneId } from '../sim/types';
import { copyText, h, setAttr, setBool, wallAgo } from './dom';
import { icon } from './icons';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';

const WORDS = [
  'meadow', 'willow', 'harbor', 'ember', 'cedar', 'brook', 'lantern', 'orchard', 'heron', 'clover',
  'quarry', 'hollow', 'birch', 'saffron', 'moss', 'tide', 'fern', 'dune', 'wren', 'alder',
  'thistle', 'copper', 'juniper', 'marsh', 'linden', 'pebble', 'sparrow', 'cinder', 'amber', 'hazel',
];

/** A pleasant, readable seed such as "meadow-4821" (UI-side randomness only; the simulation never sees Math.random) */
export function randomSeed(): string {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `${w}-${n}`;
}

/** the short wording the menu has always used for the first staged scenes */
const SCENE_WORDS: Partial<Record<SceneId, { title: string; blurb: string }>> = {
  natural: { title: 'Natural world', blurb: 'Nothing staged. Restarts with this seed.' },
  contest: { title: 'Test: Contested berry', blurb: 'Two hungry people, one berry.' },
  help: { title: 'Test: Asking for help', blurb: 'One request is met, one is refused.' },
  cooperate: { title: 'Test: Shared building', blurb: 'One builds while another brings materials.' },
};

/** the order scenes are listed in; one the simulation has no label for yet is left out */
const SCENE_ORDER: SceneId[] = ['natural', 'contest', 'help', 'cooperate', 'workshop', 'meal', 'haul', 'care', 'grief'];

/** A scene the menu has no wording for is listed from its own label: "TEST SCENE · Name — what happens (staged)". */
function sceneWords(id: SceneId): { title: string; blurb: string } | null {
  const known = SCENE_WORDS[id];
  if (known) return known;
  const label = (SCENE_LABELS as Partial<Record<SceneId, string>>)[id];
  if (!label) return null;
  const body = label.replace(/^TEST SCENE\s*[·:\-–—]\s*/i, '').replace(/\s*\(staged\)\s*$/i, '');
  const [name, ...rest] = body.split(/\s+[—–]\s+/);
  const said = rest.join(' — ').trim();
  const blurb = said ? `${said.charAt(0).toUpperCase()}${said.slice(1)}${/[.!?]$/.test(said) ? '' : '.'}` : '';
  return { title: `Test: ${name}`, blurb };
}

const SCENE_ITEMS: { id: SceneId; title: string; blurb: string }[] = [];
for (const id of SCENE_ORDER) {
  const words = sceneWords(id);
  if (words) SCENE_ITEMS.push({ id, ...words });
}

export interface WorldMenu extends Part {
  toggle(): void;
  open(): void;
  close(): boolean;
  isOpen(): boolean;
  setOpener(el: HTMLElement): void;
}

function makeSwitch(label: string, hint: string, checked: boolean, onChange: (v: boolean) => void): { el: HTMLElement; input: HTMLInputElement } {
  const input = h('input', { type: 'checkbox', role: 'switch', class: 'sw-input' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  const el = h(
    'label',
    { class: 'switch' },
    input,
    h('span', { class: 'sw-track', 'aria-hidden': 'true' }, h('i')),
    h('span', { class: 'sw-txt' }, h('b', null, label), h('small', null, hint)),
  );
  return { el, input };
}

export function createWorldMenu(ctx: UICtx, slots: Slots): WorldMenu {
  const { game } = ctx;
  let opener: HTMLElement | null = null;
  let isOpen = false;

  const curSeed = h('span', { class: 'wm-seed mono' });
  const copyBtn = h('button', { type: 'button', class: 'iconbtn sm', 'aria-label': 'Copy the current seed', 'data-tip': 'Copy the current seed', onClick: () => void doCopy() }, icon('copy', 14));
  const input = h('input', {
    id: 'lw-seed-input',
    class: 'input mono',
    type: 'text',
    maxlength: '40',
    spellcheck: 'false',
    autocomplete: 'off',
    autocapitalize: 'off',
    placeholder: 'type a seed (blank for a random one)',
    'aria-label': 'Seed for the new world',
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      newWorld();
    }
  });
  const dice = h(
    'button',
    {
      type: 'button',
      class: 'iconbtn dice',
      'aria-label': 'Random seed',
      'data-tip': 'Pick a random seed',
      onClick: () => {
        input.value = randomSeed();
        input.focus();
        input.select();
      },
    },
    icon('dice', 18),
  );
  const newBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn primary block',
      'data-tip': 'Start a fresh natural world from the seed above\nA blank box picks a random seed. The same seed always grows the same world.',
      onClick: () => newWorld(),
    },
    icon('cube', 15),
    'New world',
  );

  const harsh = makeSwitch('Harsh conditions', 'Colder, wetter, less food · next new world', game.settings.harsh, (v) => {
    ctx.prefs.harsh = v;
    ctx.savePrefs();
  });
  const arrivals = makeSwitch('Arrivals', 'Travellers may join · next new world', game.settings.immigration, (v) => {
    ctx.prefs.immigration = v;
    ctx.savePrefs();
  });

  const debugBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn iconlike',
      'aria-pressed': String(game.debug),
      'aria-label': 'Debug panel',
      'data-tip': 'Debug panel (Shift+D)\nTick, state hash, frame rate, item ledger and each person’s last decision.',
      onClick: () => game.setDebug(!game.debug),
    },
    icon('bug', 16),
  );

  const sceneBtns = SCENE_ITEMS.map((s) =>
    h(
      'button',
      {
        type: 'button',
        class: 'scene-item',
        'data-scene': s.id,
        'aria-label': `${s.title}. ${s.blurb}`,
        onClick: () => {
          if (s.id === 'natural') game.restart({ scene: 'natural' });
          else game.loadScene(s.id);
          close();
        },
      },
      h('span', { class: 'si-title' }, s.title),
      h('span', { class: 'si-blurb' }, s.blurb),
      h('span', { class: 'si-now badge t-accent' }, 'now'),
    ),
  );

  const saveBtn = h('button', { type: 'button', class: 'btn', onClick: () => void doSave() }, icon('save', 15), 'Save');
  const saveWrap = h('span', { class: 'tipwrap', 'data-tip': 'Save this world in this browser (one save slot; it replaces the previous save)' }, saveBtn);
  const loadBtn = h('button', { type: 'button', class: 'btn', onClick: () => void doLoad() }, icon('folder', 15), 'Load');
  const loadWrap = h('span', { class: 'tipwrap', 'data-tip': 'No saved world yet' }, loadBtn);

  const menu = h(
    'div',
    { id: 'lw-world-menu', class: 'worldmenu glass', role: 'dialog', 'aria-label': 'World menu', hidden: true },
    h(
      'section',
      { class: 'wm-sec' },
      h('div', { class: 'wm-row' }, h('span', { class: 'cap' }, 'This world’s seed'), h('span', { class: 'wm-seedwrap' }, curSeed, copyBtn)),
      h('label', { class: 'cap wm-lab', for: 'lw-seed-input' }, 'Start a new world'),
      h('div', { class: 'wm-seedrow' }, input, dice),
      newBtn,
    ),
    h('section', { class: 'wm-sec' }, harsh.el, arrivals.el),
    h('section', { class: 'wm-sec' }, h('div', { class: 'cap wm-lab' }, 'Scenes'), h('div', { class: 'wm-scenes' }, sceneBtns)),
    h('section', { class: 'wm-sec wm-io' }, saveWrap, loadWrap, debugBtn),
  );
  slots.topLeft.appendChild(menu);

  // ───────── behaviour ─────────
  function newWorld(): void {
    const seed = input.value.trim() || randomSeed();
    ctx.prefs.harsh = harsh.input.checked;
    ctx.prefs.immigration = arrivals.input.checked;
    game.restart({ seed, scene: 'natural', harsh: harsh.input.checked, immigration: arrivals.input.checked });
    input.value = '';
    ctx.toast(`New world · seed ${seed}`, 'good');
    close();
  }

  async function doCopy(): Promise<void> {
    const ok = await copyText(game.settings.seed);
    ctx.toast(ok ? 'Seed copied to the clipboard' : 'Could not copy the seed', ok ? 'good' : 'warn');
  }

  async function doSave(): Promise<void> {
    saveBtn.disabled = true;
    const ok = await saveGame(game);
    saveBtn.disabled = false;
    refreshIO();
    if (ok) ctx.toast(`World saved (day ${savedGameInfo()?.day ?? '?'})`, 'good');
    else ctx.toast('Could not save: browser storage is full or blocked.', 'error');
  }

  async function doLoad(): Promise<void> {
    const info = savedGameInfo();
    if (!info) {
      ctx.toast('There is no saved world yet.', 'warn');
      return;
    }
    loadBtn.disabled = true;
    const ok = await loadGame(game);
    refreshIO();
    if (ok) {
      ctx.toast(`Loaded the saved world (seed ${info.seed}, day ${info.day})`, 'good');
      close();
    } else ctx.toast('Could not read the saved world.', 'error');
  }

  function refreshIO(): void {
    const has = hasSavedGame();
    loadBtn.disabled = !has;
    const info = savedGameInfo();
    const tip = info
      ? `Load the saved world\nSeed ${info.seed} · day ${info.day} · ${info.population} people${info.scene && info.scene !== 'natural' ? ' · test scene' : ''}\nSaved ${wallAgo(info.savedAt)}. Replaces the world you are watching.`
      : 'No saved world yet';
    setAttr(loadWrap, 'data-tip', tip);
    setAttr(loadBtn, 'aria-label', info ? `Load the saved world: seed ${info.seed}, day ${info.day}` : 'Load (no saved world yet)');
  }

  function syncFromGame(): void {
    curSeed.textContent = game.settings.seed;
    setBool(debugBtn, 'aria-pressed', game.debug);
    for (const b of sceneBtns) {
      const now = b.dataset.scene === game.settings.scene;
      setAttr(b, 'aria-current', now ? 'true' : null);
      b.classList.toggle('is-now', now);
    }
    refreshIO();
  }

  function open(): void {
    if (isOpen) return;
    isOpen = true;
    syncFromGame();
    menu.hidden = false;
    opener?.setAttribute('aria-expanded', 'true');
    input.focus({ preventScroll: true });
  }

  function close(): boolean {
    if (!isOpen) return false;
    isOpen = false;
    menu.hidden = true;
    opener?.setAttribute('aria-expanded', 'false');
    if (menu.contains(document.activeElement)) opener?.focus({ preventScroll: true });
    return true;
  }

  const outside = (e: PointerEvent) => {
    if (!isOpen) return;
    const t = e.target as Node | null;
    if (t && (menu.contains(t) || opener?.contains(t))) return;
    close();
  };
  document.addEventListener('pointerdown', outside, true);

  return {
    toggle() {
      if (isOpen) close();
      else open();
    },
    open,
    close,
    isOpen: () => isOpen,
    setOpener(el) {
      opener = el;
    },
    onGame(e) {
      if (e === 'debug') setBool(debugBtn, 'aria-pressed', game.debug);
      if (e === 'restart') {
        // whatever world is now running is what the "next new world" switches start from
        curSeed.textContent = game.settings.seed;
        harsh.input.checked = game.settings.harsh;
        arrivals.input.checked = game.settings.immigration;
      }
    },
    dispose() {
      document.removeEventListener('pointerdown', outside, true);
      menu.remove();
    },
  };
}
