// Event cards: a small white card that opens beside the place where a big occasion has just begun (a wedding, a birth feast, the
// harvest feast, the market, a funeral or remembrance, a yearly feast) or where a shared building has just been finished. The
// wedding's card has a pair of swinging gold bells and throws a little burst of petals and blossoms; the others have their own
// small icon and a restrained burst, or none (a funeral never celebrates; the market has bunting). After six seconds of UI time,
// or when dismissed, an occasion's card folds to a small marker over its venue until the occasion ends; a building's card goes.
// Watch flies the camera there with the camera's own flyTo; nothing ever moves the camera unasked.
//
// Presentation only: it reads Game.world and the camera and writes nothing to the world. Which happenings get a card, the queue
// (at most two open, a short backlog that goes stale) and the placement are in event_cards_model.ts; the pictures in
// event_cards_art.ts.
import { worldToScreen } from '../render/camera';
import { h } from './dom';
import type { Part, UICtx } from './context';
import { BUNTING, burstFor, iconFor, shapeSvg } from './event_cards_art';
import { EventCards, cardWidth, placeCards, placeMarker, type CardEntry, type Rect } from './event_cards_model';

interface Drawn {
  card?: HTMLElement;
  marker?: HTMLElement;
  /** last transform written, so a still card never touches the DOM */
  at?: string;
}

/** a decorative SVG from the fixed strings in event_cards_art.ts (never simulation text) */
function art(cls: string, markup: string): HTMLElement {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.innerHTML = markup;
  return el;
}

const reducedMotion = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createEventCards(ctx: UICtx): Part {
  const { game, root } = ctx;
  const model = new EventCards();
  const live = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const layer = h('div', { class: 'ev-layer' }, live);
  root.appendChild(layer);
  const drawn = new Map<string, Drawn>();
  let blocked: Rect[] = [];
  let blockedAge = Infinity;

  const leave = (el: HTMLElement | undefined): void => {
    if (!el) return;
    el.classList.add('leaving');
    window.setTimeout(() => el.remove(), 260);
  };

  const watch = (e: CardEntry): void => game.flyTo(e.notice.x, e.notice.y);

  const makeCard = (e: CardEntry): HTMLElement => {
    const n = e.notice;
    const motion = !reducedMotion();
    const card = h(
      'div',
      { class: `ev-card look-${n.look}`, role: 'group', 'aria-label': n.says, 'data-key': n.key },
      n.look === 'market' ? art('ev-bunting-wrap', BUNTING) : null,
      h(
        'button',
        { type: 'button', class: 'ev-close', 'aria-label': `Dismiss: ${n.title.replace(/!$/, '')}`, onClick: () => { model.dismiss(n.key); sync(); } },
        '×',
      ),
      h('div', { class: 'ev-head' }, art('ev-icon', iconFor(n.look)), h('div', { class: 'ev-title' }, n.title)),
      n.lines.length ? h('div', { class: 'ev-lines' }, n.lines.map((l) => h('div', { class: 'ev-line' }, l))) : null,
      h('div', { class: 'ev-actions' }, h('button', { type: 'button', class: 'ev-watch', 'aria-label': `Watch: centre the view on ${n.title.replace(/!$/, '').toLowerCase()}`, onClick: () => watch(e) }, 'Watch')),
      h('span', { class: 'ev-tail', 'aria-hidden': 'true' }),
    );
    if (motion) {
      const bits = burstFor(n.key, n.look);
      if (bits.length) {
        const burst = h('span', { class: 'ev-burst', 'aria-hidden': 'true' });
        for (const b of bits) {
          const el = art('ev-bit', shapeSvg(b.shape));
          el.style.cssText = `left:${b.fx * 100}%;top:${b.fy * 100}%;width:${b.size}px;height:${b.size}px;color:${b.color};--dx:${b.dx}px;--dy:${b.dy}px;--fall:${b.fall}px;--rot:${b.rot}deg;--delay:${b.delay}ms;--dur:${b.dur}ms`;
          burst.appendChild(el);
        }
        card.appendChild(burst);
        // the pieces are gone in two seconds; so is their markup
        window.setTimeout(() => burst.remove(), 2400);
      }
    }
    return card;
  };

  const makeMarker = (e: CardEntry): HTMLElement =>
    h('button', { type: 'button', class: `ev-marker look-${e.notice.look}`, 'aria-label': `${e.notice.says} Watch`, 'data-tip': `${e.notice.title.replace(/!$/, '')}. Click to watch.`, 'data-key': e.notice.key, onClick: () => watch(e) }, art('ev-icon', iconFor(e.notice.look)));

  /** bring the DOM in line with the model's entries */
  const sync = (): void => {
    const keys = new Set(model.entries.keys());
    for (const [k, d] of drawn) {
      const e = model.entries.get(k);
      if (!keys.has(k) || !e || e.phase === 'waiting') {
        leave(d.card);
        leave(d.marker);
        drawn.delete(k);
        continue;
      }
      if (e.phase === 'marker' && d.card) {
        leave(d.card);
        d.card = undefined;
        d.at = undefined;
      }
    }
    for (const e of model.entries.values()) {
      if (e.phase === 'waiting') continue;
      const d = drawn.get(e.notice.key) ?? {};
      drawn.set(e.notice.key, d);
      if (e.phase === 'open' && !d.card) {
        d.card = makeCard(e);
        layer.appendChild(d.card);
        live.textContent = e.notice.says;
      }
      if (e.phase === 'marker' && !d.marker) {
        d.marker = makeMarker(e);
        layer.appendChild(d.marker);
      }
    }
  };

  /** the interface's own panels, which a card should not cover (refreshed a few times a second while cards are open) */
  const readBlocked = (origin: DOMRect): Rect[] => {
    const out: Rect[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('.glass')) {
      if (layer.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      out.push({ x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height });
    }
    return out;
  };

  const place = (dt: number): void => {
    if (!drawn.size) return;
    const origin = root.getBoundingClientRect();
    const view = { w: origin.width, h: origin.height };
    if (!view.w || !view.h) return;
    blockedAge += dt;
    if (blockedAge > 0.3) {
      blocked = readBlocked(origin);
      blockedAge = 0;
    }
    const venue = (e: CardEntry) => worldToScreen(game.camera, view.w, view.h, e.notice.x, e.notice.y);
    const open = model.open().filter((e) => drawn.get(e.notice.key)?.card);
    const w = cardWidth(view.w);
    // about two and a half tiles around the venue are left for the people gathering there, at whatever zoom
    const keep = (e: CardEntry) => { const a = venue(e), b = worldToScreen(game.camera, view.w, view.h, e.notice.x + 2.5, e.notice.y); return Math.hypot(b.x - a.x, b.y - a.y); };
    const spots = placeCards(open.map((e) => ({ venue: venue(e), w, h: drawn.get(e.notice.key)!.card!.offsetHeight || 96, keep: keep(e) })), view, blocked);
    open.forEach((e, i) => {
      const d = drawn.get(e.notice.key)!;
      const s = spots[i];
      const at = `${s.x},${s.y},${s.tail},${s.tailX},${w}`;
      if (at === d.at) return;
      d.at = at;
      const c = d.card!;
      c.style.width = `${w}px`;
      c.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
      c.dataset.tail = s.tail ?? 'none';
      c.style.setProperty('--tail-x', `${s.tailX}px`);
    });
    for (const e of model.markers()) {
      const d = drawn.get(e.notice.key);
      if (!d?.marker) continue;
      const m = placeMarker(venue(e), view);
      const at = `${m.x},${m.y},${m.pinned}`;
      if (at === d.at) continue;
      d.at = at;
      d.marker.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`;
      d.marker.classList.toggle('pinned', m.pinned);
    }
  };

  const clear = (): void => {
    for (const d of drawn.values()) {
      d.card?.remove();
      d.marker?.remove();
    }
    drawn.clear();
    model.reset();
  };

  // a handle for the automated browser checks, as __game and __ui are
  (window as unknown as Record<string, unknown>).__eventCards = model;

  return {
    update(dt) {
      model.step(game.world, dt);
      sync();
      place(dt);
    },
    onGame(e) {
      // another world: the next look primes on it, so its history is not announced
      if (e === 'beforeWorldChange' || e === 'restart') clear();
    },
    dispose() {
      clear();
      layer.remove();
    },
  };
}
