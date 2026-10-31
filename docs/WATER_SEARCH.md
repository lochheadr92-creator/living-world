# Purposeful water search — rules 110

## Evidence before editing

The retained valid home-loss fixture at 109 finishes and uses its replacement but
dies of thirst. A pure trace at ticks 4,000–7,000 found no remembered water and no
drinking option. This does not mean there is no water in the world or that survival
can be guaranteed. The staged lake is outside the scene helper's initial knowledge
radius, despite that helper's broad "everyone knows the lake" comment.

Two concrete gaps were reproduced: the water-search option's `to find water` goal
became an activity labelled as looking for food, with no thirst need; and the
unconditional exploration night gate prevented even critical thirst with no known
drink from motivating a search. A third constraint was inspected: each frontier
search is sampled around the physical home, so repeated searches remain tied to
that ring rather than the searcher's present frontier. No pressure or resource
configuration was changed to diagnose these paths.

## Bounded implementation

`water_search.ts` provides only the person's position, the search purpose and
whether their current thirst is critical. It supplies no water location. When
water is needed and no drinking offer exists, exploration samples from the person's
current position, retaining the existing sixteen candidates, range, knowledge of
explored ground, failure exclusions, danger weighting, cooldown and 1,100-tick
activity limit. Critical thirst permits this search after dark; noncritical night
exploration remains excluded. Children retain their existing restriction.

The started activity retains `Searching for water`, `to find water`, and the
`thirst` need. An after-dark explanation says `critical thirst after dark`, not
`daylight to spare`; its numerical part remains two. All other choices, physical
travel, perception, drinking, interruption and material accounting remain with
their current owners. This inherits the existing frontier landing/terrain checks;
it is not a general audit or redesign of exploration knowledge.

Existing modules touched: `options_work.ts` exploration guards, origin and activity
description; `rulesversion.ts`; lab removal `rich-no-water-search`. No new saved
state, protocol, needs drain, nutrition, capacity or generated supplies. The
immutable rules-109 reference was checked unchanged before allocating 110.

## Verification and limitations

Two tests failed before the correction (purpose propagation and critical night
eligibility). Seven final water-search tests cover those, noncritical night,
legacy/removal, own-position origin without inserted knowledge, personally seen
water ending the urgent search, and autonomous travel → perception → actual drink
across a saved journey. Focused water/construction/housing/reference: 24/24.
Typecheck/build pass, with the existing bundle-size warning. Full regression is
running separately. Review found the inherited daylight explanation at night;
it was corrected and the full run restarted on that final source. The earlier
interrupted log is retained and is not a full-pass claim.

`autonomy_evidence/water110-final-rendered` passes 7/7, with both screenshots
inspected: the person's panel says "Searching for water", then the real discovered
shore is visible and drinking restores thirst. The staged case consumes its initial
three carried water units before starting at tick 1,800, with no water beliefs
inserted. Under 110 it searches immediately and starts drinking at 1,931; under
109 it wanders until daylight, searches and starts drinking at 2,737. Both survive
that 2,400-tick diagnostic with exact twins and conserved items. This is a bounded
timing contrast in one staged scene, not a general survival benefit.

The unchanged home-collapse diagnostic remains adverse at 110: the lean-to is
built, but Ada dies of thirst at tick 7,353. Its exact saved twins and conservation
pass. Preserve this limitation; a search capability is not guaranteed discovery,
and proactive water planning/household viability remain open.

Five ordinary days each in river, meadow and forest: 2,800 live-person samples,
100 pure checks per seed, exact twins/reload, full conservation, no deaths. All
three record **zero** thirsty-without-drinking-offer samples, water-search starts
or changed eligibility samples. This is a null with no sampled opportunity for the
new mechanism, not evidence of ordinary usefulness. Reports are
`autonomy_evidence/water110-{river,meadow,forest}-5/report.json`.
