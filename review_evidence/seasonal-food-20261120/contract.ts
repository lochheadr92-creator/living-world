import assert from 'node:assert/strict';
import { DAY, SOURCE_REGROW } from './src/sim/constants';
import { productiveRate } from './src/sim/ecology';
import { createWorld } from './src/sim/factory';
import { growthRate, regrowRate } from './src/sim/hardship';
import { nearbyWaterFraction } from './src/sim/hydrology';
import { currentWorldSettings } from './src/sim/profiles';
import { wildPlenty } from './src/sim/plenty';
import { updateSources } from './src/sim/sources';

for (const profile of ['normal','town'] as const) {
  for (const moderate of [false,true]) {
    globalThis.moderateWild=moderate;
    const w=createWorld({...currentWorldSettings(profile,'aspen',{immigration:true}),rulesVersion:266});
    const fish=w.sources.filter(s=>s.type==='fish_spot');
    const s=fish.find(s=>nearbyWaterFraction(w,s.x,s.y)!>0)!;
    assert(s);
    w.tick=10*DAY;
    w.hardship={kind:'lean',since:w.tick,until:w.tick+DAY};
    const expected=moderate?0.24:0.04;
    assert(Math.abs(regrowRate(w,moderate)-expected)<1e-10);
    const tile=Math.floor(s.y)*w.W+Math.floor(s.x);
    (w.ecology??={})[tile]={condition:0.15,lastUse:w.tick};
    assert(Math.abs(productiveRate(w,s.x,s.y)*regrowRate(w,moderate)-(moderate?0.087:0.0145))<1e-10);
    assert(Math.abs(growthRate(w)-0.075)<1e-10);
    s.amount=0; s.regrowTimer=0;
    const rain=1+w.weather.rain*0.8;
    updateSources(w);
    assert(Math.abs(s.regrowTimer-expected*0.3625*rain*wildPlenty(w,s.type))<1e-8);
    const wetTimer=s.regrowTimer;
    // Keep the measured habitat, weather and date fixed while this one depleted spot refills.
    w.sources=[s];
    s.regrowTimer=0;
    let ticksToOneFish=0;
    while(s.amount===0 && ticksToOneFish<10000){updateSources(w);ticksToOneFish++;}
    assert.equal(s.amount,1);
    assert.equal(ticksToOneFish,Math.ceil(s.regrowEvery/wetTimer));
    for(const body of w.waterBodies!)body.amount=0;
    assert.equal(nearbyWaterFraction(w,s.x,s.y),0);
    s.amount=2;s.regrowTimer=s.regrowEvery;
    updateSources(w);updateSources(w);
    assert.equal(s.amount,0);assert.equal(s.regrowTimer,s.regrowEvery);
    w.hardship=null;w.tick=DAY;
    assert.equal(regrowRate(w,moderate),1);
    console.log(JSON.stringify({profile,moderate,spots:fish.length,interval:s.regrowEvery,
      standardInterval:SOURCE_REGROW.fish_spot,ticksToOneFish,wetTimer,dryOutput:s.amount}));
  }
}
