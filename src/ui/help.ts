// The help overlay: short, friendly, and dismissable with Esc, a click outside or the button.
import { h } from './dom';
import { icon } from './icons';
import { OVERLAY_DEFS } from './overlays';
import type { Part, UICtx } from './context';

export interface HelpPart extends Part {
  open(): void;
  close(): boolean;
  toggle(): void;
  isOpen(): boolean;
}

type KeyRow = [keys: string[], what: string];

const GROUPS: { title: string; rows: KeyRow[] }[] = [
  {
    title: 'Move around',
    rows: [
      [['Drag'], 'pan the map'],
      [['W', 'A', 'S', 'D'], 'or the arrow keys pan'],
      [['Wheel'], 'zoom (pinch on a touch screen, or + and −)'],
      [['Home', 'C'], 'back to the camp'],
      [['Minimap'], 'click or drag to jump anywhere'],
    ],
  },
  {
    title: 'Look closer',
    rows: [
      [['Click'], 'a person, building, field or resource to look inside'],
      [['F'], 'follow the selected person (or double-click them)'],
      [['Esc'], 'let go, close menus'],
    ],
  },
  {
    title: 'Time',
    rows: [
      [['Space'], 'pause or play'],
      [['.'], 'step forward one tick'],
      [['1', '–', '6'], 'speed from 0.5× up to 16×'],
      [['[', ']'], 'slower, faster'],
    ],
  },
];

const INSPECTOR_NOTES: [string, string][] = [
  ['What are they up to?', 'Five plain answers: what they are doing, why, what they hope for, what is in the way, and how the last try went.'],
  ['Promises, talk and quarrels', 'A person’s card also shows what they have promised and how earlier promises ended (done, expired, moot, interrupted, failed or broken), the conversation they are in and the last one, a shared meal they are hosting or have said yes to and the last one, who they are worried about, and who they are still sore at. A part with nothing to show stays hidden.'],
  ['What they know is not what exists.', 'People only know what they have seen or been told, and memories go stale. “Opportunities” lists things nearby they could have used, and why they did not.'],
  ['Speed, honestly', 'Under the speed buttons the bar says the speed you asked for and the speed actually achieved. If the page cannot keep up it says so, and how many ticks of world time it skipped. Nothing is shown while paused.'],
  ['Test scenes', 'Anything under “Scenes” is staged on purpose to show one rule at a time, and is always labelled TEST SCENE. On a small screen the banner folds down to the scene’s name; tap it to read more.'],
];

const WORK_NOTES: [string, string][] = [
  ['Workshops', 'A timber yard saws planks, a kiln fires bricks and charcoal, a smithy smelts iron, a bakery mills flour and bakes bread, a quarry cuts stone. Click one to see the batch under way, what it will make and who is at it. Smoke and glow appear only while something is really being made.'],
  ['Tools and carts', 'Axes, picks, hammers, saws and water jars make work faster and wear out; the small icons under “Carrying” show what someone holds and how worn each tool is. A handcart trails whoever pulls it, its load stacked in it.'],
  ['Buildings rise in stages', 'Pegs and a cord, then heaps of whatever has been delivered, a footing, a frame, walls and roof. A site marked with an orange ! is waiting for materials, not for people; the little squares say what is missing.'],
];

export function createHelp(ctx: UICtx): HelpPart {
  let isOpen = false;
  let lastFocus: HTMLElement | null = null;

  const closeBtn = h('button', { type: 'button', class: 'btn primary', onClick: () => close() }, 'Got it');
  const xBtn = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Close help', 'data-tip': 'Close (Esc)', onClick: () => close() }, icon('close', 16));

  const keyCell = (keys: string[]) =>
    h(
      'span',
      { class: 'keys' },
      keys.map((k) => (k === '–' ? h('span', { class: 'key-dash' }, k) : h('kbd', null, k))),
    );

  const groups = GROUPS.map((g) =>
    h(
      'section',
      { class: 'help-group' },
      h('h3', { class: 'cap' }, g.title),
      h(
        'dl',
        { class: 'help-rows' },
        g.rows.map(([keys, what]) => h('div', { class: 'help-row' }, h('dt', null, keyCell(keys)), h('dd', null, what))),
      ),
    ),
  );

  const overlayRows = OVERLAY_DEFS.map((d) =>
    h('div', { class: 'help-ov' }, h('span', { class: 'help-ov-ico' }, icon(d.icon, 15)), h('div', null, h('b', null, d.label), h('span', null, d.short))),
  );

  const notes = INSPECTOR_NOTES.map(([t, d]) => h('div', { class: 'help-note' }, h('b', null, t), h('span', null, d)));
  const workNotes = WORK_NOTES.map(([t, d]) => h('div', { class: 'help-note' }, h('b', null, t), h('span', null, d)));

  const card = h(
    'div',
    { class: 'help-card glass scroll', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lw-help-title', tabindex: '-1' },
    h(
      'header',
      { class: 'help-head' },
      h('div', null, h('h2', { id: 'lw-help-title' }, 'Welcome to Living World'), h('p', { class: 'help-lede' }, 'A small community lives in this valley. Nobody is scripted: people notice what is near them, remember what they have seen, and decide for themselves. You mostly watch.')),
      xBtn,
    ),
    h('div', { class: 'help-cols' }, groups),
    h('section', { class: 'help-group wide' }, h('h3', { class: 'cap' }, 'The bar along the bottom'), h('div', { class: 'help-ovs' }, overlayRows)),
    h('section', { class: 'help-group wide' }, h('h3', { class: 'cap' }, 'Reading the inspector'), h('div', { class: 'help-notes' }, notes)),
    h('section', { class: 'help-group wide' }, h('h3', { class: 'cap' }, 'Workshops, tools & carts'), h('div', { class: 'help-notes' }, workNotes)),
    h('footer', { class: 'help-foot' }, h('span', { class: 'muted' }, 'Press ? or H any time to bring this back. Shift+D shows the debug panel.'), closeBtn),
  );
  const backdrop = h('div', { class: 'help-backdrop', hidden: true }, card);
  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = Array.from(card.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')).filter((x) => !x.hidden);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  ctx.root.appendChild(backdrop);

  function open(): void {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement as HTMLElement | null;
    backdrop.hidden = false;
    closeBtn.focus({ preventScroll: true });
  }

  function close(): boolean {
    if (!isOpen) return false;
    isOpen = false;
    backdrop.hidden = true;
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
    return true;
  }

  return {
    open,
    close,
    toggle() {
      if (isOpen) close();
      else open();
    },
    isOpen: () => isOpen,
    dispose() {
      backdrop.remove();
    },
  };
}
