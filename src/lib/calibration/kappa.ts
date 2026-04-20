/**
 * Cohen's Kappa computation for inter-annotator agreement.
 * κ = (po - pe) / (1 - pe)
 * po = observed agreement
 * pe = expected agreement by chance
 */

export interface KappaResult {
  overall: number;
  per_field: Record<string, number>;
}

function computeFieldKappa(
  values1: string[],
  values2: string[]
): number {
  const n = values1.length;
  if (n === 0) return 0;

  // Count observed agreements
  let agreements = 0;
  for (let i = 0; i < n; i++) {
    if (values1[i] === values2[i]) agreements++;
  }
  const po = agreements / n;

  // Count category frequencies for each annotator
  const freq1: Record<string, number> = {};
  const freq2: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    freq1[values1[i]] = (freq1[values1[i]] ?? 0) + 1;
    freq2[values2[i]] = (freq2[values2[i]] ?? 0) + 1;
  }

  // Expected agreement by chance: sum of (p1_k * p2_k) for each category k
  const allCategories = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
  let pe = 0;
  for (const cat of allCategories) {
    const p1 = (freq1[cat] ?? 0) / n;
    const p2 = (freq2[cat] ?? 0) / n;
    pe += p1 * p2;
  }

  if (pe === 1) return 1; // Perfect chance agreement edge case
  return (po - pe) / (1 - pe);
}

export function computeCohensKappa(
  annotations1: Record<string, string>[],
  annotations2: Record<string, string>[],
  fields: string[]
): KappaResult {
  const n = Math.min(annotations1.length, annotations2.length);
  if (n === 0 || fields.length === 0) {
    return { overall: 0, per_field: {} };
  }

  const per_field: Record<string, number> = {};

  for (const field of fields) {
    const vals1: string[] = [];
    const vals2: string[] = [];
    for (let i = 0; i < n; i++) {
      const v1 = annotations1[i][field];
      const v2 = annotations2[i][field];
      // Only include cases where both annotators have a value for this field
      if (v1 !== undefined && v2 !== undefined) {
        vals1.push(String(v1));
        vals2.push(String(v2));
      }
    }
    per_field[field] = computeFieldKappa(vals1, vals2);
  }

  const fieldKappas = Object.values(per_field);
  const overall =
    fieldKappas.length === 0
      ? 0
      : fieldKappas.reduce((sum, k) => sum + k, 0) / fieldKappas.length;

  return { overall, per_field };
}

export function interpretKappa(kappa: number): string {
  if (kappa < 0) return "poor";
  if (kappa < 0.2) return "slight";
  if (kappa < 0.4) return "fair";
  if (kappa < 0.6) return "moderate";
  if (kappa < 0.8) return "substantial";
  return "almost perfect";
}
