from pathlib import Path
import shutil, sys
root=Path(sys.argv[1])
root.mkdir()
shutil.copytree("src",root/"src")
shutil.copy("package.json",root)
shutil.copy("review_evidence/livestock-20261120/discovery.ts",root)
def probe(file,anchor,line):
    p=root/'src/sim'/file
    s=p.read_text(encoding='utf8')
    assert s.count(anchor)==1,anchor
    p.write_text(s.replace(anchor,line+'\n'+anchor),encoding='utf8')
probe('perception.ts','  if (home) {','  globalThis.scan?.(p,home,r);')
probe('economy.ts','    const left = have - m;',"""    if(k==='meat')globalThis.stock?.(items,-m,have);""")
probe('economy.ts','  items[k] = (items[k] ?? 0) + n;',"""  if(k==='meat')globalThis.stock?.(items,n,items[k]??0);""")
probe('economy.ts','  ledgerConsume(world, k, m, reason);',"""  if(k==='meat'&&m)globalThis.meatEvent?.('consume',items,m,reason);""")
probe('economy.ts','  recordGoodsFlow(world,fromTag,toTag,k,m,reason);',"""  if(k==='meat')globalThis.meatEvent?.('transfer',from,m,[fromTag,toTag,reason]);""")
probe('meals.ts',"  if (consume(world, m.table, k, 1, 'eaten at a shared meal')", """  if(k==='meat')globalThis.meatEvent?.('meal',m.table,1,[p.name,p.hhId,m.id]);""")
probe('carcass.ts','  // rules 241 (wolf_skin.ts)',"""  if(part==='meat')globalThis.meatEvent?.('cut',p.inv,1,[c.animalId,c.species,p.name,p.hhId]);""")

probe('act_resource.ts',"  const eaten = consume(world, from, k, 1, 'eaten');","  if(k==='meat')globalThis.meatEvent?.('eat',from,1,[p.name,p.hhId]);")
probe('hand_feeding.ts',"  const m=consume(w,p.inv,k,plan[k]??0,'eaten');","  if(k==='meat')globalThis.meatEvent?.('handfeed',p.inv,plan[k],[p.name,q.name,q.hhId]);")
probe('world.ts','        b.store.items[k] = n - lost;',"""        if(k==='meat')globalThis.meatEvent?.('spoiled',b.store.items,lost,b.id);""")
probe('world.ts','        pile.items[k] = n - lost;',"""        if(k==='meat')globalThis.meatEvent?.('spoiled',pile.items,lost,pile.id);""")
probe('knowledge.ts','  const b = snapshotEntity(world, e, world.tick);',"""  if(e.ent==='pile'&&e.carcass?.animalId===1143)globalThis.sight?.(p,e);""")
