// prints a short summary of a granary_probe output
const fs = require('fs');
const f = process.argv[2];
const j = JSON.parse(fs.readFileSync(f, 'utf8'));
const S = j.samples;
console.log('== ' + f.split(/[\\/]/).pop(), j.seed, 'rules', j.rulesVersion, 'ticks', j.startTick, '->', j.endTick, 'endHash', j.endHash, 'samples', S.length);
console.log('footprint granary', JSON.stringify(j.granaryFootprint), 'bakery', JSON.stringify(j.bakeryFootprint), 'hall', JSON.stringify(j.hallFootprint));
console.log('gate replica mismatches', j.gateReplicaMismatches, ' findBuildSpot agreement', JSON.stringify(j.findBuildSpotAgreement));
console.log('plan gates (person-samples):', JSON.stringify(j.gateTotalsOverAllPersonSamples.plan, null, 0));
console.log('want gates (person-samples):', JSON.stringify(j.gateTotalsOverAllPersonSamples.want, null, 0));
console.log('ranking:', JSON.stringify(j.ranking));
console.log('plan_site starts:', JSON.stringify(j.planSiteStarts));
console.log('plan_site ends:', JSON.stringify(j.planSiteEnds));
console.log('granary plan log:', JSON.stringify(j.granaryPlanLog));
console.log('granary sites seen:', JSON.stringify(j.granarySitesSeen));
console.log('granary events:', JSON.stringify(j.granaryEvents));
console.log('refusals at end:', JSON.stringify(j.refusalsAtEnd));
// time series every ~12 samples
console.log('day, alive, plotHH, eligible, wants, offered, blocked, projects/limit, hubSpots g3-11 anchors/packed, g3-20 anchors/packed, bakery5-14 anchors/packed, personSpots 3-11 (none/n) 3-20 (min/med/max), granary sites, granary bldgs');
S.forEach((s, i) => {
  if (i % 12 !== 0 && i !== S.length - 1) return;
  const hs = s.hubSpots.map((h) => `${h.granary3to11.anchors}/${h.granary3to11.packed} ${h.granary3to20.anchors}/${h.granary3to20.packed} ${h.bakery5to14.anchors}/${h.bakery5to14.packed}`).join(' | ');
  const ps = s.personSpots ? `${s.personSpots.ring3to11.none}/${s.personSpots.persons} ${s.personSpots.ring3to20.min}/${s.personSpots.ring3to20.median}/${s.personSpots.ring3to20.max}` : '-';
  console.log(s.day, s.alive, s.hhWithPlots, s.eligiblePersons, s.wantsGranary, s.offered, s.blockedByTimer, `${s.projectsUnderWay}/${s.projectLimit}`, hs, '; persons:', ps, '; sites', s.granarySites.length, 'bldgs', s.granaryBuildings.length);
});
const last = S[S.length - 1];
console.log('last sample rejected reasons (hub 0): granary3-11', JSON.stringify(last.hubSpots[0].granary3to11.rejected), 'granary3-20', JSON.stringify(last.hubSpots[0].granary3to20.rejected));
console.log('facility sites open at end', JSON.stringify(last.facilitySites), 'buildings', JSON.stringify(last.facilityBuildings));
