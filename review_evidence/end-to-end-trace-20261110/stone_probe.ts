// Read-only follow-up in ordinary aspen: (1) which store Mona's two stones for the storehouse came from (her log says only "Took 1 item from storage"),
// with pile stone changes from day 40 on, (2) what became of the 6 wood left on the second storehouse site when it was abandoned. Reads world state; nothing here is a stored explanation.
//   node node_modules/vite-node/dist/cli.mjs <this file> -- <out.json>
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [out='stone.json']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const w:any=createWorld(currentWorldSettings('normal','aspen',{immigration:true}));
const MONA=1084;const res:any={mona:[],stoneStores:[],pile:[],pileTakers:[],pileStone:[],deceased:[]};const prevPiles=new Map<number,number>();
let prevStone=0;let prevStores=new Map<number,number>();let pileId=0;let pileKey='';
const name=(id:number)=>{const e=w.byId.get(id);return e?.ent==='person'?e.name:e?.ent==='building'?`${e.type}#${id}(hh ${e.hhId})`:`#${id}`;};
while(w.tick<108000){
 stepWorld(w);const T=w.tick-1;
 if(T>=96000){
  const m=w.byId.get(MONA);const s=m?.inv?.stone??0;
  const stores=new Map<number,number>();for(const b of w.buildings)stores.set(b.id,b.store?.items?.stone??0);
  const moved=[...stores].filter(([id,n])=>(prevStores.get(id)??0)!==n).map(([id,n])=>({store:name(id),from:prevStores.get(id)??0,to:n,at:[w.byId.get(id).x,w.byId.get(id).y]}));
  if(moved.length)res.stoneStores.push({t:T,moved,nearby:w.persons.filter((p:any)=>p.alive&&p.activity&&moved.some(()=>true)&&w.buildings.some((b:any)=>b.id===p.activity.targetId&&(prevStores.get(b.id)??0)!==stores.get(b.id))).map((p:any)=>[p.name,p.activity.kind])});
  if(s!==prevStone){res.mona.push({t:T,from:prevStone,to:s,activity:m.activity?{kind:m.activity.kind,target:name(m.activity.targetId)}:null,pos:[Math.round(m.x),Math.round(m.y)],inv:JSON.parse(JSON.stringify(m.inv))});prevStone=s;}
  for(const pl of w.piles){const n=pl.items?.stone??0;const before=prevPiles.get(pl.id);if(before!==undefined&&before!==n)res.pileStone.push({t:T,pile:pl.id,at:[pl.x,pl.y],from:before,to:n,since:pl.since,estate:pl.estate?{person:pl.estate.personId,hh:pl.estate.hhId,deathTick:pl.estate.deathTick}:null,mealFood:!!pl.mealFood,gear:!!pl.gear,items:{...pl.items}});prevPiles.set(pl.id,n);}
  for(const [id,n] of prevPiles)if(!w.byId.get(id)&&n>0){res.pileStone.push({t:T,pile:id,gone:true,from:n});prevPiles.delete(id);}
  prevStores=stores;
 }
 if(T===61051||T===61052){for(const p of w.piles)if(Math.abs(p.x-39)<=3&&Math.abs(p.y-27)<=3&&(p.items.wood??0)>0&&!pileId){pileId=p.id;res.pile.push({t:T,id:p.id,x:p.x,y:p.y,items:{...p.items},since:p.since});}}
 if(pileId){const p=w.byId.get(pileId);const k=p?JSON.stringify(p.items):'gone';if(k!==pileKey){pileKey=k;res.pile.push({t:T,items:p?{...p.items}:null});res.pileTakers.push({t:T,who:w.persons.filter((q:any)=>q.alive&&q.activity&&q.activity.targetId===pileId).map((q:any)=>[q.name,q.activity.kind,q.activity.label??''])});}}
}
res.deceased=(w.deceased??[]).map((d:any)=>[d.id,d.name,d.tick,d.cause]);res.pileEnd=pileId?(w.byId.get(pileId)?{...w.byId.get(pileId).items}:null):null;
writeFileSync(out,JSON.stringify(res));console.log(`stone probe: mona changes ${res.mona.length}, store moves ${res.stoneStores.length}, pile records ${res.pile.length}`);
