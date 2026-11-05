import { getAuthenticatedUser } from "@/lib/auth/server";
import {
  KLAREN_VIDEO_AVATAR_ID,
  KLAREN_VIDEO_PERSONA_ID,
  KLAREN_VIDEO_PROMPT,
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

async function getAgentId(key: string): Promise<string> {
  if (process.env.ELEVENLABS_AGENT_ID?.trim()) return process.env.ELEVENLABS_AGENT_ID.trim();
  const url = new URL("/v1/convai/agents", ELEVEN);
  url.searchParams.set("page_size", "100");
  url.searchParams.set("search", "KLAREN");
  const response = await fetch(url, {
    headers: { "xi-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("agent-discovery");
  const data = await response.json() as { agents?: Array<{ agent_id?: string; name?: string }> };
  const agents = (data.agents ?? []).filter((entry) =>
    Boolean(entry.agent_id && /klaren|кларен/i.test(entry.name ?? "")));
  if (agents.length !== 1 || !agents[0]?.agent_id) throw new Error("agent-ambiguous");
  return agents[0].agent_id;
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
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  if (!anamKey || !elevenKey) return failure("Настрой ANAM_API_KEY и ELEVENLABS_API_KEY в корневом .env.", 503);

  const now = Date.now();
  const recent = (attempts.get(session.id) ?? []).filter((stamp) => stamp > now - 60_000);
  if (recent.length >= 4) return failure("Слишком много попыток видеозвонка.", 429);
  recent.push(now);
  attempts.set(session.id, recent);
  if (attempts.size > 1000) attempts.clear();

  try {
    // Read-only check of the saved persona: no remote mutation is performed.
    const personaResponse = await fetch(`${ANAM}/v1/personas/${KLAREN_VIDEO_PERSONA_ID}`, {
      headers: { Authorization: `Bearer ${anamKey}` }, cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!personaResponse.ok) return failure("Сохранённая персона KLAREN недоступна в Anam.", 502);
    const persona = await personaResponse.json() as {
      avatarId?: string; avatar?: { id?: string }; config?: { avatarId?: string };
    };
    const knownAvatar = persona.avatarId ?? persona.config?.avatarId ?? persona.avatar?.id;
    if (knownAvatar && knownAvatar !== KLAREN_VIDEO_AVATAR_ID) {
      return failure("Avatar ID сохранённой персоны не совпадает с утверждённым KLAREN Avatar ID.", 409);
    }

    const agentId = await getAgentId(elevenKey);
    const signedUrlResponse = await fetch(
      `${ELEVEN}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": elevenKey }, cache: "no-store", signal: AbortSignal.timeout(15_000) },
    );
    if (!signedUrlResponse.ok) return failure("Не удалось получить подписанный ElevenLabs Agent URL.", 502);
    const signed = await signedUrlResponse.json() as { signed_url?: string };
    if (!signed.signed_url?.startsWith("wss://")) return failure("ElevenLabs вернул недействительный подписанный URL.", 502);

    const tokenResponse = await fetch(`${ANAM}/v1/auth/session-token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${anamKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personaConfig: { personaId: KLAREN_VIDEO_PERSONA_ID },
        environment: {
          elevenLabsAgentSettings: {
            signedUrl: signed.signed_url,
            agentId,
            conversationConfigOverride: {
              agent: { prompt: { prompt: KLAREN_VIDEO_PROMPT }, language: "ru" },
            },
          },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!tokenResponse.ok) {
      return failure("Anam не создал сессию. Проверь разрешение override промпта агента и доступ к персоне.", 502);
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
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return failure("ELEVENLABS_API_KEY не настроен.", 503);
  try {
    const agentId = await getAgentId(key);
    return Response.json({
      configured: Boolean(process.env.ANAM_API_KEY),
      agentId,
      personaId: KLAREN_VIDEO_PERSONA_ID,
      avatarId: KLAREN_VIDEO_AVATAR_ID,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("Агент KLAREN не найден однозначно. Укажи ELEVENLABS_AGENT_ID.", 409);
  }
}
