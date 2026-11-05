import { requireVoiceUser } from "@/lib/voice/server/auth";
import { cleanSpokenText, resolveKlarenciaVoice } from "@/lib/voice/server/eleven-v4";

export async function POST(request: Request): Promise<Response> {
  const account = await requireVoiceUser();
  if (account instanceof Response) return account;
  const user = account;
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "Озвучка недоступна." }, { status: 503 });
  const data: unknown = await request.json().catch(() => null);
  const input = data && typeof data === "object" && "text" in data ? data.text : null;
  if (typeof input !== "string" || input.length > 8000) return Response.json({ error: "Некорректный текст." }, { status: 400 });
  const text = cleanSpokenText(input);
  if (!text) return Response.json({ error: "Пустой текст." }, { status: 422 });
  try {
    const voiceId = await resolveKlarenciaVoice();
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue/stream?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: "eleven_v4_turbo", language_code: "ru", inputs: [{ text, voice_id: voiceId }] }),
      cache: "no-store", signal: request.signal,
    });
    if (!response.ok || !response.body) return Response.json({ error: "Ошибка ElevenLabs V4." }, { status: 502 });
    return new Response(response.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Соединение с ElevenLabs недоступно." }, { status: 503 });
  }
}
