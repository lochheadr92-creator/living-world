import json
from pathlib import Path
p=Path(__file__).parent
for seed in ("aspen","river"):
 rows={arm:json.loads((p/(seed+"-"+arm+".json")).read_text()) for arm in ("control","candidate")}
 c,t=(rows[a] for a in ("control","candidate"))
 assert c["temperatureDigest"]==t["temperatureDigest"],seed+" ambient temperatures diverged"
 def total(data,key): return sum(d.get(key,0) for d in data["days"])
 print(seed,"ambient_temperature_trace_identical=True")
 for key in ("createdGrain_total_world_not_crop_only","fieldHarvest_plot_to_person_grain","eatenNutrition","hungryAwakeTicks","awakeTicks","plotTicks","leanPlotTicks","winterPlotTicks","coldPlotTicks"):
  raw={"createdGrain_total_world_not_crop_only":"createdGrain","fieldHarvest_plot_to_person_grain":"fieldHarvest"}.get(key,key)
  print(" ",key,total(c,raw),"=>",total(t,raw),"delta",total(t,raw)-total(c,raw))
 for key in ("coldHumanTicks","veryColdHumanTicks","warmthDeficit"):
  a,b=c["days"][-1][key],t["days"][-1][key]
  print(" ","cumulative_final_"+key,a,"=>",b,"delta",b-a)
 for arm,data in rows.items():
  days=data["days"];den=max(1,total(data,"plotTicks"))
  mods=[sum(d["mean"+name]*d["plotTicks"] for d in days)/den for name in ("Care","Daylight","Soil")]
  print(" ",arm,"plot-day weighted mean care/daylight/soil",*[round(x,4) for x in mods])
 print(" ending population",c["days"][-1]["alive"],"=>",t["days"][-1]["alive"],"deaths",c["days"][-1]["dead"],"=>",t["days"][-1]["dead"])
