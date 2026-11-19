// Read existing run rows and original save births; no simulation or writes.
for (const seed of ['aspen', 'gen-4', 'river']) for (const day of [48, 96]) {
  const run = require(`./runs/${seed}-day${day}.json`);
  const save = require(`C:/dev/lw_saves/rules256/${seed}-day${day}.save.json`).world;
  const birthdays = new Map(save.persons.map(p => [p.id, p.birthTick + 12 * 28800]));
  const crossings = run.trips.filter(t => t.stage === 'under_12' && birthdays.has(t.person) && t.startTick < birthdays.get(t.person) && t.endTick >= birthdays.get(t.person)).map(t => ({ person:t.person, start:t.startTick, end:t.endTick, birthday:birthdays.get(t.person), walkingTicks:t.walkingTicks, ticksAtOrAfterBirthday:t.endTick-birthdays.get(t.person)+1 }));
  console.log(JSON.stringify({ seed, day, ageCheck:run.trip.selfChecks.tripTicksByStageEqualOwnCounts, crossings }));
}
