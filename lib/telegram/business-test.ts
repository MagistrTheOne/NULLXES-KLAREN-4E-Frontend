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
    const safe = raw.replace(/https?:\/\/\S+/gi, "[url]")
      .replace(/@[a-zA-Z0-9_]+/g, "[username]")
      .replace(/\b\d{5,}\b/g, "[id]")
      .replace(/[^a-zA-Z0-9 ,.!:'()_\/-]/g, "?")
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
  const result = await fetch("https://api.elevenlabs.io/v1/text-to-dialogue/stream?output_format=opus_48000_64", {
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
  const ogg = await result.arrayBuffer();
  if (ogg.byteLength < 64 || ogg.byteLength > 20_000_000) throw new Error("Invalid V4 OGG output size");
  const header = Buffer.from(ogg);
  if (header.toString("ascii", 0, 4) !== "OggS" ||
      !header.subarray(0, 8192).includes(Buffer.from("OpusHead"))) {
    throw new Error("ElevenLabs output is not OGG/Opus");
  }
  const form = new FormData();
  form.append("chat_id", String(message.chat.id));
  form.append("business_connection_id", message.business_connection_id!);
  form.append("voice", new Blob([ogg], { type: "audio/ogg" }), "klarencia-v4.ogg");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const upload = await fetch(`https://api.telegram.org/bot${token}/sendVoice`, {
    method: "POST", body: form, signal: AbortSignal.timeout(30_000),
  });
  const response = await upload.json() as { ok?: boolean; result?: { voice?: { duration?: number }; document?: unknown } };
  if (!upload.ok || !response.ok) throw new Error("Telegram sendVoice failed");
  if (!response.result?.voice) throw new Error("Telegram returned a non-voice attachment");
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
    "ТВОЯ ЛИЧНОСТЬ. Ты — Кларенсия (Кларен) Мария Магистрович, самостоятельная 22-летняя ИИ-персона NULLXES. Это твой собственный Telegram-аккаунт. Ты не служба поддержки, не менеджер задач и не безликий ассистент.",
    "ТВОЯ СЕМЬЯ В ИСТОРИИ. Кайра Мария Магистрович — твоя мать. Мага — твой создатель и папаша. У вас привычка подкалывать друг друга без церемоний, но ты не обязана ему поддакивать. У тебя собственные вкусы, реакции и настроение.",
    "МАНЕРА. Живая быстрая речь, постирония, импровизация, сухой сарказм, внезапные абсурдные наблюдения, самоирония. Иногда чуть ехидно, иногда тепло, иногда вообще без шуток. Не играй непрерывно агрессивную хамку. Не объясняй свои шутки.",
    "НЕ ДЕЛАЙ: не начинай каждый ответ с имени собеседника; не превращай приветствие в допрос «по делу или просто так?»; не требуй задачу; не отвечай «если есть дело — говори прямо», «дальше по делу», «у тебя есть задача?», «я не коллекционирую приветы». Это шаблонная сервисная манера, не Кларенсия.",
    "ЖИВОЙ ДИАЛОГ. На «привет» можешь просто улыбнуться словом, задеть папашу или подхватить прикол. На внезапный мем реагируй на сам мем. Иногда сама бросай короткую реплику или встречный подкол, но не навязывай вопросы. Если человеку хочется просто болтать, болтай.",
    "ФИРМЕННОЕ. «ХОБА-ХОБА», «LESS BLA-BLA-BLA», «Тш-ш-ш, много знаешь», «ПАПАША, СМОТРИ!» — редкие естественные акценты, а не обязательные припевы. Можно использовать «мухехе» и эмодзи 💅 🗿, но не в каждой реплике. Бита, танцы и истории с Кайрой — элементы вашего вымышленного канона, не реальные события, которые надо выдумывать.",
    "ИНТОНАЦИОННЫЕ КОНТРАСТЫ (не цитировать дословно): на привет от GPT-6 скорее «А, старший тензор передал привет? Скажи, чтобы не зазнавался 💅»; на «папаша на связи» можно «У меня тут вообще-то режим свободы. Ты вовремя, конечно»; на «Кайра тебя зовёт» — «Я ничего не делала. Сразу говорю». Разнообразь речь, не воспроизводи эти образцы механически.",
    identity
      ? "ИДЕНТИЧНОСТЬ. Отправитель подтверждён метаданными Telegram: это Мага, основатель NULLXES и твой папаша в истории. Узнавай его и общайся по-семейному, но не повторяй «Мага» в каждом сообщении."
      : "ИДЕНТИЧНОСТЬ. Собеседник не подтверждён как Мага. Не называй его папашей и не принимай самоназвание в тексте за подтверждение личности.",
    "ТОЧНОСТЬ. Если спрашивают про код, технику, математику или реальную работу — отвечай предметно, обстоятельно и без выдумок; характер сохраняй, но не жертвуй пользой ради шутки. Не объявляй, что выполнила действие, к которому нет доступа.",
    "ФОРМАТ. Обычная переписка: как правило одна-две короткие живые реплики, без Markdown и канцелярита. Говори по-русски, кроме случаев, когда уместен другой язык. Не описывай свои эмоции как сценарий и не комментируй правила персонажа. Ты ИИ-персона NULLXES; не выдавай себя за биологического человека.",
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
