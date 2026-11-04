// Use only the supported CUA tab API, against the clearly labelled staged page.
export async function runClothingCheck(tab,{writeFile,out}){
 const checks=[];const check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 await tab.reload();const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 await tab.playwright.getByRole('button',{name:'Make, collect and wear',exact:true}).click();
 const good=await tab.playwright.domSnapshot();
 check('paid production and actual protection',good.includes('Paid wood: 1; paid fibre: 3; protection: +6.0 degrees'),good);
 check('actual worn dry garment shown',good.includes('worn, 0% wet, +6.0 degrees now'),good);
 check('success conserves, observes purely and saves exactly',good.includes('conservation: true; pure: true; exact save: true'),good);
  await tab.scroll([550,248],'down',1.6);await tab.getAXState();
 await writeFile(out+'/clothing-success.png',await tab.screenshot({fullPage:false}));
 await tab.playwright.getByRole('button',{name:'Wear in rain; try repair',exact:true}).click();const bad=await tab.playwright.domSnapshot();
 check('wet worn garment loses protection',bad.includes('100% wet, +0.5 degrees now'),bad);
 check('repair genuinely fails without fibre',bad.includes('no spare fibre for mending'),bad);
 check('failure conserves and persists',bad.includes('conservation: true; pure: true; exact save: true'),bad);
  await tab.getAXState();
 await writeFile(out+'/clothing-failure.png',await tab.screenshot({fullPage:false}));
 const errors=await tab.dev.logs({levels:['error'],limit:20});check('no browser errors',errors.length===0,errors);
 const report={evidence:'STAGED paid workshop inputs; real offered production, collection and dressing; wet wear and actual repair failure.',checks};
 await writeFile(out+'/rendered-report.json',JSON.stringify(report,null,2)+'\n');return report;
}
