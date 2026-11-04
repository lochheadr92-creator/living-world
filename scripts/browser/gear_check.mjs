export async function runGearCheck(tab,{writeFile,out}){
 const checks=[],check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 await tab.reload();const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 await tab.playwright.getByRole('button',{name:'Set and collect a net catch',exact:true}).click();const good=await tab.playwright.domSnapshot();
 check('finite fish moved through paid net work',good.includes('Carried fish: 2; source fish: 1; net catch: 0'),good);
 check('inspector exposes owned physical gear',good.includes('Deployed net')&&good.includes('Condition')&&good.includes('Belongs to'),good);
 check('success is pure, conserved and exact',good.includes('conservation: true; pure: true; exact save: true'),good);
 await tab.getAXState();await writeFile(out+'/gear-success.png',await tab.screenshot({fullPage:false}));
 await tab.playwright.getByRole('button',{name:'Wear out the net and try to reset',exact:true}).click();const bad=await tab.playwright.domSnapshot();
 check('last finite fish taken without duplication',bad.includes('Carried fish: 3; source fish: 0; net catch: 0'),bad);
 check('broken net refuses another reset',bad.includes('the gear is broken')&&bad.includes('Broken gear'),bad);
 check('failure is pure, conserved and exact',bad.includes('conservation: true; pure: true; exact save: true'),bad);
 await tab.getAXState();await writeFile(out+'/gear-failure.png',await tab.screenshot({fullPage:false}));
 const errors=await tab.dev.logs({levels:['error'],limit:20});check('no browser errors',errors.length===0,errors);
 const report={evidence:'STAGED worn owned net; real paid placement, finite catch, collection, wear and broken reset refusal.',checks};await writeFile(out+'/rendered-report.json',JSON.stringify(report,null,2)+'\n');return report;
}
