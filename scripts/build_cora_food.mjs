import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

// Expose the actual debited container, including food eaten straight from a store.
const taps = {
  'economy.ts': ['ledgerConsume(world, k, m, reason);','globalThis.coraDebit(items,k,m,reason);'],
  'world.ts': ["ledgerSpoil(world, k, lost, b.type === 'granary' ? 'grain bins: stored food spoiled' : 'stored food spoiled');","globalThis.coraDebit(b.store.items,k,lost,'stored food spoiled');"],
};
await build({entryPoints:['scripts/cora_food.ts'],platform:'node',bundle:true,format:'cjs',outfile:process.argv[2],
  plugins:[{name:'food-debits',setup(builder){
    builder.onLoad({filter:/[\\/]sim[\\/](economy|world)\.ts$/},({path})=>{
      const [anchor,call] = taps[path.split(/[\\/]/).at(-1)];
      const source = readFileSync(path,'utf8');
      if(source.split(anchor).length!==2) throw Error('Unexpected source in '+path);
      return {contents:source.replace(anchor,anchor+'\n'+call),loader:'ts'};
    });
  }}]});

