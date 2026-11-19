import { z } from "zod";

export const codingToolIds = [
  "repo.list",
  "repo.read",
  "repo.search",
  "code.patch",
  "code.diff",
  "sandbox.test",
  "git.commit",
  "git.push",
] as const;

export type CodingToolId = (typeof codingToolIds)[number];

export type ToolAccess = "read" | "approval" | "separate_approval";

export type ToolPhase = 1 | 2 | 3 | 4 | 5;

export type ToolAvailability =
  | "available"
  | "preview"
  | "not_connected"
  | "disabled";

export interface CodingToolDefinition {
  id: CodingToolId;
  title: string;
  capability: string;
  access: ToolAccess;
  phase: ToolPhase;
  availability: ToolAvailability;
  description: string;
}

export const agentStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("agent.status"), message: z.string().max(500) }),
  z.object({
    type: z.literal("tool.start"),
    tool: z.enum(codingToolIds),
    requestId: z.string().max(80),
  }),
  z.object({
    type: z.literal("tool.result"),
    tool: z.enum(codingToolIds),
    requestId: z.string().max(80),
    output: z.unknown(),
  }),
  z.object({
    type: z.literal("tool.error"),
    tool: z.enum(codingToolIds),
    requestId: z.string().max(80),
    message: z.string().max(500),
    retryable: z.boolean(),
  }),
  z.object({
    type: z.literal("approval.required"),
    tool: z.enum(codingToolIds),
    requestId: z.string().max(80),
    summary: z.string().max(2000),
  }),
  z.object({ type: z.literal("agent.completed"), requestId: z.string().max(80) }),
]);

export type AgentStreamEvent = z.infer<typeof agentStreamEventSchema>;

export const toolCallRequestSchema = z.object({
  tool: z.enum(codingToolIds),
  input: z.record(z.string(), z.unknown()).default({}),
  approvalToken: z.string().max(120).optional(),
});

export type ToolCallRequest = z.infer<typeof toolCallRequestSchema>;

export const repoListInputSchema = z.object({
  owner: z.string().max(120).optional(),
});

export const repoReadInputSchema = z.object({
  owner: z.string().max(120),
  repo: z.string().max(120),
  path: z.string().max(500).default(""),
  ref: z.string().max(120).optional(),
});

export const repoSearchInputSchema = z.object({
  owner: z.string().max(120),
  repo: z.string().max(120),
  query: z.string().min(1).max(256),
});