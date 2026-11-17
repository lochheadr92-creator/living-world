import '../../src/styles.css';
import {Game} from '../../src/app/game';
import {Renderer} from '../../src/render/renderer';
import {mountUI} from '../../src/ui';
import {startFrameLoop} from '../../src/app/frameloop';
import {deserializeWorld} from '../../src/app/save';
import {currentWorldSettings} from '../../src/sim/profiles';
import {project} from '../../src/render/iso';
const game=new Game(currentWorldSettings('town','meadow',{immigration:true}));
game.playing=false;
const renderer=new Renderer(document.querySelector('#world') as HTMLCanvasElement,game);
const ui=mountUI(game,document.querySelector('#ui') as HTMLElement);
startFrameLoop(game,{frame:dt=>renderer.frame(dt),update:dt=>ui.update(dt)},requestAnimationFrame,performance.now());
async function load(){
 const p=(document.querySelector('#profile') as HTMLSelectElement).value,d=(document.querySelector('#day') as HTMLSelectElement).value;
 const status=document.querySelector('#status')!;
 try{
  const response=await fetch(`./${p}/day-${d}.json`);if(!response.ok)throw Error('Checkpoint not yet ready');
  const world=deserializeWorld(await response.text());
  game.playing=false;game.restoreWorld(world,world.settings);
  const c=project(world.camp.x,world.camp.y);game.camera={x:c.sx,y:c.sy+20,zoom:0.22};
  status.textContent=`${p}, day ${d}; paused`;
 }catch(e){status.textContent=String(e);}
}
document.querySelector('#load')!.addEventListener('click',load);
void load();
import './view.css';

