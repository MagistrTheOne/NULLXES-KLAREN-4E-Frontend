import type { ChatRequestMessage } from "@/lib/chat/chat-contract";

type OpenAIChatRole = "system" | "user" | "assistant";

export interface OpenAIChatMessage {
  role: OpenAIChatRole;
  content: string;
}

/** OpenAI-style payload for the KLAREN RunPod gateway. */
export function toKlarenApiMessages(
  instructions: string,
  messages: ChatRequestMessage[],
): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = [];
  const trimmedInstructions = instructions.trim();
  if (trimmedInstructions) {
    out.push({ role: "system", content: trimmedInstructions });
  }

  for (const message of messages) {
    out.push({ role: message.role, content: message.content });
  }

  return out;
}