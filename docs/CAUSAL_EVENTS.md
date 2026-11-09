# A grievance remembers the event that caused it: rules 182

Predecessor rules 181 is pinned by `tests/v181_continuation.expected.json`. Origin: gap ledger row G01 (`docs/GAP_LEDGER.md`), first slice only. One rules version for one change
(decision D2).

## The gap (every version up to 181)

Events carry an id (`addEvent` allocates it with `world.nextId++`) that nothing stored: `addEvent` returned nothing. A grievance (`Grievance`: cause, detail, since, weight) and the
`Relation.history` notes beside it recorded a sentence, so nothing in the record said "because of event N".

## The rule (rules 182, rich worlds)

`addEvent` returns the new event's id (all versions; the value is unused below 182). `src/sim/causal_events.ts` `linkCause(world, holder, otherId, eventId, { notes, detail })` is called
right after the event is recorded at four incidents and stores the id as `Grievance.eventId` and as `eventId` on the history notes written this tick with those exact texts:

- a promise not kept (`social.ts`, commitment check): the asker's note and grievance;
- a refusal that makes the feed (food or water, severity above 0.45);
- a contest lost on a feed day (the feed line is rate limited, so most contests record no event and are not linked);
- an argument (`startArgument`): both sides' notes and grievances.

The incident code is untouched and in its old order; only the link is added after the event. A theft has no event at that point and is not linked. Events roll out of the feed after a
while, so an id can outlive its event; the chronicle keeps the worthy ones. Nothing reads the id yet: thoughts, life events, rumours and the personal log are later slices (G07, G08, G09, G36),
and the inspector does not show it. Rules 181 and earlier, authored worlds and `setCausalEvents(false)` keep none. The lab name for the removal is `rich-no-causal-events`; it is not
registered in `scripts/lab/lab.ts`, which another session holds with uncommitted edits.

## What it can change

Saved worlds at 182 carry extra `eventId` fields, so their serialised state differs from 181's; no decision reads them. No benefit is claimed.

## Evidence

- Contract tests `tests/causal_events.test.ts` (8). Four fail with the rule disabled (an argument links both grievances and both notes; a contest on a feed day links and a quiet one does not;
  `linkCause` ties only this tick's notes with the named text; the ids survive a save and load).
- `npm run typecheck` passes. Focused set (27 files, social, grievance, events, relations, saves, rules version): 231 tests.
- Immutable pin `tests/v182_continuation.*` (Normal birch, arrivals on, 2,400 ticks then 120 after a save and load; from tick 76 somebody holds a grievance and a history note that name their
  event, sampled every 25 ticks), recorded from a clean checkout of `adbc4e0a` (probe run twice, identical); the pin test passed there, 1 of 1 in 6.8 s.
- Twin with the ids stripped before hashing, 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts --strip-cause` at 181 and at 182 from a clean checkout of `f26cadcb`, two
  processes at a time: the final world is identical in 12 of 12 seeds; conservation and the tool registry hold in all 24 runs. Without the strip the hashes differ by the ids alone
  (checked on a two-day world). `review_evidence/causal-events-20261109/`.
- The suite was not rerun for this step alone; one run covering rules 182 to 184 is recorded with them.

Decision-neutral on the evidence of twelve 25-day worlds. That is a comparison of dynamics, not a check that every stored id is right.

## Not done

Thoughts, life events, rumours and the personal log (G07, G08, G09, G36); a theft and other incidents with no event; a reader (inspector or chronicle) that follows an id back to its event.
