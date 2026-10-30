// Staged demand conflict; no actions selected and no simulation state changes.
import {cartPrerequisiteScene} from '../tests/helpers/tool_prerequisite';
import {generateOptions} from '../src/sim/decision';
import {observe} from '../src/sim/knowledge';
import {demandsOf} from '../src/sim/production';
import {serializeWorld} from '../src/app/save';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
const f=cartPrerequisiteScene(CURRENT_RULES_VERSION);f.target.required.planks=8;observe(f.w,f.p,f.target);
const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
console.log(JSON.stringify({rules:f.w.settings.rulesVersion,demands:demandsOf(ctx).map(d=>({item:d.item,why:d.why})),wanted:ctx.toolWanted,
 blocked:ctx.blocked.filter(o=>/needs a (saw|hammer)/.test(o.blocked??'')).map(o=>({label:o.label,why:o.blocked})),crafts:ctx.options.filter(o=>o.kind==='craft').map(o=>o.key),pure:serializeWorld(f.w)===before},null,2));
