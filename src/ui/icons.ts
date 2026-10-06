// Hand-drawn inline SVG icons on a 16x16 grid. Everything is monochrome (currentColor) with a few duotone accents
// (a green leaf, a lighter highlight), so one CSS `color` re-tints an icon. The markup below is a trusted constant:
// it is never built from simulation text.
import type { ItemKind, NeedKey } from '../sim/types';

const DARK = '#0e1822';

const ICONS = {
  // ───────── items ─────────
  berries: `<g fill="currentColor" stroke="none"><circle cx="5.1" cy="10.7" r="3"/><circle cx="10.9" cy="10.7" r="3"/><circle cx="8" cy="6.7" r="3"/></g><path d="M8 3.7c.1-1 .7-1.8 1.9-2.3" stroke="#7fb069" stroke-width="1.5"/><path d="M4.1 9.8c.2-.6.6-.9 1.1-1.1M9.9 9.8c.2-.6.6-.9 1.1-1.1M7 5.8c.2-.5.5-.8.9-.9" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>`,
  fruit: `<path d="M8 5.2C6.7 4.3 3.6 4.5 3.2 7.7c-.4 3 1.5 6.3 3.6 6.3.5 0 .8-.3 1.2-.3s.7.3 1.2.3c2.1 0 4-3.3 3.6-6.3C12.4 4.5 9.3 4.3 8 5.2Z" fill="currentColor" stroke="none"/><path d="M8 5.2c0-1.3.5-2.3 1.6-3" stroke="#b58a52" stroke-width="1.4"/><path d="M9.6 3.2c.9-.9 2.2-.9 3-.3-.4 1.2-1.9 1.7-3 .9Z" fill="#7fb069" stroke="none"/><path d="M4.9 7.7c.1-.9.7-1.5 1.5-1.7" stroke="#fff" stroke-opacity=".5" stroke-width="1.1"/>`,
  fish: `<path d="M1.4 8C3.1 5.2 5.9 4.2 8.6 4.8c1.3.3 2.4 1.1 3.1 2.2l3-2.3v6.6l-3-2.3c-.7 1.1-1.8 1.9-3.1 2.2C5.9 11.8 3.1 10.8 1.4 8Z" fill="currentColor" stroke="none"/><circle cx="4.9" cy="7.2" r=".9" fill="${DARK}" stroke="none"/><path d="M7.7 6c.5.6.8 1.3.8 2s-.3 1.4-.8 2" stroke="${DARK}" stroke-opacity=".35" stroke-width="1"/>`,
  smoked_fish: `<path d="M1.4 9.6C3 7.1 5.6 6.2 8.1 6.8c1.2.3 2.2 1 2.9 2l2.8-2.1v5.9l-2.8-2.1c-.7 1-1.7 1.7-2.9 2-2.5.6-5.1-.3-6.7-2.9Z" fill="currentColor" stroke="none"/><circle cx="4.6" cy="9" r=".8" fill="${DARK}" stroke="none"/><path d="M7.4 7.9c.4.5.7 1.1.7 1.7s-.3 1.2-.7 1.7" stroke="${DARK}" stroke-opacity=".35" stroke-width="1"/><path d="M5 4.6c-.8-.7.8-1.3 0-2M8.2 4.4c-.8-.7.8-1.3 0-2M11.4 4.6c-.8-.7.8-1.3 0-2" stroke="currentColor" stroke-opacity=".6" stroke-width="1"/>`,
  spear: `<path d="M2.2 13.8 11.4 4.6" stroke-width="1.5"/><path d="M10.4 3.6 14 2l-1.6 3.6Z" fill="currentColor"/><path d="M9.6 6.4l1 1" stroke-width="1.1"/>`,
  rod: `<path d="M2 14 12.6 2.4" stroke="currentColor" stroke-width="1.5"/><path d="M12.6 2.4c1.8 1.6 2 4.4.6 6.2" stroke="currentColor" stroke-width="1" stroke-opacity=".75"/><path d="M13.2 8.6c-.5.6-1.2.9-1.6.5s-.2-1.1.4-1.5" stroke="currentColor" stroke-width="1.1"/><circle cx="13.1" cy="9.6" r=".8" fill="currentColor" stroke="none"/>`,
  grain: `<path d="M8 14.6V5.8" stroke="currentColor" stroke-width="1.3"/><g fill="currentColor" stroke="none"><ellipse cx="8" cy="3.5" rx="1.2" ry="2"/><path d="M7.5 7.2C5.9 7.2 4.7 6.1 4.5 4.4c1.6 0 2.9 1.1 3 2.8Z"/><path d="M8.5 7.2c1.6 0 2.8-1.1 3-2.8-1.6 0-2.9 1.1-3 2.8Z"/><path d="M7.5 10.2C5.9 10.2 4.7 9.1 4.5 7.4c1.6 0 2.9 1.1 3 2.8Z"/><path d="M8.5 10.2c1.6 0 2.8-1.1 3-2.8-1.6 0-2.9 1.1-3 2.8Z"/><path d="M7.5 13.2C5.9 13.2 4.7 12.1 4.5 10.4c1.6 0 2.9 1.1 3 2.8Z"/><path d="M8.5 13.2c1.6 0 2.8-1.1 3-2.8-1.6 0-2.9 1.1-3 2.8Z"/></g>`,
  seeds: `<g fill="currentColor" stroke="none"><ellipse cx="5" cy="9.9" rx="1.7" ry="2.8" transform="rotate(-32 5 9.9)"/><ellipse cx="11" cy="9" rx="1.7" ry="2.8" transform="rotate(32 11 9)"/><ellipse cx="8" cy="5.2" rx="1.5" ry="2.5" transform="rotate(6 8 5.2)"/></g>`,
  water: `<path d="M8 1.7C6 4.5 3.6 6.9 3.6 9.7a4.4 4.4 0 0 0 8.8 0C12.4 6.9 10 4.5 8 1.7Z" fill="currentColor" stroke="none"/><path d="M5.8 10.1c.1 1.1.8 1.9 1.8 2.2" stroke="#fff" stroke-opacity=".55" stroke-width="1.1"/>`,
  wood: `<circle cx="8" cy="8" r="5.9" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="3.7" stroke="${DARK}" stroke-opacity=".4" stroke-width="1"/><circle cx="8" cy="8" r="1.3" stroke="${DARK}" stroke-opacity=".4" stroke-width="1"/>`,
  stone: `<path d="M1.8 11.4 3.4 6.2 6.9 3.3l4.1 1.2L14.2 8l-.9 3.8-5.2.9Z" fill="currentColor" stroke="none"/><path d="m3.4 6.2 3.9 1.5L11 4.5M7.3 7.7l.8 5" stroke="${DARK}" stroke-opacity=".35" stroke-width="1"/>`,
  axe: `<g transform="rotate(40 8 8)"><path d="M8.4 15V3" stroke="currentColor" stroke-width="1.7"/><path d="M8.2 2.6 4.6 2Q1.8 4.8 3.2 9.2L8.2 7.6Z" fill="currentColor" stroke="none"/><path d="M8.2 3.2h2.6v4.2H8.2z" fill="currentColor" stroke="none"/></g>`,
  pick: `<path d="M8 5.6v8.9" stroke="currentColor" stroke-width="1.6"/><path d="M1.8 7.4C2.8 4.3 5.2 2.6 8 2.6s5.2 1.7 6.2 4.8C12.5 6.1 10.4 5.5 8 5.5S3.5 6.1 1.8 7.4Z" fill="currentColor" stroke="none"/>`,
  hoe: `<path d="M3.2 2 10.2 11.4" stroke="currentColor" stroke-width="1.6"/><path d="M8.2 10.4 14.4 6.8 15 11.2 10.4 14Z" fill="currentColor" stroke="none"/>`,
  basket: `<path d="M2.2 7h11.6l-1.4 6.1a1.2 1.2 0 0 1-1.2.9H4.8a1.2 1.2 0 0 1-1.2-.9Z" fill="currentColor" stroke="none"/><path d="M5.2 7c0-2.7 1.2-4.3 2.8-4.3s2.8 1.6 2.8 4.3" stroke="currentColor" stroke-width="1.4"/><path d="M3.9 9.6h8.2M4.6 11.9h6.8" stroke="${DARK}" stroke-opacity=".35" stroke-width="1"/>`,
  bread: `<path d="M2 9.4C2 6.1 4.6 3.8 8 3.8s6 2.3 6 5.6c0 1.6-1 2.6-2.3 2.6H4.3C3 12 2 11 2 9.4Z" fill="currentColor" stroke="none"/><path d="M5 5.9l1.1 2.6M8.2 5.2l.9 2.8M11.2 6l.7 2.4" stroke="${DARK}" stroke-opacity=".45" stroke-width="1.1"/><path d="M4.2 8.2c.2-1.1 1-1.9 2-2.2" stroke="#fff" stroke-opacity=".4" stroke-width="1"/>`,
  flour: `<path d="M5.4 2.4h5.2l-.7 2c1.9 1 3.2 3 3.2 5.4 0 2.4-1.7 4-4 4H6.9c-2.3 0-4-1.6-4-4 0-2.4 1.3-4.4 3.2-5.4Z" fill="currentColor" stroke="none"/><path d="M5.6 4.7h4.8" stroke="${DARK}" stroke-opacity=".5" stroke-width="1.2"/><path d="M5 8.8c.1-.9.6-1.5 1.3-1.9" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>`,
  clay: `<path d="M1.8 10.2C1.6 6.9 4.5 4.2 8 4.2s6.4 2.7 6.2 6c-.1 1.9-1.7 2.8-3.4 2.8H5.2c-1.7 0-3.3-.9-3.4-2.8Z" fill="currentColor" stroke="none"/><path d="M4.4 8c.5-1.3 1.7-2.1 3-2.2M9.6 11.6c1.1 0 2-.5 2.6-1.4" stroke="${DARK}" stroke-opacity=".3" stroke-width="1"/><ellipse cx="6" cy="6.6" rx="1.8" ry=".9" fill="#fff" fill-opacity=".4" stroke="none" transform="rotate(-18 6 6.6)"/>`,
  ore: `<path d="M1.8 11.4 3.4 6.2 6.9 3.3l4.1 1.2L14.2 8l-.9 3.8-5.2.9Z" fill="currentColor" stroke="none"/><path d="m3.4 6.2 3.9 1.5L11 4.5M7.3 7.7l.8 5" stroke="${DARK}" stroke-opacity=".35" stroke-width="1"/><g fill="#ffd27a" stroke="none"><circle cx="6.2" cy="5.6" r=".9"/><circle cx="10.6" cy="8" r=".9"/><circle cx="5" cy="9.8" r=".8"/></g>`,
  planks: `<rect x="1.6" y="3" width="12.8" height="3" rx=".7" fill="currentColor" stroke="none"/><rect x="2.6" y="6.9" width="12.8" height="3" rx=".7" fill="currentColor" fill-opacity=".85" stroke="none"/><rect x=".8" y="10.8" width="12.8" height="3" rx=".7" fill="currentColor" fill-opacity=".7" stroke="none"/><path d="M3.4 4.5h4.6M9 8.4h4.4M2.6 12.3h4.8" stroke="${DARK}" stroke-opacity=".35" stroke-width=".9"/>`,
  handles: `<path d="M3 13.6 10.2 3.4M6.6 14.2 13.4 4.8M1.8 9.4 6.6 2.6" stroke="currentColor" stroke-width="1.9"/><path d="M5.2 8.2l3.6 2.4" stroke="${DARK}" stroke-opacity=".5" stroke-width="1.4"/>`,
  bricks: `<rect x="1.6" y="3.4" width="7.4" height="3.8" rx=".6" fill="currentColor" stroke="none"/><rect x="9.6" y="3.4" width="4.8" height="3.8" rx=".6" fill="currentColor" fill-opacity=".85" stroke="none"/><rect x="1.6" y="7.8" width="4.8" height="3.8" rx=".6" fill="currentColor" fill-opacity=".85" stroke="none"/><rect x="7" y="7.8" width="7.4" height="3.8" rx=".6" fill="currentColor" stroke="none"/><rect x="3.6" y="12.2" width="8.8" height="2.4" rx=".6" fill="currentColor" fill-opacity=".7" stroke="none"/>`,
  charcoal: `<path d="M2 11.8 3.2 7l3.4-1.5L9 7.4l.9 4.4Z" fill="currentColor" stroke="none"/><path d="M8 7.8 10.4 4.2l3 1.2.7 4.4-2.4 2.2-3-.6Z" fill="currentColor" fill-opacity=".8" stroke="none"/><path d="M4.8 8.6l1 2M10.4 6.6l.8 2.2" stroke="#fff" stroke-opacity=".35" stroke-width=".9"/>`,
  iron: `<path d="M1.8 11.6 3.6 6.4h8.8l1.8 5.2Z" fill="currentColor" stroke="none"/><path d="M4.6 6.4 5.8 4.2h4.4l1.2 2.2" fill="currentColor" fill-opacity=".65" stroke="none"/><path d="M4.6 8.4h6.8" stroke="#fff" stroke-opacity=".4" stroke-width="1"/><path d="M2.6 13.4h10.8" stroke="currentColor" stroke-opacity=".5" stroke-width="1.2"/>`,
  saw: `<path d="M1.6 13.2 11.4 3.6l1.2 1.2L2.8 14.4Z" fill="currentColor" stroke="none"/><path d="M2.2 12.4l1.2 1.2M3.8 10.8 5 12M5.4 9.2l1.2 1.2M7 7.6l1.2 1.2M8.6 6l1.2 1.2" stroke="${DARK}" stroke-opacity=".45" stroke-width="1"/><path d="m11.4 3.6 1.6-1.8 1.8 1.8-1.8 1.6" stroke="currentColor" stroke-width="1.8"/>`,
  jar: `<path d="M5.4 2.2h5.2v1.8c2 .9 3.2 2.6 3.2 4.7 0 3.1-2.4 5.1-5.8 5.1s-5.8-2-5.8-5.1c0-2.1 1.2-3.8 3.2-4.7Z" fill="currentColor" stroke="none"/><ellipse cx="8" cy="2.4" rx="3.2" ry="1" fill="currentColor" fill-opacity=".7" stroke="none"/><path d="M4.6 8c.1-1.2.7-2 1.6-2.4" stroke="#fff" stroke-opacity=".5" stroke-width="1.1"/><path d="M4.4 9.6h7.2" stroke="${DARK}" stroke-opacity=".3" stroke-width="1"/>`,

  // ───────── needs ─────────
  n_hunger: `<path d="M4.4 2v3.7a1.7 1.7 0 0 0 3.4 0V2M6.1 2v12.2M11.4 14.2V2.2c-1.8.8-2.8 2.9-2.8 5.4h2.8"/>`,
  n_energy: `<path d="M9.3 1.4 3.7 9.1h3.8l-.8 5.5 5.6-7.7H8.5Z" fill="currentColor"/>`,
  n_warmth: `<path d="M8 14.6C5.2 14.6 3.4 12.8 3.4 10.2c0-1.9 1.1-3.2 2.2-4.4.2 1.1.7 1.8 1.4 2.1.2-2.1 1.2-4.1 2.7-5.5 1.6 1.7 2.9 4.2 2.9 7.5 0 2.9-1.8 4.7-4.6 4.7Z" fill="currentColor" stroke="none"/>`,
  n_safety: `<path d="M8 1.8 13.2 3.6v4.1c0 3-2.1 5.2-5.2 6.7C4.9 12.9 2.8 10.7 2.8 7.7V3.6Z" fill="currentColor" fill-opacity=".25"/><path d="m5.8 8 1.6 1.6 3-3.2"/>`,
  n_social: `<g fill="currentColor" stroke="none"><circle cx="5.6" cy="5.2" r="2.1"/><path d="M1.6 13.4c0-2.4 1.8-4 4-4s4 1.6 4 4Z"/><g fill-opacity=".65"><circle cx="11.2" cy="5.8" r="1.7"/><path d="M10.5 9.5c2.3-.2 4 1.2 4 3.9h-3.4c0-1.5-.2-2.9-.6-3.9Z"/></g></g>`,

  // ───────── transport ─────────
  play: `<path d="M4.6 2.9v10.2L13 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>`,
  pause: `<rect x="3.6" y="2.8" width="3" height="10.4" rx="1" fill="currentColor" stroke="none"/><rect x="9.4" y="2.8" width="3" height="10.4" rx="1" fill="currentColor" stroke="none"/>`,
  step: `<path d="M3 3.2v9.6L10 8Z" fill="currentColor" stroke="currentColor" stroke-width="1.1"/><rect x="11.2" y="3" width="2.2" height="10" rx="1" fill="currentColor" stroke="none"/>`,

  // ───────── overlays ─────────
  eye: `<path d="M1.4 8C2.9 5.1 5.2 3.7 8 3.7s5.1 1.4 6.6 4.3c-1.5 2.9-3.8 4.3-6.6 4.3S2.9 10.9 1.4 8Z"/><circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none"/>`,
  route: `<circle cx="3.6" cy="12.4" r="1.6" fill="currentColor" stroke="none"/><circle cx="12.4" cy="3.6" r="1.6"/><path d="M5.1 11.6c3.3-.4.3-3.2 3-3.7 2.3-.4 1.7-2.4 2.8-3.3" stroke-dasharray="1.7 2"/>`,
  thought: `<path d="M3 2.8h10a1.3 1.3 0 0 1 1.3 1.3v5.3A1.3 1.3 0 0 1 13 10.7H8.6L5.4 13.6v-2.9H3a1.3 1.3 0 0 1-1.3-1.3V4.1A1.3 1.3 0 0 1 3 2.8Z"/><g fill="currentColor" stroke="none"><circle cx="5.4" cy="6.7" r=".95"/><circle cx="8" cy="6.7" r=".95"/><circle cx="10.6" cy="6.7" r=".95"/></g>`,
  pin: `<path d="M8 14.4s-4.8-4.1-4.8-7.6a4.8 4.8 0 0 1 9.6 0c0 3.5-4.8 7.6-4.8 7.6Z"/><circle cx="8" cy="6.8" r="1.8"/>`,
  tag: `<path d="M2.2 2.2h5.4l6.2 6.2a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0L2.2 7.6Z"/><circle cx="5.2" cy="5.2" r="1" fill="currentColor" stroke="none"/>`,

  // ───────── interface ─────────
  chevron: `<path d="m6 3.5 4.5 4.5L6 12.5"/>`,
  close: `<path d="m4 4 8 8M12 4l-8 8"/>`,
  target: `<circle cx="8" cy="8" r="4.6"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/><path d="M8 1.2v2.4M8 12.4v2.4M1.2 8h2.4M12.4 8h2.4"/>`,
  help: `<circle cx="8" cy="8" r="6.4"/><path d="M6.1 6.3a2 2 0 1 1 2.9 1.8c-.7.4-1 .8-1 1.5"/><circle cx="8" cy="11.6" r=".75" fill="currentColor" stroke="none"/>`,
  bug: `<path d="M8 5.2c-1.9 0-3 1.4-3 3.2v1.3c0 1.9 1.2 3.3 3 3.3s3-1.4 3-3.3V8.4c0-1.8-1.1-3.2-3-3.2Z"/><path d="M6.2 5.2a1.8 1.8 0 0 1 3.6 0M8 5.4V13M5 8.4H2.4M11 8.4h2.6M5.2 11.1 3 12.4M10.8 11.1 13 12.4M6.4 3.6 5.2 2.2M9.6 3.6l1.2-1.4"/>`,
  dice: `<rect x="2.2" y="2.2" width="11.6" height="11.6" rx="3"/><g fill="currentColor" stroke="none"><circle cx="5.5" cy="5.5" r="1"/><circle cx="10.5" cy="5.5" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="5.5" cy="10.5" r="1"/><circle cx="10.5" cy="10.5" r="1"/></g>`,
  save: `<path d="M3 2.6h7.6L13 5v8a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 13Z"/><path d="M5.4 2.6V6h4.6V2.6M5.4 14.4V9.6h5.2v4.8"/>`,
  folder: `<path d="M2 12.8V4.2a1 1 0 0 1 1-1h3.1l1.4 1.6H12a1 1 0 0 1 1 1V7"/><path d="m2.4 12.8 1.7-5.2h10.3l-1.7 5.2Z"/>`,
  copy: `<rect x="5.4" y="5.4" width="8" height="8.2" rx="1.6"/><path d="M10.6 5.4V4a1.4 1.4 0 0 0-1.4-1.4H4A1.4 1.4 0 0 0 2.6 4v5.4A1.4 1.4 0 0 0 4 10.8h1.4"/>`,
  cube: `<path d="M8 1.8 13.8 5v6L8 14.2 2.2 11V5Z"/><path d="M2.2 5 8 8.2 13.8 5M8 8.2v6"/>`,
  person: `<circle cx="8" cy="5" r="2.6"/><path d="M2.8 14c0-2.9 2.3-4.8 5.2-4.8s5.2 1.9 5.2 4.8"/>`,
  users: `<circle cx="5.8" cy="5.4" r="2.2"/><path d="M1.6 13.4c0-2.4 1.9-4 4.2-4s4.2 1.6 4.2 4"/><circle cx="11.4" cy="6" r="1.8"/><path d="M10.6 9.5c2.4-.2 4 1.2 4 3.7"/>`,
  home: `<path d="M2.2 7.6 8 2.6l5.8 5"/><path d="M3.8 6.6V13a.9.9 0 0 0 .9.9h6.6a.9.9 0 0 0 .9-.9V6.6"/><path d="M6.8 13.9V9.8h2.4v4.1"/>`,
  clock: `<circle cx="8" cy="8" r="6.2"/><path d="M8 4.4V8l2.4 1.5"/>`,
  sun: `<circle cx="8" cy="8" r="2.9" fill="currentColor" fill-opacity=".25"/><path d="M8 1.4v1.6M8 13v1.6M1.4 8H3M13 8h1.6M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M3.3 12.7l1.1-1.1M11.6 4.4l1.1-1.1"/>`,
  moon: `<path d="M12.8 9.6A5.4 5.4 0 0 1 6.4 3.2a5.4 5.4 0 1 0 6.4 6.4Z" fill="currentColor" fill-opacity=".25"/>`,
  cloud: `<path d="M4.6 12.6a3 3 0 0 1-.3-6 4 4 0 0 1 7.7 1 2.5 2.5 0 0 1-.4 5Z" fill="currentColor" fill-opacity=".25"/>`,
  rain: `<path d="M4.6 10a3 3 0 0 1-.3-6 4 4 0 0 1 7.7 1 2.5 2.5 0 0 1-.4 5Z" fill="currentColor" fill-opacity=".25"/><path d="m5.2 12.2-.7 1.8M8.4 12.2l-.7 1.8M11.6 12.2l-.7 1.8"/>`,
  storm: `<path d="M4.6 9.6a3 3 0 0 1-.3-6 4 4 0 0 1 7.7 1 2.5 2.5 0 0 1-.4 5Z" fill="currentColor" fill-opacity=".25"/><path d="m8.6 9.8-1.8 2.6h2.2l-1.2 2.4"/>`,
  arrow: `<path d="M3 8h10M9 4l4 4-4 4"/>`,
  arrowUpRight: `<path d="m4.5 11.5 7-7M5.5 4.5h6v6"/>`,
  arrowDownLeft: `<path d="m11.5 4.5-7 7M10.5 11.5h-6v-6"/>`,
  check: `<path d="m3.4 8.4 3 3 6.2-6.6"/>`,
  alert: `<path d="M8 2.2 14.4 13H1.6Z"/><path d="M8 6.6v3"/><circle cx="8" cy="11.3" r=".7" fill="currentColor" stroke="none"/>`,
  info: `<circle cx="8" cy="8" r="6.4"/><path d="M8 7.2v3.6"/><circle cx="8" cy="5" r=".75" fill="currentColor" stroke="none"/>`,
  menu: `<path d="M2.6 4.4h10.8M2.6 8h10.8M2.6 11.6h10.8"/>`,
  logo: `<path d="M8 1.6 14.4 5 8 8.4 1.6 5Z" fill="#79b85a" stroke="none"/><path d="M1.6 5 8 8.4v6L1.6 11Z" fill="#a77b4b" stroke="none"/><path d="M14.4 5 8 8.4v6L14.4 11Z" fill="#8a6038" stroke="none"/><circle cx="8" cy="4.7" r="1.6" fill="#f2c14e" stroke="none"/>`,

  // ───────── "what are they up to" ─────────
  q_doing: `<path d="M1.4 8.4h3l1.7-4.6 3.2 8.4 1.8-3.8h2.5"/>`,
  q_why: `<path d="M8 1.9a4.3 4.3 0 0 0-2.5 7.8c.5.4.8.9.8 1.5v.3h3.4v-.3c0-.6.3-1.1.8-1.5A4.3 4.3 0 0 0 8 1.9Z"/><path d="M6.4 13.2h3.2M7 14.8h2"/>`,
  q_goal: `<path d="M3.6 14.4V2.4"/><path d="M3.6 3h8l-1.8 2.9 1.8 2.9H3.6"/>`,
  q_block: `<circle cx="8" cy="8" r="6.2"/><path d="m3.6 3.6 8.8 8.8"/>`,
  q_last: `<path d="M2.4 8a5.6 5.6 0 1 0 1.8-4.1"/><path d="M2.2 2.6v3h3"/><path d="M8 5v3.2l2.2 1.4"/>`,

  // ───────── things in the world ─────────
  paw: `<g fill="currentColor" stroke="none"><ellipse cx="8" cy="10.6" rx="3.2" ry="2.6"/><ellipse cx="3.7" cy="7.2" rx="1.3" ry="1.8"/><ellipse cx="6.3" cy="4.4" rx="1.3" ry="1.9"/><ellipse cx="9.7" cy="4.4" rx="1.3" ry="1.9"/><ellipse cx="12.3" cy="7.2" rx="1.3" ry="1.8"/></g>`,
  leaf: `<path d="M3 13C2.6 7.4 6.2 3 13.4 2.6c.2 6.8-3.4 10.8-9.2 10.6Z"/><path d="M3 13 9 7.4"/>`,
  hammer: `<path d="m3.2 13.2 5.6-5.6"/><path d="m7.2 4.2 2.4-1.6 3.6 3.6-1.6 2.4-1.2-.6L7.8 5.4Z" fill="currentColor" fill-opacity=".3"/>`,
  sprout: `<path d="M8 14V8.6"/><path d="M8 8.6C8 6 6.2 4.4 3.4 4.4 3.4 7.2 5.2 8.6 8 8.6Z"/><path d="M8 7.6C8 5 9.8 3 12.8 3c0 2.8-1.8 4.6-4.8 4.6Z"/>`,
  cross: `<path d="M8 2v12M4.2 5.6h7.6"/>`,
  flame: `<path d="M8 14.6C5.2 14.6 3.4 12.8 3.4 10.2c0-1.9 1.1-3.2 2.2-4.4.2 1.1.7 1.8 1.4 2.1.2-2.1 1.2-4.1 2.7-5.5 1.6 1.7 2.9 4.2 2.9 7.5 0 2.9-1.8 4.7-4.6 4.7Z" fill="currentColor" fill-opacity=".3"/>`,
  house: `<path d="M2.2 7.6 8 2.8l5.8 4.8"/><path d="M3.8 6.6V13a.9.9 0 0 0 .9.9h6.6a.9.9 0 0 0 .9-.9V6.6"/><path d="M6.8 13.9V9.8h2.4v4.1"/><path d="M10.8 5.6V3h1.9v3.9" fill="currentColor" fill-opacity=".3"/>`,
  anvil: `<path d="M2 5.2h9.8c1.2 0 2 .8 2.2 1.8-1.2.2-1.8.7-2 1.6H9.6l.6 2.2h1.6v1.8H4.2v-1.8h1.6l.6-2.2C4.9 8.4 4 7.6 3.8 6.4 3 6.4 2.3 6 2 5.2Z" fill="currentColor" fill-opacity=".3"/>`,
  kiln: `<path d="M2.2 13.6v-3.4C2.2 6.4 4.8 3.6 8 3.6s5.8 2.8 5.8 6.6v3.4Z" fill="currentColor" fill-opacity=".22"/><path d="M6 13.6v-2.2a2 2 0 0 1 4 0v2.2"/><path d="M8 3.6V1.8"/>`,
  granary: `<path d="M2.6 6.6 8 2.4l5.4 4.2"/><path d="M3.8 6.6h8.4v4H3.8Z" fill="currentColor" fill-opacity=".22"/><path d="M5.8 6.6v4M8 6.6v4M10.2 6.6v4M4.6 10.6v3.4M11.4 10.6v3.4"/>`,
  hall: `<path d="M.9 8.2 8 3l7.1 5.2"/><path d="M2.4 7.2v6.4h11.2V7.2" fill="currentColor" fill-opacity=".18"/><path d="M6.8 13.6V10a1.2 1.2 0 0 1 2.4 0v3.6"/><path d="M8 3V1.4"/>`,
  well: `<path d="M3.2 10.6c0 1.6 2 2.8 4.8 2.8s4.8-1.2 4.8-2.8"/><ellipse cx="8" cy="10.6" rx="4.8" ry="1.9" fill="currentColor" fill-opacity=".22"/><path d="M3.8 10.4V4.8M12.2 10.4V4.8"/><path d="M2.2 5.6 8 1.8l5.8 3.8"/><path d="M8 4.2v3.4"/><path d="M6.9 7.6h2.2l-.3 1.7H7.2Z" fill="currentColor" fill-opacity=".32"/>`,
  cart: `<path d="M1.8 4.2h9.4l-.9 5.4H3Z" fill="currentColor" fill-opacity=".25"/><circle cx="5.6" cy="12" r="2.1"/><path d="M11.2 5.4 14.6 3.8"/>`,
  cog: `<circle cx="8" cy="8" r="2.4"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4"/>`,
  wrench: `<path d="M9.4 2.4a3.4 3.4 0 0 0-3 4.4l-3.6 3.6a1.4 1.4 0 0 0 2 2l3.6-3.6a3.4 3.4 0 0 0 4.4-3l-2 2-1.8-.4-.4-1.8 2-2a3.4 3.4 0 0 0-1.2-1.2Z"/>`,
  plate: `<ellipse cx="8" cy="9" rx="6.4" ry="3.4"/><ellipse cx="8" cy="9" rx="3.2" ry="1.6" fill="currentColor" fill-opacity=".3"/>`,
} as const satisfies Record<string, string>;

export type IconName = keyof typeof ICONS;

const NEED_ICON: Record<NeedKey, IconName> = {
  hunger: 'n_hunger',
  thirst: 'water',
  energy: 'n_energy',
  warmth: 'n_warmth',
  safety: 'n_safety',
  social: 'n_social',
};

export function needIconName(key: NeedKey): IconName {
  return NEED_ICON[key];
}

/** Every kind of item has an icon of its own; anything unexpected shows as a stone. */
export function itemIconName(kind: ItemKind): IconName {
  return (kind in ICONS ? kind : 'stone') as IconName;
}

function svgMarkup(name: IconName, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

const tpl = document.createElement('template');
const protos = new Map<string, Element>();

function build(name: IconName, size: number): Element {
  const key = `${name}:${size}`;
  let proto = protos.get(key);
  if (!proto) {
    tpl.innerHTML = svgMarkup(name, size);
    proto = tpl.content.firstElementChild as Element;
    protos.set(key, proto);
  }
  return proto.cloneNode(true) as Element;
}

/** A span wrapping the icon; colour it with CSS `color`. */
export function icon(name: IconName, size = 16, cls = ''): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = cls ? `ico ${cls}` : 'ico';
  s.appendChild(build(name, size));
  return s;
}

/** Replace the glyph inside an existing icon span (no-op when it already shows that glyph). */
export function setIcon(span: HTMLElement, name: IconName, size = 16): void {
  if (span.dataset.icon === name) return;
  span.dataset.icon = name;
  span.replaceChildren(build(name, size));
}

export function allIconNames(): IconName[] {
  return Object.keys(ICONS) as IconName[];
}
