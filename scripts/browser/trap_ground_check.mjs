export async function runTrapGroundCheck(tab,{writeFile,out}){
 const checks=[],check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 await tab.reload();const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 await tab.playwright.getByRole('button',{name:'Check without a sighting',exact:true}).click();const missing=await tab.playwright.domSnapshot();
 check('no invented trap ground',missing.includes('Without a sighting: no trap site offered'),missing);
 check('missing-ground inspection is pure, conserved and exact',missing.includes('conservation: true; pure: true; exact save: true'),missing);
 await tab.getAXState();await writeFile(out+'/no-sighting.png',await tab.screenshot({fullPage:false}));
 await tab.playwright.getByRole('button',{name:'Keep the chosen ground',exact:true}).click();const kept=await tab.playwright.domSnapshot();
 check('moving sighting does not erase selected work',kept.includes('kept selected ground: 5; original ground: 5; placement completed'),kept);
 check('kept journey is pure, conserved and exact',kept.includes('conservation: true; pure: true; exact save: true'),kept);
 await tab.getAXState();await writeFile(out+'/kept-ground.png',await tab.screenshot({fullPage:false}));
 await tab.reload();
 await tab.playwright.getByRole('button',{name:'Observe, set, check and eat',exact:true}).click();const good=await tab.playwright.domSnapshot();
 check('dated ground leads to paid trap and real food',good.includes('near a deer sighting from')&&good.includes('live deer: 0; meat eaten: 1'),good);
 check('success is pure, conserved and exact',good.includes('conservation: true; pure: true; exact save: true'),good);
 check('inspector shows remaining real body',good.includes('Carcass')||good.includes('carcass')||good.includes('butchery'),good);
 await tab.getAXState();await writeFile(out+'/trap-food.png',await tab.screenshot({fullPage:false}));
 const errors=await tab.dev.logs({levels:['error'],limit:20});check('no browser errors',errors.length===0,errors);
 const report={evidence:'STAGED deer, trees and owned trap. Real perception, work, finite catch, butchery and meal.',checks};await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');return report;
}
