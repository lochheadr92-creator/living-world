import { expect, it } from 'vitest';
import { Game } from '../src/app/game';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { Renderer } from '../src/render/renderer';
import { runTicks } from '../src/sim/world';
import { project } from '../src/render/iso';
import { fakeCanvas, installFakeDom } from './helpers/fakeDom';

it('speech layouts, panels, camera and persisted viewer modes cannot change saved state, RNG or continuation', () => {
  installFakeDom();
  const g = new Game({seed:'viewer-purity',immigration:false});
  const p = g.world.persons[0];
  p.speech = {text:'A long speech without limits '.repeat(100),kind:'warn',until:99999};
  g.select(p.id); g.setPlaying(false);
  const q=project(p.x,p.y); g.camera={x:q.sx,y:q.sy,zoom:1};
  const before=serializeWorld(g.world);
  const untouched=deserializeWorld(before);
  const renderer=new Renderer(fakeCanvas(900,600),g);
  for(const speech of ['automatic','selected','hidden'] as const) for(const zoom of [.3,.55,.9,1.4,1.8,3.2]) {
    g.setViewer({speech,textSize:'large',contrast:'high',reducedMotion:true});
    g.camera.zoom=zoom;
    g.viewOcclusions=[{x:600,y:0,w:300,h:600}];
    renderer.frame(1/60);
    expect(serializeWorld(g.world)).toBe(before);
    if(speech==='hidden') expect(renderer.lastOverlayLayout.some(r=>r.type==='speech')).toBe(false);
  }
  runTicks(g.world,200); runTicks(untouched,200);
  expect(serializeWorld(g.world)).toBe(serializeWorld(untouched));
  renderer.destroy();
});
