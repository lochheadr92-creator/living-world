import {build} from 'esbuild';
import {readFileSync} from 'node:fs';

// Patch the experiment bundle in memory. Each anchor must identify one native hook.
const edits = {
  welfare: [
    ['const sev = c.kind', 'if(globalThis.doorHold(ctx,c.about)) continue;\n    const sev = c.kind'],
    ['const give: Items = {};','globalThis.doorContact(p,t,a,needs,wanted); const give: Items = {};'],
    ['if (moved > 0) {', `
      globalThis.doorTransfer(p,t,got);
      if (globalThis.visitDrink?.(p,t,a,give.water??0,moved)) {
        p.concerns=p.concerns.filter(c=>c.about!==t.id);
        p.cooldowns["check"+t.id]=world.tick+CHECK_COOLDOWN;
        a.data.outcome="drank offered water";
        a.cycle=1;
        return "done";
      }
      if (moved > 0) {`]
  ],
  decision: [['ledgerDecision(world, p, ctx, ranked, chosen, trigger, act);', 'ledgerDecision(world, p, ctx, ranked, chosen, trigger, act); if(act?.kind==="visit")globalThis.doorLaunch(ctx,act);']],
  resident_contact: [
    ['isResidentCare(w,a)&&Number.isSafeInteger', '(isResidentCare(w,a)||a.data.doorVisit===true)&&Number.isSafeInteger'],
    ['const refused=enterHome(w,p,b);if(refused)return refused;', 'const refused=a.data.doorVisit?globalThis.doorEnter(w,p,a,b):enterHome(w,p,b);if(refused)return refused;']
  ],
  habitation: [['if(runsRulesVersion(w,124)', 'if(a.data.doorVisit && a.data.careHome===p.indoors)return true;\n  if(runsRulesVersion(w,124)']]
};
await build({entryPoints:[process.argv[3] ?? 'scripts/visit_door.ts'],outfile:process.argv[2],bundle:true,platform:'node',plugins:[{
  name:'door-experiment', setup(builder){
    builder.onLoad({filter:/[\\/]sim[\\/](welfare|decision|resident_contact|habitation)\.ts$/},({path})=>{
      let contents=readFileSync(path,'utf8');
      for(const [anchor,replace] of edits[path.split(/[\\/]/).pop().slice(0,-3)]){
        if(contents.split(anchor).length!==2)throw Error('Ambiguous hook '+anchor);
        contents=contents.replace(anchor,replace);
      }
      return {contents,loader:'ts'};
    });
  }
}]});
