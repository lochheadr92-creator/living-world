import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { v2Continuation } from './helpers/v2ref';
it('preserves version-2 saved-state continuation from before habitation', () => {
  const { source: _source, ...expected } = JSON.parse(readFileSync(new URL('./v2_continuation.expected.json', import.meta.url), 'utf8'));
  expect(v2Continuation()).toEqual(expected);
}, 120000);
