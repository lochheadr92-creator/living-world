import { nightAuditWorld } from './night_audit_world';
// Development-only staged manual regression. Not a natural-emergence claim.
import '../../src/styles.css';
import { Game } from '../../src/app/game';
import { InhabitDriver } from '../../src/app/inhabit';
import { Renderer } from '../../src/render/renderer';
import { mountUI } from '../../src/ui';
import { serializeWorld, deserializeWorld } from '../../src/app/save';
import { runReplay } from '../../src/agent/run';

const w=nightAuditWorld();
const initial=serializeWorld(w);
const g=new Game(w.settings);g.restoreWorld(w,w.settings);
const d=new InhabitDriver(g,{person:'Ada',api:'openai',model:'manual',effort:'',memory:false,showScores:false,fromDay:0,days:null,seed:w.settings.seed,harsh:false,rich:true,size:'normal',arrivals:false,manual:true});
const r=new Renderer(document.getElementById('world') as HTMLCanvasElement,g);
const ui=mountUI(g,document.getElementById('ui')!,{inhabit:d});
const badge=document.createElement('div');badge.textContent='STAGED CONTRACT FIXTURE — night shelter interrupted by a real conversation';badge.style.cssText='position:fixed;top:0;left:0;z-index:9999;background:#34280d;color:#fff;padding:5px';document.body.append(badge);
Object.assign(window,{__game:g,__driver:d,__initial:initial,__replay:()=>runReplay(deserializeWorld(initial),d.transcriptNow()!)});
void d.start();g.setSpeed(16);
let last=performance.now();function frame(now:number){const dt=(now-last)/1000;last=now;g.advance(dt);r.frame(Math.min(dt,.25));ui.update(Math.min(dt,.25));requestAnimationFrame(frame);}requestAnimationFrame(frame);
