// Two small floating labels, each a single reused element:
//  * the UI tooltip: any element with a data-tip attribute (delegated, so panels can scroll or clip freely)
//  * the hover tooltip that follows the pointer over things in the world (driven by game.hover)
import type { Entity, Person, World } from '../sim/types';
import { describeEntityName } from '../sim/inspect';
import { RECIPE_BY_ID } from '../sim/recipes';
import { itemsToText } from '../sim/people';
import { clamp, h, setText } from './dom';
import type { Part, UICtx } from './context';

// ───────────────────────── UI tooltip ─────────────────────────
export function createUITips(ctx: UICtx): Part {
  const tip = h('div', { class: 'uitip', role: 'tooltip', hidden: true });
  ctx.root.appendChild(tip);
  let target: HTMLElement | null = null;
  let timer: number | undefined;

  const hide = () => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
    if (!tip.hidden) tip.hidden = true;
  };

  const show = (el: HTMLElement) => {
    const text = el.getAttribute('data-tip');
    if (!text || !el.isConnected) return;
    const nl = text.indexOf('\n');
    if (nl < 0) tip.textContent = text;
    else tip.replaceChildren(h('strong', null, text.slice(0, nl)), h('span', null, text.slice(nl + 1)));
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const x = clamp(r.left + r.width / 2 - tw / 2, 8, Math.max(8, window.innerWidth - tw - 8));
    let y = r.top - th - 8;
    if (y < 8) y = Math.min(window.innerHeight - th - 8, r.bottom + 8);
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };

  const schedule = (el: HTMLElement, delay: number) => {
    hide();
    timer = window.setTimeout(() => show(el), delay);
  };

  const over = (e: Event) => {
    const el = (e.target as HTMLElement | null)?.closest?.('[data-tip]') as HTMLElement | null;
    if (el === target) return;
    hide();
    target = el;
    if (el) schedule(el, 380);
  };
  const out = (e: Event) => {
    const to = (e as PointerEvent).relatedTarget as Node | null;
    if (target && (!to || !target.contains(to))) {
      hide();
      target = null;
    }
  };
  const focusIn = (e: Event) => {
    const el = (e.target as HTMLElement | null)?.closest?.('[data-tip]') as HTMLElement | null;
    if (el && (el as HTMLElement).matches(':focus-visible')) {
      target = el;
      schedule(el, 120);
    }
  };
  const focusOut = () => {
    hide();
    target = null;
  };
  const press = () => {
    hide();
  };

  ctx.root.addEventListener('pointerover', over);
  ctx.root.addEventListener('pointerout', out);
  ctx.root.addEventListener('focusin', focusIn);
  ctx.root.addEventListener('focusout', focusOut);
  ctx.root.addEventListener('pointerdown', press, true);
  window.addEventListener('wheel', press, { passive: true });
  window.addEventListener('keydown', press, true);

  return {
    update() {
      if (!tip.hidden && (!target || !target.isConnected || target.hidden)) hide();
    },
    dispose() {
      hide();
      ctx.root.removeEventListener('pointerover', over);
      ctx.root.removeEventListener('pointerout', out);
      ctx.root.removeEventListener('focusin', focusIn);
      ctx.root.removeEventListener('focusout', focusOut);
      ctx.root.removeEventListener('pointerdown', press, true);
      window.removeEventListener('wheel', press);
      window.removeEventListener('keydown', press, true);
      tip.remove();
    },
  };
}

// ───────────────────────── hover tooltip ─────────────────────────
function personActivity(p: Person): string {
  if (p.pose === 'sleep') return 'Sleeping';
  if (p.activity) return p.activity.label;
  return 'Deciding what to do';
}

const WOLF_STATE: Record<string, string> = { roam: 'prowling', stalk: 'stalking someone', attack: 'attacking', retreat: 'slinking away' };

/** a few words on what something other than a person is doing or holding right now */
function thingStatus(world: World, e: Entity): string {
  switch (e.ent) {
    case 'building': {
      const job = e.ops ? e.ops.job : null;
      if (job) {
        const r = RECIPE_BY_ID[job.recipe];
        const doing = r ? r.doing.toLowerCase() : 'at work';
        if (job.phase === 'burn') return `${doing}: the fire is burning`;
        if (job.phase === 'ready') return `${doing}: waiting for room`;
        return `${doing} (${Math.round((job.progress / Math.max(1, job.total)) * 100)}%)`;
      }
      if (e.upgrading) return 'being rebuilt';
      return e.type === 'fire' ? (e.fuel > 0 ? 'burning' : 'out') : '';
    }
    case 'site': {
      const pct = Math.round((e.work / Math.max(1, e.workTotal)) * 100);
      return e.status.startsWith('waiting') ? `${pct}%, waiting for materials` : `${pct}% built`;
    }
    case 'cart':
      return `${e.puller ? 'being pulled' : 'parked'}, ${itemsToText(e.load) === 'nothing' ? 'empty' : itemsToText(e.load)}`;
    case 'source':
      return e.type === 'clay_pit' || e.type === 'ore_vein' || e.type === 'outcrop' ? `${e.amount} ${e.item} left` : '';
    default:
      return '';
  }
}

export function createHoverTip(ctx: UICtx): Part {
  const { game } = ctx;
  const nameEl = h('span', { class: 'ht-name' });
  const sepEl = h('span', { class: 'ht-sep' }, ' — ');
  const actEl = h('span', { class: 'ht-act' });
  const el = h('div', { class: 'hovertip', role: 'tooltip', hidden: true }, nameEl, sepEl, actEl);
  ctx.root.appendChild(el);

  let canvasLeft = 0;
  let canvasTop = 0;
  const measureCanvas = () => {
    const c = document.getElementById('world');
    const r = c ? c.getBoundingClientRect() : { left: 0, top: 0 };
    canvasLeft = r.left;
    canvasTop = r.top;
  };
  measureCanvas();
  window.addEventListener('resize', measureCanvas);

  // while a button is held the pointer is dragging the map or a UI control: no tooltip
  let pressed = false;
  const down = () => {
    pressed = true;
  };
  const up = () => {
    pressed = false;
  };
  window.addEventListener('pointerdown', down, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);

  let shown = false;
  let w = 0;
  let h2 = 0;
  let lastKey = '';
  let lastX = -1;
  let lastY = -1;

  const hide = () => {
    if (shown) {
      shown = false;
      el.hidden = true;
      lastKey = '';
    }
  };

  return {
    update() {
      const hv = game.hover;
      if (!hv || pressed) return hide();
      const e = game.world.byId.get(hv.id);
      if (!e) return hide();
      let name: string;
      let act = '';
      if (e.ent === 'person') {
        name = e.name;
        act = personActivity(e);
      } else if (e.ent === 'animal') {
        name = describeEntityName(game.world, e);
        act = WOLF_STATE[e.state] ?? '';
      } else {
        name = describeEntityName(game.world, e);
        act = thingStatus(game.world, e);
      }

      const key = `${hv.id}|${name}|${act}`;
      if (key !== lastKey) {
        lastKey = key;
        setText(nameEl, name);
        setText(actEl, act);
        sepEl.hidden = !act;
        if (!shown) {
          el.hidden = false;
          shown = true;
        }
        w = el.offsetWidth;
        h2 = el.offsetHeight;
        lastX = -1;
      } else if (!shown) {
        el.hidden = false;
        shown = true;
      }
      const x = clamp(canvasLeft + hv.px + 14, 6, Math.max(6, window.innerWidth - w - 6));
      let y = canvasTop + hv.py + 20;
      if (y + h2 > window.innerHeight - 6) y = canvasTop + hv.py - h2 - 10;
      const rx = Math.round(x);
      const ry = Math.round(y);
      if (rx !== lastX || ry !== lastY) {
        lastX = rx;
        lastY = ry;
        el.style.transform = `translate(${rx}px, ${ry}px)`;
      }
    },
    dispose() {
      window.removeEventListener('resize', measureCanvas);
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      el.remove();
    },
  };
}
