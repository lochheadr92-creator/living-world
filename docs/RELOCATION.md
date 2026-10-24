# Household relocation and runtime founding

Rules 20; one current product simulation. `relocation.ts` owns the household agreement,
its bounded history and options. Physical travel remains in `activities.ts`, packing in
`act_resource.ts`, and material delivery / construction in their existing handlers.

A person who has spent a sampled continuous day hungry (<45) with fewer than two food
units may propose a remembered opportunity: water and food within eight tiles of one
another, remembered within two days, at most 50 tiles away and over 22 tiles from their
current township. This does not search resources in the true world. The household must
hear the proposal together. The organiser has no special right to command or access
another household's stores.

Each other member is asked in a timed, physical discussion. Adults/youth/elders can
refuse due to serious needs, distrust or an unfinished promise. Children hear the route
and are recorded as dependents. Refusal ends this first form of relocation; it does not
split the household or assign unwilling people to travel. The agreement to prepare is
also made together. Members gather again at the recorded meeting place before departure.

Packing is ordinary, capacity-limited withdrawal from the household's own store, with
ownership rechecked at transfer. Departure requires two food and water units per member,
carried collectively, everyone present, and renewed willingness. These are preparation
minimums, not a guarantee of survival. Materials are not granted: missing shelter wood
must be gathered, carried and used through ordinary actions. Personal reservations still
apply. Members choose the offered journey action individually. Adults wait while walking
so dependents can stay in sight; children will not travel without a nearby agreed adult.
Urgent needs and danger can interrupt travel or work. No positions or goods are copied.

Arrival requires the whole household together and locally confirmed usable water and
recently seen food. They mark out a lean-to, supply it and build it. Membership changes
only in a subsequent co-present establishment action at the completed, owned shelter.
An existing township within 14 tiles receives the household; otherwise that explicit
condition creates a new township and physical hub. Walking past a township is insufficient.
The original property and its contents remain household-owned. An empty township keeps
its stable identity and hub; zero resident households describes its current vacancy.

Architecture choice: extending personal intentions versus a household agreement.
Personal intentions have one actor and no consent roster, so forcing a shared move into
that system would duplicate agreement state across people. The selected record belongs
to the household; activities reference its ID. Agreements/pressure are authoritative,
saved and hashed; inspector prose is derived. Eight recent agreements are retained per
household. A new township permanently retains the founding household, organiser,
agreement, prior township and shelter IDs even when recent agreement detail is retired.

Failure and recovery: an interrupted discussion records no answer; packing can fail on
capacity, depleted stock or changed ownership; a blocked route records the normal path
failure and remains retryable; separation prevents arrival/founding; an unsuitable arrival
ends the proposal. Nobody automatically inherits an absent/dead organiser's role. The
known four-day deadline permits survivors to end an overdue agreement. Ordinary survival
continues wherever they are, and original ownership remains valid. Retry is delayed by a
day. This first slice has no automatic rescue, partial-family split, succession or return
expedition. Those are not silently simulated.

Compatibility: a v19 save/continuation reference was captured in commit 801123e before
changing the current version. No old save is migrated or historical reference rewritten.
Records load only at rules 20 or later and invalid phases/identities are rejected. The
lab-only `rich-no-relocation` switch disables this mechanism, not other civic work.

Evidence: `tests/relocation.test.ts` exercises offered actions through the existing
external selection boundary (staged choices, not spontaneous migration), with live
urgent interruptions and ordinary resource/movement/work costs. `scripts/relocation_demo.ts`
recreates labelled saves; `scripts/browser/relocation_check.mjs` renders and checks them.
See `CIVILISATION_IMPLEMENTATION.md` for exact results and remaining programme scope.
