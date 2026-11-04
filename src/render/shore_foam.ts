// Adapted from retired eager-carson: deterministic water-side lobes, batched by phase.
import {hashUnit} from '../sim/rng';
export function addShoreFoam(groups:(Path2D|undefined)[][],x:number,y:number,sx:number,sy:number,ex:number,ey:number,fx:number,fy:number):void{
 const dx=fx-ex,dy=fy-ey,len=Math.hypot(dx,dy),tx=dx/len,ty=dy/len,mx=(ex+fx)/2,my=(ey+fy)/2-16,ml=Math.hypot(mx,my),nx=mx/ml,ny=my/ml,g=Math.floor(hashUnit(x,y,16)*4);
 for(let layer=0;layer<2;layer++){const path=groups[layer][g]??=new Path2D();for(let j=0;j<3;j++){if(hashUnit(x+ex,y+ey,240+layer*3+j)<.2)continue;const u=(j+.5)/3+(hashUnit(x+ex,y+ey,250+j)-.5)*.2,a=3.6+hashUnit(x,y,260+j)*3.4,d=(layer?4.5:1.4)+hashUnit(x,y,270+j)*(layer?3:2.2),bx=sx+ex+dx*u,by=sy+ey+dy*u;for(let i=0;i<=6;i++){const th=Math.PI*i/6,lx=bx+tx*Math.cos(th)*a-nx*Math.sin(th)*d,ly=by+ty*Math.cos(th)*a-ny*Math.sin(th)*d;if(i===0)path.moveTo(lx,ly);else path.lineTo(lx,ly);}path.closePath();}}
}
export function paintShoreFoam(ctx:CanvasRenderingContext2D,groups:(Path2D|undefined)[][],t:number):void{for(let g=0;g<4;g++){const ph=t*1.3+g*1.6;for(let layer=0;layer<2;layer++){const path=groups[layer][g];if(!path)continue;const alpha=layer?.3*(.5+.5*Math.sin(ph+Math.PI)):.42+.24*Math.sin(ph);ctx.fillStyle=`rgba(255,255,255,${alpha})`;ctx.fill(path);}}}
