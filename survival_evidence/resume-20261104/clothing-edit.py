from pathlib import Path
root=Path('.')
def edit(name,old,new):
 p=root/name;s=p.read_text(encoding='utf-8');assert old in s,(name,old[:90]);p.write_text(s.replace(old,new),encoding='utf-8')
edit('src/sim/types.ts',"| 'jar' | 'spear';","| 'jar' | 'spear' | 'garment' | 'blanket' | 'bedding';")
edit('src/sim/types.ts',"| 'iron' | 'flour';","| 'iron' | 'flour' | 'fibre';")
edit('src/sim/types.ts',"export interface Tool {","export interface Tool {\n  textile?: {wet:number;equipped:boolean};")
edit('src/sim/constants.ts',"'jar', 'spear'];","'jar', 'spear', 'garment', 'blanket', 'bedding'];")
edit('src/sim/constants.ts',"'iron', 'flour'];","'iron', 'flour', 'fibre'];")
edit('src/sim/constants.ts','export const WEIGHT: Record<ItemKind, number> = {','export const WEIGHT: Record<ItemKind, number> = {\n  fibre:.25, garment:.75, blanket:.75, bedding:1,')
edit('src/sim/constants.ts','export const ITEM_LABEL: Record<ItemKind, string> = {',"export const ITEM_LABEL: Record<ItemKind, string> = {\n  fibre:'bast fibre', garment:'fibre garment', blanket:'fibre blanket', bedding:'fibre bedroll',")
edit('src/sim/constants.ts','export const TOOL_DEFS: Record<ToolKind, ToolDef> = {',"export const TOOL_DEFS: Record<ToolKind, ToolDef> = {\n  garment:{label:'fibre garment',hand:null,wear:.002,blurb:'insulation while worn'},\n  blanket:{label:'fibre blanket',hand:null,wear:.002,blurb:'insulation while sleeping'},\n  bedding:{label:'fibre bedroll',hand:null,wear:.002,blurb:'insulation beneath its sleeping owner'},")
for f,marker,values in [('labels.ts','export const ITEM_ICON: Record<ItemKind, string> = {',"fibre:'fibre',garment:'garment',blanket:'blanket',bedding:'bedding',"),('dialogue.ts','export const ITEM_PHRASE: Record<ItemKind, string> = {',"fibre:'bast fibre',garment:'garment',blanket:'blanket',bedding:'bedroll',"),('social.ts','const base: Record<ItemKind, number> = {',"fibre:1.2,garment:5,blanket:5,bedding:6,")]:edit('src/sim/'+f,marker,marker+'\n  '+values)
for f in ['buildings.ts','toolreg.ts']:edit('src/sim/'+f,"'jar', 'spear']","'jar', 'spear', 'garment', 'blanket', 'bedding']")
edit('src/sim/toolreg.ts',"k === 'spear';","k === 'spear' || k === 'garment' || k === 'blanket' || k === 'bedding';")
edit('src/sim/toolreg.ts','t.holder = toId;','t.holder = toId;\n      if(t.textile)t.textile.equipped=false;')
edit('src/sim/tools.ts','  world.tools.push(t);',"  if(kind==='garment'||kind==='blanket'||kind==='bedding')t.textile={wet:0,equipped:false};\n  world.tools.push(t);")
edit('src/sim/perception.ts',"'smoked_meat'];","'smoked_meat', 'fibre', 'garment', 'blanket', 'bedding'];")
edit('src/sim/clothing.ts',"import {reservedOf} from './reservations';","import {reservedFor} from './reserved_goods';")
edit('src/sim/clothing.ts',"reservedOf(p,'fibre')","reservedFor(w,p,'fibre')")
edit('src/sim/clothing.ts',"item:'garment',amount:1,utility:48", "data:{items:{garment:1}},amount:1,utility:48")
edit('src/sim/recipes.ts',"import { CART_COST }", "import {runsRulesVersion} from './rulesversion';\nimport type {World} from './types';\nimport { CART_COST }")
edit('src/sim/recipes.ts','export interface Recipe {','export interface Recipe {\n  minRules?:number;')
edit('src/sim/recipes.ts','export const RECIPES: Recipe[] = [',"""export const recipeAvailable=(w:World,r:Recipe):boolean=>!r.minRules||runsRulesVersion(w,r.minRules);
export const RECIPES: Recipe[] = [
  {id:'strip_fibre',label:'bast fibre',doing:'Separating and twisting bast fibre',at:'timber_yard',inputs:{wood:1},fuel:{},work:60,burn:0,outputs:{fibre:3},waste:{},wasteWhy:'',skill:null,workers:1,serves:['fibre'],benefit:'Three fibre bundles separated from gathered wood.',minRules:124},
  ...(['garment','blanket','bedding'] as const).map((kind):Recipe=>({id:`weave_${kind}`,label:`fibre ${kind}`,doing:`Weaving a ${kind}`,at:'timber_yard',inputs:{fibre:kind==='bedding'?4:3},fuel:{},work:100,burn:0,outputs:{},toolOut:{kind,tier:0},waste:{},wasteWhy:'',skill:null,workers:1,serves:[kind],benefit:'Paid personal insulation with finite wear and wetness.',minRules:124})),""")
edit('src/sim/recipes.ts',"    set.add('wood');\n    set.add('planks');", "    set.add('garment');set.add('blanket');set.add('bedding');\n    set.add('wood');\n    set.add('planks');")
for f in ['production.ts','facilities.ts','project_compile.ts']:
 p=root/'src/sim'/f;s=p.read_text(encoding='utf-8');s="import {recipeAvailable} from './recipes';\n"+s;p.write_text(s,encoding='utf-8')
edit('src/sim/production.ts','  if(r.preservation&&!hasPreservation(ctx.world))return;', '  if(!recipeAvailable(ctx.world,r)||r.preservation&&!hasPreservation(ctx.world))return;')
edit('src/sim/facilities.ts','  const accessibleFood=r.preservation?',"  if(!recipeAvailable(world,r))return 'this recipe is not available under these rules';\n  const accessibleFood=r.preservation?")
edit('src/sim/project_compile.ts','for(const r of recipesMaking(item)){','for(const r of recipesMaking(item)){\n   if(!recipeAvailable(world,r))continue;')
edit('src/sim/project_compile.ts','other.id!==r.id&&facilitiesOf', 'other.id!==r.id&&recipeAvailable(world,other)&&facilitiesOf')
edit('src/sim/production.ts',"import {hasProjectAcquire}","import {hasClothing,isTextile,TEXTILES} from './clothing';\nimport {hasProjectAcquire}")
edit('src/sim/production.ts',"'iron', 'flour', 'bread'];","'iron', 'flour', 'bread', 'fibre'];")
edit('src/sim/production.ts',"if (t.kind === 'basket' || t.kind === 'jar' || t.tier === 1)","if (isTextile(t.kind) || t.kind === 'basket' || t.kind === 'jar' || t.tier === 1)")
edit('src/sim/production.ts',"if (t.kind === 'jar' || t.wear < 52)","if (isTextile(t.kind) || t.kind === 'jar' || t.wear < 52)")
edit('src/sim/production.ts',"  const out: Demand[] = [];", """  const out: Demand[] = [];
  if(hasClothing(world)){
    const cold=p.needs.warmth<65||world.weather.temp<12;
    if(cold)for(const kind of TEXTILES){
      const childNeeds=kind==='garment'&&ctx.seenPersons.some(s=>s.child&&s.cold&&!s.carrying.includes('garment')&&ctx.dependents.some(d=>d.id===s.id));
      const target=1+(childNeeds?1:0),have=p.inv[kind]??0;
      if(have<target)out.push({item:kind,qty:target,have,base:kind==='garment'?32:25,why:childNeeds?'insulation for me and the cold child':'personal insulation against the cold',tag:'craft'});
    }
    if(toolsHeldBy(world,p.id).some(t=>isTextile(t.kind)&&t.wear>=45)&&(p.inv.fibre??0)<1)out.push({item:'fibre',qty:1,have:0,base:28,why:'mend worn insulation',tag:'craft'});
  }""")
edit('src/sim/act_production.ts',"import {pileAccessBlocker}","import {textileBegin,textileWork} from './clothing';\nimport {pileAccessBlocker}")
edit('src/sim/act_production.ts',"  begin(world, p, a) {\n    if (a.data.cartId)","  begin(world, p, a) {\n    if(a.data.textile)return textileBegin(world,p,a);\n    if (a.data.cartId)")
edit('src/sim/act_production.ts',"  work(world, p, a): WorkResult {\n    a.progress++;", "  work(world, p, a): WorkResult {\n    if(a.data.textile)return textileWork(world,p,a);\n    a.progress++;")
edit('src/sim/options_survival.ts',"import {hasChildhood}","import {clothingOptions} from './clothing';\nimport {hasChildhood}")
edit('src/sim/options_survival.ts','export function survivalOptions(ctx: Ctx): void {','export function survivalOptions(ctx: Ctx): void {\n  clothingOptions(ctx);')
edit('src/sim/decision.ts',"!CHILD_FORBIDDEN.includes(o.kind) &&", "(!CHILD_FORBIDDEN.includes(o.kind) || runsRulesVersion(ctx.world,124)&&o.key.startsWith('dress:')) &&")
edit('src/sim/habitation.ts',"export function staysIndoors(w: World, p: Person, a: Activity): boolean {", "export function staysIndoors(w: World, p: Person, a: Activity): boolean {\n  if(runsRulesVersion(w,124)&&a.kind==='tool_work'&&a.data.textile)return true;")
edit('src/sim/needs.ts',"import {hearthWarmth}","import {clothingWarmth} from './clothing';\nimport {hearthWarmth}")
edit('src/sim/needs.ts','+ hearthWarmth(world,p) - wet','+ hearthWarmth(world,p) + clothingWarmth(world,p) - wet')
edit('src/sim/world.ts',"import {", "import {",) # no-op for helper consistency
p=root/'src/sim/world.ts';s=p.read_text(encoding='utf-8');s="import {clothingTick} from './clothing';\n"+s;s=s.replace('  updateWildlife(world);','  clothingTick(world);\n  updateWildlife(world);').replace('  if (world.ecology) push(',"  for(const t of world.tools)if(t.textile)push('Textile'+t.id+JSON.stringify(t.textile));\n  if (world.ecology) push(");p.write_text(s,encoding='utf-8')
edit('src/app/save.ts',"import {validateHearth}","import {validateClothing} from '../sim/clothing';\nimport {validateHearth}")
edit('src/app/save.ts','  validateHearth(w);','  validateHearth(w);\n  validateClothing(w);')
edit('src/sim/inspect_work.ts',"label: `${t.tier === 1 ? 'iron ' : ''}${TOOL_DEFS[t.kind].label}`", "label: `${t.tier === 1 ? 'iron ' : ''}${TOOL_DEFS[t.kind].label}${t.textile ? ` — ${t.textile.equipped ? (t.kind==='garment'?'worn':'ready for sleep'):'packed'}, ${Math.round(t.textile.wet*100)}% wet` : ''}`")
edit('src/sim/rulesversion.ts','export const CURRENT_RULES_VERSION = 123;','// Version 124: paid fibre insulation, finite textile condition and personal sleeping gear.\nexport const CURRENT_RULES_VERSION = 124;')
edit('src/sim/rulesversion.ts','121, 122, 123];','121, 122, 123, 124];')
edit('tests/clothing.test.ts',"const {w,p}=fixture();const q=addPerson({w},'Bea'","const s=fixture();const {w,p}=s;const q=addPerson(s,'Bea'")
edit('tests/clothing.test.ts',"transfer(w,p.inv,q.inv,'garment',1,", "transfer(w,p.inv,q.inv,12,'garment',1,")
