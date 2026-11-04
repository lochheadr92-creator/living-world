// REVIEW-ONLY probe (adversarial review, 2026-11-01). Not a product test. Safe to delete.
// In the live-page inspection of the ordinary forest world, Bram's haul promise to Hana's hut site #2280 ended "moot:
// I saw that the promised site was no longer there; its fate is unknown". This probe replays the same deterministic world
// headlessly and records what actually became of site #2280, so the helper's stated knowledge can be compared with events.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';

describe('REVIEW: fate of a promised site versus what the helper says', () => {
  it('forest, 6,000 ticks: site #2280 events, buildings on its footprint, helper commitment text', () => {
    const w = createWorld(currentWorldSettings('normal', 'forest', { immigration: false }));
    const siteSeen: { tick: number; text: string }[] = [];
    let site: any = null;
    for (let t = 0; t < 6000; t++) {
      stepWorld(w);
      if (!site) { const s = w.sites.find((s) => s.id === 2280); if (s) site = { x: s.x, y: s.y, w: s.w, h: s.h, type: s.type, hhId: s.hhId, createdTick: s.createdTick }; }
    }
    for (const e of w.events) if (/site|hut/i.test(e.text) && (e.x === site?.x || /Linden|abandon/.test(e.text))) siteSeen.push({ tick: e.tick, text: e.text });
    const bram = w.persons.find((p) => p.name === 'Bram')!;
    const c = bram.commitments.find((c) => c.id === 2441);
    const onFootprint = w.buildings.filter((b) => site && b.x === site.x && b.y === site.y).map((b) => ({ id: b.id, type: b.type, hhId: b.hhId, built: (b as any).built }));
    const stillSite = w.sites.some((s) => s.id === 2280);
    const out = { site, stillSite, onFootprint, commitment: c && { status: c.status, reason: c.reason, delivered: c.delivered, amount: c.amount, targetEvidence: c.targetEvidence }, events: siteSeen.slice(-12), hanaHome: (() => { const h = w.households.find((h) => h.id === site?.hhId); return h && { id: h.id, homeId: h.homeId }; })() };
    writeFileSync('C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/site_fate.json', JSON.stringify(out, null, 1));
    expect(site).not.toBeNull();
  });
});
