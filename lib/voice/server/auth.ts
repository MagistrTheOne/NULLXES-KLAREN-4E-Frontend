import "server-only";
import { getAuthenticatedUser } from "@/lib/auth/server";

export async function requireVoiceUser(): Promise<{ id: string } | Response> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return Response.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    return { id: user.id };
  } catch {
    return Response.json({ error: "Neon Auth временно недоступен. Повторите запрос." }, { status: 503 });
  }
}
