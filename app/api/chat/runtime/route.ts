import { getAuthenticatedUser } from "@/lib/auth/server";
import { describeActiveChatRuntime } from "@/lib/chat/server/resolve-chat-adapter";

export async function GET(): Promise<Response> {
  if (!process.env.NEON_AUTH_BASE_URL) {
    return Response.json({ error: "Требуется настройка аккаунта." }, { status: 503 });
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }
  } catch (error) {
    console.error("Chat runtime session lookup failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Не удалось проверить сессию." }, { status: 503 });
  }

  return Response.json(describeActiveChatRuntime(), {
    headers: { "Cache-Control": "no-store" },
  });
}