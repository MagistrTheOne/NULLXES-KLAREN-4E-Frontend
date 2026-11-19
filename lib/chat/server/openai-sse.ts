import "server-only";

import { ChatProviderError } from "@/lib/chat/server/provider-error";
import { consumeOpenAIChatCompletionStream as parseStream } from "@/lib/chat/openai-sse-parse";

export { type OpenAICompatibleChunk } from "@/lib/chat/openai-sse-parse";

export async function consumeOpenAIChatCompletionStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => void,
  signal: AbortSignal,
): Promise<void> {
  try {
    await parseStream(body, onDelta, signal);
  } catch (error) {
    if (signal.aborted) {
      throw new ChatProviderError("protocol", false, undefined, "aborted");
    }
    const reason = error instanceof Error ? error.message : "protocol";
    throw new ChatProviderError("protocol", true, undefined, reason);
  }
}