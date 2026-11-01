import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {sourcesFingerprint} from '../scripts/inhabit/sources';
const t=JSON.parse(readFileSync('talia_evidence/final-transcript.json','utf8'));
const v=JSON.parse(readFileSync('talia_evidence/final-transcript-verified.json','utf8'));
execFileSync('git',['diff','--exit-code','HEAD','--','src','scripts/lab/lab.ts']);
const artifacts=['final-transcript.json','final-transcript-verified.json','final-transcript-world.json','summary.json','ordinary.json','ordinary-summary.json','learning-final.jpg','final-life.jpg','final-view.txt','life119-transcript.json','life119-transcript-verified.json','fishing-trace.json','replay-root-cause.json','full-suite-rules120.log','build-rules120.log','rules120-focused.log'];
const hashes=Object.fromEntries(artifacts.map(name=>{const path='talia_evidence/'+name;if(!existsSync(path))throw new Error('Missing '+path);return [name,createHash('sha256').update(readFileSync(path)).digest('hex')];}));
writeFileSync('talia_evidence/provenance.json',JSON.stringify({
 created:new Date().toISOString(),branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),
 runtimeCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourcesFingerprint:sourcesFingerprint(),
 base:'c3f1310709831d7e90be2bdcbc023f33c8a391a8',featureCommit:'3b78731',
 originalExperiment:'C:\\dev\\Claude Experiment\\living-world-civilian-visit-20261101\\civilian_evidence',
 separateRepairCheckoutPreserved:{path:'C:\\dev\\Claude Experiment\\living-world-integrate',headAtStart:'320c521f1fa84658c77f73d2875a4c0858d5a10b'},
 url:'http://127.0.0.1:5188/?inhabit=Talia&manual=1&memory=1&seed=meadow&from=1&days=3',
 header:t.header,end:t.end,calls:t.calls.length,finalHash:v.hash,
 method:'Rendered manual LiveSession; actual offered choices only; others autonomous; no world edits. Reconstructed full save is headless, not browser-exported bytes.',
 checks:{strictReplay:true,independentReplays:v.exactIndependentReplays,saveRoundtrip:v.exactSaveRoundtrip,continued120:v.continued,conservation:v.conservation.ok,fullSuite:{files:379,tests:2377,skippedFiles:1,todoTests:1,exit:0},buildExit:0},
 artifactSHA256:hashes
},null,2)+'\n');
