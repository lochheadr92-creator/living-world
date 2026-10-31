# First ordinary forest cart undertaking at rules 113

Read-only exact-source trace, runtime `e64789d`, fresh Normal forest, immigration
off. No supplied knowledge, inventory, plans or choices. Lena (908) adopts plan
7387 at tick 17,766 after carrying 50 weight of site materials in 11 loads. The
observer captures it on the next tick and follows until it drops at 24,967 under
its original 7,200-tick deadline. There is no cart or cart workshop start.

The graph first requires a hammer. Lena initially carries the one wood and two
stone needed for that tool. The plan has empty `wants`, even while its next step
is craft hammer. At sample 17,820 she is instead hauling those two stone to a kiln
site; craft hammer is also offered. The haul completes. The graph subsequently
reconsiders missing ingredients and spends 105 of 121 samples on acquiring stone,
15 on wood and one on crafting the hammer. No hammer is made. It expires with
“the time is up (was going to acquire wood for cart)”. This is one real trace,
not a claim that protecting ingredients alone will complete ordinary carts.

Competing work and needs remain material: 31 samples are resting at work, 19
sleeping at work, 14 gathering travel and nine gathering work. Warmth and other
survival actions dominate many later samples. Ending counts include seven completed
gathers, three partial empty gathers, a successful material haul and a partial
repair. No pressure, deadline or capacity adjustment is justified by this alone.

Source review identifies a narrow next contract: `recordProjectStep` reserves the
single acquired/deposited item, but no ingredients while a hand-tool prerequisite
is ready to craft, unlike an ordinary tool intention. It also releases the other
already-held ingredient when acquiring one. The next slice should reproduce whether
a current hand-tool step can retain its immediate inputs through acquisition and
crafting, while still respecting earlier promises and releasing on cancellation.
It must not reserve the whole remote graph or claim cart completion from this trace.

Verification: 121 pure samples, exact unobserved twin and reload, balanced all-item
accounts; 69.19 seconds, 112 retained action events, zero omitted. Every snapshot is
a deep copy. An earlier observer draft retained references in nested next-step and
belief fields; it was stopped before relying on a report, corrected, and rerun into
a fresh output directory. Its source/log remain local as provenance.

Reproduce: `npx --no-install vite-node scripts/first_cart_trace.ts <fresh-output>`.
Retained report: `autonomy_evidence/first-cart113-forest-final/report.json`.
The captured adopted/final world saves remain local; source hashes are in the report.
