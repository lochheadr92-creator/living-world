import '../../src/styles.css';
import {Game} from '../../src/app/game';
import {deserializeWorld} from '../../src/app/save';
import {Renderer} from '../../src/render/renderer';
import {mountUI} from '../../src/ui';
import {setWorkTastes} from '../../src/sim/temperament';
// Development evidence only: ordinary seeded snapshots, not a staged world or product control.
const off=new URLSearchParams(location.search).get('arm')==='off';
setWorkTastes(!off);
const world=deserializeWorld(await (await fetch(`/civic_evidence/work-tastes-meadow-${off?'off':'on'}-save.json`)).text());
const g=new Game(world.settings);g.restoreWorld(world,world.settings);g.setPlaying(false);
const p=world.persons.find(p=>p.id===1000)!;g.select(p.id);g.flyTo(p.x,p.y);
const renderer=new Renderer(document.getElementById('world') as HTMLCanvasElement,g);
const ui=mountUI(g,document.getElementById('ui')!);
const badge=document.createElement('div');badge.textContent=`ORDINARY meadow / normal — work tastes ${off?'OFF (lab ablation)':'ON'} — Sven at tick ${world.tick}`;
badge.style.cssText='position:fixed;bottom:0;left:0;max-width:48vw;background:#34280d;color:#fff;padding:5px;font-size:11px';document.body.append(badge);
let last=performance.now();function frame(now:number){const dt=Math.min(.25,(now-last)/1000);last=now;g.advance(dt);renderer.frame(dt);ui.update(dt);requestAnimationFrame(frame)}requestAnimationFrame(frame);
