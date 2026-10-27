# Layout repair: a real household reaches its home

**The repeated Briar journey now reaches construction and physical occupation.**
This is the accepted read-only run. The first measurement in `../2026-10-26-layout-v30/`
misused the planner's observer flag; its failures are retained and labelled invalid.

## Implementation and validation

Rules 30, documented in `docs/LAYOUT_CLAIMS.md`, derives layout reservations from
accepted active activities. It allows one home layout per household, protects
overlapping footprints plus a one-tile gap, releases on normal lifecycle boundaries,
and revalidates on resume. At commit, temporary occupancy permits a bounded 90-tick
wait; all real access checks remain. Claims do not obstruct walking or enter personal
candidate scoring. No resources, site caps or pathfinding rules were retuned.

Source: clean local `07939572eba98a6323372a7213846cccd3f17d4e`, published as
`249c863ab2cff021ec6ad41817ca6a795395cb2f`, identical tree
`cc9d6131843e08094f035fd65c116b83336d7932`. Production implementation is local
`d5a4308`, published as `8a5ae86fb3aed62d123cc0cdbac333423c807a88`.
GitHub API publication changes commit metadata, not source trees.

- Final relevant set: **81 tests / eight files pass**, including rules-29 full-state
  continuation, layout lifecycle, access, current worlds, inhabitant app and household views.
- Additional sensitive blocked-promise observer regression and layout set: **18/18 pass**.
  The overlap is deliberate; these are 82 unique checks, not 99 unique tests.
- A broader earlier set passed 151/152; its one failed new fixture had accidentally
  pinned the actor, preventing arrival. Unpinning that actor repaired the fixture.
  The final relevant set includes the corrected ownership/arrival test.
- Build/typecheck and whitespace checks pass. Historical references are unchanged;
  only the pre-change rules-29 reference was added.
- Full suite was attempted alone with four workers, bounded by `timeout ... 175s`.
  It exited 124 with no final test summary. **Full suite is pending, not passed.**
  Its partial output is `full-suite-budget.txt`; desktop instructions are below.

## Same selection, ordinary decisions

River, current rules 30, Normal, 28 founders, immigration off, 9600 ticks. Before
stepping, select the first household by ID with two adults and no solid home:
Briar #1103, Mira #1106 and Emre #1107, with children Viktor #1108 and Theo #1109.
They begin in lean-to #1105. This is the same selection policy and household as
the earlier stalled v29 run, not a household chosen afterwards for success.

| Link | Recorded outcome |
|---|---|
| Need and choice | The adults know their own lean-to; actual accepted layouts retain the goal of a proper hut. |
| Avoid duplicate layout | At tick 2566 a second attempt fails honestly: the household already has a home layout under way. |
| Real site | Mira creates hut site #2886 at (44,36), tick 3623. Its requirements are eight wood and four stone. |
| Physical materials | Emre delivers two wood; Ivy two wood and one stone; Emre one stone; Tomas four wood; Ivy two stone. Six transfers total exactly eight wood/four stone. |
| Work and ownership | Hut #3528 completes at tick 5516, using the real site and footprint. Household home changes from #1105 to #3528. |
| Physical occupation | Entry is observed for Emre at 5929, Theo at 6145, Mira at 6146 and Viktor at 6154. They enter to sleep; later use is also recorded. |

Site creation and completion use the engine's recorded ticks. Entry timestamps are
the observer's post-step world tick. Transfers retain their original engine tick.
The raw records preserve these distinctions; none is a scripted animation.

The completed site was last observed with all eight wood and four stone in `used`.
Inventory movement and work have real costs. Goods are fungible: the transfer log
shows actual source/container movements, not an invented identity for each plank.
No per-unit source attribution beyond those records is claimed.

## Whole-world checks

- **9617 claim checks**: every simulated tick plus every accepted layout start.
  No duplicate household-home claim or overlapping accepted footprint/access gap.
  Sixteen accepted layout starts across the world; maximum three simultaneous claims.
- **164 personal inspections** leave complete serialized state unchanged.
- **41/41 exact saved-state comparisons** agree with an independently generated,
  unobserved twin.
- The declared day-one fallback save occurs at 2400, before Briar's site exists.
  **31/31 subsequent exact continuation checkpoints** agree through layout,
  delivery, construction and occupation. The staged regression separately saves
  during the transient-occupant wait and verifies identical completion.
- Ledger and tool checks pass at all checkpoints. Zero failures; runner exit 0.
  All 28 residents survive.

The earlier v29 family remained in its lean-to after four days. This v30 trajectory
completes the chain, but it changes several other choices too. It does not isolate
which component contributes how much, prove general housing benefit, or establish
long-run civilisation, human usability or universal replay correctness.
No fresh rendered-browser review is claimed. Existing inspector fields expose the
actual wait/failure reason, verified by a read-only contract.

## Evidence and reproduction

`report.json` contains settings, source, initial/final state, invariants and checkpoints.
`story.json.gz`, `activities.json.gz`, `observations.json.gz` and `transfers.json.gz`
retain the actual records. The site, completed, occupied and final saves are compressed
world snapshots. A retained layout-failure snapshot may concern another attempt;
do not run the older footprint-specific diagnostic against it as though it were
the v29 (47,37) case.

Run with a fresh directory:

```sh
npx --no-install vite-node scripts/shelter_journey.ts --out home_evidence/new-v30-journey
```

Both verification runners now explicitly request observer mode. The old invalid
measurement is not a reason to change production promise behaviour or introduce a
new rules generation. `observer_planning_mode.test.ts` proves the distinction:
real deciding can update a blocker; read-only observation cannot.

## Desktop full-suite check

The cloud attempt reached its run budget. On the owner's 24-core Windows machine,
allow roughly **2–5 minutes for tests**, depending on load, plus dependency install.
Use a fresh worktree so existing local work is preserved. Run each PowerShell line
separately; the commands do not require moving the existing checkout to main.

```powershell
git -C "C:\dev\Claude Experiment\living-world" fetch origin main
```

```powershell
git -C "C:\dev\Claude Experiment\living-world" worktree add "C:\dev\living-world-layout-v30-validation" origin/main
```

```powershell
cd "C:\dev\living-world-layout-v30-validation"
```

```powershell
npm ci
```

```powershell
New-Item -ItemType Directory -Force layout_validation | Out-Null
```

```powershell
npm test *> layout_validation\report.txt
```

Return only `layout_validation\report.txt`, not progress output. If that worktree
path already exists, use its recorded revision or choose another fresh path; do not
reset or overwrite unrelated work. Unit tests start afresh on rerun; this is not the
lab's resumable multi-seed runner.

Existing modules touched and why: activities accepts/reacquires claims; the build
handler revalidates and waits; world hashing includes claim/wait state; rulesversion
preserves older generations. The owned layout module avoids a second reservation
registry. Observer scripts use the correct read-only planning flag and retain audits.
