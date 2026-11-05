import { requireVoiceUser } from "@/lib/voice/server/auth";

export async function POST(request: Request): Promise<Response> {
  const account = await requireVoiceUser();
  if (account instanceof Response) return account;
  const user = account;
  const key = process.env.XAI_API_KEY;
  if (!key) return Response.json({ error: "Распознавание недоступно." }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 10_500_000) {
    return Response.json({ error: "Аудио слишком большое." }, { status: 413 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10_000_000 ||
      !["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav"].includes(file.type.split(";")[0] ?? "")) {
    return Response.json({ error: "Неподдерживаемый аудиоформат или размер." }, { status: 400 });
  }
  const body = new FormData();
  body.append("model", "grok-voice-transcribe-2.0");
  body.append("language", "ru");
  body.append("file", file, file.name || "speech.webm");
  try {
    const response = await fetch("https://api.x.ai/v1/stt", {
      method: "POST", headers: { Authorization: `Bearer ${key}` },
      body, cache: "no-store", signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return Response.json({ error: "Распознавание речи завершилось ошибкой." }, { status: 502 });
    const data = await response.json() as { text?: string };
    const text = data.text?.trim().slice(0, 8_000);
    if (!text) return Response.json({ error: "Речь не распознана." }, { status: 422 });
    return Response.json({ text });
  } catch {
    return Response.json({ error: "Сервис распознавания временно недоступен." }, { status: 503 });
  }
}
