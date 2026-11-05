import "server-only";

const API = "https://api.elevenlabs.io";

export async function resolveKlarenciaVoice(): Promise<string> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ElevenLabs is not configured.");
  const configuredId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (configuredId) return configuredId;
  const response = await fetch(`${API}/v2/voices?search=${encodeURIComponent("KLARENCIA MARIA")}&page_size=100`, {
    headers: { "xi-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Voice discovery failed (${response.status}).`);
  const data: unknown = await response.json();
  const voices = data && typeof data === "object" && "voices" in data && Array.isArray(data.voices)
    ? data.voices as Array<{ name?: string; voice_id?: string }>
    : [];
  const exact = voices.filter((voice) => voice.name?.trim().toLocaleLowerCase() === "klarencia maria");
  if (exact.length !== 1 || !exact[0]?.voice_id) {
    throw new Error(exact.length === 0 ? "KLARENCIA MARIA was not found in this workspace." : "Multiple matching voice IDs: configure ELEVENLABS_VOICE_ID.");
  }
  return exact[0].voice_id;
}

export function cleanSpokenText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " В ответе есть блок кода. ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>|~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1900);
}

export function voiceModelId(): string {
  // Only Eleven v4 family is allowed for KLARENCIA MARIA.
  return "eleven_v4_turbo";
}
