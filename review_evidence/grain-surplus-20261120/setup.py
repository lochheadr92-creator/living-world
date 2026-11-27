"""Copy working simulation source to a new directory and install experiment-only observation points."""
from pathlib import Path
import hashlib
import shutil
import sys

dest = Path(sys.argv[1])
dest.mkdir()
root = Path(__file__).resolve().parents[2]
shutil.copytree(root / 'src', dest / 'src')
shutil.copy(root / 'package.json', dest)
shutil.copy(Path(__file__).with_name('trace.ts'), dest)
digest = hashlib.sha256()
for p in sorted((dest / 'src').rglob('*.ts')):
    digest.update(p.relative_to(dest).as_posix().encode() + b'\0' + p.read_bytes())
(dest / 'source.sha256').write_text(digest.hexdigest())

def replace(file, old, new):
    p = dest / 'src' / 'sim' / (file + '.ts')
    code = p.read_text(encoding='utf8')
    if code.count(old) != 1:
        raise ValueError('Unrecognised instrumentation point: ' + old)
    p.write_text(code.replace(old, new), encoding='utf8')

for prefix in ['+', '-']:
    anchor = "  reasonBump(world, '" + prefix + "' + reason"
    replace('economy', anchor, f"  globalThis.grainLedger?.('{prefix}', k, reason, n);\n" + anchor)
anchor = "  reasonBump(world, 'x' + reason"
replace('economy', anchor, "  globalThis.grainLedger?.('x', k, reason, n);\n" + anchor)
anchor = 'const grain = moreGrain(world) ? baseGrain + Math.floor(baseGrain / 2) : baseGrain;'
replace('farming', anchor, "const target = globalThis.fieldTarget;\n        const grain = target ? Math.max(1, Math.floor(baseGrain * target / 21)) : (moreGrain(world) ? baseGrain + Math.floor(baseGrain / 2) : baseGrain);")
anchor = '    const r = stepTravel(world, p, a);'
replace('activities', anchor, '    const gx=p.x, gy=p.y;\n' + anchor + "\n    globalThis.grainLabour?.(world,p,a,'travel',Math.hypot(p.x-gx,p.y-gy));")
anchor = '  const res = h.work(world, p, a);'
replace('activities', anchor, "  globalThis.grainLabour?.(world,p,a,'work',0);\n" + anchor)

