import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { v4Continuation } from './helpers/v4ref';
it('preserves wolf-defence version-4 save continuation from before fatal-injury finality', () => {
  const { source: _source, ...expected } = JSON.parse(readFileSync(new URL('./v4_continuation.expected.json', import.meta.url), 'utf8'));
  expect(v4Continuation()).toEqual(expected);
}, 120000);
