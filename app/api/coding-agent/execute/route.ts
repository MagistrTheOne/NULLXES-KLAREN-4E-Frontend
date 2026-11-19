import { runCodingAgentToolCall } from "@/lib/coding-agent/orchestrator";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { readLimitedBody } from "@/lib/http/read-limited-body";

const MAX_BYTES = 32_768;

export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    const user = await getAuthenticatedUser();
    if (!user) return Response.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    userId = user.id;
  } catch {
    return Response.json({ error: "Не удалось проверить сессию." }, { status: 503 });
  }

  const body = await readLimitedBody(request, MAX_BYTES);
  if (body === null) {
    return Response.json({ error: "Запрос слишком большой." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Некорректный JSON." }, { status: 400 });
  }

  const requestId = crypto.randomUUID();
  const result = await runCodingAgentToolCall(payload, { userId, requestId });

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}