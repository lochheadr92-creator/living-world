export async function runLivestockCheck(tab,{writeFile,out}){
 const checks=[],check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
 const began=new Date().toISOString();
 await tab.reload();
 const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});if(await show.isVisible())await show.click();
 const initial=await tab.playwright.domSnapshot();check('unowned animal starts with no stored benefit',initial.includes('Initial animal has no food, water or wool'),initial);
 await tab.playwright.getByRole('button',{name:'Acquire, feed and shear',exact:true}).click();
 const care=await tab.playwright.domSnapshot();check('paid feeding grows and transfers one fleece',care.includes('Wool created: 1; wool used: 0')&&care.includes('Tethered at'),care);
 check('care conserves and persists exactly',care.includes('conservation: true; pure: true; exact save: true'),care);
 await writeFile(out+'/care.png',await tab.screenshot({fullPage:false}));
 await tab.playwright.getByRole('button',{name:'Weave and wear wool',exact:true}).click();
 const good=await tab.playwright.domSnapshot();check('grown wool enters paid delivery and weaving',good.includes('Wool created: 1; wool used: 3'),good);
 check('worn wool provides actual insulation',good.includes('wool garment — worn')&&good.includes('clothing warmth: 6'),good);
 check('clothing conserves and persists exactly',good.includes('conservation: true; pure: true; exact save: true'),good);
 await writeFile(out+'/success.png',await tab.screenshot({fullPage:false}));
 await tab.playwright.getByRole('button',{name:'Leave without food or water',exact:true}).click();
 const bad=await tab.playwright.domSnapshot();check('neglect removes one animal and loses finite body contents',bad.includes('Neglect removed living sheep: true; edible meat left: 0; body meat lost: 4')&&bad.includes('Lost: 4 meat, 1 hide, 1 fat'),bad);
 check('neglect conserves and persists exactly',bad.includes('conservation: true; pure: true; exact save: true'),bad);
 await writeFile(out+'/failure.png',await tab.screenshot({fullPage:false}));
 const errors=(await tab.dev.logs({levels:['error'],limit:100})).filter(e=>e.timestamp>=began);check('no browser errors in this check',errors.length===0,errors);
 const report={evidence:'STAGED one sheep, finite supplies and two initial wool. Real care yields one more fleece, paid delivery/weaving/dressing, then neglect.',checks};await writeFile(out+'/report.json',JSON.stringify(report,null,2));return report;
}
