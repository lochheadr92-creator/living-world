import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {gzipSync} from 'node:zlib';
import {hostname} from 'node:os';
import {execFileSync} from 'node:child_process';
const result=[];
for(const [profile,ticks] of [['normal',2400],['large',600]] as const){
 const w=createWorld(currentWorldSettings(profile,'meadow',{immigration:true}));
 for(let i=0;i<ticks;i++)stepWorld(w);
 const before=serializeWorld(w),packed=serializeWorld(w,5),old=deserializeWorld(before),next=deserializeWorld(packed);
 if(serializeWorld(old)!==serializeWorld(next)||serializeWorld(w)!==before)throw Error('State or observer mismatch');
 for(let i=0;i<120;i++){stepWorld(old);stepWorld(next);}
 if(serializeWorld(old)!==serializeWorld(next))throw Error('Continuation mismatch');
 result.push({profile,ticks,people:w.persons.length,rules:w.settings.rulesVersion,format4Text:Buffer.byteLength(before),format5Text:Buffer.byteLength(packed),format4Gzip:gzipSync(before).length,format5Gzip:gzipSync(packed).length,exactContinuation:true,sourceUnchanged:true});
}
console.log(JSON.stringify({host:hostname(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),note:'Bounded size comparison on identical worlds, not a mature-world or speed benchmark. Working tree contains format-5 implementation.',result},null,2));
