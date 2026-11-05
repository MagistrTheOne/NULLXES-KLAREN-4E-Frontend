import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  KLAREN_VIDEO_AVATAR_ID,
  KLAREN_VIDEO_PERSONA_ID,
} from "@/lib/avatar/klaren-persona";

const ANAM = "https://api.anam.ai";
const ELEVEN = "https://api.elevenlabs.io";
const attempts = new Map<string, number[]>();

function failure(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function authorized(): Promise<{ id: string } | Response> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return failure("Требуется авторизация.", 401);
    return { id: user.id };
  } catch {
    return failure("Neon Auth временно недоступен.", 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await authorized();
  if (session instanceof Response) return session;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) return failure("Некорректный источник запроса.", 403);
    } catch { return failure("Некорректный источник запроса.", 403); }
  }
  const anamKey = process.env.ANAM_API_KEY;
  if (!anamKey) return failure("Настрой ANAM_API_KEY в корневом .env.", 503);

  const now = Date.now();
  const recent = (attempts.get(session.id) ?? []).filter((stamp) => stamp > now - 60_000);
  if (recent.length >= 4) return failure("Слишком много попыток видеозвонка.", 429);
  recent.push(now);
  attempts.set(session.id, recent);
  if (attempts.size > 1000) attempts.clear();

  try {
    const tokenResponse = await fetch(`${ANAM}/v1/auth/session-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${anamKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personaConfig: {
          name: "KLAREN 4E",
          avatarId: KLAREN_VIDEO_AVATAR_ID,
          enableAudioPassthrough: true,
          llmId: "CUSTOMER_CLIENT_V1",
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!tokenResponse.ok) {
      return failure("Anam не создал audio passthrough сессию. Проверь доступ к аватару.", 502);
    }
    const token = await tokenResponse.json() as { sessionToken?: string };
    if (!token.sessionToken) return failure("Anam не вернул sessionToken.", 502);
    return Response.json({ sessionToken: token.sessionToken }, {
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "agent-ambiguous") {
      return failure("Нужен ELEVENLABS_AGENT_ID: агент KLAREN не найден однозначно.", 409);
    }
    return failure("Не удалось установить соединение с Anam/ElevenLabs.", 503);
  }
}

export async function GET(): Promise<Response> {
  const session = await authorized();
  if (session instanceof Response) return session;
  return Response.json({
    configured: Boolean(process.env.ANAM_API_KEY && process.env.ELEVENLABS_API_KEY && process.env.XAI_API_KEY),
    mode: "external-audio-passthrough",
    personaId: KLAREN_VIDEO_PERSONA_ID,
    avatarId: KLAREN_VIDEO_AVATAR_ID,
    voiceResourceId: "e738bbd5-79e5-424b-8cbc-6091ef01b82b",
    llm: "xai",
    tts: "eleven_v4_turbo",
  }, { headers: { "Cache-Control": "no-store" } });
}
