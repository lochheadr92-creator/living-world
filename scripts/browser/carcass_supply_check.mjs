export async function runCarcassSupplyCheck(tab,{writeFile,out}){
 const started=Date.now(),checks=[],check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});await tab.reload();
 const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 await tab.playwright.getByRole('button',{name:'Make and wear the hide garment',exact:true}).click();const good=await tab.playwright.domSnapshot();
 check('paid body-to-worn-clothing chain',good.includes('Recovered hide: 1; worn warmth: 6'),good);
 check('success accounts and persists',good.includes('conservation: true; pure: true; exact save: true'),good);
 check('inspector identifies worn hide insulation',good.includes('hide garment')&&good.includes('worn'),good);
 await tab.getAXState();await writeFile(out+'/success.png',await tab.screenshot({fullPage:false}));
 await tab.playwright.getByRole('button',{name:'Let unused parts decay',exact:true}).click();const bad=await tab.playwright.domSnapshot();
 check('unrecovered part is lost once',bad.includes('lost fat: 1'),bad);
 check('expired input refuses recovery',bad.includes('that part is no longer recoverable'),bad);
 check('failure accounts and persists',bad.includes('conservation: true; pure: true; exact save: true'),bad);
 check('inspector shows origin and paid work',bad.includes('Animal origin')&&bad.includes('Paid work'),bad);
 await tab.getAXState();await writeFile(out+'/failure.png',await tab.screenshot({fullPage:false}));const errors=(await tab.dev.logs({levels:['error'],limit:50})).filter(e=>Date.parse(e.timestamp)>=started);check('no browser errors',errors.length===0,errors);
 const report={evidence:'STAGED original body and binding; actual offered recovery, delivery, sewing, collection and dressing, then expiry failure',checks};await writeFile(out+'/report.json',JSON.stringify(report,null,2));return report;
}
