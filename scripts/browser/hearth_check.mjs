// Run in the supported computer-use REPL with the already-selected CUA tab.
// No private page state, direct CDP, or evaluation that mutates the simulation.
// await runHearthCheck(tab, {writeFile: fs.writeFile, out: absoluteEvidencePath});
export async function runHearthCheck(tab,{writeFile,out}) {
  const checks=[];
  const check=(name,ok,detail)=>checks.push({name,ok:!!ok,detail});
  await tab.reload();
  const show=tab.playwright.getByRole('button',{name:'Show the inspector',exact:true});
  if(await show.isVisible())await show.click();
  await tab.playwright.getByRole('button',{name:'Run offered fuel work',exact:true}).click();
  const warm=await tab.playwright.domSnapshot();
  check('actual occupant and burning hearth shown',warm.includes('Ada: at home')&&warm.includes('burning')&&warm.includes('+6.6 degrees for occupants only'),warm);
  check('fuel paid once',warm.includes('Paid wood: 2')&&warm.includes('660 ticks of paid fuel remaining'),warm);
  check('occupied success conserves and saves exactly',warm.includes('indoors: true; conservation: true; pure: true; exact save: true'),warm);
  await tab.scroll([551,210],'down',0.65);
  await tab.getAXState();
  await writeFile(out+'/scripted-occupied-heated-home.png',await tab.screenshot({fullPage:false}));
  await tab.playwright.getByRole('button',{name:'Run until fuel exhausted',exact:true}).click();
  const cooling=await tab.playwright.domSnapshot();
  check('fuel exhaustion and residual cooling are displayed',cooling.includes('fuel exhausted; residual heat is cooling')&&cooling.includes('0 ticks of paid fuel remaining'),cooling);
  check('exhaustion conserves and saves exactly without further fuel',cooling.includes('Paid wood: 2; indoors: true; conservation: true; pure: true; exact save: true'),cooling);
  await writeFile(out+'/scripted-fuel-exhausted-cooling.png',await tab.screenshot({fullPage:false}));
  const errors=await tab.dev.logs({levels:['error'],limit:20});
  check('no browser errors',errors.length===0,errors);
  const report={evidence:'STAGED fitting, real offered fuel activity; supported CUA browser API. Screenshots use the observed 660px viewport.',checks};
  await writeFile(out+'/rendered-report.json',JSON.stringify(report,null,2)+'\n');
  return report;
}
