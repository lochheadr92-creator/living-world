"""Summarize verified daily observations in this directory."""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
foods = ("berries", "fruit", "fish", "grain")

def measures(days):
    def values(key):
        return {f: sum(d[key].get(f, 0) for d in days) for f in foods}
    collected = {f: values("gather")[f] + values("atSource")[f] for f in foods}
    return {
        "regrown": values("regrown"), "collected": collected, "eaten": values("eaten"),
        "field_harvest": sum(d["fieldGrain"] for d in days),
        "intake": sum(d["intake"] for d in days),
        "hungry_awake_pct": round(100 * sum(d["hungryAwakeTicks"] for d in days) / sum(d["awakeTicks"] for d in days), 2),
        "lean_ticks": sum(d["lean"] for d in days), "overlap_ticks": sum(d["overlap"] for d in days),
        "alive": days[-1]["alive"], "deaths": days[-1]["dead"],
    }

for seed in ["aspen", "river"]:
    for arm in ["control", "moderate"]:
        days = json.loads((here / f"{seed}-{arm}.json").read_text())["days"]
        assert len(days) == 36
        print(seed, arm, json.dumps(measures(days)))
        winter = [d for d in days if (d["day"] - 1) % 12 >= 8]
        print("  winter", json.dumps(measures(winter)))
