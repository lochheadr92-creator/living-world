// Lab-only same-state candidate comparison. A sampled restored option is not a decision
// and does not prove that retaining it caused the later outcome.
import { generateOptions, rankOptions } from '../../src/sim/decision';
import { hasKeptTarget, keptTargetOn, setKeptTarget } from '../../src/sim/kept_target';
import type { World } from '../../src/sim/types';

export class KeptTargetTrace {
  readonly counts = { livingPersonSamples: 0, relevantActivitySamples: 0, restoredSamples: 0, eligibleSamples: 0, uniqueActivities: 0, omittedSamples: 0, omittedEvents: 0 };
  readonly samples: unknown[] = [];
  readonly events: unknown[] = [];
  readonly endings: Record<string, number> = {};
  private active = new Map<number, { person: number; firstSeen: number; key: string }>();

  attach(w: World): () => void {
    const prior = w.hooks;
    w.hooks = { ...prior, onActivityEnd: (p, a, outcome, detail) => {
      prior?.onActivityEnd?.(p, a, outcome, detail);
      const sampled = this.active.get(a.id);
      if (!sampled) return;
      const key = `${a.kind}|${outcome}|${detail}`;
      this.endings[key] = (this.endings[key] ?? 0) + 1;
      if (this.events.length < 2000) this.events.push({ ...sampled, tick: w.tick, activity: a.id, name: p.name, outcome, detail, phase: a.phase, progress: a.progress, inventory: { ...p.inv } });
      else this.counts.omittedEvents++;
      this.active.delete(a.id);
    } };
    return () => { w.hooks = prior; };
  }

  sample(w: World): void {
    for (const p of w.persons) {
      if (!p.alive) continue;
      this.counts.livingPersonSamples++;
      const a = p.activity, key = a?.data.optKey;
      if (!a || typeof key !== 'string' || !/^(gather|collect|drink):/.test(key)) continue;
      this.counts.relevantActivitySamples++;
      if (!hasKeptTarget(w)) continue;
      const ctx = generateOptions(w, p, true, true), option = ctx.options.find(o => o.key === key);
      if (!option) continue;
      const was = keptTargetOn(); let previouslyOffered: boolean;
      setKeptTarget(false);
      try { previouslyOffered = generateOptions(w, p, true, true).options.some(o => o.key === key); }
      finally { setKeptTarget(was); }
      if (previouslyOffered) continue;
      this.counts.restoredSamples++;
      const ranked = rankOptions(ctx), eligible = ranked.some(o => o.key === key);
      if (eligible) this.counts.eligibleSamples++;
      if (!this.active.has(a.id)) { this.active.set(a.id, { person: p.id, firstSeen: w.tick, key }); this.counts.uniqueActivities++; }
      if (this.samples.length >= 2000) { this.counts.omittedSamples++; continue; }
      this.samples.push({ tick: w.tick, person: p.id, name: p.name, activity: a.id, key, phase: a.phase, utility: option.util, eligible, best: ranked[0] ? { key: ranked[0].key, utility: ranked[0].util } : null, position: { x: p.x, y: p.y }, needs: { ...p.needs } });
    }
  }

  report() { return { method: 'Repeated living-person samples, current source/stock/drink activity candidates compared with retention disabled in the same state. Actual later endings are linked to sampled activity IDs. No counterfactual trajectory or benefit is inferred; open sampled activities are censored.', counts: this.counts, endings: this.endings, openActivities: this.active.size }; }
}
