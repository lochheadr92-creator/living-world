import { BUILD_DEF } from '../sim/constants';
import { hashUnit } from '../sim/rng';
import type { Anchor, BuildKind, StructMeta } from './structures';
import { EARTH, GRAIN, MASONRY, SceneryModel, THATCH, TILE, meshSprite } from './scenery_mesh';
import type { Finish } from './scenery_mesh';
import type { Sprite, SpriteCache } from './sprites';

const OAK: Finish = [0x8b5736, GRAIN];
const END: Finish = [0xc38f57, GRAIN];
const TRIM: Finish = [0x614231, GRAIN];
const STONE: Finish = [0xa39e91, MASONRY];
const BRICK: Finish = [0xb57255, MASONRY];
const SHADE: Finish = [0x34353b, EARTH];
const WINDOW: Finish = [0x587f80, EARTH];

function chimney(m: SceneryModel, { x, y, z }: Anchor, finish: Finish): void {
  m.box(x - .12, y - .12, z - 33, .24, .24, 31, finish);
  m.box(x - .15, y - .15, z - 4, .3, .3, 3, finish);
  m.box(x - .069, y - .069, z - 1, .138, .138, .4, SHADE);
}

function roof(m: SceneryModel, w: number, d: number, eave: number, peak: number, mat: Finish, v: number): void {
  const end = d + .09, ridge = d / 2;
  const zAt = (y: number) => peak - (peak - eave) * Math.abs(y - ridge) / (end - ridge);
  const left = -.04, right = w + .04;
  for (const sign of [-1, 1]) {
    const rows = Math.max(4, Math.round((peak - eave) / 4));
    for (let i = 0; i < rows; i++) {
      const y0 = ridge + sign * (end - ridge) * i / rows;
      const y1 = ridge + sign * (end - ridge) * (i + 1) / rows;
      const lo = Math.min(y0, y1), hi = Math.max(y0, y1);
      const lip = i === 0 ? 0 : 1.3;
      const tiles = Math.round(w * 6);
      for (let j = 0; j < tiles; j++) {
        const joint = (j: number) => j === 0 ? left : j === tiles ? right :
          left + (right - left) * (j + (i % 2 ? .41 : 0)) / tiles;
        const x0 = joint(j), x1 = joint(j + 1);
        const bevel = .24 + hashUnit(v + i, j, 30) * .45;
        const a = zAt(lo) + lip, b = zAt(hi) + lip;
        m.face([[x0, lo, a], [x1, lo, a], [x1, hi, b], [x0, hi, b]], mat,
          [[x0 * 1.2, 0], [x1 * 1.2, 0], [x1 * 1.2, .23], [x0 * 1.2, .23]]);
        const y = sign > 0 ? hi : lo, z = zAt(y) + lip;
        const edge = sign > 0 ? x1 : x0, far = sign > 0 ? x0 : x1;
        m.face([[edge, y, z - 1.5 - bevel], [far, y, z - 1.5 - bevel], [far, y, z], [edge, y, z]], mat);
        m.face([[x1, lo, a - bevel], [x1, hi, b - bevel], [x1, hi, b], [x1, lo, a]], mat);
      }
    }
    const yEnd = ridge + sign * (end - ridge);
    for (const x of [left, right]) m.beam([x, ridge, peak - .6], [x, yEnd, eave - .65], .038, .045, TRIM, 5);
  }
  m.beam([left - .035, ridge, peak + .3], [right + .035, ridge, peak + .3], .053, .053, mat);
}

function leanTo(v: number): SceneryModel {
  const m = new SceneryModel();
  const cover: Finish = [[0xab8552, 0x909655, 0xbb9359, 0xa19a65][v], THATCH];
  m.box(.18, .3, .5, .64, .58, 1.6, [0xc5b37a, THATCH]);
  for (const x of [.09, .91]) {
    m.beam([x, .10, 0], [x, .12, 40], .043, .025, OAK);
    m.beam([x, .91, 0], [x, .90, 16], .054, .033, OAK);
    m.beam([x, .06, 40], [x, 1.0, 14], .033, .025, END);
  }
  m.face([[.9,.1,3],[.9,.9,3],[.9,.9,16],[.9,.1,39]], cover);
  for (let i = 0; i < 7; i++) {
    const y0 = .03 + i * .137, y1 = y0 + .14;
    const z0 = 43 - y0 * 29, z1 = 43 - y1 * 29;
    m.face([[.015,y0,z0],[.985,y0,z0],[.985,y1,z1],[.015,y1,z1]], cover);
    m.face([[.985,y1,z1-1.7],[.015,y1,z1-1.7],[.015,y1,z1],[.985,y1,z1]], cover);
  }
  m.beam([.035,.96,15],[.965,.96,15],.036,.036,END);
  for (const x of [.09, .91]) for (const y of [.12,.9]) {
    const z = y < .2 ? 39 : 15;
    m.beam([x,y,z-3],[x,y,z],.058,.054,[0xc4a577,THATCH]);
  }
  return m;
}

function enclosed(kind: BuildKind, w: number, d: number, meta: StructMeta, v: number): SceneryModel {
  const m = new SceneryModel();
  const barn = kind === 'barn', store = kind === 'storehouse', hut = kind === 'hut';
  const open = kind === 'smithy' || kind === 'bakery';
  const wall: Finish = kind === 'house' || kind === 'hall' ? [[0xe6c99c,0xddd3b1,0xd5c3a4,0xe1bc94][v], EARTH] :
    [barn ? 0xb77553 : store ? 0xb99a64 : 0xc5a474, GRAIN];
  const roofColors = hut ? [0xd7b362,0xbba268,0xceac5b,0xc3a561] :
    kind === 'house' ? [0xa96853,0x7c887d,0xa57d50,0x9d705c] :
    store ? [0x777f63,0x797b65,0x748478,0x887b65] : [0x93745c,0x9e8065,0x807e67,0x9c7457];
  const deck = Math.max(2, meta.plinth), top = meta.wall;
  const peak = meta.chimney ? Math.min(meta.top - 8, meta.chimney.z - 5) : meta.top - 2;
  const x0 = .16, x1 = w - .16, y0 = .16, y1 = d - .16;
  const door = barn || store || kind === 'hall' ? w * .48 : w * .285;
  const half = barn ? .46 : open || kind === 'hall' ? .39 : hut ? .22 : .27;
  const doorTop = Math.min(top - 3, deck + (barn ? 29 : open ? 25 : 20));
  m.box(x0-.045,y0-.045,0,x1-x0+.09,y1-y0+.09,deck,STONE);
  m.box(x0,y0,deck,x1-x0,.12,top-deck,wall);
  for (const x of [x0,x1-.12]) m.box(x,y0+.12,deck,.12,y1-y0-.12,top-deck,wall);
  m.box(x0,y1-.13,deck,door-half-x0,.13,top-deck,wall);
  m.box(door+half,y1-.13,deck,x1-door-half,.13,top-deck,wall);
  m.box(door-half,y1-.13,doorTop,half*2,.13,top-doorTop,wall);
  m.box(door-half,y1-.31,deck,half*2,.035,doorTop-deck,SHADE);
  for (const x of [x0, x1]) for (const y of [y0,y1]) m.box(x-.045,y-.045,deck,.09,.09,top-deck+1,TRIM);
  for (const y of [y0,y1]) m.box(x0,y-.06,top-3,x1-x0,.12,3.5,TRIM);
  m.box(x1-.055,y0,top-3,.11,y1-y0,3.5,TRIM);
  for (const x of [door-half,door+half]) m.box(x-.035,y1-.035,deck,.07,.10,doorTop-deck,TRIM);
  m.box(door-half-.038,y1-.038,doorTop-.4,half*2+.076,.105,2.7,TRIM);
  if (!open) {
    const inset = barn || store ? .03 : .075;
    for (let j = 0; j < 7; j++) {
      const board = half * 2 / 7;
      m.box(door-half+j*board+.013,y1-inset,deck+.3,board-.018,.024,doorTop-deck-.8,barn ? OAK : TRIM);
    }
    m.box(door-half+.035,y1-inset+.024,deck+4,half*2-.07,.035,2.1,END);
    m.box(door-half+.035,y1-inset+.024,doorTop-5,half*2-.07,.035,2.1,END);
    m.beam([door-half+.04,y1-inset+.05,deck+5],[door+half-.04,y1-inset+.05,doorTop-4],.034,.034,OAK,5);
    m.box(door+half-.105,y1-inset+.054,deck+9,.055,.035,1.7,[0xdbab64,EARTH]);
  }
  m.box(door-half-.05,y1-.01,0,half*2+.1,.23,deck*.57,STONE);
  const windowXs = kind === 'hall' ? [w*.21,w*.79] : [w*.76];
  for (const x of windowXs) {
    const z = deck + (top-deck)*.37;
    m.box(x-.22,y1-.012,z,.44,.048,11,TRIM);
    m.box(x-.18,y1+.039,z+1,.36,.015,9,WINDOW);
    m.box(x-.018,y1+.056,z+1,.036,.016,9,END);
    m.box(x-.18,y1+.056,z+5,.36,.016,1.2,END);
    m.box(x-.25,y1-.01,z-.8,.5,.11,1.5,END);
  }
  const gable = (x: number) => m.face([[x,y0,top],[x,y1,top],[x,d/2,peak-.75]], wall);
  gable(x0);
  gable(x1);
  m.box(x1-.02,d/2-.13,top+4,.048,.26,Math.min(9,peak-top-5),TRIM);
  for (const side of [y0,y1]) m.beam([x1+.02,side,top],[x1+.02,d/2,peak-1],.035,.035,TRIM,5);
  roof(m,w,d,top-2,peak,[roofColors[v],hut ? THATCH : TILE],v);
  if (kind === 'hall' && meta.chimney) {
    const {x,y,z} = meta.chimney;
    for (const a of [-.16,.16]) for (const b of [-.16,.16]) m.box(x+a-.029,y+b-.029,z-9,.058,.058,11,TRIM);
    m.box(x-.21,y-.21,z+2,.42,.42,2,OAK);
    m.beam([x,y,z+4],[x,y,z+8],.26,.03,[0xa88864,TILE],4);
  } else if (meta.chimney) chimney(m,meta.chimney,kind === 'house' || kind === 'bakery' ? BRICK : STONE);
  if (meta.mouth) {
    const {x,y,z} = meta.mouth;
    m.box(x-.23,y-.2,0,.46,.32,z+9,BRICK);
    m.box(x-.13,y+.123,z-4,.26,.012,8,SHADE);
  }
  return m;
}

function facilities(kind: BuildKind, w: number, d: number, meta: StructMeta, v: number): SceneryModel {
  const m = new SceneryModel();
  if (kind === 'well') {
    for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
      const a = (i + row * .5) * Math.PI / 6;
      const b = a + .49;
      const p = (r: number, angle: number, z: number) => [1+Math.cos(angle)*r,1+Math.sin(angle)*r,z] as const;
      const z = row * 5, r = row === 2 ? .57 : .54;
      m.face([p(r,a,z),p(r,b,z),p(r,b,z+4.8),p(r,a,z+4.8)], STONE);
      m.face([p(.37,a,z+4.8),p(r,a,z+4.8),p(r,b,z+4.8),p(.37,b,z+4.8)], STONE);
      m.face([p(.37,b,z),p(.37,a,z),p(.37,a,z+4.8),p(.37,b,z+4.8)], STONE);
    }
    m.box(.65,.65,1,.7,.7,1,SHADE);
    m.box(.46,.61,8,.085,.085,28,OAK);
    m.box(1.43,1.32,8,.085,.085,28,OAK);
    m.beam([.5,.65,35],[1.48,1.36,35],.054,.054,END);
    m.beam([1.03,1.01,34],[1.03,1.01,19],.014,.014,[0xd1b98d,THATCH]);
    return m;
  }
  if (kind === 'paddock' || kind === 'chicken_cage' || kind === 'food_rack') {
    const pen = kind !== 'food_rack';
    const a = .12, b = w-.12, c = d-.12, high = pen ? 11 : 27;
    for (const [x,y] of [[a,a],[b,a],[a,c],[b,c]]) m.box(x-.045,y-.045,0,.09,.09,high+2,OAK);
    for (const z of pen ? [4,8] : [high-1]) {
      for (const y of [a, c]) m.beam([a,y,z],[b,y,z],.034,.034,END,5);
      for (const x of [a, b]) m.beam([x,a,z],[x,c,z],.034,.034,END,5);
    }
    if (kind === 'paddock') {
      for (const p of [.33,.67]) for (const [x,y] of [[w*p,a],[w*p,c],[a,d*p],[b,d*p]]) {
        m.box(x-.038,y-.038,0,.076,.076,12.5,TRIM);
      }
      m.box(.48,.35,0,.88,.3,4,OAK);
      m.box(.53,.39,4,.78,.22,.2,[0x7b7053,EARTH]);
    } else if (kind === 'chicken_cage') {
      m.box(.15,.13,0,.67,.32,11,OAK);
      m.face([[.06,.04,20],[.93,.04,20],[.93,.56,11],[.06,.56,11]],[0xb28c58,THATCH]);
      for (let i = 1; i < 8; i++) m.beam([i/9,c,0],[i/9,c,10],.011,.011,END,4);
    } else {
      m.box(.29,1.36,0,1.28,.39,5,STONE);
      m.box(.25,1.31,21,1.37,.5,3,[0xad8158,THATCH]);
    }
    return m;
  }
  if (kind === 'quarry' || kind === 'mine') {
    m.stone([.74,.68,15],.73,.63,25,STONE,v);
    m.stone([1.27,.6,24],.67,.51,25,[0x89867e,MASONRY],v+9);
    m.stone([1.58,1.13,9],.37,.43,15,STONE,v+17);
    m.box(.63,1.23,0,.74,.05,22,SHADE);
    for (const x of [.55,1.38]) m.beam([x,1.32,0],[x,1.32,26],.07,.055,OAK,6,END);
    m.beam([.48,1.32,25],[1.45,1.32,25],.075,.071,OAK,6,END);
    if (kind === 'mine') for (const x of [.83,1.15]) m.box(x,1.25,.1,.04,.69,1.2,TRIM);
    return m;
  }
  if (kind === 'kiln') {
    m.box(.19,.26,0,1.56,1.34,4,STONE);
    m.beam([.92,.83,4],[.92,.83,40],.65,.53,BRICK,12);
    m.beam([.92,.83,39],[.92,.83,56],.53,.24,BRICK,12);
    if (meta.chimney) chimney(m,meta.chimney, BRICK);
    if (meta.mouth) {
      const {x,y,z} = meta.mouth;
      m.box(x-.28,y-.2,0,.56,.27,z+7,STONE);
      m.box(x-.16,y+.072,z-5,.32,.012,10,SHADE);
    }
    return m;
  }
  if (kind === 'brewery') {
    m.box(.13,.16,0,1.72,1.55,2,STONE);
    for (const x of [.5, 1.42]) {
      m.beam([x,.63,3],[x,.63,16],.32,.36,OAK,12,END);
      m.beam([x,.63,16],[x,.63,29],.36,.31,OAK,12,END);
      for (const z of [7,22]) m.beam([x,.63,z],[x,.63,z+2],.356,.356,SHADE,12);
      m.beam([x,.63,29],[x,.63,31],.07,.067,TRIM,6);
    }
    m.beam([1,1.49,0],[1,1.49,12],.42,.37,STONE,12);
    m.beam([1,1.49,12],[1,1.49,16],.32,.4,SHADE,12);
    return m;
  }
  if (kind === 'mill') {
    m.box(.10,.13,0,1.77,1.67,3,OAK);
    for (const x of [.15,1.83]) m.box(x-.05,.19,0,.10,.10,38,TRIM);
    m.box(.10,.09,36,1.78,.33,5,[0xb18c57,TILE]);
    m.beam([1,1.02,3],[1,1.02,17],.59,.55,STONE,14);
    m.beam([1,1.02,17],[1,1.02,20],.14,.13,END,9);
    m.beam([1,1.02,22],[1.65,1.02,22],.052,.052,TRIM,7);
    m.beam([1.65,1.02,22],[1.65,1.02,34],.045,.04,END,7);
    return m;
  }
  // Cellar bulkhead, built into a low earth bank.
  m.stone([1,.41,7],.94,.49,13,[0x82714c,EARTH],v);
  m.box(.38,.59,0,1.24,.15,13,STONE);
  m.face([[.38,.34,24],[1.62,.34,24],[1.62,.76,10],[.38,.76,10]], OAK);
  for (const x of [.41,.99,1.56]) m.beam([x,.34,24],[x,.77,10],.024,.024,TRIM,5);
  return m;
}

function layered(kind: 'granary' | 'timber_yard', w: number, d: number, meta: StructMeta, front: boolean, v: number): SceneryModel {
  const m = new SceneryModel();
  if (front) {
    roof(m,w,d,meta.wall-2,meta.top-4,[kind === 'granary' ? 0xb49560 : 0x998466, TILE],v);
    for (const x of [.15,w-.15]) m.box(x-.05,d-.24,0,.1,.1,meta.wall,TRIM);
    if (kind === 'granary') {
      for (let i = 0; i < 12; i++) {
        m.box(.15+i*.148,d-.18,meta.plinth,.069,.07,meta.wall-meta.plinth,OAK);
        m.box(w-.18,.15+i*.148,meta.plinth,.07,.069,meta.wall-meta.plinth,OAK);
      }
      m.box(.15,d-.18,meta.plinth,w-.3,.11,3.5,TRIM);
      m.box(w-.18,.15,meta.plinth,.11,d-.3,3.5,TRIM);
    }
  } else {
    const z = kind === 'granary' ? meta.plinth : 2;
    m.box(.12,.15,z-2,w-.24,d-.30,2.5,OAK);
    m.box(.14,.16,z,w-.28,.10,meta.wall-z,TRIM);
    for (const x of [.15,w-.15]) m.box(x-.05,.16,0,.1,.1,meta.wall,OAK);
    if (kind === 'granary') {
      m.box(.88,.25,z,.1,1.41,meta.wall-z-5,TRIM);
      m.box(w-.22,.23,z,.1,1.51,meta.wall-z-5,TRIM);
    }
  }
  return m;
}

const FACILITIES: ReadonlySet<BuildKind> = new Set([
  'well','food_rack','paddock','chicken_cage','cellar','quarry','mine','kiln','brewery','mill',
]);

export function buildingMesh(cache: SpriteCache, kind: BuildKind, variant: number, meta: StructMeta): Sprite[] | undefined {
  const def = BUILD_DEF[kind];
  if (!def) return;
  const {w,h: d} = def;
  const v = variant % 4;
  const width = (w+d)*32 + 28, anchorY = (w+d)*8 + meta.click + 9;
  const size = [width, anchorY + (w+d)*8 + 18, width/2, anchorY] as const;
  const origin = [w/2,d/2,0] as const;
  const shadow = [Math.max(w,d)*29,Math.max(w,d)*10] as const;
  const key = `building:${kind}:${v}`;
  if (kind === 'granary' || kind === 'timber_yard') {
    const back = meshSprite(cache,key,size,origin,shadow,() => layered(kind,w,d,meta,false,v));
    const front = meshSprite(cache,key+':front',size,origin,null,() => layered(kind,w,d,meta,true,v));
    return back && front ? [back,front] : undefined;
  }
  const spr = meshSprite(cache,key,size,origin,shadow,() => {
    if (kind === 'lean_to') return leanTo(v);
    if (FACILITIES.has(kind)) return facilities(kind,w,d,meta,v);
    return enclosed(kind,w,d,meta,v);
  });
  return spr && [spr];
}
