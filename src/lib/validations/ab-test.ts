import { z } from "zod";

export const createAbTestSchema = z.object({
  name: z.string().min(1).max(200),
  rubric_a_id: z.string().uuid(),
  rubric_b_id: z.string().uuid(),
  golden_set_id: z.string().uuid(),
});

export const submitResultsSchema = z.object({
  results_a: z.array(z.number()),
  results_b: z.array(z.number()),
}).refine(
  (data) => data.results_a.length === data.results_b.length,
  { message: "results_a and results_b must have the same length" }
);

export const submitConcordanceSchema = z.object({
  case_id: z.string().min(1),
  scores: z.array(z.number().min(1).max(5)).length(3),
});

export type CreateAbTestInput = z.infer<typeof createAbTestSchema>;
export type SubmitResultsInput = z.infer<typeof submitResultsSchema>;
export type SubmitConcordanceInput = z.infer<typeof submitConcordanceSchema>;
