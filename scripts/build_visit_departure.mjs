import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

// Insert the observer in the diagnostic bundle so ordinary simulation builds
// retain the same source and native option ranking.
const anchor = 'ledgerDecision(world, p, ctx, ranked, chosen, trigger, act);';
const observer = 'if(act?.kind==="visit")globalThis.visitChoice(ctx,act);';
await build({
  entryPoints: ['scripts/visit_departure.ts'],
  platform: 'node',
  bundle: true,
  format: 'cjs',
  outfile: process.argv[2],
  plugins: [{
    name: 'visit-choice',
    setup(builder) {
      builder.onLoad({filter: /[\\/]sim[\\/]decision\.ts$/}, ({path}) => {
        const source = readFileSync(path,'utf8');
        if (source.split(anchor).length !== 2) throw Error('Unexpected decision source');
        return {contents: source.replace(anchor,anchor+'\n  '+observer), loader:'ts'};
      });
    },
  }],
});


