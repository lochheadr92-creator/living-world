import type { ViewRect } from '../app/viewer';

export type SpeechDetail = 'marker' | 'preview' | 'full';
export const SPEECH_ZOOM_POLICY = Object.freeze({
  min: 0.3, max: 3.2, markerEnter: 0.48, markerExit: 0.62, fullEnter: 1.5, fullExit: 1.3,
  maxWidth: 300, maxHeight: 156, cacheEntries: 256, maxCharacters: 1024,
});
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const OVERLAY_FONT = 'Inter, "Segoe UI", system-ui, sans-serif';

/** Hysteresis applies only to content level; small zoom changes cannot chatter between marker/preview/full. */
export function speechDetail(zoom: number, previous?: SpeechDetail): SpeechDetail {
  const p = SPEECH_ZOOM_POLICY;
  if (zoom < p.markerEnter || previous === 'marker' && zoom < p.markerExit) return 'marker';
  if (zoom > p.fullEnter || previous === 'full' && zoom > p.fullExit) return 'full';
  if (!previous && zoom < (p.markerEnter + p.markerExit) / 2) return 'marker';
  return 'preview';
}

/** One density policy for names, intention icons and speech. Detail belongs in the inspector. */
export function overlayPolicy(zoom: number, largeText = false) {
  const z = clamp(zoom, SPEECH_ZOOM_POLICY.min, SPEECH_ZOOM_POLICY.max);
  const t = Math.sqrt((z - 0.3) / 2.9);
  const scale = largeText ? 1.2 : 1;
  return {
    fontSize: lerp(10.5, 14.5, t) * scale,
    textWidth: lerp(100, 232, t) * scale,
    scale: lerp(0.82, 1.2, t) * scale,
    bubbles: 8,
    labels: z < 0.65 ? 0 : z < 1.3 ? 8 : 18,
    glyphs: z < 0.65 ? 0 : z < 1.3 ? 12 : 24,
  };
}

export interface BubbleLayout {
  lines: string[];
  font: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
  w: number;
  h: number;
  radius: number;
  outline: number;
  tail: number;
  gap: number;
  detail: SpeechDetail;
  truncated: boolean;
}
type TextMeasure = (text: string) => number;

/** Bounded wrapping, including tokens without spaces. No unlimited line or measurement work. */
function wrapped(text: string, width: number, limit: number, measure: TextMeasure): { lines: string[]; truncated: boolean } {
  const source = text.trim().replace(/\s+/gu, ' ');
  const chars = Array.from(source.slice(0, SPEECH_ZOOM_POLICY.maxCharacters));
  const lines: string[] = [];
  let offset = 0;
  while (offset < chars.length && lines.length < limit) {
    let end = offset;
    let lastSpace = -1;
    while (end < chars.length && measure(chars.slice(offset, end + 1).join('')) <= width) {
      if (chars[end] === ' ') lastSpace = end;
      end++;
    }
    if (end === offset) end++; // even a single wide character cannot make the loop stall
    else if (end < chars.length && lastSpace > offset) end = lastSpace;
    lines.push(chars.slice(offset, end).join('').trimEnd());
    offset = end;
    while (chars[offset] === ' ') offset++;
  }
  const truncated = offset < chars.length || source.length > SPEECH_ZOOM_POLICY.maxCharacters;
  if (truncated && lines.length) {
    let last = Array.from(lines[lines.length - 1]);
    while (last.length && measure(last.join('') + '…') > width) last.pop();
    lines[lines.length - 1] = last.join('').trimEnd() + '…';
  }
  return { lines: lines.length ? lines : ['…'], truncated };
}

/** Drawing and collision placement consume this exact measurement, in CSS screen pixels. */
export function measureBubble(ctx: Pick<CanvasRenderingContext2D, 'font' | 'measureText'>, text: string,
  zoom: number, detail: SpeechDetail, largeText = false, availableWidth: number = SPEECH_ZOOM_POLICY.maxWidth): BubbleLayout {
  const p = overlayPolicy(zoom, largeText);
  const font = `600 ${p.fontSize}px ${OVERLAY_FONT}`;
  ctx.font = font;
  const padding = 7 * p.scale, lineHeight = p.fontSize * 1.3;
  const width = Math.max(24, Math.min(p.textWidth, availableWidth - padding * 2, SPEECH_ZOOM_POLICY.maxWidth - padding * 2));
  const measure = (t: string) => ctx.measureText(t).width;
  const maxLines = Math.max(1, Math.min(detail === 'full' ? 6 : 2, Math.floor((SPEECH_ZOOM_POLICY.maxHeight - padding * 2) / lineHeight)));
  const content = detail === 'marker' ? { lines: [], truncated: text.length > 0 } : wrapped(text, width, maxLines, measure);
  return {
    ...content, font, fontSize: p.fontSize, lineHeight, padding,
    w: detail === 'marker' ? 23 * p.scale : Math.min(width, Math.max(...content.lines.map(measure))) + 2 * padding,
    h: detail === 'marker' ? 16 * p.scale : content.lines.length * lineHeight + 2 * padding,
    radius: 6 * p.scale, outline: p.scale, tail: 5 * p.scale, gap: 5 * p.scale, detail,
  };
}

/** Reconstructible, bounded cache; neither keys nor hits touch world state. */
export class SpeechLayoutCache {
  private entries = new Map<string, BubbleLayout>();
  hits = 0;
  misses = 0;
  get size() { return this.entries.size; }
  clear() { this.entries.clear(); }
  get(ctx: Pick<CanvasRenderingContext2D, 'font' | 'measureText'>, text: string, zoom: number, detail: SpeechDetail, large: boolean, width: number) {
    // 0.01 zoom resolution bounds remeasurement during eased camera movement (<0.1px font change).
    const z = Math.round(zoom * 100) / 100;
    const key = JSON.stringify([text.slice(0, 1025), z, detail, large, Math.floor(width)]);
    let layout = this.entries.get(key);
    if (layout) { this.hits++; return layout; }
    this.misses++;
    layout = measureBubble(ctx, text, z, detail, large, width);
    if (this.entries.size >= SPEECH_ZOOM_POLICY.cacheEntries) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, layout);
    return layout;
  }
}

export function intersects(a: ViewRect, b: ViewRect, gap = 0): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}
export interface BubblePlacement extends ViewRect { slot: number }
/** Bounded nearby slots, never an ever-growing stack. Remember the slot, not an old screen position. */
export function placeBubble(layout: Pick<BubbleLayout, 'w' | 'h' | 'gap'>, anchor: { x: number; y: number },
  bounds: ViewRect, occupied: readonly ViewRect[], previousSlot?: number): BubblePlacement | null {
  const { w, h, gap } = layout;
  if (w > bounds.w || h > bounds.h) return null;
  const positions = [
    [anchor.x - w / 2, anchor.y - h - gap],
    [anchor.x - w - gap, anchor.y - h - gap],
    [anchor.x + gap, anchor.y - h - gap],
    [anchor.x - w - gap, anchor.y - h / 2],
    [anchor.x + gap, anchor.y - h / 2],
    [anchor.x - w / 2, anchor.y + gap],
    [anchor.x - w / 2, anchor.y - h - gap - 40],
    [anchor.x + gap, anchor.y - h - gap - 40],
    [anchor.x - w - gap, anchor.y - h - gap - 40],
  ];
  const slots = positions.map((_, i) => i);
  if (previousSlot !== undefined && slots.includes(previousSlot)) slots.splice(0, 0, ...slots.splice(slots.indexOf(previousSlot), 1));
  for (const slot of slots) {
    const [x, y] = positions[slot];
    const r = { x: clamp(x, bounds.x, bounds.x + bounds.w - w), y: clamp(y, bounds.y, bounds.y + bounds.h - h), w, h, slot };
    // Panel/edge avoidance must not strand the bubble a long distance from its speaker.
    const dx = Math.max(r.x - anchor.x, 0, anchor.x - r.x - w);
    const dy = Math.max(r.y - anchor.y, 0, anchor.y - r.y - h);
    if (Math.hypot(dx, dy) > 64 || occupied.some(q => intersects(r, q, gap))) continue;
    return r;
  }
  return null;
}
