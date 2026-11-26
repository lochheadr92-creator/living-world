// Retrospective analysis of the original 13-day trip rows. Report coverage explicitly.
import { readFileSync, writeFileSync } from 'node:fs';
const input = 'review_evidence/withdraw-baseline-20261119/fix-runs';
const output = 'review_evidence/walk-step4-20261119';
const result = {};
const returns = {};
const dist = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
for (const seed of ['aspen','gen-4','river']) for (const day of [48,96]) {
  const id = seed+'-day'+day;
  returns[id] = [];
  const control = JSON.parse(readFileSync(input+'/'+id+'-on.json','utf8'));
  if (control.rulesVersion !== 257 || control.benchOff || control.nudge || control.days !== 13 ||
      !control.arrivals || !control.conservation.ok) throw Error('Unexpected control '+id);
  const starts = new Map();
  for (const t of control.trips) {
    if (t.leftCensored || t.legIndex !== 1 || t.startTick-t.actStart > 1) continue;
    const key = [t.person,t.actStart,t.kind].join('|');
    starts.set(key, starts.has(key) ? null : t);
  }
  const byPair = {}, byReason = {};
  const progress = { belowQuarter:0, middle:0, lastQuarter:0, unknown:0 };
  const withdrawals = new Map(control.rows.map(r => [r.id,r]));
  let exampleReturn = null;
  const storeChanges = { linked:0, bothRecorded:0, changedStore:0, sameGoalAndGoods:0, changedStoreSameGoalAndGoods:0,
    newTripTookGoods:0, newTripInterrupted:0, returnedToFirstStore:0, withThirdWithdrawal:0 };
  let adultTicks=0, dropped=0, droppedTicks=0, generic=0, linked=0, estimated=0, low=0, high=0, unknownTicks=0;
  for (const t of control.trips) {
    if (t.stage !== '12_and_over') continue;
    adultTicks += t.walkingTicks;
    if (!['switched_mid_walk','gave_up_before_arrival'].includes(t.outcome)) continue;
    dropped++;
    droppedTicks += t.walkingTicks;
    const reason = byReason[t.endDetail] ??= {count:0,ticks:0};
    reason.count++; reason.ticks += t.walkingTicks;
    if (t.endDetail !== 'something better came up') continue;
    generic++;
    if (t.coveredShare === null) progress.unknown++;
    else if (t.coveredShare < 0.25) progress.belowQuarter++;
    else if (t.coveredShare >= 0.75) progress.lastQuarter++;
    else progress.middle++;
    const pair = byPair[t.kind+'|'+t.toKind] ??= { count:0, linked:0, detourTicks:0, unknownTicks:0 };
    pair.count++;
    const next = starts.get([t.person,t.activityEndTick,t.toKind].join('|'));
    if (t.leftCensored || !next || t.activityEndTick !== t.endTick || dist(t.endPos,next.startPos) > 0.05) {
      unknownTicks += t.walkingTicks;
      pair.unknownTicks += t.walkingTicks;
      continue;
    }
    linked++; pair.linked++;
    if (t.kind === 'withdraw' && next.kind === 'withdraw') {
      storeChanges.linked++;
      const first = withdrawals.get(t.actId), second = withdrawals.get(next.actId);
      if (first && second && first.person === t.person && second.person === t.person) {
        storeChanges.bothRecorded++;
        const sameGoodsAndGoal = first.goal === second.goal &&
          Object.keys(first.wanted).sort().join('|') === Object.keys(second.wanted).sort().join('|');
        if (sameGoodsAndGoal) storeChanges.sameGoalAndGoods++;
        if (first.targetId !== second.targetId) {
          storeChanges.changedStore++;
          if (sameGoodsAndGoal) storeChanges.changedStoreSameGoalAndGoods++;
        }
        if (second.moved > 0) storeChanges.newTripTookGoods++;
        if (second.endOutcome === 'interrupted') storeChanges.newTripInterrupted++;
        if (next.endDetail === 'something better came up' && next.toKind === 'withdraw') {
          const third = starts.get([t.person,next.activityEndTick,'withdraw'].join('|'));
          const last = withdrawals.get(third?.actId);
          if (last && third.actId !== next.actId && last.person === t.person) {
            storeChanges.withThirdWithdrawal++;
            if (first.targetId !== second.targetId && first.targetId === last.targetId) {
              storeChanges.returnedToFirstStore++;
              returns[id].push([first,second,last].map(r=>({
                act:r.id, person:r.person, store:r.targetId, type:r.buildingType, tick:r.startTick,
                goods:Object.keys(r.wanted).sort().join(' + '), goal:r.goal
              })));
              if (!exampleReturn && sameGoodsAndGoal && last.goal === first.goal) {
                exampleReturn = { person:t.person, stops:[first,second,last].map(r => ({
                  tick:r.startTick, store:r.targetId, type:r.buildingType, wanted:r.wanted, goal:r.goal,
                  walkedTicks:r.travelTicks, moved:r.moved, ending:r.endDetail
                })) };
              }
            }
          }
        }
      }
    }
    if (!t.walkedDistance) continue;
    // Coordinates in the trace are rounded to 0.01, and only the replacement's floor tile is saved.
    // The distance difference changes by at most twice the discrepancy from that tile's centre.
    const target = next.spotTile.map(v=>v+0.5);
    const pace = t.walkedDistance/t.walkingTicks;
    const extra = t.walkedDistance+dist(t.endPos,target)-dist(t.startPos,target);
    const clip = tiles => Math.max(0,Math.min(2*t.walkingTicks,tiles/pace));
    const estimate = clip(extra);
    estimated += estimate; pair.detourTicks += estimate;
    low += clip(extra-1.44);
    high += clip(extra+1.44);
  }
  result[id] = { adultTicks,dropped,droppedTicks,generic,linked,estimated,low,high,unknownTicks,byReason,byPair,storeChanges,progress,exampleReturn };
}
if (process.argv[2]==='--returns') writeFileSync(process.argv[3],JSON.stringify(returns));
else writeFileSync(output+'/full-window.json',JSON.stringify(result,null,1)+'\n');
