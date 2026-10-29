# Practical childcare at rules 56

The rules-54/55 watch could use a child's live location when the helper knew no location,
follow beyond sight, and give away the helper's last food despite their own dependant's
reserve. A completed watch also settled its request as partial because settlement compared
delivered goods with a request for time. These are separate confirmed defects, not evidence
that every care chain is now complete.

## Contract and ownership

`responsibilities.ts` owns the accepted childcare duty. After an actual accepted watch
conversation, `social.ts` asks it to copy the parent's observation or remembered location
to the helper's existing whereabouts. The original observation tick is retained, locations
older than one day are not newly communicated, and newer helper knowledge wins. The
existing `whereIs` policy may still suggest an old personally known place or known home;
arrival can fail. No live remote coordinates are a fallback.

`options_work.ts` offers the existing visit only with a personally known destination.
Unknown destination and recent lost contact are explicit blockers. Observer option queries
do not write those blockers. During the watch, contact must be in the same interior/space
and inside the helper's sight radius; transfers require proximity within 3.2 tiles. A
visible child further away can be physically followed. Lost contact fails the current
attempt, records its blocker and waits 240 ticks before another search. It does not fulfil
the duty or invent a new destination. Even orientation is updated only after contact.

Every food/water transfer reuses `surplusOf`, including own needs, dependants, material
promises and plan reservations. Existing transfer/capacity and gift-credit paths remain
authoritative. Full packs preserve goods with the helper and earn no gift credit. The
existing 300-tick watch earns its work milestone once; settlement uses that milestone to
fulfil the request without claiming a quantity of goods was promised or delivered.

No new persistent fields or schemas: locations, commitments, activity progress, cooldowns,
logs, inventories and relationships retain their existing owners, bounds, serialization,
hashing and cleanup. Communicated location is one entry per existing child identity. An
interrupted watch retains already transferred goods but has not earned the completed-time
milestone. Existing promise expiry, refusal and survival interruption still apply. This
does not implement automatic responsibility handback after recovery.

Rules 55 and older retain their semantics. The immutable rules-55 reference was committed
at `b086c9a` from `94f5f8a` before this change and passed on the rules-56 candidate. The
lab removal `rich-no-practical-care` restores the previous childcare communication,
contact, reserve and settlement behaviour together; no effect below 56. No aggregate run
or benefit claim is attached to this switch.

## Evidence and limits

`tests/practical_care.test.ts` covers old/new reserves, unknown locations, stale and newer
knowledge, cross-interior and remote contact, visible following, full packs, lost contact,
duplicate settlement, ablation, physical travel/food/eating, full-state continuation and
observer purity. Historical defect characterizations remain in
`tests/practical_care_upkeep.test.ts`, pinned to rules 54.

`node scripts/browser/practical_watch_check.mjs http://127.0.0.1:5286/ viewer_evidence/watch56`
passed 6/6 checks. The labelled fixture stages an injured parent, willing neighbour, bread,
and a child remaining at the remembered place. The parent actually asks; the neighbour
voluntarily agrees; the engine carries out offered travel/watch/eat activities. Five bread
units transfer, the watch and request both finish at tick 582, and eating raises the
child's hunger value from 25.159 to 100. The intermediate restored world is byte-identical
in the same Chromium runtime. Screenshots were inspected for speech, participant identity,
actual care feedback and legibility. Explicit selections and a stationary staged child are
not ordinary activation evidence.

The existing injured-elder delivery/eating and shared-kiln repair/use demonstrations are
recorded separately in the programme register. The short ordinary day-45 checkpoints
retain their original rules 53: 23 care attempts, one successful one-berry delivery; most
failed through different interiors, full packs or interruption. Those results cannot be
claimed as rules-56 activation or recovery evidence.

Remaining: ordinary opportunities and selected watches, carer recovery/handback, isolated
elders, sustained coverage of dependants, failed-care relationship attribution, practical
warmth requests and actual downstream recovery. Helpers acquire no guaranteed free food,
new medical treatment or universal responsibility for a household.

Ordinary census: `npx vite-node scripts/practical_care_observe.ts viewer_evidence/watch56-ordinary-final`
ran fixed meadow/river/forest Normal worlds, immigration off, rules 56, five days each
under a shared 120-second stop budget. Each reached tick 12,000 with conservation and
observer purity intact, 1,400 living-person samples per seed. Incapacitated samples were
0/60/20; uncovered-parent samples, watch-request offers, accepted requests, watch starts
and transfers were all zero. There were **no qualifying opportunities**, so this does
not establish natural selection or childcare benefit. Do not reroll or interpret zero
as either proof of failure or proof of coverage. The first observer draft incorrectly
referenced a nonexistent result ID; typecheck caught it, it was corrected to the existing
label/start-time trace, and the same fixed seeds were rerun. Both runs retain the same nulls.
