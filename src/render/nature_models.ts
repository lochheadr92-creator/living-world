import { hashUnit } from '../sim/rng';
import { EARTH, GRAIN, LEAF, SceneryModel, meshSprite } from './scenery_mesh';
import type { Finish } from './scenery_mesh';
import type { Sprite, SpriteCache } from './sprites';

type SourceProp = 'tree' | 'fruit_tree' | 'berry_bush' | 'rock' | 'stump' | 'clay_pit' | 'ore_vein' | 'outcrop';
const TAU = Math.PI * 2;
const ORIGIN = [0, 0, 0] as const;
const BARK: Finish = [0x876347,GRAIN];
const CUT: Finish = [0xd7ad73,GRAIN];
const LIMESTONE: Finish = [0xa6a399,EARTH];
const FLOWERS: Finish = [0xbcc980,LEAF];

function pine(m: SceneryModel, seed: number): void {
  m.beam(ORIGIN,[.04,-.02,78],.111,.025,BARK,8,CUT);
  for (let tier = 0; tier < 4; tier++) {
    const z = 22 + tier*17, r = .64-tier*.108;
    const tip = [.03*tier,-.015*tier,z+27] as const;
    const mat: Finish = [[0x5d7950,0x658554,0x71925a,0x83a362][tier],LEAF];
    const ring = Array.from({length: 12}, (_, i) => {
      const a = i*TAU/12+tier*.24;
      const radius = r * (i % 2 ? .68 : .9+hashUnit(i,tier,seed)*.19);
      return [Math.cos(a)*radius,Math.sin(a)*radius,z+(i%2 ? 5 : 0)] as const;
    });
    for (let i = 0; i < ring.length; i++) {
      const j = (i+1)%ring.length;
      m.face([ring[i],ring[j],tip],mat,[[i*.23,0],[(i+1)*.23,0],[i*.23+.11,.76]]);
      m.face([ring[j],ring[i],[0,0,z-2]], [0x536e4c, LEAF]);
    }
  }
}

function plants(kind: SourceProp, seed: number): SceneryModel {
  const m = new SceneryModel();
  if (kind === 'tree' && seed === 1) {
    pine(m, seed);
    return m;
  }
  const bush = kind === 'berry_bush', fruit = kind === 'fruit_tree', birch = kind === 'tree' && seed === 3;
  const h = bush ? 18 : fruit ? 48 : birch ? 73 : seed === 2 ? 66 : 75;
  const r = bush ? .34 : fruit ? .43 : birch ? .42 : .61;
  const bark: Finish = birch ? [0xd1c5a4,GRAIN] : BARK;
  const greens = bush ? [0x769b52,0x659349,0x96ac5c,0x566f47] :
    fruit ? [0x8cab55,0x729844,0x9abd64,0x618347] :
    birch ? [0xa5ad5c,0x99a65a,0xb6ba70,0x7f9350] :
    seed === 2 ? [0x828e4b,0x9ba35a,0xb4aa60,0x687e49] : [0x68894f,0x8da558,0xa2b263,0x617d4a];
  if (!bush) {
    m.beam(ORIGIN,[-.064,.044,h*.77],birch ? .082 : .125,.058,bark,9);
    for (let i = 0; i < 4; i++) {
      const a = i*TAU/4+seed*.37;
      m.beam([Math.cos(a)*.26,Math.sin(a)*.26,.5],[0,0,7],.019,.066,bark,5);
    }
    if (birch) for (let i = 0; i < 8; i++) {
      const z = 3 + i*5.7, x = -.064*z/(h*.77), y = .044*z/(h*.77);
      m.beam([x,y,z],[x-.002,y+.002,z+1.4],.084-z*.00036,.084-z*.00036,[0x5c554b,EARTH],9);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = i*TAU/8+seed*.71, wave = hashUnit(seed,i,81);
    const x = Math.cos(a)*r*(.56+wave*.24), y = Math.sin(a)*r*(.56+wave*.24);
    const z = h*(.56+hashUnit(seed,i,82)*.29);
    m.beam([0,0,bush ? 0 : h*.34],[x,y,z],bush ? .031 : .064,.014,bark,6);
    m.stone([x,y,z],r*(.47+wave*.21),r*(.48+wave*.19),h*(.15+wave*.095),[greens[i%4],LEAF],i+seed*49);
    m.stone([x*1.26,y*1.16,z+h*.075],r*.26,r*.25,h*.093,[greens[(i+1)%4],LEAF],i+3);
  }
  m.stone([-.03,-.03,h*.86],r*.63,r*.65,h*.24,[greens[1],LEAF],seed);
  if (bush) for (let i = 0; i < 3; i++) {
    m.stone([-.19+i*.15,.27,11+i%2*3],.04,.045,1.6,FLOWERS,seed+i);
  }
  return m;
}

function minerals(kind: SourceProp, seed: number, stage: number): SceneryModel {
  const m = new SceneryModel();
  if (kind === 'stump') {
    for (let i = 0; i < 5; i++) {
      const a = i*TAU/5+seed*.3;
      m.beam([Math.cos(a)*.23,Math.sin(a)*.23,.5],[0,0,5],.032,.087,BARK,6);
    }
    m.beam(ORIGIN,[.017,-.012,9+seed%3],.16,.129,BARK,10,CUT);
    return m;
  }
  if (kind === 'clay_pit') {
    m.stone([0,0,-2],.53,.50,4,[0xa77358,EARTH],seed);
    for (let i = 0; i < 7; i++) {
      const a = i*TAU/7;
      m.stone([Math.cos(a)*.33,Math.sin(a)*.33,1],.21,.17,2+stage,[0xad8262,EARTH],seed+i);
    }
    return m;
  }
  const full = stage+1;
  const stone: Finish = kind === 'ore_vein' ? [0x857d74,EARTH] : LIMESTONE;
  m.stone([-.053,-.061,3+full*2.9],.24+full*.078,.22+full*.067,3+full*4,stone,seed);
  m.stone([.25,.16,2+full],.19,.17,3+full*2,[0x929388,EARTH],seed+5);
  if (stage > 0) m.stone([-.28,.19,4],.19,.21,4,kind === 'outcrop' ? stone : [0x878c6a,LEAF],seed+19);
  if (kind === 'ore_vein') for (let i = 0; i < full*2; i++) {
    const p = hashUnit(seed, i, 63);
    m.stone([.14+p*.22,-.19+i*.095,6+full*2+p*6],.047,.071,2.5,[0xb27753,EARTH],i);
  }
  return m;
}

export function natureMesh(cache: SpriteCache, kind: SourceProp, variant: number, stage = 2): Sprite | undefined {
  const v = variant % (kind === 'fruit_tree' ? 2 : kind === 'berry_bush' ? 3 : 4);
  const plant = kind === 'tree' || kind === 'fruit_tree' || kind === 'berry_bush';
  const size = kind === 'tree' ? [108,132,54,111] as const :
    kind === 'fruit_tree' ? [86,100,43,80] as const :
    kind === 'berry_bush' ? [62,46,31,31] as const : [74,60,37,43] as const;
  return meshSprite(cache,`nature:${kind}:${v}:${stage}`,size,ORIGIN,[plant ? 24 : 21,9],
    () => plant ? plants(kind,v) : minerals(kind,v,stage));
}

export function campfireMesh(cache: SpriteCache, lit: boolean): Sprite | undefined {
  return meshSprite(cache,`campfire:${lit}`,[132,75,66,38],ORIGIN,[22,9],() => {
    const m = new SceneryModel();
    m.stone([0,0,-1],.32,.31,2,[0x66513c,EARTH],1);
    for (let i = 0; i < 9; i++) {
      const a = i*TAU/9;
      m.stone([Math.cos(a)*.295,Math.sin(a)*.295,2.3],.095,.095,3.3,LIMESTONE,i);
    }
    for (let i = 0; i < 3; i++) {
      const a = i*TAU/3+.5;
      const x = Math.cos(a)*.24, y = Math.sin(a)*.24;
      m.beam([x,y,2.8],[-x*.48,-y*.48,5],.042,.04,lit ? BARK : [0x413830,GRAIN],6);
    }
    for (let i = 0; i < 4; i++) {
      const a = i*TAU/4+.6;
      const x = Math.cos(a)*1.15, y = Math.sin(a)*1.15;
      const dx = -Math.sin(a)*.2, dy = Math.cos(a)*.2;
      m.beam([x-dx,y-dy,3],[x+dx,y+dy,3],.079,.074,BARK,8,CUT);
    }
    return m;
  });
}
