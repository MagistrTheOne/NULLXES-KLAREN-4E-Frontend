import { getAuthenticatedUser } from "@/lib/auth/server";
import { cleanSpokenText, resolveKlarenciaVoice } from "@/lib/voice/server/eleven-v4";

const recent = new Map<string, number[]>();
export async function POST(request: Request): Promise<Response> {
  let user: Awaited<ReturnType<typeof getAuthenticatedUser>>;
  try { user = await getAuthenticatedUser(); }
  catch { return Response.json({ error: "Neon Auth временно недоступен." }, { status: 503 }); }
  if (!user) return Response.json({ error: "Требуется авторизация." }, { status: 401 });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "Не задан ELEVENLABS_API_KEY." }, { status: 503 });
  const now = Date.now();
  const entries = (recent.get(user.id) ?? []).filter((time) => time > now - 60_000);
  if (entries.length >= 8) return Response.json({ error: "Лимит голосовых запросов." }, { status: 429 });
  entries.push(now); recent.set(user.id, entries);
  if (recent.size > 1_000) recent.clear();

  const body: unknown = await request.json().catch(() => null);
  const value = body && typeof body === "object" && "text" in body ? body.text : null;
  if (typeof value !== "string" || value.length > 8_000) {
    return Response.json({ error: "Некорректная реплика." }, { status: 400 });
  }
  const text = cleanSpokenText(value);
  if (!text) return Response.json({ error: "Реплика пуста." }, { status: 422 });

  try {
    const voiceId = await resolveKlarenciaVoice();
    const upstream = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue/stream?output_format=pcm_16000", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model_id: "eleven_v4_turbo",
        language_code: "ru",
        inputs: [{ text, voice_id: voiceId }],
      }),
      cache: "no-store",
      signal: request.signal,
    });
    if (!upstream.ok || !upstream.body) {
      // The voice resource must be validated by the provider; never fall back to a different voice.
      return Response.json({ error: "Eleven V4 не принял голос или PCM 16000. Проверь voice ID и доступ модели." }, { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Audio-Encoding": "pcm_s16le",
        "X-Audio-Sample-Rate": "16000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "ElevenLabs V4 временно недоступен." }, { status: 503 });
  }
}
