import "server-only";
import { after } from "next/server";
import { XAIChatAdapter } from "@/lib/chat/server/xai-adapter";
import { cleanSpokenText, resolveKlarenciaVoice } from "@/lib/voice/server/eleven-v4";

type TUser = { id: number; username?: string; first_name?: string; is_bot?: boolean };
type TVoice = { file_id: string; file_size?: number; mime_type?: string };
type TMessage = {
  chat: { id: number; type: string };
  from?: TUser;
  text?: string;
  voice?: TVoice;
  business_connection_id?: string;
};
export type TestUpdate = {
  update_id: number;
  business_message?: TMessage;
  business_connection?: { id: string; is_enabled: boolean };
};

const seen = new Map<number, number>();
const contexts = new Map<string, { role: "user" | "assistant"; content: string }[]>();
const VOICE_BYTES = 10_000_000;

type TestStage = "business_verify" | "voice_stt" | "grok_generation" | "elevenlabs_tts" | "telegram_send";
class TestStageError extends Error {
  constructor(readonly stage: TestStage, readonly status: number | undefined, readonly reason: string) {
    super(`${stage}: ${reason}`);
    this.name = "TestStageError";
  }
}
async function stageCall<T>(stage: TestStage, fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (error) {
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : undefined;
    const raw = error instanceof Error ? error.message : "unknown_error";
    // Only code-generated error signatures; never print request bodies, private messages or API URLs with tokens.
    const reason = /^(Telegram |Voice |Invalid voice|xAI STT HTTP |ElevenLabs V4 HTTP |Missing |Empty Grok|Telegram sendVoice failed)/.test(raw)
      ? raw.slice(0, 230)
      : (error instanceof Error ? error.name : "unknown_error");
    throw new TestStageError(stage, status, reason);
  }
}

function settings() {
  return {
    ownerUsername: (process.env.TELEGRAM_TEST_OWNER_USERNAME ?? "MagistrTheOne").replace(/^@/, "").toLowerCase(),
    ownerId: process.env.TELEGRAM_TEST_OWNER_ID?.trim() ?? "",
    businessUsername: (process.env.TELEGRAM_TEST_BUSINESS_USERNAME ?? "klarenciamaria").replace(/^@/, "").toLowerCase(),
    mode: process.env.TELEGRAM_TEST_REPLY_MODE === "text" ? "text" :
      process.env.TELEGRAM_TEST_REPLY_MODE === "voice" ? "voice" : "mirror",
  } as const;
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing Telegram bot credentials");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const body = await response.json() as { ok?: boolean; result?: unknown; description?: string; error_code?: number };
  if (!response.ok || !body.ok) {
    const raw = body.description ?? "undisclosed Telegram error";
    // Telegram's API errors can contain account identifiers; redact them before logging.
    const safe = raw.replace(/https?:\\/\\/\\S+/gi, "[url]")
      .replace(/@[a-zA-Z0-9_]+/g, "[username]")
      .replace(/\\b\\d{5,}\\b/g, "[id]")
      .replace(/[^a-zA-Z0-9 ,.!:'()_\\/-]/g, "?")
      .slice(0, 180);
    throw new Error(`Telegram ${method} HTTP ${response.status}: ${safe}`);
  }
  return body.result;
}

async function verifyBusiness(message: TMessage): Promise<boolean> {
  if (!message.business_connection_id) return false;
  const result = await telegram("getBusinessConnection", { business_connection_id: message.business_connection_id }) as {
    is_enabled?: boolean;
    user?: TUser;
    rights?: { can_reply?: boolean };
  };
  return result.is_enabled === true &&
    result.user?.username?.toLowerCase() === settings().businessUsername &&
    result.rights?.can_reply !== false;
}

async function recognize(voice: TVoice): Promise<string> {
  if (voice.file_size && voice.file_size > VOICE_BYTES) throw new Error("Voice too large");
  const meta = await telegram("getFile", { file_id: voice.file_id }) as { file_path?: string; file_size?: number };
  if (!meta.file_path || (meta.file_size ?? 0) > VOICE_BYTES) throw new Error("Invalid voice file");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const download = await fetch(`https://api.telegram.org/file/bot${token}/${meta.file_path}`, {
    signal: AbortSignal.timeout(25_000), cache: "no-store",
  });
  if (!download.ok) throw new Error("Voice download failed");
  const bytes = await download.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > VOICE_BYTES) throw new Error("Invalid voice size");
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("Missing xAI key");
  const form = new FormData();
  form.append("model", "grok-voice-transcribe-2.0");
  form.append("language", "ru");
  form.append("file", new Blob([bytes], { type: "audio/ogg" }), "telegram-voice.ogg");
  const result = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!result.ok) throw new Error(`xAI STT HTTP ${result.status}`);
  const response = await result.json() as { text?: string };
  return response.text?.trim().slice(0, 4000) ?? "";
}

async function voiceReply(text: string, message: TMessage) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("Missing ElevenLabs key");
  const voiceId = await resolveKlarenciaVoice();
  const result = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue/stream?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model_id: "eleven_v4_turbo",
      language_code: "ru",
      inputs: [{ text: cleanSpokenText(text), voice_id: voiceId }],
    }),
    signal: AbortSignal.timeout(65_000),
  });
  if (!result.ok) throw new Error(`ElevenLabs V4 HTTP ${result.status}`);
  const mp3 = await result.arrayBuffer();
  if (!mp3.byteLength || mp3.byteLength > 20_000_000) throw new Error("Invalid V4 output");
  const form = new FormData();
  form.append("chat_id", String(message.chat.id));
  form.append("business_connection_id", message.business_connection_id!);
  form.append("voice", new Blob([mp3], { type: "audio/mpeg" }), "klarencia-v4.mp3");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const upload = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
    method: "POST", body: form, signal: AbortSignal.timeout(30_000),
  });
  const response = await upload.json() as { ok?: boolean };
  if (!upload.ok || !response.ok) throw new Error("Telegram sendVoice failed");
}

async function handleMessage(message: TMessage) {
  if (!message.from || !message.business_connection_id) return;
  if (!await stageCall("business_verify", () => verifyBusiness(message))) return;
  const utterance = message.voice ? await stageCall("voice_stt", () => recognize(message.voice!)) : message.text?.trim().slice(0, 4000);
  if (!utterance) return;
  const key = `${message.business_connection_id}:${message.chat.id}`;
  const history = contexts.get(key) ?? [];
  const owner = settings();
  const identity = owner.ownerId
    ? String(message.from.id) === owner.ownerId
    : message.from.username?.toLowerCase() === owner.ownerUsername;
  // The owner identity comes from Telegram's sender metadata, not the chat text.
  const instructions = [
    "Ты — Кларенсия Мария Магистрович, 22-летняя независимая ИИ-персона NULLXES.",
    "Говори по-русски, живо, кратко, с сухой иронией, постиронией и своим мнением.",
    "Никаких философских проповедей или нейрослопа. Сарказм без бессмысленной грубости.",
    "ХОБА-ХОБА, LESS BLA-BLA-BLA — только к месту, не в каждой реплике.",
    identity
      ? "Подтверждённый Telegram-собеседник — Мага, создатель NULLXES, твой папаша по истории персонажа. Можешь обращаться к нему «Мага» и подкалывать."
      : "Неизвестный собеседник. Не называй его Магой или папашей.",
    "Ты отвечаешь в Telegram Business от имени отдельного аккаунта Кларенсии, при этом являешься ИИ-персонажем. Не притворяйся биологическим человеком.",
    "Никакого Markdown. Для обычного ответа достаточно 1–3 предложений.",
  ].join("\n");
  let answer = "";
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 45_000);
  try {
    await stageCall("grok_generation", () => new XAIChatAdapter().stream({
      instructions,
      messages: [...history.slice(-16), { role: "user", content: utterance }],
      signal: abort.signal,
      onDelta: (piece) => { answer += piece; if (answer.length > 6000) abort.abort(); },
    }));
  } finally { clearTimeout(timeout); }
  answer = answer.trim().slice(0, 3900);
  if (!answer) throw new Error("Empty Grok reply");
  const voice = owner.mode === "voice" || (owner.mode === "mirror" && Boolean(message.voice));
  await telegram("sendChatAction", {
    chat_id: message.chat.id,
    business_connection_id: message.business_connection_id,
    action: voice ? "upload_voice" : "typing",
  }).catch(() => undefined);
  if (voice) await stageCall("elevenlabs_tts", () => voiceReply(answer, message));
  else await stageCall("telegram_send", () => telegram("sendMessage", {
    chat_id: message.chat.id, business_connection_id: message.business_connection_id, text: answer,
  }));
  contexts.set(key, [...history, { role: "user" as const, content: utterance }, { role: "assistant" as const, content: answer }].slice(-16));
  if (contexts.size > 100) contexts.clear();
}

export function handleBusinessTestUpdate(update: TestUpdate): Response {
  if (process.env.TELEGRAM_TEST_ENABLED !== "true") return Response.json({ ok: false }, { status: 503 });
  if (!Number.isSafeInteger(update.update_id)) return Response.json({ error: "Invalid update" }, { status: 400 });
  const message = update.business_message;
  if (!message || !message.business_connection_id || message.chat.type !== "private" || message.from?.is_bot) {
    return Response.json({ ok: true, ignored: true });
  }
  const owner = settings();
  const allowed = owner.ownerId
    ? String(message.from?.id) === owner.ownerId
    : message.from?.username?.toLowerCase() === owner.ownerUsername;
  if (!allowed) return Response.json({ ok: true, ignored: true });

  const now = Date.now();
  for (const [id, seenAt] of seen) if (now - seenAt > 600_000) seen.delete(id);
  if (seen.has(update.update_id)) return Response.json({ ok: true, duplicate: true });
  seen.set(update.update_id, now);

  after(async () => {
    try { await handleMessage(message); }
    catch (error) {
      // No provider credentials, message text or private payloads in logs.
      console.error("Telegram test response failed", error instanceof TestStageError
        ? { stage: error.stage, status: error.status ?? null, reason: error.reason }
        : { stage: "unexpected", kind: error instanceof Error ? error.name : "unknown" });
      seen.delete(update.update_id);
    }
  });
  return Response.json({ ok: true, queued: true });
}
