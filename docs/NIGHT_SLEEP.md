# A night's sleep (rules 283)

Asked for: Ryan, 28 November 2026, "begin next step" after the free-time split (`docs/FREE_TIME.md`), then "land and push". Built as 282 on
`claude/home-evening-282` and renumbered to 283 when the review repairs took 282. Code: `src/sim/night_sleep.ts`. Tests: `tests/night_sleep.test.ts`.
Pin: `tests/v283_continuation.*`.

## What was wrong

Resting awake took 11.1% of the waking time of people of 12 and over, more than all their free time. A probe of meadow (20 days, rules 281,
`C:\dev\_claude_scratch\home_evening`) showed why: grown people lay down at 18 to 20 h (bedtime 0.8 + chrono of the day), slept 4.8 hours on
average, 473 of 576 sleeps ended "rested" between 23 and 5 h, and then they waited awake for the light (`optShelter`).

## The rule

Two parts, each switched (`rich-no-night-sleep`, `-through`, `-evening`):

- **through.** Anybody asleep while the light is 0.55 or less does not get up because rested; they sleep till the morning light. Parched, starving,
  frozen or in danger still wakes them. (Children under eight have had this since rules 280.)
- **evening.** A grown person's bedtime is 0.88 + chrono of the day, not 0.8. The evening that the fire, the hall and talk are offered in runs to it;
  sleep is not drawn by the clock before it (tiredness still draws it); the wait for the light is not offered in the evening before it.

## Measured (28 November 2026, at the code's first number 282)

- Probe, meadow 20 days: waiting awake in the dark 7.8% to 1.2% of waking time; mean sleep 4.8 to 6.9 h; most sleeps end at 6 h.
- Ten runs of `docs/FREE_TIME.md` (`C:\dev\lw_labs\free_time\r282` against `r281`; a description): resting awake at home 11.7% to 4.2%; free
  time at it 10.5% to 10.9% (with walking 12.2% to 13.5%); waking time down about 10%.
- Saves lab, six rules-256 saves raised, 8 days, arm `rich-no-night-sleep` against control (`C:\dev\lw_labs\night282\lab\report.txt`), larger
  than chance: spare time 151 against 95 (6 of 6); evening fire sittings 53 against 26; stories told 32 against 20; chats 115 against 151 (fewer);
  mean hunger 60.3 against 63.7 (a little hungrier, 6 of 6); huts 31.6 against 30.3. People not distinguishable from chance.

Costs to watch: a little more hunger, fewer casual chats, more "too cold to sleep" wake-ups in the probe (55 to 95). Not measured: runs past 30 days,
deaths, the look in the app.
