"""Prepare the isolated LW-N10-05 counterfactual from frozen rules-266 source."""
import io, subprocess, sys, zipfile
from pathlib import Path
from shutil import copyfile
here=Path(__file__).resolve().parent
root=here.parents[1]
dest=Path(sys.argv[1])
dest.mkdir(parents=True,exist_ok=False)
archive=subprocess.check_output(["git","archive","--format=zip","9b96ae61","src","package.json","scripts/observers/food_budget.ts"],cwd=root)
with zipfile.ZipFile(io.BytesIO(archive)) as z: z.extractall(dest)
p=dest/"src/sim/hardship.ts"
s=p.read_text(encoding="utf8")
old="export const growthRate = (world: World): number => (active(world) ? (world.hardship ? (world.hardship.kind === 'dry' ? DRY_GROWTH : LEAN_GROWTH) : 1) * (1 - WINTER_CROPS * winterDepth(world)) : 1);"
new="export const growthRate = (world: World): number => { const trial = (globalThis as { cropClimateTrial?: boolean }).cropClimateTrial === true; return active(world) ? (world.hardship ? (world.hardship.kind === 'dry' ? DRY_GROWTH : (trial ? 0.50 : LEAN_GROWTH)) : 1) * (1 - (trial ? 0.60 : WINTER_CROPS) * winterDepth(world)) : 1; };"
if s.count(old)!=1: raise ValueError("Unexpected frozen crop growth formula")
p.write_text(s.replace(old,new),encoding="utf8")
p=dest/"src/sim/farming.ts"
s=p.read_text(encoding="utf8")
old="const warm = w.temp < 4 ? 0.4 : 1;"
new="const trial = (globalThis as { cropClimateTrial?: boolean }).cropClimateTrial === true;\n      const warm = w.temp < 4 ? (trial ? 0.7 : 0.4) : 1;"
if s.count(old)!=1: raise ValueError("Unexpected frozen crop cold formula")
p.write_text(s.replace(old,new),encoding="utf8")
for name in ("probe.ts","summarize.py"): copyfile(here/name,dest/name)
for seed in ("aspen","river"):
    copyfile(root.parent/"lw-withdraw-baseline-20261119/review_evidence/grain-surplus-20261120"/(seed+"-266-base.json"),dest/(seed+"-reference.json"))

