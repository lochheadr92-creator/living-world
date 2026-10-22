// The version-7 world saved, loaded and continued must behave as recorded BEFORE rules version 8 existed.
// Re-recording tests/v7_continuation.expected.json to make a change pass would delete the only evidence of a leak.
import { describe, expect, it } from 'vitest';
import expectedJson from './v7_continuation.expected.json';
import { v7Continuation } from './helpers/v7ref';

const expected = expectedJson as { saved: Record<string, unknown>; continued: Record<string, unknown> };

describe('version-7 continuation reference', () => {
  it('still runs the version-7 world exactly as recorded', () => {
    const actual = v7Continuation();
    expect(actual.saved).toEqual(expected.saved);
    expect(actual.continued).toEqual(expected.continued);
  }, 300_000);
});
