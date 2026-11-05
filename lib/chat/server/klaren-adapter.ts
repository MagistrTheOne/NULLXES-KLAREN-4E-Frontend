import "server-only";
import type { ChatAdapter } from "@/lib/chat/chat-provider";
import { ChatProviderError } from "@/lib/chat/server/provider-error";

interface OpenAICompatibleChunk {
  choices?: Array<{
    delta?: { content?: string | null };
  }>;
}

export class KlarenChatAdapter implements ChatAdapter {
  async stream({ messages, signal, onDelta }: Parameters<ChatAdapter["stream"]>[0]): Promise<void> {
    const baseUrl = process.env.KLAREN_API_URL?.trim();
    const model = process.env.KLAREN_MODEL?.trim();
    if (!baseUrl || !model) {
      throw new ChatProviderError("configuration", false);
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.KLAREN_API_KEY
            ? { Authorization: `Bearer ${process.env.KLAREN_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 1_024,
        }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new ChatProviderError("provider", response.status >= 500 || response.status === 429);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;
      try {
        while (!receivedDone) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const data = frame
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");
            if (!data) continue;
            if (data === "[DONE]") {
              receivedDone = true;
              break;
            }

            let chunk: OpenAICompatibleChunk;
            try {
              chunk = JSON.parse(data) as OpenAICompatibleChunk;
            } catch {
              throw new ChatProviderError("protocol", true);
            }
            const content = chunk.choices?.[0]?.delta?.content;
            if (typeof content === "string") onDelta(content);
          }
          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }

      if (!receivedDone) {
        throw new ChatProviderError("protocol", true);
      }
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof ChatProviderError) throw error;
      throw new ChatProviderError("provider", true);
    }
  }
}
