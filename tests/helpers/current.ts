// Explicit product-rule fixtures. Legacy util/kit helpers remain compatibility fixtures.
import {currentWorldSettings, type ProfileName} from '../../src/sim/profiles';
import {createWorld} from '../../src/sim/factory';
import {testKit} from '../../src/sim/scenes';
import {RNG,hashString} from '../../src/sim/rng';
import type {Stage} from './kit';
export const currentSettings=(seed:string,profile:ProfileName='normal')=>currentWorldSettings(profile,seed);
export const currentNatural=(seed:string,profile:ProfileName='normal')=>createWorld(currentSettings(seed,profile));
export function currentStage(seed:string):Stage{return {w:testKit.flatWorld(currentSettings(seed)),rng:new RNG(hashString(seed))};}
