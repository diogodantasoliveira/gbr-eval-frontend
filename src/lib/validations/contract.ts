import { z } from "zod";

export const methodEnum = z.enum(["GET", "POST", "PUT", "DELETE"]);
export const contractStatusEnum = z.enum(["active", "deprecated"]);

export const createContractSchema = z.object({
  service_name: z.string().min(1, "Service name is required"),
  endpoint: z.string().min(1, "Endpoint is required"),
  method: methodEnum,
  schema_snapshot: z.record(z.string(), z.unknown()),
  source_commit: z.string().default(""),
});

export const updateContractSchema = z.object({
  service_name: z.string().min(1).optional(),
  endpoint: z.string().min(1).optional(),
  method: methodEnum.optional(),
  schema_snapshot: z.record(z.string(), z.unknown()).optional(),
  source_commit: z.string().optional(),
  status: contractStatusEnum.optional(),
  change_reason: z.string().optional(),
});

export const importOpenApiSchema = z.object({
  spec: z.record(z.string(), z.unknown()),
  service_name: z.string().min(1, "Service name is required"),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type ImportOpenApiInput = z.infer<typeof importOpenApiSchema>;
