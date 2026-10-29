import type { InhabitantObservation } from '../agent/observe';

/** Uses recorded timestamps only. Work wins ties; absent timestamps cannot establish recency. */
export function lastInhabitantSummary(doing: InhabitantObservation['doing']): string {
  const work = doing.lastResult, talk = doing.lastInteraction;
  const workText = work ? `${work.label} — ${work.outcome}` : '';
  const talkLabel = talk?.purpose === 'learn_technique' ? 'Asked for instruction'
    : talk?.purpose === 'teach_technique' ? 'Offered instruction' : talk?.purpose;
  const talkText = talk ? `${talkLabel} — ${talk.outcome}` : '';
  if (!work) return talkText;
  if (!talk) return workText;
  if (work.t === undefined) return `${workText}; ${talkText} (order unknown)`;
  return talk.t > work.t ? talkText : workText;
}

/** All quantities derive from the same restricted observation; demand is not inventory. */
export function planPackSummary(obs: InhabitantObservation): string {
  if (!obs.plans) return '';
  const parts: string[] = [];
  if (obs.self.aspiration) parts.push(obs.self.aspiration);
  const active = obs.plans.filter(p => p.status === 'active');
  if (active.length) parts.push('Plans: ' + active.map(p => `${p.goal}; next: ${p.step}${p.blocked ? ` (${p.blocked})` : ''}`).join('; '));
  for (const [item, wanted] of Object.entries(obs.self.spokenFor ?? {})) {
    if (!wanted) continue;
    const held = Math.min(wanted, obs.self.carrying[item as keyof typeof obs.self.carrying] ?? 0);
    parts.push(`${item}: ${held} carried and reserved, ${wanted - held} still missing (${wanted} wanted)`);
  }
  const free = Object.entries(obs.self.available ?? {}).filter(([, n]) => n && n > 0).map(([k,n]) => `${n} ${k}`);
  if (free.length) parts.push(`Unreserved: ${free.join(', ')}`);
  if (Object.keys(obs.self.spokenFor ?? {}).length) parts.push("Promises and actions serving the plan may use reserved goods; each offered action has its own limits.");
  return parts.join(' · ');
}
