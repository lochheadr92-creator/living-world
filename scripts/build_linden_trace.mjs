import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
// Build-only changes. Both planner sites use the same household switch.
const replace=(s,from,to)=>{
 if(s.split(from).length!==2)throw Error('Unexpected source: '+from);
 return s.replace(from,to);
};
await build({entryPoints:['scripts/linden_trace.ts'],bundle:true,platform:'node',format:'cjs',outfile:process.argv[2],plugins:[{
 name:'household-trace',setup(b){
  b.onLoad({filter:/[\\/]sim[\\/](production|decision)\.ts$/},({path})=>{
   let s=readFileSync(path,'utf8');
   if(path.endsWith('production.ts')){
    for(const [call,person] of [['hasWorkshopErrand(world)','p'],['hasWorkshopErrand(ctx.world)','p']]){
      s=replace(s,call,'('+call+' && globalThis.lindenEnabled('+person+'.hhId))');
    }
    s=replace(s,'o.goal === offer.goal)) ctx.options.push(offer);','o.goal === offer.goal)) {globalThis.lindenRestored.add(offer); ctx.options.push(offer);}');
   }else{
    s=replace(s,"if (a.phase === 'travel' && world.hooks?.onTravelReview)", "if(p.hhId===1091 && a.phase==='travel' && ctx.options.some(o=>globalThis.lindenRestored.has(o))) globalThis.lindenReview(p,a,ctx,ranked);\n  if (a.phase === 'travel' && world.hooks?.onTravelReview)");
   }
   return {contents:s,loader:'ts'};
  });
 }
}]});

