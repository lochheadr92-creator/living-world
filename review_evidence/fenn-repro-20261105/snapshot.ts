// Save the rules-153 Large life-stages-6 world at a tick, for staged counterfactual forks (fork.ts). No twin, no hooks.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld} from '../../src/app/save';
const [tick='54000',out='snap.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('large','life-stages-6'),rulesVersion:153});
while(w.tick<Number(tick))stepWorld(w);
const raw=serializeWorld(w);writeFileSync(out,raw);
console.log(JSON.stringify({tick:w.tick,rules:w.settings.rulesVersion,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')}));
