import "server-only";
import OpenAI from "openai";
import type { ChatAdapter } from "@/lib/chat/chat-provider";
import { ChatProviderError } from "@/lib/chat/server/provider-error";

const XAI_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_XAI_MODEL = "grok-4.7";

export class XAIChatAdapter implements ChatAdapter {
  async stream({ messages, images = [], files = [], instructions, signal, onDelta }: Parameters<ChatAdapter["stream"]>[0]): Promise<void> {
    const apiKey = process.env.XAI_API_KEY;
    const model = process.env.XAI_MODEL?.trim() || DEFAULT_XAI_MODEL;
    if (!apiKey) {
      throw new ChatProviderError(
        "configuration",
        false,
        undefined,
        "missing_xai_api_key",
      );
    }

    const client = new OpenAI({
      apiKey,
      baseURL: XAI_BASE_URL,
      maxRetries: 1,
      timeout: 360_000,
    });

    try {
      const responseStream = await client.responses.create(
        {
          model,
          instructions,
          input: messages.map(({ role, content }, index) => ({
            role,
            content: role === "user" && index === messages.length - 1 && (images.length || files.length)
              ? [
                  { type: "input_text" as const, text: content },
                  ...images.map((image_url) => ({ type: "input_image" as const, image_url, detail: "auto" as const })),
                  ...files.map((file_id) => ({ type: "input_file" as const, file_id })),
                ]
              : content,
          })),
          max_output_tokens: 1_024,
          store: false,
          stream: true,
        },
        { signal },
      );

      for await (const event of responseStream) {
        if (event.type === "response.output_text.delta") {
          onDelta(event.delta);
        } else if (event.type === "response.failed" || event.type === "error") {
          throw new ChatProviderError("provider", true, undefined, "provider_stream_error");
        }
      }
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof ChatProviderError) throw error;
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : undefined;
      throw new ChatProviderError(
        "provider",
        status === undefined || status === 408 || status === 429 || status >= 500,
        status,
        status === undefined ? "network_error" : `http_${status}`,
      );
    }
  }
}
