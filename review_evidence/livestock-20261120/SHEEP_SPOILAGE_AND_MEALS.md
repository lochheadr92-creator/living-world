# Aspen sheep 1143 and the ten day-15 portions

Ordinary Aspen, Normal, arrivals on, starting at creation on branch `codex/withdraw-baseline-20261119`. Compared rules 263 with rules 264, which doubles the time before a household livestock carcass spoils. All times below are simulation ticks. Decision, consumption and cutting records use the tick during processing. End-of-step samples appear one tick later.

## Why four portions spoiled at rules 263

The sheep died at 27,843. Household 1086 first remembered its recoverable meat at the end of tick 28,765 while Kira was carrying grain to the barn. That used 923 ticks of a 4,800-tick window by the end-of-step measure. Kira and Ben were the two eligible workers. Arlo was a child. Privacy prevented other households from taking the sheep.

Kira cut seven portions and Ben five. Their 12 cuts used 1,440 work ticks, spread across several visits. For example, at 31,113 Kira had room for two and ranked butchery first. At 31,156 she still knew the sheep had meat and still had room for two, but a danger suppressed the option. Ben ran out of room after his cuts at 31,681 and 31,939. Both later went back when they had room.

Kira had room for two when she approached the final time. She cut at 32,439 and 32,559. At her next choice she remembered exactly four remaining and had room for zero. Ben also had room for zero. Both went to sleep. With 84 ticks left until 32,643 and zero work paid toward the next cut, even an immediate start would have fallen 36 ticks short of one portion. The deadline wrote off all four.

## Following the ten

At tick 36,000 every recovered portion still held was in one of three packs. Between that census and the last consumption there were no new cuts or meat transfers in the rules-263 replay. Each consumption below has a matching one-unit inventory withdrawal and eating ledger entry.

| Day-15 holder | Meat and quantity | Who ate it | Consumption ticks |
|---|---|---|---|
| Kira, household 1086 | 2 sheep | Kira | 38,056 and 38,066 |
| Ben, household 1086 | 2 sheep | Ben | 38,161 and 38,171 |
| Mona, household 1081 | 6 chicken | Mona | 38,241, 38,251, 40,453, 40,463, 42,802 and 46,806 |

All ten were eaten from their holders’ packs. Zero reached a home store, a shared table or a child after the day-15 census. Arlo had separately eaten two portions given to him before that census.

## Four-day result at rules 264

The former deadline passed with four sheep portions left. Ben returned and cut at 33,872, 33,992 and 34,645. Kira cut the last at 34,915, 2,272 ticks after the former deadline. This recovered all 16 sheep portions, alongside all 12 chicken portions. At day 15 eleven portions remained in packs. Mona ate six, Kira ate four, and Ben gave one to Arlo, who ate it at 38,412. The final portion was eaten by Mona at 46,368. Across the entire 28 portions, Mona ate 12, Kira eight, Ben four and Arlo four. All were eaten from packs. Shared tables received zero.

## Evidence and scope

The event files `spoilage-263.jsonl` and `spoilage-264.jsonl` record pack changes, cuts, transfers, individual and shared eating, choices during the sheep's lifetime, daily stock, world hashes and conservation. The replay used `spoilage_setup.py` with the existing discovery hooks on a disposable source copy, then `vite-node spoilage_trace.ts <version> <output> 26` with the checkout's dependencies. The `stock` hook also observes ledger counters and labels them unknown when they are outside a physical container. The eating totals use matched physical changes and consumption events.

These two runs describe the same Aspen start. They establish what happened to these portions. They do not measure settlement-wide hunger or recovery across other worlds.
