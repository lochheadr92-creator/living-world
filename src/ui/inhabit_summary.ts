import type { InhabitantObservation } from '../agent/observe';

/** Uses recorded timestamps only. Work wins ties; absent timestamps cannot establish recency. */
export function lastInhabitantSummary(doing: InhabitantObservation['doing']): string {
  const work = doing.lastResult, talk = doing.lastInteraction;
  const workText = work ? `${work.label} — ${work.outcome}` : '';
  const talkText = talk ? `${talk.purpose} — ${talk.outcome}` : '';
  if (!work) return talkText;
  if (!talk) return workText;
  if (work.t === undefined) return `${workText}; ${talkText} (order unknown)`;
  return talk.t > work.t ? talkText : workText;
}
