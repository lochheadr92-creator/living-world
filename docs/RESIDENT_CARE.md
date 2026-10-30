# Returning to personally observed care needs — rules 66

Rules 65 could offer bread to an injured household member remembered inside their own home, but the activity failed
immediately with "they are inside a different space". The helper had lawful entrance permission; no action connected
that permission to the hand-over. Indoor perception also left the recipient's whereabouts at an older outdoor sighting.
`scripts/resident_care_diagnostic.ts` reproduces this predecessor failure without changing the entry or transfer rules.

Rules 66 records a same-room observation in the person's existing whereabouts entry: the room, the observed name, hungry/thirsty signs,
whether the observed person was a child or visibly hurt, and household membership at that contact. It uses the existing
700-tick care-location horizon. This is optional saved information in the existing store, not a second general memory.
Outdoor sight replaces the entry and removes the room information. Old rules do not emit it; saves keep their version.
No save-format or AI-protocol migration is introduced.

An adult can offer a return to a remembered household member needing help in a known usable household home. The choice
uses the recorded need, condition and entrance location, not the recipient's current hidden health, need, room, death
flag or fed timer. Learned death news suppresses the trip. A firsthand recovery observation replaces the prior condition.
Unknown, expired or unusable home knowledge cannot create an option. The lab removal is `rich-no-resident-care`.

The ordinary give action walks to that remembered entrance, calls the existing physical entry check, confirms the
recipient is actually present in that room, and only then starts the timed hand-over. Seeing the recipient outdoors
during travel replaces the remembered destination with ordinary visible contact. An absent recipient is discovered on
arrival and the stale whereabouts are cleared. Blocked entrance, lost ownership, changed room and interruption retain
their real outcomes. No guest admission, transfer through walls, teleport or new storage capacity is granted.

Food keeps the existing personal, other-dependant, meal and promise reserves. Water keeps the existing surplus and
promise limits. Urgent helper needs reject the offer. After contact, the hand-over rechecks current recipient need and
the donor's then-available supplies. A recovery or lost/promised supply can therefore stop the gift after a real visit.
Only positive physical receipt uses the existing fed marker and relationship record. Remembered full food packs still
reach the rules-63 household-store fallback, including after the helper has left the room. Full water packs can still
fail; a practical water fallback remains unfinished. Existing reserve arithmetic is reused, not a new household
knowledge model.

## Ownership and predecessor

Rules-65 implementation `93f59e3` was committed first; immutable continuation `37feb45` pins ordinary meadow, source,
processed-stock, shore and outside-resident-care continuations. It was verified before these changes. Historical
references and goldens are unchanged. Main's rules 66 was unused; no conflicting historical branch or save was relabelled.

`resident_contact.ts` owns the remembered contact and physical entrance boundary. `resident_care.ts` owns pure option
derivation and available hand-over quantities. Existing modules touched, and why:

- `types.ts` adds the optional room observation to the existing whereabouts entry.
- `perception.ts` writes it only from actual same-room sight.
- `options_work.ts` asks about those personal records before its existing visible/dependant care path.
- `activities.ts` permits the planned journey, updates it after sight, and performs entry before work.
- `care_capacity.ts` narrows the store-option input to the identity/name it actually uses; live person state is not required.
- `social.ts` rechecks the new care action's supplies and need at the existing timed transfer boundary.
- `rulesversion.ts` and the lab register declare the new boundary and isolated removal.

The contact module deliberately avoids importing social handlers into the activity engine. The initial combined module
caused a handler-registration cycle at test collection; splitting that boundary fixed the cause. It was not a test
failure hidden by changing an expectation.

## Contract and rendered evidence

`tests/resident_care.test.ts` stages the household, injury and initial supplies. Its helper legally leaves home and
actually walks away through a selected departure action; that controller is released before the ordinary return.
The return, entry, physical bread receipt and subsequent eating proceed through ordinary choices. Full saved twins
match, and resources balance. A separate water case delivers one real water which the recipient later drinks; it does
not claim the drink occurs indoors.

The contracts also cover the old version and isolated removal, unknown/expired contact, unknown home, promised goods,
helper need, blocked entrance, changed ownership, death, moved rooms, lost supplies, a new promise, recovery, interruption,
an actually sighted outdoor recipient, a full water pack and preserved full-food-pack store recovery. Hidden recovery
and hidden death do not rewrite the return option, while firsthand recovery and learned death news do. The moved-room
negative imposes relocation explicitly; it is not evidence of autonomous relocation.

The actual death path placed a grave at the entrance, so that test correctly records "home entrance is blocked".
The grave was not removed to force a preferred absence result. A separate moved-room case reaches the remembered room
and records "they are not in the room I remembered". An initial news fixture lacked a relationship entry; the fixture
now creates that normal record before setting its stated prior news. The failed runs remain in local logs.

`scripts/browser/resident_care_check.mjs` renders the actual game. Evidence shows remembered motive and walking, lawful
same-room hand-over, the elder eating and the blocked entrance with untouched supplies. The inspector labels the
initially staged scene; the negative case's legal external selection is also disclosed. Rendering preserves the full
saved world. The reviewed screenshots are byte-identical to the four already visually inspected final-scene images. This establishes a readable rendered mechanism, not human usability or ordinary frequency.

## Ordinary occurrence check

Predeclared before running: fresh Normal meadow, river and forest, immigration off, five days each, 170 seconds per run.
`scripts/resident_care_observe.ts` selects no actions. It samples living people and recent room contacts every 120 ticks,
counts offered/eligible/top new options and actual starts, endings, transfers and later same-kind pack consumption.
Rows are bounded at 2,000 per collection with explicit omission counts. A later use would associate a recipient and
item kind within one day; fungible units are not individually traced and that association would not prove benefit.

Each observed world runs beside an untouched full-serialization twin; every sampled option check is pure, daily/final
resources balance, and a full source manifest must stay unchanged. Final reports are
`autonomy_evidence/r66-resident-{meadow,river,forest}5-reviewed`. Earlier reports precede the full-pack linkage or death-registry review and
remain attributed to their own manifests; do not continue their pre-publication saves as final rules-66 evidence. Each final run reached tick 12,000, with 2,800 living-person samples:

| Seed | Person samples with recent room contact | Contact-pair samples | New offers / eligible / top options | New starts / receipts / later uses | All give starts | Seconds |
|---|---:|---:|---|---|---:|---:|
| meadow | 14 | 14 | 0 / 0 / 0 | 0 / 0 / 0 | 106 | 21.62 |
| river | 135 | 227 | 0 / 0 / 0 | 0 / 0 / 0 | 72 | 24.03 |
| forest | 114 | 161 | 0 / 0 / 0 | 0 / 0 / 0 | 84 | 22.30 |

All 100 observation snapshots per seed were pure, final twins matched, daily/final conservation passed, and no trace
rows were omitted. Recent contacts include healthy and currently visible people; these are not independent care
opportunities. The short windows found no natural adoption of this new return journey. No longer or favourable seed
was substituted to manufacture a success. The final rendered checker passed 5/5; its four screenshots were inspected
under `autonomy_evidence/resident66-rendered-reviewed`. Typecheck/build passed with the existing native-loader notices and
a 941.45 kB bundle-size warning. These short-run wall times and final save sizes (2,117,027 / 2,708,098 / 2,447,064 bytes)
are descriptive costs, not a controlled performance comparison or a mature-Large benchmark.

## Verification verdict

**TURN_INTEGRATION_VERIFIED for this bounded rules-66 transition; the complete programme remains unfinished.**
`npm test -- --maxWorkers=4` passed **237 files / 1,580 tests** in **313.35 seconds** (`autonomy-full-tests66-reviewed.log`). The earlier full run also passed before the final review fix.
Historical goldens and all predecessor references passed without changed expectations. The full run retained the same
Node timeout-overflow warning seen in the predecessor run; it had no failed test. The final focused run passed **38 tests / three files**, including **23 resident-care tests**, care-capacity tests and
the rules-65 reference (`autonomy-resident66-death-registry.log`). It includes the strengthened AI-facing
observation/selection-reason purity assertion and actual unseen-death registry removal. Final typecheck, build, source-manifest checks and `git diff --check` passed.

Fresh critical review resolved the handler cycle, hidden remote-health membership dependency and the full-food-pack
fallback connection. A later check found that actual death removes a person from the live registry; the offer now uses
the identity/name stored at contact, and the strengthened test calls the real death path rather than only toggling a flag.
Reviewed ordinary/rendered manifests match the final source, and the repeated full regression run passes. This is the builder's
review with concrete regression evidence, not an independent review. No long ordinary, matched aggregate or mature-Large
result is claimed. No broader acceptance row is promoted on these short-run or staged results.

## Remaining programme

This is a bounded resident-entry transition. It does not complete care acquisition, guest access, full water packs,
warmth/childcare coverage, overlapping household duties, incapacity succession or ordinary long-term household viability.
The full A1–A16 / WS15–21 autonomy and environment programme remains open in `DEPENDENCY_CHAIN_PROGRAMME.md`.
Current mature-Large, matched aggregate, generational and ecological runs remain pending under the repository's costly-run
policy; `AUTONOMY_VALIDATION.md` retains exact owner-run commands. No survival, productivity or care-frequency benefit is
claimed from these tests or short observations.

The next dependency is reproduced by `scripts/care_water_diagnostic.ts` and
`autonomy_evidence/resident66-water-gap-reviewed.json`: a real water hand-over fails at tick 13 with the donor retaining all three
water and no false fed marker. In a separate accounted availability probe, the recipient observes two water in the owned
home store but has no drink-from-store option; the offered alternatives are search, request water and ask for information.
The fixture has no known shore. `options_survival.ts` currently offers drinking only from a carried waterskin or remembered
shore; `act_resource.ts` implements those two paths. `care_capacity.ts` records food-capacity failures only. A successor
must connect a lawful physical water-use alternative, retain helper reserves and real consumption, and preserve this
rules-66 failure in its predecessor reference before changing it. The first diagnostic script used the wrong store
field; correcting it to `home.store.items` fixed that probe. No production rule was changed to obtain this result.
