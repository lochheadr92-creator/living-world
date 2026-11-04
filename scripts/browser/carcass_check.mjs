export async function runCarcassCheck(tab,{writeFile,out}){
 const checks=[],check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 await tab.reload();const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 const initial=await tab.playwright.domSnapshot();check('one finite body with no instant meat',initial.includes('Carried meat: 0; body meat: 4'),initial);
 await tab.playwright.getByRole('button',{name:'Butcher one portion',exact:true}).click();const good=await tab.playwright.domSnapshot();
 check('paid butchery moves one portion',good.includes('Carried meat: 1; body meat: 3'),good);
 check('body inspector shows physical origin and work',good.includes('Animal origin')&&good.includes('Paid work'),good);
 check('success conserves and persists exactly',good.includes('conservation: true; pure: true; exact save: true'),good);
 await tab.getAXState();
 await writeFile(out+'/carcass-success.png',await tab.screenshot({fullPage:false}));
 await tab.playwright.getByRole('button',{name:'Let remaining body decay',exact:true}).click();const bad=await tab.playwright.domSnapshot();
 check('finite remaining meat decays once',bad.includes('Carried meat: 1; body meat: 0; lost meat: 3'),bad);
 check('spent body refuses butchery',bad.includes('that part is no longer recoverable'),bad);
 check('failure conserves and persists exactly',bad.includes('conservation: true; pure: true; exact save: true'),bad);
 await tab.getAXState();
 await writeFile(out+'/carcass-failure.png',await tab.screenshot({fullPage:false}));
 const errors=await tab.dev.logs({levels:['error'],limit:20});check('no browser errors',errors.length===0,errors);
 const report={evidence:'STAGED killed deer; real offered butchery and finite expiry failure.',checks};await writeFile(out+'/rendered-report.json',JSON.stringify(report,null,2)+'\n');return report;
}
