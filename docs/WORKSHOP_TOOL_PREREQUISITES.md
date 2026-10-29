# Workshop tool prerequisites — rules 57

A person could have an actual cart demand and know a usable timber yard, yet never
make its required hammer. `production.ts planRecipe` set `ctx.toolWanted` when it
encountered the missing tool. Social options consumed that fact for borrowing, but
hand-tool material/craft options had already run, and the private tool-plan hook
ignored it. General hammer demand depended on unrelated prior gathering/building.
The register's ordinary rules-55 worlds had 95 cart-demand samples blocked by a
hammer and no carts. That evidence diagnosed a missing connection, not a need to
increase cart utility or grant hammers.

## Contract

`options_work.ts` remains the owner of hand-tool wants, material acquisition and
craft options. One bounded second pass after `productionOptions` consumes only its
existing required-tool fact. It reuses ordinary crafting, local material acquisition,
capacity, reservations, work costs and the existing tool-plan hook. It excludes
water jars (kiln products), children and already held tools. Missing materials
remain missing. Known rack tools suppress the missing-tool fact through the existing
planner; borrowing from a visible willing neighbour remains a separate option.

Existing same-key physical trips keep their quantities and ordering, rather than
receiving duplicate choices. The person may need to deliver spare material before
collecting a different input. The new connection does not reserve workshop output,
guarantee a cart, bypass hunger/thirst, remove cheap alternatives or force selection.
The existing tool plan can end, expire or become irrelevant after circumstances change.

No persistent state or schema is added. `Ctx.toolWanted` exists only during option
derivation. The existing intention owns material reservations and lifecycle; tool
records, inventories, workshop jobs and carts own actual goods and work. Views of
options remain pure. Rules 56 and older retain previous behavior. The predecessor
reference at `a465c2e` pins both a natural river world and an active childcare journey
before rules 57. `rich-no-workshop-tools` removes only this connection, including the
tool-plan preference; borrowing remains. No paired-control/nudge experiment has run.

## Physical evidence

Seven focused contracts cover the missing connection, historical boundary, physical
journey, reservations, held/rack tools, borrowing, ablation, duplicate-key avoidance,
capacity, conservation, tool ownership, observer purity and exact intermediate save
continuation. `tests/tool_prerequisite.test.ts` and its explicitly staged helper are
the source. The actual inhabitant selection boundary validates and records every
chosen option. It preserves critical-need overrides; this is not ordinary selection.

The complete staged journey: actual cart demand and missing hammer → gather wood →
deliver spare wood to the site while retaining the hammer's reserved one wood →
gather two stone → craft hammer → consume the yard's staged components to build
an owned cart → drink and sleep (real night and needs) → eat → cart **14 stone**
from the storehouse to the unfinished site. Components, source stock, destination
stock and cart load are accounted for; no building completion is claimed.

`node scripts/browser/tool_prerequisite_check.mjs http://127.0.0.1:5286/ viewer_evidence/tool57`
passes **7/7** checks, including exact same-Chromium continuation during crafting.
Screenshots were visually inspected, including the hammer completion and stone
delivery with the actual cart and site. The fixture explicitly stages a workshop,
components, raw sources, useful site demand and a feasible initial pack.

Preserved review findings:

- The first fixture's heavier food/water pack could not also carry raw tool inputs.
  A separate negative retains that limit. The feasible journey still has to deliver
  spare wood; capacity and inventory rules were not changed.
- A first test helper released external control immediately after starting an action;
  ordinary reconsideration interrupted mining. It now follows the existing inhabitant
  protocol for the selected action, and the evidence labels external selection.
- After cart construction the real thirst/rest gates correctly withheld hauling.
  The journey drinks and sleeps; it does not reset needs or change thresholds.
- A new neighbour fixture counted a hammer without its tool record. It now uses
  `mintTool`; the tool ownership assertion remains. The prematurely started full-suite
  run was stopped by this agent, its log retained, and restarted after the focused fix.

## Limits

This repairs prerequisite resolution for hand tools required by current workshop
demands. It does not establish ordinary cart frequency, useful inter-settlement cart
exchange, all advanced production chains, optimal load planning or aggregate benefit.
The programme register carries the ordinary observation and exact next actions.

Ordinary observation used the existing `scripts/transport_observe.ts` unchanged:
`npx vite-node scripts/transport_observe.ts viewer_evidence/tool57-river45 river 45 none current`.
Fixed river/Normal/no immigration reached day 45 (108,000 ticks) in 139.241 seconds,
inside its 300-second budget; 7,890 adult samples, 6 deficit-based and 8 experience-based
cart-demand samples, 10 missing-hammer blocker samples, 241 foot-haul starts, **zero
carts and zero cart trips**. Conservation and every observer-purity check passed.
The ledger records three crafted hammers, without attributing that count to this change.

`scripts/prerequisite_snapshot.ts` reads the resulting save without changing it. Five
retained hammer plans among Ben, Petra and Ivy comprise four dropped plans (short one
or two stone) and one still active. These are retained records, not lifetime counts.
Ben's pack weighs 17.5/18 and Petra's 16/18; neither can take a 3-weight stone. They
carry 12 and 26 seeds respectively, several tools and other goods. Many remembered
stone sources remain personally estimated usable. This is a concrete capacity/
acquisition follow-up; it does not prove either person's entire failure history or
justify silently discarding seeds, tools or reserves. Ivy currently has stone options.

Exact next action: trace a blocked person's actual offered material trip, free capacity,
seed/farming reservations and known accessible stores over time. Establish a bounded
physical unload/retrieve contract if that is the missing transition, preserving useful
seed reserves, ownership, tool access and old rules. Do not increase capacity, lower
hammer costs or raise scores to make this one seed produce a cart.
