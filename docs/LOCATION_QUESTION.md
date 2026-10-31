# Asking where a person is — rules 105

Delivered 31 October 2026 on `main` after rules 104. Programme row A8 (cooperation speech acts: "asking about ability
or location") of [DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). Owner: `src/sim/location_question.ts`;
lab removal `rich-no-location-questions`; rules 104 and earlier keep their recorded behaviour and references.

## Diagnosis

A read-only audit of every place a person needs another's location found that the promise path had no recovery: a helper
who promised to bring something to a person (`deliver`/`haul` commitment to a person, not a site) finds them through
`promisedLocation` (sight or their own whereabouts note). When the hand-over fails because the person moved, the note is
deleted ("Ada was not where I expected") and from then on the promise is set aside with "does not know where to find
them", however many neighbours who just saw the person stand beside the helper. The existing `ask_info` conversation
asked only where food, water, wood or stone could be found; nobody could ask where a person was. (The same audit found
two legacy reads of true state: dependant needs read out of sight in `optCare`, and the pre-56 watch fallback; neither is
changed here and both are recorded in the register as open.)

## Contract (rules 105)

- **The question is offered** to anybody in sight within fourteen tiles, other than the person sought, when the asker
  holds an active delivery promise to a person they cannot place and does not know to be dead
  (`options_social.ts optAskInfo`, "Ask Cara where Ada is"), with the ordinary ask cooldown per person.
- **The answer is the answerer's own knowledge only**: the person in sight now, or the answerer's own whereabouts note no
  older than a day (`knownWhereabouts`). Nothing is read from the world. With nothing to tell the answer is "Sorry, I
  haven't seen her" and the question fails.
- **The asker keeps it only if newer than their own note**, with who told them (`whereabouts[id].from`) and a log line;
  the delivery option returns through the unchanged `promisedLocation`, whose wording now says the place was told, not
  seen. A stale or wrong answer is found out on arrival exactly as one's own stale note is.
- Validation refuses person questions and told notes below 105; nothing is hashed newly (whereabouts were not).

## Evidence

Focused contracts (`tests/location_question.test.ts`, 6): the staged failed hand-over leaves the promise set aside and
the question offered, observation is pure; the real conversation is answered with a dated sighting, the note carries the
teller, the delivery option returns, Ben walks to Ada and hands over the fish with an exact twin continuation and balanced
resources; a bystander who has not seen her says so and nothing is learned; an older account does not replace a newer
note; rules 104 and the ablation offer no question; a told note is refused below 105. The staged ask waits for a time
window in which the engine's own chance that an idle person stops for a word is taken, so the contract is about the
question rather than one unlucky window.

Rendered (`scripts/browser/location_question_check.mjs`, **5/5**, `autonomy_evidence/location105-rendered`):
the set-aside promise, the spoken "Have you seen Ada? I promised them something.", Cara's "I saw Ada near there at tick
N; they may have moved since.", and the fish handed over after the walk.

Ordinary river screen (`scripts/promised_supply_observe.ts river … 5 600`, rules 105 and pinned 104, reports
committed): five days / 12,000 ticks each (116.96 s at 105, 121.50 s at 104), 2,800 samples, 100 purity checks, exact twins, conserved, no deaths. The two runs are identical in every count (286 site asks offered, 10 site promises, 72 set-aside fetch samples) except that 105 adds **4 samples where a location question was offered and none started**; no promise was sampled set aside for an unknown whereabouts in either run. The failed-hand-over situation the slice answers did not arise in this window; the staged scene is the only direct evidence.

## Limits and what remains

- Only promised deliveries to a person ask; care journeys, work-handover reports, relocation search and customer
  deliveries keep their own location rules and could reuse the question later. Questions about a household's home, a
  store or a facility, ability questions and counteroffers remain absent.
- A whereabouts note carries no hop count; an answer repeats what the answerer saw, never hearsay they were told.
