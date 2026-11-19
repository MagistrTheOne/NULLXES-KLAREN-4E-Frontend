import "server-only";

import { ChatProviderError } from "@/lib/chat/server/provider-error";
import { consumeOpenAIChatCompletionStream } from "@/lib/chat/server/openai-sse";
import {
  extractKlarenToolCalls,
  KLAREN_TOOL_PROTOCOL_HINT,
} from "@/lib/chat/server/klaren-tool-protocol";
import type { ProviderToolCall, ProviderTurnMessage } from "@/lib/chat/server/provider-messages";

const DEFAULT_MAX_TOKENS = 1_024;

function klarenMessagesForTurn(
  messages: ProviderTurnMessage[],
  toolsEnabled: boolean,
): Array<{ role: string; content: string }> {
  return messages.map((message) => {
    if (message.role === "tool") {
      return { role: "user", content: `Tool result:\n${message.content}` };
    }
    if (message.role === "assistant" && "tool_calls" in message) {
      const calls = message.tool_calls
        .map((call) => `${call.name}(${call.arguments})`)
        .join("; ");
      return {
        role: "assistant",
        content: [message.content ?? "", `Tool calls: ${calls}`].filter(Boolean).join("\n"),
      };
    }
    if (message.role === "system") {
      return {
        role: "system",
        content:
          message.content +
          (toolsEnabled ? `\n\n${KLAREN_TOOL_PROTOCOL_HINT}` : ""),
      };
    }
    return { role: message.role, content: message.content };
  });
}

export type KlarenTurnResult =
  | { kind: "tool_calls"; calls: ProviderToolCall[]; assistantText: string | null }
  | { kind: "message"; content: string };

export async function runKlarenChatTurn(
  messages: ProviderTurnMessage[],
  options: { toolsEnabled: boolean; signal: AbortSignal },
): Promise<KlarenTurnResult> {
  const baseUrl = process.env.KLAREN_API_URL?.trim();
  const model = process.env.KLAREN_MODEL?.trim();
  if (!baseUrl || !model) {
    throw new ChatProviderError("configuration", false, undefined, "missing_klaren_config");
  }

  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(process.env.KLAREN_API_KEY ? { Authorization: `Bearer ${process.env.KLAREN_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: klarenMessagesForTurn(messages, options.toolsEnabled),
      stream: true,
      max_tokens: DEFAULT_MAX_TOKENS,
    }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    throw new ChatProviderError("provider", response.status >= 500, response.status, `http_${response.status}`);
  }

  let content = "";
  await consumeOpenAIChatCompletionStream(
    response.body,
    (delta) => {
      content += delta;
    },
    options.signal,
  );

  if (!content.trim()) {
    throw new ChatProviderError("protocol", true, undefined, "empty_response");
  }

  if (options.toolsEnabled) {
    const calls = extractKlarenToolCalls(content);
    if (calls.length) {
      return { kind: "tool_calls", calls, assistantText: content };
    }
  }

  return { kind: "message", content: content.trim() };
}