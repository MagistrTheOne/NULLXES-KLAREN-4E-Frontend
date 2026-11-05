import type {
  ChatPersonalization,
  ChatRequestMessage,
  ChatStreamEvent,
} from "@/lib/chat/chat-contract";

const SEND_ERROR = "Не удалось отправить сообщение. Повторите попытку.";

export async function streamChatResponse(
  messages: ChatRequestMessage[],
  options: {
    signal: AbortSignal;
    onDelta: (delta: string) => void;
    personalization: ChatPersonalization;
  },
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, personalization: options.personalization }),
    signal: options.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(SEND_ERROR);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");

        if (data) {
          let event: ChatStreamEvent;
          try {
            event = JSON.parse(data) as ChatStreamEvent;
          } catch {
            throw new Error(SEND_ERROR);
          }

          if (event.type === "message.delta" && typeof event.delta === "string") {
            options.onDelta(event.delta);
          } else if (event.type === "message.completed") {
            completed = true;
          } else if (event.type === "message.error") {
            throw new Error(SEND_ERROR);
          } else {
            throw new Error(SEND_ERROR);
          }
        }
        boundary = buffer.indexOf("\n\n");
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  if (!completed) throw new Error(SEND_ERROR);
}
