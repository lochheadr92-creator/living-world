# Doorway access on the five remembered-room visits

The earlier trace is commit 3f23fba9 on codex/withdraw-baseline-20261119. This diagnostic changes only bundled code on the selected replay. Each of the five native controls reproduced the original departure, same-tick different-space failure and day-97 hash. All 15 case/arm combinations passed conservation.

## Access and retries

Four visitors' attempts reached a doorway and used the existing household admission check to enter. On the later Isla II attempt, Vik II became visible outdoors and the ordinary approach to a visible person took over. All five therefore reached contact. The welfare handler recorded two helped visits, one person already fine and two failed handovers. The two Isla II starts and the two Ulric starts are independent forks, not cumulative journeys.

In the original day, Isla II tried Vik II again 145 ticks later using the same room sighting. Ulric tried Pavel again 233 ticks later with a sighting 231 ticks newer. In all five ordinary-door forks the pair made zero later welfare visit launches before day 97. This observation window ranges from 388 to 1,843 ticks after the original launch.

The closed-door forks deliberately denied the visitor admission at arrival. Four attempts reached the door, were refused, and never relaunched before the cutoff. The offer was considered and held on two later ticks for the earlier Isla II case and one later tick in each Ulric case. Bram had no later eligible decision recorded. In the later Isla II case, outdoor contact succeeded without a door attempt. The refusal guard applies to the same recent room record; this experiment does not establish indefinite suppression, or the frequency of naturally blocked doors.

See CASES.md for the per-case comparison and PROTOCOL.md for the replay procedure. The rule was isolated to one pair from one decision onwards in each replay. These results cannot establish a population-wide or long-term effect.

## What happened at contact

In each independent Isla II fork, Vik II was hungry and received one fruit. Bram reached Cole II indoors after 297 ticks and finished the check 11 ticks later. Cole II was neither hungry, thirsty nor hurt. Ulric and Pavel were both in room 6117 in both forks. Pavel was thirsty, the plan requested one water, Ulric still held one water, and the transfer returned zero. The transfer implementation in src/sim/economy.ts caps ordinary water by the room in the recipient’s inventory. Given the measured positive request and supply, this establishes that Pavel lacked room for one water unit. The generic welfare failure text incorrectly suggests Ulric lacked the supply. These cases measure delivery to inventory, not drinking.

TypeScript passed. The existing habitation, resident care and known welfare suites passed 56 tests. The diagnostic did not change product simulation files.
