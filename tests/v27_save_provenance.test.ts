import {expect,it} from 'vitest';
import {nightAuditWorld} from '../scripts/fixtures/night_audit_world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {RULES_27_GENERATION} from '../src/sim/rulesversion';
it('writes explicit generation provenance and preserves complete current save/load state',()=>{
 const w=nightAuditWorld(), saved=serializeWorld(w);
 expect(JSON.parse(saved).rulesGeneration).toBe(RULES_27_GENERATION);
 expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
it('rejects unmarked or differently marked 27 without editing the original',()=>{
 const parsed=JSON.parse(serializeWorld(nightAuditWorld()));
 for(const marker of [undefined,'unmerged-leisure-27']) {
  parsed.rulesGeneration=marker;const saved=JSON.stringify(parsed),original=saved;
  expect(()=>deserializeWorld(saved)).toThrow(/Ambiguous rules version 27/);
  expect(saved).toBe(original);
 }
});
it('does not reinterpret or require a new marker for historical rules 26',()=>{
 const w=nightAuditWorld();w.settings.rulesVersion=26;
 const saved=serializeWorld(w);
 expect(JSON.parse(saved).rulesGeneration).toBeUndefined();
 expect(deserializeWorld(saved).settings.rulesVersion).toBe(26);
});
