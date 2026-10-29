import { describe, expect, it } from 'vitest';
import { measureBubble, overlayPolicy, placeBubble, speechDetail, SpeechLayoutCache, SPEECH_ZOOM_POLICY, intersects } from '../src/render/speech_layout';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '../src/app/prefs';
import { speechVisible, viewerPreferences } from '../src/app/viewer';
const ctx = { font: '', measureText(text: string) { return { width: Array.from(text).length * parseFloat(this.font.slice(4)) * 0.55 }; } } as CanvasRenderingContext2D;

describe('screen-space speech contract', () => {
  it('wide markers take substantially less area, close text grows, very close growth is bounded', () => {
    const text = 'I will bring grain to the home, then return for the rest.';
    const wide = measureBubble(ctx,text,.3,'marker'), mid = measureBubble(ctx,text,.9,'preview'), close = measureBubble(ctx,text,1.8,'full');
    expect(wide.w * wide.h).toBeLessThan(mid.w * mid.h / 4);
    expect(close.fontSize).toBeGreaterThan(mid.fontSize);
    expect(close.w * close.h).toBeGreaterThan(mid.w * mid.h);
    expect(overlayPolicy(200)).toEqual(overlayPolicy(3.2));
  });
  it('bounds long speech and tokens, marking omitted content honestly', () => {
    for (const text of ['a'.repeat(10000), 'a long message '.repeat(900), '🌲'.repeat(1000)]) {
      const l = measureBubble(ctx,text,3.2,'full',true,220);
      expect(l.w).toBeLessThanOrEqual(220);
      expect(l.h).toBeLessThanOrEqual(SPEECH_ZOOM_POLICY.maxHeight);
      expect(l.truncated).toBe(true);
      expect(l.lines.at(-1)).toMatch(/…$/u);
      expect(l.lines.every(line => ctx.measureText(line).width <= l.w - l.padding * 2 + 0.01)).toBe(true);
    }
  });
  it('does not flicker content levels around either nominal threshold', () => {
    let detail = speechDetail(.3);
    for (const z of [.53,.56,.54,.58]) { detail = speechDetail(z,detail); expect(detail).toBe('marker'); }
    detail = speechDetail(.7,detail); expect(detail).toBe('preview');
    for (const z of [.59,.52,.55]) { detail = speechDetail(z,detail); expect(detail).toBe('preview'); }
    detail = speechDetail(1.8,detail);
    for (const z of [1.4,1.48,1.39]) { detail = speechDetail(z,detail); expect(detail).toBe('full'); }
  });
  it('uses measured height, avoids panels and crowds, retains a nearby slot as the speaker moves', () => {
    const l = measureBubble(ctx,'A very long message '.repeat(10),1.8,'full');
    const bounds = {x:8,y:8,w:700,h:500}, panel={x:510,y:8,w:198,h:500};
    const a = placeBubble(l,{x:480,y:300},bounds,[panel]); expect(a).not.toBeNull();
    expect(intersects(a!,panel)).toBe(false);
    const b = placeBubble(l,{x:482,y:301},bounds,[panel],a!.slot); expect(b?.slot).toBe(a!.slot);
    expect(placeBubble(l,{x:480,y:300},bounds,[bounds])).toBeNull();
    const edge = placeBubble(l,{x:12,y:20},bounds,[]); expect(edge).not.toBeNull();
    expect(edge!.x).toBeGreaterThanOrEqual(bounds.x); expect(edge!.y).toBeGreaterThanOrEqual(bounds.y);
  });
  it('caches unchanged text and bounds disposable layout state', () => {
    const cache = new SpeechLayoutCache();
    const a = cache.get(ctx,'hello',1,'preview',false,300);
    expect(cache.get(ctx,'hello',1,'preview',false,300)).toBe(a);
    expect(cache.hits).toBe(1);
    for(let i=0;i<500;i++) cache.get(ctx,String(i),1,'full',false,300);
    expect(cache.size).toBe(SPEECH_ZOOM_POLICY.cacheEntries);
  });
  it('warnings obey explicit visibility settings and invalid stored preferences have safe defaults', () => {
    expect(speechVisible('automatic',false)).toBe(true);
    expect(speechVisible('selected',false)).toBe(false);
    expect(speechVisible('selected',true)).toBe(true);
    expect(speechVisible('hidden',true)).toBe(false);
    expect(viewerPreferences({speech:'invalid'} as never).speech).toBe('automatic');
    let raw = '{}';
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}}});
    const prefs = {...DEFAULT_PREFS,viewer:viewerPreferences({speech:'selected',textSize:'large',contrast:'high',reducedMotion:true})};
    savePrefs(prefs); expect(loadPrefs().viewer).toEqual(prefs.viewer);
    raw='{}'; expect(loadPrefs().viewer.speech).toBe('automatic');
    Reflect.deleteProperty(globalThis,'localStorage');
  });
});
