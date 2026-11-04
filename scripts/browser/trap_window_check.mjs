export async function runTrapWindowCheck(tab,{writeFile,out}){
 const since=Date.now(),checks=[],check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 await tab.reload();const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 await tab.playwright.getByRole('button',{name:'Set and check the early catch',exact:true}).click();const good=await tab.playwright.domSnapshot();
 check('one real early encounter produces one body',good.includes('Live deer: 0; bodies: 1;')&&Number(good.match(/original window remaining: (\d+)/)?.[1])>0,good);
 check('inspector exposes the caught body',good.includes('Deployed trap')&&good.includes('Body awaiting butchery')&&good.includes('Catch decay'),good);
 check('resolved trap is ready now',good.includes('Ready to check')&&good.includes('Now'),good);
 check('success is pure, conserved and exact',good.includes('conservation: true; pure: true; exact save: true'),good);
 await tab.playwright.getByRole('button',{name:'Try resetting before recovering the body',exact:true}).click();const bad=await tab.playwright.domSnapshot();
 check('occupied trap refuses reset',bad.includes('recover the previous body first'),bad);
 check('failure leaves one body',bad.includes('Live deer: 0; bodies: 1;'),bad);
 check('failure is pure, conserved and exact',bad.includes('conservation: true; pure: true; exact save: true'),bad);
 const errors=await tab.dev.logs({levels:['error'],limit:30});const current=errors.filter(e=>!e.timestamp||Date.parse(e.timestamp)>=since);check('no current browser errors',current.length===0,current);
 const report={evidence:'STAGED owned trap and live deer. Paid setting and checking, actual early encounter and refused reset before butchery.',checks};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');return report;
}
