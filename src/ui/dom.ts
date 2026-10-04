// Tiny DOM toolkit: element builder, cached setters (so unchanged values never touch the DOM),
// a keyed list reconciler (rows are reused in place, so clicks never land on a node that was just replaced)
// and a few formatting and colour helpers. No framework, no innerHTML with simulation text.

export type Child = Node | string | number | false | null | undefined | Child[];

export interface Props {
  [key: string]: unknown;
}

type Bag = { _m?: Record<string, unknown> };

function appendChildren(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) appendChildren(el, c);
    else if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
    else el.appendChild(c);
  }
}

function applyProps(el: HTMLElement, props: Props): void {
  for (const key of Object.keys(props)) {
    const v = props[key];
    if (v === undefined || v === null || v === false) continue;
    if (key === 'class' || key === 'className') el.className = String(v);
    else if (key === 'text') el.textContent = String(v);
    else if (key === 'style') {
      if (typeof v === 'string') el.style.cssText = v;
      else for (const [k, val] of Object.entries(v as Record<string, string>)) el.style.setProperty(k, val);
    } else if (key === 'dataset') {
      for (const [k, val] of Object.entries(v as Record<string, string>)) el.dataset[k] = val;
    } else if (key.length > 2 && key.startsWith('on') && typeof v === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), v as EventListener);
    } else if (key === 'hidden' || key === 'disabled') {
      (el as unknown as Record<string, unknown>)[key] = true;
    } else if (v === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(v));
  }
}

/** Create an element: `h('div', { class: 'x', onClick: fn }, 'text', child)` */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) applyProps(el, props);
  appendChildren(el, children);
  return el;
}

export function append(el: Node, ...children: Child[]): void {
  appendChildren(el, children);
}

// ───────────── cached setters: only touch the DOM when the value actually changed ─────────────
function memo<T>(el: Element, key: string, v: T, apply: (v: T) => void): void {
  const bag = el as unknown as Bag;
  const m = (bag._m ??= {});
  if (m[key] !== v) {
    m[key] = v;
    apply(v);
  }
}

export function setText(el: Element, text: string): void {
  memo(el, 't', text, (t) => {
    el.textContent = t;
  });
}

export function setWidth(el: HTMLElement, pct: number): void {
  const p = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
  memo(el, 'w', p, (v) => {
    el.style.width = v + '%';
  });
}

export function setAttr(el: Element, name: string, value: string | number | boolean | null): void {
  const s = value === null || value === false ? null : value === true ? '' : String(value);
  memo(el, 'a:' + name, s, (v) => {
    if (v === null) el.removeAttribute(name);
    else el.setAttribute(name, v);
  });
}

/** aria-pressed / aria-expanded style attributes, which need the literal strings "true" / "false" */
export function setBool(el: Element, name: string, value: boolean): void {
  memo(el, 'b:' + name, value, (v) => {
    el.setAttribute(name, v ? 'true' : 'false');
  });
}

export function setVar(el: HTMLElement, name: string, value: string): void {
  memo(el, 'v:' + name, value, (v) => {
    el.style.setProperty(name, v);
  });
}

export function toggle(el: Element, cls: string, on: boolean): void {
  memo(el, 'c:' + cls, on, (v) => {
    el.classList.toggle(cls, v);
  });
}

export function setHidden(el: HTMLElement, hidden: boolean): void {
  memo(el, 'hid', hidden, (v) => {
    el.hidden = v;
  });
}

/** Set one of a fixed set of mutually exclusive state classes (e.g. `is-low`) */
export function setState(el: Element, prefix: string, state: string): void {
  memo(el, 's:' + prefix, state, (v) => {
    const cl = el.classList;
    for (const c of Array.from(cl)) if (c.startsWith(prefix)) cl.remove(c);
    if (v) cl.add(prefix + v);
  });
}

// ───────────── keyed list reconciler ─────────────
/**
 * Keeps the children of `parent` in step with a list of items. Every key owns one component (built once, then
 * updated in place), so rows are never replaced while the pointer is on them and a click always lands.
 */
export class KeyedList<T, C extends { el: HTMLElement }> {
  private map = new Map<string, C>();

  constructor(
    readonly parent: HTMLElement,
    private create: (item: T, key: string) => C,
    private update: (comp: C, item: T, key: string) => void,
  ) {}

  sync(items: readonly T[], keyOf: (item: T, index: number) => string): void {
    const seen = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let key = keyOf(item, i);
      while (seen.has(key)) key += '+';
      seen.add(key);
      let comp = this.map.get(key);
      if (!comp) {
        comp = this.create(item, key);
        this.map.set(key, comp);
      }
      this.update(comp, item, key);
      const cur = this.parent.children[i] as HTMLElement | undefined;
      if (cur !== comp.el) this.parent.insertBefore(comp.el, cur ?? null);
    }
    for (const [k, comp] of this.map) {
      if (!seen.has(k)) {
        comp.el.remove();
        this.map.delete(k);
      }
    }
  }

  clear(): void {
    this.map.clear();
    this.parent.replaceChildren();
  }

  each(fn: (comp: C, key: string) => void): void {
    for (const [k, c] of this.map) fn(c, k);
  }

  get size(): number {
    return this.map.size;
  }
}

// ───────────── scheduling ─────────────
/** Fires `step()` true once every `every` seconds of accumulated time. */
export class Every {
  private t: number;
  constructor(
    private every: number,
    startDue = true,
  ) {
    this.t = startDue ? every : 0;
  }
  step(dt: number): boolean {
    this.t += dt;
    if (this.t >= this.every) {
      this.t = this.every > 0 ? this.t % this.every : 0;
      return true;
    }
    return false;
  }
  /** make the next `step` fire immediately */
  force(): void {
    this.t = this.every;
  }
}

// ───────────── numbers and text ─────────────
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const plural = (n: number, one: string, many = one + 's'): string => `${n} ${n === 1 ? one : many}`;
export const round1 = (n: number): number => Math.round(n * 10) / 10;

/** "1,234" style thousands separators without depending on locale */
export function thousands(n: number): string {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

/** Wall-clock style "5 min ago" for a Date.now() timestamp */
export function wallAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 90) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min ago`;
  const hh = Math.round(m / 60);
  if (hh < 36) return `${hh} h ago`;
  return `${Math.round(hh / 24)} days ago`;
}

// ───────────── colour ─────────────
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Lift a palette colour just enough to stay legible on the dark glass panels */
export function legible(hex: string, minLum = 0.2): string {
  let c = hex;
  for (let i = 0; i < 8 && luminance(c) < minLum; i++) c = mix(c, '#ffffff', 0.14);
  return c;
}

// ───────────── misc ─────────────
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = h('textarea', { value: text, 'aria-hidden': 'true', style: 'position:fixed;left:-9999px;top:0;opacity:0' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit', 'range'].includes(type);
  }
  return tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
