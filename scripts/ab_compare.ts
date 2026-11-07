// Reads the output of scripts/ab_run.ps1 and says, seed by seed, whether the world ended identically at the two rules versions, and for the seeds
// that did not, how far apart the outcomes are. No noise floor is computed here (that needs the lab's nudge arms): a seed that parts is a seed to
// take to the lab with `--rules <before>` and `--branches nudge:1,nudge:2`, against the current run, before any claim is made.
//   npx vite-node scripts/ab_compare.ts -- <dir> <before> <after>
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2).filter(a=>a!=='--');
const [dir='.',before='0',after='0']=args;
const seeds=['aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'];
type R={seed:string;finalHash:string;alive:number;deaths:number;households:number;coupled:number;meanHunger:number;meanMood:number;ill:number;buildings:number;conserved:boolean;tools:boolean;popByDay:number[]};
const read=(s:string,r:string):R|null=>{const f=`${dir}/ab-${s}-r${r}.json`;return existsSync(f)?JSON.parse(readFileSync(f,'utf8')) as R:null;};
const lines:string[]=[];
const say=(s:string)=>{lines.push(s);console.log(s);};
let same=0,both=0,sound=0;
say(`A/B at rules ${before} and ${after}, ${seeds.length} seeds (${dir})`);
say('seed     identical   alive  deaths  households  coupled  hunger   mood   ill   (before -> after)');
for(const s of seeds){
 const a=read(s,before),b=read(s,after);
 if(!a||!b){say(`${s.padEnd(8)} missing`);continue;}
 both++;if(a.finalHash===b.finalHash)same++;if(a.conserved&&b.conserved&&a.tools&&b.tools)sound++;
 const d=(x:number,y:number)=>x===y?`${x}`:`${x}->${y}`;
 say(`${s.padEnd(8)} ${(a.finalHash===b.finalHash?'yes':'NO').padEnd(10)}  ${d(a.alive,b.alive).padEnd(6)} ${d(a.deaths,b.deaths).padEnd(7)} ${d(a.households,b.households).padEnd(11)} ${d(a.coupled,b.coupled).padEnd(8)} ${d(a.meanHunger,b.meanHunger).padEnd(8)} ${d(a.meanMood,b.meanMood).padEnd(6)} ${d(a.ill,b.ill)}`);
}
say(`identical in ${same} of ${both} seeds; conservation and the tool registry hold in ${sound} of ${both} pairs`);
writeFileSync(`${dir}/ab-compare.txt`,lines.join('\n')+'\n');
