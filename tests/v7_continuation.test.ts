import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { v7Continuation } from './helpers/v7ref';
it('preserves version-7 save continuation from before full-pack site courier promises', () => {
  const { source: _source, ...expected } = JSON.parse(readFileSync(new URL('./v7_continuation.expected.json', import.meta.url), 'utf8'));
  expect(v7Continuation()).toEqual(expected);
}, 120000);
