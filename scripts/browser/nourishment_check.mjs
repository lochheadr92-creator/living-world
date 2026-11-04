export async function runNourishmentCheck(tab,{writeFile,out}){
 const since=Date.now(),checks=[],check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 await tab.reload();const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 const more=tab.playwright.getByRole('button',{name:'More',exact:true});if(await more.isVisible())await more.click();const initial=await tab.playwright.domSnapshot();check('initial satiety does not create reserves',initial.includes('stored: 0.000')&&initial.includes('No paid intake yet'),initial);
 check('unfed sleep does not promise health recovery',initial.includes('Food is needed for health recovery'),initial);
 await tab.playwright.getByRole('button',{name:'Eat the only berry and rest',exact:true}).click();const good=await tab.playwright.domSnapshot();
 check('one actual portion supports paid recovery',good.includes('berries eaten: 1')&&good.includes('health: 51.800')&&good.includes('stored: 0.600'),good);
 check('fed sleep names its paid recovery',good.includes('Stored nourishment pays for health recovery'),good);
 check('inspector exposes both hunger and stored nourishment',good.includes('meter "Food"')&&good.includes('Stored nourishment'),good);
 check('success is pure, conserved and exact',good.includes('conservation: true; pure: true; exact save: true'),good);
 await tab.playwright.getByRole('button',{name:'Continue with no food',exact:true}).click();const bad=await tab.playwright.domSnapshot();
 check('food-free shortage depletes finite reserves',bad.includes('reserves depleted; health falling')&&bad.includes('stored: 0.000')&&Number(bad.match(/health: ([\d.]+)/)?.[1])<51.8,bad);
 check('failure does not create more food',bad.includes('berries eaten: 1'),bad);
 check('failure is pure, conserved and exact',bad.includes('conservation: true; pure: true; exact save: true'),bad);
 const errors=await tab.dev.logs({levels:['error'],limit:30});const current=errors.filter(e=>!e.timestamp||Date.parse(e.timestamp)>=since);check('no current browser errors',current.length===0,current);
 const report={evidence:'STAGED single real berry, actual eating and paid recovery followed by food-free depletion under comfortable reference conditions.',checks};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');return report;
}
