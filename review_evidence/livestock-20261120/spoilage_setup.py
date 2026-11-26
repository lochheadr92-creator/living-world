"""Prepare a disposable simulation copy with the stock, meal and decision observers."""
from pathlib import Path
import shutil
import subprocess
import sys

here = Path(__file__).resolve().parent
scratch = Path(sys.argv[1])
subprocess.run([sys.executable, str(here / 'discovery_setup.py'), str(scratch)], check=True)
shutil.copyfile(here / 'spoilage_trace.ts', scratch / 'spoilage_trace.ts')
path = scratch / 'src/sim/decision.ts'
source = path.read_text(encoding='utf8')
anchor = '  const ranked = rankOptions(ctx);'
assert source.count(anchor) == 3
path.write_text(source.replace(anchor, anchor + '\n  globalThis.choice?.(ctx, ranked);'), encoding='utf8')
