import "server-only";

import type { AgentStreamEvent, CodingToolId, ToolCallRequest } from "@/lib/coding-agent/contracts";
import { toolCallRequestSchema } from "@/lib/coding-agent/contracts";
import {
  githubListRepos,
  githubReadPath,
  githubSearchCode,
} from "@/lib/coding-agent/github/read-only";
import { evaluateToolExecution } from "@/lib/coding-agent/permissions-core";
export interface OrchestratorContext {
  userId: string;
  requestId: string;
}

const MAX_TOOL_CALLS_PER_REQUEST = 8;

export async function runCodingAgentToolCall(
  payload: unknown,
  context: OrchestratorContext,
): Promise<{ events: AgentStreamEvent[] }> {
  const parsed = toolCallRequestSchema.parse(payload);
  const decision = evaluateToolExecution(parsed.tool, { approvalToken: parsed.approvalToken });

  const events: AgentStreamEvent[] = [
    {
      type: "agent.status",
      message: `Coding Agent V1 · ${context.requestId}`,
    },
    { type: "tool.start", tool: parsed.tool, requestId: context.requestId },
  ];

  if (!decision.allowed) {
    if (decision.reason === "approval_required" || decision.reason === "separate_approval_required") {
      events.push({
        type: "approval.required",
        tool: parsed.tool,
        requestId: context.requestId,
        summary: "Требуется подтверждение пользователя перед выполнением инструмента.",
      });
    } else {
      events.push({
        type: "tool.error",
        tool: parsed.tool,
        requestId: context.requestId,
        message:
          decision.reason === "not_connected"
            ? "Для repo.search нужен серверный GitHub token (публичное чтение без PAT уже доступно)."
            : "Инструмент отключён до завершения security review.",
        retryable: false,
      });
    }
    events.push({ type: "agent.completed", requestId: context.requestId });
    return { events };
  }

  try {
    const output = await dispatchReadOnlyTool(parsed.tool, parsed.input);
    events.push({
      type: "tool.result",
      tool: parsed.tool,
      requestId: context.requestId,
      output,
    });
  } catch (error) {
    events.push({
      type: "tool.error",
      tool: parsed.tool,
      requestId: context.requestId,
      message: error instanceof Error ? error.message : "Tool execution failed.",
      retryable: true,
    });
  }

  events.push({ type: "agent.completed", requestId: context.requestId });
  return { events };
}

async function dispatchReadOnlyTool(tool: CodingToolId, input: Record<string, unknown>) {
  switch (tool) {
    case "repo.list":
      return githubListRepos(input);
    case "repo.read":
      return githubReadPath(input);
    case "repo.search":
      return githubSearchCode(input);
    default:
      throw new Error("Tool is not available in Coding Agent V1.");
  }
}

export function createBoundedToolLoopGuard(callIndex: number): void {
  if (callIndex >= MAX_TOOL_CALLS_PER_REQUEST) {
    throw new Error("Tool loop limit exceeded.");
  }
}