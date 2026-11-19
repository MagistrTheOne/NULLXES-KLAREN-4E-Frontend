import "server-only";

import type { CodingToolId } from "@/lib/coding-agent/contracts";
import { runCodingAgentToolCall } from "@/lib/coding-agent/orchestrator";
import {
  buildToolSummary,
  modelContextForTool,
} from "@/lib/chat/server/chat-tool-summarize";
import {
  validateRepoListInput,
  validateRepoReadForChat,
  validateRepoSearchInput,
} from "@/lib/chat/server/chat-tool-input-guard";
import {
  chatToolNameToId,
  parseToolArguments,
  CHAT_PHASE1_TOOL_NAMES,
} from "@/lib/chat/server/chat-tools";
import type { ChatToolSummary } from "@/lib/chat/message-parts";

export type ChatToolExecuteResult =
  | {
      ok: true;
      tool: CodingToolId;
      requestId: string;
      modelPayload: string;
      output: unknown;
      summary: ChatToolSummary;
    }
  | {
      ok: false;
      tool: CodingToolId;
      requestId: string;
      message: string;
      retryable: boolean;
    };

function guardErrorMessage(
  tool: CodingToolId,
  reason: string,
): { message: string; retryable: boolean } {
  if (reason === "blocked_path" || reason === "blocked_query" || reason === "invalid_input" || reason === "invalid_path") {
    return {
      message:
        reason === "blocked_path"
          ? "Путь запрещён."
          : reason === "blocked_query"
            ? "Запрос поиска запрещён."
            : "Некорректные параметры инструмента.",
      retryable: false,
    };
  }
  if (tool === "repo.search" && reason === "not_connected") {
    return {
      message: "repo.search требует GITHUB_CODING_AGENT_TOKEN на сервере (GitHub Code Search).",
      retryable: false,
    };
  }
  return { message: "Инструмент недоступен.", retryable: false };
}

export async function executeChatCodingTool(options: {
  userId: string;
  requestId: string;
  toolName: string;
  argumentsJson: string;
}): Promise<ChatToolExecuteResult> {
  if (!CHAT_PHASE1_TOOL_NAMES.has(options.toolName)) {
    return {
      ok: false,
      tool: "repo.read",
      requestId: options.requestId,
      message: "Инструмент не разрешён в чате.",
      retryable: false,
    };
  }

  const tool = chatToolNameToId(options.toolName);
  if (!tool) {
    return {
      ok: false,
      tool: "repo.read",
      requestId: options.requestId,
      message: "Неизвестный инструмент.",
      retryable: false,
    };
  }

  const args = parseToolArguments(options.argumentsJson);
  const env = {
    owner: process.env.GITHUB_CODING_AGENT_OWNER,
    repo: process.env.GITHUB_CODING_AGENT_REPO,
  };

  let orchestratorInput: Record<string, unknown> | null = null;
  let meta = { owner: env.owner ?? "", repo: env.repo ?? "", path: "", query: "" };

  if (tool === "repo.list") {
    const guarded = validateRepoListInput(args, env);
    if (!guarded.ok) {
      const err = guardErrorMessage(tool, guarded.reason);
      return { ok: false, tool, requestId: options.requestId, ...err };
    }
    orchestratorInput = guarded.input;
    meta = { ...meta, owner: guarded.input.owner };
  } else if (tool === "repo.search") {
    const guarded = validateRepoSearchInput(args, env);
    if (!guarded.ok) {
      const err = guardErrorMessage(tool, guarded.reason);
      return { ok: false, tool, requestId: options.requestId, ...err };
    }
    orchestratorInput = guarded.input;
    meta = { owner: guarded.input.owner, repo: guarded.input.repo, path: "", query: guarded.input.query };
  } else {
    const guarded = validateRepoReadForChat(args, env);
    if (!guarded.ok) {
      const err = guardErrorMessage(tool, guarded.reason);
      return { ok: false, tool, requestId: options.requestId, ...err };
    }
    orchestratorInput = guarded.input;
    meta = {
      owner: guarded.input.owner,
      repo: guarded.input.repo,
      path: guarded.input.path,
      query: "",
    };
  }

  const { events } = await runCodingAgentToolCall(
    { tool, input: orchestratorInput },
    { userId: options.userId, requestId: options.requestId },
  );

  const toolError = events.find((event) => event.type === "tool.error");
  if (toolError && toolError.type === "tool.error") {
    return {
      ok: false,
      tool,
      requestId: options.requestId,
      message: toolError.message,
      retryable: toolError.retryable,
    };
  }

  const toolResult = events.find((event) => event.type === "tool.result");
  if (!toolResult || toolResult.type !== "tool.result") {
    return {
      ok: false,
      tool,
      requestId: options.requestId,
      message: "Инструмент не вернул результат.",
      retryable: true,
    };
  }

  const summary = buildToolSummary(tool, meta, toolResult.output);
  const modelPayload = modelContextForTool(tool, toolResult.output);

  return {
    ok: true,
    tool,
    requestId: options.requestId,
    modelPayload,
    output: toolResult.output,
    summary,
  };
}

/** @deprecated */
export const executeChatRepoReadTool = executeChatCodingTool;