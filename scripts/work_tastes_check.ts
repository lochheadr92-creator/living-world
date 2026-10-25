// Short mechanism check, not aggregate benefit. Same-option counterfactual samples plus actual starts.
// npx vite-node scripts/work_tastes_check.ts -- --days 3 --seeds meadow,river,fern --json civic_evidence/work-tastes.json
import {mkdirSync,writeFileSync} from 'node:fs';
import {DAY} from '../src/sim/constants';
import {createWorld} from '../src/sim/factory';
import {freshRunSettings} from '../src/sim/profiles';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {personalWorkTaste,setWorkTastes} from '../src/sim/temperament';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
const args=process.argv.slice(2);
const opt=(name:string,fallback:string)=>args.includes('--'+name)?args[args.indexOf('--'+name)+1]:fallback;
const days=Number(opt('days','3')), seeds=opt('seeds','meadow,river,fern').split(',');
const rows:any[]=[]; const food=['berries','fruit','fish','grain','bread','meat'];
mkdirSync('civic_evidence',{recursive:true});
for(const seed of seeds){
 let scene:{tick:number;id:number;name:string}|null=null;
 for(const on of [true,false]){
  setWorkTastes(on); const w=createWorld(freshRunSettings('rich','normal',seed,{immigration:false}));
  let starts=0, changedStarts=0, samples=0, changedRankings=0;const people=new Set<number>(), rankedPeople=new Set<number>();
  let capture=false;
  w.hooks={onActivityStart:(p,a)=>{
   starts++;
   if(typeof a.data.why==='string'&&a.data.why.includes('another close work choice')){
    changedStarts++;people.add(p.id);
    if(!scene){scene={tick:w.tick,id:p.id,name:p.name};capture=true;}
   }
  }};
  for(let t=0;t<days*DAY;t++){
   stepWorld(w);
   if(capture || (!on&&scene!==null&&(scene as {tick:number}).tick+1===w.tick)){
    writeFileSync(`civic_evidence/work-tastes-${seed}-${on?'on':'off'}-save.json`,serializeWorld(w));capture=false;
   }
   if(on&&w.tick%120===0)for(const p of w.persons){
    if(!p.alive)continue;
    const ctx=generateOptions(w,p,false,true);
    const yes=rankOptions(ctx)[0];setWorkTastes(false);const no=rankOptions(ctx)[0];setWorkTastes(true);
    samples++;if(yes?.key!==no?.key || yes?.goal!==no?.goal){changedRankings++;rankedPeople.add(p.id);}
   }
  }
  const sum=(items:Record<string,number|undefined>)=>food.reduce((n,k)=>n+(items[k]??0),0);
  rows.push({seed,on,days,profile:'normal',population:28,starts,changedStarts,people:people.size,sampledOptionSets:samples,changedRankings,rankedPeople:rankedPeople.size,alive:w.persons.filter(p=>p.alive).length,foodInPacksAndBuildings:w.persons.filter(p=>p.alive).reduce((n,p)=>n+sum(p.inv),0)+w.buildings.reduce((n,b)=>n+sum(b.store.items),0),ripePlots:w.plots.filter(p=>p.state==='ripe').length,scene});
 }
}
setWorkTastes(true);
const result={claim:'mechanism only; separate trajectories are not a causal aggregate comparison',days,seeds,rows};
if(opt('json',''))writeFileSync(opt('json',''),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
