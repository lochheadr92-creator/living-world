"""Add a separate meal-cost replay to a fresh copy of the original instrumented source."""
from pathlib import Path
import shutil
import subprocess
import sys

here = Path(__file__).resolve().parent
dest = Path(sys.argv[1])
subprocess.run([sys.executable, str(here/'setup.py'), str(dest)], check=True)
shutil.copy(here/'meal_labour.ts', dest)
def inject(path, anchor, extra):
    source = path.read_text(encoding='utf8')
    if source.count(anchor) != 1:
        raise ValueError(anchor)
    path.write_text(source.replace(anchor,extra),encoding='utf8')
trace = dest/'trace.ts'
inject(trace,'const [seed,',"""import {mealStep, grainBite, mealReport} from './meal_labour';
globalThis.grainBite=grainBite;
const [seed,""")
inject(trace,'  const key = category(w,a);','  mealStep(a,phase,distance);\n  const key = category(w,a);')
anchor = "  const eaten = consume(world, from, k, 1, 'eaten');"
inject(dest/'src/sim/act_resource.ts',anchor,anchor+"\n  if(eaten && k==='grain') globalThis.grainBite(a,eaten);")
inject(trace,'opening,closing:stock(),ledger','grainMeals:mealReport(),opening,closing:stock(),ledger')

