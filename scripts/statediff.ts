// Comparing two reconstructed worlds. Two separate jobs, deliberately kept apart:
//
//   deepEqualState(a, b)  decides equality. Exhaustive: no depth limit, no count limit, every key of every object, every element of
//                         every array. This is what a verification claim may rest on.
//   firstDiffs(a, b, n)   describes the first few differences for a human. It truncates on purpose, and its result must never be
//                         used to decide whether two states are equal.
//
// Both treat an absent key and an explicit `undefined` as the same thing, because the simulation cannot tell them apart and the two
// save encodings (packed columns and plain objects) disagree about which one they write.
export type Json = unknown;

const isObj = (v: Json): v is Record<string, Json> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** keys that carry a value, in a fixed order, so two objects written differently still compare alike */
function keysOf(o: Record<string, Json>): string[] {
  return Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
}

/**
 * Exhaustive structural equality. Recursion is bounded by the data, not by a constant: a world is a finite tree, so this terminates,
 * and nothing is skipped on the way down.
 */
export function deepEqualState(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqualState(a[i], b[i])) return false;
    return true;
  }
  if (isObj(a) && isObj(b)) {
    const ka = keysOf(a);
    const kb = keysOf(b);
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return false;
    for (const k of ka) if (!deepEqualState(a[k], b[k])) return false;
    return true;
  }
  // numbers, strings, booleans: NaN is not equal to itself, which is the right answer for a saved world too
  return false;
}

/**
 * The first `max` differences, by path, for printing. Goes as deep as it must to find them; it stops only once it has enough to
 * report. Never used to decide equality - see deepEqualState.
 */
export function firstDiffs(a: Json, b: Json, max = 12, path = '', out: string[] = []): string[] {
  if (out.length >= max || deepEqualState(a, b)) return out;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${path || '(root)'}.length: ${a.length} != ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length) && out.length < max; i++) firstDiffs(a[i], b[i], max, `${path}[${i}]`, out);
    return out;
  }
  if (isObj(a) && isObj(b)) {
    for (const k of [...new Set([...keysOf(a), ...keysOf(b)])].sort()) {
      if (out.length >= max) break;
      firstDiffs(a[k], b[k], max, path ? `${path}.${k}` : k, out);
    }
    return out;
  }
  const show = (v: Json): string => {
    const t = JSON.stringify(v);
    return t === undefined ? 'undefined' : t.length > 60 ? `${t.slice(0, 57)}…` : t;
  };
  out.push(`${path || '(root)'}: ${show(a)} != ${show(b)}`);
  return out;
}
