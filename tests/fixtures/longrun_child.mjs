import {mkdirSync,writeFileSync} from 'node:fs';
const [out,kind]=process.argv.slice(2);
mkdirSync(out,{recursive:true});
const report={days:1,tick:2400,stop:'horizon',population:28,conservation:{ok:true},continuationEqual:true};
if(kind==='budget'){report.stop='budget';report.tick=120;}
if(kind==='short')report.tick=120;
if(kind==='integrity')report.conservation.ok=false;
if(kind!=='crash')writeFileSync(out+'/report.json',kind==='invalid'?'not json':JSON.stringify(report));
console.log('stdout retained');console.error('stderr retained');
process.exitCode=kind==='nonzero'||kind==='crash'?7:kind==='budget'?1:0;
