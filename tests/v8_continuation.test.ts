// Re-recording tests/v8_continuation.expected.json to make a change pass would delete the only evidence of a leak.
import { describe, expect, it } from 'vitest';
import expectedJson from './v8_continuation.expected.json';
import { v8Continuation } from './helpers/v8ref';
describe('the version-8 world continues as version 8', () => {
  it('matches the reference recorded before version 9 existed', () => {
    const actual = v8Continuation();
    const { source: _source, ...expected } = expectedJson;
    expect(actual).toEqual(expected);
  }, 120_000);
});
