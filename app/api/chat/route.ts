import {
  chatRequestSchema,
  MAX_CHAT_REQUEST_BYTES,
  type ChatStreamEvent,
} from "@/lib/chat/chat-contract";
import { formatChatSseEvent } from "@/lib/chat/chat-sse";
import { buildChatInstructions } from "@/lib/chat/server/chat-instructions";
import { ChatProviderError } from "@/lib/chat/server/provider-error";
import { XAIChatAdapter } from "@/lib/chat/server/xai-adapter";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { verifyFileProof } from "@/lib/chat/server/file-proof";
import { readLimitedBody } from "@/lib/http/read-limited-body";

const encoder = new TextEncoder();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 10;
const requestTimestamps = new Map<string, number[]>();

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const requests = (requestTimestamps.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (requests.length >= RATE_LIMIT_REQUESTS) {
    requestTimestamps.set(key, requests);
    return true;
  }
  requests.push(now);
  requestTimestamps.set(key, requests);
  if (requestTimestamps.size > 10_000) {
    for (const [clientKey, timestamps] of requestTimestamps) {
      if (!timestamps.some((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)) {
        requestTimestamps.delete(clientKey);
      }
    }
    while (requestTimestamps.size > 10_000) {
      const oldestKey = requestTimestamps.keys().next().value;
      if (oldestKey === undefined) break;
      requestTimestamps.delete(oldestKey);
    }
  }
  return false;
}

function encodeEvent(event: ChatStreamEvent): Uint8Array {
  return encoder.encode(formatChatSseEvent(event));
}

function logProviderFailure(error: unknown): void {
  console.error("Chat provider failed.", {
    provider: "xai",
    reason:
      error instanceof ChatProviderError
        ? error.failureReason ?? error.code
        : "unexpected",
    status: error instanceof ChatProviderError ? error.status : undefined,
    retryable: error instanceof ChatProviderError && error.retryable,
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.NEON_AUTH_BASE_URL) {
    return jsonError("Чат временно недоступен.", 503);
  }

  let userId: string;
  try {
    const user = await getAuthenticatedUser();
    if (!user) return jsonError("Войдите в аккаунт, чтобы продолжить.", 401);
    userId = user.id;
  } catch (error) {
    console.error("Chat session lookup failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Не удалось проверить сессию. Повторите попытку.", 503);
  }

  if (isRateLimited(userId)) {
    return jsonError("Слишком много запросов. Повторите попытку позже.", 429);
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return jsonError("Некорректный запрос.", 403);
    } catch {
      return jsonError("Некорректный запрос.", 403);
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CHAT_REQUEST_BYTES) {
    return jsonError("Сообщение слишком большое.", 413);
  }

  const body = await readLimitedBody(request, MAX_CHAT_REQUEST_BYTES);
  if (body === null) return jsonError("Сообщение слишком большое.", 413);

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return jsonError("Некорректный запрос.", 400);
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Проверьте текст сообщения и повторите попытку.", 400);
  }

  const verifiedFiles: string[] = [];
  for (const file of parsed.data.files) {
    if (!verifyFileProof(userId, file.id, file.proof)) return jsonError("Недоступное вложение.", 403);
    verifiedFiles.push(file.id);
  }

  const abortController = new AbortController();
  const abortRequest = () => abortController.abort(request.signal.reason);
  if (request.signal.aborted) abortRequest();
  else request.signal.addEventListener("abort", abortRequest, { once: true });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        const messages = parsed.data.messages;
        const instructions = buildChatInstructions(parsed.data.personalization ?? {
          userName: "",
          userContext: "",
          pinnedMemories: [],
          projectContext: "",
          sharpness: "wry",
          roleplayEnabled: false,
          adultThemesEnabled: false,
          codingModeEnabled: false,
          codingStyle: "balanced",
        });
        let hasContent = false;
        const onDelta = (delta: string) => {
          if (delta && !abortController.signal.aborted) {
            hasContent = true;
            controller.enqueue(encodeEvent({ type: "message.delta", delta }));
          }
        };
        try {
          await new XAIChatAdapter().stream({
            messages,
            images: parsed.data.images,
            files: verifiedFiles,
            instructions,
            signal: abortController.signal,
            onDelta,
          });
          if (!hasContent) {
            throw new ChatProviderError("protocol", true, undefined, "empty_response");
          }

          if (!abortController.signal.aborted) {
            controller.enqueue(encodeEvent({ type: "message.completed" }));
            controller.close();
          }
        } catch (error: unknown) {
          if (abortController.signal.aborted) return;
          logProviderFailure(error);
          controller.enqueue(
            encodeEvent({
              type: "message.error",
              message: "Не удалось отправить сообщение. Повторите попытку.",
              retryable:
                error instanceof ChatProviderError
                  ? error.retryable
                  : true,
            }),
          );
          controller.close();
        } finally {
          request.signal.removeEventListener("abort", abortRequest);
        }
      })();
    },
    cancel() {
      abortController.abort();
      request.signal.removeEventListener("abort", abortRequest);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
