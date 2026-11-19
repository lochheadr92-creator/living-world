"""Create a disposable instrumented copy from the Aspen replay checkout. Run from its root."""
from pathlib import Path
import shutil, sys
root = Path(sys.argv[1])
root.mkdir()
shutil.copytree("src", root / "src")
shutil.copy("package.json", root)
shutil.copy("review_evidence/livestock-20261120/trace.ts", root)
def insert(module, anchor, probe):
    path = root / "src/sim" / (module+".ts")
    s = path.read_text(encoding="utf8")
    assert s.count(anchor)==1, anchor
    path.write_text(s.replace(anchor, probe+"\n"+anchor),encoding="utf8")
for prefix, op in [("+","ledgerCreate"),("-","ledgerConsume"),("x","ledgerSpoil")]:
    insert("economy", "  reasonBump(world, '"+prefix+"' + reason", "  if(k==='grain')globalThis.grainTrace?.('flow','"+prefix+"'+reason,n);")
insert("decision","    record(world, p, ctx, ranked, o, trigger, why, act);\n    startActivity", """    if(ranked.some(q=>q.key.startsWith('mix_feed:')))globalThis.grainTrace('choices',o.key.startsWith('mix_feed:')?'mix_feed':o.kind,1);""")
insert("livestock","  if(grainFeedEnabled(w)&&!ctx.critical", """  globalThis.grainTrace('stationChecks',ctx.critical?'critical':free(w,p,'grain')<1?'no spare grain':foodUnits(p.inv)<=2?'food reserve':(station.items?.stock_feed??0)>=6?'stocked':'eligible',1);""")
insert("livestock","   consume(w,p.inv,'grain',1,'mixing grain feed');","""   globalThis.grainTrace('batch',housing.type+' '+housing.id+' hh '+p.hhId,1);""")
insert("livestock"," if(clutch)s.produceWork=0;", """ globalThis.grainTrace('events',[w.tick,'breeding',animal.type,animal.id,father,clutch,s.food,s.water]);""")
insert("livestock","  if(op==='egg'||op==='milk'){const k=", """  if(op==='egg')globalThis.grainTrace('events',[w.tick,'egg',animal.id,p.id,s.produceWork]);""")
insert("livestock"," if(a.health<=0){a.health=.001;", """ if(a.health<=0)globalThis.grainTrace('events',[w.tick,'neglect',a.type,a.id,s.housing,s.food,s.water]);""")


insert("activities","  recordPay(world, p, a,outcome);","""  if(a.data.op==='mix_feed')globalThis.grainTrace('feedEnds',outcome+' '+detail,1);""")
insert("livestock"," // Kept adults sharing an enclosure", """ if(home&&a.type==='chicken'&&s.sex==='f'&&adult(w,a)&&(w.tick+a.id)%120===0){
    const male=w.animals.find(b=>b.type==='chicken'&&b.sheep?.housing===home.id&&b.sheep.sex==='m'&&adult(w,b));
    const why=s.pregnancy?'brooding':w.tick<s.breedAfter?'cooldown':s.water<.5?'hen water':s.food<11?'hen food':(s.produceWork??0)<DAY?'no egg':!male?'no adult male':male.sheep.water<.5?'male water':male.sheep.food<11?'male food':'ready';
    globalThis.grainTrace('breedChecks',a.id+' '+why,1);
 }""")
