// Derived household project explanations. Never refresh beliefs, infer a cause from
// nearby events, or consult a site's live inventory on the inhabitant's behalf.
import { planOfActivity } from './intent';
import { remembersNeed, shortText } from './shelter';
import type { Intention, Person } from './types';

export function homePlanPause(p: Person, i: Intention): string {
  if (i.kind !== 'shelter' || i.status !== 'active' || !p.suspended || planOfActivity(p, p.suspended)?.id !== i.id) return '';
  // A suspended action alone proves the pause, not its cause. Only the current
  // conversation activity supplies that explanation; older interactions do not.
  return p.activity?.kind === 'converse'
    ? `paused for a conversation (${p.suspended.label})`
    : `paused (${p.suspended.label}); reason not recorded`;
}

export function homeSiteRequirements(p: Person, i: Intention): string {
  const b = p.beliefs[i.aboutId];
  if (!b || b.kind !== 'site' || b.hh !== p.hhId || !b.need) return 'Site requirements unknown.';
  const need = remembersNeed(b);
  return Object.keys(need).length
    ? `Last known site requirements: ${shortText(need)}.`
    : 'No materials missing in the last known site record.';
}

export function homeDeliveryProgress(i: Intention): string {
  const n = Math.round(i.worked);
  return `${n} unit${n === 1 ? '' : 's'} carried to the site`;
}
