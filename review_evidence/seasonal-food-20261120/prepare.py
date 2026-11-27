"""Build the isolated item 4 experiment from the measured rules-266 tree."""
import io
import subprocess
import sys
import zipfile
from pathlib import Path
from shutil import copyfile

here = Path(__file__).resolve().parent
root = here.parents[1]
dest = Path(sys.argv[1])
dest.mkdir()
archive = subprocess.check_output(["git", "archive", "--format=zip", "9b96ae61",
                                   "src", "package.json", "scripts/observers/food_budget.ts"], cwd=root)
with zipfile.ZipFile(io.BytesIO(archive)) as files:
    files.extractall(dest)

def replace(file, before, after):
    path = dest / "src/sim" / (file + ".ts")
    source = path.read_text(encoding="utf8")
    if source.count(before) != 1:
        raise ValueError(f"Unexpected {file} source at {before}")
    path.write_text(source.replace(before, after), encoding="utf8")

replace("hardship", "regrowRate = (world: World)", "regrowRate = (world: World, moderate = false)")
replace("hardship", "DRY_REGROW : LEAN_REGROW", "DRY_REGROW : (moderate ? 0.40 : LEAN_REGROW)")
replace("hardship", "1 - WINTER_FOOD * winterDepth(world)", "1 - (moderate ? 0.40 : WINTER_FOOD) * winterDepth(world)")
replace("sources", "regrowRate(world)", "regrowRate(world, globalThis.moderateWild === true && ['berry_bush','fruit_tree','wild_grain','fish_spot'].includes(s.type))")
replace("economy", "  addItem(world.ledger.consumed, k, n);",
        "  globalThis.observeMeal?.(k, n, reason);\n  addItem(world.ledger.consumed, k, n);")
for name in ["probe.ts", "contract.ts"]:
    copyfile(here / name, dest / name)
for seed in ["aspen", "river"]:
    copyfile(here.parent / "grain-surplus-20261120" / f"{seed}-266-base.json", dest / f"{seed}-reference.json")
