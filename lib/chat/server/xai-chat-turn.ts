import "server-only";

import OpenAI from "openai";
import { ChatProviderError } from "@/lib/chat/server/provider-error";
import { CHAT_CODING_TOOL_DEFINITIONS } from "@/lib/chat/server/chat-tools";
import {
  toOpenAiToolMessages,
  type ProviderToolCall,
  type ProviderTurnMessage,
} from "@/lib/chat/server/provider-messages";

const XAI_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_XAI_MODEL = "grok-4.7";

export type XaiTurnResult =
  | { kind: "tool_calls"; calls: ProviderToolCall[]; assistantText: string | null }
  | { kind: "message"; content: string };

export async function runXaiChatTurn(
  messages: ProviderTurnMessage[],
  options: { toolsEnabled: boolean; signal: AbortSignal },
): Promise<XaiTurnResult> {
  const apiKey = process.env.XAI_API_KEY;
  const model = process.env.XAI_MODEL?.trim() || DEFAULT_XAI_MODEL;
  if (!apiKey) {
    throw new ChatProviderError("configuration", false, undefined, "missing_xai_api_key");
  }

  const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL, maxRetries: 1, timeout: 360_000 });

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages: toOpenAiToolMessages(messages) as unknown as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: options.toolsEnabled ? CHAT_CODING_TOOL_DEFINITIONS : undefined,
        tool_choice: options.toolsEnabled ? "auto" : undefined,
        max_tokens: 1_024,
        stream: false,
      },
      { signal: options.signal },
    );

    const choice = completion.choices[0];
    if (!choice) {
      throw new ChatProviderError("protocol", true, undefined, "empty_response");
    }

    const msg = choice.message;
    if (msg.tool_calls?.length) {
      const calls: ProviderToolCall[] = msg.tool_calls
        .filter((call) => call.type === "function")
        .map((call) => ({
          id: call.id,
          name: call.function.name,
          arguments: call.function.arguments ?? "{}",
        }));
      return { kind: "tool_calls", calls, assistantText: msg.content ?? null };
    }

    const content = msg.content?.trim() ?? "";
    if (!content) {
      throw new ChatProviderError("protocol", true, undefined, "empty_response");
    }
    return { kind: "message", content };
  } catch (error) {
    if (options.signal.aborted) throw error;
    if (error instanceof ChatProviderError) throw error;
    throw new ChatProviderError("provider", true, undefined, "provider_turn_error");
  }
}