import { getAuthenticatedUser } from "@/lib/auth/server";
import { cleanSpokenText, resolveKlarenciaVoice } from "@/lib/voice/server/eleven-v4";

export const runtime = "nodejs";

const recent = new Map<string, number[]>();

export async function POST(request: Request): Promise<Response> {
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) return Response.json({ error: "Требуется авторизация." }, { status: 401 });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "ElevenLabs не настроен." }, { status: 503 });

  const now = Date.now();
  const activity = (recent.get(user.id) ?? []).filter((t) => now - t < 60_000);
  if (activity.length >= 6) return Response.json({ error: "Слишком много голосовых запросов." }, { status: 429 });
  activity.push(now);
  recent.set(user.id, activity);

  const payload: unknown = await request.json().catch(() => null);
  const value = payload && typeof payload === "object" && "text" in payload ? payload.text : null;
  if (typeof value !== "string" || value.length > 8_000) {
    return Response.json({ error: "Некорректный текст." }, { status: 400 });
  }
  const text = cleanSpokenText(value);
  if (!text) return Response.json({ error: "Нет текста для озвучки." }, { status: 422 });

  let voiceId: string;
  try { voiceId = await resolveKlarenciaVoice(); }
  catch { return Response.json({ error: "KLARENCIA MARIA не найдена." }, { status: 503 }); }

  let socket: WebSocket | null = null;
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function finish(error?: Error) {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        socket?.close();
        request.signal.removeEventListener("abort", abort);
        if (error) controller.error(error);
        else controller.close();
      }
      const abort = () => finish();
      request.signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(() => finish(new Error("Voice stream timed out.")), 70_000);
      socket = new WebSocket("wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input?model_id=eleven_v4_turbo&output_format=mp3_44100_128&language_code=ru");
      socket.addEventListener("open", () => {
        if (closed || !socket) return;
        socket.send(JSON.stringify({ voices: [voiceId], xi_api_key: key }));
        socket.send(JSON.stringify({ inputs: [{ text, voice_id: voiceId }] }));
        socket.send(JSON.stringify({ close_socket: true }));
      });
      socket.addEventListener("message", (event) => {
        if (closed) return;
        try {
          const packet = JSON.parse(String(event.data)) as { audio?: string; error?: unknown; is_final?: boolean };
          if (packet.error) return finish(new Error("ElevenLabs V4 stream failed."));
          if (packet.audio) controller.enqueue(Buffer.from(packet.audio, "base64"));
          if (packet.is_final) finish();
        } catch {
          finish(new Error("Invalid V4 audio packet."));
        }
      });
      socket.addEventListener("error", () => finish(new Error("V4 websocket connection failed.")));
      socket.addEventListener("close", () => finish());
    },
    cancel() {
      closed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
