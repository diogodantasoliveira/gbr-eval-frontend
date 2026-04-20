import { describe, it, expect } from "vitest";
import { computeCohensKappa, interpretKappa } from "../kappa";

describe("computeCohensKappa", () => {
  it("returns kappa ≈ 1.0 for perfect agreement", () => {
    const annotations1 = [{ label: "A" }, { label: "B" }, { label: "A" }];
    const annotations2 = [{ label: "A" }, { label: "B" }, { label: "A" }];
    const result = computeCohensKappa(annotations1, annotations2, ["label"]);
    expect(result.overall).toBeCloseTo(1.0, 5);
    expect(result.per_field.label).toBeCloseTo(1.0, 5);
  });

  it("returns kappa near 0 or negative for chance-level agreement", () => {
    // Annotator 1 always says A, annotator 2 always says B — no agreement at all
    const annotations1 = [{ label: "A" }, { label: "A" }, { label: "A" }, { label: "A" }];
    const annotations2 = [{ label: "B" }, { label: "B" }, { label: "B" }, { label: "B" }];
    const result = computeCohensKappa(annotations1, annotations2, ["label"]);
    // po=0, pe=0 (no shared categories), so kappa = (0-0)/(1-0) = 0
    expect(result.overall).toBeLessThanOrEqual(0);
  });

  it("returns kappa between 0 and 1 for partial agreement", () => {
    // Annotators agree on 3 of 4 items, but the class distribution is
    // asymmetric (A appears 3× for ann1, 2× for ann2) so pe < po.
    // po = 3/4 = 0.75
    // freq1: A=3,B=1 → p1A=0.75,p1B=0.25
    // freq2: A=2,B=2 → p2A=0.5, p2B=0.5
    // pe = 0.75×0.5 + 0.25×0.5 = 0.5
    // kappa = (0.75-0.5)/(1-0.5) = 0.5
    const annotations1 = [
      { label: "A" },
      { label: "A" },
      { label: "A" },
      { label: "B" },
    ];
    const annotations2 = [
      { label: "A" },
      { label: "A" },
      { label: "B" },
      { label: "B" },
    ];
    const result = computeCohensKappa(annotations1, annotations2, ["label"]);
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThan(1);
    expect(result.overall).toBeCloseTo(0.5, 5);
  });

  it("returns overall 0 and empty per_field for empty annotations arrays", () => {
    const result = computeCohensKappa([], [], ["label"]);
    expect(result.overall).toBe(0);
    expect(result.per_field).toEqual({});
  });

  it("returns overall 0 and empty per_field for empty fields array", () => {
    const annotations1 = [{ label: "A" }];
    const annotations2 = [{ label: "A" }];
    const result = computeCohensKappa(annotations1, annotations2, []);
    expect(result.overall).toBe(0);
    expect(result.per_field).toEqual({});
  });

  it("uses the shorter array length when arrays differ in length", () => {
    const annotations1 = [{ label: "A" }, { label: "A" }, { label: "A" }];
    const annotations2 = [{ label: "A" }]; // only 1 item
    // n = min(3, 1) = 1 — both annotators agree on the one item → kappa = 1
    const result = computeCohensKappa(annotations1, annotations2, ["label"]);
    expect(result.overall).toBeCloseTo(1.0, 5);
  });

  it("computes per_field kappa independently across multiple fields", () => {
    const annotations1 = [
      { color: "red", shape: "circle" },
      { color: "blue", shape: "circle" },
    ];
    const annotations2 = [
      { color: "red", shape: "square" },
      { color: "blue", shape: "square" },
    ];
    const result = computeCohensKappa(annotations1, annotations2, ["color", "shape"]);
    // color: perfect agreement → kappa = 1
    expect(result.per_field.color).toBeCloseTo(1.0, 5);
    // shape: both annotators always pick different values → kappa <= 0
    expect(result.per_field.shape).toBeLessThanOrEqual(0);
  });

  it("skips items where either annotator is missing a field value", () => {
    const annotations1 = [{ label: "A" }, {}] as Record<string, string>[];
    const annotations2 = [{ label: "A" }, { label: "B" }];
    // Only the first item has both values; perfect agreement on 1 item → kappa = 1
    const result = computeCohensKappa(annotations1, annotations2, ["label"]);
    expect(result.per_field.label).toBeCloseTo(1.0, 5);
  });
});

describe("interpretKappa", () => {
  it("returns 'poor' for negative kappa", () => {
    expect(interpretKappa(-0.1)).toBe("poor");
    expect(interpretKappa(-1)).toBe("poor");
  });

  it("returns 'slight' for kappa in [0, 0.2)", () => {
    expect(interpretKappa(0)).toBe("slight");
    expect(interpretKappa(0.19)).toBe("slight");
  });

  it("returns 'fair' for kappa in [0.2, 0.4)", () => {
    expect(interpretKappa(0.2)).toBe("fair");
    expect(interpretKappa(0.39)).toBe("fair");
  });

  it("returns 'moderate' for kappa in [0.4, 0.6)", () => {
    expect(interpretKappa(0.4)).toBe("moderate");
    expect(interpretKappa(0.59)).toBe("moderate");
  });

  it("returns 'substantial' for kappa in [0.6, 0.8)", () => {
    expect(interpretKappa(0.6)).toBe("substantial");
    expect(interpretKappa(0.79)).toBe("substantial");
  });

  it("returns 'almost perfect' for kappa >= 0.8", () => {
    expect(interpretKappa(0.8)).toBe("almost perfect");
    expect(interpretKappa(1.0)).toBe("almost perfect");
  });
});
