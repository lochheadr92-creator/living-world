import { Every, h } from './dom';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';
import type { ViewerPreferences } from '../app/viewer';

/** Accessible native controls; changes affect observation only. */
export function createViewerControls(ctx: UICtx, slots: Slots): Part {
  const { game, root } = ctx;
  const selects = new Map<keyof ViewerPreferences, HTMLSelectElement>();
  function select<K extends 'speech' | 'textSize' | 'contrast'>(key: K, label: string, options: [ViewerPreferences[K], string][]) {
    const input = h('select', { id: `viewer-${key}`, 'aria-label': label,
      onChange: () => game.setViewer({ [key]: input.value }) }, options.map(([value, text]) => h('option', { value }, text)));
    selects.set(key, input);
    return h('label', { class: 'viewer-field', for: input.id }, h('span', null, label), input);
  }
  const reduce = h('input', { type: 'checkbox', id: 'viewer-motion', onChange: () => game.setViewer({ reducedMotion: reduce.checked }) });
  const controls = h('details', { class: 'viewer-controls glass' },
    h('summary', null, 'View'),
    h('div', { class: 'viewer-settings' },
      select('speech', 'Map speech', [['automatic','Automatic'],['selected','Selected person only'],['hidden','Hidden']]),
      h('p', { id: 'viewer-speech-help' }, 'Automatic prioritises the selected person and warnings. Selected person only includes only their warnings. Hidden hides all map speech, including warnings. Full current speech stays in the person panel.'),
      select('textSize', 'Text size', [['normal','Normal'],['large','Large']]),
      select('contrast', 'Contrast', [['standard','Standard'],['high','High']]),
      h('label', { class: 'viewer-field', for: reduce.id }, 'Reduce motion', reduce),
      h('p', null, 'Map detail also follows zoom. Names, intentions and speech share the available space.')));
  selects.get('speech')!.setAttribute('aria-describedby', 'viewer-speech-help');
  slots.bottom.appendChild(controls);
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => {
    for (const [key, input] of selects) input.value = String(game.viewer[key]);
    reduce.checked = game.viewer.reducedMotion;
    root.dataset.textSize = game.viewer.textSize;
    root.dataset.contrast = game.viewer.contrast;
    root.dataset.reducedMotion = String(game.viewer.reducedMotion || systemMotion.matches);
  };
  systemMotion.addEventListener('change', sync);
  // Panel geometry is presentation state, sampled after UI updates, including narrow-screen inspectors.
  // Each opaque surface is measured separately; transparent dock space remains available to the world.
  const beat = new Every(0.15, true);
  const measurePanels = () => {
    // A long staged-scene title or larger text must not hide the inspector's close/follow controls on a phone.
    const banner = root.querySelector<HTMLElement>('.scene-banner');
    const bannerBottom = banner && !banner.hidden && window.innerWidth <= 680 ? banner.getBoundingClientRect().bottom + 8 : 0;
    root.style.setProperty('--viewer-inspector-top', `${bannerBottom}px`);
    game.viewOcclusions = [...root.querySelectorAll<HTMLElement>('.glass, .wm, .help-card, .viewer-settings')]
      .filter(el => !el.closest('[hidden]'))
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 0 && r.height > 0)
      .map(r => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && controls.open) { controls.open = false; controls.querySelector('summary')!.focus(); event.stopPropagation(); }
  };
  controls.addEventListener('keydown', escape);
  sync(); measurePanels();
  return {
    onGame(event) { if (event === 'viewer') { sync(); measurePanels(); } },
    update(dt) { if (beat.step(dt)) measurePanels(); },
    dispose() { controls.remove(); game.viewOcclusions = []; systemMotion.removeEventListener('change', sync); },
  };
}
