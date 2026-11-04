export async function runTrapCatchTruthCheck(tab,{writeFile,out}){
 const since=Date.now(),checks=[],check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 await tab.reload();const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 await tab.playwright.getByRole('button',{name:'Set and check the early catch',exact:true}).click();const good=await tab.playwright.domSnapshot();
 check('fresh catch remains recoverable',good.includes('Body awaiting butchery')&&good.includes('Live deer: 0; bodies: 1;'),good);
 check('success is pure, conserved and exact',good.includes('conservation: true; pure: true; exact save: true'),good);
 await tab.playwright.getByRole('button',{name:'Leave catch to decay, then check',exact:true}).click();const bad=await tab.playwright.domSnapshot();
 check('inspector names the empty retained body',bad.includes('no recoverable parts')&&!bad.includes('Body awaiting butchery'),bad);
 check('paid check admits loss',bad.includes('Checked the trap: no recoverable catch remains.'),bad);
 check('loss is pure, conserved and exact',bad.includes('conservation: true; pure: true; exact save: true'),bad);
 const errors=await tab.dev.logs({levels:['error'],limit:30});const current=errors.filter(e=>!e.timestamp||Date.parse(e.timestamp)>=since);check('no current browser errors',current.length===0,current);
 const report={evidence:'STAGED real paid trap work, finite deer and actual carcass expiry. No ordinary uptake claim.',checks};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');return report;
}
