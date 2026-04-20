/**
 * Validates a regex pattern for correctness and safety (ReDoS prevention).
 */
export function isValidRegex(pattern: string): { valid: boolean; error?: string } {
  try {
    new RegExp(pattern);
  } catch {
    return { valid: false, error: "Invalid regex syntax" };
  }
  if (
    /(\+|\*|\?)(\+|\*|\?)/.test(pattern) ||
    /\([^)]*(\+|\*)[^)]*\)(\+|\*|\?)/.test(pattern) ||
    /\([^)]*(\+|\*)[^)]*\)\{/.test(pattern) ||
    /\([^)]*\|[^)]*\)(\+|\*|\?)/.test(pattern)
  ) {
    return { valid: false, error: "Regex pattern may cause catastrophic backtracking" };
  }
  return { valid: true };
}
