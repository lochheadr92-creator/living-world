# Physical estate custody — rules 93

Predecessor rules 92 is published at `9e95147`, runtime `784189d`, immutable
reference `4ac1779`. A direct audit of that predecessor reproduced a different
household withdrawing three wood from a deceased person's public heap. The ledger
balanced: the missing boundary was ownership, not accounting.

## Contract and ownership

`estate.ts` owns the death-time partition of actual carried goods. Household goods
remain in that household's parcel; registered borrowed and public tools go into
separate parcels with their existing owners. Tool identity and wear survive. A tool
already lent out stays with its borrower under the existing loan/death rules. No
inventory, skills, private undertaking or promise is copied to a survivor.

`pile_access.ts` checks physical contact and custody at actual withdrawal, eating
and cart loading, including repeated checks during work. Public equipment is
recoverable by anyone; other parcels require the owning household. Carrying limits,
paid collection time and ordinary spoilage remain. New deposits cannot mix later
goods into a death parcel. Perception records ownership in dated place knowledge;
knowing about a death alone does not reveal distant belongings. The inspector names
the household and explains the physical boundary. Separate nearby tiles and picking
priority keep each parcel selectable beside the grave.

Death/lifecycle, loose-holding creation, knowledge, existing resource/cart handlers,
option filtering, save validation/hash and picking are the integration points. The
existing legal collection and use actions remain the action interface. Rules 92 and
earlier retain their recorded meaning. `rich-no-estate-custody` removes parcel
creation for future deaths; it does not erase ownership already present in a save.

## Evidence and retained findings

- Three initial boundary tests failed before implementation. The audit and failed
  checks remain in `autonomy-estate93-audit2.log` and `autonomy-estate93-before.log`.
- Final focused verification passes **38 tests / five files**, **2.27 s**, covering
  estates, parcel picking, meal leftovers, transport and the immutable rules-92
  continuation (`autonomy-estate93-release-focused.log`). An earlier broader focused
  run also passed informed continuity: **51 tests / five files**, **2.32 s**.
- Fourteen estate contracts cover foreign and remote access, movement away during
  work, capacity, exact save continuation, identity/wear, full-pack eating, cart
  loading, already-lent tools, repeated collection, provenance and malformed saves.
  The cart case proves loading permission, not a completed cart delivery journey.
- Initial expanded fixtures had three genuine setup errors: one free weight unit
  cannot carry wood weighing two; axe use needs actual wood demand; a cart activity
  requires its actual cart identity. Those failures were preserved and fixtures
  corrected before the successful run.
- Rendered verification passes **8/8** under
  `autonomy_evidence/estate93-rendered`: actual clicks select all three parcels and
  show ownership; a foreign withdrawal is refused; a saved paid collection takes
  one wood and leaves two; the rightful lender recovers and uses the same worn axe
  through offered actions. Observer purity and browser errors are checked. The
  screenshots were visually inspected. This is explicitly a staged scene.
- The initial picking test failed because separately owned parcels occupied one
  tile. The placement/picking fix passed the regression and rendered checks. The
  earlier full run was cancelled, not counted as passing. Final full verification
  passes **303 files / 2,032 tests**, **420.87 s**, recorded separately in
  `autonomy-estate93-final-full-tests.log`.
- Final typecheck/build pass (`autonomy-estate93-release-build.log`), with the
  existing bundle-size warning: JavaScript about 1,100 kB, gzip about 370 kB.

## Ordinary five-day screen

`scripts/estate_custody_observe.ts` runs fixed Normal rich worlds, immigration off,
12,000 ticks each, with source manifests, exact unobserved twins, daily resource
checks, 100 full-save observer-purity checks and validated final saves. Final roots
are `autonomy_evidence/r93-final-{river,forest,meadow}`. All checks pass.

| Seed | Seconds | Samples | Deaths / parcels created | Remembered parcel samples | Collection starts |
|---|---:|---:|---:|---:|---:|
| river | 44.07 | 2,800 | 0 / 0 | 0 | 0 |
| forest | 38.12 | 2,800 | 0 / 0 | 0 | 0 |
| meadow | 41.49 | 2,773 | 1 / 1 | 341 | 0 |

Meadow Talia #1029, age eight, dies of thirst at tick 8746. Parcel #4187 retains
one grain owned by household #1025. Seven sampled withdrawal offers and seven
eating offers occur, but no estate collection starts. These are repeated samples,
not independent opportunities. No ordinary borrowed-tool recovery or later tool
use occurred. The placement correction was followed by these complete repeated
screens; earlier screen roots and logs remain available.

No survival, household viability, production or population benefit is established.
Household extinction does not automatically make an estate public. Broader estate
administration and informed incapacity/departure handover are distinct from this
physical custody contract. The entire owner programme remains incomplete.
