// Rules 164: a person decides whether to ask another to share a life or a home from what they themselves feel and have seen.
// Before 164 (options_social.ts optPropose) the offer appeared only when the OTHER person's private regard for the proposer (their
// own Relation toward her, which nobody else can read) was already high enough, and the room for a roommate was read off the true
// household home even if the proposer had never seen it. Both are removed under 164: the proposer asks on their own feelings (as
// before, affinity and trust of their own), the answer is found out by asking (social.ts already refuses and sets a cooldown), and
// a roommate offer needs a home of the other's household that the proposer believes in.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-proposal-belief` restores the rules-163 reads inside a rules-164 world. */
export const proposalBeliefOn = (): boolean => enabled;
export function setProposalBelief(on: boolean): void { enabled = on; }
export const hasProposalBelief = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 164);
