import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { deserializeWorld, serializeWorld } from '../src/app/save';
it.each([8, 9])('refuses ambiguous untagged version %s without changing the input', rulesVersion => {
 const w = createWorld({...currentWorldSettings('normal', 'lineage'), rulesVersion});
 const text = serializeWorld(w);
 expect(deserializeWorld(text).settings.rulesVersion).toBe(rulesVersion);
 const raw = JSON.parse(text); delete raw.rulesLineage;
 const original = JSON.stringify(raw);
 expect(() => deserializeWorld(original)).toThrow(/Ambiguous/);
 expect(JSON.stringify(raw)).toBe(original);
});
