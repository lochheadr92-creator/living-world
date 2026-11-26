import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
await build({entryPoints:['scripts/social_reach.ts'],platform:'node',format:'cjs',bundle:true,outfile:process.argv[2],
 plugins:[{name:'social-reach',setup(b){
  b.onLoad({filter:/[\\/]sim[\\/]decision\.ts$/},({path})=>{
    let source=readFileSync(path,'utf8');
    for(const [marker,call] of [
      ['return scored.map((x) => x.o);','globalThis.agencyScores(ctx,scored);'],
      ['ledgerDecision(world, p, ctx, ranked, chosen, trigger, act);','globalThis.agencyChoice(ctx,ranked,chosen,act);']
    ]){
      if(source.split(marker).length!==2)throw Error('Unexpected native source: '+marker);
      source=source.replace(marker,call+'\n  '+marker);
    }
    return {contents:source,loader:'ts'};
  });
 }}]});

