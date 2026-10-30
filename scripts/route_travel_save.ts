import {complementaryRouteScene} from '../tests/helpers/route_learning';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const f=complementaryRouteScene(),{w,p}=f;
for(let n=0;n<6000&&!(p.activity?.kind==='gather'&&p.activity.targetId===f.tree.id&&p.activity.phase==='travel');n++)stepWorld(w);
const a=p.activity;if(a?.kind!=='gather'||a.targetId!==f.tree.id||a.phase!=='travel'||!a.data.routeAttempt)throw new Error('Missing real recovery travel');
const savedAt=w.tick,activity=a.id,attempt=structuredClone(a.data.routeAttempt),twin=deserializeWorld(serializeWorld(w));for(let n=0;n<800;n++){stepWorld(w);stepWorld(twin);}
const equal=serializeWorld(w)===serializeWorld(twin),conserved=conservationReport(w).ok&&conservationReport(twin).ok;if(!equal||!conserved||!p.failures[f.tree.id].route?.corrected)throw new Error('Invalid travel continuation');console.log(JSON.stringify({rules:w.settings.rulesVersion,staged:true,savedAt,activity,attempt,through:w.tick,corrected:p.failures[f.tree.id].route!.corrected,equal,conserved}));
