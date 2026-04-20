export function criticalityWeight(criticality: string): number {
  if (criticality === "CRITICAL") return 3;
  if (criticality === "IMPORTANT") return 2;
  return 1;
}
