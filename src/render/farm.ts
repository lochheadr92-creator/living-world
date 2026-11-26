import type { Animal } from '../sim/types';
import { mk, line, poly } from './sprites';
import { SpriteCache } from './sprites';
import { box, boxTones } from './iso3d';

export function farmBuilding(cache:SpriteCache,kind:'barn'|'chicken_cage'|'paddock'){
  const width=kind==='chicken_cage'?1:3, depth=kind==='barn'?2:width;
  return cache.get('farm-'+kind,256,210,128,140,ctx=>{
    const p=mk(width,depth);
    if(kind==='barn'){
      box(ctx,p,.05,2.95,.05,1.95,0,32,boxTones('#96543a','#493c2e'));
      for(const [y,edge] of [[0,'#8e7252'],[2,'#ae8c61']] as const)
        poly(ctx,[p(0,y,32),p(3,y,32),p(3,1,58),p(0,1,58)],edge);
      poly(ctx,[p(.8,1.96),p(2.1,1.96),p(2.1,1.96,27),p(.8,1.96,27)],'#332c24');
      return;
    }
    const h=kind==='chicken_cage'?18:12, step=kind==='chicken_cage'?.2:.5;
    for(const x of [0,width])for(let y=0;y<=depth+.01;y+=step)line(ctx,p(x,y),p(x,y,h),'#705339',2);
    for(const y of [0,depth])for(let x=0;x<=width+.01;x+=step)line(ctx,p(x,y),p(x,y,h),'#705339',2);
    for(const z of [h/2,h]){
      for(const x of [0,width])line(ctx,p(x,0,z),p(x,depth,z),'#ac865b',2);
      for(const y of [0,depth])line(ctx,p(0,y,z),p(width,y,z),'#ac865b',2);
    }
    if(kind==='chicken_cage')poly(ctx,[p(0,0,h+4),p(1,0,h+4),p(1,1,h),p(0,1,h)],'#a46e46');
  });
}

export function drawFarmAnimal(ctx:CanvasRenderingContext2D,a:Animal,x:number,y:number,heading:number,selected:boolean){
  const bird=a.type==='chicken',pig=a.type==='pig',cow=a.type==='cow';
  const size=bird?.48:pig?.84:cow?1.25:.85;
  const facing=Math.cos(heading)-Math.sin(heading)>=0?1:-1;
  ctx.save();ctx.translate(x,y);ctx.scale(facing*size,size);
  const oval=(cx:number,cy:number,rx:number,ry:number,colour:string)=>{
    ctx.fillStyle=colour;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
  };
  const stroke=(ax:number,ay:number,bx:number,by:number,color:string,weight:number)=>{
    ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
  };
  oval(0,0,14,4,selected?'#d8bd68':'rgba(45,40,29,.22)');
  for(const lx of bird?[-3,4]:[-10,-6,6,10])stroke(lx,-9,lx,0,bird?'#b68438':'#4e4034',bird?2:3);
  const colour=bird?'#e3bd7c':cow?'#eee5cf':pig?'#d99684':'#ae9478';
  oval(0,-10,14,bird?8:7,colour);
  if(cow){oval(-5,-11,5,4,'#4b4943');oval(6,-13,3,3,'#4b4943');}
  oval(12,-14,bird?5:7,5,colour);oval(17,-12,pig?5:3,2,bird?'#dba943':pig?'#bb756c':'#655242');
  if(bird){oval(12,-20,4,2,'#b94d3b');stroke(-11,-10,-17,-20,'#846842',4);}
  if(a.type==='goat'){stroke(11,-18,7,-25,'#594d40',2);stroke(15,-17,12,-24,'#594d40',2);}
  oval(15,-15,1.1,1.1,'#231f1a');ctx.restore();
  return {headX:x+12*size*facing,headY:y-18*size};
}
