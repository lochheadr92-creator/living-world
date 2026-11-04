// Paired check of the leisure test world (settingsFor 'l-places', 14 days, current rules) with and without rules-154 weighing.
import {createWorld} from '../../src/sim/factory';
import {stepWorld} from '../../src/sim/world';
import {DAY} from '../../src/sim/constants';
import {settingsFor} from '../../tests/helpers/util';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
import {parseIntervention} from '../../scripts/lab/lab';
for(const arm of ['control','rich-no-confidence']){
 const restore=parseIntervention(arm).install?.();
 const w=createWorld(settingsFor('l-places',{scene:'natural',dynamics:'rich',immigration:false,rulesVersion:CURRENT_RULES_VERSION}));
 const firsts:Record<string,number>={};
 for(let d=1;d<=14;d++){for(let i=0;i<DAY;i++)stepWorld(w);for(const p of w.persons)for(const r of p.leisure?.recent??[])firsts[r.key]??=d;}
 const deaths=w.events.filter(e=>/ died \(/.test(e.text)).map(e=>e.text.match(/\(([^)]+)\)/)![1]).reduce((m:Record<string,number>,c)=>(m[c]=(m[c]??0)+1,m),{});
 restore?.();console.log(JSON.stringify({arm,rules:w.settings.rulesVersion,alive:w.persons.filter(p=>p.alive).length,leisureFirstDay:firsts,deaths}));
}
