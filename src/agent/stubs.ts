// Scripted models: deterministic stand-ins for a language model, for tests and smoke runs. No network. Each reads the observation
// (and, with memory, the notes) back out of the prompt and answers the same JSON a model would.
import { observationFromPrompt, notesFromPrompt } from './protocol';
import type { InhabitantObservation, ObservedOption } from './observe';
import type { InhabitantNotes } from '../sim/types';
import { stubModel } from './model';
import type { ModelClient } from './model';
import type { NoteUpdate } from './memory';

/** picks by a fixed rule over the offered options */
export function pickerModel(rule: 'first' | 'last' | 'cycle'): ModelClient {
  const pick = (o: InhabitantObservation | null, n: number): string => {
    if (!o || !o.options.length) return 'wander';
    if (rule === 'first') return o.options[0].key;
    if (rule === 'last') return o.options[o.options.length - 1].key;
    return o.options[n % o.options.length].key;
  };
  return stubModel(`stub:${rule}`, (req, n) => JSON.stringify({ choose: pick(observationFromPrompt(req.user), n), why: `scripted: ${rule}` }));
}

const SITE_REF = /\[place:(\d+)\]/;

function siteOf(o: InhabitantObservation, id: number) {
  return o.remembered.places.find((p) => p.id === id);
}

function missingText(missing: Record<string, number | undefined> | undefined): string {
  const parts = Object.entries(missing ?? {})
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([k, n]) => `${n} ${k}`);
  return parts.length ? parts.join(', ') : 'nothing';
}

/**
 * The goal keeper (docs/INHABITANT.md, section 8), a test instrument. When the engine first offers work at an unfinished building site
 * it adopts the goal of finishing that site and writes it into its notes, but takes the first option that moment like any other: it
 * never acts on a goal at the moment of adopting it. Only a goal read back from its notes is acted on (deliver to the site, build at
 * it, or chop wood when the notes say the site lacks wood). So a choice that advances the site and is not the first option can only
 * have come from the notes. With `readNotes` off it writes notes but never reads them (the control: memory machinery on, nothing
 * remembered in effect), and with no notes in the prompt at all (a run without memory) it adopts nothing; both take the first option
 * every time.
 */
export function goalKeeperModel(opts: { readNotes?: boolean } = {}): ModelClient {
  const readNotes = opts.readNotes !== false;
  return stubModel(
    `stub:goal-keeper${readNotes ? '' : ':blind'}`,
    (req) => {
      const o = observationFromPrompt(req.user);
      const notes: InhabitantNotes | null = notesFromPrompt(req.user);
      if (!o) throw new Error('no observation in the prompt');
      const byKind = (kind: string, siteId?: number): ObservedOption | undefined => o.options.find((x) => x.kind === kind && (siteId === undefined || x.key.endsWith(':' + siteId)));
      const fallback = o.options[0]?.key ?? 'wander';
      const last = o.doing.lastResult;
      const journal = `${o.time.clock}: last ${last ? `${last.label} → ${last.outcome}${last.detail ? ' (' + last.detail + ')' : ''}` : 'nothing yet'}`;

      // what the notes say the goal is (only when allowed to read them)
      const goal = readNotes && notes ? notes.goals.find((g) => SITE_REF.test(g.text)) : undefined;
      const siteId = goal ? Number(SITE_REF.exec(goal.text)![1]) : null;

      if (siteId === null) {
        // no goal yet (or none readable): adopt one when the engine offers work at a known site, if the prompt carries notes at all
        const sites = notes ? o.remembered.places.filter((p) => / site$/.test(p.what)) : [];
        const site = sites.find((p) => o.options.some((x) => (x.kind === 'haul' || x.kind === 'build') && x.key.endsWith(':' + p.id)));
        if (!site) return JSON.stringify({ choose: fallback, why: 'nothing to pursue; taking the first option', ...(notes ? { notes: { journal } } : {}) });
        const update: NoteUpdate = {
          goals: [{ text: `Help finish the ${site.what} ${site.distance} tiles ${site.direction} [place:${site.id}]` }],
          intentions: [{ text: 'Bring what the site needs and work on it when I can' }],
          inferences: [{ text: `The site still needs: ${missingText(site.missing)}`, confidence: 0.8, basis: [`place:${site.id}`, `obs:${o.time.tick}`] }],
          uncertainties: [{ text: 'Whether anyone else is bringing materials to it' }],
          journal: `${journal}. Found an unfinished ${site.what}; I will help finish it.`,
        };
        return JSON.stringify({ choose: fallback, why: 'noting the site to help with; taking the first option for now', notes: update });
      }

      // a goal is remembered: pursue it from the notes
      const site = siteOf(o, siteId);
      const n = notes!;
      const restate = (list: { id: string; text: string }[]) => list.map((e) => ({ id: e.id, text: e.text }));
      if (!site) {
        return JSON.stringify({
          choose: fallback,
          why: 'the site I was helping with is no longer among the places I know; letting the goal go',
          notes: { goals: n.goals.filter((g) => g.id !== goal!.id).map((g) => ({ id: g.id, text: g.text })), intentions: [], inferences: [], uncertainties: restate(n.uncertainties), journal: `${journal}. The site is gone from my memory; goal dropped.` },
        });
      }
      const needs = missingText(site.missing);
      const inferences = n.inferences.map((i) => ({ id: i.id, text: i.text, confidence: i.confidence, basis: i.basis }));
      const about = inferences.find((i) => i.text.startsWith('The site still needs'));
      if (about) {
        about.text = `The site still needs: ${needs}`;
        about.confidence = needs === 'nothing' ? 0.3 : 0.8;
        about.basis = [`place:${site.id}`, `obs:${o.time.tick}`];
      }
      const stalled = last && last.outcome === 'partial' && /no materials/.test(last.detail);
      const pointless = inferences.find((i) => i.text.startsWith('Working there is pointless'));
      if (stalled && !pointless && last.t !== undefined) inferences.push({ id: '', text: 'Working there is pointless until materials arrive', confidence: 0.7, basis: [`result:${last.t}`, `place:${site.id}`] });
      const kept = inferences.filter((i) => !(i.text.startsWith('Working there is pointless') && last && last.outcome === 'success' && /Build/.test(last.label)));
      const wantsWood = /wood/.test(needs);
      const act = byKind('haul', site.id) ?? (needs === 'nothing' || !stalled ? byKind('build', site.id) : undefined) ?? (wantsWood ? o.options.find((x) => x.kind === 'gather' && x.target !== null && /^tree /.test(x.target)) : undefined);
      const update: NoteUpdate = {
        goals: restate(n.goals),
        intentions: [{ text: act ? `Now: ${act.label}` : 'Wait for a chance to get to the site' }],
        inferences: kept.map((i) => (i.id ? i : { text: i.text, confidence: i.confidence, basis: i.basis })),
        uncertainties: restate(n.uncertainties),
        journal: `${journal}. Goal: ${goal!.text.replace(SITE_REF, '').trim()}.`,
      };
      return JSON.stringify({ choose: act ? act.key : fallback, why: act ? `pursuing my goal: ${act.label}` : 'no way to advance the site now; taking the first option', notes: update });
    },
    { readNotes },
  );
}
