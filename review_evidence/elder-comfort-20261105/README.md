# Elder comfort, access and participation: ordinary diagnosis (5 November 2026)

Brain priority findings, item 4 (and the domain plan's "Fourth: assess elder warmth, shelter, manageable work and social access").
Starting evidence: every one of six selected elders died in the rules-153 investigation, but 7 of 9 initial elders survived in the best
Large world, and Kai (73, alone) recovered from 82 to 100 health yet spent 12.5% of his time warming and wanted a solid home.
The brief: sample more ordinary elders and comparable households to separate age from shelter, isolation, weather, skills and
personality; preserve agency; no blanket retirement, free warmth, forced company or new shelter system from one case.

## Method

`probe.ts`: ordinary Normal worlds (forest, river, meadow, life-stages-6) and Large worlds (forest, river, life-stages-6), 25 days,
arrivals on, rules 161, read-only sampling every 120 ticks of every living person: stage, needs, health, whether their household
has other living members, their home's type and condition, and what they are doing. Each founding elder (62 or older at the start) is
also tracked individually. All seven runs' exact unsampled twin matches and conserves goods (`*-r161.json`). Seven worlds give 32
founding elders (8 Normal, 24 Large).

## What was found

1. **Survival.** 20 of 32 founding elders were alive at day 25. In the Large forest world the whole population collapsed (elders 0 of 7,
   adults 5 of 60, children 5 of 30). Without it, elders 20 of 25 (80%) against adults 169 of 195 (87%). By world, elders against adults:
   Normal forest 1/2 and 6/17; river 1/2 and 11/18; meadow 2/2 and 17/17; life-stages-6 2/2 and 17/17; Large river 5/8 and 54/62;
   Large life-stages-6 9/9 and 64/64. Elders did worse than adults only in Large river, where the three deaths came on days 24.1 to
   24.8 (two hunger, one injuries). The numbers are too small to call a difference.
2. **Needs, all worlds (143,305 adult and 15,410 elder samples).** Elders against adults: warmth below 25, 7.4% against 6.9%;
   hunger below 25, 9.7% against 7.1%; health below 60, 3.2% against 1.7%; social below 30, 5.9% against 3.9%. Warmth is
   the same. The elder shortfall is in hunger and health, a modest age effect. It is consistent with the deliberate frailty rules
   (`life.ts elderFactor`: an elder carries 75% of a grown person's load and recovers health at 75% speed; `people.ts`, `needs.ts`).
3. **Participation.** Elders spent 43.5% of sampled time on work, against 45.3% for adults, and 14.7% warming, against 17.2%. They did
   not withdraw, and they did not spend more time warming than adults do (Kai's 12.5% is ordinary). Adults rested 29.6%, elders 34.5%
   in the first four worlds.
4. **Isolation.** 56% of elder samples are of an elder with no other living household member. Those elders: social below 30,
   7.2% against 4.3% with others; hunger below 25, 11.0% against 8.0%; health below 60, 4.0% against 2.3%. Adults alone show the same
   pattern (social below 30, 9.6% against 3.1%). Isolation costs about the same at any age; it is not elder-specific. Most elders
   live alone: 17 of 32 founding elders were alone 90% or more of the run, survivors and the dead alike (`elders` in each JSON).
5. **Home type.** A solid home (hut or house) shows no warmth advantage in sampled time: elders warmth below 25, 8.4% in solid homes
   against 6.9% in lean-tos; adults 6.7% against 6.9%. Sampled warmth is dominated by where people are working and when (weather,
   night, being outdoors), so this does **not** say a hut fails to keep people warm; an indoor, night-time audit of the shelter system is
   a separate question, queued below.
6. **Alone in a solid home.** These elders look worse (hunger below 25, 18.4%; social below 30, 19.0%; n = 1,565 samples). They come
   mainly from a handful of elders: Petra and Bram (forest), Pavel (meadow) and Ben, Xavi and Sofia (Large river), with mixed outcomes
   (Petra died of hunger at day 21, the others lived), so this is not a result.
7. **Causes of elder death (12 of 32):** hunger 8, exposure 2, fever 1, injuries 1. Eight of the 12 died in famine-collapse conditions in
   which adults died too.

## Decision

**No rules change.** The ordinary evidence shows no elder-specific gap beyond the deliberate frailty, and the brief rules out acting
on a single case. Adverse findings are kept: elders have somewhat more hunger and health trouble than adults, and isolation costs
social need and food at any age.

Queued with the evidence:
- *Shelter value*: warmth indoors, at night, by home type and condition, for everyone. A wider audit of the existing shelter system.
- *Alone, in a solid home*: needs more ordinary elders (a lab fork with matched households) before any claim.
- *Frailty calibration*: how much of the elder hunger and health gap `elderFactor` explains; a lab ablation if it is ever wanted.

## Retained attempt

`attempt1-normal-aggregate-only/`: the first run, four Normal worlds with group means only (8 elders). It showed elders about level with
adults but was too small to separate age from household, so the Large worlds and the per-elder table were added.
