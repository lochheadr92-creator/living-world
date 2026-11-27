// Outcome-based supplement. Charge a mixed meal once if it contained a real grain bite.
import type {Activity} from './src/sim/types';
type Count = {travel:number, work:number, distance:number, meals:number, bites:number};
const tally = new Map<Activity, Count>();
const empty = ():Count => ({travel:0,work:0,distance:0,meals:0,bites:0});
export function mealStep(a:Activity, phase:'travel'|'work', distance:number) {
  if (a.kind!=='eat' && a.kind!=='eat_store') return;
  const row=tally.get(a) ?? empty();
  row[phase]++; row.distance+=distance;
  tally.set(a,row);
}
export function grainBite(a:Activity, portions:number) {
  const row=tally.get(a);
  if (!row) throw new Error('Grain meal without a work step');
  row.bites+=portions;
}
export function mealReport() {
  const result={eat:empty(),eat_store:empty()};
  for(const [a, row] of tally) {
    if (!row.bites) continue;
    const v=result[a.kind as keyof typeof result];
    v.meals++; v.bites+=row.bites; v.travel+=row.travel; v.work+=row.work; v.distance+=row.distance;
  }
  return result;
}

