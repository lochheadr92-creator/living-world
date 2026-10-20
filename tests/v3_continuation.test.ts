import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { v3Continuation } from './helpers/v3ref';
it('preserves habitation version-3 save continuation from before wolf defence', () => {
  const { source: _source, ...expected } = JSON.parse(readFileSync(new URL('./v3_continuation.expected.json', import.meta.url), 'utf8'));
  expect(v3Continuation()).toEqual(expected);
}, 120000);
