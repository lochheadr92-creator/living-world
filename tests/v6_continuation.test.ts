import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { v6Continuation } from './helpers/v6ref';
it('preserves version-6 save continuation from before household shelter plans', () => {
  const { source: _source, ...expected } = JSON.parse(readFileSync(new URL('./v6_continuation.expected.json', import.meta.url), 'utf8'));
  expect(v6Continuation()).toEqual(expected);
}, 120000);
