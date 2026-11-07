// How long the real page's frames take on a big world at full speed (src/app/game.ts time-boxes the stepping): median and slowest
// frame, achieved against requested speed, ticks given up. Usage: node scripts/browser/frame_time_check.mjs [url] [profile] (start `npx vite` first)
import { launch } from './cdp.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5273/';
const profile = process.argv[3] ?? 'large';
const browser = await launch({ port: 9374 });
try {
  await browser.send('Page.navigate', { url });
  await browser.sleep(2500);
  await browser.evaluate(`(async()=>{const {currentWorldSettings}=await import('/src/sim/profiles.ts');const g=window.__game;g.restart(currentWorldSettings('${profile}','frame-time',{immigration:false}));g.setSpeed(16);g.setPlaying(true)})()`);
  await browser.sleep(3000); // settle
  const r = await browser.evaluate(`new Promise((resolve)=>{const g=window.__game;const t0=g.world.tick,d0=g.playbackStats().dropped;const dts=[];let last=performance.now();const start=last;
    const f=(now)=>{dts.push(now-last);last=now;if(now-start<5000)requestAnimationFrame(f);else{const s=[...dts].sort((a,b)=>a-b);const secs=(now-start)/1000;
      resolve({frames:dts.length,medianMs:Math.round(s[s.length>>1]),p95Ms:Math.round(s[Math.floor(s.length*0.95)]),maxMs:Math.round(s[s.length-1]),achieved:+(((g.world.tick-t0)/secs)/10).toFixed(1),requested:g.speed,dropped:Math.round(g.playbackStats().dropped-d0)})}};
    requestAnimationFrame(f)})`);
  console.log(JSON.stringify({ profile, ...r }));
} finally {
  await browser.close();
}
