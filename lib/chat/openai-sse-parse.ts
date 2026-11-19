export interface OpenAICompatibleChunk {
  choices?: Array<{
    delta?: { content?: string | null };
  }>;
}

export async function consumeOpenAIChatCompletionStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedDone = false;
  let receivedToken = false;

  try {
    while (!receivedDone) {
      if (signal.aborted) {
        throw new Error("aborted");
      }

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
          throw new Error("invalid_sse_json");
        }

        const content = chunk.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) {
          receivedToken = true;
          onDelta(content);
        }
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  if (!receivedToken) {
    throw new Error("empty_stream");
  }
}