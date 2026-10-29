// Labelled, paused viewer fixture. Same seed, positions and speech at every zoom/revision.
// node scripts/browser/speech_zoom_check.mjs http://127.0.0.1:5286 viewer_evidence/before before
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { launch } from './cdp.mjs';

const [url = 'http://127.0.0.1:5286/', out = 'viewer_evidence/after', phase = 'after'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await launch({ port: 9347, width: 1440, height: 900 });
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };
const ev = b.evaluate;
try {
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('living-world:prefs:v1', JSON.stringify({seed:'viewer-bubbles',immigration:false,feedOpen:false,inspectorOpen:true,overlays:{labels:true,intentions:true}})); localStorage.setItem('living-world:ui:v1', JSON.stringify({hinted:true}));` });
  await b.send('Page.navigate', { url });
  for (let i = 0; i < 80 && !await ev('!!window.__game'); i++) await b.sleep(100);
  const fixture = await ev(`(async () => {
    const g = window.__game; g.setPlaying(false); g.restart({seed:'viewer-bubbles',immigration:false,rulesVersion:53}); g.setPlaying(false);
    const {project} = await import('/src/render/iso.ts');
    const {serializeWorld} = await import('/src/app/save.ts');
    const c = g.world.camp;
    const texts = ['I will bring the grain to our home, then come back for the rest.', 'Wolf near the water! Stay together.', 'Can you spare some food for the children?', 'The roof needs more wood before winter.', 'I remember a place where we could find stone.', 'abcdefghijklmnopqrstuvwxyz'.repeat(18), 'The workshop is busy. I will come back after I have eaten.'];
    g.world.persons.forEach((p, i) => { p.speech = null; if (i >= texts.length) return; p.x = p.px = c.x + (i % 4) * 1.5 - 2; p.y = p.py = c.y + Math.floor(i / 4) * 1.6 - 1; p.inside = undefined; p.speech = {text:texts[i],kind:i===1?'warn':i===2?'ask':'say',until:99999}; });
    g.world.sceneLabel = 'TEST SCENE: paused speech layout, staged words and positions';
    g.select(g.world.persons[0].id); g.fly = null;
    const center = project(c.x,c.y); g.camera = {x:center.sx,y:center.sy-35,zoom:1};
    window.__speechCenter = center;
    window.__speechFixture = serializeWorld(g.world);
    return {save:window.__speechFixture,selected:g.selectedId,warning:g.world.persons[1].id,text:texts[0],rules:g.world.settings.rulesVersion};
  })()`);
  writeFileSync(`${out}/fixture.json`, fixture.save);
  const snapshots = [];
  for (const [name, zoom] of [['wide',0.3],['medium',0.9],['close',1.8],['near',3.2]]) {
    await ev(`(() => {const g=window.__game,c=window.__speechCenter;g.fly=null;g.camera={x:c.sx+150/${zoom},y:c.sy-35,zoom:${zoom}};window.__ui.update(1);window.__renderer.frame(0);})()`);
    await b.sleep(180);
    const s = await ev(`({zoom:window.__game.camera.zoom, overlays:window.__renderer.lastOverlayLayout??null, speech:document.querySelector('.speech-t')?.textContent, tick:window.__game.world.tick, warningHead:window.__renderer.heads.get(${fixture.warning}), camera:window.__game.camera})`);
    snapshots.push({name,...s});
    check(`${name}: full selected speech in panel`, s.speech === fixture.text, s.speech);
    if (phase !== 'before') {
      const selected = s.overlays.find(r => r.type === 'speech' && r.id === fixture.selected);
      check(`${name}: selected speech has the intended detail`, !!selected && selected.detail === (name === 'wide' ? 'marker' : name === 'medium' ? 'preview' : 'full'), selected);
      if(name==='wide') check('wide: warning remains distinguishable',s.overlays.some(r=>r.type==='speech'&&r.id===fixture.warning));
      const overlaps = s.overlays.flatMap((r,i) => s.overlays.slice(i+1).filter(q=>r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y).map(q=>[r.id,q.id]));
      check(`${name}: names, intentions and speech do not overlap`, overlaps.length===0,overlaps);
    }
    await b.shot(`${out}/${name}.png`);
  }
  if (phase !== 'before') {
    const before = readFileSync('viewer_evidence/before/fixture.json','utf8');
    check('before and after use exactly the same paused simulation state',before===fixture.save);
    const get = name => snapshots.find(s=>s.name===name).overlays.find(r=>r.type==='speech'&&r.id===fixture.selected);
    check('wide marker area is less than one tenth of close speech area',get('wide').w*get('wide').h < get('close').w*get('close').h / 10);
    check('close and very close text enlarge with an upper bound',get('near').fontSize>get('close').fontSize&&get('close').fontSize>get('medium').fontSize&&get('near').fontSize<=14.5);
    await ev(`window.__game.camera.zoom=1;window.__game.fly=null;document.activeElement?.blur()`);
    await b.key('+','Equal',187);
    check('keyboard zoom changes the view',await ev('window.__game.camera.zoom>1'));
    const preWheel=await ev('window.__game.camera.zoom');
    await b.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:450,y:350,deltaY:-120,deltaX:0}); await b.sleep(100);
    check('wheel zoom changes the view',await ev('window.__game.camera.zoom')>preWheel);
    await b.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
    const preTouch=await ev('window.__game.camera.zoom');
    await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:420,y:400,id:1},{x:520,y:400,id:2}]});
    await b.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:390,y:400,id:1},{x:550,y:400,id:2}]});
    await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await b.sleep(100);
    check('two-pointer pinch changes the view',await ev('window.__game.camera.zoom')>preTouch);
    await b.send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await ev(`window.__game.setFollow(true)`); await b.sleep(500);
    check('following retains selected speech priority',await ev(`window.__renderer.lastOverlayLayout.some(r=>r.type==='speech'&&r.id===window.__game.selectedId)`));
    await ev(`window.__game.setFollow(false);document.querySelector('.viewer-controls').open=true;document.querySelector('#viewer-speech').focus()`);
    await b.key('End','End',35); await b.key('Enter','Enter',13); await b.sleep(250);
    check('keyboard can choose Hidden, including warnings',await ev(`window.__game.viewer.speech==='hidden'&&!window.__renderer.lastOverlayLayout.some(r=>r.type==='speech')`));
    await ev(`const input=document.querySelector('#viewer-speech');input.value='selected';input.dispatchEvent(new Event('change',{bubbles:true}));`); await b.sleep(200);
    check('selected-only hides other speech including warnings',await ev(`window.__renderer.lastOverlayLayout.filter(r=>r.type==='speech').every(r=>r.id===window.__game.selectedId)`));
    await ev(`window.__game.setViewer({speech:'automatic',textSize:'large',contrast:'high',reducedMotion:true})`); await b.sleep(350);
    await b.shot(`${out}/preferences.png`);
    await ev(`document.querySelector('.viewer-controls').open=false`);
    for (const [name,width,height,dpr] of [['desktop-scaled',1024,768,1.25],['phone',390,844,2],['short',900,500,1]]) {
      await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});
      await ev(`window.__game.camera.zoom=1.8;window.__game.setFollow(true);window.__ui.update(1);`); await b.sleep(500);
      const geometry=await ev(`({rects:window.__renderer.lastOverlayLayout,panels:window.__game.viewOcclusions,w:innerWidth,h:innerHeight,speech:document.querySelector('.speech-t').textContent})`);
      const hit=(r,q)=>r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y;
      check(`${name}: overlays stay within canvas and outside panels`,geometry.rects.every(r=>r.x>=0&&r.y>=0&&r.x+r.w<=width&&r.y+r.h<=height&&!geometry.panels.some(q=>hit(r,q))),geometry);
      check(`${name}: full speech remains in inspector`,geometry.speech===fixture.text);
      await b.shot(`${out}/${name}.png`);
    }
    await b.sleep(400);
    check('viewer preferences persist separately from simulation settings',await ev(`JSON.parse(localStorage.getItem('living-world:prefs:v1')).viewer.speech==='automatic'&&!('viewer' in window.__game.world.settings)`));
  }
  check('viewing preserves full serialized world and RNG', await ev(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__speechFixture;})()`));
  if(phase!=='before') {
    await b.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await ev(`(async()=>{
      const g=window.__game;g.setViewer({textSize:'normal',contrast:'standard'});g.setFollow(false);
      g.world.events=[{id:900001,tick:0,kind:'work',text:'Ada finished sawn planks at the timber yard.',ids:[g.world.persons[0].id],x:40,y:40},{id:900002,tick:0,kind:'work',text:'Ben finished sawn planks at the timber yard.',ids:[g.world.persons[1].id],x:40,y:40},{id:900003,tick:0,kind:'danger',text:'A wolf is near the water.',ids:[g.world.persons[2].id],x:40,y:40}];
      const {serializeWorld}=await import('/src/app/save.ts');window.__feedFixture=serializeWorld(g.world);
      window.__ui.update(1);const toggle=document.querySelector('.feed-toggle');if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();
    })()`); await b.sleep(200);
    await ev(`document.querySelector('.feed-members:not([hidden]) summary').focus()`);
    await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13}); await b.sleep(100);
    check('grouped feed exposes each original event with keyboard',await ev(`document.querySelector('.feed-members:not([hidden])').open&&document.querySelector('.feed-members:not([hidden])').innerText.includes('Ada finished')&&document.querySelector('.feed-members:not([hidden])').innerText.includes('Ben finished')`));
    const selectedBefore=await ev('window.__game.selectedId');
    await ev('document.activeElement.blur()'); await b.key('n','KeyN',78); await b.sleep(200);
    check('keyboard reaches another person and their inspector',await ev('window.__game.selectedId')!==selectedBefore);
    check('feed and keyboard inspection preserve the staged world',await ev(`(async()=>{const {serializeWorld}=await import('/src/app/save.ts');return serializeWorld(window.__game.world)===window.__feedFixture;})()`));
    await b.shot(`${out}/feed-events.png`);
  }
  const errors = b.events.filter(e => e.method === 'Runtime.exceptionThrown');
  check('no browser exceptions', errors.length === 0, errors);
  const paths=['src/app/viewer.ts','src/app/prefs.ts','src/app/game.ts','src/main.ts','src/render/speech_layout.ts','src/render/renderer.ts','src/render/overlays.ts','src/styles.css','src/ui/index.ts','src/ui/viewer.ts','src/ui/feed.ts','src/ui/feed_rows.ts','src/ui/shortcuts.ts','scripts/browser/speech_zoom_check.mjs'];
  const sourceHashes=Object.fromEntries(paths.flatMap(path=>{try{return [[path,createHash('sha256').update(readFileSync(path)).digest('hex')]];}catch{return [];}}));
  writeFileSync(`${out}/report.json`, JSON.stringify({phase,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,rules:fixture.rules,checks,snapshots},null,2));
} finally { await b.close(); }
if (checks.some(c => !c.ok)) process.exitCode = 1;
