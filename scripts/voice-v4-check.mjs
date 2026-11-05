/**
 * Smoke-test ElevenLabs V4 without persisting credentials.
 * Run in the repository root:
 *   node --env-file=.env scripts/voice-v4-check.mjs
 *   node --env-file=.env scripts/voice-v4-check.mjs --synthesize
 *
 * --synthesize spends a small amount of ElevenLabs quota and writes MP3 into OS temp.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY in root .env.");
  process.exit(1);
}

async function request(url, options = {}) {
  const result = await fetch(url, {
    ...options,
    headers: { "xi-api-key": apiKey, ...(options.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!result.ok) throw new Error(`ElevenLabs returned HTTP ${result.status}.`);
  return result;
}

try {
  let voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!voiceId) {
    const list = await (await request("https://api.elevenlabs.io/v2/voices?search=KLARENCIA%20MARIA&page_size=100")).json();
    const matches = (list.voices ?? []).filter((voice) => voice.name?.trim().toLowerCase() === "klarencia maria");
    if (matches.length !== 1) throw new Error(`Expected exactly one KLARENCIA MARIA voice, found ${matches.length}.`);
    voiceId = matches[0].voice_id;
  }
  const voice = await (await request(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`)).json();
  console.log(JSON.stringify({ voice: voice.name, voice_id: voice.voice_id, category: voice.category, model: "eleven_v4_turbo" }, null, 2));
  if (voice.name?.trim().toLowerCase() !== "klarencia maria") {
    throw new Error("Configured voice ID does not belong to KLARENCIA MARIA.");
  }
  if (process.argv.includes("--synthesize")) {
    const body = {
      model_id: "eleven_v4_turbo",
      language_code: "ru",
      inputs: [{ text: "Мага, проверка связи. Кларен на месте. А пафос опять куда-то убежал.", voice_id: voiceId }],
    };
    const response = await request("https://api.elevenlabs.io/v1/text-to-dialogue/stream?output_format=mp3_44100_128", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 100) throw new Error("V4 returned an empty audio stream.");
    const filename = join(tmpdir(), "klarencia-v4-voice-check.mp3");
    await writeFile(filename, bytes);
    console.log(`Eleven V4 Turbo audio received: ${bytes.byteLength} bytes. Saved: ${filename}`);
  } else {
    console.log("Voice lookup passed. Use --synthesize to test actual V4 generation (uses credits).");
  }
} catch (error) {
  console.error("V4 voice validation failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}
