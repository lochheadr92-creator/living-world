// Top bar: title, seed chip (opens the world menu), world clock and population summary,
// and the unmissable banner shown while a staged test scene is running.
import { SCENE_INFO } from '../sim/scenes';
import { summarizeWorld, type WorldSummary } from '../sim/inspect';
import { copyText, Every, h, setAttr, setHidden, setText } from './dom';
import { icon, setIcon, type IconName } from './icons';
import { iconButton } from './widgets';
import type { Part, UICtx } from './context';
import type { Slots } from './layout';
import type { WorldMenu } from './worldmenu';

function weatherIcon(s: WorldSummary): IconName {
  if (s.weather === 'Storm') return 'storm';
  if (s.weather === 'Rain') return 'rain';
  if (s.weather === 'Cloudy') return 'cloud';
  return s.phase === 'night' ? 'moon' : 'sun';
}

interface StatEls {
  el: HTMLElement;
  val: HTMLElement;
  sub: HTMLElement;
  ico: HTMLElement | null;
}

function stat(iconName: IconName | null, cls = ''): StatEls {
  const val = h('div', { class: 'st-val num' });
  const sub = h('div', { class: 'st-sub num' });
  const ico = iconName ? icon(iconName, 18, 'st-ico') : null;
  const el = h('div', { class: `stat ${cls}`.trim() }, ico, h('div', { class: 'st-txt' }, val, sub));
  return { el, val, sub, ico };
}

export function createTopbar(ctx: UICtx, slots: Slots, menu: WorldMenu): Part {
  const { game } = ctx;

  // ───────── brand pill ─────────
  const seedVal = h('span', { class: 'seed-val mono' });
  const chev = icon('chevron', 12, 'seed-chev');
  const seedChip = h(
    'button',
    {
      type: 'button',
      class: 'seedchip',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-controls': 'lw-world-menu',
      'aria-label': 'World menu',
      'data-tip': 'The world’s seed\nOpen the world menu: new world, test scenes, save and load.',
      onClick: () => menu.toggle(),
    },
    icon('sprout', 15, 'seed-ico'),
    seedVal,
    chev,
  );
  menu.setOpener(seedChip);
  const copyBtn = iconButton('copy', 'Copy seed', 'Copy the seed', () => {
    void copyText(game.settings.seed).then((ok) => ctx.toast(ok ? 'Seed copied to the clipboard' : 'Could not copy the seed', ok ? 'good' : 'warn'));
  });
  const helpBtn = iconButton('help', 'Help and controls', 'Help and controls (?)', () => ctx.toggleHelp());
  const brand = h(
    'div',
    { class: 'pill brand glass' },
    h('span', { class: 'logo', 'aria-hidden': 'true' }, icon('logo', 24)),
    h('h1', { class: 'title' }, 'Living World'),
    seedChip,
    copyBtn,
    helpBtn,
  );
  slots.topLeft.prepend(brand);

  // ───────── world summary pill ─────────
  const clock = h('div', { class: 'st-clock num' }, '--:--');
  const clockSub = h('div', { class: 'st-sub num' });
  const clockStat = h('div', { class: 'stat clockstat' }, h('div', { class: 'st-txt' }, clock, clockSub));
  const weather = stat('sun');
  const people = stat('person');
  const homes = stat('users');
  const sep = () => h('span', { class: 'stdiv', 'aria-hidden': 'true' });
  const stats = h('div', { class: 'pill stats glass', role: 'group', 'aria-label': 'World summary' }, clockStat, sep(), weather.el, sep(), people.el, sep(), homes.el);
  slots.topCenter.appendChild(stats);

  // ───────── staged-scene banner ─────────
  const sceneTitle = h('div', { class: 'scene-title' });
  const sceneBlurb = h('div', { class: 'scene-blurb' });
  const backBtn = h('button', { type: 'button', class: 'btn', onClick: () => game.restart({ scene: 'natural' }) }, icon('arrow', 14, 'flip'), 'Back to the natural world');
  const banner = h(
    'div',
    { class: 'scene-banner glass', role: 'status', hidden: true },
    h('div', { class: 'scene-flag' }, h('span', { class: 'scene-badge' }, 'TEST SCENE'), h('span', { class: 'scene-staged' }, 'staged, not spontaneous')),
    h('div', { class: 'scene-main' }, sceneTitle, sceneBlurb),
    backBtn,
  );
  slots.banner.appendChild(banner);
  // on a phone the banner folds down to its name; a tap opens it, and picking someone folds it again so the inspector is clear
  banner.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.btn')) banner.classList.toggle('is-open');
  });
  let bannerFor = '';

  // ───────── updates ─────────
  const slow = new Every(0.25);

  const refresh = () => {
    const world = game.world;
    const s = summarizeWorld(world);
    setText(clock, s.clock);
    setText(clockSub, `Day ${s.day} · ${s.phase}`);
    setText(weather.val, s.weather);
    setText(weather.sub, `${s.temp} °C`);
    if (weather.ico) setIcon(weather.ico, weatherIcon(s), 18);

    setText(people.val, `${s.population} ${s.population === 1 ? 'person' : 'people'}`);
    const bits: string[] = [];
    if (s.children > 0) bits.push(`${s.children} ${s.children === 1 ? 'child' : 'children'}`);
    if (s.elders > 0) bits.push(`${s.elders} ${s.elders === 1 ? 'elder' : 'elders'}`);
    setText(people.sub, bits.length ? bits.join(' · ') : 'all grown');
    setAttr(
      people.el,
      'data-tip',
      `${s.population} alive: ${s.children} children, ${s.elders} elders.\n${s.births} born and ${s.deaths} died since the start.`,
    );

    setText(homes.val, `${s.households} ${s.households === 1 ? 'household' : 'households'}`);
    setText(homes.sub, `${s.homes} ${s.homes === 1 ? 'home' : 'homes'}`);
    setAttr(homes.el, 'data-tip', `${s.households} households living in ${s.homes} homes.\nFood in stores and packs: ${s.foodHeld} portions.`);

    setText(seedVal, game.settings.seed);
    setAttr(seedChip, 'aria-label', `World menu. Current seed: ${game.settings.seed}`);

    const label = world.sceneLabel;
    const showBanner = label !== '';
    setHidden(banner, !showBanner);
    ctx.root.classList.toggle('has-banner', showBanner);
    if (!showBanner) bannerFor = '';
    if (showBanner) {
      // a scene just started: open, so the first thing seen is what to watch for
      if (bannerFor !== game.settings.scene) {
        bannerFor = game.settings.scene;
        banner.classList.add('is-open');
      }
      // the name only: what happens is in the blurb below, and the flag already says it is staged
      const named = label.replace(/^TEST SCENE\s*[·:\-–—]\s*/i, '').replace(/\s*\(staged\)\s*$/i, '');
      setText(sceneTitle, named.split(/\s+[—–]\s+/)[0]);
      setAttr(sceneTitle, 'data-tip', named);
      const info = game.settings.scene !== 'natural' ? SCENE_INFO[game.settings.scene as Exclude<typeof game.settings.scene, 'natural'>] : '';
      setText(sceneBlurb, info ?? '');
    }
  };
  refresh();

  return {
    update(dt) {
      if (slow.step(dt)) refresh();
    },
    onGame(e) {
      if (e === 'select' && game.selectedId) banner.classList.remove('is-open');
      if (e === 'restart' || e === 'scene' || e === 'debug' || e === 'step') refresh();
    },
    dispose() {
      ctx.root.classList.remove('has-banner');
      brand.remove();
      stats.remove();
      banner.remove();
    },
  };
}
