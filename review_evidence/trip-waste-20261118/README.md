# Trip waste measurement, 18 November 2026 (SCRATCH ONLY, rules 250)

Evidence for the branch `scratch/free-block-20261117`: why a resident's walking is wasted, measured on the day 48 saves of three worlds (aspen, river, gen-4), 30 days a run, one run per arm. A description, never a rate. No benefit is claimed. Nothing here is a rules version, a pin or a lab arm, and nothing under `src/` changed; the branch is a record, not a proposal for main.

Stage 1 of the 17 November plan (brain note `knowledge/living-world/2026-11-17-research-index-viability-and-plan`), after the trip waste source read of 17 November: measure, not argue from source, three things.

## What was found (`report.md`)
- **Loads: TINY LOADS ARE THE PACK.** 67 to 74% of gathers that did their job took 2 units or fewer; of those, 55 to 62% began with room for 2 units or fewer, 29 to 34% took less than planned, about 10% had room and a small plan. The pack was 65 to 69% full when the walk began.
- **Withdraws: EMPTY WITHDRAWS ARE ACCESS, ACCESS IS EARMARK.** 29 to 40% of adult withdraws arrived and took nothing; 94 to 95% of those found the stock there and were allowed none; stale belief is under 2%. The stock was earmarked to other people in 96, 98 and 65% of cases (gen-4 also 35% guest stock). Planning counts a workshop's output as available to anyone who may use it (`production.ts collectOptions`, `site_supply.ts benchStock`, rules 229); the transfer gives finished goods only to the person who ordered the batch (`facilities.ts withdrawAllowance`, `usableUnits`). The bakery is the largest case.
- **Dropped walks: DROPPED WALKS ARE REVIEW SWITCHES.** About a fifth of adult walking ticks are walks that ended before arrival; of the gather and withdraw ones, 68 to 77% were "something better came up" or "switched to something else", 15 to 16% "the place looked empty".
- The three pieces as shares of all awake time are about 1 to 2% (empty withdraws) and 7 to 9% (dropped walks, not all waste), against a life gap of 15 to 18% to a proposed 30% (LIKELY, arithmetic in the report).

## What is here
- `report.md` the one page report; `briefs-and-readings/` the reading (`TRIP_WASTE_READING.md`, SHA-256 `c223694b…`) and its two amendments (`…AMENDMENT_1.md` `ad35c7f9…`, replacing question 1 before any load table; `…AMENDMENT_2.md` `be94dbf6…`, written before wave 2); `scripts/` the launchers and the two tables scripts (they hold the absolute paths of the scratch folder); `wave1/` tables and commands of the first wave; `wave2/` tables, commands, and per world the `report.json` and `withdraws.jsonl` (one row per withdraw, with belief, truth at departure, arrival and the last tick before the transfer, the sim's own allowance and earmarks, and how it ended); `verification-before.txt` and `verification-after.txt`.
- The source: `scripts/observers/withdraw_check.ts` (new, read-only) and `scripts/free_probe.ts` (one flag, `--withdraw-check`).

## What is not here
The first wave's run folders, the nine controls' `trips.jsonl` (38 MB each, in `out\free` on TheWeapon) and the day 48 saves stay in `C:\dev\_claude_scratch\regime-20261117\` (`out\trip-waste`, `out\trip-waste2`, `out\free`, `saves`, `logs`). They are not in git. The brain note `projects/claude-living-world` has the twelfth checkpoint of 17 and 18 November.

## Checks
All six runs end on the hash of their A control (`168d98f7`, `8f513a37`, `523f2943`), purity 600 of 600, conservation ok; wave 2's counts equal wave 1's. The observer calls the sim's own `accessLevel` and `withdrawAllowance` read-only; the equal hashes and the purity check are the evidence it changed nothing.
