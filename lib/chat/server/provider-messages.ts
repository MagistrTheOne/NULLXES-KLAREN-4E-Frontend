import "server-only";

import type { ChatRequestMessage } from "@/lib/chat/chat-contract";

export type ProviderToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ProviderTurnMessage =
  | { role: "system"; content: string }
  | { role: "user" | "assistant"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: ProviderToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export function buildProviderTranscript(
  instructions: string,
  messages: ChatRequestMessage[],
): ProviderTurnMessage[] {
  return [
    { role: "system", content: instructions },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

export function toOpenAiToolMessages(
  messages: ProviderTurnMessage[],
): Array<Record<string, unknown>> {
  return messages.map((message) => {
    if (message.role === "tool") {
      return { role: "tool", tool_call_id: message.tool_call_id, content: message.content };
    }
    if (message.role === "assistant" && "tool_calls" in message) {
      return {
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls.map((call) => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: call.arguments },
        })),
      };
    }
    return { role: message.role, content: message.content };
  });
}