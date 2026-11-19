import "server-only";

import type { ChatAdapter } from "@/lib/chat/chat-provider";
import { ChatProviderError } from "@/lib/chat/server/provider-error";
import { toKlarenApiMessages } from "@/lib/chat/server/klaren-messages";
import { consumeOpenAIChatCompletionStream } from "@/lib/chat/server/openai-sse";

const DEFAULT_MAX_TOKENS = 1_024;
const DEFAULT_TIMEOUT_MS = 360_000;

function klarenTimeoutMs(): number {
  const raw = Number(process.env.KLAREN_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

export class KlarenChatAdapter implements ChatAdapter {
  async stream({
    messages,
    images = [],
    files = [],
    instructions,
    signal,
    onDelta,
  }: Parameters<ChatAdapter["stream"]>[0]): Promise<void> {
    const baseUrl = process.env.KLAREN_API_URL?.trim();
    const model = process.env.KLAREN_MODEL?.trim();
    if (!baseUrl || !model) {
      throw new ChatProviderError("configuration", false, undefined, "missing_klaren_config");
    }

    if (images.length > 0 || files.length > 0) {
      throw new ChatProviderError(
        "configuration",
        false,
        undefined,
        "klaren_multimodal_unavailable",
      );
    }

    const timeoutMs = klarenTimeoutMs();
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
    const onParentAbort = () => timeoutController.abort(signal.reason);
    if (signal.aborted) onParentAbort();
    else signal.addEventListener("abort", onParentAbort, { once: true });

    const compositeSignal = timeoutController.signal;

    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(process.env.KLAREN_API_KEY
            ? { Authorization: `Bearer ${process.env.KLAREN_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model,
          messages: toKlarenApiMessages(instructions, messages),
          stream: true,
          max_tokens: DEFAULT_MAX_TOKENS,
        }),
        signal: compositeSignal,
      });

      if (!response.ok || !response.body) {
        const retryable = response.status === 0 || response.status === 408 || response.status === 429 || response.status >= 500;
        throw new ChatProviderError("provider", retryable, response.status, `http_${response.status || "network"}`);
      }

      await consumeOpenAIChatCompletionStream(response.body, onDelta, compositeSignal);
    } catch (error) {
      if (signal.aborted || compositeSignal.aborted) throw error;
      if (error instanceof ChatProviderError) throw error;
      throw new ChatProviderError("provider", true, undefined, "network_error");
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onParentAbort);
    }
  }
}