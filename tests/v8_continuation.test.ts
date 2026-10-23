import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { v8Continuation } from './helpers/v8ref';
it('preserves version-8 save continuation from before eating at a store with a full pack', () => {
  const { source: _source, ...expected } = JSON.parse(readFileSync(new URL('./v8_continuation.expected.json', import.meta.url), 'utf8'));
  expect(v8Continuation()).toEqual(expected);
}, 180000);
