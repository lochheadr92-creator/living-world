// Existing category payoff is not yet a source-specific reliability estimate. No tuning or ordinary-rate claim.
import {journeyRecoveryScene,failJourneySource} from '../tests/helpers/journey_recovery';
import {generateOptions} from '../src/sim/decision';
import {payNudge} from '../src/sim/learning';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const f=journeyRecoveryScene(73),before=payNudge(f.w,f.p,'tree'),i=failJourneySource(f),raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
const report={rules:73,staged:true,failedSource:f.tree.id,untriedAlternative:f.alt.id,failures:i.journey!.recovery!.failures,before,categoryEstimate:f.p.payoff.wood,after:payNudge(f.w,f.p,'tree'),alternative:ctx.options.filter(o=>o.key===`gather:${f.alt.id}`).map(o=>({key:o.key,label:o.label,parts:o.parts})),pure:serializeWorld(f.w)===raw,roundTrip:serializeWorld(deserializeWorld(raw))===raw,conserved:conservationReport(f.w).ok,interpretation:'The existing wood-work estimate is intentionally category-wide. It applies the failed first tree experience to the untried tree too; there is no source-specific reliability component. This does not establish a suitable new weight or a population benefit.'};
if(!report.pure||!report.roundTrip||!report.conserved)throw new Error('Invalid source-learning diagnostic');console.log(JSON.stringify(report,null,2));
