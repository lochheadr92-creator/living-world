import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
await build({entryPoints:['scripts/choice_funnel.ts'],platform:'node',bundle:true,format:'cjs',outfile:process.argv[2],plugins:[{
 name:'observe-native-choices',setup(build){
  build.onLoad({filter:/[\\/]sim[\\/]options_social\.ts$/},({path})=>{
   const src=readFileSync(path,'utf8');
   const audit=`
export function auditPartner(ctx){
 const pass=(k)=>globalThis.partnerGate(k);
 pass('decisions');
 if(ctx.world.settings.scene!=='natural'||!['adult','elder'].includes(ctx.stage))return;
 pass('adult');
 if(ctx.p.partnerId!==0)return;
 pass('unpartnered');
 if(ctx.drives.hunger>25||ctx.drives.thirst>25)return;
 pass('needsClear');
 const options=candidates(ctx);if(options.length)pass('hasCandidate');
 const gates=new Set();
 for(const {q,d} of options){
   if(d>10||['child','youth'].includes(stageOf(ctx.world,q)))continue;
   gates.add('nearAdult');
   if((ctx.p.cooldowns['propose'+q.id]??0)>ctx.world.tick)continue;
   const rel=ctx.p.relations[q.id];
   if(!rel||rel.familiarity<10)continue;
   gates.add('familiar');
   if(rel.kin||q.partnerId!==0)continue;
   gates.add('available');
   if(rel.affinity>=30)gates.add('affinity'); if(rel.trust>=20)gates.add('trust');
   if(rel.affinity<30||rel.trust<20)continue;
   gates.add('regard');
   if(spark(ctx.p,q))gates.add('spark');
 }
 for(const k of gates)pass(k);
}`;
   return {contents:src+audit,loader:'ts'};
  });
  build.onLoad({filter:/[\\/]sim[\\/]decision\.ts$/},({path})=>{
   let src=readFileSync(path,'utf8');
   function before(marker,addition){
    if(src.split(marker).length!==2) throw Error('Expected one '+marker);
    src=src.replace(marker,addition+'\n  '+marker);
   }
   before('return scored.map((x) => x.o);','globalThis.choiceScores?.(ctx,scored);');
   before('record(world, p, ctx, ranked, o, trigger, why, act);','if(globalThis.partnerGate)auditPartner(ctx); globalThis.choiceLaunch?.(ctx,ranked,o,act);');
   before('record(world, p, ctx, ranked, null, trigger);','if(globalThis.partnerGate)auditPartner(ctx); globalThis.choiceLaunch?.(ctx,ranked,null,null);');
   return {contents:"import {auditPartner} from './options_social';\n"+src,loader:'ts'};
  });
 }
}]});


