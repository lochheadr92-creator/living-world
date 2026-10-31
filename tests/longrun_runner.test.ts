import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {expect,it} from 'vitest';

it.skipIf(process.platform!=='win32')('captures real redirected Windows exit codes and fails closed on incomplete reports',()=>{
 const out=mkdtempSync(join(tmpdir(),'living-world runner regression '));
 const json=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',resolve('tests/fixtures/longrun_process_check.ps1'),'-Runner',resolve('scripts/run_longruns.ps1'),'-Node',process.execPath,'-Fixture',resolve('tests/fixtures/longrun_child.mjs'),'-OutputRoot',out],{encoding:'utf8',timeout:30000});
 const rows=JSON.parse(json);
 expect(rows.map((r:any)=>[r.Run,r.Complete,r.ExitCode])).toEqual([
  ['success',true,0],['nonzero',false,7],['crash',false,7],['budget',false,1],
  ['short',false,0],['integrity',false,0],['invalid',false,0],['unknown',false,null],
 ]);
 expect(rows.find((r:any)=>r.Run==='short').Failure).toBe('HORIZON_MISMATCH');
 expect(rows.find((r:any)=>r.Run==='integrity').Failure).toBe('INTEGRITY_FAILED');
 expect(rows.find((r:any)=>r.Run==='invalid').Failure).toBe('INVALID_REPORT');
 const retained=readFileSync(join(out,'success/report.json'),'utf8');
 const retry=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',resolve('scripts/run_longruns.ps1'),'-OutputRoot',out],{encoding:'utf8',timeout:10000});
 expect(retry.status).not.toBe(0);
 expect(retry.stderr).toContain('OutputRoot already exists');
 expect(readFileSync(join(out,'success/report.json'),'utf8')).toBe(retained);
},40000);
