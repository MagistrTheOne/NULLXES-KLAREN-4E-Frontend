import { requireVoiceUser } from "@/lib/voice/server/auth";
import { resolveKlarenciaVoice, voiceModelId } from "@/lib/voice/server/eleven-v4";

export async function GET(): Promise<Response> {
  const account = await requireVoiceUser();
  if (account instanceof Response) return account;
  const user = account;
  if (!process.env.ELEVENLABS_API_KEY || !process.env.XAI_API_KEY) {
    return Response.json({ ready: false, model: voiceModelId(), message: "Голосовой backend не настроен." }, { status: 503 });
  }
  try {
    const voiceId = await resolveKlarenciaVoice();
    return Response.json({ ready: true, voice: "KLARENCIA MARIA", voiceId, model: voiceModelId(), stt: "grok-voice-transcribe-2.0" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ready: false, model: voiceModelId(), message: "Не удалось найти KLARENCIA MARIA в библиотеке ElevenLabs." }, { status: 503 });
  }
}
