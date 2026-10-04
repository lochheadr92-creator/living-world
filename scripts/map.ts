import { defaultSettings, createWorld } from '../src/sim/factory';
const seed = process.argv[2] ?? 'meadow';
const harsh = process.argv[3] === 'harsh';
const w = createWorld({ ...defaultSettings(seed), harsh } as any);
const T = (w as any).terrain as Uint8Array;
// find which terrain code is water
const counts: Record<number, number> = {};
for (let i = 0; i < T.length; i++) counts[T[i]] = (counts[T[i]] ?? 0) + 1;
console.log('W,H', w.W, w.H, 'terrain counts', JSON.stringify(counts), 'camp', w.camp.x, w.camp.y);
const rows: string[] = [];
for (let y = 0; y < w.H; y += 2) {
  let r = '';
  for (let x = 0; x < w.W; x += 1) {
    const t = T[y * w.W + x];
    let ch = '.';
    if (w.waterDist && w.waterDist[y * w.W + x] === 0) ch = '~';
    else if (t === 2) ch = 'T';
    else if (t === 3) ch = 'm';
    else ch = '.';
    for (const a of w.animals) if (Math.floor(a.denX) === x && Math.floor(a.denY / 2) * 2 === y) ch = 'W';
    if (Math.floor(w.camp.x) === x && Math.floor(w.camp.y / 2) * 2 === y) ch = 'C';
    r += ch;
  }
  rows.push(String(y).padStart(3) + ' ' + r);
}
console.log(rows.join('\n'));
