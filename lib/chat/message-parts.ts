import { z } from "zod";

export const chatPhase1Tools = ["repo.list", "repo.read", "repo.search"] as const;
export type ChatCodingToolId = (typeof chatPhase1Tools)[number];

export const chatToolReadSummarySchema = z.object({
  tool: z.literal("repo.read"),
  owner: z.string().max(120),
  repo: z.string().max(120),
  path: z.string().max(500),
  kind: z.enum(["file", "directory"]),
  lines: z.number().int().nonnegative().optional(),
  chars: z.number().int().nonnegative().optional(),
  preview: z.string().max(2_000),
  truncated: z.boolean().optional(),
});

export const chatToolListSummarySchema = z.object({
  tool: z.literal("repo.list"),
  owner: z.string().max(120),
  repoCount: z.number().int().nonnegative(),
  preview: z.string().max(2_000),
});

export const chatToolSearchSummarySchema = z.object({
  tool: z.literal("repo.search"),
  owner: z.string().max(120),
  repo: z.string().max(120),
  query: z.string().max(256),
  matchCount: z.number().int().nonnegative(),
  preview: z.string().max(2_000),
});

export const chatToolSummarySchema = z.discriminatedUnion("tool", [
  chatToolReadSummarySchema,
  chatToolListSummarySchema,
  chatToolSearchSummarySchema,
]);

export type ChatToolReadSummary = z.infer<typeof chatToolReadSummarySchema>;
export type ChatToolListSummary = z.infer<typeof chatToolListSummarySchema>;
export type ChatToolSearchSummary = z.infer<typeof chatToolSearchSummarySchema>;
export type ChatToolSummary = z.infer<typeof chatToolSummarySchema>;

export const chatMessageToolPartSchema = z.object({
  type: z.literal("tool"),
  tool: z.enum(chatPhase1Tools),
  requestId: z.string().max(80),
  status: z.enum(["pending", "ok", "error"]),
  summary: chatToolSummarySchema.optional(),
  errorMessage: z.string().max(500).optional(),
});

export const chatMessageTextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(8_000),
});

export const chatMessagePartSchema = z.discriminatedUnion("type", [
  chatMessageToolPartSchema,
  chatMessageTextPartSchema,
]);

export type ChatMessagePart = z.infer<typeof chatMessagePartSchema>;

export function isChatCodingToolId(value: string): value is ChatCodingToolId {
  return (chatPhase1Tools as readonly string[]).includes(value);
}

export function normalizeMessageParts(
  content: string,
  parts: ChatMessagePart[] | undefined,
): ChatMessagePart[] {
  if (parts?.length) return parts;
  if (content.trim()) return [{ type: "text", text: content }];
  return [];
}