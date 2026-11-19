"""Run from the feature checkout; point the argument at a new temporary directory."""
from pathlib import Path
import sys,shutil
root=Path(sys.argv[1])
root.mkdir()
shutil.copytree('src',root/'src')
shutil.copy('package.json',root)
(root/'scripts').mkdir()
s=Path('scripts/livestock_salvage_probe.ts').read_text(encoding='utf8')
s=s.replace('const version=',"const flows:Record<string,number>={};\nglobalThis.meatFlow=(reason,n)=>{flows[reason]=(flows[reason]??0)+n;};\nconst version=")
s=s.replace('bodies:[...bodies.values()]','initialMeat:w.ledger.initial.meat??0,flows,bodies:[...bodies.values()]')
(root/'scripts/probe.ts').write_text(s,encoding='utf8')
p=root/'src/sim/economy.ts'
s=p.read_text(encoding='utf8')
for sign in ['+','-','x']:
    anchor="  reasonBump(world, '"+sign+"' + reason, n);"
    assert s.count(anchor)==1
    s=s.replace(anchor,"  if(k==='meat'||k==='pork')globalThis.meatFlow(k+' "+sign+"'+reason,n);\n"+anchor)
p.write_text(s,encoding='utf8')
