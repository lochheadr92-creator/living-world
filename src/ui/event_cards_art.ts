// The event cards' pictures: a small icon for each look and the pieces of its burst, drawn as inline SVG. These are fixed strings
// written here (no simulation text is ever put into markup), and the burst's geometry is a pure function of the card's key, so a
// card's burst is the same every time and the module is testable without a DOM.
import type { CardLook } from './event_cards_model';

const svg = (vb: string, body: string, cls = ''): string => `<svg viewBox="${vb}" class="${cls}" aria-hidden="true" focusable="false">${body}</svg>`;

/** One bell, hung from (0,0): a gold dome, a rim and a clapper. */
const bell = (id: string): string =>
  `<g class="ev-bell ${id}"><path d="M0 1.5C-5.6 1.5-8.6 7-8.6 13.6v5.6c0 2.2-2.6 3.4-3.6 5.6h24.4c-1-2.2-3.6-3.4-3.6-5.6v-5.6C8.6 7 5.6 1.5 0 1.5Z" fill="url(#evGold)" stroke="#a9832f" stroke-width="1.1"/>` +
  `<path d="M-5.2 9.5C-4.6 6.6-3 4.8-1.2 4.2" fill="none" stroke="#fff6d8" stroke-width="1.4" stroke-linecap="round" opacity=".85"/>` +
  `<rect x="-12.6" y="24.2" width="25.2" height="2.4" rx="1.2" fill="#d9b252" stroke="#a9832f" stroke-width=".8"/>` +
  `<circle cx="0" cy="29" r="2.6" fill="#b88c2c"/></g>`;

const ICON: Record<CardLook, string> = {
  wedding: svg(
    '0 0 56 44',
    `<defs><linearGradient id="evGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a6"/><stop offset=".55" stop-color="#e6c065"/><stop offset="1" stop-color="#c99a3a"/></linearGradient></defs>` +
      `<g transform="translate(18 9) rotate(-10)">${bell('ev-bell-l')}</g><g transform="translate(38 9) rotate(10)">${bell('ev-bell-r')}</g>` +
      `<path d="M28 8c-5-6-11-5-10 0 1 4 6 3 10 0Zm0 0c5-6 11-5 10 0-1 4-6 3-10 0Z" fill="#f4a9bd" stroke="#d97a96" stroke-width=".9"/>` +
      `<path d="M27 9l-4 9m6-9 4 9" stroke="#e98ba6" stroke-width="2" stroke-linecap="round"/><circle cx="28" cy="8.4" r="2.3" fill="#e98ba6"/>`,
    'ev-icon-svg',
  ),
  birth: svg(
    '0 0 44 44',
    `<path d="M22 4l4.4 9.6 10.4 1.1-7.8 7 2.2 10.3L22 26.8l-9.2 5.2L15 21.7l-7.8-7 10.4-1.1Z" fill="#fde7a0" stroke="#d6aa3c" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<g transform="translate(33 32)"><circle r="3.4" cx="0" cy="-4" fill="#f9c6d3"/><circle r="3.4" cx="3.8" cy="-1.2" fill="#f9c6d3"/><circle r="3.4" cx="2.4" cy="3.3" fill="#f9c6d3"/><circle r="3.4" cx="-2.4" cy="3.3" fill="#f9c6d3"/><circle r="3.4" cx="-3.8" cy="-1.2" fill="#f9c6d3"/><circle r="2" fill="#f2c85b"/></g>`,
    'ev-icon-svg',
  ),
  feast: svg(
    '0 0 44 44',
    `<path d="M22 6c3 6 10 9 10 18a10 10 0 0 1-20 0c0-5 3-7 4-11 2 3 3 4 4 4 0-4 0-8 2-11Z" fill="#f6b25a" stroke="#d27a2a" stroke-width="1.2"/>` +
      `<path d="M22 22c2 3 4 4 4 7a4 4 0 0 1-8 0c0-2 2-4 4-7Z" fill="#fde7a0"/><path d="M10 38h24" stroke="#8a6440" stroke-width="3" stroke-linecap="round"/>`,
    'ev-icon-svg',
  ),
  harvest: svg(
    '0 0 44 44',
    `<g stroke="#b9862f" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M22 40V12M22 40l-8-22M22 40l8-22"/></g>` +
      `<g fill="#e5b552" stroke="#b9862f" stroke-width=".8">` +
      [[22, 9], [22, 15], [22, 21], [13, 15], [15, 21], [31, 15], [29, 21]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="4"/>`).join('') +
      `</g><path d="M14 31h16" stroke="#c0632d" stroke-width="3" stroke-linecap="round"/>`,
    'ev-icon-svg',
  ),
  market: svg(
    '0 0 44 44',
    `<path d="M6 16h32l-3-8H9Z" fill="#f1d6a0" stroke="#a87a3c" stroke-width="1.1"/>` +
      `<path d="M6 16q2.7 4 5.3 0 2.7 4 5.3 0 2.7 4 5.4 0 2.7 4 5.3 0 2.7 4 5.4 0 2.6 4 5.3 0" fill="#e07a5f" stroke="#a8553d" stroke-width="1"/>` +
      `<path d="M9 18v20M35 18v20" stroke="#8a6440" stroke-width="2"/><rect x="11" y="28" width="22" height="5" rx="1" fill="#c99560"/>` +
      `<circle cx="16" cy="26.5" r="2.2" fill="#e8574a"/><circle cx="21" cy="26.5" r="2.2" fill="#f2c85b"/><circle cx="26" cy="26.5" r="2.2" fill="#8bbf5a"/>`,
    'ev-icon-svg',
  ),
  funeral: svg(
    '0 0 44 44',
    `<path d="M22 5c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8Z" fill="#f4d58a" opacity=".9"/><path d="M22 10c1 2 1.6 3 1.6 4a1.6 1.6 0 0 1-3.2 0c0-1 .6-2 1.6-4Z" fill="#fff4cf"/>` +
      `<rect x="17" y="19" width="10" height="17" rx="1.5" fill="#f4f0e6" stroke="#9a958a" stroke-width="1.1"/><path d="M22 17v2" stroke="#6b665c" stroke-width="1.2"/>` +
      `<path d="M12 38h20" stroke="#8d887d" stroke-width="2.4" stroke-linecap="round"/>`,
    'ev-icon-svg',
  ),
  civic: svg(
    '0 0 44 44',
    `<path d="M8 20 22 9l14 11" fill="none" stroke="#7a5a3a" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<path d="M11 19v17h22V19" fill="#efe1c4" stroke="#7a5a3a" stroke-width="1.6"/><rect x="19" y="26" width="6" height="10" fill="#b98a5a"/>` +
      `<g transform="translate(33 28) rotate(35)"><rect x="-1.3" y="-2" width="2.6" height="14" rx="1" fill="#9a6a3a"/><rect x="-5" y="-5" width="10" height="4.4" rx="1" fill="#7b8794" stroke="#4f5a66" stroke-width=".8"/></g>`,
    'ev-icon-svg',
  ),
};
export const iconFor = (look: CardLook): string => ICON[look];

/** A small strip of bunting across the top of a market card. */
export const BUNTING = svg(
  '0 0 240 14',
  `<path d="M0 2Q120 9 240 2" fill="none" stroke="#a8553d" stroke-width="1"/>` +
    Array.from({ length: 12 }, (_, i) => {
      const x = 6 + i * 20;
      const y = 2 + 7 * (1 - Math.pow((x - 120) / 120, 2));
      const c = ['#e07a5f', '#f2c85b', '#8bbf5a', '#6aa6d8'][i % 4];
      return `<path d="M${x - 6} ${y.toFixed(1)}h12l-6 ${8}Z" fill="${c}"/>`;
    }).join(''),
  'ev-bunting',
);

// ───────────────────────────── the burst ─────────────────────────────

export type BitShape = 'petal' | 'blossom' | 'star' | 'leaf' | 'grain' | 'spark';
const SHAPE: Record<BitShape, string> = {
  petal: svg('0 0 12 12', '<path d="M6 .5C10 3.4 10 8.6 6 11.5 2 8.6 2 3.4 6 .5Z" fill="currentColor"/>'),
  blossom: svg('0 0 12 12', '<g fill="currentColor"><circle cx="6" cy="3" r="2.4"/><circle cx="8.9" cy="5.1" r="2.4"/><circle cx="7.8" cy="8.5" r="2.4"/><circle cx="4.2" cy="8.5" r="2.4"/><circle cx="3.1" cy="5.1" r="2.4"/></g><circle cx="6" cy="6" r="1.5" fill="#f2c85b"/>'),
  star: svg('0 0 12 12', '<path d="M6 .8l1.5 3.5 3.8.4-2.9 2.5.9 3.8L6 9 2.7 11l.9-3.8L.7 4.7l3.8-.4Z" fill="currentColor"/>'),
  leaf: svg('0 0 12 12', '<path d="M1 11C1 5 5 1 11 1c0 6-4 10-10 10Z" fill="currentColor"/><path d="M1.5 10.5 9 3" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>'),
  grain: svg('0 0 12 12', '<ellipse cx="6" cy="6" rx="2.6" ry="4.6" fill="currentColor"/>'),
  spark: svg('0 0 12 12', '<path d="M6 0 7.2 4.8 12 6 7.2 7.2 6 12 4.8 7.2 0 6 4.8 4.8Z" fill="currentColor"/>'),
};
export const shapeSvg = (s: BitShape): string => SHAPE[s];

interface BurstStyle { count: number; shapes: BitShape[]; colors: string[]; size: [number, number] }
const BURST: Record<CardLook, BurstStyle | null> = {
  wedding: { count: 18, shapes: ['petal', 'petal', 'blossom', 'petal'], colors: ['#f6b3c6', '#fbd5df', '#ffffff', '#f3dc9a', '#f09ab2'], size: [8, 13] },
  birth: { count: 10, shapes: ['star', 'blossom', 'spark'], colors: ['#f6d77a', '#f9c6d3', '#bcdcf5'], size: [7, 11] },
  feast: { count: 8, shapes: ['spark', 'star'], colors: ['#f6b25a', '#fde7a0', '#f08a4b'], size: [6, 10] },
  harvest: { count: 12, shapes: ['leaf', 'grain', 'leaf'], colors: ['#d9822b', '#e5b552', '#b5542c', '#c9a33a'], size: [8, 12] },
  civic: { count: 7, shapes: ['spark'], colors: ['#f3d27a', '#ffffff', '#e6c065'], size: [7, 11] },
  market: null,
  funeral: null,
};

export interface Bit {
  shape: BitShape;
  color: string;
  size: number;
  /** where it starts, as a fraction of the card's width and height (on or just outside its edge) */
  fx: number;
  fy: number;
  /** how far it flies out (px), then how far it drifts down while fading */
  dx: number;
  dy: number;
  fall: number;
  rot: number;
  delay: number;
  dur: number;
}

/** a small whole-number hash to [0, 1): the same card gets the same burst, with no random draw anywhere */
function unit(s: string, i: number): number {
  let h = 2166136261 ^ i;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The pieces thrown out when a card opens: from around its edge, outward a short way, then drifting down and fading inside two seconds. */
export function burstFor(key: string, look: CardLook): Bit[] {
  const st = BURST[look];
  if (!st) return [];
  const out: Bit[] = [];
  for (let i = 0; i < st.count; i++) {
    const r = (k: number) => unit(key, i * 16 + k);
    // round the edge: top, the two sides and the top corners, where the card meets the world above it
    const side = i % 4;
    const fx = side === 0 ? r(1) : side === 1 ? 0 : side === 2 ? 1 : 0.15 + 0.7 * r(1);
    const fy = side === 0 || side === 3 ? 0 : 0.15 + 0.6 * r(2);
    const outX = side === 1 ? -1 : side === 2 ? 1 : (fx - 0.5) * 1.6;
    const outY = side === 0 || side === 3 ? -1 : -0.35;
    const reach = 22 + 34 * r(3);
    out.push({
      shape: st.shapes[i % st.shapes.length],
      color: st.colors[Math.floor(r(4) * st.colors.length)],
      size: Math.round(st.size[0] + (st.size[1] - st.size[0]) * r(5)),
      fx: Math.round(fx * 100) / 100,
      fy: Math.round(fy * 100) / 100,
      dx: Math.round(outX * reach + (r(6) - 0.5) * 14),
      dy: Math.round(outY * reach * 0.8),
      fall: Math.round(18 + 22 * r(7)),
      rot: Math.round((r(8) - 0.5) * 400),
      delay: Math.round(r(9) * 220),
      dur: Math.round(1400 + 450 * r(10)),
    });
  }
  return out;
}
